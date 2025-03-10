// Importation des dépendances nécessaires
import { useEffect, useState, useContext } from "react";
import { AppSidebar } from "@/components/Sidebar/AppSidebar";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbSeparator,
  BreadcrumbList,
} from "@/components/ui/breadcrumb";
import { db } from "../config/firebase_config";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import dayjs from "dayjs";
import { PinIcon, FileCheck, Hourglass } from "lucide-react";
import { UserContext } from "../components/Auth/UserContext";
import Dashboard from "@/components/Dashboard/Dashboard";

export default function HomePage() {
  // Récupération du contexte utilisateur pour l'authentification
  const { user } = useContext(UserContext);

  // Initialisation des états pour gérer les différentes catégories de tâches
  const [tasksToday, setTasksToday] = useState([]); // Tâches à faire aujourd'hui
  const [tasksCompletedToday, setTasksCompletedToday] = useState([]); // Tâches terminées aujourd'hui
  const [tasksOverdue, setTasksOverdue] = useState([]); // Tâches en retard
  const [userTasks, setUserTasks] = useState([]); // Toutes les tâches de l'utilisateur

  // Effect pour synchroniser les données avec Firestore
  useEffect(() => {
    // Vérifie si un utilisateur est connecté
    if (!user) {
      // Réinitialisation des états si aucun utilisateur n'est connecté
      setTasksToday([]);
      setTasksCompletedToday([]);
      setTasksOverdue([]);
      return;
    }

    // Obtention de la date du jour au format YYYY-MM-DD
    const today = dayjs().format("YYYY-MM-DD");
    const projectsRef = collection(db, "projects");

    // Création d'une requête pour obtenir les projets de l'utilisateur
    const projectsQuery = query(projectsRef, where("userId", "==", user.uid));

    // Observer les changements dans les projets de l'utilisateur en temps réel
    const unsubscribeProjects = onSnapshot(projectsQuery, (snapshot) => {
      const userProjects = snapshot.docs.map((doc) => doc.id);

      // Si l'utilisateur n'a pas de projets, réinitialiser les états
      if (userProjects.length === 0) {
        setTasksToday([]);
        setTasksCompletedToday([]);
        setTasksOverdue([]);
        return;
      }

      const tasksRef = collection(db, "tasks");

      // Limitation Firestore : maximum 10 éléments dans une clause "in"
      if (userProjects.length > 10) {
        console.warn("Trop de projets pour utiliser 'in', requête divisée.");
        return;
      }

      // Création d'une requête pour obtenir toutes les tâches des projets
      const tasksQuery = query(
        tasksRef,
        where("projectId", "in", userProjects)
      );

      // Observer les changements dans les tâches en temps réel
      const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
        // Conversion des documents Firestore en objets JavaScript
        const allTasks = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Mise à jour de l'état global des tâches
        setUserTasks(allTasks);

        // Filtrage des tâches selon leur statut et date
        const tasksForToday = allTasks.filter(
          (task) => task.dueDate === today && !task.completed
        );
        const completedTasksToday = allTasks.filter(
          (task) => task.completed === true
        );
        const overdueTasks = allTasks.filter(
          (task) => task.dueDate < today && !task.completed
        );

        // Mise à jour des états avec les tâches filtrées
        setTasksToday(tasksForToday);
        setTasksCompletedToday(completedTasksToday);
        setTasksOverdue(overdueTasks);
      });

      // Nettoyage de l'observer des tâches
      return () => unsubscribeTasks();
    });

    // Nettoyage de l'observer des projets lors du démontage du composant
    return () => unsubscribeProjects();
  }, [user]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* En-tête avec navigation */}
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  Dashboard
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem></BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        {/* Contenu principal */}
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {/* Grille des statistiques */}
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            {/* Carte des tâches à faire aujourd'hui */}
            <div className="aspect-video rounded-xl bg-white shadow-md p-4 flex flex-col items-center justify-center">
              <PinIcon color="#4E78F2" className="mb-3" />
              <h2 className="text-sm font-light mb-2">À faire aujourd'hui</h2>
              <p className="text-2xl font-bold">{tasksToday.length}</p>
            </div>

            {/* Carte des tâches accomplies */}
            <div className="aspect-video rounded-xl bg-white shadow-md p-4 flex flex-col items-center justify-center">
              <FileCheck color="#1D9F64" className="mb-3" />
              <h2 className="text-sm font-light mb-2">Tâches accomplies</h2>
              <p className="text-2xl font-bold">{tasksCompletedToday.length}</p>
            </div>

            {/* Carte des tâches en retard */}
            <div className="aspect-video rounded-xl bg-white shadow-md p-4 flex flex-col items-center justify-center">
              <Hourglass color="#E17E23" className="mb-3" />
              <h2 className="text-sm font-light mb-2">En retard</h2>
              <p className="text-2xl font-bold">{tasksOverdue.length}</p>
            </div>
          </div>

          {/* Zone du tableau de bord */}
          <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min">
            {/* Affichage conditionnel selon l'état de connexion */}
            {user ? (
              <Dashboard userId={user.uid} tasks={userTasks} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <h1 className="text-xl">
                  Connectez-vous pour voir vos projets et tâches.
                </h1>
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
