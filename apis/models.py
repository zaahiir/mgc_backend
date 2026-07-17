from django.db import models
from tinymce.models import HTMLField
from django.core.validators import MaxValueValidator
from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal
import uuid
import datetime
import pytz

# UK timezone
UK_TIMEZONE = pytz.timezone('Europe/London')


# Start of Master
class UserTypeModel(models.Model):
    id = models.AutoField(primary_key=True)
    userTypeName = models.CharField(max_length=200, null=True, blank=True)
    hideStatus = models.IntegerField(default=0)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)


class CountryModel(models.Model):
    id = models.AutoField(primary_key=True)
    countryName = models.CharField(max_length=255, null=True, blank=True)
    countryCode = models.CharField(max_length=55, null=True, blank=True)
    dailCode = models.CharField(max_length=10, null=True, blank=True)
    hideStatus = models.IntegerField(default=0)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)


class GenderModel(models.Model):
    id = models.AutoField(primary_key=True)
    genderName = models.CharField(max_length=255, null=True, blank=True)
    hideStatus = models.IntegerField(default=0)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)


class PaymentStatusModel(models.Model):
    id = models.AutoField(primary_key=True)
    statusName = models.CharField(max_length=50, null=True, unique=True)
    hideStatus = models.IntegerField(default=0)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)


class PaymentMethodModel(models.Model):
    id = models.AutoField(primary_key=True)
    methodName = models.CharField(max_length=50, null=True, unique=True)
    hideStatus = models.IntegerField(default=0)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)





# Start of Master
class PlanModel(models.Model):
    id = models.AutoField(primary_key=True)
    planName = models.CharField(max_length=255, null=True, blank=True)
    planDescription = models.CharField(max_length=255, null=True, blank=True)
    planDuration = models.IntegerField(null=True, blank=True, help_text="Duration in years")  # Changed to IntegerField for years
    planPrice = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    hideStatus = models.IntegerField(default=0)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.planName or f"Plan {self.id}"

    @property
    def visible_features(self):
        """Visible plan features, ordered for display (used by the membership page)."""
        return self.features.filter(hideStatus=0).order_by('order', 'featureName')

    class Meta:
        verbose_name = 'Plan'
        verbose_name_plural = 'Plans'


class PlanFeatureModel(models.Model):
    """Model for managing plan features"""
    id = models.AutoField(primary_key=True)
    plan = models.ForeignKey(PlanModel, on_delete=models.CASCADE, related_name='features')
    featureName = models.CharField(max_length=255, help_text="Feature name")
    isIncluded = models.BooleanField(default=True, help_text="Whether this feature is included in the plan")
    order = models.IntegerField(default=0, help_text="Display order of the feature")
    hideStatus = models.IntegerField(default=0)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'featureName']
        verbose_name = 'Plan Feature'
        verbose_name_plural = 'Plan Features'

    def __str__(self):
        return f"{self.plan.planName} - {self.featureName}"


class MemberModel(models.Model): 
    id = models.AutoField(primary_key=True)
    firstName = models.CharField(max_length=150)  # Required
    lastName = models.CharField(max_length=150)   # Required
    email = models.EmailField(unique=True)        # Required
    password = models.CharField(max_length=100, null=True, blank=True)
    encrypted_password = models.TextField(null=True, blank=True)
    hashed_password = models.TextField(null=True, blank=True)
    phoneNumber = models.CharField(max_length=20) # Required
    alternatePhoneNumber = models.CharField(max_length=20, null=True, blank=True)
    alternateEmail = models.EmailField(null=True, blank=True)  # New field
    dateOfBirth = models.DateField(null=True, blank=True)
    gender = models.ForeignKey('GenderModel', on_delete=models.CASCADE, null=True, blank=True,
                               related_name="memberGender")
    nationality = models.ForeignKey('CountryModel', on_delete=models.CASCADE, null=True, blank=True,
                                    related_name="memberNationality")
    address = models.TextField(null=True, blank=True)
    plan = models.IntegerField(null=True, blank=True)  # Changed from ForeignKey to IntegerField
    membershipStartDate = models.DateField(null=True, blank=True)
    membershipEndDate = models.DateField(null=True, blank=True)
    emergencyContactName = models.CharField(max_length=200, null=True, blank=True)
    emergencyContactPhone = models.CharField(max_length=20, null=True, blank=True)
    emergencyContactRelation = models.CharField(max_length=100, null=True, blank=True)
    referredBy = models.CharField(max_length=200, null=True, blank=True)
    profilePhoto = models.ImageField(upload_to="member_photos/", null=True, blank=True)
    idProof = models.FileField(upload_to="member_id_proofs/", null=True, blank=True)
    handicap = models.BooleanField(default=False)
    golfClubId = models.CharField(max_length=100, null=True, blank=True, unique=True,
                                  help_text="Assigned on save in the format MGC25100001; never set by the client")
    qr_token = models.CharField(max_length=255, null=True, blank=True, unique=True)
    
    # Enquiry related fields
    enquiryId = models.CharField(max_length=50, null=True, blank=True, help_text="ID of the original enquiry if member was created from enquiry")
    enquiryMessage = models.TextField(null=True, blank=True, help_text="Original enquiry message")
    reset_token = models.CharField(max_length=255, null=True, blank=True)
    reset_token_expiry = models.DateTimeField(null=True, blank=True)
    
    hideStatus = models.IntegerField(default=0)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.qr_token:
            self.qr_token = str(uuid.uuid4())
        if not self.golfClubId:
            self.golfClubId = self.generate_member_id()
        super().save(*args, **kwargs)

    def generate_member_id(self):
        """Generate a unique member ID in the format MGC25100001 (MGC + yy + mm + 4-digit sequence).

        Assigned here rather than by the caller so that concurrent sign-ups
        cannot land on the same number. The sequence counts every member for
        the month including hidden ones, so an ID is never handed out twice.
        """
        from datetime import datetime
        import time
        from django.db import transaction

        max_retries = 10
        for _ in range(max_retries):
            try:
                with transaction.atomic():
                    now = datetime.now()
                    base_id = f"MGC{str(now.year)[-2:]}{now.strftime('%m')}"

                    existing = MemberModel.objects.filter(
                        golfClubId__startswith=base_id
                    ).select_for_update().order_by('-golfClubId')

                    next_number = 1
                    if existing.exists():
                        try:
                            next_number = int(existing.first().golfClubId[-4:]) + 1
                        except (ValueError, IndexError, TypeError):
                            next_number = existing.count() + 1

                    member_id = f"{base_id}{next_number:04d}"
                    if not MemberModel.objects.filter(golfClubId=member_id).exists():
                        return member_id
                    time.sleep(0.01)
            except Exception:
                time.sleep(0.01)

        # Fallback: timestamp-derived suffix, still unique within the month
        now = datetime.now()
        return f"MGC{str(now.year)[-2:]}{now.strftime('%m')}{int(time.time() * 1000) % 10000:04d}"

    def __str__(self):
        return f"{self.firstName} {self.lastName} ({self.golfClubId})"

    class Meta:
        verbose_name = 'Member'
        verbose_name_plural = 'Members'


