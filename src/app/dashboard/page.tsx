
'use client';

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
  Plus,
  Loader2
} from 'lucide-react';
import { useFirestore, useUser, useCollection } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { useMemo } from 'react';
import { format } from 'date-fns';

export default function DashboardPage() {
  const { user } = useUser();
  const db = useFirestore();

  const triageQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'triageSessions'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
  }, [db, user]);

  const { data: historyItems, loading } = useCollection(triageQuery);

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
                  <div className="text-2xl font-bold">{user?.displayName || 'Julian Sterling'}</div>
                  <div className="text-sm text-muted-foreground">UID: {user?.uid.substring(0, 8)}...</div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Status</div>
                    <div className="font-bold text-accent">Active</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Email</div>
                    <div className="font-bold truncate text-xs">{user?.email}</div>
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
                  <span className="text-2xl font-bold font-mono">{historyItems?.length || 0}</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span>Active Sessions</span>
                    <span className="text-primary font-bold">{historyItems?.filter(i => i.status === 'active').length || 0}</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="bg-primary h-full w-[100%]"></div>
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
              {loading && (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-10 h-10 animate-spin text-primary" />
                </div>
              )}
              
              {!loading && historyItems?.length === 0 && (
                <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl">
                  <p className="text-muted-foreground">No sessions found. Start your first voice triage!</p>
                </div>
              )}

              {historyItems?.map((item) => (
                <div key={item.id} className="glass-card p-6 rounded-3xl border border-white/5 hover:border-white/15 transition-all group flex items-center gap-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${getSeverityColor(item.severityScore)}`}>
                    <AlertTriangle className="w-7 h-7" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-lg">{item.severityScore} Alert</span>
                      <Badge variant="outline" className="text-[10px] font-mono border-white/10 uppercase">{item.nativeLanguage}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">{item.translatedTextEnglish}</p>
                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground/60 uppercase tracking-widest">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> 
                        {item.createdAt?.toDate ? format(item.createdAt.toDate(), 'MMM dd, yyyy') : 'Recently'}
                      </span>
                      <span className="text-primary font-bold">Details</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="rounded-xl group-hover:bg-primary/10 transition-colors">
                    <ChevronRight className="w-5 h-5 group-hover:text-primary transition-colors" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
