import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, limit, query, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import ProductEditor from './ProductEditor';
import InventoryModal from '../components/VariantInventory';
import { FALLBACK_PRODUCT_IMAGE, formatProductPrice, getSafeImageUrl } from '../utils/productPresentation';
import { formatCategoryPath, useCategoryMasters } from '../hooks/useCategoryMasters';

const sortProductList = (items) => [...items].sort((a, b) => {
  const orderA = a.orderIndex ?? 999;
  const orderB = b.orderIndex ?? 999;
  if (orderA !== orderB) return orderA - orderB;
  const timeA = a.createdAt?.toMillis?.() ?? 0;
  const timeB = b.createdAt?.toMillis?.() ?? 0;
  return timeB - timeA;
});

const getTotalStock = (product) => product.skuStock || 0;

const getTotalSales = (product) => product.skuSales || 0;

const getDisplayImage = (product) => (
  product.imageUrls?.[0]
  || product.images?.[0]
  || product.imageUrl
  || FALLBACK_PRODUCT_IMAGE
);

export default function AdminInventory() {
  const { categories: categoryMasters } = useCategoryMasters();
  const [rawProducts, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const products = useMemo(() => rawProducts.map((product) => ({ ...product,
    skuStock: inventory.filter((item) => item.productId === product.id).reduce((sum, item) => sum + (Number(item.stock) || 0), 0),
    skuSales: inventory.filter((item) => item.productId === product.id).reduce((sum, item) => sum + (Number(item.sold) || 0), 0),
  })), [rawProducts, inventory]);
  useEffect(() => onSnapshot(query(collection(db, 'inventory'), limit(1000)), (snapshot) => setInventory(snapshot.docs.map((entry) => entry.data())), () => setInventory([])), []);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(sortProductList(snapshot.docs.map((productDoc) => ({ id: productDoc.id, ...productDoc.data() }))));
      setLoading(false);
    }, (error) => {
      console.error('Error subscribing to products:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const categoryLabelMap = useMemo(() => new Map(
    categoryMasters.map((category) => [category.code, formatCategoryPath(category)])
  ), [categoryMasters]);

  const categories = useMemo(() => ([...new Set([
    ...categoryMasters.map((category) => category.code),
    ...products.map((product) => product.category || product.ko?.category),
  ].filter(Boolean))]), [categoryMasters, products]);

  const filteredProducts = useMemo(() => {
    const queryText = searchTerm.trim().toLowerCase();
    return products.filter((product) => {
      const name = `${product.name || ''} ${product.ko?.name || ''} ${product.id || ''}`.toLowerCase();
      const category = product.category || product.ko?.category || 'OUTDOOR';
      const stock = getTotalStock(product);
      const matchesSearch = !queryText || name.includes(queryText);
      const matchesCategory = categoryFilter === 'ALL' || category === categoryFilter;
      const matchesStatus = statusFilter === 'ALL'
        || (statusFilter === 'FEATURED' && product.isFeatured)
        || (statusFilter === 'NEW' && product.isNew)
        || (statusFilter === 'LOW_STOCK' && stock <= 5)
        || (statusFilter === 'SOLD_OUT' && stock === 0);
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchTerm, categoryFilter, statusFilter]);

  const metrics = useMemo(() => ({
    total: products.length,
    featured: products.filter((product) => product.isFeatured).length,
    lowStock: products.filter((product) => getTotalStock(product) <= 5).length,
    totalStock: products.reduce((total, product) => total + getTotalStock(product), 0),
  }), [products]);

  const handleAddNew = () => {
    setEditingProduct(null);
    setIsEditorOpen(true);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setIsEditorOpen(true);
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`[${product.name}] 상품의 판매를 ${product.isActive === false ? '재개' : '중지'}할까요? 주문 기록과 파일은 보존됩니다.`)) return;
    try {
      await updateDoc(doc(db, 'products', product.id), { isActive: product.isActive === false });
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('상품 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleToggleFlag = async (product, field) => {
    try {
      await updateDoc(doc(db, 'products', product.id), { [field]: !product[field] });
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      alert('노출 상태 변경 중 오류가 발생했습니다.');
    }
  };

  const handleMoveOrder = async (productId, direction) => {
    const currentIndex = products.findIndex((product) => product.id === productId);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= products.length) return;

    const updatedProducts = [...products];
    [updatedProducts[currentIndex], updatedProducts[targetIndex]] = [updatedProducts[targetIndex], updatedProducts[currentIndex]];
    setProducts(updatedProducts);

    try {
      await Promise.all(updatedProducts.map((product, index) => (
        setDoc(doc(db, 'products', product.id), { orderIndex: index }, { merge: true })
      )));
    } catch (error) {
      console.error('Error updating order:', error);
      alert('진열 순서 변경 중 오류가 발생했습니다.');
    }
  };

  if (loading) return <div className="admin-page-loading">상품 데이터를 불러오고 있습니다.</div>;

  return (
    <div className="admin-page admin-products-page">
      <header className="admin-page-header">
        <div>
          <span className="admin-eyebrow">PRODUCT OPERATIONS</span>
          <h1>상품 관리</h1>
          <p>상품 등록부터 노출 설정, 진열 순서와 재고까지 한 화면에서 관리합니다.</p>
        </div>
        <button type="button" onClick={handleAddNew} className="admin-btn-primary admin-create-product-btn">
          <span>+</span> 새 상품 등록
        </button>
      </header>

      <section className="admin-metric-grid">
        <button type="button" className={statusFilter === 'ALL' ? 'active' : ''} onClick={() => setStatusFilter('ALL')}>
          <span>전체 상품</span><strong>{metrics.total}</strong><small>등록 상품</small>
        </button>
        <button type="button" className={statusFilter === 'FEATURED' ? 'active' : ''} onClick={() => setStatusFilter('FEATURED')}>
          <span>메인 추천</span><strong>{metrics.featured}</strong><small>스토어 우선 노출</small>
        </button>
        <button type="button" className={statusFilter === 'LOW_STOCK' ? 'active' : ''} onClick={() => setStatusFilter('LOW_STOCK')}>
          <span>재고 확인</span><strong>{metrics.lowStock}</strong><small>5개 이하 상품</small>
        </button>
        <div>
          <span>총 재고</span><strong>{metrics.totalStock}</strong><small>전체 옵션 합계</small>
        </div>
      </section>

      <section className="admin-product-toolbar">
        <label className="admin-search-box">
          <span>SEARCH</span>
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="상품명 또는 SKU 검색"
          />
          {searchTerm && <button type="button" onClick={() => setSearchTerm('')} aria-label="검색어 지우기">×</button>}
        </label>
        <select className="admin-select" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
          <option value="ALL">전체 카테고리</option>
          {categories.map((category) => (
            <option value={category} key={category}>
              {category}{categoryLabelMap.get(category) ? ` · ${categoryLabelMap.get(category)}` : ' · 기존 분류'}
            </option>
          ))}
        </select>
        <select className="admin-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="ALL">전체 상태</option>
          <option value="FEATURED">메인 추천</option>
          <option value="NEW">신상품</option>
          <option value="LOW_STOCK">재고 5개 이하</option>
          <option value="SOLD_OUT">품절</option>
        </select>
        <span className="admin-result-count">{filteredProducts.length} / {products.length}</span>
      </section>

      <section className="admin-product-list">
        <div className="admin-product-list-head">
          <span>상품</span><span>노출 상태</span><span>재고·판매</span><span>진열</span><span>관리</span>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="admin-empty-state">
            <strong>조건에 맞는 상품이 없습니다.</strong>
            <span>검색어나 필터를 변경하거나 새 상품을 등록하세요.</span>
          </div>
        ) : filteredProducts.map((product) => {
          const stock = getTotalStock(product);
          const sales = getTotalSales(product);
          const originalIndex = products.findIndex((item) => item.id === product.id);
          return (
            <article className="admin-product-row" key={product.id}>
              <div className="admin-product-identity">
                <img
                  src={getSafeImageUrl(getDisplayImage(product))}
                  alt=""
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
                  }}
                />
                <div>
                  <span title={categoryLabelMap.get(product.category || product.ko?.category) || ''}>
                    {product.category || product.ko?.category || 'OUTDOOR'} · {product.id.slice(0, 8).toUpperCase()}
                  </span>
                  <strong>{product.name || product.ko?.name || '이름 없는 상품'}</strong>
                  <small>{formatProductPrice(product, 'ko')}</small>
                </div>
              </div>

              <div className="admin-visibility-toggles">
                <button type="button" className={product.isFeatured ? 'active' : ''} onClick={() => handleToggleFlag(product, 'isFeatured')}>추천</button>
                <button type="button" className={product.isNew ? 'active' : ''} onClick={() => handleToggleFlag(product, 'isNew')}>NEW</button>
                <button type="button" className={product.isBestSeller ? 'active' : ''} onClick={() => handleToggleFlag(product, 'isBestSeller')}>BEST</button>
              </div>

              <div className="admin-stock-summary">
                <strong className={stock === 0 ? 'sold-out' : stock <= 5 ? 'low-stock' : ''}>{stock}개</strong>
                <span>판매 {sales}개 · SKU 기준 · 옵션 {(product.options || []).length}개</span>
              </div>

              <div className="admin-order-controls">
                <span>#{originalIndex + 1}</span>
                <button type="button" disabled={originalIndex === 0} onClick={() => handleMoveOrder(product.id, 'up')} aria-label="위로 이동">↑</button>
                <button type="button" disabled={originalIndex === products.length - 1} onClick={() => handleMoveOrder(product.id, 'down')} aria-label="아래로 이동">↓</button>
              </div>

              <div className="admin-product-actions">
                <button type="button" className="admin-btn-secondary" onClick={() => setSelectedProduct(product)}>재고</button>
                <button type="button" className="admin-btn-primary" onClick={() => handleEdit(product)}>편집</button>
                <button type="button" className="admin-more-btn" onClick={() => handleDelete(product)} aria-label="상품 삭제">{product.isActive === false ? '판매 재개' : '판매 중지'}</button>
              </div>
            </article>
          );
        })}
      </section>

      {selectedProduct && <InventoryModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />}
      {isEditorOpen && (
        <ProductEditor
          product={editingProduct}
          onClose={() => setIsEditorOpen(false)}
          onSaved={(savedProduct) => setEditingProduct(savedProduct)}
        />
      )}
    </div>
  );
}
