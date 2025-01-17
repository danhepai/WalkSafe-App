from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.http import FileResponse, Http404
from django.conf import settings
import os

class ProtectedMediaView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, file_path):
        # Construct the full file path
        full_path = os.path.join(settings.MEDIA_ROOT, file_path)

        # Check if the file exists
        if not os.path.exists(full_path):
            raise Http404("Media file not found.")

        # Serve the file as a response
        return FileResponse(open(full_path, 'rb'))