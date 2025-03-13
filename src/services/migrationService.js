import { db } from "../config/firebase_config";
import { 
  collection, 
  getDocs, 
  doc, 
  deleteDoc, 
  addDoc,
  serverTimestamp 
} from "firebase/firestore";

export const cleanDatabase = async () => {
  try {
    // Nettoyage des anciennes collections
    const collections = ["projects", "team", "tasks", "team_members"];

    for (const collectionName of collections) {
      const querySnapshot = await getDocs(collection(db, collectionName));
      const deletePromises = querySnapshot.docs.map((document) =>
        deleteDoc(doc(db, collectionName, document.id))
      );
      await Promise.all(deletePromises);
    }

    console.log("Base de données nettoyée avec succès!");
    return true;
  } catch (error) {
    console.error("Erreur lors du nettoyage:", error);
    return false;
  }
};

// Nouvelle fonction pour initialiser la structure
export const initializeDatabase = async (userId) => {
  try {
    // Exemple de projet individuel
    const projectRef = await addDoc(collection(db, "projects"), {
      title: "Exemple de projet individuel",
      description: "Un projet créé automatiquement pour démontrer la structure",
      type: "individual",
      createdBy: userId,
      createdAt: serverTimestamp(),
      startDate: serverTimestamp(),
      endDate: null,
      status: "active"
    });

    // Exemple de projet d'équipe
    const teamProjectRef = await addDoc(collection(db, "projects"), {
      title: "Exemple de projet d'équipe",
      description: "Un projet d'équipe créé automatiquement",
      type: "team",
      createdBy: userId,
      createdAt: serverTimestamp(),
      startDate: serverTimestamp(),
      endDate: null,
      status: "active"
    });

    // Exemple de membre de projet
    await addDoc(collection(db, "project_members"), {
      projectId: teamProjectRef.id,
      userId: userId,
      email: "votre@email.com", // Remplacez par l'email de l'utilisateur
      role: "owner",
      status: "accepted",
      joinedAt: serverTimestamp()
    });

    // Exemple de tâche
    await addDoc(collection(db, "tasks"), {
      projectId: projectRef.id,
      title: "Exemple de tâche",
      description: "Une tâche créée automatiquement",
      status: "todo",
      priority: "medium",
      assignedTo: userId,
      createdBy: userId,
      createdAt: serverTimestamp(),
      dueDate: null
    });

    console.log("Structure de base de données initialisée avec succès!");
    return true;
  } catch (error) {
    console.error("Erreur lors de l'initialisation:", error);
    return false;
  }
};
