import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyC8AF0BkuLrsDOGDRkorJxqqO2NMN6oI_o",
  authDomain: "stockme-forgeon.firebaseapp.com",
  databaseURL: "https://stockme-forgeon-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "stockme-forgeon",
  storageBucket: "stockme-forgeon.firebasestorage.app",
  messagingSenderId: "322383172490",
  appId: "1:322383172490:web:d0c6c0ecf181f8de28ae73",
  measurementId: "G-C198CCJCJF"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getDatabase(app);

let analytics: any = null;
if (typeof window !== "undefined") {
  isSupported().then((yes) => {
    if (yes) analytics = getAnalytics(app);
  });
}

export { app, db, analytics };
