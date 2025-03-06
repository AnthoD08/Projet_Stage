// config.js
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore"; // Importer Firestore et les fonctions nécessaires
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD69hkIRNktCbcsSRI55Ua3X-JHuTegXKE",
  authDomain: "taskflow-app-487bb.firebaseapp.com",
  projectId: "taskflow-app-487bb",
  storageBucket: "taskflow-app-487bb.appspot.com", 
  messagingSenderId: "333249712676",
  appId: "1:333249712676:web:19ade0bf956d6230a3beb1",
};

// Configuration des services Firebase
const app = initializeApp(firebaseConfig);  // Initialise l'application Firebase
const db = getFirestore(app);              // Instance de la base de données Firestore
const auth = getAuth(app);                 // Instance du service d'authentification
const storage = getStorage(app);           // Instance du service de stockage

// Fonction asynchrone pour ajouter un nouveau projet dans Firestore
const addProject = async (projectName) => {
  // Vérifie si le nom du projet n'est pas vide après suppression des espaces
  if (!projectName.trim()) return;

  try {
    // Crée ou met à jour un document dans la collection "projects"
    await setDoc(
      // Définit l'ID du document en formatant le nom du projet
      doc(db, "projects", projectName.toLowerCase().replace(/\s+/g, "-")),
      {
        name: projectName,                    // Stocke le nom original du projet
        createdAt: new Date().toISOString(), // Ajoute la date de création
      }
    );
  } catch (error) {
    // Gestion des erreurs avec affichage dans la console
    console.error("Erreur lors de l'ajout du projet :", error);
  }
};

// Exporte les services et fonctions pour utilisation dans d'autres fichiers
export { auth, db, storage, addProject, app };
