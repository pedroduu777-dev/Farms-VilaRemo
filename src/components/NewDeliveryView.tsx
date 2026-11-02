import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Clock,
  Send,
  Trash2,
  Link2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Image as ImageIcon,
  ShieldCheck,
} from 'lucide-react';
import {
  CreateDeliveryPayload,
  DiscordWebhookConfig,
  FarmCategory,
  FarmDelivery,
  WebhookSyncStatus,
} from '../types/farm';
import {
  CHEST_LOCATIONS,
  FARM_CATALOG,
  compressImageFileToDataUrl,
  formatExactDateTime,
  toLocalDateTimeInput,
} from '../utils/farmHelpers';
import { DiscordEmbedPreview } from './DiscordEmbedPreview';
import { ProofImage } from './ProofImage';

interface NewDeliveryViewProps {
  config: DiscordWebhookConfig;
  recentDeliveries: FarmDelivery[];
  savedPlayerName: string;
  savedPassportId: string;
  onSavePlayerIdentity: (name: string, passport: string) => void;
  onSubmitDelivery: (payload: CreateDeliveryPayload) => Promise<FarmDelivery>;
  onSelectDeliveryForModal: (delivery: FarmDelivery) => void;
  onOpenWebhookSettings: () => void;
  onOpenDiscordGuide: () => void;
}

