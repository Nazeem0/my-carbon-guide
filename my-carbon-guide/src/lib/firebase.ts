import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDXA5gJo88wmgcbSpdbZOvW-Q9KNF76YVo",
  authDomain: "my-carbon-guide.firebaseapp.com",
  projectId: "my-carbon-guide",
  storageBucket: "my-carbon-guide.firebasestorage.app",
  messagingSenderId: "1088753562033",
  appId: "1:1088753562033:web:fbd03d848f9a80752f4d90"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore
export const db = getFirestore(app);
