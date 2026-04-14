'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Show, UserButton, SignInButton, SignUpButton } from '@clerk/nextjs'

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/trade',     label: 'Trade' },
  { href: '/history',  label: 'History' },
]

export default function Navbar() {
  const pathname = usePathname()

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-bold text-teal-600">PaperTrade</span>
        </Link>

        {/* Nav links — signed-in only */}
        <Show when="signed-in">
          <div className="hidden items-center gap-6 md:flex">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'text-teal-600'
                    : 'text-slate-600 hover:text-teal-600'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </Show>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <Show when="signed-out">
            <SignInButton mode="redirect">
              <button className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                Log In
              </button>
            </SignInButton>
            <SignUpButton mode="redirect">
              <button className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors">
                Sign Up
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <UserButton afterSignOutUrl="/" />
          </Show>
        </div>
      </div>
    </nav>
  )
}
