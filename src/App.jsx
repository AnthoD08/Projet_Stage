import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ProjectsPage from "./pages/Projects";
import ProjectDetailsPage from "./pages/ProjectDetailsPage";
import { UserProvider } from "./components/Auth/UserContext";

function App() {
  return (
    <UserProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="accueil" element={<HomePage />} />
          <Route path="projets" element={<ProjectsPage />} />
          <Route path="projets/:projectId" element={<ProjectDetailsPage />} />
        </Routes>
      </Router>
    </UserProvider>
  );
}

export default App;
