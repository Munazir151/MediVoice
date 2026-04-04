import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  History, 
  Calendar, 
  ChevronRight, 
  AlertTriangle, 
  Activity, 
  User,
  Plus
} from 'lucide-react';

export default function DashboardPage() {
  const historyItems = [
    { id: 1, date: 'Oct 12, 2024', language: 'Hindi', severity: 'Red', symptoms: 'Severe chest pain, shortness of breath', action: 'ER Recommended' },
    { id: 2, date: 'Sep 28, 2024', language: 'Bengali', severity: 'Yellow', symptoms: 'Persistent high fever, cough', action: 'GP Consultation' },
    { id: 3, date: 'Aug 15, 2024', language: 'Marathi', severity: 'Green', symptoms: 'Mild headache, seasonal allergies', action: 'Home Care' },
    { id: 4, date: 'Jul 04, 2024', language: 'Tamil', severity: 'Green', symptoms: 'Fatigue, minor skin rash', action: 'Observation' },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Red': return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'Yellow': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      case 'Green': return 'bg-accent/20 text-accent border-accent/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-8 pt-32 pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-headline font-bold">Health Dashboard</h1>
            <p className="text-muted-foreground">Manage your voice triage history and clinical recommendations.</p>
          </div>
          <Button asChild className="rounded-full bg-primary text-primary-foreground font-bold px-6 py-6 shadow-xl shadow-primary/10">
            <Link href="/triage" className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              New Triage Session
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Stats */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="glass-card rounded-[2rem] border-white/5">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-mono uppercase tracking-widest text-primary">Patient Profile</CardTitle>
                <User className="text-primary w-5 h-5" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-2xl font-bold">Julian Sterling</div>
                  <div className="text-sm text-muted-foreground">ID: MV-4829-X</div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Blood Type</div>
                    <div className="font-bold">O Positive</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Age</div>
                    <div className="font-bold">32 Years</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card rounded-[2rem] border-white/5">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-mono uppercase tracking-widest text-secondary">Triage Summary</CardTitle>
                <Activity className="text-secondary w-5 h-5" />
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Sessions</span>
                  <span className="text-2xl font-bold font-mono">14</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span>Critical (Red)</span>
                    <span className="text-destructive font-bold">1</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="bg-destructive h-full w-[7%]"></div>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span>Stable (Green)</span>
                    <span className="text-accent font-bold">11</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="bg-accent h-full w-[78%]"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* History List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-5 h-5 text-primary" />
              <h3 className="text-xl font-headline font-bold">Session History</h3>
            </div>
            
            <div className="space-y-4">
              {historyItems.map((item) => (
                <div key={item.id} className="glass-card p-6 rounded-3xl border border-white/5 hover:border-white/15 transition-all group flex items-center gap-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${getSeverityColor(item.severity)}`}>
                    <AlertTriangle className="w-7 h-7" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-lg">{item.severity} Alert</span>
                      <Badge variant="outline" className="text-[10px] font-mono border-white/10 uppercase">{item.language}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">{item.symptoms}</p>
                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground/60 uppercase tracking-widest">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {item.date}</span>
                      <span className="text-primary font-bold">{item.action}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="rounded-xl group-hover:bg-primary/10 transition-colors">
                    <ChevronRight className="w-5 h-5 group-hover:text-primary transition-colors" />
                  </Button>
                </div>
              ))}
            </div>

            <Button variant="ghost" className="w-full py-8 text-muted-foreground hover:text-primary transition-colors font-medium text-sm">
              Load More History
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
