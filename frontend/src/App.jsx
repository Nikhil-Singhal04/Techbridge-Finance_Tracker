import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';
import Layout from './components/Layout';
import Spinner from './components/Spinner';

// Route-based code splitting using React.lazy
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Users = lazy(() => import('./pages/Users'));
const Forbidden = lazy(() => import('./pages/Forbidden'));

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Suspense
            fallback={
              <div className="center-page">
                <Spinner size="large" text="Loading..." />
              </div>
            }
          >
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forbidden" element={<Forbidden />} />

              {/* Protected Routes (Authenticated) */}
              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  {/* Dashboard - All Roles */}
                  <Route path="/" element={<Dashboard />} />

                  {/* Transactions - All Roles */}
                  <Route path="/transactions" element={<Transactions />} />

                  {/* Users - Admin Role Only */}
                  <Route element={<RoleRoute allowedRoles={['admin']} />}>
                    <Route path="/users" element={<Users />} />
                  </Route>
                </Route>
              </Route>

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
