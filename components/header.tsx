"use client";

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import Image from "next/image"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export default function Header() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Only run on client to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <header className="border-b">
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold p-2 ">
            {mounted ? (
              <Image 
                src={resolvedTheme === 'dark' ? "/bindpay-logo.svg" : "/bplogo.svg"} 
                alt="Powered by bindpay" 
                width={120} 
                height={50} 
                className="ml-auto" 
              />
            ) : (
              // Placeholder with same dimensions to prevent layout shift
              <div style={{ width: 120, height: 50 }} />
            )}
          </Link>
          <nav className="hidden md:flex gap-6">
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Button size="sm" asChild className="bg-secondary">
            <Link href="https://docs.bindpay.xyz" target="_blank" className="text-foreground">Documents</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}

