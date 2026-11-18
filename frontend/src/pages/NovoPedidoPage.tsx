import { Navigate } from 'react-router-dom'

/**
 * Rota legada /pedidos/novo.
 * Redireciona suavemente para /dashboard?novo=true para acionar
 * a abertura do NovoPedidoModal sobrepondo o Painel Kanban.
 */
export function NovoPedidoPage() {
  return <Navigate to="/dashboard?novo=true" replace />
}
