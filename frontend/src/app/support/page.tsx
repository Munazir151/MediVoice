
import { Navbar } from '@/components/layout/Navbar';
import { 
  Search, 
  FileText, 
  Users, 
  Settings2, 
  AlertTriangle, 
  ChevronRight, 
  Mic, 
  Bell, 
  Settings, 
  ArrowRight 
} from 'lucide-react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SupportPage() {
  const supportAgent = PlaceHolderImages.find(img => img.id === 'support-agent');

  return (
    <div className="min-h-screen text-foreground">
      <Navbar />
      
      <main className="pt-20 sm:pt-24">
        {/* Hero Section */}
        <section className="relative pt-20 sm:pt-24 pb-24 sm:pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="absolute inset-0 z-0 bg-gradient-to-br from-white/5 to-background diagonal-cut"></div>
          <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row gap-10 lg:gap-12 items-start md:items-end">
            <div className="md:w-3/5 w-full">
              <h1 className="text-4xl sm:text-5xl md:text-7xl font-headline font-bold tracking-tight mb-6 sm:mb-8 leading-tight">
                How can we <span className="text-primary italic">help</span> today?
              </h1>
              <div className="relative group max-w-2xl">
                <Input 
                  className="w-full bg-white/10 backdrop-blur-xl border-none rounded-full px-5 sm:px-8 py-6 sm:py-8 text-sm sm:text-base md:text-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50 transition-all shadow-2xl" 
                  placeholder="Search documentation, triage codes, or help articles..." 
                />
                <button className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 bg-gradient-to-br from-primary to-secondary text-primary-foreground w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center hover:shadow-[0_0_20px_rgba(87,241,219,0.4)] transition-all">
                  <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
            <div className="md:w-2/5 flex flex-col items-start md:items-end text-left md:text-right">
              <div className="mb-4 p-4 rounded-2xl bg-white/5 border-l-4 border-primary backdrop-blur-md">
                <p className="text-secondary font-mono text-[10px] uppercase tracking-widest mb-1 font-bold">System Latency</p>
                <p className="font-mono text-2xl font-bold">14ms</p>
              </div>
              <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
                Our Precision Pulse AI engine is currently processing triage sessions at 99.8% accuracy. Real-time support is online.
              </p>
            </div>
          </div>
        </section>

        {/* Category Bento Grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 sm:-mt-16 mb-20 sm:mb-24 relative z-20">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-2 glass-card p-8 rounded-[2rem] hover:ring-2 hover:ring-primary/20 transition-all group flex flex-col justify-between min-h-[280px]">
              <div>
                <div className="bg-primary/10 w-14 h-14 rounded-full flex items-center justify-center mb-6">
                  <FileText className="text-primary w-7 h-7" />
                </div>
                <h3 className="text-2xl font-headline font-bold mb-3">Provider Documentation</h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Deep-dive into clinical protocols, voice integration APIs, and secure patient data handling for specialists.
                </p>
              </div>
              <div className="flex items-center gap-2 text-primary font-bold group-hover:gap-4 transition-all">
                <span>Explore Guides</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            <div className="glass-card p-8 rounded-[2rem] hover:ring-2 hover:ring-primary/20 transition-all flex flex-col min-h-[280px]">
              <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-6">
                <Users className="text-primary w-6 h-6" />
              </div>
              <h3 className="text-xl font-headline font-bold mb-2">Patient FAQs</h3>
              <p className="text-muted-foreground text-sm mb-4">Common queries about voice triage results and appointment scheduling.</p>
              <a className="mt-auto text-secondary text-sm font-bold underline decoration-primary/30 underline-offset-4" href="#">View 48 Articles</a>
            </div>

            <div className="glass-card p-8 rounded-[2rem] border-destructive/20 bg-destructive/5 hover:ring-2 hover:ring-destructive/20 transition-all flex flex-col justify-between min-h-[280px]">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="text-destructive w-6 h-6" />
                <h3 className="text-xl font-headline font-bold text-destructive">Emergency</h3>
              </div>
              <p className="text-muted-foreground text-sm mb-6 leading-relaxed">Immediate technical intervention for live triage failure or data breaches.</p>
              <Button variant="destructive" className="w-full rounded-full font-bold">
                CALL SUPPORT
              </Button>
            </div>
          </div>
        </section>

        {/* Knowledge Base & Voice Support */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-24 sm:mb-32">
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8 sm:mb-12">
                <div>
                  <h2 className="text-3xl font-headline font-bold mb-2">Knowledge Base</h2>
                  <p className="text-muted-foreground">Popular articles curated by our clinical team.</p>
                </div>
                <a className="text-primary text-sm font-bold hover:underline" href="#">View All Articles</a>
              </div>
              <div className="space-y-4">
                {[
                  { id: '01', tag: 'Protocol', time: '6 MIN READ', title: 'Optimizing Voice Input for Pediatric Triage' },
                  { id: '02', tag: 'Compliance', time: '12 MIN READ', title: 'HIPAA Compliance in AI-Generated Summaries' },
                  { id: '03', tag: 'Setup', time: '4 MIN READ', title: 'Troubleshooting Whisper-to-Data Latency' }
                ].map((item, i) => (
                  <div key={i} className="group flex items-start sm:items-center gap-4 sm:gap-6 p-4 sm:p-6 rounded-3xl glass-card border-white/5 hover:border-primary/30 transition-all cursor-pointer">
                    <div className="font-mono text-muted-foreground/30 group-hover:text-primary transition-colors text-xl font-bold">{item.id}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="bg-secondary/10 text-secondary px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">{item.tag}</span>
                        <span className="text-muted-foreground text-[10px] font-mono font-bold">{item.time}</span>
                      </div>
                      <h4 className="text-lg font-headline font-bold group-hover:text-primary transition-colors">{item.title}</h4>
                    </div>
                    <ChevronRight className="text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all" />
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:w-[400px] w-full">
              <div className="glass-card rounded-[2.5rem] p-8 sm:p-10 relative overflow-hidden flex flex-col items-center text-center">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(87,241,219,0.05)_0%,transparent_70%)]"></div>
                <h3 className="text-2xl font-headline font-bold mb-4 relative z-10">Talk to Support</h3>
                <p className="text-muted-foreground text-sm mb-12 relative z-10 leading-relaxed">
                  Need a faster answer? Use your voice to describe the issue. Our clinical AI will route you to the right human agent instantly.
                </p>
                <div className="relative mb-10 sm:mb-12">
                  <div className="absolute inset-0 rounded-full bg-primary/20 scale-125 blur-xl animate-pulse"></div>
                  <button className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-2xl transition-transform hover:scale-105 active:scale-95 group">
                    <Mic className="text-primary-foreground w-10 h-10 sm:w-12 sm:h-12" />
                  </button>
                </div>
                <p className="text-secondary font-mono text-[10px] tracking-widest uppercase mb-8 relative z-10 font-bold">Clinical Voice Auth: Active</p>
                <div className="w-full h-px bg-white/10 mb-8"></div>
                <div className="flex items-center gap-4 text-left relative z-10 w-full">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary relative">
                    {supportAgent && (
                      <Image 
                        src={supportAgent.imageUrl} 
                        alt={supportAgent.description} 
                        fill 
                        className="object-cover" 
                        data-ai-hint={supportAgent.imageHint}
                      />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-sm">Elena Vance</p>
                    <p className="text-muted-foreground text-xs font-medium">Senior Triage Architect</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
