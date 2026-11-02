import React, { useState } from 'react';
import {
  X,
  MessageSquare,
  Bot,
  ExternalLink,
  Copy,
  Check,
  Send,
  Zap,
  Hash,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface DiscordBotGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToWebhookTab: () => void;
}

export const DiscordBotGuideModal: React.FC<DiscordBotGuideModalProps> = ({
  isOpen,
  onClose,
  onGoToWebhookTab,
}) => {
  const [activeTab, setActiveTab] = useState<'webhook' | 'pinned' | 'bot' | 'permissions'>('webhook');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentOrigin =
    typeof window !== 'undefined' ? window.location.origin : 'https://seu-painel.run.app';

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const pinnedMessageText = `📋 **PAINEL DE ENTREGA DE FARM · FACÇÃO**
Para entregar o seu farm e bater a meta da semana, acesse o link abaixo:

🔗 **Link de Entrega:** ${currentOrigin}

📌 **Regras de Envio:**
1. Tire print do baú com o inventário aberto mostrando o depósito.
2. Informe seu **Nome** e **Passaporte (#ID)**.
3. Cole o print com **Ctrl+V** ou envie a foto.
4. O comprovante será enviado automaticamente para este canal de logs!`;

  const botJsCode = `// Código pronto para Bot do Discord (discord.js v14)
// Envia um botão no canal #entregar-farm que abre o link do painel
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on('ready', async () => {
  console.log(\`Bot online como \${client.user.tag}\`);
});

// Comando para enviar a mensagem fixada no canal
client.on('messageCreate', async (message) => {
  if (message.content === '!setupfarm' && message.member.permissions.has('Administrator')) {
    const embed = new EmbedBuilder()
      .setTitle('🌾 Central de Entrega de Farm FiveM')
      .setDescription('Clique no botão abaixo para registrar sua entrega com foto comprovante, horário exato e quantidade.')
      .setColor('#4F46E5')
      .setFooter({ text: 'Logs enviados automaticamente para a gerência' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('📦 Abrir Painel de Farm')
        .setStyle(ButtonStyle.Link)
        .setURL('${currentOrigin}')
    );

    await message.channel.send({ embeds: [embed], components: [row] });
  }
});

client.login('SEU_DISCORD_BOT_TOKEN');`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 md:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Como colocar no canal do Discord"
    >
      <div
        className="w-full max-w-3xl bg-[#111827] border border-slate-800 rounded-xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Como colocar isso num canal do Discord?
              </h3>
              <p className="text-xs text-slate-400">
                Escolha o método mais prático para o seu servidor FiveM
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-6 pt-3 border-b border-slate-800 flex items-center gap-2 bg-[#0D121C]">
          <button
            type="button"
            onClick={() => setActiveTab('webhook')}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'webhook'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            1. Canal de Logs (Webhook) ⭐ Mais Fácil
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pinned')}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'pinned'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            2. Mensagem com Link no Canal
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bot')}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'bot'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            3. Bot com Botão no Discord
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('permissions')}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'permissions'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            4. Permissões de Pastas (Cargos Altos) 🔒
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm flex-1">
          {activeTab === 'webhook' && (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-950/20 border border-indigo-900/50 rounded-lg flex items-start gap-3">
                <Zap className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed text-indigo-200">
                  <strong>Como funciona:</strong> Toda vez que qualquer jogador ou membro envia um farm aqui no painel, o sistema posta <strong>automaticamente dentro do canal do Discord</strong> com a foto do print anexada, quantidade, horário e passaporte!
                </div>
              </div>

              {/* Destaque: Canal de Fórum (Cria Pastas) vs Canal de Texto Comum */}
              <div className="p-4 bg-indigo-950/40 border border-indigo-500/40 rounded-xl space-y-3 text-xs">
                <div className="flex items-center gap-2 font-bold text-indigo-300 text-sm">
                  <span>📁 Como ter as Pastas Individuais criadas no Discord:</span>
                </div>
                <div className="space-y-2 text-slate-300 leading-relaxed text-xs">
                  <p>
                    <strong className="text-amber-300">1. Para criar PASTAS AUTOMÁTICAS (Recomendado):</strong> O canal no Discord deve ser do tipo <strong>Fórum</strong>. É nele que o Discord permite que o Webhook crie as pastas/tópicos <code className="bg-slate-900 px-1.5 py-0.5 rounded text-indigo-300">📁・Nome [#ID]</code> para cada membro automaticamente!
                  </p>
                  <p className="text-[11px] text-slate-400 pl-3 border-l-2 border-indigo-500/50">
                    💡 <em>Dica de ouro:</em> Nas configurações do canal de Fórum no Discord, <strong>desmarque</strong> a opção "Exigir que os membros escolham uma tag". Assim o site cria a pasta do membro sozinho sem erros!
                  </p>
                  <p>
                    <strong className="text-slate-300">2. Se usar Canal de Texto Normal (#):</strong> O Discord <strong>não</strong> cria pastas/tópicos automáticos por Webhook. Todas as entregas chegam como logs no chat corrido.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-indigo-400" />
                  Passo a Passo para Criar o Canal de Fórum com Pastas Automáticas:
                </h4>
                <ol className="space-y-3 text-xs text-slate-300">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-mono shrink-0">
                      1
                    </span>
                    <div>
                      <strong className="text-slate-100">Crie o Canal:</strong> Clique no botão (+) no seu Discord e selecione o tipo <strong>💬 Fórum</strong> (ou Texto se preferir chat direto). Dê o nome de <code className="bg-slate-900 px-1 py-0.5 rounded text-indigo-300">pastas-farm</code>.
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-mono shrink-0">
                      2
                    </span>
                    <div>
                      <strong className="text-slate-100">Desative a exigência de tags:</strong> Nas configurações do canal de Fórum, desmarque a caixinha "Exigir tag para postar".
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-mono shrink-0">
                      3
                    </span>
                    <div>
                      <strong className="text-slate-100">Pegue o Webhook:</strong> Vá em ⚙️ Editar Canal &gt; Integrações &gt; Webhooks &gt; Novo Webhook &gt; Copiar URL.
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-mono shrink-0">
                      4
                    </span>
                    <div>
                      <strong className="text-slate-100">Salve no Painel:</strong> Cole o link na aba <strong>Webhook Discord</strong> e clique em Salvar. Pronto! Toda entrega cria ou vai direto para a pasta do jogador!
                    </div>
                  </li>
                </ol>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onGoToWebhookTab();
                  }}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  Ir para a aba Webhook Discord e colar a URL agora
                </button>
              </div>
            </div>
          )}

          {activeTab === 'pinned' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Você pode criar um canal chamado <code className="bg-slate-900 px-1.5 py-0.5 rounded text-indigo-300">#como-entregar-farm</code> no Discord e fixar a mensagem abaixo. Os membros só precisam clicar no link, que abre direto tanto no PC quanto no celular!
              </p>

              <div className="relative">
                <pre className="p-4 bg-[#070A10] border border-slate-800 rounded-lg text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {pinnedMessageText}
                </pre>
                <button
                  type="button"
                  onClick={() => copyToClipboard(pinnedMessageText, 'pinned')}
                  className="absolute top-3 right-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-xs font-medium text-slate-200 flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedCode === 'pinned' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      Copiar Texto
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'bot' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Se o seu servidor já possui um Bot próprio no Discord, você pode usar este script simples em <strong>discord.js</strong> para enviar uma mensagem permanente com um botão oficial do Discord:
              </p>

              <div className="relative">
                <pre className="p-4 bg-[#070A10] border border-slate-800 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed max-h-64">
                  <code>{botJsCode}</code>
                </pre>
                <button
                  type="button"
                  onClick={() => copyToClipboard(botJsCode, 'bot')}
                  className="absolute top-3 right-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-xs font-medium text-slate-200 flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedCode === 'bot' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      Copiar Script do Bot
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className="space-y-4 text-xs text-slate-300">
              <div className="p-4 bg-indigo-950/20 border border-indigo-900/50 rounded-lg space-y-2">
                <h4 className="font-semibold text-indigo-300 text-sm flex items-center gap-2">
                  <span>🔒 Configuração de Visibilidade das Pastas no Discord</span>
                </h4>
                <p className="text-slate-300 leading-relaxed">
                  Para que <strong>todas as pastas apareçam para os Cargos Altos</strong> da sua organização e <strong>apenas para a pessoa com o ID cadastrado</strong>, siga estas configurações simples no canal do Discord:
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 bg-[#070A10] border border-slate-800 rounded-lg space-y-2">
                  <span className="font-semibold text-rose-300 block">
                    1. Configuração para os Cargos Altos (Gerência / Liderança):
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                    <li>Vá em <strong>Editar Canal</strong> &gt; <strong>Permissões</strong>.</li>
                    <li>Adicione o Cargo Alto (ex: <code>@Gerência</code> ou <code>@Liderança</code>).</li>
                    <li>Ative as permissões: <strong>Ver Canal</strong>, <strong>Gerenciar Tópicos</strong> e <strong>Ler Histórico de Mensagens</strong>.</li>
                    <li><em>Resultado:</em> Os membros com esse cargo verão <strong>todas as pastas de todos os membros</strong> automaticamente.</li>
                  </ul>
                </div>

                <div className="p-3.5 bg-[#070A10] border border-slate-800 rounded-lg space-y-2">
                  <span className="font-semibold text-emerald-300 block">
                    2. Configuração para Membros Normais (@everyone):
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                    <li>No mesmo canal, selecione o cargo <code>@everyone</code>.</li>
                    <li>Deixe a permissão <strong>Criar Tópicos Públicos</strong> = <span className="text-rose-400">Desativado</span>.</li>
                    <li>Deixe <strong>Criar Tópicos Privados</strong> = <span className="text-rose-400">Desativado</span>.</li>
                    <li>Deixe <strong>Enviar Mensagens em Tópicos</strong> = <span className="text-slate-400">Opcional</span>.</li>
                  </ul>
                </div>

                <div className="p-3.5 bg-[#070A10] border border-slate-800 rounded-lg space-y-2">
                  <span className="font-semibold text-indigo-300 block">
                    3. Como a pessoa com o ID cadastrado tem acesso:
                  </span>
                  <p className="text-slate-400 leading-relaxed">
                    Quando o membro se cadastra ou faz sua primeira entrega, o bot abre o tópico mencionando o Cargo Alto e o titular cadastrado (<code>&lt;@ID_Discord&gt;</code>). O Discord adiciona o membro titular <strong>apenas ao seu próprio tópico</strong>, garantindo que ele veja apenas a pasta dele e nenhum membro veja a pasta de outro.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-[#0D121C] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 rounded-lg cursor-pointer"
          >
            Fechar Guia
          </button>
        </div>
      </div>
    </div>
  );
};
