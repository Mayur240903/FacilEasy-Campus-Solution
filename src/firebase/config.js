// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCAQMnrK7XszfNWW07EtXyFBcioTZEgKL4",
  authDomain: "facileasy-744f9.firebaseapp.com",
  projectId: "facileasy-744f9",
  storageBucket: "facileasy-744f9.appspot.com",
  messagingSenderId: "54107047306",
  appId: "1:54107047306:web:4a09125c9d7ab3adb0f473",
  measurementId: "G-W5KJXHLZS0"
};

// Initialize Firebase - only if it hasn't been initialized already
let app;
let analytics;
let auth;
let db;
let storage;

// Check if Firebase app has already been initialized
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  
  // Initialize analytics if in browser environment
  try {
    analytics = getAnalytics(app);
  } catch (error) {
    console.warn("Analytics failed to initialize:", error);
    // Analytics might fail in environments without window/document (SSR)
  }
  
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
} else {
  auth = getAuth();
  db = getFirestore();
  storage = getStorage();
}

// Auth functions
export const registerUser = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log("User registered successfully with Firebase Auth:", userCredential.user.uid);
    return { user: userCredential.user, error: null };
  } catch (error) {
    console.error("Registration error:", error.code, error.message);
    return { user: null, error: error.message };
  }
};

export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("User logged in successfully:", userCredential.user.uid);
    return { user: userCredential.user, error: null };
  } catch (error) {
    console.error("Login error:", error.code, error.message);
    return { user: null, error: error.message };
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true, error: null };
  } catch (error) {
    console.error("Logout error:", error);
    return { success: false, error: error.message };
  }
};

// Create user document function
export const createUserDocument = async (uid, userData) => {
  if (!uid) {
    console.error("Invalid uid provided to createUserDocument");
    return { success: false, error: "Invalid user ID" };
  }

  try {
    console.log("Attempting to save user data for uid:", uid);
    // Add timestamps
    const dataWithTimestamps = {
      ...userData,
      updatedAt: serverTimestamp(),
      createdAt: userData.createdAt || serverTimestamp()
    };

    // Use set with merge option to handle both new documents and updates
    const userRef = doc(db, "users", uid);
    await setDoc(userRef, dataWithTimestamps);
    console.log("User document created/updated successfully");
    return { success: true, error: null };
  } catch (error) {
    console.error("Firestore write error:", error);
    // More detailed error message
    return { 
      success: false, 
      error: error.message,
      errorCode: error.code,
      errorDetails: "Failed to save user data to database" 
    };
  }
};

export { auth, db, storage }; 