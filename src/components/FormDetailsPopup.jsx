import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

const FormDetailsPopup = ({ isOpen, onClose, formData }) => {
  const { isDarkMode } = useTheme();
  
  if (!formData) return null;
  
  const getStatusBadge = (status) => {
    let color;
    switch (status?.toLowerCase()) {
      case 'approved':
        color = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
        break;
      case 'rejected':
        color = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
        break;
      case 'pending':
      default:
        color = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    }
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
        {status || 'Pending'}
      </span>
    );
  };

  const getServiceBadge = (service) => {
    let color;
    switch (service?.toLowerCase()) {
      case 'auditorium':
        color = 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
        break;
      case 'canteen':
        color = 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
        break;
      case 'sports facilities':
        color = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
        break;
      case 'stationery':
        color = 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
        break;
      default:
        color = 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium mr-3 ${color}`}>
        {service || 'Request'}
      </span>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`relative w-full max-w-3xl rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6 max-h-[90vh] overflow-y-auto`}
          >
            {/* Close button */}
            <button
              onClick={onClose}
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
                  {getServiceBadge(formData.service)}
                  {formData.eventName || formData.orderName || `${formData.service} ${formData.service === 'Canteen' ? 'Order' : 'Booking'} Details`}
                </h2>
                
                <span className={`px-2.5 py-0.5 rounded-full text-sm font-medium ${
                  formData.status?.toLowerCase() === 'approved'
                    ? isDarkMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-800'
                    : formData.status?.toLowerCase() === 'rejected'
                      ? isDarkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-800'
                      : isDarkMode ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-800'
                }`}>
                  {formData.status || 'Pending'}
                </span>
              </div>
              
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                ID: {formData.id} • Submitted on: {formData.submittedOn || formData.createdAt?.toDate?.().toLocaleDateString() || 'N/A'}
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
                      <span className="block font-medium">{formData.studentName || 'Not provided'}</span>
                    </div>
                    
                    <div>
                      <span className="block text-sm text-gray-500 dark:text-gray-400">Student ID</span>
                      <span className="block font-medium">{formData.studentId || 'Not provided'}</span>
                    </div>
                    
                    <div>
                      <span className="block text-sm text-gray-500 dark:text-gray-400">Department</span>
                      <span className="block font-medium">{formData.department || 'Not provided'}</span>
                    </div>
                    
                    <div>
                      <span className="block text-sm text-gray-500 dark:text-gray-400">Date</span>
                      <span className="block font-medium">{formData.date || 'Not specified'}</span>
                    </div>
                    
                    <div>
                      <span className="block text-sm text-gray-500 dark:text-gray-400">Time</span>
                      <span className="block font-medium">{formData.time || 'Not specified'}</span>
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
                        {getStatusBadge(formData.facultyStatus)}
                        {formData.facultyApprover && (
                          <span className="ml-2 text-sm text-gray-500">by {formData.facultyApprover}</span>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <span className="block text-sm text-gray-500 dark:text-gray-400">Admin Status</span>
                      <div className="flex items-center mt-1">
                        {getStatusBadge(formData.adminStatus)}
                        {formData.adminApprover && (
                          <span className="ml-2 text-sm text-gray-500">by {formData.adminApprover}</span>
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
                    {/* Auditorium specific details */}
                    {formData.service?.toLowerCase() === 'auditorium' && (
                      <>
                        <div>
                          <span className="block text-sm text-gray-500 dark:text-gray-400">Event Name</span>
                          <span className="block font-medium">{formData.eventName || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="block text-sm text-gray-500 dark:text-gray-400">Event Type</span>
                          <span className="block font-medium">{formData.eventType || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="block text-sm text-gray-500 dark:text-gray-400">Expected Attendees</span>
                          <span className="block font-medium">{formData.attendees || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="block text-sm text-gray-500 dark:text-gray-400">Event Description</span>
                          <span className="block font-medium">{formData.description || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="block text-sm text-gray-500 dark:text-gray-400">Auditorium Location</span>
                          <span className="block font-medium">
                            {formData.auditoriumLocation === 'main-auditorium' ? 'Main Auditorium Architecture Building' :
                             formData.auditoriumLocation === 'seminar-hall' ? 'Seminar Hall Mechanical Building' :
                             formData.auditoriumLocation === 'lrdc-hall' ? 'LRDC Hall' :
                             formData.auditorium === 'main-auditorium' ? 'Main Auditorium Architecture Building' :
                             formData.auditorium === 'seminar-hall' ? 'Seminar Hall Mechanical Building' :
                             formData.auditorium === 'lrdc-hall' ? 'LRDC Hall' :
                             formData.hallId === 'main-auditorium' ? 'Main Auditorium Architecture Building' :
                             formData.hallId === 'seminar-hall' ? 'Seminar Hall Mechanical Building' :
                             formData.hallId === 'lrdc-hall' ? 'LRDC Hall' :
                             formData.auditoriumLocation || 'Not specified'}
                          </span>
                        </div>
                        {formData.equipmentRequired && (
                          <div>
                            <span className="block text-sm text-gray-500 dark:text-gray-400">Equipment Required</span>
                            <span className="block font-medium">
                              {Array.isArray(formData.equipmentRequired) 
                                ? formData.equipmentRequired.join(', ') 
                                : formData.equipmentRequired || 'None'}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                    
                    {/* Canteen specific details */}
                    {formData.service?.toLowerCase() === 'canteen' && (
                      <>
                        <div>
                          <span className="block text-sm text-gray-500 dark:text-gray-400">Order Items</span>
                          <div className="mt-1">
                            {/* Check for items in different possible structures */}
                            {(() => {
                              const items = formData.items || formData.orderItems || [];
                              
                              if (Array.isArray(items) && items.length > 0) {
                                return (
                                  <div className="space-y-2 mt-2">
                                    {items.map((item, index) => (
                                      <div key={index} className={`p-2 rounded ${isDarkMode ? 'bg-gray-600' : 'bg-gray-100'}`}>
                                        <div className="flex justify-between items-center">
                                          <span className="font-medium">{item.name}</span>
                                          <span>₹{item.price || 0}</span>
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                          Quantity: {item.quantity || 1}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                );
                              } else if (typeof formData.items === 'string' && formData.items.trim() !== '') {
                                // If items is a string, display it directly
                                return (
                                  <span className="block font-medium">{formData.items}</span>
                                );
                              } else {
                                return <span className="block font-medium">No items specified</span>;
                              }
                            })()}
                          </div>
                        </div>
                        <div>
                          <span className="block text-sm text-gray-500 dark:text-gray-400">Total Amount</span>
                          <span className="block font-medium">₹{formData.totalAmount || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="block text-sm text-gray-500 dark:text-gray-400">Payment Method</span>
                          <span className="block font-medium">{formData.paymentMethod || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="block text-sm text-gray-500 dark:text-gray-400">Pickup Location</span>
                          <span className="block font-medium">{formData.location || 'Not specified'}</span>
                        </div>
                      </>
                    )}
                    
                    {/* Sports specific details */}
                    {formData.service?.toLowerCase() === 'sports facilities' && (
                      <>
                        <div>
                          <span className="block text-sm text-gray-500 dark:text-gray-400">Facility</span>
                          <span className="block font-medium">{formData.facility || formData.facilityName || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="block text-sm text-gray-500 dark:text-gray-400">Booking Type</span>
                          <span className="block font-medium">{formData.bookingType || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="block text-sm text-gray-500 dark:text-gray-400">Sport/Activity</span>
                          {formData.bookingType === 'facility' ? (
                            <span className="block font-medium">{formData.facilityName || 'Not specified'}</span>
                          ) : formData.bookingType === 'equipment' ? (
                            <div className="block font-medium">
                              {(() => {
                                if (typeof formData.equipmentList === 'object' && formData.equipmentList !== null) {
                                  return Object.entries(formData.equipmentList)
                                    .map(([key, value]) => `${key}: ${value}`)
                                    .join(', ');
                                }
                                return formData.equipmentList || 'Not specified';
                              })()}
                            </div>
                          ) : (
                            <span className="block font-medium">{formData.sport || formData.activity || 'Not specified'}</span>
                          )}
                        </div>
                        <div>
                          <span className="block text-sm text-gray-500 dark:text-gray-400">Number of Participants</span>
                          <span className="block font-medium">{formData.numberOfPeople || formData.participants || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="block text-sm text-gray-500 dark:text-gray-400">Purpose</span>
                          <span className="block font-medium">{formData.purpose || 'Not specified'}</span>
                        </div>
                      </>
                    )}
                    
                    {/* Stationery specific details */}
                    {formData.service?.toLowerCase() === 'stationery' && (
                      <>
                        <div>
                          <span className="block text-sm text-gray-500 dark:text-gray-400">Items Requested</span>
                          <div className="mt-1">
                            {(() => {
                              const items = formData.items || formData.selectedItems || [];
                              
                              if (Array.isArray(items) && items.length > 0) {
                                return (
                                  <div className="space-y-2 mt-2">
                                    {items.map((item, index) => (
                                      <div key={index} className={`p-2 rounded ${isDarkMode ? 'bg-gray-600' : 'bg-gray-100'}`}>
                                        <div className="flex justify-between items-center">
                                          <span className="font-medium">{item.name || item.itemName}</span>
                                          <span>Qty: {item.quantity || 1}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                );
                              } else if (typeof formData.itemsList === 'string') {
                                return <span className="block font-medium">{formData.itemsList}</span>;
                              } else if (formData.itemsSummary) {
                                return <span className="block font-medium">{formData.itemsSummary}</span>;
                              } else {
                                return <span className="block font-medium">No items specified</span>;
                              }
                            })()}
                          </div>
                        </div>
                        <div>
                          <span className="block text-sm text-gray-500 dark:text-gray-400">Purpose</span>
                          <span className="block font-medium">{formData.purpose || 'Not specified'}</span>
                        </div>
                      </>
                    )}
                    
                    {/* Common notes field */}
                    <div>
                      <span className="block text-sm text-gray-500 dark:text-gray-400">Additional Notes</span>
                      <span className="block font-medium">{formData.additionalNotes || formData.notes || 'None'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default FormDetailsPopup; 