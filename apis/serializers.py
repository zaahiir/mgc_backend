from rest_framework import serializers
from .models import *
import json


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
    gender = serializers.PrimaryKeyRelatedField(queryset=GenderModel.objects.all())
    nationality = serializers.PrimaryKeyRelatedField(queryset=CountryModel.objects.all())
    plan = serializers.PrimaryKeyRelatedField(queryset=PlanModel.objects.all())
    paymentStatus = serializers.PrimaryKeyRelatedField(queryset=PaymentStatusModel.objects.all())
    paymentMethod = serializers.PrimaryKeyRelatedField(queryset=PaymentMethodModel.objects.all())

    class Meta:
        model = MemberModel
        fields = '__all__'
        extra_kwargs = {
            'encrypted_password': {'write_only': True},
            'hashed_password': {'write_only': True}
        }

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['gender'] = instance.gender.genderName if instance.gender else None
        representation['nationality'] = instance.nationality.countryName if instance.nationality else None
        representation['plan'] = instance.plan.planName if instance.plan else None
        representation['paymentStatus'] = instance.paymentStatus.statusName if instance.paymentStatus else None
        representation['paymentMethod'] = instance.paymentMethod.methodName if instance.paymentMethod else None
        return representation

# Serializer for QR code response
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

class CourseModelSerializers(serializers.ModelSerializer):
    amenities = serializers.SerializerMethodField()
    name = serializers.CharField(source='courseName', read_only=True)
    lane = serializers.CharField(source='streetName', read_only=True)
    address = serializers.SerializerMethodField()
    code = serializers.CharField(source='postcode', read_only=True)
    phone = serializers.CharField(source='phoneNumber', read_only=True)
    imageUrl = serializers.SerializerMethodField()

    class Meta:
        model = CourseModel
        fields = [
            'id', 'name', 'lane', 'address', 'code', 'timing', 'phone', 
            'website', 'imageUrl', 'amenities', 'golfDescription', 
            'golfHighlight', 'golfLocation'
        ]

    def get_amenities(self, obj):
        """Return amenity IDs as expected by frontend"""
        return list(obj.amenities.values_list('id', flat=True))

    def get_address(self, obj):
        """Return formatted address"""
        return obj.full_address

    def get_imageUrl(self, obj):
        """Return full image URL"""
        if obj.courseImage:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.courseImage.url)
            return obj.courseImage.url
        return 'assets/images/news/default-course.jpg'  # Default image

class CourseCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating and updating courses
    Handles form data including file uploads
    """
    amenities = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True
    )
    
    class Meta:
        model = CourseModel
        fields = [
            'courseName', 'courseNumber', 'streetName', 'locality', 'town',
            'postcode', 'country', 'phoneNumber', 'website', 'timing',
            'courseImage', 'golfDescription', 'golfHighlight', 'golfLocation',
            'amenities', 'hideStatus'
        ]
    
    def validate_amenities(self, value):
        """Validate that all amenity IDs exist"""
        if value:
            existing_ids = set(AmenitiesModel.objects.filter(
                id__in=value, 
                hideStatus=0
            ).values_list('id', flat=True))
            
            invalid_ids = set(value) - existing_ids
            if invalid_ids:
                raise serializers.ValidationError(
                    f"Invalid amenity IDs: {list(invalid_ids)}"
                )
        return value
    
    def create(self, validated_data):
        amenities_data = validated_data.pop('amenities', [])
        course = CourseModel.objects.create(**validated_data)
        
        if amenities_data:
            course.amenities.set(amenities_data)
        
        return course
    
    def update(self, instance, validated_data):
        amenities_data = validated_data.pop('amenities', None)
        
        # Update all other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update amenities if provided
        if amenities_data is not None:
            instance.amenities.set(amenities_data)
        
        return instance

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
    selected_plan_id = serializers.IntegerField(write_only=True)
    memberEnquiryPlan = serializers.PrimaryKeyRelatedField(queryset=PlanModel.objects.all())

    class Meta:
        model = MemberEnquiryModel
        fields = '__all__'

    def create(self, validated_data):
        plan_id = validated_data.pop('selected_plan_id', None)
        if plan_id:
            validated_data['memberEnquiryPlan'] = PlanModel.objects.get(id=plan_id)
        return super().create(validated_data)

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['memberEnquiryPlan'] = instance.memberEnquiryPlan.planName if instance.memberEnquiryPlan else None
        return representation
