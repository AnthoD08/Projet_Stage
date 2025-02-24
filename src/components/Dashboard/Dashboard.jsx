import React, { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import { db } from "../../config/firebase_config";
import { collection, query, onSnapshot, where } from "firebase/firestore";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import dayjs from "dayjs";
import { UserContext } from "../Auth/UserContext";

const Dashboard = () => {
  const { user } = useContext(UserContext); // Récupérer l'utilisateur connecté
  const [tasks, setTasks] = useState([]);
  const [search, setSearch] = useState("");

  // Récupération des tâches liées à l'utilisateur connecté
  useEffect(() => {
    if (!user) return; // Ne pas exécuter si l'utilisateur n'est pas connecté

    const tasksQuery = query(
      collection(db, "tasks"),
      where("userId", "==", user.uid) // Filtrer par userId
    );

    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      const taskList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTasks(taskList);
    });

    // Nettoyer l'abonnement Firestore quand le composant est démonté
    return () => unsubscribeTasks();
  }, [user]);

  return (
    <div className="p-6 min-h-screen">
      <p>C'est ici que vous retrouverez toutes vos tâches</p>

      {/* Champ de recherche */}
      <div className="mt-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher"
          className="border p-2 rounded w-full"
        />
      </div>

      {/* Liste des tâches */}
      <div className="mt-8 bg-white shadow-md rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-4">Toutes mes tâches</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Checkbox />
              </TableHead>
              <TableHead>Titre</TableHead>
              <TableHead>Priorité</TableHead>
              <TableHead>Projet</TableHead>
              <TableHead>Date limite</TableHead>
              <TableHead>Jours restants</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks
              .filter((task) =>
                task.title.toLowerCase().includes(search.toLowerCase())
              )
              .map((task) => {
                const dueDate = dayjs(task.dueDate);
                const today = dayjs();
                const daysRemaining = dueDate.diff(today, "day");

                return (
                  <TableRow key={task.id}>
                    <TableCell>
                      <Checkbox checked={task.completed} />
                    </TableCell>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 bg-green-200 text-green-800 rounded">
                        {task.priority || "Faible"}
                      </span>
                    </TableCell>
                    <TableCell className="hover:underline">
                      <Link to={`/projets/${task.projectId}`}>
                        {task.projectId}{" "}
                        {/* Remplacez par le nom du projet si disponible */}
                      </Link>
                    </TableCell>
                    <TableCell>{dueDate.format("DD/MM/YYYY")}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded ${
                          daysRemaining < 0
                            ? "bg-red-200 text-red-800"
                            : "bg-blue-200 text-blue-800"
                        }`}
                      >
                        {daysRemaining >= 0 ? daysRemaining : "Expiré"}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={5}>Total</TableCell>
              <TableCell className="text-right">
                {tasks.length} tâches
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
};

export default Dashboard;
