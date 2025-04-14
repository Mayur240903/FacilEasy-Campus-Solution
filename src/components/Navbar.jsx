import React, { useState } from 'react';
import { Link, NavLink as RouterNavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../context/ThemeContext';
import { logoutUser } from '../firebase/config';
import { useAuth } from '../context/AuthContext';

// Modern navbar with clean, attractive design
const Navbar = () => {
  const { isDarkMode } = useTheme();
  const { currentUser, userRole, adminType } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSubMenuOpen, setMobileSubMenuOpen] = useState(false);
  const [desktopSubMenuOpen, setDesktopSubMenuOpen] = useState(false);
  const navigate = useNavigate();

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const toggleMobileSubMenu = () => {
    setMobileSubMenuOpen(!mobileSubMenuOpen);
  };

  const toggleDesktopSubMenu = () => {
    setDesktopSubMenuOpen(!desktopSubMenuOpen);
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate('/');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const getDashboardLink = () => {
    if (userRole === 'Student') {
      return '/student-dashboard';
    } else if (userRole === 'Faculty') {
      return '/faculty-dashboard';
    } else if (userRole === 'Admin') {
      // Determine the specific admin dashboard based on adminType
      if (adminType === 'Auditorium Admin') {
        return '/auditorium-admin-dashboard';
      } else if (adminType === 'Canteen Admin') {
        return '/canteen-admin-dashboard';
      } else if (adminType === 'Sports Admin') {
        return '/sports-admin-dashboard';
      } else if (adminType === 'Stationery Admin') {
        return '/stationery-admin-dashboard';
      } else if (adminType === 'Departmental Admin') {
        return '/department-admin-dashboard';
      }
      return '/admin-dashboard';
    }
    return '/';
  };

  return (
    <motion.nav 
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isDarkMode 
          ? 'bg-gray-900/95 backdrop-blur-sm shadow-md border-b border-gray-800/80' 
          : 'bg-white/95 backdrop-blur-sm shadow-md border-b border-gray-100/80'
      }`}
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <Link to="/" className="flex items-center group">
            <Logo size="md" className="group-hover:shadow-xl transition-all duration-300" />
            <div className="ml-2 flex flex-col">
              <span className={`font-bold text-lg leading-none ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>FacilEasy</span>
              <span className={`text-xs leading-none ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>CAMPUS SOLUTION</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center">
            <div className="flex items-center space-x-3">
              <ThemeToggle />
              {currentUser ? (
                <div className="relative ml-3">
                  <div>
                    <button 
                      type="button" 
                      className="flex items-center space-x-2 text-sm"
                      id="user-menu-button"
                      onClick={toggleDesktopSubMenu}
                    >
                      <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                        {currentUser.email.charAt(0).toUpperCase()}
                      </div>
                    </button>
                  </div>
                  
                  {desktopSubMenuOpen && (
                    <div 
                      className={`absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md ${isDarkMode ? 'bg-gray-700' : 'bg-white'} py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none`}
                    >
                      <Link 
                        to={getDashboardLink()} 
                        className={`block px-4 py-2 text-sm ${isDarkMode ? 'text-white hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-100'}`}
                      >
                        Dashboard
                      </Link>
                      <Link 
                        to="/profile" 
                        className={`block px-4 py-2 text-sm ${isDarkMode ? 'text-white hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-100'}`}
                      >
                        Profile
                      </Link>
                      <button
                        onClick={handleLogout}
                        className={`block w-full text-left px-4 py-2 text-sm ${isDarkMode ? 'text-white hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-100'}`}
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link 
                    to="/login" 
                    className={`px-4 py-2 rounded-md border ${
                      isDarkMode 
                        ? 'border-gray-600 hover:bg-gray-700' 
                        : 'border-gray-300 hover:bg-gray-100'
                    } transition-colors`}
                  >
                    Login
                  </Link>
                  <Link 
                    to="/register" 
                    className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-3">
            <ThemeToggle />
            <motion.button
              onClick={toggleMenu}
              className={`${isDarkMode ? 'text-gray-300 hover:text-blue-400' : 'text-gray-700 hover:text-blue-700'} focus:outline-none p-2`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                )}
              </svg>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className={`md:hidden backdrop-blur-sm border-t overflow-hidden ${
              isDarkMode 
                ? 'bg-gray-900/95 border-gray-800 shadow-lg' 
                : 'bg-white/95 border-gray-100 shadow-lg'
            }`}
          >
            <div className="px-4 py-3">
              <div className="pt-2 pb-1 grid grid-cols-2 gap-2">
                <Link to="/" className="px-4 py-2 hover:bg-indigo-500 hover:text-white rounded-md transition-colors" onClick={() => setMenuOpen(false)}>Home</Link>
                <div>
                  <button 
                    onClick={toggleMobileSubMenu}
                    className="w-full px-4 py-2 flex justify-between items-center hover:bg-indigo-500 hover:text-white rounded-md transition-colors"
                  >
                    <span>Services</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${mobileSubMenuOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {mobileSubMenuOpen && (
                    <div className="ml-4 mt-2 space-y-2">
                      <Link to="/auditorium-booking" className="block px-4 py-2 rounded-md hover:bg-indigo-500 hover:text-white transition-colors" onClick={() => setMenuOpen(false)}>Auditorium Booking</Link>
                      <Link to="/canteen-order" className="block px-4 py-2 rounded-md hover:bg-indigo-500 hover:text-white transition-colors" onClick={() => setMenuOpen(false)}>Canteen Services</Link>
                      <Link to="/stationery-request" className="block px-4 py-2 rounded-md hover:bg-indigo-500 hover:text-white transition-colors" onClick={() => setMenuOpen(false)}>Stationery Services</Link>
                      <Link to="/sports-booking" className="block px-4 py-2 rounded-md hover:bg-indigo-500 hover:text-white transition-colors" onClick={() => setMenuOpen(false)}>Sports Services</Link>
                    </div>
                  )}
                </div>
                <Link to="/about" className="px-4 py-2 hover:bg-indigo-500 hover:text-white rounded-md transition-colors" onClick={() => setMenuOpen(false)}>About</Link>
                <Link to="/contact" className="px-4 py-2 hover:bg-indigo-500 hover:text-white rounded-md transition-colors" onClick={() => setMenuOpen(false)}>Contact</Link>
                {currentUser ? (
                  <>
                    <Link to={getDashboardLink()} className="px-4 py-2 hover:bg-indigo-500 hover:text-white rounded-md transition-colors" onClick={() => setMenuOpen(false)}>Dashboard</Link>
                    <Link to="/profile" className="px-4 py-2 hover:bg-indigo-500 hover:text-white rounded-md transition-colors" onClick={() => setMenuOpen(false)}>Profile</Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setMenuOpen(false);
                      }}
                      className="px-4 py-2 text-left w-full hover:bg-indigo-500 hover:text-white rounded-md transition-colors"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col space-y-2 pt-2">
                    <Link 
                      to="/login" 
                      className={`px-4 py-2 rounded-md border ${
                        isDarkMode 
                          ? 'border-gray-600 hover:bg-gray-700' 
                          : 'border-gray-300 hover:bg-gray-100'
                      } transition-colors text-center`}
                      onClick={() => setMenuOpen(false)}
                    >
                      Login
                    </Link>
                    <Link 
                      to="/register" 
                      className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors text-center"
                      onClick={() => setMenuOpen(false)}
                    >
                      Register
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

// Modern Navigation Link with subtle animation
const ModernNavLink = ({ to, children, isDarkMode }) => {
  return (
    <Link 
      to={to} 
      className={`font-medium relative py-1 group transition-colors duration-300 ${
        isDarkMode ? 'text-gray-300 hover:text-blue-400' : 'text-gray-700 hover:text-blue-700'
      }`}
    >
      {children}
      <span className={`absolute bottom-0 left-0 w-0 h-0.5 group-hover:w-full transition-all duration-300 ${
        isDarkMode ? 'bg-blue-400' : 'bg-blue-600'
      }`}></span>
    </Link>
  );
};

// Mobile Navigation Link
const MobileNavLink = ({ to, onClick, children, isDarkMode }) => {
  return (
    <Link 
      to={to} 
      className={`flex items-center justify-between py-2 px-1 font-medium ${
        isDarkMode ? 'text-gray-300 hover:text-blue-400' : 'text-gray-700 hover:text-blue-700'
      }`} 
      onClick={onClick}
    >
      {children}
      <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
};

export default Navbar; 