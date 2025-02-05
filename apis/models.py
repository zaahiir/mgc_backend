from django.db import models


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


class AmenitiesModel(models.Model):
    id = models.AutoField(primary_key=True)
    amenityName = models.CharField(max_length=200, null=True, blank=True)
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
    hideStatus = models.IntegerField(default=0)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)


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
    amenities = models.ManyToManyField(AmenitiesModel, blank=True, related_name="amenities")
    courseImage = models.ImageField(upload_to='course_images/', null=True, blank=True)
    golfDescription = models.TextField(null=True, blank=True)
    golfLocation = models.CharField(max_length=255, null=True, blank=True)
    hideStatus = models.IntegerField(default=0)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)


class BlogModel(models.Model):
    blogDate = models.DateField()
    blogTitle = models.CharField(max_length=255)
    blogDescription = models.TextField()
    blogImage = models.ImageField(upload_to='blog_images/', null=True, blank=True)
    hideStatus = models.IntegerField(default=0)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)
