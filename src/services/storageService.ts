import {
  AuditStatus,
  CreateDeliveryPayload,
  DiscordWebhookConfig,
  FarmCategory,
  FarmDelivery,
  MemberAccount,
  WebhookSyncStatus,
} from '../types/farm';
import { dispatchDeliveryToDiscord } from './discordService';
import {
  syncDeliveryToSupabase,
  deleteAllDeliveriesFromSupabase,
  syncMemberToSupabase,
} from './supabaseService';

const DELIVERIES_KEY = 'fazendalog_deliveries_store_v1';
const CONFIG_KEY = 'fazendalog_config_store_v1';
const WIPE_FLAG_KEY = 'fazendalog_wipe_all_zero_v40';
const MEMBERS_STORAGE_KEY = 'fazendalog_members_accounts_v1';
const ACTIVE_MEMBER_KEY = 'fazendalog_active_member_session_v1';

export function ensureCleanState(): void {
  try {
    if (!localStorage.getItem(WIPE_FLAG_KEY)) {
      localStorage.removeItem(DELIVERIES_KEY);
      localStorage.removeItem(MEMBERS_STORAGE_KEY);
      localStorage.removeItem(ACTIVE_MEMBER_KEY);
      localStorage.removeItem('fazendalog_saved_player_name_v1');
      localStorage.removeItem('fazendalog_saved_passport_id_v1');
      localStorage.removeItem('fazendalog_player_identity_v1');
      localStorage.setItem(WIPE_FLAG_KEY, 'true');
      deleteAllDeliveriesFromSupabase().catch(() => {});
    }
  } catch (e) {
    console.warn('Erro ao verificar limpeza inicial:', e);
  }
}

const DEFAULT_WEBHOOK_URL =
  'https://discord.com/api/webhooks/1566887347826593885/Dpt8ePsG-y9VZcamT8HhKabp5TIFfHig32WPcNGRQCnsn4BV9hMRuRPLl4M_f0tvhzSN';

const DEFAULT_CONFIG: DiscordWebhookConfig = {
  webhookUrl: DEFAULT_WEBHOOK_URL,
  botName: 'Vila Remo · Auditoria FiveM',
  embedColor: '#4F46E5',
  serverName: 'Vila Remo',
  roleMention: '<@1528141958856442052>',
  autoSend: true,
  weeklyGoalPerMember: 2500,
  adminPin: '0604',
  enableMemberThreads: true,
};

export function clearAllDeliveries(): void {
  try {
    localStorage.removeItem(DELIVERIES_KEY);
    deleteAllDeliveriesFromSupabase().catch(() => {});
  } catch (e) {
    console.warn('Erro ao zerar entregas:', e);
  }
}

export function clearAllMembers(): void {
  try {
    localStorage.removeItem(MEMBERS_STORAGE_KEY);
    localStorage.removeItem(ACTIVE_MEMBER_KEY);
    localStorage.removeItem('fazendalog_saved_player_name_v1');
    localStorage.removeItem('fazendalog_saved_passport_id_v1');
  } catch (e) {
    console.warn('Erro ao zerar membros:', e);
  }
}

export function clearEverything(): void {
  clearAllDeliveries();
  clearAllMembers();
}

export function loadStoredDeliveries(): FarmDelivery[] {
  ensureCleanState();
  try {
    const raw = localStorage.getItem(DELIVERIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Erro ao ler entregas do localStorage:', e);
  }
  return [];
}

export function saveStoredDeliveries(deliveries: FarmDelivery[]): void {
  try {
    localStorage.setItem(DELIVERIES_KEY, JSON.stringify(deliveries));
  } catch (e) {
    console.warn('Erro ao salvar entregas no localStorage, tentando otimização de imagens:', e);
    try {
      // Fallback if localStorage quota is exceeded: keep full photoUrl for 5 recent deliveries, strip large base64 for older ones
      const optimized = deliveries.map((d, idx) => {
        if (idx > 5 && d.photoUrl && d.photoUrl.startsWith('data:image/')) {
          return { ...d, photoUrl: 'seed:herbs' };
        }
        return d;
      });
      localStorage.setItem(DELIVERIES_KEY, JSON.stringify(optimized));
    } catch (err2) {
      console.error('Falha crítica ao salvar entregas no localStorage:', err2);
    }
  }
}

export function loadStoredConfig(): DiscordWebhookConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
        const serverName =
          !parsed.serverName ||
          parsed.serverName === 'Organização Setor Norte' ||
          parsed.serverName === 'Abutres'
            ? 'Vila Remo'
            : parsed.serverName;
        const adminPin =
          !parsed.adminPin || parsed.adminPin === '1234'
            ? '0604'
            : parsed.adminPin;
        const roleMention =
          !parsed.roleMention || parsed.roleMention.trim() === ''
            ? '<@1528141958856442052>'
            : parsed.roleMention;
        const oldWebhooks = [
          'https://discord.com/api/webhooks/1564322368573415568/717AXX9zSrC6Q_XlKJpYPoZtRC4kuQ5W76mMnZ4QMlK5pYf4ONKnVmcRVeAzzfGZ4lWu',
          'https://discord.com/api/webhooks/1564322368573415568',
        ];
        const webhookUrl =
          !parsed.webhookUrl ||
          parsed.webhookUrl.trim() === '' ||
          oldWebhooks.some((w) => parsed.webhookUrl.includes(w))
            ? DEFAULT_WEBHOOK_URL
            : parsed.webhookUrl.trim();
        return {
          ...DEFAULT_CONFIG,
          ...parsed,
          webhookUrl,
          serverName,
          botName:
            !parsed.botName ||
            parsed.botName === 'FazendaLog · Auditoria FiveM' ||
            parsed.botName === 'Abutres · Auditoria FiveM'
              ? 'Vila Remo · Auditoria FiveM'
              : parsed.botName,
          adminPin,
          roleMention,
          enableMemberThreads: parsed.enableMemberThreads ?? true,
        };
    }
  } catch (e) {
    console.warn('Erro ao ler config do localStorage:', e);
  }
  return DEFAULT_CONFIG;
}

