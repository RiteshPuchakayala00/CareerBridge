import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './Landing';
import Login from './Login';
import ForgotPassword from './ForgotPassword';
import ActivateRecruiter from './pages/ActivateRecruiter';
import TpoDashboard from './pages/TpoDashboard';
import CoordinatorDashboard from './pages/CoordinatorDashboard';
import RecruiterDashboard from './pages/RecruiterDashboard';
import StudentDashboard from './pages/StudentDashboard';
import ProtectedRoute from './components/ProtectedRoute';

function RoleBasedDashboardRedirect() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (role === 'TPO_ADMIN') return <Navigate to="/tpo" replace />;
  if (role === 'DEPT_COORDINATOR') return <Navigate to="/coordinator" replace />;
  if (role === 'RECRUITER') return <Navigate to="/recruiter" replace />;
  if (role === 'STUDENT') return <Navigate to="/student" replace />;

  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/activate" element={<ActivateRecruiter />} />

        {/* Dynamic Route Gateway */}
        <Route path="/dashboard" element={<RoleBasedDashboardRedirect />} />

        {/* 4 Dedicated Role-Protected Dashboards */}
        <Route 
          path="/tpo" 
          element={
            <ProtectedRoute allowedRoles={['TPO_ADMIN']}>
              <TpoDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/coordinator" 
          element={
            <ProtectedRoute allowedRoles={['DEPT_COORDINATOR']}>
              <CoordinatorDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/recruiter" 
          element={
            <ProtectedRoute allowedRoles={['RECRUITER']}>
              <RecruiterDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/student" 
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <StudentDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
