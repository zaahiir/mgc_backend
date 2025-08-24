# Comprehensive Tee-Booking Workflow

## 1. Page Initialization

### Course & Tee Setup
- When tee-booking page loads, system displays all available tees for the selected course
- **Initial State:** Only tee list is shown, no slots displayed
- Each tee operates independently with its own time slots
- **Slot Structure (not shown initially):**
  - Operating hours: 06:00 to 19:00 (UK time format)
  - Slot duration: 8 minutes each
  - Time slots: 06:00, 06:08, 06:16, 06:24, 06:32... up to 19:00
  - Each slot can accommodate 1-4 participants maximum
  - All times displayed in 24-hour format (UK standard)

## 2. Tee Selection & Date Navigation

### Initial Display
- User clicks/selects a tee from available options
- **Only after tee selection:** System shows slots for current date
- **Calendar Restrictions:**
  - Only 7 days available: current date + next 6 days
  - All other dates grayed out/disabled
  - Current date automatically selected by default
- **Current Day Slot Filtering:**
  - Shows only slots after current time (e.g., if current time is 10:30, shows slots from 10:32 onwards)
  - Past time slots for current date are hidden/disabled
  - All times in 24-hour UK format

### Date Changes
- When user changes date in calendar, system shows slots for that specific date
- **Session Management:**
  - Selected slots stored with their respective dates in browser session
  - When switching dates, previously selected slots for that date display as "Selected"
  - Session persists during page refresh or tee changes

### Tee Changes
- When switching tees, system applies same date-based slot restoration
- Each tee maintains separate slot selections per date

## 3. Unified Slot Selection & Management System

### Slot Status Indicators (Frontend Display)
- **Available** - 0 participants (green/default color)
- **Partially Available** - 1-3 participants (yellow/orange color) 
- **Selected** - User's chosen slots (blue/highlighted color) - **Frontend Only State**
- **Fully Booked** - 4 participants or under review (gray/disabled, not clickable)

### Frontend Slot Selection Process

#### Single Click Selection (Frontend Handling)
- User clicks on available/partially available slot
- **Frontend Immediate Actions:**
  1. Slot instantly changes to "Selected" status (blue/highlighted color) - **Visual feedback only**
  2. Slot details stored in **frontend session storage**: `{date: selectedDate, tee: selectedTee, time: slotTime, participants: 1}`
  3. Booking summary automatically updates with new slot entry - **Frontend display only**
  4. Default participant count: 1 (modifiable in frontend before booking)
  5. **No backend API calls during selection** - purely frontend state management

#### Frontend Slot Storage Structure
```json
{
  "selectedSlots": [ // Frontend session storage only
    {
      "id": "unique_slot_id", // Generated as: {date}_{tee}_{time}
      "date": "2025-08-22",
      "tee": "Tee 1", 
      "time": "06:00", // 24-hour UK format
      "participants": 2, // User's requested participants
      "courseName": "Pine Valley Golf Course",
      "originalStatus": "available", // Store original slot status
      "isTemporarySelection": true, // Flag indicating frontend-only selection
      "isJoinRequest": false // Will create confirmed booking
    },
    {
      "id": "2025-08-23_Tee 2_08:56",
      "date": "2025-08-23", 
      "tee": "Tee 2",
      "time": "08:56", // 24-hour UK format
      "participants": 1, // User's requested participants
      "courseName": "Pine Valley Golf Course",
      "originalStatus": "partially_available", // 2 participants already exist
      "currentParticipants": 2, // Existing participants in slot
      "isTemporarySelection": true,
      "isJoinRequest": true // Will create join request, not confirmed booking
    }
  ]
}
```

### Frontend Slot Deselection Process

#### Individual Slot Removal (Frontend Only)
- **Method 1 - Click Selected Slot:** User clicks on already selected (blue) slot
  1. Slot instantly reverts to original status (Available/Partially Available) - **Visual only**
  2. Slot removed from frontend selectedSlots array using unique slot ID
  3. Booking summary automatically updates (slot entry removed) - **Frontend display**
  4. **No backend communication** - purely frontend state change

- **Method 2 - Remove from Booking Summary:** User clicks remove/delete button
  1. Same frontend-only logic as Method 1
  2. Slot in time grid changes back to original visual status
  3. Entry removed from frontend booking summary

