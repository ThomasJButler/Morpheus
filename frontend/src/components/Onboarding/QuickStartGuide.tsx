'use client';

import Modal from '../UI/Modal';
import Button from '../UI/Button';

interface QuickStartGuideProps {
  isOpen: boolean;
  onDismiss: () => void;
  onOpenSettings?: () => void;
}

const STEPS: Array<{
  n: string;
  icon: string;
  title: string;
  body: string;
  meta?: string;
  tone: 'green' | 'cyan' | 'white';
}> = [
  {
    n: '1/4',
    icon: '⬇️',
    title: 'Pull the models',
    body: 'Morpheus runs on Ollama. One-time downloads, then everything is offline.',
    meta: 'ollama pull nomic-embed-text · ollama pull qwen3.5:9b',
    tone: 'green',
  },
  {
    n: '2/4',
    icon: '📄',
    title: 'Upload a document',
    body: 'PDF, TXT, MD or DOCX. It is chunked, embedded and indexed on this machine.',
    meta: 'Library lives in backend/data',
    tone: 'cyan',
  },
  {
    n: '3/4',
    icon: '💬',
    title: 'Ask questions',
    body: 'Every claim carries a [n] marker that maps to a real passage. If the documents do not contain the answer, Morpheus says so.',
    meta: 'Try: "Summarise this document"',
    tone: 'white',
  },
  {
    n: '4/4',
    icon: '🔒',
    title: 'Runs on your machine',
    body: 'Documents and the index stay in backend/data until you delete them. Nothing is sent anywhere.',
    meta: 'Proof: backend/tests/test_no_egress.py',
    tone: 'cyan',
  },
];

const TONE = {
  green: { text: 'text-matrix-green', border: 'border-matrix-green/30', bg: 'bg-matrix-green/10' },
  cyan: { text: 'text-matrix-cyan', border: 'border-matrix-cyan/30', bg: 'bg-matrix-cyan/10' },
  white: { text: 'text-matrix-white', border: 'border-matrix-white/20', bg: 'bg-matrix-white/5' },
} as const;

export default function QuickStartGuide({ isOpen, onDismiss, onOpenSettings }: QuickStartGuideProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onDismiss}
      title="Welcome to Morpheus"
      size="xl"
      icon={
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      }
      footer={
        <>
          {onOpenSettings && (
            <Button variant="secondary" onClick={onOpenSettings}>
              Open Settings
            </Button>
          )}
          <Button variant="primary" onClick={onDismiss}>
            Got it, thanks!
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-5">
          {STEPS.map((step) => {
            const tone = TONE[step.tone];
            return (
              <div key={step.n} className="group relative">
                <div className={`relative stat-card p-2 sm:p-4 h-full ${step.n === '4/4' ? tone.border : ''}`}>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="flex-shrink-0 text-center">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full ${tone.bg} border ${tone.border} flex items-center justify-center mb-0.5 sm:mb-1`}>
                        <span className="text-lg sm:text-xl">{step.icon}</span>
                      </div>
                      <div className={`inline-block px-1 sm:px-1.5 py-0.5 rounded-full ${tone.bg} border ${tone.border}`}>
                        <span className={`text-xs ${tone.text} font-mono font-bold`}>{step.n}</span>
                      </div>
                    </div>
                    <div className="flex-1 pt-0">
                      <h3 className={`text-sm sm:text-base font-mono font-bold ${tone.text} mb-0.5 sm:mb-1`}>
                        {step.title}
                      </h3>
                      <p className="text-xs text-matrix-white/70 leading-snug mb-1">
                        {step.body}
                      </p>
                      {step.meta && (
                        <div className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-matrix-black/40 border border-matrix-green/20 rounded">
                          <p className="text-xs text-matrix-green/80 font-mono break-all">
                            {step.meta}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="relative py-2 sm:py-3 mb-2 sm:mb-3">
          <div className="relative text-center border-y border-matrix-green/10 py-1.5 sm:py-2">
            <p className="matrix-quote text-xs sm:text-sm text-matrix-green/90 max-w-xl mx-auto italic px-2">
              &quot;I can only show you the door. You&apos;re the one that has to walk through it.&quot;
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
