from rest_framework import serializers
from .models import ExpertProfile, User

class ExpertProfileDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpertProfile
        fields = [
            'industry',
            'years_of_experience',
            'key_skills',
            'typical_problems',
            'background',
            'certifications',
            'methodologies',
            'tools_technologies',
            'monetization_enabled',
            'monetization_price'
        ]

class ExpertProfileSerializer(serializers.ModelSerializer):
    first_name = serializers.SerializerMethodField()
    last_name = serializers.SerializerMethodField()
    profile = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'name', 'first_name', 'last_name', 'email', 'bio', 'specialties', 'title',
            'onboarding_completed', 'onboarding_completed_at', 'total_training_messages',
            'last_training_at', 'profile', 'profile_image', 'slug'
        ]
        read_only_fields = ['id', 'email', 'onboarding_completed', 'onboarding_completed_at', 'slug']
    
    def get_first_name(self, obj):
        """Split the name field to get first name"""
        if obj.name:
            name_parts = obj.name.split()
            return name_parts[0] if name_parts else ''
        return ''
    
    def get_last_name(self, obj):
        """Split the name field to get last name"""
        if obj.name:
            name_parts = obj.name.split()
            return ' '.join(name_parts[1:]) if len(name_parts) > 1 else ''
        return ''
    
    def get_profile(self, obj):
        """Get the expert profile data, create if doesn't exist"""
        try:
            profile = obj.profile
            return {
                'industry': profile.industry,
                'years_of_experience': profile.years_of_experience,
                'key_skills': profile.key_skills,
                'typical_problems': profile.typical_problems,
                'background': profile.background,
                'certifications': profile.certifications,
                'methodologies': profile.methodologies,
                'tools_technologies': profile.tools_technologies,
                'monetization_enabled': profile.monetization_enabled,
                'monetization_price': float(profile.monetization_price)
            }
        except ExpertProfile.DoesNotExist:
            # Create empty profile if it doesn't exist
            ExpertProfile.objects.create(
                expert=obj,
                industry='',
                years_of_experience=0,
                key_skills='',
                typical_problems='',
                background='',
                certifications='',
                methodologies='',
                tools_technologies='',
                monetization_enabled=False,
                monetization_price=5.00
            )
            return {
                'industry': '',
                'years_of_experience': 0,
                'key_skills': '',
                'typical_problems': '',
                'background': '',
                'certifications': '',
                'methodologies': '',
                'tools_technologies': '',
                'monetization_enabled': False,
                'monetization_price': 5.00
            }
        except Exception as e:
            print(f"Error getting profile for {obj.email}: {e}")
            return {
                'industry': '',
                'years_of_experience': 0,
                'key_skills': '',
                'typical_problems': '',
                'background': '',
                'certifications': '',
                'methodologies': '',
                'tools_technologies': '',
                'monetization_enabled': False,
                'monetization_price': 5.00
            }

class ExpertSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    name = serializers.CharField(read_only=True)
    profile = ExpertProfileDetailSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'name', 'email', 'specialties', 'bio', 'title', 
            'onboarding_completed', 'profile_image', 'profile', 'slug'
        ]
        
    def get_id(self, obj):
        return str(obj.id)

class UserSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'name', 'date_joined', 'role', 
            # Expert-related fields
            'bio', 'specialties', 'title', 'onboarding_completed',
            'profile_image', 'total_training_messages', 'last_training_at', 'slug'
        ]
        read_only_fields = ['id', 'date_joined', 'role', 'slug']
        
    def get_id(self, obj):
        return str(obj.id)
        
    def to_representation(self, instance):
        """Conditionally include expert fields based on user role"""
        representation = super().to_representation(instance)
        
        # If not an expert user, remove expert-specific fields (but keep profile_image for all users)
        if instance.role != User.Role.EXPERT:
            expert_fields = [
                'bio', 'specialties', 'title', 'onboarding_completed',
                'total_training_messages', 'last_training_at'
            ]
            for field in expert_fields:
                representation.pop(field, None)
            # Keep profile_image for all users, regardless of role
                
        return representation

class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""
    password = serializers.CharField(write_only=True, min_length=8)
    
    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'password', 'date_joined']
        read_only_fields = ['id', 'date_joined']
    
    def create(self, validated_data):
        return User.objects.create_user(**validated_data) 