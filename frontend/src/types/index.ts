export type UserRole = 'EMPRESA_ADMIN' | 'EMPRESA_TECNICO' | 'CLIENTE_GERENTE' | 'CLIENTE_ANALISTA'

export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  avatar_url?: string | null
  role: UserRole
  role_display: string
  telefone?: string | null
  cliente?: number | null
  cliente_nome?: string | null
  is_staff: boolean
  is_superuser?: boolean
  can_approve_cycles?: boolean
  is_empresa?: boolean
  is_cliente?: boolean
}

export interface UserRoleBadgeInfo {
  org: 'Cliente' | 'Empresa'
  roleType: 'Gerente' | 'Analista'
  fullLabel: string
}

export function getUserRoleBadgeInfo(user?: {
  role?: string
  role_display?: string
  is_empresa?: boolean
  is_cliente?: boolean
  is_superuser?: boolean
  is_staff?: boolean
} | string | null): UserRoleBadgeInfo {
  if (!user) {
    return {
      org: 'Cliente',
      roleType: 'Analista',
      fullLabel: 'Cliente • Analista',
    }
  }

  const rawString =
    typeof user === 'string'
      ? user
      : `${user?.role || ''} ${user?.role_display || ''}`.trim()
  const lower = rawString.toLowerCase()

  const isSuperuser = typeof user === 'object' ? Boolean(user?.is_superuser || user?.is_staff) : false
  const isEmpresaExplicit = typeof user === 'object' ? Boolean(user?.is_empresa) : false

  const isEmpresa =
    isEmpresaExplicit ||
    isSuperuser ||
    lower.includes('empresa') ||
    lower.includes('tecnico') ||
    lower.includes('técnico') ||
    (typeof user === 'object' && (user?.role === 'EMPRESA_ADMIN' || user?.role === 'EMPRESA_TECNICO'))

  const isGerente =
    isSuperuser ||
    lower.includes('gerente') ||
    lower.includes('admin') ||
    lower.includes('tomador') ||
    (typeof user === 'object' && (user?.role === 'EMPRESA_ADMIN' || user?.role === 'CLIENTE_GERENTE'))

  const org: 'Cliente' | 'Empresa' = isEmpresa ? 'Empresa' : 'Cliente'
  const roleType: 'Gerente' | 'Analista' = isGerente ? 'Gerente' : 'Analista'

  return {
    org,
    roleType,
    fullLabel: `${org} • ${roleType}`,
  }
}

export interface EmailNotificacao {
  id?: number
  email: string
  nome?: string
  ativo: boolean
  status?: 'pendente' | 'confirmado' | 'recusado' | 'expirado'
  status_display?: string
  token?: string
  convidado_por_nome?: string
  convidado_em?: string
  expira_em?: string
  confirmado_em?: string
  is_expirado?: boolean
  dias_restantes?: number
}

export type StatusCliente = 'pendente_aprovacao' | 'ativo' | 'suspenso' | 'inativo'

export interface Cliente {
  id: number
  tipo: 'PF' | 'PJ'
  tipo_display?: string
  razao_social?: string
  nome_fantasia?: string
  nome_completo?: string
  display_name: string
  cnpj?: string
  cpf?: string
  rg?: string
  data_nascimento?: string | null
  inscricao_estadual?: string | null
  inscricao_municipal?: string | null
  ramo_atividade?: string | null
  email_contato: string
  telefone?: string | null
  celular_whatsapp?: string | null
  pessoa_contato?: string | null
  cargo_contato?: string | null
  site_url?: string | null
  cep?: string | null
  logradouro?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  cidade?: string | null
  estado?: string | null
  pais?: string | null
  logo?: string | null
  logo_url?: string | null
  cor_primaria_hex?: string | null
  emails_notificacao_padrao?: EmailNotificacao[]
  status: StatusCliente
  status_display?: string
  email_verificado?: boolean
  email_verificado_em?: string | null
  aprovado_em?: string | null
  aprovado_por_nome?: string | null
  aprovado_por_email?: string | null
  motivo_bloqueio?: string | null
  observacoes_internas?: string | null
  total_contratos?: number
  contratos_ativos?: number
  total_usuarios?: number
  saldo_total_horas?: number
  aceite_token?: string | null
  aceite_expira_em?: string | null
  aceite_usado?: boolean
  criado_em?: string
  atualizado_em?: string
}

