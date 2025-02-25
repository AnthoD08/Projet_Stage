import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../../config/firebase_config";
import { Button } from "@/components/ui/button";
import { Plus, Trash } from "lucide-react";
import {
  collection,
  query,
  onSnapshot,
  doc,
  addDoc,
  deleteDoc,
  where,
  updateDoc,
} from "firebase/firestore";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import dayjs from "dayjs";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

const Dashboard = () => {
  const { projectId } = useParams();
  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newPriority, setNewPriority] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);

  useEffect(() => {
    if (!projectId) return;
    const q = query(
      collection(db, "tasks"),
      where("projectId", "==", projectId)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setTasks(tasksData);
    });
    return () => unsubscribe();
  }, [projectId]);

  const handleAddTask = async () => {
    if (newTaskTitle.trim() === "" || newDueDate.trim() === "" || !projectId)
      return;
    try {
      await addDoc(collection(db, "tasks"), {
        title: newTaskTitle,
        status: "in-progress",
        dueDate: newDueDate,
        priority: newPriority,
        projectId: projectId,
        completed: false,
      });
      setNewTaskTitle("");
      setNewDueDate("");
      setNewPriority("Moyenne");
      setShowAddTaskForm(false);
    } catch (error) {
      console.error("Erreur lors de l'ajout de la tâche :", error);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!taskId) return;
    try {
      await deleteDoc(doc(db, "tasks", taskId));
    } catch (error) {
      console.error("Erreur lors de la suppression :", error);
    }
  };

  const filteredTasks = tasks.filter((task) =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleTaskCompletion = async (taskId, currentStatus) => {
    try {
      const taskRef = doc(db, "tasks", taskId);
      await updateDoc(taskRef, { completed: !currentStatus });
    } catch (error) {
      console.error("Erreur lors de la mise à jour :", error);
    }
  };

  return (
    <div className="p-4 min-h-screen space-y-6">
      {/* Bloc 1 : Formulaire d'ajout */}
      <div className="p-4 bg-white rounded shadow">
        <Button
          variant="outline"
          onClick={() => setShowAddTaskForm(!showAddTaskForm)}
        >
          <Plus size={16} strokeWidth={2} /> Ajouter une tâche
        </Button>

        {showAddTaskForm && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Titre
                </label>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Nom de la tâche"
                  className="border p-2 rounded w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Date limite
                </label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="border p-2 rounded w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Priorité
                </label>
                <select
                  value={newPriority || ""}
                  onChange={(e) => setNewPriority(e.target.value)}
                  className="border p-2 rounded w-full"
                >
                  <option value="" disabled>
                    Choisir une priorité
                  </option>
                  <option value="Basse">🟢 Basse</option>
                  <option value="Moyenne">🟡 Moyenne</option>
                  <option value="Haute">🔴 Haute</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowAddTaskForm(false)}
              >
                Annuler
              </Button>
              <Button variant="outline" onClick={handleAddTask}>
                <Plus size={16} strokeWidth={2} /> Ajouter
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bloc 2 : Barre de recherche */}
      <div className="p-4 bg-white rounded shadow">
        <input
          type="text"
          placeholder="Rechercher..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border p-2 rounded w-full"
        />
      </div>

      {/* Bloc 3 : Liste des tâches */}
      <div className="p-4 bg-white shadow-md rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Toutes mes tâches</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead>Priorité</TableHead>
              <TableHead>Date limite</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTasks.map((task) => (
              <TableRow key={task.id} className="hover:bg-gray-50">
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() =>
                        toggleTaskCompletion(task.id, task.completed)
                      }
                    />

                    <span className="font-medium">{task.title}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded ${
                      task.priority?.toLowerCase() === "haute"
                        ? "bg-red-200 text-red-800"
                        : task.priority?.toLowerCase() === "moyenne"
                        ? "bg-orange-200 text-orange-800"
                        : "bg-green-200 text-green-800"
                    }`}
                  >
                    {task.priority || "Faible"}
                  </span>
                </TableCell>
                <TableCell>
                  {dayjs(task.dueDate).format("DD/MM/YYYY")}
                </TableCell>
                <TableCell>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost">
                        <Trash
                          size={18}
                          className="text-red-500 hover:text-red-700"
                        />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Supprimer cette tâche
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Êtes-vous sûr de vouloir supprimer cette tâche ? Cette
                          action est irréversible.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteTask(task.id)}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Dashboard;
