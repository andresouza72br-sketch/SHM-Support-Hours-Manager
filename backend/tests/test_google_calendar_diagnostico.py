from unittest.mock import patch, MagicMock
import pytest
import requests
from apps.schedule.google_service import GoogleCalendarService
from apps.schedule.models import ConfiguracaoSchedule

@pytest.mark.django_db
class TestGoogleCalendarDiagnostico:
    def test_calendar_id_prioriza_banco_de_dados(self):
        config = ConfiguracaoSchedule.get_solo()
        config.calendar_id = "agenda-personalizada@group.calendar.google.com"
        config.save()

        service = GoogleCalendarService()
        assert service.calendar_id == "agenda-personalizada@group.calendar.google.com"

    def test_testar_conexao_em_modo_mock_sem_credenciais(self):
        service = GoogleCalendarService()
        with patch.object(service, "_tem_credenciais_configuradas", return_value=False):
            resultado = service.testar_conexao()
            assert resultado["sucesso"] is True
            assert resultado["status_conexao"] == "mock_desenvolvimento"
            assert resultado["modo"] == "simulacao"
            assert resultado["latencia_ms"] >= 0

    def test_testar_conexao_sucesso_google_api(self):
        service = GoogleCalendarService()
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "id": "suporte-SHM",
            "summary": "Agenda Corporativa Suporte SHM",
            "timeZone": "America/Sao_Paulo",
            "accessRole": "writer",
        }

        mock_session = MagicMock()
        mock_session.get.return_value = mock_resp

        with patch.object(service, "_tem_credenciais_configuradas", return_value=True):
            with patch.object(service, "_obter_sessao_autenticada", return_value=mock_session):
                resultado = service.testar_conexao()
                assert resultado["sucesso"] is True
                assert resultado["status_conexao"] == "conectado"
                assert resultado["modo"] == "ativo"
                assert resultado["detalhes"]["summary"] == "Agenda Corporativa Suporte SHM"
                assert resultado["detalhes"]["accessRole"] == "writer"

    def test_testar_conexao_erro_permissao_google_api(self):
        service = GoogleCalendarService()
        mock_resp = MagicMock()
        mock_resp.status_code = 404
        mock_resp.text = "Not Found"

        mock_session = MagicMock()
        mock_session.get.return_value = mock_resp

        with patch.object(service, "_tem_credenciais_configuradas", return_value=True):
            with patch.object(service, "_obter_sessao_autenticada", return_value=mock_session):
                resultado = service.testar_conexao()
                assert resultado["sucesso"] is False
                assert resultado["status_conexao"] == "erro"
                assert resultado["erro_codigo"] == 404

    def test_testar_conexao_timeout(self):
        service = GoogleCalendarService()
        mock_session = MagicMock()
        mock_session.get.side_effect = requests.exceptions.Timeout("Timeout 8s")

        with patch.object(service, "_tem_credenciais_configuradas", return_value=True):
            with patch.object(service, "_obter_sessao_autenticada", return_value=mock_session):
                resultado = service.testar_conexao()
                assert resultado["sucesso"] is False
                assert resultado["status_conexao"] == "timeout"
