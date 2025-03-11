import { useState, useEffect, useContext } from "react";
import { Plus, Trash2 } from "lucide-react";
import { db } from "../config/firebase_config";
import { Link, useNavigate } from "react-router-dom";
import {
  collection,
  addDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  where,
  query,
  doc,
} from "firebase/firestore";
import { UserContext } from "../components/Auth/UserContext";
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
import ProjectWizard from "@/components/Projects/ProjectWizard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoginForm } from "../components/Auth/LoginForm";
import { RegisterForm } from "../components/Auth/RegisterForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export default function ProjectsPage() {
  const { user, logout } = useContext(UserContext);
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [error, setError] = useState("");
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Nouvel état pour gérer le mode d'authentification : "login" ou "register"
  const [authMode, setAuthMode] = useState("login");

  // Rediriger l'utilisateur vers la page de connexion s'il n'est pas connecté
  useEffect(() => {
    if (!user && !isLoggingOut) {
      setIsDialogOpen(true);
    }
  }, [user, isLoggingOut]);

  // Récupération des projets liés à l'utilisateur connecté
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "projects"),
      where("userId", "==", user.uid)
    );
    // Création d'un écouteur en temps réel sur la collection de projets
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Transformation des documents Firestore en objets JavaScript
      const projectList = snapshot.docs.map((doc) => ({
        id: doc.id, // Récupération de l'ID unique du document
        ...doc.data(), // Déstructuration des données du document (titre, dates, etc.)
      }));

      // Mise à jour de l'état React avec la nouvelle liste de projets
      setProjects(projectList);
    });

    return () => unsubscribe();
  }, [user]);

  // Ajouter un projet
  const handleAddProject = async () => {
    if (!user) {
      setError("Vous devez être connecté pour ajouter un projet.");
      return;
    }

    if (newProjectTitle.trim() === "") {
      setError("Le titre du projet ne peut pas être vide.");
      return;
    }
    if (projects.some((p) => p.title === newProjectTitle)) {
      setError("Un projet avec ce titre existe déjà.");
      return;
    }

    try {
      const docRef = await addDoc(collection(db, "projects"), {
        title: newProjectTitle,
        startDate: new Date().toISOString(),
        endDate: new Date(
          new Date().setDate(new Date().getDate() + 30)
        ).toISOString(),
        userId: user.uid,
      });

      setProjects([
        ...projects,
        { id: docRef.id, title: newProjectTitle, userId: user.uid },
      ]);
      setNewProjectTitle("");
      setError("");
    } catch (error) {
      console.error("Erreur lors de l'ajout :", error);
      setError("Ajout impossible.");
    }
  };

  // Supprimer un projet
  const handleDeleteProject = async (projectId) => {
    setProjectToDelete(projectId);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;

    try {
      const tasksQuery = query(
        collection(db, "tasks"),
        where("projectId", "==", projectToDelete)
      );
      const tasksSnapshot = await getDocs(tasksQuery);
      const tasksToDelete = tasksSnapshot.docs.map((doc) => doc.id);

      const deleteTasksPromises = tasksToDelete.map((taskId) =>
        deleteDoc(doc(db, "tasks", taskId))
      );
      await Promise.all(deleteTasksPromises);

      await deleteDoc(doc(db, "projects", projectToDelete));
      setProjects((prevProjects) =>
        prevProjects.filter((p) => p.id !== projectToDelete)
      );
    } catch (error) {
      console.error("Erreur lors de la suppression :", error);
    } finally {
      setShowDeleteDialog(false);
      setProjectToDelete(null);
    }
  };

  // Fonction de déconnexion
  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    setProjects([]);
    navigate("/accueil");
  };

  // Si l'utilisateur n'est pas connecté, afficher la boîte de dialogue d'authentification
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
            <DialogTitle>
              {authMode === "login"
                ? "Connexion requise"
                : "Inscription requise"}
            </DialogTitle>
          </DialogHeader>
          {authMode === "login" ? (
            <LoginForm switchMode={() => setAuthMode("register")} />
          ) : (
            <RegisterForm switchMode={() => setAuthMode("login")} />
          )}
        </DialogContent>
      </Dialog>
    );
  }

  // Fonction pour gérer la fermeture de la boîte de dialogue du wizard
  const handleCloseWizard = () => {
    setIsWizardOpen(false);
    // Supprimer la navigation vers l'accueil
  };

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
                <BreadcrumbItem>Projets</BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <Button
            onClick={() => setIsWizardOpen(true)}
            className="ml-auto mr-4"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nouveau Projet
          </Button>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 md:p-4 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-2 md:px-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className="border rounded-lg p-4 shadow-sm bg-white flex flex-col justify-between hover:bg-stone-100 relative max-w-sm"
              >
                <Link to={`/projets/${project.id}`} className="flex-grow">
                  <h2 className="text-lg font-semibold mb-2">
                    {project.title}
                  </h2>
                  {/* Ajout de la description */}
                  {project.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  <p className="text-sm">
                    <span className="bg-green-200 text-green-800 px-2 py-1 rounded">
                      {project.startDate && project.endDate
                        ? `${new Date(project.startDate).toLocaleDateString(
                            "fr-FR",
                            { day: "numeric", month: "short" }
                          )} - ${new Date(project.endDate).toLocaleDateString(
                            "fr-FR",
                            { day: "numeric", month: "short" }
                          )}`
                        : "Dates non définies"}
                    </span>
                  </p>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteProject(project.id)}
                  className="absolute bottom-2 right-2 hover:bg-red-100"
                >
                  <Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" />
                </Button>
              </div>
            ))}
          </div>
          {error && <p className="text-red-500 mt-4">{error}</p>}
        </div>
        <ProjectWizard isOpen={isWizardOpen} onClose={handleCloseWizard} />
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action ne peut pas être annulée. Cela supprimera
                définitivement le projet et toutes les tâches associées.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-500 hover:bg-red-600"
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SidebarInset>
    </SidebarProvider>
  );
}
