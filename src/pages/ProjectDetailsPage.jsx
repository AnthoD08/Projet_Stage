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
  const { projectId } = useParams();
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsDialogOpen(true);
      return;
    }

    async function fetchProject() {
      const docRef = doc(db, "projects", projectId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProject({ id: docSnap.id, ...docSnap.data() });
      }
    }
    fetchProject();
  }, [projectId, user]);

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

        {project && (
          <div className="p-6">
            <h1 className="text-3xl font-bold mb-4">{project.title}</h1>
          </div>
        )}

        <div className="p-6 relative">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <DashboardProjectDetails projectId={projectId} />
            </div>
            <div className="col-span-1"></div>
          </div>

          <div className="fixed top-20 right-4 w-64 z-50 border-l border-gray-300 pl-4">
            <div className="flex flex-col items-center space-y-4">
              <h2 className="text-2xl font-bold">Statistiques du projet</h2>
              {project ? (
                <div className="flex flex-col items-center space-y-4 w-full">
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
