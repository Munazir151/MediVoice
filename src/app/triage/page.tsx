import { Navbar } from '@/components/layout/Navbar';
import { TriageInterface } from '@/components/triage/TriageInterface';

export default function TriagePage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[150px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[150px]"></div>
      
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-8 pt-32 pb-20 relative z-10 min-h-[calc(100vh-80px)] flex flex-col items-center">
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-4xl md:text-5xl font-headline font-bold">Voice Diagnostic Lab</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">Describe your symptoms in your preferred language. Our clinical AI will assess the severity and provide immediate guidance.</p>
        </div>
        
        <div className="w-full max-w-3xl">
          <TriageInterface />
        </div>
      </main>
    </div>
  );
}
