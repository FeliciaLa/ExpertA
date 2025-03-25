from rest_framework import serializers
from .models import Expert, TrainingSession, TrainingQuestion

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

class TrainingQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainingQuestion
        fields = ['id', 'question', 'answer', 'order', 'created_at', 'answered_at']
        read_only_fields = ['id', 'question', 'order', 'created_at']

class TrainingSessionSerializer(serializers.ModelSerializer):
    questions = TrainingQuestionSerializer(many=True, read_only=True)
    expert_name = serializers.CharField(source='expert.get_full_name', read_only=True)

    class Meta:
        model = TrainingSession
        fields = ['id', 'expert', 'expert_name', 'field_of_knowledge', 'is_completed', 'created_at', 'updated_at', 'questions']
        read_only_fields = ['id', 'expert', 'expert_name', 'is_completed', 'created_at', 'updated_at'] 