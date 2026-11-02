import React, { useState, useEffect } from 'react';
import {
  Camera,
  X,
  CheckCircle2,
  XCircle,
  Send,
  Clock,
  Trash2,
  Maximize2,
} from 'lucide-react';
import { AuditStatus, FarmDelivery, WebhookSyncStatus } from '../types/farm';
import { resolveProofPhotoUrl } from '../utils/proofAssets';
import { formatExactDateTime } from '../utils/farmHelpers';

interface ProofImageProps {
  photoUrl: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export const ProofImage: React.FC<ProofImageProps> = ({
  photoUrl,
  alt,
  className = 'w-full h-full object-cover',
  fallbackLabel = 'Comprovante anexado',
}) => {
  const [hasError, setHasError] = useState(false);
  const resolvedSrc = resolveProofPhotoUrl(photoUrl);

  useEffect(() => {
    setHasError(false);
  }, [photoUrl]);

  if (!resolvedSrc || hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-slate-900 text-slate-400 p-4 text-center select-none ${className}`}
      >
        <Camera className="w-6 h-6 text-slate-500 mb-1.5" />
        <span className="text-xs font-medium text-slate-400 line-clamp-1">{fallbackLabel}</span>
      </div>
    );
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
};

interface ProofLightboxModalProps {
  delivery: FarmDelivery | null;
  onClose: () => void;
  onUpdateAudit?: (id: string, status: AuditStatus) => Promise<void>;
  onResendWebhook?: (id: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  resendingId?: string | null;
}

export const ProofLightboxModal: React.FC<ProofLightboxModalProps> = ({
  delivery,
  onClose,
  onUpdateAudit,
  onResendWebhook,
  onDelete,
  resendingId,
}) => {
  useEffect(() => {
    if (!delivery) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [delivery, onClose]);

  if (!delivery) return null;

  const isResending = resendingId === delivery.id;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 md:p-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Comprovante da entrega ${delivery.id}`}
    >
      <div
        className="w-full max-w-5xl bg-[#111827] border border-slate-800 rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: High-res Screenshot */}
        <div className="lg:col-span-8 bg-[#070A10] flex items-center justify-center relative min-h-[280px] lg:min-h-[520px] border-b lg:border-b-0 lg:border-r border-slate-800">
          <ProofImage
            photoUrl={delivery.photoUrl}
            alt={`Print de entrega de ${delivery.quantity} ${delivery.itemName} por ${delivery.playerName}`}
            className="max-h-[75vh] w-full object-contain"
            fallbackLabel={`${delivery.itemName} · ${delivery.quantity} ${delivery.unit}`}
          />
          <div className="absolute bottom-3 left-3 bg-black/75 px-3 py-1.5 rounded-md text-xs font-mono tabular-nums text-slate-200 flex items-center gap-2">
            <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
            <span>{delivery.id}</span>
            <span aria-hidden="true">·</span>
            <span>{formatExactDateTime(delivery.deliveredAt)}</span>
          </div>
        </div>

        {/* Right: Structured Metadata & Actions */}
        <div className="lg:col-span-4 p-6 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-mono tabular-nums text-slate-400">
                  {delivery.id} · {delivery.category}
                </p>
                <h3 className="text-lg font-semibold text-slate-100 mt-1">
                  {delivery.itemName}
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                aria-label="Fechar visualização"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 border-y border-slate-800/90 space-y-3.5 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Jogador</span>
                <span className="font-medium text-slate-100 text-right">
                  {delivery.playerName}{' '}
                  <span className="font-mono tabular-nums text-slate-400">
                    #{delivery.passportId}
                  </span>
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Quantidade Entregue</span>
                <span className="font-mono tabular-nums text-base font-semibold text-indigo-400">
                  {delivery.quantity.toLocaleString('pt-BR')} {delivery.unit}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Quando foi entregue</span>
                <span className="font-mono tabular-nums text-xs text-slate-200">
                  {formatExactDateTime(delivery.deliveredAt)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Baú / Destino</span>
                <span className="text-slate-200 text-right">{delivery.chestLocation}</span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Log no Discord</span>
                <span className="text-xs flex items-center gap-1.5 text-slate-200">
                  {delivery.webhookStatus === WebhookSyncStatus.ENVIADO && (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Enviado ao canal</span>
                    </>
                  )}
                  {delivery.webhookStatus === WebhookSyncStatus.AGUARDANDO_CONFIG && (
                    <>
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Aguardando URL</span>
                    </>
                  )}
                  {delivery.webhookStatus === WebhookSyncStatus.ERRO && (
                    <>
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      <span>Falha no envio</span>
                    </>
                  )}
                </span>
              </div>

              {delivery.notes && (
                <div className="pt-2 border-t border-slate-800/70">
                  <span className="text-xs text-slate-400 block mb-1">Observação do jogador</span>
                  <p className="text-slate-300 text-xs leading-relaxed">{delivery.notes}</p>
                </div>
              )}

              {delivery.webhookError && delivery.webhookStatus === WebhookSyncStatus.ERRO && (
                <div className="pt-2 border-t border-slate-800/70">
                  <p className="text-xs text-rose-400 leading-relaxed">{delivery.webhookError}</p>
                </div>
              )}
            </div>

            {/* Leadership Audit Controls */}
            {onUpdateAudit && (
              <div>
                <span className="text-xs text-slate-400 block mb-2">
                  Conferência da Gerência ({delivery.auditStatus})
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateAudit(delivery.id, AuditStatus.APROVADO)}
                    className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border transition-colors cursor-pointer whitespace-nowrap ${
                      delivery.auditStatus === AuditStatus.APROVADO
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Aprovar Farm
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateAudit(delivery.id, AuditStatus.RECUSADO)}
                    className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border transition-colors cursor-pointer whitespace-nowrap ${
                      delivery.auditStatus === AuditStatus.RECUSADO
                        ? 'bg-rose-500/15 border-rose-500/50 text-rose-300'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Recusar Print
                  </button>
                </div>
              </div>
            )}
          </div>

          {(onResendWebhook || onDelete) && (
            <div className="pt-6 mt-6 border-t border-slate-800 flex items-center gap-2">
              {onResendWebhook && (
                <button
                  type="button"
                  disabled={isResending}
                  onClick={() => onResendWebhook(delivery.id)}
                  className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isResending ? 'Enviando...' : 'Reenviar ao Discord'}
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    onDelete(delivery.id);
                    onClose();
                  }}
                  className="py-2.5 px-3 bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Excluir entrega"
                  aria-label="Excluir entrega"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
