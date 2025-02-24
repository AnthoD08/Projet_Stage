import { useState, useEffect, useContext } from "react"; // Assurez-vous d'importer useContext
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
import { UserContext } from "../components/Auth/UserContext"; // Import du contexte utilisateur
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
  BreadcrumbList,
} from "@/components/ui/breadcrumb";
import ProjectWizard from "@/components/Projects/ProjectWizard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoginForm } from "../components/Auth/LoginForm";

export default function ProjectsPage() {
  const { user, logout } = useContext(UserContext); // avoir une fonction de déconnexion
  const navigate = useNavigate(); // Hook pour la navigation
  const [projects, setProjects] = useState([]);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [error, setError] = useState("");
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false); // État pour gérer la déconnexion
  const [showLoginForm, setShowLoginForm] = useState(false); // État pour afficher le formulaire de connexion

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
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
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
    const confirmDelete = window.confirm(
      "Voulez-vous vraiment supprimer ce projet ?"
    );
    if (!confirmDelete) return;

    try {
      const tasksQuery = query(
        collection(db, "tasks"),
        where("projectId", "==", projectId)
      );
      const tasksSnapshot = await getDocs(tasksQuery);
      const tasksToDelete = tasksSnapshot.docs.map((doc) => doc.id);

      const deleteTasksPromises = tasksToDelete.map((taskId) =>
        deleteDoc(doc(db, "tasks", taskId))
      );
      await Promise.all(deleteTasksPromises);

      await deleteDoc(doc(db, "projects", projectId));
      setProjects((prevProjects) =>
        prevProjects.filter((p) => p.id !== projectId)
      );
    } catch (error) {
      console.error("Erreur lors de la suppression :", error);
    }
  };

  // Fonction de déconnexion
  const handleLogout = async () => {
    setIsLoggingOut(true); // Mettre à jour l'état de déconnexion
    await logout(); // Appeler la fonction de déconnexion
    setProjects([]);
    navigate("/accueil"); // Rediriger vers la page d'accueil après la déconnexion
  };

  // Si l'utilisateur n'est pas connecté, afficher la boîte de dialogue
  if (!user) {
    return (
      <Dialog
        open={isDialogOpen}
        onOpenChange={(isOpen) => {
          setIsDialogOpen(isOpen);
          if (!isOpen) {
            navigate("/accueil"); // Rediriger vers la page d'accueil
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

  // Fonction pour gérer la fermeture de la boîte de dialogue
  const handleCloseWizard = () => {
    setIsWizardOpen(false);
    navigate("/"); // Rediriger vers la page d'accueil
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                Projets
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold">Projets</h1>
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded flex items-center hover:bg-blue-700"
              onClick={() => setIsWizardOpen(true)}
            >
              <Plus className="mr-2" />
              Nouveau projet
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className="border rounded-lg p-4 shadow-sm bg-white flex flex-col justify-between hover:bg-stone-100 relative"
              >
                <Link to={`/projets/${project.id}`} className="flex-grow">
                  <h2 className="text-lg font-semibold mb-3">
                    {project.title}
                  </h2>
                  <p className="text-gray-500 text-sm">
                    Début:{" "}
                    {project.startDate
                      ? new Date(project.startDate).toLocaleDateString()
                      : "Non défini"}
                  </p>
                  <p className="text-gray-500 text-sm">
                    Fin :{" "}
                    {project.endDate
                      ? new Date(project.endDate).toLocaleDateString()
                      : "Non défini"}
                  </p>
                </Link>
                <button onClick={() => handleDeleteProject(project.id)}>
                  <Trash2 className="text-red-500 hover:text-red-700 absolute bottom-0 right-0" />
                </button>
              </div>
            ))}
          </div>

          {error && <p className="text-red-500 mt-4">{error}</p>}
        </div>
        <ProjectWizard
          isOpen={isWizardOpen}
          onClose={handleCloseWizard} // Utiliser la nouvelle fonction pour gérer la fermeture
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
