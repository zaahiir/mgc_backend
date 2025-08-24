# Orders Component - Booking Management Workflow

## 1. Orders Dashboard Overview

### Statistics Cards Layout
The Orders component displays 6 dynamic counters at the top of the page:

```
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  📅 TOTAL       │ │  ✅ CONFIRMED   │ │  ⚠️ PENDING     │
│      8          │ │      8          │ │  REQUESTS  0    │
│   BOOKINGS      │ │                 │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘

┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  👥 REQUESTS    │ │  ℹ️ ACCEPT/     │ │  ❌ CANCELLED   │
│  ACCEPTED  0    │ │  REJECT  0      │ │      0          │
│                 │ │   ACTIONS       │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### Dynamic Counter Logic
- **TOTAL BOOKINGS:** Total count of all user's bookings regardless of status
- **CONFIRMED:** Bookings with "Confirmed" status (own bookings + approved join requests)
- **PENDING REQUESTS:** User's join requests awaiting approval from original bookers
- **REQUESTS ACCEPTED:** Join requests that were approved (subset of Confirmed)
- **ACCEPT/REJECT ACTIONS:** Incoming join requests requiring user action
- **CANCELLED:** Bookings that have been cancelled

## 2. Filter & Display System

### Filter Options
```
Filter by Status: [All Bookings (8)] [Refresh]
```

Available filter options:
- **All Bookings (X)** - Shows all bookings with total count
- **Confirmed (X)** - Shows only confirmed bookings
- **Pending Requests (X)** - Shows only pending join requests
- **Requests to Review (X)** - Shows only incoming requests needing action
- **Cancelled (X)** - Shows only cancelled bookings

### Refresh Functionality
- **Refresh Button:** Updates all counters and table data
- **Auto-refresh:** Counters update automatically when actions are performed
- **Real-time Updates:** Statistics reflect immediate changes

## 3. Bookings Table Structure

### Table Headers
| BOOKING ID | BOOKED DATE | COURSE NAME | TEE | SLOT DATE | SLOT TIME | PARTICIPANTS | STATUS | ACTION |
|------------|-------------|-------------|-----|-----------|-----------|--------------|--------|--------|

### Table Data Examples

#### Own Confirmed Booking (Partially Filled)
```
| MGCBK25AUG00088 | 24 Aug 25 | Master Golf Club - Downtown | 18 Holes | 26 Aug 25 | 18:40 | 2 players (2 spots left) | CONFIRMED | + Add Participants |
```

#### Own Confirmed Booking (Full)
```
| MGCBK25AUG00089 | 24 Aug 25 | Pine Valley Golf Course | Tee 1 | 27 Aug 25 | 14:32 | 4 players | CONFIRMED | View Details |
```

#### Pending Join Request (Outgoing)
```
| MGCBK25AUG00002 | 24 Aug 25 | Pine Valley Golf Course | Tee 2 | 23 Aug 25 | 08:56 | 1 player | PENDING REQUEST | View Details |
```

#### Join Request Approved (Now Confirmed)
```
| MGCBK25AUG00002 | 24 Aug 25 | Pine Valley Golf Course | Tee 2 | 23 Aug 25 | 08:56 | 1 player | CONFIRMED | View Details |
```

#### Incoming Join Request (Needs Action)
```
| MGCBK25AUG00091 | 24 Aug 25 | Championship Course | Tee 3 | 29 Aug 25 | 16:24 | 3 players | REVIEW REQUEST | Accept / Reject |
```

## 4. Booking Status Types & Actions

### 4.1 CONFIRMED - Own Booking (Partially Filled)
- **Display:** Green "CONFIRMED" badge
- **Participants:** "X players (Y spots left)" where Y = 4-X
- **Action Button:** "+ Add Participants" (Green button)
- **Modal Trigger:** Opens "Add Participants" modal

### 4.2 CONFIRMED - Own Booking (Full)
- **Display:** Green "CONFIRMED" badge  
- **Participants:** "4 players"
- **Action Button:** "View Details" (Blue/Gray button)
- **Modal Trigger:** Opens "Booking Details" modal (read-only)

### 4.3 PENDING REQUEST - Join Request Awaiting Approval (Outgoing)
- **Display:** Orange/Yellow "PENDING REQUEST" badge
- **Participants:** Shows user's requested participant count for the slot
- **Action Button:** "View Details" 
- **Modal Content:** Shows request status, original booker info, and current slot occupancy
- **Created When:** User selects partially available slot in tee booking
- **Status Change:** Becomes "CONFIRMED" when approved, or gets removed when rejected

### 4.4 CONFIRMED - Approved Join Request
- **Display:** Green "CONFIRMED" badge
- **Participants:** Shows user's participant count in the slot (not total slot participants)
- **Action Button:** "View Details"
- **Note:** Cannot add more participants (not original booker)
- **Previous Status:** Was "PENDING REQUEST" until approved by original booker

### 4.5 REVIEW REQUEST - Incoming Join Request
- **Display:** Purple "REVIEW REQUEST" badge
- **Participants:** Shows original booking + requested participants
- **Action Buttons:** "Accept" (Green) / "Reject" (Red) buttons
- **Modal Trigger:** Opens "Review Join Request" modal

### 4.6 CANCELLED
- **Display:** Red "CANCELLED" badge
- **Participants:** Shows cancelled participant count
- **Action Button:** "View Details"
- **Modal Content:** Cancellation details and refund info

## 5. Modal Systems

### 5.1 Add Participants Modal (Own Partially Filled Bookings)

#### Modal Structure
```
┌─────────────────────────────────────┐
│        Add More Participants        │
├─────────────────────────────────────┤
│ Course: Master Golf Club            │
│ Tee: 18 Holes                      │
│ Date: 26 Aug 25                     │  
│ Time: 18:40                         │
│ Current: 2 participants             │
│ Available: 2 spots remaining        │
│                                     │
│ Add Participants: [Dropdown 1-2]    │
│                                     │
│          [Cancel] [Add Participants] │
└─────────────────────────────────────┘
```

#### Modal Logic
- **Dropdown Range:** 1 to (4 - current participants)
- **Validation:** Ensures total doesn't exceed 4 participants
- **Backend Call:** Updates booking with additional participants
- **Success Action:** Updates table display and counters

### 5.2 Review Join Request Modal (Incoming Requests)

#### Modal Structure  
```
┌─────────────────────────────────────┐
│         Review Join Request         │
├─────────────────────────────────────┤
│ Requester: John Smith              │
│ Request Date: 24 Aug 25            │
│                                    │
│ Booking Details:                   │
│ Course: Championship Course        │
│ Tee: Tee 3                        │
│ Date: 29 Aug 25                    │
│ Time: 16:24                        │
│                                    │
│ Current Participants: 1 (You)      │
│ Requested Participants: 2          │
│ Total if Approved: 3 participants  │
│                                    │
│          [Reject] [Approve]        │
└─────────────────────────────────────┘
```

#### Modal Logic
- **Approve Action:** 
  - Updates booking status to "Confirmed"
  - Merges requester's participants with original booking
  - Sends approval notification to requester
  - Updates both users' order statistics
  - Removes from "ACCEPT/REJECT ACTIONS" counter
  
- **Reject Action:**
  - Removes join request record
  - Sends rejection notification to requester  
  - Slot returns to "partially available" status
  - Updates counters accordingly

### 5.4 Join Request Status Modal (Outgoing Pending Request)

#### Modal Structure  
```
┌─────────────────────────────────────┐
│         Join Request Status         │
├─────────────────────────────────────┤
│ Request ID: MGCBK25AUG00002        │
│ Status: PENDING APPROVAL           │
│ Requested: 24 Aug 25               │
│                                    │
│ Slot Details:                      │
│ Course: Pine Valley Golf Course    │
│ Tee: Tee 2                        │
│ Date: 23 Aug 25                    │
│ Time: 08:56                        │
│                                    │
│ Your Request: 1 participant        │
│ Current Slot: 2/4 participants     │
│ If Approved: 3/4 participants      │
│                                    │
│ Waiting for approval from:         │
│ Original Booker (Anonymous)        │
│                                    │
│               [Close]              │
└─────────────────────────────────────┘
```

#### Modal Logic for Pending Requests
- **Read-only information** about the join request
- **Shows current slot occupancy** and what it would be if approved
- **Cannot modify** participant count once request is submitted
- **Status updates** automatically when original booker approves/rejects

### 5.5 Booking Details Modal (Read-Only)

#### Modal Structure
```
┌─────────────────────────────────────┐
│          Booking Details           │
├─────────────────────────────────────┤
│ Booking ID: MGCBK25AUG00089        │
│ Status: CONFIRMED                  │
│ Booked Date: 24 Aug 25             │
│                                    │
│ Course: Pine Valley Golf Course     │
│ Tee: Tee 1                         │
│ Slot Date: 27 Aug 25               │
│ Slot Time: 14:32                   │
│ Your Participants: 2 players       │
│ Total Slot: 4/4 players           │
│                                    │
│               [Close]              │
└─────────────────────────────────────┘
```

**Note:** For approved join requests, shows "Your Participants" vs "Total Slot" to clarify user's portion of the booking.

## 6. Dynamic Counter Update Logic

### Counter Calculation Rules

#### TOTAL BOOKINGS
```javascript
totalBookings = confirmedBookings.length + pendingRequests.length + cancelledBookings.length
```

#### CONFIRMED  
```javascript
confirmed = ownBookings.filter(b => b.status === 'confirmed').length + 
           approvedJoinRequests.length
