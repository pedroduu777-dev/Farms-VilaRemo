import { DiscordWebhookConfig, FarmDelivery, MemberAccount, WebhookSyncStatus } from '../types/farm';

export function isValidDiscordWebhookUrl(urlStr: string): boolean {
  if (!urlStr) return false;
  try {
    const parsed = new URL(urlStr.trim());
    if (parsed.protocol !== 'https:') return false;
    const validHosts = [
      'discord.com',
      'www.discord.com',
      'discordapp.com',
      'www.discordapp.com',
      'ptb.discord.com',
      'canary.discord.com',
    ];
    return (
      validHosts.includes(parsed.hostname.toLowerCase()) &&
      parsed.pathname.startsWith('/api/webhooks/')
    );
  } catch {
    return false;
  }
}

function hexToDiscordInt(hex: string): number {
  const cleaned = hex.replace('#', '').trim();
  const parsed = parseInt(cleaned, 16);
  return Number.isNaN(parsed) ? 0x4f46e5 : parsed;
}

function formatPtBrTimestamp(isoStr: string): string {
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return isoStr;
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function dataUrlToBlob(dataUrl: string): { blob: Blob; ext: string } | null {
  try {
    const match = dataUrl.match(/^data:(image\/([a-zA-Z0-9+.-]+));base64,(.+)$/);
    if (!match) return null;
    const mimeType = match[1];
    const rawExt = match[2].toLowerCase();
    const ext = rawExt === 'png' ? 'png' : rawExt === 'webp' ? 'webp' : 'jpg';
    const base64Data = match[3];

    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i += 1) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    return { blob, ext };
  } catch (err) {
    console.warn('Erro ao converter dataUrl para Blob:', err);
    return null;
  }
}

/**
 * Cria uma Pasta/Tópico dedicado para o membro no Discord ao se cadastrar
 */
