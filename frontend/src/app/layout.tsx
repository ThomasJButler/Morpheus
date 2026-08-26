import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import './globals.css'
import '@/styles/matrix.css'
import { WithErrorBoundary } from '@/components/ErrorBoundary'
import { REDESIGN_V2 } from '@/lib/flags'
import { ThemeProvider, themeBootstrapScript } from '@/lib/theme'

export const metadata: Metadata = {
  title: 'Morpheus',
  description:
    'Local document question answering with verified citations. Runs entirely on your machine: Ollama for the models, LanceDB for the index.',
  keywords: 'RAG, local AI, Ollama, LanceDB, document Q&A, citations',
  authors: [{ name: 'Tom Butler' }],
  openGraph: {
    title: 'Morpheus',
    description: 'Local document question answering with verified citations.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable}${REDESIGN_V2 ? ' redesign-v2' : ''}`}
      data-accent="green"
      data-density="comfortable"
      suppressHydrationWarning
    >
      <head>
        {/* Pre-hydration: stamp light/dark class on <html> from storage/OS
            pref so first paint matches the saved theme (no FOUC). */}
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <div className="min-h-screen bg-matrix-black">
            {/* Matrix grid background pattern — dark-theme only */}
            <div className="fixed inset-0 pointer-events-none hidden dark:block">
              <div
                className="absolute inset-0 opacity-5"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(0, 255, 0, 0.1) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(0, 255, 0, 0.1) 1px, transparent 1px)
                  `,
                  backgroundSize: '50px 50px',
                }}
              />
            </div>

            {/* Main content wrapped in error boundary */}
            <WithErrorBoundary>
              <main className="relative z-10">
                {children}
              </main>
            </WithErrorBoundary>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