export interface ClienteUser {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  avatar_url?: string | null
  role: UserRole
  role_display: string
  telefone?: string | null
  cliente?: number | null
  is_active: boolean
  can_approve_cycles?: boolean
  date_joined?: string
  last_login?: string | null
}

export type TipoDocumentoContrato = 'proposta' | 'contrato_assinado' | 'aditivo' | 'distrato' | 'outro'

export interface ContratoDocumento {
  id: number
  nome_original: string
  tipo_documento: TipoDocumentoContrato
  tipo_documento_display: string
  tamanho_bytes: number
  tamanho_formatado: string
  hash_sha256?: string
  algoritmo_hash?: string
  url: string
  enviado_por?: number | null
  enviado_por_nome?: string | null
  criado_em: string
}

export interface ContratoAuditLog {
  id: number
  contrato: number
  tipo_evento: string
  tipo_evento_display: string
  descricao: string
  justificativa?: string | null
  documento_nome?: string | null
  documento_hash?: string | null
  usuario?: number | null
  usuario_nome?: string | null
  usuario_role?: string | null
  ip_origem?: string | null
  timestamp: string
}

export interface ContratoPDF {
  id: number
  nome_original: string
  url: string
  criado_em: string
}

export interface Contrato {
  id: number
  numero: string
  tipo: 'novo' | 'aditivo' | 'renovacao'
  tipo_display?: string
  contrato_referencia?: number | null
  cliente: number
  cliente_nome: string
  cliente_logo?: string | null
  data_inicio: string
  data_termino?: string | null
  horas_contratadas: string | number
  saldo: string | number
  horas_consumidas: string | number
  status: 'pendente_aceite' | 'ativo' | 'concluido' | 'cancelado' | 'suspenso' | 'expirado'
  status_display: string
  em_carencia: boolean
  saldo_devedor: string | number
  saldo_remanescente: string | number
  descricao_servicos?: string
  valor_mensal?: string | number
  dia_faturamento?: number | null
  gestor_nome?: string | null
  gestor_email?: string | null
  gestor_telefone?: string | null
  emails_notificacao?: EmailNotificacao[]
  justificativa_cancelamento?: string | null
  cancelado_por_nome?: string | null
  cancelado_em?: string | null
  concluido_por_nome?: string | null
  concluido_em?: string | null
  criado_por_nome?: string | null
  total_documentos?: number
  documentos?: ContratoDocumento[]
  destinatarios?: EmailNotificacao[]
  pdfs?: ContratoPDF[]
  aceite_token?: string | null
  aceite_expira_em?: string | null
  aceite_usado?: boolean
}

export interface Tarefa {
  id: number
  ciclo: number
  descricao: string
  horas_estimadas: string | number
  horas_realizadas: string | number
  status: 'prevista' | 'realizada' | 'cancelada'
  status_display: string
  operador?: number | null
  operador_nome?: string | null
}

export type TipoCiclo = 'corretiva' | 'evolutiva' | 'preventiva' | 'analise' | 'consultoria' | 'treinamento' | 'teste'
export type StatusCiclo = 'orcado' | 'aguardando_aprovacao' | 'aprovado' | 'em_execucao' | 'aguardando_aceite' | 'aceito' | 'cancelado'

export interface AvaliacaoCiclo {
  id: number
  ciclo: number
  avaliador: number
  avaliador_nome: string
  avaliador_empresa?: string
  nota: number
  comentario?: string
  criado_em: string
}

export interface Ciclo {
  id: number
  pedido: number
  pedido_protocolo?: string
  pedido_assunto?: string
  tipo: TipoCiclo
  tipo_display: string
  contexto?: string | null
  cliente_id?: number
  cliente_nome?: string
  operador: number
  operador_nome: string
  status: StatusCiclo
  status_display: string
  horas_estimadas: string | number
  horas_realizadas: string | number
  apresentado_em?: string | null
  aprovado_em?: string | null
  aceito_em?: string | null
  token_acesso: string
  tarefas: Tarefa[]
  avaliacao?: AvaliacaoCiclo | null
  anexos_referenciados?: AnexoPedido[]
}

