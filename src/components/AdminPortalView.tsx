import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  LogOut,
  History,
  Trophy,
  Webhook,
  Lock,
  KeyRound,
  Save,
  CheckCircle2,
  AlertCircle,
  Users,
  Trash2,
  ShieldCheck,
  FolderKanban,
  Folder,
  ExternalLink,
  RefreshCw,
  Search,
  FileText,
  MessageSquare,
  Moon,
  ChevronDown,
  ChevronUp,
  Eye,
  Sparkles,
  Calendar,
  Send,
} from 'lucide-react';
import {
  AuditStatus,
  DiscordWebhookConfig,
  FarmDelivery,
  MemberAccount,
} from '../types/farm';
import {
  loadStoredMembers,
  saveStoredMembers,
  clearAllMembers,
  updateMemberThread,
} from '../services/storageService';
import { createMemberDiscordFolder, sendDailyCrackReportToDiscord } from '../services/discordService';
import { DeliveryHistoryView } from './DeliveryHistoryView';
import { LeaderboardView } from './LeaderboardView';
import { WebhookSettingsView } from './WebhookSettingsView';
import { ProofImage, ProofLightboxModal } from './ProofImage';
import { formatExactDateTime } from '../utils/farmHelpers';

interface AdminPortalViewProps {
  config: DiscordWebhookConfig;
  deliveries: FarmDelivery[];
  isLoading: boolean;
  resendingId: string | null;
  onSelectDelivery: (delivery: FarmDelivery) => void;
  onResendWebhook: (id: string) => Promise<void>;
  onUpdateAudit: (id: string, status: AuditStatus) => Promise<void>;
  onSaveConfig: (nextConfig: DiscordWebhookConfig) => Promise<void>;
  onTestWebhook: (webhookUrl: string) => Promise<{ message: string }>;
  onExitAdmin: () => void;
  onGoToNewDelivery: () => void;
  onOpenDiscordGuide: () => void;
  onResetAll?: () => void;
}

type AdminTab = 'audit' | 'ranking' | 'folders' | 'fechamento' | 'config' | 'security';

