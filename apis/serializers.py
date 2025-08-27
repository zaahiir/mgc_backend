from rest_framework import serializers
from .models import *
from django.utils import timezone
import json
import decimal
import pytz


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





class PlanFeatureSerializer(serializers.ModelSerializer):
    """Serializer for plan features"""
    plan = serializers.PrimaryKeyRelatedField(queryset=PlanModel.objects.all())
    
    class Meta:
        model = PlanFeatureModel
        fields = ['id', 'plan', 'featureName', 'isIncluded', 'order', 'hideStatus', 'createdAt', 'updatedAt']
        extra_kwargs = {
            'featureName': {'required': True},
            'isIncluded': {'required': True},
        }

    def validate_featureName(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Feature name cannot be empty")
        return value.strip()


class PlanModelSerializers(serializers.ModelSerializer):
    features = PlanFeatureSerializer(many=True, read_only=True)
    
    class Meta:
        model = PlanModel
        fields = '__all__'
        extra_kwargs = {
            'planName': {'required': True},
            'planDescription': {'required': True},
            'planDuration': {'required': True},
            'planPrice': {'required': True},
        }

    def validate_planPrice(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Plan price cannot be negative")
        return value

    def validate_planDuration(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("Plan duration must be a positive number of years")
        return value


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
    plan = serializers.IntegerField(required=True)

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
            'alternatePhoneNumber': {'required': False},
            'alternateEmail': {'required': False},
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
        # Get plan name from plan ID
        if instance.plan:
            try:
                plan_obj = PlanModel.objects.get(id=instance.plan)
                representation['plan'] = plan_obj.planName
            except (PlanModel.DoesNotExist, TypeError, ValueError, AttributeError):
                representation['plan'] = None
        else:
            representation['plan'] = None
        return representation

    def validate(self, data):
        """
        Custom validation to handle empty string values for foreign key fields
        """
        # Convert empty strings to None for foreign key fields
        for field in ['gender', 'nationality']:
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
        try:
            return obj.gender.genderName if obj.gender else None
        except (TypeError, ValueError, AttributeError):
            return None

    def get_nationality(self, obj):
        try:
            return obj.nationality.countryName if obj.nationality else None
        except (TypeError, ValueError, AttributeError):
            return None

    def get_plan(self, obj):
        if obj.plan:
            try:
                plan_obj = PlanModel.objects.get(id=obj.plan)
                return plan_obj.planName
            except (PlanModel.DoesNotExist, TypeError, ValueError, AttributeError):
                return None
        return None

    def get_fullName(self, obj):
        try:
            first_name = obj.firstName or ""
            last_name = obj.lastName or ""
            return f"{first_name} {last_name}".strip()
        except (TypeError, ValueError, AttributeError):
            return "Unknown Member"

    def get_profilePhotoUrl(self, obj):
        if obj.profilePhoto:
            try:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(obj.profilePhoto.url)
                return obj.profilePhoto.url
            except (TypeError, ValueError, AttributeError):
                return None
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
        try:
            return obj.amenity_icon_svg
        except (TypeError, ValueError, AttributeError):
            return None
    
    def get_amenity_icon_path(self, obj):
        """Return only the path data for flexible rendering"""
        try:
            return obj.get_icon_path_only()
        except (TypeError, ValueError, AttributeError):
            return None
    
    def get_amenity_viewbox(self, obj):
        """Return viewBox for proper scaling"""
        try:
            return obj.get_viewbox()
        except (TypeError, ValueError, AttributeError):
            return "0 0 448 512"


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
        try:
            return list(obj.courseAmenities.filter(hideStatus=0).values_list('id', flat=True))
        except (TypeError, ValueError, AttributeError):
            return []

    def get_imageUrl(self, obj):
        """Return full image URL"""
        if obj.courseImage:
            try:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(obj.courseImage.url)
                return obj.courseImage.url
            except (TypeError, ValueError, AttributeError):
                return 'assets/images/news/default-course.jpg'
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
        """Return full amenity details with icons and descriptions"""
        try:
            amenities = obj.courseAmenities.filter(hideStatus=0)
            return AmenitiesModelSerializers(amenities, many=True, context=self.context).data
        except (TypeError, ValueError, AttributeError):
            return []

    def get_imageUrl(self, obj):
        """Return full image URL"""
        if obj.courseImage:
            try:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(obj.courseImage.url)
                return obj.courseImage.url
            except (TypeError, ValueError, AttributeError):
                return 'assets/images/news/default-course.jpg'
        return 'assets/images/news/default-course.jpg'
    
    def get_tees(self, obj):
        """Get all available tees for this course"""
        try:
            tees = obj.available_tees
            return TeeSerializer(tees, many=True).data
        except (TypeError, ValueError, AttributeError):
            return []


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
            # Handle empty strings and None values
            if isinstance(value, list):
                # Filter out empty strings, None, and 'null' values
                filtered_value = []
                for item in value:
                    if item is not None and item != '' and item != 'null':
                        try:
                            filtered_value.append(int(item))
                        except (ValueError, TypeError):
                            continue
                
                if filtered_value:
                    existing_ids = set(AmenitiesModel.objects.filter(
                        id__in=filtered_value, 
                        hideStatus=0
                    ).values_list('id', flat=True))
                    
                    invalid_ids = set(filtered_value) - existing_ids
                    if invalid_ids:
                        raise serializers.ValidationError(
                            f"Invalid amenity IDs: {list(invalid_ids)}"
                        )
                    
                    # Return the filtered list
                    return filtered_value
                else:
                    return []
            else:
                raise serializers.ValidationError("courseAmenities must be a list")
        return []
    

    
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
        try:
            return list(obj.courseAmenities.filter(hideStatus=0).values_list('id', flat=True))
        except (TypeError, ValueError, AttributeError):
            return []

    def get_imageUrl(self, obj):
        """Return full image URL"""
        if obj.courseImage:
            try:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(obj.courseImage.url)
                return obj.courseImage.url
            except (TypeError, ValueError, AttributeError):
                return 'assets/images/news/default-course.jpg'
        return 'assets/images/news/default-course.jpg'


class TeeSerializer(serializers.ModelSerializer):
    courseId = serializers.IntegerField(source='course.id', read_only=True)
    courseName = serializers.CharField(source='course.courseName', read_only=True)
    label = serializers.SerializerMethodField(read_only=True)
    estimatedDuration = serializers.CharField(source='estimated_duration', read_only=True)

    class Meta:
        model = TeeModel
        fields = [
            'id', 'courseId', 'courseName', 'holeNumber', 
            'label', 'estimatedDuration', 'course', 'hideStatus'
        ]
        extra_kwargs = {
            'course': {'required': True},
            'holeNumber': {'required': True}
        }
    
    def get_label(self, obj):
        try:
            return f"{obj.holeNumber} Holes"
        except (TypeError, ValueError, AttributeError):
            return "Unknown Tee"
    
    def validate_holeNumber(self, value):
        if value <= 0:
            raise serializers.ValidationError("Hole number must be a positive integer")
        return value

# BookingSlotSerializer removed - not needed for single-slot approach


class BookingSerializer(serializers.ModelSerializer):
    memberName = serializers.CharField(source='member.firstName', read_only=True)
    memberFullName = serializers.SerializerMethodField(read_only=True)
    memberGolfClubId = serializers.SerializerMethodField(read_only=True)
    courseName = serializers.CharField(source='course.courseName', read_only=True)
    teeInfo = serializers.SerializerMethodField(read_only=True)

    endTime = serializers.TimeField(source='end_time', read_only=True)
    formattedDate = serializers.SerializerMethodField(read_only=True)
    slotStatus = serializers.CharField(source='slot_status', read_only=True)
    availableSpots = serializers.IntegerField(source='available_spots', read_only=True)
    slotParticipantCount = serializers.IntegerField(source='slot_participant_count', read_only=True)
    canJoinSlot = serializers.SerializerMethodField(read_only=True)
    joinRequests = serializers.SerializerMethodField(read_only=True)
    originalBookingInfo = serializers.SerializerMethodField(read_only=True)
    allParticipantsInfo = serializers.SerializerMethodField(read_only=True)
    
    # Single-slot booking fields
    isMultiSlotBooking = serializers.SerializerMethodField(read_only=True)
    totalParticipants = serializers.SerializerMethodField(read_only=True)
    teeName = serializers.SerializerMethodField(read_only=True)
    slotDate = serializers.DateField(source='slot_date', required=False)
    bookingTime = serializers.TimeField(source='booking_time', required=False)
    
    # Enhanced approval tracking
    approvedBy = serializers.SerializerMethodField(read_only=True)
    approvedAt = serializers.DateTimeField(source='approved_at', read_only=True)
    
    # Enhanced status tracking
    isSlotFull = serializers.BooleanField(source='is_slot_full', read_only=True)
    canAcceptMoreParticipants = serializers.BooleanField(source='can_accept_more_participants', read_only=True)
    
    # Additional fields for orders display
    teeSummary = serializers.SerializerMethodField(read_only=True)
    
    # Multi-slot support for orders component
    slots = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = BookingModel
        fields = [
            'id', 'booking_id', 'member', 'memberName', 'memberFullName', 'memberGolfClubId', 'course', 'courseName',
            'tee', 'slot_date', 'booking_time', 'teeInfo', 'teeName', 'slotDate', 'bookingTime', 'formattedDate', 'endTime',
            'participants', 'status', 'notes', 'createdAt',
            'slotStatus', 'availableSpots', 'slotParticipantCount', 'canJoinSlot',
            'joinRequests', 'originalBookingInfo', 'allParticipantsInfo', 'is_join_request', 'original_booking',
            'isMultiSlotBooking', 'totalParticipants',
            'approvedBy', 'approvedAt', 'isSlotFull', 'canAcceptMoreParticipants',
            'teeSummary', 'slots'
        ]
        extra_kwargs = {
            'member': {'required': False},  # Will be set automatically from authentication
            'tee': {'required': False},  # Allow null for backward compatibility
            'slot_date': {'required': False},  # Allow null for backward compatibility
            'booking_time': {'required': False},  # Allow null for backward compatibility
            'is_join_request': {'required': False, 'default': False},
            'original_booking': {'required': False},
            'group_id': {'required': False}
        }
    
    def get_memberFullName(self, obj):
        try:
            return f"{obj.member.firstName} {obj.member.lastName}"
        except (TypeError, ValueError, AttributeError):
            return "Unknown Member"
    
    def get_memberGolfClubId(self, obj):
        """Get member golf club ID"""
        try:
            if obj.member:
                # First try golfClubId, then create a formatted ID from member ID
                if obj.member.golfClubId and obj.member.golfClubId.strip():
                    return obj.member.golfClubId
                else:
                    return f"MGC{obj.member.id:06d}"
            return None
        except (TypeError, ValueError, AttributeError):
            return None
    
    def get_teeInfo(self, obj):
        """Get tee info with better null handling"""
        try:
            return obj.get_tee_info()
        except (TypeError, ValueError, AttributeError):
            if obj.tee:
                try:
                    return f"{obj.tee.holeNumber} Holes"
                except (TypeError, ValueError, AttributeError):
                    return "Tee not specified"
            else:
                return "Tee not specified"
    
    def get_formattedDate(self, obj):
        # Return booking creation date in DD/Month/YYYY format for orders component
        # This represents when the booking was made, not the slot date
        if obj.createdAt:
            return obj.createdAt.strftime('%d/%B/%Y')
        else:
            return "Date not specified"
    
    # Removed earliestTime and latestTime methods - not needed for single-slot approach
    
    def get_teeName(self, obj):
        """Get tee name with null check"""
        if obj.tee:
            try:
                return f"{obj.tee.holeNumber} Holes"
            except (TypeError, ValueError, AttributeError):
                return "Tee not specified"
        else:
            return "Tee not specified"
    
    def get_teeSummary(self, obj):
        """Get a summary of this slot"""
        date_str = obj.slot_date.strftime('%d/%B/%Y') if obj.slot_date else "Date not specified"
        time_str = obj.booking_time.strftime('%H:%M') if obj.booking_time else "Time not specified"
        
        if obj.tee:
            try:
                return f"{obj.tee.holeNumber} Holes on {date_str} at {time_str}"
            except (TypeError, ValueError, AttributeError):
                return f"Tee not specified on {date_str} at {time_str}"
        else:
            return f"Tee not specified on {date_str} at {time_str}"
    
    def get_slots(self, obj):
        """Get slots information for multi-slot bookings"""
        try:
            # For single-slot bookings, return the current slot as a single-item array
            if not obj.group_id:
                return [{
                    'id': obj.id,
                    'tee': obj.tee.id if obj.tee else None,
                    'teeInfo': f"{obj.tee.holeNumber} Holes" if obj.tee else "Tee not specified",
                    'teeName': f"{obj.tee.holeNumber} Holes" if obj.tee else "Tee not specified",
                    'courseName': obj.course.courseName if obj.course else "Unknown Course",
                    'booking_time': obj.booking_time.strftime('%H:%M') if obj.booking_time else "Time not specified",
                    'participants': obj.participants,
                    'slot_status': obj.slot_status,
                    'slot_order': 1,
                    'endTime': obj.end_time.strftime('%H:%M') if obj.end_time else "Time not specified",
                    'slot_date': obj.slot_date.strftime('%Y-%m-%d') if obj.slot_date else None,
                    'created_at': obj.createdAt.isoformat() if obj.createdAt else None,
                    'formatted_created_date': obj.createdAt.strftime('%d-%b-%Y') if obj.createdAt else 'N/A'
                }]
            
            # For multi-slot bookings, get all slots in the group
            from .models import BookingModel
            group_slots = BookingModel.objects.filter(
                group_id=obj.group_id,
                hideStatus=0
            ).order_by('slot_date', 'booking_time')
            
            slots_data = []
            for i, slot in enumerate(group_slots):
                slots_data.append({
                    'id': slot.id,
                    'tee': slot.tee.id if slot.tee else None,
                    'teeInfo': f"{slot.tee.holeNumber} Holes" if slot.tee else "Tee not specified",
                    'teeName': f"{slot.tee.holeNumber} Holes" if slot.tee else "Tee not specified",
                    'courseName': slot.course.courseName if slot.course else "Unknown Course",
                    'booking_time': slot.booking_time.strftime('%H:%M') if slot.booking_time else "Time not specified",
                    'participants': slot.participants,
                    'slot_status': slot.slot_status,
                    'slot_order': i + 1,
                    'endTime': slot.end_time.strftime('%H:%M') if slot.end_time else "Time not specified",
                    'slot_date': slot.slot_date.strftime('%Y-%m-%d') if slot.slot_date else None,
                    'created_at': slot.createdAt.isoformat() if slot.createdAt else None,
                    'formatted_created_date': slot.createdAt.strftime('%d-%b-%Y') if slot.createdAt else 'N/A'
                })
            
            return slots_data
        except Exception as e:
            # Fallback to single slot if there's an error
            return [{
                'id': obj.id,
                'tee': obj.tee.id if obj.tee else None,
                'teeInfo': f"{obj.tee.holeNumber} Holes" if obj.tee else "Tee not specified",
                'teeName': f"{obj.tee.holeNumber} Holes" if obj.tee else "Tee not specified",
                'courseName': obj.course.courseName if obj.course else "Unknown Course",
                'booking_time': obj.booking_time.strftime('%H:%M') if obj.booking_time else "Time not specified",
                'participants': obj.participants,
                'slot_status': obj.slot_status,
                'slot_order': 1,
                'endTime': obj.end_time.strftime('%H:%M') if obj.end_time else "Time not specified",
                'slot_date': obj.slot_date.strftime('%Y-%m-%d') if obj.slot_date else None,
                'created_at': obj.createdAt.isoformat() if obj.createdAt else None,
                'formatted_created_date': obj.createdAt.strftime('%d-%b-%Y') if obj.createdAt else 'N/A'
            }]
    
    def get_isMultiSlotBooking(self, obj):
        """Check if this is a multi-slot booking"""
        try:
            return obj.is_multi_slot_booking()
        except (TypeError, ValueError):
            return False
    
    def get_totalParticipants(self, obj):
        """Get total participants across all slots"""
        try:
            return obj.get_total_participants()
        except (TypeError, ValueError):
            return 0
    
    def get_canJoinSlot(self, obj):
        """Check if current member can join this slot"""
        request = self.context.get('request')
        if not request or not hasattr(request, 'user') or not request.user.is_authenticated:
            return False
        
        try:
            member = MemberModel.objects.get(email=request.user.email)
            # Don't allow joining your own booking
            if obj.member == member:
                return False
            
            # Check if member has already requested to join this slot
            existing_request = BookingModel.objects.filter(
                member=member,
                original_booking=obj,
                is_join_request=True,
                status__in=['pending_approval', 'approved']
            ).exists()
            
            if existing_request:
                return False
            
            # Check if slot has available spots
            try:
                return obj.available_spots > 0
            except (TypeError, ValueError):
                return False
        except MemberModel.DoesNotExist:
            return False
    
    def get_joinRequests(self, obj):
        """Get join requests for this booking"""
        if not obj.is_join_request:  # Only for original bookings
            try:
                requests = obj.get_join_requests()
                return BookingSerializer(requests, many=True, context=self.context).data
            except (TypeError, ValueError):
                return []
        return []
    
    def get_originalBookingInfo(self, obj):
        """Get original booking info for join requests"""
        if obj.is_join_request and obj.original_booking:
            return {
                'id': obj.original_booking.id,
                'memberName': f"{obj.original_booking.member.firstName} {obj.original_booking.member.lastName}" if obj.original_booking.member else "Unknown Member",
                'participants': obj.original_booking.participants,
                'status': obj.original_booking.status
            }
        return None
    
    def get_allParticipantsInfo(self, obj):
        """Get information about all participants in this slot"""
        if not obj.is_join_request:  # Only for original bookings
            try:
                return obj.get_all_participants_info()
            except (TypeError, ValueError, AttributeError):
                # Fallback to basic participant info
                return [{
                    'member_id': obj.member.id if obj.member else None,
                    'member_name': f"{obj.member.firstName} {obj.member.lastName}" if obj.member else "Unknown Member",
                    'participants': obj.participants,
                    'is_original_booker': True,
                    'join_request_id': None
                }]
        return None
    
    def get_approvedBy(self, obj):
        """Get approved by member info"""
        if obj.approved_by:
            try:
                return {
                    'id': obj.approved_by.id,
                    'name': f"{obj.approved_by.firstName} {obj.approved_by.lastName}",
                    'email': obj.approved_by.email
                }
            except (TypeError, ValueError, AttributeError):
                return None
        return None
    
    def validate_slot_date(self, value):
        if value < timezone.now().date():
            raise serializers.ValidationError("Cannot book for past dates")
        return value
    
    def validate_participants(self, value):
        if value < 1 or value > 4:
            raise serializers.ValidationError("Participants must be between 1 and 4")
        return value
    
    def validate(self, data):
        """Custom validation for join requests and multi-slot bookings"""
        if data.get('is_join_request', False):
            original_booking = data.get('original_booking')
            if not original_booking:
                raise serializers.ValidationError("Original booking is required for join requests")
        
        return data


class JoinRequestSerializer(serializers.ModelSerializer):
    """Enhanced serializer for join requests with comprehensive data"""
    requestId = serializers.CharField(source='request_id', read_only=True)
    originalBookingId = serializers.CharField(source='original_booking.booking_id', read_only=True)
    requesterId = serializers.IntegerField(source='member.id', read_only=True)
    requesterName = serializers.SerializerMethodField(read_only=True)
    requesterMemberId = serializers.SerializerMethodField(read_only=True)
    requestDate = serializers.SerializerMethodField(read_only=True)
    requestedParticipants = serializers.IntegerField(source='participants', read_only=True)
    courseName = serializers.SerializerMethodField(read_only=True)
    tee = serializers.SerializerMethodField(read_only=True)
    slotDate = serializers.SerializerMethodField(read_only=True)
    slotTime = serializers.SerializerMethodField(read_only=True)
    originalBookerId = serializers.SerializerMethodField(read_only=True)
    originalBookerName = serializers.SerializerMethodField(read_only=True)
    
    # Enhanced fields for request management
    currentSlotStatus = serializers.SerializerMethodField(read_only=True)
    totalParticipantsIfApproved = serializers.SerializerMethodField(read_only=True)
    remainingSlotsIfApproved = serializers.SerializerMethodField(read_only=True)
    otherPendingRequests = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = JoinRequestModel
        fields = [
            'id', 'requestId', 'originalBookingId', 'requesterId', 'requesterName', 
            'requesterMemberId', 'requestDate', 'requestedParticipants', 'status',
            'courseName', 'tee', 'slotDate', 'slotTime', 'originalBookerId', 
            'originalBookerName', 'currentSlotStatus', 'totalParticipantsIfApproved',
            'remainingSlotsIfApproved', 'otherPendingRequests', 'notes', 'createdAt'
        ]
        read_only_fields = ['createdAt', 'updatedAt']
    
    def get_currentSlotStatus(self, obj):
        """Get current slot status information"""
        try:
            original_booking = obj.original_booking
            current_participants = original_booking.participants
            max_participants = 4
            
            return {
                'currentParticipants': current_participants,
                'maxParticipants': max_participants,
                'availableSlots': max_participants - current_participants,
                'slotStatus': original_booking.slot_status
            }
        except (TypeError, ValueError, AttributeError):
            return {
                'currentParticipants': 0,
                'maxParticipants': 4,
                'availableSlots': 4,
                'slotStatus': 'unknown'
            }
    
    def get_totalParticipantsIfApproved(self, obj):
        """Calculate total participants if this request is approved"""
        try:
            original_booking = obj.original_booking
            current_participants = original_booking.participants
            requested_participants = obj.participants
            
            return current_participants + requested_participants
        except (TypeError, ValueError, AttributeError):
            return 0
    
    def get_remainingSlotsIfApproved(self, obj):
        """Calculate remaining slots if this request is approved"""
        try:
            total_if_approved = self.get_totalParticipantsIfApproved(obj)
            max_participants = 4
            remaining = max_participants - total_if_approved
            return max(0, remaining)
        except (TypeError, ValueError, AttributeError):
            return 4
    
    def get_requesterName(self, obj):
        """Get requester full name"""
        try:
            return f"{obj.member.firstName} {obj.member.lastName}"
        except (TypeError, ValueError, AttributeError):
            return "Unknown Member"
    
    def get_requesterMemberId(self, obj):
        """Get requester member ID"""
        try:
            if obj.member:
                # First try golfClubId, then create a formatted ID from member ID
                if obj.member.golfClubId and obj.member.golfClubId.strip():
                    return obj.member.golfClubId
                else:
                    return f"MGC{obj.member.id:06d}"
            return "Unknown ID"
        except (TypeError, ValueError, AttributeError):
            return "Unknown ID"
    
    def get_requestDate(self, obj):
        """Get formatted request date"""
        try:
            return obj.createdAt
        except (TypeError, ValueError, AttributeError):
            return None
    
    def get_courseName(self, obj):
        """Get course name"""
        try:
            return obj.original_booking.course.courseName
        except (TypeError, ValueError, AttributeError):
            return "Unknown Course"
    
    def get_tee(self, obj):
        """Get tee information"""
        try:
            tee = obj.original_booking.tee
            return f"{tee.holeNumber} Holes" if tee else "Unknown Tee"
        except (TypeError, ValueError, AttributeError):
            return "Unknown Tee"
    
    def get_slotDate(self, obj):
        """Get slot date"""
        try:
            return obj.original_booking.slot_date
        except (TypeError, ValueError, AttributeError):
            return None
    
    def get_slotTime(self, obj):
        """Get slot time"""
        try:
            return obj.original_booking.booking_time
        except (TypeError, ValueError, AttributeError):
            return None
    
    def get_originalBookerId(self, obj):
        """Get original booker golf club ID"""
        try:
            member = obj.original_booking.member
            if member:
                # First try golfClubId, then create a formatted ID from member ID
                if member.golfClubId and member.golfClubId.strip():
                    return member.golfClubId
                else:
                    return f"MGC{member.id:06d}"
            return None
        except (TypeError, ValueError, AttributeError):
            return None
    
    def get_originalBookerName(self, obj):
        """Get original booker name"""
        try:
            member = obj.original_booking.member
            return f"{member.firstName} {member.lastName}"
        except (TypeError, ValueError, AttributeError):
            return "Unknown Member"

    def get_otherPendingRequests(self, obj):
        """Get other pending requests for the same slot"""
        try:
            original_booking = obj.original_booking
            other_pending = JoinRequestModel.objects.filter(
                original_booking=original_booking,
                status='pending_approval',
                hideStatus=0
            ).exclude(id=obj.id)
            
            return [{
                'requestId': req.request_id,
                'requesterName': f"{req.member.firstName} {req.member.lastName}",
                'requestedParticipants': req.participants,
                'requestDate': req.createdAt
            } for req in other_pending]
        except (TypeError, ValueError, AttributeError):
            return []


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for notifications"""
    senderName = serializers.SerializerMethodField(read_only=True)
    recipientName = serializers.SerializerMethodField(read_only=True)
    relatedBookingInfo = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = NotificationModel
        fields = [
            'id', 'recipient', 'recipientName', 'sender', 'senderName',
            'notification_type', 'title', 'message', 'related_booking',
            'relatedBookingInfo', 'is_read', 'is_new', 'createdAt'
        ]
        read_only_fields = ['createdAt', 'updatedAt']
    
    def get_senderName(self, obj):
        if obj.sender:
            try:
                return f"{obj.sender.firstName} {obj.sender.lastName}"
            except (TypeError, ValueError, AttributeError):
                return "Unknown Sender"
        return None
    
    def get_recipientName(self, obj):
        try:
            return f"{obj.recipient.firstName} {obj.recipient.lastName}"
        except (TypeError, ValueError, AttributeError):
            return "Unknown Recipient"
    
    def get_relatedBookingInfo(self, obj):
        if obj.related_booking:
            try:
                date_str = obj.related_booking.slot_date.strftime('%d/%m/%y') if obj.related_booking.slot_date else "Date not specified"
                time_str = obj.related_booking.booking_time.strftime('%H:%M') if obj.related_booking.booking_time else "Time not specified"
                
                return {
                    'id': obj.related_booking.id,
                    'courseName': obj.related_booking.course.courseName if obj.related_booking.course else "Unknown Course",
                    'bookingDate': date_str,
                    'bookingTime': time_str,  # Changed to 24-hour format
                    'participants': obj.related_booking.participants
                }
            except (TypeError, ValueError, AttributeError):
                return None
        return None




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
            validated_data['memberEnquiryPlan'] = plan_id
        
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Handle plan assignment from selected_plan_id for updates
        plan_id = validated_data.pop('selected_plan_id', None)
        validated_data.pop('selected_plan_name', None)  # Remove plan name as it's not needed for update
        
        if plan_id:
            validated_data['memberEnquiryPlan'] = plan_id
        
        # Handle conversion date automatically if is_converted is being set to True
        if validated_data.get('is_converted', False) and not instance.is_converted:
            validated_data['converted_date'] = timezone.now().astimezone(pytz.timezone('Europe/London'))
        
        return super().update(instance, validated_data)

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        
        # Handle plan representation - return the plan object for frontend compatibility
        if instance.memberEnquiryPlan:
            try:
                plan_obj = PlanModel.objects.get(id=instance.memberEnquiryPlan)
                representation['memberEnquiryPlan'] = {
                    'id': plan_obj.id,
                    'planName': plan_obj.planName
                }
            except (PlanModel.DoesNotExist, TypeError, ValueError, AttributeError):
                representation['memberEnquiryPlan'] = None
        else:
            representation['memberEnquiryPlan'] = None
        
        # Include conversion status fields in response with correct field names
        representation['isConverted'] = instance.is_converted
        representation['convertedMemberId'] = instance.converted_member_id
        representation['convertedDate'] = instance.converted_date.isoformat() if instance.converted_date else None
        
        return representation


class AboutModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = AboutModel
        fields = '__all__'
        extra_kwargs = {
            'aboutHeading': {'required': False},
            'aboutDescription': {'required': False},
            'partnerGolfClubs': {'required': False},
            'successfulYears': {'required': False},
        }

    def validate_partnerGolfClubs(self, value):
        if value < 0:
            raise serializers.ValidationError("Partner golf clubs count cannot be negative")
        return value

    def validate_successfulYears(self, value):
        if value < 0:
            raise serializers.ValidationError("Successful years count cannot be negative")
        return value


class EventModelSerializer(serializers.ModelSerializer):
    EventImageUrl = serializers.SerializerMethodField()
    EventDetailImages = serializers.SerializerMethodField()
    EventActivitiesImages = serializers.SerializerMethodField()
    memberInterest = serializers.SerializerMethodField()
    
    class Meta:
        model = EventModel
        fields = '__all__'
        extra_kwargs = {
            'EventActivitiesimageOne': {'required': False, 'allow_null': True},
            'EventActivitiesimageTwo': {'required': False, 'allow_null': True},
            'EventImage': {'required': False, 'allow_null': True},
        }
    
    def get_memberInterest(self, obj):
        """Get member interest status if member is authenticated"""
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            try:
                member = MemberModel.objects.get(email=request.user.email)
                interest = EventInterestModel.objects.filter(
                    member=member, 
                    event=obj, 
                    hideStatus=0
                ).first()
                return {
                    'is_interested': interest.is_interested if interest else False,
                    'interest_id': interest.id if interest else None
                }
            except (MemberModel.DoesNotExist, TypeError, ValueError, AttributeError):
                return {'is_interested': False, 'interest_id': None}
        return {'is_interested': False, 'interest_id': None}
    
    def get_EventImageUrl(self, obj):
        """Return full event image URL"""
        if obj.EventImage:
            try:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(obj.EventImage.url)
                return obj.EventImage.url
            except (TypeError, ValueError, AttributeError):
                return None
        return None
    
    def get_EventDetailImages(self, obj):
        """Return empty list since detail images are removed"""
        return []
    
    def get_EventActivitiesImages(self, obj):
        """Return list of event activities image URLs"""
        images = []
        for img in [obj.EventActivitiesimageOne, obj.EventActivitiesimageTwo]:
            if img:
                try:
                    request = self.context.get('request')
                    if request:
                        images.append(request.build_absolute_uri(img.url))
                    else:
                        images.append(img.url)
                except (TypeError, ValueError, AttributeError):
                    continue
        return images
    
    def validate(self, data):
        """Custom validation to handle empty file fields"""
        # Handle empty strings for file fields
        file_fields = [
            'EventImage', 'EventActivitiesimageOne', 'EventActivitiesimageTwo'
        ]
        
        for field in file_fields:
            if field in data:
                # If the field is an empty string, None, or 'null', remove it from data
                if data[field] == '' or data[field] is None or data[field] == 'null':
                    data.pop(field, None)
        
        # Handle boolean field conversion
        if 'is_active' in data and isinstance(data['is_active'], str):
            data['is_active'] = data['is_active'].lower() == 'true'
        
        return data
    
    def validate_EventEndDate(self, value):
        """Validate end date is not in the past"""
        from django.utils import timezone
        if value < timezone.now().date():
            raise serializers.ValidationError("Event end date cannot be in the past")
        return value
    
    def validate_EventTime(self, value):
        """Validate event time format"""
        if value:
            # Allow common time formats
            import re
            time_patterns = [
                r'^\d{1,2}:\d{2}\s?(AM|PM|am|pm)?$',  # 12:00 PM, 12:00pm
                r'^\d{1,2}:\d{2}$',  # 12:00
                r'^\d{1,2}\s?(AM|PM|am|pm)$',  # 12 PM
                r'^\d{1,2}:\d{2}:\d{2}\s?(AM|PM|am|pm)?$',  # 12:00:00 PM
                r'^\d{1,2}:\d{2}:\d{2}$',  # 12:00:00
            ]
            
            is_valid = any(re.match(pattern, value.strip()) for pattern in time_patterns)
            if not is_valid:
                raise serializers.ValidationError(
                    "Please enter a valid time format (e.g., '12:00 PM', '14:30', '3 PM', '12:00:00')"
                )
        
        return value
    
    def create(self, validated_data):
        """Create event with proper file handling"""
        # Ensure file fields are handled correctly
        file_fields = [
            'EventImage', 'EventActivitiesimageOne', 'EventActivitiesimageTwo'
        ]
        
        # Remove any None values for file fields
        for field in file_fields:
            if field in validated_data and validated_data[field] is None:
                validated_data.pop(field, None)
        
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        """Update event with proper file handling"""
        # Ensure file fields are handled correctly
        file_fields = [
            'EventImage', 'EventActivitiesimageOne', 'EventActivitiesimageTwo'
        ]
        
        # Remove any None values for file fields
        for field in file_fields:
            if field in validated_data and validated_data[field] is None:
                validated_data.pop(field, None)
        
        return super().update(instance, validated_data)


class EventInterestSerializer(serializers.ModelSerializer):
    memberName = serializers.CharField(source='member.firstName', read_only=True)
    memberFullName = serializers.SerializerMethodField(read_only=True)
    eventTitle = serializers.CharField(source='event.EventTitle', read_only=True)
    
    class Meta:
        model = EventInterestModel
        fields = [
            'id', 'member', 'memberName', 'memberFullName', 'event', 'eventTitle',
            'is_interested', 'interested_date', 'hideStatus'
        ]
        extra_kwargs = {
            'member': {'required': True},
            'event': {'required': True},
            'is_interested': {'required': False, 'default': True}
        }
    
    def get_memberFullName(self, obj):
        try:
            return f"{obj.member.firstName} {obj.member.lastName}"
        except (TypeError, ValueError, AttributeError):
            return "Unknown Member"

    def validate(self, data):
        # Ensure member can only have one interest per event
        member = data.get('member')
        event = data.get('event')
        
        if member and event:
            existing_interest = EventInterestModel.objects.filter(
                member=member,
                event=event,
                hideStatus=0
            ).exclude(id=self.instance.id if self.instance else None)
            
            if existing_interest.exists():
                raise serializers.ValidationError("Member already has interest in this event")
        
        return data


class ProtocolModelSerializer(serializers.ModelSerializer):
    """Serializer for Protocol model"""
    
    class Meta:
        model = ProtocolModel
        fields = '__all__'
        extra_kwargs = {
            'createdAt': {'read_only': True},
            'updatedAt': {'read_only': True}
        }

    def validate_protocolTitle(self, value):
        if not value or value.strip() == '':
            raise serializers.ValidationError("Protocol title is required")
        return value

    def validate_protocolDescription(self, value):
        if not value or value.strip() == '':
            raise serializers.ValidationError("Protocol description is required")
        return value


class InstructorModelSerializer(serializers.ModelSerializer):
    """Serializer for Instructor model"""
    instructorPhotoUrl = serializers.SerializerMethodField()
    
    class Meta:
        model = InstructorModel
        fields = '__all__'
        extra_kwargs = {
            'createdAt': {'read_only': True},
            'updatedAt': {'read_only': True},
            'facebookUrl': {'required': False},
            'instagramUrl': {'required': False},
            'twitterUrl': {'required': False}
        }

    def get_instructorPhotoUrl(self, obj):
        if obj.instructorPhoto:
            try:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(obj.instructorPhoto.url)
                return obj.instructorPhoto.url
            except (TypeError, ValueError, AttributeError):
                return None
        return None

    def validate_instructorName(self, value):
        if not value or value.strip() == '':
            raise serializers.ValidationError("Instructor name is required")
        return value

    def validate_instructorPosition(self, value):
        if not value or value.strip() == '':
            raise serializers.ValidationError("Instructor position is required")
        return value

    def validate_facebookUrl(self, value):
        if value and not value.startswith(('http://', 'https://')):
            raise serializers.ValidationError("Facebook URL must start with http:// or https://")
        return value

    def validate_instagramUrl(self, value):
        if value and not value.startswith(('http://', 'https://')):
            raise serializers.ValidationError("Instagram URL must start with http:// or https://")
        return value

    def validate_twitterUrl(self, value):
        if value and not value.startswith(('http://', 'https://')):
            raise serializers.ValidationError("Twitter URL must start with http:// or https://")
        return value


class MessageModelSerializer(serializers.ModelSerializer):
    """Serializer for Message model"""
    
    class Meta:
        model = MessageModel
        fields = '__all__'
        extra_kwargs = {
            'createdAt': {'read_only': True},
            'updatedAt': {'read_only': True},
            'status': {'read_only': True},
            'hideStatus': {'read_only': True}
        }

    def validate_name(self, value):
        if not value or value.strip() == '':
            raise serializers.ValidationError("Name is required")
        return value.strip()

    def validate_email(self, value):
        if not value or value.strip() == '':
            raise serializers.ValidationError("Email is required")
        return value.strip()

    def validate_subject(self, value):
        if not value or value.strip() == '':
            raise serializers.ValidationError("Subject is required")
        return value.strip()

    def validate_description(self, value):
        if not value or value.strip() == '':
            raise serializers.ValidationError("Description is required")
        return value.strip()

    def validate_phone(self, value):
        if value:
            return value.strip()
        return value


class FAQModelSerializer(serializers.ModelSerializer):
    """Serializer for FAQ model"""
    
    class Meta:
        model = FAQModel
        fields = '__all__'
        extra_kwargs = {
            'createdAt': {'read_only': True},
            'updatedAt': {'read_only': True}
        }

    def validate_faqQuestion(self, value):
        if not value or value.strip() == '':
            raise serializers.ValidationError("FAQ question is required")
        return value.strip()

    def validate_faqAnswer(self, value):
        if not value or value.strip() == '':
            raise serializers.ValidationError("FAQ answer is required")
        return value.strip()


class TimeSlotSerializer(serializers.Serializer):
    """Serializer for time slot data"""
    time = serializers.CharField()
    available = serializers.BooleanField()
    formatted_time = serializers.CharField()
    bookings = serializers.ListField(required=False, default=list)
    booking_count = serializers.IntegerField(required=False, default=0)
