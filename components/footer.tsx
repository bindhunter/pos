import Link from "next/link"

export default function Footer() {
  return (
    <footer className="border-t mt-auto">
      <div className="flex flex-col md:flex-row items-center justify-between px-4 py-4 md:py-8">
        <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Your Company. All rights reserved.</p>
        <div className="flex gap-6 mt-4 md:mt-0">
          <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">
            Terms
          </Link>
          <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
            Privacy
          </Link>
          <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground">
            Contact
          </Link>
        </div>
      </div>
    </footer>
  )
}

