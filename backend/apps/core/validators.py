import os
from django.core.exceptions import ValidationError

# Limite máximo de 25 MB por arquivo
TAMANHO_MAXIMO_ANEXO_BYTES = 25 * 1024 * 1024
TAMANHO_MAXIMO_ANEXO_MB = 25

# Extensões seguras permitidas (incluindo áudio .mp3)
EXTENSOES_PERMITIDAS = {
    # Documentos e planilhas
    "pdf", "docx", "doc", "xlsx", "xls", "csv", "txt", "odt", "ods", "rtf",
    # Imagens
    "png", "jpg", "jpeg", "webp", "gif", "svg",
    # Áudio
    "mp3", "wav", "ogg", "m4a",
    # Compactados
    "zip", "rar", "7z", "tar", "gz",
}

# Extensões perigosas estritamente bloqueadas
EXTENSOES_PROIBIDAS = {
    "exe", "bat", "cmd", "sh", "bin", "com", "scr", "vbs", "js", "msi", "jar", "apk", "app", "pif",
}


def extrair_extensao(nome_arquivo: str) -> str:
    """Extrai a extensão do arquivo em minúsculo e sem o ponto."""
    if not nome_arquivo:
        return ""
    _, ext = os.path.splitext(nome_arquivo)
    return ext.lower().lstrip(".")


def validar_arquivo_anexo(arquivo) -> None:
    """
    Valida se o arquivo não excede 25 MB e pertence à lista de extensões seguras autorizadas.
    Lança ValidationError caso viole as regras de governança.
    """
    if not arquivo:
        return

    nome = getattr(arquivo, "name", "")
    tamanho = getattr(arquivo, "size", 0)
    extensao = extrair_extensao(nome)

    if extensao in EXTENSOES_PROIBIDAS:
        raise ValidationError(
            f"O formato '.{extensao}' do arquivo '{nome}' é estritamente proibido por motivos de segurança."
        )

    if extensao not in EXTENSOES_PERMITIDAS:
        raise ValidationError(
            f"A extensão '.{extensao}' do arquivo '{nome}' não é permitida. "
            f"Formatos aceitos incluem documentos (PDF, DOCX, XLSX, TXT), imagens (PNG, JPG, WEBP), "
            f"áudio (MP3) e arquivos compactados (ZIP)."
        )

    if tamanho > TAMANHO_MAXIMO_ANEXO_BYTES:
        tamanho_mb = tamanho / (1024 * 1024)
        raise ValidationError(
            f"O arquivo '{nome}' possui {tamanho_mb:.1f} MB, excedendo o limite máximo permitido de {TAMANHO_MAXIMO_ANEXO_MB} MB."
        )


def validar_cnpj(valor: str) -> str:
    """
    Valida se o CNPJ informado possui 14 dígitos válidos conforme o algoritmo oficial
    de dígitos verificadores da Receita Federal do Brasil.
    Aceita CNPJ com ou sem pontuação (ex: '12.345.678/0001-90' ou '12345678000190').
    Retorna o CNPJ higienizado apenas com dígitos ou lança ValidationError.
    """
    if not valor:
        return ""

    import re
    cnpj = re.sub(r"\D", "", str(valor))

    if len(cnpj) != 14:
        raise ValidationError("O CNPJ deve conter exatamente 14 dígitos numéricos.")

    # Rejeita dígitos repetidos conhecidos (ex: '00000000000000', '11111111111111')
    if cnpj == cnpj[0] * 14:
        raise ValidationError("Número de CNPJ inválido.")

    # Cálculo do primeiro dígito verificador
    pesos_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    soma_1 = sum(int(cnpj[i]) * pesos_1[i] for i in range(12))
    resto_1 = soma_1 % 11
    digito_1 = 0 if resto_1 < 2 else 11 - resto_1

    if int(cnpj[12]) != digito_1:
        raise ValidationError("Número de CNPJ inválido (primeiro dígito verificador incorreto).")

    # Cálculo do segundo dígito verificador
    pesos_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    soma_2 = sum(int(cnpj[i]) * pesos_2[i] for i in range(13))
    resto_2 = soma_2 % 11
    digito_2 = 0 if resto_2 < 2 else 11 - resto_2

    if int(cnpj[13]) != digito_2:
        raise ValidationError("Número de CNPJ inválido (segundo dígito verificador incorreto).")

    return cnpj


TAMANHO_MAXIMO_IMAGEM_BRANDING_BYTES = 5 * 1024 * 1024  # 5 MB
EXTENSOES_IMAGEM_BRANDING = {"png", "jpg", "jpeg", "webp", "svg"}


def validar_imagem_branding(arquivo) -> None:
    """
    Valida arquivos de imagem institucionais (logotipo e rubrica/assinatura).
    Garante limite de 5 MB, extensão permitida e integridade binária via Pillow.
    """
    if not arquivo:
        return

    nome = getattr(arquivo, "name", "")
    tamanho = getattr(arquivo, "size", 0)
    ext = extrair_extensao(nome)

    if ext not in EXTENSOES_IMAGEM_BRANDING:
        raise ValidationError(
            f"Formato de imagem '.{ext}' não suportado. Utilize PNG, JPG, JPEG, WEBP ou SVG."
        )

    if tamanho > TAMANHO_MAXIMO_IMAGEM_BRANDING_BYTES:
        tamanho_mb = tamanho / (1024 * 1024)
        raise ValidationError(
            f"A imagem '{nome}' possui {tamanho_mb:.1f} MB. O tamanho máximo permitido para branding é 5.0 MB."
        )

    # Verificação de integridade com Pillow para imagens rasterizadas
    if ext in {"png", "jpg", "jpeg", "webp"}:
        try:
            from PIL import Image
            # Se for um objeto InMemoryUploadedFile ou FieldFile, testamos sem perder o ponteiro
            posicao_original = arquivo.tell() if hasattr(arquivo, "tell") else 0
            img = Image.open(arquivo)
            img.verify()
            if hasattr(arquivo, "seek"):
                arquivo.seek(posicao_original)
        except Exception as e:
            raise ValidationError(f"Arquivo de imagem corrompido ou inválido: {e}")

