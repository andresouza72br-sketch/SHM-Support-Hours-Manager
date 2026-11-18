import React, { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  X,
  Send,
  Loader2,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Music,
  Archive,
  Trash2,
  AlertTriangle,
  PlusCircle,
} from 'lucide-react'
import { clientService } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import { GravadorAudio } from './GravadorAudio'
import type { Contrato, Pedido, PrioridadePedido } from '../../types'

const MAX_ARQUIVOS_PEDIDO = 10
const MAX_TAMANHO_BYTES = 25 * 1024 * 1024 // 25 MB

const EXTENSOES_PERMITIDAS = new Set([
  'pdf', 'docx', 'doc', 'xlsx', 'xls', 'csv', 'txt', 'odt', 'ods', 'rtf',
  'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg',
  'mp3', 'wav', 'ogg', 'm4a',
  'zip', 'rar', '7z', 'tar', 'gz',
])

const EXTENSOES_PROIBIDAS = new Set([
  'exe', 'bat', 'cmd', 'sh', 'bin', 'com', 'scr', 'vbs', 'js', 'msi', 'jar', 'apk',
])

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getIconeArquivo(nome: string) {
  const ext = nome.split('.').pop()?.toLowerCase() || ''
  if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
    return <Music className="w-4 h-4 text-violet-500 shrink-0" />
  }
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) {
    return <ImageIcon className="w-4 h-4 text-emerald-500 shrink-0" />
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return <Archive className="w-4 h-4 text-amber-500 shrink-0" />
  }
  return <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
}

