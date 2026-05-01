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
      // Create history entries for modified stock
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
    <div className="admin-modal-overlay" style={{ zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="admin-modal-content" style={{ maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>재고 및 옵션 관리</h2>
            <p style={{ margin: '0.5rem 0 0 0', color: '#64748b' }}>{product.name} (SKU: {product.id.slice(0, 8).toUpperCase()})</p>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>&times;</button>
        </div>

        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#334155' }}>옵션 목록</h3>
          <button onClick={handleAddOption} style={{ padding: '0.4rem 0.8rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>+ 새 옵션</button>
        </div>

        {options.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '8px' }}>
            등록된 옵션이 없습니다.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {options.map((opt, idx) => (
              <div key={idx} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ flex: 2 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>옵션명</label>
                    <input 
                      value={opt.name} 
                      onChange={e => handleOptionChange(idx, 'name', e.target.value)} 
                      placeholder="예: 블랙 M"
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>현재 재고</label>
                    <input 
                      type="number" 
                      value={opt.stock} 
                      onChange={e => handleOptionChange(idx, 'stock', e.target.value)} 
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>누적 판매량</label>
                    <div style={{ padding: '0.5rem', background: '#e2e8f0', borderRadius: '4px', textAlign: 'center', fontWeight: 'bold', color: '#334155' }}>
                      {opt.sales || 0}
                    </div>
                  </div>
                  <button onClick={() => handleRemoveOption(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '1.2rem', cursor: 'pointer', padding: '0', marginTop: '1.2rem' }}>&times;</button>
                </div>

                {opt.history && opt.history.length > 0 && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <button 
                      onClick={() => setExpandedHistoryIdx(expandedHistoryIdx === idx ? null : idx)}
                      style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.85rem', cursor: 'pointer', padding: 0 }}
                    >
                      {expandedHistoryIdx === idx ? '▲ 이력 접기' : '▼ 이력 보기'} ({opt.history.length}건)
                    </button>
                    
                    {expandedHistoryIdx === idx && (
                      <div style={{ marginTop: '0.5rem', maxHeight: '150px', overflowY: 'auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '0.5rem' }}>
                        {opt.history.map((h, hIdx) => (
                          <div key={hIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.25rem 0', borderBottom: hIdx < opt.history.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                            <span style={{ color: '#64748b' }}>{new Date(h.date).toLocaleString()}</span>
                            <span style={{ color: '#334155' }}>{h.type}</span>
                            <span style={{ fontWeight: 'bold', color: h.amount > 0 ? '#16a34a' : '#ef4444' }}>
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

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
          <button onClick={onClose} disabled={loading} style={{ padding: '0.75rem 1.5rem', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>취소</button>
          <button onClick={handleSave} disabled={loading} style={{ padding: '0.75rem 1.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
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

  if (loading) return <div style={{ color: '#94a3b8' }}>재고 데이터 불러오는 중...</div>;

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#f1f5f9' }}>재고 관리 (Inventory Management)</h2>

      <div style={{ background: '#1e293b', borderRadius: '8px', overflow: 'hidden', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem', minWidth: '800px' }}>
          <thead>
            <tr style={{ background: '#334155', color: '#f8fafc' }}>
              <th style={{ padding: '1rem', borderBottom: '1px solid #475569' }}>상품 사진</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid #475569' }}>SKU (고유코드)</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid #475569' }}>상품명</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid #475569' }}>옵션 수</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid #475569' }}>총 남은 재고</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid #475569' }}>누적 판매량</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid #475569', textAlign: 'right' }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>등록된 상품이 없습니다.</td>
              </tr>
            ) : (
              products.map((product) => {
                const totalStock = (product.options || []).reduce((acc, opt) => acc + (opt.stock || 0), 0);
                const totalSales = (product.options || []).reduce((acc, opt) => acc + (opt.sales || 0), 0);
                
                return (
                  <tr key={product.id} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '1rem' }}>
                      <img src={product.imageUrls?.[0] || product.imageUrl} alt={product.name} style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} />
                    </td>
                    <td style={{ padding: '1rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                      {product.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td style={{ padding: '1rem', color: '#f8fafc', fontWeight: 'bold' }}>{product.name}</td>
                    <td style={{ padding: '1rem', color: '#cbd5e1' }}>{product.options?.length || 0}개</td>
                    <td style={{ padding: '1rem', color: totalStock === 0 ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>
                      {totalStock}개
                    </td>
                    <td style={{ padding: '1rem', color: '#3b82f6', fontWeight: 'bold' }}>
                      {totalSales}개
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <button 
                        onClick={() => setSelectedProduct(product)}
                        style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
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

      {selectedProduct && (
        <InventoryModal 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
        />
      )}
    </div>
  );
}
