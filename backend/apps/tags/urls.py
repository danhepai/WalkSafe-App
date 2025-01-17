from django.urls import path

from .views import TagsListView, DisplayableTagsListView

urlpatterns = [
    path('', TagsListView.as_view(), name='all-tags-list'),
    path('displayable/', DisplayableTagsListView.as_view(), name='displayable-tags-list')
]
