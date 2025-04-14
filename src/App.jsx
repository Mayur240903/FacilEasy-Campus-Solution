import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import FacultyDashboard from './pages/FacultyDashboard';
import AuditoriumBookingForm from './pages/AuditoriumBookingForm';
import CanteenOrderForm from './pages/CanteenOrderForm';
import SportsBookingForm from './pages/SportsBookingForm';
import StationeryRequestForm from './pages/StationeryRequestForm';
import AuditoriumAdminDashboard from './pages/AuditoriumAdminDashboard';
import CanteenAdminDashboard from './pages/CanteenAdminDashboard';
import SportsAdminDashboard from './pages/SportsAdminDashboard';
import StationeryAdminDashboard from './pages/StationeryAdminDashboard';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

// AnimatePresence needs to be wrapped inside a component to use the useLocation hook
function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Protected Student Routes */}
        <Route path="/student-dashboard" element={
          <ProtectedRoute allowedRoles={['Student']}>
            <StudentDashboard />
          </ProtectedRoute>
        } />
        <Route path="/auditorium-booking" element={
          <ProtectedRoute allowedRoles={['Student']}>
            <AuditoriumBookingForm />
          </ProtectedRoute>
        } />
        <Route path="/canteen-order" element={
          <ProtectedRoute allowedRoles={['Student']}>
            <CanteenOrderForm />
          </ProtectedRoute>
        } />
        <Route path="/sports-booking" element={
          <ProtectedRoute allowedRoles={['Student']}>
            <SportsBookingForm />
          </ProtectedRoute>
        } />
        <Route path="/stationery-request" element={
          <ProtectedRoute allowedRoles={['Student']}>
            <StationeryRequestForm />
          </ProtectedRoute>
        } />
        
        {/* Protected Faculty Routes */}
        <Route path="/faculty-dashboard" element={
          <ProtectedRoute allowedRoles={['Faculty']}>
            <FacultyDashboard />
          </ProtectedRoute>
        } />
        
        {/* Protected Admin Routes */}
        <Route path="/auditorium-admin-dashboard" element={
          <ProtectedRoute allowedRoles={['Admin']}>
            <AuditoriumAdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/canteen-admin-dashboard" element={
          <ProtectedRoute allowedRoles={['Admin']}>
            <CanteenAdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/sports-admin-dashboard" element={
          <ProtectedRoute allowedRoles={['Admin']}>
            <SportsAdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/stationery-admin-dashboard" element={
          <ProtectedRoute allowedRoles={['Admin']}>
            <StationeryAdminDashboard />
          </ProtectedRoute>
        } />
        
        <Route path="*" element={<Home />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const isDashboardPage = location.pathname === '/student-dashboard' || 
                         location.pathname === '/faculty-dashboard' ||
                         location.pathname === '/auditorium-admin-dashboard' ||
                         location.pathname === '/canteen-admin-dashboard' ||
                         location.pathname === '/sports-admin-dashboard' ||
                         location.pathname === '/stationery-admin-dashboard' ||
                         location.pathname === '/admin-dashboard';
  const isFormPage = [
    '/auditorium-booking',
    '/canteen-order',
    '/sports-booking',
    '/stationery-request'
  ].includes(location.pathname);
  
  return (
    <div className="flex flex-col min-h-screen dark:bg-gray-900 transition-colors duration-300">
      {!isAuthPage && !isDashboardPage && !isFormPage && <Navbar />}
      <main className="flex-grow">
        <AnimatedRoutes />
      </main>
      {!isAuthPage && !isDashboardPage && !isFormPage && <Footer />}
    </div>
  );
}

export default App;
