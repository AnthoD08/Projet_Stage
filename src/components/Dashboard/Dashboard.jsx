import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { db } from "../../config/firebase_config";
import { collection, query, onSnapshot, doc, where } from "firebase/firestore";
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

const Dashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState("");

  // Récupération des tâches
  useEffect(() => {
    const q = query(collection(db, "tasks"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTasks(tasksData);
    });
    return () => unsubscribe();
  }, []);

  // Récupération des projets
  useEffect(() => {
    const q = query(collection(db, "projects"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProjects(projectsData);
    });
    return () => unsubscribe();
  }, []);

  // Fonction pour obtenir le nom du projet
  const getProjectName = (projectId) => {
    const project = projects.find((p) => p.id === projectId);
    return project ? project.title : "Inconnu";
  };

  const [sortBy, setSortBy] = useState("priority"); // Critère de tri par défaut
  const [sortOrder, setSortOrder] = useState("asc"); // Ordre de tri par défaut

  const sortTasks = (tasks) => {
    return tasks.sort((a, b) => {
      let comparison = 0;

      // Comparaison en fonction du critère de tri
      if (sortBy === "priority") {
        const priorityOrder = { Haute: 3, Moyenne: 2, Basse: 1 };
        comparison = priorityOrder[b.priority] - priorityOrder[a.priority];
      } else if (sortBy === "dueDate") {
        comparison = dayjs(a.dueDate).diff(dayjs(b.dueDate));
      } else if (sortBy === "project") {
        comparison = getProjectName(a.projectId).localeCompare(
          getProjectName(b.projectId)
        );
      }

      // Inverser l'ordre si nécessaire
      return sortOrder === "asc" ? comparison : -comparison;
    });
  };

  const handleSort = (criteria) => {
    if (sortBy === criteria) {
      // Inverser l'ordre si le critère est déjà sélectionné
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Changer le critère de tri
      setSortBy(criteria);
      setSortOrder("asc"); // Réinitialiser l'ordre à ascendant
    }
  };

  return (
    <div className="p-6 min-h-screen">
      <p>
        C'est ici que vous retrouverez toutes vos tâches
      </p>

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
              <TableHead onClick={() => handleSort("title")}>Titre</TableHead>
              <TableHead className="cursor-pointer"onClick={() => handleSort("priority")}>
                Priorité
              </TableHead>
              <TableHead className="cursor-pointer"onClick={() => handleSort("project")}>
                Projet
              </TableHead>
              <TableHead className="cursor-pointer"onClick={() => handleSort("dueDate")}>
                Date limite
              </TableHead>
              <TableHead>Jours restants</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortTasks(tasks)
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
                        {getProjectName(task.projectId)}
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
