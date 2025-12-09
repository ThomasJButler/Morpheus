'use client';

import GlassPanel from '../UI/GlassPanel';
import Button from '../UI/Button';

interface QuickStartGuideProps {
  onDismiss: () => void;
  onOpenSettings?: () => void;
}

export default function QuickStartGuide({ onDismiss, onOpenSettings }: QuickStartGuideProps) {
  return (
    <div className="animate-fade-in">
      <GlassPanel className="max-w-4xl mx-auto overflow-hidden">
        {/* Header with gradient */}
        <div className="relative px-8 pt-8 pb-6 border-b border-matrix-green/20">
          <div className="absolute inset-0 bg-gradient-to-b from-matrix-green/5 to-transparent pointer-events-none" />
          <div className="relative text-center">
            <h2 className="text-3xl font-mono font-bold text-matrix-green mb-3" style={{ textShadow: '0 0 30px rgba(0, 255, 0, 0.4)' }}>
              Welcome to Morpheus
            </h2>
            <p className="text-matrix-white/60 text-base font-mono">
              Your AI-powered document intelligence system
            </p>
          </div>
        </div>

        {/* Steps Grid */}
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
            {/* Step 1: Add API Key */}
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-matrix-green/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur" />
              <div className="relative stat-card p-5 h-full">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 text-center">
                    <div className="w-16 h-16 rounded-full bg-matrix-green/10 border-2 border-matrix-green/30 flex items-center justify-center mb-2 group-hover:border-matrix-green/50 group-hover:bg-matrix-green/20 transition-all duration-300">
                      <span className="text-3xl">⚙️</span>
                    </div>
                    <div className="inline-block px-2 py-0.5 rounded-full bg-matrix-green/10 border border-matrix-green/30">
                      <span className="text-xs text-matrix-green font-mono font-bold">1/4</span>
                    </div>
                  </div>
                  <div className="flex-1 pt-1">
                    <h3 className="text-xl font-mono font-bold text-matrix-green mb-3" style={{ textShadow: '0 0 10px rgba(0, 255, 0, 0.2)' }}>
                      Add Your API Key
                    </h3>
                    <p className="text-sm text-matrix-white/70 leading-relaxed mb-4">
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
              <div className="absolute -inset-0.5 bg-gradient-to-r from-matrix-cyan/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur" />
              <div className="relative stat-card p-5 h-full">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 text-center">
                    <div className="w-16 h-16 rounded-full bg-matrix-cyan/10 border-2 border-matrix-cyan/30 flex items-center justify-center mb-2 group-hover:border-matrix-cyan/50 group-hover:bg-matrix-cyan/20 transition-all duration-300">
                      <span className="text-3xl">📄</span>
                    </div>
                    <div className="inline-block px-2 py-0.5 rounded-full bg-matrix-cyan/10 border border-matrix-cyan/30">
                      <span className="text-xs text-matrix-cyan font-mono font-bold">2/4</span>
                    </div>
                  </div>
                  <div className="flex-1 pt-1">
                    <h3 className="text-xl font-mono font-bold text-matrix-cyan mb-3" style={{ textShadow: '0 0 10px rgba(0, 255, 255, 0.2)' }}>
                      Upload a Document
                    </h3>
                    <p className="text-sm text-matrix-white/70 leading-relaxed">
                      Click the Upload button to add documents you want to analyse
                    </p>
                    <p className="text-xs text-matrix-cyan/50 font-mono mt-2">
                      Supports: PDF, TXT, MD, DOCX
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Ask Questions */}
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-matrix-white/10 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur" />
              <div className="relative stat-card p-5 h-full">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 text-center">
                    <div className="w-16 h-16 rounded-full bg-matrix-white/5 border-2 border-matrix-white/20 flex items-center justify-center mb-2 group-hover:border-matrix-white/30 group-hover:bg-matrix-white/10 transition-all duration-300">
                      <span className="text-3xl">💬</span>
                    </div>
                    <div className="inline-block px-2 py-0.5 rounded-full bg-matrix-white/5 border border-matrix-white/20">
                      <span className="text-xs text-matrix-white/70 font-mono font-bold">3/4</span>
                    </div>
                  </div>
                  <div className="flex-1 pt-1">
                    <h3 className="text-xl font-mono font-bold text-matrix-white mb-3">
                      Ask Questions
                    </h3>
                    <p className="text-sm text-matrix-white/70 leading-relaxed mb-3">
                      Type questions about your documents in the chat below
                    </p>
                    <div className="px-3 py-2 bg-matrix-black/40 border border-matrix-green/20 rounded">
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
              <div className="absolute -inset-0.5 bg-gradient-to-r from-matrix-cyan/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur" />
              <div className="relative stat-card p-5 h-full border-matrix-cyan/40">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 text-center">
                    <div className="w-16 h-16 rounded-full bg-matrix-cyan/10 border-2 border-matrix-cyan/30 flex items-center justify-center mb-2 group-hover:border-matrix-cyan/50 group-hover:bg-matrix-cyan/20 transition-all duration-300">
                      <span className="text-3xl">🔒</span>
                    </div>
                    <div className="inline-block px-2 py-0.5 rounded-full bg-matrix-cyan/10 border border-matrix-cyan/30">
                      <span className="text-xs text-matrix-cyan font-mono font-bold">4/4</span>
                    </div>
                  </div>
                  <div className="flex-1 pt-1">
                    <h3 className="text-xl font-mono font-bold text-matrix-cyan mb-3" style={{ textShadow: '0 0 10px rgba(0, 255, 255, 0.2)' }}>
                      Complete Privacy
                    </h3>
                    <p className="text-sm text-matrix-white/70 leading-relaxed mb-3">
                      Your documents and embeddings are automatically cleared when you start a new browser session
                    </p>
                    <div className="px-3 py-2 bg-matrix-cyan/5 border border-matrix-cyan/20 rounded">
                      <p className="text-xs text-matrix-cyan/70 font-mono">
                        🛡️ Temporary storage on Pinecone - complete privacy guaranteed
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Morpheus Quote */}
          <div className="relative py-6 mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-matrix-green/5 to-transparent pointer-events-none" />
            <div className="relative text-center border-y border-matrix-green/10 py-4">
              <p className="matrix-quote text-lg text-matrix-green/90 max-w-2xl mx-auto italic" style={{ textShadow: '0 0 15px rgba(0, 255, 0, 0.2)' }}>
                &quot;I can only show you the door. You&apos;re the one that has to walk through it.&quot;
              </p>
            </div>
          </div>

          {/* Dismiss Button */}
          <div className="flex justify-center">
            <Button
              variant="primary"
              onClick={onDismiss}
              className="px-10 py-3 text-base font-bold"
            >
              Got it, thanks!
            </Button>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}
