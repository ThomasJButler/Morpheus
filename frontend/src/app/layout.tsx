import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { GeistSans } from 'geist/font/sans'
import './globals.css'
import '@/styles/matrix.css'
import { WithErrorBoundary } from '@/components/ErrorBoundary'
import { REDESIGN_V2 } from '@/lib/flags'
import { ThemeProvider, themeBootstrapScript } from '@/lib/theme'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Morpheus - Agentic RAG System',
  description: 'Just like Morpheus revealed the truth about The Matrix, this AI reveals knowledge from your documents.',
  keywords: 'RAG, AI, Retrieval Augmented Generation, Claude, Pinecone, Matrix',
  authors: [{ name: 'Morpheus Team' }],
  openGraph: {
    title: 'Morpheus - Agentic RAG System',
    description: 'AI-powered document intelligence with Matrix-inspired interface',
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
      <body className={`${inter.className} antialiased`}>
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