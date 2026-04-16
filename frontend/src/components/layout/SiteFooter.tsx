import Link from 'next/link';
import { Heart, Mic2 } from 'lucide-react';

export function SiteFooter() {
  return (
    <footer className="w-full border-t border-white/5 py-16 px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="space-y-6">
          <div className="text-lg font-bold text-foreground font-headline flex items-center gap-2">
            <Mic2 className="text-primary w-6 h-6" />
            MediVoice
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Revolutionizing healthcare access through high-precision voice AI, built for the diverse linguistic landscape of modern India.
          </p>
        </div>
        <div className="space-y-6">
          <div className="text-xs font-mono uppercase tracking-widest text-primary">Product</div>
          <ul className="space-y-4 font-medium">
            <li><Link href="/" className="text-muted-foreground hover:text-primary transition-colors text-sm">Home</Link></li>
            <li><Link href="/features" className="text-muted-foreground hover:text-primary transition-colors text-sm">Features</Link></li>
            <li><Link href="/triage" className="text-muted-foreground hover:text-primary transition-colors text-sm">Triage</Link></li>
            <li><Link href="/dashboard" className="text-muted-foreground hover:text-primary transition-colors text-sm">Dashboard</Link></li>
          </ul>
        </div>
        <div className="space-y-6">
          <div className="text-xs font-mono uppercase tracking-widest text-primary">Company</div>
          <ul className="space-y-4 font-medium">
            <li><Link href="/about" className="text-muted-foreground hover:text-primary transition-colors text-sm">About Us</Link></li>
            <li><Link href="/support" className="text-muted-foreground hover:text-primary transition-colors text-sm">Contact</Link></li>
            <li><Link href="#" className="text-muted-foreground hover:text-primary transition-colors text-sm">Terms of Service</Link></li>
            <li><Link href="#" className="text-muted-foreground hover:text-primary transition-colors text-sm">Privacy Policy</Link></li>
          </ul>
        </div>
        <div className="space-y-6">
          <div className="text-xs font-mono uppercase tracking-widest text-primary">Connect</div>
          <div className="flex gap-4">
            <Link href="#" className="w-10 h-10 rounded-xl bg-card border border-white/5 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors">
              <Heart className="w-5 h-5" />
            </Link>
          </div>
          <div className="text-muted-foreground/30 text-xs mt-8">
            Built with AI Accuracy
          </div>
        </div>
      </div>
    </footer>
  );
}
