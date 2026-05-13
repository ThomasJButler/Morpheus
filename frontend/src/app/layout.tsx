import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { GeistSans } from 'geist/font/sans'
import './globals.css'
import '@/styles/matrix.css'
import { WithErrorBoundary } from '@/components/ErrorBoundary'

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
      className={`dark ${GeistSans.variable}`}
      data-accent="green"
      data-density="comfortable"
    >
      <body className={`${inter.className} antialiased`}>
        <div className="min-h-screen bg-matrix-black">
          {/* Matrix grid background pattern */}
          <div className="fixed inset-0 pointer-events-none">
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
      </body>
    </html>
  )
}