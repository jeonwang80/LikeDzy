import { useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import AdminAuthorization from '../components/AdminAuthorization';
import { db } from '../firebase';
import { formatCategoryPath, useCategoryMasters } from '../hooks/useCategoryMasters';

const EMPTY_FORM = {
  level1Code: '',
  level1Name: '',
  level2Code: '',
  level2Name: '',
  level3Code: '',
  level3Name: '',
  active: true,
  sortOrder: 100,
};

const normalizeCode = (value) => value.toUpperCase().replace(/[^A-Z0-9]/g, '');

const buildCategoryCode = (form) => (
  [form.level1Code, form.level2Code, form.level3Code]
    .map(normalizeCode)
    .filter(Boolean)
    .join('-')
);

export default function AdminMasterData() {
  const { categories, loading, error } = useCategoryMasters();
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);

  const combinedCode = buildCategoryCode(form);
  const filteredCategories = useMemo(() => {
    const queryText = searchTerm.trim().toLowerCase();
    if (!queryText) return categories;
    return categories.filter((category) => (
      `${category.code || ''} ${formatCategoryPath(category)}`.toLowerCase().includes(queryText)
    ));
  }, [categories, searchTerm]);

  const activeCount = categories.filter((category) => category.active !== false).length;

  const updateField = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const requiredFields = [
      form.level1Code,
      form.level1Name,
      form.level2Code,
      form.level2Name,
      form.level3Code,
      form.level3Name,
    ];
    if (requiredFields.some((value) => !String(value).trim())) {
      alert('1·2·3차 코드와 명칭을 모두 입력해 주세요.');
      return;
    }

    const duplicate = categories.some((category) => (
      category.code === combinedCode && category.id !== editingId
    ));
    if (duplicate) {
      alert(`[${combinedCode}] 카테고리는 이미 등록되어 있습니다.`);
      return;
    }

    const payload = {
      code: combinedCode,
      level1Code: normalizeCode(form.level1Code),
      level1Name: form.level1Name.trim(),
      level2Code: normalizeCode(form.level2Code),
      level2Name: form.level2Name.trim(),
      level3Code: normalizeCode(form.level3Code),
      level3Name: form.level3Name.trim(),
      active: form.active !== false,
      sortOrder: Number(form.sortOrder) || 0,
      updatedAt: serverTimestamp(),
    };

    setSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'categoryMasters', editingId), payload);
      } else {
        await addDoc(collection(db, 'categoryMasters'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      resetForm();
    } catch (saveError) {
      console.error('Category master save error:', saveError);
      alert('카테고리 저장에 실패했습니다. Firestore 권한을 확인해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (category) => {
    setEditingId(category.id);
    setForm({
      level1Code: category.level1Code || '',
      level1Name: category.level1Name || '',
      level2Code: category.level2Code || '',
      level2Name: category.level2Name || '',
      level3Code: category.level3Code || '',
      level3Name: category.level3Name || '',
      active: category.active !== false,
      sortOrder: category.sortOrder ?? 100,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleActive = async (category) => {
    try {
      await updateDoc(doc(db, 'categoryMasters', category.id), {
        active: category.active === false,
        updatedAt: serverTimestamp(),
      });
    } catch (toggleError) {
      console.error('Category active status update error:', toggleError);
      alert('사용 상태 변경에 실패했습니다.');
    }
  };

  const handleDelete = async (category) => {
    if (!window.confirm(`[${category.code}] 카테고리를 삭제할까요?\n기존 상품에 저장된 코드는 유지됩니다.`)) return;
    try {
      await deleteDoc(doc(db, 'categoryMasters', category.id));
      if (editingId === category.id) resetForm();
    } catch (deleteError) {
      console.error('Category master delete error:', deleteError);
      alert('카테고리 삭제에 실패했습니다.');
    }
  };

  return (
    <div className="admin-page admin-master-page">
      <header className="admin-page-header">
        <div>
          <span className="admin-page-eyebrow">MASTER DATA / CATEGORY</span>
          <h1>기준정보</h1>
          <p>상품 분류에 사용할 3레벨 카테고리 코드와 명칭을 관리합니다.</p>
        </div>
        <span className="admin-page-count">{activeCount} ACTIVE / {categories.length} TOTAL</span>
      </header>

      <section className="admin-master-intro">
        <div>
          <span>CATEGORY CODE RULE</span>
          <strong>MAN <i>—</i> TOP <i>—</i> FW</strong>
        </div>
        <p>각 레벨의 영문·숫자 코드를 조합해 상품 분류 코드가 자동 생성됩니다.</p>
      </section>

      <AdminAuthorization />

      <div className="admin-master-layout">
        <form className="admin-card admin-master-form" onSubmit={handleSubmit}>
          <div className="admin-master-form-header">
            <div>
              <span>{editingId ? 'EDIT CATEGORY' : 'NEW CATEGORY'}</span>
              <h2>{editingId ? '카테고리 수정' : '카테고리 등록'}</h2>
            </div>
            {editingId && <button type="button" className="admin-inline-link" onClick={resetForm}>신규 등록으로 전환</button>}
          </div>

          {[1, 2, 3].map((level) => (
            <fieldset className="admin-category-level" key={level}>
              <legend><span>0{level}</span> {level}차 분류</legend>
              <label>
                <span>코드</span>
                <input
                  className="admin-input admin-code-input"
                  value={form[`level${level}Code`]}
                  onChange={(event) => updateField(`level${level}Code`, normalizeCode(event.target.value))}
                  placeholder={level === 1 ? 'MAN' : level === 2 ? 'TOP' : 'FW'}
                  maxLength={12}
                />
              </label>
              <label>
                <span>명칭</span>
                <input
                  className="admin-input"
                  value={form[`level${level}Name`]}
                  onChange={(event) => updateField(`level${level}Name`, event.target.value)}
                  placeholder={level === 1 ? '남성' : level === 2 ? '상의' : '기능성 웨어'}
                  maxLength={40}
                />
              </label>
            </fieldset>
          ))}

          <div className="admin-category-preview">
            <span>자동 생성 코드</span>
            <strong>{combinedCode || 'LEVEL1-LEVEL2-LEVEL3'}</strong>
            <small>{[form.level1Name, form.level2Name, form.level3Name].filter(Boolean).join(' / ') || '각 레벨의 명칭을 입력해 주세요.'}</small>
          </div>

          <div className="admin-master-form-footer">
            <label className="admin-form-field">
              <span>정렬 순서</span>
              <input className="admin-input" type="number" value={form.sortOrder} onChange={(event) => updateField('sortOrder', event.target.value)} />
            </label>
            <label className="admin-master-active-toggle">
              <span><strong>사용 상태</strong><small>상품 등록 화면에 표시</small></span>
              <input type="checkbox" checked={form.active} onChange={(event) => updateField('active', event.target.checked)} />
            </label>
          </div>

          <div className="admin-master-form-actions">
            <button type="button" className="admin-btn-secondary" onClick={resetForm}>초기화</button>
            <button type="submit" className="admin-btn-primary" disabled={saving}>{saving ? '저장 중...' : editingId ? '수정 저장' : '카테고리 등록'}</button>
          </div>
        </form>

        <section className="admin-card admin-master-list-card">
          <div className="admin-master-list-header">
            <div><span>REGISTERED CATEGORY</span><h2>카테고리 목록</h2></div>
            <label className="admin-search-box">
              <span>SEARCH</span>
              <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="코드 또는 명칭 검색" />
              {searchTerm && <button type="button" onClick={() => setSearchTerm('')} aria-label="검색어 지우기">×</button>}
            </label>
          </div>

          {loading ? (
            <div className="admin-empty-state">카테고리 기준정보를 불러오고 있습니다.</div>
          ) : error ? (
            <div className="admin-empty-state error">카테고리 정보를 불러오지 못했습니다. Firestore 권한을 확인해 주세요.</div>
          ) : filteredCategories.length === 0 ? (
            <div className="admin-empty-state">등록된 카테고리가 없습니다. 왼쪽 등록 양식에서 첫 카테고리를 추가해 주세요.</div>
          ) : (
            <div className="admin-master-list">
              <div className="admin-master-list-head"><span>코드 / 분류명</span><span>순서</span><span>상태</span><span>관리</span></div>
              {filteredCategories.map((category) => (
                <article className={category.active === false ? 'inactive' : ''} key={category.id}>
                  <div className="admin-master-category-info">
                    <strong>{category.code}</strong>
                    <span>{formatCategoryPath(category)}</span>
                    <small>{category.level1Code} / {category.level2Code} / {category.level3Code}</small>
                  </div>
                  <span className="admin-master-order">{category.sortOrder ?? 0}</span>
                  <button type="button" className={`admin-master-status ${category.active === false ? '' : 'active'}`} onClick={() => handleToggleActive(category)}>
                    {category.active === false ? '미사용' : '사용'}
                  </button>
                  <div className="admin-master-row-actions">
                    <button type="button" onClick={() => handleEdit(category)}>수정</button>
                    <button type="button" className="danger" onClick={() => handleDelete(category)}>삭제</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