class AmenitiesModel(models.Model):
    id = models.AutoField(primary_key=True)
    amenityName = models.CharField(max_length=200, null=True, blank=True)
    amenityIcon = models.TextField(null=True, blank=True)  # SVG content
    amenityTooltip = models.CharField(max_length=500, null=True, blank=True)
    amenitiesDescription = models.TextField(null=True, blank=True, help_text="Detailed description of the amenity")
    hideStatus = models.IntegerField(default=0)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.amenityName or f"Amenity {self.id}"
    
    @property
    def amenity_icon_svg(self):
        """Return the SVG content of the amenity icon"""
        return self.amenityIcon

    def get_icon_path_only(self):
        """Extract only the path data from SVG for flexible rendering"""
        if self.amenityIcon:
            import re
            path_match = re.search(r'<path[^>]*d="([^"]*)"', self.amenityIcon)
            if path_match:
                return path_match.group(1)
        return None

    def get_viewbox(self):
        """Extract viewBox from SVG for proper scaling"""
        if self.amenityIcon:
            import re
            viewbox_match = re.search(r'viewBox="([^"]*)"', self.amenityIcon)
            if viewbox_match:
                return viewbox_match.group(1)
        return "0 0 448 512"  # Default Font Awesome viewBox


class CourseModel(models.Model): 
    id = models.AutoField(primary_key=True)
    courseName = models.CharField(max_length=255, null=True, blank=True)
    courseAddress = models.TextField(null=True, blank=True)
    courseOpenFrom = models.TimeField(null=True, blank=True, help_text="Course opening time (e.g., 06:00)")
    coursePhoneNumber = models.CharField(max_length=20, null=True, blank=True)
    courseAlternatePhoneNumber = models.CharField(max_length=20, null=True, blank=True)
    courseWebsite = models.URLField(max_length=255, null=True, blank=True)
    courseDescription = models.TextField(null=True, blank=True)
    courseLocation = models.CharField(max_length=500, null=True, blank=True, 
                                    help_text="GPS coordinates or detailed location for directions")
    courseImage = models.ImageField(upload_to='course_images/', null=True, blank=True)
    courseAmenities = models.ManyToManyField(AmenitiesModel, blank=True, related_name="courses")
    joinRequestExpiryHours = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="Hours before tee time when pending join requests auto-expire. Leave blank to disable auto-expiry for this course."
    )
    hideStatus = models.IntegerField(default=0)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.courseName or f"Course {self.id}"

    @property
    def formatted_address(self):
        """Return formatted address for display"""
        return self.courseAddress or "Address not available"
    
    @property 
    def primary_contact(self):
        """Return primary phone number"""
        return self.coursePhoneNumber or self.courseAlternatePhoneNumber

    @property
    def all_contacts(self):
        """Return all available contact numbers"""
        contacts = []
        if self.coursePhoneNumber:
            contacts.append(self.coursePhoneNumber)
        if self.courseAlternatePhoneNumber:
            contacts.append(self.courseAlternatePhoneNumber)
        return contacts
    
    @property
    def available_tees(self):
        """Return all available tees for this course"""
        return self.tees.filter(hideStatus=0).order_by('holeNumber')
    
    def get_default_tee(self):
        """Get the default tee (first available tee)"""
        return self.available_tees.first()


class TeeModel(models.Model):
    id = models.AutoField(primary_key=True)
    course = models.ForeignKey(CourseModel, on_delete=models.CASCADE, related_name="tees")
    holeNumber = models.IntegerField(help_text="Number of holes for this tee (any positive integer)")
    hideStatus = models.IntegerField(default=0)

    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.holeNumber} Holes - {self.course.courseName}"
    
    def clean(self):
        super().clean()
        if self.holeNumber <= 0:
            raise ValidationError("Hole number must be a positive integer")

    @property
    def estimated_duration(self):
        # Calculate estimated duration based on hole number: approximately 10 minutes per hole
        minutes_per_hole = 10
        total_minutes = self.holeNumber * minutes_per_hole
        return f"{total_minutes} minutes"


