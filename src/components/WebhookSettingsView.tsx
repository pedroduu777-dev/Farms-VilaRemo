import React, { useState, useEffect } from 'react';
import {
  Save,
  Send,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Terminal,
  HelpCircle,
  FolderGit2,
  FolderOpen,
} from 'lucide-react';
import { DiscordWebhookConfig, FarmCategory } from '../types/farm';
import { DiscordEmbedPreview } from './DiscordEmbedPreview';

interface WebhookSettingsViewProps {
  config: DiscordWebhookConfig;
  onSaveConfig: (nextConfig: DiscordWebhookConfig) => Promise<void>;
  onTestWebhook: (webhookUrl: string) => Promise<{ message: string }>;
  onOpenDiscordGuide?: () => void;
}

const COLOR_PRESETS = [
  { label: 'Índigo', value: '#4F46E5' },
  { label: 'Esmeralda', value: '#16A34A' },
  { label: 'Âmbar', value: '#D97706' },
  { label: 'Carmesim', value: '#DC2626' },
  { label: 'Ciano Escuro', value: '#0284C7' },
];

export const WebhookSettingsView: React.FC<WebhookSettingsViewProps> = ({
  config,
  onSaveConfig,
  onTestWebhook,
  onOpenDiscordGuide,
}) => {
  const [formState, setFormState] = useState<DiscordWebhookConfig>(config);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [copiedLua, setCopiedLua] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    setFormState(config);
  }, [config]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    try {
      setIsSaving(true);
      await onSaveConfig(formState);
      setStatusMessage({
        type: 'success',
        text: 'Configurações do Webhook e metas salvas com sucesso.',
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao salvar configuração.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setStatusMessage(null);
    try {
      setIsTesting(true);
      const res = await onTestWebhook(formState.webhookUrl);
      setStatusMessage({
        type: 'success',
        text: res.message,
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Falha ao testar Webhook.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const apiOrigin =
    typeof window !== 'undefined' ? window.location.origin : 'https://seu-painel.run.app';

  const luaSnippet = `RegisterCommand("entregarfarm", function(source, args)
    local user_id = vRP.getUserId(source)
    local identity = vRP.getUserIdentity(user_id)
    local itemName = args[1] or "Folha Processada"
    local qtd = tonumber(args[2]) or 100
    local fotoUrl = args[3] -- Link da captura screenshot-basic ou CDN

    if not fotoUrl then
        TriggerClientEvent("Notify", source, "negado", "Anexe o link da foto ou use o Painel Web.")
        return
    end

    local payload = json.encode({
        playerName = identity.name .. " " .. identity.firstname,
        passportId = tostring(user_id),
        itemName = itemName,
        quantity = qtd,
        unit = "unid.",
        chestLocation = "Baú Principal #01",
        deliveredAt = os.date("!%Y-%m-%dT%H:%M:%SZ"),
        photoUrl = fotoUrl
    })

    PerformHttpRequest("${apiOrigin}/api/deliveries", function(err, text, headers)
        if err == 201 then
            TriggerClientEvent("Notify", source, "sucesso", "Farm registrado e enviado ao Discord!")
        end
    end, "POST", payload, { ["Content-Type"] = "application/json" })
end)`;

  const handleCopyLua = () => {
    navigator.clipboard.writeText(luaSnippet);
    setCopiedLua(true);
    setTimeout(() => setCopiedLua(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Webhook Config Form */}
        <form
          onSubmit={handleSave}
          className="lg:col-span-7 bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-6"
        >
          <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">
                Configuração de Log Automático no Canal do Discord
              </h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Toda entrega feita no painel será enviada como embed e foto para o seu canal.
              </p>
            </div>
            {onOpenDiscordGuide && (
              <button
                type="button"
                onClick={onOpenDiscordGuide}
                className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-xs font-semibold text-indigo-300 rounded-lg flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shrink-0 whitespace-nowrap"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Como pegar o link?
              </button>
            )}
          </div>

          {statusMessage && (
            <div
              role="status"
              className={`p-3.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-800/60 text-rose-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="webhook-url"
              className="block text-xs font-medium text-slate-300 mb-1.5"
            >
              URL do Webhook do Canal do Discord
            </label>
            <input
              id="webhook-url"
              type="url"
              value={formState.webhookUrl}
              onChange={(e) =>
                setFormState((prev) => ({ ...prev, webhookUrl: e.target.value }))
              }
              placeholder="https://discord.com/api/webhooks/1234567890/token..."
              className="w-full px-3.5 py-2.5 bg-[#0B0F17] border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-lg text-sm font-mono text-slate-100 placeholder:text-slate-600"
            />
            <p className="text-xs text-slate-500 mt-1.5">
              No Discord: Editar Canal (#logs-farm) &gt; Integrações &gt; Webhooks &gt; Novo Webhook &gt; Copiar URL.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="bot-name"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Nome Exibido no Bot do Log
              </label>
              <input
                id="bot-name"
                type="text"
                value={formState.botName}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, botName: e.target.value }))
                }
                placeholder="FazendaLog · Auditoria FiveM"
                className="w-full px-3.5 py-2.5 bg-[#0B0F17] border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-lg text-sm text-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="org-name"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Nome da Facção / Organização
              </label>
              <input
                id="org-name"
                type="text"
                value={formState.serverName}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, serverName: e.target.value }))
                }
                placeholder="Vila Remo"
                className="w-full px-3.5 py-2.5 bg-[#0B0F17] border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-lg text-sm text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="role-mention"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Menção do Cargo Alto (Gerência / Liderança)
              </label>
              <input
                id="role-mention"
                type="text"
                value={formState.roleMention}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, roleMention: e.target.value }))
                }
                placeholder="Ex: <@1528141958856442052> ou @Gerência"
                className="w-full px-3.5 py-2.5 bg-[#0B0F17] border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-lg text-sm font-mono text-slate-100 placeholder:text-slate-600"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Este cargo é mencionado na criação de cada pasta, garantindo que os Cargos Altos tenham acesso a todas as pastas de farm no Discord.
              </p>
            </div>

            <div>
              <label
                htmlFor="weekly-goal"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Meta Semanal por Membro (unid.)
              </label>
              <input
                id="weekly-goal"
                type="number"
                min={50}
                step={50}
                value={formState.weeklyGoalPerMember}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    weeklyGoalPerMember: Math.max(50, parseInt(e.target.value || '50', 10)),
                  }))
                }
                className="w-full px-3.5 py-2.5 bg-[#0B0F17] border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-lg text-sm font-mono tabular-nums text-slate-100"
              />
            </div>
          </div>

          {/* Embed Accent Color */}
          <div>
            <span className="block text-xs font-medium text-slate-300 mb-2">
              Cor da Mensagem Embed no Discord
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_PRESETS.map((preset) => {
                const isSelected =
                  formState.embedColor.toLowerCase() === preset.value.toLowerCase();
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() =>
                      setFormState((prev) => ({ ...prev, embedColor: preset.value }))
                    }
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-slate-800 border-slate-500 text-slate-100'
                        : 'bg-[#0B0F17] border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-xs shrink-0"
                      style={{ backgroundColor: preset.value }}
                    />
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Auto-send toggle */}
          <label className="flex items-center justify-between gap-4 py-3 border-t border-slate-800/80 cursor-pointer">
            <div>
              <span className="text-sm font-medium text-slate-200 block">
                Disparo automático ao registrar farm
              </span>
              <span className="text-xs text-slate-400">
                Envia a foto anexada, data/hora exata e quantidade imediatamente após cada entrega.
              </span>
            </div>
            <input
              type="checkbox"
              checked={formState.autoSend}
              onChange={(e) =>
                setFormState((prev) => ({ ...prev, autoSend: e.target.checked }))
              }
              className="w-4 h-4 accent-indigo-600 rounded cursor-pointer shrink-0"
            />
          </label>

          {/* Member Folders / Threads toggle */}
          <div className="p-4 bg-indigo-950/20 border border-indigo-500/20 rounded-xl space-y-3">
            <label className="flex items-start justify-between gap-4 cursor-pointer">
              <div className="flex items-start gap-3">
                <FolderOpen className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-sm font-medium text-slate-200 block">
                    Criar Pasta Individual de Farm para Cada Membro
                  </span>
                  <span className="text-xs text-slate-400 leading-relaxed block mt-0.5">
                    Quando um membro se cadastra, o Discord cria automaticamente um tópico/pasta no canal (ex: <code className="text-indigo-300 font-mono">📁・[FARM] Nick #ID</code>). Todas as entregas desse membro são arquivadas dentro da pasta dele!
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={formState.enableMemberThreads !== false}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    enableMemberThreads: e.target.checked,
                  }))
                }
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer shrink-0 mt-1"
              />
            </label>

            <div className="text-[11px] text-slate-400 bg-[#090D16] p-2.5 rounded-lg border border-slate-800/80 space-y-1">
              <span className="font-semibold text-indigo-300 block">💡 Dica de Organização no Discord:</span>
              <p>
                Para ter o layout perfeito de pastas no Discord, crie um canal do tipo <strong>Fórum</strong> (ex: <code className="text-slate-300">📁・pastas-de-farm</code>) e gere o Webhook nele. Cada membro terá sua própria postagem/pasta organizada!
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-2.5 px-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Salvando...' : 'Salvar Configuração'}
            </button>

            <button
              type="button"
              disabled={isTesting}
              onClick={handleTest}
              className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Send className="w-3.5 h-3.5 text-indigo-400" />
              {isTesting ? 'Enviando teste...' : 'Enviar Teste ao Discord'}
            </button>
          </div>
        </form>

        {/* Right: Live Embed Preview */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-200">
            Modelo do Log Enviado ao Canal do Discord
          </h3>
          <DiscordEmbedPreview
            config={formState}
            playerName="Lucas Mendes"
            passportId="1042"
            itemName="Peças de Fuzil (AK / G3)"
            category={FarmCategory.PECAS}
            quantity={650}
            unit="unid."
            chestLocation="Baú da Fac"
            deliveredAt={new Date().toISOString()}
            photoUrl="seed:herbs"
            notes="Print verificado automaticamente no depósito."
          />
        </div>
      </div>

      {/* Optional FiveM Lua Server Snippet */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <Terminal className="w-4 h-4 text-indigo-400" />
              <span>Integração Direta no FiveM (Opcional · server.lua)</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Além do envio pelo painel web, você pode conectar seu script vRP / Creative / QBCore diretamente na rota `/api/deliveries`.
            </p>
          </div>

          <button
            type="button"
            onClick={handleCopyLua}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 inline-flex items-center gap-2 self-start sm:self-auto transition-colors cursor-pointer whitespace-nowrap"
          >
            {copiedLua ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Script Copiado
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                Copiar Código Lua
              </>
            )}
          </button>
        </div>

        <pre className="p-4 bg-[#070A10] border border-slate-800 rounded-lg overflow-x-auto text-xs font-mono text-slate-300 leading-relaxed">
          <code>{luaSnippet}</code>
        </pre>
      </div>
    </div>
  );
};
