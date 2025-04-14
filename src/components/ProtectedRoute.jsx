import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { currentUser, userRole, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    // You can replace this with a loading spinner component
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // If the user is not authenticated, redirect to the login page
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If roles are specified and the user doesn't have the required role
  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    // Redirect to an unauthorized page or home
    return <Navigate to="/" replace />;
  }

  // If the user is authenticated and has the required role, render the protected component
  return children;
};

export default ProtectedRoute; 