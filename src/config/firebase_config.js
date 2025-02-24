// config.js
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore"; // Importer Firestore et les fonctions nécessaires
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD69hkIRNktCbcsSRI55Ua3X-JHuTegXKE",
  authDomain: "taskflow-app-487bb.firebaseapp.com",
  projectId: "taskflow-app-487bb",
  storageBucket: "taskflow-app-487bb.appspot.com",
  messagingSenderId: "333249712676",
  appId: "1:333249712676:web:19ade0bf956d6230a3beb1",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Fonction pour ajouter un projet
const addProject = async (projectName) => {
  if (!projectName.trim()) return;

  try {
    await setDoc(
      doc(db, "projects", projectName.toLowerCase().replace(/\s+/g, "-")),
      {
        name: projectName,
        createdAt: new Date().toISOString(),
      }
    );
  } catch (error) {
    console.error("Erreur lors de l'ajout du projet :", error);
  }
};

export { auth, db, addProject, app };
