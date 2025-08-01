from rest_framework import serializers
from .models import *
from django.utils import timezone
import json
import decimal


class UserTypeModelSerializers(serializers.ModelSerializer):
    class Meta:
        model = UserTypeModel
        fields = '__all__'


class CountryModelSerializers(serializers.ModelSerializer):
    class Meta:
        model = CountryModel
        fields = '__all__'


class PaymentMethodModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethodModel
        fields = '__all__'


class PaymentStatusModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentStatusModel
        fields = '__all__'


class GenderModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = GenderModel
        fields = '__all__'


class PlanTypeModelSerializers(serializers.ModelSerializer):
    class Meta:
        model = PlanTypeModel
        fields = '__all__'


class PlanDurationModelSerializers(serializers.ModelSerializer):
    class Meta:
        model = PlanDurationModel
        fields = '__all__'


class PlanCycleModelSerializers(serializers.ModelSerializer):
    class Meta:
        model = PlanCycleModel
        fields = '__all__'


class PlanModelSerializers(serializers.ModelSerializer):
    planType = serializers.PrimaryKeyRelatedField(queryset=PlanTypeModel.objects.all())
    planDuration = serializers.PrimaryKeyRelatedField(queryset=PlanDurationModel.objects.all())
    planCycle = serializers.PrimaryKeyRelatedField(queryset=PlanCycleModel.objects.all())

    class Meta:
        model = PlanModel
        fields = '__all__'

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['planType'] = instance.planType.planTypeName if instance.planType else None
        representation['planDuration'] = instance.planDuration.planDurationName if instance.planDuration else None
        representation['planCycle'] = instance.planCycle.planCycleName if instance.planCycle else None
        return representation


class MemberModelSerializers(serializers.ModelSerializer):
    # Make these fields optional in serializer by allowing empty values
    gender = serializers.PrimaryKeyRelatedField(
        queryset=GenderModel.objects.all(), 
        required=False, 
        allow_null=True,
        allow_empty=True
    )
    nationality = serializers.PrimaryKeyRelatedField(
        queryset=CountryModel.objects.all(), 
        required=False, 
        allow_null=True,
        allow_empty=True
    )
    plan = serializers.PrimaryKeyRelatedField(
        queryset=PlanModel.objects.all(),
        required=True  # This remains required
    )
    paymentStatus = serializers.PrimaryKeyRelatedField(
        queryset=PaymentStatusModel.objects.all(), 
        required=False, 
        allow_null=True,
        allow_empty=True
    )
    paymentMethod = serializers.PrimaryKeyRelatedField(
        queryset=PaymentMethodModel.objects.all(), 
        required=False, 
        allow_null=True,
        allow_empty=True
    )

    class Meta:
        model = MemberModel
        fields = '__all__'
        extra_kwargs = {
            'encrypted_password': {'write_only': True},
            'hashed_password': {'write_only': True},
            # Make sure only required fields are enforced
            'firstName': {'required': True},
            'lastName': {'required': True},
            'email': {'required': True},
            'phoneNumber': {'required': True},
            'plan': {'required': True},
            # Optional fields
            'gender': {'required': False},
            'nationality': {'required': False},
            'paymentStatus': {'required': False},
            'paymentMethod': {'required': False},
            'alternatePhoneNumber': {'required': False},
            'dateOfBirth': {'required': False},
            'address': {'required': False},
            'membershipStartDate': {'required': False},
            'membershipEndDate': {'required': False},
            'emergencyContactName': {'required': False},
            'emergencyContactPhone': {'required': False},
            'emergencyContactRelation': {'required': False},
            'referredBy': {'required': False},
            'profilePhoto': {'required': False},
            'idProof': {'required': False},
            'handicap': {'required': False},
            'golfClubId': {'required': False},
            'enquiryId': {'required': False},
            'enquiryMessage': {'required': False},
        }

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['gender'] = instance.gender.genderName if instance.gender else None
        representation['nationality'] = instance.nationality.countryName if instance.nationality else None
        representation['plan'] = instance.plan.planName if instance.plan else None
        representation['paymentStatus'] = instance.paymentStatus.statusName if instance.paymentStatus else None
        representation['paymentMethod'] = instance.paymentMethod.methodName if instance.paymentMethod else None
        return representation

    def validate(self, data):
        """
        Custom validation to handle empty string values for foreign key fields
        """
        # Convert empty strings to None for foreign key fields
        for field in ['gender', 'nationality', 'paymentStatus', 'paymentMethod']:
            if field in data and (data[field] == '' or data[field] == 'null'):
                data[field] = None
        
        return data


