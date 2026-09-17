import React, { useState, useEffect, useRef } from 'react'
import { Navigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Palette,
  Building2,
  Phone,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Globe,
  Mail,
  FileSignature,
  Trash2,
} from 'lucide-react'

import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { AppLayout } from '../components/layout/AppLayout'
import { clientService } from '../api/client'

function formatCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  if (digits.length <= 2) return digits
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
  if (digits.length <= 12)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`
}

export function ConfiguracoesBrandingPage() {
  const { isEmpresaGerente, user } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()

  const isGerenteEmpresa = Boolean(
    isEmpresaGerente || user?.role === 'EMPRESA_ADMIN' || user?.is_superuser
  )

  const logoInputRef = useRef<HTMLInputElement>(null)
  const assinaturaInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    slogan: '',
    endereco_completo: '',
    telefone_suporte: '',
    email_suporte: '',
    url_shm: 'https://shm.empresa.com.br',
    cor_primaria_hex: '#4F46E5',
    representante_nome_completo: '',
    representante_cargo: 'Responsável Técnico',
    representante_documento: '',
    mensagem_rodape_relatorio: '',
  })

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [removerLogo, setRemoverLogo] = useState(false)

  const [assinaturaFile, setAssinaturaFile] = useState<File | null>(null)
  const [assinaturaPreview, setAssinaturaPreview] = useState<string | null>(null)
  const [removerAssinatura, setRemoverAssinatura] = useState(false)

  const { data: config, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['configuracao-branding-admin'],
    queryFn: () => clientService.branding.getAdmin(),
    enabled: isGerenteEmpresa,
  })

  useEffect(() => {
    if (config) {
      setFormData({
        razao_social: config.razao_social || '',
        nome_fantasia: config.nome_fantasia || '',
        cnpj: config.cnpj ? formatCNPJ(config.cnpj) : '',
        slogan: config.slogan || '',
        endereco_completo: config.endereco_completo || '',
        telefone_suporte: config.telefone_suporte ? formatPhone(config.telefone_suporte) : '',
        email_suporte: config.email_suporte || '',
        url_shm: config.url_shm || 'https://shm.empresa.com.br',
        cor_primaria_hex: config.cor_primaria_hex || '#4F46E5',
        representante_nome_completo: config.representante_nome_completo || '',
        representante_cargo: config.representante_cargo || 'Responsável Técnico',
        representante_documento: config.representante_documento || '',
        mensagem_rodape_relatorio: config.mensagem_rodape_relatorio || '',
      })
      setRemoverLogo(false)
      setRemoverAssinatura(false)
      if (config.logotipo_url) {
        setLogoPreview(config.logotipo_url)
      } else {
        setLogoPreview(null)
      }
      if (config.representante_assinatura_url) {
        setAssinaturaPreview(config.representante_assinatura_url)
      } else {
        setAssinaturaPreview(null)
      }
    }
  }, [config])

  const salvarMutation = useMutation({
    mutationFn: async () => {
      const payload = new FormData()
      payload.append('razao_social', formData.razao_social)
      payload.append('nome_fantasia', formData.nome_fantasia)
      payload.append('cnpj', formData.cnpj.replace(/\D/g, ''))
      payload.append('slogan', formData.slogan)
      payload.append('endereco_completo', formData.endereco_completo)
      payload.append('telefone_suporte', formData.telefone_suporte)
      payload.append('email_suporte', formData.email_suporte)
      payload.append('url_shm', formData.url_shm)
      payload.append('cor_primaria_hex', formData.cor_primaria_hex)
      payload.append('representante_nome_completo', formData.representante_nome_completo)
      payload.append('representante_cargo', formData.representante_cargo)
      payload.append('representante_documento', formData.representante_documento)
      payload.append('mensagem_rodape_relatorio', formData.mensagem_rodape_relatorio)

      if (logoFile) {
        payload.append('logotipo', logoFile)
      } else if (removerLogo) {
        payload.append('remover_logotipo', 'true')
      }

      if (assinaturaFile) {
        payload.append('representante_assinatura', assinaturaFile)
      } else if (removerAssinatura) {
        payload.append('remover_assinatura', 'true')
      }

      return clientService.branding.updateAdmin(payload)
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['configuracao-branding-admin'], data)
      queryClient.invalidateQueries({ queryKey: ['branding-publico'] })
      setLogoFile(null)
      setAssinaturaFile(null)
      setRemoverLogo(false)
      setRemoverAssinatura(false)
      toast.success('Configurações de branding salvas com sucesso!')
    },
    onError: (err: any) => {
      const detail = err.response?.data
      if (detail && typeof detail === 'object') {
        const firstKey = Object.keys(detail)[0]
        const firstError = Array.isArray(detail[firstKey]) ? detail[firstKey][0] : detail[firstKey]
        toast.error(`Erro no campo ${firstKey}: ${firstError}`)
      } else {
        toast.error('Falha ao salvar as configurações de branding.')
      }
    },
  })

  if (!isGerenteEmpresa) {
    return <Navigate to="/dashboard" replace />
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('O logotipo não pode exceder 5 MB.')
      return
    }

    setRemoverLogo(false)
    setLogoFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setLogoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoverLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
    setRemoverLogo(true)
    if (logoInputRef.current) {
      logoInputRef.current.value = ''
    }
  }

  const handleAssinaturaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem de assinatura não pode exceder 5 MB.')
      return
    }

    setRemoverAssinatura(false)
    setAssinaturaFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setAssinaturaPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoverAssinatura = () => {
    setAssinaturaFile(null)
    setAssinaturaPreview(null)
    setRemoverAssinatura(true)
    if (assinaturaInputRef.current) {
      assinaturaInputRef.current.value = ''
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    salvarMutation.mutate()
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-16">
        {/* Cabeçalho da Página */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60">
                <Palette className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Personalização de Marca (Branding)
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configure a identidade corporativa, contatos de suporte e dados periciais do representante legal para relatórios e e-mails.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={salvarMutation.isPending}
              className="px-4 py-2 text-xs font-black rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {salvarMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Informação sobre não-retroatividade */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-300 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div className="space-y-0.5 leading-relaxed">
            <span className="font-bold block">Vigência Imediata e Integridade Forense (ISO/IEC 27037)</span>
            <span>
              As alterações salvas são aplicadas instantaneamente em todos os novos downloads do Extrato Oficial de Contratos e comunicados por e-mail. Extratos previamente consolidados e arquivados no storage mantêm seu hash SHA-256 histórico inalterado.
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
            <span className="text-xs font-bold text-slate-500">Carregando configurações de branding...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Bloco 1: Identidade Visual & Mídia */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    1. Identidade Visual da Prestadora
                  </h2>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 w-fit">
                  Exibido no Cabeçalho Superior dos Extratos e no Menu
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Upload do Logotipo */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Logotipo Corporativo (Símbolo / Marca)
                    </label>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Topo Esquerdo do Extrato</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-32 h-20 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center bg-slate-50 dark:bg-slate-800/60 overflow-hidden shrink-0">
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt="Pré-visualização do Logotipo"
                          className="w-full h-full object-contain p-1.5"
                        />
                      ) : (
                        <div className="text-center p-2 text-slate-400">
                          <Upload className="w-5 h-5 mx-auto mb-1 opacity-60" />
                          <span className="text-[9px] font-semibold block">Sem logotipo</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition cursor-pointer"
                        >
                          {logoPreview ? 'Trocar Logotipo' : 'Selecionar Logotipo'}
                        </button>
                        {logoPreview && (
                          <button
                            type="button"
                            onClick={handleRemoverLogo}
                            className="px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition cursor-pointer inline-flex items-center gap-1"
                            title="Remover logotipo corporativo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remover</span>
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                        PNG, JPG, WEBP ou SVG. Limite de 5 MB.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Slogan & Cor Primária */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Slogan Institucional
                    </label>
                    <input
                      type="text"
                      value={formData.slogan}
                      onChange={(e) => setFormData({ ...formData, slogan: e.target.value })}
                      placeholder="Ex: Suporte Sob Medida e Gestão de Horas"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Cor Primária Institucional (Hexadecimal)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={formData.cor_primaria_hex}
                        onChange={(e) => setFormData({ ...formData, cor_primaria_hex: e.target.value })}
                        className="w-9 h-9 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={formData.cor_primaria_hex}
                        onChange={(e) => setFormData({ ...formData, cor_primaria_hex: e.target.value })}
                        placeholder="#4F46E5"
                        maxLength={7}
                        className="w-32 px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bloco 2: Dados Cadastrais & Fiscais */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  2. Dados Fiscais e Cadastrais da Empresa
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Razão Social Completa *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.razao_social}
                    onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                    placeholder="Ex: SHM Tecnologia e Gestão de Contratos Ltda."
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Nome Fantasia / Marca *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nome_fantasia}
                    onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                    placeholder="Ex: SHM Tecnologia"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    CNPJ (Receita Federal)
                  </label>
                  <input
                    type="text"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })}
                    placeholder="XX.XXX.XXX/XXXX-XX"
                    maxLength={18}
                    className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Endereço Completo da Sede
                  </label>
                  <input
                    type="text"
                    value={formData.endereco_completo}
                    onChange={(e) => setFormData({ ...formData, endereco_completo: e.target.value })}
                    placeholder="Ex: Av. Paulista, 1000 - Bela Vista, São Paulo - SP"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  />
                </div>
              </div>
            </div>

            {/* Bloco 3: Canais de Atendimento & Portal */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <Phone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  3. Canais de Suporte e Acesso ao Portal
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Telefone de Suporte / Plantão
                  </label>
                  <input
                    type="text"
                    value={formData.telefone_suporte}
                    onChange={(e) =>
                      setFormData({ ...formData, telefone_suporte: formatPhone(e.target.value) })
                    }
                    placeholder="(XX) XXXXX-XXXX"
                    maxLength={15}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    E-mail Institucional de Suporte
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="email"
                      value={formData.email_suporte}
                      onChange={(e) => setFormData({ ...formData, email_suporte: e.target.value })}
                      placeholder="suporte@empresa.com.br"
                      className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    URL Base do Sistema SHM *
                  </label>
                  <div className="relative">
                    <Globe className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="url"
                      required
                      value={formData.url_shm}
                      onChange={(e) => setFormData({ ...formData, url_shm: e.target.value })}
                      placeholder="https://shm.empresa.com.br"
                      className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bloco 4: Representante Legal & Chancela Pericial */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
                <div className="flex items-center gap-2">
                  <FileSignature className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    4. Representante Legal & Chancela de Relatórios
                  </h2>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 w-fit">
                  Exibido na Linha de Assinatura ao Final dos Extratos
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Nome Completo do Representante
                  </label>
                  <input
                    type="text"
                    value={formData.representante_nome_completo}
                    onChange={(e) =>
                      setFormData({ ...formData, representante_nome_completo: e.target.value })
                    }
                    placeholder="Ex: Carlos Eduardo da Silva"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Cargo ou Função Formal
                  </label>
                  <input
                    type="text"
                    value={formData.representante_cargo}
                    onChange={(e) =>
                      setFormData({ ...formData, representante_cargo: e.target.value })
                    }
                    placeholder="Ex: Diretor de Operações"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Documento (CPF ou Conselho)
                  </label>
                  <input
                    type="text"
                    value={formData.representante_documento}
                    onChange={(e) =>
                      setFormData({ ...formData, representante_documento: e.target.value })
                    }
                    placeholder="Ex: CPF 123.456.789-00 ou CREA/OAB"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              {/* Upload da Imagem de Assinatura/Rubrica */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Rubrica ou Assinatura Digitalizada
                  </label>
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Rodapé Acima da Linha</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-40 h-20 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center bg-slate-50 dark:bg-slate-800/60 overflow-hidden shrink-0">
                    {assinaturaPreview ? (
                      <img
                        src={assinaturaPreview}
                        alt="Pré-visualização da Rubrica"
                        className="w-full h-full object-contain p-1.5"
                      />
                    ) : (
                      <div className="text-center p-2 text-slate-400">
                        <Upload className="w-5 h-5 mx-auto mb-1 opacity-60" />
                        <span className="text-[9px] font-semibold block">Sem rubrica</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <input
                      ref={assinaturaInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleAssinaturaChange}
                      className="hidden"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => assinaturaInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition cursor-pointer"
                      >
                        {assinaturaPreview ? 'Trocar Imagem da Rubrica' : 'Selecionar Imagem da Rubrica'}
                      </button>
                      {assinaturaPreview && (
                        <button
                          type="button"
                          onClick={handleRemoverAssinatura}
                          className="px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition cursor-pointer inline-flex items-center gap-1"
                          title="Remover rubrica/assinatura"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remover</span>
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                      Imagem com fundo transparente recomendada (.png). Máximo 5 MB.
                    </p>
                  </div>
                </div>
              </div>

              {/* Mensagem Institucional de Rodapé */}
              <div className="space-y-1.5 pt-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Mensagem Adicional de Rodapé nos Extratos
                </label>
                <textarea
                  rows={2}
                  value={formData.mensagem_rodape_relatorio}
                  onChange={(e) =>
                    setFormData({ ...formData, mensagem_rodape_relatorio: e.target.value })
                  }
                  placeholder="Ex: Documento assinado eletronicamente com validação de integridade criptográfica conforme a ICP-Brasil e ISO 27037."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition resize-none"
                />
              </div>
            </div>

            {/* Rodapé com Botão de Ação Salvar */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={salvarMutation.isPending}
                className="px-6 py-2.5 text-xs font-black rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/25 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {salvarMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando alterações de branding...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Salvar Configurações de Branding</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  )
}