```

#### PENDING REQUESTS
```javascript  
pendingRequests = outgoingJoinRequests.filter(r => r.status === 'pending').length
```
**Note:** These are join requests created when user selects partially available slots in tee booking

#### REQUESTS ACCEPTED
```javascript
requestsAccepted = approvedJoinRequests.length
```

#### ACCEPT/REJECT ACTIONS  
```javascript
actionsRequired = incomingJoinRequests.filter(r => r.status === 'review_required').length
```

#### CANCELLED
```javascript
cancelled = allBookings.filter(b => b.status === 'cancelled').length
```

### Counter Update Triggers
- **Page Load:** Initial counter calculation
- **Join Request Approval/Rejection:** Updates multiple counters
- **Add Participants:** Updates participant display
- **New Booking Creation:** Updates TOTAL and CONFIRMED
- **Join Request Creation:** Updates PENDING REQUESTS counter (from partially available slot selection)
- **Join Request Status Change:** Updates PENDING → CONFIRMED or removes from PENDING
- **Booking Cancellation:** Updates CANCELLED and TOTAL
- **Refresh Button:** Recalculates all counters

## 7. Backend Integration

### API Endpoints

#### Get User Orders
```javascript
// GET /api/orders/:userId
{
  "ownBookings": [
    {
      "bookingId": "MGCBK25AUG00088",
      "bookedDate": "2025-08-24",
      "courseName": "Master Golf Club - Downtown", 
      "tee": "18 Holes",
      "slotDate": "2025-08-26",
      "slotTime": "18:40",
      "participants": 2,
      "maxParticipants": 4,
      "status": "confirmed",
      "canAddParticipants": true
    }
  ],
  "outgoingRequests": [
    {
      "requestId": "MGCBK25AUG00002",
      "originalBookingId": "MGCBK25AUG00001", 
      "requestDate": "2025-08-24",
      "courseName": "Pine Valley Golf Course",
      "tee": "Tee 2", 
      "slotDate": "2025-08-23",
      "slotTime": "08:56",
      "requestedParticipants": 1,
      "currentSlotParticipants": 2,
      "status": "pending", // pending, approved, rejected
      "originalBookerInfo": "Anonymous" // Privacy protection
    }
  ],
  "incomingRequests": [...],
  "statistics": {
    "total": 8,
    "confirmed": 8, 
    "pending": 0,
    "accepted": 0,
    "actionsRequired": 0,
    "cancelled": 0
  }
}
```

#### Add Participants
```javascript
// POST /api/bookings/:bookingId/add-participants
{
  "additionalParticipants": 2
}

