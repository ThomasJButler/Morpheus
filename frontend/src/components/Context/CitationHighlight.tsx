import type { Citation } from '@/lib/types';
import GlassPanel from '../UI/GlassPanel';

interface CitationHighlightProps {
  citation: Citation;
}

export default function CitationHighlight({ citation }: CitationHighlightProps) {
  const relevancePercentage = Math.round((citation.score ?? 0) * 100);

  const getRelevanceColor = (score: number) => {
    if (score >= 0.8) return 'text-matrix-green';
    if (score >= 0.6) return 'text-matrix-cyan';
    return 'text-matrix-white/60';
  };

  return (
    <GlassPanel variant="subtle" className="p-3">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono text-matrix-green">
            [{citation.index}]
          </span>
          <span className="text-xs text-matrix-white/60">
            {citation.source}
            {citation.page != null && ` · Page ${citation.page}`}
          </span>
        </div>
        <span
          className={`text-xs font-mono ${getRelevanceColor(citation.score ?? 0)}`}
          title="Relevance relative to the top retrieved chunk"
        >
          {relevancePercentage}%
        </span>
      </div>

      <div className="text-xs text-matrix-white/80 leading-relaxed">
        {citation.text_preview}
      </div>
    </GlassPanel>
  );
}
