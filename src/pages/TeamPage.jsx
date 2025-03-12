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
import { Plus, Users, Trash2, UserPlus } from "lucide-react";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase_config";
import { UserContext } from "../components/Auth/UserContext";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import ProjectWizard from "@/components/Projects/ProjectWizard";
import { AddTeamMember } from "@/components/Team/AddTeamMember";
import { MemberAvatars } from "@/components/Team/MemberAvatars";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoginForm } from "../components/Auth/LoginForm";
import { RegisterForm } from "../components/Auth/RegisterForm";
import { Link } from "react-router-dom";

export default function TeamPage() {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [teamProjects, setTeamProjects] = useState([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [isProjectWizardOpen, setIsProjectWizardOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectMembers, setProjectMembers] = useState({});
  const [pendingInvites, setPendingInvites] = useState([]);

  useEffect(() => {
    if (!user && !isLoggingOut) {
      setIsDialogOpen(true);
    }
  }, [user, isLoggingOut]);

  const fetchTeamProjects = async () => {
    if (!user) return;

    try {
      // Récupérer les projets créés par l'utilisateur
      const createdQuery = query(
        collection(db, "team"),
        where("createdBy", "==", user.uid)
      );
      const createdSnapshot = await getDocs(createdQuery);
      const createdProjects = createdSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Récupérer les projets où l'utilisateur est membre
      const memberQuery = query(
        collection(db, "team_members"),
        where("email", "==", user.email)
      );
      const memberSnapshot = await getDocs(memberQuery);

      // Récupérer les détails des projets où l'utilisateur est membre
      const memberProjects = await Promise.all(
        memberSnapshot.docs
          .filter(doc => doc.data().status === "accepted")
          .map(async (doc) => {
            const projectDoc = await getDoc(doc(db, "team", doc.data().projectId));
            return projectDoc.exists() ? { id: projectDoc.id, ...projectDoc.data() } : null;
          })
      );

      // Mettre à jour les projets d'équipe
      setTeamProjects([
        ...createdProjects,
        ...memberProjects.filter(Boolean)
      ]);

      // ...rest of invite handling...
    } catch (error) {
      console.error("Erreur lors de la récupération des projets:", error);
    }
  };

  // Ajouter un useEffect pour le rafraîchissement après la création d'un projet
  useEffect(() => {
    if (isProjectWizardOpen === false) {
      fetchTeamProjects();
    }
  }, [isProjectWizardOpen]);

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

  const handleWizardClose = async () => {
    setIsProjectWizardOpen(false);
    // Rafraîchir la liste des projets après la création
    const q = query(
      collection(db, "team"),
      where("createdBy", "==", user.uid)
    );
    const querySnapshot = await getDocs(q);
    const projects = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setTeamProjects(projects);
  };

  const loadProjectMembers = async (projectId) => {
    try {
      const membersRef = collection(db, "team_members");
      const q = query(membersRef, where("projectId", "==", projectId));
      const snapshot = await getDocs(q);
      const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProjectMembers(prev => ({
        ...prev,
        [projectId]: members
      }));
    } catch (error) {
      console.error("Erreur lors du chargement des membres:", error);
    }
  };

  const handleInviteResponse = async (inviteId, accept) => {
    try {
      const inviteRef = doc(db, "team_members", inviteId);
      await updateDoc(inviteRef, {
        status: accept ? "accepted" : "rejected",
        responseDate: new Date().toISOString()
      });
      
      // Rafraîchir les projets et invitations
      fetchTeamProjects();
    } catch (error) {
      console.error("Erreur lors de la réponse à l'invitation:", error);
    }
  };

  

  useEffect(() => {
    const loadAllProjectsMembers = async () => {
      for (const project of teamProjects) {
        await loadProjectMembers(project.id);
      }
    };

    if (teamProjects.length > 0) {
      loadAllProjectsMembers();
    }
  }, [teamProjects]);

  useEffect(() => {
    fetchTeamProjects();
  }, [user]);

  const AuthDialog = () => (
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
            {authMode === "login" ? "Connexion requise" : "Inscription requise"}
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

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>Equipes</BreadcrumbItem>
              <BreadcrumbSeparator></BreadcrumbSeparator>
              <BreadcrumbItem>Projets</BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto">
            <Button onClick={() => setIsProjectWizardOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau projet d&apos;équipe
            </Button>
          </div>
        </header>

        <main className="p-6">
          {pendingInvites.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-4">Invitations en attente</h2>
              <div className="space-y-4">
                {pendingInvites.map((invite) => (
                  <div key={invite.id} className="bg-white p-4 rounded-lg shadow-sm border ">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">{invite.projectDetails.title}</h3>
                        <p className="text-sm text-gray-500">Invité par {invite.invitedBy}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => handleInviteResponse(invite.id, false)}
                        >
                          Refuser
                        </Button>
                        <Button
                          onClick={() => handleInviteResponse(invite.id, true)}
                        >
                          Accepter
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
                <div key={project.id} className="bg-white p-4 rounded-lg shadow cursor-pointer hover:bg-stone-100">
                  <div className="flex justify-between items-start">
                    <Link 
                      to={`/equipes/${project.id}`}
                      className="flex-grow"
                    >
                      <h3 className="font-semibold">{project.title}</h3>
                    </Link>
                    <div className="flex gap-2 z-10">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedProject(project);
                          setIsAddMemberOpen(true);
                        }}
                        className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.preventDefault();
                          openDeleteDialog(project);
                        }}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Link 
                    to={`/equipes/${project.id}`}
                    className="block mt-2"
                  >
                    <p className="text-sm text-gray-500">
                      {project.description || "Aucune description"}
                    </p>
                    <div className="mt-4 flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <div className="flex items-center gap-2">
                        <MemberAvatars 
                          members={[
                            user.email,
                            ...(projectMembers[project.id]?.map(member => member.email) || [])
                          ]} 
                        />
                        <span className="text-sm text-gray-500">
                          {(projectMembers[project.id]?.length || 0) + 1} membre(s)
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </main>

        <ProjectWizard 
          isOpen={isProjectWizardOpen}
          onClose={handleWizardClose}
          isTeamProject={true}
          teamId={selectedTeam?.id}
        />

        <AddTeamMember
          isOpen={isAddMemberOpen}
          onClose={() => setIsAddMemberOpen(false)}
          projectId={selectedProject?.id}
          onMemberAdded={() => {
            if (selectedProject) {
              loadProjectMembers(selectedProject.id);
            }
          }}
        />

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