export function saveStoredConfig(config: DiscordWebhookConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('Erro ao salvar config no localStorage:', e);
  }
}

export async function processAndSaveNewDelivery(
  payload: CreateDeliveryPayload,
  currentDeliveries: FarmDelivery[],
  config: DiscordWebhookConfig
): Promise<{ delivery: FarmDelivery; updatedList: FarmDelivery[] }> {
  const cleanPassport = payload.passportId.trim().replace(/^#/, '');
  const cleanPlayerName = payload.playerName.trim();
  const members = loadStoredMembers();
  let matchedMember = members.find(
    (m) => m.id.toLowerCase() === cleanPassport.toLowerCase()
  );

  // Se o membro ainda não tinha pasta/registro criado, cria a pasta dele agora:
  if (!matchedMember) {
    const autoMember: MemberAccount = {
      id: cleanPassport,
      name: cleanPlayerName,
      pin: '0000',
      discordId: payload.discordId?.trim() || undefined,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };
    members.push(autoMember);
    saveStoredMembers(members);
    matchedMember = autoMember;
  } else if (payload.discordId && !matchedMember.discordId) {
    matchedMember.discordId = payload.discordId.trim();
    saveStoredMembers(members);
  }

  const nextNum = 1001 + currentDeliveries.length;
  const newDelivery: FarmDelivery = {
    id: `FRM-${nextNum}`,
    playerName: cleanPlayerName,
    passportId: cleanPassport,
    discordId: payload.discordId || matchedMember.discordId,
    itemName: payload.itemName,
    category: payload.category,
    quantity: payload.quantity,
    unit: payload.unit,
    chestLocation: payload.chestLocation,
    deliveredAt: payload.deliveredAt,
    createdAt: new Date().toISOString(),
    photoUrl: payload.photoUrl,
    notes: payload.notes,
    auditStatus: AuditStatus.PENDENTE,
    webhookStatus: WebhookSyncStatus.AGUARDANDO_CONFIG,
    discordThreadId: matchedMember?.discordThreadId,
  };

  if (config.autoSend && config.webhookUrl.trim()) {
    const webhookRes = await dispatchDeliveryToDiscord(
      newDelivery,
      config,
      matchedMember?.discordThreadId
    );
    newDelivery.webhookStatus = webhookRes.status;
    newDelivery.webhookHttpCode = webhookRes.httpCode;
    newDelivery.webhookError = webhookRes.error;
    if (webhookRes.ok) {
      newDelivery.webhookSentAt = new Date().toISOString();
      if (webhookRes.threadId) {
        newDelivery.discordThreadId = webhookRes.threadId;
        // Salva a thread do Discord na pasta do membro para as próximas entregas
        if (matchedMember && !matchedMember.discordThreadId) {
          updateMemberThread(matchedMember.id, webhookRes.threadId);
        }
      }
    }
  }

  const updatedList = [newDelivery, ...currentDeliveries];
  saveStoredDeliveries(updatedList);
  syncDeliveryToSupabase(newDelivery).catch(() => {});

  return { delivery: newDelivery, updatedList };
}

export function loadStoredMembers(): MemberAccount[] {
  ensureCleanState();
  try {
    const raw = localStorage.getItem(MEMBERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Erro ao ler membros do localStorage:', e);
  }
  return [];
}

export function saveStoredMembers(members: MemberAccount[]): void {
  try {
    localStorage.setItem(MEMBERS_STORAGE_KEY, JSON.stringify(members));
    members.forEach((m) => syncMemberToSupabase(m).catch(() => {}));
  } catch (e) {
    console.warn('Erro ao salvar membros no localStorage:', e);
  }
}

export function getActiveMember(): MemberAccount | null {
  ensureCleanState();
  try {
    const raw = localStorage.getItem(ACTIVE_MEMBER_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Erro ao ler membro ativo:', e);
  }
  return null;
}

export function setActiveMember(member: MemberAccount | null): void {
  try {
    if (member) {
      localStorage.setItem(ACTIVE_MEMBER_KEY, JSON.stringify(member));
    } else {
      localStorage.removeItem(ACTIVE_MEMBER_KEY);
    }
  } catch (e) {
    console.warn('Erro ao salvar membro ativo:', e);
  }
}

export function registerMember(
  name: string,
  passportId: string,
  pin: string,
  discordId?: string
): { success: boolean; message: string; member?: MemberAccount } {
  const cleanName = name.trim();
  const cleanId = passportId.trim().replace(/^#/, '');
  const cleanPin = pin.trim();
  const cleanDiscord = discordId?.trim().replace(/^@/, '') || undefined;

  if (!cleanName) {
    return { success: false, message: 'Digite o seu nome ou nick no FiveM.' };
  }
  if (!cleanId) {
    return { success: false, message: 'Digite o seu ID / Passaporte.' };
  }
  if (!/^\d{4}$/.test(cleanPin)) {
    return { success: false, message: 'A senha deve conter exatamente 4 números (ex: 1234).' };
  }

  const members = loadStoredMembers();
  const existing = members.find((m) => m.id.toLowerCase() === cleanId.toLowerCase());

  if (existing) {
    // If PIN matches, log in directly and optionally update name/discordId if changed
    if (existing.pin === cleanPin) {
      const updated: MemberAccount = {
        ...existing,
        name: cleanName,
        discordId: cleanDiscord || existing.discordId,
        lastLoginAt: new Date().toISOString(),
      };
      const updatedList = members.map((m) =>
        m.id.toLowerCase() === cleanId.toLowerCase() ? updated : m
      );
      saveStoredMembers(updatedList);
      setActiveMember(updated);
      return { success: true, message: `Bem-vindo de volta, ${updated.name}!`, member: updated };
    }
    return {
      success: false,
      message: `O ID #${cleanId} já está cadastrado. Insira a senha correta de 4 dígitos na aba "Já sou Cadastrado" ou altere o ID.`,
    };
  }

  const newMember: MemberAccount = {
    id: cleanId,
    name: cleanName,
    pin: cleanPin,
    discordId: cleanDiscord,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };

  members.push(newMember);
  saveStoredMembers(members);
  setActiveMember(newMember);

  return { success: true, message: `Cadastro realizado com sucesso! Olá, ${newMember.name}.`, member: newMember };
}

export function updateMemberDiscordId(passportId: string, discordId: string): void {
  try {
    const cleanId = passportId.trim().replace(/^#/, '');
    const cleanDiscord = discordId.trim().replace(/^@/, '');
    const members = loadStoredMembers();
    const updatedList = members.map((m) => {
      if (m.id.toLowerCase() === cleanId.toLowerCase()) {
        return { ...m, discordId: cleanDiscord || undefined };
      }
      return m;
    });
    saveStoredMembers(updatedList);
    const active = getActiveMember();
    if (active && active.id.toLowerCase() === cleanId.toLowerCase()) {
      setActiveMember({ ...active, discordId: cleanDiscord || undefined });
    }
  } catch (e) {
    console.warn('Erro ao atualizar discordId do membro:', e);
  }
}

export function authenticateMember(
  passportId: string,
  pin: string
): { success: boolean; message: string; member?: MemberAccount } {
  const cleanId = passportId.trim().replace(/^#/, '');
  const cleanPin = pin.trim();

  if (!cleanId) {
    return { success: false, message: 'Digite o seu ID / Passaporte.' };
  }
  if (!/^\d{4}$/.test(cleanPin)) {
    return { success: false, message: 'A senha deve conter exatamente 4 números.' };
  }

  const members = loadStoredMembers();
  const found = members.find((m) => m.id.toLowerCase() === cleanId.toLowerCase());

  if (!found) {
    return {
      success: false,
      message: `Nenhum membro encontrado com o ID #${cleanId}. Faça seu cadastro na aba "Novo Cadastro".`,
    };
  }

  if (found.pin !== cleanPin) {
    return {
      success: false,
      message: 'Senha de 4 dígitos incorreta para este passaporte. Tente novamente.',
    };
  }

  const updated: MemberAccount = {
    ...found,
    lastLoginAt: new Date().toISOString(),
  };
  const updatedList = members.map((m) =>
    m.id.toLowerCase() === cleanId.toLowerCase() ? updated : m
  );
  saveStoredMembers(updatedList);
  setActiveMember(updated);

  return { success: true, message: `Acesso liberado! Olá, ${updated.name}.`, member: updated };
}

export function updateMemberThread(passportId: string, threadId: string): void {
  try {
    const cleanId = passportId.trim().replace(/^#/, '');
    const members = loadStoredMembers();
    let updated = false;
    const newList = members.map((m) => {
      if (m.id.toLowerCase() === cleanId.toLowerCase()) {
        updated = true;
        return { ...m, discordThreadId: threadId };
      }
      return m;
    });

    if (updated) {
      saveStoredMembers(newList);
      const active = getActiveMember();
      if (active && active.id.toLowerCase() === cleanId.toLowerCase()) {
        setActiveMember({ ...active, discordThreadId: threadId });
      }
    }
  } catch (e) {
    console.warn('Erro ao atualizar thread do membro:', e);
  }
}

