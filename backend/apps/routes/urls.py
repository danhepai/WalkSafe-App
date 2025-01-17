from django.urls import path

from .views import CreateRouteView, PublicRoutesListView, CurrentUserRoutesListView, UploadRoutePhotoAPIView, RouteDetailsView

urlpatterns = [
    path('route/', CreateRouteView.as_view(), name='create-route'),
    path('routes/public/', PublicRoutesListView.as_view(), name='public-routes-list'),
    path('routes/', CurrentUserRoutesListView.as_view(), name='current-user-routes-list'),
    path('route/<int:route_id>/', RouteDetailsView.as_view(), name='route-details'),
    path('route/<int:route_id>/upload_photo/', UploadRoutePhotoAPIView.as_view(), name='upload-route-photo'),
]
