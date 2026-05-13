'use client';

import { useState } from 'react';
import { useSettings } from '@/lib/hooks/useSettings';
import { useSession } from '@/lib/hooks/useSession';
import { useBackendHealth } from '@/lib/hooks/useBackendHealth';
import type { RAGMode } from '@/lib/types';

interface SystemTabProps {
  modeUsed?: RAGMode;
}

/**
 * Right-rail bottom tab: snapshot of the running stack + keyboard shortcuts.
 * All data is read-only from existing hooks — no new API calls. Designed to
 * be glanceable while the user is configuring or chatting.
 */
export default function SystemTab({ modeUsed }: SystemTabProps) {
  const { settings } = useSettings();
  const { sessionId } = useSession();
  const health = useBackendHealth();
  const [copied, setCopied] = useState(false);

  const netLabel = health.status === 'ready' ? 'ONLINE' : health.status === 'warming' ? 'WARMING' : '—';
  const llmLabel = settings.provider === 'anthropic' ? 'CLAUDE' : 'OPENAI';
  const ragLabel = (modeUsed ?? settings.ragMode ?? 'auto').toUpperCase();
  const depLabel = settings.deepMode ? 'ON' : 'OFF';
  const sessionShort = sessionId ? `${sessionId.slice(0, 8)}…` : '—';

  const copySession = async () => {
    if (!sessionId) return;
    try {
      await navigator.clipboard.writeText(sessionId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable (e.g. http context). Silently fail.
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Section title=">_ SYSTEM">
        <StatRow label="NET" value={netLabel} accent={health.status === 'ready'} />
        <StatRow label="LLM" value={llmLabel} accent />
        <StatRow label="RAG" value={ragLabel} accent />
        <StatRow label="DEP" value={depLabel} accent={settings.deepMode} />
        <p className="mt-2 font-mono text-[11px] text-fg-muted leading-relaxed">
          Intelligent routing engaged. The system analyses query complexity and
          routes to the optimal retrieval mode.
        </p>
      </Section>

      <Section title=">_ SESSION">
        <div className="flex items-center justify-between font-mono text-[11px]">
          <span className="text-fg-muted">[ID]</span>
          <button
            type="button"
            onClick={copySession}
            disabled={!sessionId}
            title={sessionId ? 'Copy session ID' : 'No session yet'}
            className="inline-flex items-center gap-1.5 text-fg-secondary hover:text-fg-primary disabled:opacity-40 disabled:hover:text-fg-secondary transition-colors"
          >
            <span className="tabular-nums">{sessionShort}</span>
            <span className="text-fg-faint">{copied ? '✓' : '⧉'}</span>
          </button>
        </div>
        <StatRow
          label="MOD"
          value={
            settings.provider === 'anthropic'
              ? settings.anthropicModel?.split('-').slice(-2).join('-') || '—'
              : settings.openaiModel || '—'
          }
        />
      </Section>

      <Section title=">_ SHORTCUTS">
        <ShortcutRow keys={['⌘', 'K']} label="Focus composer" />
        <ShortcutRow keys={['⌘', 'S']} label="Save transcript" />
        <ShortcutRow keys={['⏎']} label="Send" />
        <ShortcutRow keys={['⇧', '⏎']} label="New line" />
        <ShortcutRow keys={['Esc']} label="Close dialog" />
      </Section>
    </div>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <section>
      <header className="mb-2">
        <span className="font-mono text-[11px] tracking-[0.15em] text-fg-secondary">
          {title}
        </span>
      </header>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

interface StatRowProps {
  label: string;
  value: string | number;
  accent?: boolean;
}

function StatRow({ label, value, accent }: StatRowProps) {
  return (
    <div className="flex items-center justify-between font-mono text-[11px]">
      <span className="text-fg-muted">[{label}]</span>
      <span className={`tabular-nums ${accent ? 'text-accent' : 'text-fg-secondary'}`}>
        {value}
      </span>
    </div>
  );
}

interface ShortcutRowProps {
  keys: string[];
  label: string;
}

function ShortcutRow({ keys, label }: ShortcutRowProps) {
  return (
    <div className="flex items-center gap-2 font-mono text-[11px]">
      <span className="inline-flex items-center gap-1">
        {keys.map((k, i) => (
          <kbd
            key={i}
            className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded border border-edge-subtle bg-surface-card text-fg-secondary text-[10px]"
          >
            {k}
          </kbd>
        ))}
      </span>
      <span className="text-fg-muted">{label}</span>
    </div>
  );
}
