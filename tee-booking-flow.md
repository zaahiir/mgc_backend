# Tee-Booking Flow Documentation

## Overview
This document describes the complete tee-booking flow for the Master Golf Club application, covering both frontend and backend components. The system allows members to book golf tee times across multiple courses, tees, dates, and time slots.

## System Architecture

### Frontend Components
- **TeeBookingComponent**: Main booking interface for selecting courses, tees, dates, and time slots
- **OrdersComponent**: Displays booking history and manages existing bookings
- **CollectionService**: Handles API communication with the backend

### Backend Components
- **BookingModel**: Main booking entity with multi-slot support
- **BookingSlotModel**: Individual time slots within a booking
- **TeeModel**: Golf course tees (e.g., 9 holes, 18 holes)
- **CourseModel**: Golf courses with amenities and opening times
- **MemberModel**: Club members who make bookings

## Complete Tee-Booking Flow

### 1. Course Selection & Initialization
```
User navigates to tee-booking page
    ↓
TeeBookingComponent initializes
    ↓
Loads course data from route parameters
    ↓
Fetches available tees for the course
    ↓
Generates calendar for date selection
```

**Key Methods:**
- `loadCourseData()`: Loads course information from route parameters
- `loadAvailableTees()`: Fetches available tees for the selected course
- `generateCalendar()`: Creates calendar interface for date selection

### 2. Tee Selection
```
User selects a tee (e.g., 9 holes, 18 holes)
    ↓
selectTee() method called
    ↓
Stores current tee selection
    ↓
Loads previously selected slots for this tee/date combination
    ↓
Updates slot summary and validation
```

**Key Methods:**
- `selectTee(tee: Tee)`: Handles tee selection and state management
- `updateDateSlotSelection()`: Maintains date-based slot selections
- `validateAndCleanupSlots()`: Prevents duplicate selections

### 3. Date Selection
```
User selects a date from calendar
    ↓
selectDate() method called
    ↓
Validates date (must be within next 7 days)
    ↓
Stores current date selection
    ↓
Restores previously selected slots for this date
    ↓
Loads available time slots if tee and participants are selected
```

**Key Methods:**
- `selectDate(date: Date)`: Handles date selection and validation
- `isDayAvailable(date: Date)`: Ensures date is within booking window
- `restoreSlotSelectionState()`: Restores previous selections

### 4. Participant Selection
```
User sets number of participants (1-4)
    ↓
incrementParticipants() / decrementParticipants() called
    ↓
Updates participant count
    ↓
Reloads time slots with new participant count
    ↓
Updates slot availability calculations
```

**Key Methods:**
- `incrementParticipants()`: Increases participant count
- `decrementParticipants()`: Decreases participant count
- `loadAvailableTimeSlots()`: Fetches slots based on current selection

### 5. Time Slot Loading
```
System fetches available time slots from backend
    ↓
API call to /booking/available_slots/
    ↓
Backend generates time slots based on:
    - Course opening hours (default: 6:00 AM - 7:00 PM)
    - Slot duration (8 minutes per slot)
    - Existing bookings for the selected tee/date
    - Participant count requirements
    ↓
Frontend processes and displays available slots
```

**Backend Process:**
- `generate_time_slots()`: Creates 8-minute intervals from opening to closing
- Filters out past slots for today's bookings
- Calculates availability based on existing bookings
- Returns slots with status: 'available', 'partially_available', or 'booked'

### 6. Slot Selection
```
User clicks on available time slot
    ↓
openSlotModal() method called
    ↓
Slot modal opens with:
    - Available spots
    - Current participants
    - Participant count selector
    ↓
User confirms selection
    ↓
confirmSlotSelection() processes the booking
```

**Key Methods:**
- `openSlotModal(slot: TimeSlot)`: Opens slot selection modal
- `confirmSlotSelection()`: Processes slot selection
- `selectSingleSlotWithParticipants()`: Creates single slot booking
- `toggleMultiSelectSlotWithParticipants()`: Handles multi-slot selection

### 7. Multi-Slot Booking Support
```
System supports selecting multiple slots:
    ↓
User can select multiple time slots across different dates
    ↓
Each slot maintains:
    - Individual participant count
    - Specific date and tee information
    - Slot order and status
    ↓
Slots are grouped by date and tee for display
```

**Data Structure:**
- `selectedSlots: TimeSlot[]`: Array of all selected slots
- `dateSlotSelections: Map<string, DateSlotSelection>`: Grouped by date and tee
- Each slot includes: time, participants, date, tee, and status

### 8. Booking Creation
```
User clicks "Book Tee Time" button
    ↓
bookTeeTime() method called
    ↓
System validates:
    - Selected slots exist
    - Participant counts are valid
    - Dates are not in the past
    - User is authenticated
    ↓
Creates booking via API
```

**API Endpoints:**
- Single booking: `POST /booking/`
- Multi-slot booking: `POST /booking/create_multi_slot_booking/`

### 9. Backend Booking Processing
```
Backend receives booking request
    ↓
Validates member authentication
    ↓
Creates main booking record
    ↓
For multi-slot bookings:
    - Creates individual slot records
    - Links slots to main booking
    - Calculates total participants
    ↓
Generates unique booking ID
    ↓
Returns confirmation data
```

**Backend Models:**
- `BookingModel`: Main booking with `has_multiple_slots` flag
- `BookingSlotModel`: Individual slots with tee, time, and participant info
- Automatic booking ID generation: `MGCBK25AUG00010` format

