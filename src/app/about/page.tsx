
import { Navbar } from '@/components/layout/Navbar';
import { Terminal, Database, Cpu, Palette, Users, BrainCircuit, Globe } from 'lucide-react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function AboutPage() {
  const team = [
    { id: 'arjun-sharma', name: 'Arjun Sharma', role: 'Lead AI Architect' },
    { id: 'priya-iyer', name: 'Priya Iyer', role: 'Product Strategy' },
    { id: 'rohan-gupta', name: 'Rohan Gupta', role: 'Infrastructure Eng.' },
    { id: 'meera-das', name: 'Meera Das', role: 'Medical Compliance' }
  ].map(member => ({
    ...member,
    data: PlaceHolderImages.find(img => img.id === member.id)
  }));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      <main className="relative pt-32 overflow-hidden">
        {/* Floating Background Elements */}
        <div className="absolute inset-0 pointer-events-none opacity-5 overflow-hidden">
          <div className="absolute top-[10%] left-[5%] animate-pulse">
            <BrainCircuit className="text-primary w-[300px] h-[300px]" />
          </div>
          <div className="absolute top-[40%] right-[10%] blur-sm">
            <Globe className="text-secondary w-[250px] h-[250px]" />
          </div>
        </div>

        {/* Hero: The Mission */}
        <section className="max-w-7xl mx-auto px-8 relative z-10 mb-32">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-end">
            <div className="md:col-span-8">
              <h1 className="font-headline text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-tight">
                The Mission
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl leading-relaxed">
                At <span className="text-primary font-bold">MediVoice</span>, we are dismantling the linguistic and technical barriers in Indian healthcare. By combining real-time voice AI with localized medical knowledge, we ensure that critical triage is accessible to every citizen, regardless of their dialect or digital literacy.
              </p>
            </div>
            <div className="md:col-span-4 flex justify-end">
              <div className="glass-card p-8 rounded-3xl border-white/10 text-center">
                <div className="font-headline text-primary text-5xl font-bold mb-2">95%</div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Accuracy across 12+ Dialects</div>
              </div>
            </div>
          </div>
        </section>

        {/* Badge Section */}
        <section className="w-full bg-white/5 py-32 diagonal-cut relative z-10 my-20">
          <div className="max-w-7xl mx-auto px-8 flex flex-col items-center justify-center text-center">
            <div className="inline-block relative group">
              <div className="absolute inset-0 bg-primary/20 blur-[80px] rounded-full group-hover:bg-primary/30 transition-all duration-700"></div>
              <div className="relative glass-card border border-primary/20 p-12 md:p-20 rounded-full flex flex-col items-center">
                <Terminal className="text-primary w-12 h-12 mb-6" />
                <h2 className="font-headline text-4xl md:text-6xl font-extrabold tracking-tighter">
                  Built at HackBLR 2026
                </h2>
                <p className="mt-4 font-mono text-primary tracking-[0.2em] text-sm md:text-base uppercase font-bold">
                  Pushing the boundaries of MedTech AI
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Tech Stack Section */}
        <section className="max-w-7xl mx-auto px-8 py-32 relative z-10">
          <h3 className="font-headline text-3xl md:text-4xl font-bold mb-16 flex items-center gap-4">
            <span className="w-12 h-[2px] bg-primary"></span>
            The Clinical Stack
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Terminal, title: 'Vapi', desc: 'Powers our ultra-low latency voice orchestration, enabling natural conversational flow.' },
              { icon: Database, title: 'Qdrant', desc: 'The vector backbone for our high-precision medical knowledge retrieval.' },
              { icon: Cpu, title: 'Next.js 15', desc: 'Server-side optimization for lightning-fast dashboards and triage portals.' },
              { icon: Palette, title: 'Tailwind CSS', desc: 'A utility-first foundation that allows for the precise, accessible UI design system.' }
            ].map((tech, i) => (
              <div key={i} className="glass-card p-8 rounded-[2rem] border-white/5 hover:border-primary/40 transition-all duration-300 group">
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:bg-primary/10 transition-colors">
                  <tech.icon className="text-primary w-8 h-8" />
                </div>
                <h4 className="font-headline text-xl font-bold mb-3">{tech.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {tech.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Team Section */}
        <section className="bg-background py-32 relative z-10">
          <div className="max-w-7xl mx-auto px-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
              <div>
                <h3 className="font-headline text-3xl md:text-4xl font-bold mb-4">The Vanguard Team</h3>
                <p className="text-muted-foreground max-w-md">The engineers and visionaries behind the MediVoice vision.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {team.map((member, i) => (
                <div key={i} className="space-y-4 group">
                  <div className="aspect-square rounded-2xl bg-white/5 overflow-hidden border border-white/5 relative">
                    {member.data && (
                      <Image 
                        src={member.data.imageUrl} 
                        alt={member.data.description} 
                        fill 
                        className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500" 
                        data-ai-hint={member.data.imageHint}
                      />
                    )}
                  </div>
                  <div>
                    <h5 className="font-headline font-bold text-lg">{member.name}</h5>
                    <p className="font-mono text-[10px] text-primary uppercase tracking-widest font-bold">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
