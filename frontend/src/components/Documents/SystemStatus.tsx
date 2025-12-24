'use client';

import { useSettings } from '@/lib/hooks/useSettings';
import GlassPanel from '../UI/GlassPanel';

interface SystemStatusProps {
  isConnected?: boolean;
}

export default function SystemStatus({ isConnected = true }: SystemStatusProps) {
  const { settings } = useSettings();

  // Get RAG mode display info
  const getModeInfo = (mode: string) => {
    switch (mode) {
      case 'simple':
        return { label: 'SIMPLE', desc: 'Fast semantic search' };
      case 'hybrid':
        return { label: 'HYBRID', desc: 'Dense + sparse fusion' };
      case 'agentic':
        return { label: 'AGENTIC', desc: 'Multi-step reasoning' };
      case 'auto':
      default:
        return { label: 'AUTO', desc: 'Intelligent routing' };
    }
  };

  const modeInfo = getModeInfo(settings.ragMode);

  return (
    <GlassPanel className="p-3 flex-grow">
      {/* Retro Terminal Header */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-matrix-green/20">
        <span className="text-matrix-green font-mono text-xs">&gt;_</span>
        <span className="text-matrix-white/80 font-mono text-xs uppercase tracking-wider">
          SYSTEM
        </span>
        <span className={`ml-auto w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-matrix-green animate-pulse' : 'bg-red-500'}`} />
      </div>

      {/* System Info - Compact Terminal Style */}
      <div className="space-y-2 font-mono text-xs">
        {/* Connection Status */}
        <div className="flex justify-between items-center">
          <span className="text-matrix-white/50">[NET]</span>
          <span className={isConnected ? 'text-matrix-green' : 'text-red-400'}>
            {isConnected ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>

        {/* Provider */}
        <div className="flex justify-between items-center">
          <span className="text-matrix-white/50">[LLM]</span>
          <span className="text-matrix-cyan uppercase">
            {settings.provider === 'anthropic' ? 'CLAUDE' : 'GPT'}
          </span>
        </div>

        {/* RAG Mode */}
        <div className="flex justify-between items-center">
          <span className="text-matrix-white/50">[RAG]</span>
          <span className="text-matrix-green">{modeInfo.label}</span>
        </div>

        {/* Deep Mode */}
        <div className="flex justify-between items-center">
          <span className="text-matrix-white/50">[DEP]</span>
          <span className={settings.deepMode ? 'text-matrix-cyan' : 'text-matrix-white/40'}>
            {settings.deepMode ? 'ON' : 'OFF'}
          </span>
        </div>
      </div>

      {/* Mode Description */}
      <div className="mt-3 pt-2 border-t border-matrix-green/10">
        <p className="text-[10px] text-matrix-white/30 font-mono leading-relaxed">
          {modeInfo.desc}
        </p>
      </div>
    </GlassPanel>
  );
}
