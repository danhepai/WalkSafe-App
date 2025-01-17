from django.urls import path

from .views import UploadReviewPhotoAPIView, CreateReviewView, DeleteReviewView, CreateVoteView, DeleteVoteView

urlpatterns = [
    path('review/', CreateReviewView.as_view(), name='create-review'),
    path('review/<int:pk>/', DeleteReviewView.as_view(), name='delete-review'),
    path('review/<int:review_id>/upload_photo/', UploadReviewPhotoAPIView.as_view(), name='upload-review-photo'),
    path('vote/', CreateVoteView.as_view(), name='create-vote'),
    path('vote/<int:review_id>/', DeleteVoteView.as_view(), name='delete-vote'),
]