export const AdminPortalView: React.FC<AdminPortalViewProps> = ({
  config,
  deliveries,
  isLoading,
  resendingId,
  onSelectDelivery,
  onResendWebhook,
  onUpdateAudit,
  onSaveConfig,
  onTestWebhook,
  onExitAdmin,
  onGoToNewDelivery,
  onOpenDiscordGuide,
  onResetAll,
}) => {
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>('audit');
  const [newPin, setNewPin] = useState(config.adminPin || '0604');
  const [isSavingPin, setIsSavingPin] = useState(false);
  const [pinFeedback, setPinFeedback] = useState<{
    type: 'success' | 'error';
    msg: string;
  } | null>(null);

  const [members, setMembers] = useState<MemberAccount[]>(() => loadStoredMembers());

  const handleDeleteMember = (id: string) => {
    if (window.confirm(`Deseja remover o cadastro do membro com ID #${id}? Ele precisará se cadastrar novamente.`)) {
      const updated = members.filter((m) => m.id !== id);
      setMembers(updated);
      saveStoredMembers(updated);
    }
  };

  const [folderSearch, setFolderSearch] = useState('');
  const [syncingMemberId, setSyncingMemberId] = useState<string | null>(null);
  const [folderFeedback, setFolderFeedback] = useState<{
    id: string;
    type: 'success' | 'error';
    msg: string;
  } | null>(null);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [lightboxDelivery, setLightboxDelivery] = useState<FarmDelivery | null>(null);
  const [isSendingCrackReport, setIsSendingCrackReport] = useState(false);
  const [crackReportFeedback, setCrackReportFeedback] = useState<{
    type: 'success' | 'error';
    msg: string;
  } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSendManualCrackReport = async () => {
    setCrackReportFeedback(null);
    setIsSendingCrackReport(true);
    try {
      const res = await sendDailyCrackReportToDiscord(deliveries, members, config);
      setCrackReportFeedback({
        type: res.ok ? 'success' : 'error',
        msg: res.message,
      });
    } catch (err) {
      setCrackReportFeedback({
        type: 'error',
        msg: err instanceof Error ? err.message : 'Falha ao enviar relatório.',
      });
    } finally {
      setIsSendingCrackReport(false);
    }
  };

  const handleSyncMemberFolder = async (m: MemberAccount) => {
    if (!config.webhookUrl) {
      setFolderFeedback({
        id: m.id,
        type: 'error',
        msg: 'Configure a URL do Webhook do Discord na aba Configuração Discord.',
      });
      return;
    }
    setSyncingMemberId(m.id);
    setFolderFeedback(null);
    try {
      const res = await createMemberDiscordFolder(m, config);
      if (res.ok) {
        if (res.threadId) {
          updateMemberThread(m.id, res.threadId);
          setMembers((prev) =>
            prev.map((item) =>
              item.id === m.id ? { ...item, discordThreadId: res.threadId } : item
            )
          );
        }
        setFolderFeedback({
          id: m.id,
          type: 'success',
          msg: `Pasta de ${m.name} sincronizada com sucesso no Discord! Cargos Altos e titular foram adicionados.`,
        });
      } else {
        setFolderFeedback({
          id: m.id,
          type: 'error',
          msg: res.error || 'Falha ao sincronizar com o Discord.',
        });
      }
    } catch (err) {
      setFolderFeedback({
        id: m.id,
        type: 'error',
        msg: err instanceof Error ? err.message : 'Erro ao contatar Discord.',
      });
    } finally {
      setSyncingMemberId(null);
    }
  };

  const handleClearAllMembers = () => {
    if (window.confirm('Tem certeza que deseja apagar o cadastro de TODOS os membros? Todos terão que se cadastrar novamente com nova senha de 4 dígitos.')) {
      clearAllMembers();
      setMembers([]);
    }
  };

  const pendingCount = deliveries.filter(
    (d) => d.auditStatus === AuditStatus.PENDENTE
  ).length;

  const filteredMembers = members.filter((m) => {
    if (!folderSearch.trim()) return true;
    const q = folderSearch.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q) ||
      (m.discordId && m.discordId.toLowerCase().includes(q))
    );
  });

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPin.trim()) return;

    setPinFeedback(null);
    setIsSavingPin(true);
    try {
      await onSaveConfig({
        ...config,
        adminPin: newPin.trim(),
      });
      setPinFeedback({
        type: 'success',
        msg: 'PIN de Administrador atualizado com sucesso!',
      });
    } catch (err) {
      setPinFeedback({
        type: 'error',
        msg: err instanceof Error ? err.message : 'Falha ao salvar novo PIN.',
      });
    } finally {
      setIsSavingPin(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Secret Admin Bar */}
      <div className="bg-gradient-to-r from-rose-950/40 via-[#111827] to-[#111827] border border-rose-800/40 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100">
                Painel da Gerência · Acesso Restrito
              </h2>
              <span className="text-[11px] font-mono text-rose-300 bg-rose-950/60 border border-rose-800/60 px-2 py-0.5 rounded">
                ADM ATIVO
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Controle total de auditoria, aprovações, exclusões e webhook do Discord.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onExitAdmin}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors cursor-pointer self-start sm:self-auto whitespace-nowrap"
        >
          <LogOut className="w-3.5 h-3.5 text-rose-400" />
          <span>Bloquear e Sair do ADM</span>
        </button>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-[#111827] border border-slate-800 rounded-xl">
        <button
          type="button"
          onClick={() => setActiveAdminTab('audit')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeAdminTab === 'audit'
              ? 'bg-rose-600 text-white'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Fila de Auditoria & Prints</span>
          {pendingCount > 0 && (
            <span className="bg-rose-950 text-rose-200 border border-rose-700 px-1.5 py-0.2 rounded-full text-[10px] font-mono">
              {pendingCount} pendentes
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('ranking')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeAdminTab === 'ranking'
              ? 'bg-rose-600 text-white'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Metas & Ranking Geral</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('folders')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeAdminTab === 'folders'
              ? 'bg-rose-600 text-white'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
          }`}
        >
          <FolderKanban className="w-3.5 h-3.5" />
          <span>Pastas de Farm ({members.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('fechamento')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeAdminTab === 'fechamento'
              ? 'bg-amber-600 text-white'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
          }`}
        >
          <Moon className="w-3.5 h-3.5 text-amber-400" />
          <span>Fechamento 23:50 (Meta 200 Crack)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('config')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeAdminTab === 'config'
              ? 'bg-rose-600 text-white'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
          }`}
        >
          <Webhook className="w-3.5 h-3.5" />
          <span>Configuração Discord</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('security')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeAdminTab === 'security'
              ? 'bg-rose-600 text-white'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Segurança & PIN</span>
        </button>
      </div>

      {/* Admin Tab Viewport */}
      {activeAdminTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400 px-1">
            <span>
              Você tem permissão de gerência para aprovar, recusar e reenviar logs para o Discord.
            </span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-slate-300">
                Total: {deliveries.length} registros
              </span>
              {onResetAll && deliveries.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Tem certeza que deseja zerar e apagar todos os registros de entregas?')) {
                      onResetAll();
                    }
                  }}
                  className="px-2.5 py-1 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 text-[11px] font-medium rounded transition-colors cursor-pointer"
                >
                  Zerar Tudo
                </button>
              )}
            </div>
          </div>

          <DeliveryHistoryView
            deliveries={deliveries}
            isLoading={isLoading}
            resendingId={resendingId}
            onSelectDelivery={onSelectDelivery}
            onResendWebhook={onResendWebhook}
            onUpdateAudit={onUpdateAudit}
            onGoToNewDelivery={onGoToNewDelivery}
          />
        </div>
      )}

      {activeAdminTab === 'ranking' && (
        <LeaderboardView
          deliveries={deliveries}
          config={config}
          onOpenSettings={() => setActiveAdminTab('config')}
        />
      )}

      {activeAdminTab === 'folders' && (
        <div className="space-y-6">
          {/* Header Card with Discord Permission Explanation */}
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <FolderKanban className="w-5 h-5 text-rose-400" />
                  <span>Central de Pastas de Farm no Discord</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Gerenciamento de todas as pastas individuais criadas para cada membro da organização.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-3 py-1 bg-slate-900 border border-slate-700 text-slate-300 rounded-lg">
                  {members.length} pastas cadastradas
                </span>
              </div>
            </div>

            {/* Banner Informativo de Permissões */}
            <div className="bg-rose-950/20 border border-rose-800/40 rounded-lg p-3.5 text-xs text-slate-300 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-rose-300">
                <ShieldCheck className="w-4 h-4 text-rose-400" />
                <span>Como funciona a visibilidade das pastas no Discord:</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                • <strong className="text-slate-200">Cargos Altos da Facção (Liderança / Gerência):</strong> Vêem <strong className="text-rose-300">todas as pastas</strong> automaticamente através do cargo configurado em <em>Menção no Canal</em> ({config.roleMention || '@Gerência'}) com a permissão "Gerenciar Tópicos".
              </p>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                • <strong className="text-slate-200">Pessoa com o ID Cadastrado:</strong> O bot marca o titular diretamente no tópico privado. O Discord libera acesso <strong className="text-emerald-300">somente à pasta dele</strong>, mantendo as demais privadas.
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={folderSearch}
                onChange={(e) => setFolderSearch(e.target.value)}
                placeholder="Buscar por nome ou ID (#1542)..."
                className="w-full pl-9 pr-3.5 py-2 bg-[#111827] border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>
            <span className="text-xs text-slate-400 self-end sm:self-auto font-mono">
              Mostrando {filteredMembers.length} de {members.length} pastas
            </span>
          </div>

          {/* Members Folders Grid */}
          {filteredMembers.length === 0 ? (
            <div className="p-8 bg-[#111827] border border-slate-800 rounded-xl text-center text-xs text-slate-400 space-y-2">
              <Folder className="w-8 h-8 text-slate-600 mx-auto" />
              <p>Nenhuma pasta de farm encontrada.</p>
              <p className="text-[11px] text-slate-500">
                Quando um membro se registra para entregar farm, sua pasta pessoal é gerada automaticamente.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMembers.map((m) => {
                const memberDeliveries = deliveries.filter(
                  (d) => d.passportId.trim().replace(/^#/, '').toLowerCase() === m.id.toLowerCase()
                );
                const totalUnits = memberDeliveries
                  .filter((d) => d.auditStatus !== AuditStatus.RECUSADO)
                  .reduce((acc, d) => acc + d.quantity, 0);

                const hasThread = Boolean(m.discordThreadId);
                const isSyncing = syncingMemberId === m.id;
                const feedback = folderFeedback?.id === m.id ? folderFeedback : null;

                return (
                  <div
                    key={m.id}
                    className="bg-[#111827] border border-slate-800 hover:border-slate-700/80 rounded-xl p-5 space-y-4 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-900/60 to-indigo-950 border border-indigo-700/40 flex items-center justify-center text-indigo-300 font-bold shrink-0">
                          📁
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-100">
                              {m.name}
                            </h4>
                            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-indigo-950/70 border border-indigo-800/60 text-indigo-300">
                              #{m.id}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                            Pasta: 📁・{m.name} [#{m.id}]
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {hasThread ? (
                          <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Pasta Ativa no DC
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-amber-300 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded-full">
                            Pendente no DC
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stats & Identity info */}
                    <div className="grid grid-cols-2 gap-2.5 p-3 bg-[#0B0F17] border border-slate-800/80 rounded-lg text-xs">
                      <div>
                        <span className="text-slate-500 block text-[11px]">Entregas Feitas:</span>
                        <span className="font-semibold text-slate-200">
                          {memberDeliveries.length} comprovante(s)
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Volume no Baú:</span>
                        <span className="font-semibold text-indigo-300 font-mono">
                          {totalUnits.toLocaleString('pt-BR')} unid.
                        </span>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 flex items-center gap-1">
                          <MessageSquare className="w-3 h-3 text-slate-400" /> Discord:
                        </span>
                        <span className="font-mono text-slate-300">
                          {m.discordId ? (
                            m.discordId.startsWith('<@') ? m.discordId : `@${m.discordId}`
                          ) : (
                            <span className="text-slate-500 italic">Não vinculado</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Feedback message for this folder */}
                    {feedback && (
                      <div
                        className={`p-2.5 rounded-lg text-xs ${
                          feedback.type === 'success'
                            ? 'bg-emerald-950/40 text-emerald-200 border border-emerald-800/60'
                            : 'bg-rose-950/40 text-rose-200 border border-rose-800/60'
                        }`}
                      >
                        {feedback.msg}
                      </div>
                    )}

                    {/* Folder Actions */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
                      <button
                        type="button"
                        onClick={() => handleSyncMemberFolder(m)}
                        disabled={isSyncing}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Criar ou atualizar pasta deste membro no Discord"
                      >
                        <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                        <span>{isSyncing ? 'Sincronizando...' : hasThread ? 'Reenviar Pasta DC' : 'Criar Pasta no DC'}</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setExpandedMemberId(expandedMemberId === m.id ? null : m.id)}
                          className={`px-3 py-1.5 border text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                            expandedMemberId === m.id
                              ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                              : 'bg-indigo-950/60 hover:bg-indigo-900/60 border-indigo-800/60 text-indigo-300'
                          }`}
                          title="Ver todos os farms e fotos entregues deste membro"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{expandedMemberId === m.id ? 'Fechar Fotos' : `Farms & Fotos (${memberDeliveries.length})`}</span>
                          {expandedMemberId === m.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Gallery of Delivered Farms & Photos */}
                    {expandedMemberId === m.id && (
                      <div className="pt-3 border-t border-slate-800/80 space-y-3">
                        <div className="flex items-center justify-between text-xs text-slate-300">
                          <span className="font-semibold flex items-center gap-1.5">
                            <Folder className="w-3.5 h-3.5 text-indigo-400" />
                            Todos os Farms Entregues de {m.name} (#{m.id}):
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            {memberDeliveries.length} registros
                          </span>
                        </div>

                        {memberDeliveries.length === 0 ? (
                          <div className="p-4 bg-[#0B0F17] rounded-lg text-center text-xs text-slate-500 border border-slate-800/50">
                            Nenhum farm entregue por este membro ainda.
                          </div>
                        ) : (
                          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                            {memberDeliveries.map((del) => (
                              <div
                                key={del.id}
                                className="p-3 bg-[#0B0F17] border border-slate-800 rounded-lg flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between hover:border-slate-700 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  {/* Photo Thumbnail */}
                                  <div
                                    className="w-16 h-16 rounded-lg overflow-hidden border border-slate-700 bg-slate-900 shrink-0 cursor-pointer group relative"
                                    onClick={() => setLightboxDelivery(del)}
                                    title="Clique para ver comprovante em tela cheia"
                                  >
                                    <ProofImage
                                      photoUrl={del.photoUrl}
                                      alt={`Foto farm ${del.id}`}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                      <Eye className="w-4 h-4 text-white" />
                                    </div>
                                  </div>

                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-slate-200 text-xs">
                                        {del.itemName}
                                      </span>
                                      <span className="font-mono text-xs text-indigo-300 font-bold">
                                        {del.quantity.toLocaleString('pt-BR')} {del.unit}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2">
                                      <span className="text-slate-300">{del.chestLocation}</span>
                                      <span>•</span>
                                      <span>{formatExactDateTime(del.deliveredAt)}</span>
                                    </div>
                                    <div className="text-[10px] font-mono text-slate-500">
                                      Protocolo: {del.id}
                                    </div>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setLightboxDelivery(del)}
                                  className="px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer self-end sm:self-center shrink-0"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Ver Foto Ampliada</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeAdminTab === 'fechamento' && (() => {
        const now = currentTime;
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

        const todayCrackDeliveries = deliveries.filter((d) => {
          const isCrack = d.itemName.toLowerCase().includes('crack');
          const dTime = new Date(d.deliveredAt).getTime();
          return isCrack && dTime >= todayStart && d.auditStatus !== AuditStatus.RECUSADO;
        });

        const memberCrackMap = new Map<
          string,
          { name: string; passport: string; discordId?: string; total: number; deliveries: FarmDelivery[] }
        >();

        members.forEach((m) => {
          memberCrackMap.set(m.id.toLowerCase(), {
            name: m.name,
            passport: m.id,
            discordId: m.discordId,
            total: 0,
            deliveries: [],
          });
        });

        todayCrackDeliveries.forEach((d) => {
          const key = d.passportId.toLowerCase().replace(/^#/, '');
          const current = memberCrackMap.get(key);
          if (current) {
            current.total += d.quantity;
            current.deliveries.push(d);
          } else {
            memberCrackMap.set(key, {
              name: d.playerName,
              passport: d.passportId,
              discordId: d.discordId,
              total: d.quantity,
              deliveries: [d],
            });
          }
        });

        const memberCrackList = Array.from(memberCrackMap.values());
        const GOAL = 200;
        const completedList = memberCrackList.filter((m) => m.total >= GOAL);
        const pendingList = memberCrackList.filter((m) => m.total < GOAL);
        const totalCrackToday = memberCrackList.reduce((acc, m) => acc + m.total, 0);

        return (
          <div className="space-y-6">
            {/* Header Hero Card */}
            <div className="bg-gradient-to-r from-amber-950/40 via-[#111827] to-[#111827] border border-amber-800/40 rounded-xl p-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                      Auditoria Diária de Narcóticos · {config.serverName}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    <Moon className="w-5 h-5 text-amber-400" />
                    <span>Fechamento Diário das 23:50 (Meta: 200 Cloridrato de Crack)</span>
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                    Todos os dias às <strong>23:50 da noite</strong>, o sistema apura e envia automaticamente ao canal do Discord o relatório com a lista de quem <strong>bateu a meta de 200 Cloridrato de Crack</strong> e quem ainda está pendente.
                  </p>
                </div>

                {/* Live Clock & Schedule Status */}
                <div className="bg-[#0B0F17] border border-amber-800/50 rounded-xl p-4 text-center sm:text-right shrink-0 space-y-1">
                  <div className="text-[11px] text-slate-400">Horário Atual:</div>
                  <div className="text-2xl font-extrabold font-mono text-amber-300">
                    {currentTime.toLocaleTimeString('pt-BR')}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-medium flex items-center justify-center sm:justify-end gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Disparo automático diário às 23:50</span>
                  </div>
                </div>
              </div>

              {/* Action bar with manual report trigger */}
              <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-800/80">
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span>Canal do Webhook:</span>
                  <span className="font-mono text-amber-300 bg-slate-900 px-2 py-0.5 rounded text-[11px]">
                    {config.webhookUrl ? config.webhookUrl.slice(0, 48) + '...' : 'Não configurado'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleSendManualCrackReport}
                  disabled={isSendingCrackReport || !config.webhookUrl}
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-900/30 whitespace-nowrap"
                >
                  <Send className={`w-4 h-4 ${isSendingCrackReport ? 'animate-spin' : ''}`} />
                  <span>{isSendingCrackReport ? 'Enviando ao Discord...' : '🚀 Disparar Relatório no Discord Agora'}</span>
                </button>
              </div>

              {crackReportFeedback && (
                <div
                  className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                    crackReportFeedback.type === 'success'
                      ? 'bg-emerald-950/50 border-emerald-800 text-emerald-200'
                      : 'bg-rose-950/50 border-rose-800 text-rose-200'
                  }`}
                >
                  {crackReportFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{crackReportFeedback.msg}</span>
                </div>
              )}
            </div>

            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
                <span className="text-xs text-slate-400 block mb-1">Produção de Crack Hoje:</span>
                <div className="text-2xl font-bold font-mono text-amber-400">
                  {totalCrackToday.toLocaleString('pt-BR')} <span className="text-xs text-slate-500">unid.</span>
                </div>
                <span className="text-[11px] text-slate-500">
                  {todayCrackDeliveries.length} entregas de crack hoje
                </span>
              </div>

              <div className="bg-[#111827] border border-emerald-900/40 rounded-xl p-4">
                <span className="text-xs text-slate-400 block mb-1">Bateram a Meta (200+):</span>
                <div className="text-2xl font-bold font-mono text-emerald-400">
                  {completedList.length} <span className="text-xs text-slate-500">/ {memberCrackList.length} membros</span>
                </div>
                <span className="text-[11px] text-emerald-300/80">
                  {completedList.length > 0 ? '100% da cota diária entregue' : 'Aguardando entregas'}
                </span>
              </div>

              <div className="bg-[#111827] border border-rose-900/40 rounded-xl p-4">
                <span className="text-xs text-slate-400 block mb-1">Pendentes / Faltando:</span>
                <div className="text-2xl font-bold font-mono text-rose-400">
                  {pendingList.length} <span className="text-xs text-slate-500">membros</span>
                </div>
                <span className="text-[11px] text-rose-300/80">
                  Precisam depositar até 23:50
                </span>
              </div>
            </div>

            {/* List of Members: Goal Status & Photos */}
            <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-4">
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <span>Auditoria Membro por Membro (Meta 200 Crack)</span>
              </h4>

              {memberCrackList.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 bg-[#0B0F17] rounded-xl border border-slate-800">
                  Nenhum membro cadastrado ainda. Quando os membros entregarem, eles aparecerão aqui.
                </div>
              ) : (
                <div className="space-y-4">
                  {memberCrackList.map((m) => {
                    const hasReached = m.total >= GOAL;
                    const pct = Math.min(100, Math.round((m.total / GOAL) * 100));

                    return (
                      <div
                        key={m.passport}
                        className={`p-4 rounded-xl border transition-colors ${
                          hasReached
                            ? 'bg-[#0B1512] border-emerald-800/60'
                            : 'bg-[#150F11] border-rose-900/50'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-sm shrink-0 ${
                                hasReached
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
                                  : 'bg-rose-950 text-rose-300 border-rose-800/60'
                              }`}
                            >
                              {hasReached ? '✓' : '!'}
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-100">{m.name}</span>
                                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                                  #{m.passport}
                                </span>
                                {m.discordId && (
                                  <span className="text-xs font-mono text-indigo-400">
                                    @{m.discordId}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {hasReached
                                  ? 'Meta de 200 Cloridrato de Crack batida com sucesso!'
                                  : `Faltam ${(GOAL - m.total).toLocaleString('pt-BR')} unidades para bater a meta de 200.`}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-center">
                            <div className="text-right">
                              <div className="text-sm font-extrabold font-mono text-slate-100">
                                {m.total.toLocaleString('pt-BR')} / {GOAL} unid.
                              </div>
                              <div className="text-[11px] font-mono text-slate-400">{pct}%</div>
                            </div>

                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                hasReached
                                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                                  : 'bg-rose-950/80 text-rose-300 border-rose-800'
                              }`}
                            >
                              {hasReached ? '✅ Bateu a Meta' : '⚠️ Pendente'}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-3 h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className={`h-full transition-all duration-300 ${
                              hasReached ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        {/* Photos of Today's Deliveries */}
                        {m.deliveries.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-800/80">
                            <span className="text-[11px] font-semibold text-slate-400 block mb-2">
                              Comprovantes de hoje ({m.deliveries.length}):
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {m.deliveries.map((del) => (
                                <div
                                  key={del.id}
                                  onClick={() => setLightboxDelivery(del)}
                                  className="w-16 h-16 rounded-lg overflow-hidden border border-slate-700 bg-slate-900 shrink-0 cursor-pointer relative group"
                                  title="Clique para ver comprovante"
                                >
                                  <ProofImage
                                    photoUrl={del.photoUrl}
                                    alt={`Comprovante ${del.id}`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <Eye className="w-4 h-4 text-white" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {activeAdminTab === 'config' && (
        <WebhookSettingsView
          config={config}
          onSaveConfig={onSaveConfig}
          onTestWebhook={onTestWebhook}
          onOpenDiscordGuide={onOpenDiscordGuide}
        />
      )}

      {activeAdminTab === 'security' && (
        <div className="max-w-xl bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-rose-400" />
              <span>Alterar PIN Secreto de Administrador</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Somente membros com este PIN poderão abrir o Painel da Liderança.
            </p>
          </div>

          {pinFeedback && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                pinFeedback.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-800 text-rose-200'
              }`}
            >
              {pinFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{pinFeedback.msg}</span>
            </div>
          )}

          <form onSubmit={handleUpdatePin} className="space-y-4">
            <div>
              <label
                htmlFor="new-admin-pin"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Novo PIN de Acesso
              </label>
              <input
                id="new-admin-pin"
                type="text"
                required
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="Ex: 8842"
                className="w-full px-3.5 py-2.5 bg-[#0B0F17] border border-slate-800 focus:border-rose-500 focus:outline-none rounded-lg text-sm font-mono tracking-widest text-slate-100"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Anote este código com a liderança para não perder o acesso ao modo ADM.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSavingPin || !newPin.trim()}
              className="py-2.5 px-4 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSavingPin ? 'Salvando...' : 'Atualizar PIN Secreto'}</span>
            </button>
          </form>

          {/* Membros Cadastrados */}
          <div className="border-t border-slate-800 pt-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span>Membros Cadastrados ({members.length})</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Jogadores com nome, passaporte e senha de 4 dígitos cadastrados.
                </p>
              </div>

              {members.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllMembers}
                  className="px-2.5 py-1 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 text-[11px] font-medium rounded transition-colors cursor-pointer shrink-0"
                >
                  Zerar Membros
                </button>
              )}
            </div>

            {members.length === 0 ? (
              <div className="p-4 bg-[#0B0F17] border border-slate-800/80 rounded-lg text-center text-xs text-slate-500">
                Nenhum membro se cadastrou ainda. O cadastro é feito ao clicar em "Entregar Farm".
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 bg-[#0B0F17] border border-slate-800 rounded-lg flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200">{m.name}</span>
                        <span className="font-mono text-slate-400">#{m.id}</span>
                        {m.discordThreadId && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/40 inline-flex items-center gap-1">
                            📁 Pasta no DC
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        PIN: <span className="text-slate-400 tracking-widest font-semibold">{m.pin}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteMember(m.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                      title="Excluir cadastro do membro"
                      aria-label="Excluir cadastro"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lightbox Modal for Full Screen Farm Proof Photos */}
      <ProofLightboxModal
        delivery={lightboxDelivery}
        onClose={() => setLightboxDelivery(null)}
        onUpdateAudit={onUpdateAudit}
        onResendWebhook={onResendWebhook}
        resendingId={resendingId}
      />
    </div>
  );
};
