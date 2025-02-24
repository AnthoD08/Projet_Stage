import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { db } from "../config/firebase_config";
import { Link } from "react-router-dom";
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

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [error, setError] = useState("");

  // Récupération des projets depuis Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "projects"),
      (snapshot) => {
        const projectList = snapshot.docs.map((doc) => ({
          id: doc.id,
          title: doc.data().title,
          startDate: doc.data().startDate, // Récupère la date de début
          endDate: doc.data().endDate, // Récupère la date de fin
        }));
        setProjects(projectList);
      },
      (error) => {
        console.error("Erreur de récupération des projets :", error);
        setError("Impossible de charger les projets.");
      }
    );
    return () => unsubscribe();
  }, []);

  // Ajouter un projet
  const handleAddProject = async () => {
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
        startDate: new Date().toISOString(), // Exemple: date actuelle
        endDate: new Date(
          new Date().setDate(new Date().getDate() + 30)
        ).toISOString(), // +30 jours par défaut
      });

      setProjects([
        ...projects,
        {
          id: docRef.id,
          title: newProjectTitle,
          startDate: new Date().toISOString(),
          endDate: new Date(
            new Date().setDate(new Date().getDate() + 30)
          ).toISOString(),
        },
      ]);

      setNewProjectTitle("");
      setError("");
    } catch (error) {
      console.error("Erreur lors de l'ajout :", error);
      setError("Ajout impossible.");
    }
  };

  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // Supprimer un projet
  const handleDeleteProject = async (projectId) => {
    const confirmDelete = window.confirm(
      "Voulez-vous vraiment supprimer ce projet ?"
    );
    if (!confirmDelete) return;

    try {
      // Récupérer toutes les tâches associées au projet
      const tasksQuery = query(
        collection(db, "tasks"),
        where("projectId", "==", projectId)
      );

      const tasksSnapshot = await getDocs(tasksQuery);
      const tasksToDelete = tasksSnapshot.docs.map((doc) => doc.id);

      // Supprimer toutes les tâches associées
      const deleteTasksPromises = tasksToDelete.map((taskId) =>
        deleteDoc(doc(db, "tasks", taskId))
      );

      // Attendre que toutes les tâches soient supprimées
      await Promise.all(deleteTasksPromises);

      // Supprimer le projet
      await deleteDoc(doc(db, "projects", projectId));

      // Mettre à jour l'état des projets
      setProjects((prevProjects) =>
        prevProjects.filter((p) => p.id !== projectId)
      );
    } catch (error) {
      console.error("Erreur lors de la suppression :", error);
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header avec le bouton de la sidebar */}
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  Projets
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        {/* Contenu principal */}
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {/* Bouton ajouter un projet */}
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

          {/* Liste des projets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className="border rounded-lg p-4 shadow-sm bg-white flex flex-col justify-between hover:bg-stone-100 relative"
              >
                <Link to={`/projets/${project.id}`} className="flex-grow">
                  <h2 className="text-lg font-semibold mb-3">{project.title}</h2>
                  <p className="text-gray-500 text-sm">
                    Début:{" "}
                    {project.startDate
                      ? new Date(project.startDate).toLocaleDateString()
                      : "Non défini"}
                  </p>
                  <p className="text-gray-500 text-sm">
                    Fin:{" "}
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

          {/* Affichage des erreurs */}
          {error && <p className="text-red-500 mt-4">{error}</p>}
        </div>
        <ProjectWizard
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
