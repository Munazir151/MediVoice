
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Mic, 
  Square, 
  Loader2, 
  Globe, 
  Languages, 
  AlertCircle,
  CheckCircle2,
  Navigation,
  ArrowRight
} from 'lucide-react';
import { patientVoiceSymptomCapture } from '@/ai/flows/patient-voice-symptom-capture-flow';
import { clinicalTriageSeverityAssessment } from '@/ai/flows/clinical-triage-severity-assessment-flow';
import type { PatientVoiceSymptomCaptureOutput } from '@/ai/flows/patient-voice-symptom-capture-flow';
import type { ClinicalTriageSeverityAssessmentOutput } from '@/ai/flows/clinical-triage-severity-assessment-flow';
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const LANGUAGES = [
  { name: 'English', code: 'en-US' },
  { name: 'Hindi', code: 'hi-IN' },
  { name: 'Marathi', code: 'mr-IN' },
  { name: 'Bengali', code: 'bn-IN' },
  { name: 'Tamil', code: 'ta-IN' },
  { name: 'Kannada', code: 'kn-IN' },
];

export function TriageInterface() {
  const [step, setStep] = useState<'lang' | 'record' | 'processing' | 'result'>('lang');
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [isRecording, setIsRecording] = useState(false);
  const [result, setResult] = useState<{
    capture: PatientVoiceSymptomCaptureOutput;
    assessment: ClinicalTriageSeverityAssessmentOutput;
  } | null>(null);

  const { user } = useUser();
  const db = useFirestore();

  const startRecording = () => {
    setIsRecording(true);
    setStep('record');
  };

  const stopRecording = async () => {
    setIsRecording(false);
    setStep('processing');
    
    try {
      // Step 1: Capture and Translate
      const captureData = await patientVoiceSymptomCapture({
        audioDataUri: "data:audio/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoK7oEIDgQFC8oEEQvOBCEKCh06Sgj0hREK7oEIDgQFC8oEEQvOBCEKCh06Sgj0hREK7oEIDgQFC8oEEQvOBCEKCh06Sgj0hREK7oEIDgQFC8oEEQvOBCEKCh06Sgj0hREK",
        nativeLanguageCode: selectedLang.code
      });

      // Step 2: Severity Assessment
      const assessmentData = await clinicalTriageSeverityAssessment({
        symptomDescription: captureData.translatedTextEnglish
      });

      setResult({ capture: captureData, assessment: assessmentData });
      
      // Step 3: Persistence - Save to Firestore
      if (user && db) {
        const sessionData = {
          userId: user.uid,
          userName: user.displayName || 'Anonymous Patient',
          nativeLanguage: selectedLang.name,
          transcribedTextNative: captureData.transcribedTextNative,
          translatedTextEnglish: captureData.translatedTextEnglish,
          severityScore: assessmentData.severityScore,
          guidance: assessmentData.guidance,
          createdAt: serverTimestamp(),
          status: 'active'
        };

        const sessionsRef = collection(db, 'triageSessions');
        addDoc(sessionsRef, sessionData).catch(async (error) => {
          const permissionError = new FirestorePermissionError({
            path: 'triageSessions',
            operation: 'create',
            requestResourceData: sessionData,
          });
          errorEmitter.emit('permission-error', permissionError);
        });
      }

      setStep('result');
    } catch (err) {
      console.error(err);
      setStep('lang');
    }
  };

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'Red': return 'text-destructive bg-destructive/10 border-destructive/20';
      case 'Yellow': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'Green': return 'text-accent bg-accent/10 border-accent/20';
      default: return 'text-muted-foreground bg-muted border-muted';
    }
  };

  return (
    <div className="w-full space-y-8">
      {step === 'lang' && (
        <Card className="glass-card rounded-[2.5rem] border-white/5 overflow-hidden animate-in fade-in zoom-in duration-300">
          <CardContent className="p-10 text-center space-y-8">
            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Globe className="text-primary w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-headline font-bold">Select Language</h2>
              <p className="text-muted-foreground">Describe your symptoms in your mother tongue.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setSelectedLang(lang)}
                  className={`p-4 rounded-2xl border transition-all text-sm font-medium ${
                    selectedLang.code === lang.code 
                      ? 'bg-primary/20 border-primary text-primary' 
                      : 'bg-card/50 border-white/5 text-muted-foreground hover:border-white/20'
                  }`}
                >
                  {lang.name}
                </button>
              ))}
            </div>
            <Button 
              className="w-full py-8 rounded-full bg-primary text-primary-foreground font-bold text-lg shadow-xl shadow-primary/10"
              onClick={() => setStep('record')}
            >
              Confirm Selection
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 'record' && (
        <Card className="glass-card rounded-[2.5rem] border-white/5 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CardContent className="p-10 text-center space-y-12">
            <div className="space-y-4">
              <h2 className="text-3xl font-headline font-bold">Listening...</h2>
              <p className="text-muted-foreground">Language: <span className="text-primary font-bold">{selectedLang.name}</span></p>
            </div>

            <div className="relative h-40 flex items-center justify-center gap-2">
              {isRecording ? (
                <>
                  {[...Array(12)].map((_, i) => (
                    <div 
                      key={i}
                      className="w-1.5 bg-primary rounded-full animate-waveform" 
                      style={{ height: `${Math.random() * 80 + 20}%`, animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </>
              ) : (
                <div className="w-full h-[1px] bg-white/10" />
              )}
            </div>

            <div className="flex justify-center gap-6">
              {!isRecording ? (
                <Button 
                  onClick={startRecording}
                  className="w-24 h-24 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-2xl shadow-primary/20 hover:scale-105 transition-transform"
                >
                  <Mic className="w-10 h-10" />
                </Button>
              ) : (
                <Button 
                  onClick={stopRecording}
                  className="w-24 h-24 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-2xl shadow-destructive/20 hover:scale-105 transition-transform"
                >
                  <Square className="w-10 h-10" />
                </Button>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground">
              {isRecording ? "Speak clearly about how you feel" : "Tap the mic to begin speaking"}
            </p>
          </CardContent>
        </Card>
      )}

      {step === 'processing' && (
        <Card className="glass-card rounded-[2.5rem] border-white/5 animate-in fade-in duration-300">
          <CardContent className="p-20 text-center space-y-8">
            <div className="relative">
              <Loader2 className="w-24 h-24 text-primary animate-spin mx-auto opacity-20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Languages className="w-8 h-8 text-primary animate-pulse" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-headline font-bold">Processing Clinical Data</h2>
              <p className="text-muted-foreground">Transcribing, translating, and assessing severity...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'result' && result && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className={`p-8 rounded-[2.5rem] border ${getSeverityStyles(result.assessment.severityScore)}`}>
            <div className="flex items-center gap-4 mb-6">
              <AlertCircle className="w-10 h-10" />
              <div>
                <h2 className="text-3xl font-headline font-bold">{result.assessment.severityScore} Alert</h2>
                <p className="text-sm font-medium opacity-80 uppercase tracking-widest">Urgency Assessment</p>
              </div>
            </div>
            <p className="text-lg leading-relaxed">{result.assessment.guidance}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="glass-card rounded-3xl border-white/5">
              <CardContent className="p-8 space-y-4">
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">Transcription ({selectedLang.name})</div>
                <p className="italic text-muted-foreground">"{result.capture.transcribedTextNative}"</p>
              </CardContent>
            </Card>
            <Card className="glass-card rounded-3xl border-white/5">
              <CardContent className="p-8 space-y-4">
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">Clinical Translation</div>
                <p className="font-medium">"{result.capture.translatedTextEnglish}"</p>
              </CardContent>
            </Card>
          </div>

          <Card className="glass-card rounded-3xl border-white/5 overflow-hidden">
            <CardContent className="p-8 space-y-8">
              <div className="flex items-center gap-3">
                <Navigation className="text-primary w-6 h-6" />
                <h3 className="text-xl font-headline font-bold">Recommended Actions</h3>
              </div>
              <div className="space-y-4">
                {[
                  { title: 'Find Specialists', desc: 'Nearest ENT or General Practitioner vetted by MediVoice.', icon: <CheckCircle2 className="w-5 h-5 text-accent" /> },
                  { title: 'Emergency Contact', desc: 'Auto-share this summary with your nearest hospital.', icon: <CheckCircle2 className="w-5 h-5 text-accent" /> }
                ].map((action, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors cursor-pointer group">
                    <div className="mt-1">{action.icon}</div>
                    <div className="flex-1">
                      <h4 className="font-bold">{action.title}</h4>
                      <p className="text-sm text-muted-foreground">{action.desc}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors mt-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button 
            variant="ghost" 
            className="w-full text-muted-foreground hover:text-primary transition-colors py-8"
            onClick={() => setStep('lang')}
          >
            Start Another Triage
          </Button>
        </div>
      )}
    </div>
  );
}
