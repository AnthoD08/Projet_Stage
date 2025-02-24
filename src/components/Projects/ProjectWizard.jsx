import { useState, useContext } from "react";
import { Dialog } from "@headlessui/react";
import { X } from "lucide-react";
import { db } from "../../config/firebase_config";
import { collection, addDoc } from "firebase/firestore";
import { UserContext } from "../Auth/UserContext";

export default function ProjectWizard({ isOpen, onClose }) {
  const { user } = useContext(UserContext);
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");

  const nextStep = () => {
    if (step === 1 && title.trim() === "") {
      return setError("Veuillez renseigner le titre.");
    }
    if (step === 3) {
      if (startDate === "" || endDate === "") {
        return setError("Veuillez renseigner les dates.");
      }
      if (new Date(startDate) > new Date(endDate)) {
        return setError(
          "La date de fin doit être postérieure à la date de début."
        );
      }
    }
    setError("");
    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const handleSubmit = async () => {
    if (!user) {
      setError("Vous devez être connecté pour créer un projet.");
      return;
    }

    try {
      await addDoc(collection(db, "projects"), {
        title,
        description,
        startDate,
        endDate,
        userId: user.uid,
        createdAt: new Date(),
      });
      setTitle("");
      setDescription("");
      setStartDate("");
      setEndDate("");
      onClose();
    } catch (error) {
      setError("Erreur lors de l'ajout du projet : " + error.message);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={() => {
        onClose();
      }}
      className="fixed inset-0 flex items-center justify-center bg-black/50"
    >
      <Dialog.Panel className="bg-white p-6 rounded-lg shadow-lg w-[400px]">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Créer un projet</h2>
          <button onClick={onClose} aria-label="Fermer">
            <X className="w-5 h-5 text-gray-500 hover:text-gray-700" />
          </button>
        </div>

        {step === 1 && (
          <div>
            <p className="mt-2 text-gray-600">
              Ajoutez un titre à votre projet.
            </p>
            <input
              type="text"
              className="w-full mt-3 p-2 border rounded"
              placeholder="Nom du projet"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-required="true"
            />
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="mt-2 text-gray-600">Ajoutez une description.</p>
            <textarea
              className="w-full mt-3 p-2 border rounded"
              placeholder="Description du projet"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              aria-required="true"
            />
          </div>
        )}

        {step === 3 && (
          <div>
            <p className="mt-2 text-gray-600">Sélectionnez les dates.</p>
            <label className="block mt-3">Date de début</label>
            <input
              type="date"
              className="w-full p-2 border rounded"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              aria-required="true"
            />
            <label className="block mt-3">Date de fin</label>
            <input
              type="date"
              className="w-full p-2 border rounded"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              aria-required="true"
            />
          </div>
        )}

        {step === 4 && (
          <div>
            <p className="mt-2 text-gray-600">Résumé du projet :</p>
            <ul className="mt-3 space-y-2 text-gray-800">
              <li>
                <strong>Titre :</strong> {title}
              </li>
              <li>
                <strong>Description :</strong> {description}
              </li>
              <li>
                <strong>Début :</strong> {startDate}
              </li>
              <li>
                <strong>Fin :</strong> {endDate}
              </li>
            </ul>
          </div>
        )}

        {error && <p className="text-red-500 mt-3">{error}</p>}

        <div className="flex justify-between mt-6">
          {step > 1 && (
            <button
              className="bg-gray-300 px-4 py-2 rounded"
              onClick={prevStep}
            >
              Retour
            </button>
          )}
          {step < 4 ? (
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded"
              onClick={nextStep}
            >
              Suivant
            </button>
          ) : (
            <button
              className="bg-green-600 text-white px-4 py-2 rounded"
              onClick={handleSubmit}
            >
              Valider
            </button>
          )}
        </div>
      </Dialog.Panel>
    </Dialog>
  );
}
