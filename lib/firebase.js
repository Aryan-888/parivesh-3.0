// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAePSRetu3prMvHt-wiMatSQlPLZAh8fAI",
  authDomain: "parivesh-portal.firebaseapp.com",
  projectId: "parivesh-portal",
  storageBucket: "parivesh-portal.firebasestorage.app",
  messagingSenderId: "25669787700",
  appId: "1:25669787700:web:1fe0f05413c2b38b9fea61"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// (Optional) Sign in anonymously so Firestore/Storage rules that require auth will work.
// Remove this if you implement proper auth in your app.
export const auth = getAuth(app);
signInAnonymously(auth).catch((error) => {
  console.error("Firebase anonymous sign-in failed:", error);
});

export const db = getFirestore(app);
export const storage = getStorage(app);