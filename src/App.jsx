import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ProjectsPage from "./pages/Projects";
import ProjectDetailsPage from "./pages/ProjectDetailsPage";
import { UserProvider } from "./components/Auth/UserContext";
import ProfilePage from "./pages/ProfilPage";
import TeamPage from "./pages/TeamPage";
import { Toaster } from "sonner";

function App() {
  return (
    <>
      <UserProvider>
        <Router>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="accueil" element={<HomePage />} />
            <Route path="projets" element={<ProjectsPage />} />
            <Route path="projets/:projectId" element={<ProjectDetailsPage />} />
            <Route path="profil" element={<ProfilePage />} />
            <Route path="equipes" element={<TeamPage />} />
            <Route path="equipes/:projectId" element={<ProjectDetailsPage />} />
          </Routes>
        </Router>
      </UserProvider>
      <Toaster position="top-right" />
    </>
  );
}

export default App;
