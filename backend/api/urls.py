from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import (
    TrainingView, 
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
    TrainingSessionView,
    TrainingQuestionView,
)

urlpatterns = [
    path('train/', TrainingView.as_view(), name='train'),
    path('chat/', ChatView.as_view(), name='chat'),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('expert-form/', ExpertFormView.as_view(), name='expert_form'),
    path('chat-interface/', ChatInterfaceView.as_view(), name='chat_interface'),
    path('knowledge/', KnowledgeEntryView.as_view(), name='knowledge_list'),
    path('knowledge/<str:entry_id>/', KnowledgeEntryView.as_view(), name='knowledge_detail'),
    path('register/', ExpertRegistrationView.as_view(), name='expert_register'),
    path('expert/profile/', ExpertProfileView.as_view(), name='expert_profile'),
    path('expert/profile/update/', ExpertProfileUpdateView.as_view(), name='expert_profile_update'),
    path('experts/', ExpertListView.as_view(), name='expert-list'),
    path('experts/<str:expert_id>/', ExpertDetailView.as_view(), name='expert-detail'),
    path('training/sessions/', TrainingSessionView.as_view(), name='training-sessions'),
    path('training/sessions/<str:session_id>/questions/', TrainingQuestionView.as_view(), name='training-questions'),
] 