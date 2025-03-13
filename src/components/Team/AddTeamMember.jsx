import { useState, useContext } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/config/firebase_config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserContext } from "../../components/Auth/UserContext";

export function AddTeamMember({ isOpen, onClose, projectId, onMemberAdded }) {
  const { user } = useContext(UserContext);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleInviteMember = async (e) => {
    e.preventDefault();
    if (!user) return;

    setError("");
    setLoading(true);

    try {
      // Vérifier si l'utilisateur existe
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const userSnapshot = await getDocs(q);

      if (userSnapshot.empty) {
        setError("Aucun utilisateur trouvé avec cet email");
        setLoading(false);
        return;
      }

      const invitedUser = userSnapshot.docs[0];

      // Vérifier si l'invitation existe déjà
      const invitationsRef = collection(db, "project_invitations");
      const inviteQuery = query(
        invitationsRef,
        where("projectId", "==", projectId),
        where("userId", "==", invitedUser.id),
        where("status", "==", "pending")
      );

      const existingInvite = await getDocs(inviteQuery);

      if (!existingInvite.empty) {
        setError("Une invitation est déjà en attente pour cet utilisateur");
        setLoading(false);
        return;
      }

      // Créer l'invitation
      await addDoc(collection(db, "project_invitations"), {
        projectId,
        userId: invitedUser.id,
        email: email,
        status: "pending",
        createdAt: serverTimestamp(),
        invitedBy: user.uid,
      });

      // Afficher le message de confirmation
      toast.success("Invitation envoyée", {
        description: `Une invitation a été envoyée à ${email}`,
      });

      setEmail("");
      onClose();
      onMemberAdded();
    } catch (error) {
      console.error("Erreur lors de l'invitation:", error);
      toast.error("Erreur", {
        description: "Une erreur est survenue lors de l'envoi de l'invitation",
      });
    }

    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inviter un membre</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleInviteMember} className="space-y-4">
          <Input
            type="email"
            placeholder="Adresse email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Envoi..." : "Inviter"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
