"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Zap, Mail, ArrowRight, Activity, Loader2 } from 'lucide-react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

export default function SignupPage() {
  const [role, setRole] = useState<'patient' | 'doctor'>('patient');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [medicalId, setMedicalId] = useState('');
  const [loading, setLoading] = useState(false);
  
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!auth || !db) return;
    
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: fullName });

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        fullName,
        email,
        role,
        medicalId: role === 'doctor' ? medicalId : null,
        createdAt: new Date().toISOString()
      });

      toast({
        title: "Account Created",
        description: `Welcome to MediVoice, ${fullName}.`,
      });

      router.push(role === 'doctor' ? '/doctor/dashboard' : '/dashboard');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Signup Failed",
        description: error.message || "Could not create account.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <nav className="fixed top-0 w-full z-50 flex justify-between items-center px-8 py-4 bg-background/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-2">
          <Link href="/" className="font-headline font-bold tracking-tighter text-primary text-2xl">MediVoice</Link>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <Link className="font-headline font-bold tracking-tight text-secondary hover:text-primary transition-colors" href="/support">Support</Link>
          <Link className="font-headline font-bold tracking-tight text-secondary hover:text-primary transition-colors" href="/features">Security</Link>
        </div>
        <Button size="sm" className="bg-secondary text-secondary-foreground rounded-full px-6 font-bold">
          Contact Specialist
        </Button>
      </nav>

      <main className="relative z-10 w-full max-w-6xl px-8 flex flex-col lg:flex-row gap-16 items-center lg:items-start mx-auto mt-32 mb-20">
        <div className="w-full lg:w-1/2 flex flex-col gap-6 text-center lg:text-left">
          <span className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-bold tracking-widest self-center lg:self-start border border-secondary/20">
            <Activity className="w-3 h-3" />
            NEXT GEN TRIAGE
          </span>
          <h1 className="font-headline text-5xl md:text-7xl font-bold tracking-tight leading-[1.1]">
            Join the <span className="text-primary italic">Vanguard</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-lg leading-relaxed">
            Step into the future of clinical documentation. AI-powered voice triage that transforms patient interactions into precision medical data in real-time.
          </p>
          <div className="mt-12 hidden lg:flex flex-col gap-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-card border border-white/10 flex items-center justify-center text-primary shadow-lg shadow-primary/5">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-headline font-bold text-lg">HIPAA Compliant</h4>
                <p className="text-sm text-muted-foreground">End-to-end encryption for all voice data.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-card border border-white/10 flex items-center justify-center text-primary shadow-lg shadow-primary/5">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-headline font-bold text-lg">99.8% Accuracy</h4>
                <p className="text-sm text-muted-foreground">Clinical grade voice recognition engine.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-1/2">
          <div className="glass-card p-8 md:p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group border-white/5">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none"></div>
            
            <form onSubmit={handleSignup} className="relative z-10 flex flex-col gap-8">
              <div className="p-1 bg-background/50 rounded-full flex items-center border border-white/5">
                <button 
                  type="button"
                  onClick={() => setRole('patient')}
                  className={`flex-1 py-3 rounded-full text-sm font-headline font-bold transition-all ${role === 'patient' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Patient
                </button>
                <button 
                  type="button"
                  onClick={() => setRole('doctor')}
                  className={`flex-1 py-3 rounded-full text-sm font-headline font-bold transition-all ${role === 'doctor' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Practitioner
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 flex flex-col gap-2">
                  <Label className="text-xs font-headline font-bold tracking-widest text-muted-foreground pl-1">FULL NAME <span className="text-primary">*</span></Label>
                  <Input 
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="bg-background/50 border-white/10 rounded-2xl py-7 transition-all focus:ring-primary/20" 
                    placeholder="Julian Sterling" 
                  />
                </div>
                <div className="md:col-span-2 flex flex-col gap-2">
                  <Label className="text-xs font-headline font-bold tracking-widest text-muted-foreground pl-1">EMAIL ADDRESS <span className="text-primary">*</span></Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50" />
                    <Input 
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-background/50 border-white/10 rounded-2xl py-7 pl-12 transition-all focus:ring-primary/20" 
                      placeholder="julian@clinical.vanguard" 
                    />
                  </div>
                </div>
                {role === 'doctor' && (
                  <div className="md:col-span-2 flex flex-col gap-2">
                    <Label className="text-xs font-headline font-bold tracking-widest text-muted-foreground pl-1">MEDICAL ID <span className="text-primary">*</span></Label>
                    <Input 
                      required
                      value={medicalId}
                      onChange={(e) => setMedicalId(e.target.value)}
                      className="bg-background/50 border-white/10 rounded-2xl py-7 transition-all focus:ring-primary/20 font-mono" 
                      placeholder="NPI / GMC Registration" 
                    />
                  </div>
                )}
                <div className="md:col-span-2 flex flex-col gap-2">
                  <Label className="text-xs font-headline font-bold tracking-widest text-muted-foreground pl-1">PASSWORD</Label>
                  <Input 
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-background/50 border-white/10 rounded-2xl py-7 transition-all focus:ring-primary/20 font-mono" 
                    placeholder="••••••••" 
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-6">
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-8 rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground font-headline font-bold text-lg tracking-tight shadow-lg shadow-primary/20 hover:scale-[0.98] transition-all flex items-center justify-center gap-3"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Create Account <ArrowRight className="w-5 h-5" /></>}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Already in the network? <Link href="/login" className="text-primary hover:underline font-bold">Sign In</Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </main>

      <footer className="bg-background py-16 border-t border-white/5 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 px-8">
          <div className="flex flex-col gap-2 items-center md:items-start">
            <span className="font-headline font-black text-primary text-xl">MediVoice AI</span>
            <p className="text-xs uppercase tracking-widest text-secondary opacity-70">
              © 2024 MediVoice AI. Clinical Grade Precision.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-xs font-medium text-secondary/50 uppercase tracking-widest">
            <Link className="hover:text-primary transition-opacity" href="#">Privacy</Link>
            <Link className="hover:text-primary transition-opacity" href="#">HIPAA</Link>
            <Link className="hover:text-primary transition-opacity" href="#">Terms</Link>
            <Link className="hover:text-primary transition-opacity" href="#">Data</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
