import pytest
from apps.accounts.models import User, UserRole
from apps.schedule.models import ConfiguracaoSchedule

@pytest.mark.django_db
class TestConfiguracaoScheduleModel:
    def setup_method(self):
        self.admin = User.objects.create_user(
            username="admin_config",
            email="admin_config@shm.local",
            role=UserRole.EMPRESA_ADMIN,
        )

    def test_get_solo_cria_registro_singleton(self):
        config = ConfiguracaoSchedule.get_solo()
        assert config.id == 1
        assert config.calendar_id == "suporte-SHM"
        assert "Configuração Schedule" in str(config)

    def test_atualizar_calendar_id_singleton(self):
        config = ConfiguracaoSchedule.get_solo()
        config.calendar_id = "workspace.icb@gmail.com"
        config.atualizado_por = self.admin
        config.save()

        # Obter novamente via singleton
        config_recarregada = ConfiguracaoSchedule.get_solo()
        assert config_recarregada.id == 1
        assert config_recarregada.calendar_id == "workspace.icb@gmail.com"
        assert config_recarregada.atualizado_por == self.admin
