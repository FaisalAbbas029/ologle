import React from 'react';
import { Compass, Home, Search, BookOpen, Shield, ArrowRight } from 'lucide-react';
import { AppView } from '../types/index.ts';

interface NotFoundViewProps {
  onNavigate: (view: AppView) => void;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({ onNavigate }) => {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="max-w-xl w-full text-center space-y-6">
        {/* Animated Icon badge */}
        <div className="relative inline-block">
          <div className="w-20 h-20 rounded-2xl bg-[#EC5E27]/15 border border-[#EC5E27]/30 flex items-center justify-center text-[#EC5E27] mx-auto shadow-[0_0_30px_rgba(236,94,39,0.35)]">
            <Compass className="w-10 h-10 animate-spin-slow" />
          </div>
          <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-mono font-bold">
            404 ERROR
          </span>
        </div>

        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Signal Lost in Transmission
          </h1>
          <p className="text-sm sm:text-base text-neutral-400 mt-2 max-w-md mx-auto leading-relaxed">
            The requested peer coordinates or view does not exist on this node. You can reconnect to the network using the shortcuts below.
          </p>
        </div>

        {/* Quick Links Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-2">
          <button
            type="button"
            onClick={() => onNavigate('landing')}
            className="p-4 rounded-xl bg-[#141414] border border-white/10 hover:border-[#EC5E27]/50 hover:bg-[#1A1A1A] transition-all flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#EC5E27]/15 text-[#EC5E27]">
                <Home className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Home Terminal</span>
                <span className="text-[10px] text-neutral-400">Return to landing view</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-[#EC5E27] transition-colors" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('mode_select')}
            className="p-4 rounded-xl bg-[#141414] border border-white/10 hover:border-[#EC5E27]/50 hover:bg-[#1A1A1A] transition-all flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
                <Search className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Explore Lounges</span>
                <span className="text-[10px] text-neutral-400">Browse rooms & modes</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-[#EC5E27] transition-colors" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('community_rules')}
            className="p-4 rounded-xl bg-[#141414] border border-white/10 hover:border-[#EC5E27]/50 hover:bg-[#1A1A1A] transition-all flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Community Rules</span>
                <span className="text-[10px] text-neutral-400">Safety standards & guidelines</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-[#EC5E27] transition-colors" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('privacy_page')}
            className="p-4 rounded-xl bg-[#141414] border border-white/10 hover:border-[#EC5E27]/50 hover:bg-[#1A1A1A] transition-all flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#EC5E27]/15 text-[#EC5E27]">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Privacy Audit</span>
                <span className="text-[10px] text-neutral-400">Zero data retention audit</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-[#EC5E27] transition-colors" />
          </button>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => onNavigate('landing')}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#EC5E27] to-[#FF5500] hover:from-[#D94E1A] hover:to-[#EC5E27] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg hover:shadow-[0_0_20px_rgba(236,94,39,0.35)] cursor-pointer"
          >
            Return to Discovery Home
          </button>
        </div>
      </div>
    </div>
  );
};
