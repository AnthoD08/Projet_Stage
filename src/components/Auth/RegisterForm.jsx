import { useState, useContext } from "react";
import { auth } from "@/config/firebase_config";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { UserContext } from "./UserContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RegisterForm({ switchMode }) {
  const { setUser } = useContext(UserContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      setUser(userCredential.user);
    } catch (err) {
      setError("Erreur lors de l'inscription. Vérifiez vos informations.");
    }
  };

  return (
    <form onSubmit={handleRegister} className="space-y-4">
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <Input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        type="password"
        placeholder="Mot de passe"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <Button type="submit" className="w-full">
        S'inscrire
      </Button>
      <p className="text-sm text-center">
        Déjà un compte ?{" "}
        <span onClick={switchMode} className="text-blue-500 cursor-pointer">
          Se connecter
        </span>
      </p>
    </form>
  );
}
