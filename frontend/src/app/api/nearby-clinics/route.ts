import { NextResponse } from 'next/server';

const SCHEMES = [
  'Ayushman Bharat (PM-JAY)',
  'ESIC',
  'CGHS',
  'State Health Scheme',
] as const;

type NearbyClinic = {
  id: string;
  name: string;
  specialty: string;
  schemesAccepted: string[];
  address: string;
  lat: number;
  lng: number;
  distanceKm: number;
};

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function distanceKm(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const haversine =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const arc = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return earthRadiusKm * arc;
}

function inferSchemesFromTags(tags: Record<string, string>, name: string) {
  const text = `${name} ${Object.values(tags).join(' ')}`.toLowerCase();
  const schemes: string[] = [];

  if (text.includes('cghs')) {
    schemes.push('CGHS');
  }
  if (text.includes('esic') || text.includes('employee state insurance')) {
    schemes.push('ESIC');
  }
  if (text.includes('pm-jay') || text.includes('ayushman')) {
    schemes.push('Ayushman Bharat (PM-JAY)');
  }

  return schemes;
}

function normalizeSpecialtyFromTags(tags: Record<string, string>, requestedSpecialty: string) {
  const requested = requestedSpecialty.trim();
  const text = `${tags.amenity ?? ''} ${tags.healthcare ?? ''} ${tags.healthcare_speciality ?? ''} ${tags.speciality ?? ''}`.toLowerCase();

  if (requested === 'General Practitioner') {
    return text.includes('hospital') ? 'Hospital' : 'General Practitioner';
  }

  if (requested === 'Pulmonologist' && (text.includes('pulm') || text.includes('respir') || text.includes('chest'))) {
    return 'Pulmonologist';
  }
  if (requested === 'Cardiologist' && text.includes('cardio')) {
    return 'Cardiologist';
  }
  if (requested === 'Gastroenterologist' && (text.includes('gastro') || text.includes('digest'))) {
    return 'Gastroenterologist';
  }
  if (requested === 'Neurologist' && text.includes('neuro')) {
    return 'Neurologist';
  }
  if (requested === 'ENT Specialist' && (text.includes('ent') || text.includes('otolaryng'))) {
    return 'ENT Specialist';
  }

  return text.includes('hospital') ? 'Hospital' : requested;
}

function buildAddress(tags: Record<string, string>) {
  const parts = [
    tags['addr:housename'],
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:suburb'],
    tags['addr:city'],
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(', ') : 'Address not available';
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get('lat'));
  const lng = Number(url.searchParams.get('lng'));
  const specialty = (url.searchParams.get('specialty') || 'General Practitioner').trim();
  const scheme = (url.searchParams.get('scheme') || 'Any').trim();
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 3), 1), 10);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'Invalid coordinates.' }, { status: 400 });
  }

  const overpassQuery = `
    [out:json][timeout:25];
    (
      node(around:12000,${lat},${lng})[amenity~"hospital|clinic|doctors"];
      way(around:12000,${lat},${lng})[amenity~"hospital|clinic|doctors"];
      relation(around:12000,${lat},${lng})[amenity~"hospital|clinic|doctors"];
      node(around:12000,${lat},${lng})[healthcare~"hospital|clinic|doctor"];
      way(around:12000,${lat},${lng})[healthcare~"hospital|clinic|doctor"];
      relation(around:12000,${lat},${lng})[healthcare~"hospital|clinic|doctor"];
    );
    out center tags 60;
  `;

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      body: `data=${encodeURIComponent(overpassQuery)}`,
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json({ clinics: [] }, { status: 200 });
    }

    const data = (await response.json()) as { elements?: Array<any> };
    const elements = Array.isArray(data?.elements) ? data.elements : [];

    const clinics: NearbyClinic[] = elements
      .map((item, index) => {
        const itemLat = Number(item?.lat ?? item?.center?.lat);
        const itemLng = Number(item?.lon ?? item?.center?.lon);
        if (!Number.isFinite(itemLat) || !Number.isFinite(itemLng)) {
          return null;
        }

        const tags = (item?.tags ?? {}) as Record<string, string>;
        const name = String(tags.name || tags['name:en'] || `Healthcare facility ${index + 1}`).trim();
        if (!name || name.toLowerCase() === 'unknown') {
          return null;
        }

        const address = buildAddress(tags);
        const schemesAccepted = inferSchemesFromTags(tags, name);
        const normalizedSpecialty = normalizeSpecialtyFromTags(tags, specialty);

        const specialtyNeedle = specialty.toLowerCase();
        const specialtyText = `${name} ${tags.healthcare_speciality ?? ''} ${tags.speciality ?? ''}`.toLowerCase();
        const isGeneral = specialtyNeedle.includes('general');
        const specialtyMatch = isGeneral || specialtyText.includes(specialtyNeedle.split(' ')[0]);
        const hospitalOrClinic = (tags.amenity || tags.healthcare || '').toLowerCase();
        const isHealthcarePOI = hospitalOrClinic.includes('hospital') || hospitalOrClinic.includes('clinic') || hospitalOrClinic.includes('doctor');
        if (!isHealthcarePOI) {
          return null;
        }

        if (!specialtyMatch && !isGeneral && !hospitalOrClinic.includes('hospital')) {
          return null;
        }

        return {
          id: String(item?.id || `${name}-${index}`),
          name,
          specialty: normalizedSpecialty,
          schemesAccepted,
          address,
          lat: itemLat,
          lng: itemLng,
          distanceKm: distanceKm({ lat, lng }, { lat: itemLat, lng: itemLng }),
        };
      })
      .filter((clinic): clinic is NearbyClinic => clinic !== null)
      .filter((clinic) => scheme === 'Any' || clinic.schemesAccepted.includes(scheme))
      .filter((clinic, index, all) => all.findIndex((item) => item.name.toLowerCase() === clinic.name.toLowerCase()) === index)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit);

    return NextResponse.json({ clinics });
  } catch {
    return NextResponse.json({ clinics: [] }, { status: 200 });
  }
}
