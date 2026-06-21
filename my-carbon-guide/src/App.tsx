import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { SyncProvider } from "./contexts/SyncProvider";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ProfileProvider } from "./contexts/ProfileProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Skeleton } from "./components/ui/skeleton";

const Onboarding = lazy(() => import("./routes/index"));
const Dashboard = lazy(() => import("./routes/dashboard"));
const Insights = lazy(() => import("./routes/insights"));
const LeaderboardPage = lazy(() => import("./routes/leaderboard"));
const LogPage = lazy(() => import("./routes/log"));
const ProfilePage = lazy(() => import("./routes/profile"));
const DetailedInsight = lazy(() => import("./routes/detailed-insight"));

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Skeleton className="h-32 w-64" />
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <LanguageProvider>
          <SyncProvider>
            <ProfileProvider>
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<Onboarding />} />

                  {/* Protected Routes */}
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/insights"
                    element={
                      <ProtectedRoute>
                        <Insights />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/leaderboard"
                    element={
                      <ProtectedRoute>
                        <LeaderboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/log"
                    element={
                      <ProtectedRoute>
                        <LogPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <ProfilePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/detailed-insight"
                    element={
                      <ProtectedRoute>
                        <DetailedInsight />
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </Suspense>
            </BrowserRouter>
            </ProfileProvider>
          </SyncProvider>
        </LanguageProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
