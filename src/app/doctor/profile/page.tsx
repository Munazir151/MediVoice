
'use client';

import { Navbar } from '@/components/layout/Navbar';
import { 
  User, 
  Award, 
  Bell, 
  Shield, 
  HelpCircle, 
  LogOut, 
  Edit3, 
  CheckCircle2, 
  Mail, 
  Phone, 
  Building,
  Activity,
  Mic2,
  SwitchCamera
} from 'lucide-react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';

export default function DoctorProfilePage() {
  const doctorPortrait = PlaceHolderImages.find(img => img.id === 'doctor-vane');

  return (
    <div className="min-h-screen bg-background text-foreground waveform-bg">
      {/* Side Navigation */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-card/40 backdrop-blur-3xl flex flex-col py-8 z-50 border-r border-white/5">
        <div className="px-8 mb-12">
          <h1 className="font-headline text-primary text-2xl font-black tracking-tighter">MediVoice</h1>
        </div>
        
        <div className="px-4 mb-8">
          <div className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-white/5 border border-white/5">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-primary/20 relative">
              {doctorPortrait && (
                <Image src={doctorPortrait.imageUrl} alt="Profile" fill className="object-cover" />
              )}
            </div>
            <div>
              <p className="text-primary font-bold text-sm">Dr. Julian</p>
              <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest font-bold">Specialist</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-2">
          {[
            { icon: User, label: 'Profile', active: true },
            { icon: Award, label: 'Credentials' },
            { icon: Bell, label: 'Alerts' },
            { icon: Shield, label: 'Security' },
            { icon: HelpCircle, label: 'Support' }
          ].map((item, i) => (
            <button 
              key={i} 
              className={`w-full flex items-center gap-3 px-6 py-3 rounded-xl transition-all font-medium text-sm ${
                item.active 
                  ? 'bg-primary/10 text-primary border-r-4 border-primary rounded-r-none' 
                  : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto px-4 space-y-4">
          <Button variant="outline" className="w-full rounded-full border-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider h-10">
            Go Offline
          </Button>
          <button className="w-full flex items-center gap-3 px-6 py-3 text-muted-foreground hover:text-destructive transition-colors text-sm font-medium">
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="ml-64 min-h-screen p-12 lg:p-16">
        <header className="mb-16 relative">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-8">
            <div className="relative group">
              <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-[2rem] overflow-hidden shadow-2xl shadow-primary/10 border border-white/10 relative">
                {doctorPortrait && (
                  <Image 
                    src={doctorPortrait.imageUrl} 
                    alt="Dr. Julian Vane" 
                    fill 
                    className="object-cover" 
                    data-ai-hint={doctorPortrait.imageHint}
                  />
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-[10px] font-bold font-headline flex items-center gap-1 border-2 border-background">
                <CheckCircle2 className="w-3 h-3 fill-current" />
                Verified
              </div>
            </div>
            <div className="flex-1">
              <h2 className="font-headline text-4xl lg:text-5xl font-bold tracking-tight mb-2">Dr. Julian Vane</h2>
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-secondary text-lg font-medium">Emergency Medicine Specialist</span>
                <div className="h-1.5 w-1.5 rounded-full bg-white/10"></div>
                <span className="font-mono text-primary bg-primary/10 px-3 py-0.5 rounded-md text-sm font-bold border border-primary/20">Experience: 12 Yrs</span>
              </div>
            </div>
            <Button className="rounded-full bg-primary text-primary-foreground font-bold px-6 py-6 group">
              <Edit3 className="w-4 h-4 mr-2" /> Edit Profile
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <section className="lg:col-span-8 space-y-8">
            <Card className="glass-card rounded-[2.5rem] border-white/5 p-10">
              <div className="flex items-center gap-3 mb-10">
                <User className="text-primary w-6 h-6" />
                <h3 className="font-headline text-2xl font-bold tracking-tight">Personal Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-10 gap-x-12">
                {[
                  { label: 'Full Name', val: 'Julian Alexander Vane', icon: User },
                  { label: 'Email Address', val: 'j.vane@medivoice.ai', icon: Mail },
                  { label: 'Phone Number', val: '+91 (555) 012-4493', icon: Phone },
                  { label: 'Hospital Affiliation', val: 'St. Jude Medical Center', icon: Building }
                ].map((item, i) => (
                  <div key={i} className="space-y-2 group">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">{item.label}</label>
                    <p className="text-foreground text-lg font-bold flex items-center gap-2">
                      <item.icon className="w-4 h-4 text-primary/40 group-hover:text-primary transition-colors" />
                      {item.val}
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="glass-card rounded-[2.5rem] border-white/5 p-10">
              <div className="flex items-center gap-3 mb-10">
                <Mic2 className="text-primary w-6 h-6" />
                <h3 className="font-headline text-2xl font-bold tracking-tight">Triage Settings</h3>
              </div>
              <div className="space-y-6">
                {[
                  { title: 'Critical Alert Notifications', desc: 'Immediate haptic and sound alerts for acute patients.', active: true },
                  { title: 'Automated Triage Summary', desc: 'AI pre-fills patient history based on initial voice interaction.', active: true },
                  { title: 'SMS Backup Alerts', desc: 'Send alerts to phone when data connection is unstable.', active: false }
                ].map((setting, i) => (
                  <div key={i} className="flex items-center justify-between p-6 bg-white/5 rounded-3xl hover:bg-white/10 transition-colors border border-white/5">
                    <div>
                      <p className="font-bold">{setting.title}</p>
                      <p className="text-sm text-muted-foreground">{setting.desc}</p>
                    </div>
                    <Switch checked={setting.active} />
                  </div>
                ))}
              </div>
            </Card>
          </section>

          <section className="lg:col-span-4 space-y-8">
            <Card className="glass-card rounded-[2.5rem] border-white/5 p-8 flex flex-col justify-between min-h-[300px]">
              <div>
                <h3 className="font-headline text-lg font-bold text-secondary mb-8">Activity Overview</h3>
                <div className="space-y-8">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground font-medium">Triage Sessions</span>
                      <span className="font-mono text-2xl text-primary font-bold">1,482</span>
                    </div>
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-primary w-[85%] h-full"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground font-medium">Avg. Response Time</span>
                    <span className="font-mono text-xl font-bold">42s</span>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-8 border-t border-white/10">
                <p className="text-xs text-muted-foreground italic leading-relaxed">"Precision in communication saves lives in critical moments."</p>
              </div>
            </Card>

            <Card className="glass-card rounded-[2.5rem] border-white/5 p-8 relative overflow-hidden">
              <div className="flex items-center gap-3 mb-8">
                <Award className="text-primary w-6 h-6" />
                <h3 className="font-headline text-xl font-bold tracking-tight">Credentials</h3>
              </div>
              <div className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">MCI ID / License</label>
                  <div className="bg-white/5 px-4 py-3 rounded-xl font-mono text-primary font-bold border border-white/5">
                    MCI-992-044-B
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Languages</label>
                  <div className="flex flex-wrap gap-2">
                    {['English', 'Hindi', 'Marathi'].map((lang, i) => (
                      <Badge key={i} className="rounded-full bg-secondary/10 text-secondary border-none px-4 py-1 font-bold">
                        {lang}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </section>
        </div>

        <footer className="mt-24 pt-12 border-t border-white/5 opacity-40">
          <div className="flex justify-between items-center">
            <p className="text-[10px] font-mono font-bold tracking-widest uppercase">© 2024 MEDIVOICE AI SYSTEMS — v4.2.0</p>
            <div className="flex gap-1 items-end h-8">
              {[0.2, 0.5, 0.8, 1, 0.7, 0.4, 0.2].map((delay, i) => (
                <div key={i} className="w-1 bg-primary/40 rounded-full" style={{ height: `${delay * 100}%` }}></div>
              ))}
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
