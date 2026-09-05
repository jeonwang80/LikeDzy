import { useCallback, useEffect, useRef, useState } from 'react';
import { collection, doc, documentId, getDoc, getDocs, limit, onSnapshot, orderBy, query, startAfter, where } from 'firebase/firestore';
import { db } from '../firebase';
import { productMatchesCategory, normalizeCategoryCode } from '../utils/categoryMatching';
import { CATALOG_PAGE_SIZE, CATALOG_QUERY_VERSION, LEGACY_SCAN_PAGE_SIZE, getCatalogOrdering, sortCatalogProducts } from '../utils/catalogQuery';

let capabilityPromise;
let capabilityCheckedAt = 0;
async function catalogQueriesReady() {
  if (!capabilityPromise || Date.now() - capabilityCheckedAt > 60000) {
    capabilityCheckedAt = Date.now();
    capabilityPromise = getDoc(doc(db, 'settings', 'catalog'))
      .then((snapshot) => snapshot.exists() && snapshot.data().queryVersion === CATALOG_QUERY_VERSION)
      .catch(() => false);
  }
  return capabilityPromise;
}

function catalogQuery({ category, sortBy, language, pageSize, cursor }) {
  const conditions = [where('isActive', '==', true)];
  if (category && category !== 'ALL') conditions.push(where('categoryAncestors', 'array-contains', category));
  conditions.push(...getCatalogOrdering(sortBy, language).map(([field, direction]) => orderBy(field, direction)));
  conditions.push(orderBy(documentId(), 'asc'));
  if (cursor) conditions.push(startAfter(cursor));
  conditions.push(limit(pageSize));
  return query(collection(db, 'products'), ...conditions);
}

export function useProductCatalog({ category = 'ALL', categoryMasters = [], categoriesLoading = false, sortBy = 'display', language = 'ko', pageSize = CATALOG_PAGE_SIZE, featured = false } = {}) {
  const [state, setState] = useState({ products: [], loading: true, loadingMore: false, error: '', hasMore: false, total: null });
  const [retry, setRetry] = useState(0);
  const requestRef = useRef(0);
  const pagingRef = useRef(null);
  const normalizedCategory = normalizeCategoryCode(category) || 'ALL';
  // Category changes matter for legacy categoryMasterId aliases, not object identity.
  const categoryKey = JSON.stringify(categoryMasters.map(({ id, code }) => ({ id, code })));

  useEffect(() => {
    if (categoriesLoading) return undefined;
    const requestId = ++requestRef.current;
    let unsubscribe;
    const current = () => requestRef.current === requestId;
    const load = async () => {
      setState({ products: [], loading: true, loadingMore: false, error: '', hasMore: false, total: null });
      pagingRef.current = null;
      try {
        const indexed = await catalogQueriesReady();
        if (!current()) return;
        const parameters = { category: normalizedCategory, sortBy, language, pageSize };
        if (indexed && featured) {
          unsubscribe = onSnapshot(catalogQuery(parameters), (snapshot) => {
            if (!current()) return;
            setState({ products: snapshot.docs.map((item) => ({ id: item.id, ...item.data() })), loading: false, loadingMore: false, error: '', hasMore: false, total: null });
          }, (error) => {
            console.error('Featured catalog query failed:', error);
            if (current()) setState((previous) => ({ ...previous, loading: false, error: '상품을 불러오지 못했습니다. 다시 시도해 주세요.' }));
          });
          return;
        }
        if (indexed) {
          const snapshot = await getDocs(catalogQuery(parameters));
          if (!current()) return;
          pagingRef.current = { indexed: true, parameters, cursor: snapshot.docs.at(-1), requestId };
          setState({ products: snapshot.docs.map((item) => ({ id: item.id, ...item.data() })), loading: false, loadingMore: false, error: '', hasMore: snapshot.size === pageSize, total: null });
          return;
        }
        // Until migration is explicitly completed, do not omit old products that
        // lack an order/category field. Each network query is bounded; this
        // compatibility scan intentionally still reads the complete catalog.
        const products = [];
        let cursor;
        while (current()) {
          const constraints = [orderBy(documentId()), ...(cursor ? [startAfter(cursor)] : []), limit(LEGACY_SCAN_PAGE_SIZE)];
          const snapshot = await getDocs(query(collection(db, 'products'), ...constraints));
          products.push(...snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
          if (snapshot.size < LEGACY_SCAN_PAGE_SIZE) break;
          cursor = snapshot.docs.at(-1);
        }
        if (!current()) return;
        const masters = JSON.parse(categoryKey);
        const matches = sortCatalogProducts(products.filter((product) => product.isActive !== false && productMatchesCategory(product, normalizedCategory, masters)), sortBy, language);
        pagingRef.current = { indexed: false, matches, shown: pageSize, pageSize, requestId };
        setState({ products: matches.slice(0, pageSize), loading: false, loadingMore: false, error: '', hasMore: !featured && matches.length > pageSize, total: matches.length });
      } catch (error) {
        console.error('Catalog query failed:', error);
        if (current()) setState((previous) => ({ ...previous, loading: false, error: '상품을 불러오지 못했습니다. 다시 시도해 주세요.' }));
      }
    };
    load();
    return () => { requestRef.current += 1; unsubscribe?.(); };
  }, [normalizedCategory, sortBy, language, pageSize, featured, categoriesLoading, categoryKey, retry]);

  const loadMore = useCallback(async () => {
    const paging = pagingRef.current;
    if (!paging || paging.loading || !paging.cursor && paging.indexed) return;
    if (!paging.indexed) {
      paging.shown += paging.pageSize;
      setState((previous) => ({ ...previous, products: paging.matches.slice(0, paging.shown), hasMore: paging.matches.length > paging.shown }));
      return;
    }
    paging.loading = true;
    setState((previous) => ({ ...previous, loadingMore: true, error: '' }));
    try {
      const snapshot = await getDocs(catalogQuery({ ...paging.parameters, cursor: paging.cursor }));
      if (requestRef.current !== paging.requestId) return;
      paging.cursor = snapshot.docs.at(-1);
      setState((previous) => ({ ...previous, products: [...new Map([...previous.products, ...snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))].map((item) => [item.id, item])).values()], loadingMore: false, hasMore: snapshot.size === paging.parameters.pageSize }));
    } catch (error) {
      console.error('Catalog next page failed:', error);
      if (requestRef.current === paging.requestId) setState((previous) => ({ ...previous, loadingMore: false, error: '다음 상품을 불러오지 못했습니다. 다시 시도해 주세요.' }));
    } finally {
      paging.loading = false;
    }
  }, []);

  return { ...state, loadMore, reload: () => setRetry((attempt) => attempt + 1) };
}
