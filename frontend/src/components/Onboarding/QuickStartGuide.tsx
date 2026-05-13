'use client';

import Modal from '../UI/Modal';
import Button from '../UI/Button';

interface QuickStartGuideProps {
  isOpen: boolean;
  onDismiss: () => void;
  onOpenSettings?: () => void;
}

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
        <Button variant="primary" onClick={onDismiss}>
          Got it, thanks!
        </Button>
      }
    >
      <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-5">
            {/* Step 1: Add API Key */}
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-matrix-green/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-250 blur" />
              <div className="relative stat-card p-2 sm:p-4 h-full">
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="flex-shrink-0 text-center">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-matrix-green/10 border border-matrix-green/30 flex items-center justify-center mb-0.5 sm:mb-1 group-hover:border-matrix-green/50 group-hover:bg-matrix-green/20 transition-all duration-250">
                      <span className="text-lg sm:text-xl">⚙️</span>
                    </div>
                    <div className="inline-block px-1 sm:px-1.5 py-0.5 rounded-full bg-matrix-green/10 border border-matrix-green/30">
                      <span className="text-xs text-matrix-green font-mono font-bold">1/4</span>
                    </div>
                  </div>
                  <div className="flex-1 pt-0">
                    <h3 className="text-sm sm:text-base font-mono font-bold text-matrix-green mb-0.5 sm:mb-1" style={{ textShadow: '0 0 10px rgba(0, 255, 0, 0.2)' }}>
                      Add Your API Key
                    </h3>
                    <p className="text-xs text-matrix-white/70 leading-snug mb-1.5 sm:mb-2">
                      Open Settings and add your Claude or GPT API key to get started
                    </p>
                    {onOpenSettings && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={onOpenSettings}
                        className="text-xs font-mono"
                      >
                        Open Settings
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Upload Document */}
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-matrix-cyan/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-250 blur" />
              <div className="relative stat-card p-2 sm:p-4 h-full">
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="flex-shrink-0 text-center">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-matrix-cyan/10 border border-matrix-cyan/30 flex items-center justify-center mb-0.5 sm:mb-1 group-hover:border-matrix-cyan/50 group-hover:bg-matrix-cyan/20 transition-all duration-250">
                      <span className="text-lg sm:text-xl">📄</span>
                    </div>
                    <div className="inline-block px-1 sm:px-1.5 py-0.5 rounded-full bg-matrix-cyan/10 border border-matrix-cyan/30">
                      <span className="text-xs text-matrix-cyan font-mono font-bold">2/4</span>
                    </div>
                  </div>
                  <div className="flex-1 pt-0">
                    <h3 className="text-sm sm:text-base font-mono font-bold text-matrix-cyan mb-0.5 sm:mb-1" style={{ textShadow: '0 0 10px rgba(0, 255, 255, 0.2)' }}>
                      Upload a Document
                    </h3>
                    <p className="text-xs text-matrix-white/70 leading-snug mb-0.5">
                      Click the Upload button to add documents you want to analyse
                    </p>
                    <p className="text-xs text-matrix-cyan/50 font-mono mt-0.5">
                      Supports: PDF, TXT, MD, DOCX
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Ask Questions */}
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-matrix-white/10 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-250 blur" />
              <div className="relative stat-card p-2 sm:p-4 h-full">
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="flex-shrink-0 text-center">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-matrix-white/5 border border-matrix-white/20 flex items-center justify-center mb-0.5 sm:mb-1 group-hover:border-matrix-white/30 group-hover:bg-matrix-white/10 transition-all duration-250">
                      <span className="text-lg sm:text-xl">💬</span>
                    </div>
                    <div className="inline-block px-1 sm:px-1.5 py-0.5 rounded-full bg-matrix-white/5 border border-matrix-white/20">
                      <span className="text-xs text-matrix-white/70 font-mono font-bold">3/4</span>
                    </div>
                  </div>
                  <div className="flex-1 pt-0">
                    <h3 className="text-sm sm:text-base font-mono font-bold text-matrix-white mb-0.5 sm:mb-1">
                      Ask Questions
                    </h3>
                    <p className="text-xs text-matrix-white/70 leading-snug mb-1 sm:mb-2">
                      Type questions about your documents in the chat below
                    </p>
                    <div className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-matrix-black/40 border border-matrix-green/20 rounded">
                      <p className="text-xs text-matrix-green/80 font-mono italic">
                        Try: &quot;Summarise this document&quot;
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4: Privacy Note */}
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-matrix-cyan/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-250 blur" />
              <div className="relative stat-card p-2 sm:p-4 h-full border-matrix-cyan/40">
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="flex-shrink-0 text-center">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-matrix-cyan/10 border border-matrix-cyan/30 flex items-center justify-center mb-0.5 sm:mb-1 group-hover:border-matrix-cyan/50 group-hover:bg-matrix-cyan/20 transition-all duration-250">
                      <span className="text-lg sm:text-xl">🔒</span>
                    </div>
                    <div className="inline-block px-1 sm:px-1.5 py-0.5 rounded-full bg-matrix-cyan/10 border border-matrix-cyan/30">
                      <span className="text-xs text-matrix-cyan font-mono font-bold">4/4</span>
                    </div>
                  </div>
                  <div className="flex-1 pt-0">
                    <h3 className="text-sm sm:text-base font-mono font-bold text-matrix-cyan mb-0.5 sm:mb-1" style={{ textShadow: '0 0 10px rgba(0, 255, 255, 0.2)' }}>
                      Complete Privacy
                    </h3>
                    <p className="text-xs text-matrix-white/70 leading-snug mb-1">
                      Documents cleared when you start a new browser session
                    </p>
                    <div className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-matrix-cyan/5 border border-matrix-cyan/20 rounded">
                      <p className="text-xs text-matrix-cyan/70 font-mono">
                        🛡️ Temporary storage - complete privacy
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Morpheus Quote */}
          <div className="relative py-2 sm:py-3 mb-2 sm:mb-3">
            <div className="relative text-center border-y border-matrix-green/10 py-1.5 sm:py-2">
              <p className="matrix-quote text-xs sm:text-sm text-matrix-green/90 max-w-xl mx-auto italic px-2" style={{ textShadow: '0 0 15px rgba(0, 255, 0, 0.2)' }}>
                &quot;I can only show you the door. You&apos;re the one that has to walk through it.&quot;
              </p>
            </div>
          </div>

      </div>
    </Modal>
  );
}
