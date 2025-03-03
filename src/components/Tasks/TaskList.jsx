import { useState, useEffect, useContext } from "react";
import { db } from "../../config/firebase_config";
import {
  collection,
  addDoc,
  deleteDoc,
  onSnapshot,
  where,
  query,
  doc,
} from "firebase/firestore";
import { UserContext } from "../Auth/UserContext";

export default function TaskList({ projectId }) {
  const { user } = useContext(UserContext);
  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("Faible");
  const [newTaskStatus, setNewTaskStatus] = useState("En cours");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      setTasks([]);
      return;
    }

    const q = query(
      collection(db, "tasks"),
      where("projectId", "==", projectId),
      where("userId", "==", user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTasks(taskList);
    });

    return () => unsubscribe();
  }, [user, projectId]);

  const handleAddTask = async () => {
    if (!user) {
      setError("Vous devez être connecté pour ajouter une tâche.");
      return;
    }

    if (newTaskTitle.trim() === "") {
      setError("Le titre de la tâche ne peut pas être vide.");
      return;
    }

    try {
      const docRef = await addDoc(collection(db, "tasks"), {
        title: newTaskTitle,
        priority: newTaskPriority,
        status: newTaskStatus,
        projectId,
        userId: user.uid,
        createdAt: new Date(),
      });

      setTasks([
        ...tasks,
        {
          id: docRef.id,
          title: newTaskTitle,
          priority: newTaskPriority,
          status: newTaskStatus,
          projectId,
          userId: user.uid,
        },
      ]);
      setNewTaskTitle("");
      setNewTaskPriority("Faible");
      setNewTaskStatus("En cours");
      setError("");
    } catch (error) {
      console.error("Erreur lors de l'ajout :", error);
      setError("Ajout impossible.");
    }
  };

  const handleDeleteTask = async (taskId) => {
    const confirmDelete = window.confirm(
      "Voulez-vous vraiment supprimer cette tâche ?"
    );
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "tasks", taskId));
      setTasks((prevTasks) => prevTasks.filter((t) => t.id !== taskId));
    } catch (error) {
      console.error("Erreur lors de la suppression :", error);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold">Tâches</h2>
      <div className="space-y-4">
        {tasks.map((task) => (
          <div key={task.id} className="flex justify-between items-center">
            <span>{task.title}</span>
            <button onClick={() => handleDeleteTask(task.id)}>Supprimer</button>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <input
          type="text"
          placeholder="Nouvelle tâche"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          className="border p-2 rounded w-full"
        />
        <select
          value={newTaskPriority}
          onChange={(e) => setNewTaskPriority(e.target.value)}
          className="border p-2 rounded w-full mt-2"
        >
          <option value="Faible">Faible</option>
          <option value="Moyenne">Moyenne</option>
          <option value="Haute">Haute</option>
        </select>
        <select
          value={newTaskStatus}
          onChange={(e) => setNewTaskStatus(e.target.value)}
          className="border p-2 rounded w-full mt-2"
        >
          <option value="En cours">En cours</option>
          <option value="Terminée">Terminée</option>
        </select>
        <button
          onClick={handleAddTask}
          className="bg-blue-500 text-white px-4 py-2 rounded mt-2"
        >
          Ajouter
        </button>
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>
    </div>
  );
}
