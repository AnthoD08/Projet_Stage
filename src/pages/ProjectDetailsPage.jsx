// Importation des dépendances nécessaires
import React, { useEffect, useState, useContext } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
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
import { UserContext } from "../components/Auth/UserContext";
import { LoginForm } from "../components/Auth/LoginForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

export default function ProjectDetailsPage() {
  // Récupération des paramètres de l'URL et du contexte utilisateur
  const { projectId } = useParams();
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  // Initialisation des états pour gérer les données du projet et des tâches
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Nouvelle fonction pour déterminer la source du projet
  const determineProjectSource = async (projectId) => {
    try {
      // Vérifier d'abord dans la collection 'projects'
      const projectRef = doc(db, "projects", projectId);
      let docSnap = await getDoc(projectRef);

      if (docSnap.exists()) {
        return "projects";
      }

      // Si pas trouvé, vérifier dans 'team'
      const teamRef = doc(db, "team", projectId);
      docSnap = await getDoc(teamRef);

      if (docSnap.exists()) {
        return "team";
      }

      return null;
    } catch (error) {
      console.error("Erreur lors de la détermination de la source:", error);
      return null;
    }
  };

  // Effect pour récupérer les détails du projet
  useEffect(() => {
    if (!user) {
      setIsDialogOpen(true);
      return;
    }

    async function fetchProject() {
      const projectSource = await determineProjectSource(projectId);
      const collectionName = projectSource === "team" ? "team" : "projects";
      const projectRef = doc(db, collectionName, projectId);
      const docSnap = await getDoc(projectRef);

      if (docSnap.exists()) {
        setProject({ 
          id: docSnap.id, 
          ...docSnap.data(),
          source: projectSource // Ajouter la source aux données du projet
        });
      }
    }
    fetchProject();
  }, [projectId, user]);

  // Effect pour récupérer les tâches associées au projet
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

  // Calcul des statistiques du projet
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.completed).length;
  const progressPercent =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const tasksInDelay = tasks.filter((task) => {
    return (
      !task.completed &&
      task.dueDate &&
      dayjs(task.dueDate).isBefore(dayjs(), "day")
    );
  }).length;

  // Affichage du dialogue de connexion si l'utilisateur n'est pas connecté
  if (!user) {
    return (
      <Dialog
        open={isDialogOpen}
        onOpenChange={(isOpen) => {
          setIsDialogOpen(isOpen);
          if (!isOpen) {
            navigate("/accueil");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connexion requise</DialogTitle>
          </DialogHeader>
          <LoginForm />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
    
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <Link to={project?.source === "team" ? "/equipes" : "/projets"}>
                  {project?.source === "team" ? "Equipes" : "Projets"}
                </Link>
              </BreadcrumbItem>
              <BreadcrumbSeparator></BreadcrumbSeparator>
              <BreadcrumbItem>Détails du projet</BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        {/* Affichage des détails du projet */}
        {project && (
          <div className="p-6">
            <h1 className="text-3xl font-bold mb-4">{project.title || project.name}</h1>
          </div>
        )}

        <div className="p-6 relative">
          {/* Grid container avec gestion responsive */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Zone principale (formulaire) - prend 3 colonnes sur grand écran */}
            <div className="lg:col-span-3">
              <DashboardProjectDetails projectId={projectId} />
            </div>

            {/* Zone des statistiques - prend 1 colonne sur grand écran */}
            <div className="lg:col-span-1">
              <div className="sticky top-6">
                <h2 className="text-2xl font-bold mb-4">
                  Statistiques du projet
                </h2>
                {project ? (
                  <div className="space-y-4">
                    {/* Carte Deadline */}
                    <div className="p-4 border rounded-lg shadow-sm text-sm w-full bg-white">
                      <h3 className="font-semibold">Deadline</h3>
                      <p className="text-xs text-gray-500">
                        Jours restants avant la deadline du projet
                      </p>
                      <div className="mt-2 flex flex-col items-center">
                        {project.endDate ? (
                          <>
                            <div className="text-3xl font-bold text-blue-600">
                              {dayjs(project.endDate).diff(dayjs(), "day")}
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
                        Taux d'accomplissement des tâches du projet
                      </p>
                      <div className="mt-2 flex flex-col items-center">
                        <div className="text-3xl font-bold">
                          {progressPercent}%
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${progressPercent}%` }}
                          />
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
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
