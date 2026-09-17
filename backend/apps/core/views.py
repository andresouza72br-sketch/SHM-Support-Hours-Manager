from rest_framework import permissions, parsers, status
from rest_framework.views import APIView
from rest_framework.response import Response
from apps.core.models import ConfiguracaoBranding
from apps.core.permissions import IsEmpresaAdmin
from apps.core.serializers import BrandingPublicoSerializer, ConfiguracaoBrandingAdminSerializer


class BrandingPublicoView(APIView):
    """
    Endpoint público/geral para apresentação da identidade visual da empresa prestadora de suporte.
    Retorna apenas dados seguros de exibição institucional (nome fantasia, slogan, logo, telefone, URL, cor).
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        branding = ConfiguracaoBranding.get_instancia()
        serializer = BrandingPublicoSerializer(branding, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class BrandingAdminView(APIView):
    """
    Endpoint administrativo para consulta completa e atualização dos dados de Branding.
    Restrito exclusivamente a administradores da empresa prestadora (EMPRESA_ADMIN / superuser).
    """
    permission_classes = [IsEmpresaAdmin]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get(self, request):
        branding = ConfiguracaoBranding.get_instancia()
        serializer = ConfiguracaoBrandingAdminSerializer(branding, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        return self._salvar(request, partial=False)

    def patch(self, request):
        return self._salvar(request, partial=True)

    def post(self, request):
        return self._salvar(request, partial=True)

    def _salvar(self, request, partial=True):
        branding = ConfiguracaoBranding.get_instancia()
        serializer = ConfiguracaoBrandingAdminSerializer(
            branding,
            data=request.data,
            partial=partial,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(atualizado_por=request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)
