from django.urls import path

from .views import RegisterUserView, CurrentUserView, UserDetailsView

urlpatterns = [
    path('register/', RegisterUserView.as_view(), name='register'),
    path('auth/user/', CurrentUserView.as_view(), name='current-user'),
    path('auth/user/<int:user_id>/', UserDetailsView.as_view(), name='user-details'),
]
