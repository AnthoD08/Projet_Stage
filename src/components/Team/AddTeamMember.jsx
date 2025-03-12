import { useState, useContext } from "react";
import { UserContext } from "@/components/Auth/UserContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { addDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "@/config/firebase_config";
import { fetchSignInMethodsForEmail } from 'firebase/auth';

export function AddTeamMember({ isOpen, onClose, projectId, onMemberAdded }) {
  const { user } = useContext(UserContext);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    console.log("Tentative d'ajout de membre:", { email, projectId }); // Debug log

    try {
      // 1. Vérifier si l'utilisateur existe dans la collection users
      const usersRef = collection(db, "users");
      const userQuery = query(usersRef, where("email", "==", email.trim()));
      const userSnapshot = await getDocs(userQuery);

      if (userSnapshot.empty) {
        setError("Aucun utilisateur trouvé avec cette adresse email");
        return;
      }

      // 2. Vérifier si l'utilisateur est déjà membre
      const membersRef = collection(db, "team_members");
      const memberQuery = query(
        membersRef,
        where("projectId", "==", projectId),
        where("email", "==", email.trim())
      );
      const memberSnapshot = await getDocs(memberQuery);

      if (!memberSnapshot.empty) {
        setError("Ce membre fait déjà partie du projet");
        return;
      }

      // 3. Ajouter le nouveau membre sans l'uid
      const newMember = {
        projectId,
        email: email.trim(),
        role: "member",
        status: "pending", // Changed from "active" to "pending"
        joinedAt: new Date().toISOString(),
        invitedBy: user.email
      };

      const docRef = await addDoc(collection(db, "team_members"), newMember);
      console.log("Membre ajouté avec succès, ID:", docRef.id);

      setEmail("");
      onMemberAdded();
      onClose();
    } catch (err) {
      console.error("Erreur détaillée:", err);
      setError("Erreur lors de l'ajout du membre");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un membre</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Adresse email du membre"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
          <DialogFooter className="mt-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">Ajouter</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
