from rest_framework import serializers
from .models import Expert

class ExpertProfileSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='get_full_name', read_only=True)
    
    class Meta:
        model = Expert
        fields = ['id', 'name', 'first_name', 'last_name', 'email', 'bio', 'specialties']
        read_only_fields = ['id', 'name', 'email']

class ExpertSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='get_full_name', read_only=True)
    
    class Meta:
        model = Expert
        fields = ['id', 'name', 'first_name', 'last_name', 'email', 'specialties', 'bio'] 