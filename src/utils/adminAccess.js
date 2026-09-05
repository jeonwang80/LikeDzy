import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const BOOTSTRAP_ADMIN_EMAIL = 'jeonwang80@gmail.com';

export async function resolveAdminAccess(user) {
  if (!user) return false;
  const { claims } = await user.getIdTokenResult();
  if (claims.email_verified !== true) return false;
  if (claims.admin === true || claims.email === BOOTSTRAP_ADMIN_EMAIL) return true;
  try {
    const snapshot = await getDoc(doc(db, 'settings', 'admin'));
    return snapshot.exists() && Array.isArray(snapshot.data().adminUids)
      && snapshot.data().adminUids.includes(user.uid);
  } catch (error) {
    if (error.code === 'permission-denied') return false;
    throw error;
  }
}
