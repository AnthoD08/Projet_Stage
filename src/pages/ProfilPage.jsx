// Importation des dépendances nécessaires
import { useContext, useState, useRef } from "react";
import { UserContext } from "../components/Auth/UserContext";
import { auth, storage } from "@/config/firebase_config"; // Importation de Firebase Auth et Storage
import { updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Importation des fonctions de gestion du stockage
import { Navigate } from "react-router-dom";
import { AppSidebar } from "@/components/Sidebar/AppSidebar";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react"; // Pour l'indicateur de chargement

export default function ProfilePage() {
  // Récupération du contexte utilisateur pour l'authentification
  const { user } = useContext(UserContext);

  // Initialisation des états pour gérer les informations du profil
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [photoURL, setPhotoURL] = useState(user?.photoURL || "");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Fonction pour mettre à jour le profil utilisateur
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!auth.currentUser) {
      setError("Aucun utilisateur connecté.");
      return;
    }

    try {
      // Mise à jour du profil utilisateur avec les nouvelles informations
      await updateProfile(auth.currentUser, {
        displayName,
        photoURL,
      });
      setSuccess(true);
    } catch (err) {
      setError("Erreur lors de la mise à jour du profil.");
      console.error(err);
    }
  };

  // Fonction pour déclencher le clic sur l'input de fichier
  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  // Fonction pour gérer le téléchargement de l'image de profil
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setError("");

      // Créer une référence unique pour l'image avec un timestamp
      const timestamp = new Date().getTime();
      const imageRef = ref(
        storage,
        `profile-images/${user.uid}/${timestamp}_${file.name}`
      );

      // Uploader l'image dans Firebase Storage
      await uploadBytes(imageRef, file);

      // Obtenir l'URL de téléchargement de l'image
      const downloadURL = await getDownloadURL(imageRef);

      // Mettre à jour l'URL de la photo dans le state local
      setPhotoURL(downloadURL);

      // Mettre à jour le profil utilisateur avec la nouvelle URL de la photo
      await updateProfile(auth.currentUser, {
        photoURL: downloadURL,
      });

      // Forcer un rafraîchissement de l'utilisateur pour obtenir les nouvelles données
      await auth.currentUser.reload();

      // Mettre à jour le state de succès
      setSuccess(true);

      // Attendre un peu avant de cacher le message de succès
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Erreur lors du téléchargement :", err);
      setError("Erreur lors du téléchargement de l'image.");
    } finally {
      setIsUploading(false);
    }
  };

  // Redirection si aucun utilisateur n'est connecté
  if (!user) {
    return <Navigate to="/accueil" />;
  }

  return (
    <SidebarProvider>
      <AppSidebar className="hidden md:block" />
      <SidebarInset>
        <div className="flex flex-col px-6 py-4">
          <h1 className="text-2xl font-bold">Mon Profil</h1>
          <Separator className="my-4" />

          {/* Affichage des informations du profil */}
          <Card className="mb-8 p-6 flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage
                src={photoURL || user.photoURL}
                alt={user.displayName}
              />
              <AvatarFallback>{user.displayName?.[0] || "U"}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold">
                {user.displayName || "Utilisateur"}
              </h2>
              <p className="text-gray-500">{user.email}</p>
            </div>
          </Card>

              {error && <p className="text-red-500 mb-4">{error}</p>}
              {success && (
                <p className="text-green-500 mb-4">Profil mis à jour !</p>
              )}

              {/* Formulaire de mise à jour du profil */}
              <form onSubmit={handleUpdateProfile} className="space-y-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Nom d'utilisateur
                    </label>
                    <Input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Photo de profil
                    </label>
                    <div
                      onClick={handleImageClick}
                      className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors"
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <Avatar className="h-24 w-24 mx-auto mb-4">
                        <AvatarImage src={photoURL} alt="Photo de profil" />
                        <AvatarFallback>?</AvatarFallback>
                      </Avatar>
                      {isUploading ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <p className="text-sm text-gray-500">Chargement...</p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 mt-2">
                          Cliquez pour sélectionner une image
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full md:w-auto">
                  Sauvegarder les modifications
                </Button>
              </form>
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
