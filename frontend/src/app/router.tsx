import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, createBrowserRouter } from "react-router-dom";
import { ProtectedLayout, PublicLayout } from "@/app/route-layouts";
import { FullScreenLoader } from "@/shared/ui/FullScreenLoader";

const LoginPage = lazy(() => import("@/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));
const GoogleOauthPage = lazy(() => import("@/pages/GoogleOauthPage"));
const AiChatPage = lazy(() => import("@/pages/AiChatPage"));
const RoomsPage = lazy(() => import("@/pages/RoomsPage"));
const ProjectsPage = lazy(() => import("@/pages/ProjectsPage"));
const MemoryPage = lazy(() => import("@/pages/MemoryPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));

const withSuspense = (node: ReactNode) => {
  return <Suspense fallback={<FullScreenLoader label="Preparing workspace" />}>{node}</Suspense>;
};

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/app/ai" replace />,
  },
  {
    element: <PublicLayout />,
    children: [
      { path: "/login", element: withSuspense(<LoginPage />) },
      { path: "/register", element: withSuspense(<RegisterPage />) },
      { path: "/forgot-password", element: withSuspense(<ForgotPasswordPage />) },
      { path: "/reset-password", element: withSuspense(<ResetPasswordPage />) },
      { path: "/oauth/google", element: withSuspense(<GoogleOauthPage />) },
    ],
  },
  {
    path: "/app",
    element: <ProtectedLayout />,
    children: [
      { index: true, element: <Navigate to="/app/ai" replace /> },
      { path: "ai", element: withSuspense(<AiChatPage />) },
      { path: "ai/:conversationId", element: withSuspense(<AiChatPage />) },
      { path: "rooms", element: withSuspense(<RoomsPage />) },
      { path: "rooms/:roomId", element: withSuspense(<RoomsPage />) },
      { path: "projects", element: withSuspense(<ProjectsPage />) },
      { path: "projects/:projectId", element: withSuspense(<ProjectsPage />) },
      { path: "memory", element: withSuspense(<MemoryPage />) },
      { path: "settings", element: withSuspense(<SettingsPage />) },
    ],
  },
]);