class BookingModel(models.Model):
    id = models.AutoField(primary_key=True)
    booking_id = models.CharField(max_length=20, unique=True, null=True, blank=True, help_text="Unique booking ID in format MGCBK25AUG00010")

    member = models.ForeignKey(MemberModel, on_delete=models.CASCADE, related_name="bookings")
    course = models.ForeignKey(CourseModel, on_delete=models.CASCADE, related_name="bookings")
    tee = models.ForeignKey(TeeModel, on_delete=models.CASCADE, related_name="bookings", null=True, blank=True)
    
    # Each booking represents a single slot
    slot_date = models.DateField(help_text="Date for this specific slot", null=True, blank=True)
    booking_time = models.TimeField(help_text="Time for this specific slot", null=True, blank=True)
    participants = models.PositiveIntegerField(default=1, help_text="Number of participants for this slot")

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('pending_approval', 'Pending Approval'),  # For join requests
        ('approved', 'Approved'),  # For approved join requests
        ('rejected', 'Rejected'),  # For rejected join requests
        ('completed', 'Completed'),  # New status for completed bookings
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # Statuses that hold a live place on a member's calendar. A booking in any
    # of these blocks the member from taking a second slot at the same time.
    ACTIVE_STATUSES = ['pending', 'confirmed', 'completed', 'approved']
    
    # Multi-slot booking grouping (optional)
    # If multiple slots are booked together, they can share a group_id
    group_id = models.CharField(max_length=50, null=True, blank=True, help_text="Group ID for multi-slot bookings")
    
        # Join request functionality - now handled by separate JoinRequestModel
    # This field is kept for backward compatibility but will be deprecated
    original_booking = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, 
                                       related_name='legacy_join_requests', 
                                       help_text="DEPRECATED: Original booking this join request is for")
    is_join_request = models.BooleanField(default=False, 
                                          help_text="DEPRECATED: Whether this booking is a join request")
    
    # Enhanced approval tracking - now handled by JoinRequestModel
    approved_by = models.ForeignKey(MemberModel, on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name='legacy_approved_bookings',
                                   help_text="DEPRECATED: Member who approved this join request")
    approved_at = models.DateTimeField(null=True, blank=True, help_text="DEPRECATED: When the join request was approved")
    
    notes = models.TextField(null=True, blank=True)
    hideStatus = models.IntegerField(default=0)
    
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'apis_bookingmodel'
        indexes = [
            models.Index(fields=['booking_id']),
            models.Index(fields=['slot_date', 'booking_time', 'tee']),
            models.Index(fields=['member', 'status']),
            models.Index(fields=['createdAt']),
        ]
        constraints = [
            # Last line of defence for the one-slot-per-time rule: the Python
            # checks can be raced by two concurrent requests, this cannot.
            models.UniqueConstraint(
                fields=['member', 'slot_date', 'booking_time'],
                condition=models.Q(
                    is_join_request=False,
                    hideStatus=0,
                    status__in=['pending', 'confirmed', 'completed', 'approved'],
                ),
                name='unique_member_slot_datetime',
            ),
        ]
        verbose_name = 'Booking'
        verbose_name_plural = 'Bookings'

    def save(self, *args, **kwargs):
        # Generate booking ID if not provided
        if not self.booking_id:
            self.booking_id = self.generate_booking_id()
        
        # Handle migration from old structure
        if not self.slot_date and hasattr(self, 'bookingDate'):
            self.slot_date = self.bookingDate
        
        super().save(*args, **kwargs)

    def __str__(self):
        if not self.slot_date:
            return f"{self.member.firstName} - {self.course.courseName} (date not specified)"
        return f"{self.member.firstName} - {self.course.courseName} on {self.slot_date}"
    
    def clean(self):
        super().clean()
        # Validate slot date is not in the past (using UK time)
        if self.slot_date:
            uk_now = timezone.now().astimezone(UK_TIMEZONE)
            if self.slot_date < uk_now.date():
                raise ValidationError("Cannot book for past dates")
        
        # Validate participants count
        if self.participants < 1 or self.participants > 4:
            raise ValidationError("Participants must be between 1 and 4")
        
        # Check for overlapping bookings only if this is not a join request and we have required data
        if not self.is_join_request and self.tee and self.slot_date and self.booking_time:
            overlapping = BookingModel.objects.filter(
                tee=self.tee,
                slot_date=self.slot_date,
                booking_time=self.booking_time,
                status__in=['pending', 'confirmed', 'completed']
            ).exclude(id=self.id if self.id else None)

            if overlapping.exists():
                tee_info = f"{self.tee.holeNumber} holes tee" if self.tee else "tee"
                raise ValidationError(f"This time slot is already booked for {tee_info} on {self.slot_date}")

        # A member may hold only one slot per date + time, across every club.
        if not self.is_join_request:
            clash = BookingModel.find_member_clash(
                self.member_id, self.slot_date, self.booking_time,
                exclude_booking_id=self.id,
            )
            if clash:
                raise ValidationError(self.member_clash_message(clash))

    @staticmethod
    def member_clash_message(clash_label=None):
        """The single wording shown wherever a member double-books a time.

        clash_label is omitted when the clash surfaces from the database
        constraint, where the competing row isn't in hand.
        """
        where = f" ({clash_label})" if clash_label else ""
        return (
            f"You already have a booking at this date and time{where}. "
            f"A member can only hold one slot per time, so please pick a different time."
        )

    @classmethod
    def find_member_clash(cls, member, slot_date, booking_time,
                          exclude_booking_id=None, exclude_join_request_id=None):
        """Return a label for the member's existing commitment at this date+time, else None.

        A member is committed either by a booking of their own or by an approved
        request to join someone else's. Either one blocks a second slot at the
        same date + time, whatever the club, course or tee.
        """
        if not (member and slot_date and booking_time):
            return None

        booking_qs = cls.objects.filter(
            member=member,
            slot_date=slot_date,
            booking_time=booking_time,
            is_join_request=False,
            status__in=cls.ACTIVE_STATUSES,
            hideStatus=0,
        )
        if exclude_booking_id:
            booking_qs = booking_qs.exclude(id=exclude_booking_id)
        clash = booking_qs.select_related('course').first()
        if clash:
            return clash.course.courseName if clash.course else 'another course'

        join_qs = JoinRequestModel.objects.filter(
            member=member,
            original_booking__slot_date=slot_date,
            original_booking__booking_time=booking_time,
            status='approved',
            hideStatus=0,
        )
        if exclude_join_request_id:
            join_qs = join_qs.exclude(id=exclude_join_request_id)
        join_clash = join_qs.select_related('original_booking__course').first()
        if join_clash:
            course = join_clash.original_booking.course
            label = course.courseName if course else 'another course'
            return f"{label}, as an approved join request"

        return None

    def generate_booking_id(self):
        """Generate unique booking ID in format: MGCBK25AUG00010"""
        from datetime import datetime
        import time
        from django.db import transaction
        
        max_retries = 10
        retry_count = 0
        
        while retry_count < max_retries:
            try:
                with transaction.atomic():
                    now = datetime.now()
                    year_suffix = str(now.year)[-2:]  # Last 2 digits of year
                    month_abbr = now.strftime('%b').upper()  # 3-letter month
                    
                    base_id = f"MGCBK{year_suffix}{month_abbr}"
                    
                    # Get the next sequential number for this month with row-level locking
                    existing_bookings = BookingModel.objects.filter(
                        booking_id__startswith=base_id
                    ).select_for_update().order_by('-booking_id')
                    
                    if existing_bookings.exists():
                        # Extract the last number and increment
                        last_booking_id = existing_bookings.first().booking_id
                        try:
                            # Extract the number part (last 5 digits)
                            last_number = int(last_booking_id[-5:])
                            next_number = last_number + 1
                        except (ValueError, IndexError):
                            next_number = 1
                    else:
                        next_number = 1
                    
                    # Format with leading zeros (5 digits)
                    booking_id = f"{base_id}{next_number:05d}"
                    
                    # Verify this ID doesn't exist (double-check)
                    if not BookingModel.objects.filter(booking_id=booking_id).exists():
                        return booking_id
                    
                    # If we get here, the ID was taken by another process, retry
                    retry_count += 1
                    time.sleep(0.01)  # Small delay before retry
                    continue
                    
            except Exception as e:
                retry_count += 1
                if retry_count >= max_retries:
                    # Fallback: use timestamp-based ID
                    timestamp = int(time.time() * 1000) % 100000
                    now = datetime.now()
                    year_suffix = str(now.year)[-2:]
                    month_abbr = now.strftime('%b').upper()
                    base_id = f"MGCBK{year_suffix}{month_abbr}"
                    return f"{base_id}{timestamp:05d}"
                
                time.sleep(0.01)  # Small delay before retry
                continue
        
        # Final fallback if all else fails
        now = datetime.now()
        year_suffix = str(now.year)[-2:]
        month_abbr = now.strftime('%b').upper()
        base_id = f"MGCBK{year_suffix}{month_abbr}"
        timestamp = int(time.time() * 1000) % 100000
        return f"{base_id}{timestamp:05d}"
    

    
    @property
    def duration_hours(self):
        # Fixed 8 minutes duration for all slots
        return 8 / 60  # 8 minutes in hours
    
    @property
    def end_time(self):
        from datetime import timedelta
        from django.utils import timezone
        
        # Check if we have the required date and time
        if not self.slot_date or not self.booking_time:
            return None
        
        # Calculate end time for this specific slot
        start_datetime = timezone.datetime.combine(self.slot_date, self.booking_time)
        # Make it timezone-aware with UK time
        start_datetime = UK_TIMEZONE.localize(start_datetime)
        duration = timedelta(hours=self.duration_hours)
        end_datetime = start_datetime + duration
        return end_datetime.time()
    

    
    @property
    def slot_participant_count(self):
        """Get total participants for this slot"""
        if self.is_join_request:
            # For join requests, count the original booking participants
            return self.original_booking.participants if self.original_booking else 0
        else:
            # For original bookings, return the total participants (including merged ones)
            # This ensures that after merging, the count reflects all participants
            return self.participants
    
    @property
    def available_spots(self):
        """Get available spots for this slot"""
        total_participants = self.slot_participant_count
        return max(0, 4 - total_participants)
    
    @property
    def slot_status(self):
        """Get slot status based on participant count"""
        total_participants = self.slot_participant_count
        if total_participants == 0:
            return 'available'
        elif total_participants < 4:
            return 'partially_available'
        else:
            return 'booked'
    
    def can_join_slot(self, requested_participants):
        """Check if a member can join this slot with the requested number of participants"""
        if self.slot_status == 'booked':
            return False
        return self.available_spots >= requested_participants
    
    def auto_reject_ineligible_requests(self):
        """Automatically reject join requests that can no longer be accommodated"""
        if self.slot_status == 'booked':
            # Slot is full, reject all pending requests
            pending_requests = self.join_requests.filter(
                status='pending_approval',
                hideStatus=0
            )
            
            for request in pending_requests:
                request.status = 'rejected'
                request.notes = 'Automatically rejected - slot is full'
                request.save()
                
                # Create notification for the rejected member
                from .models import NotificationModel
                NotificationModel.create_join_response_notification(
                    recipient=request.member,
                    sender=self.member,
                    booking=self,
                    is_approved=False,
                    reason='Slot is full'
                )
        
        elif self.slot_status == 'partially_available':
            # Check each pending request to see if it can still be accommodated
            pending_requests = self.join_requests.filter(
                status='pending_approval',
                hideStatus=0
            ).order_by('createdAt')  # Process oldest requests first
            
            current_participants = self.participants
            
            for request in pending_requests:
                if current_participants + request.participants > 4:
                    # This request can no longer be accommodated
                    request.status = 'rejected'
                    request.notes = f'Automatically rejected - only {4 - current_participants} spots available'
                    request.save()
                    
                    # Create notification for the rejected member
                    from .models import NotificationModel
                    NotificationModel.create_join_response_notification(
                        recipient=request.member,
                        sender=self.member,
                        booking=self,
                        is_approved=False,
                        reason=f'Only {4 - current_participants} spots available'
                    )
                else:
                    # This request can still be accommodated
                    break
    
    def get_join_requests(self):
        """Get all join requests for this slot"""
        return BookingModel.objects.filter(
            original_booking=self,
            is_join_request=True,
            status__in=['pending_approval', 'approved', 'rejected']
        )
    
    def get_pending_join_requests(self):
        """Get pending join requests for this booking"""
        return BookingModel.objects.filter(
            original_booking=self,
            is_join_request=True,
            status='pending_approval'
        )
    
    def approve_join_request(self, join_request_id, approved_by):
        """Approve a join request and merge participants into original booking"""
        try:
            join_request = BookingModel.objects.get(
                id=join_request_id,
                original_booking=self,
                is_join_request=True,
                status='pending_approval'
            )
            
            # Check if slot can accommodate the join request
            total_participants = self.participants + join_request.participants
            if total_participants > 4:
                raise ValidationError("Slot cannot accommodate additional participants")
            
            # Merge participants into the original booking
            self.participants = total_participants
            
            # Store join request details for reference
            if not hasattr(self, 'join_requests'):
                self.join_requests = []
            
            # Mark the join request as approved and link it to the original booking
            join_request.status = 'approved'
            join_request.approved_by = approved_by
            join_request.approved_at = timezone.now().astimezone(UK_TIMEZONE)
            join_request.save()
            
            # Update original booking status if slot is now full
            if total_participants == 4:
                self.status = 'completed'
            
            # Save the updated original booking
            self.save()
            
            # Auto-reject any ineligible requests after this approval
            self.auto_reject_ineligible_requests()
            
            return True
            
        except BookingModel.DoesNotExist:
            return False
    
    def reject_join_request(self, join_request_id):
        """Reject a join request"""
        try:
            join_request = BookingModel.objects.get(
                id=join_request_id,
                original_booking=self,
                is_join_request=True,
                status='pending_approval'
            )
            
            join_request.status = 'rejected'
            join_request.save()
            
            return True
            
        except BookingModel.DoesNotExist:
            return False
    
    def is_slot_full(self):
        """Check if the slot is completely full"""
        return self.slot_participant_count >= 4
    
    def can_accept_more_participants(self):
        """Check if the slot can accept more participants"""
        return self.slot_participant_count < 4

    # New methods for single-slot booking system
    def get_slot_info(self):
        """Get slot information for display"""
        if not self.tee or not self.slot_date or not self.booking_time:
            return "Slot information incomplete"
        
        return f"{self.tee.holeNumber} Holes on {self.slot_date.strftime('%d/%B/%Y')} at {self.booking_time.strftime('%H:%M')}"

    def get_total_participants(self):
        """Get total participants for this slot"""
        return self.participants

    def get_all_participants_info(self):
        """Get information about all participants in this slot"""
        participants_info = []
        
        # Since participants are now merged into the original booking's participants field,
        # we need to reconstruct the participant breakdown from the join requests
        
        # Get approved join requests to understand the breakdown
        approved_requests = BookingModel.objects.filter(
            original_booking=self,
            is_join_request=True,
            status='approved',
            hideStatus=0
        )
        
        # Calculate original booker's participants (total minus approved join requests)
        total_approved_join_participants = sum(request.participants for request in approved_requests)
        original_booker_participants = self.participants - total_approved_join_participants
        
        # Ensure original booker has at least 1 participant
        if original_booker_participants < 1:
            original_booker_participants = 1
        
        # Add original booker
        participants_info.append({
            'member_id': self.member.id,
            'member_name': f"{self.member.firstName} {self.member.lastName}",
            'participants': original_booker_participants,
            'is_original_booker': True,
            'join_request_id': None
        })
        
        # Add approved join requests
        approved_requests = BookingModel.objects.filter(
            original_booking=self,
            is_join_request=True,
            status='approved',
            hideStatus=0
        )
        
        for request in approved_requests:
            participants_info.append({
                'member_id': request.member.id,
                'member_name': f"{request.member.firstName} {request.member.lastName}",
                'participants': request.participants,
                'is_original_booker': False,
                'join_request_id': request.id,
                'approved_at': request.approved_at
            })
        
        return participants_info

    def is_multi_slot_booking(self):
        """Check if this is part of a multi-slot booking group"""
        return self.group_id is not None

    def get_tee_info(self):
        """Get tee information for display"""
        if self.tee:
            if self.slot_date:
                return f"{self.tee.holeNumber} Holes on {self.slot_date.strftime('%d/%B/%Y')}"
            else:
                return f"{self.tee.holeNumber} Holes"
        else:
            if self.slot_date:
                return f"Tee not specified on {self.slot_date.strftime('%d/%B/%Y')}"
            else:
                return "Tee not specified"


