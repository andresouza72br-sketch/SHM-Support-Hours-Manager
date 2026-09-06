import React, { useState, useEffect } from 'react'
import {
  X,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  Key,
  Calendar,
  ExternalLink,
  Copy,
  Check,
  Server,
  ShieldCheck,
  Zap,
  HelpCircle,
  Layers,
} from 'lucide-react'

interface ManualGoogleCalendarModalProps {
  isOpen: boolean
  onClose: () => void
  serviceAccountEmail?: string | null
  currentCalendarId?: string
}

interface StepItem {
  id: string
  title: string
  shortLabel: string
  icon: React.ComponentType<{ className?: string }>
}

export function ManualGoogleCalendarModal({
  isOpen,
  onClose,
  serviceAccountEmail,
  currentCalendarId,
}: ManualGoogleCalendarModalProps) {
  const [activeStep, setActiveStep] = useState(0)
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null)

  // Fecha no ESC e bloqueia scroll do body
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const copyToClipboard = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text)
    setCopiedSnippet(identifier)
    setTimeout(() => {
      setCopiedSnippet((prev) => (prev === identifier ? null : prev))
    }, 2500)
  }

  const steps: StepItem[] = [
    { id: 'visao-geral', title: '1. Arquitetura & Fluxo', shortLabel: 'Visão Geral', icon: Layers },
    { id: 'google-cloud', title: '2. Google Cloud & API', shortLabel: 'Google Cloud', icon: Server },
    { id: 'service-account', title: '3. Service Account & Chave JSON', shortLabel: 'Service Account', icon: Key },
    { id: 'agenda-permissao', title: '4. Agenda & Permissão (Crítico)', shortLabel: 'Permissões Agenda', icon: Calendar },
    { id: 'config-shm', title: '5. Configurar no Painel SHM', shortLabel: 'Configuração SHM', icon: ShieldCheck },
    { id: 'diagnostico-testes', title: '6. Diagnóstico & Testes', shortLabel: 'Testes de Conexão', icon: Zap },
    { id: 'troubleshooting', title: '7. Resolução de Problemas', shortLabel: 'Troubleshooting', icon: HelpCircle },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-manual-title"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Cabeçalho do Modal */}
        <div className="p-5 sm:px-7 sm:py-5 bg-gradient-to-r from-indigo-50 via-white to-sky-50 dark:from-slate-900 dark:via-indigo-950/30 dark:to-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                  Manual de Manutenção
                </span>
                <span className="text-[10px] text-slate-400 font-mono">SHM 2.0 • Schedule API</span>
              </div>
              <h2 id="modal-manual-title" className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight mt-0.5">
                Guia Passo a Passo: Configuração e Gestão Google Calendar
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
            title="Fechar Manual (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra Horizontal de Etapas (Navegação Rápida) */}
        <div className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 overflow-x-auto shrink-0 flex items-center gap-1.5 scrollbar-thin">
          {steps.map((step, idx) => {
            const Icon = step.icon
            const isSelected = activeStep === idx
            const isPast = idx < activeStep
            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(idx)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : isPast
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/60'
                }`}
              >
                {isPast ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Icon className="w-3.5 h-3.5" />}
                <span>{step.shortLabel}</span>
              </button>
            )
          })}
        </div>

        {/* Conteúdo Dinâmico com Scroll */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
          {/* ETAPA 1: VISÃO GERAL */}
          {activeStep === 0 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Entendendo a Integração com o Google Calendar
                </h3>
              </div>

              <p>
                O SHM utiliza uma arquitetura híbrida para conectar sua operação de suporte ao Google Calendar e ao Google Meet com total segurança e conveniência:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-indigo-900 dark:text-indigo-200">
                    <Key className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Service Account (Robô do Servidor)</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    É a conta de serviço autônoma do Google Cloud. Ela roda em segundo plano no backend do SHM e tem permissão para <strong>inserir, editar e cancelar compromissos</strong> diretamente na agenda corporativa e gerar salas do Google Meet.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-sky-900 dark:text-sky-200">
                    <Calendar className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <span>Agenda Corporativa Central</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    É o calendário do Google (geralmente compartilhado na equipe de suporte) onde todos os chamados e visitas ficam centralizados. O ID dessa agenda é configurado no campo abaixo nesta tela.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Preciso me inscrever no Google Calendar ao fazer login?</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  <strong>Não é obrigatório!</strong> Quando você agenda um compromisso no SHM, você e os participantes já recebem convites automáticos por e-mail com botão de presença e link do Meet. O botão <em>"Inscrever no Google Calendar"</em> serve apenas para adicionar a agenda global da empresa à lista de calendários do seu aplicativo.
                </p>
              </div>
            </div>
          )}

          {/* ETAPA 2: GOOGLE CLOUD & API */}
          {activeStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Server className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Passo 1: Ativar a Google Calendar API no Google Cloud
                  </h3>
                </div>
                <a
                  href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <span>Abrir no Google Cloud</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <ol className="space-y-3 list-decimal list-inside text-xs sm:text-sm">
                <li className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <strong>Acesse o Google Cloud Console:</strong> Entre com sua conta Google de administrador em{' '}
                  <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 underline font-bold">
                    console.cloud.google.com
                  </a>.
                </li>
                <li className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <strong>Selecione ou Crie um Projeto:</strong> No topo da tela, clique no seletor de projetos e escolha o projeto do SHM (ou clique em <em>"Novo Projeto"</em>, ex: <code>shm-agenda-corporativa</code>).
                </li>
                <li className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <strong>Ative a Google Calendar API:</strong>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Vá em <strong>APIs e Serviços &gt; Biblioteca</strong>, pesquise por <code>Google Calendar API</code> e clique no botão azul <strong>"Ativar"</strong> (Enable).
                  </div>
                </li>
              </ol>

              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Importante:</strong> Se a API não for ativada no projeto do Google Cloud, qualquer chamada da Service Account retornará erro <code>403 API Not Enabled</code>.
                </span>
              </div>
            </div>
          )}

          {/* ETAPA 3: SERVICE ACCOUNT & JSON */}
          {activeStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Passo 2: Criar a Service Account e Gerar a Chave JSON
                  </h3>
                </div>
                <a
                  href="https://console.cloud.google.com/iam-admin/serviceaccounts"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <span>Contas de Serviço</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="space-y-3 text-xs sm:text-sm">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="font-bold text-slate-900 dark:text-white">1. Criar a Conta de Serviço:</div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    No Google Cloud, vá em <strong>APIs e Serviços &gt; Credenciais</strong> &gt; clique em <strong>+ Criar Credenciais</strong> &gt; <strong>Conta de serviço</strong>.
                    Defina o nome como <code>shm-calendar-bot</code> e conclua o assistente.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="font-bold text-slate-900 dark:text-white">2. Baixar a Chave JSON Privada:</div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Clique no e-mail da conta de serviço recém-criada (ex: <code>shm-bot@projeto.iam.gserviceaccount.com</code>), acesse a aba <strong>Chaves (Keys)</strong> &gt; <strong>Adicionar chave</strong> &gt; <strong>Criar nova chave</strong> &gt; escolha <strong>JSON</strong> e faça o download.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="font-bold text-slate-900 dark:text-white">3. Colocar no Servidor / Backend:</div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Coloque o arquivo baixado na pasta do backend ou aponte a variável no arquivo <code>.env</code>:
                  </p>
                  <div className="flex items-center justify-between bg-slate-900 text-slate-100 p-2.5 rounded-lg font-mono text-xs">
                    <span>GOOGLE_SERVICE_ACCOUNT_FILE=credentials/service-account.json</span>
                    <button
                      onClick={() => copyToClipboard('GOOGLE_SERVICE_ACCOUNT_FILE=credentials/service-account.json', 'sa_file')}
                      className="text-slate-400 hover:text-white ml-2 shrink-0 cursor-pointer"
                    >
                      {copiedSnippet === 'sa_file' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 4: PERMISSÃO NA AGENDA (CRÍTICO) */}
          {activeStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Passo 3: Compartilhar a Agenda com a Service Account (CRÍTICO)
                  </h3>
                </div>
                <a
                  href="https://calendar.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <span>Google Calendar Web</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-rose-900 dark:text-rose-200">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Causa #1 de Falhas (Permissão de Acesso):</span>
                </div>
                <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
                  Mesmo com a API ativada e o JSON no servidor, o Google não permite que o robô crie reuniões se você não autorizar expressamente a agenda corporativa para o e-mail da Service Account!
                </p>
              </div>

              <div className="space-y-3 text-xs sm:text-sm">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <strong>Procedimento exato no Google Agenda:</strong>
                  <ol className="list-decimal list-inside space-y-2 text-xs text-slate-600 dark:text-slate-400">
                    <li>Abra o <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer" className="underline font-bold text-indigo-600 dark:text-indigo-400">Google Calendar</a> no navegador com a conta proprietária da agenda.</li>
                    <li>No menu lateral esquerdo, localize a agenda corporativa (ex: <em>Agenda SHM</em> ou a agenda principal).</li>
                    <li>Passe o mouse sobre ela, clique nos <strong>três pontinhos verticais</strong> e clique em <strong>"Configurações e compartilhamento"</strong>.</li>
                    <li>Role até a seção <strong>"Compartilhar com pessoas ou grupos específicos"</strong> e clique em <strong>+ Adicionar pessoas</strong>.</li>
                    <li>
                      Cole o e-mail da Service Account do SHM:
                      {serviceAccountEmail ? (
                        <div className="mt-1 flex items-center justify-between bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 p-2 rounded-lg font-mono text-xs text-indigo-900 dark:text-indigo-200 font-bold">
                          <span>{serviceAccountEmail}</span>
                          <button
                            onClick={() => copyToClipboard(serviceAccountEmail, 'modal_sa_email')}
                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 ml-2 cursor-pointer"
                          >
                            {copiedSnippet === 'modal_sa_email' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      ) : (
                        <div className="mt-1 text-slate-500 italic">
                          (E-mail disponível nas configurações ou no arquivo JSON no campo client_email)
                        </div>
                      )}
                    </li>
                    <li>
                      No campo de permissão, selecione <strong>obrigatoriamente</strong>:  
                      <span className="inline-block mt-1 font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                        "Fazer alterações nos eventos" (Make changes to events)
                      </span>
                    </li>
                    <li>Clique em <strong>Enviar</strong>.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 5: CONFIGURAR NO SHM */}
          {activeStep === 4 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Passo 4: Obter o Calendar ID e Salvar no SHM
                </h3>
              </div>

              <div className="space-y-3 text-xs sm:text-sm">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <strong>Onde encontrar o ID da Agenda no Google Calendar:</strong>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Na mesma tela de <em>Configurações da Agenda</em> no Google Calendar Web, role até a seção <strong>"Integrar agenda"</strong>. Lá você verá o campo <strong>ID da agenda</strong>.
                  </p>
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1 text-xs font-mono">
                    <div className="text-slate-500">// Exemplos de formatos válidos:</div>
                    <div className="text-slate-800 dark:text-slate-200">• Agenda dedicada: <code>c_xxxxxxxxxxxxxxxx@group.calendar.google.com</code></div>
                    <div className="text-slate-800 dark:text-slate-200">• Agenda primária do Gmail: <code>seu-email@gmail.com</code></div>
                  </div>
                </div>

                <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/50 space-y-2">
                  <strong>Como salvar no SHM:</strong>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Volte para a tela de <strong>Configurações do Sistema</strong> do SHM, cole esse ID no campo <em>"ID da Agenda Corporativa"</em> e clique no botão azul <strong>"Salvar Configuração"</strong>.
                  </p>
                  {currentCalendarId && (
                    <div className="text-xs text-slate-500 font-medium">
                      Calendar ID atual no sistema: <code className="font-mono font-bold text-slate-800 dark:text-slate-200">{currentCalendarId}</code>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 6: DIAGNÓSTICO & TESTES */}
          {activeStep === 5 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                <Zap className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Passo 5: Teste de Conexão e Interpretação dos Diagnósticos
                </h3>
              </div>

              <p>
                O SHM possui um sistema ativo de telemetria com timeout de 8 segundos que pinga a API oficial do Google e valida o acesso:
              </p>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Conexão Estabelecida com Sucesso (Status 200/201)</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Indica que a Service Account autenticou, a agenda foi encontrada e o papel de acesso (ex: <code>owner</code> ou <code>writer</code>) está liberado para gravação de novos agendamentos e geração de links de reunião.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span>Modo Simulação / Dev Mock</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Caso a chave JSON não esteja no servidor, o sistema <strong>não quebra</strong>. Ele simula eventos localmente, permitindo testes funcionais de desenvolvimento sem interromper a equipe técnica.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-800 dark:text-rose-300">
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                    <span>Falha na Comunicação (404 Not Found ou 403 Forbidden)</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    O diagnóstico retornará sugestões automáticas na tela indicando se o ID está com erro de digitação ou se faltou o compartilhamento da agenda.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 7: TROUBLESHOOTING */}
          {activeStep === 6 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                <HelpCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Guia Rápido de Resolução de Problemas (Troubleshooting)
                </h3>
              </div>

              <div className="space-y-3 text-xs sm:text-sm">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300 rounded font-mono text-[11px]">Erro 404</span>
                    <span>Agenda não encontrada</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Verifique se o Calendar ID foi copiado por completo, sem espaços extras no início ou fim, ou se a agenda foi excluída no Google Calendar.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 rounded font-mono text-[11px]">Erro 403</span>
                    <span>Acesso Negado / Permissão Insuficiente</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    A Service Account foi adicionada apenas com permissão de <em>"Ver apenas livre/ocupado"</em>. Altere nas configurações da agenda para <strong>"Fazer alterações nos eventos"</strong>.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-300 rounded font-mono text-[11px]">Google Meet</span>
                    <span>Contas Pessoais @gmail.com vs Workspace</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Contas @gmail.com gratuitas limitam a criação de conferências automatizadas por Service Account. O SHM já possui <strong>fallback resiliente</strong> embutido que gera links padronizados e seguros sem quebrar o agendamento.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 rounded font-mono text-[11px]">Documentação</span>
                    <span>Arquivo Completo no Repositório</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Para o manual em Markdown completo com exemplos de payloads e trilhas periciais de auditoria, consulte o arquivo <code>docs/MANUAL_GOOGLE_CALENDAR.md</code> no projeto.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé de Navegação */}
        <div className="p-4 sm:px-7 sm:py-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
            disabled={activeStep === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Passo Anterior</span>
          </button>

          <div className="text-xs font-mono text-slate-400">
            Etapa <strong className="text-slate-700 dark:text-slate-200">{activeStep + 1}</strong> de {steps.length}
          </div>

          {activeStep < steps.length - 1 ? (
            <button
              onClick={() => setActiveStep((prev) => Math.min(steps.length - 1, prev + 1))}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition cursor-pointer"
            >
              <span>Próximo Passo</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Concluir Leitura</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
