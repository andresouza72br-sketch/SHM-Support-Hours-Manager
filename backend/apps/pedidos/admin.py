from django.contrib import admin
from .models import Pedido, AnexoPedido

class AnexoPedidoInline(admin.TabularInline):
    model = AnexoPedido
    extra = 1

@admin.register(Pedido)
class PedidoAdmin(admin.ModelAdmin):
    list_display = ["protocolo", "assunto", "cliente", "prioridade", "status", "criado_em"]
    list_filter = ["status", "prioridade", "cliente"]
    search_fields = ["protocolo", "assunto", "descricao", "cliente__razao_social"]
    inlines = [AnexoPedidoInline]
    date_hierarchy = "criado_em"

@admin.register(AnexoPedido)
class AnexoPedidoAdmin(admin.ModelAdmin):
    list_display = ["pedido", "nome_original", "tamanho", "criado_em"]
