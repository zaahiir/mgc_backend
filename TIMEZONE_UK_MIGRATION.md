# UK Timezone Migration Summary

This document summarizes the changes made to migrate the entire project from UTC to UK timezone (Europe/London).

## Backend Changes

### 1. Django Settings (`mgc/settings.py`)
- Changed `TIME_ZONE` from `'UTC'` to `'Europe/London'`
- Changed `LANGUAGE_CODE` from `'en-us'` to `'en-gb'`

### 2. Models (`apis/models.py`)
- Added `import pytz` and `UK_TIMEZONE = pytz.timezone('Europe/London')`
- Updated `BookingModel.clean()` method to use UK time for date validation
- Updated `BookingModel.can_cancel` property to use UK time for cancellation checks
- Updated `BookingModel.approve_join_request()` method to use UK time for approval timestamps
- Updated `BookingSlotModel.end_time` property to use UK timezone-aware datetime calculations

### 3. Views (`apis/views.py`)
- Added `import pytz` and `UK_TIMEZONE = pytz.timezone('Europe/London')`
- Updated password reset expiry to use UK time
- Updated verification code expiry checks to use UK time
- Updated enquiry conversion timestamps to use UK time
- Updated `generate_time_slots()` method to use UK time directly instead of timezone offset
- Removed timezone_offset parameter handling from `available_slots` endpoint
- Updated all `timezone.now()` calls to use `timezone.now().astimezone(UK_TIMEZONE)`

### 4. Serializers (`apis/serializers.py`)
- Added `import pytz`
- Updated `MemberEnquiryModelSerializers.update()` method to use UK time for conversion dates

## Frontend Changes

### 1. Collection Service (`master_golf_club/src/app/main/common-service/collection/collection.service.ts`)
- Removed timezone offset calculation and parameter from `getAvailableSlotsWithParticipants()` method
- Backend now handles UK time directly, eliminating the need for frontend timezone offset

### 2. Tee-Booking Component (`master_golf_club/src/app/main/tee-booking/tee-booking.component.ts`)
- Added UK timezone utility methods:
  - `getCurrentUKTime()`: Gets current time in UK timezone
  - `formatDateForUK()`: Formats dates for UK timezone
  - `formatTimeForUK()`: Formats times for UK timezone
  - `isTodayInUK()`: Checks if a date is today in UK timezone
- Updated date validation logic to use UK time instead of local time
- Updated single and multi-booking date validation methods
- Fixed icon property names for amenities display

### 3. Orders Component (`master_golf_club/src/app/main/orders/orders.component.ts`)
- Added UK timezone utility methods (same as tee-booking component)
- Updated `formatDate()` method to use UK timezone
- Updated `canCancelBooking()` method to use UK time for cancellation checks

## Key Benefits

1. **Consistent Timezone**: All backend operations now use UK time consistently
2. **Eliminated Timezone Confusion**: No more timezone offset calculations or mismatches
3. **Better User Experience**: Users see times in their local UK timezone
4. **Simplified Frontend**: Removed complex timezone offset handling
5. **Accurate Booking Validation**: Date/time validations now work correctly in UK time

## Technical Details

- **Backend Timezone**: Europe/London (UK time)
- **Database Storage**: All timestamps stored in UTC (Django handles conversion automatically)
- **API Responses**: All times returned in UK timezone
- **Frontend Display**: All times displayed in UK timezone using browser's timezone capabilities

## Testing Recommendations

1. Test booking creation with different dates and times
2. Verify that past date validation works correctly in UK time
3. Test cancellation logic (24-hour rule) with UK time
4. Verify that time slots are generated correctly for UK timezone
5. Test date formatting displays correctly in UK format (DD/MM/YYYY)

## Migration Notes

- Existing data remains unchanged (stored in UTC)
- New bookings will be created and validated using UK time
- All API endpoints now return times in UK timezone
- Frontend components automatically handle UK timezone display
- No database migrations required

## Dependencies

- `pytz==2024.2` (already in requirements.txt)
- Django timezone support enabled (`USE_TZ = True`)
- Browser timezone support for frontend components
