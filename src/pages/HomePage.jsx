import React, { useEffect, useState, useContext } from "react";
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
      return;
    }

    const today = dayjs().format("YYYY-MM-DD");
    const projectsRef = collection(db, "projects");

    // 🔹 Récupérer les projets de l'utilisateur
    const projectsQuery = query(projectsRef, where("userId", "==", user.uid));
    const unsubscribeProjects = onSnapshot(projectsQuery, (snapshot) => {
      const userProjects = snapshot.docs.map((doc) => doc.id); // Liste des projectId

      if (userProjects.length === 0) {
        setTasksToday([]);
        setTasksCompletedToday([]);
        setTasksOverdue([]);
        return;
      }

      const tasksRef = collection(db, "tasks");

      // 🔹 Vérifier si Firestore autorise "in" avec plusieurs projectId
      if (userProjects.length > 10) {
        console.warn("Trop de projets pour utiliser 'in', requête divisée.");
        return; // Alternative : diviser la requête si besoin
      }

      const tasksQuery = query(
        tasksRef,
        where("projectId", "in", userProjects)
      );

      const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
        const allTasks = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Mettre à jour userTasks avec toutes les tâches récupérées
        setUserTasks(allTasks);

        // 🔹 Filtrage des tâches selon leur statut
        const tasksForToday = allTasks.filter(
          (task) => task.dueDate === today && !task.completed
        );
        const completedTasksToday = allTasks.filter(
          (task) => task.completed === true
        );
        const overdueTasks = allTasks.filter(
          (task) => task.dueDate < today && !task.completed
        );

        setTasksToday(tasksForToday);
        setTasksCompletedToday(completedTasksToday);
        setTasksOverdue(overdueTasks);
      });

      return () => unsubscribeTasks();
    });

    return () => unsubscribeProjects();
  }, [user]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
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
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <div className="aspect-video rounded-xl bg-white shadow-md p-4 flex flex-col items-center justify-center">
              <PinIcon color="#4E78F2" className="mb-3" />
              <h2 className="text-sm font-light mb-2">À faire aujourd’hui</h2>
              <p className="text-2xl font-bold">{tasksToday.length}</p>
            </div>
            <div className="aspect-video rounded-xl bg-white shadow-md p-4 flex flex-col items-center justify-center">
              <FileCheck color="#1D9F64" className="mb-3" />
              <h2 className="text-sm font-light mb-2">Tâches accomplies</h2>
              <p className="text-2xl font-bold">{tasksCompletedToday.length}</p>
            </div>
            <div className="aspect-video rounded-xl bg-white shadow-md p-4 flex flex-col items-center justify-center">
              <Hourglass color="#E17E23" className="mb-3" />
              <h2 className="text-sm font-light mb-2">En retard</h2>
              <p className="text-2xl font-bold">{tasksOverdue.length}</p>
            </div>
          </div>

          <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min">
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