export const NewDeliveryView: React.FC<NewDeliveryViewProps> = ({
  config,
  recentDeliveries,
  savedPlayerName,
  savedPassportId,
  onSavePlayerIdentity,
  onSubmitDelivery,
  onSelectDeliveryForModal,
  onOpenWebhookSettings,
  onOpenDiscordGuide,
}) => {
  const [playerName, setPlayerName] = useState(savedPlayerName);
  const [passportId, setPassportId] = useState(savedPassportId);
  const [discordId, setDiscordId] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('fazendalog_player_identity_v1') || '{}');
      return parsed.discordId || '';
    } catch {
      return '';
    }
  });
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>(FARM_CATALOG[0].id);
  const [customItemName, setCustomItemName] = useState('');
  const [category, setCategory] = useState<FarmCategory>(FARM_CATALOG[0].category);
  const [unit, setUnit] = useState(FARM_CATALOG[0].unit);
  const [quantity, setQuantity] = useState<number>(FARM_CATALOG[0].defaultBatch);
  const [chestLocation, setChestLocation] = useState<string>(FARM_CATALOG[0].suggestedChest);
  const [deliveredAtLocal, setDeliveredAtLocal] = useState<string>(() =>
    toLocalDateTimeInput(new Date())
  );
  const [useLiveClock, setUseLiveClock] = useState<boolean>(true);
  const [photoMode, setPhotoMode] = useState<'upload' | 'url'>('upload');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [externalUrlInput, setExternalUrlInput] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (savedPlayerName) setPlayerName(savedPlayerName);
    if (savedPassportId) setPassportId(savedPassportId);
  }, [savedPlayerName, savedPassportId]);

  useEffect(() => {
    if (!useLiveClock) return;
    const timer = window.setInterval(() => {
      setDeliveredAtLocal(toLocalDateTimeInput(new Date()));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [useLiveClock]);

  // Global Ctrl+V screenshot paste
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i += 1) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            await handleFileSelected(file);
          }
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleCatalogChange = (catalogId: string) => {
    setSelectedCatalogId(catalogId);
    if (catalogId === 'custom') return;
    const found = FARM_CATALOG.find((item) => item.id === catalogId);
    if (found) {
      setCategory(found.category);
      setUnit(found.unit);
      setChestLocation(found.suggestedChest);
      setQuantity(found.defaultBatch);
    }
  };

  const handleFileSelected = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setFeedback({
        type: 'error',
        message: 'Selecione um arquivo de imagem válido (PNG, JPG ou WEBP).',
      });
      return;
    }
    try {
      setIsCompressing(true);
      setFeedback(null);
      const dataUrl = await compressImageFileToDataUrl(file);
      setPhotoUrl(dataUrl);
      setPhotoMode('upload');
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao processar a foto.',
      });
    } finally {
      setIsCompressing(false);
    }
  };

  const resolvedItemName =
    selectedCatalogId === 'custom'
      ? customItemName.trim()
      : FARM_CATALOG.find((i) => i.id === selectedCatalogId)?.name || '';

  const deliveredIso = (() => {
    const parsed = new Date(deliveredAtLocal);
    return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
  })();

  const activePhotoUrl = photoMode === 'url' ? externalUrlInput.trim() : photoUrl;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const cleanPlayer = playerName.trim();
    const cleanPassport = passportId.trim().replace(/^#/, '');

    if (!cleanPlayer || !cleanPassport) {
      setFeedback({
        type: 'error',
        message: 'Preencha o nome do seu personagem e o número do seu Passaporte (ID).',
      });
      return;
    }

    if (!resolvedItemName) {
      setFeedback({
        type: 'error',
        message: 'Selecione ou informe qual item de farm foi entregue no Baú.',
      });
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setFeedback({
        type: 'error',
        message: 'A quantidade entregue deve ser maior que zero.',
      });
      return;
    }

    // Use selected image or default simulated chest photo if non-provided
    const finalPhotoUrl = activePhotoUrl || 'seed:herbs';

    try {
      setIsSubmitting(true);
      onSavePlayerIdentity(cleanPlayer, cleanPassport);
      try {
        localStorage.setItem(
          'fazendalog_player_identity_v1',
          JSON.stringify({ name: cleanPlayer, passport: cleanPassport, discordId: discordId.trim() })
        );
      } catch {
        // Ignore storage error
      }

      const created = await onSubmitDelivery({
        playerName: cleanPlayer,
        passportId: cleanPassport,
        discordId: discordId.trim() || undefined,
        itemName: resolvedItemName,
        category,
        quantity: Math.round(quantity),
        unit,
        chestLocation,
        deliveredAt: useLiveClock ? new Date().toISOString() : deliveredIso,
        photoUrl: finalPhotoUrl,
        notes: notes.trim() || undefined,
      });

      // Clear input fields for next entry
      setPhotoUrl('');
      setExternalUrlInput('');
      setNotes('');
      setCustomItemName('');

      if (useLiveClock) {
        setDeliveredAtLocal(toLocalDateTimeInput(new Date()));
      }

      if (created.webhookStatus === WebhookSyncStatus.ENVIADO) {
        setFeedback({
          type: 'success',
          message: `✅ Entrega ${created.id} (${created.quantity} ${created.unit} de ${created.itemName}) REGISTRADA COM SUCESSO e enviada ao Discord!`,
        });
      } else if (created.webhookStatus === WebhookSyncStatus.ERRO) {
        setFeedback({
          type: 'success',
          message: `✅ Entrega ${created.id} REGISTRADA COM SUCESSO no Baú da Fac! (Aviso: Webhook do Discord indisponível no momento: ${
            created.webhookError || 'verifique a URL'
          })`,
        });
      } else {
        setFeedback({
          type: 'success',
          message: `✅ Entrega ${created.id} REGISTRADA COM SUCESSO no Baú da Fac!`,
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Falha ao registrar entrega de farm.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Main 2-Column Split: Form Left (7 cols) + Live Discord Preview & Recent Right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-6"
        >
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-lg font-semibold text-slate-100">Registrar Entrega de Farm</h2>
            <p className="text-xs text-slate-400 mt-1">
              Preencha os dados do depósito no baú e cole (`Ctrl+V`) ou envie o print comprovante.
            </p>
          </div>

          {feedback && (
            <div
              role="status"
              className={`p-3.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                feedback.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                  : feedback.type === 'warning'
                  ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
                  : 'bg-rose-950/40 border-rose-800/60 text-rose-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{feedback.message}</span>
            </div>
          )}

          {/* 1. Identificação no FiveM & Discord */}
          <div className="space-y-3">
            {savedPlayerName && savedPassportId ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-indigo-950/40 border border-indigo-800/60 rounded-xl text-xs text-indigo-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Entrega vinculada ao membro cadastrado: <strong className="text-white">{savedPlayerName}</strong> (#{savedPassportId})
                </span>
              </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label
                  htmlFor="player-name"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Nome do Jogador (RP) *
                </label>
                <input
                  id="player-name"
                  type="text"
                  required
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Ex: Pedro Silva"
                  className="w-full px-3.5 py-2.5 bg-[#0B0F17] border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-lg text-sm text-slate-100 placeholder:text-slate-600 transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="passport-id"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Passaporte / ID *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">
                    #
                  </span>
                  <input
                    id="passport-id"
                    type="text"
                    required
                    value={passportId}
                    onChange={(e) => setPassportId(e.target.value.replace(/[^0-9a-zA-Z_-]/g, ''))}
                    placeholder="1042"
                    className="w-full pl-8 pr-3.5 py-2.5 bg-[#0B0F17] border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-lg text-sm font-mono tabular-nums text-slate-100 placeholder:text-slate-600 transition-colors"
                  />
                </div>
              </div>
            </div>


          </div>

          {/* 2. Item de Farm e Baú */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="farm-item-select"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Item Entregue *
              </label>
              <select
                id="farm-item-select"
                value={selectedCatalogId}
                onChange={(e) => handleCatalogChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0B0F17] border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-lg text-sm text-slate-100 transition-colors"
              >
                {FARM_CATALOG.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.category})
                  </option>
                ))}
                <option value="custom">Outro item personalizado...</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="chest-location"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Baú / Local de Entrega
              </label>
              <select
                id="chest-location"
                value={chestLocation}
                onChange={(e) => setChestLocation(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0B0F17] border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-lg text-sm text-slate-100 transition-colors"
              >
                {CHEST_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedCatalogId === 'custom' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="custom-item-name"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Nome do Item Personalizado *
                </label>
                <input
                  id="custom-item-name"
                  type="text"
                  required
                  value={customItemName}
                  onChange={(e) => setCustomItemName(e.target.value)}
                  placeholder="Ex: Semente de Papoula"
                  className="w-full px-3.5 py-2.5 bg-[#0B0F17] border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-lg text-sm text-slate-100"
                />
              </div>
              <div>
                <label
                  htmlFor="custom-category"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Categoria
                </label>
                <select
                  id="custom-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as FarmCategory)}
                  className="w-full px-3.5 py-2.5 bg-[#0B0F17] border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-lg text-sm text-slate-100"
                >
                  {Object.values(FarmCategory).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* 3. Quantidade Entregue */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="farm-quantity"
                className="text-xs font-medium text-slate-300"
              >
                Quantidade Entregue ({unit}) *
              </label>
              <span className="text-xs font-mono tabular-nums text-indigo-400">
                Total: {(Number.isFinite(quantity) ? quantity : 0).toLocaleString('pt-BR')} {unit}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                id="farm-quantity"
                type="number"
                min={1}
                step={1}
                required
                value={quantity || ''}
                onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value || '0', 10)))}
                className="sm:w-44 px-3.5 py-2.5 bg-[#0B0F17] border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-lg text-base font-mono tabular-nums font-semibold text-slate-100"
              />

              <div className="flex flex-wrap items-center gap-1.5 flex-1">
                {[50, 100, 250, 500, 1000].map((inc) => (
                  <button
                    key={inc}
                    type="button"
                    onClick={() => setQuantity((prev) => (Number.isFinite(prev) ? prev : 0) + inc)}
                    className="px-2.5 py-2 bg-[#0B0F17] hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-mono tabular-nums text-slate-300 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    +{inc}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setQuantity(0)}
                  className="px-2.5 py-2 bg-[#0B0F17] hover:bg-slate-800 border border-slate-800 rounded-lg text-xs text-slate-400 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Zerar
                </button>
              </div>
            </div>
          </div>

          {/* 4. Quando foi entregue */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label
                htmlFor="delivered-at"
                className="text-xs font-medium text-slate-300 flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Quando foi entregue (Data e Hora) *
              </label>

              <button
                type="button"
                onClick={() => {
                  setUseLiveClock((prev) => !prev);
                  setDeliveredAtLocal(toLocalDateTimeInput(new Date()));
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer whitespace-nowrap"
              >
                {useLiveClock ? 'Editar horário manualmente' : 'Voltar para horário em tempo real'}
              </button>
            </div>

            <input
              id="delivered-at"
              type="datetime-local"
              step="1"
              value={deliveredAtLocal}
              disabled={useLiveClock}
              onChange={(e) => {
                setUseLiveClock(false);
                setDeliveredAtLocal(e.target.value);
              }}
              className="w-full px-3.5 py-2.5 bg-[#0B0F17] border border-slate-800 disabled:opacity-75 focus:border-indigo-500 focus:outline-none rounded-lg text-sm font-mono tabular-nums text-slate-100"
            />
          </div>

          {/* 5. Foto Comprovante */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-xs font-medium text-slate-300">
                Foto Comprovante do Baú (Obrigatório) *
              </span>

              <div className="flex items-center gap-1 p-0.5 bg-[#0B0F17] border border-slate-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => setPhotoMode('upload')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    photoMode === 'upload'
                      ? 'bg-slate-800 text-slate-100'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Arquivo ou Ctrl+V
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoMode('url')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    photoMode === 'url'
                      ? 'bg-slate-800 text-slate-100'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Link da Imagem
                </button>
              </div>
            </div>

            {photoMode === 'upload' ? (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelected(file);
                    e.target.value = '';
                  }}
                />

                {!photoUrl ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleFileSelected(file);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                      isDragging
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-slate-700 bg-[#0B0F17] hover:border-slate-600'
                    }`}
                  >
                    <Upload className="w-7 h-7 text-slate-400 mx-auto mb-2.5" />
                    <p className="text-sm font-medium text-slate-200">
                      {isCompressing
                        ? 'Otimizando captura de tela...'
                        : 'Clique para enviar, arraste a foto ou pressione Ctrl+V'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Aceita PrintScreen direto do FiveM (`Win+Shift+S`), PNG, JPG ou WEBP
                    </p>
                  </div>
                ) : (
                  <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-[#070A10]">
                    <div className="aspect-video max-h-64 w-full">
                      <ProofImage
                        photoUrl={photoUrl}
                        alt="Print selecionado para comprovação de entrega"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="px-4 py-2.5 bg-[#0B0F17] border-t border-slate-800 flex items-center justify-between gap-3">
                      <span className="text-xs text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Foto pronta para anexar no log do Discord
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs text-slate-300 hover:text-white px-2.5 py-1 bg-slate-800 rounded-md cursor-pointer whitespace-nowrap"
                        >
                          Trocar foto
                        </button>
                        <button
                          type="button"
                          onClick={() => setPhotoUrl('')}
                          className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer"
                          aria-label="Remover foto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <Link2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={externalUrlInput}
                    onChange={(e) => setExternalUrlInput(e.target.value)}
                    placeholder="https://cdn.discordapp.com/attachments/.../print.png"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#0B0F17] border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-lg text-sm text-slate-100 placeholder:text-slate-600"
                  />
                </div>
                {externalUrlInput.trim() && (
                  <div className="aspect-video max-h-56 rounded-lg overflow-hidden border border-slate-800 bg-[#070A10]">
                    <ProofImage
                      photoUrl={externalUrlInput.trim()}
                      alt="Prévia da URL de imagem informada"
                      className="w-full h-full object-contain"
                      fallbackLabel="URL inválida ou bloqueada — prefira colar Ctrl+V"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 6. Observação */}
          <div>
            <label
              htmlFor="delivery-notes"
              className="block text-xs font-medium text-slate-300 mb-1.5"
            >
              Observação (Opcional)
            </label>
            <input
              id="delivery-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Entregue junto com o parceiro #1420 após rota norte"
              className="w-full px-3.5 py-2.5 bg-[#0B0F17] border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-lg text-sm text-slate-100 placeholder:text-slate-600"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isCompressing}
            className="w-full py-3 px-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <Send className="w-4 h-4" />
            {isSubmitting
              ? 'Registrando e enviando ao Discord...'
              : 'Confirmar Entrega de Farm e Enviar Log'}
          </button>
        </form>

        {/* Right Column */}
        <div className="lg:col-span-5 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-200">
                Prévia da Entrega
              </h3>
            </div>

            <DiscordEmbedPreview
              config={config}
              playerName={playerName}
              passportId={passportId}
              itemName={resolvedItemName}
              category={category}
              quantity={quantity}
              unit={unit}
              chestLocation={chestLocation}
              deliveredAt={deliveredIso}
              photoUrl={activePhotoUrl}
              notes={notes}
            />
          </div>

          {/* Recent 3 Deliveries */}
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">Últimas Entregas Registradas</h3>
              <span className="text-xs font-mono tabular-nums text-slate-400">
                {recentDeliveries.length} registros
              </span>
            </div>

            {recentDeliveries.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                Nenhuma entrega registrada ainda.
              </p>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {recentDeliveries.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectDeliveryForModal(item)}
                    className="w-full py-3 first:pt-0 last:pb-0 flex items-center gap-3.5 text-left hover:opacity-90 transition-opacity cursor-pointer group"
                  >
                    <div className="w-16 h-12 rounded-md overflow-hidden border border-slate-800 bg-[#070A10] shrink-0">
                      <ProofImage
                        photoUrl={item.photoUrl}
                        alt={`Comprovante ${item.id}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-150"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-100 truncate">
                          {item.playerName}{' '}
                          <span className="font-mono tabular-nums font-normal text-slate-400">
                            #{item.passportId}
                          </span>
                        </span>
                        <span className="text-xs font-mono tabular-nums font-semibold text-indigo-300 shrink-0">
                          +{item.quantity.toLocaleString('pt-BR')} {item.unit}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5 truncate">
                        <span className="truncate">{item.itemName}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums shrink-0">
                          {formatExactDateTime(item.deliveredAt)}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
