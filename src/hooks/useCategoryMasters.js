import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';

const HUNGARIAN_CATEGORY_NAMES = { MAN: 'Férfi', WOMAN: 'Női', ACCESSORIES: 'Kiegészítők', ACC: 'Kiegészítők', TOP: 'Felsők', BOTTOM: 'Alsók', OUTERWEAR: 'Kabátok', CAPHAT: 'Sapkák és kalapok', CAP: 'Sapkák', SHORT: 'Rövidnadrágok', LONG: 'Hosszúnadrágok', SS: 'Tavasz / Nyár', FW: 'Ősz / Tél' };

export function getCategoryName(category, level, language = 'ko') {
  if (!category) return '';
  const languageSuffix = language === 'hu' ? 'Hu' : language === 'en' ? 'En' : language === 'vi' ? 'Vi' : 'Ko';
  return category[`level${level}Name${languageSuffix}`]
    || (language === 'hu' && HUNGARIAN_CATEGORY_NAMES[String(category[`level${level}Code`] || '').toUpperCase().replace('ACCESORRIES', 'ACCESSORIES')])
    || (language !== 'ko' && category[`level${level}NameEn`])
    || category[`level${level}NameKo`]
    || category[`level${level}Name`]
    || category[`level${level}Code`]
    || '';
}

export function formatCategoryPath(category, language = 'ko') {
  if (!category) return '';
  return [1, 2, 3].map((level) => getCategoryName(category, level, language))
    .filter(Boolean)
    .join(' / ');
}

export function useCategoryMasters({ activeOnly = false } = {}) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const categoriesQuery = query(collection(db, 'categoryMasters'), orderBy('sortOrder', 'asc'));
    const unsubscribe = onSnapshot(categoriesQuery, (snapshot) => {
      const items = snapshot.docs.map((categoryDoc) => ({
        id: categoryDoc.id,
        ...categoryDoc.data(),
      }));
      setCategories(items);
      setError(null);
      setLoading(false);
    }, (snapshotError) => {
      console.error('Category master subscription error:', snapshotError);
      setError(snapshotError);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredCategories = useMemo(() => (
    activeOnly ? categories.filter((category) => category.active !== false) : categories
  ), [activeOnly, categories]);

  return { categories: filteredCategories, loading, error };
}