### Frontend Clear All Functionality  
- **"Clear All Slots" Button** in booking summary section
- **Frontend Action Logic:**
  1. Clear entire selectedSlots array from frontend session storage
  2. All selected slots (blue) in time grid revert to original visual status
  3. Booking summary becomes empty - **Frontend display reset**
  4. **No backend API calls** - purely frontend state management

## 4. Frontend Booking Summary Management

### Real-Time Frontend Summary Display
- Shows all frontend-selected slots organized by tee name
- **Frontend Auto-Update Triggers:**
  - Slot selection: Immediate frontend addition
  - Slot deselection: Immediate frontend removal  
  - Clear all: Complete frontend summary reset
  - Date/tee switching: Shows relevant frontend selected slots

### Frontend Summary Format
```
Tee 1:
  22-Aug-2025: 06:00 (2p) [Edit] [Remove] // Will create confirmed booking
  22-Aug-2025: 15:26 (1p) [Edit] [Remove] // Will create confirmed booking

Tee 2:
  21-Aug-2025: 06:00 (3p) [Edit] [Remove] // Will create confirmed booking  
  23-Aug-2025: 08:56 (1p) [Edit] [Remove] // Will create JOIN REQUEST (partially available slot)

[Clear All Slots] [Book Tee Time] // Book button triggers backend process
```

**Note:** Frontend booking summary shows all selections equally, but backend will process them differently:
- **Available slots** → Confirmed bookings
- **Partially available slots** → Join requests (Pending status)

### Frontend Slot Modification in Summary
- **Edit Button:** Opens participant count modal - **Frontend interaction**
  - Pre-selected with current participant count from frontend storage
  - Update participant count (1-4) in frontend state only
  - Slot details (date, tee, time) displayed for reference
  - Changes saved to frontend selectedSlots array only
- **Remove Button:** Individual slot removal (frontend state management)

## 5. Frontend-Backend Separation

### Frontend Responsibilities
- **Slot Selection Visual Feedback:** Immediate color changes and UI updates
- **Booking Summary Display:** Real-time summary of user selections
- **Session State Management:** Maintain selected slots in browser storage
- **Participant Count Modification:** Allow user to adjust participant numbers
- **Validation:** Basic frontend validation (participant limits, date restrictions)

### Backend Responsibilities  
- **Slot Availability Data:** Provide real-time slot status (Available/Partially Available/Fully Booked)
- **Booking Processing:** Handle actual booking creation and validation
- **Join Request Management:** Process requests for partially available slots
- **Conflict Resolution:** Server-side validation and conflict prevention
- **Notification System:** Send notifications for booking confirmations and requests

## 5. State Synchronization System

### Cross-Component Updates
- **Time Grid ↔ Booking Summary:** Bidirectional synchronization
- **Date Navigation:** Maintains selected state across date changes
- **Tee Navigation:** Maintains selected state across tee changes

### Visual State Management
```javascript
// Slot rendering logic
function renderSlot(slotTime, slotDate, selectedTee) {
  const slotId = `${slotDate}_${selectedTee}_${slotTime}`;
  const isSelected = selectedSlots.find(slot => slot.id === slotId);
  
  return {
    status: isSelected ? 'selected' : getOriginalStatus(slotTime),
    color: isSelected ? 'blue' : getOriginalColor(slotTime),
    clickable: true // All available and selected slots are clickable
  };
}
```

### Session Persistence Rules
- **Selected slots persist:** Page refresh, tee changes, date navigation
- **Slots cleared on:** Successful booking completion, browser session end
- **Real-time validation:** Check slot availability before final booking

## 6. Backend Booking Execution Process

### Booking Initiation
- User clicks "Book Tee Time" button after making frontend selections
- **Frontend to Backend Handoff:**
  1. Frontend collects all selected slots from session storage
  2. Frontend sends booking request to backend API with slot details
  3. Frontend shows loading state during backend processing

### Backend Processing Logic
- **Step 1 - Slot Availability Validation:**
  - Backend validates each selected slot's current availability status
  - Checks for conflicts with other users' bookings
  - Returns validation results to frontend

- **Step 2 - Booking Creation:**
  - **Available Slots (0 participants):** 
    - Create immediate booking records
    - Generate unique booking IDs (MGCBK25AUG00001)
    - Update slot status in database
    - Mark as "Confirmed" status
  
  - **Partially Available Slots (1-3 participants):**
    - Create join request records  
    - Generate request IDs (MGCBK25AUG00002)
    - Mark as "Pending Approval" status
    - Send notifications to original bookers
    - Update slot status to "Under Review"

