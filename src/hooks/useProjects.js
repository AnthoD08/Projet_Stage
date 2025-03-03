import { db } from "../config/firebase_config";
import { collection, addDoc, onSnapshot } from "firebase/firestore";
import { useState, useEffect } from "react";

// Hook personnalisé pour récupérer les projets
const useProjects = () => {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "projects"), (snapshot) => {
      const projectsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProjects(projectsData);
    });

    return () => unsubscribe(); // Nettoyer l'écouteur en cas de démontage du composant
  }, []);

  return projects;
};

// Fonction pour ajouter un projet
export const addProject = async (title) => {
  try {
    await addDoc(collection(db, "projects"), { title });
  } catch (error) {
    console.error("Erreur lors de l'ajout du projet :", error);
  }
};

export default useProjects;
