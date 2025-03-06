import { useContext, useState, useRef } from "react";
import { UserContext } from "../components/Auth/UserContext";
import { auth, storage } from "@/config/firebase_config"; // Ajouter storage
import { updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Ajouter ces imports
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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
} from "@/components/ui/breadcrumb";

export default function ProfilePage() {
  const { user } = useContext(UserContext);
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [photoURL, setPhotoURL] = useState(user?.photoURL || "");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Ajout de la fonction manquante handleUpdateProfile
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!auth.currentUser) {
      setError("Aucun utilisateur connecté.");
      return;
    }

    try {
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

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setError("");

      // Créer une référence unique pour l'image avec un timestamp pour éviter les doublons
      const timestamp = new Date().getTime();
      const imageRef = ref(
        storage,
        `profile-images/${user.uid}/${timestamp}_${file.name}`
      );

      // Uploader l'image
      await uploadBytes(imageRef, file);

      // Obtenir l'URL de téléchargement
      const downloadURL = await getDownloadURL(imageRef);

      // Mettre à jour l'URL de la photo dans le state local
      setPhotoURL(downloadURL);

      // Mettre à jour le profil utilisateur
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

  if (!user) {
    return <Navigate to="/accueil" />;
  }

  return (
    <SidebarProvider>
      <AppSidebar className="hidden md:block" />
      <SidebarInset className="w-full min-h-[100dvh]">
        <header className="flex h-16 items-center gap-2 px-4">
          <SidebarTrigger className="block md:hidden" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>Mon Profil</BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="container mx-auto px-4 py-6">
          <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
            {error && <p className="text-red-500 mb-4">{error}</p>}
            {success && (
              <p className="text-green-500 mb-4">Profil mis à jour !</p>
            )}

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
      </SidebarInset>
    </SidebarProvider>
  );
}
