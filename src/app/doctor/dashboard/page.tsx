
import { Navbar } from '@/components/layout/Navbar';
import { Activity, Phone, Clock, Globe, CheckCircle2, ChevronRight, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function DoctorDashboardPage() {
  const queue = [
    { id: 'PX-9921', score: 8.9, priority: 'High', color: 'border-destructive', symptoms: 'Acute respiratory distress with chest tightness', lang: 'Hindi / English', time: '2m ago' },
    { id: 'PX-8842', score: 5.4, priority: 'Medium', color: 'border-yellow-500', symptoms: 'Persistent abdominal pain with mild nausea', lang: 'Kannada', time: '8m ago' },
    { id: 'PX-7731', score: 2.1, priority: 'Low', color: 'border-accent', symptoms: 'Follow-up on chronic hypertension management', lang: 'English', time: '15m ago' },
    { id: 'PX-9925', score: 9.2, priority: 'High', color: 'border-destructive', symptoms: 'Suspected anaphylaxis following bee sting', lang: 'Telugu / English', time: '1m ago' }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground waveform-bg">
      <Navbar />
      
      <main className="pt-32 pb-12 px-8 max-w-7xl mx-auto">
        <header className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <h1 className="text-4xl font-bold font-headline tracking-tight mb-2">Clinical Oversight</h1>
              <p className="text-muted-foreground">Real-time patient triage queue and systemic vitals.</p>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-2xl border border-white/5">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-primary font-bold">Live Triage Active</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'Active Requests', val: '14', detail: '+2 new', color: 'border-primary' },
              { label: 'Avg Triage Time', val: '3.4m', detail: 'optimized', color: 'border-secondary' },
              { label: 'Doctor Availability', val: '82%', detail: '6 active', color: 'border-primary' }
            ].map((stat, i) => (
              <Card key={i} className={`glass-card rounded-2xl border-l-4 ${stat.color}`}>
                <CardContent className="p-6">
                  <p className="text-[10px] font-mono uppercase text-muted-foreground mb-1 font-bold">{stat.label}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-headline font-bold">{stat.val}</span>
                    <span className="text-xs font-mono text-muted-foreground">{stat.detail}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </header>

        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-headline font-bold">Patient Triage Queue</h2>
            <div className="flex gap-2">
              <Badge variant="outline" className="rounded-full bg-white/5 border-white/10">Filter: All</Badge>
              <Badge variant="outline" className="rounded-full bg-white/5 border-white/10">Sort: Priority</Badge>
            </div>
          </div>

          <div className="space-y-4">
            {queue.map((px) => (
              <div key={px.id} className={`glass-card p-6 rounded-2xl border-l-[6px] ${px.color} flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-2xl hover:border-r-white/20 transition-all group`}>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-primary text-xs font-bold">ID: {px.id}</span>
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded uppercase font-bold border ${px.priority === 'High' ? 'bg-destructive/10 text-destructive border-destructive/20' : px.priority === 'Medium' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 'bg-accent/10 text-accent border-accent/20'}`}>
                      {px.priority} Triage Score: {px.score}
                    </span>
                  </div>
                  <h3 className="text-xl font-headline font-bold group-hover:text-primary transition-colors">{px.symptoms}</h3>
                  <div className="flex gap-4 items-center text-muted-foreground text-xs font-medium">
                    <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {px.lang}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {px.time}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" className="rounded-full border-white/10 hover:bg-white/5">Review Details</Button>
                  <Button className="rounded-full bg-primary text-primary-foreground font-bold flex items-center gap-2 group-hover:scale-105 transition-transform">
                    <Phone className="w-4 h-4" /> Connect to Call
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="glass-card rounded-[2.5rem] border-white/5 p-8">
            <CardHeader className="p-0 mb-6 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-headline font-bold">System Performance</CardTitle>
              <span className="text-[10px] font-mono text-primary font-bold">Live Monitor</span>
            </CardHeader>
            <CardContent className="p-0 space-y-6">
              <div className="relative h-40 w-full bg-background/50 rounded-2xl overflow-hidden border border-white/5">
                <svg className="absolute bottom-0 left-0 w-full h-24" preserveAspectRatio="none" viewBox="0 0 400 100">
                  <path className="stroke-primary opacity-60" d="M0 80 Q 50 20 100 80 T 200 80 T 300 40 T 400 60" fill="none" strokeWidth="2" />
                  <path className="stroke-secondary opacity-30" d="M0 90 Q 50 40 100 90 T 200 90 T 300 50 T 400 70" fill="none" strokeWidth="1" />
                </svg>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Response Latency</p>
                  <p className="font-mono text-xl text-primary font-bold">120ms</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Translation Accuracy</p>
                  <p className="font-mono text-xl text-secondary font-bold">98.4%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4">
            <Card className="glass-card rounded-[2.5rem] border-white/5 p-8 flex-1 relative overflow-hidden">
              <h3 className="text-lg font-headline font-bold mb-6">Urgency Distribution</h3>
              <div className="space-y-6">
                {[
                  { label: 'High Risk', val: '15%', color: 'bg-destructive' },
                  { label: 'Standard', val: '45%', color: 'bg-yellow-500' },
                  { label: 'Monitor', val: '40%', color: 'bg-accent' }
                ].map((item, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="text-foreground">{item.val}</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color}`} style={{ width: item.val }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            <div className="bg-gradient-to-r from-primary/10 to-transparent p-6 rounded-3xl border border-primary/20 flex items-center justify-between">
              <div>
                <p className="font-headline font-bold">Ready for shift hand-off?</p>
                <p className="text-muted-foreground text-xs">Generate summary for Dr. Sarah Chen.</p>
              </div>
              <Button size="sm" className="bg-white/10 hover:bg-white/20 border-primary/30 border text-primary font-bold">Generate</Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
