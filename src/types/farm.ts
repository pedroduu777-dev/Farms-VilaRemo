export enum FarmCategory {
  NARCOTICOS = 'Narcóticos & Drogas',
  PECAS = 'Peças & Componentes de Armas',
  MATERIAIS = 'Materiais de Armaria',
  MUNICAO = 'Pólvora & Munição',
  KITS = 'Kits de Montagem de Armas',
}

export enum AuditStatus {
  APROVADO = 'aprovado',
  PENDENTE = 'pendente',
  RECUSADO = 'recusado',
}

export enum WebhookSyncStatus {
  ENVIADO = 'enviado',
  AGUARDANDO_CONFIG = 'aguardando_config',
  ERRO = 'erro',
}

export interface FarmCatalogItem {
  id: string;
  name: string;
  category: FarmCategory;
  unit: string;
  suggestedChest: string;
  defaultBatch: number;
}

export interface FarmDelivery {
  id: string;
  playerName: string;
  passportId: string;
  discordId?: string;
  itemName: string;
  category: FarmCategory;
  quantity: number;
  unit: string;
  chestLocation: string;
  deliveredAt: string; // ISO 8601
  createdAt: string; // ISO 8601
  photoUrl: string; // Base64 Data URI, image URL, or seed sample
  notes?: string;
  auditStatus: AuditStatus;
  webhookStatus: WebhookSyncStatus;
  webhookHttpCode?: number;
  webhookSentAt?: string;
  webhookError?: string;
  discordThreadId?: string;
}

export interface DiscordWebhookConfig {
  webhookUrl: string;
  botName: string;
  embedColor: string;
  serverName: string;
  roleMention: string;
  autoSend: boolean;
  weeklyGoalPerMember: number;
  adminPin?: string;
  enableMemberThreads?: boolean; // Cria tópico/pasta individual para cada membro no Discord
}

export interface CreateDeliveryPayload {
  playerName: string;
  passportId: string;
  discordId?: string;
  itemName: string;
  category: FarmCategory;
  quantity: number;
  unit: string;
  chestLocation: string;
  deliveredAt: string;
  photoUrl: string;
  notes?: string;
}

export interface MemberAccount {
  id: string; // Passaporte / ID do jogador (ex: "1542")
  name: string; // Nome ou Nick do jogador
  pin: string; // Senha numérica de 4 dígitos (ex: "1234")
  discordId?: string; // ID do Discord ou arroba (ex: "1528141958856442052" ou "pedro")
  createdAt: string;
  lastLoginAt?: string;
  discordThreadId?: string; // ID da pasta/tópico dedicada no Discord
  discordThreadName?: string; // Nome da pasta (ex: "📁・Pedro Silva #1042")
}