### Backend Response Handling
- Backend returns booking results to frontend:
```json
{
  "success": true,
  "confirmedBookings": [
    {
      "bookingId": "MGCBK25AUG00001", 
      "status": "Confirmed",
      "slotDetails": {...}
    }
  ],
  "pendingRequests": [
    {
      "requestId": "MGCBK25AUG00002",
      "status": "Pending Approval", 
      "slotDetails": {...}
    }
  ]
}
```

### Post-Booking Frontend Cleanup
- **After Successful Backend Response:**
  1. Clear selectedSlots array from frontend session storage
  2. Reset all blue/selected slots in time grid to original visual status
  3. Clear frontend booking summary
  4. Display backend-provided confirmation details
  5. Redirect to confirmation page

## 7. Backend Confirmation & Frontend Display

### Backend Booking Execution
- User clicks "Book Tee Time" button (triggers backend API call)
- **Backend Processing:**
  - Validates all selected slots for continued availability
  - Handles slot conflicts and availability changes
  - Processes available and partially available slots differently
  - Generates booking IDs and request IDs

### Frontend Post-Booking State Management
- **Automatic Frontend Cleanup After Backend Success:**
  1. Clear selectedSlots array from frontend session storage
  2. All blue/selected slots in time grid reset to original visual status  
  3. Frontend booking summary cleared completely
  4. User redirected to confirmation page with backend data

### Backend-Generated Confirmation Display
```
Success: Tee time has been booked successfully!
Course: Pine Valley Golf Course

Confirmed Bookings: (Backend-generated data)
Tee 1:
  22-Aug-2025: 06:00 (2p) - Booking ID: MGCBK25AUG00001 [Confirmed]
  22-Aug-2025: 15:26 (1p) - Booking ID: MGCBK25AUG00003 [Confirmed]
  
Pending Join Requests: (Backend-generated data)  
Tee 2:
  23-Aug-2025: 08:56 (1p) - Request ID: MGCBK25AUG00002 [Pending Approval]
  
Note: Join requests will appear as "PENDING REQUEST" status in your Orders page.
```

## 8. Frontend State Management vs Backend Data

### Frontend Responsibilities (Session-Based)
- **Temporary Slot Selections:** Visual feedback and booking summary
- **User Interface State:** Selected slot colors, booking summary display
- **Session Persistence:** Maintain selections across page navigation
- **Input Validation:** Participant count limits, basic date validation

### Backend Responsibilities (Database-Based)
- **Persistent Booking Records:** Actual booking creation and storage
- **Slot Availability Management:** Real-time availability updates
- **Conflict Resolution:** Handle simultaneous booking attempts
- **Join Request Processing:** Manage partially available slot requests
- **Notification Generation:** Send booking confirmations and request notifications

### Data Flow Separation
```
Frontend: User Selection → Session Storage → Booking Summary Display
                                    ↓
Backend:  API Request → Validation → Database Update → Response
                                    ↓  
Frontend: Clear Session → Display Backend Results → Redirect
```

## 8. Error Handling & Edge Cases

### Slot Availability Changes
- **Real-time Updates:** Other users' bookings update slot status immediately
- **Selection Conflicts:** If selected slot becomes unavailable, notify user and remove from selection
- **Validation Feedback:** Clear messaging for booking conflicts

### Data Integrity
- **Unique Slot Identification:** Prevents duplicate selections for same slot
- **Cross-session Validation:** Server-side checks prevent overbooking
- **Graceful Degradation:** Handle network issues and server errors

## 9. Technical Implementation - Frontend vs Backend

