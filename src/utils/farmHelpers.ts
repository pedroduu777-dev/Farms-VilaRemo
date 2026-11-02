import { FarmCatalogItem, FarmCategory, FarmDelivery } from '../types/farm';

export const FARM_CATALOG: FarmCatalogItem[] = [
  {
    id: 'cloridrato-crack',
    name: 'Cloridrato de Crack',
    category: FarmCategory.NARCOTICOS,
    unit: 'unid.',
    suggestedChest: 'Baú da Fac',
    defaultBatch: 200,
  },
  {
    id: 'solvente',
    name: 'Solvente',
    category: FarmCategory.SOLVENTE,
    unit: 'unid.',
    suggestedChest: 'Baú da Fac',
    defaultBatch: 200,
  },
];

export const CHEST_LOCATIONS = [
  'Baú da Fac',
];

export function formatExactDateTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  const datePart = date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timePart = date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return `${datePart} · ${timePart}`;
}

export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  const diffSeconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (diffSeconds < 60) return 'agora mesmo';
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `há ${diffMinutes} min`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `há ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `há ${diffDays}d`;
}

export function toLocalDateTimeInput(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

export async function compressImageFileToDataUrl(file: File, maxDimension = 1440): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo de imagem.'));
    reader.onload = () => {
      const result = reader.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de imagem inválido.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(result);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', 0.86);
        resolve(compressed);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
}

export function exportDeliveriesToCsv(deliveries: FarmDelivery[]): void {
  const headers = [
    'ID Registro',
    'Jogador',
    'Passaporte FiveM',
    'Item de Farm',
    'Categoria',
    'Quantidade',
    'Unidade',
    'Baú Destino',
    'Data e Hora da Entrega',
    'Auditoria',
    'Status Webhook Discord',
    'Observação',
  ];

  const escapeCsv = (val: string | number | undefined) => {
    const str = String(val ?? '').replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = deliveries.map((d) => [
    escapeCsv(d.id),
    escapeCsv(d.playerName),
    escapeCsv(`#${d.passportId}`),
    escapeCsv(d.itemName),
    escapeCsv(d.category),
    escapeCsv(d.quantity),
    escapeCsv(d.unit),
    escapeCsv(d.chestLocation),
    escapeCsv(formatExactDateTime(d.deliveredAt)),
    escapeCsv(d.auditStatus),
    escapeCsv(d.webhookStatus),
    escapeCsv(d.notes || ''),
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `relatorio-farm-fivem-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
