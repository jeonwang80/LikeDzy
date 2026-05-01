import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

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
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

export default app;
