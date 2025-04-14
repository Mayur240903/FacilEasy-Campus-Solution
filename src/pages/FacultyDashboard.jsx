import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../firebase/config';
import { collection, doc, getDoc, getDocs, query, where, updateDoc } from 'firebase/firestore';

const FacultyDashboard = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // Add state for request details modal
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  
  // Empty initial states - to be populated from the database
  const [profileData, setProfileData] = useState({
    name: '',
    id: '',
    department: '',
    email: '',
    phone: '',
    address: '',
    specialization: '',
    gender: '',
    profileImage: ''
  });
  // State to show profile image preview
  const [imagePreview, setImagePreview] = useState('');
  
  // State for various dashboard data
  const [facultyInfo, setFacultyInfo] = useState({});
  const [studentForms, setStudentForms] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [approvedForms, setApprovedForms] = useState([]);
  const [rejectedForms, setRejectedForms] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All");
  const [viewMode, setViewMode] = useState("list");
  const [weekDays] = useState(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  const [currentDayName] = useState(new Date().toLocaleDateString('en-US', { weekday: 'long' }));
  
  // Add new state variables for auditorium tracker
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAuditorium, setSelectedAuditorium] = useState('seminar-hall');
  const [auditoriumBookings, setAuditoriumBookings] = useState([]);
  const [statusFilters, setStatusFilters] = useState({
    pending: true,
    approved: true,
    rejected: true
  });
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayBookings, setDayBookings] = useState([]);
  const [showDayBookingsModal, setShowDayBookingsModal] = useState(false);
  const [allHalls] = useState([
    { id: 'main-auditorium', name: 'Main Auditorium Architecture Building', capacity: 1000 },
    { id: 'seminar-hall', name: 'Seminar hall Mechanical Building', capacity: 200 },
    { id: 'lrdc-hall', name: 'LRDC Hall', capacity: 200 }
  ]);
  
  // In a real application, these would be API calls to fetch data
  useEffect(() => {
    // Here you would make actual API calls to fetch data
    fetchUserProfile();
    fetchStudentForms();
    fetchPendingApprovals();
  }, []);
  
  // Add refresh mechanism when tab changes
  useEffect(() => {
    // Refresh data when faculty members navigate to forms tab
    if (activeTab === 'forms') {
      console.log("Refreshing student forms data");
      fetchStudentForms();
    }
  }, [activeTab]);
  
  // Add new useEffect to fetch auditorium bookings when the auditorium tab is active
  useEffect(() => {
    if (activeTab === 'auditoriumTracker') {
      fetchAuditoriumBookings();
    }
  }, [activeTab, selectedAuditorium, currentDate]);
  
  // API functions to be implemented with real backend
  const fetchUserProfile = async () => {
    // API call to get user profile data from database
    console.log("Fetching faculty profile from database");
    
    try {
      setLoading(true);
      // Get the current user ID from Firebase Auth
      const userId = auth.currentUser?.uid;
      
      if (!userId) {
        console.error("No authenticated user found");
        setLoading(false);
        return;
      }
      
      // Get faculty data from the Firestore database
      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        console.log("Faculty data retrieved:", userData);
        
        // Create a profile image with first letter if none exists
        let profileImg = userData.profileImage;
        if (!profileImg) {
          const firstLetter = (userData.name || "F")[0].toUpperCase();
          profileImg = `https://ui-avatars.com/api/?name=${firstLetter}&background=7C3AED&color=fff&size=150`; 
        }
        
        const facultyData = {
          name: userData.name || '',
          id: userData.facultyId || userId.substring(0, 8).toUpperCase(),
          department: userData.department || '',
          email: userData.email || auth.currentUser.email || '',
          phone: userData.phone || '',
          address: userData.address || '',
          specialization: userData.specialization || '',
          gender: userData.gender || '',
          profileImage: profileImg
        };
        
        // Set both state variables
        setFacultyInfo(facultyData);
        setProfileData(facultyData);
      } else {
        console.log("No faculty data found");
        
        // If no data found, use Firebase Auth info with first letter avatar
        const firstLetter = (auth.currentUser?.displayName || "F")[0].toUpperCase();
        const defaultImg = `https://ui-avatars.com/api/?name=${firstLetter}&background=7C3AED&color=fff&size=150`;
        
        const defaultData = {
          name: auth.currentUser?.displayName || '',
          id: userId.substring(0, 8).toUpperCase(),
          email: auth.currentUser?.email || '',
          profileImage: defaultImg
        };
        
        setFacultyInfo(defaultData);
        setProfileData(defaultData);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching faculty profile:", error);
      setLoading(false);
    }
  };
  
  const fetchTodaySchedule = () => {
    console.log("Fetching today's schedule");
  };
  
  const fetchFacultyTimetable = () => {
    console.log("Fetching faculty timetable");
  };
  
  const fetchStudentForms = async () => {
    try {
      setLoading(true);
      console.log("Fetching student forms from Firestore");
      
      // Get the current user email from Firebase Auth
      const userEmail = auth.currentUser?.email;
      
      if (!userEmail) {
        console.error("No authenticated user email found");
        setLoading(false);
        return;
      }
      
      // Array to store all forms
      const forms = [];
      
      // Helper function to fetch forms from a collection
      const fetchFormsFromCollection = async (collectionName, formType) => {
        try {
          // Create a query for forms where the faculty email matches and status is pending
          const formsRef = collection(db, 'users');
          const facultyId = auth.currentUser?.uid;
          const userEmail = auth.currentUser?.email;
          
          // Get forms where facultyId matches current faculty or facultyEmail matches
          // Now fetch all forms regardless of status
          const formsQuery = query(
            collection(db, collectionName)
          );
          
          // Add condition for either facultyId or facultyEmail
          const snapshot = await getDocs(formsQuery);
          console.log(`${collectionName} forms found:`, snapshot.size);
          
          // Filter forms to only include those with matching faculty email or ID
          const relevantForms = [];
          
          for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            if (data.facultyEmail === userEmail || data.facultyId === facultyId) {
              // For each form, get the user's details to display name
              let studentName = "Student";
              let studentDocRef;
              
              try {
                if (data.userId) {
                  studentDocRef = doc(db, 'users', data.userId);
                  const studentDoc = await getDoc(studentDocRef);
                  
                  if (studentDoc.exists()) {
                    const studentData = studentDoc.data();
                    studentName = studentData.name || studentData.displayName || "Student";
                  }
                }
              } catch (error) {
                console.error("Error fetching student details:", error);
              }
              
              relevantForms.push({
                id: docSnap.id,
                studentName: studentName,
                studentId: data.studentId || data.userId || '',
                formType: formType,
                submittedOn: data.createdAt ? 
                  new Date(data.createdAt.toDate()).toLocaleDateString() : 
                  new Date().toLocaleDateString(),
                status: data.status || 'Pending',
                facultyStatus: data.facultyStatus || data.status || 'Pending',
                adminStatus: data.adminStatus || 'Pending',
                details: data
              });
            }
          }
          
          forms.push(...relevantForms);
        } catch (error) {
          console.error(`Error fetching ${collectionName}:`, error);
        }
      };
      
      // Fetch forms from all collections
      await fetchFormsFromCollection('auditoriumBookings', 'Auditorium Booking');
      await fetchFormsFromCollection('sportsBookings', 'Sports Facility');
      await fetchFormsFromCollection('canteenOrders', 'Canteen Order');
      await fetchFormsFromCollection('stationeryRequests', 'Stationery Request');
      
      console.log("Total forms fetched:", forms.length);
      setStudentForms(forms);
      
      // Update pending approvals as well
      setPendingApprovals(forms.filter(form => form.status === 'Pending'));
      
      // Update approved and rejected form lists
      setApprovedForms(forms.filter(form => form.status === 'Approved' && (form.approvedBy === auth.currentUser?.uid)));
      setRejectedForms(forms.filter(form => form.status === 'Rejected' && (form.approvedBy === auth.currentUser?.uid)));
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching student forms:", error);
      setLoading(false);
    }
  };
  
  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      console.log("Fetching pending approvals from Firestore");
      
      // Get the current user email from Firebase Auth
      const userEmail = auth.currentUser?.email;
      
      if (!userEmail) {
        console.error("No authenticated user email found");
        setLoading(false);
        return;
      }
      
      // Use the student forms fetch instead of duplicating the code
      // We'll filter for only Pending status later
      await fetchStudentForms();
      
      // fetchStudentForms already sets setPendingApprovals with filtered list
      setLoading(false);
    } catch (error) {
      console.error("Error fetching pending approvals:", error);
      setLoading(false);
    }
  };
  
  // Function to fetch auditorium bookings
  const fetchAuditoriumBookings = async () => {
    try {
      setLoading(true);
      console.log("Fetching auditorium bookings");
      
      // Get all bookings from auditoriumBookings collection
      const bookingsRef = collection(db, 'auditoriumBookings');
      const bookingsSnapshot = await getDocs(bookingsRef);
      
      const processedBookings = [];
      
      for (const docSnap of bookingsSnapshot.docs) {
        const data = docSnap.data();
        
        // Process each booking
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
        
        // Format the booking date for comparison with calendar
        const bookingDate = data.eventDate ? new Date(data.eventDate) : null;
        
        if (bookingDate) {
          // Determine the actual auditorium ID consistently
          let normalizedAuditoriumId = 'seminar-hall'; // default
          if (data.hallId) {
            normalizedAuditoriumId = data.hallId;
          } else if (data.auditoriumId) {
            normalizedAuditoriumId = data.auditoriumId;
          } else if (data.auditoriumLocation === 'main-auditorium' || 
                     data.auditoriumLocation === 'Architecture Building') {
            normalizedAuditoriumId = 'main-auditorium';
          } else if (data.auditoriumLocation === 'seminar-hall' || 
                     data.auditoriumLocation === 'Mechanical Building') {
            normalizedAuditoriumId = 'seminar-hall';
          } else if (data.auditoriumLocation === 'lrdc-hall' || 
                     data.auditoriumLocation === 'LRDC Hall') {
            normalizedAuditoriumId = 'lrdc-hall';
          }
          
          // Get the auditorium location based on ID
          let locationName = 'Main Building';
          if (normalizedAuditoriumId === 'main-auditorium') {
            locationName = 'Main Auditorium Architecture Building (1000 seats)';
          } else if (normalizedAuditoriumId === 'seminar-hall') {
            locationName = 'Seminar Hall Mechanical Building (200 seats)';
          } else if (normalizedAuditoriumId === 'lrdc-hall') {
            locationName = 'LRDC Hall (200 seats)';
          }
          
          processedBookings.push({
            id: docSnap.id,
            title: data.eventName || "Auditorium Booking",
            date: bookingDate,
            day: bookingDate.getDate(),
            month: bookingDate.getMonth(),
            year: bookingDate.getFullYear(),
            time: data.time || `${data.startTime || ''} - ${data.endTime || ''}`,
            status: data.status || "Pending",
            facultyStatus: data.facultyStatus || data.status || "Pending",
            adminStatus: data.adminStatus || "Pending",
            studentName: studentName,
            studentId: data.studentId || data.userId || '',
            department: data.department || '',
            description: data.description || data.purpose || '',
            auditorium: normalizedAuditoriumId,
            auditoriumLocation: locationName,
            details: data
          });
        }
      }
      
      setAuditoriumBookings(processedBookings);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching auditorium bookings:", error);
      setLoading(false);
    }
  };
  
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

  const handleAuditoriumChange = (e) => {
    const selectedValue = e.target.value;
    setSelectedAuditorium(selectedValue);
    console.log("Selected Auditorium:", selectedValue);
    
    // Filter bookings based on selected auditorium
    if (selectedValue === 'all') {
      // If 'all' is selected, show all bookings
      setFilteredBookings(auditoriumBookings);
    } else {
      // Filter bookings for the selected auditorium
      const filtered = auditoriumBookings.filter(booking => 
        booking.auditorium === selectedValue || 
        booking.details.hallId === selectedValue || 
        booking.details.auditoriumId === selectedValue
      );
      setFilteredBookings(filtered);
      console.log("Filtered Bookings:", filtered.length);
      filtered.forEach(booking => {
        console.log(`Booking: ${booking.title}, Auditorium: ${booking.auditorium}, Location: ${booking.details?.locationName}`);
      });
    }
  };
  
  // Function to handle day click on calendar
  const handleDayClick = (day) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(date);
    
    // Get bookings for this day and the selected auditorium
    const bookingsForDay = auditoriumBookings.filter(booking => {
      if (!booking.date) return false;
      
      const matchesDate = booking.date.getDate() === day && 
        booking.date.getMonth() === date.getMonth() && 
        booking.date.getFullYear() === date.getFullYear();
      
      // If 'all' is selected, show all auditoriums, otherwise filter by the selected auditorium
      const matchesAuditorium = selectedAuditorium === 'all' || booking.auditorium === selectedAuditorium;
      
      return matchesDate && matchesAuditorium;
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
  
  // Toggle sidebar visibility
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  // Toggle desktop sidebar visibility
  const toggleDesktopSidebar = () => {
    setDesktopSidebarOpen(!desktopSidebarOpen);
  };
  
  // Handle logout functionality
  const handleLogout = async () => {
    setSidebarOpen(false);
    try {
      // Sign out from Firebase
      await auth.signOut();
      // Then navigate to login
    navigate('/login');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Handle profile form change
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle file upload for profile image
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Save the base64 string to profileData
        setProfileData(prev => ({
          ...prev,
          profileImage: reader.result
        }));
        // Update preview
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle profile form submission
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      // Get the current user ID from Firebase Auth
      const userId = auth.currentUser?.uid;
      
      if (!userId) {
        console.error("No authenticated user found");
        setLoading(false);
        return;
      }
      
      // Update the user's profile in Firestore
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, {
        name: profileData.name,
        department: profileData.department,
        email: profileData.email,
        phone: profileData.phone,
        specialization: profileData.specialization,
        gender: profileData.gender,
        profileImage: profileData.profileImage,
        address: profileData.address,
        updatedAt: new Date()
      });
      
      console.log("Profile data saved to Firebase:", profileData);
      
      // Update the displayed faculty info with the new profile data
    setFacultyInfo(profileData);
      setIsEditingProfile(false);
      setLoading(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      setLoading(false);
    }
  };

  // Handle form approval - update to remove forwarding option
  const handleFormApproval = async (formId, action) => {
    try {
      setLoading(true);
    console.log(`Form ${formId} ${action}`);
    
      // Find the form in our local state to determine the collection
      const form = studentForms.find(f => f.id === formId);
      if (!form) {
        console.error(`Form with ID ${formId} not found`);
        setLoading(false);
      return;
    }
      
      // Determine which collection to update based on form type
      let collectionName = 'auditoriumBookings'; // default
      if (form.formType.includes('Sports')) {
        collectionName = 'sportsBookings';
      } else if (form.formType.includes('Canteen')) {
        collectionName = 'canteenOrders';
      } else if (form.formType.includes('Stationery')) {
        collectionName = 'stationeryRequests';
      }
      
      // Update the document in Firestore
      const formDocRef = doc(db, collectionName, formId);
      const newStatus = action === 'approve' ? 'Approved' : 'Rejected';
      
      await updateDoc(formDocRef, {
        status: newStatus, // Keep overall status for backward compatibility
        facultyStatus: newStatus, // Add specific faculty status
        adminStatus: form.adminStatus || 'Pending', // Preserve admin status if exists, otherwise set to Pending
        updatedAt: new Date(),
        approvedBy: auth.currentUser?.uid,
        approverName: facultyInfo.name || 'Faculty Member'
      });
      
      console.log(`Updated form ${formId} status to ${newStatus} in ${collectionName} collection`);
    
    // Update forms list with new status
    setStudentForms(prevForms => 
      prevForms.map(form => 
            form.id === formId ? { 
              ...form, 
              status: newStatus,
              facultyStatus: newStatus,
              adminStatus: form.adminStatus || 'Pending'
            } : form
      )
    );
    
    // Update pending approvals
    setPendingApprovals(prevPending => 
      prevPending.filter(form => form.id !== formId)
    );
        
      setLoading(false);
    } catch (error) {
      console.error("Error updating form status:", error);
      setLoading(false);
      // Show error notification to user
      alert(`Error updating form status: ${error.message}`);
    }
  };
  
  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4 } 
    }
  };
  
  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  // Dashboard tabs - removed timetable
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'forms', label: 'Student Forms' },
    { id: 'auditoriumTracker', label: 'Auditorium Tracker' },
    { id: 'profile', label: 'Profile' }
  ];
  
  // Animation variants for sidebar
  const sidebarVariants = {
    open: {
      x: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    },
    closed: {
      x: "-100%",
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    }
  };
  
  // Animation variants for overlay
  const overlayVariants = {
    open: {
      opacity: 0.5,
      display: "block"
    },
    closed: {
      opacity: 0,
      transitionEnd: {
        display: "none"
      }
    }
  };

  // Handle view request details
  const handleViewRequest = (request) => {
    setSelectedRequest(request);
    setShowRequestModal(true);
  };
  
  // Close request modal
  const closeRequestModal = () => {
    setShowRequestModal(false);
    setSelectedRequest(null);
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial="closed"
            animate="open"
            exit="closed"
            variants={overlayVariants}
            className="fixed inset-0 bg-black z-20 md:hidden"
            onClick={toggleSidebar}
          />
        )}
      </AnimatePresence>
      
      {/* Mobile Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial="closed"
            animate="open"
            exit="closed"
            variants={sidebarVariants}
            className={`fixed inset-y-0 left-0 w-72 z-30 md:hidden flex flex-col ${
              isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
            } border-r border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden`}
          >
            {/* Logo/Dashboard Title with Close Button */}
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-md bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                  F
                </div>
                <h1 className="text-xl font-bold truncate whitespace-nowrap mr-2">Faculty Dashboard</h1>
              </div>
              <button 
                onClick={toggleSidebar}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center flex-shrink-0"
                aria-label="Close sidebar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Navigation Links */}
            <nav className="flex-1 overflow-y-auto py-4">
              <ul className="space-y-1 px-3">
                {tabs.map(tab => (
                  <li key={tab.id}>
                    <button
                      onClick={() => {
                        setActiveTab(tab.id);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center px-4 py-3 rounded-lg transition-all duration-200 font-medium ${
                        activeTab === tab.id 
                          ? isDarkMode 
                            ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md' 
                            : 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md' 
                          : isDarkMode 
                            ? 'text-gray-400 hover:text-white hover:bg-gray-700 hover:bg-opacity-50' 
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      {tab.id === 'overview' && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                      )}
                      
                      {tab.id === 'forms' && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                      
                      {tab.id === 'auditoriumTracker' && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                        </svg>
                      )}
                      
                      {tab.id === 'profile' && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                      
                      {tab.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
            
            {/* User Info */}
            <div className={`mx-4 my-2 p-4 rounded-lg ${
              isDarkMode ? 'bg-gray-700 bg-opacity-50' : 'bg-purple-50'
            }`}>
              <div className="flex items-center space-x-3">
                <img 
                  src={facultyInfo.profileImage || `https://ui-avatars.com/api/?name=${facultyInfo.name?.[0] || "F"}&background=7C3AED&color=fff&size=150`} 
                  alt={facultyInfo.name || "Faculty Profile"}
                  className="h-10 w-10 rounded-full border-2 border-purple-500" 
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{facultyInfo.name || "Faculty Name"}</p>
                  <p className={`text-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {facultyInfo.id || "Faculty ID"}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Logout Button */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleLogout}
                className={`w-full flex items-center justify-center px-4 py-3 rounded-lg ${
                  isDarkMode 
                    ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white' 
                    : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
                } transition-all shadow-sm hover:shadow-md`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
      
      {/* Main Content with Desktop Sidebar */}
      <div className="flex h-screen overflow-hidden">
        {/* Desktop Sidebar */}
        <aside 
          className={`hidden md:block bg-opacity-95 h-screen ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          } border-r transition-all duration-300 z-10 shadow-sm ${desktopSidebarOpen ? 'w-64' : 'w-0'}`}
        >
          {/* Only show content when sidebar is open */}
          {desktopSidebarOpen && (
            <div className="h-full flex flex-col">
              {/* Logo/Dashboard Title */}
              <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center">
                <div className="h-8 w-8 rounded-md bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                  F
                </div>
                <h1 className="text-xl font-bold ml-2">Faculty Dashboard</h1>
              </div>
              
              {/* Navigation Links */}
              <nav className="flex-1 overflow-y-auto py-4">
                <ul className="space-y-1 px-3">
                  {tabs.map(tab => (
                    <li key={tab.id}>
                      <button
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center px-4 py-3 rounded-lg transition-all duration-200 font-medium ${
                          activeTab === tab.id 
                            ? isDarkMode 
                              ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md' 
                              : 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md' 
                            : isDarkMode 
                              ? 'text-gray-400 hover:text-white hover:bg-gray-700 hover:bg-opacity-50' 
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        {tab.id === 'overview' && (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                          </svg>
                        )}
                        
                        {tab.id === 'forms' && (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )}
                        
                        {tab.id === 'auditoriumTracker' && (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                          </svg>
                        )}
                        
                        {tab.id === 'profile' && (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        )}
                        
                        {tab.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
              
              {/* User Info */}
              <div className={`mx-4 my-2 p-4 rounded-lg ${
                isDarkMode ? 'bg-gray-700 bg-opacity-50' : 'bg-purple-50'
              }`}>
                <div className="flex items-center space-x-3">
                  <img 
                    src={facultyInfo.profileImage || `https://ui-avatars.com/api/?name=${facultyInfo.name?.[0] || "F"}&background=7C3AED&color=fff&size=150`} 
                    alt={facultyInfo.name || "Faculty Profile"}
                    className="h-10 w-10 rounded-full border-2 border-purple-500" 
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{facultyInfo.name || "Faculty Name"}</p>
                    <p className={`text-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {facultyInfo.id || "Faculty ID"}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Logout Button */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleLogout}
                  className={`w-full flex items-center justify-center px-4 py-3 rounded-lg ${
                    isDarkMode 
                      ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white' 
                      : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
                  } transition-all shadow-sm hover:shadow-md`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            </div>
          )}
        </aside>
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* Top Header */}
          <header className={`${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
            } border-b sticky top-0 z-20`}>
            <div className="flex items-center justify-between h-16 px-4 md:px-6">
              {/* Left: Mobile menu button, desktop sidebar toggle and page title */}
              <div className="flex items-center space-x-4">
                {/* Mobile sidebar toggle */}
                <button 
                  onClick={toggleSidebar}
                  className="block md:hidden p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Toggle mobile menu"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                
                {/* Desktop sidebar toggle */}
                <button 
                  onClick={toggleDesktopSidebar}
                  className="hidden md:block p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  aria-label={desktopSidebarOpen ? "Hide sidebar" : "Show sidebar"}
                >
                  {!desktopSidebarOpen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    </svg>
                  )}
                </button>
                
                <div className="hidden sm:block relative">
                  <h2 className="text-xl font-semibold">
                    {tabs.find(tab => tab.id === activeTab)?.label}
                  </h2>
                  <div className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 w-16 h-1 rounded-full bg-purple-500"></div>
                </div>
              </div>
              
              {/* Right: User Info and Notifications */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <div className="relative group">
                    <img
                      src={facultyInfo.profileImage || `https://ui-avatars.com/api/?name=${facultyInfo.name?.[0] || "F"}&background=7C3AED&color=fff&size=150`} 
                      alt={facultyInfo.name || "Faculty Profile"}
                      className="h-10 w-10 rounded-full border-2 border-purple-500 cursor-pointer transition-transform hover:scale-105 hover:border-opacity-80"
                      onClick={() => {
                        setActiveTab('profile');
                        setSidebarOpen(false);
                      }}
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-white dark:border-gray-800"></div>
                    <div className="absolute inset-0 rounded-full bg-purple-500 opacity-0 group-hover:opacity-20 transition-opacity"></div>
                  </div>
                  <span className="font-medium hidden sm:block">{facultyInfo.name || "Faculty"}</span>
                </div>
              </div>
            </div>
          </header>
          
          {/* Dashboard Content */}
          <main className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
            {/* Content tabs go here */}
            {activeTab === 'overview' && (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 gap-6">
                  {/* Faculty Info Card */}
                  <motion.div
                    variants={fadeInUp}
                    className={`${
                      isDarkMode 
                        ? 'bg-gray-800 border-gray-700' 
                        : 'bg-white border-gray-200'
                      } rounded-xl border p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden`}
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mt-16 -mr-16"></div>
                    <div className="flex items-center space-x-4 mb-6 relative">
                      <div className="relative">
                        <img
                          src={facultyInfo.profileImage || `https://ui-avatars.com/api/?name=${facultyInfo.name?.[0] || "F"}&background=7C3AED&color=fff&size=150`}
                          alt={facultyInfo.name || "Faculty Profile"}
                          className="h-16 w-16 rounded-full border-4 border-blue-500"
                        />
                        <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-white dark:border-gray-800"></div>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">{facultyInfo.name || "Faculty Name"}</h2>
                        <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} flex items-center`}>
                          <span className="inline-block h-2 w-2 rounded-full bg-blue-500 mr-2"></span>
                          ID: {facultyInfo.id || "---"}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <span className={`w-32 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Department:</span>
                        <span className="font-medium">{facultyInfo.department || "---"}</span>
                      </div>
                      <div className="flex items-center">
                        <span className={`w-32 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Email:</span>
                        <span className="font-medium">{facultyInfo.email || "---"}</span>
                      </div>
                      <div className="flex items-center">
                        <span className={`w-32 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Specialization:</span>
                        <span className="font-medium">{facultyInfo.specialization || "---"}</span>
                      </div>
                    </div>
                    <div className="mt-6 text-right">
                      <button
                        onClick={() => setActiveTab('profile')}
                        className={`inline-flex items-center text-sm ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} hover:underline font-medium`}
                      >
                        View Profile
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </motion.div>
                  
                  {/* Today's Schedule Card - Removed from here */}
                </div>
                
                {/* Pending Approvals Card */}
                <motion.div
                  variants={fadeInUp}
                  className={`mt-6 ${
                    isDarkMode 
                      ? 'bg-gray-800 border-gray-700' 
                      : 'bg-white border-gray-200'
                    } rounded-xl border p-6 shadow-sm hover:shadow-md transition-shadow`}
                >
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 ${isDarkMode ? 'text-amber-400' : 'text-amber-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Pending Approvals
                    </h3>
                    <span className={`h-6 w-6 flex items-center justify-center rounded-full text-xs font-medium ${
                      isDarkMode
                        ? 'bg-amber-900/50 text-amber-300'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {pendingApprovals ? pendingApprovals.length : 0}
                    </span>
                  </div>
                  
                  {pendingApprovals && pendingApprovals.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                              Form ID
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                              Student
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                              Type
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                              Date
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                          {pendingApprovals.map((form) => (
                            <tr key={form.id} className={`${
                              isDarkMode 
                                ? 'hover:bg-gray-700/50' 
                                : 'hover:bg-gray-50'
                              } transition-colors`}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm font-medium">{form.id}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div>
                                    <div className="text-sm font-medium">{form.studentName}</div>
                                    <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{form.studentId}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                                  form.formType.includes('Auditorium') 
                                    ? isDarkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-800'
                                    : form.formType.includes('Sports')
                                      ? isDarkMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-800'
                                      : form.formType.includes('Stationery')
                                        ? isDarkMode ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-800'
                                        : isDarkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {form.formType}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {form.submittedOn}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                <div className="flex items-center justify-end space-x-2">
                                  <button 
                                    onClick={() => handleFormApproval(form.id, 'approve')}
                                    className={`px-3 py-1 rounded-md ${
                                      isDarkMode
                                        ? 'bg-green-600 hover:bg-green-700 text-white'
                                        : 'bg-green-100 hover:bg-green-200 text-green-700'
                                    } transition-colors`}
                                  >
                                    Approve
                                  </button>
                                  <button 
                                    onClick={() => handleFormApproval(form.id, 'reject')}
                                    className={`px-3 py-1 rounded-md ${
                                      isDarkMode
                                        ? 'bg-red-900/70 hover:bg-red-800 text-white'
                                        : 'bg-red-100 hover:bg-red-200 text-red-700'
                                    } transition-colors`}
                                  >
                                    Reject
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-12 w-12 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'} mb-3`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>No Requests Pending</p>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} mt-1`}>All requests will appear here when available</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-4 text-right">
                    {/* "View Full Timetable" button removed from here */}
                  </div>
                </motion.div>
              </motion.div>
            )}
            
            {/* Student Forms Tab */}
            {activeTab === 'forms' && (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
              >
                <motion.div
                  variants={fadeInUp}
                  className={`${
                    isDarkMode 
                      ? 'bg-gray-800 border-gray-700' 
                      : 'bg-white border-gray-200'
                    } rounded-xl border shadow-sm overflow-hidden`}
                >
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="text-lg font-bold flex items-center mb-3 sm:mb-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Student Submitted Forms
                      </h3>

                      <div className="flex space-x-2">
                        <div className="flex flex-wrap gap-2">
                        <div className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center ${
                          isDarkMode 
                            ? 'bg-amber-900/30 text-amber-300' 
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          <span className="inline-block h-2 w-2 rounded-full bg-amber-500 mr-2"></span>
                          Pending: {studentForms ? studentForms.filter(form => form.status === 'Pending').length : 0}
                        </div>
                        
                        <div className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center ${
                          isDarkMode 
                            ? 'bg-green-900/30 text-green-300' 
                            : 'bg-green-100 text-green-700'
                        }`}>
                          <span className="inline-block h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                          Approved: {studentForms ? studentForms.filter(form => form.status === 'Approved').length : 0}
                            {/* <span className="ml-1 font-bold">(You: {approvedForms.length})</span> */}
                        </div>
                        
                        <div className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center ${
                          isDarkMode 
                            ? 'bg-red-900/30 text-red-300' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          <span className="inline-block h-2 w-2 rounded-full bg-red-500 mr-2"></span>
                          Rejected: {studentForms ? studentForms.filter(form => form.status === 'Rejected').length : 0}
                            {/* <span className="ml-1 font-bold">(You: {rejectedForms.length})</span> */}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                            Form ID
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                            Student
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                            Type
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                            Date
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                            Status
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                        {studentForms && studentForms.length > 0 ? (
                          studentForms.map((form) => (
                            <tr key={form.id} className={`${
                              isDarkMode 
                                ? 'hover:bg-gray-700/50' 
                                : 'hover:bg-gray-50'
                              } transition-colors`}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm font-medium">{form.id}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div>
                                    <div className="text-sm font-medium">{form.studentName}</div>
                                    <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{form.studentId}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                                  form.formType.includes('Auditorium') 
                                    ? isDarkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-800'
                                    : form.formType.includes('Sports')
                                      ? isDarkMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-800'
                                      : form.formType.includes('Stationery')
                                        ? isDarkMode ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-800'
                                        : isDarkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {form.formType}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {form.submittedOn}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  form.status === 'Approved'
                                    ? isDarkMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-800'
                                    : form.status === 'Rejected'
                                      ? isDarkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-800'
                                      : form.status === 'Forwarded'
                                        ? isDarkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-800'
                                        : isDarkMode ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {form.status}
                                  {form.status === 'Forwarded' && form.forwardedTo && (
                                    <span className="ml-1 text-xs opacity-75">
                                      {' '}to {adminTypes.find(admin => admin.id === form.forwardedTo)?.type || 'Admin'}
                                    </span>
                                  )}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                {form.status === 'Pending' ? (
                                  <div className="flex items-center justify-end space-x-2">
                                    <button 
                                      onClick={() => handleViewRequest(form)}
                                      className={`px-3 py-1 rounded-md ${
                                        isDarkMode
                                          ? 'bg-blue-900/50 text-blue-300 hover:bg-blue-900/70'
                                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                      } transition-colors`}
                                    >
                                      View
                                    </button>
                                    <button 
                                      onClick={() => handleFormApproval(form.id, 'approve')}
                                      className={`px-3 py-1 rounded-md ${
                                        isDarkMode
                                          ? 'bg-green-600 hover:bg-green-700 text-white'
                                          : 'bg-green-100 hover:bg-green-200 text-green-700'
                                      } transition-colors`}
                                    >
                                      Approve
                                    </button>
                                    <button 
                                      onClick={() => handleFormApproval(form.id, 'reject')}
                                      className={`px-3 py-1 rounded-md ${
                                        isDarkMode
                                          ? 'bg-red-900/70 hover:bg-red-800 text-white'
                                          : 'bg-red-100 hover:bg-red-200 text-red-700'
                                      } transition-colors`}
                                    >
                                      Reject
                                    </button>
                                  </div>
                                ) : (
                                  <button 
                                    onClick={() => handleViewRequest(form)}
                                    className={`px-3 py-1 rounded-md ${
                                      isDarkMode
                                        ? 'bg-blue-900/50 text-blue-300 hover:bg-blue-900/70'
                                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                    } transition-colors`}
                                  >
                                    View
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" className="px-6 py-12 text-center">
                              <div className="flex flex-col items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-16 w-16 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'} mb-4`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-lg font-medium mb-1`}>No forms submitted yet</p>
                                <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} max-w-sm text-center`}>
                                  Student form submissions will appear here when available
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>

                {/* Your Processed Forms History */}
                {/* <motion.div
                  variants={fadeInUp}
                  className={`mt-8 ${
                    isDarkMode 
                      ? 'bg-gray-800 border-gray-700' 
                      : 'bg-white border-gray-200'
                    } rounded-xl border shadow-sm overflow-hidden`}
                >
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="text-lg font-bold flex items-center mb-3 sm:mb-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Your Processed Forms History
                      </h3>

                      <div className="flex flex-wrap gap-2">
                        <div className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center ${
                          isDarkMode 
                            ? 'bg-green-900/30 text-green-300' 
                            : 'bg-green-100 text-green-700'
                        }`}>
                          <span className="inline-block h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                          You Approved: {approvedForms.length}
                        </div>
                        
                        <div className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center ${
                          isDarkMode 
                            ? 'bg-red-900/30 text-red-300' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          <span className="inline-block h-2 w-2 rounded-full bg-red-500 mr-2"></span>
                          You Rejected: {rejectedForms.length}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                            Form ID
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                            Student
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                            Type
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                            Date
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                            Faculty Status
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                            Admin Status
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                        {[...approvedForms, ...rejectedForms].length > 0 ? (
                          [...approvedForms, ...rejectedForms].map((form) => (
                            <tr key={form.id} className={`${
                              isDarkMode 
                                ? 'hover:bg-gray-700/50' 
                                : 'hover:bg-gray-50'
                              } transition-colors`}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm font-medium">{form.id}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div>
                                    <div className="text-sm font-medium">{form.studentName}</div>
                                    <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{form.studentId}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                                  form.formType.includes('Auditorium') 
                                    ? isDarkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-800'
                                    : form.formType.includes('Sports')
                                      ? isDarkMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-800'
                                      : form.formType.includes('Stationery')
                                        ? isDarkMode ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-800'
                                        : isDarkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {form.formType}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {form.submittedOn}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  form.facultyStatus === 'Approved'
                                    ? isDarkMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-800'
                                    : form.facultyStatus === 'Rejected'
                                      ? isDarkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-800'
                                      : isDarkMode ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {form.facultyStatus}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  form.adminStatus === 'Approved'
                                    ? isDarkMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-800'
                                    : form.adminStatus === 'Rejected'
                                      ? isDarkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-800'
                                      : isDarkMode ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {form.adminStatus}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                <button 
                                  onClick={() => handleViewRequest(form)}
                                  className={`px-3 py-1 rounded-md ${
                                    isDarkMode
                                      ? 'bg-blue-900/50 text-blue-300 hover:bg-blue-900/70'
                                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                  } transition-colors`}
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" className="px-6 py-12 text-center">
                              <div className="flex flex-col items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-16 w-16 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'} mb-4`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-lg font-medium mb-1`}>No processed forms yet</p>
                                <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} max-w-sm text-center`}>
                                  Forms you approve or reject will appear here
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div> */}
              </motion.div>
            )}
            
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div>
                {/* Profile Banner */}
                <div className={`rounded-lg overflow-hidden mb-6 relative`}>
                  <div className="h-48 bg-gradient-to-r from-purple-500 to-indigo-600"></div>
                  
                  <div className="absolute bottom-4 left-6 flex items-end">
                    <div className="relative">
                      <div className="h-20 w-20 rounded-full bg-purple-500 border-4 border-gray-900 flex items-center justify-center relative z-10 overflow-hidden">
                        {profileData.profileImage ? (
                          <img src={profileData.profileImage} alt="Profile" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full bg-purple-500 flex items-center justify-center">
                          <span className="text-white text-2xl">F</span>
                          </div>
                        )}
                        <div className="absolute bottom-1 right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-gray-900"></div>
                      </div>
                    </div>
                    <div className="ml-4 text-white">
                      <h2 className="text-2xl font-bold">{profileData.name || 'Faculty Member'}</h2>
                      <p className="text-sm">{profileData.id || 'Faculty ID'}</p>
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
                    
                    <form onSubmit={handleProfileSubmit}>
                      <div className="flex flex-col items-center mb-6">
                        <div className="relative mb-4">
                          <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-gray-700">
                            {profileData.profileImage ? (
                              <img 
                                src={profileData.profileImage} 
                                alt="Profile" 
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full bg-purple-500 flex items-center justify-center">
                                <span className="text-white text-3xl">{(profileData.name?.charAt(0) || "F").toUpperCase()}</span>
                              </div>
                            )}
                          </div>
                          <button 
                            type="button"
                            onClick={() => document.getElementById('profileImageUpload').click()}
                            className="absolute bottom-0 right-0 bg-gray-800 p-2 rounded-full border-2 border-gray-700"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </button>
                        </div>
                        <input 
                          id="profileImageUpload"
                          type="file" 
                          onChange={handleFileUpload}
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
                              value={profileData.name}
                              onChange={handleProfileChange}
                              className={`w-full p-2 rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300'} border`}
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-1">Faculty ID</label>
                            <input 
                              type="text" 
                              name="id"
                              value={profileData.id}
                              onChange={handleProfileChange}
                              className={`w-full p-2 rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300'} border`}
                              disabled
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-1">Department</label>
                            <input 
                              type="text" 
                              name="department"
                              value={profileData.department}
                              onChange={handleProfileChange}
                              className={`w-full p-2 rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300'} border`}
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-1">Gender</label>
                            <select 
                              name="gender"
                              value={profileData.gender}
                              onChange={handleProfileChange}
                              className={`w-full p-2 rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300'} border`}
                            >
                              <option value="">Select Gender</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                              <option value="Prefer not to say">Prefer not to say</option>
                            </select>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">Email</label>
                            <input 
                              type="email" 
                              name="email"
                              value={profileData.email}
                              onChange={handleProfileChange}
                              className={`w-full p-2 rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300'} border`}
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-1">Phone</label>
                            <input 
                              type="tel" 
                              name="phone"
                              value={profileData.phone}
                              onChange={handleProfileChange}
                              className={`w-full p-2 rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300'} border`}
                              placeholder="Enter phone number"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-1">Specialization</label>
                            <input 
                              type="text" 
                              name="specialization"
                              value={profileData.specialization}
                              onChange={handleProfileChange}
                              className={`w-full p-2 rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300'} border`}
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
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md"
                        >
                          Save Changes
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left column */}
                    <div className="space-y-6">
                      {/* Faculty Information */}
                      <div className={`rounded-lg shadow p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${isDarkMode ? 'border-purple-900/20' : 'border-gray-200'}`}>
                        <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-purple-100' : 'text-purple-600'}`}>Faculty Information</h3>
                        <div className="space-y-4">
                          <div>
                            <p className="text-gray-400 text-sm">ID</p>
                            <p className={isDarkMode ? "text-gray-200" : "text-gray-700"}>{profileData.id || 'Not provided'}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-sm">Department</p>
                            <p className={isDarkMode ? "text-gray-200" : "text-gray-700"}>{profileData.department || 'Not provided'}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-sm">Specialization</p>
                            <p className={isDarkMode ? "text-gray-200" : "text-gray-700"}>{profileData.specialization || 'Not provided'}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-sm">Gender</p>
                            <p className={isDarkMode ? "text-gray-200" : "text-gray-700"}>{profileData.gender || 'Not provided'}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Contact Details */}
                      <div className={`rounded-lg shadow p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${isDarkMode ? 'border-purple-900/20' : 'border-gray-200'}`}>
                        <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-purple-100' : 'text-purple-600'}`}>Contact Details</h3>
                        <div className="space-y-4">
                          <div className="flex items-center">
                            <svg className="h-5 w-5 text-purple-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                            </svg>
                            <span className={isDarkMode ? "text-gray-200" : "text-gray-700"}>{profileData.email || 'Not provided'}</span>
                          </div>
                          <div className="flex items-center">
                            <svg className="h-5 w-5 text-purple-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                            </svg>
                            <span className={isDarkMode ? "text-gray-200" : "text-gray-700"}>{profileData.phone || 'Not provided'}</span>
                          </div>
                          <div className="flex items-center">
                            <svg className="h-5 w-5 text-purple-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            </svg>
                            <span className={isDarkMode ? "text-gray-200" : "text-gray-700"}>{profileData.address || 'Not provided'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Right column */}
                    <div className="md:col-span-2 space-y-6">
                      {/* Account Settings */}
                      <div className={`rounded-lg shadow p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${isDarkMode ? 'border-purple-900/20' : 'border-gray-200'}`}>
                        <h3 className={`text-lg font-bold mb-4 flex items-center ${isDarkMode ? 'text-purple-100' : 'text-purple-600'}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Account Settings
                        </h3>
                        
                        <div className="space-y-4">
                          <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                            <div>
                              <p className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Dark Mode</p>
                              <p className="text-sm text-gray-400">Toggle dark/light theme</p>
                            </div>
                            <div>
                              <button
                                onClick={() => toggleTheme()}
                                className={`w-12 h-6 ${isDarkMode ? 'bg-purple-600' : 'bg-gray-200'} rounded-full flex items-center p-1 cursor-pointer transition-colors duration-300`}
                              >
                                <div className={`w-4 h-4 bg-white rounded-full transform transition-transform duration-300 ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-6">
                          <button 
                            onClick={() => setIsEditingProfile(true)}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md flex items-center"
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
            
            {/* Auditorium Tracker Tab */}
            {activeTab === 'auditoriumTracker' && (
              <div className="p-4 md:p-6">
                <h2 className="text-2xl font-bold mb-6 flex items-center">
                  <svg className="w-6 h-6 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                  Auditorium Booking Calendar
                </h2>
                        
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  <div className="lg:col-span-1">
                    <div className={`rounded-lg p-4 shadow-xl ${isDarkMode ? 'bg-gray-800/70 border-gray-700' : 'bg-white border-gray-200'} border`}>
                      <h3 className="text-lg font-bold mb-4">Auditoriums</h3>
                      <div className="space-y-2">
                        {allHalls.map(hall => (
                          <div 
                            key={hall.id}
                            className={`flex items-center px-3 py-2 rounded-lg cursor-pointer ${
                              selectedAuditorium === hall.id 
                                ? isDarkMode ? 'bg-purple-700' : 'bg-purple-100' 
                                : isDarkMode ? 'bg-gray-700/50 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'
                            }`}
                            onClick={() => setSelectedAuditorium(hall.id)}
                          >
                            <span className={`h-3 w-3 rounded-full mr-2 ${
                              selectedAuditorium === hall.id 
                                ? 'bg-green-500' 
                                : 'bg-gray-400'
                            }`}></span>
                            <span>{hall.name}</span>
                          </div>
                        ))}
                </div>
                
                      <h3 className="text-lg font-bold mt-6 mb-4">Status Filter</h3>
                      <div className="space-y-2">
                        <div className="flex items-center mb-2">
                          <input 
                            type="checkbox" 
                            className="h-4 w-4 mr-2 accent-purple-500" 
                            checked={statusFilters.pending}
                            onChange={() => handleStatusFilterChange('pending')}
                          />
                          <span>Show Pending</span>
                      </div>
                        <div className="flex items-center mb-2">
                          <input 
                            type="checkbox" 
                            className="h-4 w-4 mr-2 accent-purple-500" 
                            checked={statusFilters.approved}
                            onChange={() => handleStatusFilterChange('approved')}
                          />
                          <span>Show Approved</span>
                      </div>
                    <div className="flex items-center">
                          <input 
                            type="checkbox" 
                            className="h-4 w-4 mr-2 accent-purple-500" 
                            checked={statusFilters.rejected}
                            onChange={() => handleStatusFilterChange('rejected')} 
                          />
                          <span>Show Rejected</span>
                      </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="lg:col-span-3">
                    <div className={`rounded-lg p-4 shadow-xl ${isDarkMode ? 'bg-gray-800/70 border-gray-700' : 'bg-white border-gray-200'} border`}>
                      {/* Calendar header with navigation */}
                <div className="flex justify-between items-center mb-4">
                        <button 
                          className={`p-2 rounded-lg ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-200'}`}
                          onClick={goToPreviousMonth}
                        >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                        <h3 className="font-medium text-lg">{getMonthName(currentDate)} {getYear(currentDate)}</h3>
                        <button 
                          className={`p-2 rounded-lg ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-200'}`}
                          onClick={goToNextMonth}
                        >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                
                      {/* Calendar view */}
                      <div className={`rounded-lg overflow-hidden border ${isDarkMode ? 'border-gray-700' : 'border-gray-300'} shadow-lg`}>
                  {/* Day header */}
                        <div className={`grid grid-cols-7 text-center border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className={`py-2 font-medium text-xs ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  {/* Calendar days */}
                  <div className="grid grid-cols-7">
                    {/* Empty cells for previous month */}
                          {[...Array(getFirstDayOfMonth(currentDate))].map((_, i) => (
                            <div key={`empty-${i}`} className={`h-20 p-1 ${isDarkMode ? 'border-b border-r border-gray-700 text-gray-600' : 'border-b border-r border-gray-300 text-gray-400'}`}></div>
                    ))}
                    
                    {/* Actual days */}
                          {[...Array(getDaysInMonth(currentDate))].map((_, i) => {
                      const day = i + 1;
                                    
                            // Filter bookings for this day and selected auditorium
                            const dayBookings = auditoriumBookings.filter(booking => {
                              if (!booking.date) return false;
                              return booking.date.getDate() === day && 
                                     booking.date.getMonth() === currentDate.getMonth() && 
                                     booking.date.getFullYear() === currentDate.getFullYear() &&
                                     (selectedAuditorium === 'all' || 
                                      booking.auditorium === selectedAuditorium || 
                                      booking.details.hallId === selectedAuditorium || 
                                      booking.details.auditoriumId === selectedAuditorium);
                            });
                                    
                            // Count bookings by status
                            const pendingCount = dayBookings.filter(b => b.status.toLowerCase() === 'pending').length;
                            const approvedCount = dayBookings.filter(b => b.status.toLowerCase() === 'approved').length;
                            const rejectedCount = dayBookings.filter(b => b.status.toLowerCase() === 'rejected').length;
                            
                            const hasBookings = dayBookings.length > 0;
                      
                      return (
                        <div 
                          key={`day-${day}`} 
                                className={`h-20 p-1 ${isDarkMode ? 'border-b border-r border-gray-700' : 'border-b border-r border-gray-300'} ${
                                  hasBookings 
                                    ? isDarkMode ? 'bg-gray-700/50 cursor-pointer hover:bg-gray-700/70' : 'bg-purple-50 cursor-pointer hover:bg-purple-100' 
                                    : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                                onClick={() => handleDayClick(day)}
                              >
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-medium">{day}</span>
                                  {hasBookings && (
                                    <span className={`text-xs px-1 py-0.5 rounded-full text-white ${
                                      isDarkMode ? 'bg-purple-600' : 'bg-purple-500'
                                    }`}>
                                      {dayBookings.length}
                              </span>
                            )}
                          </div>
                          
                                {hasBookings && (
                                  <div className="mt-1 text-[9px]">
                                    {pendingCount > 0 && (
                                      <div className={`rounded-sm p-0.5 mb-0.5 ${
                                        isDarkMode ? 'bg-amber-900/40 text-amber-200' : 'bg-amber-100 text-amber-800'
                                      }`}>
                                        {pendingCount} pending
                                      </div>
                                    )}
                                    {approvedCount > 0 && (
                                      <div className={`rounded-sm p-0.5 mb-0.5 ${
                                        isDarkMode ? 'bg-green-900/40 text-green-200' : 'bg-green-100 text-green-800'
                                      }`}>
                                        {approvedCount} approved
                                      </div>
                                    )}
                                    {rejectedCount > 0 && (
                                      <div className={`rounded-sm p-0.5 mb-0.5 ${
                                        isDarkMode ? 'bg-red-900/40 text-red-200' : 'bg-red-100 text-red-800'
                                      }`}>
                                        {rejectedCount} rejected
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
                          <div className={`h-3 w-3 rounded-full ${isDarkMode ? 'bg-amber-900/60' : 'bg-amber-400'} mr-2`}></div>
                          <span className="text-xs">Pending Approval</span>
                        </div>
                        <div className="flex items-center">
                          <div className={`h-3 w-3 rounded-full ${isDarkMode ? 'bg-green-900/60' : 'bg-green-400'} mr-2`}></div>
                          <span className="text-xs">Approved</span>
                        </div>
                        <div className="flex items-center">
                          <div className={`h-3 w-3 rounded-full ${isDarkMode ? 'bg-red-900/60' : 'bg-red-400'} mr-2`}></div>
                          <span className="text-xs">Rejected</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
      
      {/* Request Details Modal */}
      {showRequestModal && selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className={`relative w-full max-w-3xl rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6 max-h-[90vh] overflow-y-auto`}>
            <button
              onClick={closeRequestModal}
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
                  <span className={`px-2.5 py-0.5 rounded-full text-sm font-medium mr-3 ${
                    selectedRequest.formType.includes('Auditorium') 
                      ? isDarkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-800'
                      : selectedRequest.formType.includes('Sports')
                        ? isDarkMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-800'
                        : selectedRequest.formType.includes('Stationery')
                          ? isDarkMode ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-800'
                          : selectedRequest.formType.includes('Canteen')
                            ? isDarkMode ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-800'
                            : isDarkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {selectedRequest.formType}
                              </span>
                  {selectedRequest.details.eventName || selectedRequest.details.bookingName || selectedRequest.details.orderName || 'Request Details'}
                </h2>
                
                <span className={`px-2.5 py-0.5 rounded-full text-sm font-medium ${
                  selectedRequest.status === 'Approved'
                    ? isDarkMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-800'
                    : selectedRequest.status === 'Rejected'
                      ? isDarkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-800'
                      : selectedRequest.status === 'Forwarded'
                        ? isDarkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-800'
                        : isDarkMode ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-800'
                }`}>
                  {selectedRequest.status}
                              </span>
                            </div>
              
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                ID: {selectedRequest.id} • Submitted on: {selectedRequest.submittedOn}
                          </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Student Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Student Information</h3>
                <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="space-y-3">
                    <div>
                      <span className="block text-sm text-gray-500 dark:text-gray-400">Name</span>
                      <span className="block font-medium">{selectedRequest.studentName}</span>
                    </div>
                    <div>
                      <span className="block text-sm text-gray-500 dark:text-gray-400">Student ID</span>
                      <span className="block font-medium">{selectedRequest.studentId}</span>
                    </div>
                    <div>
                      <span className="block text-sm text-gray-500 dark:text-gray-400">Email</span>
                      <span className="block font-medium">{selectedRequest.details.email || selectedRequest.details.studentEmail || 'Not provided'}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Request Details */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Request Details</h3>
                <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="space-y-3">
                    {/* Display different fields based on request type */}
                    {selectedRequest.formType.includes('Auditorium') && (
                      <>
                        <div>
                          <span className="block text-sm text-gray-500 dark:text-gray-400">Event Name</span>
                          <span className="block font-medium">{selectedRequest.details.eventName || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="block text-sm text-gray-500 dark:text-gray-400">Event Date</span>
                          <span className="block font-medium">{selectedRequest.details.bookingDate || selectedRequest.details.date || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="block text-sm text-gray-500 dark:text-gray-400">Event Time</span>
                          <span className="block font-medium">{selectedRequest.details.time || `${selectedRequest.details.startTime} - ${selectedRequest.details.endTime}` || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="block text-sm text-gray-500 dark:text-gray-400">Event Type</span>
                          <span className="block font-medium">{selectedRequest.details.eventType || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="block text-sm text-gray-500 dark:text-gray-400">Expected Attendees</span>
                          <span className="block font-medium">{selectedRequest.details.attendees || 'Not specified'}</span>
                        </div>
                      </>
                    )}
                    
                    {selectedRequest.formType.includes('Sports') && (
                      <>
                        <div>
                          <span className="block text-sm text-gray-500 dark:text-gray-400">Facility</span>
                          <span className="block font-medium">{selectedRequest.details.facility || selectedRequest.details.facilityName || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="block text-sm text-gray-500 dark:text-gray-400">Booking Type</span>
                          <span className="block font-medium">{selectedRequest.details.bookingType || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="block text-sm text-gray-500 dark:text-gray-400">Sport/Activity</span>
                          {(() => {
                            if (selectedRequest.details.bookingType === 'facility') {
                              return <span className="block font-medium">{selectedRequest.details.facilityName || 'Not specified'}</span>;
                            } else if (selectedRequest.details.bookingType === 'equipment') {
                              if (typeof selectedRequest.details.equipmentList === 'object' && selectedRequest.details.equipmentList !== null) {
                                const equipmentText = Object.entries(selectedRequest.details.equipmentList)
                                  .map(([key, value]) => `${key}: ${value}`)
                                  .join(', ');
                                return <span className="block font-medium">{equipmentText}</span>;
                              }
                              return <span className="block font-medium">{selectedRequest.details.equipmentList || 'Not specified'}</span>;
                            }
                            return <span className="block font-medium">{selectedRequest.details.sport || selectedRequest.details.activity || 'Not specified'}</span>;
                          })()}
                        </div>
                        <div>
                          <span className="block text-sm text-gray-500 dark:text-gray-400">Booking Date</span>
                          <span className="block font-medium">{selectedRequest.details.bookingDate || selectedRequest.details.date || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="block text-sm text-gray-500 dark:text-gray-400">Time</span>
                          <span className="block font-medium">{selectedRequest.details.time || `${selectedRequest.details.startTime} - ${selectedRequest.details.endTime}` || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="block text-sm text-gray-500 dark:text-gray-400">Number of Participants</span>
                          <span className="block font-medium">{selectedRequest.details.numberOfPeople || selectedRequest.details.participants || 'Not specified'}</span>
                        </div>
                      </>
                    )}
                    
                    {selectedRequest.formType.includes('Stationery') && (
                      <>
                        <div>
                          <span className="block text-sm text-gray-500 dark:text-gray-400">Items Requested</span>
                          <div className="mt-1">
                            {selectedRequest.details.items && Array.isArray(selectedRequest.details.items) && selectedRequest.details.items.length > 0 ? (
                              <ul className="list-disc list-inside">
                                {selectedRequest.details.items.map((item, index) => (
                                  <li key={index} className="text-sm">
                                    {item.name || item.itemName}: {item.quantity || 1} {item.unit || ''}
                                  </li>
                                ))}
                              </ul>
                            ) : selectedRequest.details.selectedItems && Array.isArray(selectedRequest.details.selectedItems) && selectedRequest.details.selectedItems.length > 0 ? (
                              <ul className="list-disc list-inside">
                                {selectedRequest.details.selectedItems.map((item, index) => (
                                  <li key={index} className="text-sm">
                                    {item.name || item.itemName}: {item.quantity || 1} {item.unit || ''}
                                  </li>
                                ))}
                              </ul>
                            ) : selectedRequest.details.itemsSummary ? (
                              <span className="block font-medium">{selectedRequest.details.itemsSummary}</span>
                            ) : (
                              <span className="block font-medium">No items specified</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="block text-sm text-gray-500 dark:text-gray-400">Purpose</span>
                          <span className="block font-medium">{selectedRequest.details.purpose || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="block text-sm text-gray-500 dark:text-gray-400">Date Needed</span>
                          <span className="block font-medium">{selectedRequest.details.dateNeeded || selectedRequest.details.date || 'Not specified'}</span>
                        </div>
                      </>
                    )}
                    
                    {selectedRequest.formType.includes('Canteen') && (
                      <>
                        <div>
                          <span className="block text-sm text-gray-500 dark:text-gray-400">Order Items</span>
                          <div className="mt-1">
                            {(() => {
                              // Try to get items from either items or orderItems fields
                              const itemsArray = Array.isArray(selectedRequest.details.orderItems) && selectedRequest.details.orderItems.length > 0
                                ? selectedRequest.details.orderItems
                                : Array.isArray(selectedRequest.details.items) && selectedRequest.details.items.length > 0
                                  ? selectedRequest.details.items
                                  : null;
                                  
                              if (itemsArray) {
                                return (
                                  <ul className="list-disc list-inside">
                                    {itemsArray.map((item, index) => (
                                      <li key={index} className="text-sm">
                                        {item.name}: {item.quantity || 1} x ₹{item.price || 0} = ₹{item.quantity * item.price || 0}
                                      </li>
                                    ))}
                                  </ul>
                                );
                              } else if (typeof selectedRequest.details.items === 'string' && selectedRequest.details.items.trim() !== '') {
                                // If items is a string, display it directly
                                return (
                                  <span className="block font-medium">{selectedRequest.details.items}</span>
                                );
                              } else {
                                return <span className="block font-medium">No items specified</span>;
                              }
                            })()}
                          </div>
                        </div>
                        <div>
                          <span className="block text-sm text-gray-500 dark:text-gray-400">Purpose</span>
                          <span className="block font-medium">{selectedRequest.details.purpose || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="block text-sm text-gray-500 dark:text-gray-400">Date Needed</span>
                          <span className="block font-medium">{selectedRequest.details.dateNeeded || selectedRequest.details.date || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="block text-sm text-gray-500 dark:text-gray-400">Total Amount</span>
                          <span className="block font-medium">₹{selectedRequest.details.totalAmount || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="block text-sm text-gray-500 dark:text-gray-400">Order Date</span>
                          <span className="block font-medium">{selectedRequest.details.orderDate || selectedRequest.details.date || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="block text-sm text-gray-500 dark:text-gray-400">Notes</span>
                          <span className="block font-medium">{selectedRequest.details.notes || selectedRequest.details.additionalNotes || 'None'}</span>
                        </div>
                        <div>
                          <span className="block text-sm text-gray-500 dark:text-gray-400">Pickup Location</span>
                          <span className="block font-medium">
                            {selectedRequest.details.location === 'main-canteen' ? 'Main Canteen' :
                            selectedRequest.details.location === 'cafeteria' ? 'Cafeteria' :
                            selectedRequest.details.location || 'Not specified'}
                          </span>
                        </div>
                      </>
                    )}
                    
                    {/* Common field for all request types */}
                    <div>
                      <span className="block text-sm text-gray-500 dark:text-gray-400">Additional Notes</span>
                      <span className="block font-medium">{selectedRequest.details.additionalNotes || selectedRequest.details.notes || 'None'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Action buttons for pending requests */}
            {selectedRequest.status === 'Pending' && (
              <div className="mt-8 flex justify-end space-x-3">
                            <button 
                  onClick={() => {
                    handleFormApproval(selectedRequest.id, 'reject');
                    closeRequestModal();
                  }}
                  className={`px-4 py-2 rounded-md ${
                    isDarkMode
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-red-100 hover:bg-red-200 text-red-700'
                  } transition-colors`}
                >
                  Reject Request
                </button>
                <button
                  onClick={() => {
                    handleFormApproval(selectedRequest.id, 'approve');
                    closeRequestModal();
                  }}
                  className={`px-4 py-2 rounded-md ${
                                isDarkMode 
                                  ? 'bg-green-600 hover:bg-green-700 text-white'
                                  : 'bg-green-100 hover:bg-green-200 text-green-700'
                  } transition-colors`}
                            >
                  Approve Request
                            </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Day Bookings Modal */}
      {showDayBookingsModal && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className={`${isDarkMode ? 'bg-gradient-to-br from-gray-900 to-gray-800' : 'bg-white'} rounded-lg shadow-2xl w-full max-w-4xl overflow-hidden border ${isDarkMode ? 'border-purple-900/30' : 'border-purple-200'}`}>
            <div className={`flex justify-between items-center ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-purple-50 border-purple-100'} p-4 border-b`}>
              <h3 className={`text-xl font-bold ${isDarkMode ? 'text-purple-100' : 'text-purple-800'}`}>
                Bookings for {selectedDate ? formatDate(selectedDate) : 'Selected Date'}
                {selectedAuditorium !== 'all' && (
                  <span className="ml-2 text-sm font-normal">
                    ({selectedAuditorium === 'main-auditorium' ? 'Main Auditorium' : 
                      selectedAuditorium === 'seminar-hall' ? 'Seminar Hall' : 
                      selectedAuditorium === 'lrdc-hall' ? 'LRDC Hall' : selectedAuditorium})
                  </span>
                )}
              </h3>
                            <button 
                onClick={closeDayBookingsModal}
                className={`${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                            </button>
                          </div>
            
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {dayBookings.length > 0 ? (
                <div className="space-y-4">
                  {dayBookings.map(booking => (
                    <div 
                      key={booking.id}
                      className={`p-4 rounded-lg ${
                        booking.status === 'Approved' 
                          ? isDarkMode ? 'bg-green-900/20 border border-green-800/30' : 'bg-green-50 border border-green-200' 
                          : booking.status === 'Rejected' 
                          ? isDarkMode ? 'bg-red-900/20 border border-red-800/30' : 'bg-red-50 border border-red-200'
                          : isDarkMode ? 'bg-amber-900/20 border border-amber-800/30' : 'bg-amber-50 border border-amber-200'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {booking.title || 'Unnamed Event'}
                          </h4>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            <span className="mr-3">Time: {booking.time || 'Not specified'}</span>
                            {booking.details?.duration && <span>Duration: {booking.details.duration}</span>}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-sm font-medium ${
                            booking.status === 'Approved'
                              ? isDarkMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-800'
                              : booking.status === 'Rejected'
                                ? isDarkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-800'
                                : isDarkMode ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {booking.status}
                          </span>
                      </div>
                      </div>
                      
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                          <h5 className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Event Details
                          </h5>
                          <div className={`rounded-lg p-3 ${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                            <div className="grid grid-cols-3 gap-y-2 text-sm">
                              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Location:</span>
                              <span className={`col-span-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {booking.auditorium === 'main-auditorium' ? 'Main Auditorium' : 
                                 booking.auditorium === 'seminar-hall' ? 'Seminar Hall' : 
                                 booking.auditorium === 'lrdc-hall' ? 'LRDC Hall' : booking.auditorium || 'Not specified'}
                              </span>
                              
                              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Purpose:</span>
                              <span className={`col-span-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {booking.description || booking.details?.purpose || 'Not specified'}
                              </span>
                              
                              {booking.details?.attendees && (
                                <>
                                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Attendees:</span>
                                  <span className={`col-span-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    {booking.details.attendees}
                                  </span>
                                </>
                              )}
                              
                              {booking.details?.equipment && (
                                <>
                                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Equipment:</span>
                                  <span className={`col-span-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    {booking.details.equipment}
                                  </span>
                                </>
                              )}
                            </div>
                  </div>
                </div>
                
                        <div>
                          <h5 className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Requester Details
                          </h5>
                          <div className={`rounded-lg p-3 ${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                            <div className="grid grid-cols-3 gap-y-2 text-sm">
                              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Student:</span>
                              <span className={`col-span-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {booking.studentName || 'Unknown'}
                              </span>
                              
                              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Student ID:</span>
                              <span className={`col-span-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {booking.studentId || 'Not available'}
                              </span>
                              
                              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Department:</span>
                              <span className={`col-span-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {booking.department || booking.details?.department || 'Not specified'}
                              </span>
                  </div>
                  </div>
                  </div>
                </div>
                      
                      {/* Approval status */}
                      <div className="mt-4 flex justify-between items-center">
                        <div className="flex space-x-4">
                          <div className={`px-3 py-1 rounded-md text-xs ${
                            booking.facultyStatus === 'Approved' 
                              ? isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800'
                              : booking.facultyStatus === 'Rejected'
                                ? isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-800'
                                : isDarkMode ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-800'
                          }`}>
                            Faculty: {booking.facultyStatus || 'Pending'}
                          </div>
                          
                          <div className={`px-3 py-1 rounded-md text-xs ${
                            booking.adminStatus === 'Approved' 
                              ? isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800'
                              : booking.adminStatus === 'Rejected'
                                ? isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-800'
                                : isDarkMode ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-800'
                          }`}>
                            Admin: {booking.adminStatus || 'Pending'}
                          </div>
                        </div>
                        
                        {/* Action buttons for faculty - only shown if pending */}
                        {booking.facultyStatus === 'Pending' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleFormApproval(booking.id, 'approve')}
                              className={`px-3 py-1 text-sm rounded ${
                                isDarkMode ? 'bg-green-700 hover:bg-green-600 text-white' : 'bg-green-600 hover:bg-green-700 text-white'
                              }`}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleFormApproval(booking.id, 'reject')}
                              className={`px-3 py-1 text-sm rounded ${
                                isDarkMode ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-red-600 hover:bg-red-700 text-white'
                              }`}
                            >
                              Reject
                            </button>
                          </div>
                        )}
        </div>
      </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className={`text-8xl opacity-20 ${isDarkMode ? 'text-purple-400' : 'text-purple-300'}`}>📅</div>
                  <p className={`mt-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} text-xl font-light`}>No bookings for this date</p>
                  <p className={`mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>This date is available for all halls</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyDashboard; 