import React, { useState, useMemo } from 'react';
import {
  PackagePlus,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Eye,
  Shield,
  LogOut,
  UserCheck,
  Folder,
  FolderCheck,
  MessageSquare,
  Check,
  Edit2,
  ShieldCheck,
} from 'lucide-react';
import {
  AuditStatus,
  CreateDeliveryPayload,
  DiscordWebhookConfig,
  FarmDelivery,
} from '../types/farm';
import { formatExactDateTime, formatRelativeTime } from '../utils/farmHelpers';
import { getActiveMember, updateMemberDiscordId } from '../services/storageService';
import { NewDeliveryView } from './NewDeliveryView';
import { ProofImage } from './ProofImage';

interface UserPortalViewProps {
  config: DiscordWebhookConfig;
  deliveries: FarmDelivery[];
  savedPlayerName: string;
  savedPassportId: string;
  onSavePlayerIdentity: (name: string, passport: string) => void;
  onSubmitDelivery: (payload: CreateDeliveryPayload) => Promise<FarmDelivery>;
  onSelectDeliveryForModal: (delivery: FarmDelivery) => void;
  onOpenDiscordGuide: () => void;
  onOpenAdminLogin: () => void;
  onLogoutMember?: () => void;
}

export const UserPortalView: React.FC<UserPortalViewProps> = ({
  config,
  deliveries,
  savedPlayerName,
  savedPassportId,
  onSavePlayerIdentity,
  onSubmitDelivery,
  onSelectDeliveryForModal,
  onOpenDiscordGuide,
  onOpenAdminLogin,
  onLogoutMember,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'deliver' | 'my_history'>('deliver');
  const [activeMemberState, setActiveMemberState] = useState(() => getActiveMember());
  const [isEditingDiscord, setIsEditingDiscord] = useState(false);
  const [discordInput, setDiscordInput] = useState(activeMemberState?.discordId || '');
  const [discordNotice, setDiscordNotice] = useState<string | null>(null);

  const handleSaveDiscordId = (e: React.FormEvent) => {
    e.preventDefault();
    if (!savedPassportId) return;
    updateMemberDiscordId(savedPassportId, discordInput);
    const updated = getActiveMember();
    setActiveMemberState(updated);
    setIsEditingDiscord(false);
    setDiscordNotice('ID do Discord vinculado com sucesso! Agora você será adicionado na sua pasta no Discord.');
    setTimeout(() => setDiscordNotice(null), 4000);
  };

  // Filter deliveries belonging to this player
  const myDeliveries = useMemo(() => {
    if (!savedPassportId || !savedPassportId.trim()) return deliveries;
    const cleanId = savedPassportId.trim().replace(/^#/, '').toLowerCase();
    if (!cleanId) return deliveries;
    return deliveries.filter(
      (d) => d.passportId.trim().replace(/^#/, '').toLowerCase() === cleanId
    );
  }, [deliveries, savedPassportId]);

  const goal = Math.max(100, config.weeklyGoalPerMember || 2500);

  const myWeeklyTotal = useMemo(() => {
    return myDeliveries
      .filter((d) => d.auditStatus !== AuditStatus.RECUSADO)
      .reduce((acc, d) => acc + d.quantity, 0);
  }, [myDeliveries]);

  const myProgressPct = Math.min(100, Math.round((myWeeklyTotal / goal) * 100));
  const hasReachedGoal = myWeeklyTotal >= goal;

  return (
    <div className="space-y-8">
      {/* Member Header Card & Personal Goal Progress */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              Área do Membro · {config.serverName}
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-bold text-slate-100">
                {savedPlayerName ? (
                  <>
                    Olá, <span className="text-indigo-300">{savedPlayerName}</span>{' '}
                    <span className="text-sm font-mono text-slate-400">#{savedPassportId}</span>
                  </>
                ) : (
                  'Portal de Entrega de Farm'
                )}
              </h2>

              {onLogoutMember && savedPlayerName && (
                <button
                  type="button"
                  onClick={onLogoutMember}
                  className="px-2.5 py-1 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-xs text-slate-400 hover:text-rose-300 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                  title="Trocar de Conta ou Desconectar"
                >
                  <LogOut className="w-3 h-3 text-slate-400 hover:text-rose-300" />
                  <span>Trocar Membro</span>
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Registre o depósito do baú com print e acompanhe sua meta semanal aqui.
            </p>
          </div>

          {/* Member Weekly Quota Progress */}
          <div className="bg-[#0B0F17] border border-slate-800/90 rounded-lg p-4 min-w-[280px] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Sua Meta Semanal:</span>
              <span className="font-mono tabular-nums font-semibold text-slate-200">
                {myWeeklyTotal.toLocaleString('pt-BR')} / {goal.toLocaleString('pt-BR')} unid.
              </span>
            </div>

            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  hasReachedGoal ? 'bg-emerald-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${myProgressPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">
                {hasReachedGoal ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Meta Batida!
                  </span>
                ) : (
                  <span>Faltam {(goal - myWeeklyTotal).toLocaleString('pt-BR')} unid.</span>
                )}
              </span>
              <span className="font-mono text-slate-400">{myProgressPct}%</span>
            </div>
          </div>
        </div>

        {/* Member Dedicated Folder Card */}
        {savedPlayerName && (
          <div className="mt-5 pt-5 border-t border-slate-800/80 bg-[#0B0F17]/60 border border-indigo-950/80 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold shrink-0">
                  📁
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-100">
                      Sua Pasta Individual: 📁・{savedPlayerName} [#{savedPassportId}]
                    </h3>
                    {activeMemberState?.discordThreadId ? (
                      <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Pasta Aberta no Discord
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-indigo-300 bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded-full">
                        Vinculada ao seu ID #{savedPassportId}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Todas as entregas que você fizer com este passaporte serão salvas automaticamente dentro desta pasta.
                  </p>
                </div>
              </div>

              <span className="text-xs font-mono text-slate-300 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md self-start sm:self-auto">
                {myDeliveries.length} comprovantes na sua pasta
              </span>
            </div>

            {/* Privacy & Role Access Notice */}
            <div className="bg-[#090D16] border border-slate-800/80 rounded-lg p-3 text-xs text-slate-300 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Acesso Restrito:</strong> Esta pasta aparece apenas para você (<span className="text-indigo-300 font-mono">ID #{savedPassportId}</span>) e para os <strong className="text-rose-300">Cargos Altos da Gerência</strong> no Discord.
                </span>
              </div>

              {/* Discord Account Link */}
              <div className="flex items-center gap-2 shrink-0">
                {isEditingDiscord ? (
                  <form onSubmit={handleSaveDiscordId} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={discordInput}
                      onChange={(e) => setDiscordInput(e.target.value)}
                      placeholder="ID ou @ do Discord"
                      className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100 placeholder-slate-500 w-36 focus:outline-none focus:border-indigo-500 font-mono"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold cursor-pointer"
                    >
                      Salvar
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingDiscord(false)}
                      className="px-2 py-1 bg-slate-800 text-slate-400 hover:text-slate-200 rounded text-xs cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-slate-400">Discord:</span>
                    <span className="font-mono text-slate-200">
                      {activeMemberState?.discordId ? (
                        activeMemberState.discordId.startsWith('<@') ? activeMemberState.discordId : `@${activeMemberState.discordId}`
                      ) : (
                        <span className="text-slate-500 italic">Não vinculado</span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingDiscord(true)}
                      className="p-1 text-slate-400 hover:text-indigo-300 cursor-pointer"
                      title="Editar Discord para ser marcado na pasta"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {discordNotice && (
              <div className="p-2.5 rounded-lg bg-emerald-950/40 text-emerald-200 border border-emerald-800/60 text-xs flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{discordNotice}</span>
              </div>
            )}
          </div>
        )}

        {/* User Navigation Pills */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveSubTab('deliver')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              activeSubTab === 'deliver'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <PackagePlus className="w-3.5 h-3.5" />
            <span>Fazer Nova Entrega</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('my_history')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              activeSubTab === 'my_history'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Meus Comprovantes ({myDeliveries.length})</span>
          </button>
        </div>
      </div>

      {/* Sub-view: Deliver Farm Form */}
      {activeSubTab === 'deliver' && (
        <NewDeliveryView
          config={config}
          recentDeliveries={deliveries}
          savedPlayerName={savedPlayerName}
          savedPassportId={savedPassportId}
          onSavePlayerIdentity={onSavePlayerIdentity}
          onSubmitDelivery={onSubmitDelivery}
          onSelectDeliveryForModal={onSelectDeliveryForModal}
          onOpenWebhookSettings={onOpenAdminLogin}
          onOpenDiscordGuide={onOpenDiscordGuide}
        />
      )}

      {/* Sub-view: My Deliveries History */}
      {activeSubTab === 'my_history' && (
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-100">
              Histórico de Entregas Registradas por Você
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Passaporte #{savedPassportId || 'Não informado'}
            </span>
          </div>

          {!savedPassportId ? (
            <div className="p-8 text-center text-xs text-slate-400 space-y-2">
              <p>Você ainda não registrou nenhuma entrega neste navegador.</p>
              <button
                type="button"
                onClick={() => setActiveSubTab('deliver')}
                className="text-indigo-400 underline cursor-pointer"
              >
                Clique aqui para registrar sua primeira entrega de farm
              </button>
            </div>
          ) : myDeliveries.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 space-y-2">
              <p>Nenhuma entrega encontrada para o Passaporte #{savedPassportId}.</p>
              <button
                type="button"
                onClick={() => setActiveSubTab('deliver')}
                className="text-indigo-400 underline cursor-pointer"
              >
                Fazer nova entrega agora
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-medium text-slate-400 bg-[#0D131F]">
                    <th className="py-3 px-4">Comprovante</th>
                    <th className="py-3 px-4">Item & Categoria</th>
                    <th className="py-3 px-4 text-right">Quantidade</th>
                    <th className="py-3 px-4">Quando Entregou</th>
                    <th className="py-3 px-4">Baú Destino</th>
                    <th className="py-3 px-4">Auditoria da Gerência</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-sm">
                  {myDeliveries.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-800/35 transition-colors">
                      <td className="py-2.5 px-4">
                        <button
                          type="button"
                          onClick={() => onSelectDeliveryForModal(d)}
                          className="w-14 h-10 rounded-md overflow-hidden border border-slate-700 bg-[#070A10] block cursor-pointer"
                        >
                          <ProofImage
                            photoUrl={d.photoUrl}
                            alt={`Print ${d.id}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-slate-200">{d.itemName}</div>
                        <div className="text-xs text-slate-500">{d.category}</div>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-indigo-300">
                        {d.quantity.toLocaleString('pt-BR')} {d.unit}
                      </td>
                      <td className="py-2.5 px-4 text-xs font-mono tabular-nums text-slate-300">
                        {formatExactDateTime(d.deliveredAt)}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-slate-300">{d.chestLocation}</td>
                      <td className="py-2.5 px-4 text-xs">
                        {d.auditStatus === AuditStatus.APROVADO && (
                          <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Aprovado
                          </span>
                        )}
                        {d.auditStatus === AuditStatus.PENDENTE && (
                          <span className="inline-flex items-center gap-1.5 text-amber-400">
                            <Clock className="w-3.5 h-3.5" /> Em análise
                          </span>
                        )}
                        {d.auditStatus === AuditStatus.RECUSADO && (
                          <span className="inline-flex items-center gap-1.5 text-rose-400">
                            <XCircle className="w-3.5 h-3.5" /> Recusado
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => onSelectDeliveryForModal(d)}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-xs text-slate-300 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                          <span>Ver Foto</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Subtle Footer with Hidden Admin Trigger */}
      <div className="pt-8 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
        <span>Painel do Membro · Organização Vila Remo</span>

        {/* Hidden/Secret Admin entrance button */}
        <button
          type="button"
          onClick={onOpenAdminLogin}
          className="opacity-15 hover:opacity-80 transition-opacity p-1 text-slate-500 hover:text-slate-200 cursor-pointer rounded"
          title="Acesso Secreto"
          aria-label="Acesso Secreto"
        >
          <Shield className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
