import { useState } from 'react'
import {
  Copy,
  Check,
  Lock,
} from 'lucide-react'

export function DocumentacaoStorageTecnico() {
  const [copiadoIdx, setCopiadoIdx] = useState<string | null>(null)

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiadoIdx(id)
    setTimeout(() => setCopiadoIdx(null), 2500)
  }

  return (
    <div className="space-y-12">
      {/* Banner de Aviso de Área Restrita */}
      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3 shadow-2xs">
        <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div>
          <strong className="block mb-0.5 text-xs font-black">Área Restrita aos Administradores do Sistema</strong>
          <p className="text-[11px] leading-relaxed font-medium">
            Este manual contém procedimentos avançados de infraestrutura, arquitetura de rede, chaves de autorização OAuth
            2.0 e ferramentas CLI de auditoria pericial. Não compartilhe com usuários externos.
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 7. ARQUITETURA TÉCNICA & PIPELINE ASSÍNCRONO */}
      {/* ========================================================================= */}
      <section id="arquitetura-tecnica" className="scroll-mt-28 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 flex items-center justify-center text-purple-600 dark:text-purple-400 font-black text-sm">
            7
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Topologia Técnica e Pipeline Assíncrono
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Dual-Storage, signals post_save, threads daemon e hash SHA-256 pericial
            </p>
          </div>
        </div>

        {/* Diagrama de Pipeline em Cards Sequenciais */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Fluxo Transacional de Persistência de Anexos
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 space-y-2">
              <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                Passo 1 • Ingestão
              </span>
              <strong className="text-slate-900 dark:text-white block font-black">Upload Multipart (DRF)</strong>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                Arquivo recebido via POST, validado e salvo em disco local SSD (<code className="px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-700 font-mono">MEDIA_ROOT</code>).
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 space-y-2">
              <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                Passo 2 • Integridade
              </span>
              <strong className="text-slate-900 dark:text-white block font-black">Hash SHA-256 &amp; DB</strong>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                O sinal <code className="px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-700 font-mono">post_save</code> calcula o hash criptográfico FIPS 180-4 e cria registro pendente no banco.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 space-y-2">
              <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                Passo 3 • Background
              </span>
              <strong className="text-slate-900 dark:text-white block font-black">transaction.on_commit</strong>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                Assim que a transação atômica é confirmada, dispara thread de sincronização sem bloquear o usuário.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 space-y-2">
              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                Passo 4 • Nuvem
              </span>
              <strong className="text-slate-900 dark:text-white block font-black">Drive API v3 (5 TB)</strong>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                Envio multipart para pasta temática do cliente. Atualiza status para <code className="px-1 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 font-mono text-emerald-700">SINCRONIZADO</code>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. MODELO DE SEGURANÇA E ACL */}
      {/* ========================================================================= */}
      <section id="modelo-seguranca-acl" className="scroll-mt-28 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 flex items-center justify-center text-purple-600 dark:text-purple-400 font-black text-sm">
            8
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Governança de Acessos e Matriz ACL
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Princípio do menor privilégio, proibição de links anônimos e auditoria de identidade
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-black">
                  <th className="p-4">Identidade / Papel</th>
                  <th className="p-4">Google Drive Role</th>
                  <th className="p-4">Tipo ACL</th>
                  <th className="p-4">Finalidade &amp; Restrições</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                <tr>
                  <td className="p-4 font-bold text-slate-900 dark:text-white">
                    Conta Corporativa SHM (proj.eng.sw@gmail.com)
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-mono font-bold">
                      role: owner
                    </span>
                  </td>
                  <td className="p-4 font-mono">user</td>
                  <td className="p-4">Dona de todos os arquivos e pastas raiz. Controla a cota de 5 TB.</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-slate-900 dark:text-white">
                    Gestor / Administrador SHM
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-mono font-bold">
                      role: reader / writer
                    </span>
                  </td>
                  <td className="p-4 font-mono">user</td>
                  <td className="p-4">Supervisão pericial e suporte administrativo.</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-slate-900 dark:text-white">
                    Conta Google do Cliente (email_google_drive)
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono font-bold">
                      role: reader
                    </span>
                  </td>
                  <td className="p-4 font-mono">user</td>
                  <td className="p-4">Restrito unicamente à sua pasta. Impedido de apagar/alterar fora do SHM.</td>
                </tr>
                <tr className="bg-rose-50/40 dark:bg-rose-950/20">
                  <td className="p-4 font-bold text-rose-800 dark:text-rose-300">
                    Acesso Público / Anônimo
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-mono font-bold">
                      PROIBIDO
                    </span>
                  </td>
                  <td className="p-4 font-mono text-rose-600">anyone</td>
                  <td className="p-4 text-rose-800 dark:text-rose-300 font-bold">
                    Bloqueado por política. Nenhum arquivo possui permissão pública na internet.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. TROCA DA CONTA CORPORATIVA SHM (5 TB) */}
      {/* ========================================================================= */}
      <section id="troca-conta-shm" className="scroll-mt-28 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 flex items-center justify-center text-purple-600 dark:text-purple-400 font-black text-sm">
            9
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Procedimento de Troca da Conta Corporativa SHM (5 TB)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Playbook operacional para migração segura de planos Google One ou Google Workspace
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
            Se for necessário trocar a conta Google corporativa que mantém o armazenamento de 5 TB do SHM (exemplo: migração para domínio próprio <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">storage@empresa.com.br</code>), siga rigorosamente a sequência abaixo:
          </p>

          <div className="space-y-3 pt-2">
            {[
              {
                num: '1',
                titulo: 'Autorização OAuth 2.0 da Nova Conta',
                desc: 'Inicie o fluxo no terminal para obter o novo Refresh Token de 5 TB:',
                cmd: 'python manage.py autorizar_google_drive --porta 8080',
              },
              {
                num: '2',
                titulo: 'Atualização das Variáveis de Ambiente',
                desc: 'O comando atualizará automaticamente o arquivo backend/.env com as novas credenciais. Verifique os campos:',
                cmd: 'GOOGLE_DRIVE_USER_EMAIL=nova.conta@empresa.com.br\nGOOGLE_DRIVE_REFRESH_TOKEN=1//0h...',
              },
              {
                num: '3',
                titulo: 'Re-provisionamento e Espelhamento Delta a partir da VPS',
                desc: 'Como a VPS retém todos os arquivos físicos locais originais, basta executar a varredura completa:',
                cmd: 'python manage.py sincronizar_storage_drive --forcar',
              },
              {
                num: '4',
                titulo: 'Auditoria e Validação de Permissões',
                desc: 'Confira se todas as pastas foram vinculadas aos e-mails corretos dos clientes:',
                cmd: 'python manage.py gerenciar_storage_drive --auditar-permissoes',
              },
            ].map((step) => (
              <div
                key={step.num}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-750 space-y-2 text-xs"
              >
                <div className="flex items-center gap-2 font-black text-slate-900 dark:text-white">
                  <span className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                    {step.num}
                  </span>
                  <span>{step.titulo}</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed font-medium">{step.desc}</p>
                <div className="relative group">
                  <pre className="p-3 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] overflow-x-auto">
                    {step.cmd}
                  </pre>
                  <button
                    onClick={() => handleCopy(step.cmd, `step-${step.num}`)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer shadow-xs"
                    title="Copiar comando"
                  >
                    {copiadoIdx === `step-${step.num}` ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 10. GUIA DE COMANDOS CLI */}
      {/* ========================================================================= */}
      <section id="comandos-cli" className="scroll-mt-28 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 flex items-center justify-center text-purple-600 dark:text-purple-400 font-black text-sm">
            10
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Guia Completo de Comandos Administrativos (CLI)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Comandos via manage.py para governança, diagnósticos e sincronização em lote
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              id: 'cmd-diag',
              titulo: 'Diagnóstico Geral e Cota 5 TB',
              desc: 'Testa conexão, exibe cota usada/disponível e estado das pastas dos clientes:',
              cmd: 'python manage.py gerenciar_storage_drive --diagnostico',
            },
            {
              id: 'cmd-audit',
              titulo: 'Auditoria de Permissões em Massa',
              desc: 'Varre todas as pastas no Google Drive e acusa discrepâncias de acessos:',
              cmd: 'python manage.py gerenciar_storage_drive --auditar-permissoes',
            },
            {
              id: 'cmd-troca-cli',
              titulo: 'Troca de E-mail de Cliente via Terminal',
              desc: 'Executa a rotação atômica de permissões diretamente pela linha de comando:',
              cmd: 'python manage.py gerenciar_storage_drive --trocar-email-cliente --cliente-id 2 --novo-email novo.gestor@gmail.com',
            },
            {
              id: 'cmd-sync-erros',
              titulo: 'Sincronização Seletiva de Falhas',
              desc: 'Re-processa apenas anexos com status de ERRO ou PENDENTE:',
              cmd: 'python manage.py sincronizar_storage_drive --apenas-erros',
            },
            {
              id: 'cmd-sync-force',
              titulo: 'Forçar Espelhamento Completo',
              desc: 'Gera espelhos para todos os arquivos físicos locais para a nuvem:',
              cmd: 'python manage.py sincronizar_storage_drive --forcar',
            },
            {
              id: 'cmd-auth',
              titulo: 'Iniciar Consentimento OAuth 2.0',
              desc: 'Abre o fluxo web para autorização de nova conta Google de 5 TB:',
              cmd: 'python manage.py autorizar_google_drive --porta 8080',
            },
          ].map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2 text-xs flex flex-col justify-between"
            >
              <div>
                <strong className="text-slate-900 dark:text-white block font-black mb-1">{item.titulo}</strong>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium mb-3">
                  {item.desc}
                </p>
              </div>
              <div className="relative group">
                <pre className="p-3 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] overflow-x-auto">
                  {item.cmd}
                </pre>
                <button
                  onClick={() => handleCopy(item.cmd, item.id)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer shadow-xs"
                  title="Copiar comando"
                >
                  {copiadoIdx === item.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 11. MATRIZ DE TRATAMENTO DE ERROS */}
      {/* ========================================================================= */}
      <section id="tratamento-erros-api" className="scroll-mt-28 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 flex items-center justify-center text-purple-600 dark:text-purple-400 font-black text-sm">
            11
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Matriz de Códigos de Erro da Google Drive API
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Comportamento do sistema e ações corretivas para a equipe de suporte e DevOps
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-black">
                  <th className="p-4">Código / Erro</th>
                  <th className="p-4">Causa Raiz</th>
                  <th className="p-4">Comportamento do SHM</th>
                  <th className="p-4">Ação Corretiva do Administrador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                <tr>
                  <td className="p-4 font-mono font-bold text-rose-600">401 Unauthorized</td>
                  <td className="p-4">Access Token expirado ou Refresh Token revogado.</td>
                  <td className="p-4">Tenta auto-refresh. Se falhar, registra log.</td>
                  <td className="p-4">Rodar autorizar_google_drive para emitir novo token.</td>
                </tr>
                <tr>
                  <td className="p-4 font-mono font-bold text-amber-600">403 rateLimitExceeded</td>
                  <td className="p-4">Excedido limite de requisições por segundo.</td>
                  <td className="p-4">Aplica backoff exponencial e tenta novamente.</td>
                  <td className="p-4">Normalizar processos simultâneos em lote.</td>
                </tr>
                <tr>
                  <td className="p-4 font-mono font-bold text-amber-600">403 userRateLimit</td>
                  <td className="p-4">Limite de 750 GB de upload em 24 horas por usuário.</td>
                  <td className="p-4">Marca o arquivo como pendente para a próxima janela.</td>
                  <td className="p-4">Aguardar virada de 24h da Google.</td>
                </tr>
                <tr>
                  <td className="p-4 font-mono font-bold text-slate-600 dark:text-slate-400">404 fileNotFound</td>
                  <td className="p-4">Pasta ou arquivo excluído diretamente na web do Drive.</td>
                  <td className="p-4">Limpa ID cacheado e recria automaticamente.</td>
                  <td className="p-4">Orientar equipe a não apagar pastas direto no Drive.</td>
                </tr>
                <tr>
                  <td className="p-4 font-mono font-bold text-emerald-600">400 alreadyExists</td>
                  <td className="p-4">Permissão solicitada já existia no Google Drive.</td>
                  <td className="p-4">Trata como sucesso idempotente sem falha.</td>
                  <td className="p-4">Nenhuma ação necessária.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
