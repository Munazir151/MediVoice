"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, BarChart2, Mail, Lock, Eye, ArrowRight, Loader2 } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!auth || !db) return;

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      toast({
        title: "Signed In",
        description: `Welcome back, ${user.displayName || 'Patient'}.`,
      });

      if (userData?.role === 'doctor') {
        router.push('/doctor/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message || "Invalid credentials.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[100px]"></div>
      
      <main className="relative z-10 flex-grow flex items-center justify-center px-6 pt-12">
        <div className="w-full max-w-[1100px] grid md:grid-cols-2 gap-12 items-center">
          <div className="hidden md:flex flex-col space-y-8 pr-12">
            <div className="space-y-2">
              <span className="text-primary font-mono text-sm tracking-[0.2em] uppercase">System Node: MediVoice v2.4</span>
              <h1 className="font-headline font-bold text-6xl tracking-tighter leading-none">
                Clinical <br/><span className="text-primary">Intelligence.</span>
              </h1>
            </div>
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-5 rounded-3xl bg-card/30 border-l-4 border-primary">
                <Shield className="text-primary w-6 h-6 shrink-0" />
                <div>
                  <p className="font-headline font-bold text-lg">HIPAA Tier 3 Ready</p>
                  <p className="text-muted-foreground text-sm">Military-grade encryption for all voice triage data streams.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-5 rounded-3xl bg-card/30 border-l-4 border-secondary">
                <BarChart2 className="text-secondary w-6 h-6 shrink-0" />
                <div>
                  <p className="font-headline font-bold text-lg">AI Co-Pilot</p>
                  <p className="text-muted-foreground text-sm">Real-time sentiment and urgency analysis during patient intake.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center w-full">
            <div className="glass-card w-full max-w-md p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent"></div>
              <div className="mb-10 text-center">
                <h2 className="font-headline font-bold text-3xl tracking-tight mb-2">Welcome back.</h2>
                <p className="text-secondary text-sm font-medium uppercase tracking-widest opacity-80">Access Your Health Records</p>
              </div>
              
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-mono uppercase tracking-widest text-secondary pl-1">Email / Phone Number</Label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input 
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-background/50 border-white/10 rounded-2xl px-12 py-7 transition-all focus:ring-primary/20 font-mono text-sm" 
                      placeholder="patient@example.com" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <Label className="text-xs font-mono uppercase tracking-widest text-secondary">Password</Label>
                    <Link className="text-[10px] text-primary hover:underline uppercase tracking-tighter" href="#">Forgot Password?</Link>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input 
                      required
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-background/50 border-white/10 rounded-2xl px-12 py-7 transition-all focus:ring-primary/20 font-mono text-sm" 
                      placeholder="••••••••••••" 
                    />
                    <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-secondary">
                      <Eye className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="pt-4 space-y-4">
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-gradient-to-br from-primary to-secondary text-primary-foreground font-headline font-bold py-7 rounded-full shadow-lg shadow-primary/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Sign In</span> <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" /></>}
                  </Button>
                  
                  <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-white/5"></div>
                    <span className="flex-shrink mx-4 text-[10px] font-mono uppercase text-muted-foreground">or authenticate via</span>
                    <div className="flex-grow border-t border-white/5"></div>
                  </div>

                  <Button variant="outline" type="button" className="w-full bg-card/40 border-white/10 text-foreground font-semibold py-7 rounded-full hover:bg-card/60 transition-colors flex items-center justify-center gap-3">
                    <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center overflow-hidden">
                      <Image 
                        src="https://picsum.photos/seed/google/32/32" 
                        alt="Google" 
                        width={20} 
                        height={20} 
                        className="object-contain" 
                        data-ai-hint="google logo"
                      />
                    </div>
                    <span className="text-sm">Continue with Patient Portal</span>
                  </Button>
                </div>
              </form>
              
              <div className="mt-8 text-center">
                <p className="text-[11px] text-muted-foreground leading-relaxed max-w-[280px] mx-auto">
                  System access is monitored. Unauthorized entry attempts are logged under HIPAA security regulations.
                </p>
                <p className="mt-4 text-sm">
                  New here? <Link href="/signup" className="text-primary font-bold hover:underline">Create an account</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 w-full bg-background/50 border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 px-8">
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="font-headline font-black text-primary text-lg tracking-tighter">MediVoice</div>
            <p className="text-xs uppercase tracking-widest text-secondary/70">© 2024 MediVoice AI. Clinical Grade Precision.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            <Link className="text-xs uppercase tracking-widest text-secondary/50 hover:text-primary transition-opacity" href="#">Privacy Policy</Link>
            <Link className="text-xs uppercase tracking-widest text-secondary/50 hover:text-primary transition-opacity" href="#">HIPAA Compliance</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
