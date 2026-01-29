
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Login from './pages/Login';
import MainApplication from './pages/MainApplication';
import AdminDashboard from './pages/Admin/Dashboard';

// Protected Route Wrapper
const ProtectedRoute = ({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) => {
    const { session, loading } = useAuth();

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">Carregando...</div>;

    if (!session) {
        return <Navigate to="/login" replace />;
    }

    // Check for admin role if required
    if (requireAdmin) {
        // Cast user to any to access the custom publicRole property we added in AuthContext
        const userRole = (session.user as any)?.publicRole;

        if (userRole !== 'superadmin') {
            // Redirect non-admins to main app or show unauthorized
            return <Navigate to="/" replace />;
        }
    }

    return <>{children}</>;
};

import VideoBackground from './components/VideoBackground';

export default function App() {
    return (
        <AuthProvider>
            <ThemeProvider>
                <VideoBackground />
                <Router>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route
                            path="/admin"
                            element={
                                <ProtectedRoute requireAdmin={true}>
                                    <AdminDashboard />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/"
                            element={
                                <ProtectedRoute>
                                    <MainApplication />
                                </ProtectedRoute>
                            }
                        />

                    </Routes>
                </Router>
            </ThemeProvider>
        </AuthProvider>
    );
}
