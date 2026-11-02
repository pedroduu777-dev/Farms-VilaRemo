import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { FarmDelivery, DiscordWebhookConfig } from '../types/farm';

const SUPABASE_URL_KEY = 'fazendalog_supabase_url_v1';
const SUPABASE_KEY_KEY = 'fazendalog_supabase_anon_key_v1';

let supabaseInstance: SupabaseClient | null = null;

const DEFAULT_SUPABASE_URL = 'https://fmpbvzzzwjicfzevpgds.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_EoYD9X7Y0pzX0PEEpB0F7w_zhDT8esS';

export function normalizeSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let cleaned = rawUrl.trim();
  cleaned = cleaned.replace(/\/rest\/v1\/?$/i, '');
  cleaned = cleaned.replace(/\/+$/, '');
  return cleaned;
}

export function getSupabaseCredentials(): { url: string; anonKey: string } {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  if (envUrl && envKey) {
    return { url: normalizeSupabaseUrl(envUrl), anonKey: envKey };
  }

  try {
    const savedUrl = localStorage.getItem(SUPABASE_URL_KEY) || DEFAULT_SUPABASE_URL;
    const savedKey = localStorage.getItem(SUPABASE_KEY_KEY) || DEFAULT_SUPABASE_ANON_KEY;
    return { url: normalizeSupabaseUrl(savedUrl), anonKey: savedKey };
  } catch {
    return { url: DEFAULT_SUPABASE_URL, anonKey: DEFAULT_SUPABASE_ANON_KEY };
  }
}

export function saveSupabaseCredentials(url: string, anonKey: string): void {
  try {
    const normalized = normalizeSupabaseUrl(url);
    localStorage.setItem(SUPABASE_URL_KEY, normalized);
    localStorage.setItem(SUPABASE_KEY_KEY, anonKey.trim());
    supabaseInstance = null;
  } catch (e) {
    console.warn('Erro ao salvar credenciais do Supabase:', e);
  }
}

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  const { url, anonKey } = getSupabaseCredentials();
  if (!url || !anonKey) return null;

  try {
    supabaseInstance = createClient(url, anonKey);
    return supabaseInstance;
  } catch (err) {
    console.warn('Erro ao inicializar cliente do Supabase:', err);
    return null;
  }
}

export async function syncDeliveryToSupabase(delivery: FarmDelivery): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const payload = {
      id: delivery.id,
      player_name: delivery.playerName,
      passport_id: delivery.passportId,
      discord_id: delivery.discordId || null,
      item_name: delivery.itemName,
      category: delivery.category,
      quantity: delivery.quantity,
      unit: delivery.unit,
      chest_location: delivery.chestLocation,
      delivered_at: delivery.deliveredAt,
      created_at: delivery.createdAt,
      photo_url: delivery.photoUrl,
      notes: delivery.notes || null,
      audit_status: delivery.auditStatus,
      webhook_status: delivery.webhookStatus,
      webhook_http_code: delivery.webhookHttpCode || null,
      webhook_error: delivery.webhookError || null,
      webhook_sent_at: delivery.webhookSentAt || null,
    };

    const { error } = await client.from('deliveries').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Erro ao sincronizar entrega no Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Falha de rede ao contatar o Supabase:', err);
    return false;
  }
}

export async function deleteDeliveryFromSupabase(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('deliveries').delete().eq('id', id);
    if (error) {
      console.warn('Erro ao deletar entrega no Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Falha de rede ao deletar no Supabase:', err);
    return false;
  }
}

export async function deleteAllDeliveriesFromSupabase(): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('deliveries').delete().neq('id', 'NONE_EXISTS_99999');
    if (error) {
      console.warn('Erro ao deletar todas as entregas no Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Falha de rede ao limpar Supabase:', err);
    return false;
  }
}

export async function fetchDeliveriesFromSupabase(): Promise<FarmDelivery[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('deliveries')
      .select('*')
      .order('delivered_at', { ascending: false });

    if (error || !Array.isArray(data)) {
      console.warn('Erro ao buscar entregas no Supabase:', error?.message);
      return null;
    }

    return data.map((row) => ({
      id: row.id,
      playerName: row.player_name,
      passportId: row.passport_id,
      discordId: row.discord_id || undefined,
      itemName: row.item_name,
      category: row.category,
      quantity: row.quantity,
      unit: row.unit,
      chestLocation: row.chest_location,
      deliveredAt: row.delivered_at,
      createdAt: row.created_at,
      photoUrl: row.photo_url,
      notes: row.notes || undefined,
      auditStatus: row.audit_status,
      webhookStatus: row.webhook_status,
      webhookHttpCode: row.webhook_http_code || undefined,
      webhookError: row.webhook_error || undefined,
      webhookSentAt: row.webhook_sent_at || undefined,
    }));
  } catch (err) {
    console.warn('Falha de rede ao consultar Supabase:', err);
    return null;
  }
}
