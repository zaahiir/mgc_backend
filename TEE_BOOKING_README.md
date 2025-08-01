# Tee Booking Functionality

This document describes the complete tee booking functionality implemented in the golf club management system.

## Overview

The tee booking system allows users to:
1. Select participants (1-4 people)
2. Choose a tee type (9 holes, 18 holes, etc.)
3. Select a date from a calendar
4. Choose an available time slot
5. Complete the booking with automatic price calculation

## Frontend Components

### Tee Booking Component (`tee-booking.component.ts`)

**Location**: `master_golf_club/src/app/main/tee-booking/`

**Key Features**:
- Step-by-step booking process
- Real-time validation
- Dynamic time slot availability
- Booking summary display
- Success/error message handling

**Main Methods**:
- `loadAvailableTees()`: Loads available tees for the course
- `loadAvailableTimeSlots()`: Gets available time slots for selected date/tee
- `bookTeeTime()`: Creates the booking
- `canBook()`: Validates if booking can proceed

### Collection Service (`collection.service.ts`)

**Location**: `master_golf_club/src/app/main/common-service/collection/`

**API Endpoints**:
- `getTeesByCourse(courseId)`: Get tees for a specific course
- `getAvailableSlots(courseId, date, teeId)`: Get available time slots
- `createBooking(bookingData)`: Create a new booking

## Backend API

### Models

**TeeModel**:
- `holeNumber`: Number of holes (9, 18, etc.)
- `pricePerPerson`: Price per person
- `course`: Foreign key to CourseModel

**BookingModel**:
- `member`: Foreign key to MemberModel
- `course`: Foreign key to CourseModel
- `tee`: Foreign key to TeeModel
- `bookingDate`: Date of booking
- `bookingTime`: Time of booking
- `participants`: Number of participants (1-4)
- `totalPrice`: Total price (auto-calculated)
- `status`: pending/confirmed/cancelled

### API Endpoints

**GET** `/api/tee/by_course/`
- Parameters: `course_id`
- Returns: List of available tees for the course

**GET** `/api/booking/available_slots/`
- Parameters: `course_id`, `date`, `tee_id`
- Returns: Available time slots for the specified date and tee

**POST** `/api/booking/`
- Body: Booking data (member, course, tee, date, time, participants)
- Returns: Created booking with calculated total price

### Serializers

**TeeSerializer**:
- Includes `label` field (e.g., "9 Holes")
- Includes `formattedPrice` field
- Validates hole number and price

**BookingSerializer**:
- Auto-calculates total price
- Validates booking date (no past dates)
- Validates participants (1-4)
- Includes formatted fields for display

## Usage Flow

1. **Load Course Data**: Component loads course details from route parameters
2. **Select Participants**: User chooses 1-4 participants
3. **Choose Tee**: User selects from available tees (9 holes, 18 holes, etc.)
4. **Select Date**: User picks a date from the calendar (future dates only)
5. **Choose Time**: User selects from available 30-minute time slots
6. **Review Summary**: Booking summary shows all details and total price
7. **Complete Booking**: User clicks "Book Now" to create the booking

## Time Slot Logic

- Available slots: 6:00 AM to 8:00 PM
- 30-minute intervals
- Duration calculation: 10 minutes per hole
- Overlapping bookings are prevented
- Slots that would extend past closing time are marked unavailable

## Error Handling

- **Validation Errors**: Displayed to user with clear messages
- **API Errors**: Handled gracefully with user-friendly messages
- **Network Errors**: Retry mechanisms and fallback options

## Testing

Run the test suite:
```bash
python manage.py test apis.tests.TeeBookingTestCase
```

Tests cover:
- Getting tees by course
- Getting available time slots
- Creating bookings
- Validation (past dates, invalid participants)

## Configuration

**Default Member ID**: For non-logged users, the system uses member ID `1` as default.

**Maximum Participants**: Set to 4 people per booking.

**Time Slot Duration**: 30-minute intervals.

**Operating Hours**: 6:00 AM to 8:00 PM.

## Styling

The component uses the existing color scheme:
- Primary: `#77A96A` (green)
- Secondary: `#1C403D` (dark green)
- Text colors and fonts match the existing design system

## Responsive Design

The booking form is fully responsive:
- Desktop: Sidebar layout with full calendar
- Tablet: Stacked layout with compact calendar
- Mobile: Single column with optimized touch targets

## Future Enhancements

- Member authentication integration
- Payment processing
- Booking confirmation emails
- Cancellation functionality
- Recurring bookings
- Group booking discounts 