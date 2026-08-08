import React, { useEffect, useMemo, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import ProductEditor from './ProductEditor';
import { FALLBACK_PRODUCT_IMAGE, formatProductPrice, getSafeImageUrl } from '../utils/productPresentation';

const sortProductList = (items) => [...items].sort((a, b) => {
  const orderA = a.orderIndex ?? 999;
  const orderB = b.orderIndex ?? 999;
  if (orderA !== orderB) return orderA - orderB;
  const timeA = a.createdAt?.toMillis?.() ?? 0;
  const timeB = b.createdAt?.toMillis?.() ?? 0;
  return timeB - timeA;
});

const getTotalStock = (product) => (
  (product.options || []).reduce((total, option) => total + (Number(option.stock) || 0), 0)
);

const getTotalSales = (product) => (
  (product.options || []).reduce((total, option) => total + (Number(option.sales) || 0), 0)
);

const getDisplayImage = (product) => (
  product.imageUrls?.[0]
  || product.images?.[0]
  || product.imageUrl
  || FALLBACK_PRODUCT_IMAGE
);

function InventoryModal({ product, onClose }) {
  const [options, setOptions] = useState(product.options || []);
  const [loading, setLoading] = useState(false);
  const [expandedHistoryIdx, setExpandedHistoryIdx] = useState(null);

  const handleAddOption = () => {
    setOptions((current) => [...current, { name: '', stock: 0, sales: 0, history: [] }]);
  };

  const handleOptionChange = (index, field, value) => {
    setOptions((current) => current.map((option, optionIndex) => (
      optionIndex === index
        ? { ...option, [field]: field === 'stock' ? parseInt(value, 10) || 0 : value }
        : option
    )));
  };

  const handleRemoveOption = (index) => {
    setOptions((current) => current.filter((_, optionIndex) => optionIndex !== index));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const originalOptions = product.options || [];
      const updatedOptions = options.map((option) => {
        const originalOption = originalOptions.find((item) => item.name === option.name);
        const diff = option.stock - (originalOption?.stock || 0);
        const history = diff === 0
          ? (option.history || [])
          : [{ date: new Date().toISOString(), type: '관리자 수동 변경', amount: diff }, ...(option.history || [])];

        return { ...option, history, sales: option.sales || 0 };
      });

      await updateDoc(doc(db, 'products', product.id), { options: updatedOptions });
      onClose();
    } catch (error) {
      console.error(error);
      alert('재고 저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-label="재고 및 옵션 관리">
      <section className="admin-drawer">
        <header className="admin-drawer-header">
          <div>
            <span>INVENTORY CONTROL</span>
            <h2>재고 및 옵션 관리</h2>
            <p>{product.name} · {product.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <button type="button" className="admin-icon-btn" onClick={onClose} aria-label="닫기">×</button>
        </header>

        <div className="admin-drawer-summary">
          <div><span>옵션</span><strong>{options.length}</strong></div>
          <div><span>총 재고</span><strong>{options.reduce((sum, item) => sum + (item.stock || 0), 0)}</strong></div>
          <button type="button" className="admin-btn-secondary" onClick={handleAddOption}>+ 옵션 추가</button>
        </div>

        <div className="admin-option-list">
          {options.length === 0 ? (
            <div className="admin-empty-state compact">
              <strong>등록된 옵션이 없습니다.</strong>
              <span>사이즈 또는 색상 옵션을 추가하세요.</span>
            </div>
          ) : options.map((option, index) => (
            <article className="admin-option-card" key={`${option.name}-${index}`}>
              <div className="admin-option-grid">
                <label>
                  <span>옵션명</span>
                  <input
                    className="admin-input"
                    value={option.name}
                    onChange={(event) => handleOptionChange(index, 'name', event.target.value)}
                    placeholder="예: Black / M"
                  />
                </label>
                <label>
                  <span>현재 재고</span>
                  <input
                    className="admin-input"
                    type="number"
                    min="0"
                    value={option.stock}
                    onChange={(event) => handleOptionChange(index, 'stock', event.target.value)}
                  />
                </label>
                <div className="admin-option-readonly">
                  <span>누적 판매</span>
                  <strong>{option.sales || 0}</strong>
                </div>
                <button type="button" className="admin-icon-btn danger" onClick={() => handleRemoveOption(index)} aria-label="옵션 삭제">×</button>
              </div>

              {!!option.history?.length && (
                <div className="admin-option-history">
                  <button type="button" onClick={() => setExpandedHistoryIdx(expandedHistoryIdx === index ? null : index)}>
                    변경 이력 {option.history.length}건 {expandedHistoryIdx === index ? '접기' : '보기'}
                  </button>
                  {expandedHistoryIdx === index && (
                    <div>
                      {option.history.map((history, historyIndex) => (
                        <p key={`${history.date}-${historyIndex}`}>
                          <span>{new Date(history.date).toLocaleString()}</span>
                          <span>{history.type}</span>
                          <strong className={history.amount > 0 ? 'positive' : 'negative'}>
                            {history.amount > 0 ? `+${history.amount}` : history.amount}
                          </strong>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>

        <footer className="admin-drawer-footer">
          <button type="button" className="admin-btn-secondary" onClick={onClose} disabled={loading}>취소</button>
          <button type="button" className="admin-btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? '저장 중...' : '재고 저장'}
          </button>
        </footer>
      </section>
    </div>
  );
}

export default function AdminInventory() {
  const [products, setProducts] = useState([]);
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

  const categories = useMemo(() => (
    [...new Set(products.map((product) => product.category || product.ko?.category).filter(Boolean))]
  ), [products]);

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
    if (!window.confirm(`[${product.name}] 상품을 삭제할까요? 삭제 후 복구할 수 없습니다.`)) return;
    try {
      await deleteDoc(doc(db, 'products', product.id));
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
          {categories.map((category) => <option value={category} key={category}>{category}</option>)}
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
                  <span>{product.category || product.ko?.category || 'OUTDOOR'} · {product.id.slice(0, 8).toUpperCase()}</span>
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
                <span>판매 {sales}개 · 옵션 {(product.options || []).length}개</span>
              </div>

              <div className="admin-order-controls">
                <span>#{originalIndex + 1}</span>
                <button type="button" disabled={originalIndex === 0} onClick={() => handleMoveOrder(product.id, 'up')} aria-label="위로 이동">↑</button>
                <button type="button" disabled={originalIndex === products.length - 1} onClick={() => handleMoveOrder(product.id, 'down')} aria-label="아래로 이동">↓</button>
              </div>

              <div className="admin-product-actions">
                <button type="button" className="admin-btn-secondary" onClick={() => setSelectedProduct(product)}>재고</button>
                <button type="button" className="admin-btn-primary" onClick={() => handleEdit(product)}>편집</button>
                <button type="button" className="admin-more-btn" onClick={() => handleDelete(product)} aria-label="상품 삭제">삭제</button>
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
          onSaved={() => setIsEditorOpen(false)}
        />
      )}
    </div>
  );
}
