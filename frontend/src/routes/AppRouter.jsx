import { Routes, Route } from "react-router-dom";
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

import AssessmentTaker from "@/pages/student/AssessmentTaker";
import AssessmentList from "@/pages/tpo/AssessmentList";
import AssessmentBuilder from "@/pages/tpo/AssessmentBuilder";
import AssessmentSubmissions from "@/pages/tpo/AssessmentSubmissions";
import PolicyEditor from "@/pages/tpo/PolicyEditor";

import InterviewManager from "@/pages/tpo/InterviewManager";
import MyInterviews from "@/pages/student/MyInterviews";
import Notifications from "@/pages/Notifications";
import NotificationPreferences from "@/pages/NotificationPreferences";
import Analytics from "@/pages/tpo/Analytics";
import BranchAnalytics from "@/pages/tpo/BranchAnalytics";
import CompanyAnalytics from "@/pages/tpo/CompanyAnalytics";

import MyOffers from "@/pages/student/MyOffers";
import OfferManager from "@/pages/tpo/OfferManager";
import RecruiterDashboard from "@/pages/recruiter/RecruiterDashboard";
import Reports from "@/pages/tpo/Reports";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AuditLogs from "@/pages/admin/AuditLogs";

import PublicLayout from "@/components/layout/PublicLayout";
import Home from "@/pages/public/Home";
import SuccessStories from "@/pages/public/SuccessStories";
import About from "@/pages/public/About";
import Contact from "@/pages/public/Contact";

import { Outlet } from "react-router-dom";

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/success-stories" element={<SuccessStories />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
      </Route>
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
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route
          path="/notifications/preferences"
          element={<NotificationPreferences />}
        />
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
              <Analytics />
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
        <Route
          path="/tpo/drives/:driveId/assessments"
          element={
            <RoleRoute roles={["tpo", "recruiter", "admin"]}>
              <AssessmentList />
            </RoleRoute>
          }
        />
        <Route
          path="/tpo/drives/:driveId/assessments/create"
          element={
            <RoleRoute roles={["tpo", "recruiter", "admin"]}>
              <AssessmentBuilder />
            </RoleRoute>
          }
        />
        <Route
          path="/tpo/drives/:driveId/assessments/:id/edit"
          element={
            <RoleRoute roles={["tpo", "admin"]}>
              <AssessmentBuilder />
            </RoleRoute>
          }
        />
        <Route
          path="/tpo/drives/:driveId/assessments/:assessmentId/submissions"
          element={
            <RoleRoute roles={["tpo", "recruiter", "admin"]}>
              <AssessmentSubmissions />
            </RoleRoute>
          }
        />
        {/* Interview Manager — TPO + Recruiter */}
        <Route
          path="/tpo/drives/:driveId/interviews"
          element={
            <RoleRoute roles={["tpo", "recruiter", "admin"]}>
              <InterviewManager />
            </RoleRoute>
          }
        />
        <Route
          path="/tpo/drives/:driveId/offers"
          element={
            <RoleRoute roles={["tpo", "admin", "recruiter"]}>
              <OfferManager />
            </RoleRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <RoleRoute roles={["tpo", "admin", "coordinator"]}>
              <Reports />
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
        {/* My Interviews — Student */}
        <Route
          path="/interviews"
          element={
            <RoleRoute roles={["student"]}>
              <MyInterviews />
            </RoleRoute>
          }
        />
        {/* Shared routes */}
        <Route path="/drives" element={<DriveList />} />
        <Route path="/drives/:id" element={<DriveDetail />} />
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
          path="/offers"
          element={
            <RoleRoute roles={["student"]}>
              <MyOffers />
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
          path="/recruiter/dashboard"
          element={
            <RoleRoute roles={["recruiter"]}>
              <RecruiterDashboard />
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
        <Route
          path="/tpo/policy"
          element={
            <RoleRoute roles={["tpo", "admin"]}>
              <PolicyEditor />
            </RoleRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <RoleRoute roles={["tpo", "admin", "coordinator"]}>
              <Analytics />
            </RoleRoute>
          }
        />
        <Route
          path="/analytics/branch/:branch"
          element={
            <RoleRoute roles={["tpo", "admin", "coordinator"]}>
              <BranchAnalytics />
            </RoleRoute>
          }
        />
        <Route
          path="/analytics/company/:companyId"
          element={
            <RoleRoute roles={["tpo", "admin", "coordinator", "recruiter"]}>
              <CompanyAnalytics />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <RoleRoute roles={["admin"]}>
              <AdminDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/audit"
          element={
            <RoleRoute roles={["admin"]}>
              <AuditLogs />
            </RoleRoute>
          }
        />
      </Route>
      <Route
        element={
          <ProtectedRoute>
            <Outlet />
          </ProtectedRoute>
        }
      >
        <Route
          path="/assessments/:assessmentId/take"
          element={
            <RoleRoute roles={["student"]}>
              <AssessmentTaker />
            </RoleRoute>
          }
        />
      </Route>

      {/* Misc */}
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
