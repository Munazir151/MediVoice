import Link from 'next/link';
import Image from 'next/image';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { 
  Languages, 
  Zap, 
  Navigation, 
  CheckCircle, 
  ArrowRight,
  Mic2,
  Heart
} from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function Home() {
  const doctorImage = PlaceHolderImages.find(img => img.id === 'doctor-tablet');
  const docPortrait = PlaceHolderImages.find(img => img.id === 'doctor-portrait');
  const motherPortrait = PlaceHolderImages.find(img => img.id === 'patient-mother');
  const adminPortrait = PlaceHolderImages.find(img => img.id === 'admin-portrait');

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main>
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center pt-20 px-8 max-w-7xl mx-auto overflow-hidden">
          <div className="grid lg:grid-cols-2 gap-12 items-center z-10 w-full">
            <div className="space-y-8">
              <h1 className="text-5xl md:text-7xl font-headline font-bold leading-tight">
                Your Health. <br/>
                Your Voice. <br/>
                <span className="text-primary italic">Your Language.</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-lg leading-relaxed">
                The next generation of AI-powered triage built specifically for India. Break language barriers and get clinical guidance instantly through the power of voice.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" className="bg-gradient-to-br from-primary to-secondary text-primary-foreground px-8 py-6 rounded-full font-bold text-lg hover:shadow-xl hover:shadow-primary/20 transition-all" asChild>
                  <Link href="/triage">Start Voice Triage</Link>
                </Button>
                <Button variant="outline" size="lg" className="border-primary/20 bg-primary/5 text-primary px-8 py-6 rounded-full font-bold text-lg hover:bg-primary/10 transition-all">
                  Watch Video
                </Button>
              </div>
            </div>
            
            <div className="relative flex justify-center items-center">
              <div className="voice-orb w-[300px] h-[300px] md:w-[500px] md:h-[500px] rounded-full flex items-center justify-center relative">
                <div className="absolute inset-0 bg-primary/5 rounded-full animate-pulse"></div>
                <div className="w-64 h-64 md:w-80 md:h-80 rounded-full border border-primary/30 flex items-center justify-center p-4">
                  <div className="w-full h-12 flex items-center justify-center gap-1.5">
                    {[0.2, 0.4, 0.6, 0.8, 1, 0.8, 0.6, 0.4, 0.2].map((delay, i) => (
                      <div 
                        key={i}
                        className="w-2 bg-primary rounded-full animate-waveform" 
                        style={{ height: `${delay * 100}%`, animationDelay: `${i * 0.1}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute top-1/4 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -z-10"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[120px] -z-10"></div>
        </section>

        {/* Stats Bar */}
        <section className="bg-card/30 border-y border-white/5 py-16 px-8 relative z-20">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            <div className="space-y-2">
              <div className="text-4xl font-bold font-mono text-primary tracking-tighter">22+</div>
              <div className="font-medium uppercase text-xs tracking-widest text-muted-foreground">Languages Supported</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold font-mono text-primary tracking-tighter">1,500+</div>
              <div className="font-medium uppercase text-xs tracking-widest text-muted-foreground">Conditions Mapped</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold font-mono text-primary tracking-tighter">&lt;3s</div>
              <div className="font-medium uppercase text-xs tracking-widest text-muted-foreground">Response Time</div>
            </div>
          </div>
        </section>

        {/* Feature Cards */}
        <section className="py-32 px-8 max-w-7xl mx-auto relative">
          <div className="mb-20">
            <h2 className="text-4xl font-headline font-bold">Intelligent Care <br/><span className="text-muted-foreground font-light">Driven by Voice.</span></h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-10 rounded-3xl md:col-span-2 group hover:border-primary/40 transition-all duration-500">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-8">
                <Languages className="text-primary w-8 h-8" />
              </div>
              <h3 className="text-2xl font-headline font-bold mb-4">Multilingual Support</h3>
              <p className="text-muted-foreground text-lg max-w-xl leading-relaxed">
                MediVoice understands medical concerns in Hindi, Marathi, Bengali, Tamil, and 18 other regional languages, ensuring everyone gets help in their mother tongue.
              </p>
            </div>
            
            <div className="glass-card p-10 rounded-3xl group hover:border-primary/40 transition-all duration-500">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-8">
                <Zap className="text-primary w-8 h-8" />
              </div>
              <h3 className="text-2xl font-headline font-bold mb-4">Instant Triage</h3>
              <p className="text-muted-foreground leading-relaxed">
                Immediate analysis of symptoms using deep clinical models trained on millions of data points.
              </p>
            </div>

            <div className="glass-card p-10 rounded-3xl group hover:border-primary/40 transition-all duration-500">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-8">
                <Navigation className="text-primary w-8 h-8" />
              </div>
              <h3 className="text-2xl font-headline font-bold mb-4">Direct Navigation</h3>
              <p className="text-muted-foreground leading-relaxed">
                Seamlessly directs patients to the nearest specialist, ER, or pharmacy based on urgency levels.
              </p>
            </div>

            <div className="glass-card p-10 rounded-3xl md:col-span-2 group hover:border-primary/40 transition-all duration-500">
              <div className="flex flex-col md:flex-row gap-10 items-center">
                <div className="flex-1">
                  <h3 className="text-2xl font-headline font-bold mb-4">Clinical Precision</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Our models are vetted by top clinicians across India, ensuring that AI suggestions are safe, accurate, and contextually relevant to the local environment.
                  </p>
                </div>
                {doctorImage && (
                  <div className="w-full md:w-1/3 aspect-video rounded-2xl overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-700 relative">
                    <Image 
                      src={doctorImage.imageUrl} 
                      alt={doctorImage.description} 
                      fill 
                      className="object-cover" 
                      data-ai-hint={doctorImage.imageHint}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section className="diagonal-cut bg-card/20 py-40 px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-24">
              <h2 className="text-4xl font-headline font-bold mb-4">How it Works</h2>
              <div className="w-24 h-1 bg-primary mx-auto rounded-full"></div>
            </div>
            <div className="relative">
              <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent -translate-y-1/2 hidden md:block"></div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                {[
                  { step: '1', title: 'Speak', desc: 'Simply press the mic and describe your symptoms in your preferred language.' },
                  { step: '2', title: 'Analyze', desc: 'MediVoice AI processes acoustics and clinical intent instantly.' },
                  { step: '3', title: 'Triage', desc: 'Get a severity score: Green (Home Care), Yellow (GP), or Red (ER).' },
                  { step: '4', title: 'Connect', desc: 'Auto-generate a summary and book your nearest clinical appointment.' }
                ].map((item, idx) => (
                  <div key={idx} className="relative text-center group">
                    <div className="w-16 h-16 rounded-full bg-card border-2 border-primary flex items-center justify-center text-primary font-mono text-2xl mx-auto mb-6 z-10 relative group-hover:scale-110 transition-transform">{item.step}</div>
                    <h4 className="font-bold text-xl mb-3">{item.title}</h4>
                    <p className="text-muted-foreground text-sm px-4">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-32 px-8 overflow-hidden">
          <div className="max-w-7xl mx-auto mb-16">
            <h2 className="text-3xl font-headline font-bold">Voices of Trust</h2>
          </div>
          <div className="flex gap-8 overflow-x-auto pb-12 scrollbar-hide snap-x px-4">
            {[
              { 
                quote: '"In emergency wards, every second counts. MediVoice\'s ability to pre-triage patients in regional dialects is a game-changer for urban hospitals."',
                name: 'Dr. Rajesh Malhotra',
                role: 'Head of Emergency, Apollo Delhi',
                img: docPortrait
              },
              { 
                quote: '"I was worried about my daughter\'s fever at midnight. Speaking in Marathi made it so easy to explain, and the AI correctly identified it as a seasonal flu."',
                name: 'Ananya Deshmukh',
                role: 'Parent, Pune',
                img: motherPortrait
              },
              { 
                quote: '"The integration with our clinic management software has reduced our front-desk wait times by nearly 40%. The voice summaries are incredibly precise."',
                name: 'Sarah Williams',
                role: 'Clinic Operations Manager',
                img: adminPortrait
              }
            ].map((t, idx) => (
              <div key={idx} className="min-w-[400px] snap-center glass-card p-8 rounded-3xl flex flex-col justify-between">
                <p className="text-foreground text-lg italic leading-relaxed mb-8">{t.quote}</p>
                <div className="flex items-center gap-4">
                  {t.img && (
                    <div className="w-12 h-12 rounded-full overflow-hidden relative">
                      <Image src={t.img.imageUrl} alt={t.name} fill className="object-cover" />
                    </div>
                  )}
                  <div>
                    <div className="font-bold">{t.name}</div>
                    <div className="text-xs text-primary uppercase font-mono tracking-widest">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 px-8">
          <div className="max-w-5xl mx-auto glass-card rounded-3xl p-12 md:p-24 text-center relative overflow-hidden group">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-[80px] group-hover:bg-primary/20 transition-all duration-700"></div>
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-secondary/10 rounded-full blur-[80px] group-hover:bg-secondary/20 transition-all duration-700"></div>
            <h2 className="text-4xl md:text-5xl font-headline font-bold mb-8 leading-tight">Experience the Future of Triage</h2>
            <p className="text-muted-foreground text-xl mb-12 max-w-2xl mx-auto">
              Join 50+ clinics across India streamlining patient intake and improving care delivery through AI-powered voice diagnostics.
            </p>
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-gradient-to-br from-primary to-secondary text-primary-foreground px-10 py-7 rounded-full font-bold text-xl hover:shadow-2xl hover:shadow-primary/30 transition-all scale-100 hover:scale-105 active:scale-95" asChild>
                <Link href="/triage">Try Demo Now</Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white/10 bg-card/40 px-10 py-7 rounded-full font-bold text-xl hover:bg-card/60 transition-all">
                Talk to Sales
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full border-t border-white/5 bg-background py-16 px-8">
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
              <li><Link href="#" className="text-muted-foreground hover:text-primary transition-colors text-sm">Features</Link></li>
              <li><Link href="/triage" className="text-muted-foreground hover:text-primary transition-colors text-sm">Demo</Link></li>
              <li><Link href="/dashboard" className="text-muted-foreground hover:text-primary transition-colors text-sm">Dashboard</Link></li>
            </ul>
          </div>
          <div className="space-y-6">
            <div className="text-xs font-mono uppercase tracking-widest text-primary">Company</div>
            <ul className="space-y-4 font-medium">
              <li><Link href="#" className="text-muted-foreground hover:text-primary transition-colors text-sm">About Us</Link></li>
              <li><Link href="#" className="text-muted-foreground hover:text-primary transition-colors text-sm">Contact</Link></li>
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
    </div>
  );
}