export async function createMemberDiscordFolder(
  member: MemberAccount,
  config: DiscordWebhookConfig
): Promise<{
  ok: boolean;
  threadId?: string;
  error?: string;
}> {
  const url = (config.webhookUrl || '').trim();
  if (!url || !isValidDiscordWebhookUrl(url)) {
    return { ok: false, error: 'Webhook não configurado.' };
  }

  const threadTitle = `📁・${member.name} [#${member.id}]`;
  const unixSeconds = Math.floor(Date.now() / 1000);
  let memberMention = '';
  if (member.discordId && member.discordId.trim()) {
    const raw = member.discordId.trim();
    if (raw.startsWith('<@') && raw.endsWith('>')) {
      memberMention = raw;
    } else {
      const digitsOnly = raw.replace(/[^0-9]/g, '');
      if (digitsOnly) {
        memberMention = `<@${digitsOnly}>`;
      } else {
        memberMention = `@${raw.replace(/^@/, '')}`;
      }
    }
  }

  const mentionsList: string[] = [];
  if (config.roleMention && config.roleMention.trim()) {
    mentionsList.push(config.roleMention.trim());
  }
  if (memberMention) {
    mentionsList.push(memberMention);
  }

  const notificationText = mentionsList.length > 0
    ? `${mentionsList.join(' ')} 📁 Nova pasta de farm aberta para **${member.name}** [#${member.id}]!`
    : undefined;

  const embed: Record<string, unknown> = {
    title: `📁 Nova Pasta Individual de Farm Criada`,
    description: `A pasta pessoal do membro **${member.name}** (Passaporte \`#${member.id}\`) foi inicializada no sistema.\n\nTodas as entregas feitas por ele no painel serão arquivadas aqui dentro automaticamente.`,
    color: hexToDiscordInt(config.embedColor),
    fields: [
      {
        name: '👤 Membro',
        value: `**${member.name}**`,
        inline: true,
      },
      {
        name: '🆔 Passaporte',
        value: `\`#${member.id}\``,
        inline: true,
      },
      {
        name: '🎯 Meta Semanal',
        value: `\`${config.weeklyGoalPerMember.toLocaleString('pt-BR')} unid.\``,
        inline: true,
      },
      {
        name: '👁️ Permissão da Pasta',
        value: memberMention
          ? `Acesso exclusivo aos **Cargos Altos** (${config.roleMention || 'ADM'}) e ao membro ${memberMention} (Passaporte \`#${member.id}\`).`
          : `Acesso exclusivo aos **Cargos Altos** (${config.roleMention || 'ADM'}) e ao titular do passaporte \`#${member.id}\`.`,
        inline: false,
      },
      {
        name: '🕒 Data de Registro',
        value: `<t:${unixSeconds}:F> (<t:${unixSeconds}:R>)`,
        inline: false,
      },
      {
        name: '🔒 Segurança',
        value: 'Senha de 4 dígitos ativada no painel web.',
        inline: false,
      },
    ],
    footer: {
      text: `${config.serverName} • Sistema de Pastas de Farm`,
    },
    timestamp: new Date().toISOString(),
  };

  const payload: Record<string, unknown> = {
    username: config.botName || 'Vila Remo · Auditoria FiveM',
    thread_name: threadTitle,
    content: notificationText,
    embeds: [embed],
  };

  try {
    const targetEndpoint = url.includes('?') ? `${url}&wait=true` : `${url}?wait=true`;
    
    // First attempt: try creating a thread / forum post
    let response = await fetch(targetEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // If channel is a standard text channel that doesn't support thread_name in root webhook, fallback to plain embed
    if (!response.ok && response.status === 400) {
      delete payload.thread_name;
      response = await fetch(targetEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return {
        ok: false,
        error: `Discord HTTP ${response.status}: ${errText.slice(0, 100)}`,
      };
    }

    const json = await response.json().catch(() => ({}));
    const threadId = json.channel_id || json.id;

    return {
      ok: true,
      threadId: typeof threadId === 'string' ? threadId : undefined,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Falha ao contatar Discord.',
    };
  }
}

export async function dispatchDeliveryToDiscord(
  delivery: FarmDelivery,
  config: DiscordWebhookConfig,
  targetThreadId?: string
): Promise<{
  ok: boolean;
  status: WebhookSyncStatus;
  httpCode?: number;
  threadId?: string;
  error?: string;
}> {
  const url = (config.webhookUrl || '').trim();
  if (!url) {
    return {
      ok: false,
      status: WebhookSyncStatus.AGUARDANDO_CONFIG,
      error: 'URL do Webhook do Discord ainda não configurada.',
    };
  }

  if (!isValidDiscordWebhookUrl(url)) {
    return {
      ok: false,
      status: WebhookSyncStatus.ERRO,
      error: 'URL inválida. Use um link oficial https://discord.com/api/webhooks/...',
    };
  }

  const deliveredDate = new Date(delivery.deliveredAt);
  const unixSeconds = Number.isNaN(deliveredDate.getTime())
    ? Math.floor(Date.now() / 1000)
    : Math.floor(deliveredDate.getTime() / 1000);

  let fileBlob: Blob | null = null;
  let attachmentFileName = `comprovante_${delivery.id.toLowerCase()}.jpg`;

  if (delivery.photoUrl.startsWith('data:image/')) {
    const converted = dataUrlToBlob(delivery.photoUrl);
    if (converted) {
      fileBlob = converted.blob;
      attachmentFileName = `comprovante_${delivery.id.toLowerCase()}.${converted.ext}`;
    }
  }

  let userMention = '';
  if (delivery.discordId && delivery.discordId.trim()) {
    const raw = delivery.discordId.trim();
    if (raw.startsWith('<@') && raw.endsWith('>')) {
      userMention = raw;
    } else {
      const digitsOnly = raw.replace(/[^0-9]/g, '');
      if (digitsOnly) {
        userMention = `<@${digitsOnly}>`;
      }
    }
  }

  const playerFieldValue = userMention
    ? `**${delivery.playerName}** (${userMention})\nPassaporte: \`#${delivery.passportId}\``
    : `**${delivery.playerName}**\nPassaporte: \`#${delivery.passportId}\``;

  const embed: Record<string, unknown> = {
    title: `📁 Pasta de Farm: ${delivery.playerName} [#${delivery.passportId}] · ${delivery.id}`,
    color: hexToDiscordInt(config.embedColor),
    fields: [
      {
        name: '👤 Membro Titular',
        value: playerFieldValue,
        inline: true,
      },
      {
        name: '🌾 Item Entregue',
        value: `**${delivery.itemName}**\n${delivery.category}`,
        inline: true,
      },
      {
        name: '📦 Quantidade',
        value: `\`${delivery.quantity.toLocaleString('pt-BR')} ${delivery.unit}\``,
        inline: true,
      },
      {
        name: '🔒 Visibilidade da Pasta',
        value: userMention
          ? `Apenas o membro ${userMention} e os Cargos Altos (${config.roleMention || 'ADM'})`
          : `Apenas o membro titular (#${delivery.passportId}) e os Cargos Altos (${config.roleMention || 'ADM'})`,
        inline: false,
      },
      {
        name: '🕒 Horário do Depósito',
        value: `<t:${unixSeconds}:F> (<t:${unixSeconds}:R>)\n\`${formatPtBrTimestamp(delivery.deliveredAt)}\``,
        inline: false,
      },
      {
        name: '🗄️ Baú / Local de Depósito',
        value: delivery.chestLocation,
        inline: true,
      },
      {
        name: '📂 Protocolo da Pasta',
        value: `\`${delivery.id}\``,
        inline: true,
      },
    ],
    footer: {
      text: `${config.serverName} • Pasta de Farm FiveM`,
    },
    timestamp: new Date(delivery.deliveredAt).toISOString(),
  };

  if (delivery.notes && delivery.notes.trim()) {
    (embed.fields as Array<Record<string, unknown>>).push({
      name: '📝 Observação',
      value: delivery.notes.trim(),
      inline: false,
    });
  }

  if (fileBlob) {
    embed.image = { url: `attachment://${attachmentFileName}` };
  } else if (delivery.photoUrl.startsWith('http://') || delivery.photoUrl.startsWith('https://')) {
    embed.image = { url: delivery.photoUrl };
  }

  const mentionsList: string[] = [];
  if (userMention) mentionsList.push(userMention);
  if (config.roleMention && config.roleMention.trim()) mentionsList.push(config.roleMention.trim());

  const uniqueMentions = Array.from(new Set(mentionsList));

  const contentMessage = uniqueMentions.length > 0
    ? `${uniqueMentions.join(' ')} 📁 **Pasta de Farm · ${delivery.playerName} [#${delivery.passportId}]**\nNova entrega arquivada na pasta pessoal com foto comprovante:`
    : `📁 **Pasta de Farm · ${delivery.playerName} [#${delivery.passportId}]**\nNova entrega arquivada na pasta pessoal com foto comprovante:`;

  const discordPayload: Record<string, unknown> = {
    username: config.botName || 'Vila Remo · Auditoria FiveM',
    content: contentMessage,
    embeds: [embed],
  };

  // Se o membro tiver uma pasta/thread dedicada no Discord, ou se configurado para criar pasta:
  const activeThread = targetThreadId || delivery.discordThreadId;

  // Se não tem thread específica mas threads estão ativadas, criar thread/post
  if (!activeThread && config.enableMemberThreads !== false) {
    discordPayload.thread_name = `📁・${delivery.playerName} [#${delivery.passportId}]`;
  }

  try {
    const rootEndpoint = url.includes('?') ? `${url}&wait=true` : `${url}?wait=true`;
    let targetEndpoint = rootEndpoint;
    if (activeThread) {
      targetEndpoint += `&thread_id=${activeThread}`;
    }

    const sendRequest = async (endpoint: string, currentPayload: Record<string, unknown>) => {
      if (fileBlob) {
        const formData = new FormData();
        formData.append('payload_json', JSON.stringify(currentPayload));
        formData.append('files[0]', fileBlob, attachmentFileName);
        return fetch(endpoint, { method: 'POST', body: formData });
      }
      return fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentPayload),
      });
    };

    let response = await sendRequest(targetEndpoint, discordPayload);

    // Se falhar (ex: HTTP 400, 404 por canal/thread desconhecido "code 10003" ou canal comum rejeitando thread_name)
    if (!response.ok) {
      // Tentativa de Fallback 1: se usava thread_id antiga ou deletada, tenta no canal principal sem thread_id
      if (activeThread) {
        response = await sendRequest(rootEndpoint, discordPayload);
      }

      // Tentativa de Fallback 2: se ainda falhar e tinha thread_name, remove thread_name e tenta no canal principal
      if (!response.ok && discordPayload.thread_name) {
        delete discordPayload.thread_name;
        response = await sendRequest(rootEndpoint, discordPayload);
      }
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return {
        ok: false,
        status: WebhookSyncStatus.ERRO,
        httpCode: response.status,
        error: `Discord retornou HTTP ${response.status}${errText ? `: ${errText.slice(0, 140)}` : ''}`,
      };
    }

    const resJson = await response.json().catch(() => ({}));
    const returnedThreadId = resJson.channel_id || resJson.id;

    return {
      ok: true,
      status: WebhookSyncStatus.ENVIADO,
      httpCode: response.status,
      threadId: typeof returnedThreadId === 'string' ? returnedThreadId : undefined,
    };
  } catch (err) {
    return {
      ok: false,
      status: WebhookSyncStatus.ERRO,
      error: err instanceof Error ? err.message : 'Falha de rede ao contatar o Discord.',
    };
  }
}

