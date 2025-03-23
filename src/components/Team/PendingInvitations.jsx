import { useEffect, useState, useContext } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/config/firebase_config";
import { UserContext } from "@/components/Auth/UserContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function PendingInvitations() {
  const { user } = useContext(UserContext);
  const [pendingInvites, setPendingInvites] = useState([]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "project_invitations"),
      where("userId", "==", user.uid),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const invitesPromises = snapshot.docs.map(async (document) => {
        const data = document.data();

        // Récupérer les détails du projet
        const projectDoc = await getDoc(doc(db, "projects", data.projectId));

        // Récupérer les détails de l'inviteur depuis la collection users
        const inviterDoc = await getDoc(doc(db, "users", data.invitedBy));
        const inviterData = inviterDoc.exists() ? inviterDoc.data() : null;

        console.log("Inviter Data:", inviterData); // Log pour vérifier les données récupérées

        return {
          id: document.id,
          ...data,
          projectDetails: projectDoc.exists() ? projectDoc.data() : null,
          inviterDetails: {
            displayName: inviterData?.displayName || "Utilisateur inconnu",
            email: inviterData?.email,
          },
        };
      });

      const invites = await Promise.all(invitesPromises);
      setPendingInvites(invites);
    });

    return () => unsubscribe();
  }, [user]);

  const handleInviteResponse = async (inviteId, accept) => {
    try {
      const inviteRef = doc(db, "project_invitations", inviteId);
      const inviteDoc = await getDoc(inviteRef);
      const inviteData = inviteDoc.data();

      if (accept) {
        // 1. Ajouter le membre au projet
        await addDoc(collection(db, "project_members"), {
          projectId: inviteData.projectId,
          userId: user.uid,
          email: user.email,
          role: "member",
          status: "accepted",
          joinedAt: serverTimestamp(),
        });

        // 2. Mettre à jour le statut de l'invitation
        await updateDoc(inviteRef, {
          status: "accepted",
          responseDate: serverTimestamp(),
        });

        // 3. Rafraîchir immédiatement les projets
        await fetchTeamProjects();
      } else {
        // Si refusé, mettre à jour uniquement le statut
        await updateDoc(inviteRef, {
          status: "rejected",
          responseDate: serverTimestamp(),
        });
      }

      // 4. Rafraîchir les invitations
      await fetchPendingInvitations();

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

  return (
    <div className="max-w-md mx-auto space-y-3">
      <h2 className="text-lg font-medium">Invitations en attente</h2>
      {pendingInvites.length > 0 ? (
        pendingInvites.map((invite) => (
          <div
            key={invite.id}
            className="flex items-center justify-between p-2 border rounded-md bg-card shadow-sm hover:shadow-md transition-all"
          >
            <div className="min-w-0 flex-1 mr-4">
              <p className="text-sm font-medium truncate">
                {invite.projectDetails?.title || invite.projectId}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                Invité par{" "}
                {invite.inviterDetails?.displayName ?? "Utilisateur inconnu"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="px-2 h-8"
                onClick={() => handleInviteResponse(invite.id, false)}
              >
                Refuser
              </Button>
              <Button
                size="sm"
                className="px-2 h-8"
                onClick={() => handleInviteResponse(invite.id, true)}
              >
                Accepter
              </Button>
            </div>
          </div>
        ))
      ) : (
        <p className="text-sm text-muted-foreground text-center">
          Aucune invitation en attente
        </p>
      )}
    </div>
  );
}
