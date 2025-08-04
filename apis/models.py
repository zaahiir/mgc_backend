from django.db import models
from tinymce.models import HTMLField
from django.core.validators import MaxValueValidator
from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal
import uuid
import datetime


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


class PlanTypeModel(models.Model):
    id = models.AutoField(primary_key=True)
    planTypeName = models.CharField(max_length=200, null=True, blank=True)
    hideStatus = models.IntegerField(default=0)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)


class PlanDurationModel(models.Model):
    id = models.AutoField(primary_key=True)
    planDurationName = models.CharField(max_length=200, null=True, blank=True)
    hideStatus = models.IntegerField(default=0)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)


class PlanCycleModel(models.Model):
    id = models.AutoField(primary_key=True)
    planCycleName = models.CharField(max_length=200, null=True, blank=True)
    hideStatus = models.IntegerField(default=0)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)


# Start of Master
class PlanModel(models.Model):
    id = models.AutoField(primary_key=True)
    planName = models.CharField(max_length=255, null=True, blank=True)
    planDescription = models.CharField(max_length=255, null=True, blank=True)
    planType = models.ForeignKey(PlanTypeModel, on_delete=models.CASCADE, related_name="planType", null=True,
                                 blank=True)
    planDuration = models.ForeignKey(PlanDurationModel, on_delete=models.CASCADE, related_name="planDuration",
                                     null=True, blank=True)
    planPrice = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    planCycle = models.ForeignKey(PlanCycleModel, on_delete=models.CASCADE, related_name="planCycle",
                                  null=True, blank=True)
    hideStatus = models.IntegerField(default=0)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)


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
    dateOfBirth = models.DateField(null=True, blank=True)
    gender = models.ForeignKey('GenderModel', on_delete=models.CASCADE, null=True, blank=True,
                               related_name="memberGender")
    nationality = models.ForeignKey('CountryModel', on_delete=models.CASCADE, null=True, blank=True,
                                    related_name="memberNationality")
    address = models.TextField(null=True, blank=True)
    plan = models.ForeignKey('PlanModel', on_delete=models.CASCADE, related_name="memberPlan")  # Required
    membershipStartDate = models.DateField(null=True, blank=True)
    membershipEndDate = models.DateField(null=True, blank=True)
    emergencyContactName = models.CharField(max_length=200, null=True, blank=True)
    emergencyContactPhone = models.CharField(max_length=20, null=True, blank=True)
    emergencyContactRelation = models.CharField(max_length=100, null=True, blank=True)
    paymentStatus = models.ForeignKey('PaymentStatusModel', on_delete=models.CASCADE, null=True, blank=True,
                                      related_name="memberPaymentStatus")
    paymentMethod = models.ForeignKey('PaymentMethodModel', on_delete=models.CASCADE, null=True, blank=True,
                                      related_name="memberPaymentMethod")
    referredBy = models.CharField(max_length=200, null=True, blank=True)
    profilePhoto = models.ImageField(upload_to="member_photos/", null=True, blank=True)
    idProof = models.FileField(upload_to="member_id_proofs/", null=True, blank=True)
    handicap = models.BooleanField(default=False)
    golfClubId = models.CharField(max_length=100, null=True, blank=True)
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
        super().save(*args, **kwargs)

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
    def formatted_price(self):
        return "₹0"  # Default price since pricePerPerson is removed
    
    @property
    def price_per_hour(self):
        # Calculate hours based on hole number: approximately 10 minutes per hole
        hours_per_hole = 0.167
        total_hours = self.holeNumber * hours_per_hole
        return Decimal('0') / Decimal(str(total_hours))  # Return 0 since price is removed


class BookingModel(models.Model):
    id = models.AutoField(primary_key=True)

    member = models.ForeignKey(MemberModel, on_delete=models.CASCADE, related_name="bookings")
    course = models.ForeignKey(CourseModel, on_delete=models.CASCADE, related_name="bookings")
    tee = models.ForeignKey(TeeModel, on_delete=models.CASCADE, related_name="bookings")

    bookingDate = models.DateField()
    bookingTime = models.TimeField()
    participants = models.PositiveIntegerField(default=1)
    totalPrice = models.DecimalField(max_digits=10, decimal_places=2)

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled')
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    notes = models.TextField(null=True, blank=True)
    hideStatus = models.IntegerField(default=0)
    
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Calculate totalPrice automatically if not provided
        if not self.totalPrice:
            # Since pricePerPerson is removed, set totalPrice to 0 or a default value
            self.totalPrice = Decimal('0')
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.member.firstName} - {self.course.courseName} on {self.bookingDate}"
    
    def clean(self):
        super().clean()
        # Validate booking date is not in the past
        if self.bookingDate < timezone.now().date():
            raise ValidationError("Cannot book for past dates")
        
        # Validate booking time is reasonable (6 AM to 8 PM)
        if not (6 <= self.bookingTime.hour <= 20):
            raise ValidationError("Booking time must be between 6:00 AM and 8:00 PM")
        
        # Check for overlapping bookings
        overlapping = BookingModel.objects.filter(
            course=self.course,
            bookingDate=self.bookingDate,
            bookingTime=self.bookingTime,
            status__in=['pending', 'confirmed']
        ).exclude(id=self.id if self.id else None)
        
        if overlapping.exists():
            raise ValidationError("This time slot is already booked")
    
    @property
    def duration_hours(self):
        # Calculate hours based on hole number: approximately 10 minutes per hole
        hours_per_hole = 0.167
        return self.tee.holeNumber * hours_per_hole
    
    @property
    def end_time(self):
        from datetime import datetime, timedelta
        start_datetime = datetime.combine(self.bookingDate, self.bookingTime)
        duration = timedelta(hours=self.duration_hours)
        return (start_datetime + duration).time()
    
    @property
    def can_cancel(self):
        # Allow cancellation up to 24 hours before booking
        booking_datetime = timezone.datetime.combine(self.bookingDate, self.bookingTime)
        return booking_datetime - timezone.now() > timezone.timedelta(hours=24)




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
    memberEnquiryPlan = models.ForeignKey(
        PlanModel, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name="memberEnquiryPlan"
    )
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



