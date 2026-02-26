
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

const sanitize = (val: any): string | undefined => {
  if (typeof val !== 'string' || !val.trim()) return undefined;
  // Remove quotes and trailing commas that might have been accidentally added
  // Using global flag to ensure both start and end quotes are removed
  return val.trim().replace(/^["']|["']$/g, '').replace(/,$/, '').replace(/^["']|["']$/g, '').trim();
};

const firebaseConfig = {
  apiKey: sanitize(import.meta.env.VITE_FIREBASE_API_KEY) || "AIzaSyC_b49Sd1Jg8KpWp75BqH9GBRabV44rhxA",
  authDomain: sanitize(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN) || "biosyn-ai.firebaseapp.com",
  projectId: sanitize(import.meta.env.VITE_FIREBASE_PROJECT_ID) || "biosyn-ai",
  storageBucket: sanitize(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET) || "biosyn-ai.firebasestorage.app",
  messagingSenderId: sanitize(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID) || "544113852043",
  appId: sanitize(import.meta.env.VITE_FIREBASE_APP_ID) || "1:544113852043:web:4705222c8187a3f3e35e8e",
  measurementId: sanitize(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID) || "G-PJX1MXGZRJ"
};

// Only initialize if API key is present
const isFirebaseConfigured = !!firebaseConfig.apiKey;

const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
export const googleProvider = new GoogleAuthProvider();

// Initialize Analytics
export const analytics = app ? isSupported().then(yes => yes ? getAnalytics(app) : null) : Promise.resolve(null);

export const signInWithGoogle = async () => {
  if (!auth) {
    throw new Error("Firebase is not configured. Please provide VITE_FIREBASE_API_KEY in your environment variables.");
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Firebase Google Auth Error:", error);
    throw error;
  }
};

export const logoutUser = async () => {
  if (!auth) return;
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Firebase Logout Error:", error);
    throw error;
  }
};
