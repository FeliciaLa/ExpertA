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
    UserProfileDeleteView,
    PublicExpertListView,
    EmailVerificationView
)
from .training_views import OnboardingView, TrainingChatView, OnboardingAnswersView, KnowledgeProcessingView
from .document_views import DocumentListView, DocumentUploadView, DocumentDeleteView
from .jwt_views import CustomTokenRefreshView
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from .models import Expert

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

# Public experts endpoint without authentication and with explicit CORS headers
@api_view(['GET', 'OPTIONS'])
@permission_classes([AllowAny])
def public_experts_direct(request):
    if request.method == 'OPTIONS':
        response = JsonResponse({'message': 'CORS preflight request handled'})
    else:
        try:
            # Query the User model, which is the Expert model in this case
            experts = Expert.objects.filter(is_superuser=False, is_staff=False)
            
            # Manually serialize the data
            data = []
            for expert in experts:
                expert_data = {
                    'id': str(expert.id),
                    'name': expert.get_full_name() or expert.username,
                    'email': expert.email,
                    'specialties': getattr(expert, 'specialties', ''),
                    'bio': getattr(expert, 'bio', ''),
                    'title': getattr(expert, 'title', ''),
                    'profile_image': expert.profile_image.url if hasattr(expert, 'profile_image') and expert.profile_image else None,
                }
                data.append(expert_data)
                
            response = JsonResponse(data, safe=False)
        except Exception as e:
            import traceback
            print("Error fetching experts:", str(e))
            print(traceback.format_exc())
            response = JsonResponse(
                {'error': 'Failed to fetch experts', 'details': str(e)},
                status=500
            )
    
    # Add CORS headers explicitly
    response["Access-Control-Allow-Origin"] = "*"
    response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, Accept, Origin"
    
    return response

# Health check endpoint for Railway
@api_view(['GET', 'OPTIONS'])
@permission_classes([AllowAny])
def health_check(request):
    if request.method == 'OPTIONS':
        response = JsonResponse({'message': 'CORS preflight request handled'})
    else:
        response = JsonResponse({
            'status': 'ok',
            'message': 'Health check passed'
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
    path('public-experts-direct/', public_experts_direct, name='public-experts-direct'),  # Direct function view with CORS
    path('experts/<str:pk>/', ExpertDetailView.as_view(), name='expert-detail'),
    
    # Test endpoint
    path('test/', api_test, name='api-test'),
    
    # Health check endpoint
    path('health/', health_check, name='health-check'),
    
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
    path('user/profile/delete/', UserProfileDeleteView.as_view(), name='user-profile-delete'),
    path('user/profile/direct/<str:user_id>/', UserProfileView.as_view(), name='user-profile-direct'),
    
    # Email verification - now generic for both users and experts
    path('verify-email/<str:token>/', EmailVerificationView.as_view(), name='verify-email'),
]

# Ensure the public-experts endpoint is added
urlpatterns += [
    # Public endpoints for non-authenticated users
    path('public-experts/', PublicExpertListView.as_view(), name='public-experts'),
] 