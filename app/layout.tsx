import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import Navbar from '@/components/Navbar'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PaperTrade — Practice Trading',
  description: 'Simulate stock and forex trading with $50,000 in virtual cash',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${inter.className} bg-slate-50 text-slate-900`}>
          <Navbar />
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
