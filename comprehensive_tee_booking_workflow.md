# Comprehensive Tee-Booking Workflow

## 1. Page Initialization

### Course & Tee Setup
- When tee-booking page loads, system displays all available tees for the selected course
- **Initial State:** Only tee list is shown, no slots displayed
- Each tee operates independently with its own time slots
- **Slot Structure (not shown initially):**
  - Operating hours: 6:00 AM to 7:00 PM
  - Slot duration: 8 minutes each
  - Time slots: 6:00, 6:08, 6:16, 6:24, 6:32... up to 7:00 PM
  - Each slot can accommodate 1-4 participants maximum

## 2. Tee Selection & Date Navigation

### Initial Display
- User clicks/selects a tee from available options
- **Only after tee selection:** System shows slots for current date
- **Calendar Restrictions:**
  - Only 7 days available: current date + next 6 days
  - All other dates grayed out/disabled
  - Current date automatically selected by default
- **Current Day Slot Filtering:**
  - Shows only slots after current time (e.g., if current time is 10:30 AM, shows slots from 10:32 AM onwards)
  - Past time slots for current date are hidden/disabled

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

### Slot Status Indicators
- **Available** - 0 participants (green/default color)
- **Partially Available** - 1-3 participants (yellow/orange color)
- **Selected** - User's chosen slots (blue/highlighted color)
- **Fully Booked** - 4 participants or under review (gray/disabled, not clickable)

### Slot Selection Process

#### Single Click Selection (Simplified Flow)
- User clicks on available/partially available slot
- **Immediate Selection Logic:**
  1. Slot instantly changes to "Selected" status (blue/highlighted color)
  2. Slot details stored in session: `{date: selectedDate, tee: selectedTee, time: slotTime, participants: 1}`
  3. Booking summary automatically updates with new slot entry
  4. Default participant count: 1 (can be modified later)

#### Slot Storage Structure
```json
{
  "selectedSlots": [
    {
      "id": "unique_slot_id", // Generated as: {date}_{tee}_{time}
      "date": "2025-08-22",
      "tee": "Tee 1",
      "time": "6:00",
      "participants": 1,
      "courseName": "Pine Valley Golf Course"
    },
    {
      "id": "2025-08-23_Tee 2_8:56",
      "date": "2025-08-23", 
      "tee": "Tee 2",
      "time": "8:56",
      "participants": 2,
      "courseName": "Pine Valley Golf Course"
    }
  ]
}
```

### Slot Deselection Process

#### Individual Slot Removal
- **Method 1 - Click Selected Slot:** User clicks on already selected (blue) slot
  1. Slot instantly changes back to original status (Available/Partially Available)
  2. Slot removed from selectedSlots array using unique slot ID
  3. Booking summary automatically updates (slot entry removed)
  4. Visual state immediately reflects deselection

- **Method 2 - Remove from Booking Summary:** User clicks remove/delete button in booking summary
  1. Same logic as Method 1
  2. Slot in time grid changes back to original status
  3. Entry removed from booking summary

### Clear All Functionality
- **"Clear All Slots" Button** in booking summary section
- **Action Logic:**
  1. Clear entire selectedSlots array from session storage
  2. All selected slots (blue) in time grid revert to original status
  3. Booking summary becomes empty
  4. Visual reset across all dates and tees

## 4. Booking Summary Management

### Real-Time Summary Display
- Shows all selected slots organized by tee name
- **Auto-Update Triggers:**
  - Slot selection: Immediate addition
  - Slot deselection: Immediate removal  
  - Clear all: Complete summary reset
  - Date/tee switching: Shows relevant selected slots

### Summary Format
```
Tee 1:
  22-Aug-2025: 6:00 (1p) [Edit] [Remove]
  21-Aug-2025: 8:56 (2p) [Edit] [Remove]
  22-Aug-2025: 15:26 (1p) [Edit] [Remove]

Tee 2:
  21-Aug-2025: 6:00 (3p) [Edit] [Remove]
  24-Aug-2025: 8:56 (1p) [Edit] [Remove]

[Clear All Slots] [Book Tee Time]
```

