from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import ListAPIView, CreateAPIView, get_object_or_404, RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.status import HTTP_201_CREATED
from pydantic import BaseModel
from openai import OpenAI
import json
import datetime
import requests

from .models import Route
from .serializers import RouteListSerializer, PhotoSerializer, RouteSerializer, CreateRouteSerializer


class CreateRouteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CreateRouteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        start_latitude = serializer.validated_data['start_latitude']
        start_longitude = serializer.validated_data['start_longitude']
        end_latitude = serializer.validated_data['end_latitude']
        end_longitude = serializer.validated_data['end_longitude']
        tags = serializer.validated_data.get('tag_ids', [])
        route_backend_tags = ["Nature", "Shadow", "Water", "No Pollution"]
        tag_names = [tag.name for tag in tags if tag.name in route_backend_tags]
        title = serializer.validated_data.get('title', 'Untitled route')

        url = "http://127.0.0.1:8001/routes/"
        data = {
            "start": {"latitude": start_latitude, "longitude": start_longitude},
            "finish": {"latitude": end_latitude, "longitude": end_longitude},
            "tags": tag_names
        }

        response = requests.post(url, json=data)
        if response.status_code != 200:
            return Response(response.json(), status=response.status_code)

        points = json.dumps(response.json()['routes'][0]['overview_polyline']['points'])

        client = OpenAI()

        completion = client.beta.chat.completions.parse(
            model="gpt-4o",
            messages=[
                {"role": "system",
                 "content": f"You must simplify the route given in JSON to have maximum 25 points. Just eliminate points that are not relevant, do not change them. The first is the longitude and the second is the latitude. Also add the additional information for walking on the route."},
                {"role": "user",
                 "content": points},
            ],
            response_format=RouteJSON,
        )

        route_from_gpt = completion.choices[0].message.parsed

        new_route = Route.objects.create(
            user=request.user,
            title=title,
            distance=route_from_gpt.distance_in_km,
            estimated_time=datetime.timedelta(hours=int(route_from_gpt.estimated_time.hours),
                                              minutes=int(route_from_gpt.estimated_time.minutes)),
            maximum_elevation_degree=route_from_gpt.maximum_elevation_degree,
            description='',
            route=json.dumps([point.dict() for point in route_from_gpt.points]),
            visibility=Route.PRIVATE
        )
        new_route.tags.add(*tags)
        new_route.save()

        route_response = RouteSerializer(new_route, context={"request": request}).data

        return Response(route_response, status=HTTP_201_CREATED)


class RoutesListView(ListAPIView):
    serializer_class = RouteListSerializer
    permission_classes = [IsAuthenticated]


class PublicRoutesListView(RoutesListView):
    def get_queryset(self):
        return Route.objects.filter(visibility='public').order_by('-created_at')


class CurrentUserRoutesListView(RoutesListView):
    def get_queryset(self):
        return Route.objects.filter(user=self.request.user).order_by('-created_at')


class RouteDetailsView(RetrieveAPIView):
    queryset = Route.objects.all()
    serializer_class = RouteSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'
    lookup_url_kwarg = 'route_id'

    def get_object(self):
        route = super().get_object()

        if route.visibility == 'public' or self.request.user == route.user:
            return route
        else:
            raise PermissionDenied("You do not have permission to access this route.")


class UploadRoutePhotoAPIView(CreateAPIView):
    serializer_class = PhotoSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['route'] = get_object_or_404(Route, id=self.kwargs['route_id'])
        return context

    def perform_create(self, serializer):
        route = self.get_serializer_context()['route']
        if self.request.user != route.user:
            raise PermissionDenied("You do not have permission to upload a photo to this route.")
        serializer.save()


class PointJSON(BaseModel):
    lat: str
    long: str

    def dict(self):
        return {
            "lat": self.lat,
            "long": self.long
        }


class EstimatedTimeJSON(BaseModel):
    hours: str
    minutes: str


class RouteJSON(BaseModel):
    points: list[PointJSON]
    distance_in_km: str
    estimated_time: EstimatedTimeJSON
    maximum_elevation_degree: str
