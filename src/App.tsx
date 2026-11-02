import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Home,
  ShieldCheck,
  Shield,
  Lock,
  LogOut,
  Users,
} from 'lucide-react';
import {
  AuditStatus,
  CreateDeliveryPayload,
  DiscordWebhookConfig,
  FarmCategory,
  FarmDelivery,
  MemberAccount,
} from './types/farm';
import {
  clearAllDeliveries,
  loadStoredConfig,
  loadStoredDeliveries,
  processAndSaveNewDelivery,
  saveStoredConfig,
  saveStoredDeliveries,
  getActiveMember,
  setActiveMember,
  loadStoredMembers,
} from './services/storageService';
import { dispatchDeliveryToDiscord, sendDailyCrackReportToDiscord } from './services/discordService';
import {
  fetchDeliveriesFromSupabase,
  syncDeliveryToSupabase,
  deleteDeliveryFromSupabase,
  deleteAllDeliveriesFromSupabase,
} from './services/supabaseService';
import { LandingPageView } from './components/LandingPageView';
import { UserPortalView } from './components/UserPortalView';
import { AdminPortalView } from './components/AdminPortalView';
import { AdminLoginModal } from './components/AdminLoginModal';
import { MemberAuthModal } from './components/MemberAuthModal';
import { ProofLightboxModal } from './components/ProofImage';
import { DiscordBotGuideModal } from './components/DiscordBotGuideModal';

type AppViewMode = 'landing' | 'user' | 'admin';

const PLAYER_STORAGE_KEY = 'fazendalog_player_identity_v1';
const ADMIN_SESSION_KEY = 'fazendalog_admin_session_token';

