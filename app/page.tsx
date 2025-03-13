'use client';

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import Image from "next/image"
import TokenCursor from "@/components/cursor-animation"
import { useState, useEffect } from "react"
import { useTheme } from "next-themes"

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const { resolvedTheme } = useTheme();

  // Only enable the animation after component mounts to avoid hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <main className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center p-4 md:p-24">
      {isMounted && (
        <TokenCursor 
          tokenImages={['/tokens/eth.svg', '/tokens/usdc.svg', '/tokens/usdt.svg', '/tokens/arb.svg']}
          tokenSize={28}
          colors={['#6622CC', '#A755C2']}
          particleLifespan={100}
          particleSpeed={2}
        />
      )}
      
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl"> Hello 👋 </CardTitle>
          <CardDescription> Welcome to our commerce demo! </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {isMounted && (
              <Image 
                src={resolvedTheme === 'dark' ? "/poweredbybindpay.svg" : "/poweredbybindpayalt.svg"} 
                alt="Powered by bindpay" 
                width={120} 
                height={40}
              />
            )}
          </p>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button asChild className="bg-secondary">
            <Link href="/dashboard" className="flex items-center gap-2 text-foreground">
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}

