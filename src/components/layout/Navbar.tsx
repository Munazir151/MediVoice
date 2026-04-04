"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Mic2, LayoutDashboard, LogOut, User } from 'lucide-react';
import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

export function Navbar() {
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      toast({
        title: "Signed Out",
        description: "You have been securely logged out.",
      });
      router.push('/');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-white/5">
      <div className="flex justify-between items-center w-full px-8 py-4 max-w-7xl mx-auto">
        <Link href="/" className="text-xl font-bold tracking-tight flex items-center gap-2 group">
          <Mic2 className="text-primary w-6 h-6 transition-transform group-hover:scale-110" />
          <span className="font-headline">MediVoice</span>
        </Link>
        <div className="hidden md:flex items-center gap-8 font-medium tracking-wide">
          <Link href="/" className="text-foreground/70 hover:text-primary transition-colors">Home</Link>
          <Link href="/features" className="text-foreground/70 hover:text-primary transition-colors">Features</Link>
          <Link href="/about" className="text-foreground/70 hover:text-primary transition-colors">About</Link>
          {user && (
            <Link href="/dashboard" className="text-foreground/70 hover:text-primary transition-colors flex items-center gap-1.5">
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
          )}
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                <User className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium max-w-[100px] truncate">{user.displayName || user.email}</span>
              </div>
              <Button onClick={handleLogout} variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <>
              <Link href="/login" className="text-sm font-bold hover:text-primary transition-colors px-4">Sign In</Link>
              <Button asChild className="bg-gradient-to-br from-primary to-secondary text-primary-foreground rounded-full font-bold shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all">
                <Link href="/triage">Try Demo</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