export function App() {
  const [viewMode, setViewMode] = useState<AppViewMode>('landing');
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(ADMIN_SESSION_KEY) || null;
    } catch {
      return null;
    }
  });

  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);
  const [isDiscordGuideOpen, setIsDiscordGuideOpen] = useState(false);
  const [isMemberAuthModalOpen, setIsMemberAuthModalOpen] = useState(false);
  const [activeMember, setActiveMemberState] = useState<MemberAccount | null>(null);

  const [deliveries, setDeliveries] = useState<FarmDelivery[]>(() => loadStoredDeliveries());
  const [config, setConfig] = useState<DiscordWebhookConfig>(() => loadStoredConfig());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedDelivery, setSelectedDelivery] = useState<FarmDelivery | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const [savedPlayerName, setSavedPlayerName] = useState<string>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(PLAYER_STORAGE_KEY) || '{}');
      return parsed.name || '';
    } catch {
      return '';
    }
  });

  const [savedPassportId, setSavedPassportId] = useState<string>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(PLAYER_STORAGE_KEY) || '{}');
      return parsed.passport || '';
    } catch {
      return '';
    }
  });

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    window.setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  }, []);

  // Sync state from storage and Supabase
  useEffect(() => {
    const local = loadStoredDeliveries();
    setDeliveries(local);
    setConfig(loadStoredConfig());

    fetchDeliveriesFromSupabase().then((remote) => {
      if (remote && remote.length > 0) {
        const map = new Map<string, FarmDelivery>();
        local.forEach((d) => map.set(d.id, d));
        remote.forEach((d) => map.set(d.id, d));
        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.deliveredAt).getTime() - new Date(a.deliveredAt).getTime()
        );
        setDeliveries(merged);
        saveStoredDeliveries(merged);
      }
    });
  }, []);

  // Rotina automática de Fechamento Diário das 23:50 (Meta 200 Crack)
  useEffect(() => {
    const checkDailyTimer = () => {
      const now = new Date();
      // Verifica se é 23:50
      if (now.getHours() === 23 && now.getMinutes() === 50) {
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const lockKey = `fazendalog_crack_report_auto_sent_${todayStr}`;
        if (!localStorage.getItem(lockKey)) {
          localStorage.setItem(lockKey, 'true');
          const membersList = loadStoredMembers();
          sendDailyCrackReportToDiscord(deliveries, membersList, config).then((res) => {
            if (res.ok) {
              showToast('success', 'Relatório diário das 23:50 (Meta 200 Crack) enviado ao Discord com sucesso!');
            }
          });
        }
      }
    };

    // Executa verificação a cada 30 segundos
    const timer = setInterval(checkDailyTimer, 30000);
    checkDailyTimer(); // Verifica ao montar
    return () => clearInterval(timer);
  }, [deliveries, config, showToast]);

  // Secret keyboard shortcut to trigger Admin Login: Ctrl + Shift + A
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        if (adminToken) {
          setViewMode('admin');
          showToast('success', 'Acesso da Gerência (ADM) ativado.');
        } else {
          setIsAdminLoginModalOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [adminToken, showToast]);

  const handleAdminLoginSuccess = (token: string) => {
    setAdminToken(token);
    try {
      sessionStorage.setItem(ADMIN_SESSION_KEY, token);
    } catch {
      // Ignore session storage error
    }
    setViewMode('admin');
    showToast('success', 'Painel da Gerência (ADM) desbloqueado com sucesso!');
  };

  const handleExitAdmin = () => {
    setAdminToken(null);
    try {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
    } catch {
      // Ignore session storage error
    }
    setViewMode('user');
    showToast('success', 'Sessão de ADM bloqueada. Retornado ao modo de usuário.');
  };

  const handleMemberAuthSuccess = (member: MemberAccount) => {
    setActiveMemberState(member);
    setSavedPlayerName(member.name);
    setSavedPassportId(member.id);
    setIsMemberAuthModalOpen(false);
    setViewMode('user');
    showToast('success', `Identificado como ${member.name} (#${member.id})`);
  };

  const handleLogoutMember = () => {
    setActiveMember(null);
    setActiveMemberState(null);
    setSavedPlayerName('');
    setSavedPassportId('');
    setViewMode('landing');
    showToast('success', 'Sessão do membro encerrada.');
  };

  const handleSavePlayerIdentity = (name: string, passport: string) => {
    setSavedPlayerName(name);
    setSavedPassportId(passport);
    try {
      localStorage.setItem(
        PLAYER_STORAGE_KEY,
        JSON.stringify({ name, passport })
      );
    } catch {
      // Ignore storage error
    }
  };

  const handleCreateDelivery = async (
    payload: CreateDeliveryPayload
  ): Promise<FarmDelivery> => {
    const { delivery, updatedList } = await processAndSaveNewDelivery(
      payload,
      deliveries,
      config
    );
    setDeliveries(updatedList);
    return delivery;
  };

  const handleResendWebhook = async (id: string) => {
    const target = deliveries.find((d) => d.id === id);
    if (!target) return;

    try {
      setResendingId(id);
      const res = await dispatchDeliveryToDiscord(target, config);

      const updated = deliveries.map((d) => {
        if (d.id === id) {
          return {
            ...d,
            webhookStatus: res.status,
            webhookHttpCode: res.httpCode,
            webhookError: res.error,
            webhookSentAt: res.ok ? new Date().toISOString() : d.webhookSentAt,
          };
        }
        return d;
      });

      setDeliveries(updated);
      saveStoredDeliveries(updated);

      if (selectedDelivery?.id === id) {
        const found = updated.find((d) => d.id === id);
        if (found) {
          setSelectedDelivery(found);
          syncDeliveryToSupabase(found).catch(() => {});
        }
      } else {
        const found = updated.find((d) => d.id === id);
        if (found) syncDeliveryToSupabase(found).catch(() => {});
      }

      if (!res.ok) {
        showToast(
          'error',
          res.error || 'Configure a URL do canal do Discord antes de enviar.'
        );
        return;
      }

      showToast('success', `Entrega ${id} enviada com sucesso para o canal do Discord!`);
    } catch (err) {
      showToast(
        'error',
        err instanceof Error ? err.message : 'Erro ao contatar o canal do Discord.'
      );
    } finally {
      setResendingId(null);
    }
  };

  const handleUpdateAudit = async (id: string, auditStatus: AuditStatus) => {
    const updated = deliveries.map((d) => (d.id === id ? { ...d, auditStatus } : d));
    setDeliveries(updated);
    saveStoredDeliveries(updated);

    const found = updated.find((d) => d.id === id);
    if (found) {
      if (selectedDelivery?.id === id) {
        setSelectedDelivery(found);
      }
      syncDeliveryToSupabase(found).catch(() => {});
    }

    showToast(
      'success',
      `Status da entrega ${id} atualizado para ${auditStatus}.`
    );
  };

  const handleDeleteDelivery = async (id: string) => {
    const updated = deliveries.filter((d) => d.id !== id);
    setDeliveries(updated);
    saveStoredDeliveries(updated);
    deleteDeliveryFromSupabase(id).catch(() => {});
    showToast('success', `Registro ${id} removido.`);
  };

  const handleResetAllDeliveries = () => {
    clearAllDeliveries();
    deleteAllDeliveriesFromSupabase().catch(() => {});
    setDeliveries([]);
    setSelectedDelivery(null);
    showToast('success', 'Todos os registros de entrega foram zerados com sucesso.');
  };

  const handleSaveConfig = async (nextConfig: DiscordWebhookConfig) => {
    saveStoredConfig(nextConfig);
    setConfig(nextConfig);
    showToast('success', 'Configurações salvas com sucesso.');
  };

  const handleTestWebhook = async (
    webhookUrl: string
  ): Promise<{ message: string }> => {
    const tempConfig: DiscordWebhookConfig = {
      ...config,
      webhookUrl: webhookUrl.trim(),
    };

    const testDelivery: FarmDelivery = {
      id: 'TEST-0001',
      playerName: 'Teste de Canal',
      passportId: '1001',
      itemName: 'Cloridrato de Crack',
      category: FarmCategory.NARCOTICOS,
      quantity: 200,
      unit: 'unid.',
      chestLocation: 'Baú da Fac',
      deliveredAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      photoUrl: 'seed:herbs',
      notes: 'Mensagem de verificação automática enviada pelo painel FazendaLog ao canal do Discord.',
      auditStatus: AuditStatus.APROVADO,
      webhookStatus: config.autoSend ? 'enviado' as any : 'aguardando_config' as any,
    };

    const res = await dispatchDeliveryToDiscord(testDelivery, tempConfig);
    if (!res.ok) {
      throw new Error(res.error || 'Falha ao enviar mensagem de teste para o canal.');
    }
    return { message: 'Log de teste enviado com sucesso para o canal do Discord!' };
  };

  // Safe masked config for non-admin display
  const displayConfig: DiscordWebhookConfig = {
    ...config,
    webhookUrl:
      viewMode === 'admin'
        ? config.webhookUrl
        : config.webhookUrl
        ? 'https://discord.com/api/webhooks/••••••••••••'
        : '',
  };

  // View: Landing Page
  if (viewMode === 'landing') {
    return (
      <>
        <LandingPageView
          config={displayConfig}
          totalDeliveriesCount={deliveries.length}
          onEnterPanel={() => setIsMemberAuthModalOpen(true)}
          onOpenAdminLogin={() => setIsAdminLoginModalOpen(true)}
        />

        <MemberAuthModal
          isOpen={isMemberAuthModalOpen}
          onClose={() => setIsMemberAuthModalOpen(false)}
          onSuccess={handleMemberAuthSuccess}
          initialMode={activeMember ? 'login' : 'register'}
        />

        <DiscordBotGuideModal
          isOpen={isDiscordGuideOpen}
          onClose={() => setIsDiscordGuideOpen(false)}
          onGoToWebhookTab={() => {
            if (adminToken) {
              setViewMode('admin');
            } else {
              setIsAdminLoginModalOpen(true);
            }
          }}
        />

        <AdminLoginModal
          isOpen={isAdminLoginModalOpen}
          expectedPin={config.adminPin || '0604'}
          onClose={() => setIsAdminLoginModalOpen(false)}
          onSuccess={handleAdminLoginSuccess}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col">
      {/* Universal Top Bar */}
      <header className="h-16 flex items-center justify-between gap-6 px-6 border-b border-slate-800/90 bg-[#0D121C] sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setViewMode('landing')}
            className="text-base font-bold tracking-tight text-slate-100 hover:text-indigo-300 transition-colors cursor-pointer"
          >
            Vila Remo
          </button>

          <span className="text-slate-700 hidden sm:inline">|</span>

          {/* Mode Pill Indicator */}
          <div className="flex items-center gap-1.5 text-xs">
            {viewMode === 'admin' ? (
              <span className="text-rose-400 font-semibold flex items-center gap-1.5 bg-rose-950/40 border border-rose-800/60 px-2.5 py-1 rounded-md">
                <ShieldCheck className="w-3.5 h-3.5" />
                Painel da Gerência (ADM)
              </span>
            ) : (
              <span className="text-indigo-300 font-medium flex items-center gap-1.5 bg-indigo-950/40 border border-indigo-800/60 px-2.5 py-1 rounded-md">
                <Users className="w-3.5 h-3.5" />
                Portal do Membro
              </span>
            )}
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setViewMode('landing')}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Página Inicial</span>
          </button>

          {viewMode === 'user' ? (
            <button
              type="button"
              onClick={() => {
                if (adminToken) {
                  setViewMode('admin');
                } else {
                  setIsAdminLoginModalOpen(true);
                }
              }}
              className="opacity-20 hover:opacity-80 transition-opacity p-1.5 rounded text-slate-500 hover:text-rose-400 cursor-pointer"
              title="Acesso Secreto"
              aria-label="Acesso Secreto"
            >
              <Shield className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleExitAdmin}
              className="px-3 py-1.5 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/80 rounded-lg text-xs font-semibold text-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair do ADM</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Viewport */}
      <main className="flex-1 p-6 lg:p-8 max-w-6xl w-full mx-auto">
        {viewMode === 'user' ? (
          <UserPortalView
            config={displayConfig}
            deliveries={deliveries}
            savedPlayerName={savedPlayerName}
            savedPassportId={savedPassportId}
            onSavePlayerIdentity={handleSavePlayerIdentity}
            onSubmitDelivery={handleCreateDelivery}
            onSelectDeliveryForModal={setSelectedDelivery}
            onOpenDiscordGuide={() => setIsDiscordGuideOpen(true)}
            onOpenAdminLogin={() => setIsAdminLoginModalOpen(true)}
            onLogoutMember={handleLogoutMember}
          />
        ) : (
          <AdminPortalView
            config={config}
            deliveries={deliveries}
            isLoading={isLoading}
            resendingId={resendingId}
            onSelectDelivery={setSelectedDelivery}
            onResendWebhook={handleResendWebhook}
            onUpdateAudit={handleUpdateAudit}
            onSaveConfig={handleSaveConfig}
            onTestWebhook={handleTestWebhook}
            onExitAdmin={handleExitAdmin}
            onGoToNewDelivery={() => setViewMode('user')}
            onOpenDiscordGuide={() => setIsDiscordGuideOpen(true)}
            onResetAll={handleResetAllDeliveries}
          />
        )}
      </main>

      {/* Screenshot Proof Lightbox Modal */}
      <ProofLightboxModal
        delivery={selectedDelivery}
        onClose={() => setSelectedDelivery(null)}
        onUpdateAudit={handleUpdateAudit}
        onResendWebhook={handleResendWebhook}
        onDelete={handleDeleteDelivery}
        resendingId={resendingId}
      />

      {/* Admin Secret Login Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginModalOpen}
        expectedPin={config.adminPin || '0604'}
        onClose={() => setIsAdminLoginModalOpen(false)}
        onSuccess={handleAdminLoginSuccess}
      />

      {/* Discord Channel Guide Modal */}
      <DiscordBotGuideModal
        isOpen={isDiscordGuideOpen}
        onClose={() => setIsDiscordGuideOpen(false)}
        onGoToWebhookTab={() => {
          if (adminToken) {
            setViewMode('admin');
          } else {
            setIsAdminLoginModalOpen(true);
          }
        }}
      />

      {/* Member Auth Modal (Registration & 4-Digit PIN Access) */}
      <MemberAuthModal
        isOpen={isMemberAuthModalOpen}
        onClose={() => setIsMemberAuthModalOpen(false)}
        onSuccess={handleMemberAuthSuccess}
        initialMode={activeMember ? 'login' : 'register'}
        prefilledPassportId={savedPassportId || activeMember?.id}
      />

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 max-w-sm bg-[#111827] border border-slate-700 rounded-xl px-4 py-3 shadow-xl flex items-center gap-2.5 text-xs text-slate-100"
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

export default App;
