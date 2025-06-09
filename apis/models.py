from django.db import models
from tinymce.models import HTMLField
from django.core.validators import MaxValueValidator
from django.db import transaction
import uuid


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
    firstName = models.CharField(max_length=150, null=True, blank=True)
    lastName = models.CharField(max_length=150, null=True, blank=True)
    email = models.EmailField(unique=True, null=True, blank=True)
    password = models.CharField(max_length=100, null=True, blank=True)
    encrypted_password = models.TextField(null=True, blank=True)
    hashed_password = models.TextField(null=True, blank=True)
    phoneNumber = models.CharField(max_length=20, null=True, blank=True)
    alternatePhoneNumber = models.CharField(max_length=20, null=True, blank=True)
    dateOfBirth = models.DateField(null=True, blank=True)
    gender = models.ForeignKey(GenderModel, on_delete=models.CASCADE, null=True, blank=True,
                               related_name="memberGender")
    nationality = models.ForeignKey(CountryModel, on_delete=models.CASCADE, null=True, blank=True,
                                    related_name="memberNationality")
    address = models.TextField(null=True, blank=True)
    plan = models.ForeignKey(PlanModel, on_delete=models.CASCADE, null=True, blank=True, related_name="memberPlan")
    membershipStartDate = models.DateField(null=True, blank=True)
    membershipEndDate = models.DateField(null=True, blank=True)
    emergencyContactName = models.CharField(max_length=200, null=True, blank=True)
    emergencyContactPhone = models.CharField(max_length=20, null=True, blank=True)
    emergencyContactRelation = models.CharField(max_length=100, null=True, blank=True)
    paymentStatus = models.ForeignKey(PaymentStatusModel, on_delete=models.CASCADE, null=True, blank=True,
                                      related_name="memberPaymentStatus")
    paymentMethod = models.ForeignKey(PaymentMethodModel, on_delete=models.CASCADE, null=True, blank=True,
                                      related_name="memberPaymentMethod")
    referredBy = models.CharField(max_length=200, null=True, blank=True)
    profilePhoto = models.ImageField(upload_to="member_photos/", null=True, blank=True)
    idProof = models.FileField(upload_to="member_id_proofs/", null=True, blank=True)
    handicap = models.BooleanField(default=False)
    golfClubId = models.CharField(max_length=100, null=True, blank=True)
    qr_token = models.CharField(max_length=255, null=True, blank=True, unique=True)  # New field for QR security
    hideStatus = models.IntegerField(default=0)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.qr_token:
            self.qr_token = str(uuid.uuid4())
        super().save(*args, **kwargs)


class AmenitiesModel(models.Model):
    id = models.AutoField(primary_key=True)
    amenityName = models.CharField(max_length=200, null=True, blank=True)
    amenityIcon = models.TextField(null=True, blank=True)  # Changed to TextField for SVG content
    amenityTooltip = models.CharField(max_length=500, null=True, blank=True)
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
            # Extract path data from SVG
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
    courseNumber = models.CharField(max_length=50, null=True, blank=True)
    streetName = models.CharField(max_length=255, null=True, blank=True)
    locality = models.CharField(max_length=255, null=True, blank=True)
    town = models.CharField(max_length=255, null=True, blank=True)
    postcode = models.CharField(max_length=20, null=True, blank=True)
    country = models.CharField(max_length=100, null=True, blank=True)
    phoneNumber = models.CharField(max_length=20, null=True, blank=True)
    website = models.URLField(max_length=255, null=True, blank=True)
    timing = models.CharField(max_length=255, null=True, blank=True)  # New field for timing info
    amenities = models.ManyToManyField(AmenitiesModel, blank=True, related_name="courses")
    courseImage = models.ImageField(upload_to='course_images/', null=True, blank=True)
    golfDescription = models.TextField(null=True, blank=True)
    golfHighlight = models.TextField(null=True, blank=True)
    golfLocation = models.CharField(max_length=255, null=True, blank=True)
    hideStatus = models.IntegerField(default=0)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.courseName or f"Course {self.id}"

    @property
    def full_address(self):
        """Return formatted full address"""
        address_parts = []
        if self.streetName:
            address_parts.append(self.streetName)
        if self.locality:
            address_parts.append(self.locality)
        if self.town:
            address_parts.append(self.town)
        return ', '.join(address_parts)


class BlogModel(models.Model):
    blogDate = models.DateField()
    blogTitle = models.CharField(max_length=255)
    blogHighlight = models.TextField(null=True, blank=True)
    blogDescription = HTMLField()
    blogImage = models.ImageField(upload_to='blog_images/', null=True, blank=True)
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
    contactEnquiryDate = models.DateField(auto_now_add=True)
    contactEnquiryFirstName = models.CharField(max_length=255)
    contactEnquiryLastName = models.CharField(max_length=255)
    contactEnquiryPhoneNumber = models.CharField(max_length=20, null=True, blank=True)
    contactEnquiryEmail = models.EmailField(unique=True, null=True, blank=True)
    contactEnquiryMessage = models.TextField()
    hideStatus = models.IntegerField(default=0)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)


class MemberEnquiryModel(models.Model):
    memberEnquiryDate = models.DateField(auto_now_add=True)
    memberEnquiryPlan = models.ForeignKey(PlanModel, on_delete=models.CASCADE, null=True, blank=True,
                                          related_name="memberEnquiryPlan")
    memberEnquiryFirstName = models.CharField(max_length=255)
    memberEnquiryLastName = models.CharField(max_length=255)
    memberEnquiryPhoneNumber = models.CharField(max_length=20, null=True, blank=True)
    memberEnquiryEmail = models.EmailField(null=True, blank=True)
    memberEnquiryAddressLine1 = models.CharField(max_length=255)
    memberEnquiryAddressLine2 = models.CharField(max_length=255, null=True, blank=True)
    memberEnquiryTown = models.CharField(max_length=100)
    memberEnquiryPostcode = models.CharField(max_length=20)
    memberEnquiryCounty_or_city = models.CharField(max_length=100)
    memberEnquiryDateOfBirth = models.DateField(null=True, blank=True)
    memberEnquiryCompanyName = models.CharField(max_length=255, null=True, blank=True)
    memberEnquiryHowDidYouHearAboutOGC = models.CharField(max_length=255, null=True, blank=True)
    memberEnquiryNameOfMGCMember = models.CharField(max_length=255, null=True, blank=True)
    memberEnquiryCurrentClub = models.CharField(max_length=255, null=True, blank=True)
    memberEnquiryHandicap = models.CharField(max_length=10, null=True, blank=True)
    memberEnquirySocietyDays = models.BooleanField(default=False)
    memberEnquiryGroupCoaching = models.BooleanField(default=False)
    memberEnquiryUkGolfTrips = models.BooleanField(default=False)
    memberEnquiryGolfAbroad = models.BooleanField(default=False)
    memberEnquiryMessage = models.TextField()
    passportPhoto = models.ImageField(upload_to='member_photos/', null=True, blank=True)
    hideStatus = models.IntegerField(default=0)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)
