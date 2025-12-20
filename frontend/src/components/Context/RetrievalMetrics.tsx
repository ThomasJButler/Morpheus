import { MetricResult } from '@/lib/types';
import GlassPanel from '../UI/GlassPanel';

interface RetrievalMetricsProps {
  metrics: MetricResult;
}

export default function RetrievalMetrics({ metrics }: RetrievalMetricsProps) {
  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatMode = (mode: string) => {
    return mode.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <GlassPanel className="p-4 h-full">
      <h3 className="text-sm font-mono text-matrix-green mb-4">
        Retrieval Metrics
      </h3>

      <div className="space-y-4">
        {/* Mode */}
        <div>
          <div className="text-xs text-matrix-white/60 mb-1">Mode</div>
          <div className="text-sm font-mono text-matrix-cyan">
            {formatMode(metrics.mode)}
          </div>
        </div>

        {/* Relevance Score */}
        <div>
          <div className="text-xs text-matrix-white/60 mb-1">Relevance Score</div>
          <div className="flex items-center space-x-2">
            <div className="flex-1 h-2 bg-glass-bg rounded-full overflow-hidden">
              <div
                className="h-full bg-matrix-green transition-all duration-400"
                style={{ width: `${metrics.relevance_score * 100}%` }}
              />
            </div>
            <span className="text-sm font-mono text-matrix-green">
              {(metrics.relevance_score * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Confidence */}
        <div>
          <div className="text-xs text-matrix-white/60 mb-1">Confidence</div>
          <div className="flex items-center space-x-2">
            <div className="flex-1 h-2 bg-glass-bg rounded-full overflow-hidden">
              <div
                className="h-full bg-matrix-cyan transition-all duration-400"
                style={{ width: `${metrics.confidence * 100}%` }}
              />
            </div>
            <span className="text-sm font-mono text-matrix-cyan">
              {(metrics.confidence * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Response Time */}
        <div>
          <div className="text-xs text-matrix-white/60 mb-1">Response Time</div>
          <div className="text-sm font-mono text-matrix-white">
            {formatTime(metrics.response_time)}
          </div>
        </div>

        {/* Citations Count */}
        <div>
          <div className="text-xs text-matrix-white/60 mb-1">Citations</div>
          <div className="text-sm font-mono text-matrix-white">
            {metrics.citations_count} source{metrics.citations_count !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Tokens Used */}
        <div>
          <div className="text-xs text-matrix-white/60 mb-1">Tokens Used</div>
          <div className="text-sm font-mono text-matrix-white">
            {metrics.tokens_used.toLocaleString()}
          </div>
        </div>

        {/* Performance Indicator */}
        <div className="mt-4 pt-4 border-t border-glass-border">
          <div className="text-xs text-matrix-white/60 mb-2">Performance</div>
          <div className="grid grid-cols-3 gap-2">
            <PerformanceIndicator
              label="Speed"
              value={metrics.response_time < 2000 ? 'Fast' : metrics.response_time < 4000 ? 'Medium' : 'Slow'}
              color={metrics.response_time < 2000 ? 'green' : metrics.response_time < 4000 ? 'cyan' : 'red'}
            />
            <PerformanceIndicator
              label="Quality"
              value={metrics.relevance_score > 0.8 ? 'High' : metrics.relevance_score > 0.6 ? 'Good' : 'Low'}
              color={metrics.relevance_score > 0.8 ? 'green' : metrics.relevance_score > 0.6 ? 'cyan' : 'red'}
            />
            <PerformanceIndicator
              label="Cost"
              value={metrics.tokens_used < 1000 ? 'Low' : metrics.tokens_used < 3000 ? 'Medium' : 'High'}
              color={metrics.tokens_used < 1000 ? 'green' : metrics.tokens_used < 3000 ? 'cyan' : 'red'}
            />
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}

function PerformanceIndicator({
  label,
  value,
  color
}: {
  label: string;
  value: string;
  color: 'green' | 'cyan' | 'red';
}) {
  const colorClasses = {
    green: 'text-matrix-green',
    cyan: 'text-matrix-cyan',
    red: 'text-red-400',
  };

  return (
    <div className="text-center">
      <div className="text-xs text-matrix-white/40">{label}</div>
      <div className={`text-xs font-mono ${colorClasses[color]}`}>
        {value}
      </div>
    </div>
  );
}