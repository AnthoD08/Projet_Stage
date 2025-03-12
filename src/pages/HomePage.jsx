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
import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
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

  useEffect(() => {
    if (!user) {
      setTasksToday([]);
      setTasksCompletedToday([]);
      setTasksOverdue([]);
      setUserTasks([]);
      return;
    }

    const fetchAllTasks = async () => {
      try {
        // 1. Récupérer tous les projets individuels
        const individualProjectsQuery = query(
          collection(db, "projects"),
          where("userId", "==", user.uid)
        );
        const individualProjectsSnapshot = await getDocs(individualProjectsQuery);
        const individualProjectIds = individualProjectsSnapshot.docs.map(doc => doc.id);

        // 2. Récupérer tous les projets d'équipe où l'utilisateur est assigné à des tâches
        const teamProjectMembersQuery = query(
          collection(db, "team_members"),
          where("email", "==", user.email),
          where("status", "==", "accepted")
        );
        const teamMembersSnapshot = await getDocs(teamProjectMembersQuery);
        const teamProjectIds = teamMembersSnapshot.docs.map(doc => doc.data().projectId);

        // 3. Récupérer toutes les tâches des projets individuels
        let allTasks = [];
        const individualTasksQuery = query(
          collection(db, "tasks"),
          where("projectId", "in", individualProjectIds.length > 0 ? individualProjectIds : ['dummy'])
        );
        const individualTasksSnapshot = await getDocs(individualTasksQuery);
        allTasks.push(...individualTasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // 4. Récupérer toutes les tâches des projets d'équipe assignées à l'utilisateur
        if (teamProjectIds.length > 0) {
          for (const projectId of teamProjectIds) {
            const teamTasksQuery = query(
              collection(db, "tasks"),
              where("projectId", "==", projectId),
              where("assignedTo", "==", user.email)
            );
            const teamTasksSnapshot = await getDocs(teamTasksQuery);
            allTasks.push(...teamTasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          }
        }

        // 5. Filtrer et mettre à jour les états
        const today = dayjs().format("YYYY-MM-DD");
        
        const tasksForToday = allTasks.filter(
          task => task.dueDate === today && !task.completed
        );
        const completedTasksToday = allTasks.filter(
          task => task.completed === true
        );
        const overdueTasks = allTasks.filter(
          task => task.dueDate < today && !task.completed
        );

        setTasksToday(tasksForToday);
        setTasksCompletedToday(completedTasksToday);
        setTasksOverdue(overdueTasks);
        setUserTasks(allTasks);
      } catch (error) {
        console.error("Erreur lors de la récupération des tâches:", error);
      }
    };

    fetchAllTasks();
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
              <h2 className="text-sm font-light mb-2">&Agrave; faire aujourd&apos;hui</h2>
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