### Frontend State Management Structure
```javascript
// Frontend-only state for slot selections
const [selectedSlots, setSelectedSlots] = useState([]);

// Frontend slot selection function (no backend calls)
function selectSlot(date, tee, time, courseName, originalStatus) {
  const slotId = `${date}_${tee}_${time}`;
  const newSlot = {
    id: slotId,
    date,
    tee, 
    time,
    participants: 1, // Default, modifiable in frontend
    courseName,
    originalStatus, // Store for visual revert
    isTemporarySelection: true // Frontend-only flag
  };
  
  // Frontend state update only
  setSelectedSlots(prev => [...prev, newSlot]);
  // Frontend session storage only
  sessionStorage.setItem('selectedSlots', JSON.stringify([...selectedSlots, newSlot]));
}

// Frontend slot removal function (no backend calls)
function deselectSlot(slotId) {
  // Frontend state update only
  setSelectedSlots(prev => prev.filter(slot => slot.id !== slotId));
  // Frontend session storage update
  const updatedSlots = selectedSlots.filter(slot => slot.id !== slotId);
  sessionStorage.setItem('selectedSlots', JSON.stringify(updatedSlots));
}

// Frontend clear all function (no backend calls)
function clearAllSlots() {
  // Frontend state reset only
  setSelectedSlots([]);
  // Frontend session storage clear
  sessionStorage.removeItem('selectedSlots');
}

// Backend booking function (only API call to backend)
async function bookSelectedSlots() {
  try {
    // Send frontend selections to backend
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        selectedSlots: selectedSlots,
        userId: currentUserId
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Clear frontend state after successful backend booking
      clearAllSlots();
      // Display backend results
      showConfirmation(result.confirmedBookings, result.pendingRequests);
    }
  } catch (error) {
    // Handle booking errors
    showError('Booking failed. Please try again.');
  }
}
```

### Backend API Endpoints

#### Slot Availability (GET)
```javascript
// GET /api/slots/:courseId/:teeId/:date
// Returns real-time slot availability data
{
  "slots": [
    {
      "time": "06:00", // 24-hour UK format
      "status": "available", // available, partially_available, fully_booked
      "currentParticipants": 0,
      "maxParticipants": 4
    },
    {
      "time": "08:32", // 24-hour UK format
      "status": "partially_available",
      "currentParticipants": 2,
      "maxParticipants": 4
    }
  ]
}
```

#### Booking Creation (POST) 
```javascript
// POST /api/bookings
// Processes frontend selections and creates actual bookings
{
  "selectedSlots": [...], // From frontend
  "userId": "user123"
}

// Response:
{
  "success": true,
  "confirmedBookings": [...], // With backend-generated booking IDs
  "pendingRequests": [...], // With backend-generated request IDs
  "errors": [] // Any slot conflicts or issues
}
```

### Frontend Visual State Rendering
```javascript
// Frontend slot rendering with backend data
function renderSlot(slotTime, slotDate, selectedTee, backendSlotData) {
  const slotId = `${slotDate}_${selectedTee}_${slotTime}`;
  const isSelected = selectedSlots.find(slot => slot.id === slotId);
  
  return {
    // Frontend selection state takes precedence for visual display
    status: isSelected ? 'selected' : backendSlotData.status,
    color: isSelected ? 'blue' : getStatusColor(backendSlotData.status),
    clickable: backendSlotData.status !== 'fully_booked',
    participants: backendSlotData.currentParticipants
  };
}
```

## 10. Orders Component Management

### Booking Statistics Dashboard
- **Dynamic Counters (Auto-updating):**
  - Total Bookings: [Number]
  - Confirmed: [Number] 
  - Pending Requests: [Number]
  - Requests Accepted: [Number]
  - Accept/Reject Actions Available: [Number]
  - Cancelled: [Number]
- **Filter Options:** Filter by status type

### Bookings Table Structure
| Booking ID | Booked Date | Course Name | Tee | Slot Date | Slot Time | Participants | Status | Action |
|------------|-------------|-------------|-----|-----------|-----------|--------------|--------|--------|
| MGCBK25AUG00001 | 20-Aug-2025 | Pine Valley | Tee 1 | 22-Aug-2025 | 06:00 | 2 | Confirmed | View Details |
| MGCBK25AUG00002 | 20-Aug-2025 | Pine Valley | Tee 1 | 21-Aug-2025 | 08:56 | 1 | Pending | View Details |

### Join Request Management
- **Incoming Requests:** Manage requests from other users
- **Approval Workflow:** Accept/reject with notifications
- **Status Tracking:** Monitor request states and history

## 11. Notification Management System

### Header Notification Display
- **Notification Bell/Icon** with unread count badge
- **Real-time Updates:** Immediate notification appearance
- **Click Actions:** Mark as read and redirect to /orders

### Notification Types
1. **Join Request Received:** "New join request for [Course] - [Tee] on [Date] at [Time]" (24-hour format)
2. **Join Request Approved:** "Your join request approved for [Course] - [Tee] on [Date] at [Time]" (24-hour format)  
3. **Join Request Rejected:** "Your join request rejected for [Course] - [Tee] on [Date] at [Time]" (24-hour format)

### Notification Integration
- **Auto-redirect:** All notifications lead to /orders page
- **Status Updates:** Real-time reflection of request states
- **Persistent Storage:** Maintain until manual clear or expiration