// Response:
{
  "success": true,
  "updatedBooking": {...},
  "message": "Participants added successfully"
}
```

#### Review Join Request
```javascript
// POST /api/join-requests/:requestId/review
{
  "action": "approve", // or "reject"
  "reviewerId": "user123"
}

// Response:
{
  "success": true,
  "action": "approve",
  "updatedBooking": {...},
  "message": "Join request approved successfully"
}
```

## 8. No Bookings State

### Empty State Display
When user has no bookings:

```
┌─────────────────────────────────────┐
│               📅                    │
│        No Bookings Found           │
│                                    │
│  You haven't made any bookings yet. │
│       Book your first tee time     │
│                                    │
│          [Book Tee Time]           │
└─────────────────────────────────────┘
```

### Statistics in Empty State
- All counters show "0"
- Filter dropdown shows "All Bookings (0)"
- Table displays empty state message
- "Book Tee Time" button redirects to tee booking page

## 9. Action Button States & Logic

### Dynamic Action Button Logic
```javascript
function getActionButton(booking) {
  switch(booking.status) {
    case 'confirmed':
      if (booking.isOwnBooking && booking.participants < 4) {
        return {
          text: '+ Add Participants',
          color: 'green',
          action: 'openAddParticipantsModal',
          enabled: booking.canAddParticipants
        };
      }
      return {
        text: 'View Details', 
        color: 'blue',
        action: 'openDetailsModal'
      };
      
    case 'pending_request':
      return {
        text: 'View Details',
        color: 'gray', 
        action: 'openDetailsModal'
      };
      
    case 'review_required':
      return {
        text: 'Accept / Reject',
        color: 'purple',
        action: 'openReviewModal'
      };
      
    case 'cancelled':
      return {
        text: 'View Details',
        color: 'gray',
        action: 'openDetailsModal'
      };
  }
}
```

### Modal Availability Rules
- **Add Participants Modal:** Only available for own confirmed bookings with < 4 participants
- **Review Request Modal:** Only available for incoming join requests
- **Details Modal:** Available for all booking types (read-only information)

### Button Disable Conditions
- **Add Participants:** Disabled if slot date has passed or if join request is pending approval
- **Accept/Reject:** Disabled during processing of approval/rejection
- **All Actions:** Disabled during API calls (loading state)

## 10. Real-Time Updates & Notifications

### Notification Integration
- **Join Request Received:** Updates "ACCEPT/REJECT ACTIONS" counter
- **Join Request Approved/Rejected:** Updates requester's "PENDING REQUESTS" counter  
- **Booking Confirmed:** Updates "CONFIRMED" counter
- **Participants Added:** Updates participant display in real-time

### Auto-Refresh Scenarios
- Every 30 seconds for incoming requests
- After any action completion (approve, reject, add participants)
- When returning from notification click
- On manual refresh button click

### Error Handling
- Network errors during action processing
- Conflict resolution (slot no longer available)
- Validation errors (participant limits exceeded)
- Graceful degradation with retry options