class MemberQRDetailSerializer(serializers.ModelSerializer):
    gender = serializers.SerializerMethodField()
    nationality = serializers.SerializerMethodField()
    plan = serializers.SerializerMethodField()
    fullName = serializers.SerializerMethodField()
    profilePhotoUrl = serializers.SerializerMethodField()

    class Meta:
        model = MemberModel
        fields = [
            'golfClubId', 'fullName', 'phoneNumber', 'dateOfBirth', 
            'gender', 'address', 'nationality', 'profilePhotoUrl',
            'plan', 'membershipStartDate', 'membershipEndDate'
        ]

    def get_gender(self, obj):
        return obj.gender.genderName if obj.gender else None

    def get_nationality(self, obj):
        return obj.nationality.countryName if obj.nationality else None

    def get_plan(self, obj):
        return obj.plan.planName if obj.plan else None

    def get_fullName(self, obj):
        first_name = obj.firstName or ""
        last_name = obj.lastName or ""
        return f"{first_name} {last_name}".strip()

    def get_profilePhotoUrl(self, obj):
        if obj.profilePhoto:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profilePhoto.url)
        return None


class AmenitiesModelSerializers(serializers.ModelSerializer):
    amenity_icon_svg = serializers.SerializerMethodField()
    amenity_icon_path = serializers.SerializerMethodField()
    amenity_viewbox = serializers.SerializerMethodField()
    
    class Meta:
        model = AmenitiesModel
        fields = '__all__'
    
    def get_amenity_icon_svg(self, obj):
        """Return full SVG content"""
        return obj.amenity_icon_svg
    
    def get_amenity_icon_path(self, obj):
        """Return only the path data for flexible rendering"""
        return obj.get_icon_path_only()
    
    def get_amenity_viewbox(self, obj):
        """Return viewBox for proper scaling"""
        return obj.get_viewbox()


class CollectionSerializer(serializers.ModelSerializer):
    """Optimized serializer for collection view - only necessary fields"""
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(source='courseName', read_only=True)
    address = serializers.CharField(source='courseAddress', read_only=True)
    timing = serializers.CharField(source='courseOpenFrom', read_only=True)
    phone = serializers.CharField(source='coursePhoneNumber', read_only=True)
    website = serializers.URLField(source='courseWebsite', read_only=True)
    imageUrl = serializers.SerializerMethodField()
    amenities = serializers.SerializerMethodField()

    class Meta:
        model = CourseModel
        fields = [
            'id', 'name', 'address', 'timing', 
            'phone', 'website', 'imageUrl', 'amenities'
        ]

    def get_amenities(self, obj):
        """Return amenity IDs as expected by frontend"""
        return list(obj.courseAmenities.filter(hideStatus=0).values_list('id', flat=True))

    def get_imageUrl(self, obj):
        """Return full image URL"""
        if obj.courseImage:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.courseImage.url)
            return obj.courseImage.url
        return 'assets/images/news/default-course.jpg'


class CourseDetailSerializer(serializers.ModelSerializer):
    """Full serializer for detailed course view"""
    name = serializers.CharField(source='courseName', read_only=True)
    address = serializers.CharField(source='courseAddress', read_only=True)
    timing = serializers.CharField(source='courseOpenFrom', read_only=True)
    phone = serializers.CharField(source='coursePhoneNumber', read_only=True)
    alternatePhone = serializers.CharField(source='courseAlternatePhoneNumber', read_only=True)
    website = serializers.URLField(source='courseWebsite', read_only=True)
    description = serializers.CharField(source='courseDescription', read_only=True)
    location = serializers.CharField(source='courseLocation', read_only=True)
    imageUrl = serializers.SerializerMethodField()
    amenities = serializers.SerializerMethodField()
    allContacts = serializers.ReadOnlyField(source='all_contacts')
    tees = serializers.SerializerMethodField()

    class Meta:
        model = CourseModel
        fields = [
            'id', 'name', 'address', 'timing', 'phone', 'alternatePhone',
            'website', 'description', 'location', 'imageUrl', 'amenities', 'allContacts', 'tees'
        ]

    def get_amenities(self, obj):
        """Return amenity IDs as expected by frontend"""
        return list(obj.courseAmenities.filter(hideStatus=0).values_list('id', flat=True))

    def get_imageUrl(self, obj):
        """Return full image URL"""
        if obj.courseImage:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.courseImage.url)
            return obj.courseImage.url
        return 'assets/images/news/default-course.jpg'
    
    def get_tees(self, obj):
        """Get all available tees for this course"""
        tees = obj.available_tees
        return TeeSerializer(tees, many=True).data


class CourseCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating courses"""
    courseAmenities = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True
    )
    
    class Meta:
        model = CourseModel
        fields = [
            'courseName', 'courseAddress', 'courseOpenFrom', 
            'coursePhoneNumber', 'courseAlternatePhoneNumber', 'courseWebsite',
            'courseDescription', 'courseLocation', 'courseImage', 
            'courseAmenities', 'hideStatus'
        ]
    
    def validate_courseAmenities(self, value):
        """Validate that all amenity IDs exist"""
        if value:
            # Convert to integers if they're strings
            try:
                amenity_ids = [int(amenity_id) for amenity_id in value]
            except (ValueError, TypeError):
                raise serializers.ValidationError("Invalid amenity IDs provided")
            
            existing_ids = set(AmenitiesModel.objects.filter(
                id__in=amenity_ids, 
                hideStatus=0
            ).values_list('id', flat=True))
            
            invalid_ids = set(amenity_ids) - existing_ids
            if invalid_ids:
                raise serializers.ValidationError(
                    f"Invalid amenity IDs: {list(invalid_ids)}"
                )
            
            # Return the converted list
            return amenity_ids
        return value
    

    
    def create(self, validated_data):
        amenities_data = validated_data.pop('courseAmenities', [])
        course = CourseModel.objects.create(**validated_data)
        
        if amenities_data:
            course.courseAmenities.set(amenities_data)
        
        return course
    
    def update(self, instance, validated_data):
        amenities_data = validated_data.pop('courseAmenities', None)
        
        # Update all other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update amenities if provided
        if amenities_data is not None:
            instance.courseAmenities.set(amenities_data)
        
        return instance


class LegacyCollectionSerializer(serializers.ModelSerializer):
    """Serializer to maintain compatibility with existing frontend structure"""
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(source='courseName', read_only=True)
    lane = serializers.SerializerMethodField()  # Extract first part of address
    address = serializers.SerializerMethodField()  # Extract remaining address
    code = serializers.SerializerMethodField()  # Extract postcode if present
    timing = serializers.CharField(source='courseOpenFrom', read_only=True)
    phone = serializers.CharField(source='coursePhoneNumber', read_only=True)
    website = serializers.URLField(source='courseWebsite', read_only=True)
    imageUrl = serializers.SerializerMethodField()
    amenities = serializers.SerializerMethodField()

    class Meta:
        model = CourseModel
        fields = [
            'id', 'name', 'lane', 'address', 'code', 'timing',
            'phone', 'website', 'imageUrl', 'amenities'
        ]

    def get_lane(self, obj):
        """Extract first part of address as lane"""
        if obj.courseAddress:
            parts = obj.courseAddress.split(',')
            return parts[0].strip() if parts else ""
        return ""

    def get_address(self, obj):
        """Extract remaining address parts"""
        if obj.courseAddress:
            parts = obj.courseAddress.split(',')
            if len(parts) > 1:
                return ', '.join(part.strip() for part in parts[1:-1])
        return ""

    def get_code(self, obj):
        """Extract postcode (assumed to be last part of address)"""
        if obj.courseAddress:
            parts = obj.courseAddress.split(',')
            if len(parts) > 1:
                last_part = parts[-1].strip()
                # Simple postcode pattern check
                import re
                if re.match(r'^[A-Z]{1,2}\d{1,2}\s?\d[A-Z]{2}$', last_part):
                    return last_part
        return ""

    def get_amenities(self, obj):
        """Return amenity IDs as expected by frontend"""
        return list(obj.courseAmenities.filter(hideStatus=0).values_list('id', flat=True))

    def get_imageUrl(self, obj):
        """Return full image URL"""
        if obj.courseImage:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.courseImage.url)
            return obj.courseImage.url
        return 'assets/images/news/default-course.jpg'


class TeeSerializer(serializers.ModelSerializer):
    courseId = serializers.IntegerField(source='course.id', read_only=True)
    courseName = serializers.CharField(source='course.courseName', read_only=True)
    formattedPrice = serializers.CharField(source='formatted_price', read_only=True)
    label = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = TeeModel
        fields = [
            'id', 'courseId', 'courseName', 'holeNumber', 
            'pricePerPerson', 'formattedPrice', 'label',
            'course', 'hideStatus'
        ]
        extra_kwargs = {
            'course': {'required': True},
            'holeNumber': {'required': True},
            'pricePerPerson': {'required': True}
        }
    
    def get_label(self, obj):
        return f"{obj.holeNumber} Holes"
    
    def validate_holeNumber(self, value):
        if value <= 0:
            raise serializers.ValidationError("Hole number must be a positive integer")
        return value
    
    def validate_pricePerPerson(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price per person must be greater than 0")
        return value

class BookingSerializer(serializers.ModelSerializer):
    memberName = serializers.CharField(source='member.firstName', read_only=True)
    memberFullName = serializers.SerializerMethodField(read_only=True)
    courseName = serializers.CharField(source='course.courseName', read_only=True)
    teeInfo = serializers.SerializerMethodField(read_only=True)
    canCancel = serializers.BooleanField(source='can_cancel', read_only=True)
    endTime = serializers.TimeField(source='end_time', read_only=True)
    formattedDate = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = BookingModel
        fields = [
            'id', 'member', 'memberName', 'memberFullName', 'course', 'courseName',
            'tee', 'teeInfo', 'bookingDate', 'formattedDate', 'bookingTime', 'endTime',
            'participants', 'totalPrice', 'status', 'notes', 'canCancel'
        ]
    
    def get_memberFullName(self, obj):
        return f"{obj.member.firstName} {obj.member.lastName}"
    
    def get_teeInfo(self, obj):
        return f"{obj.tee.holeNumber} Holes @ {obj.tee.formatted_price}"
    
    def get_formattedDate(self, obj):
        return obj.bookingDate.strftime('%B %d, %Y')
    
    def validate_bookingDate(self, value):
        if value < timezone.now().date():
            raise serializers.ValidationError("Cannot book for past dates")
        return value
    
    def validate_participants(self, value):
        if value < 1 or value > 4:
            raise serializers.ValidationError("Participants must be between 1 and 4")
        return value




class BlogModelSerializers(serializers.ModelSerializer):
    class Meta:
        model = BlogModel
        fields = '__all__'


class ConceptItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConceptItem
        fields = ['id', 'heading', 'paragraph', 'order', 'hideStatus']

class ConceptModelSerializer(serializers.ModelSerializer):
    items = ConceptItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = ConceptModel
        fields = ['id', 'conceptHighlight', 'conceptCount', 'items', 'hideStatus', 'createdAt', 'updatedAt']


class ContactEnquiryModelSerializers(serializers.ModelSerializer):
    class Meta:
        model = ContactEnquiryModel
        fields = '__all__'


class MemberEnquiryModelSerializers(serializers.ModelSerializer):
    selected_plan_id = serializers.IntegerField(write_only=True, required=False)
    selected_plan_name = serializers.CharField(write_only=True, required=False)
    
    # Add fields for conversion tracking - mapping to the correct model field names
    isConverted = serializers.BooleanField(source='is_converted', required=False, default=False)
    convertedMemberId = serializers.CharField(source='converted_member_id', max_length=50, required=False, allow_blank=True)
    convertedDate = serializers.DateTimeField(source='converted_date', required=False, allow_null=True)
    
    class Meta:
        model = MemberEnquiryModel
        fields = '__all__'
        extra_kwargs = {
            'memberEnquiryPlan': {'required': False}
        }

    def create(self, validated_data):
        # Handle plan assignment from selected_plan_id
        plan_id = validated_data.pop('selected_plan_id', None)
        validated_data.pop('selected_plan_name', None)  # Remove plan name as it's not needed for creation
        
        if plan_id:
            try:
                plan = PlanModel.objects.get(id=plan_id)
                validated_data['memberEnquiryPlan'] = plan
            except PlanModel.DoesNotExist:
                pass  # Plan will remain None if not found
        
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Handle plan assignment from selected_plan_id for updates
        plan_id = validated_data.pop('selected_plan_id', None)
        validated_data.pop('selected_plan_name', None)  # Remove plan name as it's not needed for update
        
        if plan_id:
            try:
                plan = PlanModel.objects.get(id=plan_id)
                validated_data['memberEnquiryPlan'] = plan
            except PlanModel.DoesNotExist:
                pass  # Keep existing plan if new one not found
        
        # Handle conversion date automatically if is_converted is being set to True
        if validated_data.get('is_converted', False) and not instance.is_converted:
            validated_data['converted_date'] = timezone.now()
        
        return super().update(instance, validated_data)

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        
        # Handle plan representation - return the plan object for frontend compatibility
        if instance.memberEnquiryPlan:
            representation['memberEnquiryPlan'] = {
                'id': instance.memberEnquiryPlan.id,
                'planName': instance.memberEnquiryPlan.planName
            }
        else:
            representation['memberEnquiryPlan'] = None
        
        # Include conversion status fields in response with correct field names
        representation['isConverted'] = instance.is_converted
        representation['convertedMemberId'] = instance.converted_member_id
        representation['convertedDate'] = instance.converted_date.isoformat() if instance.converted_date else None
        
        return representation
