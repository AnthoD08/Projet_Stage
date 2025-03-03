import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";

export function AuthModal() {
  const [mode, setMode] = useState("login"); // "login" ou "register"

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          {mode === "login" ? "Se connecter" : "S'inscrire"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "login" ? "Connexion" : "Inscription"}
          </DialogTitle>
        </DialogHeader>
        {mode === "login" ? (
          <LoginForm switchMode={() => setMode("register")} />
        ) : (
          <RegisterForm switchMode={() => setMode("login")} />
        )}
      </DialogContent>
    </Dialog>
  );
}
