import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowUp,
  Upload,
  Download,
  Mail,
  ShieldCheck,
  AlertOctagon,
  FileCheck,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  Zap,
  Scale,
  Building2,
} from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { clientService } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { TimelineAuditoriaContrato } from '../components/contratos/TimelineAuditoriaContrato'
import { DocumentosContratoModal } from '../components/contratos/DocumentosContratoModal'
import { GerenteClienteEmailsModal } from '../components/contratos/GerenteClienteEmailsModal'
import { MigracaoSaldoModal } from '../components/contratos/MigracaoSaldoModal'
import { EnviarExtratoModal } from '../components/contratos/EnviarExtratoModal'
import type { ContratoDocumento, EmailNotificacao } from '../types'

export function ExtratoContratoPage() {
  const { id } = useParams<{ id: string }>()
  const { user, isEmpresa } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()
  const logoInputRef = useRef<HTMLInputElement>(null)

  const [showScrollTopBtn, setShowScrollTopBtn] = useState(false)
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false)
  const [isEmailsModalOpen, setIsEmailsModalOpen] = useState(false)
  const [isMigracaoModalOpen, setIsMigracaoModalOpen] = useState(false)
  const [isExtratoEmailModalOpen, setIsExtratoEmailModalOpen] = useState(false)
  const [isBaixandoPdf, setIsBaixandoPdf] = useState(false)
  const [downloadingDocId, setDownloadingDocId] = useState<number | null>(null)


  const isEmpresaAdmin = user?.role === 'EMPRESA_ADMIN' || user?.is_superuser || user?.is_staff
  const isClienteGerente = user?.role === 'CLIENTE_GERENTE'

  const { data, isLoading } = useQuery({
    queryKey: ['extrato', id],
    queryFn: () => clientService.contratos.extrato(Number(id)),
    enabled: Boolean(id),
    refetchInterval: 6000,
  })

  // Upload Logo Mutation
  const uploadLogoMutation = useMutation({
    mutationFn: ({ clienteId, file }: { clienteId: number; file: File }) => {
      const formData = new FormData()
      formData.append('logo', file)
      return clientService.clientes.atualizarPerfil(clienteId, formData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extrato', id] })
      queryClient.invalidateQueries({ queryKey: ['contratos'] })
      toast.success('Logo da empresa atualizada com sucesso!', 'Logo Salva')
    },
    onError: () => {
      toast.error('Erro ao atualizar a logo da empresa.', 'Erro')
    },
  })

  const handleDownloadDoc = async (doc: ContratoDocumento) => {
    if (!data?.contrato?.id) return
    try {
      setDownloadingDocId(doc.id)
      toast.info(`Iniciando download de "${doc.nome_original}"... (Auditoria registrada)`, 'Download')
      await clientService.contratos.downloadDocumento(data.contrato.id, doc.id, doc.nome_original)
      queryClient.invalidateQueries({ queryKey: ['extrato', id] })
    } catch (err) {
      toast.error('Erro ao baixar documento.', 'Erro')
    } finally {
      setDownloadingDocId(null)
    }
  }

  const handleDownloadExtratoPdf = async () => {
    if (!data?.contrato?.id) return
    try {
      setIsBaixandoPdf(true)
      toast.info('Compilando Extrato Oficial em PDF vetorial...', 'Download')
      const { blob, filename, hash } = await clientService.contratos.downloadExtratoPdf(data.contrato.id)

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)

      toast.success(
        `Extrato baixado com sucesso! Hash SHA-256: ${hash ? hash.slice(0, 16) + '...' : 'Registrado'}`,
        'PDF Gerado'
      )
      queryClient.invalidateQueries({ queryKey: ['extrato', id] })
    } catch (err) {
      console.error('Erro ao baixar extrato PDF:', err)
      toast.error('Erro ao compilar extrato oficial em PDF.', 'Erro')
    } finally {
      setIsBaixandoPdf(false)
    }
  }

  const handleLogoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !data?.contrato?.cliente) return
    uploadLogoMutation.mutate({ clienteId: data.contrato.cliente, file })
  }

  useEffect(() => {
    const checkAtBottom = () => {
      const scrollY = window.pageYOffset || document.documentElement.scrollTop || window.scrollY || 0
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0
      const totalHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)

      const isWindowAtBottom = scrollY > 80 && scrollY + viewportHeight >= totalHeight - 50
      const mainEl = document.querySelector('main')
      const isMainAtBottom = mainEl && mainEl.scrollHeight > mainEl.clientHeight
        ? mainEl.scrollTop > 80 && mainEl.scrollTop + mainEl.clientHeight >= mainEl.scrollHeight - 50
        : false

      setShowScrollTopBtn(isWindowAtBottom || isMainAtBottom)
    }

    window.addEventListener('scroll', checkAtBottom, { passive: true })
    window.addEventListener('resize', checkAtBottom, { passive: true })
    document.addEventListener('scroll', checkAtBottom, { passive: true })

    const mainEl = document.querySelector('main')
    if (mainEl) {
      mainEl.addEventListener('scroll', checkAtBottom, { passive: true })
    }

    checkAtBottom()

    return () => {
      window.removeEventListener('scroll', checkAtBottom)
      window.removeEventListener('resize', checkAtBottom)
      document.removeEventListener('scroll', checkAtBottom)
      if (mainEl) {
        mainEl.removeEventListener('scroll', checkAtBottom)
      }
    }
  }, [])

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    const mainEl = document.querySelector('main')
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  if (isLoading) {
    return (
      <AppLayout showSidebar={false}>
        <div className="p-12 text-center text-slate-400 font-semibold">Carregando extrato do contrato...</div>
      </AppLayout>
    )
  }

  if (!data || !data.contrato) {
    return (
      <AppLayout showSidebar={false}>
        <div className="p-12 text-center text-rose-500 font-bold">Extrato não disponível ou acesso negado.</div>
      </AppLayout>
    )
  }

  const {
    contrato,
    historico_ciclos = [],
    auditoria = [],
    conciliacao,
    projecao_saldo,
    demandas_em_andamento,
  } = data

  const total = Number(contrato.horas_contratadas) || 1
  const saldo = Number(contrato.saldo) || 0
  const consumido = Number(contrato.horas_consumidas) || 0
  const percentConsumido = Math.min(Math.round((consumido / total) * 100), 100)
  const creditosMigrados = Number(conciliacao?.creditos_migrados ?? (contrato as any).creditos_migrados) || 0
  const debitosCompensados = Number(conciliacao?.debitos_compensados ?? (contrato as any).debitos_compensados) || 0
  const temAjustes = creditosMigrados > 0 || debitosCompensados > 0

  const saldoProjetado = Number(projecao_saldo?.saldo_projetado ?? saldo)
  const horasComprometidas = Number(projecao_saldo?.total_horas_comprometidas ?? 0)
  const previsaoEstouro = Boolean(projecao_saldo?.previsao_estouro ?? (saldoProjetado < 0))
  const horasEstouro = Number(projecao_saldo?.horas_estouro ?? (previsaoEstouro ? Math.abs(saldoProjetado) : 0))
  const horasPendentesOrcamento = Number(projecao_saldo?.horas_pendentes_orcamento ?? 0)
  const horasEmExecucao = Number(projecao_saldo?.horas_em_execucao ?? 0)
  const horasPendentesEntrega = Number(projecao_saldo?.horas_pendentes_entrega ?? 0)
  const listaDemandas = Array.isArray(demandas_em_andamento?.todas) ? demandas_em_andamento.todas : []
  const documentos: ContratoDocumento[] = Array.isArray(contrato.documentos) ? contrato.documentos : []
  const emailsNotificacao: EmailNotificacao[] =
    Array.isArray(contrato.destinatarios) && contrato.destinatarios.length > 0
      ? contrato.destinatarios
      : Array.isArray(contrato.emails_notificacao)
      ? contrato.emails_notificacao
      : []
  const isCancelado = contrato.status === 'cancelado'

  // Gerente do cliente cadastrado neste contrato (email deve coincidir com gestor_email)
  const isClienteGerenteDoContrato =
    isClienteGerente &&
    !!user?.email &&
    !!contrato.gestor_email &&
    user.email.toLowerCase() === contrato.gestor_email.toLowerCase()

  // Pode acessar recursos restritos: empresa OU gerente cadastrado no contrato
  const podeAcessarRecursosRestritos = isEmpresa || isClienteGerenteDoContrato

  const podeGerenciarLogo = isEmpresaAdmin || (isClienteGerente && user?.cliente === contrato.cliente)

  return (
    <AppLayout showSidebar={false}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Title & Top Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 px-2.5 py-1 rounded-md border border-indigo-200 dark:border-indigo-800">
                Governança SHM
              </span>
              <span className="text-xs font-bold text-slate-400">•</span>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Extrato & Prestação de Contas
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
              Extrato do Contrato {contrato.numero}
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-0.5">
              Acompanhamento de franquia, consumo de horas, auditoria de ciclos e saldo consolidado
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {isEmpresaAdmin && !isCancelado && (
              <button
                onClick={() => setIsMigracaoModalOpen(true)}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition flex items-center gap-2 cursor-pointer"
                title="Aproveitar ou migrar saldo de contratos vencidos deste cliente"
              >
                <Zap className="w-4 h-4" />
                <span>Aproveitar Saldo Vencido</span>
              </button>
            )}

            {podeAcessarRecursosRestritos && (
              <>
                <button
                  onClick={handleDownloadExtratoPdf}
                  disabled={isBaixandoPdf}
                  className="px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-md shadow-indigo-600/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition flex items-center gap-2 cursor-pointer"
                  title="Baixar Extrato Oficial em PDF vetorial compilado no backend com hash SHA-256"
                >
                  {isBaixandoPdf ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>{isBaixandoPdf ? 'Compilando PDF...' : 'Baixar PDF Oficial'}</span>
                </button>

                <button
                  onClick={() => setIsExtratoEmailModalOpen(true)}
                  className="px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 font-black text-xs border border-slate-300 dark:border-slate-700 shadow-2xs hover:scale-105 active:scale-95 transition flex items-center gap-2 cursor-pointer"
                  title="Enviar extrato por e-mail para gestores e destinatários homologados"
                >
                  <Mail className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Enviar por E-mail</span>
                </button>
              </>
            )}
          </div>
        </div>


        {/* Corporate Contract Banner with Client Logo */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            {/* Logo do Cliente / Upload */}
            <div className="relative group shrink-0">
              {contrato.cliente_logo ? (
                <img
                  src={contrato.cliente_logo}
                  alt={contrato.cliente_nome}
                  className="w-16 h-16 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-sm"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center font-black text-xl shadow-xs">
                  {contrato.cliente_nome ? contrato.cliente_nome[0].toUpperCase() : 'C'}
                </div>
              )}

              {podeGerenciarLogo && (
                <>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoSelected}
                  />
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    title="Atualizar logo da empresa"
                    className="absolute -bottom-1 -right-1 p-1.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md hover:scale-110 transition cursor-pointer"
                  >
                    {uploadLogoMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                  </button>
                </>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-700">
                  {contrato.numero}
                </span>
                <span className="text-xs font-bold text-slate-400">•</span>
                <span className="text-xs font-black text-slate-900 dark:text-slate-100">{contrato.cliente_nome}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                Extrato Oficial do Contrato
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Vigência: {new Date(contrato.data_inicio).toLocaleDateString('pt-BR')}
                {contrato.data_termino ? ` até ${new Date(contrato.data_termino).toLocaleDateString('pt-BR')}` : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-2 self-stretch sm:self-auto">
            <span
              className={`text-xs font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider border shadow-2xs ${
                contrato.status === 'ativo'
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/60'
                  : contrato.status === 'cancelado'
                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800/60'
                  : contrato.status === 'concluido'
                  ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-800/60'
                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800/60'
              }`}
            >
              {contrato.status_display}
            </span>

            {contrato.em_carencia && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2.5 py-1 rounded-full shadow-md shadow-amber-500/20 animate-pulse border border-amber-400">
                <AlertOctagon className="w-3 h-3" />
                <span>Carência Ativa</span>
              </span>
            )}
          </div>
        </div>

        {/* Cancellation Alert Banner */}
        {isCancelado && contrato.justificativa_cancelamento && (
          <div className="p-5 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 shadow-2xs space-y-1 text-rose-900 dark:text-rose-200">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              <h3 className="font-black text-sm">Contrato Cancelado</h3>
            </div>
            <p className="text-xs italic pl-7 leading-relaxed">
              "{contrato.justificativa_cancelamento}"
            </p>
            <div className="text-[10px] text-rose-700 dark:text-rose-400/90 pl-7 pt-1 font-medium">
              Cancelado {contrato.cancelado_em ? `em ${new Date(contrato.cancelado_em).toLocaleDateString('pt-BR')}` : ''}
              {contrato.cancelado_por_nome ? ` por ${contrato.cancelado_por_nome}` : ''}
            </div>
          </div>
        )}

        {/* Balance Metric Cards (4 Cards com Saldo Projetado Pós-Aceites) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1 transition-colors">
            <div className="text-[11px] font-black text-slate-700 dark:text-slate-400 uppercase tracking-wider">Horas Contratadas</div>
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{total.toFixed(1)}h</div>
            <div className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold">Franquia total contratual</div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2 transition-colors">
            <div className="text-[11px] font-black text-slate-700 dark:text-slate-400 uppercase tracking-wider">Consumo Acumulado</div>
            <div className="text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight">{consumido.toFixed(1)}h</div>
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  percentConsumido <= 25
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    : percentConsumido <= 50
                    ? 'bg-gradient-to-r from-emerald-500 to-amber-400'
                    : percentConsumido <= 75
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                    : 'bg-gradient-to-r from-orange-500 to-rose-600'
                }`}
                style={{ width: `${percentConsumido}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold">{percentConsumido}% do pacote consumido</div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-indigo-200 dark:border-indigo-800 shadow-xs space-y-1.5 bg-gradient-to-br from-white to-indigo-50/60 dark:from-slate-900 dark:to-indigo-950/30 transition-colors">
            <div className="text-[11px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Saldo Atual Homologado</div>
            <div className="text-3xl font-black text-indigo-700 dark:text-indigo-400 tracking-tight">{saldo.toFixed(1)}h</div>
            <div className="text-[11px] text-indigo-600 dark:text-indigo-300 font-bold">Saldo oficial apurado</div>
          </div>

          <div className={`p-6 rounded-3xl border shadow-xs space-y-1.5 transition-colors ${
            previsaoEstouro
              ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
              : 'bg-gradient-to-br from-white to-purple-50/60 dark:from-slate-900 dark:to-purple-950/30 border-purple-200 dark:border-purple-800'
          }`}>
            <div className="flex items-center justify-between">
              <div className={`text-[11px] font-black uppercase tracking-wider ${
                previsaoEstouro ? 'text-rose-700 dark:text-rose-400' : 'text-purple-700 dark:text-purple-400'
              }`}>
                Saldo Projetado
              </div>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                previsaoEstouro ? 'bg-rose-600 text-white' : 'bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300'
              }`}>
                {previsaoEstouro ? 'Estouro' : 'Pós-Aceites'}
              </span>
            </div>
            <div className={`text-3xl font-black tracking-tight ${
              previsaoEstouro ? 'text-rose-600 dark:text-rose-400' : 'text-purple-700 dark:text-purple-300'
            }`}>
              {saldoProjetado.toFixed(1)}h
            </div>
            <div className={`text-[11px] font-semibold ${
              previsaoEstouro ? 'text-rose-700 dark:text-rose-300' : 'text-purple-600 dark:text-purple-300'
            }`}>
              {previsaoEstouro
                ? `Previsão de estouro em ${horasEstouro.toFixed(1)}h`
                : `${horasComprometidas.toFixed(1)}h em compromissos ativos`}
            </div>
          </div>
        </div>

        {/* Previsão de Estouro de Franquia Alert Banner */}
        {previsaoEstouro && (
          <div className="p-5 rounded-3xl bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-400 dark:border-rose-800 shadow-sm flex items-start gap-4 text-rose-900 dark:text-rose-200">
            <div className="p-2.5 rounded-2xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 shrink-0">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm uppercase tracking-wide">
                  Atenção: Previsão de Estouro de Franquia em {horasEstouro.toFixed(1)}h
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-600 text-white">Crítico</span>
              </div>
              <p className="text-xs leading-relaxed text-rose-800 dark:text-rose-300 font-medium">
                Existem <strong>{horasComprometidas.toFixed(1)}h</strong> comprometidas em demandas técnicas em andamento ou aguardando aceite, o que supera o saldo contratual remanescente de <strong>{saldo.toFixed(1)}h</strong>.
                Recomenda-se a contratação de aditivo de horas ou renovação antecipada do pacote.
              </p>
            </div>
          </div>
        )}

        {/* Demonstrativo Dedutivo do Saldo Projetado (Raio-X em Tempo Real) */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-black text-sm border border-purple-200/60 dark:border-purple-800/60">
              ⚡
            </div>
            <div>
              <h4 className="font-black text-slate-900 dark:text-white text-xs">
                Raio-X em Tempo Real: Apuração do Saldo Projetado
              </h4>
              <p className="text-[10px] text-slate-500 font-medium">
                Projeção contábil deduzindo os chamados em orçamento, em execução e aguardando aceite
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold shadow-2xs" title="Saldo Atual Homologado">
              <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
              <span>{saldo.toFixed(1)}h</span>
              <span className="text-[10px] text-slate-400 font-sans font-normal">(saldo atual homologado)</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-bold shadow-2xs" title="Aguardando Aceite do Orçamento (Fluxo A2)">
              <Clock className="w-3 h-3 text-amber-500 shrink-0" />
              <span>-{horasPendentesOrcamento.toFixed(1)}h</span>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-sans font-normal">(aguardando aceite orçamento)</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 rounded-xl border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold shadow-2xs" title="Demandas em Execução Técnica">
              <Clock className="w-3 h-3 text-blue-500 shrink-0" />
              <span>-{horasEmExecucao.toFixed(1)}h</span>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-sans font-normal">(em execução)</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 dark:bg-purple-950/60 rounded-xl border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 font-bold shadow-2xs" title="Aguardando Aceite de Entrega (Fluxo A3)">
              <Clock className="w-3 h-3 text-purple-500 shrink-0" />
              <span>-{horasPendentesEntrega.toFixed(1)}h</span>
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-sans font-normal">(aguardando aceite entrega)</span>
            </span>

            <span className="font-bold text-slate-400 mx-0.5">=</span>

            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border font-black shadow-xs ${
              previsaoEstouro
                ? 'bg-rose-50 dark:bg-rose-950/80 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                : 'bg-purple-50 dark:bg-purple-950/80 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300'
            }`} title="Saldo Projetado Resultante Pós-Aceites">
              {previsaoEstouro ? <AlertOctagon className="w-3 h-3 text-rose-600 shrink-0" /> : <CheckCircle2 className="w-3 h-3 text-purple-600 shrink-0" />}
              <span>{saldoProjetado.toFixed(1)}h</span>
              <span className="text-[10px] font-sans font-semibold">(saldo projetado)</span>
            </span>
          </div>
        </div>

        {/* Demonstrativo Discreto de Conciliação Contratual */}
        {temAjustes && (
          <div className="p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-sm border border-indigo-200/60 dark:border-indigo-800/60">
                ∑
              </div>
              <div>
                <h4 className="font-black text-slate-900 dark:text-white text-xs">
                  Demonstrativo de Conciliação de Horas
                </h4>
                <p className="text-[10px] text-slate-500 font-medium">
                  Composição do saldo considerando franquia base e movimentações de crédito/débito
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold shadow-2xs" title="Franquia Original Contratada">
                <Building2 className="w-3 h-3 text-slate-500 dark:text-slate-400 shrink-0" />
                <span>{total.toFixed(1)}h</span>
                <span className="text-[10px] text-slate-400 font-sans font-normal">(franquia)</span>
              </span>

              {creditosMigrados > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold shadow-2xs" title="Créditos de Saldo Resgatado de Contrato Anterior">
                  <Zap className="w-3 h-3 text-amber-500 shrink-0" />
                  <span>+{creditosMigrados.toFixed(1)}h</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-sans font-normal">(resgate)</span>
                </span>
              )}

              {debitosCompensados > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-50 dark:bg-sky-950/60 rounded-xl border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 font-bold shadow-2xs" title="Abatimento de Franquia para Quitação de Débito Técnico">
                  <Scale className="w-3 h-3 text-sky-500 shrink-0" />
                  <span>-{debitosCompensados.toFixed(1)}h</span>
                  <span className="text-[10px] text-sky-600 dark:text-sky-400 font-sans font-normal">(compensação)</span>
                </span>
              )}

              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 dark:bg-rose-950/60 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold shadow-2xs" title="Horas Consumidas em Ciclos Executados">
                <Clock className="w-3 h-3 text-rose-500 shrink-0" />
                <span>-{consumido.toFixed(1)}h</span>
                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-sans font-normal">(consumo)</span>
              </span>

              <span className="font-bold text-slate-400 mx-0.5">=</span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/80 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-black shadow-xs" title="Saldo Líquido Disponível Atual">
                <CheckCircle2 className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>{saldo.toFixed(1)}h</span>
                <span className="text-[10px] font-sans font-semibold">(saldo atual)</span>
              </span>
            </div>
          </div>
        )}

        {/* Section: Documentos Anexos (Limite 5) & Notificações */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Documentos */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-indigo-600" />
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  Documentos & Propostas ({documentos.length}/5)
                </h3>
              </div>
              <button
                onClick={() => setIsDocsModalOpen(true)}
                className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                {isEmpresaAdmin ? '+ Gerenciar / Subir' : 'Ver Todos'}
              </button>
            </div>

            <div className="space-y-2">
              {documentos.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-bold text-slate-900 dark:text-slate-100 truncate block">
                      {doc.nome_original}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {doc.tipo_documento_display} • {doc.tamanho_formatado}
                    </span>
                    {doc.hash_sha256 && (
                      <span className="block text-[9px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 truncate" title={`SHA-256: ${doc.hash_sha256}`}>
                        SHA-256: {doc.hash_sha256.substring(0, 8)}...{doc.hash_sha256.substring(doc.hash_sha256.length - 8)}
                      </span>
                    )}
                  </div>

                  {podeAcessarRecursosRestritos && (
                  <button
                    disabled={downloadingDocId === doc.id}
                    onClick={() => handleDownloadDoc(doc)}
                    className="p-2 rounded-xl text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 transition cursor-pointer shadow-2xs shrink-0"
                    title="Baixar cópia (Auditado)"
                  >
                    {downloadingDocId === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  </button>
                  )}
                </div>
              ))}

              {documentos.length === 0 && (
                <div className="p-6 text-center text-slate-500 text-xs italic bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  Nenhum documento anexado a este contrato.
                </div>
              )}
            </div>
          </div>

          {/* Notificações / E-mails */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-violet-600" />
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  E-mails em Cópia / Notificações
                </h3>
              </div>
              {podeAcessarRecursosRestritos && (
              <button
                onClick={() => setIsEmailsModalOpen(true)}
                className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Gerenciar Lista
              </button>
              )}
            </div>

            <div className="space-y-2">
              {emailsNotificacao.map((em: EmailNotificacao, i: number) => {
                const status = em.status || 'pendente'
                const isConfirmado = status === 'confirmado'
                const isExpirado = status === 'expirado' || em.is_expirado
                const isRecusado = status === 'recusado'
                const isPendente = status === 'pendente' && !isExpirado

                return (
                  <div
                    key={i}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
                      em.ativo
                        ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/60'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 opacity-60'
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-slate-900 dark:text-slate-100 truncate block">{em.email}</span>
                      {em.nome && <span className="text-[10px] text-slate-500">{em.nome}</span>}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isConfirmado && (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>Confirmado</span>
                        </span>
                      )}

                      {isPendente && (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>Pendente ({em.dias_restantes ?? 15}d)</span>
                        </span>
                      )}

                      {isExpirado && (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 flex items-center gap-1">
                          <XCircle className="w-2.5 h-2.5" />
                          <span>Expirado</span>
                        </span>
                      )}

                      {isRecusado && (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          Recusado
                        </span>
                      )}

                      <span
                        className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                          em.ativo ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {em.ativo ? 'Ativo' : 'Pausado'}
                      </span>
                    </div>
                  </div>
                )
              })}

              {emailsNotificacao.length === 0 && (
                <div className="p-6 text-center text-slate-500 text-xs italic bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  Nenhum e-mail de notificação cadastrado.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section: Raio-X de Demandas em Andamento */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs transition-colors">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/80 px-2.5 py-0.5 rounded-md border border-purple-200 dark:border-purple-800">
                  Raio-X em Tempo Real
                </span>
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  Demandas em Andamento & Compromissos Contratuais
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-1">
                Chamados ativos que comprometerão a franquia após aprovação do orçamento ou aceite final de entrega
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                Total Comprometido: -{horasComprometidas.toFixed(1)}h
              </span>
              <span className="text-xs font-black text-slate-700 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                {listaDemandas.length} chamados
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-300 font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4">Pedido / Protocolo</th>
                  <th className="p-4">Etapa do Fluxo</th>
                  <th className="p-4">Escopo Técnico</th>
                  <th className="p-4 text-right">Previsão de Horas</th>
                  <th className="p-4 text-center">Responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                {listaDemandas.map((item: any) => {
                  const isAguardandoOrcamento =
                    item.status === 'aguardando_aprovacao' || item.status === 'orcado' || item.status === 'em_orcamento' || item.status === 'aberto'
                  const isAguardandoAceite = item.status === 'aguardando_aceite'
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="p-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {item.pedido_protocolo}
                        <span className="block text-[10px] text-slate-500 font-sans font-normal truncate max-w-xs">
                          {item.pedido_assunto}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full uppercase border ${
                            isAguardandoOrcamento
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800/60'
                              : isAguardandoAceite
                              ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800/60'
                              : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800/60'
                          }`}
                        >
                          {item.status_display}
                        </span>
                      </td>
                      <td className="p-4 text-slate-800 dark:text-slate-300 max-w-xs">
                        <span className="font-bold text-slate-900 dark:text-slate-100 block">{item.tipo}</span>
                        <span className="text-[11px] text-slate-500 truncate block">{item.contexto || '-'}</span>
                      </td>
                      <td className="p-4 text-right font-black text-amber-600 dark:text-amber-400 text-sm font-mono">
                        -{Number(item.horas).toFixed(1)}h
                      </td>
                      <td className="p-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                            {item.responsavel_nome || item.responsavel || item.operador || '-'}
                          </span>
                          <span
                            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full mt-0.5 border ${
                              item.responsavel_papel === 'cliente'
                                ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800/60'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {item.responsavel_papel === 'cliente' ? 'Cliente' : 'Técnico'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {listaDemandas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs italic font-medium">
                      Nenhuma demanda técnica pendente no presente minuto. O saldo projetado equivale exatamente ao saldo atual.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section: Histórico de Débitos por Ciclos */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs transition-colors">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-black text-sm text-slate-900 dark:text-white">Histórico de Débitos por Ciclos Aceitos</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-0.5">Registro oficial e auditável de consumo de horas técnicas</p>
            </div>
            <span className="text-xs font-black text-slate-700 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700">
              {historico_ciclos.length} eventos
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-300 font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4">Pedido / Protocolo</th>
                  <th className="p-4">Tipo do Ciclo</th>
                  <th className="p-4">Escopo Técnico</th>
                  <th className="p-4 text-right">Horas Debitadas</th>
                  <th className="p-4 text-right">Data de Aceite</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                {historico_ciclos.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="p-4 font-mono font-bold text-slate-900 dark:text-slate-100">{item.pedido_protocolo}</td>
                    <td className="p-4 font-bold text-indigo-700 dark:text-indigo-400">{item.tipo}</td>
                    <td className="p-4 text-slate-800 dark:text-slate-300 max-w-xs truncate">{item.contexto || '-'}</td>
                    <td className="p-4 text-right font-black text-slate-900 dark:text-slate-100 text-sm">-{item.horas_realizadas.toFixed(1)}h</td>
                    <td className="p-4 text-right text-slate-600 dark:text-slate-400 font-mono font-semibold">
                      {item.aceito_em ? new Date(item.aceito_em).toLocaleDateString('pt-BR') : '-'}
                    </td>
                  </tr>
                ))}
                {historico_ciclos.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-500 dark:text-slate-400 text-xs italic font-medium">
                      Nenhum ciclo debitado até o momento neste contrato.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section: Timeline de Auditoria Forense do Contrato */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="font-black text-sm text-slate-900 dark:text-white">Trilha de Auditoria Forense do Contrato</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Histórico imutável de cadastros, uploads, downloads, impressões, preferências de e-mail e cancelamentos
              </p>
            </div>
            <div className="flex items-center gap-2">
              {auditoria.length > 3 && (
                <span className="text-[11px] text-slate-400 font-semibold hidden sm:inline">
                  (exibindo 3 com rolagem)
                </span>
              )}
              <span className="text-xs font-mono font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
                {auditoria.length} {auditoria.length === 1 ? 'registro' : 'registros'} no total
              </span>
            </div>
          </div>

          <TimelineAuditoriaContrato logs={auditoria} contratoId={contrato.id} />
        </div>
      </div>

      {/* Floating Scroll-to-Top Button */}
      <button
        type="button"
        onClick={handleScrollToTop}
        title="Voltar ao início do relatório"
        aria-label="Topo Relatório"
        className={`fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold text-xs rounded-full shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer border border-indigo-400/40 backdrop-blur-sm group ${
          showScrollTopBtn
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <span className="hidden sm:inline">Topo Relatório</span>
        <ArrowUp className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
      </button>

      {/* Modais */}
      <DocumentosContratoModal
        isOpen={isDocsModalOpen}
        onClose={() => setIsDocsModalOpen(false)}
        contrato={contrato}
      />

      <GerenteClienteEmailsModal
        isOpen={isEmailsModalOpen}
        onClose={() => setIsEmailsModalOpen(false)}
        contrato={contrato}
      />

      <MigracaoSaldoModal
        isOpen={isMigracaoModalOpen}
        onClose={() => setIsMigracaoModalOpen(false)}
        contratoDestino={contrato}
      />

      <EnviarExtratoModal
        isOpen={isExtratoEmailModalOpen}
        onClose={() => setIsExtratoEmailModalOpen(false)}
        contratoId={contrato.id}
        contratoNumero={contrato.numero}
      />
    </AppLayout>

  )
}