from rest_framework import serializers
from apps.schedule.models import (
    Agendamento,
    ParticipanteAgendamento,
    LembreteAgendamento,
    TipoEventoSchedule,
    StatusAgendamento,
    TipoParticipante,
    StatusPresenca,
    MarcoLembrete,
    StatusLembrete,
)
from apps.clientes.models import Cliente
from apps.pedidos.models import Pedido
from apps.ciclos.models import Ciclo

class ParticipanteAgendamentoSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)
    status_presenca_display = serializers.CharField(source="get_status_presenca_display", read_only=True)

    class Meta:
        model = ParticipanteAgendamento
        fields = [
            "id",
            "usuario",
            "nome",
            "email",
            "tipo",
            "tipo_display",
            "status_presenca",
            "status_presenca_display",
        ]


class LembreteAgendamentoSerializer(serializers.ModelSerializer):
    marco_display = serializers.CharField(source="get_marco_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = LembreteAgendamento
        fields = [
            "id",
            "marco",
            "marco_display",
            "status",
            "status_display",
            "data_prevista",
            "disparado_em",
        ]


class AgendamentoListSerializer(serializers.ModelSerializer):
    cliente_nome = serializers.CharField(source="cliente.nome_fantasia", read_only=True)
    pedido_protocolo = serializers.CharField(source="pedido.protocolo", read_only=True, default=None)
    pedido_assunto = serializers.CharField(source="pedido.assunto", read_only=True, default=None)
    ciclo_tipo = serializers.CharField(source="ciclo.get_tipo_display", read_only=True, default=None)
    organizador_nome = serializers.SerializerMethodField()
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    participantes = ParticipanteAgendamentoSerializer(many=True, read_only=True)

    class Meta:
        model = Agendamento
        fields = [
            "id",
            "cliente",
            "cliente_nome",
            "pedido",
            "pedido_protocolo",
            "pedido_assunto",
            "ciclo",
            "ciclo_tipo",
            "tarefa",
            "organizador",
            "organizador_nome",
            "titulo",
            "descricao",
            "tipo",
            "tipo_display",
            "status",
            "status_display",
            "data_inicio",
            "data_fim",
            "duracao_minutos",
            "google_event_id",
            "google_meet_link",
            "google_sincronizado",
            "participantes",
            "criado_em",
        ]

    def get_organizador_nome(self, obj):
        if obj.organizador:
            return obj.organizador.get_full_name() or obj.organizador.username
        return ""


class AgendamentoDetailSerializer(AgendamentoListSerializer):
    lembretes = LembreteAgendamentoSerializer(many=True, read_only=True)

    class Meta(AgendamentoListSerializer.Meta):
        fields = AgendamentoListSerializer.Meta.fields + [
            "motivo_cancelamento",
            "lembretes",
            "atualizado_em",
        ]


class ParticipanteInputSerializer(serializers.Serializer):
    email = serializers.EmailField()
    nome = serializers.CharField(max_length=100)
    tipo = serializers.ChoiceField(choices=TipoParticipante.choices, default=TipoParticipante.CLIENTE)
    usuario = serializers.IntegerField(required=False, allow_null=True)


class CriarAgendamentoSerializer(serializers.Serializer):
    cliente = serializers.PrimaryKeyRelatedField(queryset=Cliente.objects.all())
    pedido = serializers.PrimaryKeyRelatedField(queryset=Pedido.objects.all(), required=False, allow_null=True)
    ciclo = serializers.PrimaryKeyRelatedField(queryset=Ciclo.objects.all(), required=False, allow_null=True)
    tarefa = serializers.IntegerField(required=False, allow_null=True)
    titulo = serializers.CharField(max_length=150)
    descricao = serializers.CharField(required=False, allow_blank=True, default="")
    tipo = serializers.ChoiceField(choices=TipoEventoSchedule.choices, default=TipoEventoSchedule.ALINHAMENTO)
    data_inicio = serializers.DateTimeField()
    data_fim = serializers.DateTimeField(required=False, allow_null=True)
    duracao_minutos = serializers.IntegerField(default=45, min_value=5, max_value=480)
    participantes = ParticipanteInputSerializer(many=True, required=False, default=list)
    sincronizar_google = serializers.BooleanField(default=True)
    google_meet_link = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class ConfiguracaoScheduleSerializer(serializers.Serializer):
    calendar_id = serializers.CharField()
    google_subscribe_url = serializers.SerializerMethodField()
    modo_operacao = serializers.CharField()
    service_account_configurada = serializers.BooleanField()
    service_account_email = serializers.CharField(allow_null=True, required=False)
    atualizado_em = serializers.DateTimeField(allow_null=True, required=False)
    atualizado_por_nome = serializers.CharField(allow_null=True, required=False)

    def get_google_subscribe_url(self, obj):
        import urllib.parse
        cal_id = obj.get("calendar_id", "suporte-SHM")
        encoded = urllib.parse.quote(cal_id)
        return f"https://calendar.google.com/calendar/render?cid={encoded}"


class AtualizarConfiguracaoScheduleSerializer(serializers.Serializer):
    calendar_id = serializers.CharField(max_length=255, required=True, allow_blank=False)