# BookingSlotModel removed - each slot is now a separate BookingModel


class JoinRequestModel(models.Model):
    """Model for managing join requests - separate from bookings to maintain one slot one ID"""
    id = models.AutoField(primary_key=True)
    request_id = models.CharField(max_length=20, unique=True, null=True, blank=True, help_text="Unique request ID in format MGCRQ25AUG00010")
    
    # Member requesting to join
    member = models.ForeignKey(MemberModel, on_delete=models.CASCADE, related_name="join_requests")
    
    # Original booking they want to join
    original_booking = models.ForeignKey(BookingModel, on_delete=models.CASCADE, related_name='join_requests')
    
    # Request details
    participants = models.PositiveIntegerField(default=1, help_text="Number of participants requesting to join")
    
    STATUS_CHOICES = [
        ('pending_approval', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('expired', 'Expired'),  # Auto-expired: not actioned before the course cut-off
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending_approval')
    
    # Approval tracking
    approved_by = models.ForeignKey(MemberModel, on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name='approved_join_requests',
                                   help_text="Member who approved this join request")
    approved_at = models.DateTimeField(null=True, blank=True, help_text="When the join request was approved")
    
    notes = models.TextField(null=True, blank=True)
    hideStatus = models.IntegerField(default=0)
    
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'apis_joinrequestmodel'
        indexes = [
            models.Index(fields=['request_id']),
            models.Index(fields=['original_booking', 'status']),
            models.Index(fields=['member', 'status']),
            models.Index(fields=['createdAt']),
        ]
        verbose_name = 'Join Request'
        verbose_name_plural = 'Join Requests'
    
    def save(self, *args, **kwargs):
        # Generate request ID if not provided
        if not self.request_id:
            self.request_id = self.generate_request_id()
        super().save(*args, **kwargs)
    
    def generate_request_id(self):
        """Generate unique request ID in format: MGCRQ25AUG00010"""
        from datetime import datetime
        import time
        from django.db import transaction
        
        max_retries = 10
        retry_count = 0
        
        while retry_count < max_retries:
            try:
                with transaction.atomic():
                    now = datetime.now()
                    year_suffix = str(now.year)[-2:]
                    month_abbr = now.strftime('%b').upper()
                    
                    base_id = f"MGCRQ{year_suffix}{month_abbr}"
                    
                    # Get the next sequential number for this month with row-level locking
                    existing_requests = JoinRequestModel.objects.filter(
                        request_id__startswith=base_id
                    ).select_for_update().order_by('-request_id')
                    
                    if existing_requests.exists():
                        # Extract the last number and increment
                        last_request_id = existing_requests.first().request_id
                        try:
                            # Extract the number part (last 5 digits)
                            last_number = int(last_request_id[-5:])
                            next_number = last_number + 1
                        except (ValueError, IndexError):
                            next_number = 1
                    else:
                        next_number = 1
                    
                    # Format with leading zeros (5 digits)
                    request_id = f"{base_id}{next_number:05d}"
                    
                    # Verify this ID doesn't exist (double-check)
                    if not JoinRequestModel.objects.filter(request_id=request_id).exists():
                        return request_id
                    
                    # If we get here, the ID was taken by another process, retry
                    retry_count += 1
                    time.sleep(0.01)  # Small delay before retry
                    continue
                    
            except Exception as e:
                retry_count += 1
                if retry_count >= max_retries:
                    # Fallback: use timestamp-based ID
                    timestamp = int(time.time() * 1000) % 100000
                    now = datetime.now()
                    year_suffix = str(now.year)[-2:]
                    month_abbr = now.strftime('%b').upper()
                    base_id = f"MGCRQ{year_suffix}{month_abbr}"
                    return f"{base_id}{timestamp:05d}"
                
                time.sleep(0.01)  # Small delay before retry
                continue
        
        # Final fallback if all else fails
        now = datetime.now()
        year_suffix = str(now.year)[-2:]
        month_abbr = now.strftime('%b').upper()
        base_id = f"MGCRQ{year_suffix}{month_abbr}"
        timestamp = int(time.time() * 1000) % 100000
        return f"{base_id}{timestamp:05d}"
    
    def __str__(self):
        return f"Join request {self.request_id} from {self.member.firstName} to {self.original_booking.booking_id}"

    @property
    def expiry_deadline(self):
        """
        The moment this request must be actioned by, or None if the slot's course
        has no auto-expiry configured. Deadline = tee time minus the course's
        joinRequestExpiryHours.
        """
        from datetime import datetime, timedelta
        booking = self.original_booking
        if not booking or not booking.slot_date or not booking.booking_time:
            return None
        course = booking.course
        hours = getattr(course, 'joinRequestExpiryHours', None) if course else None
        if not hours:
            return None
        tee_dt = timezone.make_aware(
            datetime.combine(booking.slot_date, booking.booking_time)
        )
        return tee_dt - timedelta(hours=hours)

    def is_expired_now(self):
        """True if this pending request is past its course-defined cut-off."""
        deadline = self.expiry_deadline
        if deadline is None:
            return False
        return timezone.now().astimezone(UK_TIMEZONE) >= deadline.astimezone(UK_TIMEZONE)

    @classmethod
    def expire_stale_requests(cls):
        """
        Auto-expire every pending join request whose course cut-off has passed.
        Sends a notification to the requester for each one. Returns the count
        expired. Safe to call lazily (on read) and from a scheduled command.
        """
        expired_count = 0
        pending = cls.objects.filter(
            status='pending_approval', hideStatus=0
        ).select_related('original_booking', 'original_booking__course', 'member')
        for req in pending:
            if req.is_expired_now():
                req.status = 'expired'
                req.save(update_fields=['status', 'updatedAt'])
                try:
                    NotificationModel.create_join_request_expired_notification(
                        recipient=req.member,
                        booking=req.original_booking,
                    )
                except Exception:
                    # Never let a notification failure block the sweep
                    pass
                expired_count += 1
        return expired_count


class NotificationModel(models.Model):
    """Model for managing booking notifications"""
    NOTIFICATION_TYPES = [
        ('join_request_received', 'Join Request Received'),
        ('join_request_approved', 'Join Request Approved'),
        ('join_request_rejected', 'Join Request Rejected'),
        ('join_request_expired', 'Join Request Expired'),
        ('join_request', 'Join Request'),  # Legacy support
        ('join_approved', 'Join Approved'),  # Legacy support
        ('join_rejected', 'Join Rejected'),  # Legacy support
        ('booking_confirmed', 'Booking Confirmed'),
    ]
    
    id = models.AutoField(primary_key=True)
    recipient = models.ForeignKey(MemberModel, on_delete=models.CASCADE, related_name="notifications")
    sender = models.ForeignKey(MemberModel, on_delete=models.CASCADE, related_name="sent_notifications", null=True, blank=True)
    notification_type = models.CharField(max_length=25, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    related_booking = models.ForeignKey(BookingModel, on_delete=models.CASCADE, related_name="notifications", null=True, blank=True)
    is_read = models.BooleanField(default=False)
    hideStatus = models.IntegerField(default=0)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-createdAt']
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"

    def __str__(self):
        return f"{self.notification_type} - {self.recipient.firstName}"

    @property
    def is_new(self):
        """Check if notification is new (unread)"""
        return not self.is_read

    def mark_as_read(self):
        """Mark notification as read"""
        self.is_read = True
        self.save(update_fields=['is_read', 'updatedAt'])

    @classmethod
    def create_join_request_notification(cls, recipient, sender, booking, join_request):
        """Create a join request notification"""
        time_str = booking.booking_time.strftime('%H:%M') if booking.booking_time else "Time not specified"
        date_str = booking.slot_date.strftime('%B %d, %Y') if booking.slot_date else "Date not specified"
        course_name = booking.course.courseName if booking.course else "Unknown Course"
        tee_name = f"Tee {booking.tee.holeNumber}" if booking.tee else "Unknown Tee"
        
        return cls.objects.create(
            recipient=recipient,
            sender=sender,
            notification_type='join_request_received',
            title='New Join Request',
            message=f"{sender.firstName} {sender.lastName} wants to join your tee slot at {course_name} - {tee_name} on {date_str} at {time_str}",
            related_booking=booking
        )

    @classmethod
    def create_join_response_notification(cls, recipient, sender, booking, is_approved, reason=None):
        """Create a join response notification"""
        notification_type = 'join_request_approved' if is_approved else 'join_request_rejected'
        title = 'Join Request Approved' if is_approved else 'Join Request Rejected'
        time_str = booking.booking_time.strftime('%H:%M') if booking.booking_time else "Time not specified"
        date_str = booking.slot_date.strftime('%B %d, %Y') if booking.slot_date else "Date not specified"
        course_name = booking.course.courseName if booking.course else "Unknown Course"
        tee_name = f"Tee {booking.tee.holeNumber}" if booking.tee else "Unknown Tee"
        
        if reason:
            message = f"Your join request for {course_name} - {tee_name} on {date_str} at {time_str} has been {'approved' if is_approved else 'rejected'}. Reason: {reason}"
        else:
            message = f"Your join request for {course_name} - {tee_name} on {date_str} at {time_str} has been {'approved' if is_approved else 'rejected'}."
        
        return cls.objects.create(
            recipient=recipient,
            sender=sender,
            notification_type=notification_type,
            title=title,
            message=message,
            related_booking=booking
        )

    @classmethod
    def create_join_request_expired_notification(cls, recipient, booking):
        """Notify a member their pending join request expired before being actioned."""
        time_str = booking.booking_time.strftime('%H:%M') if booking.booking_time else "Time not specified"
        date_str = booking.slot_date.strftime('%B %d, %Y') if booking.slot_date else "Date not specified"
        course_name = booking.course.courseName if booking.course else "Unknown Course"
        tee_name = f"Tee {booking.tee.holeNumber}" if booking.tee else "Unknown Tee"

        return cls.objects.create(
            recipient=recipient,
            sender=None,
            notification_type='join_request_expired',
            title='Join Request Expired',
            message=(
                f"Your join request for {course_name} - {tee_name} on {date_str} at {time_str} "
                f"expired because it was not approved in time."
            ),
            related_booking=booking
        )




class BlogModel(models.Model):
    blogDate = models.DateField()
    blogTitle = models.CharField(max_length=255)
    blogHighlight = models.TextField(null=True, blank=True)
    blogDescription = HTMLField()
    blogImage = models.ImageField(upload_to='blog_images/', null=True, blank=True)
    blogQuote = models.TextField(null=True, blank=True, help_text="Quote text for the blog")
    blogQuoteCreator = models.CharField(max_length=255, null=True, blank=True, help_text="Name of the quote creator")
    hideStatus = models.IntegerField(default=0)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)


class ConceptModel(models.Model):
    conceptHighlight = models.CharField(max_length=1500)
    conceptCount = models.IntegerField(default=1, validators=[MaxValueValidator(8)])
    hideStatus = models.IntegerField(default=0)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)

    @classmethod
    def get_solo(cls):
        """Get or create the singleton instance"""
        obj, created = cls.objects.get_or_create(pk=1)
        return obj

    def save(self, *args, **kwargs):
        """Ensure only one instance exists"""
        self.pk = 1
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = "Concept"
        verbose_name_plural = "Concepts"

class ConceptItem(models.Model):
    concept = models.ForeignKey(ConceptModel, on_delete=models.CASCADE, related_name='items')
    heading = models.CharField(max_length=255)
    paragraph = models.TextField(max_length=1000)
    order = models.IntegerField(default=0)
    hideStatus = models.IntegerField(default=0)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order']
        verbose_name = "Concept Item"
        verbose_name_plural = "Concept Items"

    def __str__(self):
        return f"{self.heading} (Order: {self.order})"


class ContactEnquiryModel(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
    ]
    
    contactEnquiryDate = models.DateField(auto_now_add=True)
    contactEnquiryFirstName = models.CharField(max_length=255)
    contactEnquiryLastName = models.CharField(max_length=255)
    contactEnquiryPhoneNumber = models.CharField(max_length=20, null=True, blank=True)
    contactEnquiryEmail = models.EmailField(null=True, blank=True)
    contactEnquiryMessage = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    hideStatus = models.IntegerField(default=0)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.contactEnquiryFirstName} {self.contactEnquiryLastName} - {self.status}"


