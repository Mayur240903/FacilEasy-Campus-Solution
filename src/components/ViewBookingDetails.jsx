import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const ViewBookingDetails = ({ isOpen, onClose, bookingData, onStatusChange }) => {
  const { isDarkMode } = useTheme();
  
  if (!bookingData) return null;
  
  const getStatusBadge = (status) => {
    let color;
    switch (status?.toLowerCase()) {
      case 'approved':
        color = 'bg-green-700 text-white';
        break;
      case 'rejected':
        color = 'bg-red-700 text-white';
        break;
      case 'pending':
      default:
        color = 'bg-amber-600 text-white';
    }
    return (
      <span className={`px-3 py-1 rounded-md text-sm font-medium ${color}`}>
        {status || 'Pending'}
      </span>
    );
  };

  const handleStatusChange = async (status) => {
    try {
      // Determine the collection name based on service type
      let collectionName;
      switch (bookingData.service?.toLowerCase()) {
        case 'auditorium':
          collectionName = 'auditoriumBookings';
          break;
        case 'sports facilities':
        case 'sports':
          collectionName = 'sportsBookings';
          break;
        case 'canteen':
          collectionName = 'canteenOrders';
          break;
        case 'stationery':
          collectionName = 'stationeryRequests';
          break;
        default:
          throw new Error('Unknown service type');
      }
      
      // Update the document in Firestore
      const bookingRef = doc(db, collectionName, bookingData.id);
      await updateDoc(bookingRef, {
        adminStatus: status,
        status: status // Update the overall status as well
      });
      
      // Call the callback to update the UI
      if (onStatusChange) {
        onStatusChange(bookingData.id, status);
      }
      
      // Close the modal
      onClose();
    } catch (error) {
      console.error('Error updating booking status:', error);
      alert('Failed to update booking status. Please try again.');
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        day: 'numeric', 
        month: 'numeric', 
        year: 'numeric' 
      });
    } catch (error) {
      return dateString;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
            className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl ${
              isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
            } rounded-lg shadow-xl z-50 overflow-hidden`}
          >
            {/* Header */}
            <div className={`px-6 py-4 border-b relative ${isDarkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-100'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm uppercase font-medium text-gray-500">{bookingData.service || 'Auditorium'}</div>
                  <h3 className="text-xl font-bold">{bookingData.eventName || 'Booking Details'}</h3>
                </div>
                
                <div>
                  {getStatusBadge(bookingData.adminStatus || 'Pending')}
                </div>
                
                <button 
                  className={`absolute top-2 right-2 p-2 rounded-full ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                  onClick={onClose}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
              <div className="text-sm text-gray-500 mt-1">
                ID: {bookingData.id} • Submitted on: {formatDate(bookingData.createdAt || bookingData.date || bookingData.eventDate)}
              </div>
            </div>
            
            {/* Content */}
            <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left column */}
                <div>
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold mb-3 border-b pb-2 border-gray-200 dark:border-gray-700">Booking Information</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Student Name</p>
                        <p className="font-medium">{bookingData.studentName}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Student ID</p>
                        <p className="font-medium">{bookingData.studentId || bookingData.userId}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Department</p>
                        <p className="font-medium">{bookingData.department || 'IT'}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Date</p>
                        <p className="font-medium">{formatDate(bookingData.date || bookingData.eventDate)}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Time</p>
                        <p className="font-medium">{bookingData.time || `${bookingData.startTime || '08:00'} - ${bookingData.endTime || '12:00'}`}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Right column */}
                <div>
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold mb-3 border-b pb-2 border-gray-200 dark:border-gray-700">Details</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Event Name</p>
                        <p className="font-medium">{bookingData.eventName || 'Event'}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Event Type</p>
                        <p className="font-medium">{bookingData.eventType || 'cultural'}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Expected Attendees</p>
                        <p className="font-medium">{bookingData.attendees || bookingData.participants || '500'}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Event Description</p>
                        <p className="font-medium">{bookingData.description || bookingData.purpose || 'Testing'}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Auditorium Location</p>
                        <p className="font-medium">{bookingData.auditorium || bookingData.venue || 'Main Auditorium Architecture Building'}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Additional Notes</p>
                        <p className="font-medium">{bookingData.notes || 'None'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Approval Status */}
              <div className="mt-4 mb-2">
                <h4 className="text-lg font-semibold mb-3 border-b pb-2 border-gray-200 dark:border-gray-700">Approval Status</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Faculty Status</p>
                    {getStatusBadge(bookingData.facultyStatus || 'Approved')}
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Admin Status</p>
                    {getStatusBadge(bookingData.adminStatus || 'Pending')}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer with actions */}
            <div className={`px-6 py-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-end`}>
                {bookingData.adminStatus === 'Pending' && (
                  <>
                    <button
                    className="px-4 py-2 mr-2 rounded-md bg-red-600 hover:bg-red-700 text-white"
                      onClick={() => handleStatusChange('Rejected')}
                    >
                      Reject
                    </button>
                    <button
                    className="px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleStatusChange('Approved')}
                    >
                      Approve
                    </button>
                  </>
                )}
              {bookingData.adminStatus !== 'Pending' && (
              <button
                className={`px-4 py-2 rounded-md ${
                  isDarkMode
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
                onClick={onClose}
              >
                Close
              </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ViewBookingDetails; 