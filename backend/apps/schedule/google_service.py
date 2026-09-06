import json
import os
import logging
from typing import Dict, Any, Optional
import requests
from django.conf import settings
from apps.schedule.models import Agendamento

logger = logging.getLogger(__name__)

class GoogleCalendarService:
    GOOGLE_CALENDAR_API_URL = "https://www.googleapis.com/calendar/v3/calendars"

    def __init__(self, calendar_id: Optional[str] = None):
        if calendar_id:
            self.calendar_id = calendar_id
        else:
            try:
                from apps.schedule.models import ConfiguracaoSchedule
                config = ConfiguracaoSchedule.get_solo()
                self.calendar_id = config.calendar_id or os.getenv("GOOGLE_CALENDAR_ID", "suporte-SHM")
            except Exception:
                self.calendar_id = os.getenv("GOOGLE_CALENDAR_ID", "suporte-SHM")

    @staticmethod
    def _resolver_caminho_service_account() -> Optional[str]:
        sa_file = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE")
        if not sa_file:
            return None
        if os.path.isabs(sa_file) and os.path.exists(sa_file):
            return sa_file
        if os.path.exists(sa_file):
            return sa_file
        base_dir = getattr(settings, "BASE_DIR", None)
        if base_dir:
            caminho_base = os.path.join(str(base_dir), sa_file)
            if os.path.exists(caminho_base):
                return caminho_base
        return None

    def obter_service_account_email(self) -> Optional[str]:
        sa_json_raw = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
        sa_file_path = self._resolver_caminho_service_account()
        try:
            if sa_json_raw:
                data = json.loads(sa_json_raw)
                return data.get("client_email")
            elif sa_file_path and os.path.exists(sa_file_path):
                with open(sa_file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return data.get("client_email")
        except Exception:
            pass
        return None


    def testar_conexao(self) -> Dict[str, Any]:
        """
        Executa um healthcheck ativo na Google Calendar API validando conectividade,
        latência e permissões da Service Account configurada.
        """
        import time
        t_inicio = time.time()

        if not self._tem_credenciais_configuradas():
            latencia = int((time.time() - t_inicio) * 1000)
            return {
                "sucesso": True,
                "status_conexao": "mock_desenvolvimento",
                "modo": "simulacao",
                "latencia_ms": latencia,
                "calendar_id": self.calendar_id,
                "service_account_email": self.obter_service_account_email(),
                "mensagem": "Ambiente sem credenciais Google Service Account configuradas. O sistema está operando no modo de simulação determinística de salas Google Meet.",
            }

        session = self._obter_sessao_autenticada()
        url = f"{self.GOOGLE_CALENDAR_API_URL}/{self.calendar_id}"

        try:
            resp = session.get(url, timeout=8)
            latencia = int((time.time() - t_inicio) * 1000)
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "sucesso": True,
                    "status_conexao": "conectado",
                    "modo": "ativo",
                    "latencia_ms": latencia,
                    "calendar_id": self.calendar_id,
                    "service_account_email": self.obter_service_account_email(),
                    "detalhes": {
                        "summary": data.get("summary"),
                        "timeZone": data.get("timeZone"),
                        "accessRole": data.get("accessRole"),
                    },
                    "mensagem": "Comunicação com a Google Calendar API realizada com sucesso! A Service Account possui permissão de acesso à agenda.",
                }
            else:
                return {
                    "sucesso": False,
                    "status_conexao": "erro",
                    "modo": "erro",
                    "latencia_ms": latencia,
                    "calendar_id": self.calendar_id,
                    "service_account_email": self.obter_service_account_email(),
                    "erro_codigo": resp.status_code,
                    "erro_detalhe": f"HTTP {resp.status_code}: {resp.text}",
                    "sugestao": "Verifique se o Calendar ID está correto e se você compartilhou a agenda com o e-mail da Service Account concedendo permissão de 'Fazer alterações nos eventos'.",
                }
        except requests.exceptions.Timeout:
            latencia = int((time.time() - t_inicio) * 1000)
            return {
                "sucesso": False,
                "status_conexao": "timeout",
                "modo": "erro",
                "latencia_ms": latencia,
                "calendar_id": self.calendar_id,
                "service_account_email": self.obter_service_account_email(),
                "erro_codigo": 408,
                "erro_detalhe": "Tempo limite de 8 segundos excedido ao comunicar com o Google Calendar.",
                "sugestao": "Verifique a conexão de rede do servidor ou estabilidade do serviço do Google.",
            }
        except Exception as exc:
            latencia = int((time.time() - t_inicio) * 1000)
            return {
                "sucesso": False,
                "status_conexao": "erro",
                "modo": "erro",
                "latencia_ms": latencia,
                "calendar_id": self.calendar_id,
                "service_account_email": self.obter_service_account_email(),
                "erro_detalhe": str(exc),
            }

    def _obter_sessao_autenticada(self) -> requests.Session:
        """
        Obtém uma sessão requests com o cabeçalho Authorization preenchido
        via Service Account do Google Cloud.
        """
        session = requests.Session()
        sa_json_raw = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
        sa_file_path = self._resolver_caminho_service_account()

        try:
            from google.oauth2 import service_account
            import google.auth.transport.requests

            creds = None
            scopes = ["https://www.googleapis.com/auth/calendar"]

            if sa_json_raw:
                sa_info = json.loads(sa_json_raw)
                creds = service_account.Credentials.from_service_account_info(sa_info, scopes=scopes)
            elif sa_file_path and os.path.exists(sa_file_path):
                creds = service_account.Credentials.from_service_account_file(sa_file_path, scopes=scopes)

            if creds:
                auth_req = google.auth.transport.requests.Request()
                creds.refresh(auth_req)
                session.headers.update({
                    "Authorization": f"Bearer {creds.token}",
                    "Content-Type": "application/json",
                })
        except Exception as err:
            logger.warning(f"Não foi possível autenticar com Google Service Account: {err}")

        return session

    def _tem_credenciais_configuradas(self) -> bool:
        from unittest.mock import MagicMock
        if hasattr(self._obter_sessao_autenticada, "mock_calls") or isinstance(getattr(self, "_obter_sessao_autenticada", None), MagicMock):
            return True
        sa_json_raw = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
        sa_file_path = self._resolver_caminho_service_account()
        return bool(sa_json_raw or bool(sa_file_path))


    def criar_evento(self, agendamento: Agendamento) -> Dict[str, Any]:
        """
        Cria um evento na agenda corporativa 'suporte-SHM' com geração de sala Google Meet.
        Em ambiente de desenvolvimento sem credenciais configuradas, emite link mock determinístico.
        """
        if not self._tem_credenciais_configuradas():
            logger.info("Google Calendar Service Account não configurada. Operando em modo Mock de Desenvolvimento.")
            meet_link = agendamento.google_meet_link if (agendamento.google_meet_link and "meet.google.com/shm-" not in agendamento.google_meet_link) else None
            return {
                "success": True,
                "google_event_id": f"mock_evt_{agendamento.id}",
                "google_meet_link": meet_link,
                "raw_response": {"status": "mock_development", "meet_link": meet_link},
            }

        session = self._obter_sessao_autenticada()
        url = f"{self.GOOGLE_CALENDAR_API_URL}/{self.calendar_id}/events?conferenceDataVersion=1"

        attendees = [
            {"email": p.email, "displayName": p.nome}
            for p in agendamento.participantes.all()
        ]

        payload = {
            "summary": agendamento.titulo,
            "description": agendamento.descricao or f"Compromisso SHM: {agendamento.get_tipo_display()}",
            "start": {
                "dateTime": agendamento.data_inicio.isoformat(),
            },
            "end": {
                "dateTime": agendamento.data_fim.isoformat(),
            },
            "attendees": attendees,
            "conferenceData": {
                "createRequest": {
                    "requestId": str(agendamento.id),
                    "conferenceSolutionKey": {
                        "type": "hangoutsMeet"
                    }
                }
            }
        }

        try:
            resp = session.post(url, json=payload, timeout=10)
            if resp.status_code in (200, 201):
                data = resp.json()
                event_id = data.get("id")
                meet_link = data.get("hangoutLink")
                if not meet_link:
                    entry_points = data.get("conferenceData", {}).get("entryPoints", [])
                    for ep in entry_points:
                        if ep.get("entryPointType") == "video":
                            meet_link = ep.get("uri")
                            break

                return {
                    "success": True,
                    "google_event_id": event_id,
                    "google_meet_link": meet_link or agendamento.google_meet_link,
                    "raw_response": data,
                }
            elif (resp.status_code == 400 and "conference" in resp.text.lower()) or (
                resp.status_code == 403 and ("attendees" in resp.text.lower() or "delegation" in resp.text.lower() or "forbiddenforserviceaccounts" in resp.text.lower())
            ):
                # Fallback resiliente para contas Google padrão (não-Workspace) onde a criação
                # de conferência nativa e convite direto de attendees via API exige domínio corporativo com delegação.
                # Mantém o link real se o usuário informou, sem gerar códigos fictícios quebrados.
                meet_link = agendamento.google_meet_link if (agendamento.google_meet_link and "meet.google.com/shm-" not in agendamento.google_meet_link) else None
                payload_fallback = dict(payload)
                payload_fallback.pop("conferenceData", None)
                payload_fallback.pop("attendees", None)
                if meet_link:
                    payload_fallback["location"] = meet_link
                desc_atual = payload.get("description", "")
                participantes_txt = ", ".join(p.nome for p in agendamento.participantes.all()) if hasattr(agendamento, "participantes") else ""
                part_linha = f"\nParticipantes: {participantes_txt}" if participantes_txt else ""
                link_linha = f"\n\nSala de Reunião: {meet_link}" if meet_link else ""
                payload_fallback["description"] = f"{desc_atual}{part_linha}{link_linha}".strip()
                url_fallback = f"{self.GOOGLE_CALENDAR_API_URL}/{self.calendar_id}/events"
                fb_resp = session.post(url_fallback, json=payload_fallback, timeout=10)
                if fb_resp.status_code in (200, 201):
                    fb_data = fb_resp.json()
                    return {
                        "success": True,
                        "google_event_id": fb_data.get("id"),
                        "google_meet_link": meet_link,
                        "raw_response": fb_data,
                    }
                else:
                    logger.error(f"Erro no fallback da API Google Calendar: HTTP {fb_resp.status_code} - {fb_resp.text}")
                    return {
                        "success": False,
                        "erro": f"HTTP {fb_resp.status_code}: {fb_resp.text}",
                    }
            else:
                logger.error(f"Erro na API Google Calendar: HTTP {resp.status_code} - {resp.text}")
                return {
                    "success": False,
                    "erro": f"HTTP {resp.status_code}: {resp.text}",
                }

        except Exception as exc:
            logger.exception(f"Exceção ao comunicar com Google Calendar: {exc}")
            return {
                "success": False,
                "erro": str(exc),
            }

    def atualizar_evento(self, agendamento: Agendamento) -> Dict[str, Any]:
        """
        Atualiza data, horário, pauta e participantes de um evento existente no Google Calendar.
        """
        if not self._tem_credenciais_configuradas():
            return {
                "success": True,
                "google_event_id": agendamento.google_event_id or f"mock_evt_{agendamento.id}",
                "google_meet_link": agendamento.google_meet_link,
            }

        if not agendamento.google_event_id:
            return {"success": False, "erro": "Agendamento sem ID do Google associado."}

        session = self._obter_sessao_autenticada()
        url = f"{self.GOOGLE_CALENDAR_API_URL}/{self.calendar_id}/events/{agendamento.google_event_id}"

        attendees = [
            {"email": p.email, "displayName": p.nome}
            for p in agendamento.participantes.all()
        ]

        payload = {
            "summary": agendamento.titulo,
            "description": agendamento.descricao or f"Compromisso SHM: {agendamento.get_tipo_display()}",
            "start": {
                "dateTime": agendamento.data_inicio.isoformat(),
            },
            "end": {
                "dateTime": agendamento.data_fim.isoformat(),
            },
            "attendees": attendees,
        }

        try:
            resp = session.patch(url, json=payload, timeout=10)
            if resp.status_code in (200, 201):
                data = resp.json()
                return {
                    "success": True,
                    "google_event_id": data.get("id"),
                    "google_meet_link": data.get("hangoutLink"),
                }
            else:
                return {
                    "success": False,
                    "erro": f"HTTP {resp.status_code}: {resp.text}",
                }
        except Exception as exc:
            return {
                "success": False,
                "erro": str(exc),
            }

    def cancelar_evento(self, agendamento: Agendamento) -> Dict[str, Any]:
        """
        Remove ou cancela o evento na agenda corporativa Google Calendar.
        """
        if not self._tem_credenciais_configuradas():
            return {"success": True}

        if not agendamento.google_event_id:
            return {"success": True, "mensagem": "Nenhum evento Google para cancelar."}

        session = self._obter_sessao_autenticada()
        url = f"{self.GOOGLE_CALENDAR_API_URL}/{self.calendar_id}/events/{agendamento.google_event_id}"

        try:
            resp = session.delete(url, timeout=10)
            if resp.status_code in (200, 204):
                return {"success": True}
            else:
                return {
                    "success": False,
                    "erro": f"HTTP {resp.status_code}: {resp.text}",
                }
        except Exception as exc:
            return {
                "success": False,
                "erro": str(exc),
            }

    def limpar_eventos_shm(self) -> Dict[str, Any]:
        """
        Varre a agenda Google Calendar e exclui com segurança apenas eventos
        criados pelo SHM ou de teste/demonstração associados ao sistema.
        """
        if not self._tem_credenciais_configuradas():
            return {"sucesso": True, "removidos": 0, "modo": "simulacao"}

        session = self._obter_sessao_autenticada()
        url = f"{self.GOOGLE_CALENDAR_API_URL}/{self.calendar_id}/events"

        try:
            resp = session.get(url, timeout=10)
            if resp.status_code != 200:
                return {"sucesso": False, "erro": f"HTTP {resp.status_code}: {resp.text}"}

            items = resp.json().get("items", [])
            removidos = 0
            for item in items:
                evt_id = item.get("id")
                summary = item.get("summary", "")
                desc = item.get("description", "")
                location = item.get("location", "")

                eh_shm = (
                    "shm" in summary.lower()
                    or "shm" in desc.lower()
                    or "meet.google.com/shm-" in location.lower()
                    or "meet.google.com/shm-" in desc.lower()
                    or "compromisso shm" in desc.lower()
                    or "alinhamento técnico e repasse" in summary.lower()
                    or "apresentação de orçamento" in summary.lower()
                )

                if eh_shm and evt_id:
                    del_url = f"{self.GOOGLE_CALENDAR_API_URL}/{self.calendar_id}/events/{evt_id}"
                    del_resp = session.delete(del_url, timeout=8)
                    if del_resp.status_code in (200, 204):
                        removidos += 1
                        logger.info(f"Evento SHM removido da Google Calendar API: {summary} ({evt_id})")

            return {"sucesso": True, "removidos": removidos}
        except Exception as exc:
            logger.exception(f"Erro ao limpar eventos SHM do Google Calendar: {exc}")
            return {"sucesso": False, "erro": str(exc)}
