import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Printer, Download, ArrowLeft, Sparkles, Lock, LogIn } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Header } from '../components/layout/Header'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { DocumentacaoSidebarTOC, TOPICOS_DOCUMENTACAO } from '../components/documentacao/DocumentacaoSidebarTOC'
import { DocumentacaoConteudoGeral } from '../components/documentacao/DocumentacaoConteudoGeral'
import { DocumentacaoConteudoPericial } from '../components/documentacao/DocumentacaoConteudoPericial'
import { downloadScriptVerificador } from '../utils/verificador_script'

interface DocumentacaoAuditoriaPageProps {
  isPublicView?: boolean
}

export function DocumentacaoAuditoriaPage({ isPublicView = false }: DocumentacaoAuditoriaPageProps) {
  const { user } = useAuth()
  const [topicoAtivo, setTopicoAtivo] = useState<string>('fundamentos-shm')
  const isManualScrollRef = useRef(false)
  const manualScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Scrollspy: detecta a seção em visualização ativa com precisão milimétrica
  useEffect(() => {
    const handleScroll = () => {
      if (isManualScrollRef.current) return

      const scrollY = window.pageYOffset || document.documentElement.scrollTop

      // Se estiver no topo (área do hero), ativa o primeiro tópico
      if (scrollY < 200) {
        setTopicoAtivo(TOPICOS_DOCUMENTACAO[0].id)
        return
      }

      const ids = TOPICOS_DOCUMENTACAO.map((t) => t.id)
      const scrollPosition = scrollY + 140

      for (let i = ids.length - 1; i >= 0; i--) {
        const el = document.getElementById(ids[i])
        if (el) {
          const top = el.getBoundingClientRect().top + scrollY
          if (top <= scrollPosition) {
            setTopicoAtivo(ids[i])
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (manualScrollTimeoutRef.current) {
        clearTimeout(manualScrollTimeoutRef.current)
      }
    }
  }, [])

  // Deslocamento suave com compensação do cabeçalho fixo
  const handleSelectTopico = useCallback((id: string) => {
    setTopicoAtivo(id)
    const el = document.getElementById(id)
    if (el) {
      isManualScrollRef.current = true
      if (manualScrollTimeoutRef.current) {
        clearTimeout(manualScrollTimeoutRef.current)
      }

      const headerOffset = 84 // Altura do cabeçalho (64px) + margem confortável de respiro (20px)
      const elementPosition = el.getBoundingClientRect().top
      const currentScroll = window.pageYOffset || document.documentElement.scrollTop
      const offsetPosition = elementPosition + currentScroll - headerOffset

      window.scrollTo({
        top: Math.max(0, offsetPosition),
        behavior: 'smooth',
      })

      // Reativa o scrollspy após a conclusão da animação suave de transição
      manualScrollTimeoutRef.current = setTimeout(() => {
        isManualScrollRef.current = false
      }, 1200)
    }
  }, [])

  const handleImprimir = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col antialiased">
      {/* 1. Cabeçalho Condicional (Autenticado com Header oficial ou Público Institucional) */}
      {!isPublicView && user ? (
        <div className="print:hidden">
          <Header />
        </div>
      ) : (
        <header className="print:hidden w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-2xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
            <Link to={user ? "/dashboard" : "/login"} className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center font-black text-white text-lg shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
                S
              </div>
              <div>
                <span className="font-black text-slate-900 dark:text-white text-base tracking-tight leading-none block">
                  SHM
                </span>
                <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 tracking-wider uppercase leading-none mt-0.5 block">
                  Auditoria & Governança
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              <div
                title="Página Pública de Consulta Pericial"
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-800/60 text-purple-800 dark:text-purple-300 text-[11px] font-bold shadow-2xs cursor-default"
              >
                <Lock className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                <span>Acesso Pericial Aberto</span>
              </div>

              <ThemeToggle size="sm" />

              {user ? (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Voltar ao Painel</span>
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Entrar no SHM</span>
                </Link>
              )}
            </div>
          </div>
        </header>
      )}

      {/* 2. Hero Section / Banner da Documentação */}
      <section className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 pt-8 pb-10 print:border-none print:py-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 text-xs font-extrabold mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Documentação Oficial de Engenharia Forense</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                Trilha de Auditoria Forense &amp; Imutabilidade
              </h1>
              <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                Fundamentos matemáticos, encadeamento de hashes (RFC 8785 / SHA-256), enquadramento no Código de Processo Penal e manual pericial completo para auditorias independentes.
              </p>

              {/* Badges de Normas e Conformidade */}
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                {['RFC 8785 (JCS)', 'FIPS 180-4 (SHA-256)', 'CPP Arts. 158-A a F', 'CPC 411/422', 'ISO/IEC 27037'].map((norma) => (
                  <span
                    key={norma}
                    className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold border border-slate-200 dark:border-slate-700"
                  >
                    {norma}
                  </span>
                ))}
              </div>
            </div>

            {/* Ações Rápidas (Impressão e Download do Script) */}
            <div className="flex flex-wrap md:flex-col gap-2.5 shrink-0 print:hidden">
              <button
                onClick={handleImprimir}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 text-xs font-extrabold shadow-2xs transition cursor-pointer"
                title="Imprimir laudo completo em PDF"
              >
                <Printer className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span>Imprimir Laudo (PDF)</span>
              </button>

              <button
                onClick={() => downloadScriptVerificador()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-xs transition cursor-pointer"
                title="Baixar ferramenta de verificação offline para peritos"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Script (.py)</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Corpo Principal com Índice Lateral e Conteúdo */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 w-full">
        <div className="flex flex-col lg:flex-row gap-8 xl:gap-12 items-stretch">
          {/* Índice Lateral Flutuante Fixo Centralizado Verticalmente */}
          <div className="print:hidden w-full lg:w-72 xl:w-80 shrink-0 lg:self-stretch">
            <DocumentacaoSidebarTOC
              topicoAtivo={topicoAtivo}
              onSelectTopico={handleSelectTopico}
            />
          </div>

          {/* Conteúdo Sequencial com Todas as Seções */}
          <div className="flex-1 min-w-0 max-w-4xl space-y-12">
            <DocumentacaoConteudoGeral />
            <hr className="border-slate-200 dark:border-slate-800" />
            <DocumentacaoConteudoPericial />

            {/* Rodapé Interno da Documentação */}
            <footer className="mt-16 pt-8 border-t border-slate-200 dark:border-slate-800 text-center sm:text-left text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300">SHM - Support Hours Manager</span>
                <p className="text-[11px] mt-0.5">Versão 2.5 • Módulo Forense Criptográfico</p>
              </div>
              <div className="flex items-center gap-4 text-[11px]">
                <button
                  onClick={() => {
                    isManualScrollRef.current = true
                    if (manualScrollTimeoutRef.current) {
                      clearTimeout(manualScrollTimeoutRef.current)
                    }
                    setTopicoAtivo('fundamentos-shm')
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                    manualScrollTimeoutRef.current = setTimeout(() => {
                      isManualScrollRef.current = false
                    }, 800)
                  }}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer font-bold"
                >
                  Voltar ao topo ↑
                </button>
              </div>
            </footer>
          </div>
        </div>
      </main>
    </div>
  )
}
