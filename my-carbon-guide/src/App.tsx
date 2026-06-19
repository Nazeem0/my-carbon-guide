import { BrowserRouter, Routes, Route } from "react-router-dom";
import Onboarding from "./routes/index";
import Dashboard from "./routes/dashboard";
import Insights from "./routes/insights";
import LeaderboardPage from "./routes/leaderboard";
import LogPage from "./routes/log";
import ProfilePage from "./routes/profile";
import DetailedInsight from "./routes/detailed-insight";
import { AuthProvider } from "./contexts/AuthContext";
import { SyncProvider } from "./contexts/SyncProvider";
import { LanguageProvider } from "./contexts/LanguageContext";
import ProtectedRoute from "./components/ProtectedRoute";

export function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
      <SyncProvider>
        <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Onboarding />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/insights" element={<ProtectedRoute><Insights /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />
          <Route path="/log" element={<ProtectedRoute><LogPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/detailed-insight" element={<ProtectedRoute><DetailedInsight /></ProtectedRoute>} />
        </Routes>
        </BrowserRouter>
      </SyncProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}
