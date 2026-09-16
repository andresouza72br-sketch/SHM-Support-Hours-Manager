import { useRef, useState, useEffect, type ComponentType } from 'react'
import {
  Cloud,
  FolderOpen,
  FolderTree,
  ShieldCheck,
  RefreshCw,
  HelpCircle,
  Server,
  KeyRound,
  Terminal,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react'

export interface TopicoStorage {
  id: string
  numero: number
  titulo: string
  subtitulo: string
  nivel: 'geral' | 'admin'
  icone: ComponentType<{ className?: string }>
}

export const TOPICOS_STORAGE: TopicoStorage[] = [
  // Manual Prático (Geral)
  {
    id: 'o-que-e-cloud-storage',
    numero: 1,
    titulo: 'O que é o Storage Híbrido',
    subtitulo: 'Dual-Storage: VPS rápida + Google Drive 5 TB permanente',
    nivel: 'geral',
    icone: Cloud,
  },
  {
    id: 'onde-achar-pasta',
    numero: 2,
    titulo: 'Onde Achar sua Pasta no Drive',
    subtitulo: 'Localização em "Partilhados comigo" e atalho na tela inicial',
    nivel: 'geral',
    icone: FolderOpen,
  },
  {
    id: 'organizacao-anexos',
    numero: 3,
    titulo: 'Organização dos Anexos',
    subtitulo: 'Subpastas pedidos/ e comunicacao/, prazos e sincronização',
    nivel: 'geral',
    icone: FolderTree,
  },
  {
    id: 'seguranca-privacidade',
    numero: 4,
    titulo: 'Permissões e Privacidade',
    subtitulo: 'Acesso leitor (role: reader), isolamento e sem links públicos',
    nivel: 'geral',
    icone: ShieldCheck,
  },
  {
    id: 'troca-gmail-cliente',
    numero: 5,
    titulo: 'Troca de E-mail do Cliente',
    subtitulo: 'Procedimento seguro com revogação atômica e auditoria',
    nivel: 'geral',
    icone: RefreshCw,
  },
  {
    id: 'faq-duvidas',
    numero: 6,
    titulo: 'Perguntas Frequentes (FAQ)',
    subtitulo: 'Respostas para as dúvidas mais comuns de clientes e gerentes',
    nivel: 'geral',
    icone: HelpCircle,
  },

  // Manual Técnico (Admin)
  {
    id: 'arquitetura-tecnica',
    numero: 7,
    titulo: 'Arquitetura e Pipeline Assíncrono',
    subtitulo: 'Dual-Storage, signals post_save, threads e hash SHA-256',
    nivel: 'admin',
    icone: Server,
  },
  {
    id: 'modelo-seguranca-acl',
    numero: 8,
    titulo: 'Governança ACL do Google Drive',
    subtitulo: 'Menor privilégio, matriz de roles e bloqueio de links anyone',
    nivel: 'admin',
    icone: KeyRound,
  },
  {
    id: 'troca-conta-shm',
    numero: 9,
    titulo: 'Troca da Conta Corporativa SHM (5 TB)',
    subtitulo: 'Playbook de migração segura de posse e re-provisionamento',
    nivel: 'admin',
    icone: RefreshCw,
  },
  {
    id: 'comandos-cli',
    numero: 10,
    titulo: 'Guia de Comandos CLI',
    subtitulo: 'Diagnóstico, auditoria de permissões e sincronização em lote',
    nivel: 'admin',
    icone: Terminal,
  },
  {
    id: 'tratamento-erros-api',
    numero: 11,
    titulo: 'Matriz de Erros Google Drive API',
    subtitulo: 'Resolução de 401, 403 Rate Limit, 404 e cotas diárias',
    nivel: 'admin',
    icone: AlertTriangle,
  },
]

interface DocumentacaoStorageTOCProps {
  topicoAtivo: string
  abaAtiva?: 'geral' | 'admin'
  onSelectTopico: (id: string) => void
  isEmpresaAdmin: boolean
}

export function DocumentacaoStorageTOC({
  topicoAtivo,
  onSelectTopico,
  isEmpresaAdmin,
}: DocumentacaoStorageTOCProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [topOffset, setTopOffset] = useState<string>('calc(50vh - 240px)')

  // Auto-posicionamento vertical flutuante idêntico ao DocumentacaoSidebarTOC de referência
  useEffect(() => {
    const updatePosition = () => {
      if (containerRef.current) {
        const height = containerRef.current.offsetHeight
        if (height > 0) {
          const halfHeight = Math.round(height / 2)
          setTopOffset(`max(5rem, calc(50vh - ${halfHeight}px))`)
        }
      }
    }

    updatePosition()
    const rafId = requestAnimationFrame(updatePosition)
    window.addEventListener('resize', updatePosition)
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', updatePosition)
    }
  }, [])

  return (
    <aside className="w-full lg:w-72 xl:w-80 shrink-0 lg:h-full">
      {/* Versão Desktop (Flutuante Fixo Centralizado Verticalmente) */}
      <div
        ref={containerRef}
        style={{ top: topOffset }}
        className="hidden lg:block sticky z-20 transition-[top] duration-150"
      >
        <div className="p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-slate-800/90 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/60 max-h-[calc(100vh-5.5rem)] overflow-y-auto">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Índice do Storage (5 TB)
              </h3>
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              {TOPICOS_STORAGE.length} seções
            </span>
          </div>

          <nav className="space-y-1.5" aria-label="Tópicos do manual de storage">
            {TOPICOS_STORAGE.map((t) => {
              const Icone = t.icone
              const isAtivo = topicoAtivo === t.id
              const isTecnico = t.nivel === 'admin'

              return (
                <button
                  key={t.id}
                  onClick={() => onSelectTopico(t.id)}
                  className={`w-full group text-left p-2.5 rounded-xl transition-all duration-150 flex items-start gap-3 cursor-pointer ${
                    isAtivo
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 shadow-xs ring-1 ring-indigo-500/20'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <div
                    className={`mt-0.5 p-1.5 rounded-lg shrink-0 transition-colors ${
                      isAtivo
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                    }`}
                  >
                    <Icone className="w-3.5 h-3.5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {t.numero.toString().padStart(2, '0')}
                      </span>
                      <span
                        className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border ${
                          isTecnico
                            ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/40'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/40'
                        }`}
                      >
                        {isTecnico ? (!isEmpresaAdmin ? 'Restrito' : 'Técnico') : 'Prático'}
                      </span>
                    </div>
                    <div className="text-xs font-bold leading-snug line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                      {t.titulo}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight line-clamp-1 mt-0.5">
                      {t.subtitulo}
                    </div>
                  </div>
                </button>
              )
            })}
          </nav>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span className="font-medium">Dual-Storage Híbrido</span>
            <span className="font-black text-indigo-600 dark:text-indigo-400">Drive 5 TB + VPS</span>
          </div>
        </div>
      </div>

      {/* Versão Mobile (Dropdown seletor no topo) */}
      <div className="block lg:hidden mb-6">
        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <label htmlFor="mobile-storage-toc" className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Navegar pelos Tópicos do Storage (5 TB):
          </label>
          <div className="relative">
            <select
              id="mobile-storage-toc"
              value={topicoAtivo}
              onChange={(e) => onSelectTopico(e.target.value)}
              className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 pr-8 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {TOPICOS_STORAGE.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.numero}. {t.titulo} ({t.nivel === 'admin' ? (!isEmpresaAdmin ? 'Restrito' : 'Técnico') : 'Prático'})
                </option>
              ))}
            </select>
            <ChevronRight className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
          </div>
        </div>
      </div>
    </aside>
  )
}
