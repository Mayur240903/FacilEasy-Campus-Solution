import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../firebase/config';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';

const StationeryAdminDashboard = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [userProfile, setUserProfile] = useState({
    name: '',
    id: '',
    department: 'Stationery Department',
    email: '',
    specialization: '',
    phone: ''
  });
  
  const STATIONERY_ADMIN_ID = "iZh91Krb3JhWAJZI3VC1xcJffNk2";

  // Fetch user profile data
  const fetchUserProfile = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        console.error("No authenticated user found");
        return;
      }
      
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserProfile({
          name: userData.name || userData.displayName || 'Admin',
          email: userData.email || '',
          department: userData.department || 'Stationery Department',
          id: userId,
          specialization: userData.specialization || 'Stationery Management',
          phone: userData.phone || ''
        });
        
        // Set profile image if it exists
        if (userData.profileImage) {
          setProfileImage(userData.profileImage);
        }
      } else {
        console.log("No user document found");
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  const handleProfileImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Add handleProfileSubmit function
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Get form values
      const name = e.target.elements.name.value;
      const email = e.target.elements.email.value;
      const department = e.target.elements.department.value;
      const phone = e.target.elements.phone.value;
      const specialization = e.target.elements.specialization.value;
      
      // Get current user ID
      const userId = auth.currentUser?.uid;
      
      if (!userId) {
        console.error("No authenticated user found");
        setLoading(false);
        return;
      }
      
      // Create updated profile object
      const updatedProfile = {
        name,
        email,
        department,
        phone,
        specialization,
        profileImage: profileImage,
        updatedAt: new Date()
      };
      
      // Update in Firestore
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, updatedProfile);
      
      console.log("Profile data saved to Firebase:", updatedProfile);
      
      // Update local state with new profile data
      setUserProfile({
        ...userProfile,
        ...updatedProfile
      });
      
      setIsEditingProfile(false);
      setLoading(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      setLoading(false);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      setLoadingRequests(true);
      console.log("Fetching stationery requests");
      
      const adminId = auth.currentUser?.uid;
      
      if (!adminId) {
        console.error("No authenticated admin found");
        setLoadingRequests(false);
        return;
      }
      
      if (adminId !== STATIONERY_ADMIN_ID) {
        console.log("Current user is not the designated Stationery Admin");
        setLoadingRequests(false);
        return;
      }
      
      const stationeryPendingRequests = [];
      const allStationeryRequests = [];
      
      const requestsRef = collection(db, 'stationeryRequests');
      
      // Fetch pending requests (faculty approved, admin pending)
      const pendingQuery = query(
        requestsRef,
        where("facultyStatus", "==", "Approved"),
        where("adminStatus", "==", "Pending")
      );
      
      // Fetch all faculty-approved requests for the table view (regardless of admin status)
      const allRequestsQuery = query(
        requestsRef,
        where("facultyStatus", "==", "Approved")
      );
      
      const pendingSnapshot = await getDocs(pendingQuery);
      const allRequestsSnapshot = await getDocs(allRequestsQuery);
      
      console.log("Pending stationery requests found:", pendingSnapshot.size);
      console.log("Total faculty-approved stationery requests found:", allRequestsSnapshot.size);
      
      // Process pending requests for the overview tab
      for (const docSnap of pendingSnapshot.docs) {
        const data = docSnap.data();
        let studentName = "Student";
        
        try {
          if (data.userId) {
            const studentDocRef = doc(db, 'users', data.userId);
            const studentDoc = await getDoc(studentDocRef);
            
            if (studentDoc.exists()) {
              const studentData = studentDoc.data();
              studentName = studentData.name || studentData.displayName || "Student";
            }
          }
        } catch (error) {
          console.error("Error fetching student details:", error);
        }
        
        stationeryPendingRequests.push({
          id: docSnap.id,
          studentName: studentName,
          studentId: data.studentId || data.userId || '',
          requestName: data.requestName || data.purpose || 'Stationery Request',
          requestDate: data.requestDate || data.date || '',
          items: data.items || [],
          selectedItems: data.selectedItems || [],
          itemsSummary: data.itemsSummary || '',
          quantity: data.quantity || '',
          facultyApprover: data.approverName || 'Faculty',
          status: 'Pending Admin Approval',
          details: data
        });
      }
      
      // Process all faculty-approved requests for the requests tab
      for (const docSnap of allRequestsSnapshot.docs) {
        const data = docSnap.data();
        let studentName = "Student";
        
        try {
          if (data.userId) {
            const studentDocRef = doc(db, 'users', data.userId);
            const studentDoc = await getDoc(studentDocRef);
            
            if (studentDoc.exists()) {
              const studentData = studentDoc.data();
              studentName = studentData.name || studentData.displayName || "Student";
            }
          }
        } catch (error) {
          console.error("Error fetching student details:", error);
        }
        
        allStationeryRequests.push({
          id: docSnap.id,
          studentName: studentName,
          studentId: data.studentId || data.userId || '',
          requestName: data.requestName || data.purpose || 'Stationery Request',
          requestType: 'Stationery Request',
          requestDate: data.requestDate || data.date || '',
          items: data.items || [],
          selectedItems: data.selectedItems || [],
          itemsSummary: data.itemsSummary || '',
          quantity: data.quantity || '',
          facultyApprover: data.approverName || 'Faculty',
          status: data.adminStatus || 'Pending',
          details: data
        });
      }
      
      setPendingRequests(stationeryPendingRequests);
      setAllRequests(allStationeryRequests);
      console.log("Pending stationery requests updated:", stationeryPendingRequests);
      console.log("All stationery requests updated:", allStationeryRequests);
      setLoadingRequests(false);
    } catch (error) {
      console.error("Error fetching stationery requests:", error);
      setLoadingRequests(false);
    }
  };
  
  const handleRequestApproval = async (requestId, action) => {
    try {
      setLoading(true);
      console.log(`Stationery request ${requestId} ${action}`);
      
      const request = allRequests.find(r => r.id === requestId);
      if (!request) {
        console.error(`Request with ID ${requestId} not found`);
        setLoading(false);
        return;
      }
      
      const requestDocRef = doc(db, 'stationeryRequests', requestId);
      const newStatus = action === 'approve' ? 'Approved' : 'Rejected';
      
      await updateDoc(requestDocRef, {
        adminStatus: newStatus,
        status: newStatus,
        updatedAt: new Date(),
        adminApprovedBy: STATIONERY_ADMIN_ID,
        adminApproverName: userProfile.name || 'Stationery Admin'
      });
      
      // Update both allRequests and pendingRequests state to reflect the change
      setAllRequests(allRequests.map(r => 
        r.id === requestId 
          ? { ...r, status: newStatus } 
          : r
      ));
      
      // Remove the approved/rejected request from pendingRequests
      setPendingRequests(pendingRequests.filter(r => r.id !== requestId));
      
      setLoading(false);
    } catch (error) {
      console.error(`Error during stationery request ${action}:`, error);
      setLoading(false);
    }
  };

  const handleViewRequest = (request) => {
    setSelectedRequest(request);
    setShowRequestModal(true);
  };

  const closeRequestModal = () => {
    setShowRequestModal(false);
    setSelectedRequest(null);
  };
  
  useEffect(() => {
    fetchUserProfile();
    fetchPendingRequests();
  }, []);

  // Handle logout functionality
  const handleLogout = async () => {
    try {
      // Sign out from Firebase
      await auth.signOut();
      // Then navigate to login
      navigate('/login');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-950' : 'bg-gradient-to-br from-gray-50 to-gray-100'} text-white`}>
      {/* Top Navigation */}
      <div className="flex items-center justify-between p-4 border-b border-blue-900/30 bg-gradient-to-r from-blue-900/80 to-gray-900/90 backdrop-blur-md shadow-lg">
        <div className="flex items-center">
          <button 
            onClick={toggleSidebar} 
            className="mr-4 hover:bg-blue-600 p-2 rounded-md transition-all duration-300 focus:outline-none flex items-center justify-center w-8 h-8 hover:scale-110 text-blue-100" 
            title={sidebarVisible ? "Hide Sidebar" : "Show Sidebar"}
          >
            <span className={`transition-transform duration-300 ${sidebarVisible ? '' : 'rotate-90'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </span>
          </button>
        </div>
        <h1 className="text-xl font-bold border-b-2 border-blue-500 pb-1 px-6 py-1 rounded-t-lg bg-gray-800/50 backdrop-blur-sm shadow-md text-blue-100">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
        <div className="flex items-center">
          <span className="mr-2 text-blue-100 font-medium">{userProfile.name}</span>
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center relative overflow-hidden ring-2 ring-blue-300 ring-opacity-50 shadow-lg hover:shadow-blue-500/30 transition-all duration-300 cursor-pointer">
            {profileImage ? (
              <img src={profileImage} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <span className="text-blue-100 font-semibold">{userProfile.name.charAt(0)}</span>
            )}
            <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-gray-900 shadow-md"></div>
          </div>
        </div>
      </div>

      {/* Main content with sidebar */}
      <div className="flex relative h-[calc(100vh-64px)]">
        {/* Sidebar - conditionally rendered based on sidebarVisible state */}
        <div className={`${sidebarVisible ? 'w-64' : 'w-0'} transition-all duration-300 ease-in-out h-full overflow-hidden bg-gradient-to-b from-blue-900/90 via-gray-800/90 to-gray-900/90 backdrop-blur-md text-white border-r border-blue-900/20 shadow-xl`}>
          <div className="p-4 w-64">
            {/* Header with logo */}
            <div className="flex items-center mb-8 p-3 bg-gray-800/50 rounded-lg border border-blue-900/20 shadow-inner">
              <div className="bg-gradient-to-br from-blue-600 to-blue-800 h-10 w-10 rounded-md flex items-center justify-center mr-3 shadow-md transform hover:scale-105 transition-transform duration-300">
                <span className="text-white font-bold">S</span>
              </div>
              <span className="text-lg font-semibold text-blue-100">Stationery Dashboard</span>
            </div>

            <nav>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`flex items-center w-full p-3 rounded-lg transition-all duration-300 ${
                      activeTab === 'overview' 
                        ? 'bg-gradient-to-r from-blue-700 to-blue-600 text-white shadow-lg' 
                        : 'text-gray-300 hover:bg-gray-800/50 hover:text-white hover:translate-x-1'
                    }`}
                  >
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
                    </svg>
                    Overview
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveTab('requests')}
                    className={`flex items-center w-full p-3 rounded-lg transition-all duration-300 ${
                      activeTab === 'requests' 
                        ? 'bg-gradient-to-r from-blue-700 to-blue-600 text-white shadow-lg' 
                        : 'text-gray-300 hover:bg-gray-800/50 hover:text-white hover:translate-x-1'
                    }`}
                  >
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                    <span className="text-sm">Faculty Requests</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`flex items-center w-full p-3 rounded-lg transition-all duration-300 ${
                      activeTab === 'profile' 
                        ? 'bg-gradient-to-r from-blue-700 to-blue-600 text-white shadow-lg' 
                        : 'text-gray-300 hover:bg-gray-800/50 hover:text-white hover:translate-x-1'
                    }`}
                  >
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                    Profile
                  </button>
                </li>
              </ul>
            </nav>

            {/* User info at bottom of sidebar */}
            {sidebarVisible && (
              <div className="absolute bottom-0 left-0 w-64 p-4">
                <div className="mx-4 my-2 p-4 rounded-lg bg-gray-800/50 backdrop-blur-md shadow-lg border border-blue-900/20">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center overflow-hidden ring-2 ring-blue-400 shadow-md">
                      {profileImage ? (
                        <img src={profileImage} alt="Profile" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-white font-semibold">{userProfile.name.charAt(0)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-blue-100">{userProfile.name}</p>
                      <p className="text-xs truncate text-gray-400">
                        {/* No mock data, will be filled when database is connected */}
                      </p>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center px-4 py-2 rounded-lg bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white transition-all shadow-md hover:shadow-lg mt-2 transform hover:translate-y-[-2px] hover:shadow-red-600/30"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main content area - adjust to take full width when sidebar is hidden */}
        <div 
          className={`flex-1 p-6 overflow-auto transition-all duration-300 ease-in-out h-full bg-gradient-to-br ${isDarkMode ? 'from-gray-900 to-gray-800' : 'from-gray-50 to-gray-100'}`}
          style={{ width: sidebarVisible ? 'calc(100% - 16rem)' : '100%' }}
        >
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Profile and Statistics cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Profile Card */}
                <div className="rounded-lg shadow-xl p-6 backdrop-blur-sm bg-gray-800/70 border border-blue-900/20 transform transition-all duration-300 hover:shadow-blue-500/10 hover:scale-[1.01] relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="flex items-start relative z-10">
                    <div className="mr-4">
                      <div className="relative">
                        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center overflow-hidden ring-2 ring-blue-300 ring-opacity-50 shadow-lg">
                          {profileImage ? (
                            <img src={profileImage} alt="Profile" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-white text-xl font-semibold">{userProfile.name.charAt(0)}</span>
                          )}
                        </div>
                        <div className="absolute bottom-0 right-0 h-4 w-4 bg-green-500 rounded-full border-2 border-gray-800 shadow-md"></div>
                      </div>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-blue-100">{userProfile.name}</h2>
                      <p className="text-sm text-gray-400">ID: {userProfile.id}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-2 relative z-10">
                    <div className="flex">
                      <span className="text-gray-400 w-32">Department:</span>
                      <span className="text-gray-200">{userProfile.department}</span>
                    </div>
                    <div className="flex">
                      <span className="text-gray-400 w-32">Email:</span>
                      <span className="text-gray-200">{userProfile.email}</span>
                    </div>
                    <div className="flex">
                      <span className="text-gray-400 w-32">Specialization:</span>
                      <span className="text-gray-200">{userProfile.specialization}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex justify-end relative z-10">
                    <button 
                      onClick={() => setActiveTab('profile')}
                      className="text-blue-400 hover:text-blue-300 flex items-center group"
                    >
                      View Profile <span className="ml-1 group-hover:translate-x-1 transition-transform duration-300">»</span>
                    </button>
                  </div>
                </div>
                
                {/* Statistics Card */}
                <div className="rounded-lg shadow-xl p-6 backdrop-blur-sm bg-gray-800/70 border border-blue-900/20 transform transition-all duration-300 hover:shadow-blue-500/10 hover:scale-[1.01] relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <h2 className="text-xl mb-4 font-bold flex items-center text-blue-100 relative z-10">
                    <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                    </svg>
                    Stationery Statistics
                  </h2>
                  <div className="grid grid-cols-3 gap-4 relative z-10">
                    <div className="text-center p-3 rounded-lg bg-amber-900/30 text-amber-200 shadow-lg border border-amber-800/30 transform transition-all duration-300 hover:scale-105 hover:shadow-amber-600/20">
                      <p className="text-2xl font-bold">
                        {allRequests.filter(req => req.status === 'Pending').length}
                      </p>
                      <p className="text-sm">Pending</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-blue-900/30 text-blue-200 shadow-lg border border-blue-800/30 transform transition-all duration-300 hover:scale-105 hover:shadow-blue-600/20">
                      <p className="text-2xl font-bold">
                        {allRequests.filter(req => req.status === 'Approved').length}
                      </p>
                      <p className="text-sm">Approved</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-red-900/30 text-red-200 shadow-lg border border-red-800/30 transform transition-all duration-300 hover:scale-105 hover:shadow-red-600/20">
                      <p className="text-2xl font-bold">
                        {allRequests.filter(req => req.status === 'Rejected').length}
                      </p>
                      <p className="text-sm">Rejected</p>
                    </div>
                  </div>
                  {/* <div className="mt-4 flex flex-wrap justify-center gap-2 relative z-10">
                    <div className="inline-flex items-center bg-gray-700/70 rounded-full px-3 py-1 text-sm text-gray-200 shadow-inner">
                      <span className="mr-2 h-2 w-2 bg-blue-500 rounded-full"></span>
                      Today's Items: 0
                    </div>
                    <div className="inline-flex items-center bg-gray-700/70 rounded-full px-3 py-1 text-sm text-gray-200 shadow-inner">
                      <span className="mr-2 h-2 w-2 bg-blue-500 rounded-full"></span>
                      Total Items: 0
                    </div>
                    <div className="inline-flex items-center bg-gray-700/70 rounded-full px-3 py-1 text-sm text-gray-200 shadow-inner">
                      <span className="mr-2 h-2 w-2 bg-green-500 rounded-full"></span>
                      Available Items: 0
                    </div>
                  </div> */}
                </div>
              </div>
              
              {/* Pending Approvals */}
              <div className="rounded-lg shadow-xl p-6 backdrop-blur-sm bg-gray-800/70 border border-blue-900/20 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="flex justify-between items-center mb-4 relative z-10">
                  <h2 className="text-xl font-bold flex items-center text-blue-100">
                    <svg className="w-6 h-6 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
                    </svg>
                    Pending Stationery Requests
                  </h2>
                  <button 
                    onClick={fetchPendingRequests}
                    className="flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-md hover:shadow-lg transition-all duration-300 transform hover:translate-y-[-1px]"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </button>
                </div>
                
                {loadingRequests ? (
                  <div className="flex justify-center items-center h-40">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
                ) : (
                  pendingRequests.length > 0 ? (
                    <div className="space-y-4 relative z-10">
                      {pendingRequests.map(request => (
                        <div 
                          key={request.id}
                          className="rounded-lg bg-gray-800/90 shadow-md border border-gray-700/50 overflow-hidden relative"
                        >
                          <div className="p-4">
                            <div className="flex justify-between">
                              <div className="space-y-1">
                                <h3 className="text-lg font-semibold text-white">{request.studentName}</h3>
                                <p className="text-sm text-gray-300">
                                  Stationery Request • {request.requestDate} • {request.quantity || 'N/A'}
                                </p>
                                <p className="text-sm text-gray-400">
                                  Forwarded by: {request.facultyApprover} ()
                                </p>
                              </div>
                              <div className="flex gap-2">
                  <button 
                                  onClick={() => handleRequestApproval(request.id, 'approve')}
                                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium shadow-md transition-all duration-200"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleRequestApproval(request.id, 'reject')}
                                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium shadow-md transition-all duration-200"
                                >
                                  Reject
                  </button>
                </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-40 relative z-10">
                      <div className="text-6xl opacity-20 text-blue-300">📋</div>
                      <p className="mt-4 text-gray-300">No pending requests at the moment</p>
                      <p className="text-sm text-gray-500">New requests will appear here when approved by faculty</p>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'requests' && (
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center text-blue-100">
                <svg className="w-6 h-6 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
                Faculty Requests
              </h2>
              
              {loadingRequests ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    </div>
              ) : allRequests.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-blue-900/20 shadow-xl">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-800/90">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Form ID
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Student
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Type
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Date
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-gray-900/80 divide-y divide-gray-800">
                      {allRequests.map((request) => (
                        <tr key={request.id} className="hover:bg-gray-800/50 transition-colors duration-200">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                            {request.id.substring(0, 12)}...
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div>
                                <div className="text-sm font-medium text-white">
                                  {request.studentName}
                                </div>
                                <div className="text-sm text-gray-400">
                                  {request.studentId.substring(0, 12)}...
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-900 text-blue-200">
                              {request.requestType}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {request.requestDate}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {request.status === 'Approved' ? (
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-900 text-green-200">
                                Approved
                              </span>
                            ) : request.status === 'Rejected' ? (
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-900 text-red-200">
                                Rejected
                              </span>
                            ) : (
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-900 text-amber-200">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button 
                              className="text-blue-500 hover:text-blue-400 bg-blue-900/30 px-3 py-1 rounded-md"
                              onClick={() => handleViewRequest(request)}
                            >
                              View
                            </button>
                            {request.status === 'Pending' && (
                              <>
                                <button 
                                  className="ml-2 text-green-500 hover:text-green-400 bg-green-900/30 px-3 py-1 rounded-md"
                                  onClick={() => handleRequestApproval(request.id, 'approve')}
                                >
                                  Approve
                                </button>
                                <button 
                                  className="ml-2 text-red-500 hover:text-red-400 bg-red-900/30 px-3 py-1 rounded-md"
                                  onClick={() => handleRequestApproval(request.id, 'reject')}
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 bg-gray-800/50 rounded-lg border border-gray-700 shadow-lg">
                  <div className="text-8xl opacity-20 text-blue-400">📝</div>
                  <p className="mt-4 text-gray-300 text-xl font-light">No requests found</p>
                  <p className="mt-2 text-gray-500">Requests will appear here once submitted</p>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'profile' && (
            <div>
              {/* Profile Banner */}
              <div className={`rounded-lg overflow-hidden mb-6 relative bg-blue-500`}>
                <div className="h-48"></div>
                
                <div className="absolute bottom-4 left-6 flex items-end">
                  <div className="relative">
                    <div className="h-20 w-20 rounded-full bg-blue-500 border-4 border-gray-900 flex items-center justify-center relative z-10 overflow-hidden">
                      {profileImage ? (
                        <img src={profileImage} alt="Profile" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-white text-2xl">{userProfile.name.charAt(0)}</span>
                      )}
                      <div className="absolute bottom-1 right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-gray-900"></div>
                    </div>
                  </div>
                  <div className="ml-4 text-white">
                    <h2 className="text-2xl font-bold">{userProfile.name}</h2>
                    <p className="text-sm">Admin ID</p>
                  </div>
                </div>
                
                <div className="absolute top-4 right-4">
                  <button 
                    onClick={() => setIsEditingProfile(true)}
                    className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-md flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Edit Profile
                  </button>
                </div>
              </div>
              
              {/* Editing form or Profile view */}
              {isEditingProfile ? (
                <div className={`rounded-lg shadow p-6 mb-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <h3 className="text-lg font-bold mb-4">Edit Profile</h3>
                  
                  <form onSubmit={handleProfileSubmit}>
                    <div className="flex flex-col items-center mb-6">
                      <div className="relative mb-4">
                        <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-gray-700">
                          {profileImage ? (
                            <img 
                              src={profileImage} 
                              alt="Profile" 
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full bg-blue-500 flex items-center justify-center">
                              <span className="text-white text-3xl">S</span>
                            </div>
                          )}
                        </div>
                        <button 
                          type="button"
                          onClick={() => fileInputRef.current.click()}
                          className="absolute bottom-0 right-0 bg-gray-800 p-2 rounded-full border-2 border-gray-700"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleProfileImageChange}
                        accept="image/*"
                        className="hidden"
                      />
                      <p className="text-sm text-gray-500">Click the icon to upload a new profile picture</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Full Name</label>
                          <input 
                            type="text" 
                            name="name"
                            className={`w-full p-2 rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'} border`}
                            defaultValue={userProfile.name}
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">Admin ID</label>
                          <input 
                            type="text" 
                            className={`w-full p-2 rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'} border`}
                            defaultValue={userProfile.id}
                            disabled
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">Department</label>
                          <input 
                            type="text" 
                            name="department"
                            className={`w-full p-2 rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'} border`}
                            defaultValue={userProfile.department}
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Email</label>
                          <input 
                            type="email" 
                            name="email"
                            className={`w-full p-2 rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'} border`}
                            defaultValue={userProfile.email}
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">Phone</label>
                          <input 
                            type="tel" 
                            name="phone"
                            className={`w-full p-2 rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'} border`}
                            defaultValue={userProfile.phone}
                            placeholder="Enter phone number"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">Specialization</label>
                          <input 
                            type="text" 
                            name="specialization"
                            className={`w-full p-2 rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'} border`}
                            defaultValue={userProfile.specialization}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end mt-6 space-x-3">
                      <button 
                        type="button"
                        onClick={() => setIsEditingProfile(false)}
                        className={`px-4 py-2 rounded-md ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={loading}
                      >
                        {loading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Admin Information */}
                  <div className={`rounded-lg shadow p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} col-span-1`}>
                    <h3 className="text-xl font-bold mb-4">Admin Information</h3>
                    
                      <div className="space-y-4">
                        <div>
                        <label className="block text-sm font-medium text-gray-500">ID</label>
                        <p className="font-medium">{userProfile.id}</p>
                        </div>
                      
                        <div>
                        <label className="block text-sm font-medium text-gray-500">Department</label>
                        <p className="font-medium">{userProfile.department}</p>
                        </div>
                      
                        <div>
                        <label className="block text-sm font-medium text-gray-500">Specialization</label>
                        <p className="font-medium">{userProfile.specialization || "Not specified"}</p>
                        </div>
                      </div>
                    </div>
                  
                  {/* Account Settings */}
                  <div className={`rounded-lg shadow p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} col-span-1 md:col-span-2`}>
                    <h3 className="text-xl font-bold mb-4 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                      </svg>
                      Account Settings
                    </h3>
                    
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Dark Mode</h4>
                          <p className="text-sm text-gray-500">Toggle dark/light theme</p>
                        </div>
                        <div 
                          onClick={toggleTheme}
                          className={`w-12 h-6 ${isDarkMode ? "bg-blue-600" : "bg-gray-200"} rounded-full relative cursor-pointer transition-colors duration-300`}
                        >
                          <div className={`absolute h-6 w-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${isDarkMode ? "translate-x-6" : "translate-x-0"}`}></div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6 flex justify-start">
                      <button 
                        onClick={() => setIsEditingProfile(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md flex items-center text-sm"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Edit Profile
                      </button>
                      </div>
                    </div>
                    
                    {/* Contact Details */}
                  <div className={`rounded-lg shadow p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} col-span-1`}>
                    <h3 className="text-xl font-bold mb-4">Contact Details</h3>
                    
                      <div className="space-y-4">
                      <div className="flex items-start">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-blue-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        <span className="block">{userProfile.email || auth.currentUser?.email || "Not provided"}</span>
                        </div>
                      
                      <div className="flex items-start">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-blue-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        <span className="block">{userProfile.phone || "Not provided"}</span>
                        </div>
                      
                      {/* <div className="flex items-start">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-blue-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        <span className="block">Admin Building, Room 105</span>
                        </div> */}
                        </div>
                      </div>
                </div>
              )}
            </div>
          )}
                    </div>
                  </div>
                  
      {/* Request Details Modal */}
      {showRequestModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg shadow-2xl w-full max-w-3xl overflow-hidden border border-blue-900/30">
            <div className="flex justify-between items-center bg-gray-800 p-4 border-b border-gray-700">
              <h3 className="text-xl font-bold text-blue-100">Request Details</h3>
              <button 
                onClick={closeRequestModal}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
              </button>
            </div>
                      
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column - Request Information */}
                      <div className="space-y-4">
                  <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                    <h4 className="text-lg font-medium text-blue-300 mb-2">Request Information</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Request ID:</span>
                        <span className="text-white font-medium">{selectedRequest.id}</span>
                          </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Request Type:</span>
                        <span className="text-white font-medium">{selectedRequest.requestType}</span>
                            </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Date:</span>
                        <span className="text-white font-medium">{selectedRequest.requestDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Status:</span>
                        <span className={`font-medium px-2 py-1 rounded-full text-xs ${
                          selectedRequest.status === 'Approved' 
                            ? 'bg-green-900 text-green-200' 
                            : selectedRequest.status === 'Rejected' 
                              ? 'bg-red-900 text-red-200' 
                              : 'bg-amber-900 text-amber-200'
                        }`}>
                          {selectedRequest.status}
                        </span>
                      </div>
                          </div>
                        </div>
                        
                  <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                    <h4 className="text-lg font-medium text-blue-300 mb-2">Student Information</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Name:</span>
                        <span className="text-white font-medium">{selectedRequest.studentName}</span>
                          </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">ID:</span>
                        <span className="text-white font-medium">{selectedRequest.studentId}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                {/* Right Column - Items and Approval */}
                <div className="space-y-4">
                  <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                    <h4 className="text-lg font-medium text-blue-300 mb-2">Requested Items</h4>
                    {selectedRequest.items && Array.isArray(selectedRequest.items) && selectedRequest.items.length > 0 ? (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {selectedRequest.items.map((item, index) => (
                          <div key={index} className="flex justify-between p-2 bg-gray-700/50 rounded">
                            <span className="text-white">{item.name || 'Item ' + (index + 1)}</span>
                            <div className="flex space-x-4">
                              <span className="text-gray-300">Qty: {item.quantity || 1}</span>
                      </div>
                    </div>
                        ))}
                  </div>
                    ) : selectedRequest.selectedItems && Array.isArray(selectedRequest.selectedItems) && selectedRequest.selectedItems.length > 0 ? (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {selectedRequest.selectedItems.map((item, index) => (
                          <div key={index} className="flex justify-between p-2 bg-gray-700/50 rounded">
                            <span className="text-white">{item.name || 'Item ' + (index + 1)}</span>
                            <div className="flex space-x-4">
                              <span className="text-gray-300">Qty: {item.quantity || 1}</span>
                </div>
                          </div>
                        ))}
                      </div>
                    ) : selectedRequest.details?.items && Array.isArray(selectedRequest.details.items) && selectedRequest.details.items.length > 0 ? (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {selectedRequest.details.items.map((item, index) => (
                          <div key={index} className="flex justify-between p-2 bg-gray-700/50 rounded">
                            <span className="text-white">{item.name || 'Item ' + (index + 1)}</span>
                            <div className="flex space-x-4">
                              <span className="text-gray-300">Qty: {item.quantity || 1}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : selectedRequest.itemsSummary ? (
                      <p className="text-gray-200">{selectedRequest.itemsSummary}</p>
                    ) : selectedRequest.details?.itemsSummary ? (
                      <p className="text-gray-200">{selectedRequest.details.itemsSummary}</p>
                    ) : (
                      <p className="text-gray-400 italic">No items specified</p>
                    )}
                  </div>
                  
                  <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                    <h4 className="text-lg font-medium text-blue-300 mb-2">Approval Details</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Faculty Approval:</span>
                        <span className="text-green-400">Approved by {selectedRequest.facultyApprover}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Admin Status:</span>
                        <span className={`${
                          selectedRequest.status === 'Approved' 
                            ? 'text-green-400' 
                            : selectedRequest.status === 'Rejected' 
                              ? 'text-red-400' 
                              : 'text-amber-400'
                        }`}>
                          {selectedRequest.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Additional Notes Section */}
                  <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                    <h4 className="text-lg font-medium text-blue-300 mb-2">Additional Notes</h4>
                    <div className="space-y-2">
                      <div className="flex flex-col">
                        <span className="text-gray-400 mb-1">Notes:</span>
                        <p className="text-white bg-gray-700/50 p-3 rounded-md">
                          {selectedRequest.details?.additionalNotes || 'No additional notes provided'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {selectedRequest.status === 'Pending' && (
                    <div className="flex justify-end space-x-3">
                        <button 
                        onClick={() => {
                          handleRequestApproval(selectedRequest.id, 'approve');
                          closeRequestModal();
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-md shadow-md hover:shadow-lg transform hover:translate-y-[-2px] transition-all duration-300 hover:shadow-green-600/30"
                      >
                        Approve Request
                      </button>
                      <button 
                        onClick={() => {
                          handleRequestApproval(selectedRequest.id, 'reject');
                          closeRequestModal();
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-md shadow-md hover:shadow-lg transform hover:translate-y-[-2px] transition-all duration-300 hover:shadow-red-600/30"
                      >
                        Reject Request
                        </button>
            </div>
          )}
        </div>
      </div>
                </div>
          </div>
            </div>
          )}
    </div>
  );
};

export default StationeryAdminDashboard; 