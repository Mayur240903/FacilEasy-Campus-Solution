# FacilEasy - Campus Facility Management System

## Introduction
FacilEasy is a web-based platform for managing college campus facilities, offering features like auditorium booking, canteen services, sports facility booking, stationery requests, and more. The system streamlines access to these services for students, staff, and faculty, improving the overall campus experience.

## Features
- **Multi-role Access**: Student, Faculty, and Admin interfaces
- **Auditorium Booking**: Reserve auditoriums for events and activities
- **Canteen Services**: Order food online from campus canteens
- **Sports Facility Booking**: Reserve sports courts and equipment
- **Stationery Requests**: Request stationery items for academic use
- **Responsive Design**: Works on desktop and mobile devices
- **Dark/Light Mode**: User-selectable theme preferences

## Requirements
- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)
- Firebase account (for backend services)

## Installation
1. Clone the repository:
   ```
   git clone (url)
   cd FacilEasy/Frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure Firebase:
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication, Firestore, and Storage services
   - Update the Firebase configuration in `src/firebase/config.js` if needed

4. Start the development server:
   ```
   npm run dev
   ```

5. Build for production:
   ```
   npm run build
   ```

## User Manual

### For All Users
1. **Registration and Login**:
   - Navigate to the registration page to create an account
   - Select the appropriate role (Student/Faculty)
   - Complete the registration form with valid details
   - Use your credentials to log in

2. **Theme Toggle**:
   - Click the theme toggle button in the navigation bar to switch between light and dark modes

### For Students
1. **Dashboard**:
   - After login, you'll be directed to the student dashboard
   - View all available services and your recent bookings/orders

2. **Auditorium Booking**:
   - Navigate to the Auditorium Booking section
   - Select available dates and time slots
   - Fill in event details and submit your booking request
   - Track your booking status on the dashboard

3. **Canteen Orders**:
   - Browse the canteen menu
   - Add items to your cart
   - Specify pickup time and any special instructions
   - Complete payment and track your order status

4. **Sports Facility Booking**:
   - Browse available sports facilities
   - Check availability for specific dates and times
   - Make reservations and receive confirmation
   - Cancel bookings if needed (subject to cancellation policy)

5. **Stationery Requests**:
   - Browse available stationery items
   - Create a request with required quantities
   - Submit for approval
   - Check request status on the dashboard

### For Faculty
1. **Dashboard**:
   - Access faculty-specific features
   - View and manage your bookings and requests
   - Access additional privileges for facility booking

### For Administrators
1. **Service Management**:
   - Access dedicated admin dashboards for each service
   - Approve or reject booking/order requests
   - Manage facility availability and schedules
   - Generate reports and analytics

2. **User Management**:
   - Manage user accounts and roles
   - Address user concerns and feedback

## Troubleshooting
- **Login Issues**: Ensure you're using the correct credentials and role
- **Booking Failures**: Check if the selected facility is available for the requested time
- **Page Loading Issues**: Clear browser cache or try a different browser

## Development
- Run development server: `npm run dev`
- Check linting issues: `npm run lint`
- Build for production: `npm run build`
- Preview production build: `npm run preview`

## Technologies Used
- React
- Firebase (Authentication, Firestore, Storage)
- Tailwind CSS
- Vite
- Framer Motion
- React Router DOM

##Develop by
-Mayur Chaudhari

## Contact
-Email: mayurchaudhari2409@gmail.com
 