### Slot Modification in Summary
- **Edit Button:** Opens participant count modal
  - Pre-selected with current participant count
  - Update participant count (1-4)
  - Slot details (date, tee, time) displayed for reference
  - Changes saved to selectedSlots array
- **Remove Button:** Individual slot removal (same as clicking selected slot)

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

## 6. Multi-Slot Booking System

### Selection Flexibility
- Users can select multiple slots across:
  - Different dates (within 7-day window)
  - Different tees
  - Different times
- Each selection stored separately with unique identifier

### Booking Validation
- **Pre-booking Check:** Validate all selected slots still available
- **Conflict Prevention:** Server-side validation during booking process
- **Mixed Processing:** Handle available and partially available slots differently

## 7. Booking Confirmation Process

### Booking Execution
- User clicks "Book Tee Time" button
- System validates all selected slots for continued availability
- **Processing Logic:**
  - **Available Slots:** Complete booking immediately, generate booking IDs
  - **Partially Available Slots:** Create join requests with "Pending" status

### Post-Booking Cleanup
- **Automatic State Reset:**
  1. Clear selectedSlots array from session storage
  2. All blue/selected slots in time grid reset to original status
  3. Booking summary cleared
  4. User redirected to confirmation page

### Confirmation Display
```
Success: Tee time has been booked successfully!
Course: Pine Valley Golf Course

Confirmed Bookings:
Tee 1:
  22-Aug-2025: 6:00 (2p) - Booking ID: MGCBK25AUG00001 [Confirmed]
  
Pending Requests:
Tee 1:
  21-Aug-2025: 8:56 (1p) - Request ID: MGCBK25AUG00002 [Pending Approval]
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

## 9. Technical Implementation Notes

### State Management Structure
```javascript
// Global state for selected slots
const [selectedSlots, setSelectedSlots] = useState([]);

// Add slot function
function selectSlot(date, tee, time, courseName) {
  const slotId = `${date}_${tee}_${time}`;
  const newSlot = {
    id: slotId,
    date,
    tee, 
    time,
    participants: 1,
    courseName
  };
  
  setSelectedSlots(prev => [...prev, newSlot]);
  // Update session storage
  sessionStorage.setItem('selectedSlots', JSON.stringify([...selectedSlots, newSlot]));
}

// Remove slot function  
function deselectSlot(slotId) {
  setSelectedSlots(prev => prev.filter(slot => slot.id !== slotId));
  // Update session storage
  const updatedSlots = selectedSlots.filter(slot => slot.id !== slotId);
  sessionStorage.setItem('selectedSlots', JSON.stringify(updatedSlots));
}

// Clear all function
function clearAllSlots() {
  setSelectedSlots([]);
  sessionStorage.removeItem('selectedSlots');
}
```

### Performance Considerations
- **Efficient Rendering:** Only re-render affected slots on selection changes
- **Memory Management:** Clean up event listeners and state on component unmount
- **Debounced Updates:** Prevent excessive API calls during rapid selections

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
| MGCBK25AUG00001 | 20-Aug-2025 | Pine Valley | Tee 1 | 22-Aug-2025 | 6:00 AM | 2 | Confirmed | View Details |

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
1. **Join Request Received:** "New join request for [Course] - [Tee] on [Date] at [Time]"
2. **Join Request Approved:** "Your join request approved for [Course] - [Tee] on [Date] at [Time]"
3. **Join Request Rejected:** "Your join request rejected for [Course] - [Tee] on [Date] at [Time]"

### Notification Integration
- **Auto-redirect:** All notifications lead to /orders page
- **Status Updates:** Real-time reflection of request states
- **Persistent Storage:** Maintain until manual clear or expiration