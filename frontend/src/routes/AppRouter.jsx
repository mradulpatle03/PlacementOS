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

import StudentProfile from "@/pages/student/Profile";
import ResumeManager from "@/pages/student/ResumeManager";

import RecruiterOnboarding from "@/pages/recruiter/Onboarding";
import RecruiterProfile from "@/pages/recruiter/Profile";
import RecruiterVerification from "@/pages/admin/RecruiterVerification";

import CompanyList from "@/pages/tpo/CompanyList";
import CompanyDetail from "@/pages/tpo/CompanyDetail";

import DriveList from "@/pages/drives/DriveList";
import CreateDrive from "@/pages/drives/CreateDrive";
import DriveDetail from "@/pages/drives/DriveDetail";

import MyApplications from "../pages/student/MyApplications";
import DriveApplicants from "../pages/tpo/DriveApplicants";
import PipelineBoard from "@/pages/tpo/PipelineBoard";

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
            <RoleRoute roles={["tpo", "admin", "coordinator", "recruiter"]}>
              <CompanyList />
            </RoleRoute>
          }
        />
        <Route
          path="/companies/:id"
          element={
            <RoleRoute roles={["tpo", "admin", "coordinator", "recruiter"]}>
              <CompanyDetail />
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

        <Route
          path="/tpo/drives/:driveId/applicants"
          element={
            <RoleRoute roles={["tpo"]}>
              <DriveApplicants />
            </RoleRoute>
          }
        />
        <Route
          path="/tpo/drives/:driveId/pipeline"
          element={
            <RoleRoute roles={["tpo", "recruiter", "admin"]}>
              <PipelineBoard />
            </RoleRoute>
          }
        />

        {/* Student only */}
        <Route
          path="/applications"
          element={
            <RoleRoute roles={["student"]}>
              <MyApplications />
            </RoleRoute>
          }
        />

        {/* Shared routes */}
        <Route path="/drives" element={<DriveList />} />
        <Route
          path="/profile"
          element={
            <RoleRoute roles={["student"]}>
              <StudentProfile />
            </RoleRoute>
          }
        />
        <Route
          path="/resumes"
          element={
            <RoleRoute roles={["student"]}>
              <ResumeManager />
            </RoleRoute>
          }
        />

        <Route
          path="/onboarding"
          element={
            <RoleRoute roles={["recruiter"]}>
              <RecruiterOnboarding />
            </RoleRoute>
          }
        />

        <Route
          path="/recruiter/profile"
          element={
            <RoleRoute roles={["recruiter"]}>
              <RecruiterProfile />
            </RoleRoute>
          }
        />

        <Route
          path="/admin/recruiters"
          element={
            <RoleRoute roles={["tpo", "admin"]}>
              <RecruiterVerification />
            </RoleRoute>
          }
        />

        <Route
          path="/drives/create"
          element={
            <RoleRoute roles={["tpo", "admin"]}>
              <CreateDrive />
            </RoleRoute>
          }
        />
      </Route>

      {/* Misc */}
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="*" element={<NotFound />} />
      <Route path="/drives/:id" element={<DriveDetail />} />
    </Routes>
  );
}
