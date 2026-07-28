import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

function InventoryModal({ product, onClose }) {
  const [options, setOptions] = useState(product.options || []);
  const [loading, setLoading] = useState(false);
  const [expandedHistoryIdx, setExpandedHistoryIdx] = useState(null);

  const handleAddOption = () => {
    setOptions([...options, { name: '', stock: 0, sales: 0, history: [] }]);
  };

  const handleOptionChange = (idx, field, value) => {
    const newOpts = [...options];
    newOpts[idx][field] = field === 'stock' ? parseInt(value) || 0 : value;
    setOptions(newOpts);
  };

  const handleRemoveOption = (idx) => {
    const newOpts = [...options];
    newOpts.splice(idx, 1);
    setOptions(newOpts);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const originalOptions = product.options || [];
      const updatedOptions = options.map((opt, idx) => {
        const originalOpt = originalOptions.find(o => o.name === opt.name);
        const originalStock = originalOpt ? originalOpt.stock : 0;
        const diff = opt.stock - originalStock;
        
        let newHistory = opt.history || [];
        if (diff !== 0) {
          newHistory = [{
            date: new Date().toISOString(),
            type: '관리자 수동 변경',
            amount: diff
          }, ...newHistory];
        }
        
        return { ...opt, history: newHistory, sales: opt.sales || 0 };
      });

      await updateDoc(doc(db, 'products', product.id), {
        options: updatedOptions
      });
      
      alert('재고 정보가 저장되었습니다.');
      onClose();
    } catch (e) {
      console.error(e);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-modal-overlay">
      <div className="admin-card" style={{ maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto', borderRadius: '0px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid #e5e5e5', paddingBottom: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '700', color: '#111111' }}>재고 및 옵션 관리</h2>
            <p style={{ margin: '0.25rem 0 0 0', color: '#707072', fontSize: '0.85rem' }}>{product.name} (SKU: {product.id.slice(0, 8).toUpperCase()})</p>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#111111' }}>&times;</button>
        </div>

        <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#111111' }}>옵션 목록</h3>
          <button onClick={handleAddOption} className="admin-btn-primary" style={{ height: '36px', padding: '6px 16px', fontSize: '0.85rem' }}>+ 새 옵션</button>
        </div>

        {options.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#707072', background: '#f5f5f5' }}>
            등록된 옵션이 없습니다.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {options.map((opt, idx) => (
              <div key={idx} style={{ background: '#f5f5f5', padding: '1rem', border: '1px solid #e5e5e5' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ flex: 2 }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#707072', marginBottom: '0.2rem', fontWeight: '600' }}>옵션명</label>
                    <input 
                      value={opt.name} 
                      onChange={e => handleOptionChange(idx, 'name', e.target.value)} 
                      placeholder="예: 블랙 M"
                      className="admin-input"
                      style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#707072', marginBottom: '0.2rem', fontWeight: '600' }}>현재 재고</label>
                    <input 
                      type="number" 
                      value={opt.stock} 
                      onChange={e => handleOptionChange(idx, 'stock', e.target.value)} 
                      className="admin-input"
                      style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#707072', marginBottom: '0.2rem', fontWeight: '600' }}>누적 판매량</label>
                    <div style={{ padding: '6px 12px', background: '#ffffff', border: '1px solid #cacacb', borderRadius: '24px', textAlign: 'center', fontWeight: '700', color: '#111111', fontSize: '0.85rem' }}>
                      {opt.sales || 0}
                    </div>
                  </div>
                  <button onClick={() => handleRemoveOption(idx)} style={{ background: 'none', border: 'none', color: '#d30005', fontSize: '1.2rem', cursor: 'pointer', padding: '0', marginTop: '1.2rem' }}>&times;</button>
                </div>

                {opt.history && opt.history.length > 0 && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <button 
                      onClick={() => setExpandedHistoryIdx(expandedHistoryIdx === idx ? null : idx)}
                      style={{ background: 'none', border: 'none', color: '#111111', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                    >
                      {expandedHistoryIdx === idx ? '▲ 이력 접기' : '▼ 이력 보기'} ({opt.history.length}건)
                    </button>
                    
                    {expandedHistoryIdx === idx && (
                      <div style={{ marginTop: '0.5rem', maxHeight: '150px', overflowY: 'auto', background: '#fff', border: '1px solid #e5e5e5', padding: '0.5rem' }}>
                        {opt.history.map((h, hIdx) => (
                          <div key={hIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.25rem 0', borderBottom: hIdx < opt.history.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                            <span style={{ color: '#707072' }}>{new Date(h.date).toLocaleString()}</span>
                            <span style={{ color: '#111111' }}>{h.type}</span>
                            <span style={{ fontWeight: 'bold', color: h.amount > 0 ? '#007d48' : '#d30005' }}>
                              {h.amount > 0 ? `+${h.amount}` : h.amount}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
          <button onClick={onClose} disabled={loading} className="admin-btn-secondary">취소</button>
          <button onClick={handleSave} disabled={loading} className="admin-btn-primary">
            {loading ? '저장 중...' : '변경사항 저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminInventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <div style={{ color: '#707072', fontWeight: 'bold' }}>재고 데이터 불러오는 중...</div>;

  return (
    <div>
      <div className="admin-header">
        <h1 className="admin-title">재고 관리 (Inventory)</h1>
      </div>

      <div className="admin-card" style={{ padding: 0 }}>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>상품 사진</th>
                <th>SKU (고유코드)</th>
                <th>상품명</th>
                <th>옵션 수</th>
                <th>총 남은 재고</th>
                <th>누적 판매량</th>
                <th style={{ textAlign: 'right' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: '#707072' }}>등록된 상품이 없습니다.</td>
                </tr>
              ) : (
                products.map((product) => {
                  const totalStock = (product.options || []).reduce((acc, opt) => acc + (opt.stock || 0), 0);
                  const totalSales = (product.options || []).reduce((acc, opt) => acc + (opt.sales || 0), 0);
                  
                  return (
                    <tr key={product.id}>
                      <td>
                        <img src={product.imageUrls?.[0] || product.imageUrl} alt={product.name} style={{ width: '48px', height: '48px', objectFit: 'cover', backgroundColor: '#f5f5f5' }} />
                      </td>
                      <td style={{ color: '#707072', fontFamily: 'monospace' }}>
                        {product.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td style={{ fontWeight: '600' }}>{product.name}</td>
                      <td>{product.options?.length || 0}개</td>
                      <td style={{ color: totalStock === 0 ? '#d30005' : '#007d48', fontWeight: '700' }}>
                        {totalStock}개
                      </td>
                      <td style={{ fontWeight: '700' }}>
                        {totalSales}개
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          onClick={() => setSelectedProduct(product)}
                          className="admin-btn-secondary"
                          style={{ height: '36px', padding: '6px 16px', fontSize: '0.85rem' }}
                        >
                          재고/옵션 관리
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedProduct && (
        <InventoryModal 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
        />
      )}
    </div>
  );
}