class MemberEnquiryModel(models.Model):
    memberEnquiryDate = models.DateField(auto_now_add=True)
    memberEnquiryPlan = models.IntegerField(null=True, blank=True)  # Changed from ForeignKey to IntegerField
    memberEnquiryFirstName = models.CharField(max_length=150, null=True, blank=True)
    memberEnquiryLastName = models.CharField(max_length=150, null=True, blank=True)
    memberEnquiryEmail = models.EmailField(null=True, blank=True)
    memberEnquiryPhoneNumber = models.CharField(max_length=20, null=True, blank=True)
    memberEnquiryMessage = models.TextField(null=True, blank=True)
    hideStatus = models.IntegerField(default=0)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)
    is_converted = models.BooleanField(default=False, help_text="Whether this enquiry has been converted to a member")
    converted_member_id = models.CharField(max_length=50, blank=True, null=True, help_text="Golf Club ID of the converted member")
    converted_date = models.DateTimeField(blank=True, null=True, help_text="Date when enquiry was converted to member")

    def __str__(self):
        return f"{self.memberEnquiryFirstName} {self.memberEnquiryLastName} - {self.memberEnquiryPlan}"

    class Meta:
        verbose_name = "Member Enquiry"
        verbose_name_plural = "Member Enquiries"
        ordering = ['-createdAt']


