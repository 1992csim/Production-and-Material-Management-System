import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

let isInitialized = false;

export async function initFirebaseClient() {
  if (isInitialized && getApps().length > 0) {
    const app = getApp();
    const auth = getAuth(app);
    return { auth, provider: new GoogleAuthProvider() };
  }

  try {
    const res = await fetch("/api/firebase-config");
    if (!res.ok) {
      throw new Error("Failed to fetch Firebase configuration from backend");
    }
    const config = await res.json();
    
    const firebaseConfig = {
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId
    };

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    
    isInitialized = true;
    console.log("Client Firebase Auth initialized successfully");
    return { auth, provider };
  } catch (error) {
    console.error("Error initializing client Firebase Auth:", error);
    throw error;
  }
}
