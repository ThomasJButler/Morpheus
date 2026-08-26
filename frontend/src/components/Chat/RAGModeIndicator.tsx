'use client';

import type { DoneInfo, RetrievalMode } from '@/lib/types';

interface RAGModeIndicatorProps {
  mode: RetrievalMode;
  deep?: boolean;
  done?: DoneInfo;
  isProcessing?: boolean;
}

const MODE_CONFIG: Record<RetrievalMode, { label: string; classes: string; description: string }> = {
  hybrid: {
    label: 'Hybrid',
    classes: 'bg-mode-amber/10 text-mode-amber border-mode-amber/30',
    description: 'Vector + BM25 keyword search, fused',
  },
  vector: {
    label: 'Vector',
    classes: 'bg-mode-cyan/10 text-mode-cyan border-mode-cyan/30',
    description: 'Semantic search only',
  },
};

/** Compact retrieval-mode badge. The old expanded variant showed confidence
 * scores and escalation paths for machinery that no longer exists. */
export default function RAGModeIndicator({
  mode,
  deep = false,
  done,
  isProcessing = false,
}: RAGModeIndicatorProps) {
  const config = MODE_CONFIG[mode];
  const title = done
    ? `${config.description}. Last answer: ${done.cited}/${done.retrieved} chunks cited.`
    : config.description;

  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded-full
        text-[10px] font-mono font-medium border transition-all duration-200
        ${config.classes}
        ${isProcessing ? 'animate-pulse' : ''}
      `}
      title={title}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden />
      <span>{config.label}{deep ? ' · Deep' : ''}</span>
      {isProcessing && <span className="ml-0.5">...</span>}
    </span>
  );
}