class AboutModel(models.Model):
    id = models.AutoField(primary_key=True)
    aboutHeading = models.CharField(max_length=255, null=True, blank=True, help_text="About section heading")
    aboutDescription = HTMLField(null=True, blank=True, help_text="About section description with rich text")
    partnerGolfClubs = models.IntegerField(default=0, help_text="Number of partner golf clubs")
    successfulYears = models.IntegerField(default=0, help_text="Number of successful years")
    hideStatus = models.IntegerField(default=0)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"About Section - {self.aboutHeading or 'No Heading'}"

    @classmethod
    def get_solo(cls):
        """Get or create the singleton instance"""
        obj, created = cls.objects.get_or_create(pk=1)
        return obj

    def save(self, *args, **kwargs):
        """Ensure only one instance exists"""
        self.pk = 1
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = "About Section"
        verbose_name_plural = "About Sections"


class EventModel(models.Model):
    # Basic Information
    EventTitle = models.CharField(max_length=255, help_text="Event title")
    EventDate = models.DateField(help_text="Event date")
    EventVenue = models.CharField(max_length=255, help_text="Event venue", default="TBD")
    EventEntryPrice = models.CharField(max_length=50, help_text="Event entry price (e.g., '$60')", default="$0")
    
    # Main Event Image
    EventImage = models.ImageField(upload_to='events/main/', help_text="Main event image", blank=True, null=True)
    
    # Event Details Section
    EventDetails = HTMLField(help_text="Event details with rich text editor", default="")
    
    # Event Activities Section
    EventActivities = HTMLField(help_text="Event activities with rich text editor", default="")
    EventActivitiesimageOne = models.ImageField(upload_to='events/activities/', blank=True, null=True, help_text="Event activities image 1")
    EventActivitiesimageTwo = models.ImageField(upload_to='events/activities/', blank=True, null=True, help_text="Event activities image 2")
    
    # Event Details
    EventDetailOrganizer = models.CharField(max_length=255, help_text="Event organizer name")
    EventEndDate = models.DateField(help_text="Event end date")
    EventTime = models.CharField(max_length=50, help_text="Event time (e.g., '12:00 PM')")
    EventEmail = models.EmailField(help_text="Contact email")
    EventPhone = models.CharField(max_length=50, help_text="Contact phone number")
    
    # Status and Visibility
    is_active = models.BooleanField(default=True, help_text="Is event active/visible")
    
    # Timestamps
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)
    hideStatus = models.IntegerField(default=0)
    
    class Meta:
        ordering = ['-EventEndDate', '-createdAt']
        verbose_name = "Event"
        verbose_name_plural = "Events"
    
    def __str__(self):
        return self.EventTitle
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
    
    @property
    def detail_images(self):
        """Return empty list since detail images are removed"""
        return []
    
    @property
    def activities_images(self):
        """Return list of activities images that are not None"""
        images = []
        if self.EventActivitiesimageOne:
            images.append(self.EventActivitiesimageOne.url)
        if self.EventActivitiesimageTwo:
            images.append(self.EventActivitiesimageTwo.url)
        return images


