from rest_framework.generics import ListAPIView

from .models import Tag
from .serializers import TagSerializer


class TagsListView(ListAPIView):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer


class DisplayableTagsListView(ListAPIView):
    queryset = Tag.objects.filter(displayable=True)
    serializer_class = TagSerializer
