import os
import re
import hashlib
from datetime import datetime
from typing import Union, BinaryIO

def sanitizar_nome_arquivo(nome: str) -> str:
    """
    Sanitiza o nome do arquivo preservando a extensão e removendo caracteres perigosos.
    """
    if not nome:
        return "arquivo"
    nome = os.path.basename(nome)
    # Remove caracteres de controle ou caracteres inválidos para sistemas de arquivos
    nome_limpo = re.sub(r"[^\w\.\-\_]", "_", nome, flags=re.UNICODE)
    return nome_limpo or "arquivo"


def caminho_anexo_pedido(instance, filename: str) -> str:
    """
    Resolve o caminho determinístico estruturado para anexos de pedidos:
    clientes/{cliente_id}/pedidos/{pedido_id}/{ano}/{filename}
    """
    ano = datetime.now().strftime("%Y")
    nome_limpo = sanitizar_nome_arquivo(filename or getattr(instance, "nome_original", "anexo"))
    cliente_id = "geral"
    pedido_id = "avulso"

    if hasattr(instance, "pedido") and instance.pedido:
        pedido_id = str(instance.pedido.id)
        if getattr(instance.pedido, "cliente_id", None):
            cliente_id = str(instance.pedido.cliente_id)

    return f"clientes/{cliente_id}/pedidos/{pedido_id}/{ano}/{nome_limpo}"


def caminho_anexo_comentario(instance, filename: str) -> str:
    """
    Resolve o caminho determinístico estruturado para anexos de mensagens/ciclos:
    clientes/{cliente_id}/ciclos/{ciclo_id}/{ano}/{filename}
    """
    ano = datetime.now().strftime("%Y")
    nome_limpo = sanitizar_nome_arquivo(filename or getattr(instance, "nome_original", "anexo"))
    cliente_id = "geral"
    ciclo_id = "geral"

    if hasattr(instance, "comentario") and instance.comentario:
        ciclo = getattr(instance.comentario, "ciclo", None)
        if ciclo:
            ciclo_id = str(ciclo.id)
            pedido = getattr(ciclo, "pedido", None)
            if pedido and getattr(pedido, "cliente_id", None):
                cliente_id = str(pedido.cliente_id)

    return f"clientes/{cliente_id}/ciclos/{ciclo_id}/{ano}/{nome_limpo}"


def calcular_hash_sha256(arquivo: Union[BinaryIO, bytes]) -> str:
    """
    Calcula o hash criptográfico SHA-256 de um arquivo ou buffer de bytes,
    preservando a posição do cursor caso seja um objeto file-like.
    """
    sha256 = hashlib.sha256()
    if isinstance(arquivo, bytes):
        sha256.update(arquivo)
        return sha256.hexdigest()

    pos_original = 0
    if hasattr(arquivo, "tell") and hasattr(arquivo, "seek"):
        try:
            pos_original = arquivo.tell()
            arquivo.seek(0)
        except Exception:
            pass

    for chunk in iter(lambda: arquivo.read(65536), b""):
        sha256.update(chunk)

    if hasattr(arquivo, "seek"):
        try:
            arquivo.seek(pos_original)
        except Exception:
            pass

    return sha256.hexdigest()
