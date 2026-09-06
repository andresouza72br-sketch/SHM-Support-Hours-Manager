param(
    [switch]$NoPause = $false
)

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "  SHM 2.4 -- Reset Completo e Semeadura de Base de Testes Limpa" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

# 1. Localizacao do Python (.venv ou global)
$rootDir = (Get-Item $PSScriptRoot).Parent.Parent.FullName
$pyExe = Join-Path $rootDir ".venv\Scripts\python.exe"
if (-not (Test-Path $pyExe)) {
    $pyExe = "python.exe"
}

# 2. Interromper processos na porta 8001 para liberar o arquivo db.sqlite3
Write-Host ""
Write-Host "[1/6] Verificando e liberando locks no banco SQLite..." -ForegroundColor Yellow
$port8001 = Get-NetTCPConnection -LocalPort 8001 -State Listen -ErrorAction SilentlyContinue
if ($port8001) {
    foreach ($conn in $port8001) {
        $procId = $conn.OwningProcess
        Write-Host "  -> Encerrando processo no lock da porta 8001 [PID $procId]..." -ForegroundColor DarkYellow
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Milliseconds 800
}

# 3. Higienizacao remota preventiva da Google Calendar API
Write-Host ""
Write-Host "[2/6] Higienizando eventos anteriores do SHM na Google Calendar API..." -ForegroundColor Yellow
$backendDir = Join-Path $rootDir "backend"
$managePy = Join-Path $backendDir "manage.py"
& $pyExe -c "import os, sys, django; sys.path.insert(0, r'$backendDir'); os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings'); django.setup(); from apps.schedule.google_service import GoogleCalendarService; res = GoogleCalendarService().limpar_eventos_shm(); print('  -> Removidos da nuvem:', res.get('removidos', 0))"

# 4. Remover arquivos fisicos do SQLite e midias de teste
Write-Host ""
Write-Host "[3/6] Removendo banco fisico anterior e midias antigas..." -ForegroundColor Yellow
Get-ChildItem -Path $backendDir -Filter "db.sqlite3*" -Force -ErrorAction SilentlyContinue | ForEach-Object {
    $fileName = $_.Name
    Remove-Item -Path $_.FullName -Force -ErrorAction SilentlyContinue
    Write-Host "  -> Removido: $fileName" -ForegroundColor Gray
}

$mediaDir = Join-Path $rootDir "backend\media"
if (Test-Path $mediaDir) {
    Get-ChildItem -Path $mediaDir -Exclude ".gitkeep" -Recurse -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  -> Pasta de midias e anexos limpa." -ForegroundColor Gray
}

# 5. Executar Migracoes Django do Zero
Write-Host ""
Write-Host "[4/6] Aplicando migracoes DDL limpas do Django..." -ForegroundColor Yellow
& $pyExe $managePy migrate --no-input
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[ERRO] Falha ao aplicar as migracoes do banco de dados!" -ForegroundColor Red
    exit 1
}

# 6. Executar Script de Semeadura Deterministica
Write-Host ""
Write-Host "[5/6] Executando semeadura deterministica de dados (com seed de agendamentos)..." -ForegroundColor Yellow
$seedScript = Join-Path $PSScriptRoot "seed_base_limpa.py"
& $pyExe $seedScript
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[ERRO] Falha ao semear os dados de teste!" -ForegroundColor Red
    exit 1
}

# 7. Executar Pericia de Integridade Criptografica (audit_verify_integrity)
Write-Host ""
Write-Host "[6/6] Executando pericia matematica na trilha forense (audit_verify_integrity)..." -ForegroundColor Yellow
& $pyExe $managePy audit_verify_integrity

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[ERRO] Falha pericial: inconsistencia detectada na cadeia criptografica!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Green
Write-Host "  BASE DE DADOS ZERADA E RECONSTRUIDA COM SUCESSO!" -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Green

Write-Host ""
Write-Host "CREDENCIAIS OFICIAIS DE TESTE (1-CLIQUE / GOOGLE MOCK):" -ForegroundColor Cyan
Write-Host "  * Empresa Admin:   admin / admin123        [andresouza72br@gmail.com]" -ForegroundColor White
Write-Host "  * Empresa Tecnico: tecnico / tecnico123      [tecnico@shm.local]" -ForegroundColor White
Write-Host "  * Cliente Gerente: cligerente / cliente123   [workspace.icb@gmail.com]" -ForegroundColor White
Write-Host "  * Cliente Analista: clianalista / cliente123 [analista@acme.com]" -ForegroundColor White


Write-Host ""
Write-Host "CENARIOS DE TESTE PREPARADOS NA BASE:" -ForegroundColor Cyan
Write-Host "  - Contrato: CT-2026-0001 (Acme Corp | Franquia: 100.00h | SHA-256 Validado)" -ForegroundColor Gray
Write-Host "  - OS 01: [AGUARDANDO_ACEITE]    -> Pronto para Aceite Final (A3 / Debito de 6h)" -ForegroundColor Gray
Write-Host "  - OS 02: [AGUARDANDO_APROVACAO] -> Pronto para Aprovar Orcamento (A2 / 8h)" -ForegroundColor Gray
Write-Host "  - OS 03: [ABERTO]               -> Novo chamado pronto para triagem tecnica" -ForegroundColor Gray

Write-Host ""
Write-Host "AUDITORIA FORENSE E ENCADEMENTO CRIPTOGRAFICO (HASH CHAINING):" -ForegroundColor Cyan
Write-Host "  - Particao Contrato: contrato:1 (3 elos: Criacao -> Upload Doc -> Carga Saldo)" -ForegroundColor Gray
Write-Host "  - Particao Cliente:  cliente:1 (1 elo: Criacao do Tomador Acme)" -ForegroundColor Gray
Write-Host "  - Selo Diario:       AuditDailySeal lavrado e ativo (RN-16)" -ForegroundColor Gray
Write-Host "  - Integridade:       100% comprovada via SHA-256 (RFC 8785)" -ForegroundColor Green
Write-Host ""

