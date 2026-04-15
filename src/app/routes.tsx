import { createBrowserRouter, Navigate } from "react-router";
import Messenger from "./pages/Messenger";
import Registration from "./pages/Registration";
import Login from "./pages/Login";

// Проверка аутентификации
const isAuthenticated = () => {
  return localStorage.getItem("isAuthenticated") === "true";
};

// Защищенный роут
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  return isAuthenticated() ? <>{children}</> : <Navigate to="/register" replace />;
};

// Публичный роут (только для неавторизованных)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  return !isAuthenticated() ? <>{children}</> : <Navigate to="/" replace />;
};

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Messenger />
      </ProtectedRoute>
    ),
  },
  {
    path: "/register",
    element: (
      <PublicRoute>
        <Registration />
      </PublicRoute>
    ),
  },
  {
    path: "/login",
    element: (
      <PublicRoute>
        <Login />
      </PublicRoute>
    ),
  },
  {
    path: "*",
    Component: () => <div>404 - Страница не найдена</div>,
  },
]);
