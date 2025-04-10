import { useState, useContext } from "react";
import { UserContext } from "@/components/Auth/UserContext";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/config/firebase_config";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export default function ProjectWizard({
  isOpen,
  onClose,
  isTeamProject = false,
}) {
  const { user } = useContext(UserContext);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleCreateProject = async (formData) => {
    if (!user) return;

    try {
      const collection_name = isTeamProject ? "team" : "projects";
      const newProject = {
        title: formData.title,
        description: formData.description,
        userId: user.uid,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        startDate: formData.startDate,
        endDate: formData.endDate,
        members: [user.uid],
        status: "active",
      };

      await addDoc(collection(db, collection_name), newProject);

      // Réinitialiser le formulaire
      setTitle("");
      setDescription("");
      setStartDate(null);
      setEndDate(null);

      // Fermer le wizard
      onClose();
    } catch (error) {
      console.error("Erreur lors de la création du projet:", error);
      setErrorMessage(
        "Erreur lors de la création du projet. Veuillez réessayer."
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim() || !startDate || !endDate) {
      setErrorMessage("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    try {
      const projectRef = await addDoc(collection(db, "projects"), {
        title: title,
        description: description,
        type: isTeamProject ? "team" : "individual",
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        status: "active",
      });

      if (isTeamProject) {
        await addDoc(collection(db, "project_members"), {
          projectId: projectRef.id,
          userId: user.uid,
          email: user.email,
          role: "owner",
          status: "accepted",
          joinedAt: serverTimestamp(),
        });
      }

      // Réinitialisation des champs et fermeture
      setTitle("");
      setDescription("");
      setStartDate(null);
      setEndDate(null);
      setErrorMessage("");
      onClose();
    } catch (error) {
      console.error("Erreur lors de la création du projet:", error);
      setErrorMessage("Une erreur est survenue lors de la création du projet.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isTeamProject
              ? "Créer un projet d'équipe"
              : "Créer un nouveau projet"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {errorMessage && (
            <div className="text-red-500 text-sm">{errorMessage}</div>
          )}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Titre du projet
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Entrez le titre du projet"
              className="mt-1.5"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Entrez une description"
              className="mt-1.5"
            />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Date de début</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate
                      ? format(startDate, "PPP", { locale: fr })
                      : "Sélectionner"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    locale={fr}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Date de fin</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate
                      ? format(endDate, "PPP", { locale: fr })
                      : "Sélectionner"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    locale={fr}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">Créer le projet</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
