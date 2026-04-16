'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFirestore, useUser } from '@/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Save, Loader2 } from 'lucide-react';

export type PatientHealthProfile = {
  age: number | null;
  gender: 'male' | 'female' | 'other' | null;
  pregnancy: boolean;
  chronicDiseases: string[];
  allergies: string[];
  currentMedications: string[];
  updatedAt?: Date;
};

const CHRONIC_DISEASE_OPTIONS = [
  'Hypertension',
  'Diabetes',
  'Asthma',
  'COPD',
  'Heart Disease',
  'Kidney Disease',
  'Liver Disease',
  'Cancer',
  'Arthritis',
  'Thyroid Disease',
  'Migraine',
];

export function PatientHealthProfile() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<PatientHealthProfile>({
    age: null,
    gender: null,
    pregnancy: false,
    chronicDiseases: [],
    allergies: [],
    currentMedications: [],
  });

  const [tempAllergy, setTempAllergy] = useState('');
  const [tempMedication, setTempMedication] = useState('');
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (!db || !user?.uid) {
        console.log('Skipping profile load: db or user?.uid missing', { db: !!db, uid: user?.uid });
        setLoading(false);
        return;
      }
      try {
        console.log('Loading patient profile for user:', user.uid);
        const docRef = doc(db, 'patientProfiles', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          console.log('Profile found:', docSnap.data());
          setProfile({
            ...docSnap.data(),
            pregnancy: docSnap.data().pregnancy ?? false,
          } as PatientHealthProfile);
        } else {
          console.log('No profile found for user, using defaults');
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [db, user?.uid]);

  const handleSave = async () => {
    if (!db || !user?.uid) {
      console.error('Missing db or user:', { db: !!db, uid: user?.uid });
      toast({ variant: 'destructive', description: 'Firebase not initialized or user not authenticated.' });
      return;
    }
    if (profile.age === null || profile.age < 1 || profile.age > 150) {
      toast({ variant: 'destructive', description: 'Please enter a valid age (1-150).' });
      return;
    }

    setSaving(true);
    try {
      console.log('Saving patient profile:', { userId: user.uid, profile });
      const docRef = doc(db, 'patientProfiles', user.uid);
      await setDoc(docRef, {
        ...profile,
        updatedAt: new Date(),
      }, { merge: true });
      console.log('Profile saved successfully');
      setEditMode(false);
      toast({ description: 'Health profile saved successfully.' });
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast({ variant: 'destructive', description: `Failed to save profile: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
      setSaving(false);
    }
  };

  const addAllergy = () => {
    if (!tempAllergy.trim()) return;
    setProfile({
      ...profile,
      allergies: [...profile.allergies, tempAllergy.trim()],
    });
    setTempAllergy('');
  };

  const removeAllergy = (index: number) => {
    setProfile({
      ...profile,
      allergies: profile.allergies.filter((_, i) => i !== index),
    });
  };

  const addMedication = () => {
    if (!tempMedication.trim()) return;
    setProfile({
      ...profile,
      currentMedications: [...profile.currentMedications, tempMedication.trim()],
    });
    setTempMedication('');
  };

  const removeMedication = (index: number) => {
    setProfile({
      ...profile,
      currentMedications: profile.currentMedications.filter((_, i) => i !== index),
    });
  };

  const toggleChronicDisease = (disease: string) => {
    setProfile({
      ...profile,
      chronicDiseases: profile.chronicDiseases.includes(disease)
        ? profile.chronicDiseases.filter((d) => d !== disease)
        : [...profile.chronicDiseases, disease],
    });
  };

  if (loading) {
    return (
      <Card className="glass-card rounded-3xl border-white/5">
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card rounded-3xl border-white/5">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg font-headline font-bold">Health Profile for Medicine Safety</CardTitle>
        <AlertCircle className="w-5 h-5 text-amber-500" />
      </CardHeader>
      <CardContent className="space-y-6">
        {!editMode ? (
          <>
            <div className="rounded-xl border border-white/10 bg-card/40 p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Age</p>
                  <p className="text-lg font-bold">{profile.age ?? 'Not set'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Gender</p>
                  <p className="text-lg font-bold capitalize">{profile.gender ?? 'Not set'}</p>
                </div>
              </div>
              {profile.pregnancy && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                  <p className="text-xs text-amber-500 font-semibold">⚠ Pregnant: Some medicines avoided</p>
                </div>
              )}
            </div>

            {profile.chronicDiseases.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-card/40 p-4">
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">Chronic Conditions</p>
                <div className="flex flex-wrap gap-2">
                  {profile.chronicDiseases.map((disease) => (
                    <span key={disease} className="rounded-md bg-primary/20 px-2 py-1 text-xs font-medium text-primary">
                      {disease}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {profile.allergies.length > 0 && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
                <p className="text-[10px] font-mono uppercase tracking-widest text-destructive mb-3">Known Allergies</p>
                <div className="flex flex-wrap gap-2">
                  {profile.allergies.map((allergy, idx) => (
                    <span key={idx} className="rounded-md bg-destructive/20 px-2 py-1 text-xs font-medium text-destructive">
                      {allergy}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {profile.currentMedications.length > 0 && (
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
                <p className="text-[10px] font-mono uppercase tracking-widest text-blue-500 mb-3">Current Medications</p>
                <div className="space-y-1">
                  {profile.currentMedications.map((med, idx) => (
                    <p key={idx} className="text-xs text-blue-500">• {med}</p>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={() => setEditMode(true)} className="w-full">
              Edit Health Profile
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-4">
              <label className="space-y-2 block">
                <span className="text-sm font-medium">Age</span>
                <input
                  type="number"
                  min="1"
                  max="150"
                  value={profile.age ?? ''}
                  onChange={(e) => setProfile({ ...profile, age: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Enter your age"
                />
              </label>

              <label className="space-y-2 block">
                <span className="text-sm font-medium">Gender</span>
                <select
                  value={profile.gender ?? ''}
                  onChange={(e) => setProfile({ ...profile, gender: e.target.value as any || null })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </label>

              {profile.gender === 'female' && (
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={profile.pregnancy}
                    onChange={(e) => setProfile({ ...profile, pregnancy: e.target.checked })}
                    className="w-4 h-4 rounded border-border"
                  />
                  <span className="text-sm font-medium">Currently Pregnant</span>
                </label>
              )}

              <div className="space-y-2">
                <span className="text-sm font-medium block">Chronic Conditions (select all that apply)</span>
                <div className="grid grid-cols-2 gap-2">
                  {CHRONIC_DISEASE_OPTIONS.map((disease) => (
                    <label key={disease} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profile.chronicDiseases.includes(disease)}
                        onChange={() => toggleChronicDisease(disease)}
                        className="w-4 h-4 rounded border-border"
                      />
                      <span className="text-xs">{disease}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-sm font-medium block">Known Allergies</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tempAllergy}
                    onChange={(e) => setTempAllergy(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addAllergy()}
                    placeholder="e.g., Penicillin, Aspirin"
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                  <Button variant="secondary" onClick={addAllergy} className="px-4">Add</Button>
                </div>
                {profile.allergies.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {profile.allergies.map((allergy, idx) => (
                      <span key={idx} className="rounded-md bg-destructive/20 px-2 py-1 text-xs flex items-center gap-1">
                        {allergy}
                        <button
                          onClick={() => removeAllergy(idx)}
                          className="ml-1 text-destructive hover:font-bold"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <span className="text-sm font-medium block">Current Medications</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tempMedication}
                    onChange={(e) => setTempMedication(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addMedication()}
                    placeholder="e.g., Ibuprofen, Metformin"
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                  <Button variant="secondary" onClick={addMedication} className="px-4">Add</Button>
                </div>
                {profile.currentMedications.length > 0 && (
                  <div className="space-y-1">
                    {profile.currentMedications.map((med, idx) => (
                      <div key={idx} className="flex items-center justify-between rounded-md bg-blue-500/10 px-3 py-2 text-sm">
                        <span>{med}</span>
                        <button
                          onClick={() => removeMedication(idx)}
                          className="text-blue-500 hover:font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setEditMode(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 gap-2">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Profile
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
