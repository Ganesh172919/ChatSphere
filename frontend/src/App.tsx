import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import ThemeSettingsSync from './components/ThemeSettingsSync';
import { useAuthStore } from './store/authStore';

const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const GoogleCallback = lazy(() => import('./pages/GoogleCallback'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const SoloChat = lazy(() => import('./pages/SoloChat'));
const Rooms = lazy(() => import('./pages/Rooms'));
const GroupChat = lazy(() => import('./pages/GroupChat'));
const Profile = lazy(() => import('./pages/Profile'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const Settings = lazy(() => import('./pages/Settings'));
const ExportChat = lazy(() => import('./pages/ExportChat'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const MemoryCenter = lazy(() => import('./pages/MemoryCenter'));

function AuthRedirect() {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Landing />;
}

function AppShellLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-900 text-sm text-gray-400">
      Loading ChatSphere...
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ThemeSettingsSync />
      <Router>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1A1D2E',
              color: '#e2e8f0',
              border: '1px solid #2E3354',
              borderRadius: '12px',
            },
            success: {
              iconTheme: { primary: '#A855F7', secondary: '#1A1D2E' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#1A1D2E' },
            },
          }}
        />

        <Suspense fallback={<AppShellLoader />}>
          <Routes>
            <Route path="/" element={<AuthRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/auth/google/callback" element={<GoogleCallback />} />
            <Route
              path="/dashboard"
              element={(
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/chat"
              element={(
                <ProtectedRoute>
                  <SoloChat />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/rooms"
              element={(
                <ProtectedRoute>
                  <Rooms />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/group/:roomId"
              element={(
                <ProtectedRoute>
                  <GroupChat />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/profile"
              element={(
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/search"
              element={(
                <ProtectedRoute>
                  <SearchPage />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/settings"
              element={(
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/memory"
              element={(
                <ProtectedRoute>
                  <MemoryCenter />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/export"
              element={(
                <ProtectedRoute>
                  <ExportChat />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/admin"
              element={(
                <ProtectedRoute requireAdmin>
                  <AdminDashboard />
                </ProtectedRoute>
              )}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </ThemeProvider>
  );
}
