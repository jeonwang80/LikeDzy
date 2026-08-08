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
import { useCategoryMasters } from '../hooks/useCategoryMasters';

const LEVELS = [1, 2, 3];
const NAME_FIELDS = ['Ko', 'En', 'Vi'];

const normalizeCode = (value) => value.toUpperCase().replace(/[^A-Z0-9]/g, '');

const buildCategoryCode = (row) => (
  LEVELS.map((level) => normalizeCode(row[`level${level}Code`] || ''))
    .filter(Boolean)
    .join('-')
);

const createRowKey = () => `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createEmptyRow = (sortOrder = 100) => ({
  rowKey: createRowKey(),
  id: null,
  level1Code: '',
  level1NameKo: '',
  level1NameEn: '',
  level1NameVi: '',
  level2Code: '',
  level2NameKo: '',
  level2NameEn: '',
  level2NameVi: '',
  level3Code: '',
  level3NameKo: '',
  level3NameEn: '',
  level3NameVi: '',
  active: true,
  sortOrder,
  dirty: false,
});

const categoryToRow = (category) => ({
  rowKey: category.id,
  id: category.id,
  level1Code: category.level1Code || '',
  level1NameKo: category.level1NameKo || category.level1Name || '',
  level1NameEn: category.level1NameEn || '',
  level1NameVi: category.level1NameVi || '',
  level2Code: category.level2Code || '',
  level2NameKo: category.level2NameKo || category.level2Name || '',
  level2NameEn: category.level2NameEn || '',
  level2NameVi: category.level2NameVi || '',
  level3Code: category.level3Code || '',
  level3NameKo: category.level3NameKo || category.level3Name || '',
  level3NameEn: category.level3NameEn || '',
  level3NameVi: category.level3NameVi || '',
  active: category.active !== false,
  sortOrder: category.sortOrder ?? 100,
  dirty: false,
});

const isBlankRow = (row) => (
  LEVELS.every((level) => (
    !row[`level${level}Code`]
    && NAME_FIELDS.every((language) => !row[`level${level}Name${language}`])
  ))
);

const buildPayload = (row) => {
  const payload = {
    code: buildCategoryCode(row),
    active: row.active !== false,
    sortOrder: Number(row.sortOrder) || 0,
    updatedAt: serverTimestamp(),
  };

  LEVELS.forEach((level) => {
    const codeField = `level${level}Code`;
    const koField = `level${level}NameKo`;
    const enField = `level${level}NameEn`;
    const viField = `level${level}NameVi`;
    payload[codeField] = normalizeCode(row[codeField] || '');
    payload[koField] = (row[koField] || '').trim();
    payload[enField] = (row[enField] || '').trim();
    payload[viField] = (row[viField] || '').trim();
    payload[`level${level}Name`] = payload[koField] || payload[enField] || payload[codeField];
  });

  return payload;
};

export default function AdminMasterData() {
  const { categories, loading, error } = useCategoryMasters();
  const [rowEdits, setRowEdits] = useState({});
  const [newRows, setNewRows] = useState(() => [createEmptyRow(100)]);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);

  const rows = useMemo(() => ([
    ...categories.map((category) => rowEdits[category.id] || categoryToRow(category)),
    ...newRows,
  ]), [categories, newRows, rowEdits]);

  const visibleRows = useMemo(() => {
    const queryText = searchTerm.trim().toLowerCase();
    if (!queryText) return rows;
    return rows.filter((row) => (
      !row.id
      || `${buildCategoryCode(row)} ${LEVELS.flatMap((level) => NAME_FIELDS.map((language) => row[`level${level}Name${language}`] || '')).join(' ')}`
        .toLowerCase()
        .includes(queryText)
    ));
  }, [rows, searchTerm]);

  const activeCount = categories.filter((category) => category.active !== false).length;
  const dirtyRows = rows.filter((row) => row.dirty && !isBlankRow(row));

  const updateRow = (rowKey, field, value) => {
    const currentRow = rows.find((row) => row.rowKey === rowKey);
    if (!currentRow) return;
    const updatedRow = {
      ...currentRow,
      [field]: field.endsWith('Code') ? normalizeCode(value) : value,
      dirty: true,
    };
    if (currentRow.id) {
      setRowEdits((previousEdits) => ({ ...previousEdits, [currentRow.id]: updatedRow }));
    } else {
      setNewRows((previousRows) => previousRows.map((row) => (row.rowKey === rowKey ? updatedRow : row)));
    }
  };

  const addRow = () => {
    const highestOrder = rows.reduce((maximum, row) => Math.max(maximum, Number(row.sortOrder) || 0), 0);
    setNewRows((previousRows) => [...previousRows, createEmptyRow(highestOrder + 100)]);
    window.setTimeout(() => document.querySelector('.admin-category-sheet tbody tr:last-child input')?.focus(), 0);
  };

  const validateRows = (targetRows) => {
    for (const row of targetRows) {
      const missingCode = LEVELS.some((level) => !row[`level${level}Code`]?.trim());
      const missingKoreanName = LEVELS.some((level) => !row[`level${level}NameKo`]?.trim());
      if (missingCode || missingKoreanName) {
        return '1·2·3차 코드와 한글 명칭은 필수 입력 항목입니다.';
      }
    }

    const completeCodes = rows
      .filter((row) => LEVELS.every((level) => row[`level${level}Code`]?.trim()))
      .map(buildCategoryCode);
    const duplicateCode = completeCodes.find((code, index) => completeCodes.indexOf(code) !== index);
    if (duplicateCode) return `[${duplicateCode}] 코드가 중복되었습니다.`;
    return '';
  };

  const saveRows = async (selectedRows = dirtyRows) => {
    const targetRows = selectedRows.filter((row) => !isBlankRow(row));
    if (targetRows.length === 0) return;
    const validationMessage = validateRows(targetRows);
    if (validationMessage) {
      alert(validationMessage);
      return;
    }

    setSaving(true);
    try {
      const savedRows = [];
      for (const row of targetRows) {
        const payload = buildPayload(row);
        if (row.id) {
          await updateDoc(doc(db, 'categoryMasters', row.id), payload);
          savedRows.push({ rowKey: row.rowKey, id: row.id });
        } else {
          const createdDocument = await addDoc(collection(db, 'categoryMasters'), {
            ...payload,
            createdAt: serverTimestamp(),
          });
          savedRows.push({ rowKey: row.rowKey, id: createdDocument.id });
        }
      }

      const savedRowKeys = new Set(savedRows.map((row) => row.rowKey));
      const savedDocumentIds = new Set(savedRows.map((row) => row.id));
      setNewRows((previousRows) => previousRows.filter((row) => !savedRowKeys.has(row.rowKey)));
      setRowEdits((previousEdits) => Object.fromEntries(
        Object.entries(previousEdits).filter(([id]) => !savedDocumentIds.has(id)),
      ));
    } catch (saveError) {
      console.error('Category grid save error:', saveError);
      alert('카테고리 저장에 실패했습니다. Firestore 권한을 확인해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  const deleteRow = async (row) => {
    if (!row.id) {
      setNewRows((previousRows) => previousRows.filter((item) => item.rowKey !== row.rowKey));
      return;
    }
    if (!window.confirm(`[${buildCategoryCode(row)}] 카테고리를 삭제할까요?\n기존 상품에 저장된 코드는 유지됩니다.`)) return;

    try {
      await deleteDoc(doc(db, 'categoryMasters', row.id));
      setRowEdits((previousEdits) => {
        const nextEdits = { ...previousEdits };
        delete nextEdits[row.id];
        return nextEdits;
      });
    } catch (deleteError) {
      console.error('Category grid delete error:', deleteError);
      alert('카테고리 삭제에 실패했습니다.');
    }
  };

  const resetChanges = () => {
    if (dirtyRows.length > 0 && !window.confirm('저장하지 않은 변경사항을 모두 취소할까요?')) return;
    const highestOrder = categories.reduce((maximum, category) => Math.max(maximum, Number(category.sortOrder) || 0), 0);
    setRowEdits({});
    setNewRows([createEmptyRow(highestOrder + 100 || 100)]);
  };

  return (
    <div className="admin-page admin-master-page">
      <header className="admin-page-header">
        <div>
          <span className="admin-page-eyebrow">MASTER DATA / CATEGORY</span>
          <h1>기준정보</h1>
          <p>분류 코드와 한국어·영어·베트남어 명칭을 스프레드시트 방식으로 관리합니다.</p>
        </div>
        <span className="admin-page-count">{activeCount} ACTIVE / {categories.length} TOTAL</span>
      </header>

      <section className="admin-master-intro">
        <div>
          <span>CATEGORY CODE RULE</span>
          <strong>MAN <i>—</i> TOP <i>—</i> FW</strong>
        </div>
        <p>각 행에서 3레벨 코드와 다국어 명칭, 표시 순서를 한 번에 입력하고 저장합니다.</p>
      </section>

      <AdminAuthorization />

      <section className="admin-card admin-category-sheet-card">
        <div className="admin-category-sheet-toolbar">
          <div>
            <span>CATEGORY SPREADSHEET</span>
            <h2>카테고리 그리드 관리</h2>
            <p>입력 칸은 Tab 키로 연속 이동할 수 있습니다. 한글 명칭과 코드는 필수입니다.</p>
          </div>
          <div className="admin-category-sheet-actions">
            <label className="admin-search-box">
              <span>SEARCH</span>
              <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="코드 또는 다국어 명칭 검색" />
              {searchTerm && <button type="button" onClick={() => setSearchTerm('')} aria-label="검색어 지우기">×</button>}
            </label>
            <button type="button" className="admin-btn-secondary" onClick={addRow}>+ 행 추가</button>
            <button type="button" className="admin-btn-primary" onClick={() => saveRows()} disabled={saving || dirtyRows.length === 0}>
              {saving ? '저장 중...' : `변경사항 저장${dirtyRows.length ? ` (${dirtyRows.length})` : ''}`}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="admin-empty-state">카테고리 기준정보를 불러오고 있습니다.</div>
        ) : error ? (
          <div className="admin-empty-state error">카테고리 정보를 불러오지 못했습니다. Firestore 권한을 확인해 주세요.</div>
        ) : (
          <div className="admin-category-sheet-scroll">
            <table className="admin-category-sheet">
              <colgroup>
                <col className="order" />
                <col className="combined-code" />
                {LEVELS.flatMap((level) => [
                  <col className="level-code" key={`${level}-code-width`} />,
                  <col className="level-name" key={`${level}-ko-width`} />,
                  <col className="level-name" key={`${level}-en-width`} />,
                  <col className="level-name" key={`${level}-vi-width`} />,
                ])}
                <col className="active" />
                <col className="manage" />
              </colgroup>
              <thead>
                <tr className="admin-category-sheet-groups">
                  <th rowSpan="2">순서</th>
                  <th rowSpan="2">통합 코드</th>
                  <th colSpan="4">1차 분류</th>
                  <th colSpan="4">2차 분류</th>
                  <th colSpan="4">3차 분류</th>
                  <th rowSpan="2">사용</th>
                  <th rowSpan="2">관리</th>
                </tr>
                <tr>
                  {LEVELS.flatMap((level) => [
                    <th key={`${level}-code`}>CODE *</th>,
                    <th key={`${level}-ko`}>한국어 *</th>,
                    <th key={`${level}-en`}>ENGLISH</th>,
                    <th key={`${level}-vi`}>TIẾNG VIỆT</th>,
                  ])}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr className={`${row.dirty ? 'dirty' : ''} ${row.active === false ? 'inactive' : ''}`} key={row.rowKey}>
                    <td className="admin-category-order-cell">
                      <input type="number" value={row.sortOrder} onChange={(event) => updateRow(row.rowKey, 'sortOrder', event.target.value)} aria-label="정렬 순서" />
                    </td>
                    <td className="admin-category-code-preview"><code>{buildCategoryCode(row) || '—'}</code>{row.dirty && !isBlankRow(row) && <small>미저장</small>}</td>
                    {LEVELS.flatMap((level) => [
                      <td className="code" key={`${row.rowKey}-${level}-code`}>
                        <input value={row[`level${level}Code`]} onChange={(event) => updateRow(row.rowKey, `level${level}Code`, event.target.value)} placeholder={level === 1 ? 'MAN' : level === 2 ? 'TOP' : 'FW'} maxLength="12" aria-label={`${level}차 코드`} />
                      </td>,
                      ...NAME_FIELDS.map((language) => (
                        <td key={`${row.rowKey}-${level}-${language}`}>
                          <input
                            value={row[`level${level}Name${language}`]}
                            onChange={(event) => updateRow(row.rowKey, `level${level}Name${language}`, event.target.value)}
                            placeholder={language === 'Ko' ? '한글 명칭' : language === 'En' ? 'English name' : 'Tên tiếng Việt'}
                            maxLength="60"
                            aria-label={`${level}차 ${language} 명칭`}
                          />
                        </td>
                      )),
                    ])}
                    <td className="admin-category-active-cell">
                      <input type="checkbox" checked={row.active} onChange={(event) => updateRow(row.rowKey, 'active', event.target.checked)} aria-label="사용 여부" />
                    </td>
                    <td className="admin-category-row-actions">
                      <button type="button" className="save" disabled={saving || !row.dirty || isBlankRow(row)} onClick={() => saveRows([row])}>저장</button>
                      <button type="button" className="delete" disabled={saving} onClick={() => deleteRow(row)}>삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="admin-category-sheet-footer">
          <span>{visibleRows.length} ROWS · {dirtyRows.length} UNSAVED</span>
          <button type="button" className="admin-inline-link" onClick={resetChanges}>변경 취소</button>
        </div>
      </section>
    </div>
  );
}
