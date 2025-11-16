import { Citation } from '@/lib/types';
import GlassPanel from '../UI/GlassPanel';

interface CitationHighlightProps {
  citation: Citation;
  index: number;
}

export default function CitationHighlight({ citation, index }: CitationHighlightProps) {
  const relevancePercentage = Math.round(citation.relevance_score * 100);

  // Determine color based on relevance score
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
            [{index}]
          </span>
          <span className="text-xs text-matrix-white/60">
            {citation.source}
            {citation.page && ` • Page ${citation.page}`}
          </span>
        </div>
        <span className={`text-xs font-mono ${getRelevanceColor(citation.relevance_score)}`}>
          {relevancePercentage}% match
        </span>
      </div>

      <div className="text-xs text-matrix-white/80 leading-relaxed">
        {citation.text.length > 200
          ? `${citation.text.substring(0, 200)}...`
          : citation.text}
      </div>

      {citation.metadata && Object.keys(citation.metadata).length > 0 && (
        <div className="mt-2 pt-2 border-t border-glass-border">
          <div className="flex flex-wrap gap-2">
            {Object.entries(citation.metadata).map(([key, value]) => (
              <span key={key} className="text-xs text-matrix-white/40">
                {key}: {String(value)}
              </span>
            ))}
          </div>
        </div>
      )}
    </GlassPanel>
  );
}