function ItemArquivoAnexo({
  file,
  onRemover,
}: {
  file: File
  onRemover: () => void
}) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  const isAudio = ['mp3', 'wav', 'ogg', 'm4a'].includes(ext)

  useEffect(() => {
    if (!isAudio) return
    const url = URL.createObjectURL(file)
    setAudioUrl(url)
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [file, isAudio])

  if (isAudio) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-violet-50/70 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/60 shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-900/60 text-violet-600 dark:text-violet-300 shrink-0">
            <Music className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-900 dark:text-white text-xs truncate" title={file.name}>
              {file.name}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                {formatarTamanho(file.size)}
              </span>
              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-violet-100 dark:bg-violet-900/80 text-violet-700 dark:text-violet-300 uppercase tracking-wider">
                Áudio MP3
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          {audioUrl && (
            <audio controls src={audioUrl} preload="metadata" className="h-7 w-full sm:w-56" />
          )}
          <button
            type="button"
            onClick={onRemover}
            className="p-1.5 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition shrink-0 cursor-pointer"
            title="Remover áudio"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs">
      <div className="flex items-center gap-2.5 min-w-0">
        {getIconeArquivo(file.name)}
        <span className="font-bold text-slate-800 dark:text-slate-200 truncate" title={file.name}>
          {file.name}
        </span>
        <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono shrink-0">
          {formatarTamanho(file.size)}
        </span>
      </div>
      <button
        type="button"
        onClick={onRemover}
        className="p-1 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition shrink-0 cursor-pointer"
        title="Remover arquivo"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export interface NovoPedidoModalProps {
  isOpen: boolean
  onClose: () => void
  contratoInicialId?: number | null
  onPedidoCriado?: (pedido: Pedido) => void
}

export function NovoPedidoModal({
  isOpen,
  onClose,
  contratoInicialId,
  onPedidoCriado,
}: NovoPedidoModalProps) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const modalContainerRef = useRef<HTMLDivElement>(null)

  const [contratoId, setContratoId] = useState<number | ''>('')
  const [assunto, setAssunto] = useState('')
  const [descricao, setDescricao] = useState('')
  const [prioridade, setPrioridade] = useState<PrioridadePedido>('media')
  const [arquivos, setArquivos] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)

  const { data: contratosRaw = [] } = useQuery({
    queryKey: ['contratos'],
    queryFn: clientService.contratos.list,
    enabled: isOpen,
  })

  const listaContratos: Contrato[] = Array.isArray(contratosRaw) ? contratosRaw : []

  // Sincroniza contrato inicial ao abrir modal
  useEffect(() => {
    if (isOpen) {
      if (contratoInicialId) {
        setContratoId(contratoInicialId)
      } else if (listaContratos.length === 1) {
        setContratoId(listaContratos[0].id)
      }
    }
  }, [isOpen, contratoInicialId, listaContratos])

  // Body scroll lock enquanto o modal estiver aberto
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalStyle
      }
    }
  }, [isOpen])

  const hasDirtyFields = Boolean(assunto.trim() || descricao.trim() || arquivos.length > 0)

  const resetForm = () => {
    setContratoId(contratoInicialId || '')
    setAssunto('')
    setDescricao('')
    setPrioridade('media')
    setArquivos([])
    setShowDiscardConfirm(false)
  }

  const handleRequestClose = () => {
    if (hasDirtyFields) {
      setShowDiscardConfirm(true)
    } else {
      resetForm()
      onClose()
    }
  }

  const handleConfirmDiscard = () => {
    resetForm()
    onClose()
  }

  // Fecha com a tecla Escape respeitando a trava de descarte
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape') {
        e.preventDefault()
        if (showDiscardConfirm) {
          setShowDiscardConfirm(false)
        } else {
          handleRequestClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, hasDirtyFields, showDiscardConfirm])

  const createMutation = useMutation({
    mutationFn: (data: FormData) => clientService.pedidos.create(data),
    onSuccess: (pedido) => {
      queryClient.invalidateQueries({ queryKey: ['kanban'] })
      queryClient.invalidateQueries({ queryKey: ['contratos'] })
      toast.success(`Pedido ${pedido.protocolo} aberto com sucesso!`, 'Novo Pedido')
      onPedidoCriado?.(pedido)
      resetForm()
      onClose()
    },
    onError: (error: any) => {
      const data = error?.response?.data
      const detail =
        data?.detail ||
        (data && typeof data === 'object'
          ? Object.entries(data)
              .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
              .join(' | ')
          : null) ||
        'Erro ao abrir pedido. Verifique os dados.'
      toast.error(detail, 'Falha')
    },
  })

  const processarArquivos = (novosArquivos: FileList | File[]) => {
    const list = Array.from(novosArquivos)
    if (arquivos.length + list.length > MAX_ARQUIVOS_PEDIDO) {
      toast.error(
        `Limite máximo de ${MAX_ARQUIVOS_PEDIDO} arquivos por pedido. Você já selecionou ${arquivos.length}.`,
        'Limite de Anexos'
      )
      return
    }

    const validos: File[] = []
    for (const file of list) {
      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      if (EXTENSOES_PROIBIDAS.has(ext)) {
        toast.error(`O arquivo "${file.name}" possui formato proibido (.${ext}) por segurança.`, 'Formato Proibido')
        continue
      }
      if (!EXTENSOES_PERMITIDAS.has(ext)) {
        toast.error(`A extensão (.${ext}) de "${file.name}" não é permitida.`, 'Formato Inválido')
        continue
      }
      if (file.size > MAX_TAMANHO_BYTES) {
        toast.error(
          `O arquivo "${file.name}" tem ${formatarTamanho(file.size)}, excedendo o limite de 25 MB.`,
          'Arquivo Muito Grande'
        )
        continue
      }
      validos.push(file)
    }

    if (validos.length > 0) {
      setArquivos((prev) => [...prev, ...validos])
    }
  }

  const removerArquivo = (index: number) => {
    setArquivos((prev) => prev.filter((_, i) => i !== index))
  }

  const handleAudioGravado = (arquivoAudio: File) => {
    if (arquivos.length >= MAX_ARQUIVOS_PEDIDO) {
      toast.error(
        `Limite máximo de ${MAX_ARQUIVOS_PEDIDO} arquivos por pedido atingido. Remova um anexo para adicionar a gravação.`,
        'Limite de Anexos'
      )
      return
    }

    setArquivos((prev) => [...prev, arquivoAudio])
    toast.success(`Gravação "${arquivoAudio.name}" adicionada aos anexos do pedido!`, 'Áudio Gravado')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!contratoId || !assunto.trim() || !descricao.trim()) return

    const formData = new FormData()
    formData.append('contrato', String(contratoId))
    formData.append('assunto', assunto.trim())
    formData.append('descricao', descricao.trim())
    formData.append('prioridade', prioridade)
    arquivos.forEach((file) => {
      formData.append('arquivos', file)
    })

    createMutation.mutate(formData)
  }

  const getErrorMessage = () => {
    if (!createMutation.error) return 'Erro ao abrir pedido. Por favor verifique os campos e tente novamente.'
    const data = (createMutation.error as any)?.response?.data
    if (!data) return 'Erro ao abrir pedido. Por favor verifique os campos e tente novamente.'
    if (typeof data === 'string') return data
    if (data.detail) return data.detail
    if (typeof data === 'object') {
      return Object.entries(data)
        .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
        .join(' | ')
    }
    return 'Erro ao abrir pedido. Por favor verifique os campos e tente novamente.'
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleRequestClose()
        }
      }}
    >
      <div
        ref={modalContainerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="novo-pedido-modal-title"
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden transition-all relative"
      >
        {/* Confirmação de descarte sobreposta */}
        {showDiscardConfirm && (
          <div className="absolute inset-0 z-60 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-6 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 max-w-md w-full shadow-2xl text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center shadow-xs">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Descartar este pedido?
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Você preencheu informações neste chamado. Se fechar agora, as alterações e anexos serão perdidos.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDiscardConfirm(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  Continuar Editando
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDiscard}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-500/20 transition cursor-pointer"
                >
                  Descartar e Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/20 shrink-0">
              <PlusCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                  Operação SHM
                </span>
                <span className="text-xs font-bold text-slate-400">•</span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Kanban
                </span>
              </div>
              <h2 id="novo-pedido-modal-title" className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                Novo Pedido de Suporte
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRequestClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 rounded-xl transition cursor-pointer shrink-0"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-5">
          {createMutation.isError && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/60 text-rose-900 dark:text-rose-300 text-xs font-black">
              {getErrorMessage()}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-black text-slate-900 dark:text-slate-300 uppercase tracking-wider mb-2">
              Contrato Vinculado *
            </label>
            <select
              required
              value={contratoId}
              onChange={(e) => setContratoId(e.target.value ? Number(e.target.value) : '')}
              className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100 cursor-pointer shadow-xs"
            >
              <option value="">Selecione um contrato ativo...</option>
              {listaContratos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.numero} — Saldo disponível: {Number(c.saldo).toFixed(1)}h
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-black text-slate-900 dark:text-slate-300 uppercase tracking-wider mb-2">
              Assunto / Título Resumido *
            </label>
            <input
              type="text"
              required
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              placeholder="ex: Erro ao emitir relatório de notas ou solicitação de novo layout"
              className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 dark:text-slate-100 shadow-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black text-slate-900 dark:text-slate-300 uppercase tracking-wider mb-2">
              Descrição Detalhada do Problema / Necessidade *
            </label>
            <textarea
              required
              rows={4}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Explique o que precisa ser feito, detalhes do problema, passos para reproduzir ou escopo desejado..."
              className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 dark:text-slate-100 leading-relaxed shadow-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black text-slate-900 dark:text-slate-300 uppercase tracking-wider mb-2">
              Nível de Prioridade
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {(['baixa', 'media', 'alta', 'urgente'] as PrioridadePedido[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPrioridade(p)}
                  className={`py-2.5 text-xs font-black rounded-2xl border capitalize transition duration-150 cursor-pointer ${
                    prioridade === p
                      ? p === 'urgente'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-500/20'
                        : p === 'alta'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20'
                        : 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-2xs'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Seção de Anexos */}
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-[11px] font-black text-slate-900 dark:text-slate-300 uppercase tracking-wider">
                  Documentos e Anexos (Opcional)
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Anexe arquivos ou grave instruções de voz pelo microfone (em formato MP3).
                </p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                arquivos.length >= MAX_ARQUIVOS_PEDIDO
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {arquivos.length} de {MAX_ARQUIVOS_PEDIDO} arquivos
              </span>
            </div>

            {/* Gravador de Áudio via Microfone */}
            <GravadorAudio
              onAudioGravado={handleAudioGravado}
              limiteAtingido={arquivos.length >= MAX_ARQUIVOS_PEDIDO}
              desabilitado={createMutation.isPending}
            />

            {/* Dropzone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragging(false)
                if (e.dataTransfer.files) {
                  processarArquivos(e.dataTransfer.files)
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-5 text-center transition cursor-pointer flex flex-col items-center justify-center gap-2 ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 shadow-inner'
                  : 'border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.png,.jpg,.jpeg,.webp,.mp3,.zip,.rar"
                onChange={(e) => {
                  if (e.target.files) {
                    processarArquivos(e.target.files)
                    e.target.value = ''
                  }
                }}
              />
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span className="text-indigo-600 dark:text-indigo-400 underline underline-offset-2">Clique para selecionar</span> ou arraste arquivos até aqui
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Até 10 arquivos (máx 25 MB cada). Formatos: PDF, DOCX, XLSX, imagens, compactados e áudios.
                </p>
              </div>
            </div>

            {/* Lista de Arquivos Selecionados */}
            {arquivos.length > 0 && (
              <div className="mt-3 space-y-2">
                {arquivos.map((file, idx) => (
                  <ItemArquivoAnexo
                    key={`${file.name}-${idx}`}
                    file={file}
                    onRemover={() => removerArquivo(idx)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-slate-900 pb-1">
            <button
              type="button"
              disabled={createMutation.isPending}
              onClick={handleRequestClose}
              className="px-5 py-2.5 text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-xs px-6 py-3 rounded-2xl shadow-lg shadow-indigo-500/20 transition cursor-pointer disabled:opacity-75 disabled:cursor-wait"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Criando Pedido...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Abrir Pedido</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
