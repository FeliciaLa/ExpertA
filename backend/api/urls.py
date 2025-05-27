from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    ChatView, 
    ExpertFormView, 
    ChatInterfaceView, 
    KnowledgeManagementView, 
    KnowledgeEntryView,
    ExpertRegistrationView,
    ExpertProfileView,
    ExpertListView,
    ExpertDetailView,
    ExpertProfileUpdateView,
    EmailTokenObtainPairView,
    PublicExpertDetailView,
    ProfileImageUploadView,
    UserRegistrationView,
    UserProfileView,
    UserProfileUpdateView,
    PublicExpertListView,
    EmailVerificationView
)
from .training_views import OnboardingView, TrainingChatView, OnboardingAnswersView, KnowledgeProcessingView
from .document_views import DocumentListView, DocumentUploadView, DocumentDeleteView
from .jwt_views import CustomTokenRefreshView
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

# Simple test endpoint that doesn't require authentication
@api_view(['GET', 'OPTIONS'])
@permission_classes([AllowAny])
def api_test(request):
    if request.method == 'OPTIONS':
        response = JsonResponse({'message': 'CORS preflight request handled'})
    else:
        response = JsonResponse({
            'status': 'ok',
            'message': 'API is working correctly',
            'cors_enabled': True,
            'auth_required': False
        })
    
    # Add CORS headers
    response["Access-Control-Allow-Origin"] = "*"
    response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    
    return response

urlpatterns = [
    path('chat/', ChatView.as_view(), name='chat'),
    path('token/', EmailTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('expert-form/', ExpertFormView.as_view(), name='expert_form'),
    path('chat-interface/', ChatInterfaceView.as_view(), name='chat_interface'),
    path('knowledge/', KnowledgeEntryView.as_view(), name='knowledge-list'),
    path('knowledge/<str:entry_id>/', KnowledgeEntryView.as_view(), name='knowledge-detail'),
    path('register/', ExpertRegistrationView.as_view(), name='expert-register'),
    path('expert/profile/', ExpertProfileView.as_view(), name='expert-profile'),
    path('profile/', ExpertProfileView.as_view(), name='expert-profile'),
    path('profile/update/', ExpertProfileUpdateView.as_view(), name='expert-profile-update'),
    path('profile/upload-image/', ProfileImageUploadView.as_view(), name='profile-image-upload'),
    path('experts/', ExpertListView.as_view(), name='expert-list'),
    path('public-experts/', PublicExpertListView.as_view(), name='public-expert-list'),
    path('experts/<str:pk>/', ExpertDetailView.as_view(), name='expert-detail'),
    
    # Test endpoint
    path('test/', api_test, name='api-test'),
    
    # Training endpoints
    path('onboarding/', OnboardingView.as_view(), name='expert-onboarding'),
    path('onboarding/answers/', OnboardingAnswersView.as_view(), name='onboarding-answers'),
    path('training/chat/', TrainingChatView.as_view(), name='training-chat'),
    path('knowledge/process/', KnowledgeProcessingView.as_view(), name='knowledge-process'),
    
    # Document endpoints
    path('documents/', DocumentListView.as_view(), name='document-list'),
    path('documents/upload/', DocumentUploadView.as_view(), name='document-upload'),
    path('documents/<int:document_id>/', DocumentDeleteView.as_view(), name='document-delete'),
    
    # User endpoints
    path('user/register/', UserRegistrationView.as_view(), name='user-register'),
    path('login/', EmailTokenObtainPairView.as_view(), name='login'),
    path('user/profile/', UserProfileView.as_view(), name='user-profile'),
    path('user/profile/update/', UserProfileUpdateView.as_view(), name='user-profile-update'),
    path('user/profile/direct/<str:user_id>/', UserProfileView.as_view(), name='user-profile-direct'),
    
    # Email verification - now generic for both users and experts
    path('verify-email/<str:token>/', EmailVerificationView.as_view(), name='verify-email'),
]

# Ensure the public-experts endpoint is added
urlpatterns += [
    # Public endpoints for non-authenticated users
    path('public-experts/', PublicExpertListView.as_view(), name='public-experts'),
] 