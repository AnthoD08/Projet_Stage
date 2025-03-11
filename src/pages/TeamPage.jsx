import  { useEffect, useState, useContext } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/Sidebar/AppSidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Plus, Users, Trash2 } from "lucide-react";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../config/firebase_config";
import { UserContext } from "../components/Auth/UserContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function TeamPage() {
  const [teamProjects, setTeamProjects] = useState([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const { user } = useContext(UserContext);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);

  useEffect(() => {
    const fetchTeamProjects = async () => {
      if (!user) return;

      try {
        const q = query(
          collection(db, "team"), // Changement de la collection
          where("createdBy", "==", user.uid)
        );
        const querySnapshot = await getDocs(q);
        const projects = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTeamProjects(projects);
      } catch (error) {
        console.error("Erreur lors de la récupération des projets d'équipe:", error);
      }
    };

    fetchTeamProjects();
  }, [user]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      await addDoc(collection(db, "team"), { // Changement de la collection
        name: newProjectName,
        description: newProjectDescription,
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
        members: [user.uid],
        status: 'active'
      });

      setIsCreateDialogOpen(false);
      setNewProjectName("");
      setNewProjectDescription("");
      
      // Actualiser la liste des projets
      const q = query(
        collection(db, "team"), // Changement de la collection
        where("createdBy", "==", user.uid)
      );
      const querySnapshot = await getDocs(q);
      const projects = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTeamProjects(projects);
    } catch (error) {
      console.error("Erreur lors de la création du projet:", error);
    }
  };

  const handleDeleteProject = async (projectId) => {
    try {
      await deleteDoc(doc(db, "team", projectId));
      setTeamProjects(teamProjects.filter(project => project.id !== projectId));
      setIsDeleteDialogOpen(false);
      setProjectToDelete(null);
    } catch (error) {
      console.error("Erreur lors de la suppression du projet:", error);
    }
  };

  const openDeleteDialog = (project) => {
    setProjectToDelete(project);
    setIsDeleteDialogOpen(true);
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>Equipes</BreadcrumbItem>
              <BreadcrumbSeparator>/</BreadcrumbSeparator>
              <BreadcrumbItem>Projets</BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto">
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau projet d&apos;équipe
            </Button>
          </div>
        </header>

        <main className="p-6">
          {teamProjects.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">Aucun projet d&apos;équipe</h3>
              <p className="mt-1 text-sm text-gray-500">
                Commencez par créer un nouveau projet d&apos;équipe
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teamProjects.map((project) => (
                <div key={project.id} className="bg-white p-4 rounded-lg shadow">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold">{project.name}</h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDeleteDialog(project)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    {project.description || "Aucune description"}
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">
                      {project.members?.length || 1} membre(s)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un nouveau projet d&apos;équipe</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateProject}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="projectName">Nom du projet</Label>
                  <Input
                    id="projectName"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Nom du projet"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="projectDescription">Description</Label>
                  <Input
                    id="projectDescription"
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    placeholder="Description du projet"
                  />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button type="submit">Créer le projet</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action ne peut pas être annulée. Cela supprimera définitivement le projet
                {projectToDelete?.name && ` "${projectToDelete.name}"`} et toutes les données associées.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-500 hover:bg-red-600"
                onClick={() => handleDeleteProject(projectToDelete?.id)}
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