import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { DetalhePedidoPage } from './pages/DetalhePedidoPage'
import { NovoPedidoPage } from './pages/NovoPedidoPage'
import { ExtratoContratoPage } from './pages/ExtratoContratoPage'
import { AdminDashboardPage } from './pages/AdminDashboardPage'
import { AnalisePedidoPage } from './pages/AnalisePedidoPage'
import { ExecucaoCicloPage } from './pages/ExecucaoCicloPage'
import { ContratosPage } from './pages/ContratosPage'
import { ClientesPage } from './pages/ClientesPage'
import { MagicLinkPage } from './pages/MagicLinkPage'
import { ConfirmarNotificacaoPage } from './pages/ConfirmarNotificacaoPage'
import { AceiteContratoPage } from './pages/AceiteContratoPage'
import { AceiteClientePage } from './pages/AceiteClientePage'
import { ConfiguracoesNotificacoesPage } from './pages/ConfiguracoesNotificacoesPage'
import { DocumentacaoAuditoriaPage } from './pages/DocumentacaoAuditoriaPage'
import { SchedulePage } from './pages/SchedulePage'
import { PerfilPage } from './pages/PerfilPage'
import { ConfiguracoesSistemaPage } from './pages/ConfiguracoesSistemaPage'
import { LogHashChainingPage } from './pages/LogHashChainingPage'





function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-slate-400">Carregando SHM...</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-slate-400">Carregando SHM...</div>
  if (user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/pedidos/novo" element={<ProtectedRoute><NovoPedidoPage /></ProtectedRoute>} />
              <Route path="/pedidos/:id" element={<ProtectedRoute><DetalhePedidoPage /></ProtectedRoute>} />
              <Route path="/contratos" element={<ProtectedRoute><ContratosPage /></ProtectedRoute>} />
              <Route path="/contratos/:id/extrato" element={<ProtectedRoute><ExtratoContratoPage /></ProtectedRoute>} />
              <Route path="/clientes" element={<ProtectedRoute><ClientesPage /></ProtectedRoute>} />
              <Route path="/schedule" element={<ProtectedRoute><SchedulePage /></ProtectedRoute>} />
              <Route path="/perfil" element={<ProtectedRoute><PerfilPage /></ProtectedRoute>} />
              <Route path="/admin/schedule" element={<Navigate to="/schedule" replace />} />
              <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboardPage /></ProtectedRoute>} />
              <Route path="/admin/contratos" element={<ProtectedRoute><ContratosPage /></ProtectedRoute>} />
              <Route path="/admin/clientes" element={<ProtectedRoute><ClientesPage /></ProtectedRoute>} />
              <Route path="/admin/configuracoes/notificacoes" element={<ProtectedRoute><ConfiguracoesNotificacoesPage /></ProtectedRoute>} />
              <Route path="/admin/configuracoes/calendar" element={<ProtectedRoute><ConfiguracoesSistemaPage /></ProtectedRoute>} />
              <Route path="/admin/configuracoes/sistema" element={<Navigate to="/admin/configuracoes/calendar" replace />} />
              <Route path="/admin/auditoria/hash-chaining" element={<ProtectedRoute><LogHashChainingPage /></ProtectedRoute>} />
              <Route path="/admin/log-hash-chaining" element={<Navigate to="/admin/auditoria/hash-chaining" replace />} />
              <Route path="/admin/pedidos/:id/analise" element={<ProtectedRoute><AnalisePedidoPage /></ProtectedRoute>} />
              <Route path="/admin/ciclos/:id/execucao" element={<ProtectedRoute><ExecucaoCicloPage /></ProtectedRoute>} />
              <Route path="/aceite-contrato/:token" element={<AceiteContratoPage />} />
              <Route path="/publico/contrato/:token" element={<AceiteContratoPage />} />
              <Route path="/aceite-cliente/:token" element={<AceiteClientePage />} />
              <Route path="/publico/cliente/:token" element={<AceiteClientePage />} />
              <Route path="/confirmar-notificacao/:token" element={<ConfirmarNotificacaoPage />} />
              <Route path="/publico/notificacao/:token" element={<ConfirmarNotificacaoPage />} />

              {/* Rotas de Documentação da Auditoria Forense (Protegida e Pública) */}
              <Route path="/documentacao/auditoria-forense" element={<ProtectedRoute><DocumentacaoAuditoriaPage /></ProtectedRoute>} />
              <Route path="/documentacao/auditoria" element={<Navigate to="/documentacao/auditoria-forense" replace />} />
              <Route path="/publico/auditoria-forense" element={<DocumentacaoAuditoriaPage isPublicView={true} />} />

              <Route path="/magic-link/:token" element={<MagicLinkPage />} />
              <Route path="/publico/ciclo/:token" element={<MagicLinkPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}