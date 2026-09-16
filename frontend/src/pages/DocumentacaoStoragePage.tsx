import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Printer,
  ArrowLeft,
  Cloud,
  Server,
  Lock,
  BookOpen,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Header } from '../components/layout/Header'
import { DocumentacaoStorageTOC, TOPICOS_STORAGE } from '../components/documentacao-storage/DocumentacaoStorageTOC'
import { DocumentacaoStoragePratico } from '../components/documentacao-storage/DocumentacaoStoragePratico'
import { DocumentacaoStorageTecnico } from '../components/documentacao-storage/DocumentacaoStorageTecnico'

interface DocumentacaoStoragePageProps {
  defaultAba?: 'geral' | 'admin'
}

export function DocumentacaoStoragePage({ defaultAba }: DocumentacaoStoragePageProps) {
  const { user, isEmpresaGerente } = useAuth()
  const [topicoAtivo, setTopicoAtivo] = useState<string>('o-que-e-cloud-storage')
  const isManualScrollRef = useRef(false)
  const manualScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Verifica permissão administrativa
  const isEmpresaAdmin = Boolean(
    isEmpresaGerente || user?.role === 'EMPRESA_ADMIN' || user?.is_superuser
  )

  // Deslocamento suave com compensação do cabeçalho fixo (idêntico ao DocumentacaoAuditoriaPage de referência)
  const handleSelectTopico = useCallback((id: string) => {
    setTopicoAtivo(id)
    const el = document.getElementById(id)
    if (el) {
      isManualScrollRef.current = true
      if (manualScrollTimeoutRef.current) {
        clearTimeout(manualScrollTimeoutRef.current)
      }

      const headerOffset = 84 // Altura do cabeçalho fixo (64px) + margem confortável de respiro (20px)
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

  // Scrollspy: detecta a seção em visualização ativa com precisão
  useEffect(() => {
    const handleScroll = () => {
      if (isManualScrollRef.current) return

      const scrollY = window.pageYOffset || document.documentElement.scrollTop

      // Se estiver no topo (área do hero), ativa o primeiro tópico
      if (scrollY < 200) {
        setTopicoAtivo(TOPICOS_STORAGE[0].id)
        return
      }

      const ids = TOPICOS_STORAGE.map((t) => t.id)
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

  // Se a rota ou prop vier com defaultAba = admin, rola diretamente até a seção técnica
  useEffect(() => {
    if (defaultAba === 'admin') {
      const timer = setTimeout(() => {
        handleSelectTopico('arquitetura-tecnica')
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [defaultAba, handleSelectTopico])

  const handleImprimir = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col antialiased">
      {/* 1. Cabeçalho Principal do Sistema (Fixo sticky top-0) */}
      <div className="print:hidden">
        <Header />
      </div>

      {/* 2. Hero Section / Banner da Documentação de Storage */}
      <section className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 pt-8 pb-10 print:border-none print:py-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 text-xs font-extrabold mb-3">
                <Cloud className="w-3.5 h-3.5" />
                <span>SHM Cloud Storage &amp; Google Drive (5 TB)</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                Manual do Cloud Storage &amp; Administração Forense
              </h1>
              <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                Arquitetura Dual-Storage: persistência ágil em VPS somada ao arquivamento perene na nuvem corporativa de 5 Terabytes do Google. Guia completo para clientes, gestores e engenheiros.
              </p>

              {/* Acessos Rápidos por Seção */}
              <div className="mt-5 flex items-center gap-2.5 flex-wrap print:hidden">
                <button
                  onClick={() => handleSelectTopico('o-que-e-cloud-storage')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 text-xs font-bold transition border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Manual Prático (Operacional)</span>
                </button>

                <button
                  onClick={() => handleSelectTopico('arquitetura-tecnica')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-800 dark:text-purple-300 text-xs font-bold transition border border-purple-200 dark:border-purple-800/60 cursor-pointer"
                >
                  {isEmpresaAdmin ? <Server className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> : <Lock className="w-3.5 h-3.5 text-amber-500" />}
                  <span>Manual Técnico &amp; Comandos CLI (Admin)</span>
                </button>
              </div>
            </div>

            {/* Ações Rápidas (Impressão e Voltar) */}
            <div className="flex flex-wrap md:flex-col gap-2.5 shrink-0 print:hidden">
              <button
                onClick={handleImprimir}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 text-xs font-extrabold shadow-2xs transition cursor-pointer"
                title="Imprimir manual completo em PDF"
              >
                <Printer className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span>Imprimir (PDF)</span>
              </button>

              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-xs transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar ao Painel</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Corpo Principal com Índice Lateral e Conteúdo Sequencial */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 w-full">
        <div className="flex flex-col lg:flex-row gap-8 xl:gap-12 items-stretch">
          {/* Índice Lateral Flutuante Fixo Centralizado Verticalmente (idêntico à página de auditoria) */}
          <div className="print:hidden w-full lg:w-72 xl:w-80 shrink-0 lg:self-stretch">
            <DocumentacaoStorageTOC
              topicoAtivo={topicoAtivo}
              onSelectTopico={handleSelectTopico}
              isEmpresaAdmin={isEmpresaAdmin}
            />
          </div>

          {/* Conteúdo Sequencial com Todas as Seções Disponíveis */}
          <div className="flex-1 min-w-0 max-w-4xl space-y-12">
            {/* Seção Prática Geral (Clientes, Gerentes e Empresa) */}
            <DocumentacaoStoragePratico />

            <hr className="border-slate-200 dark:border-slate-800" />

            {/* Seção Técnica Administrativa (Infraestrutura, OAuth e Comandos CLI) */}
            {isEmpresaAdmin ? (
              <DocumentacaoStorageTecnico />
            ) : (
              <section id="arquitetura-tecnica" className="scroll-mt-24 p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
                <Lock className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">Acesso Restrito aos Administradores</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Os tópicos avançados de arquitetura forense, matriz ACL, rotação de chaves OAuth 2.0 e ferramentas CLI da conta corporativa de 5 TB são reservados exclusivamente para a equipe de administração do sistema.
                </p>
              </section>
            )}

            {/* Rodapé Interno da Documentação */}
            <footer className="mt-16 pt-8 border-t border-slate-200 dark:border-slate-800 text-center sm:text-left text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300">SHM - Support Hours Manager</span>
                <p className="text-[11px] mt-0.5">Módulo Cloud Storage &amp; Google Drive (5 TB)</p>
              </div>
              <div className="flex items-center gap-4 text-[11px]">
                <button
                  onClick={() => {
                    isManualScrollRef.current = true
                    if (manualScrollTimeoutRef.current) {
                      clearTimeout(manualScrollTimeoutRef.current)
                    }
                    setTopicoAtivo('o-que-e-cloud-storage')
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                    manualScrollTimeoutRef.current = setTimeout(() => {
                      isManualScrollRef.current = false
                    }, 1200)
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
