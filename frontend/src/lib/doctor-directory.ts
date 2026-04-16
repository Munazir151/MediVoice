export type DoctorDirectoryItem = {
  id: string;
  name: string;
  specialty: string;
  clinicName: string;
  city: string;
  availableTimes: string[];
};

const DOCTOR_DIRECTORY: DoctorDirectoryItem[] = [
  {
    id: 'gp-1',
    name: 'Dr. Ananya Rao',
    specialty: 'General Practitioner',
    clinicName: 'MediVoice Prime Clinic',
    city: 'Bengaluru',
    availableTimes: ['09:30', '10:00', '11:30', '16:00', '18:00'],
  },
  {
    id: 'gp-2',
    name: 'Dr. Vivek Sharma',
    specialty: 'General Practitioner',
    clinicName: 'CityCare Family Center',
    city: 'Bengaluru',
    availableTimes: ['10:30', '12:00', '15:30', '17:00'],
  },
  {
    id: 'pulm-1',
    name: 'Dr. Kavya Iyer',
    specialty: 'Pulmonologist',
    clinicName: 'Lung & Allergy Institute',
    city: 'Bengaluru',
    availableTimes: ['09:00', '11:00', '14:30', '18:30'],
  },
  {
    id: 'card-1',
    name: 'Dr. Rohan Mehta',
    specialty: 'Cardiologist',
    clinicName: 'HeartLine Specialty Center',
    city: 'Bengaluru',
    availableTimes: ['10:00', '13:00', '16:30'],
  },
  {
    id: 'gastro-1',
    name: 'Dr. Priyanka Nair',
    specialty: 'Gastroenterologist',
    clinicName: 'Digestive Health Clinic',
    city: 'Bengaluru',
    availableTimes: ['09:45', '12:15', '17:15'],
  },
  {
    id: 'neuro-1',
    name: 'Dr. Arjun Kulkarni',
    specialty: 'Neurologist',
    clinicName: 'NeuroCare Associates',
    city: 'Bengaluru',
    availableTimes: ['10:15', '14:00', '18:15'],
  },
  {
    id: 'ent-1',
    name: 'Dr. Sneha Patil',
    specialty: 'ENT Specialist',
    clinicName: 'Voice & ENT Clinic',
    city: 'Bengaluru',
    availableTimes: ['09:30', '11:45', '15:45', '19:00'],
  },
];

export function getDoctorsBySpecialty(specialty: string): DoctorDirectoryItem[] {
  const normalized = specialty.trim().toLowerCase();
  const exact = DOCTOR_DIRECTORY.filter((doctor) => doctor.specialty.toLowerCase() === normalized);
  if (exact.length > 0) {
    return exact;
  }
  return DOCTOR_DIRECTORY.filter((doctor) => doctor.specialty === 'General Practitioner');
}

export function getSuggestedDoctor(specialty: string): DoctorDirectoryItem {
  const doctors = getDoctorsBySpecialty(specialty);
  return doctors[0];
}

export function getSlotsForSpecialty(specialty: string): string[] {
  const doctors = getDoctorsBySpecialty(specialty);
  const merged = doctors.flatMap((doctor) => doctor.availableTimes);
  return [...new Set(merged)].sort();
}

export function getDoctorByName(name: string): DoctorDirectoryItem | null {
  const normalized = name.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  return DOCTOR_DIRECTORY.find((doctor) => doctor.name.toLowerCase() === normalized) ?? null;
}
