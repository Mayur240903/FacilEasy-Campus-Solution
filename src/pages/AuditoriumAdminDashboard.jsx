import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
// Import Firebase components
import { db, auth } from '../firebase/config';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';

const AuditoriumAdminDashboard = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  
  // New state variables for Auditorium Tracker functionality
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAuditorium, setSelectedAuditorium] = useState('seminar-hall');
  const [bookings, setBookings] = useState([]);
  const [pendingForms, setPendingForms] = useState([]);
  const [statusFilters, setStatusFilters] = useState({
    pending: true,
    approved: true,
    rejected: true
  });

  // State for viewing booking details
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isBookingDetailsOpen, setIsBookingDetailsOpen] = useState(false);

  // State for profile data
  const [userProfile, setUserProfile] = useState({
    name: '',
    email: '',
    department: '',
    id: '',
    specialization: '',
    phone: ''
  });

  // Add these state variables after the existing state declarations
  const [allForms, setAllForms] = useState([]);
  const [studentForms, setStudentForms] = useState([]);
  const [loadingForms, setLoadingForms] = useState(false);

  // Add new state variables for date selection and day booking modal
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayBookings, setDayBookings] = useState([]);
  const [showDayBookingsModal, setShowDayBookingsModal] = useState(false);
  const [allHalls] = useState([
    { id: 'main-auditorium', name: 'Main Auditorium Architecture Building', capacity: 1000 },
    { id: 'seminar-hall', name: 'Seminar Hall Mechanical Building', capacity: 200 },
    { id: 'lrdc-hall', name: 'LRDC Hall', capacity: 200 }
  ]);

  // Get user profile on load
  useEffect(() => {
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
            department: userData.department || 'Auditorium Department',
            id: userId,
            specialization: userData.specialization || '',
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
    
    fetchUserProfile();
    
    // Fetch pending approvals
    fetchPendingForms();
    
    // Simulate fetching bookings data for calendar (would be replaced with real API call)
    const fetchBookings = () => {
      setBookings([]);
    };
    
    fetchBookings();
  }, []);

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

  const recentActivities = [];

  // Calendar helper functions
  const getMonthName = (date) => {
    return date.toLocaleString('default', { month: 'long' });
  };

  const getYear = (date) => {
    return date.getFullYear();
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const goToPreviousMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const goToNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  const handleStatusFilterChange = (status) => {
    setStatusFilters({
      ...statusFilters,
      [status]: !statusFilters[status]
    });
  };

  const handleAuditoriumChange = (event) => {
    setSelectedAuditorium(event.target.value);
  };

  const handleApproveBooking = (bookingId) => {
    setBookings(bookings.map(booking => 
      booking.id === bookingId 
        ? { ...booking, status: 'approved' } 
        : booking
    ));
  };

  const handleRejectBooking = (bookingId) => {
    setBookings(bookings.map(booking => 
      booking.id === bookingId 
        ? { ...booking, status: 'rejected' } 
        : booking
    ));
  };
  
  // Modify the fetchPendingForms function to fetch all forms (not just pending)
  const fetchPendingForms = async () => {
    try {
      setLoading(true);
      setLoadingForms(true);
      console.log("Fetching auditorium bookings from Firestore");
      
      // Get the current admin ID from Firebase Auth
      const adminId = auth.currentUser?.uid;
      
      if (!adminId) {
        console.error("No authenticated admin found");
        setLoading(false);
        setLoadingForms(false);
        return;
      }
      
      const pendingBookings = [];
      const allBookings = [];
      
      // Query auditoriumBookings collection for bookings that are faculty approved
      const bookingsRef = collection(db, 'auditoriumBookings');
      const bookingsQuery = query(
        bookingsRef,
        where("facultyStatus", "==", "Approved")
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);
      
      console.log("Faculty-approved bookings found:", bookingsSnapshot.size);
      
      // Process each booking and get student details
      for (const docSnap of bookingsSnapshot.docs) {
        const data = docSnap.data();
        console.log("Raw booking data:", data);
        console.log("auditoriumLocation from database:", data.auditoriumLocation);
        
        let studentName = "Student";
        let studentId = data.studentId || data.userId || "";
        
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
        
        // Get auditorium location directly from the database field
        let locationName = 'Unknown Location';
        
        // Determine the auditorium/hall ID from the booking data
        let normalizedAuditoriumId = 'seminar-hall'; // Default value as fallback
        
        if (data.hallId) {
          normalizedAuditoriumId = data.hallId;
        } else if (data.auditoriumId) {
          normalizedAuditoriumId = data.auditoriumId;
        } else if (data.auditoriumLocation === 'main-auditorium' || 
                  data.auditoriumLocation?.includes('Main') ||
                  data.auditoriumLocation?.includes('Architecture')) {
          normalizedAuditoriumId = 'main-auditorium';
        } else if (data.auditoriumLocation === 'seminar-hall' || 
                  data.auditoriumLocation?.includes('Seminar') ||
                  data.auditoriumLocation?.includes('Mechanical')) {
          normalizedAuditoriumId = 'seminar-hall';
        } else if (data.auditoriumLocation === 'lrdc-hall' || 
                  data.auditoriumLocation?.includes('LRDC')) {
          normalizedAuditoriumId = 'lrdc-hall';
        }
        
        // Determine a user-friendly location name based on the ID
        if (normalizedAuditoriumId === 'main-auditorium') {
          locationName = 'Main Auditorium Architecture Building';
        } else if (normalizedAuditoriumId === 'seminar-hall') {
          locationName = 'Seminar Hall Mechanical Building';
        } else if (normalizedAuditoriumId === 'lrdc-hall') {
          locationName = 'LRDC Hall';
        } else if (data.auditoriumLocation) {
          locationName = data.auditoriumLocation;
        }
        
        console.log(`Determined auditorium ID: ${normalizedAuditoriumId} for booking ${docSnap.id}`);
        console.log(`Location name: ${locationName}`);
        
        // Format the booking date
        const bookingDate = data.eventDate ? new Date(data.eventDate) : new Date();
        
        // Create a processed booking object
        const processedBooking = {
          id: docSnap.id,
          studentName: studentName,
          studentId: studentId,
          eventName: data.eventName || data.purpose || 'Auditorium Booking',
          title: data.eventName || data.purpose || 'Auditorium Booking', // For consistency with calendar display
          eventDate: data.eventDate || data.date || '',
          date: bookingDate,
          day: bookingDate.getDate(),
          month: bookingDate.getMonth(),
          year: bookingDate.getFullYear(),
          startTime: data.startTime || '',
          endTime: data.endTime || '',
          time: data.time || `${data.startTime || ''} - ${data.endTime || ''}`,
          status: data.status || 'Pending',
          type: 'Auditorium Booking',
          service: 'Auditorium',
          facultyStatus: data.facultyStatus || data.status || 'Pending',
          adminStatus: data.adminStatus || 'Pending',
          description: data.description || data.purpose || '',
          // Use normalized values for consistency
          auditorium: normalizedAuditoriumId,
          auditoriumLocation: locationName,
          hallId: normalizedAuditoriumId,
          auditoriumId: normalizedAuditoriumId,
          attendees: data.attendees || data.participants || '',
          department: data.department || '',
          eventType: data.eventType || 'cultural',
          notes: data.additionalRequirements || data.notes || '',
          details: data
        };
        
        console.log("Processed booking with auditoriumLocation:", processedBooking.auditoriumLocation);
        console.log("Processed booking with auditorium ID:", processedBooking.auditorium);
        
        // Add to all bookings array
        allBookings.push(processedBooking);
        
        // If it's pending admin approval, add to pending bookings
        if (data.adminStatus === "Pending") {
          pendingBookings.push(processedBooking);
        }
      }
      
      // Update state with the fetched bookings
      setPendingForms(pendingBookings);
      setAllForms(allBookings);
      setStudentForms(allBookings);
      console.log("Faculty-approved forms updated:", allBookings.length);
      console.log("Pending admin approval forms updated:", pendingBookings.length);
      
      setLoading(false);
      setLoadingForms(false);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      setLoading(false);
      setLoadingForms(false);
    }
  };
  
  // Handle admin approval of a form (modify to update status instead of removing)
  const handleAdminApproval = async (formId, action) => {
    try {
      setLoading(true);
      console.log(`Form ${formId} ${action}`);
      
      // Find the form in our local state
      const form = allForms.find(f => f.id === formId);
      if (!form) {
        console.error(`Form with ID ${formId} not found`);
        setLoading(false);
        return;
      }
      
      // Update the document in Firestore
      const formDocRef = doc(db, 'auditoriumBookings', formId);
      const newStatus = action === 'approve' ? 'Approved' : 'Rejected';
      
      await updateDoc(formDocRef, {
        adminStatus: newStatus, // Update admin status
        status: newStatus, // Update overall status
        updatedAt: new Date(),
        adminApprovedBy: auth.currentUser?.uid,
        adminApproverName: userProfile.name || 'Admin'
      });
      
      console.log(`Updated form ${formId} admin status to ${newStatus}`);
      
      // Refresh forms to update the UI
      fetchPendingForms();
      
      setLoading(false);
    } catch (error) {
      console.error(`Error during admin ${action}:`, error);
      setLoading(false);
    }
  };
  
  // Fetch bookings and pending forms on component mount
  useEffect(() => {
    // Fetch pending approvals
    fetchPendingForms();
    
    // Simulate fetching bookings data for calendar (would be replaced with real API call)
    const fetchBookings = () => {
      setBookings([]);
    };
    
    fetchBookings();
  }, []);

  // Function to handle booking status updates
  const handleBookingStatusUpdate = async (bookingId, newStatus) => {
    try {
      console.log(`Form ${bookingId} status changed to ${newStatus}`);
      
      // Find the form in our local state
      const form = pendingForms.find(f => f.id === bookingId);
      if (!form) {
        console.error(`Form with ID ${bookingId} not found`);
        return;
      }
      
      // Update the document in Firestore (already done in ViewBookingDetails)
      // So we just need to update the local state
      setPendingForms(pendingForms.filter(f => f.id !== bookingId));
      
    } catch (error) {
      console.error(`Error during booking status update:`, error);
    }
  };

  // Function to open booking details modal
  const handleViewBooking = (booking) => {
    setSelectedBooking(booking);
    setIsBookingDetailsOpen(true);
  };

  // Add new function to handle day click on calendar
  const handleDayClick = (day) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(date);
    
    // Get all bookings for this day, filtered by selected auditorium
    const bookingsForDay = allForms.filter(booking => {
      // Check if the booking date matches the selected date
      if (!booking.date && !booking.eventDate) return false;
      
      const bookingDate = booking.date || new Date(booking.eventDate);
      return bookingDate.getDate() === day && 
             bookingDate.getMonth() === date.getMonth() && 
             bookingDate.getFullYear() === date.getFullYear() &&
             (selectedAuditorium === 'all' || booking.auditorium === selectedAuditorium);
    });
    
    // Set the bookings for the day and show the modal
    setDayBookings(bookingsForDay);
    setShowDayBookingsModal(true);
  };
  
  // Function to format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  // Function to close the day bookings modal
  const closeDayBookingsModal = () => {
    setShowDayBookingsModal(false);
    setDayBookings([]);
    setSelectedDate(null);
  };
  
  // Function to get hall name by id
  const getHallNameById = (hallId) => {
    const hall = allHalls.find(h => h.id === hallId);
    return hall ? hall.name : 'Unknown Hall';
  };

  // Add a new function to handle saving profile changes
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
      
      // Get the current user ID from Firebase Auth
      const userId = auth.currentUser?.uid;
      
      if (!userId) {
        console.error("No authenticated user found");
        setLoading(false);
        return;
      }
      
      // Create the updated profile data
      const updatedProfile = {
        name,
        email,
        department,
        phone,
        specialization,
        profileImage: profileImage,
        updatedAt: new Date()
      };
      
      // Update the user's profile in Firestore
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, updatedProfile);
      
      console.log("Profile data saved to Firebase:", updatedProfile);
      
      // Update the local state with the new profile data
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
                <span className="text-white font-bold">A</span>
              </div>
              <span className="text-lg font-semibold text-blue-100">Auditorium Dashboard</span>
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
                    onClick={() => setActiveTab('pendingApprovals')}
                    className={`flex items-center w-full p-3 rounded-lg transition-all duration-300 ${
                      activeTab === 'pendingApprovals' 
                        ? 'bg-gradient-to-r from-blue-700 to-blue-600 text-white shadow-lg' 
                        : 'text-gray-300 hover:bg-gray-800/50 hover:text-white hover:translate-x-1'
                    }`}
                  >
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span className="text-sm">Pending Approvals</span>
                    {pendingForms.length > 0 && (
                      <span className="ml-auto bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {pendingForms.length}
                      </span>
                    )}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveTab('bookingCalendar')}
                    className={`flex items-center w-full p-3 rounded-lg transition-all duration-300 ${
                      activeTab === 'bookingCalendar' 
                        ? 'bg-gradient-to-r from-blue-700 to-blue-600 text-white shadow-lg' 
                        : 'text-gray-300 hover:bg-gray-800/50 hover:text-white hover:translate-x-1'
                    }`}
                  >
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <span className="text-sm">Booking Tracker</span>
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
                      <p className="text-xs truncate text-gray-400">{userProfile.id}</p>
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
                    Auditorium Statistics
                  </h2>
                  <div className="grid grid-cols-3 gap-4 relative z-10">
                    <div className="text-center p-3 rounded-lg bg-amber-900/30 text-amber-200 shadow-lg border border-amber-800/30 transform transition-all duration-300 hover:scale-105 hover:shadow-amber-600/20">
                      <p className="text-2xl font-bold">{allForms.filter(form => form.adminStatus === 'Pending').length}</p>
                      <p className="text-sm">Pending</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-green-900/30 text-green-200 shadow-lg border border-green-800/30 transform transition-all duration-300 hover:scale-105 hover:shadow-green-600/20">
                      <p className="text-2xl font-bold">{allForms.filter(form => form.adminStatus === 'Approved').length}</p>
                      <p className="text-sm">Approved</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-red-900/30 text-red-200 shadow-lg border border-red-800/30 transform transition-all duration-300 hover:scale-105 hover:shadow-red-600/20">
                      <p className="text-2xl font-bold">{allForms.filter(form => form.adminStatus === 'Rejected').length}</p>
                      <p className="text-sm">Rejected</p>
                    </div>
                  </div>
                    </div>
                    </div>
              
              {/* Quick Access - Pending Approvals */}
              <div className="rounded-lg shadow-xl p-6 backdrop-blur-sm bg-gray-800/70 border border-blue-900/20 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="flex justify-between items-center mb-4 relative z-10">
                  <h2 className="text-xl font-bold flex items-center text-blue-100">
                    <svg className="w-6 h-6 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                    </svg>
                    Pending Approvals
                  </h2>
                  <span className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-3 py-1 rounded-full text-xs shadow-md">
                    {pendingForms.length}
                  </span>
                    </div>
                
                {loadingForms ? (
                  <div className="flex justify-center items-center h-32 relative z-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : (
                  <div className="space-y-3 relative z-10">
                    {pendingForms.length > 0 ? (
                      <>
                        {/* Show only top 3 pending forms */}
                        {pendingForms.slice(0, 3).map(form => (
                          <div 
                            key={form.id}
                            className="p-4 rounded-lg border-l-4 border-amber-500 mb-3 bg-gray-700/50 shadow-lg hover:shadow-amber-600/20 transition-all duration-300 transform hover:translate-x-1 hover:scale-[1.01] group"
                          >
                            <div className="flex justify-between">
                              <div>
                                <h3 className="font-medium text-amber-200">{form.eventName}</h3>
                                <p className="text-sm text-gray-300">{form.eventDate} • {form.time}</p>
                                <p className="text-sm text-gray-400">Requested by: {form.studentName}</p>
                </div>
                              <div className="flex flex-col space-y-2">
                                <button 
                                  onClick={() => handleViewBooking(form)}
                                  className="px-2 py-1 bg-blue-600 text-white rounded-md text-xs w-full"
                                >
                                  View
                                </button>
                                <button 
                                  onClick={() => handleAdminApproval(form.id, 'approve')}
                                  className="px-2 py-1 bg-green-600 text-white rounded-md text-xs w-full"
                                >
                                  Approve
                                </button>
                                <button 
                                  onClick={() => handleAdminApproval(form.id, 'reject')}
                                  className="px-2 py-1 bg-red-600 text-white rounded-md text-xs w-full"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                        {pendingForms.length > 3 && (
                          <div className="mt-2 flex justify-end">
                            <button 
                              onClick={() => setActiveTab('pendingApprovals')}
                              className="text-blue-400 hover:text-blue-300 flex items-center group"
                            >
                              View All Pending Approvals ({pendingForms.length}) <span className="ml-1 group-hover:translate-x-1 transition-transform duration-300">»</span>
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-32">
                        <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <p className="text-gray-400">No pending approvals at the moment</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Auditorium Booking Tracker */}
              <div className="rounded-lg shadow-xl p-6 backdrop-blur-sm bg-gray-800/70 border border-blue-900/20 relative overflow-hidden group mt-6">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="flex justify-between items-center mb-6 relative z-10">
                  <h2 className="text-xl font-bold flex items-center text-blue-100">
                    <svg className="w-6 h-6 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                    </svg>
                    Auditorium Booking Tracker
                  </h2>
                  
                  {/* Auditorium selector */}
                  <div className="flex items-center">
                    <select 
                      className={`rounded-md border px-3 py-1.5 text-sm ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-gray-200' 
                          : 'bg-white border-gray-300 text-gray-700'
                      }`}
                      value={selectedAuditorium}
                      onChange={handleAuditoriumChange}
                    >
                      <option value="main-auditorium">Main Auditorium Architecture Building</option>
                      <option value="seminar-hall">Seminar Hall Mechanical Building</option>
                      <option value="lrdc-hall">LRDC Hall</option>
                    </select>
                          </div>
                </div>
                
                {/* Date navigation */}
                <div className="flex justify-between items-center mb-4 relative z-10">
                  <button 
                    className="p-2 rounded-lg text-gray-300 hover:bg-gray-700"
                    onClick={goToPreviousMonth}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                            </button>
                  <h3 className="font-medium text-lg text-blue-100">{getMonthName(currentDate)} {getYear(currentDate)}</h3>
                  <button 
                    className="p-2 rounded-lg text-gray-300 hover:bg-gray-700"
                    onClick={goToNextMonth}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                            </button>
                          </div>
                
                {/* Calendar grid */}
                <div className="rounded-lg overflow-hidden border border-gray-700 shadow-lg relative z-10">
                  {/* Day header */}
                  <div className="grid grid-cols-7 text-center border-b border-gray-700">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="py-2 font-medium text-xs bg-gray-700 text-gray-300">
                        {day}
                        </div>
                    ))}
                      </div>
                  
                  {/* Calendar days */}
                  <div className="grid grid-cols-7">
                    {/* Empty cells for previous month */}
                    {[...Array(getFirstDayOfMonth(currentDate))].map((_, i) => (
                      <div key={`empty-${i}`} className="h-20 p-1 border-b border-r border-gray-700 text-gray-600"></div>
                    ))}
                    
                    {/* Actual days - add onClick handler */}
                    {[...Array(getDaysInMonth(currentDate))].map((_, i) => {
                      const day = i + 1;
                      
                      // Filter bookings based on selected auditorium and status filters
                      const filteredBookings = bookings.filter(b => 
                        b.day === day && 
                        b.auditorium === selectedAuditorium && 
                        statusFilters[b.status]
                      );
                      
                      // Get real bookings for this day from allForms
                      const dayBookingsFromDB = allForms.filter(booking => {
                        if (!booking.eventDate && !booking.date) return false;
                        
                        const bookingDate = booking.date || new Date(booking.eventDate);
                        return bookingDate.getDate() === day && 
                               bookingDate.getMonth() === currentDate.getMonth() && 
                               bookingDate.getFullYear() === currentDate.getFullYear() &&
                               (selectedAuditorium === 'all' || 
                                booking.auditorium === selectedAuditorium);
                      });
                      
                      const hasBookings = dayBookingsFromDB.length > 0;
                      const dayBooking = filteredBookings[0]; // Show the first booking for this day
                      const hasMultipleBookings = filteredBookings.length > 1 || dayBookingsFromDB.length > 1;
                      
                      // Count bookings by status
                      const pendingCount = dayBookingsFromDB.filter(b => b.adminStatus === 'Pending').length;
                      const approvedCount = dayBookingsFromDB.filter(b => b.adminStatus === 'Approved').length;
                      const rejectedCount = dayBookingsFromDB.filter(b => b.adminStatus === 'Rejected').length;
                      
                      // Check if there are bookings for any hall on this day
                      const hallsWithBookings = dayBookingsFromDB.reduce((acc, booking) => {
                        const hallId = booking.hallId || booking.auditoriumId || 'unknown';
                        if (!acc.includes(hallId)) {
                          acc.push(hallId);
                        }
                        return acc;
                      }, []);
                      
                      const statusColors = {
                        pending: 'bg-amber-900/40 text-amber-200',
                        approved: 'bg-green-900/40 text-green-200',
                        rejected: 'bg-red-900/40 text-red-200'
                      };
                      
                      return (
                        <div 
                          key={`overview-day-${day}`} 
                          className={`h-20 p-1 border-b border-r border-gray-700 ${
                            hasBookings ? 'bg-gray-700/50 cursor-pointer hover:bg-gray-700/70' : 'cursor-pointer hover:bg-gray-800/30'
                          }`}
                          onClick={() => handleDayClick(day)}
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium">{day}</span>
                            {hasMultipleBookings && (
                              <span className="text-xs px-1 py-0.5 rounded-full text-white bg-blue-500 text-[10px]">
                                {dayBookingsFromDB.length}
                              </span>
                            )}
                  </div>
                          
                          {hasBookings && (
                            <div className="mt-1 text-[10px]">
                              {pendingCount > 0 && (
                                <div className="rounded p-0.5 bg-amber-900/40 text-amber-200 mb-0.5">
                                  {pendingCount} pending
                                </div>
                              )}
                              {approvedCount > 0 && (
                                <div className="rounded p-0.5 bg-green-900/40 text-green-200 mb-0.5">
                                  {approvedCount} approved
                                </div>
                              )}
                          {dayBooking && (
                                <div className={`rounded p-0.5 ${statusColors[dayBooking.status]}`}>
                                  <div className="font-medium truncate">{dayBooking.title || 'Event'}</div>
                                  <div className="truncate">{dayBooking.time || ''}</div>
                                  <div className="truncate text-xs">
                                    {dayBooking.auditorium === 'main-auditorium' ? 'Architecture Building' : 
                                     dayBooking.auditorium === 'seminar-hall' ? 'Mechanical Building' : 
                                     dayBooking.auditorium === 'lrdc-hall' ? 'LRDC Hall' : 
                                     dayBooking.auditoriumLocation || ''}
                                  </div>
                                </div>
                              )}
                  </div>
                )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Legend */}
                <div className="flex flex-wrap gap-4 mt-4 relative z-10">
                  <div className="flex items-center">
                    <div className="h-3 w-3 rounded-full bg-amber-900/60 mr-2"></div>
                    <span className="text-xs text-gray-300">Pending Approval</span>
                  </div>
                  <div className="flex items-center">
                    <div className="h-3 w-3 rounded-full bg-green-900/60 mr-2"></div>
                    <span className="text-xs text-gray-300">Approved</span>
                  </div>
                  <div className="flex items-center">
                    <div className="h-3 w-3 rounded-full bg-red-900/60 mr-2"></div>
                    <span className="text-xs text-gray-300">Rejected</span>
                  </div>
                </div>
                
                {/* View detailed calendar button */}
                <div className="mt-4 flex justify-end relative z-10">
                  <button 
                    onClick={() => setActiveTab('bookingCalendar')}
                    className="text-blue-400 hover:text-blue-300 flex items-center group"
                  >
                    View Full Calendar <span className="ml-1 group-hover:translate-x-1 transition-transform duration-300">»</span>
                  </button>
                </div>
              </div>
              
              {/* Remove the Recent Activities section */}
            </div>
          )}
          
          {activeTab === 'forms' && (
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                </svg>
                Faculty Forms
              </h2>
              
              {pendingForms.length > 0 ? (
                <div className="space-y-4">
                  {pendingForms.map(form => (
                    <div 
                      key={form.id}
                      className={`rounded-lg shadow-md overflow-hidden border-l-4 border-blue-500 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
                    >
                      {/* Form details would go here */}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 bg-gray-800/50 rounded-lg border border-gray-700 shadow-lg">
                  <div className="text-8xl opacity-20 text-blue-400">🎭</div>
                  <p className="mt-4 text-gray-300 text-xl font-light">No forms pending approval</p>
                  <p className="mt-2 text-gray-500">New booking forms will appear here once submitted</p>
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
                  <h3 className="text-lg font-bold mb-4 text-blue-100">Edit Profile</h3>
                  
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
                              <span className="text-white text-3xl">{userProfile.name ? userProfile.name.charAt(0) : 'A'}</span>
                            </div>
                          )}
                        </div>
                        <button 
                          type="button"
                          onClick={() => fileInputRef.current.click()}
                          className="absolute bottom-0 right-0 bg-gray-800 p-2 rounded-full border-2 border-gray-700"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                        <input 
                          type="file"
                          ref={fileInputRef}
                          onChange={handleProfileImageChange}
                          className="hidden"
                          accept="image/*"
                        />
                    </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1 text-gray-300">Full Name</label>
                          <input 
                            type="text" 
                            name="name"
                            className={`w-full p-2 rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300'} border`}
                            defaultValue={userProfile.name}
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1 text-gray-300">Admin ID</label>
                          <input 
                            type="text" 
                            className={`w-full p-2 rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300'} border`}
                            defaultValue={userProfile.id}
                            disabled
                          />
                            </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1 text-gray-300">Department</label>
                          <input 
                            type="text" 
                            name="department"
                            className={`w-full p-2 rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300'} border`}
                            defaultValue={userProfile.department}
                            required
                          />
                          </div>
                        </div>
                        
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1 text-gray-300">Email</label>
                          <input 
                            type="email" 
                            name="email"
                            className={`w-full p-2 rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300'} border`}
                            defaultValue={userProfile.email}
                            required
                          />
                          </div>
                        
                          <div>
                          <label className="block text-sm font-medium mb-1 text-gray-300">Phone</label>
                          <input 
                            type="tel" 
                            name="phone"
                            className={`w-full p-2 rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300'} border`}
                            defaultValue={userProfile.phone}
                            placeholder="Enter phone number"
                          />
                            </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1 text-gray-300">Specialization</label>
                          <input 
                            type="text" 
                            name="specialization"
                            className={`w-full p-2 rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300'} border`}
                            defaultValue={userProfile.specialization}
                          />
                          </div>
                        </div>
                      </div>
                      
                    <div className="flex justify-end mt-6 space-x-3">
                        <button 
                          type="button"
                          onClick={() => setIsEditingProfile(false)}
                          className={`px-4 py-2 rounded-md ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit"
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                          disabled={loading}
                        >
                          {loading ? 'Saving...' : 'Save Changes'}
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
                        <div>
                          <p className="text-gray-400 text-sm">Email</p>
                          <p className="text-gray-200">{userProfile.email}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Phone</p>
                          <p className="text-gray-200">{userProfile.phone || 'Not provided'}</p>
                        </div>
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
          
          {activeTab === 'pendingApprovals' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold flex items-center text-white">
                  <svg className="w-6 h-6 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                  </svg>
                  Faculty Submitted Forms
                </h2>
                
                <div className="flex space-x-3">
                  <div className="bg-amber-900/50 text-amber-300 px-3 py-1 rounded-full text-sm">
                    <span className="mr-1">●</span>
                    Pending: {pendingForms.length}
                  </div>
                  <div className="bg-green-900/50 text-green-300 px-3 py-1 rounded-full text-sm">
                    <span className="mr-1">●</span>
                    Approved: {allForms.filter(f => f.adminStatus === 'Approved').length}
                  </div>
                  <div className="bg-red-900/50 text-red-300 px-3 py-1 rounded-full text-sm">
                    <span className="mr-1">●</span>
                    Rejected: {allForms.filter(f => f.adminStatus === 'Rejected').length}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button 
                  onClick={fetchPendingForms}
                  className="flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-md hover:shadow-lg transition-all duration-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
              
              {loadingForms ? (
                <div className="flex justify-center items-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-700 shadow-md">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-800">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Form ID
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Student
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Type
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Date
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-gray-900 divide-y divide-gray-700">
                      {studentForms.length > 0 ? (
                        studentForms.map((form) => (
                          <tr key={form.id} className="hover:bg-gray-800">
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-300">
                              {form.id}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <div className="text-sm font-medium text-gray-200">{form.studentName}</div>
                                <div className="text-xs text-gray-400">{form.studentId}</div>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-900 bg-opacity-40 text-blue-300">
                                {form.type}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                              {form.eventDate}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              {form.adminStatus === 'Approved' ? (
                                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:bg-opacity-40 dark:text-green-300">
                                  Approved
                                </span>
                              ) : form.adminStatus === 'Rejected' ? (
                                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:bg-opacity-40 dark:text-red-300">
                                  Rejected
                                </span>
                              ) : (
                                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-amber-900 dark:bg-opacity-40 dark:text-amber-300">
                                  Pending
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex justify-center space-x-2">
                                <button
                                  onClick={() => handleViewBooking(form)}
                                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                                >
                                  View
                                </button>
                                
                                {form.adminStatus === 'Pending' && (
                                  <>
                              <button 
                                onClick={() => handleAdminApproval(form.id, 'approve')}
                                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => handleAdminApproval(form.id, 'reject')}
                                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md"
                              >
                                Reject
                              </button>
                                  </>
                                )}
                            </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                            <div className="text-center">
                              <div className="text-5xl mb-3 opacity-20">📋</div>
                              <p className="text-lg font-medium">No booking forms found</p>
                              <p className="text-sm">When students submit forms, they'll appear here</p>
                    </div>
                          </td>
                        </tr>
                  )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'bookingCalendar' && (
                      <div>
              <h2 className="text-2xl font-bold mb-6 flex items-center text-blue-100">
                <svg className="w-6 h-6 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                Auditorium Booking Calendar
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1">
                  <div className="bg-gray-800/70 rounded-lg p-4 shadow-xl border border-blue-900/20">
                    <h3 className="text-lg font-bold mb-4 text-blue-100">Auditoriums</h3>
                    <div className="space-y-2">
                      <div 
                        className={`flex items-center px-3 py-2 rounded-lg text-white cursor-pointer ${selectedAuditorium === 'main-auditorium' ? 'bg-blue-700' : 'bg-gray-700/50 hover:bg-gray-700'}`}
                        onClick={() => setSelectedAuditorium('main-auditorium')}
                      >
                        <span className="h-3 w-3 rounded-full bg-green-500 mr-2"></span>
                        <span>Main Auditorium Architecture Building</span>
                      </div>
                      <div 
                        className={`flex items-center px-3 py-2 rounded-lg text-white cursor-pointer ${selectedAuditorium === 'seminar-hall' ? 'bg-blue-700' : 'bg-gray-700/50 hover:bg-gray-700'}`}
                        onClick={() => setSelectedAuditorium('seminar-hall')}
                      >
                        <span className="h-3 w-3 rounded-full bg-green-500 mr-2"></span>
                        <span>Seminar Hall Mechanical Building</span>
                      </div>
                      <div 
                        className={`flex items-center px-3 py-2 rounded-lg text-white cursor-pointer ${selectedAuditorium === 'lrdc-hall' ? 'bg-blue-700' : 'bg-gray-700/50 hover:bg-gray-700'}`}
                        onClick={() => setSelectedAuditorium('lrdc-hall')}
                      >
                        <span className="h-3 w-3 rounded-full bg-amber-500 mr-2"></span>
                        <span>LRDC Hall</span>
                      </div>
                      </div>
                      
                    <h3 className="text-lg font-bold mt-6 mb-4 text-blue-100">Status Filter</h3>
                    <div className="space-y-2">
                      <div className="flex items-center mb-2">
                        <input 
                          type="checkbox" 
                          className="h-4 w-4 mr-2 accent-blue-500" 
                          checked={statusFilters.pending}
                          onChange={() => handleStatusFilterChange('pending')}
                        />
                        <span className="text-gray-200">Show Pending</span>
                      </div>
                      <div className="flex items-center mb-2">
                        <input 
                          type="checkbox" 
                          className="h-4 w-4 mr-2 accent-blue-500" 
                          checked={statusFilters.approved}
                          onChange={() => handleStatusFilterChange('approved')}
                        />
                        <span className="text-gray-200">Show Approved</span>
                    </div>
                      <div className="flex items-center">
                        <input 
                          type="checkbox" 
                          className="h-4 w-4 mr-2 accent-blue-500" 
                          checked={statusFilters.rejected}
                          onChange={() => handleStatusFilterChange('rejected')} 
                        />
                        <span className="text-gray-200">Show Rejected</span>
                  </div>
                </div>
                    
                    <h3 className="text-lg font-bold mt-6 mb-4 text-blue-100">Quick Stats</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-center p-2 rounded-lg bg-gray-700/70 text-blue-200">
                        <p className="text-2xl font-bold">
                          {bookings.filter(b => 
                            b.auditorium === selectedAuditorium && 
                            new Date().getDate() <= b.day && 
                            b.day <= new Date().getDate() + 7
                          ).length}
                        </p>
                        <p className="text-xs">This Week</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-gray-700/70 text-green-200">
                        <p className="text-2xl font-bold">
                          {bookings.filter(b => b.auditorium === selectedAuditorium).length}
                        </p>
                        <p className="text-xs">This Month</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="lg:col-span-3">
                  <div className="bg-gray-800/70 rounded-lg p-4 shadow-xl border border-blue-900/20">
                    {/* Calendar header with navigation */}
                    <div className="flex justify-between items-center mb-4">
                      <button 
                        className="p-2 rounded-lg text-gray-300 hover:bg-gray-700"
                        onClick={goToPreviousMonth}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <h3 className="font-medium text-lg text-blue-100">{getMonthName(currentDate)} {getYear(currentDate)}</h3>
                      <button 
                        className="p-2 rounded-lg text-gray-300 hover:bg-gray-700"
                        onClick={goToNextMonth}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                    
                    {/* Calendar view */}
                    <div className="rounded-lg overflow-hidden border border-gray-700 shadow-lg">
                      {/* Day header */}
                      <div className="grid grid-cols-7 text-center border-b border-gray-700">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                          <div key={day} className="py-2 font-medium text-xs bg-gray-700 text-gray-300">
                            {day}
                          </div>
                        ))}
                      </div>
                      
                      {/* Calendar days */}
                      <div className="grid grid-cols-7">
                        {/* Empty cells for previous month */}
                        {[...Array(getFirstDayOfMonth(currentDate))].map((_, i) => (
                          <div key={`empty-${i}`} className="h-20 p-1 border-b border-r border-gray-700 text-gray-600"></div>
                        ))}
                        
                        {/* Actual days - add onClick handler */}
                        {[...Array(getDaysInMonth(currentDate))].map((_, i) => {
                          const day = i + 1;
                          
                          // Filter bookings based on selected auditorium and status filters
                          const filteredBookings = bookings.filter(b => 
                            b.day === day && 
                            b.auditorium === selectedAuditorium && 
                            statusFilters[b.status]
                          );
                          
                          // Get real bookings for this day from allForms
                          const dayBookingsFromDB = allForms.filter(booking => {
                            if (!booking.eventDate && !booking.date) return false;
                            
                            const bookingDate = booking.date || new Date(booking.eventDate);
                            return bookingDate.getDate() === day && 
                                   bookingDate.getMonth() === currentDate.getMonth() && 
                                   bookingDate.getFullYear() === currentDate.getFullYear() &&
                                   (selectedAuditorium === 'all' || 
                                    booking.auditorium === selectedAuditorium);
                          });
                          
                          const hasBookings = dayBookingsFromDB.length > 0;
                          const dayBooking = filteredBookings[0]; // Show the first booking for this day
                          const hasMultipleBookings = filteredBookings.length > 1 || dayBookingsFromDB.length > 1;
                          
                          // Count bookings by status
                          const pendingCount = dayBookingsFromDB.filter(b => b.adminStatus === 'Pending').length;
                          const approvedCount = dayBookingsFromDB.filter(b => b.adminStatus === 'Approved').length;
                          const rejectedCount = dayBookingsFromDB.filter(b => b.adminStatus === 'Rejected').length;
                          
                          // Check if there are bookings for any hall on this day
                          const hallsWithBookings = dayBookingsFromDB.reduce((acc, booking) => {
                            const hallId = booking.hallId || booking.auditoriumId || 'unknown';
                            if (!acc.includes(hallId)) {
                              acc.push(hallId);
                            }
                            return acc;
                          }, []);
                          
                          const statusColors = {
                            pending: 'bg-amber-900/40 text-amber-200',
                            approved: 'bg-green-900/40 text-green-200',
                            rejected: 'bg-red-900/40 text-red-200'
                          };
                          
                          return (
                            <div 
                              key={`overview-day-${day}`} 
                              className={`h-20 p-1 border-b border-r border-gray-700 ${
                                hasBookings ? 'bg-gray-700/50 cursor-pointer hover:bg-gray-700/70' : 'cursor-pointer hover:bg-gray-800/30'
                              }`}
                              onClick={() => handleDayClick(day)}
                            >
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-medium">{day}</span>
                                {hasMultipleBookings && (
                                  <span className="text-xs px-1 py-0.5 rounded-full text-white bg-blue-500 text-[10px]">
                                    {dayBookingsFromDB.length}
                                  </span>
                                )}
                              </div>
                              
                              {hasBookings && (
                                <div className="mt-1 text-[10px]">
                                  {pendingCount > 0 && (
                                    <div className="rounded p-0.5 bg-amber-900/40 text-amber-200 mb-0.5">
                                      {pendingCount} pending
                                    </div>
                                  )}
                                  {approvedCount > 0 && (
                                    <div className="rounded p-0.5 bg-green-900/40 text-green-200 mb-0.5">
                                      {approvedCount} approved
                                    </div>
                                  )}
                              {dayBooking && (
                                    <div className={`rounded p-0.5 ${statusColors[dayBooking.status]}`}>
                                      <div className="font-medium truncate">{dayBooking.title || 'Event'}</div>
                                      <div className="truncate">{dayBooking.time || ''}</div>
                                      <div className="truncate text-xs">
                                        {dayBooking.auditorium === 'main-auditorium' ? 'Architecture Building' : 
                                         dayBooking.auditorium === 'seminar-hall' ? 'Mechanical Building' : 
                                         dayBooking.auditorium === 'lrdc-hall' ? 'LRDC Hall' : 
                                         dayBooking.auditoriumLocation || ''}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* Legend */}
                    <div className="flex flex-wrap gap-4 mt-4">
                      <div className="flex items-center">
                        <div className="h-3 w-3 rounded-full bg-amber-900/60 mr-2"></div>
                        <span className="text-xs text-gray-300">Pending Approval</span>
                      </div>
                      <div className="flex items-center">
                        <div className="h-3 w-3 rounded-full bg-green-900/60 mr-2"></div>
                        <span className="text-xs text-gray-300">Approved</span>
                      </div>
                      <div className="flex items-center">
                        <div className="h-3 w-3 rounded-full bg-red-900/60 mr-2"></div>
                        <span className="text-xs text-gray-300">Rejected</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Render the inline booking details modal */}
      {isBookingDetailsOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`relative w-full max-w-3xl rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6 max-h-[90vh] overflow-y-auto`}
          >
            {/* Close button */}
            <button
              onClick={() => setIsBookingDetailsOpen(false)}
              className={`absolute top-3 right-3 p-2 rounded-full ${
                isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium mr-3 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300`}>
                    Auditorium Booking
                  </span>
                  {selectedBooking.eventName || 'Auditorium Booking Details'}
                </h2>
                
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  selectedBooking.adminStatus === 'Approved'
                    ? isDarkMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-800'
                    : selectedBooking.adminStatus === 'Rejected'
                      ? isDarkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-800'
                      : isDarkMode ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-800'
                }`}>
                  {selectedBooking.adminStatus || 'Pending'}
                </span>
              </div>
              
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                ID: {selectedBooking.id} • Submitted on: {selectedBooking.submittedOn || selectedBooking.createdAt?.toDate?.().toLocaleDateString() || 'N/A'}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Student Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Booking Information</h3>
                <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="space-y-3">
                    <div>
                      <span className="block text-sm text-gray-500 dark:text-gray-400">Student Name</span>
                      <span className="block font-medium">{selectedBooking.studentName || 'Not provided'}</span>
                    </div>
                    
                    <div>
                      <span className="block text-sm text-gray-500 dark:text-gray-400">Student ID</span>
                      <span className="block font-medium">{selectedBooking.studentId || 'Not provided'}</span>
                    </div>
                    
                    <div>
                      <span className="block text-sm text-gray-500 dark:text-gray-400">Department</span>
                      <span className="block font-medium">{selectedBooking.department || 'Not provided'}</span>
                    </div>
                    
                    <div>
                      <span className="block text-sm text-gray-500 dark:text-gray-400">Date</span>
                      <span className="block font-medium">{selectedBooking.eventDate || selectedBooking.date || 'Not specified'}</span>
                    </div>
                    
                    <div>
                      <span className="block text-sm text-gray-500 dark:text-gray-400">Time</span>
                      <span className="block font-medium">{selectedBooking.time || `${selectedBooking.startTime || 'N/A'} - ${selectedBooking.endTime || 'N/A'}`}</span>
                    </div>
                  </div>
                </div>
                
                {/* Approval Information */}
                <h3 className="text-lg font-semibold mb-3 mt-6">Approval Status</h3>
                <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="space-y-3">
                    <div>
                      <span className="block text-sm text-gray-500 dark:text-gray-400">Faculty Status</span>
                      <div className="flex items-center mt-1">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          selectedBooking.facultyStatus === 'Approved'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : selectedBooking.facultyStatus === 'Rejected'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                        }`}>
                          {selectedBooking.facultyStatus || 'Pending'}
                        </span>
                        {selectedBooking.facultyApprover && (
                          <span className="ml-2 text-sm text-gray-500">by {selectedBooking.facultyApprover}</span>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <span className="block text-sm text-gray-500 dark:text-gray-400">Admin Status</span>
                      <div className="flex items-center mt-1">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          selectedBooking.adminStatus === 'Approved'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : selectedBooking.adminStatus === 'Rejected'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                        }`}>
                          {selectedBooking.adminStatus || 'Pending'}
                        </span>
                        {selectedBooking.adminApprover && (
                          <span className="ml-2 text-sm text-gray-500">by {selectedBooking.adminApprover}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Request Details */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Details</h3>
                <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="space-y-4">
                    <div>
                      <span className="block text-sm text-gray-500 dark:text-gray-400">Event Name</span>
                      <span className="block font-medium">{selectedBooking.eventName || 'Not specified'}</span>
                    </div>
                    <div>
                      <span className="block text-sm text-gray-500 dark:text-gray-400">Event Type</span>
                      <span className="block font-medium">{selectedBooking.eventType || 'Not specified'}</span>
                    </div>
                    <div>
                      <span className="block text-sm text-gray-500 dark:text-gray-400">Expected Attendees</span>
                      <span className="block font-medium">{selectedBooking.attendees || 'Not specified'}</span>
                    </div>
                    <div>
                      <span className="block text-sm text-gray-500 dark:text-gray-400">Event Description</span>
                      <span className="block font-medium">{selectedBooking.description || 'Not specified'}</span>
                    </div>
                    <div>
                      <span className="block text-sm text-gray-500 dark:text-gray-400">Auditorium Location</span>
                      <span className="block font-medium">
                        {selectedBooking.auditoriumLocation === 'main-auditorium' ? 'Main Auditorium Architecture Building' :
                        selectedBooking.auditoriumLocation === 'seminar-hall' ? 'Seminar Hall Mechanical Building' :
                        selectedBooking.auditoriumLocation === 'lrdc-hall' ? 'LRDC Hall' :
                        selectedBooking.auditorium === 'main-auditorium' ? 'Main Auditorium Architecture Building' :
                        selectedBooking.auditorium === 'seminar-hall' ? 'Seminar Hall Mechanical Building' :
                        selectedBooking.auditorium === 'lrdc-hall' ? 'LRDC Hall' :
                        selectedBooking.hallId === 'main-auditorium' ? 'Main Auditorium Architecture Building' :
                        selectedBooking.hallId === 'seminar-hall' ? 'Seminar Hall Mechanical Building' :
                        selectedBooking.hallId === 'lrdc-hall' ? 'LRDC Hall' :
                        selectedBooking.auditoriumLocation || 'Not specified'}
                      </span>
                    </div>
                    {selectedBooking.equipmentRequired && (
                      <div>
                        <span className="block text-sm text-gray-500 dark:text-gray-400">Equipment Required</span>
                        <span className="block font-medium">
                          {Array.isArray(selectedBooking.equipmentRequired) 
                            ? selectedBooking.equipmentRequired.join(', ') 
                            : selectedBooking.equipmentRequired || 'None'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer with actions */}
            <div className={`px-6 py-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between mt-6`}>
              <div>
                {selectedBooking.adminStatus === 'Pending' && (
                  <>
                    <button
                      className={`px-4 py-2 mr-2 rounded-md ${
                        isDarkMode
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-red-500 hover:bg-red-600 text-white'
                      }`}
                      onClick={() => {
                        handleAdminApproval(selectedBooking.id, 'reject');
                        setIsBookingDetailsOpen(false);
                        if (handleBookingStatusUpdate) {
                          handleBookingStatusUpdate(selectedBooking.id, 'Rejected');
                        }
                      }}
                    >
                      Reject
                    </button>
                    <button
                      className={`px-4 py-2 rounded-md ${
                        isDarkMode
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-green-500 hover:bg-green-600 text-white'
                      }`}
                      onClick={() => {
                        handleAdminApproval(selectedBooking.id, 'approve');
                        setIsBookingDetailsOpen(false);
                        if (handleBookingStatusUpdate) {
                          handleBookingStatusUpdate(selectedBooking.id, 'Approved');
                        }
                      }}
                    >
                      Approve
                    </button>
                  </>
                )}
              </div>
              <button
                className={`px-4 py-2 rounded-md ${
                  isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
                onClick={() => setIsBookingDetailsOpen(false)}
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
      
      {/* Add Day Bookings Modal */}
      {showDayBookingsModal && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg shadow-2xl w-full max-w-4xl overflow-hidden border border-blue-900/30">
            <div className="flex justify-between items-center bg-gray-800 p-4 border-b border-gray-700">
              <h3 className="text-xl font-bold text-blue-100">
                Bookings for {selectedDate ? formatDate(selectedDate) : 'Selected Date'}
              </h3>
              <button 
                onClick={closeDayBookingsModal}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {dayBookings.length > 0 ? (
                <div className="space-y-4">
                  {/* Group bookings by hall */}
                  {allHalls.map(hall => {
                    const hallBookings = dayBookings.filter(booking => {
                      console.log(`Checking booking ${booking.id} against hall ${hall.id}`);
                      console.log(`Booking auditoriumLocation: ${booking.auditoriumLocation}`);
                      console.log(`Booking hallId: ${booking.hallId}, auditoriumId: ${booking.auditoriumId}`);
                      
                      // Check for exact hall ID match
                      if (booking.hallId === hall.id || booking.auditoriumId === hall.id) {
                        console.log(`Matched by ID: ${hall.id}`);
                        return true;
                      }
                      
                      // Check for auditoriumLocation match (using more comprehensive checks)
                      if (booking.auditoriumLocation) {
                        const location = booking.auditoriumLocation.toLowerCase();
                        
                        if (hall.id === 'main-auditorium' && 
                            (location.includes('main') || 
                             location.includes('architecture') || 
                             location === 'main-auditorium')) {
                          console.log(`Matched Main Auditorium by location: ${booking.auditoriumLocation}`);
                          return true;
                        }
                        
                        if (hall.id === 'seminar-hall' && 
                            (location.includes('seminar') || 
                             location.includes('mechanical') || 
                             location === 'seminar-hall')) {
                          console.log(`Matched Seminar Hall by location: ${booking.auditoriumLocation}`);
                          return true;
                        }
                        
                        if (hall.id === 'lrdc-hall' && 
                            (location.includes('lrdc') || 
                             location === 'lrdc-hall')) {
                          console.log(`Matched LRDC Hall by location: ${booking.auditoriumLocation}`);
                          return true;
                        }
                      }
                      
                      return false;
                    });
                    
                    if (hallBookings.length === 0) return null;
                    
                    return (
                      <div key={hall.id} className="rounded-lg bg-gray-800/70 p-4 border border-gray-700">
                        <h4 className="text-lg font-medium text-blue-300 mb-3 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                          </svg>
                          {hall.name} 
                          <span className="ml-2 text-sm text-gray-400">(Capacity: {hall.capacity})</span>
                        </h4>
                        
                        <div className="space-y-3">
                          {hallBookings.map(booking => (
                            <div 
                              key={booking.id}
                              className={`p-3 rounded-lg ${
                                booking.adminStatus === 'Approved' ? 'bg-green-900/20 border border-green-800/30' : 
                                booking.adminStatus === 'Rejected' ? 'bg-red-900/20 border border-red-800/30' :
                                'bg-amber-900/20 border border-amber-800/30'
                              }`}
                            >
                              <div className="flex justify-between">
                                <div>
                                  <h5 className="font-medium text-gray-200">{booking.eventName || 'Unnamed Event'}</h5>
                                  <p className="text-sm text-gray-400">
                                    <span className="mr-3">Time: {booking.time || `${booking.startTime || 'N/A'} - ${booking.endTime || 'N/A'}`}</span>
                                    <span>Duration: {booking.duration || 'Not specified'}</span>
                                  </p>
                                </div>
                                <div>
                                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    booking.adminStatus === 'Approved' ? 'bg-green-900 text-green-200' : 
                                    booking.adminStatus === 'Rejected' ? 'bg-red-900 text-red-200' :
                                    'bg-amber-900 text-amber-200'
                                  }`}>
                                    {booking.adminStatus}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="mt-2 text-sm">
                                <div className="flex items-start">
                                  <span className="text-gray-400 w-24">Booked by:</span>
                                  <span className="text-gray-300">{booking.studentName || 'Unknown'}</span>
                                </div>
                                <div className="flex items-start">
                                  <span className="text-gray-400 w-24">Contact:</span>
                                  <span className="text-gray-300">{booking.contact || booking.phone || 'Not provided'}</span>
                                </div>
                                <div className="flex items-start">
                                  <span className="text-gray-400 w-24">Description:</span>
                                  <span className="text-gray-300">{booking.description || booking.purpose || 'No description provided'}</span>
                                </div>
                                {booking.facultyApprover && (
                                  <div className="flex items-start">
                                    <span className="text-gray-400 w-24">Faculty:</span>
                                    <span className="text-gray-300">{booking.facultyApprover}</span>
                                  </div>
                                )}
                              </div>
                              
                              {booking.adminStatus === 'Pending' && (
                                <div className="mt-3 flex justify-center space-x-2">
                                  <button 
                                    onClick={() => {
                                      handleAdminApproval(booking.id, 'approve');
                                      closeDayBookingsModal();
                                    }}
                                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm"
                                  >
                                    Approve
                                  </button>
                                  <button 
                                    onClick={() => {
                                      handleAdminApproval(booking.id, 'reject');
                                      closeDayBookingsModal();
                                    }}
                                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm"
                                  >
                                    Reject
                                  </button>
                                  <button 
                                    onClick={() => {
                                      handleViewBooking(booking);
                                      closeDayBookingsModal();
                                    }}
                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm"
                                  >
                                    View Details
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="text-8xl opacity-20 text-blue-400">📅</div>
                  <p className="mt-4 text-gray-300 text-xl font-light">No bookings for this date</p>
                  <p className="mt-2 text-gray-500">This date is available for all halls</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditoriumAdminDashboard;
