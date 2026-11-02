import React, { useState, useRef, useEffect } from 'react';
import {
  UserPlus,
  LogIn,
  X,
  KeyRound,
  User,
  Hash,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  MessageSquare,
} from 'lucide-react';
import { MemberAccount } from '../types/farm';
import {
  registerMember,
  authenticateMember,
  loadStoredConfig,
  updateMemberThread,
} from '../services/storageService';
import { createMemberDiscordFolder } from '../services/discordService';

interface MemberAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (member: MemberAccount) => void;
  initialMode?: 'register' | 'login';
  prefilledPassportId?: string;
}

export const MemberAuthModal: React.FC<MemberAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'register',
  prefilledPassportId = '',
}) => {
  const [mode, setMode] = useState<'register' | 'login'>(initialMode);
  const [name, setName] = useState('');
  const [passportId, setPassportId] = useState(prefilledPassportId);
  const [discordId, setDiscordId] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const passportInputRef = useRef<HTMLInputElement | null>(null);
  const pinInputRef = useRef<HTMLInputElement | null>(null);

  // Sync initial state when modal opens
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSuccessMsg(null);
      setName('');
      setPassportId('');
      setDiscordId('');
      setPin('');
      setMode(initialMode);
      setTimeout(() => {
        if (initialMode === 'register') {
          nameInputRef.current?.focus();
        } else {
          passportInputRef.current?.focus();
        }
      }, 100);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handlePinChange = (val: string) => {
    // Only accept numeric digits, up to 4 digits
    const cleaned = val.replace(/\D/g, '').slice(0, 4);
    setPin(cleaned);
    setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanId = passportId.trim().replace(/^#/, '');
    const cleanPin = pin.trim();

    if (mode === 'register') {
      const cleanName = name.trim();
      if (!cleanName) {
        setErrorMsg('Por favor, informe seu Nome ou Nick no jogo.');
        nameInputRef.current?.focus();
        return;
      }
      if (!cleanId) {
        setErrorMsg('Por favor, informe seu ID / Passaporte.');
        passportInputRef.current?.focus();
        return;
      }
      if (cleanPin.length !== 4) {
        setErrorMsg('A senha deve conter exatamente 4 números (ex: 1234).');
        pinInputRef.current?.focus();
        return;
      }

      setIsLoading(true);
      setTimeout(() => {
        const result = registerMember(cleanName, cleanId, cleanPin, discordId.trim());
        setIsLoading(false);
        if (result.success && result.member) {
          setSuccessMsg(result.message);

          // Dispara a criação da pasta individual de farm no Discord em background
          try {
            const config = loadStoredConfig();
            if (config.autoSend && config.webhookUrl) {
              createMemberDiscordFolder(result.member, config)
                .then((folderRes) => {
                  if (folderRes.ok && folderRes.threadId) {
                    updateMemberThread(result.member!.id, folderRes.threadId);
                  }
                })
                .catch(() => {});
            }
          } catch {
            // Silencioso se der erro no webhook
          }

          setTimeout(() => {
            onSuccess(result.member!);
            onClose();
          }, 450);
        } else {
          setErrorMsg(result.message);
        }
      }, 250);
    } else {
      if (!cleanId) {
        setErrorMsg('Por favor, informe seu ID / Passaporte.');
        passportInputRef.current?.focus();
        return;
      }
      if (cleanPin.length !== 4) {
        setErrorMsg('Digite os 4 números da sua senha.');
        pinInputRef.current?.focus();
        return;
      }

      setIsLoading(true);
      setTimeout(() => {
        const result = authenticateMember(cleanId, cleanPin);
        setIsLoading(false);
        if (result.success && result.member) {
          setSuccessMsg(result.message);
          setTimeout(() => {
            onSuccess(result.member!);
            onClose();
          }, 400);
        } else {
          setErrorMsg(result.message);
        }
      }, 250);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Identificação do Membro"
    >
      <div
        className="w-full max-w-md bg-[#111827] border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-7 space-y-6 my-auto text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30 shrink-0">
              {mode === 'register' ? (
                <UserPlus className="w-5 h-5" />
              ) : (
                <LogIn className="w-5 h-5" />
              )}
            </div>
            <div>
              <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider block">
                Vila Remo · FiveM
              </span>
              <h3 className="text-lg font-bold text-slate-100 leading-tight">
                {mode === 'register' ? 'Cadastro do Membro' : 'Acesso ao Painel de Farm'}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="p-1 bg-[#090D16] border border-slate-800 rounded-xl grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg(null);
            }}
            className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              mode === 'register'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Novo Cadastro</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg(null);
            }}
            className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              mode === 'login'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Já sou Cadastrado</span>
          </button>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-400 leading-relaxed">
          {mode === 'register'
            ? 'Crie seu cadastro com seu Nome, Passaporte (ID) e uma senha de 4 dígitos para proteger e identificar todas as suas entregas no baú da fac.'
            : 'Digite seu Passaporte (ID) e a senha de 4 dígitos cadastrada para acessar o formulário de entrega de farm.'}
        </p>

        {/* Feedback message */}
        {errorMsg && (
          <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-200 flex items-start gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs text-emerald-200 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label
                htmlFor="member-name-input"
                className="block text-xs font-semibold text-slate-300 mb-1.5"
              >
                Nome do Membro (Nick no Jogo) <span className="text-indigo-400">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={nameInputRef}
                  id="member-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Pedro Santos / Duarte"
                  className="w-full bg-[#090D16] border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors"
                  disabled={isLoading}
                  autoComplete="name"
                />
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="member-id-input"
              className="block text-xs font-semibold text-slate-300 mb-1.5"
            >
              ID do Jogo (Passaporte) <span className="text-indigo-400">*</span>
            </label>
            <div className="relative">
              <Hash className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                ref={passportInputRef}
                id="member-id-input"
                type="text"
                value={passportId}
                onChange={(e) => setPassportId(e.target.value.replace(/\D/g, ''))}
                placeholder="Ex: 1542"
                className="w-full bg-[#090D16] border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors"
                disabled={isLoading}
                inputMode="numeric"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Apenas os números do seu passaporte.
            </p>
          </div>



          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="member-pin-input"
                className="block text-xs font-semibold text-slate-300"
              >
                Senha de 4 dígitos <span className="text-indigo-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
              >
                {showPin ? (
                  <>
                    <EyeOff className="w-3 h-3" />
                    <span>Ocultar</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3" />
                    <span>Mostrar</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                ref={pinInputRef}
                id="member-pin-input"
                type={showPin ? 'text' : 'password'}
                maxLength={4}
                value={pin}
                onChange={(e) => handlePinChange(e.target.value)}
                placeholder="Ex: 1234"
                className="w-full bg-[#090D16] border border-slate-700/80 rounded-xl pl-10 pr-12 py-2.5 text-base font-mono tracking-widest text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors"
                disabled={isLoading}
                inputMode="numeric"
                pattern="[0-9]*"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <span className="text-[11px] font-mono font-semibold text-indigo-400">
                  {pin.length}/4
                </span>
              </div>
            </div>

            {/* Visual 4-Digit Boxes */}
            <div className="grid grid-cols-4 gap-2 mt-2.5">
              {[0, 1, 2, 3].map((index) => {
                const filled = pin.length > index;
                const digit = pin[index];
                return (
                  <div
                    key={index}
                    className={`h-10 rounded-lg border flex items-center justify-center font-mono text-sm font-bold transition-all ${
                      filled
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300 shadow-xs shadow-indigo-500/20'
                        : 'border-slate-800 bg-[#090D16] text-slate-600'
                    }`}
                  >
                    {filled ? (showPin ? digit : '●') : '-'}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-indigo-200" />
                  <span>
                    {mode === 'register'
                      ? 'Concluir Cadastro e Acessar'
                      : 'Confirmar Senha e Entrar'}
                  </span>
                  <ArrowRight className="w-4 h-4 text-indigo-200" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer info */}
        <div className="pt-3 border-t border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-500">
            Sua senha garante que ninguém envie farms falsos usando seu passaporte.
          </p>
        </div>
      </div>
    </div>
  );
};
