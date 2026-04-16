export type ClinicDirectoryItem = {
  id: string;
  name: string;
  specialty: string;
  schemesAccepted: string[];
  address: string;
  lat: number;
  lng: number;
};

export const SCHEME_OPTIONS = [
  'Any',
  'Ayushman Bharat (PM-JAY)',
  'ESIC',
  'CGHS',
  'State Health Scheme',
] as const;

export const CLINIC_DIRECTORY: ClinicDirectoryItem[] = [
  {
    id: 'clinic-1',
    name: 'MediVoice Prime Clinic',
    specialty: 'General Practitioner',
    schemesAccepted: ['Ayushman Bharat (PM-JAY)', 'State Health Scheme'],
    address: 'MG Road, Bengaluru',
    lat: 12.9759,
    lng: 77.6046,
  },
  {
    id: 'clinic-2',
    name: 'HeartLine Specialty Center',
    specialty: 'Cardiologist',
    schemesAccepted: ['CGHS', 'Ayushman Bharat (PM-JAY)'],
    address: 'Indiranagar, Bengaluru',
    lat: 12.9718,
    lng: 77.6412,
  },
  {
    id: 'clinic-3',
    name: 'Lung & Allergy Institute',
    specialty: 'Pulmonologist',
    schemesAccepted: ['ESIC', 'State Health Scheme'],
    address: 'Jayanagar, Bengaluru',
    lat: 12.9293,
    lng: 77.5800,
  },
  {
    id: 'clinic-4',
    name: 'Digestive Health Clinic',
    specialty: 'Gastroenterologist',
    schemesAccepted: ['Ayushman Bharat (PM-JAY)', 'ESIC'],
    address: 'Koramangala, Bengaluru',
    lat: 12.9352,
    lng: 77.6245,
  },
  {
    id: 'clinic-5',
    name: 'NeuroCare Associates',
    specialty: 'Neurologist',
    schemesAccepted: ['CGHS', 'State Health Scheme'],
    address: 'Malleshwaram, Bengaluru',
    lat: 13.0012,
    lng: 77.5703,
  },
  {
    id: 'clinic-6',
    name: 'Voice & ENT Clinic',
    specialty: 'ENT Specialist',
    schemesAccepted: ['Ayushman Bharat (PM-JAY)', 'ESIC'],
    address: 'HSR Layout, Bengaluru',
    lat: 12.9116,
    lng: 77.6473,
  },
  {
    id: 'clinic-8',
    name: 'BrightSight Eye Care',
    specialty: 'Ophthalmologist',
    schemesAccepted: ['Ayushman Bharat (PM-JAY)', 'State Health Scheme'],
    address: 'Indiranagar, Bengaluru',
    lat: 12.9712,
    lng: 77.6416,
  },
  {
    id: 'clinic-7',
    name: 'CityCare Family Center',
    specialty: 'General Practitioner',
    schemesAccepted: ['ESIC', 'CGHS', 'State Health Scheme'],
    address: 'Rajajinagar, Bengaluru',
    lat: 12.9916,
    lng: 77.5544,
  },
];
