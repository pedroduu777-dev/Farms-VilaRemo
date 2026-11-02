import React from 'react';
import { Camera } from 'lucide-react';
import { DiscordWebhookConfig, FarmCategory } from '../types/farm';
import { formatExactDateTime } from '../utils/farmHelpers';
import { ProofImage } from './ProofImage';

interface DiscordEmbedPreviewProps {
  config: DiscordWebhookConfig;
  playerName: string;
  passportId: string;
  itemName: string;
  category: FarmCategory;
  quantity: number;
  unit: string;
  chestLocation: string;
  deliveredAt: string;
  photoUrl: string;
  notes?: string;
}

export const DiscordEmbedPreview: React.FC<DiscordEmbedPreviewProps> = ({
  config,
  playerName,
  passportId,
  itemName,
  category,
  quantity,
  unit,
  chestLocation,
  deliveredAt,
  photoUrl,
  notes,
}) => {
  const displayPlayer = playerName.trim() || 'Nome do Jogador';
  const displayPassport = passportId.trim() || '0000';
  const displayItem = itemName.trim() || 'Peças de Fuzil (AK / G3 / Special)';
  const displayQty = Number.isFinite(quantity) && quantity > 0 ? quantity : 0;

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
      <div
        className="h-1 w-full"
        style={{ backgroundColor: config.embedColor || '#4F46E5' }}
      />
      <div className="p-5 space-y-4">
        {/* Bot Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-300 shrink-0">
              {config.serverName ? config.serverName.slice(0, 2).toUpperCase() : 'VR'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-100 truncate">
                <span className="truncate">{config.botName || 'Vila Remo · Auditoria FiveM'}</span>
                <span className="text-xs font-normal text-indigo-400 shrink-0">Webhook</span>
              </div>
              <p className="text-xs text-slate-400 font-mono tabular-nums">
                {formatExactDateTime(deliveredAt || new Date().toISOString())}
              </p>
            </div>
          </div>
        </div>

        {config.roleMention && (
          <p className="text-xs text-indigo-300 font-mono">
            {config.roleMention} Nova entrega de farm registrada:
          </p>
        )}

        {/* Embed Payload Structure */}
        <div className="pt-3 border-t border-slate-800/80 space-y-3.5">
          <h4 className="text-sm font-semibold text-slate-100">
            Registro de Entrega de Farm · Comprovante Automático
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Jogador</span>
              <span className="font-medium text-slate-100 block truncate">{displayPlayer}</span>
              <span className="font-mono tabular-nums text-slate-400">#{displayPassport}</span>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">Item Entregue</span>
              <span className="font-medium text-slate-100 block truncate">{displayItem}</span>
              <span className="text-slate-400 truncate block">{category}</span>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">Quantidade</span>
              <span className="font-mono tabular-nums text-sm font-semibold text-indigo-300">
                {displayQty.toLocaleString('pt-BR')} {unit}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-800/60">
            <div>
              <span className="text-slate-400 block mb-0.5">Quando Foi Entregue</span>
              <span className="font-mono tabular-nums text-slate-200">
                {formatExactDateTime(deliveredAt || new Date().toISOString())}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Baú / Destino</span>
              <span className="text-slate-200 truncate block">{chestLocation}</span>
            </div>
          </div>

          {notes && notes.trim() && (
            <div className="text-xs pt-2 border-t border-slate-800/60">
              <span className="text-slate-400 block mb-0.5">Observação</span>
              <p className="text-slate-300 line-clamp-2">{notes}</p>
            </div>
          )}

          {/* Attached Screenshot Preview */}
          <div className="rounded-lg overflow-hidden border border-slate-800 bg-[#070A10] aspect-video flex items-center justify-center">
            {photoUrl ? (
              <ProofImage
                photoUrl={photoUrl}
                alt="Prévia do comprovante que será enviado ao Discord"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-6 text-slate-500">
                <Camera className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                <p className="text-xs text-slate-400">
                  Anexe ou cole (`Ctrl+V`) o print do baú para visualizar no log do Discord
                </p>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500">
            {config.serverName} · Anexo enviado direto via multipart/form-data
          </p>
        </div>
      </div>
    </div>
  );
};
