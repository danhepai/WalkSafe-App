from rest_framework.serializers import ModelSerializer, SerializerMethodField, PrimaryKeyRelatedField

from .models import Review, Photo, Vote
from ..accounts.serializers import CustomUserViewSerializer
from ..tags.models import Tag


class ReviewSerializer(ModelSerializer):
    user = CustomUserViewSerializer(read_only=True)
    photos = SerializerMethodField()
    tags = SerializerMethodField()
    votes = SerializerMethodField()
    user_vote = SerializerMethodField()

    class Meta:
        model = Review
        fields = ['id', 'user', 'rating', 'description', 'photos', 'tags', 'votes', 'user_vote', 'created_at']
        read_only_fields = ['id', 'user', 'photos', 'tags', 'votes', 'user_vote', 'created_at']

    def get_photos(self, obj):
        photo_urls = Photo.objects.filter(review=obj)
        request = self.context.get('request')
        return [request.build_absolute_uri(photo.photo.url) for photo in photo_urls]

    def get_tags(self, obj):
        tags = obj.tags.all()
        return [tag.name for tag in tags]

    def get_votes(self, obj):
        upvotes = obj.votes.filter(vote_type='upvote').count()
        downvotes = obj.votes.filter(vote_type='downvote').count()
        return upvotes - downvotes

    def get_user_vote(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            vote = obj.votes.filter(user=request.user).first()
            return vote.vote_type if vote else None
        return None


class CreateReviewSerializer(ReviewSerializer):
    tag_ids = PrimaryKeyRelatedField(
        queryset=Tag.objects.all(),
        many=True,
        write_only=True,
        required=False
    )

    class Meta:
        model = ReviewSerializer.Meta.model
        fields = ReviewSerializer.Meta.fields + ['route', 'tag_ids']
        read_only_fields = ReviewSerializer.Meta.read_only_fields

    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['user'] = request.user
        tag_ids = validated_data.pop('tag_ids', [])
        review = super().create(validated_data)
        review.tags.set(tag_ids)
        return review


class VoteSerializer(ModelSerializer):
    class Meta:
        model = Vote
        fields = ['review', 'vote_type']

    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['user'] = request.user
        vote, created = Vote.objects.update_or_create(
            user=validated_data['user'],
            review=validated_data['review'],
            defaults={'vote_type': validated_data['vote_type']}
        )
        return vote


class PhotoSerializer(ModelSerializer):
    class Meta:
        model = Photo
        fields = ['photo']

    def create(self, validated_data):
        review = self.context['review']
        return Photo.objects.create(review=review, **validated_data)
