"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import NavHeader from '@/components/ui/nav-header';
import { Menu, Mic2, LogOut, User } from 'lucide-react';
import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

export function Navbar() {
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const isDashboardRoute = pathname === '/dashboard';

  const navItems = useMemo(() => {
    const baseItems = [
      { label: 'Home', href: '/' },
      { label: 'Features', href: '/features' },
      { label: 'Report Analysis', href: '/pipeline' },
      { label: 'Drug Checker', href: '/drug-checker' },
      { label: 'Support', href: '/support' },
    ];

    if (user) {
      baseItems.push({ label: 'Dashboard', href: '/dashboard' });
    }

    return baseItems;
  }, [user]);

  const mobileActions = user
    ? [
        { label: 'Start Triage', href: '/triage', primary: true },
        { label: 'Dashboard', href: '/dashboard' },
      ]
    : !isDashboardRoute
      ? [
          { label: 'Sign In', href: '/login' },
          { label: 'Start Triage', href: '/triage', primary: true },
        ]
      : [];

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
    <nav className="fixed top-3 sm:top-4 inset-x-0 z-50 bg-transparent px-2 sm:px-4">
      <div className="w-full mx-auto max-w-7xl px-8 py-4 rounded-full border border-white/5 bg-background/55 backdrop-blur-xl shadow-sm shadow-black/5">
        <div className="hidden md:flex items-center gap-4">
          <Link href="/" className="text-xl font-bold tracking-tight flex items-center gap-2 group shrink-0">
            <Mic2 className="text-primary w-6 h-6 transition-transform group-hover:scale-110" />
            <span className="font-headline">MediVoice</span>
          </Link>

          <div className="flex-1 flex justify-center">
            <NavHeader items={navItems} />
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                  <User className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-medium max-w-[120px] truncate">{user.displayName || user.email}</span>
                </div>
                <Button asChild className="bg-gradient-to-br from-primary to-secondary text-primary-foreground rounded-full font-bold shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all">
                  <Link href="/triage">Start Triage</Link>
                </Button>
                <Button onClick={handleLogout} variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : !isDashboardRoute ? (
              <>
                <Link
                  href="/login"
                  className="inline-flex min-w-[120px] items-center justify-center rounded-full border border-white/10 bg-card/60 px-6 py-2 text-sm font-bold transition-colors hover:border-primary/30 hover:text-primary"
                >
                  Sign In
                </Link>
                <Button asChild className="bg-gradient-to-br from-primary to-secondary text-primary-foreground rounded-full font-bold shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all">
                  <Link href="/triage">Start Triage</Link>
                </Button>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 md:hidden">
          <Link href="/" className="text-xl font-bold tracking-tight flex items-center gap-2 group">
            <Mic2 className="text-primary w-6 h-6 transition-transform group-hover:scale-110" />
            <span className="font-headline">MediVoice</span>
          </Link>

          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-full border-white/10 bg-background/60 backdrop-blur-xl"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[88vw] sm:w-[380px] bg-background/95 backdrop-blur-xl border-white/10">
              <SheetHeader className="mb-6 text-left">
                <SheetTitle className="flex items-center gap-2 text-foreground">
                  <Mic2 className="h-5 w-5 text-primary" />
                  MediVoice
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-3">
                <div className="grid gap-2">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-foreground/80 transition-colors hover:border-primary/30 hover:text-primary"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>

                <div className="pt-4 space-y-3 border-t border-white/10">
                  {user && (
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <User className="h-4 w-4 text-primary" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{user.displayName || user.email}</p>
                        <p className="text-xs text-muted-foreground">Signed in</p>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-2">
                    {mobileActions.map((action) =>
                      action.primary ? (
                        <Button asChild key={action.href} className="w-full bg-gradient-to-br from-primary to-secondary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all">
                          <Link href={action.href}>{action.label}</Link>
                        </Button>
                      ) : (
                        <Link
                          key={action.href}
                          href={action.href}
                          className="flex items-center justify-center rounded-2xl border border-white/10 bg-card/60 px-4 py-3 text-sm font-bold transition-colors hover:border-primary/30 hover:text-primary"
                        >
                          {action.label}
                        </Link>
                      )
                    )}
                  </div>

                  {user && (
                    <Button
                      onClick={handleLogout}
                      variant="ghost"
                      className="w-full justify-start rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-destructive"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </Button>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
