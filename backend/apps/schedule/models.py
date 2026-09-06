import uuid
from datetime import timedelta
from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedModel

class TipoEventoSchedule(models.TextChoices):
    ALINHAMENTO = "alinhamento", "Alinhamento de Chamado"
    ORCAMENTO = "orcamento", "Apresentação de Orçamento"
    HOMOLOGACAO = "homologacao", "Homologação e Aceite"
    SUPORTE_EMERGENCIAL = "suporte_emergencial", "Suporte Emergencial"
    AVULSO = "avulso", "Reunião de Suporte Avulsa"

class StatusAgendamento(models.TextChoices):
    AGENDADO = "agendado", "Agendado"
    EM_ANDAMENTO = "em_andamento", "Em Andamento"
    REALIZADO = "realizado", "Realizado"
    CANCELADO = "cancelado", "Cancelado"

class Agendamento(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cliente = models.ForeignKey(
        "clientes.Cliente",
        on_delete=models.CASCADE,
        related_name="agendamentos",
        verbose_name="cliente",
    )
    pedido = models.ForeignKey(
        "pedidos.Pedido",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="agendamentos",
        verbose_name="pedido/chamado",
    )
    ciclo = models.ForeignKey(
        "ciclos.Ciclo",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="agendamentos",
        verbose_name="ciclo técnico",
    )
    tarefa = models.ForeignKey(
        "tarefas.Tarefa",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="agendamentos",
        verbose_name="tarefa técnica",
    )
    organizador = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="agendamentos_organizados",
        verbose_name="organizador",
    )
    titulo = models.CharField("título do compromisso", max_length=150)
    descricao = models.TextField("pauta / descrição", blank=True)
    tipo = models.CharField(
        "tipo de evento",
        max_length=30,
        choices=TipoEventoSchedule.choices,
        default=TipoEventoSchedule.ALINHAMENTO,
    )
    status = models.CharField(
        "status do agendamento",
        max_length=20,
        choices=StatusAgendamento.choices,
        default=StatusAgendamento.AGENDADO,
        db_index=True,
    )
    data_inicio = models.DateTimeField("data e hora de início", db_index=True)
    data_fim = models.DateTimeField("data e hora de término")
    duracao_minutos = models.PositiveIntegerField("duração em minutos", default=45)
    
    # Integração Google Calendar / Google Meet
    google_event_id = models.CharField("ID do evento no Google Calendar", max_length=255, blank=True, null=True, db_index=True)
    google_meet_link = models.URLField("link da sala Google Meet", max_length=500, blank=True, null=True)
    google_sincronizado = models.BooleanField("sincronizado com Google", default=False)
    
    motivo_cancelamento = models.TextField("motivo do cancelamento", blank=True, null=True)

    class Meta:
        db_table = "shm_agendamento"
        ordering = ["data_inicio"]
        verbose_name = "agendamento"
        verbose_name_plural = "agendamentos"

    def __str__(self):
        return f"{self.titulo} ({self.get_tipo_display()}) - {self.data_inicio.strftime('%d/%m/%Y %H:%M')}"

    def save(self, *args, **kwargs):
        if self.data_inicio and not self.data_fim:
            self.data_fim = self.data_inicio + timedelta(minutes=self.duracao_minutos)
        elif self.data_inicio and self.data_fim:
            diff = int((self.data_fim - self.data_inicio).total_seconds() / 60)
            if diff > 0:
                self.duracao_minutos = diff
        super().save(*args, **kwargs)


class TipoParticipante(models.TextChoices):
    ORGANIZADOR = "organizador", "Organizador"
    TECNICO = "tecnico", "Técnico da Empresa"
    CLIENTE = "cliente", "Representante do Cliente"
    CONVIDADO = "convidado", "Convidado Externo"


class StatusPresenca(models.TextChoices):
    PENDENTE = "pendente", "Pendente"
    CONFIRMADO = "confirmado", "Confirmado"
    RECUSADO = "recusado", "Recusado"


class ParticipanteAgendamento(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agendamento = models.ForeignKey(
        Agendamento,
        on_delete=models.CASCADE,
        related_name="participantes",
        verbose_name="agendamento",
    )
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="participacoes_agenda",
        verbose_name="usuário do sistema",
    )
    nome = models.CharField("nome", max_length=100)
    email = models.EmailField("e-mail")
    tipo = models.CharField(
        "tipo de participante",
        max_length=20,
        choices=TipoParticipante.choices,
        default=TipoParticipante.CLIENTE,
    )
    status_presenca = models.CharField(
        "status de presença",
        max_length=20,
        choices=StatusPresenca.choices,
        default=StatusPresenca.PENDENTE,
    )

    class Meta:
        db_table = "shm_participante_agendamento"
        unique_together = [("agendamento", "email")]
        verbose_name = "participante do agendamento"
        verbose_name_plural = "participantes do agendamento"

    def __str__(self):
        return f"{self.nome} <{self.email}> ({self.get_tipo_display()})"


class MarcoLembrete(models.TextChoices):
    MARCO_24H = "24h", "24 Horas Antes"
    MARCO_30M = "30m", "30 Minutos Antes"
    MARCO_15M = "15m", "15 Minutos Antes"


class StatusLembrete(models.TextChoices):
    PENDENTE = "pendente", "Pendente"
    ENVIADO = "enviado", "Enviado"
    IGNORADO = "ignorado", "Ignorado / Fora da Janela"
    CANCELADO = "cancelado", "Cancelado"
    FALHA = "falha", "Falha no Envio"


class LembreteAgendamento(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agendamento = models.ForeignKey(
        Agendamento,
        on_delete=models.CASCADE,
        related_name="lembretes",
        verbose_name="agendamento",
    )
    marco = models.CharField("marco temporal", max_length=10, choices=MarcoLembrete.choices)
    status = models.CharField(
        "status do lembrete",
        max_length=20,
        choices=StatusLembrete.choices,
        default=StatusLembrete.PENDENTE,
        db_index=True,
    )
    data_prevista = models.DateTimeField("data e hora prevista para o disparo")
    disparado_em = models.DateTimeField("disparado em", null=True, blank=True)
    erro_mensagem = models.TextField("detalhes do erro", blank=True, null=True)

    class Meta:
        db_table = "shm_lembrete_agendamento"
        unique_together = [("agendamento", "marco")]
        ordering = ["data_prevista"]
        verbose_name = "lembrete de agendamento"
        verbose_name_plural = "lembretes de agendamento"

    def __str__(self):
        return f"Lembrete {self.get_marco_display()} para {self.agendamento.titulo} ({self.get_status_display()})"


class ConfiguracaoSchedule(TimeStampedModel):
    id = models.IntegerField(primary_key=True, default=1, editable=False)
    calendar_id = models.CharField(
        "ID da Agenda Corporativa Google",
        max_length=255,
        default="suporte-SHM",
        help_text="ID do Google Calendar corporativo (ex: suporte-SHM ou email@group.calendar.google.com)",
    )
    atualizado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="configuracoes_schedule_atualizadas",
        verbose_name="atualizado por",
    )

    class Meta:
        db_table = "shm_configuracao_schedule"
        verbose_name = "configuração de agendamento"
        verbose_name_plural = "configurações de agendamento"

    def __str__(self):
        return f"Configuração Schedule (Calendar ID: {self.calendar_id})"

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(id=1)
        return obj
