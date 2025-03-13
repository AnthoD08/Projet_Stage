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
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
} from "firebase/firestore";
import dayjs from "dayjs";
import { PinIcon, FileCheck, Hourglass } from "lucide-react";
import { UserContext } from "../components/Auth/UserContext";
import Dashboard from "@/components/Dashboard/Dashboard";

export default function HomePage() {
  const { user } = useContext(UserContext);
  const [tasksToday, setTasksToday] = useState([]);
  const [tasksCompletedToday, setTasksCompletedToday] = useState([]);
  const [tasksOverdue, setTasksOverdue] = useState([]);
  const [userTasks, setUserTasks] = useState([]);

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
        // 1. Récupérer tous les projets (individuels et d'équipe) de l'utilisateur
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

        const [userProjectsSnapshot, memberProjectsSnapshot] =
          await Promise.all([
            getDocs(userProjectsQuery),
            getDocs(memberProjectsQuery),
          ]);

        // Combiner tous les IDs de projet
        const projectIds = [
          ...userProjectsSnapshot.docs.map((doc) => doc.id),
          ...memberProjectsSnapshot.docs.map((doc) => doc.data().projectId),
        ];

        if (projectIds.length > 0) {
          const tasksRef = collection(db, "tasks");
          const tasksQuery = query(
            tasksRef,
            where("projectId", "in", projectIds)
          );

          const unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
            const tasks = snapshot.docs.map((doc) => {
              const data = doc.data();
              return {
                id: doc.id,
                ...data,
                dueDate: data.dueDate ? dayjs(data.dueDate) : null,
              };
            });

            const today = dayjs().startOf("day");

            // Tâches pour aujourd'hui (non complétées)
            const tasksForToday = tasks.filter(
              (task) =>
                task.dueDate &&
                task.dueDate.isSame(today, "day") &&
                !task.completed
            );

            // Tâches complétées aujourd'hui
            const completedTasksToday = tasks.filter(
              (task) =>
                task.completed &&
                dayjs(task.completedAt || task.updatedAt).isSame(today, "day")
            );

            // Tâches en retard (non complétées et date dépassée)
            const overdueTasks = tasks.filter(
              (task) =>
                task.dueDate &&
                task.dueDate.isBefore(today, "day") &&
                !task.completed
            );

            console.log(
              "Tâches complétées aujourd'hui:",
              completedTasksToday.length
            );

            setTasksToday(tasksForToday);
            setTasksCompletedToday(completedTasksToday);
            setTasksOverdue(overdueTasks);
            setUserTasks(tasks);
          });

          return () => unsubscribe();
        }
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
              <h2 className="text-sm font-light mb-2">
                &Agrave; faire aujourd&apos;hui
              </h2>
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
