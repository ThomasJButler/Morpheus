'use client';

import { useSettings } from '@/lib/hooks/useSettings';
import { useBackendHealth } from '@/lib/hooks/useBackendHealth';

/**
 * Right-rail bottom tab: a glanceable snapshot of the local stack plus
 * keyboard shortcuts. Read-only, no new API calls.
 */
export default function SystemTab() {
  const { settings } = useSettings();
  const health = useBackendHealth();

  const netLabel =
    health.status === 'ready' ? 'ONLINE' : health.status === 'warming' ? 'STARTING' : '—';

  return (
    <div className="flex flex-col gap-4">
      <Section title=">_ SYSTEM">
        <StatRow label="NET" value={netLabel} accent={health.status === 'ready'} />
        <StatRow label="MOD" value={settings.model ?? 'default'} accent />
        <StatRow label="RAG" value={settings.mode.toUpperCase()} accent />
        <StatRow label="DEP" value={settings.deep ? 'ON' : 'OFF'} accent={settings.deep} />
        <p className="mt-2 font-mono text-[11px] text-fg-muted leading-relaxed">
          Everything runs on this machine: LanceDB for retrieval, Ollama for
          generation. Nothing leaves it.
        </p>
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
