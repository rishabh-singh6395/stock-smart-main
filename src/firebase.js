import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBW1_EsJd0gzIx3V2FnEwxQ6NKn4cakubs",
  authDomain: "smart-stock-dabf5.firebaseapp.com",
  projectId: "smart-stock-dabf5",
  storageBucket: "smart-stock-dabf5.firebasestorage.app",
  messagingSenderId: "10111228474",
  appId: "1:10111228474:web:58839d791147ecb158f303",
  measurementId: "G-MZ00Q7QZ4F",
  databaseURL: "https://smart-stock-dabf5-default-rtdb.firebaseio.com"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);