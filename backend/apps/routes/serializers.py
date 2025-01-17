from rest_framework.serializers import ModelSerializer, SerializerMethodField, PrimaryKeyRelatedField, Serializer, \
    FloatField, CharField
from django.db.models import Avg
import json

from .models import Route, Photo
from ..tags.models import Tag
from ..accounts.serializers import CustomUserViewSerializer
from ..reviews.serializers import ReviewSerializer


class RouteListSerializer(ModelSerializer):
    photos = SerializerMethodField()
    tags = SerializerMethodField()
    average_rating = SerializerMethodField(read_only=True)
    user = CustomUserViewSerializer(read_only=True)

    class Meta:
        model = Route
        fields = [
            'id', 'user', 'title', 'distance', 'estimated_time', 'average_rating',
            'photos', 'tags', 'visibility', 'created_at'
        ]
        read_only_fields = ['id', 'distance', 'estimated_time', 'photos', 'tags', 'created_at']

    def get_photos(self, obj):
        photo_urls = Photo.objects.filter(route=obj)
        request = self.context.get('request')
        return [request.build_absolute_uri(photo.photo.url) for photo in photo_urls]

    def get_tags(self, obj):
        tags = obj.tags.all()
        return [tag.name for tag in tags]

    def get_average_rating(self, obj):
        avg_rating = obj.reviews.aggregate(average=Avg('rating'))['average']
        return format(avg_rating, ".2f") if avg_rating is not None else None


class RouteSerializer(RouteListSerializer):
    reviews = SerializerMethodField(read_only=True)

    class Meta:
        model = RouteListSerializer.Meta.model
        fields = RouteListSerializer.Meta.fields + ['maximum_elevation_degree', 'description', 'route', 'reviews']
        read_only_fields = RouteListSerializer.Meta.fields + ['maximum_elevation_degree', 'route']

    def get_reviews(self, obj):
        reviews = ReviewSerializer(obj.reviews.all(), many=True, context=self.context).data
        reviews.sort(key=lambda review: review["votes"], reverse=True)
        return reviews

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['route'] = json.loads(instance.route)
        return representation


class PhotoSerializer(ModelSerializer):
    class Meta:
        model = Photo
        fields = ['photo']

    def create(self, validated_data):
        route = self.context['route']
        return Photo.objects.create(route=route, **validated_data)


class CreateRouteSerializer(Serializer):
    start_latitude = FloatField()
    start_longitude = FloatField()
    end_latitude = FloatField()
    end_longitude = FloatField()
    tag_ids = PrimaryKeyRelatedField(
        queryset=Tag.objects.all(),
        many=True,
        write_only=True,
        required=False
    )
    title = CharField(max_length=100, required=False)
