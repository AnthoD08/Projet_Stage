import React, { useState, useEffect, useContext, useMemo } from "react";
import { Link } from "react-router-dom";
import { db } from "../../config/firebase_config";
import {
  collection,
  query,
  onSnapshot,
  where,
  getDocs,
  getDoc,
  doc,
} from "firebase/firestore";
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
  const { user } = useContext(UserContext);
  const [tasks, setTasks] = useState([]);
  const [projectsMap, setProjectsMap] = useState({});
  const [search, setSearch] = useState("");

  // État de tri : key peut être "priority", "project", "dueDate"
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  // Modifier la récupération des projets
  useEffect(() => {
    if (!user) return;

    // 1. Récupérer les projets créés par l'utilisateur
    const userProjectsQuery = query(
      collection(db, "projects"),
      where("createdBy", "==", user.uid)
    );

    // 2. Récupérer les projets où l'utilisateur est membre
    const memberProjectsQuery = query(
      collection(db, "project_members"),
      where("userId", "==", user.uid),
      where("status", "==", "accepted")
    );

    const unsubscribe = async () => {
      try {
        // Récupérer tous les projets
        const [userProjectsSnapshot, memberProjectsSnapshot] =
          await Promise.all([
            getDocs(userProjectsQuery),
            getDocs(memberProjectsQuery),
          ]);

        const map = {};

        // Ajouter les projets créés par l'utilisateur
        userProjectsSnapshot.docs.forEach((doc) => {
          map[doc.id] = doc.data().title;
        });

        // Ajouter les projets où l'utilisateur est membre
        for (const memberDoc of memberProjectsSnapshot.docs) {
          const projectId = memberDoc.data().projectId;
          const projectDoc = await getDoc(doc(db, "projects", projectId));
          if (projectDoc.exists()) {
            map[projectDoc.id] = projectDoc.data().title;
          }
        }

        setProjectsMap(map);
      
      } catch (error) {
        console.error("Erreur lors du chargement des projets:", error);
      }
    };

    unsubscribe();
  }, [user]);

  // Modifier la récupération des tâches
  useEffect(() => {
    if (!user) return;

    const projectIds = Object.keys(projectsMap);
    if (projectIds.length === 0) return;

    const tasksQuery = query(
      collection(db, "tasks"),
      where("projectId", "in", projectIds)
    );

    const unsubscribeTasks = onSnapshot(
      tasksQuery,
      (snapshot) => {
        try {
          const taskList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setTasks(taskList);
        } catch (error) {
          if (error.code === "permission-denied") {
            console.log("Session expirée ou permissions insuffisantes");
            setTasks([]);
          }
        }
      },
      (error) => {
        console.log("Erreur de listener:", error);
        setTasks([]);
      }
    );

    return () => unsubscribeTasks();
  }, [user, projectsMap]);

  // Fonction pour gérer le clic sur les colonnes de tri
  const handleSort = (key) => {
    setSortConfig((prev) => {
      // Si on clique sur la même colonne, on inverse la direction
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      // Sinon, on commence par ascendant
      return { key, direction: "asc" };
    });
  };

  // Mémo pour trier les tâches en fonction de sortConfig et du champ search
  const sortedTasks = useMemo(() => {
    let filteredTasks = tasks.filter((task) =>
      task.title.toLowerCase().includes(search.toLowerCase())
    );

    if (!sortConfig.key) {
      return filteredTasks;
    }

    return filteredTasks.sort((a, b) => {
      let aValue, bValue;
      switch (sortConfig.key) {
        case "priority":
          // On considère que la priorité est une chaîne de caractères
          aValue = a.priority ? a.priority.toLowerCase() : "";
          bValue = b.priority ? b.priority.toLowerCase() : "";
          break;
        case "project":
          // On récupère le titre du projet depuis projectsMap
          aValue = projectsMap[a.projectId]
            ? projectsMap[a.projectId].toLowerCase()
            : "";
          bValue = projectsMap[b.projectId]
            ? projectsMap[b.projectId].toLowerCase()
            : "";
          break;
        case "dueDate":
          aValue = a.dueDate ? dayjs(a.dueDate) : dayjs(0);
          bValue = b.dueDate ? dayjs(b.dueDate) : dayjs(0);
          break;
        default:
          return 0;
      }

      if (sortConfig.key === "dueDate") {
        // Comparaison de dates
        const diff = aValue.diff(bValue);
        return sortConfig.direction === "asc" ? diff : -diff;
      } else {
        // Comparaison de chaînes
        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      }
    });
  }, [tasks, search, sortConfig, projectsMap]);

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case "haute":
        return "bg-red-200 text-red-800";
      case "moyenne":
        return "bg-orange-200 text-orange-800";
      case "faible":
      default:
        return "bg-green-200 text-green-800";
    }
  };

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
              <TableHead
                onClick={() => handleSort("priority")}
                style={{ cursor: "pointer" }}
              >
                Priorité{" "}
                {sortConfig.key === "priority"
                  ? sortConfig.direction === "asc"
                    ? "↑"
                    : "↓"
                  : ""}
              </TableHead>
              <TableHead
                onClick={() => handleSort("project")}
                style={{ cursor: "pointer" }}
              >
                Projet{" "}
                {sortConfig.key === "project"
                  ? sortConfig.direction === "asc"
                    ? "↑"
                    : "↓"
                  : ""}
              </TableHead>
              <TableHead
                onClick={() => handleSort("dueDate")}
                style={{ cursor: "pointer" }}
              >
                Date limite{" "}
                {sortConfig.key === "dueDate"
                  ? sortConfig.direction === "asc"
                    ? "↑"
                    : "↓"
                  : ""}
              </TableHead>
              <TableHead>Jours restants</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTasks.map((task) => {
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
                    <span
                      className={`px-2 py-1 rounded ${getPriorityColor(
                        task.priority
                      )}`}
                    >
                      {task.priority || "Faible"}
                    </span>
                  </TableCell>
                  <TableCell className="hover:underline">
                    <Link to={`/projets/${task.projectId}`}>
                      {projectsMap[task.projectId] || task.projectId}
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
                {sortedTasks.length} tâches
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
};

export default Dashboard;
