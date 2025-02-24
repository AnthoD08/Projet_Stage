import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/Sidebar/AppSidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import DashboardProjectDetails from "@/components/Dashboard/DashboardProjects";
import {
  doc,
  getDoc,
  collection,
  query,
  onSnapshot,
  where,
} from "firebase/firestore";
import { db } from "../config/firebase_config";
import dayjs from "dayjs";

export default function ProjectDetailsPage() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);

  // Récupération des informations du projet
  useEffect(() => {
    async function fetchProject() {
      const docRef = doc(db, "projects", projectId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProject({ id: docSnap.id, ...docSnap.data() });
      }
    }
    fetchProject();
  }, [projectId]);

  // Récupération des tâches associées au projet
  useEffect(() => {
    if (!projectId) return;
    const q = query(
      collection(db, "tasks"),
      where("projectId", "==", projectId)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTasks(tasksData);
    });
    return () => unsubscribe();
  }, [projectId]);

  // Calcul de la progression en fonction des tâches terminées
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.completed).length;
  const progressPercent =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Calcul du nombre de tâches en retard (non terminées et dépassant la date limite)
  const tasksInDelay = tasks.filter((task) => {
    return (
      !task.completed &&
      task.dueDate &&
      dayjs(task.dueDate).isBefore(dayjs(), "day")
    );
  }).length;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header avec déclencheur de sidebar et fil d’Ariane */}
        <header className="flex h-16 shrink-0 items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <Link to="/projets">Projets</Link>
              </BreadcrumbItem>
              <BreadcrumbSeparator>/</BreadcrumbSeparator>
              <BreadcrumbItem>Détails du projet</BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        {/* Titre du projet */}
        {project && (
          <div className="p-6">
            <h1 className="text-3xl font-bold mb-4">{project.title}</h1>
          </div>
        )}

        {/* Contenu principal en deux colonnes */}
        <div className="p-6 relative">
          <div className="grid grid-cols-3 gap-4">
            {/* Colonne de gauche : Dashboard (liste des tâches et formulaire d'ajout) */}
            <div className="col-span-2">
              <DashboardProjectDetails projectId={projectId} />
            </div>
            {/* On laisse la 3ème colonne vide pour l'alignement dans la grille */}
            <div className="col-span-1"></div>
          </div>

          {/* Colonne de droite : Statistiques du projet en position fixed */}
          <div className="fixed top-20 right-4 w-64 z-50 border-l border-gray-300 pl-4">
            <div className="flex flex-col items-center space-y-4">
              <h2 className="text-2xl font-bold">Statistiques du projet</h2>
              {project ? (
                <div className="flex flex-col items-center space-y-4 w-full">
                  {/* Carte Deadline */}
                  <div className="p-4 border rounded-lg shadow-sm text-sm w-full bg-white">
                    <h3 className="font-semibold">Deadline</h3>
                    <p className="text-xs text-gray-500">
                      Jours restants avant la deadline du projet
                    </p>
                    <div className="mt-2 flex flex-col items-center">
                      {project.deadline ? (
                        <>
                          <div className="text-3xl font-bold text-blue-600">
                            {dayjs(project.deadline).diff(dayjs(), "day")}
                          </div>
                          <p className="text-gray-600">Jours</p>
                        </>
                      ) : (
                        <p>Non défini</p>
                      )}
                    </div>
                  </div>

                  {/* Carte Progression */}
                  <div className="p-4 border rounded-lg shadow-sm text-sm w-full bg-white">
                    <h3 className="font-semibold">Progression</h3>
                    <p className="text-xs text-gray-500">
                      Taux d’accomplissement des tâches du projet
                    </p>
                    <div className="mt-2 flex flex-col items-center">
                      <div className="text-3xl font-bold">
                        {progressPercent}%
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${progressPercent}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Carte Retard */}
                  <div className="p-4 border rounded-lg shadow-sm text-sm w-full bg-white">
                    <h3 className="font-semibold">Retard</h3>
                    <p className="text-xs text-gray-500">
                      Nombre de tâches ayant dépassé la date limite
                    </p>
                    <div className="mt-2 flex justify-center items-center">
                      {tasksInDelay > 0 ? (
                        <span className="text-red-500 text-3xl font-bold">
                          {tasksInDelay}
                        </span>
                      ) : (
                        <div className="w-10 h-10 flex items-center justify-center bg-green-100 rounded-full">
                          <span className="text-green-600 text-2xl">✔</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p>Chargement des statistiques...</p>
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
