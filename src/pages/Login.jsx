import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { loginUser, createUserDocument } from '../firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode } = useTheme();
  const { currentUser } = useAuth();
  const [userType, setUserType] = useState(location.state?.userType || '');
  const [adminType, setAdminType] = useState('');
  const [department, setDepartment] = useState('');
  const [email, setEmail] = useState(location.state?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState(null); // For debugging

  // Check if user is already logged in, redirect them to their dashboard
  useEffect(() => {
    if (currentUser && !location.state?.registrationSuccess) {
      redirectToUserDashboard();
    }
  }, [currentUser, location.state]);

  // Check for registration success in the location state
  useEffect(() => {
    if (location.state?.registrationSuccess) {
      setRegistrationSuccess(true);
      // Clear the state after 5 seconds
      const timer = setTimeout(() => {
        setRegistrationSuccess(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  // Sample department list
  const departments = [
    'Computer Science',
    'Information Technology',
    'Electronics & Communication',
    'Electrical Engineering',
    'Mechanical Engineering',
    'Civil Engineering',
    'Chemical Engineering',
    'Biotechnology',
  ];

  // Admin types
  const adminTypes = [
    'Canteen Admin',
    'Sports Admin',
    'Stationery Admin',
    'Auditorium Admin',
  ];

  // Direct Firestore write as a fallback
  const directFirestoreWrite = async (uid, userData) => {
    try {
      console.log("Attempting direct Firestore write for user:", uid);
      await setDoc(doc(db, "users", uid), userData);
      console.log("Direct Firestore write successful");
      return true;
    } catch (directError) {
      console.error("Direct Firestore write failed:", directError);
      setDebugInfo(directError);
      return false;
    }
  };

  const redirectToUserDashboard = async (userData = null) => {
    try {
      // If userData is not provided, fetch from Firestore
      if (!userData && currentUser) {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          userData = userDoc.data();
        }
      }
      
      if (!userData) {
        console.error("No user data available for redirection");
        return;
      }
      
      const actualUserType = userData.userType;
      const actualAdminType = userData.adminType;
      
      // Redirect based on user type
      if (actualUserType === 'Student') {
        navigate('/student-dashboard');
      } else if (actualUserType === 'Faculty') {
        navigate('/faculty-dashboard');
      } else if (actualUserType === 'Admin') {
        // Redirect to the appropriate admin dashboard based on admin type
        if (actualAdminType === 'Auditorium Admin') {
          navigate('/auditorium-admin-dashboard');
        } else if (actualAdminType === 'Canteen Admin') {
          navigate('/canteen-admin-dashboard');
        } else if (actualAdminType === 'Sports Admin') {
          navigate('/sports-admin-dashboard');
        } else if (actualAdminType === 'Stationery Admin') {
          navigate('/stationery-admin-dashboard');
        } else {
          navigate('/admin-dashboard');
        }
      } else {
        // Default fallback
        navigate('/');
      }
    } catch (error) {
      console.error("Error redirecting user:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setDebugInfo(null);
    setIsLoading(true);
    
    try {
      // Login with Firebase
      const { user, error: loginError } = await loginUser(email, password);
      
      if (loginError) {
        // Handle Firebase login errors with more user-friendly messages
        if (loginError.includes('user-not-found')) {
          setError('No account found with this email. Please check your email or register.');
        } else if (loginError.includes('wrong-password')) {
          setError('Incorrect password. Please try again.');
        } else if (loginError.includes('invalid-email')) {
          setError('Please enter a valid email address.');
        } else if (loginError.includes('too-many-requests')) {
          setError('Too many failed login attempts. Please try again later or reset your password.');
        } else {
          setError(loginError);
        }
        
        setIsLoading(false);
        return;
      }
      
      if (user) {
        try {
          console.log("Authenticated user:", user.uid);
          // Get user data from Firestore
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (!userDoc.exists()) {
            console.log("No user document found in database");
            setError('Account not found in database. Please register with these credentials.');
            setIsLoading(false);
            return;
          }
          
          console.log("User data found:", userDoc.data());
          const userData = userDoc.data();
          
          // Check if the user type matches (extra security layer)
          if (userType && userData.userType !== userType) {
            setError(`You selected ${userType} but your account is registered as ${userData.userType}`);
            setIsLoading(false);
            return;
          }
          
          // Redirect to appropriate dashboard
          redirectToUserDashboard(userData);
        } catch (firestoreError) {
          console.error("Firestore error:", firestoreError);
          setDebugInfo(firestoreError);
          setError("Failed to retrieve user data. Please try again later.");
          setIsLoading(false);
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      setDebugInfo(err);
      setError('Login failed: ' + err.message);
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Simple Navbar with Back Button */}
      <nav className={`py-4 px-6 ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} shadow-sm`}>
        <div className="container mx-auto flex items-center">
          <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Back to Home</span>
          </Link>
        </div>
      </nav>
      
      <div className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className={`max-w-md w-full space-y-8 ${
          isDarkMode 
            ? 'bg-gray-800 shadow-lg border border-gray-700' 
            : 'bg-white shadow-lg border border-gray-200'
          } rounded-xl p-6 sm:p-8`}
        >
          {/* Registration Success Message */}
          {registrationSuccess && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mb-4 p-3 rounded-md ${
                isDarkMode ? 'bg-green-800/40 text-green-200 border border-green-700' : 'bg-green-50 text-green-800 border border-green-200'
              }`}
            >
              <div className="flex items-center">
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Account created successfully! Please sign in with your credentials.</span>
              </div>
            </motion.div>
          )}
          
          {/* Error Message */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mb-4 p-3 rounded-md ${
                isDarkMode ? 'bg-red-800/40 text-red-200 border border-red-700' : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              <div className="flex items-center">
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            </motion.div>
          )}

          {/* Debug Info (Development Only) */}
          {debugInfo && (
            <div className={`p-3 rounded-md text-xs font-mono overflow-auto max-h-32 ${
              isDarkMode ? 'bg-gray-900 text-gray-300 border border-gray-700' : 'bg-gray-100 text-gray-800 border border-gray-300'
            }`}>
              {typeof debugInfo === 'object' ? JSON.stringify(debugInfo, null, 2) : debugInfo.toString()}
            </div>
          )}
          
          <div>
            <motion.div 
              className="flex justify-center"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className={`relative h-16 w-16 flex items-center justify-center rounded-full ${isDarkMode ? 'bg-indigo-900/30' : 'bg-indigo-100'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-10 w-10 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  <path d="M12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <div className={`absolute -bottom-1 -right-1 h-6 w-6 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-indigo-700' : 'bg-indigo-500'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>
            </motion.div>
            <h2 className={`mt-6 text-center text-3xl font-extrabold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Sign in to your account
            </h2>
            <p className={`mt-2 text-center text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Or{' '}
              <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
                create a new account
              </Link>
            </p>
          </div>
          
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-md shadow-sm space-y-4">
              <div>
                <label htmlFor="user-type" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Login as
                </label>
                <select
                  id="user-type"
                  name="userType"
                  value={userType}
                  onChange={(e) => setUserType(e.target.value)}
                  required
                  className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="">Select user type</option>
                  <option value="Student">Student</option>
                  <option value="Faculty">Faculty</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              
              {(userType === 'Student' || userType === 'Faculty' || (userType === 'Admin' && adminType === 'Departmental Admin')) && (
                <div>
                  <label htmlFor="department" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Department
                  </label>
                  <select
                    id="department"
                    name="department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    required
                    className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">Select department</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              )}
              
              {userType === 'Admin' && (
                <div>
                  <label htmlFor="admin-type" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Admin Type
                  </label>
                  <select
                    id="admin-type"
                    name="adminType"
                    value={adminType}
                    onChange={(e) => setAdminType(e.target.value)}
                    required
                    className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">Select admin type</option>
                    {adminTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <label htmlFor="email-address" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Email address
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`mt-1 block w-full px-3 py-2 border focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="Email address"
                />
              </div>
              
              <div>
                <label htmlFor="password" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Password
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`block w-full px-3 py-2 pr-10 border focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="Password"
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className={`absolute inset-y-0 right-0 pr-3 flex items-center transition-all duration-200 ${
                      isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-500 hover:text-indigo-600'
                    }`}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M3.28033 1.7803C3.57322 1.48741 4.0481 1.48741 4.34099 1.7803L16.2197 13.659C16.5126 13.9519 16.5126 14.4268 16.2197 14.7197C15.9268 15.0126 15.4519 15.0126 15.159 14.7197L13.9699 13.5306C12.7 14.4425 11.2383 15 10 15C6.30786 15 3.09624 12.2333 1.65063 10.517C1.39356 10.2012 1.39356 9.79876 1.65063 9.48296C2.40031 8.5735 3.58937 7.34321 5.0699 6.42954L3.28033 4.63997C2.98744 4.34708 2.98744 3.87221 3.28033 3.57932C3.57322 3.28643 4.0481 3.28643 4.34099 3.57932L6.98611 6.22444L6.98612 6.22443L11.7656 11.0039L11.7656 11.0039L15.1611 14.3993L15.162 14.4003L16.2197 15.458C16.5126 15.7509 16.5126 16.2258 16.2197 16.5187C15.9268 16.8116 15.4519 16.8116 15.159 16.5187L3.28033 4.63997C2.98744 4.34708 2.98744 3.87221 3.28033 3.57932C3.57322 3.28643 4.0481 3.28643 4.34099 3.57932L3.28033 1.7803ZM7.08623 6.32457C6.01208 6.96619 5.09438 7.78197 4.34977 8.54426C4.09926 8.80234 4.09926 9.19766 4.34977 9.45574C5.74004 10.8741 7.70407 12.5 10 12.5C10.4387 12.5 10.8734 12.4203 11.3007 12.2706L9.74064 10.7105C8.97272 10.586 8.36402 9.97726 8.23954 9.20934L7.08623 6.32457Z" fill="currentColor"/>
                        <path d="M8.23954 9.20934C8.36402 9.97726 8.97272 10.586 9.74064 10.7105L11.3007 12.2706C10.8734 12.4203 10.4387 12.5 10 12.5C7.70407 12.5 5.74004 10.8741 4.34977 9.45574C4.09926 9.19766 4.09926 8.80234 4.34977 8.54426C5.09438 7.78197 6.01208 6.96619 7.08623 6.32457L8.23954 9.20934Z" fill="currentColor"/>
                        <path fillRule="evenodd" clipRule="evenodd" d="M10 5C11.2384 5 12.7 5.55747 13.9699 6.46942L11.8232 8.61612C11.6024 8.2319 11.2089 7.96875 10.75 7.96875C10.3739 7.96875 10.0253 8.14844 9.80078 8.4375L7.62351 6.26023C8.34395 5.49365 9.16016 5 10 5ZM15.6502 10.517C15.6126 10.5637 15.574 10.61 15.5346 10.6559C15.4847 10.714 15.4333 10.7723 15.3804 10.8306C15.1561 10.4453 14.9056 10.0745 14.6299 9.73072L16.2197 8.14099C16.5126 7.8481 16.5126 7.37322 16.2197 7.08033C15.9268 6.78744 15.4519 6.78744 15.159 7.08033L3.28033 18.959C2.98744 19.2519 2.98744 19.7268 3.28033 20.0197C3.57322 20.3126 4.0481 20.3126 4.34099 20.0197L6.61493 17.7457C7.66286 18.2238 8.80548 18.5 10 18.5C13.6921 18.5 16.9038 15.7333 18.3494 14.017C18.6064 13.7012 18.6064 13.2988 18.3494 12.983C17.599 12.0729 16.4103 10.8429 15.6502 10.517Z" fill="currentColor"/>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M10 5C6.30786 5 3.09624 7.76667 1.65063 9.48296C1.39356 9.79876 1.39356 10.2012 1.65063 10.517C3.09624 12.2333 6.30786 15 10 15C13.6921 15 16.9038 12.2333 18.3494 10.517C18.6064 10.2012 18.6064 9.79876 18.3494 9.48296C16.9038 7.76667 13.6921 5 10 5ZM4.34977 9.45574C5.74004 8.03593 7.70407 6.5 10 6.5C12.2959 6.5 14.26 8.03593 15.6502 9.45574C15.9007 9.71383 15.9007 10.1095 15.6502 10.3675C14.26 11.7873 12.2959 13.5 10 13.5C7.70407 13.5 5.74004 11.8259 4.34977 10.4443C4.09926 10.1862 4.09926 9.79383 4.34977 9.45574Z" fill="currentColor"/>
                        <path fillRule="evenodd" clipRule="evenodd" d="M10 8.5C9.17157 8.5 8.5 9.17157 8.5 10C8.5 10.8284 9.17157 11.5 10 11.5C10.8284 11.5 11.5 10.8284 11.5 10C11.5 9.17157 10.8284 8.5 10 8.5ZM7 10C7 8.34315 8.34315 7 10 7C11.6569 7 13 8.34315 13 10C13 11.6569 11.6569 13 10 13C8.34315 13 7 11.6569 7 10Z" fill="currentColor"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className={`h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 ${
                    isDarkMode ? 'bg-gray-700 border-gray-600' : ''
                  }`}
                />
                <label htmlFor="remember-me" className={`ml-2 block text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500">
                  Forgot your password?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white 
                ${isLoading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'}`}
              >
                {isLoading ? (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                    <svg className="h-5 w-5 text-indigo-500 group-hover:text-indigo-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login; 