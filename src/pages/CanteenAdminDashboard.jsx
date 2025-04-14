import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../firebase/config';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';

const CanteenAdminDashboard = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [recentOrders, setRecentOrders] = useState([]);
  const [orderStats, setOrderStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0
  });
  const [userProfile, setUserProfile] = useState({
    name: '',
    id: '',
    department: 'Food Services',
    email: '',
    specialization: ''
  });
  
  const CANTEEN_ADMIN_ID = "zMKTqQYY9xMTzNLEDod3NQYlVUz1";

  const [formData, setFormData] = useState({
    name: '',
    department: '',
    email: '',
    phone: '',
    specialization: ''
  });
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

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
          department: userData.department || 'Food Services',
          id: userId,
          specialization: userData.specialization || ''
        });
      } else {
        console.log("No user document found");
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const fetchPendingOrders = async () => {
    try {
      setLoadingOrders(true);
      console.log("Fetching canteen orders");
      
      const adminId = auth.currentUser?.uid;
      
      if (!adminId) {
        console.error("No authenticated admin found");
        setLoadingOrders(false);
        return;
      }
      
      if (adminId !== CANTEEN_ADMIN_ID) {
        console.log("Current user is not the designated Canteen Admin");
        setLoadingOrders(false);
        return;
      }
      
      const canteenPendingOrders = [];
      const allCanteenOrders = [];
      
      const ordersRef = collection(db, 'canteenOrders');
      
      // Fetch pending orders (faculty approved, admin pending)
      const pendingQuery = query(
        ordersRef,
        where("facultyStatus", "==", "Approved"),
        where("adminStatus", "==", "Pending")
      );
      
      // Fetch all orders to display in the table
      const allOrdersSnapshot = await getDocs(ordersRef);
      
      const pendingSnapshot = await getDocs(pendingQuery);
      console.log("Pending canteen orders found:", pendingSnapshot.size);
      console.log("Total canteen orders found:", allOrdersSnapshot.size);
      
      // Process pending orders for the overview tab
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
        
        canteenPendingOrders.push({
          id: docSnap.id,
          studentName: studentName,
          studentId: data.studentId || data.userId || '',
          orderName: data.orderName || data.purpose || 'Canteen Order',
          orderDate: data.orderDate || data.date || '',
          items: data.items || [],
          orderItems: data.orderItems || [],
          quantity: data.quantity || '',
          total: data.total || 'N/A',
          facultyApprover: data.approverName || 'Faculty',
          status: 'Pending Admin Approval',
          details: data,
          location: data.location || ''
        });
      }
      
      // Initialize counters for statistics
      let pendingCount = 0;
      let approvedCount = 0;
      let rejectedCount = 0;
      
      // Process all orders for the orders tab
      for (const docSnap of allOrdersSnapshot.docs) {
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
        
        // Update counters based on order status
        if (data.adminStatus === 'Pending') {
          pendingCount++;
        } else if (data.adminStatus === 'Approved') {
          approvedCount++;
        } else if (data.adminStatus === 'Rejected') {
          rejectedCount++;
        }
        
        allCanteenOrders.push({
          id: docSnap.id,
          studentName: studentName,
          studentId: data.studentId || data.userId || '',
          orderName: data.orderName || data.purpose || 'Canteen Order',
          orderType: 'Canteen Order',
          orderDate: data.orderDate || data.date || '',
          items: data.items || [],
          orderItems: data.orderItems || [],
          quantity: data.quantity || '',
          total: data.total || 'N/A',
          facultyApprover: data.approverName || 'Faculty',
          status: data.adminStatus || 'Pending',
          details: data,
          location: data.location || ''
        });
      }
      
      // Update the order statistics
      setOrderStats({
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount
      });
      
      setPendingOrders(canteenPendingOrders);
      setAllOrders(allCanteenOrders);
      console.log("Pending canteen orders updated:", canteenPendingOrders);
      console.log("All canteen orders updated:", allCanteenOrders);
      setLoadingOrders(false);
    } catch (error) {
      console.error("Error fetching canteen orders:", error);
      setLoadingOrders(false);
    }
  };
  
  const handleOrderApproval = async (orderId, action) => {
    try {
      setLoading(true);
      console.log(`Canteen order ${orderId} ${action}`);
      
      const order = allOrders.find(o => o.id === orderId);
      if (!order) {
        console.error(`Order with ID ${orderId} not found`);
        setLoading(false);
        return;
      }
      
      const orderDocRef = doc(db, 'canteenOrders', orderId);
      const newStatus = action === 'approve' ? 'Approved' : 'Rejected';
      
      await updateDoc(orderDocRef, {
        adminStatus: newStatus,
        status: newStatus,
        updatedAt: new Date(),
        adminApprovedBy: CANTEEN_ADMIN_ID,
        adminApproverName: userProfile.name || 'Canteen Admin'
      });
      
      // Update the order statistics based on the action
      setOrderStats(prev => ({
        pending: prev.pending - 1,
        approved: action === 'approve' ? prev.approved + 1 : prev.approved,
        rejected: action === 'reject' ? prev.rejected + 1 : prev.rejected
      }));
      
      setAllOrders(allOrders.map(o => 
        o.id === orderId 
          ? { ...o, status: newStatus } 
          : o
      ));
      
      setRecentOrders(recentOrders.map(o => 
        o.id === orderId 
          ? { ...o, status: newStatus } 
          : o
      ));
      
      setPendingOrders(pendingOrders.filter(o => o.id !== orderId));
      
      setLoading(false);
    } catch (error) {
      console.error(`Error during canteen order ${action}:`, error);
      setLoading(false);
    }
  };
  
  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const closeOrderModal = () => {
    setShowOrderModal(false);
    setSelectedOrder(null);
  };
  
  const fetchRecentOrders = async () => {
    try {
      console.log("Fetching recent canteen orders");
      
      const adminId = auth.currentUser?.uid;
      
      if (!adminId) {
        console.error("No authenticated admin found");
        return;
      }
      
      if (adminId !== CANTEEN_ADMIN_ID) {
        console.log("Current user is not the designated Canteen Admin");
        return;
      }
      
      // Calculate date 7 days ago
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentOrdersArray = [];
      
      // Get all orders from the last 7 days
      const ordersRef = collection(db, 'canteenOrders');
      const allOrdersSnapshot = await getDocs(ordersRef);
      
      for (const docSnap of allOrdersSnapshot.docs) {
        const data = docSnap.data();
        
        // Convert the date string to a Date object for comparison
        let orderDate;
        try {
          if (data.orderDate) {
            const [month, day, year] = data.orderDate.split('/');
            orderDate = new Date(year, month - 1, day);
          } else if (data.date) {
            const [month, day, year] = data.date.split('/');
            orderDate = new Date(year, month - 1, day);
          } else {
            // If no date is available, use creation date if available or skip
            orderDate = data.createdAt ? data.createdAt.toDate() : new Date();
          }
          
          // Skip orders older than 7 days
          if (orderDate < sevenDaysAgo) {
            continue;
          }
        } catch (error) {
          console.error("Error parsing date:", error);
          continue;
        }
        
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
        
        recentOrdersArray.push({
          id: docSnap.id,
          studentName: studentName,
          studentId: data.studentId || data.userId || '',
          orderName: data.orderName || data.purpose || 'Canteen Order',
          orderType: 'Canteen Order',
          orderDate: data.orderDate || data.date || '',
          items: data.items || [],
          orderItems: data.orderItems || [],
          quantity: data.quantity || '',
          total: data.total || 'N/A',
          facultyApprover: data.approverName || 'Faculty',
          status: data.adminStatus || 'Pending',
          details: data,
          location: data.location || ''
        });
      }
      
      // Sort by date (newest first)
      recentOrdersArray.sort((a, b) => {
        const dateA = new Date(a.orderDate);
        const dateB = new Date(b.orderDate);
        return dateB - dateA;
      });
      
      setRecentOrders(recentOrdersArray);
      console.log("Recent orders updated:", recentOrdersArray);
      
    } catch (error) {
      console.error("Error fetching recent orders:", error);
    }
  };

  useEffect(() => {
    fetchUserProfile();
    fetchPendingOrders();
    fetchRecentOrders();
  }, []);

  // Initialize form data when user profile is fetched or edit mode is enabled
  useEffect(() => {
    setFormData({
      name: userProfile.name || '',
      department: userProfile.department || 'Food Services',
      email: userProfile.email || '',
      phone: userProfile.phone || '',
      specialization: userProfile.specialization || ''
    });
  }, [userProfile, isEditingProfile]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const saveProfileChanges = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    setSaveError(null);
    setSaveSuccess(false);
    
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        throw new Error("No authenticated user found");
      }
      
      const userRef = doc(db, 'users', userId);
      
      // Update the document in Firestore
      await updateDoc(userRef, {
        name: formData.name,
        department: formData.department,
        email: formData.email,
        phone: formData.phone,
        specialization: formData.specialization,
        updatedAt: new Date()
      });
      
      // Update local state to reflect changes
      setUserProfile({
        ...userProfile,
        name: formData.name,
        department: formData.department,
        email: formData.email,
        phone: formData.phone,
        specialization: formData.specialization
      });
      
      setSaveSuccess(true);
      // Close the editing form after a short delay
      setTimeout(() => {
        setIsEditingProfile(false);
        setSaveSuccess(false);
      }, 1500);
      
    } catch (error) {
      console.error("Error saving profile changes:", error);
      setSaveError(error.message);
    } finally {
      setSaveLoading(false);
    }
  };

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
                <span className="text-white font-bold">C</span>
              </div>
              <span className="text-lg font-semibold text-blue-100">Canteen Dashboard</span>
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
                    onClick={() => setActiveTab('orders')}
                    className={`flex items-center w-full p-3 rounded-lg transition-all duration-300 ${
                      activeTab === 'orders' 
                        ? 'bg-gradient-to-r from-blue-700 to-blue-600 text-white shadow-lg' 
                        : 'text-gray-300 hover:bg-gray-800/50 hover:text-white hover:translate-x-1'
                    }`}
                  >
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
                    </svg>
                    <span className="text-sm">Faculty Orders</span>
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
                        {userProfile.id}
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
                    Order Statistics
                  </h2>
                  <div className="grid grid-cols-3 gap-4 relative z-10">
                    <div className="text-center p-3 rounded-lg bg-amber-900/30 text-amber-200 shadow-lg border border-amber-800/30 transform transition-all duration-300 hover:scale-105 hover:shadow-amber-600/20">
                      <p className="text-2xl font-bold">{orderStats.pending}</p>
                      <p className="text-sm">Pending</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-green-900/30 text-green-200 shadow-lg border border-green-800/30 transform transition-all duration-300 hover:scale-105 hover:shadow-green-600/20">
                      <p className="text-2xl font-bold">{orderStats.approved}</p>
                      <p className="text-sm">Approved</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-red-900/30 text-red-200 shadow-lg border border-red-800/30 transform transition-all duration-300 hover:scale-105 hover:shadow-red-600/20">
                      <p className="text-2xl font-bold">{orderStats.rejected}</p>
                      <p className="text-sm">Rejected</p>
                    </div>
                  </div>
                  {/* <div className="mt-4 flex flex-wrap justify-center gap-2 relative z-10">
                    <div className="inline-flex items-center bg-gray-700/70 rounded-full px-3 py-1 text-sm text-gray-200 shadow-inner">
                      <span className="mr-2 h-2 w-2 bg-blue-500 rounded-full"></span>
                      Today's Sales: ₹0.00
                    </div>
                    <div className="inline-flex items-center bg-gray-700/70 rounded-full px-3 py-1 text-sm text-gray-200 shadow-inner">
                      <span className="mr-2 h-2 w-2 bg-blue-500 rounded-full"></span>
                      Total Orders: 0
                    </div>
                  </div> */}
                </div>
              </div>
              
              {/* Pending Orders */}
              <div className="rounded-lg shadow-xl p-6 backdrop-blur-sm bg-gray-800/70 border border-blue-900/20 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="flex justify-between items-center mb-4 relative z-10">
                  <h2 className="text-xl font-bold flex items-center text-blue-100">
                    <svg className="w-6 h-6 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
                    </svg>
                    Faculty Forwarded Orders
                  </h2>
                  <span className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-3 py-1 rounded-full text-xs shadow-md">
                    {pendingOrders.length}
                  </span>
                </div>
                
                {pendingOrders.length > 0 ? (
                  <div className="relative z-10">
                    {pendingOrders.map(order => (
                      <div 
                        key={order.id}
                        className="p-4 rounded-lg border-l-4 border-amber-500 mb-3 bg-gray-700/50 shadow-lg hover:shadow-amber-600/20 transition-all duration-300 transform hover:translate-x-1 hover:scale-[1.01] group"
                      >
                        <div className="flex justify-between">
                          <div>
                            <h3 className="font-medium text-amber-200">{order.studentName}</h3>
                            <p className="text-sm text-gray-300">{order.orderName} • {order.orderDate} • {order.total}</p>
                            <p className="text-sm text-gray-400">Forwarded by: {order.facultyApprover} ({order.department})</p>
                          </div>
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => handleOrderApproval(order.id, 'approve')}
                              className="px-3 py-1 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-md text-sm shadow-md hover:shadow-lg transform hover:translate-y-[-2px] transition-all duration-300 hover:shadow-green-600/30"
                              title="Approve"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => handleOrderApproval(order.id, 'reject')}
                              className="px-3 py-1 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-md text-sm shadow-md hover:shadow-lg transform hover:translate-y-[-2px] transition-all duration-300 hover:shadow-red-600/30"
                              title="Reject"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 relative z-10">
                    <div className="text-8xl opacity-20 text-blue-300">🍔</div>
                    <p className="mt-4 text-gray-300">No pending orders at the moment</p>
                    <p className="text-sm text-gray-500">New orders will appear here when submitted</p>
                  </div>
                )}
                
                <div className="mt-4 flex justify-end relative z-10">
                  <button 
                    onClick={() => setActiveTab('orders')}
                    className="text-blue-400 hover:text-blue-300 flex items-center group"
                  >
                    View All Orders <span className="ml-1 group-hover:translate-x-1 transition-transform duration-300">»</span>
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'orders' && (
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center text-blue-100">
                <svg className="w-6 h-6 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
                </svg>
                Faculty Orders
              </h2>
              
              {loadingOrders ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    </div>
              ) : allOrders.length > 0 ? (
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
                      {allOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-800/50 transition-colors duration-200">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                            {order.id.substring(0, 12)}...
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div>
                                <div className="text-sm font-medium text-white">
                                  {order.studentName}
                                </div>
                                <div className="text-sm text-gray-400">
                                  {order.studentId.substring(0, 12)}...
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-900 text-blue-200">
                              {order.orderType}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {order.orderDate}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {order.status === 'Approved' ? (
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-900 text-green-200">
                                Approved
                              </span>
                            ) : order.status === 'Rejected' ? (
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
                              onClick={() => handleViewOrder(order)}
                            >
                              View
                            </button>
                            {order.status === 'Pending' && (
                              <>
                                <button 
                                  className="ml-2 text-green-500 hover:text-green-400 bg-green-900/30 px-3 py-1 rounded-md"
                                  onClick={() => handleOrderApproval(order.id, 'approve')}
                                >
                                  Approve
                                </button>
                                <button 
                                  className="ml-2 text-red-500 hover:text-red-400 bg-red-900/30 px-3 py-1 rounded-md"
                                  onClick={() => handleOrderApproval(order.id, 'reject')}
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
                  <div className="text-8xl opacity-20 text-blue-400">🍽️</div>
                  <p className="mt-4 text-gray-300 text-xl font-light">No orders found</p>
                  <p className="mt-2 text-gray-500">Orders will appear here once submitted</p>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'profile' && (
            <div>
              {/* Profile Banner */}
              <div className={`rounded-lg overflow-hidden mb-6 relative`}>
                <div className="h-48 bg-gradient-to-r from-blue-500 to-blue-600"></div>
                
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
                    className="bg-gray-800 bg-opacity-50 hover:bg-opacity-70 text-white px-4 py-2 rounded-md flex items-center"
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
                  
                  <form onSubmit={saveProfileChanges}>
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
                              <span className="text-white text-3xl">{formData.name.charAt(0)}</span>
                            </div>
                          )}
                        </div>
                        <button 
                          type="button"
                          onClick={() => fileInputRef.current.click()}
                          className="absolute bottom-0 right-0 bg-gray-800 p-2 rounded-full border-2 border-gray-700"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
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
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Full Name</label>
                          <input 
                            type="text" 
                            name="name"
                            className={`w-full p-2 rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'} border`}
                            value={formData.name}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">Admin ID</label>
                          <input 
                            type="text" 
                            className={`w-full p-2 rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'} border`}
                            value={userProfile.id}
                            disabled
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">Department</label>
                          <input 
                            type="text" 
                            name="department"
                            className={`w-full p-2 rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'} border`}
                            value={formData.department}
                            onChange={handleInputChange}
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
                            value={formData.email}
                            onChange={handleInputChange}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">Phone</label>
                          <input 
                            type="tel" 
                            name="phone"
                            className={`w-full p-2 rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'} border`}
                            placeholder="Enter phone number"
                            value={formData.phone || ''}
                            onChange={handleInputChange}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">Specialization</label>
                          <input 
                            type="text" 
                            name="specialization"
                            className={`w-full p-2 rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'} border`}
                            value={formData.specialization}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {saveError && (
                      <div className="mt-4 p-2 bg-red-900/50 text-red-200 rounded-md">
                        Error: {saveError}
                      </div>
                    )}
                    
                    {saveSuccess && (
                      <div className="mt-4 p-2 bg-green-900/50 text-green-200 rounded-md flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        Profile updated successfully!
                      </div>
                    )}
                    
                    <div className="flex justify-end mt-6 space-x-3">
                      <button 
                        type="button"
                        onClick={() => setIsEditingProfile(false)}
                        className={`px-4 py-2 rounded-md ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                        disabled={saveLoading}
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center ${saveLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        disabled={saveLoading}
                      >
                        {saveLoading ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Saving...
                          </>
                        ) : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left column */}
                  <div className="space-y-6">
                    {/* Admin Information */}
                    <div className={`rounded-lg shadow p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${isDarkMode ? 'border-blue-900/20' : 'border-gray-200'}`}>
                      <h3 className="text-lg font-bold mb-4 text-blue-100">Admin Information</h3>
                      <div className="space-y-4">
                        <div>
                          <p className="text-gray-400 text-sm">ID</p>
                          <p className="text-gray-200">{userProfile.id || 'Not assigned'}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Department</p>
                          <p className="text-gray-200">{userProfile.department}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Specialization</p>
                          <p className="text-gray-200">{userProfile.specialization || 'Not specified'}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Contact Details */}
                    <div className={`rounded-lg shadow p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${isDarkMode ? 'border-blue-900/20' : 'border-gray-200'}`}>
                      <h3 className="text-lg font-bold mb-4 text-blue-100">Contact Details</h3>
                      <div className="space-y-4">
                        <div className="flex items-center">
                          <svg className="h-5 w-5 text-blue-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                          </svg>
                          <span className="text-gray-200">{userProfile.email || 'Not provided'}</span>
                        </div>
                        <div className="flex items-center">
                          <svg className="h-5 w-5 text-blue-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                          </svg>
                          <span className="text-gray-200">Not provided</span>
                        </div>
                        {/* <div className="flex items-center">
                          <svg className="h-5 w-5 text-blue-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                          </svg>
                          <span className="text-gray-200">Admin Building, Room 105</span>
                        </div> */}
                      </div>
                    </div>
                  </div>
                  
                  {/* Right column */}
                  <div className="md:col-span-2 space-y-6">
                    {/* Account Settings */}
                    <div className={`rounded-lg shadow p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${isDarkMode ? 'border-blue-900/20' : 'border-gray-200'}`}>
                      <h3 className="text-lg font-bold mb-4 flex items-center text-blue-100">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Account Settings
                      </h3>
                      
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                          <div>
                            <p className="font-medium text-gray-200">Dark Mode</p>
                            <p className="text-sm text-gray-400">Toggle dark/light theme</p>
                          </div>
                          <div>
                            <div 
                              onClick={toggleTheme}
                              className={`w-12 h-6 ${isDarkMode ? 'bg-blue-600' : 'bg-gray-200'} rounded-full flex items-center p-1 cursor-pointer transition-colors duration-300`}
                            >
                              <div className={`w-4 h-4 bg-white rounded-full transform transition-transform duration-300 ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-6">
                        <button 
                          onClick={() => setIsEditingProfile(true)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          Edit Profile
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg shadow-2xl w-full max-w-3xl overflow-hidden border border-blue-900/30">
            <div className="flex justify-between items-center bg-gray-800 p-4 border-b border-gray-700">
              <h3 className="text-xl font-bold text-blue-100">Order Details</h3>
              <button 
                onClick={closeOrderModal}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column - Order Information */}
                <div className="space-y-4">
                  <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                    <h4 className="text-lg font-medium text-blue-300 mb-2">Order Information</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Order ID:</span>
                        <span className="text-white font-medium">{selectedOrder.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Order Type:</span>
                        <span className="text-white font-medium">{selectedOrder.orderType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Date:</span>
                        <span className="text-white font-medium">{selectedOrder.orderDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total:</span>
                        <span className="text-white font-medium">{selectedOrder.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Status:</span>
                        <span className={`font-medium px-2 py-1 rounded-full text-xs ${
                          selectedOrder.status === 'Approved' 
                            ? 'bg-green-900 text-green-200' 
                            : selectedOrder.status === 'Rejected' 
                              ? 'bg-red-900 text-red-200' 
                              : 'bg-amber-900 text-amber-200'
                        }`}>
                          {selectedOrder.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Pickup Location:</span>
                        <span className="text-white font-medium">
                          {selectedOrder.details?.location === 'main-canteen' ? 'Main Canteen' :
                           selectedOrder.details?.location === 'cafeteria' ? 'Cafeteria' :
                           selectedOrder.details?.location || 'Not specified'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                    <h4 className="text-lg font-medium text-blue-300 mb-2">Student Information</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Name:</span>
                        <span className="text-white font-medium">{selectedOrder.studentName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">ID:</span>
                        <span className="text-white font-medium">{selectedOrder.studentId}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Right Column - Items and Approval */}
                <div className="space-y-4">
                  <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                    <h4 className="text-lg font-medium text-blue-300 mb-2">Order Items</h4>
                    {(() => {
                      // Try to get items from either items or orderItems fields
                      const itemsArray = Array.isArray(selectedOrder.orderItems) && selectedOrder.orderItems.length > 0
                        ? selectedOrder.orderItems
                        : Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0
                          ? selectedOrder.items
                          : null;
                          
                      if (itemsArray) {
                        return (
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {itemsArray.map((item, index) => (
                              <div key={index} className="flex justify-between p-2 bg-gray-700/50 rounded">
                                <span className="text-white">{item.name || 'Item ' + (index + 1)}</span>
                                <div className="flex space-x-4">
                                  <span className="text-gray-300">Qty: {item.quantity || 1}</span>
                                  <span className="text-gray-300">₹{item.price || 'N/A'}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      } else if (typeof selectedOrder.items === 'string' && selectedOrder.items.trim() !== '') {
                        // If items is a string, display it directly
                        return (
                          <div className="p-2 bg-gray-700/50 rounded">
                            <span className="text-white">{selectedOrder.items}</span>
                          </div>
                        );
                      } else {
                        return <p className="text-gray-400 italic">No items specified</p>;
                      }
                    })()}
                  </div>
                  
                  <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                    <h4 className="text-lg font-medium text-blue-300 mb-2">Approval Details</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Faculty Approval:</span>
                        <span className="text-green-400">Approved by {selectedOrder.facultyApprover}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Admin Status:</span>
                        <span className={`${
                          selectedOrder.status === 'Approved' 
                            ? 'text-green-400' 
                            : selectedOrder.status === 'Rejected' 
                              ? 'text-red-400' 
                              : 'text-amber-400'
                        }`}>
                          {selectedOrder.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {selectedOrder.status === 'Pending' && (
                    <div className="flex justify-end space-x-3">
                      <button 
                        onClick={() => {
                          handleOrderApproval(selectedOrder.id, 'approve');
                          closeOrderModal();
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-md shadow-md hover:shadow-lg transform hover:translate-y-[-2px] transition-all duration-300 hover:shadow-green-600/30"
                      >
                        Approve Order
                      </button>
                      <button 
                        onClick={() => {
                          handleOrderApproval(selectedOrder.id, 'reject');
                          closeOrderModal();
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-md shadow-md hover:shadow-lg transform hover:translate-y-[-2px] transition-all duration-300 hover:shadow-red-600/30"
                      >
                        Reject Order
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

export default CanteenAdminDashboard; 