/**
 * Envia o relatório de fechamento das 23:50 para o Discord
 * Auditando quem bateu a meta diária de 200 Cloridrato de Crack
 */
export async function sendDailyCrackReportToDiscord(
  deliveries: FarmDelivery[],
  members: MemberAccount[],
  config: DiscordWebhookConfig
): Promise<{ ok: boolean; message: string }> {
  const url = (config.webhookUrl || '').trim();
  if (!url || !isValidDiscordWebhookUrl(url)) {
    return { ok: false, message: 'URL do Webhook do Discord não configurada ou inválida.' };
  }

  // Identificar entregas de Cloridrato de Crack de hoje
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  // Mapear por passaporte
  const crackDeliveries = deliveries.filter((d) => {
    const isCrack = d.itemName.toLowerCase().includes('crack');
    const dTime = new Date(d.deliveredAt).getTime();
    return isCrack && dTime >= todayStart && d.auditStatus !== 'recusado';
  });

  // Agrupar por passaporte / membro
  const memberTotals = new Map<string, { name: string; passport: string; discordId?: string; total: number }>();

  // Primeiro inicializa com todos os membros cadastrados
  members.forEach((m) => {
    memberTotals.set(m.id.toLowerCase(), {
      name: m.name,
      passport: m.id,
      discordId: m.discordId,
      total: 0,
    });
  });

  // Soma os farms entregues
  crackDeliveries.forEach((d) => {
    const key = d.passportId.toLowerCase().replace(/^#/, '');
    const current = memberTotals.get(key);
    if (current) {
      current.total += d.quantity;
    } else {
      memberTotals.set(key, {
        name: d.playerName,
        passport: d.passportId,
        discordId: d.discordId,
        total: d.quantity,
      });
    }
  });

  const list = Array.from(memberTotals.values());
  const GOAL = 200;
  const completed = list.filter((m) => m.total >= GOAL);
  const pending = list.filter((m) => m.total < GOAL);
  const totalAllCrackToday = list.reduce((acc, m) => acc + m.total, 0);

  const completedText = completed.length > 0
    ? completed
        .map((m) => {
          const mention = m.discordId ? ` (<@${m.discordId.replace(/[^0-9]/g, '')}>)` : '';
          return `✅ **${m.name}** [ID #${m.passport}]${mention} — \`${m.total.toLocaleString('pt-BR')} / 200 unid.\` (100% Batida)`;
        })
        .join('\n')
    : '_Nenhum membro bateu a meta de 200 até o momento._';

  const pendingText = pending.length > 0
    ? pending
        .map((m) => {
          const mention = m.discordId ? ` (<@${m.discordId.replace(/[^0-9]/g, '')}>)` : '';
          const falta = GOAL - m.total;
          return `⚠️ **${m.name}** [ID #${m.passport}]${mention} — \`${m.total.toLocaleString('pt-BR')} / 200 unid.\` (Faltam ${falta.toLocaleString('pt-BR')} unid.)`;
        })
        .join('\n')
    : '_Todos os membros bateram a meta hoje! Parabéns!_';

  const embedColor = completed.length > 0 && pending.length === 0 ? 0x10b981 : 0xd97706;

  const embed: Record<string, unknown> = {
    title: `🌙 FECHAMENTO DIÁRIO DAS 23:50 · META 200 CLORIDRATO DE CRACK`,
    description: `Relatório oficial de fechamento diário do baú da facção **${config.serverName}**.\nMeta obrigatória por membro: **200 unidades de Cloridrato de Crack**.`,
    color: embedColor,
    fields: [
      {
        name: `🟢 BATERAM A META (${completed.length}/${list.length})`,
        value: completedText,
        inline: false,
      },
      {
        name: `🔴 PENDENTES OU NÃO ENTREGARAM (${pending.length}/${list.length})`,
        value: pendingText,
        inline: false,
      },
      {
        name: '📊 Produção Total de Crack Hoje',
        value: `\`${totalAllCrackToday.toLocaleString('pt-BR')} unidades\` depositadas no Baú da Fac.`,
        inline: false,
      },
      {
        name: '🕒 Horário da Auditoria',
        value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
        inline: true,
      },
      {
        name: '🛡️ Gerência',
        value: config.roleMention || 'Cargos Altos',
        inline: true,
      },
    ],
    footer: {
      text: `${config.serverName} • Auditoria Diária de Narcóticos`,
    },
    timestamp: new Date().toISOString(),
  };

  const notificationContent = config.roleMention
    ? `${config.roleMention} 🌙 **RELATÓRIO DIÁRIO DAS 23:50: Auditoria da Meta de 200 Cloridrato de Crack!**`
    : `🌙 **RELATÓRIO DIÁRIO DAS 23:50: Auditoria da Meta de 200 Cloridrato de Crack!**`;

  const payload = {
    username: config.botName || 'Vila Remo · Auditoria FiveM',
    content: notificationContent,
    embeds: [embed],
  };

  try {
    const res = await fetch(url.includes('?') ? `${url}&wait=true` : `${url}?wait=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { ok: false, message: `Discord HTTP ${res.status}: ${errText.slice(0, 100)}` };
    }

    return { ok: true, message: 'Relatório das 23:50 enviado com sucesso para o canal do Discord!' };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Falha ao contatar Discord.' };
  }
}