class EventInterestModel(models.Model):
    """Model to track member interest in events"""
    id = models.AutoField(primary_key=True)
    member = models.ForeignKey(MemberModel, on_delete=models.CASCADE, related_name="event_interests")
    event = models.ForeignKey(EventModel, on_delete=models.CASCADE, related_name="member_interests")
    is_interested = models.BooleanField(default=True)
    interested_date = models.DateTimeField(auto_now_add=True)
    hideStatus = models.IntegerField(default=0)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('member', 'event')
        verbose_name = "Event Interest"
        verbose_name_plural = "Event Interests"
        ordering = ['-interested_date']

    def __str__(self):
        return f"{self.member.firstName} - {self.event.EventTitle}"


class ProtocolModel(models.Model):
    """Model for managing golf club protocols"""
    id = models.AutoField(primary_key=True)
    protocolTitle = models.CharField(max_length=255, help_text="Protocol title")
    protocolDescription = models.TextField(help_text="Protocol description")
    hideStatus = models.IntegerField(default=0)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-createdAt']
        verbose_name = "Protocol"
        verbose_name_plural = "Protocols"
    
    def __str__(self):
        return self.protocolTitle


class InstructorModel(models.Model):
    """Model for managing golf club instructors"""
    id = models.AutoField(primary_key=True)
    instructorName = models.CharField(max_length=255, help_text="Instructor name")
    instructorPosition = models.CharField(max_length=255, help_text="Instructor position/role")
    instructorPhoto = models.ImageField(upload_to='instructor_photos/', help_text="Instructor photo", blank=True, null=True)
    facebookUrl = models.URLField(max_length=500, blank=True, null=True, help_text="Facebook profile URL")
    instagramUrl = models.URLField(max_length=500, blank=True, null=True, help_text="Instagram profile URL")
    twitterUrl = models.URLField(max_length=500, blank=True, null=True, help_text="Twitter/X profile URL")
    hideStatus = models.IntegerField(default=0)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['instructorName']
        verbose_name = "Instructor"
        verbose_name_plural = "Instructors"
    
    def __str__(self):
        return f"{self.instructorName} - {self.instructorPosition}"


