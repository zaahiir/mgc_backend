from rest_framework import serializers
from .models import *


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


class AmenitiesModelSerializers(serializers.ModelSerializer):
    class Meta:
        model = AmenitiesModel
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


class CourseModelSerializers(serializers.ModelSerializer):
    amenities = serializers.PrimaryKeyRelatedField(queryset=AmenitiesModel.objects.all())

    class Meta:
        model = CourseModel
        fields = '__all__'

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['amenities'] = instance.amenities.amenityName if instance.amenities else None
        return representation


class BlogModelSerializers(serializers.ModelSerializer):
    class Meta:
        model = BlogModel
        fields = '__all__'
