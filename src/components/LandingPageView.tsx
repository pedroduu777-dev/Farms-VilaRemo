import React from 'react';
import {
  ArrowRight,
  Sparkles,
  PackageCheck,
  Shield,
} from 'lucide-react';
import { DiscordWebhookConfig } from '../types/farm';

interface LandingPageViewProps {
  config: DiscordWebhookConfig;
  totalDeliveriesCount: number;
  onEnterPanel: () => void;
  onOpenAdminLogin?: () => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  onEnterPanel,
  onOpenAdminLogin,
}) => {
  return (
    <div className="relative min-h-screen bg-[#080C14] text-slate-100 flex flex-col justify-between selection:bg-indigo-500/30 overflow-hidden">
      {/* Atmospheric Background Glows */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 30%, rgba(99, 102, 241, 0.18) 0%, transparent 60%),
            radial-gradient(circle at 80% 80%, rgba(16, 185, 129, 0.08) 0%, transparent 50%),
            radial-gradient(circle at 20% 80%, rgba(244, 63, 94, 0.06) 0%, transparent 50%)
          `,
        }}
      />

      {/* Subtle Grid Accent */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      {/* Minimalist Top Brand Bar */}
      <header className="relative z-10 w-full px-6 py-6 max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-600/30 border border-indigo-400/40">
            <PackageCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-100 leading-tight">
              Vila Remo
            </h1>
            <p className="text-[11px] font-mono text-slate-400">
              Painel de Farm · FiveM
            </p>
          </div>
        </div>
      </header>

      {/* Center Hero: Ultra Clean, 1 Single Action Button */}
      <main className="relative z-10 max-w-3xl mx-auto px-6 py-12 flex-1 flex flex-col items-center justify-center text-center">
        {/* Subtle Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-950/60 border border-indigo-800/60 text-indigo-300 text-xs font-semibold mb-8">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Organização Vila Remo · Baú da Fac</span>
        </div>

        {/* Title */}
        <h2
          className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-100 mb-6 leading-[1.12]"
          style={{ textWrap: 'balance' }}
        >
          Entrega de Farm Vila Remo
        </h2>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed">
          Deposite as peças de armas e insumos no baú da fac (Vila Remo), anexe a foto comprovante e confirme sua entrega.
        </p>

        {/* SOMENTE 1 BOTÃO: "Entrega de Farm" */}
        <div className="w-full flex justify-center">
          <button
            type="button"
            onClick={onEnterPanel}
            className="group relative inline-flex items-center justify-center gap-3 px-8 sm:px-12 py-4 sm:py-4.5 rounded-xl text-base sm:text-lg font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-400 shadow-2xl shadow-indigo-600/40 hover:shadow-indigo-500/50 border border-indigo-400/40 transition-all duration-200 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-4 focus:ring-indigo-500/30"
          >
            <span>Entregar Farm</span>
            <ArrowRight className="w-5 h-5 text-indigo-200 group-hover:translate-x-1.5 transition-transform duration-200" />
          </button>
        </div>

        {/* Clean feature hints below */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Print com Ctrl+V instantâneo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            <span>Data e hora exata gravada</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Registro direto no Baú da Fac</span>
          </div>
        </div>
      </main>

      {/* Clean Minimalist Footer with Secret ADM Entrance */}
      <footer className="relative z-10 w-full px-6 py-6 border-t border-slate-900 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">Org Vila Remo · FiveM</span>
            <span>·</span>
            <span>Baú da Fac</span>
          </div>

          {/* Hidden/Secret ADM trigger icon */}
          <button
            type="button"
            onClick={onOpenAdminLogin}
            className="opacity-15 hover:opacity-80 transition-opacity p-1 text-slate-500 hover:text-slate-200 cursor-pointer rounded"
            title="Acesso Secreto"
            aria-label="Acesso Secreto"
          >
            <Shield className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </div>
  );
};