class MessageModel(models.Model):
    """Model for storing messages from contact forms"""
    STATUS_CHOICES = [
        ('new', 'New'),
        ('read', 'Read'),
        ('replied', 'Replied'),
        ('closed', 'Closed')
    ]
    
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255, help_text="Name of the message sender")
    email = models.EmailField(help_text="Email address of the sender")
    phone = models.CharField(max_length=20, null=True, blank=True, help_text="Phone number of the sender")
    subject = models.CharField(max_length=255, help_text="Message subject")
    description = models.TextField(help_text="Message description/content")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new', help_text="Message status")
    hideStatus = models.IntegerField(default=0)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-createdAt']
        verbose_name = "Message"
        verbose_name_plural = "Messages"
    
    def __str__(self):
        return f"{self.name} - {self.subject} ({self.status})"
    
    @property
    def is_read(self):
        """Check if message has been read"""
        return self.status in ['read', 'replied', 'closed']
    
    @property
    def is_new(self):
        """Check if message is new"""
        return self.status == 'new'
    
    def mark_as_read(self):
        """Mark message as read"""
        if self.status == 'new':
            self.status = 'read'
            self.save(update_fields=['status', 'updatedAt'])
    
    def mark_as_replied(self):
        """Mark message as replied"""
        self.status = 'replied'
        self.save(update_fields=['status', 'updatedAt'])
    
    def mark_as_closed(self):
        """Mark message as closed"""
        self.status = 'closed'
        self.save(update_fields=['status', 'updatedAt'])


class FAQModel(models.Model):
    """Model for managing FAQ entries"""
    id = models.AutoField(primary_key=True)
    faqQuestion = models.CharField(max_length=500, help_text="FAQ question")
    faqAnswer = models.TextField(help_text="FAQ answer")
    hideStatus = models.IntegerField(default=0)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-createdAt']
        verbose_name = "FAQ"
        verbose_name_plural = "FAQs"
    
    def __str__(self):
        return f"{self.faqQuestion[:50]}..."
    
    @property
    def short_question(self):
        """Return shortened question for display"""
        return self.faqQuestion[:100] + "..." if len(self.faqQuestion) > 100 else self.faqQuestion



