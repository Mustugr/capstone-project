import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "../context/AuthContext";

import HomePage         from "../pages/public/HomePage";
import AboutPage        from "../pages/public/AboutPage";
import ContactPage      from "../pages/public/ContactPage";
import PrivacyPage      from "../pages/public/PrivacyPage";
import LoginPage        from "../pages/auth/LoginPage";
import RegisterPage     from "../pages/auth/RegisterPage";
import StudentDashboard    from "../pages/student/StudentDashboard";
import StudentLostItemForm from "../pages/student/StudentLostItemForm";
import StudentReportsPage  from "../pages/student/StudentReportsPage";
import StudentMessagesPage from "../pages/student/StudentMessagesPage";
import AdminDashboard   from "../pages/admin/AdminDashboard";
import AdminMessagesPage from "../pages/admin/AdminMessagesPage";
import AdminAddItemPage  from "../pages/admin/AdminAddItemPage";
import AdminOverview     from "../pages/admin/AdminOverview";

function ScrollToTop() {
  const location = useLocation();
  useEffect(() => {
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);
  return null;
}

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 40, fontFamily: "sans-serif" }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/login" replace />;
  return children;
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <Routes>
          {/* Public */}
          <Route path="/"        element={<HomePage />} />
          <Route path="/about"   element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/login"   element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Student */}
          <Route path="/student-dashboard"   element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
          <Route path="/student-report-item" element={<ProtectedRoute role="student"><StudentLostItemForm /></ProtectedRoute>} />
          <Route path="/student-reports"     element={<ProtectedRoute role="student"><StudentReportsPage /></ProtectedRoute>} />
          <Route path="/student-messages"    element={<ProtectedRoute role="student"><StudentMessagesPage /></ProtectedRoute>} />

          {/* Admin */}
          <Route path="/admin-dashboard" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin-message"   element={<ProtectedRoute role="admin"><AdminMessagesPage /></ProtectedRoute>} />
          <Route path="/admin-add"       element={<ProtectedRoute role="admin"><AdminAddItemPage /></ProtectedRoute>} />
          <Route path="/admin-overview"  element={<ProtectedRoute role="admin"><AdminOverview /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