export interface AnexoPedido {
  id: number
  nome_original: string
  tamanho: number
  url: string
  criado_em: string
}

export interface AnexoComentario {
  id: string
  nome_original: string
  tamanho: number
  url: string
  criado_em?: string
}

export type PrioridadePedido = 'baixa' | 'media' | 'alta' | 'urgente'
export type StatusPedido = 'aberto' | 'em_orcamento' | 'aguardando_aprovacao' | 'em_execucao' | 'aguardando_aceite' | 'concluido' | 'cancelado'

export interface PedidoResumoCiclo {
  id: number
  tipo: string
  status: string
  status_display: string
  horas_estimadas: number
  horas_realizadas: number
}

export interface Pedido {
  id: number
  protocolo: string
  assunto: string
  descricao: string
  prioridade: PrioridadePedido
  prioridade_display: string
  status: StatusPedido
  status_display: string
  cliente: number
  cliente_nome: string
  contrato: number
  contrato_numero: string
  contrato_saldo?: string | number
  criado_em: string
  criado_por_nome?: string
  criado_por_email?: string
  criado_por_role?: string
  ciclos_resumo?: PedidoResumoCiclo[]
  ciclos?: Ciclo[]
  anexos?: AnexoPedido[]
}

export interface Comentario {
  id: string
  ciclo?: number | null
  tarefa?: number | null
  parent?: string | null
  autor: number
  autor_nome: string
  autor_role: string
  autor_username?: string
  autor_avatar_url?: string | null
  texto: string
  tarefa_convertida?: number | null
  criado_em: string
  atualizado_em?: string
  anexos?: AnexoComentario[]
  respostas?: Comentario[]
  reacoes_count?: number
  user_reacted?: boolean
}

export interface TimelineEvent {
  id: number
  pedido: number
  ciclo?: number | null
  tipo: string
  tipo_display: string
  descricao: string
  autor_nome?: string | null
  timestamp: string
}

export interface Notification {
  id: number
  titulo: string
  mensagem: string
  url?: string | null
  lida: boolean
  criado_em: string
}

export type CategoriaNotificacao = 'autenticacao' | 'clientes' | 'contratos' | 'saldo' | 'pedidos' | 'ciclos'

export interface ConfiguracaoNotificacao {
  id: number
  codigo: string
  categoria: CategoriaNotificacao
  categoria_display: string
  nome: string
  descricao: string
  ativo_email: boolean
  ativo_in_app: boolean
  notificar_empresa_admin: boolean
  notificar_empresa_tecnico: boolean
  notificar_cliente_gerente: boolean
  notificar_cliente_comum: boolean
  notificar_gestor_contrato: boolean
  notificar_emails_cc: boolean
  nao_enviar_autor: boolean
  emails_adicionais: string[]
  bloqueado_edicao: boolean
  criado_em: string
  atualizado_em: string
}

export type NivelRelevanciaAudit = 'N1' | 'N2' | 'N3'

export interface ForensicAuditLog {
  id: string
  sequencia: number
  tipo_evento: string
  tipo_evento_display?: string
  nivel_relevancia: NivelRelevanciaAudit
  descricao: string
  justificativa?: string | null
  usuario_nome?: string | null
  usuario_role?: string | null
  ip_origem?: string | null
  user_agent?: string | null
  timestamp: string
  payload_hash: string
  previous_hash: string
  current_hash: string
  particao?: string
  contrato?: number | null
  cliente?: number | null
}

export interface AuditIntegrityVerification {
  status: 'integro' | 'rompido'
  contrato_numero?: string
  total_registros_verificados?: number
  tempo_verificacao_ms?: number
  ultimo_hash?: string
  mensagem: string
  verificado_em: string
  registro_falha_sequencia?: number
  registro_falha_id?: string
  hash_calculado?: string
  hash_armazenado?: string
}

export interface AuditDailySeal {
  id: string
  data_referencia: string
  particao: string
  ultimo_registro_id: string
  ultima_sequencia: number
  ultimo_hash: string
  total_eventos_dia: number
  selo_digest: string
  selado_em: string
}

