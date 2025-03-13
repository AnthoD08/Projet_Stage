import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/config/firebase_config";
import { useEffect, useState } from "react";

export function MemberAvatars({ members = [], limit = 3 }) {
  const [memberDetails, setMemberDetails] = useState([]);

  useEffect(() => {
    const fetchMemberDetails = async () => {
      try {
        const userDetails = await Promise.all(
          members.map(async (memberEmail) => {
            const userQuery = query(
              collection(db, "users"),
              where("email", "==", memberEmail)
            );
            const snapshot = await getDocs(userQuery);
            if (!snapshot.empty) {
              return { email: memberEmail, ...snapshot.docs[0].data() };
            }
            return { email: memberEmail };
          })
        );
        setMemberDetails(userDetails);
      } catch (error) {
        console.error(
          "Erreur lors de la récupération des détails des membres:",
          error
        );
      }
    };

    if (members?.length > 0) {
      fetchMemberDetails();
    }
  }, [members]);

  // Supprimer les doublons et ajouter un index unique pour la clé
  const uniqueMembers = [...new Set(memberDetails)];

  // Vérifier si members existe avant de l'utiliser
  if (!members || members.length === 0) {
    return null;
  }

  return (
    <div className="flex -space-x-2 overflow-hidden">
      {uniqueMembers.slice(0, limit).map((member, index) => (
        <Avatar
          key={`${member.email}-${index}`}
          className="inline-block h-6 w-6 border-2 border-white"
        >
          <AvatarImage
            src={member.photoURL}
            alt={member.displayName || member.email}
          />
          <AvatarFallback>
            {(member.displayName?.[0] || member.email[0]).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ))}
      {members.length > limit && (
        <div className="flex items-center justify-center h-6 w-6 rounded-full bg-gray-200 text-xs text-gray-600 border-2 border-white">
          +{members.length - limit}
        </div>
      )}
    </div>
  );
}
