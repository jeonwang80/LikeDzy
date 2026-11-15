import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { productMatchesCategory, normalizeCategoryCode } from '../utils/categoryMatching';
import { CATALOG_PAGE_SIZE, sortCatalogProducts } from '../utils/catalogQuery';
import { useVisitorCountry } from './useVisitorCountry';
import { isSoldInCountry } from '../utils/salesCountries';

// Subscribe before client-side pagination so country filtering cannot leave empty
// pages or omit eligible products behind products for a different country.
export function useProductCatalog({ category = 'ALL', categoryMasters = [], categoriesLoading = false, sortBy = 'display', language = 'ko', pageSize = CATALOG_PAGE_SIZE, featured = false } = {}) {
  const country = useVisitorCountry();
  const [state, setState] = useState({ products: [], loading: true, error: '' });
  const [retry, setRetry] = useState(0);
  const [paging, setPaging] = useState({ key: '', count: pageSize });
  const normalizedCategory = normalizeCategoryCode(category) || 'ALL';
  const key = JSON.stringify([normalizedCategory, sortBy, language, country, pageSize, featured]);
  const shown = paging.key === key ? paging.count : pageSize;
  useEffect(() => onSnapshot(collection(db, 'products'), snapshot => {
    setState({ products: snapshot.docs.map(item => ({ id: item.id, ...item.data() })), loading: false, error: '' });
  }, () => setState({ products: [], loading: false, error: '상품을 불러오지 못했습니다. 다시 시도해 주세요.' })), [retry]);
  const matches = useMemo(() => sortCatalogProducts(state.products.filter(product =>
    product.isActive !== false && isSoldInCountry(product, country)
    && productMatchesCategory(product, normalizedCategory, categoryMasters)
  ), sortBy, language), [state.products, country, normalizedCategory, categoryMasters, sortBy, language]);
  return {
    products: matches.slice(0, featured ? pageSize : shown),
    loading: state.loading || categoriesLoading, loadingMore: false,
    error: state.error || (!country ? '접속 국가를 확인할 수 없습니다. 연결을 확인하고 새로고침해 주세요.' : ''),
    hasMore: !featured && shown < matches.length, total: matches.length,
    loadMore: () => setPaging({ key, count: shown + pageSize }),
    reload: () => setRetry(value => value + 1),
  };
}
