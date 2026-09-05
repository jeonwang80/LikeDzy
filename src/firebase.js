import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDK_a3nr437qsYzccMzPESSSltbjA6SXI4",
  authDomain: "likedzy-store.firebaseapp.com",
  projectId: "likedzy-store",
  storageBucket: "likedzy-store.firebasestorage.app",
  messagingSenderId: "261323319860",
  appId: "1:261323319860:web:6fd2b9bce7d21f14dd7861"
};

// Initialize Firebase
export const usingEmulators = import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';
if (usingEmulators && !['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)) {
  throw new Error('격리 테스트는 localhost에서만 실행할 수 있습니다.');
}
const app = initializeApp(usingEmulators ? {
  apiKey: 'demo-only', projectId: 'demo-likedzy', authDomain: 'localhost', storageBucket: 'demo-likedzy.appspot.com',
} : firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
export const functions = getFunctions(app, 'us-central1');

if (usingEmulators) {
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectStorageEmulator(storage, '127.0.0.1', 9199);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}
const appCheckSiteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY;
export const appCheckConfigured = usingEmulators || Boolean(appCheckSiteKey);
if (!usingEmulators && appCheckSiteKey) {
  initializeAppCheck(app, { provider: new ReCaptchaV3Provider(appCheckSiteKey), isTokenAutoRefreshEnabled: true });
}

export default app;
