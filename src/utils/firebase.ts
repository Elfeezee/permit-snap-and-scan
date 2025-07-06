
import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDCR7DQ1BVmo4tjXoBeAnMyN3UwWdONNbY",
  authDomain: "permitplus-46ec2.firebaseapp.com",
  projectId: "permitplus-46ec2",
  storageBucket: "permitplus-46ec2.firebasestorage.app",
  messagingSenderId: "512549582677",
  appId: "1:512549582677:web:c0212dcc1ffea3a298e1dc"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Storage
export const storage = getStorage(app);
export default app;
