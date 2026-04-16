
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PatientHealthProfile } from '@/components/patient/PatientHealthProfile';
import { 
  History, 
  Calendar, 
  ChevronRight, 
  AlertTriangle, 
  Activity, 
  User,
  Plus,
  Loader2,
  FileText
} from 'lucide-react';
import { useFirestore, useUser, useCollection } from '@/firebase';
import { collection, limit, query, where } from 'firebase/firestore';
import { useMemo } from 'react';
import { format } from 'date-fns';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useUser();
  const db = useFirestore();

  const triageQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'triageSessions'),
      where('userId', '==', user.uid),
      limit(100)
    );
  }, [db, user]);

  const bookingsQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'appointments'),
      where('userId', '==', user.uid),
      limit(100)
    );
  }, [db, user]);

  const { data: historyItems, loading, error } = useCollection(triageQuery);
  const { data: bookingItems, loading: bookingsLoading, error: bookingsError } = useCollection(bookingsQuery);

  const sortedHistoryItems = useMemo(() => {
    return [...(historyItems ?? [])].sort((a: any, b: any) => {
      const aSec = Number(a?.createdAt?.seconds ?? 0);
      const bSec = Number(b?.createdAt?.seconds ?? 0);
      return bSec - aSec;
    });
  }, [historyItems]);

  const sortedBookings = useMemo(() => {
    return [...(bookingItems ?? [])].sort((a: any, b: any) => {
      const aSec = Number(a?.createdAt?.seconds ?? 0);
      const bSec = Number(b?.createdAt?.seconds ?? 0);
      return bSec - aSec;
    });
  }, [bookingItems]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Red': return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'Yellow': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      case 'Green': return 'bg-accent/20 text-accent border-accent/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const buildSessionDocument = (item: any) => {
    const lines: string[] = [];
    lines.push('# Doctor Handoff Document');
    lines.push('');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');
    lines.push('## Session Summary');
    lines.push(`- Severity: ${item.severityScore ?? 'Unknown'}`);
    lines.push(`- Language: ${item.nativeLanguage ?? 'Unknown'}`);
    if (item.problem) {
      lines.push(`- Problem: ${item.problem}`);
    }
    lines.push('');

    if (item.summary) {
      lines.push('## Clinical Summary');
      lines.push(item.summary);
      lines.push('');
    }

    if (Array.isArray(item.redFlags) && item.redFlags.length > 0) {
      lines.push('## Red Flags');
      item.redFlags.forEach((flag: string) => {
        lines.push(`- ${flag}`);
      });
      lines.push('');
    }

    if (item.guidance) {
      lines.push('## Guidance');
      lines.push(item.guidance);
      lines.push('');
    }

    if (item.translatedTextEnglish) {
      lines.push('## Transcript (English)');
      lines.push(item.translatedTextEnglish);
      lines.push('');
    }

    if (item.transcribedTextNative && item.transcribedTextNative !== item.translatedTextEnglish) {
      lines.push('## Transcript (Native)');
      lines.push(item.transcribedTextNative);
      lines.push('');
    }

    return lines.join('\n').trim();
  };

  const downloadSessionDocument = (item: any) => {
    const content = buildSessionDocument(item);
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `session-handoff-${item.id ?? Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const buildBookingDocument = (booking: any) => {
    const lines: string[] = [];
    lines.push('# Appointment Booking Record');
    lines.push('');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');
    lines.push('## Booking Details');
    lines.push(`- Status: ${booking.status ?? 'booked'}`);
    lines.push(`- Doctor name: ${booking.doctorName ?? 'Not set'}`);
    lines.push(`- Doctor type: ${booking.doctorType ?? 'General Practitioner'}`);
    lines.push(`- Clinic: ${booking.clinicName ?? 'Not set'}`);
    lines.push(`- Date: ${booking.bookingDate ?? 'Not set'}`);
    lines.push(`- Time: ${booking.bookingTime ?? 'Not set'}`);
    lines.push('');

    if (booking.problem || booking.severityScore || booking.summary) {
      lines.push('## Linked Clinical Context');
      if (booking.problem) lines.push(`- Problem: ${booking.problem}`);
      if (booking.severityScore) lines.push(`- Severity: ${booking.severityScore}`);
      if (booking.summary) lines.push(`- Summary: ${booking.summary}`);
      lines.push('');
    }

    if (booking.transcriptEnglish) {
      lines.push('## Transcript (English)');
      lines.push(String(booking.transcriptEnglish));
      lines.push('');
    }

    return lines.join('\n').trim();
  };

  const downloadBookingDocument = (booking: any) => {
    const content = buildBookingDocument(booking);
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `booking-record-${booking.id ?? Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative isolate min-h-screen">
      <Navbar />
      
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 sm:pt-32 pb-16 sm:pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 sm:mb-12 gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-headline font-bold">Health Dashboard</h1>
            <p className="text-muted-foreground">Manage your voice triage history and clinical recommendations.</p>
          </div>
          <Button asChild className="w-full sm:w-auto rounded-full bg-primary text-primary-foreground font-bold px-6 py-6 shadow-xl shadow-primary/10">
            <Link href="/triage" className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              New Triage Session
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/5">
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
                  <span className="text-2xl font-bold font-mono">{sortedHistoryItems.length || 0}</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span>Active Sessions</span>
                    <span className="text-primary font-bold">{sortedHistoryItems.filter((i: any) => i.status === 'active').length || 0}</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="bg-primary h-full w-[100%]"></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <PatientHealthProfile />
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

              {!loading && error && (
                <div className="text-center py-6 border border-dashed border-destructive/30 rounded-3xl">
                  <p className="text-destructive text-sm">Unable to load session history right now.</p>
                  <p className="text-muted-foreground text-xs mt-1">{error.message}</p>
                </div>
              )}

              {sortedHistoryItems.map((item: any) => (
                <div
                  key={item.id}
                  className="glass-card p-4 sm:p-6 rounded-3xl border border-white/5 hover:border-white/15 transition-all group flex cursor-pointer flex-col sm:flex-row sm:items-center gap-4 sm:gap-6"
                  onClick={() => router.push(`/triage?sessionId=${item.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      router.push(`/triage?sessionId=${item.id}`);
                    }
                  }}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${getSeverityColor(item.severityScore)}`}>
                    <AlertTriangle className="w-7 h-7" />
                  </div>
                  <div className="flex-1 space-y-1 min-w-0">
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
                  <div className="self-end sm:self-auto flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={(event) => {
                        event.stopPropagation();
                        downloadSessionDocument(item);
                      }}
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      Get Document
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-xl group-hover:bg-primary/10 transition-colors"
                      onClick={(event) => {
                        event.stopPropagation();
                        router.push(`/triage?sessionId=${item.id}`);
                      }}
                    >
                      <ChevronRight className="w-5 h-5 group-hover:text-primary transition-colors" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 mb-4 mt-8">
              <Calendar className="w-5 h-5 text-primary" />
              <h3 className="text-xl font-headline font-bold">Booking History</h3>
            </div>

            <div className="space-y-4">
              {bookingsLoading && (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              )}

              {!bookingsLoading && sortedBookings.length === 0 && (
                <div className="text-center py-10 border border-dashed border-white/10 rounded-3xl">
                  <p className="text-muted-foreground">No bookings yet. Book an appointment from triage results.</p>
                </div>
              )}

              {!bookingsLoading && bookingsError && (
                <div className="text-center py-6 border border-dashed border-destructive/30 rounded-3xl">
                  <p className="text-destructive text-sm">Unable to load bookings right now.</p>
                  <p className="text-muted-foreground text-xs mt-1">{bookingsError.message}</p>
                </div>
              )}

              {sortedBookings.map((booking: any) => (
                <div key={booking.id} className="glass-card p-4 sm:p-5 rounded-3xl border border-white/5 hover:border-white/15 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base">{booking.doctorName || 'Doctor not set'}</span>
                        <Badge variant="outline" className="text-[10px] font-mono border-white/10 uppercase">{booking.status || 'booked'}</Badge>
                        {booking.severityScore && (
                          <Badge variant="outline" className="text-[10px] font-mono border-white/10 uppercase">{booking.severityScore}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{booking.doctorType || 'General Practitioner'} • {booking.clinicName || 'Clinic not set'}</p>
                      <p className="text-xs text-muted-foreground/70">{booking.bookingDate || 'Date not set'} at {booking.bookingTime || 'Time not set'}</p>
                      <p className="text-[11px] text-muted-foreground/60">
                        Created: {booking.createdAt?.toDate ? format(booking.createdAt.toDate(), 'MMM dd, yyyy • hh:mm a') : 'Recently'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                        onClick={() => downloadBookingDocument(booking)}
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        Get Record
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