### 10. Booking Confirmation
```
Frontend receives successful response
    ↓
Shows booking confirmation modal
    ↓
Displays:
    - Booking ID
    - Course and tee information
    - Selected slots and participants
    - Total cost (if applicable)
    ↓
User can view booking details or return to main page
```

### 11. Orders Component Integration
```
Bookings appear in Orders component
    ↓
Displays:
    - Booking history
    - Slot details for each booking
    - Status updates
    - Cancellation options
    - Join request management
```

**Orders Features:**
- Multi-slot booking display (one row per slot)
- Join request approval/rejection
- Booking cancellation (24-hour rule)
- Status tracking and updates

## Data Flow Diagram

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend     │    │   Collection     │    │    Backend     │
│  TeeBooking    │◄──►│    Service       │◄──►│   Django API    │
│  Component     │    │                  │    │                │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ 1. Load Course  │    │ 2. Fetch Tees   │    │ 3. Query DB    │
│    & Tees       │    │    & Slots      │    │   Models       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ 4. User Selects│    │ 5. Validate &    │    │ 6. Create      │
│   Slots        │    │   Process        │    │   Booking      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ 7. Submit      │    │ 8. API Call      │    │ 9. Save to DB  │
│   Booking      │    │   to Backend     │    │   & Return ID  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│10. Show        │    │11. Update Orders │    │12. Notification │
│   Confirmation │    │   Component      │    │   System        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Key Features

### 1. Multi-Slot Booking System
- Support for booking multiple time slots across different dates
- Individual participant counts per slot
- Flexible tee selection per slot
- Automatic grouping and organization

### 2. Real-Time Availability
- Dynamic slot generation based on course hours
- Real-time filtering for today's bookings
- Participant count validation
- Overlap prevention

### 3. Join Request System
- Members can request to join existing slots
- Original booker approval/rejection workflow
- Automatic notification system
- Status tracking

### 4. Advanced Slot Management
- Date-based slot preservation
- Tee-specific slot organization
- Participant count management
- Slot modification and cancellation

### 5. UK Timezone Handling
- Consistent UK time usage throughout the system
- Proper date validation
- Time slot filtering based on current UK time

## Technical Implementation Details

### Frontend State Management
```typescript
interface DateSlotSelection {
  date: Date;
  tee: Tee;
  selectedSlots: TimeSlot[];
  totalParticipants: number;
}

// Key state properties
selectedSlots: TimeSlot[];                    // All selected slots
dateSlotSelections: Map<string, DateSlotSelection>;  // Grouped by date/tee
currentTimeSlots: TimeSlot[];                 // Available slots for current view
```

### Backend Data Models
```python
class BookingModel(models.Model):
    member = models.ForeignKey(MemberModel, on_delete=models.CASCADE)
    course = models.ForeignKey(CourseModel, on_delete=models.CASCADE)
    bookingDate = models.DateField()
    participants = models.PositiveIntegerField(default=1)
    has_multiple_slots = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    
class BookingSlotModel(models.Model):
    booking = models.ForeignKey(BookingModel, on_delete=models.CASCADE, related_name='slots')
    tee = models.ForeignKey(TeeModel, on_delete=models.CASCADE)
    slot_date = models.DateField()
    booking_time = models.TimeField()
    participants = models.PositiveIntegerField(default=1)
    slot_order = models.PositiveIntegerField(default=1)
```

### API Endpoints
- `GET /tee/by_course/?course_id={id}` - Fetch tees for a course
- `GET /booking/available_slots/?course_id={id}&date={date}&tee_id={id}&participants={count}` - Get available slots
- `POST /booking/` - Create single booking
- `POST /booking/create_multi_slot_booking/` - Create multi-slot booking
- `GET /booking/` - Fetch user's bookings
- `PATCH /booking/{id}/cancel_booking/` - Cancel booking

## Error Handling & Validation

### Frontend Validation
- Date range validation (next 7 days only)
- Participant count limits (1-4 per slot)
- Slot availability checking
- Authentication verification

### Backend Validation
- Member authentication via JWT
- Date validation (no past dates)
- Participant count validation
- Slot overlap prevention
- Tee existence verification

### Error Scenarios
- Invalid date selection
- Slot already booked
- Insufficient available spots
- Authentication failure
- Network errors
- Validation failures

## Performance Considerations

### Frontend Optimization
- Lazy loading of time slots
- Efficient slot filtering and grouping
- Minimal API calls
- State management optimization

### Backend Optimization
- Database query optimization with select_related
- Efficient slot generation algorithms
- Caching of course and tee data
- Batch processing for multi-slot bookings

## Security Features

### Authentication
- JWT-based authentication
- Member-specific data access
- Secure API endpoints

### Data Validation
- Input sanitization
- SQL injection prevention
- XSS protection
- CSRF protection

## Future Enhancements

### Planned Features
- Advanced booking rules and restrictions
- Payment integration
- Email/SMS notifications
- Mobile app support
- Admin booking management
- Analytics and reporting

### Scalability Considerations
- Database indexing optimization
- API rate limiting
- Caching strategies
- Load balancing
- Microservices architecture

## Conclusion

The tee-booking system provides a comprehensive solution for golf club members to book tee times across multiple courses, tees, and dates. The multi-slot booking capability, real-time availability checking, and join request system create a flexible and user-friendly booking experience. The system's architecture supports both current requirements and future scalability needs.