export interface AuditPanelIntegrity {
  total_particoes: number
  particoes_integras: number
  particoes_rompidas: number
  total_eventos_auditados: number
  ultimo_selo_diario?: {
    data_referencia: string
    selado_em: string
    selo_digest: string
  } | null
}

export interface ExecucaoAuditoriaResult {
  sucesso: boolean
  mensagem: string
  data_referencia: string
  data_execucao: string
  total_particoes: number
  selos_gerados: number
  particoes_rompidas: number
  latencia_ms: number
  detalhes: Array<{
    particao: string
    status: string
    ultima_sequencia: number
    total_eventos_dia: number
    selo_digest: string
    tempo_ms?: number
  }>
}

export type NivelDocumentacao = 'visao-geral' | 'tecnico-pericial'

export interface TopicoDocumentacao {
  id: string
  numero: number
  titulo: string
  subtitulo?: string
  nivel: NivelDocumentacao
}

// ==========================================
// SCHEDULE / AGENDAMENTOS & GOOGLE MEET
// ==========================================

export type TipoEventoSchedule =
  | 'alinhamento'
  | 'orcamento'
  | 'homologacao'
  | 'suporte_emergencial'
  | 'avulso'

export type StatusAgendamento =
  | 'agendado'
  | 'em_andamento'
  | 'realizado'
  | 'concluido'
  | 'cancelado'

export type TipoParticipanteSchedule =
  | 'organizador'
  | 'tecnico'
  | 'cliente'
  | 'convidado'

export type StatusPresencaSchedule =
  | 'pendente'
  | 'confirmado'
  | 'recusado'

export interface ParticipanteAgendamento {
  id?: number | string
  usuario?: number | null
  nome: string
  email: string
  tipo: TipoParticipanteSchedule
  tipo_display?: string
  status_presenca: StatusPresencaSchedule
  status_presenca_display?: string
}

export interface Agendamento {
  id: number | string
  cliente: number
  cliente_nome?: string
  pedido?: number | null
  pedido_protocolo?: string | null
  pedido_assunto?: string | null
  ciclo?: number | null
  ciclo_titulo?: string | null
  ciclo_tipo?: string | null
  tarefa?: number | null
  organizador?: number
  organizador_nome?: string
  organizador_email?: string
  titulo: string
  descricao?: string
  tipo: TipoEventoSchedule
  tipo_display?: string
  status: StatusAgendamento
  status_display?: string
  data_inicio: string
  data_fim: string
  duracao_minutos: number
  google_event_id?: string | null
  google_meet_link?: string | null
  meet_link?: string | null
  google_sincronizado?: boolean
  google_calendar_status?: 'sincronizado' | 'pendente' | 'erro' | 'desativado' | string
  motivo_cancelamento?: string | null
  participantes?: ParticipanteAgendamento[]
  criado_em?: string
  atualizado_em?: string
}

export interface CriarAgendamentoPayload {
  cliente: number
  pedido?: number | null
  ciclo?: number | null
  tarefa?: number | null
  titulo: string
  descricao?: string
  tipo?: TipoEventoSchedule
  data_inicio: string
  data_fim?: string
  duracao_minutos?: number
  sincronizar_google?: boolean
  google_meet_link?: string | null
  participantes?: Array<{
    email: string
    nome: string
    tipo?: TipoParticipanteSchedule
    usuario?: number | null
  }>
}

export interface ConfiguracaoScheduleDiagnostico {
  calendar_id: string
  google_subscribe_url: string
  modo_operacao: 'ativo' | 'simulacao' | 'erro'
  service_account_configurada: boolean
  service_account_email?: string | null
  atualizado_em?: string | null
  atualizado_por_nome?: string | null
}

export interface TesteConexaoGoogleResult {
  sucesso: boolean
  status_conexao: 'conectado' | 'mock_desenvolvimento' | 'erro'
  modo: 'ativo' | 'simulacao' | 'erro'
  latencia_ms: number
  calendar_id: string
  detalhes?: {
    summary?: string
    timeZone?: string
    accessRole?: string
  } | null
  mensagem: string
  erro_codigo?: number | null
  erro_detalhe?: string | null
  sugestao?: string | null
}