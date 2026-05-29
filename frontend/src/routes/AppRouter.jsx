import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute, GuestRoute, RoleRoute } from "./guards";
import AppLayout from "@/components/layout/AppLayout";
import AuthLayout from "@/components/layout/AuthLayout";

// Auth pages
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import VerifyEmail from "@/pages/auth/VerifyEmail";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import ResetPassword from "@/pages/auth/ResetPassword";

// App pages
import Dashboard from "@/pages/Dashboard";
import Unauthorized from "@/pages/Unauthorized";
import NotFound from "@/pages/NotFound";

export default function AppRouter() {
  return (
    <Routes>
      {/* Public auth routes */}
      <Route element={<AuthLayout />}>
        <Route
          path="/login"
          element={
            <GuestRoute>
              <Login />
            </GuestRoute>
          }
        />
        <Route
          path="/register"
          element={
            <GuestRoute>
              <Register />
            </GuestRoute>
          }
        />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route
          path="/forgot-password"
          element={
            <GuestRoute>
              <ForgotPassword />
            </GuestRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <GuestRoute>
              <ResetPassword />
            </GuestRoute>
          }
        />
      </Route>

      {/* Protected app routes */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />

        {/* TPO + Admin only — placeholder routes, pages built in later days */}
        <Route
          path="/companies"
          element={
            <RoleRoute roles={["tpo", "admin"]}>
              <div className="p-4 text-muted-foreground">
                Companies — Day 26
              </div>
            </RoleRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <RoleRoute roles={["tpo", "coordinator", "admin"]}>
              <div className="p-4 text-muted-foreground">
                Analytics — Day 76
              </div>
            </RoleRoute>
          }
        />

        {/* Student only */}
        <Route
          path="/applications"
          element={
            <RoleRoute roles={["student"]}>
              <div className="p-4 text-muted-foreground">
                Applications — Day 36
              </div>
            </RoleRoute>
          }
        />

        {/* Shared routes */}
        <Route
          path="/drives"
          element={
            <div className="p-4 text-muted-foreground">Drives — Day 27</div>
          }
        />
        <Route
          path="/profile"
          element={
            <div className="p-4 text-muted-foreground">Profile — Day 17</div>
          }
        />
      </Route>

      {/* Misc */}
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
