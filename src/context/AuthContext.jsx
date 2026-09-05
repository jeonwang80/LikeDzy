import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onIdTokenChanged,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  GoogleAuthProvider, 
  signInWithPopup,
  sendPasswordResetEmail,
  sendEmailVerification
} from 'firebase/auth';
import { auth } from '../firebase';
import { resolveAdminAccess } from '../utils/adminAccess';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  const [adminError, setAdminError] = useState('');

  async function signup(email, password) {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(credential.user);
    return credential;
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    return signOut(auth);
  }

  function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  }

  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  useEffect(() => {
    let generation = 0;
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      const currentGeneration = ++generation;
      setCurrentUser(user);
      setLoading(false);
      setIsAdmin(false);
      setAdminError('');
      setAdminLoading(true);
      try {
        const authorized = await resolveAdminAccess(user);
        if (currentGeneration === generation) setIsAdmin(authorized);
      } catch {
        if (currentGeneration === generation) setAdminError('관리자 권한을 확인할 수 없습니다. 다시 로그인해 주세요.');
      } finally {
        if (currentGeneration === generation) setAdminLoading(false);
      }
    });

    return () => { generation += 1; unsubscribe(); };
  }, []);

  const value = {
    currentUser,
    isAdmin,
    adminLoading,
    adminError,
    resendVerification: () => currentUser ? sendEmailVerification(currentUser) : Promise.reject(new Error('로그인이 필요합니다.')),
    signup,
    login,
    logout,
    loginWithGoogle,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
