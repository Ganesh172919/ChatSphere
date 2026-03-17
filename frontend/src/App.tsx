import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import GoogleCallback from './pages/GoogleCallback';
import SoloChat from './pages/SoloChat';
import Rooms from './pages/Rooms';
import GroupChat from './pages/GroupChat';

export default function App() {
  return (
    <ThemeProvider>
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
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth/google/callback" element={<GoogleCallback />} />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <SoloChat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rooms"
            element={
              <ProtectedRoute>
                <Rooms />
              </ProtectedRoute>
            }
          />
          <Route
            path="/group/:roomId"
            element={
              <ProtectedRoute>
                <GroupChat />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}
