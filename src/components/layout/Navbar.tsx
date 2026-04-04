import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Mic2 } from 'lucide-react';

export function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-white/5">
      <div className="flex justify-between items-center w-full px-8 py-4 max-w-7xl mx-auto">
        <Link href="/" className="text-xl font-bold tracking-tight flex items-center gap-2">
          <Mic2 className="text-primary w-6 h-6" />
          <span className="font-headline">MediVoice</span>
        </Link>
        <div className="hidden md:flex items-center gap-8 font-medium tracking-wide">
          <Link href="/" className="text-primary border-b-2 border-primary pb-1">Home</Link>
          <Link href="/dashboard" className="text-foreground/70 hover:text-primary transition-colors">Dashboard</Link>
          <Link href="/triage" className="text-foreground/70 hover:text-primary transition-colors">Triage</Link>
          <Link href="/about" className="text-foreground/70 hover:text-primary transition-colors">About</Link>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">Sign In</Link>
          <Button asChild className="bg-gradient-to-br from-primary to-secondary text-primary-foreground rounded-full font-bold shadow-lg shadow-primary/10">
            <Link href="/triage">Try Demo</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}
