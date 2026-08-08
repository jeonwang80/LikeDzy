import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';

export function formatCategoryPath(category) {
  if (!category) return '';
  return [category.level1Name, category.level2Name, category.level3Name]
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
