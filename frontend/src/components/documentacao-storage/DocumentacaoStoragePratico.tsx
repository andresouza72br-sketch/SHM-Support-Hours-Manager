import { useState } from 'react'
import {
  Cloud,
  Zap,
  FolderOpen,
  ShieldCheck,
  ExternalLink,
  CheckCircle2,
  Lock,
  ChevronDown,
  Info,
} from 'lucide-react'

interface DocumentacaoStoragePraticoProps {
  userClienteFolderUrl?: string | null
  userClienteNome?: string | null
}

export function DocumentacaoStoragePratico({
  userClienteFolderUrl,
  userClienteNome,
}: DocumentacaoStoragePraticoProps) {
  const [faqAberta, setFaqAberta] = useState<number | null>(0)

  const toggleFaq = (index: number) => {
    setFaqAberta(faqAberta === index ? null : index)
  }

  const faqs = [
    {
      pergunta: 'Não vejo a pasta no meu Google Drive. O que devo checar primeiro?',
      resposta: (
        <div className="space-y-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          <p>
            Certifique-se de que você está autenticado no Google com o <strong>mesmo endereço de e-mail</strong>{' '}
            cadastrado no campo <em>E-mail Google para Drive</em> no SHM.
          </p>
          <p>
            Além disso, lembre-se de que no Google Drive as pastas compartilhadas por outras contas ficam na aba{' '}
            <strong>"Partilhados comigo"</strong> (menu lateral esquerdo), e não na raiz de "O meu disco", até que você
            crie um atalho.
          </p>
        </div>
      ),
    },
    {
      pergunta: 'O e-mail cadastrado precisa ser obrigatoriamente @gmail.com?',
      resposta: (
        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          Não! Você pode utilizar qualquer endereço de e-mail corporativo gerenciado pelo <strong>Google Workspace</strong>{' '}
          (exemplo: <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">diretoria@minhaempresa.com.br</code>). O único requisito é que o domínio utilize a plataforma do Google para que as permissões de acesso sejam vinculadas.
        </p>
      ),
    },
    {
      pergunta: 'Posso adicionar ou excluir arquivos diretamente pela interface web do Google Drive?',
      resposta: (
        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          Não. A pasta é provisionada no modo <strong>Somente Leitura (role: reader)</strong> para a segurança da sua
          organização. Todos os uploads e exclusões devem ser realizados exclusivamente através do sistema SHM. Isso
          garante o carimbo de tempo, registro de autor e o cálculo matemático do Hash SHA-256 para validade jurídica e
          auditoria.
        </p>
      ),
    },
    {
      pergunta: 'O que acontece com os arquivos no Google Drive se um pedido for excluído no SHM?',
      resposta: (
        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          Quando um anexo ou pedido é formalmente excluído do sistema SHM, o serviço despacha uma rotina assíncrona que
          expurga fisicamente o arquivo do servidor local e do Google Drive corporativo, garantindo conformidade com a
          LGPD e evitando acúmulo de dados desnecessários.
        </p>
      ),
    },
    {
      pergunta: 'Qual é o limite de tamanho para envio de anexos?',
      resposta: (
        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          O SHM suporta anexos de até <strong>50 MB por arquivo</strong> diretamente pelo portal. O armazenamento
          corporativo da infraestrutura possui uma cota de <strong>5 Terabytes</strong>, assegurando retenção contínua e
          ilimitada para todas as ordens de serviço, atas e propostas do seu contrato.
        </p>
      ),
    },
  ]

  return (
    <div className="space-y-12">
      {/* ========================================================================= */}
      {/* 1. O QUE É O CLOUD STORAGE HÍBRIDO */}
      {/* ========================================================================= */}
      <section id="o-que-e-cloud-storage" className="scroll-mt-28 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-sm">
            1
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              O que é o SHM Cloud Storage Híbrido?
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Arquitetura Dual-Storage: persistência ágil em VPS somada ao arquivamento perene no Google Drive (5 TB)
            </p>
          </div>
        </div>

        {/* Card Comparativo Dual-Storage */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Camada 1: VPS Local */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Zap className="w-24 h-24 text-amber-500" />
            </div>
            <div className="flex items-center gap-2.5 mb-3">
              <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
                <Zap className="w-4 h-4" />
              </span>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                  Camada 1 • Velocidade Imediata
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Armazenamento Local (VPS)</h3>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Armazena arquivos em SSDs NVMe de alta velocidade na infraestrutura do SHM. Permite que propostas, relatórios e áudios abram instantaneamente na tela do seu chamado sem qualquer lentidão.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-semibold text-slate-500">
              <span>Latência média: &lt; 50ms</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">Disponibilidade Instantânea</span>
            </div>
          </div>

          {/* Camada 2: Google Drive 5 TB */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Cloud className="w-24 h-24 text-indigo-500" />
            </div>
            <div className="flex items-center gap-2.5 mb-3">
              <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
                <Cloud className="w-4 h-4" />
              </span>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                  Camada 2 • Backup Perene &amp; Nuvem
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Google Drive Corporativo (5 TB)</h3>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Espelhamento automático em segundo plano para a nuvem de 5 Terabytes do Google. Garante que os documentos da sua empresa nunca sejam perdidos e possam ser acessados diretamente no app Google Drive.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-semibold text-slate-500">
              <span>Cota Corporativa: 5 TB</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">Isolamento Estrito</span>
            </div>
          </div>
        </div>

        {/* Banner de Ação Rápida se o usuário tiver link */}
        {userClienteFolderUrl && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 via-violet-50 to-indigo-50 dark:from-indigo-950/40 dark:via-violet-950/30 dark:to-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-xs shrink-0">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 dark:text-white">
                  Pasta do Google Drive de {userClienteNome || 'Sua Organização'}
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                  Sua pasta corporativa já está criada e sincronizada.
                </p>
              </div>
            </div>
            <a
              href={userClienteFolderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs shrink-0 cursor-pointer"
            >
              <span>Abrir Pasta no Google Drive</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 2. ONDE ACHAR SUA PASTA NO GOOGLE DRIVE */}
      {/* ========================================================================= */}
      <section id="onde-achar-pasta" className="scroll-mt-28 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-sm">
            2
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Onde Encontrar sua Pasta no Google Drive
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Passo a passo para localizar e fixar a pasta na sua tela principal do Drive
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Passo 1 */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-black flex items-center justify-center">
                1
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Passo Inicial</span>
            </div>
            <h4 className="text-sm font-black text-slate-900 dark:text-white">Acesse com a Conta Correta</h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Entre em <strong>drive.google.com</strong> conectado exatamente com o e-mail Google cadastrado para o seu
              cliente no portal SHM.
            </p>
          </div>

          {/* Passo 2 */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-black flex items-center justify-center">
                2
              </span>
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Localização</span>
            </div>
            <h4 className="text-sm font-black text-slate-900 dark:text-white">Clique em "Partilhados comigo"</h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              No menu lateral esquerdo, clique no item com ícone de <strong>duas pessoas</strong>. Sua pasta com formato{' '}
              <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-mono">ID - Nome</code>{' '}
              estará listada lá.
            </p>
          </div>

          {/* Passo 3 */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3 border-indigo-200/60 dark:border-indigo-800/40">
            <div className="flex items-center justify-between">
              <span className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-black flex items-center justify-center">
                3
              </span>
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Dica Prática</span>
            </div>
            <h4 className="text-sm font-black text-slate-900 dark:text-white">Crie um Atalho em "O meu disco"</h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Clique com o botão direito na pasta e selecione <strong>Organizar ➔ Adicionar atalho</strong> (ou tecle{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[10px]">Shift + Z</kbd>).
              Assim ela aparecerá na sua tela principal!
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-3">
          <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Por que a pasta não aparece direto em "O meu disco"?</strong> No ecossistema do Google Drive, todo
            documento ou pasta compartilhado por terceiros reside na aba <em>"Partilhados comigo"</em> para que a sua
            cota de armazenamento pessoal não seja consumida. O espaço ocupado é integralmente absorvido pelos{' '}
            <strong>5 TB da conta corporativa do SHM</strong>.
          </p>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. ORGANIZAÇÃO DOS ANEXOS */}
      {/* ========================================================================= */}
      <section id="organizacao-anexos" className="scroll-mt-28 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-sm">
            3
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Organização Automática dos Anexos
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Subpastas temáticas padronizadas e sincronização contínua
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
          <div className="font-mono text-xs p-4 rounded-2xl bg-slate-950 text-slate-200 overflow-x-auto leading-relaxed border border-slate-800">
            <div className="text-indigo-400 font-bold">📁 [ID] - [Nome da Sua Empresa]/</div>
            <div className="pl-4 text-slate-400">├── 📁 <span className="text-emerald-400 font-bold">pedidos/</span></div>
            <div className="pl-8 text-slate-300">└── 📄 Proposta_Tecnica_e_Orcamento_Julho_2026.pdf</div>
            <div className="pl-8 text-slate-300">└── 📄 Termo_de_Abertura_OS2026090012.pdf</div>
            <div className="pl-4 text-slate-400">└── 📁 <span className="text-sky-400 font-bold">comunicacao/</span></div>
            <div className="pl-8 text-slate-300">└── 📄 ATA_DE_REUNIAO_07-07-2026_RE-BRIEFING.pdf</div>
            <div className="pl-8 text-slate-300">└── 📄 Relatorio_Entrega_Layout_Responsivo.pdf</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
              <span className="font-black text-emerald-800 dark:text-emerald-300 block mb-1">Subpasta "pedidos/"</span>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                Contém os arquivos principais vinculados diretamente ao pedido, como especificações iniciais, minutas, propostas técnicas e orçamentos aprovados.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/50">
              <span className="font-black text-sky-800 dark:text-sky-300 block mb-1">Subpasta "comunicacao/"</span>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                Reúne os arquivos trocados nos ciclos de atendimento, chats, atas de reuniões alinhadas e relatórios parciais de execução técnica.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. PERMISSÕES E PRIVACIDADE */}
      {/* ========================================================================= */}
      <section id="seguranca-privacidade" className="scroll-mt-28 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-sm">
            4
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Permissões, Segurança e Privacidade Estrita
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Garantias de conformidade, isolamento de dados e proteção jurídica
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-black text-slate-900 dark:text-white">Acesso Somente Leitura</h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Sua conta recebe o papel <code className="px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 font-mono">role: reader</code>, permitindo visualizar e baixar, mas impedindo que arquivos sejam apagados ou modificados acidentalmente fora do fluxo do SHM.
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-black text-slate-900 dark:text-white">Zero Links Públicos</h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Não existem links públicos na internet para as suas pastas. Ninguém que não esteja autenticado com a conta Google corporativa do cliente consegue ter acesso.
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-black text-slate-900 dark:text-white">Isolamento de Clientes</h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Cada cliente possui sua própria pasta isolada. Um cliente nunca consegue visualizar o nome, a estrutura ou os documentos pertencentes a outra empresa.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. TROCA DE CONTA GMAIL DO CLIENTE */}
      {/* ========================================================================= */}
      <section id="troca-gmail-cliente" className="scroll-mt-28 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-sm">
            5
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Troca de E-mail Google do Cliente (Procedimento Seguro)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Como funciona a transição atômica de contas com revogação e registro de auditoria
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
            Se a sua organização mudar de responsável técnico, contratar uma nova conta do Google Workspace ou precisar trocar o endereço de e-mail autorizado, o SHM realiza uma rotação atômica de segurança sem risco de vazamento:
          </p>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-xs">
              <span className="w-6 h-6 rounded-lg bg-rose-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                1
              </span>
              <div>
                <strong className="text-rose-900 dark:text-rose-200 block mb-0.5">Revogação Imediata do E-mail Anterior:</strong>
                <span className="text-slate-600 dark:text-slate-300">
                  O sistema aciona a API do Google Drive e deleta permanentemente a permissão do endereço anterior. O antigo responsável perde o acesso no exato segundo da confirmação.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 text-xs">
              <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                2
              </span>
              <div>
                <strong className="text-emerald-900 dark:text-emerald-200 block mb-0.5">Concessão Atômica para a Nova Conta:</strong>
                <span className="text-slate-600 dark:text-slate-300">
                  A nova conta Google recebe acesso de leitor na mesma pasta corporativa, preservando intacto todo o histórico anterior de propostas e relatórios.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 text-xs">
              <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                3
              </span>
              <div>
                <strong className="text-indigo-900 dark:text-indigo-200 block mb-0.5">Trilha de Auditoria Forense e Notificação:</strong>
                <span className="text-slate-600 dark:text-slate-300">
                  O sistema registra quem solicitou a troca, o IP de origem, data/hora e emite alertas na central de notificações para os administradores.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. PERGUNTAS FREQUENTES (FAQ) */}
      {/* ========================================================================= */}
      <section id="faq-duvidas" className="scroll-mt-28 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-sm">
            6
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Perguntas Frequentes (FAQ)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Respostas diretas para dúvidas operacionais comuns
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isAberta = faqAberta === index
            return (
              <div
                key={index}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs transition-all duration-150"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 font-black text-xs sm:text-sm text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer"
                >
                  <span>{faq.pergunta}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                      isAberta ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : ''
                    }`}
                  />
                </button>
                {isAberta && (
                  <div className="px-4 pb-5 sm:px-5 border-t border-slate-100 dark:border-slate-800 pt-3">
                    {faq.resposta}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
