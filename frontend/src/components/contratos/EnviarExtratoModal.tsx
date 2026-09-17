import { useState, useEffect } from 'react'
import { X, Mail, CheckSquare, Square, Send, Loader2, Users, ShieldCheck, AlertCircle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientService } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'

interface EnviarExtratoModalProps {
  contratoId: number
  contratoNumero: string
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function EnviarExtratoModal({
  contratoId,
  contratoNumero,
  isOpen,
  onClose,
  onSuccess,
}: EnviarExtratoModalProps) {
  const toast = useToast()
  const queryClient = useQueryClient()

  const [emailsSelecionados, setEmailsSelecionados] = useState<string[]>([])
  const [mensagemAdicional, setMensagemAdicional] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['destinatarios-extrato', contratoId],
    queryFn: () => clientService.contratos.destinatariosExtrato(contratoId),
    enabled: isOpen && Boolean(contratoId),
  })

  useEffect(() => {
    if (data) {
      const iniciais: string[] = []
      if (data.gestor?.email) {
        iniciais.push(data.gestor.email.toLowerCase())
      }
      if (Array.isArray(data.destinatarios)) {
        data.destinatarios.forEach((d) => {
          if (d.email) iniciais.push(d.email.toLowerCase())
        })
      }
      setEmailsSelecionados(Array.from(new Set(iniciais)))
    }
  }, [data])

  const enviarMutation = useMutation({
    mutationFn: () =>
      clientService.contratos.enviarExtratoEmail(contratoId, {
        destinatarios: emailsSelecionados,
        mensagem_adicional: mensagemAdicional.trim() || undefined,
      }),
    onSuccess: (res) => {
      toast.success(
        res.mensagem || `Extrato oficial enviado com sucesso para ${emailsSelecionados.length} contato(s).`,
        'Extrato Enviado'
      )
      queryClient.invalidateQueries({ queryKey: ['extrato', String(contratoId)] })
      queryClient.invalidateQueries({ queryKey: ['contratos'] })
      onSuccess?.()
      onClose()
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || 'Erro ao despachar extrato oficial por e-mail.'
      toast.error(msg, 'Erro de Envio')
    },
  })

  if (!isOpen) return null

  const toggleEmail = (email: string) => {
    const normalizado = email.toLowerCase()
    setEmailsSelecionados((prev) =>
      prev.includes(normalizado) ? prev.filter((e) => e !== normalizado) : [...prev, normalizado]
    )
  }

  const toggleTodos = () => {
    const todosDisponiveis: string[] = []
    if (data?.gestor?.email) todosDisponiveis.push(data.gestor.email.toLowerCase())
    data?.destinatarios?.forEach((d) => {
      if (d.email) todosDisponiveis.push(d.email.toLowerCase())
    })

    if (emailsSelecionados.length === todosDisponiveis.length) {
      setEmailsSelecionados([])
    } else {
      setEmailsSelecionados(todosDisponiveis)
    }
  }

  const gestor = data?.gestor
  const destinatarios = data?.destinatarios || []
  const totalElegiveis = (gestor ? 1 : 0) + destinatarios.length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-850/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 shadow-xs">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Enviar Extrato Oficial por E-mail
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Contrato <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{contratoNumero}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Info Banner */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-xs text-indigo-950 dark:text-indigo-200 leading-relaxed">
              O relatório oficial em <strong>PDF vetorial de alta fidelidade</strong> será compilado e enviado como anexo. 
              O hash SHA-256 e o carimbo de data/hora serão registrados na trilha forense do contrato.
            </p>
          </div>

          {/* Destinatários Selector */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Destinatários Homologados ({emailsSelecionados.length}/{totalElegiveis})
              </label>
              {totalElegiveis > 1 && (
                <button
                  type="button"
                  onClick={toggleTodos}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
                >
                  {emailsSelecionados.length === totalElegiveis ? (
                    <>
                      <Square className="w-3.5 h-3.5" /> Desmarcar todos
                    </>
                  ) : (
                    <>
                      <CheckSquare className="w-3.5 h-3.5" /> Selecionar todos
                    </>
                  )}
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="p-6 text-center text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs font-semibold">Carregando contatos homologados...</span>
              </div>
            ) : totalElegiveis === 0 ? (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Nenhum e-mail de gestor ou contato confirmado encontrado para este contrato.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {/* Gestor do Contrato */}
                {gestor && (
                  <div
                    onClick={() => toggleEmail(gestor.email)}
                    className={`p-3 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
                      emailsSelecionados.includes(gestor.email.toLowerCase())
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-700'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={emailsSelecionados.includes(gestor.email.toLowerCase())}
                        onChange={() => {}} // controlado pelo container onClick
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div>
                        <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                          {gestor.nome}
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">
                            Gestor Titular
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          {gestor.email}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notificações Adicionais Confirmadas */}
                {destinatarios.map((d) => {
                  const isChecked = emailsSelecionados.includes(d.email.toLowerCase())
                  return (
                    <div
                      key={d.id}
                      onClick={() => toggleEmail(d.email)}
                      className={`p-3 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
                        isChecked
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-700'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-70'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div>
                          <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                            {d.nome}
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-750 text-slate-600 dark:text-slate-300 font-medium">
                              {d.cargo}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                            {d.email}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Mensagem Opcional */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Mensagem ou Observação Adicional (Opcional)
            </label>
            <textarea
              value={mensagemAdicional}
              onChange={(e) => setMensagemAdicional(e.target.value)}
              placeholder="Ex.: Segue o demonstrativo de horas referente ao fechamento do projeto..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/60 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={enviarMutation.isPending}
            className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => enviarMutation.mutate()}
            disabled={enviarMutation.isPending || emailsSelecionados.length === 0}
            className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2 cursor-pointer"
          >
            {enviarMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Enviando Extrato...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Enviar para {emailsSelecionados.length} contato(s)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
