from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import CreateAPIView, get_object_or_404, DestroyAPIView
from rest_framework.permissions import IsAuthenticated

from .models import Review, Vote
from .serializers import PhotoSerializer, CreateReviewSerializer, VoteSerializer


class CreateReviewView(CreateAPIView):
    serializer_class = CreateReviewSerializer
    permission_classes = [IsAuthenticated]


class DeleteReviewView(DestroyAPIView):
    queryset = Review.objects.all()
    permission_classes = [IsAuthenticated]

    def perform_destroy(self, instance):
        if self.request.user != instance.user:
            raise PermissionDenied("You do not have permission to delete this review.")


class UploadReviewPhotoAPIView(CreateAPIView):
    serializer_class = PhotoSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['review'] = get_object_or_404(Review, id=self.kwargs['review_id'])
        return context

    def perform_create(self, serializer):
        review = self.get_serializer_context()['review']
        if self.request.user != review.user:
            raise PermissionDenied("You do not have permission to upload a photo to this review.")
        serializer.save()


class CreateVoteView(CreateAPIView):
    serializer_class = VoteSerializer
    permission_classes = [IsAuthenticated]


class DeleteVoteView(DestroyAPIView):
    permission_classes = [IsAuthenticated]

    def get_object(self):
        review_id = self.kwargs['review_id']
        user = self.request.user
        return get_object_or_404(Vote, user=user, review_id=review_id)
