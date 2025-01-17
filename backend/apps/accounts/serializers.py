from rest_framework.serializers import ModelSerializer, IntegerField, CharField, SerializerMethodField, ValidationError
from django.contrib.auth.password_validation import validate_password
from django.db.models import Sum, Avg

from .models import CustomUser
from ..reviews.models import Review


class RegisterCustomUserSerializer(ModelSerializer):
    id = IntegerField(read_only=True)
    password = CharField(write_only=True)

    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'password', 'description', 'photo', 'birth_day']

    def validate_email(self, value):
        """
        Custom validation for the email field.
        """
        if CustomUser.objects.filter(email=value).exists():
            raise ValidationError("A user with that email already exists.")
        return value

    def validate_password(self, value):
        """
        Validate the password using Django's built-in validators.
        """
        try:
            validate_password(value)
        except ValidationError as e:
            raise ValidationError(e.messages)
        return value

    def create(self, validated_data):
        user = CustomUser.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            description=validated_data.get('description', ''),
            photo=validated_data.get('photo', None),
            birth_day=validated_data.get('birth_day', None),
        )
        user.save()
        return user


class CustomUserSerializer(RegisterCustomUserSerializer):
    username = CharField(read_only=True)
    statistics = SerializerMethodField()

    class Meta:
        model = RegisterCustomUserSerializer.Meta.model
        fields = RegisterCustomUserSerializer.Meta.fields + ['statistics']

    def get_statistics(self, obj):
        number_of_routes = obj.routes.count()
        number_of_public_routes = obj.routes.filter(visibility='public').count()
        number_of_reviews = obj.reviews.count()
        number_of_upvotes = obj.votes.filter(vote_type='upvote').count()
        number_of_downvotes = obj.votes.filter(vote_type='downvote').count()
        total_distance_of_routes = obj.routes.aggregate(total_distance=Sum('distance'))['total_distance']
        received_reviews = Review.objects.filter(route__user=obj)
        number_of_received_reviews = received_reviews.count()
        average_received_rating = received_reviews.aggregate(average=Avg('rating'))['average']

        return {
            'routes': number_of_routes,
            'public_routes': number_of_public_routes,
            'reviews': number_of_reviews,
            'upvotes': number_of_upvotes,
            'downvotes': number_of_downvotes,
            'total_distance': total_distance_of_routes,
            'received_reviews': number_of_received_reviews,
            'average_received_rating': format(average_received_rating,
                                              '.2f') if average_received_rating is not None else None
        }

    def create(self, validated_data):
        raise ValidationError('You cannot create a user through this endpoint.')

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        if password:
            instance.set_password(password)

        return super().update(instance, validated_data)


class CustomUserViewSerializer(ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'photo']
