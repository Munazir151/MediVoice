
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
  Languages, 
  Activity, 
  ShieldCheck, 
  Lock, 
  BarChart3, 
  Clock, 
  Stethoscope, 
  BrainCircuit,
  FileSearch,
  FileText,
  ListChecks,
  Volume2,
} from 'lucide-react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function FeaturesPage() {
  const serverRoomImage = PlaceHolderImages.find(img => img.id === 'server-room');

  return (
    <div className="min-h-screen text-foreground">
      <Navbar />
      
      <main className="pt-28 sm:pt-32 pb-16 sm:pb-20 overflow-hidden">
        <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 sm:mb-24">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-secondary/10 text-secondary text-xs font-mono tracking-widest mb-6 border border-secondary/20">
            <Activity className="w-4 h-4" />
            SYSTEM STATUS: OPTIMAL
          </div>
          <h1 className="font-headline text-4xl sm:text-5xl md:text-7xl font-bold tracking-tighter max-w-4xl leading-[1.1]">
            Precision Pulse: The Future of <span className="text-primary">Clinical Triage</span>.
          </h1>
        </header>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-12 gap-6 mb-20 sm:mb-32">
          {/* Multilingual Voice AI - Large Card */}
          <div className="md:col-span-8 glass-card rounded-[2rem] p-6 sm:p-10 flex flex-col justify-between min-h-[420px] sm:min-h-[500px] relative overflow-hidden group hover:border-primary/40 transition-all duration-500">
            <div className="absolute top-0 right-0 w-full h-full opacity-5 pointer-events-none waveform-bg"></div>
            <div>
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-8">
                <Languages className="text-primary w-8 h-8" />
              </div>
              <h2 className="font-headline text-4xl font-bold mb-4">Multilingual Voice AI</h2>
              <p className="text-lg text-muted-foreground max-w-xl leading-relaxed mb-8">
                Breaking language barriers in critical care. MediVoice understands 22+ regional dialects including Hindi, Tamil, Bengali, and Marathi with localized clinical nuances.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4">
              {[
                { lang: 'Hindi', text: 'नमस्ते' },
                { lang: 'Tamil', text: 'வணக்கம்' },
                { lang: 'Bengali', text: 'হ্যালো' },
                { lang: 'Telugu', text: 'హలో' },
                { lang: 'Marathi', text: 'नमस्कार' },
                { lang: 'English', text: 'Hello' }
              ].map((item, i) => (
                <div key={i} className="bg-white/5 p-4 rounded-xl text-center border border-white/5 group-hover:border-primary/20 transition-colors">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{item.lang}</div>
                  <div className="font-headline text-primary font-bold">{item.text}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Accuracy Stats - Vertical Card */}
          <div className="md:col-span-4 glass-card rounded-[2rem] p-6 sm:p-8 flex flex-col justify-center border-white/5 relative group hover:border-primary/40 transition-all">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none"></div>
            <div className="text-center">
              <span className="font-headline text-5xl sm:text-6xl font-bold text-primary mb-2 block">99.8%</span>
              <h3 className="font-headline text-xl font-bold mb-4">Clinical Grade Accuracy</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-8">
                Validated across 1.2 million clinical encounters. Our Neural-Pulse™ engine filters ambient noise to focus on the patient's voice signature.
              </p>
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center p-4 rounded-2xl bg-white/5 border border-white/5">
                  <span className="text-xs font-mono uppercase tracking-tighter text-muted-foreground">Latency</span>
                  <span className="text-xs font-mono text-secondary font-bold">&lt; 140ms</span>
                </div>
                <div className="flex justify-between items-center p-4 rounded-2xl bg-white/5 border border-white/5">
                  <span className="text-xs font-mono uppercase tracking-tighter text-muted-foreground">Medical NLP</span>
                  <span className="text-xs font-mono text-secondary font-bold">SNOMED-CT</span>
                </div>
              </div>
            </div>
          </div>

          {/* Security Section - Wide Bottom */}
          <div className="md:col-span-12 glass-card rounded-[2.5rem] p-6 sm:p-10 flex flex-col md:flex-row items-center gap-10 sm:gap-12 border-white/5">
            <div className="md:w-1/2">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <ShieldCheck className="text-destructive w-6 h-6" />
                </div>
                <h3 className="font-headline text-3xl font-bold">Security & HIPAA Compliance</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Data privacy is not a feature; it is our foundation. MediVoice utilizes end-to-end AES-256 encryption and zero-knowledge architecture, ensuring patient recordings never touch a public cloud without anonymization.
              </p>
              <div className="flex flex-wrap gap-3">
                {['HIPAA Certified', 'SOC2 Type II', 'GDPR Ready'].map((tag, i) => (
                  <span key={i} className="px-4 py-1.5 rounded-full bg-white/5 text-[10px] font-mono text-foreground uppercase tracking-widest border border-white/10">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="md:w-1/2 w-full h-64 rounded-2xl overflow-hidden relative grayscale opacity-60 group-hover:grayscale-0 transition-all duration-700">
              {serverRoomImage && (
                <Image 
                  src={serverRoomImage.imageUrl} 
                  alt={serverRoomImage.description} 
                  fill 
                  className="object-cover" 
                  data-ai-hint={serverRoomImage.imageHint}
                />
              )}
              <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px]"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Lock className="w-12 h-12 text-primary mx-auto mb-2" />
                  <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-primary font-bold">Encrypted Terminal</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20 sm:mb-32">
          <div className="mb-8 sm:mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-primary/10 text-primary text-xs font-mono tracking-widest mb-4 border border-primary/20">
              <FileSearch className="w-4 h-4" />
              REPORT ANALYSIS STACK
            </div>
            <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
              Clinical Document Intelligence
            </h2>
            <p className="mt-3 text-muted-foreground max-w-3xl leading-relaxed">
              Upload prescriptions or lab reports and get a patient-friendly, structured explanation. MediVoice extracts key values from the document and explains each medicine and each test in clear language.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card className="lg:col-span-8 glass-card rounded-[2rem] border-white/10">
              <CardContent className="p-6 sm:p-10">
                <h3 className="font-headline text-2xl sm:text-3xl font-bold mb-6">What Users Get</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2 mb-2 text-primary">
                      <FileText className="w-4 h-4" />
                      <span className="font-mono text-xs tracking-widest uppercase">Document Extraction</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Patient info, medicine names, dose/frequency, and lab values are extracted directly from uploaded files.</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2 mb-2 text-primary">
                      <ListChecks className="w-4 h-4" />
                      <span className="font-mono text-xs tracking-widest uppercase">Plain Explanations</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Each medicine includes what it is and what it does; each test includes range-aware interpretation.</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2 mb-2 text-primary">
                      <Volume2 className="w-4 h-4" />
                      <span className="font-mono text-xs tracking-widest uppercase">Voice + Language</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Summaries can be read aloud and translated for better patient awareness and communication.</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2 mb-2 text-primary">
                      <Stethoscope className="w-4 h-4" />
                      <span className="font-mono text-xs tracking-widest uppercase">Clinical Context</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Drug interactions are cross-checked and highlighted with severity bands for safer decision support.</p>
                  </div>
                </div>

                <div className="mt-7 flex flex-col sm:flex-row gap-3">
                  <Button asChild className="bg-gradient-to-br from-primary to-secondary text-primary-foreground rounded-full font-bold">
                    <Link href="/pipeline">Open Report Analysis</Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-full border-white/10 bg-card/60 font-bold">
                    <Link href="/drug-checker">Open Drug Checker</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-4 glass-card rounded-[2rem] border-white/10">
              <CardContent className="p-6 sm:p-8">
                <h3 className="font-headline text-xl font-bold mb-5">Output Format</h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    Patient Information: Name, age, gender if available.
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    Health Summary: One narrative paragraph in simple language.
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    Clinical Findings: Bullet explanation for each key finding.
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    Lab Insights Table: Test, result, unit, reference range, explanation.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Dynamic Visualization Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20 sm:mb-32">
          <div className="glass-card rounded-[2.5rem] p-1 md:p-12 overflow-hidden relative">
            <div className="diagonal-cut absolute inset-0 bg-white/5 opacity-20 -z-10"></div>
                <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-center">
              <div className="lg:w-1/3">
                <h2 className="font-headline text-4xl font-bold mb-6">Real-time Waveform Analysis</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Our AI doesn't just listen to words. It analyzes respiratory rate, speech cadence, and vocal strain to identify acute distress before the triage questions are even complete.
                </p>
                <div className="mt-8 flex items-center gap-6">
                  <div className="text-center">
                    <div className="font-headline text-2xl text-primary font-bold">0.02s</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1 font-bold">Reaction</div>
                  </div>
                  <div className="w-[1px] h-10 bg-white/10"></div>
                  <div className="text-center">
                    <div className="font-headline text-2xl text-secondary font-bold">60+</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1 font-bold">Biomarkers</div>
                  </div>
                </div>
              </div>
              <div className="lg:w-2/3 bg-background/50 rounded-3xl p-5 sm:p-8 border border-white/5 shadow-2xl w-full">
                <div className="flex items-center gap-4 mb-8">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-destructive animate-pulse"></div>
                    <div className="w-2 h-2 rounded-full bg-white/10"></div>
                    <div className="w-2 h-2 rounded-full bg-white/10"></div>
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">LIVE_ANALYTICS: PATIENT_A-902</div>
                </div>
                <div className="h-36 sm:h-48 flex items-end gap-1 mb-8">
                  {[12, 24, 32, 40, 28, 36, 16, 20, 32, 44, 28, 14].map((h, i) => (
                    <div 
                      key={i} 
                      className="flex-1 bg-primary/20 rounded-t-sm animate-waveform" 
                      style={{ height: `${h * 2}px`, animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                  {[
                    { label: 'SpO2 Est.', val: '98%', color: 'text-primary' },
                    { label: 'Pulse Ox', val: '72 bpm', color: 'text-primary' },
                    { label: 'Stress Lvl', val: 'Moderate', color: 'text-destructive' },
                    { label: 'Confidence', val: '0.99', color: 'text-secondary' }
                  ].map((stat, i) => (
                    <div key={i} className="p-3 bg-white/5 rounded-xl border border-white/10">
                      <div className="text-[10px] text-muted-foreground uppercase mb-1 font-bold">{stat.label}</div>
                      <div className={`font-mono font-bold ${stat.color}`}>{stat.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
