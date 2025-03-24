import { useState, useEffect, useContext, useRef } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/Sidebar/AppSidebar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Plus, Users, Trash2, UserPlus } from "lucide-react";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc, getDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
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
import { toast } from "sonner";

const TeamPage = () => {
  const unsubscribes = useRef([]); // Référence pour stocker les fonctions de désabonnement
  const { user } = useContext(UserContext); // Contexte utilisateur
  const navigate = useNavigate(); // Fonction de navigation

  // États pour gérer l'interface utilisateur et les données
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [teamProjects, setTeamProjects] = useState([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isProjectWizardOpen, setIsProjectWizardOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectMembers, setProjectMembers] = useState({});
  const [pendingInvites, setPendingInvites] = useState([]);

  // Effet pour récupérer les projets d'équipe et les invitations en attente lorsque l'utilisateur change
  useEffect(() => {
    if (!user) {
      // Nettoyer les abonnements si l'utilisateur n'est pas connecté
      unsubscribes.current.forEach((unsubscribe) => {
        if (typeof unsubscribe === "function") unsubscribe();
      });
      unsubscribes.current = [];

      // Réinitialiser les états
      setTeamProjects([]);
      setProjectMembers({});
      setPendingInvites([]);
      setIsDialogOpen(true);
    } else {
      fetchTeamProjects();
      fetchPendingInvitations();
    }
  }, [user]);

  // Effet pour récupérer les projets d'équipe lorsque l'assistant de projet est fermé
  useEffect(() => {
    if (isProjectWizardOpen === false) {
      fetchTeamProjects();
    }
  }, [isProjectWizardOpen]);

  // Effet pour charger les membres de tous les projets lorsque les projets d'équipe changent
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

  // Fonction pour récupérer les projets d'équipe de l'utilisateur
  const fetchTeamProjects = async () => {
    if (!user) return;

    try {
      // Nettoyer les anciens listeners
      unsubscribes.current.forEach((unsubscribe) => {
        if (typeof unsubscribe === "function") {
          unsubscribe();
        }
      });
      unsubscribes.current = [];

      // Récupérer les projets créés par l'utilisateur
      const createdQuery = query(
        collection(db, "projects"),
        where("type", "==", "team"),
        where("createdBy", "==", user.uid)
      );

      // Récupérer les projets où l'utilisateur est membre
      const memberQuery = query(
        collection(db, "project_members"),
        where("userId", "==", user.uid),
        where("status", "==", "accepted")
      );

      const unsubscribeCreated = onSnapshot(
        createdQuery,
        async (createdSnapshot) => {
          if (!user) {
            unsubscribeCreated();
            return;
          }

          try {
            // Récupérer les projets créés
            const createdProjects = createdSnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));

            // Récupérer les projets où l'utilisateur est membre
            const memberSnapshot = await getDocs(memberQuery);
            const memberProjectIds = memberSnapshot.docs.map(
              (doc) => doc.data().projectId
            );

            const memberProjects = [];
            for (const projectId of memberProjectIds) {
              const projectDoc = await getDoc(doc(db, "projects", projectId));
              if (projectDoc.exists() && projectDoc.data().type === "team") {
                memberProjects.push({
                  id: projectDoc.id,
                  ...projectDoc.data(),
                });
              }
            }

            // Combiner les projets uniques
            const allProjects = [...createdProjects];
            memberProjects.forEach((project) => {
              if (!allProjects.some((p) => p.id === project.id)) {
                allProjects.push(project);
              }
            });

           
            setTeamProjects(allProjects);
          } catch (error) {
            console.error("Erreur lors de la récupération des projets:", error);
            setTeamProjects([]);
          }
        }
      );

      unsubscribes.current.push(unsubscribeCreated);
    } catch (error) {
      console.error("Erreur lors du chargement des projets:", error);
    }
  };

  // Effet pour nettoyer les abonnements lorsque le composant est démonté
  useEffect(() => {
    return () => {
      unsubscribes.current.forEach((unsubscribe) => unsubscribe());
      unsubscribes.current = [];
    };
  }, []);

  // Effet pour récupérer les projets d'équipe lorsque l'utilisateur change
  useEffect(() => {
    if (user) {
      fetchTeamProjects();
    }
  }, [user]);

  // Effet pour récupérer les projets d'équipe lorsque l'assistant de projet est fermé
  useEffect(() => {
    if (isProjectWizardOpen === false) {
      fetchTeamProjects();
    }
  }, [isProjectWizardOpen]);

  // Fonction pour créer un nouveau projet
  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      const projectRef = await addDoc(collection(db, "projects"), {
        title: newProjectName,
        description: newProjectDescription,
        type: "team",
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        status: "active",
      });

      await addDoc(collection(db, "project_members"), {
        projectId: projectRef.id,
        userId: user.uid,
        email: user.email,
        role: "owner",
        status: "accepted",
        joinedAt: serverTimestamp(),
      });

      setIsCreateDialogOpen(false);
      setNewProjectName("");
      setNewProjectDescription("");

      await fetchTeamProjects();
    } catch (error) {
      console.error("Erreur lors de la création du projet:", error);
    }
  };

  // Fonction pour supprimer un projet
  const handleDeleteProject = async (projectId) => {
    try {
      const membersQuery = query(
        collection(db, "project_members"),
        where("projectId", "==", projectId)
      );
      const membersSnapshot = await getDocs(membersQuery);
      const deleteMembers = membersSnapshot.docs.map((doc) =>
        deleteDoc(doc.ref)
      );

      const tasksQuery = query(
        collection(db, "tasks"),
        where("projectId", "==", projectId)
      );
      const tasksSnapshot = await getDocs(tasksQuery);
      const deleteTasks = tasksSnapshot.docs.map((doc) => deleteDoc(doc.ref));

      await Promise.all([...deleteMembers, ...deleteTasks]);

      await deleteDoc(doc(db, "projects", projectId));

      setTeamProjects((prevProjects) =>
        prevProjects.filter((project) => project.id !== projectId)
      );
      setIsDeleteDialogOpen(false);
      setProjectToDelete(null);
    } catch (error) {
      console.error("Erreur lors de la suppression du projet:", error);
    }
  };

  // Fonction pour ouvrir la boîte de dialogue de suppression
  const openDeleteDialog = (project) => {
    setProjectToDelete(project);
    setIsDeleteDialogOpen(true);
  };

  // Fonction pour fermer l'assistant de projet
  const handleWizardClose = () => {
    setIsProjectWizardOpen(false);
    fetchTeamProjects();
  };

  // Fonction pour charger les membres d'un projet
  const loadProjectMembers = async (projectId) => {
    try {
      const membersRef = collection(db, "project_members");
      const q = query(membersRef, where("projectId", "==", projectId));
      const snapshot = await getDocs(q);
      const members = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProjectMembers((prev) => ({
        ...prev,
        [projectId]: members,
      }));
    } catch (error) {
      console.error("Erreur lors du chargement des membres:", error);
    }
  };

  // Fonction pour récupérer les invitations en attente
  const fetchPendingInvitations = async () => {
    if (!user) return;

    try {
      const invitationsRef = collection(db, "project_invitations");
      const q = query(
        invitationsRef,
        where("userId", "==", user.uid),
        where("status", "==", "pending")
      );

      const snapshot = await getDocs(q);
      const invites = await Promise.all(
        snapshot.docs.map(async (document) => {
          const projectRef = doc(db, "projects", document.data().projectId);
          const projectDoc = await getDoc(projectRef);
          return {
            id: document.id,
            ...document.data(),
            projectDetails: projectDoc.exists() ? projectDoc.data() : null,
          };
        })
      );

      setPendingInvites(invites);
    } catch (error) {
      console.error("Erreur lors de la récupération des invitations:", error);
    }
  };

  // Fonction pour répondre à une invitation
  const handleInviteResponse = async (inviteId, accept) => {
    try {
      const inviteRef = doc(db, "project_invitations", inviteId);
      const inviteDoc = await getDoc(inviteRef);
      const inviteData = inviteDoc.data();

      if (accept) {
        await addDoc(collection(db, "project_members"), {
          projectId: inviteData.projectId,
          userId: user.uid,
          email: user.email,
          role: "member",
          status: "accepted",
          joinedAt: serverTimestamp(),
        });

        // Ajouter le projet à la liste des projets de l'utilisateur
        setTeamProjects((prevProjects) => [
          ...prevProjects,
          {
            id: inviteData.projectId,
            ...inviteData.projectDetails,
          },
        ]);
      }

      await updateDoc(inviteRef, {
        status: accept ? "accepted" : "rejected",
        responseDate: serverTimestamp(),
      });

      fetchPendingInvitations();
      fetchTeamProjects();

      toast.success(accept ? "Invitation acceptée" : "Invitation refusée", {
        description: accept
          ? "Vous avez rejoint le projet avec succès"
          : "L'invitation a été refusée",
      });
    } catch (error) {
      console.error("Erreur lors de la réponse à l'invitation:", error);
      toast.error("Une erreur est survenue", {
        description: "Impossible de traiter votre demande",
      });
    }
  };

  // Effet pour charger les membres de tous les projets lorsque les projets d'équipe changent
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

  // Effet pour récupérer les projets d'équipe et les invitations en attente lorsque l'utilisateur change
  useEffect(() => {
    if (user) {
      fetchTeamProjects();
      fetchPendingInvitations();
    }
  }, [user]);

  // Effet pour charger les membres de tous les projets lorsque les projets d'équipe changent
  useEffect(() => {
    const loadMembers = async () => {
      for (const project of teamProjects) {
        await loadProjectMembers(project.id);
      }
    };

    if (teamProjects.length > 0) {
      loadMembers();
    }
  }, [teamProjects]);

  // Effet pour récupérer les projets d'équipe et les invitations en attente lorsque l'utilisateur change
  useEffect(() => {
    if (!user) {
      navigate("/accueil");
      return;
    }

    fetchTeamProjects();
    fetchPendingInvitations();
  }, [user, navigate]);

  // Effet pour nettoyer les abonnements et réinitialiser les états lorsque l'utilisateur change
  useEffect(() => {
    if (!user) {
      unsubscribes.current.forEach((unsubscribe) => {
        if (typeof unsubscribe === "function") {
          unsubscribe();
        }
      });
      unsubscribes.current = [];

      setTeamProjects([]);
      setProjectMembers({});
      setPendingInvites([]);

      navigate("/accueil");
    }
  }, [user, navigate]);

  // Fonction pour rendre les avatars des membres d'un projet
  const renderMemberAvatars = (project) => {
    if (!user) return null;

    const memberEmails =
      projectMembers[project.id]?.map((member) => member.email) || [];
    const uniqueMembers = [...new Set([user.email, ...memberEmails])];

    return (
      <div className="flex items-center gap-2">
        <MemberAvatars members={uniqueMembers} />
        <span className="text-sm text-gray-500">
          {uniqueMembers.length} membre(s)
        </span>
      </div>
    );
  };

  // Effet pour ouvrir la boîte de dialogue d'authentification si l'utilisateur n'est pas connecté
  useEffect(() => {
    if (!user && !isLoggingOut) {
      setIsDialogOpen(true);
    }
  }, [user, isLoggingOut]);

  // Rendu conditionnel si l'utilisateur n'est pas connecté
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

  // Rendu principal de la page d'équipe
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
            <div className="mb-6 max-w-lg">
              <h2 className="text-sm font-medium text-muted-foreground mb-2">
                Invitations en attente
              </h2>
              <div className="space-y-2">
                {pendingInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="bg-card/50 border rounded-lg p-3 flex justify-between items-center text-sm hover:bg-card/70 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium truncate">
                        {invite.projectDetails.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Invité par {invite.invitedBy}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => handleInviteResponse(invite.id, false)}
                      >
                        Refuser
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => handleInviteResponse(invite.id, true)}
                      >
                        Accepter
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {teamProjects.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">
                Aucun projet d&apos;équipe
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Commencez par créer un nouveau projet d&apos;équipe
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teamProjects.map((project) => (
                <div
                  key={project.id}
                  className="bg-white p-4 rounded-lg shadow cursor-pointer hover:bg-stone-100"
                >
                  <div className="flex justify-between items-start">
                    <Link to={`/equipes/${project.id}`} className="flex-grow">
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
                  <Link to={`/equipes/${project.id}`} className="block mt-2">
                    <p className="text-sm text-gray-500">
                      {project.description || "Aucune description"}
                    </p>
                    <div className="mt-4 flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      {renderMemberAvatars(project)}
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

        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action ne peut pas être annulée. Cela supprimera
                définitivement le projet
                {projectToDelete?.name && ` "${projectToDelete.name}"`} et
                toutes les données associées.
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
};

export default TeamPage;
