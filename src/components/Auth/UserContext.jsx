import React, { createContext, useState, useEffect } from "react";
import { auth } from "../../config/firebase_config";
import { onAuthStateChanged, signOut } from "firebase/auth";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      // 1. Nettoyer d'abord les états
      setUser(null);

      // 2. Attendre un court instant pour que les états soient nettoyés
      await new Promise(resolve => setTimeout(resolve, 10));

      // 3. Déconnexion de Firebase
      await signOut(auth);

      // 4. Redirection
      window.location.href = "/accueil";
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
    }
  };

  return (
    <UserContext.Provider value={{ user, setUser, logout }}>
      {children}
    </UserContext.Provider>
  );
};
