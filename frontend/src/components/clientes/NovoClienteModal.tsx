import React, { useState, useEffect, useRef } from 'react'
import {
  Building2,
  X,
  User,
  MapPin,
  Image as ImageIcon,
  Users,
  Mail,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  Upload,
  Search,
  ExternalLink,
  Phone,
  Globe,
  Sparkles,
  CheckCircle2,
  Cloud,
} from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { clientService } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import type { Cliente, EmailNotificacao, StatusCliente } from '../../types'
import { ScrollToTopButton } from '../ui/ScrollToTopButton'

interface NovoClienteModalProps {
  isOpen: boolean
  onClose: () => void
  clienteParaEditar?: Cliente | null
  onOpenUsuariosModal?: (cliente: Cliente) => void
}

type TabType = 'geral' | 'contato' | 'endereco' | 'branding' | 'usuarios' | 'notificacoes' | 'governanca'
const TABS: TabType[] = ['geral', 'contato', 'endereco', 'branding', 'usuarios', 'notificacoes', 'governanca']

export function NovoClienteModal({
  isOpen,
  onClose,
  clienteParaEditar,
  onOpenUsuariosModal,
}: NovoClienteModalProps) {
  const toast = useToast()
  const formScrollRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const isEditing = Boolean(clienteParaEditar)

  const [activeTab, setActiveTab] = useState<TabType>('geral')
  const [error, setError] = useState<string | null>(null)
  const [loadingCep, setLoadingCep] = useState(false)

  // Form states - Geral
  const [tipo, setTipo] = useState<'PJ' | 'PF'>('PJ')
  const [razaoSocial, setRazaoSocial] = useState('')
  const [nomeFantasia, setNomeFantasia] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [inscricaoEstadual, setInscricaoEstadual] = useState('')
  const [inscricaoMunicipal, setInscricaoMunicipal] = useState('')
  const [ramoAtividade, setRamoAtividade] = useState('')

  const [nomeCompleto, setNomeCompleto] = useState('')
  const [cpf, setCpf] = useState('')
  const [rg, setRg] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')

  // Contato
  const [pessoaContato, setPessoaContato] = useState('')
  const [cargoContato, setCargoContato] = useState('')
  const [emailContato, setEmailContato] = useState('')
  const [telefone, setTelefone] = useState('')
  const [celularWhatsapp, setCelularWhatsapp] = useState('')
  const [siteUrl, setSiteUrl] = useState('')
  const [emailGoogleDrive, setEmailGoogleDrive] = useState('')

  // Endereço
  const [cep, setCep] = useState('')
  const [logradouro, setLogradouro] = useState('')
  const [numero, setNumero] = useState('')
  const [complemento, setComplemento] = useState('')
  const [bairro, setBairro] = useState('')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')
  const [pais, setPais] = useState('Brasil')

  // Branding
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [corPrimaria, setCorPrimaria] = useState('#4f46e5')

  // E-mails Padrão de Notificação
  const [emailsNotificacao, setEmailsNotificacao] = useState<EmailNotificacao[]>([])
  const [novoEmailInput, setNovoEmailInput] = useState('')
  const [novoNomeInput, setNovoNomeInput] = useState('')

  // Governança
  const [statusCliente, setStatusCliente] = useState<StatusCliente>('ativo')
  const [motivoBloqueio, setMotivoBloqueio] = useState('')
  const [observacoesInternas, setObservacoesInternas] = useState('')

  // Populate data when opening/editing
  useEffect(() => {
    if (clienteParaEditar) {
      setTipo(clienteParaEditar.tipo || 'PJ')
      setRazaoSocial(clienteParaEditar.razao_social || '')
      setNomeFantasia(clienteParaEditar.nome_fantasia || '')
      setCnpj(clienteParaEditar.cnpj || '')
      setInscricaoEstadual(clienteParaEditar.inscricao_estadual || '')
      setInscricaoMunicipal(clienteParaEditar.inscricao_municipal || '')
      setRamoAtividade(clienteParaEditar.ramo_atividade || '')

      setNomeCompleto(clienteParaEditar.nome_completo || '')
      setCpf(clienteParaEditar.cpf || '')
      setRg(clienteParaEditar.rg || '')
      setDataNascimento(clienteParaEditar.data_nascimento || '')

      setPessoaContato(clienteParaEditar.pessoa_contato || '')
      setCargoContato(clienteParaEditar.cargo_contato || '')
      setEmailContato(clienteParaEditar.email_contato || '')
      setTelefone(clienteParaEditar.telefone || '')
      setCelularWhatsapp(clienteParaEditar.celular_whatsapp || '')
      setSiteUrl(clienteParaEditar.site_url || '')
      setEmailGoogleDrive(clienteParaEditar.email_google_drive || '')

      setCep(clienteParaEditar.cep || '')
      setLogradouro(clienteParaEditar.logradouro || '')
      setNumero(clienteParaEditar.numero || '')
      setComplemento(clienteParaEditar.complemento || '')
      setBairro(clienteParaEditar.bairro || '')
      setCidade(clienteParaEditar.cidade || '')
      setEstado(clienteParaEditar.estado || '')
      setPais(clienteParaEditar.pais || 'Brasil')

      setLogoFile(null)
      setLogoPreview(clienteParaEditar.logo_url || null)
      setCorPrimaria(clienteParaEditar.cor_primaria_hex || '#4f46e5')

      setEmailsNotificacao(
        Array.isArray(clienteParaEditar.emails_notificacao_padrao)
          ? clienteParaEditar.emails_notificacao_padrao
          : []
      )

      setStatusCliente(clienteParaEditar.status || 'ativo')
      setMotivoBloqueio(clienteParaEditar.motivo_bloqueio || '')
      setObservacoesInternas(clienteParaEditar.observacoes_internas || '')
    } else {
      // Defaults for new client
      setTipo('PJ')
      setRazaoSocial('')
      setNomeFantasia('')
      setCnpj('')
      setInscricaoEstadual('')
      setInscricaoMunicipal('')
      setRamoAtividade('')

      setNomeCompleto('')
      setCpf('')
      setRg('')
      setDataNascimento('')

      setPessoaContato('')
      setCargoContato('')
      setEmailContato('')
      setTelefone('')
      setCelularWhatsapp('')
      setSiteUrl('')
      setEmailGoogleDrive('')

      setCep('')
      setLogradouro('')
      setNumero('')
      setComplemento('')
      setBairro('')
      setCidade('')
      setEstado('')
      setPais('Brasil')

      setLogoFile(null)
      setLogoPreview(null)
      setCorPrimaria('#4f46e5')
      setEmailsNotificacao([])
      setStatusCliente('pendente_aprovacao')
      setMotivoBloqueio('')
      setObservacoesInternas('')
    }
    setActiveTab('geral')
    setError(null)
  }, [clienteParaEditar, isOpen])

  // ViaCEP integration
  const handleBuscarCep = async (cepValue: string) => {
    const limpo = cepValue.replace(/\D/g, '')
    if (limpo.length !== 8) return

    setLoadingCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`)
      const data = await res.json()
      if (data.erro) {
        toast.info('CEP não encontrado na base dos Correios.', 'CEP')
      } else {
        setLogradouro(data.logradouro || '')
        setBairro(data.bairro || '')
        setCidade(data.localidade || '')
        setEstado(data.uf || '')
        toast.success(`Endereço localizado: ${data.localidade} - ${data.uf}`, 'ViaCEP')
      }
    } catch {
      toast.error('Erro ao consultar CEP via ViaCEP.', 'Falha')
    } finally {
      setLoadingCep(false)
    }
  }

  // Handle Logo file select
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.size > 5 * 1024 * 1024) {
        toast.error('A imagem da logo não pode exceder 5MB.', 'Arquivo Muito Grande')
        return
      }
      setLogoFile(file)
      setLogoPreview(URL.createObjectURL(file))
    }
  }

  // Add email to default notifications
  const handleAddEmail = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const emailLimpo = novoEmailInput.trim().toLowerCase()
    if (!emailLimpo) return

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailLimpo)) {
      setError('Por favor, informe um e-mail válido.')
      return
    }

    if (emailsNotificacao.some((item) => item.email.toLowerCase() === emailLimpo)) {
      setError('Este e-mail já foi adicionado na lista.')
      return
    }

    setEmailsNotificacao((prev) => [
      ...prev,
      { email: emailLimpo, nome: novoNomeInput.trim() || undefined, ativo: true },
    ])
    setNovoEmailInput('')
    setNovoNomeInput('')
    setError(null)
  }

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData()
      formData.append('tipo', tipo)

      if (tipo === 'PJ') {
        formData.append('razao_social', razaoSocial.trim())
        formData.append('nome_fantasia', nomeFantasia.trim() || razaoSocial.trim())
        formData.append('cnpj', cnpj.trim())
        if (inscricaoEstadual) formData.append('inscricao_estadual', inscricaoEstadual.trim())
        if (inscricaoMunicipal) formData.append('inscricao_municipal', inscricaoMunicipal.trim())
        if (ramoAtividade) formData.append('ramo_atividade', ramoAtividade.trim())
      } else {
        formData.append('nome_completo', nomeCompleto.trim())
        formData.append('cpf', cpf.trim())
        if (rg) formData.append('rg', rg.trim())
        if (dataNascimento) formData.append('data_nascimento', dataNascimento)
      }

      formData.append('email_contato', emailContato.trim().toLowerCase())
      if (pessoaContato) formData.append('pessoa_contato', pessoaContato.trim())
      if (cargoContato) formData.append('cargo_contato', cargoContato.trim())
      if (telefone) formData.append('telefone', telefone.trim())
      if (celularWhatsapp) formData.append('celular_whatsapp', celularWhatsapp.trim())
      if (siteUrl) formData.append('site_url', siteUrl.trim())
      if (emailGoogleDrive) formData.append('email_google_drive', emailGoogleDrive.trim().toLowerCase())

      if (cep) formData.append('cep', cep.trim())
      if (logradouro) formData.append('logradouro', logradouro.trim())
      if (numero) formData.append('numero', numero.trim())
      if (complemento) formData.append('complemento', complemento.trim())
      if (bairro) formData.append('bairro', bairro.trim())
      if (cidade) formData.append('cidade', cidade.trim())
      if (estado) formData.append('estado', estado.trim().toUpperCase())
      if (pais) formData.append('pais', pais.trim())

      if (corPrimaria) formData.append('cor_primaria_hex', corPrimaria)
      formData.append('emails_notificacao_padrao', JSON.stringify(emailsNotificacao))
      formData.append('status', statusCliente)
      if (motivoBloqueio) formData.append('motivo_bloqueio', motivoBloqueio.trim())
      if (observacoesInternas) formData.append('observacoes_internas', observacoesInternas.trim())

      if (logoFile) {
        formData.append('logo', logoFile)
      }

      if (isEditing && clienteParaEditar) {
        return clientService.clientes.update(clienteParaEditar.id, formData)
      } else {
        return clientService.clientes.create(formData)
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      queryClient.invalidateQueries({ queryKey: ['clientes_select'] })
      toast.success(
        `Cliente ${data.display_name} ${isEditing ? 'atualizado' : 'cadastrado'} com sucesso!`,
        isEditing ? 'Cliente Atualizado' : 'Cliente Criado'
      )
      onClose()
    },
    onError: (err: any) => {
      const data = err.response?.data
      if (data && typeof data === 'object') {
        const firstKey = Object.keys(data)[0]
        const val = data[firstKey]
        setError(`${firstKey}: ${Array.isArray(val) ? val[0] : val}`)
      } else {
        setError('Erro ao salvar cadastro do cliente. Verifique os campos.')
      }
    },
  })

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (tipo === 'PJ') {
      if (!razaoSocial.trim()) {
        setError('Por favor, informe a Razão Social da empresa.')
        setActiveTab('geral')
        return
      }
      if (!cnpj.trim()) {
        setError('Por favor, informe o CNPJ da empresa.')
        setActiveTab('geral')
        return
      }
    } else {
      if (!nomeCompleto.trim()) {
        setError('Por favor, informe o Nome Completo da pessoa física.')
        setActiveTab('geral')
        return
      }
      if (!cpf.trim()) {
        setError('Por favor, informe o CPF da pessoa física.')
        setActiveTab('geral')
        return
      }
    }

    if (!emailContato.trim()) {
      setError('Por favor, informe o E-mail Principal de contato.')
      setActiveTab('contato')
      return
    }

    setError(null)
    saveMutation.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full h-[670px] max-h-[92vh] flex flex-col overflow-hidden transition-all">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/20 shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                {isEditing ? `Editar Cliente: ${clienteParaEditar?.display_name}` : 'Cadastro de Novo Cliente'}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Organizações tomadoras, contatos fiscais, endereço com busca ViaCEP e equipe de acesso
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 sm:px-6 pt-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-1 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('geral')}
            className={`pb-3 px-2 sm:px-3 text-xs font-black border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'geral'
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Dados Fiscais</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contato')}
            className={`pb-3 px-2 sm:px-3 text-xs font-black border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'contato'
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Gestor</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('endereco')}
            className={`pb-3 px-2 sm:px-3 text-xs font-black border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'endereco'
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Endereço</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('branding')}
            className={`pb-3 px-2 sm:px-3 text-xs font-black border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'branding'
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Branding</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('usuarios')}
            className={`pb-3 px-2 sm:px-3 text-xs font-black border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'usuarios'
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Usuários</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notificacoes')}
            className={`pb-3 px-2 sm:px-3 text-xs font-black border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'notificacoes'
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Notificações</span>
            {emailsNotificacao.length > 0 && (
              <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 px-1.5 py-0.2 rounded-full font-bold">
                {emailsNotificacao.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('governanca')}
            className={`pb-3 px-2 sm:px-3 text-xs font-black border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'governanca'
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Status</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-2xl text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="relative flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
          <ScrollToTopButton
            targetRef={formScrollRef}
            title="Rolar para o início do formulário"
            className="absolute top-4 right-6 z-20"
          />
          <div ref={formScrollRef} className="flex-1 min-h-0 overflow-y-auto p-6 sm:p-8 flex flex-col justify-center scroll-smooth">
            <div className="w-full max-w-3xl mx-auto my-auto">
              {/* TAB 1: DADOS GERAIS & FISCAIS */}
              {activeTab === 'geral' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* PJ / PF Switcher */}
              <div>
                <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-2">
                  Tipo de Personalidade Jurídica <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3 max-w-sm">
                  <button
                    type="button"
                    onClick={() => setTipo('PJ')}
                    className={`py-2.5 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer border ${
                      tipo === 'PJ'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Pessoa Jurídica (PJ)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipo('PF')}
                    className={`py-2.5 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer border ${
                      tipo === 'PF'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span>Pessoa Física (PF)</span>
                  </button>
                </div>
              </div>

              {tipo === 'PJ' ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
                        CNPJ <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="00.000.000/0001-00"
                        value={cnpj}
                        onChange={(e) => setCnpj(e.target.value)}
                        className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
                        Razão Social <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Tellin Soluções Tecnológicas Ltda"
                        value={razaoSocial}
                        onChange={(e) => setRazaoSocial(e.target.value)}
                        className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
                        Nome Fantasia (Exibição Principal) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Tellin Tech"
                        value={nomeFantasia}
                        onChange={(e) => setNomeFantasia(e.target.value)}
                        className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
                        Ramo de Atividade / Segmento
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Software & Cloud, Varejo, Saúde, Finanças"
                        value={ramoAtividade}
                        onChange={(e) => setRamoAtividade(e.target.value)}
                        className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
                        Inscrição Estadual (IE) <span className="text-slate-400 font-normal">(opcional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 123.456.789.110 ou Isento"
                        value={inscricaoEstadual}
                        onChange={(e) => setInscricaoEstadual(e.target.value)}
                        className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
                        Inscrição Municipal (IM) <span className="text-slate-400 font-normal">(opcional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 98765432-1"
                        value={inscricaoMunicipal}
                        onChange={(e) => setInscricaoMunicipal(e.target.value)}
                        className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
                        CPF <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="000.000.000-00"
                        value={cpf}
                        onChange={(e) => setCpf(e.target.value)}
                        className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
                        Nome Completo <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: João da Silva"
                        value={nomeCompleto}
                        onChange={(e) => setNomeCompleto(e.target.value)}
                        className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
                        RG / Órgão Emissor <span className="text-slate-400 font-normal">(opcional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 12.345.678-9 SSP/SP"
                        value={rg}
                        onChange={(e) => setRg(e.target.value)}
                        className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
                        Data de Nascimento <span className="text-slate-400 font-normal">(opcional)</span>
                      </label>
                      <input
                        type="date"
                        value={dataNascimento}
                        onChange={(e) => setDataNascimento(e.target.value)}
                        className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 2: CONTATOS & GESTOR */}
          {activeTab === 'contato' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-600" />
                  <span>Ponto Focal / Gestor Principal da Conta</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-black text-slate-800 dark:text-slate-200 mb-1">
                      Nome do Gestor / Responsável <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Carlos Eduardo"
                      value={pessoaContato}
                      onChange={(e) => setPessoaContato(e.target.value)}
                      className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-slate-800 dark:text-slate-200 mb-1">
                      Cargo / Função
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Diretor de Tecnologia, Gerente de TI"
                      value={cargoContato}
                      onChange={(e) => setCargoContato(e.target.value)}
                      className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
                    E-mail Principal de Contato <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      placeholder="contato@empresa.com.br"
                      value={emailContato}
                      onChange={(e) => setEmailContato(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-3 py-3 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
                    Website Oficial da Empresa
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="url"
                      placeholder="https://empresa.com.br"
                      value={siteUrl}
                      onChange={(e) => setSiteUrl(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-3 py-3 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
                    Telefone Fixo Comercial
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      placeholder="(11) 3333-4444"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-3 py-3 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
                    Celular / WhatsApp Corporativo
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-emerald-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      placeholder="(11) 98888-7777"
                      value={celularWhatsapp}
                      onChange={(e) => setCelularWhatsapp(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-3 py-3 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Armazenamento em Nuvem Google Drive */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-emerald-600" />
                  <span>Google Drive Corporativo (Espelhamento na Nuvem)</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Conta Google do cliente autorizada para receber o compartilhamento da pasta raiz de arquivos e anexos.
                </p>
                <div>
                  <label className="block text-[11px] font-black text-slate-800 dark:text-slate-200 mb-1">
                    E-mail Google do Cliente <span className="text-slate-400 font-normal">(Gmail ou Google Workspace)</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      placeholder="cliente@gmail.com ou diretor@empresa.com"
                      value={emailGoogleDrive}
                      onChange={(e) => setEmailGoogleDrive(e.target.value)}
                      className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-3 py-2.5 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                    />
                  </div>
                  {clienteParaEditar?.gdrive_folder_url && (
                    <div className="mt-2.5 flex items-center gap-2">
                      <a
                        href={clienteParaEditar.gdrive_folder_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Abrir Pasta do Cliente no Google Drive Corporativo</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ENDEREÇO & VIACEP */}
          {activeTab === 'endereco' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-indigo-950 dark:text-indigo-200 font-bold">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>Busca Automática de Endereço via API ViaCEP</span>
                </div>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-300 font-extrabold uppercase">
                  Autocompletar
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
                    CEP
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="00000-000"
                      value={cep}
                      onChange={(e) => {
                        setCep(e.target.value)
                        if (e.target.value.replace(/\D/g, '').length === 8) {
                          handleBuscarCep(e.target.value)
                        }
                      }}
                      onBlur={(e) => handleBuscarCep(e.target.value)}
                      className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 pr-9 font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => handleBuscarCep(cep)}
                      className="absolute right-2.5 top-2.5 p-1 text-slate-400 hover:text-indigo-600 transition"
                      title="Buscar CEP"
                    >
                      {loadingCep ? (
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
                    Logradouro (Rua, Av, Alameda)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Av. Paulista"
                    value={logradouro}
                    onChange={(e) => setLogradouro(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
                    Número
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 1000"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
                    Complemento
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Sala 402, Bloco B"
                    value={complemento}
                    onChange={(e) => setComplemento(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
                    Bairro
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Bela Vista"
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
                    Cidade
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: São Paulo"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
                    UF / Estado
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    placeholder="SP"
                    value={estado}
                    onChange={(e) => setEstado(e.target.value.toUpperCase())}
                    className="w-full text-xs uppercase bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
                    País
                  </label>
                  <input
                    type="text"
                    value={pais}
                    onChange={(e) => setPais(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BRANDING & IDENTIDADE */}
          {activeTab === 'branding' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-xs font-black text-slate-900 dark:text-white">
                      Logotipo da Empresa
                    </h3>
                  </div>
                  <span className="text-[10px] text-slate-500">Formatos: PNG, JPG, WebP, SVG (até 5MB)</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-5">
                  {/* Image Preview */}
                  <div className="w-24 h-24 rounded-2xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-xs relative group">
                    {logoPreview ? (
                      <>
                        <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1.5" />
                        <button
                          type="button"
                          onClick={() => {
                            setLogoFile(null)
                            setLogoPreview(null)
                          }}
                          className="absolute inset-0 bg-rose-900/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                          title="Remover Logo"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </>
                    ) : (
                      <ImageIcon className="w-8 h-8 text-slate-300" />
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div className="space-y-2 text-center sm:text-left">
                    <input
                      type="file"
                      id="cliente-logo-upload"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoChange}
                    />
                    <label
                      htmlFor="cliente-logo-upload"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition inline-flex items-center gap-2 cursor-pointer shadow-sm shadow-indigo-500/20"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{logoPreview ? 'Trocar Logotipo' : 'Selecionar Imagem'}</span>
                    </label>
                    <p className="text-[11px] text-slate-500">
                      O logotipo é exibido no topo dos relatórios, extratos de franquia e na listagem de contratos.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
                  Cor Primária da Marca (HEX)
                </label>
                <div className="flex items-center gap-3 max-w-xs">
                  <input
                    type="color"
                    value={corPrimaria}
                    onChange={(e) => setCorPrimaria(e.target.value)}
                    className="w-10 h-10 rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={corPrimaria}
                    onChange={(e) => setCorPrimaria(e.target.value)}
                    className="w-full text-xs font-mono uppercase bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: USUÁRIOS & EQUIPE */}
          {activeTab === 'usuarios' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-xs font-black text-slate-900 dark:text-white">
                      Equipe e Usuários Autorizados no Portal
                    </h3>
                  </div>
                </div>
                <p className="text-[11px] text-indigo-950/80 dark:text-indigo-200/80 leading-relaxed font-medium">
                  {isEditing ? (
                    <>
                      Este cliente já possui contas criadas. Você pode gerenciar os colaboradores, enviar novos convites e definir papéis de <strong>Gerente</strong> ou <strong>Analista</strong>.
                    </>
                  ) : (
                    <>
                      Ao concluir o cadastro desta empresa, você poderá convidar imediatamente os colaboradores através do botão <strong>"Gerenciar Usuários"</strong> no card do cliente.
                    </>
                  )}
                </p>

                {isEditing && clienteParaEditar && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      if (onOpenUsuariosModal) {
                        onOpenUsuariosModal(clienteParaEditar)
                      }
                    }}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-500/20 transition flex items-center gap-2 cursor-pointer"
                  >
                    <Users className="w-4 h-4" />
                    <span>Abrir Acessos ao Sistema SHM</span>
                    <ExternalLink className="w-3.5 h-3.5 ml-1" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: E-MAILS DE NOTIFICAÇÃO */}
          {activeTab === 'notificacoes' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="space-y-3">
                <div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white">
                    Lista Padrão de E-mails para Notificações
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Estes e-mails serão <strong>herdados automaticamente</strong> sempre que um novo Contrato for cadastrado para este cliente.
                  </p>
                </div>

                {/* Adicionar E-mail */}
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <input
                    type="email"
                    placeholder="E-mail (ex: diretoria@empresa.com)"
                    value={novoEmailInput}
                    onChange={(e) => setNovoEmailInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddEmail()
                      }
                    }}
                    className="w-full sm:flex-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                  <input
                    type="text"
                    placeholder="Nome / Setor (opcional)"
                    value={novoNomeInput}
                    onChange={(e) => setNovoNomeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddEmail()
                      }
                    }}
                    className="w-full sm:w-48 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddEmail()}
                    className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs shadow-indigo-500/20 transition flex items-center justify-center gap-1 cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar</span>
                  </button>
                </div>

                {/* Lista */}
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {emailsNotificacao.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setEmailsNotificacao((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, ativo: !it.ativo } : it))
                        )
                      }}
                      className={`p-2.5 rounded-xl border transition flex items-center justify-between gap-3 cursor-pointer select-none ${
                        item.ativo
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 shadow-2xs'
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={item.ativo}
                          onChange={() => {
                            setEmailsNotificacao((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, ativo: !it.ativo } : it))
                            )
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 text-indigo-600 rounded-md border-slate-300 dark:border-slate-700 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate block">
                            {item.email}
                          </span>
                          {item.nome && (
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate block">
                              {item.nome}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] font-black px-2 py-0.2 rounded-full uppercase tracking-wider ${
                            item.ativo
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {item.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEmailsNotificacao((prev) => prev.filter((_, i) => i !== idx))
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {emailsNotificacao.length === 0 && (
                    <div className="p-4 text-center text-slate-500 text-xs italic bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                      Nenhum e-mail padrão configurado para herança em contratos.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: GOVERNANÇA & STATUS */}
          {activeTab === 'governanca' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-950 dark:text-indigo-200 leading-relaxed font-medium">
                  <strong>Aprovação com Magic Link de 7 dias:</strong> Ao salvar o cadastro, uma notificação será enviada ao e-mail de contato ({emailContato || 'do gestor'}) contendo o link seguro de confirmação dos dados e verificação automática de e-mail.
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
                  Status Cadastral do Cliente <span className="text-rose-500">*</span>
                </label>
                <select
                  value={statusCliente}
                  onChange={(e) => setStatusCliente(e.target.value as StatusCliente)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer"
                >
                  <option value="pendente_aprovacao">🟡 Pendente de Aprovação (Aguardando Magic Link de 7 dias)</option>
                  <option value="ativo">🟢 Ativo (Operação regular e abertura de pedidos permitida)</option>
                  <option value="suspenso">🟡 Suspenso (Acesso congelado temporariamente / pendências)</option>
                  <option value="inativo">🔴 Inativo (Conta descontinuada / sem atendimento ativo)</option>
                </select>
              </div>

              {statusCliente !== 'ativo' && statusCliente !== 'pendente_aprovacao' && (
                <div>
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
                    Motivo da Suspensão / Inativação <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={motivoBloqueio}
                    onChange={(e) => setMotivoBloqueio(e.target.value)}
                    placeholder="Descreva o motivo administrativo do bloqueio ou encerramento..."
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none shadow-2xs"
                  />
                </div>
              )}


              <div>
                <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
                  Observações Internas (Restrito à equipe Tellin)
                </label>
                <textarea
                  rows={3}
                  value={observacoesInternas}
                  onChange={(e) => setObservacoesInternas(e.target.value)}
                  placeholder="Anotações internas sobre relacionamento comercial, histórico de reuniões ou acordos operacionais..."
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none shadow-2xs"
                />
              </div>
            </div>
          )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:px-8 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              Cancelar
            </button>

            <div className="flex items-center gap-2">
              {TABS.indexOf(activeTab) > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const idx = TABS.indexOf(activeTab)
                    if (idx > 0) setActiveTab(TABS[idx - 1])
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 transition cursor-pointer flex items-center gap-1.5"
                >
                  Voltar
                </button>
              )}

              {TABS.indexOf(activeTab) < TABS.length - 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const idx = TABS.indexOf(activeTab)
                    if (idx < TABS.length - 1) setActiveTab(TABS[idx + 1])
                  }}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs shadow-indigo-500/20 transition cursor-pointer flex items-center gap-1.5"
                >
                  Avançar
                </button>
              )}

              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-black shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isEditing ? 'Salvar Alterações' : 'Cadastrar Cliente'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
