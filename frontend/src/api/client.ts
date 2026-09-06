import axios from 'axios'
import type {
  Pedido,
  Contrato,
  Ciclo,
  Tarefa,
  Comentario,
  Notification,
  Cliente,
  ClienteUser,
  User,
  ConfiguracaoNotificacao,
  AnexoPedido,
  ForensicAuditLog,
  AuditIntegrityVerification,
  AuditPanelIntegrity,
  Agendamento,
  CriarAgendamentoPayload,
  ConfiguracaoScheduleDiagnostico,
  TesteConexaoGoogleResult,
} from '../types'


export const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Helper to normalize DRF paginated { count, results: [] } or raw arrays []
function normalizeArray<T>(data: any): T[] {
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.results)) return data.results
  return []
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('shm_access_token')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (config.data instanceof FormData && config.headers) {
    delete config.headers['Content-Type']
  }
  return config
})

let refreshTokenPromise: Promise<string> | null = null

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/token/')
    ) {
      originalRequest._retry = true
      const refreshToken = localStorage.getItem('shm_refresh_token')
      if (!refreshToken) {
        localStorage.removeItem('shm_access_token')
        localStorage.removeItem('shm_refresh_token')
        return Promise.reject(error)
      }

      if (!refreshTokenPromise) {
        refreshTokenPromise = axios
          .post('/api/v1/auth/token/refresh/', { refresh: refreshToken })
          .then((res) => {
            const newAccess = res.data.access
            localStorage.setItem('shm_access_token', newAccess)
            if (res.data.refresh) {
              localStorage.setItem('shm_refresh_token', res.data.refresh)
            }
            return newAccess
          })
          .catch((err) => {
            localStorage.removeItem('shm_access_token')
            localStorage.removeItem('shm_refresh_token')
            throw err
          })
          .finally(() => {
            refreshTokenPromise = null
          })
      }

      try {
        const newAccess = await refreshTokenPromise
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccess}`
        }
        return api(originalRequest)
      } catch (err) {
        return Promise.reject(err)
      }
    }
    return Promise.reject(error)
  }
)

export const clientService = {
  auth: {
    login: (credentials: { username: string; password: string }) =>
      api.post<{ access: string; refresh: string }>('/auth/token/', credentials).then((r) => r.data),
    loginGoogle: (credential: string) =>
      api.post<{ access: string; refresh: string; user: any }>('/auth/google/', { credential }).then((r) => r.data),
    me: () => api.get('/auth/me/').then((r) => r.data),
    users: () => api.get<any>('/auth/users/').then((r) => normalizeArray<User>(r.data)),
  },
  contratos: {
    list: (params?: Record<string, any>) => api.get<any>('/contratos/', { params }).then((r) => normalizeArray<Contrato>(r.data)),
    get: (id: number) => api.get<Contrato>(`/contratos/${id}/`).then((r) => r.data),
    create: (data: Partial<Contrato> | FormData) =>
      api
        .post<Contrato>('/contratos/', data, {
          headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
        })
        .then((r) => r.data),
    update: (id: number, data: Partial<Contrato> | FormData) =>
      api
        .patch<Contrato>(`/contratos/${id}/`, data, {
          headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
        })
        .then((r) => r.data),
    cancelar: (id: number, justificativa: string) =>
      api.post<{ detail: string; contrato: Contrato }>(`/contratos/${id}/cancelar/`, { justificativa }).then((r) => r.data),
    concluir: (id: number) =>
      api.post<{ detail: string; contrato: Contrato }>(`/contratos/${id}/concluir/`).then((r) => r.data),
    uploadDocumento: (id: number, file: File, tipoDocumento: string) => {
      const formData = new FormData()
      formData.append('arquivo', file)
      formData.append('tipo_documento', tipoDocumento)
      return api
        .post<any>(`/contratos/${id}/upload_documento/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data)
    },
    deleteDocumento: (id: number, docId: number, justificativa: string) =>
      api
        .post<{ detail: string; documento_nome?: string; documento_hash?: string; justificativa?: string }>(
          `/contratos/${id}/documentos/${docId}/`,
          { justificativa, motivo: justificativa }
        )
        .then((r) => r.data),
    verificarDocumento: (contratoId: number, docId: number) =>
      api
        .get<{
          doc_id: number
          nome_original: string
          integro: boolean
          hash_registrado: string
          hash_calculado: string
          algoritmo: string
          tamanho_bytes: number
          mensagem: string
          verificado_em: string
        }>(`/contratos/${contratoId}/documentos/${docId}/verificar/`)
        .then((r) => r.data),
    downloadDocumento: async (id: number, docId: number, nomeOriginal: string) => {
      const response = await api.get(`/contratos/${id}/documentos/${docId}/download/`, {
        responseType: 'blob',
      })
      const blob = new Blob([response.data])
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.setAttribute('download', nomeOriginal)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)
    },
    atualizarEmails: (id: number, emails: any[]) =>
      api.post<any>(`/contratos/${id}/atualizar_emails/`, { emails_notificacao: emails }).then((r) => r.data),
    reenviarConviteEmail: (id: number, data: { email?: string; destinatario_id?: number }) =>
      api.post<{ detail: string; destinatario: any }>(`/contratos/${id}/reenviar_convite_email/`, data).then((r) => r.data),
    obterConviteEmail: (token: string) =>
      api.get<any>(`/contratos/confirmar_email/${token}/`).then((r) => r.data),
    confirmarEmail: (token: string) =>
      api.post<any>(`/contratos/confirmar_email/${token}/`).then((r) => r.data),
    recusarEmail: (token: string) =>
      api.post<any>(`/contratos/recusar_email/${token}/`).then((r) => r.data),
    obterAceite: (token: string) =>
      api.get<any>(`/contratos/aceite/${token}/`).then((r) => r.data),
    concederAceite: (token: string) =>
      api.post<any>(`/contratos/aceite/${token}/`).then((r) => r.data),
    reenviarAceite: (id: number) =>
      api.post<{ detail: string; token: string; expira_em: string }>(`/contratos/${id}/reenviar_aceite/`).then((r) => r.data),
    auditarRelatorio: (id: number) =>
      api.post<{ detail: string; log_id: number; timestamp: string }>(`/contratos/${id}/auditar_relatorio/`).then((r) => r.data),
    auditoria: (id: number) => api.get<any>(`/contratos/${id}/auditoria/`).then((r) => normalizeArray<any>(r.data)),
    extrato: (id: number) => api.get(`/contratos/${id}/extrato/`).then((r) => r.data),
    trilhaForense: (id: number, params?: { nivel?: string; page?: number; page_size?: number }) =>
      api.get<any>(`/contratos/${id}/trilha_forense/`, { params }).then((r) => normalizeArray<ForensicAuditLog>(r.data)),
    verificarIntegridade: (id: number) =>
      api.get<AuditIntegrityVerification>(`/contratos/${id}/verificar_integridade/`).then((r) => r.data),
  },
  clientes: {
    list: (params?: Record<string, any>) => api.get<any>('/clientes/', { params }).then((r) => normalizeArray<Cliente>(r.data)),
    get: (id: number) => api.get<Cliente>(`/clientes/${id}/`).then((r) => r.data),
    create: (data: Partial<Cliente> | FormData) =>
      api
        .post<Cliente>('/clientes/', data, {
          headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
        })
        .then((r) => r.data),
    update: (id: number, data: Partial<Cliente> | FormData) =>
      api
        .patch<Cliente>(`/clientes/${id}/`, data, {
          headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
        })
        .then((r) => r.data),
    delete: (id: number, justificativa?: string) =>
      api
        .delete<{ detail: string; cliente_nome?: string; justificativa?: string }>(`/clientes/${id}/`, {
          data: { justificativa },
        })
        .then((r) => r.data),
    excluir: (id: number, justificativa: string) =>
      api
        .post<{ detail: string; cliente_nome?: string; justificativa?: string }>(`/clientes/${id}/excluir/`, {
          justificativa,
        })
        .then((r) => r.data),
    atualizarPerfil: (id: number, data: FormData | Record<string, any>) =>
      api
        .post<any>(`/clientes/${id}/atualizar_perfil/`, data, {
          headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
        })
        .then((r) => r.data),
    obterAceite: (token: string) =>
      api.get<any>(`/clientes/aprovacao/${token}/`).then((r) => r.data),
    concederAceite: (token: string) =>
      api.post<any>(`/clientes/aprovacao/${token}/`).then((r) => r.data),
    reenviarAprovacao: (id: number) =>
      api
        .post<{ detail: string; token: string; expira_em: string; email_enviado: boolean }>(
          `/clientes/${id}/reenviar_aprovacao/`
        )
        .then((r) => r.data),

    usuarios: {
      list: (clienteId: number) =>
        api.get<any>(`/clientes/${clienteId}/usuarios/`).then((r) => normalizeArray<ClienteUser>(r.data)),
      create: (clienteId: number, data: { email: string; first_name: string; last_name?: string; role: string; telefone?: string }) =>
        api
          .post<{ detail: string; user: ClienteUser; token?: string; email_enviado: boolean }>(
            `/clientes/${clienteId}/usuarios/`,
            data
          )
          .then((r) => r.data),
      update: (clienteId: number, userId: number, data: Partial<ClienteUser>) =>
        api
          .patch<{ detail: string; user: ClienteUser }>(`/clientes/${clienteId}/usuarios/${userId}/`, data)
          .then((r) => r.data),
      delete: (clienteId: number, userId: number) =>
        api.delete<{ detail: string }>(`/clientes/${clienteId}/usuarios/${userId}/`).then((r) => r.data),
      reenviarConvite: (clienteId: number, userId: number) =>
        api
          .post<{ detail: string; token?: string; email_enviado: boolean }>(
            `/clientes/${clienteId}/usuarios/${userId}/reenviar_convite/`
          )
          .then((r) => r.data),
      alternarStatus: (clienteId: number, userId: number) =>
        api
          .post<{ detail: string; is_active: boolean; user: ClienteUser }>(
            `/clientes/${clienteId}/usuarios/${userId}/alternar_status/`
          )
          .then((r) => r.data),
    },
  },
  pedidos: {
    list: (params?: Record<string, any>) => api.get<any>('/pedidos/', { params }).then((r) => normalizeArray<Pedido>(r.data)),
    kanban: (contratoId?: number) =>
      api.get<Record<string, Pedido[]>>('/pedidos/kanban/', { params: { contrato: contratoId } }).then((r) => r.data),
    get: (id: number) => api.get<Pedido>(`/pedidos/${id}/`).then((r) => r.data),
    create: (data: FormData | Partial<Pedido>) =>
      api.post<Pedido>('/pedidos/', data, data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined).then((r) => r.data),
    adicionarAnexos: (pedidoId: number, formData: FormData) =>
      api.post<AnexoPedido[]>(`/pedidos/${pedidoId}/adicionar_anexos/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
  },
  ciclos: {
    get: (id: number) => api.get<Ciclo>(`/ciclos/${id}/`).then((r) => r.data),
    create: (data: { pedido: number; tipo: string; contexto: string; operador: number; horas_estimadas?: number; anexos_pedido_ids?: number[] }) =>
      api.post<Ciclo>('/ciclos/', data).then((r) => r.data),
    update: (id: number, data: Partial<Ciclo>) =>
      api.patch<Ciclo>(`/ciclos/${id}/`, data).then((r) => r.data),
    referenciarAnexo: (cicloId: number, anexoId: number) =>
      api.post<{ detail: string; ciclo_id: number; anexo_id: number; total_referenciados: number }>(
        `/ciclos/${cicloId}/referenciar_anexo/`, { anexo_id: anexoId }
      ).then((r) => r.data),
    desvincularAnexo: (cicloId: number, anexoId: number) =>
      api.post<{ detail: string; ciclo_id: number; anexo_id: number }>(
        `/ciclos/${cicloId}/desvincular_anexo/`, { anexo_id: anexoId }
      ).then((r) => r.data),
    apresentarOrcamento: (id: number, horas_estimadas: number) =>
      api.post<Ciclo>(`/ciclos/${id}/apresentar_orcamento/`, { horas_estimadas }).then((r) => r.data),
    aprovar: (id: number) => api.post<Ciclo>(`/ciclos/${id}/aprovar/`).then((r) => r.data),
    rejeitar: (id: number, justificativa: string) =>
      api.post<Ciclo>(`/ciclos/${id}/rejeitar/`, { justificativa }).then((r) => r.data),
    iniciarExecucao: (id: number) => api.post<Ciclo>(`/ciclos/${id}/iniciar_execucao/`).then((r) => r.data),
    solicitarAceite: (id: number) => api.post<Ciclo>(`/ciclos/${id}/solicitar_aceite/`).then((r) => r.data),
    aceitar: (id: number, justificativa_excedente?: string) =>
      api.post<Ciclo>(`/ciclos/${id}/aceitar/`, { justificativa_excedente }).then((r) => r.data),
    recusar: (id: number, justificativa: string) =>
      api.post<Ciclo>(`/ciclos/${id}/recusar/`, { justificativa }).then((r) => r.data),
    avaliar: (id: number, data: { nota: number; comentario?: string }) =>
      api.post<any>(`/ciclos/${id}/avaliar/`, data).then((r) => r.data),
    reenviarMagicLink: (id: number) =>
      api.post<{ detail: string; magic_link_token: string; expira_em: string; ciclo: Ciclo }>(`/ciclos/${id}/reenviar_magic_link/`).then((r) => r.data),
    getMagicLink: (token: string) => api.get(`/ciclos/publico/${token}/`).then((r) => r.data),
    postMagicLink: (token: string, data: { acao: string; justificativa?: string; justificativa_excedente?: string; nota?: number; comentario?: string }) =>
      api.post(`/ciclos/publico/${token}/`, data).then((r) => r.data),
  },
  tarefas: {
    create: (data: Partial<Tarefa>) => api.post<Tarefa>('/tarefas/', data).then((r) => r.data),
    update: (id: number, data: Partial<Tarefa>) => api.patch<Tarefa>(`/tarefas/${id}/`, data).then((r) => r.data),
    delete: (id: number) => api.delete(`/tarefas/${id}/`).then((r) => r.data),
  },
  comunicacao: {
    list: (cicloId: number) => api.get<any>(`/comunicacao/comentarios/?ciclo=${cicloId}`).then((r) => normalizeArray<Comentario>(r.data)),
    create: (data: FormData | { ciclo: number; texto: string; parent?: string }) =>
      api.post<Comentario>('/comunicacao/comentarios/', data).then((r) => r.data),
    update: (id: string, data: { texto: string }) => api.patch<Comentario>(`/comunicacao/comentarios/${id}/`, data).then((r) => r.data),
    delete: (id: string) => api.delete(`/comunicacao/comentarios/${id}/`).then((r) => r.data),
    removerAnexo: (comentarioId: string, anexoId: string) =>
      api.post<{ detail: string; comentario_id: string; anexo_id: string }>(
        `/comunicacao/comentarios/${comentarioId}/remover_anexo/`, { anexo_id: anexoId }
      ).then((r) => r.data),
    reagir: (id: string, tipo: string = 'like') =>
      api.post<{ acao: string; tipo: string; reacoes_count: number; user_reacted: boolean }>(
        `/comunicacao/comentarios/${id}/reagir/`, { tipo }
      ).then((r) => r.data),
    converterEmTarefa: (id: string, data: { descricao: string; horas_estimadas: number }) =>
      api.post(`/comunicacao/comentarios/${id}/converter_em_tarefa/`, data).then((r) => r.data),
  },
  notificacoes: {
    list: () => api.get<any>('/notificacoes/notificacoes/').then((r) => normalizeArray<Notification>(r.data)),
    marcarLida: (id: number) => api.post(`/notificacoes/notificacoes/${id}/marcar_lida/`).then((r) => r.data),
    marcarTodasLidas: () => api.post('/notificacoes/notificacoes/marcar_todas_lidas/').then((r) => r.data),
  },
  configuracoesNotificacoes: {
    list: () =>
      api
        .get<any>('/notificacoes/configuracoes-notificacoes/')
        .then((r) => normalizeArray<ConfiguracaoNotificacao>(r.data)),
    update: (id: number, data: Partial<ConfiguracaoNotificacao>) =>
      api.patch<ConfiguracaoNotificacao>(`/notificacoes/configuracoes-notificacoes/${id}/`, data).then((r) => r.data),
    resetarPadroes: () =>
      api.post<{ status: string; total: number }>('/notificacoes/configuracoes-notificacoes/resetar-padroes/').then((r) => r.data),
    testarDisparo: (id: number) =>
      api
        .post<{ status: string; mensagem: string; destinatario: string }>(
          `/notificacoes/configuracoes-notificacoes/${id}/testar-disparo/`
        )
        .then((r) => r.data),
  },
  saldo: {
    list: (params?: Record<string, any>) => api.get<any>('/saldo/', { params }).then((r) => normalizeArray<any>(r.data)),
    contratosElegiveis: (clienteId: number, destinoId?: number) =>
      api
        .get<any[]>('/saldo/contratos_elegiveis/', { params: { cliente_id: clienteId, destino_id: destinoId } })
        .then((r) => r.data),
    contratosDevedores: (clienteId: number) =>
      api
        .get<any[]>('/saldo/contratos_devedores/', { params: { cliente_id: clienteId } })
        .then((r) => r.data),
    migrar: (data: { contrato_origem: number; contrato_destino: number; quantidade?: number; motivo?: string }) =>
      api.post<any>('/saldo/migrar/', data).then((r) => r.data),
    compensarDebito: (data: { contrato_origem: number; contrato_destino: number; quantidade: number; motivo?: string }) =>
      api.post<any>('/saldo/compensar_debito/', data).then((r) => r.data),
    transferir: (data: { contrato_origem: number; contrato_destino: number; quantidade: number; motivo: string }) =>
      api.post<any>('/saldo/transferir/', data).then((r) => r.data),
    reabastecer: (data: { contrato: number; quantidade: number; motivo: string }) =>
      api.post<any>('/saldo/reabastecer/', data).then((r) => r.data),
  },
  auditoria: {
    painelIntegridade: () =>
      api.get<AuditPanelIntegrity>('/auditoria/painel_integridade/').then((r) => r.data),
  },
  schedule: {
    list: (params?: Record<string, any>) =>
      api.get<any>('/schedule/agendamentos/', { params }).then((r) => normalizeArray<Agendamento>(r.data)),
    get: (id: number | string) => api.get<Agendamento>(`/schedule/agendamentos/${id}/`).then((r) => r.data),
    create: (data: CriarAgendamentoPayload) =>
      api.post<Agendamento>('/schedule/agendamentos/', data).then((r) => r.data),
    update: (id: number | string, data: Partial<CriarAgendamentoPayload>) =>
      api.patch<Agendamento>(`/schedule/agendamentos/${id}/`, data).then((r) => r.data),
    cancelar: (id: number | string, motivo: string) =>
      api.post<Agendamento>(`/schedule/agendamentos/${id}/cancelar/`, { motivo }).then((r) => r.data),
    proxima: () =>
      api.get<Agendamento | null>('/schedule/agendamentos/proxima/').then((r) => r.data),
    obterConfiguracao: () =>
      api.get<ConfiguracaoScheduleDiagnostico>('/schedule/configuracao/diagnostico/').then((r) => r.data),
    atualizarConfiguracao: (data: { calendar_id: string }) =>
      api.patch<ConfiguracaoScheduleDiagnostico>('/schedule/configuracao/diagnostico/', data).then((r) => r.data),
    testarConexaoGoogle: () =>
      api.post<TesteConexaoGoogleResult>('/schedule/configuracao/testar-conexao/').then((r) => r.data),
  },

  system: {
    status: () => api.get('/status/').then((r) => r.data),
  },
}