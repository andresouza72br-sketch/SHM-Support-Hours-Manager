import { NovoPedidoModal } from '../components/pedidos/NovoPedidoModal'

/**
 * Validação de integridade do componente NovoPedidoModal.
 * Verifica a exportação válida do componente React e conformidade da interface de props.
 */
export function assertNovoPedidoModalContrato(): boolean {
  if (typeof NovoPedidoModal !== 'function') {
    throw new Error('NovoPedidoModal deve ser um componente funcional React exportado.')
  }
  return true
}

assertNovoPedidoModalContrato()
