/**
 * Utility functions to extract appointment booking details from patient transcripts
 */

interface ExtractedAppointmentDetails {
  date: string;
  time: string;
  doctorType: string;
  confidence: number; // 0-1 confidence score for extraction accuracy
  wantsBooking: boolean;
}

/**
 * Parse natural language date references (e.g., "today", "tomorrow", "next week") into YYYY-MM-DD format
 */
function extractDate(transcript: string): string {
  const text = transcript.toLowerCase();
  const today = new Date();

  // "today" or "this day"
  if (/\b(today|this\s+day|same\s+day)\b/i.test(text)) {
    return formatDate(today);
  }

  // "tomorrow" or "next day"
  if (/\b(tomorrow|next\s+day)\b/i.test(text)) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDate(tomorrow);
  }

  // "day after tomorrow"
  if (/day\s+after\s+tomorrow/i.test(text)) {
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);
    return formatDate(dayAfter);
  }

  // Days of week (e.g., "Monday", "next Monday")
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < daysOfWeek.length; i++) {
    const dayName = daysOfWeek[i];
    if (new RegExp(`\\b(?:next\\s+)?${dayName}\\b`, 'i').test(text)) {
      const targetDate = new Date(today);
      let daysToAdd = (i - today.getDay() + 7) % 7 || 7; // default to next week if today
      
      // Check if "next" is explicitly mentioned
      if (new RegExp(`next\\s+${dayName}`, 'i').test(text)) {
        daysToAdd = (i - today.getDay() + 7) % 7 || 7;
      } else if (i > today.getDay()) {
        // If day hasn't passed this week, use this week
        daysToAdd = i - today.getDay();
      } else if (i === today.getDay()) {
        // If it's today, we already handled it above
        daysToAdd = 0;
      } else {
        // Day has passed, use next week
        daysToAdd = (i - today.getDay() + 7) % 7 || 7;
      }
      
      targetDate.setDate(targetDate.getDate() + daysToAdd);
      if (targetDate.getTime() > today.getTime()) {
        return formatDate(targetDate);
      }
    }
  }

  // Explicit dates (e.g., "2026-04-15", "April 15", "15th of April")
  const datePatterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
    /(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+(\d{4}))?/i,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        let date: Date;
        if (pattern === datePatterns[0]) {
          date = new Date(`${match[3]}-${match[2]}-${match[1]}`);
        } else if (pattern === datePatterns[1]) {
          date = new Date(`${match[1]}-${match[2]}-${match[3]}`);
        } else {
          // Month name pattern
          const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 
                             'july', 'august', 'september', 'october', 'november', 'december'];
          const monthIndex = monthNames.findIndex(m => text.includes(m));
          const year = match[2] || today.getFullYear();
          date = new Date(year, monthIndex, parseInt(match[1]));
        }

        if (date.getTime() > today.getTime() && !isNaN(date.getTime())) {
          return formatDate(date);
        }
      } catch {
        continue;
      }
    }
  }

  // Default to tomorrow if no date found
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatDate(tomorrow);
}

/**
 * Extract time from transcript (e.g., "7 pm", "14:30", "half past 5")
 */
function extractTime(transcript: string): string {
  const text = transcript.toLowerCase();

  // "7 pm", "19:00", "7:30 pm", etc.
  const timePatterns = [
    /(\d{1,2}):(\d{2})\s*(am|pm)?/i,
    /(\d{1,2})\s*(am|pm)/i,
    /(\d{1,2})\s*(a|p)\b/i,
    /(\d{1,2})\s*o'clock\s*(am|pm)?/i,
  ];

  for (const pattern of timePatterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        let hours = parseInt(match[1]);
        let minutes = match[2] ? parseInt(match[2]) : 0;
        const meridiem = match[3]?.toLowerCase();

        // Handle AM/PM
        if (meridiem === 'pm' && hours < 12) {
          hours += 12;
        } else if (meridiem === 'am' && hours === 12) {
          hours = 0;
        }

        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      } catch {
        continue;
      }
    }
  }

  // Common time phrases
  const timeMap: Record<string, string> = {
    'morning': '09:00',
    'afternoon': '14:00',
    'evening': '18:00',
    'night': '20:00',
    'noon': '12:00',
    'midnight': '00:00',
    'dawn': '06:00',
    'dusk': '18:30',
  };

  for (const [phrase, time] of Object.entries(timeMap)) {
    if (text.includes(phrase)) {
      return time;
    }
  }

  // Default to 10:00 AM if no time found
  return '10:00';
}

/**
 * Map symptoms to appropriate doctor specialties
 */
function symptomsToDoctorType(symptoms: string[], qdrantMatches?: any[]): string {
  // First check Qdrant specialty recommendations
  if (qdrantMatches && qdrantMatches.length > 0) {
    const specialty = qdrantMatches[0].specialty;
    if (specialty) {
      return specialty;
    }
  }

  // Fallback: map symptoms to doctor types
  const symptomLower = (symptoms || []).map(s => s.toLowerCase()).join(' ');
  
  const doctorTypes: Record<string, string[]> = {
    'General Practitioner': ['fever', 'cold', 'cough', 'headache', 'body pain', 'general'],
    'Cardiologist': ['heart', 'chest pain', 'arrhythmia', 'palpitation', 'blood pressure'],
    'Pulmonologist': ['asthma', 'cough', 'breathing', 'lung', 'respiratory', 'wheezing'],
    'Gastroenterologist': ['stomach', 'nausea', 'vomiting', 'diarrhea', 'indigestion', 'abdomen'],
    'Dermatologist': ['skin', 'rash', 'itching', 'acne', 'eczema', 'allergy'],
    'Neurologist': ['headache', 'migraine', 'dizziness', 'seizure', 'neurological'],
    'Orthopedist': ['bone', 'joint', 'fracture', 'pain', 'muscle', 'sprain'],
    'Pediatrician': ['child', 'baby', 'infant', 'pediatric'],
    'Obstetrician': ['pregnancy', 'pregnant', 'maternal', 'obstetric'],
  };

  for (const [doctor, keywords] of Object.entries(doctorTypes)) {
    if (keywords.some(keyword => symptomLower.includes(keyword))) {
      return doctor;
    }
  }

  return 'General Practitioner';
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Main function to extract appointment details from transcript
 */
export function extractAppointmentDetails(
  transcript: string,
  symptoms?: string[],
  qdrantMatches?: any[]
): ExtractedAppointmentDetails {
  if (!transcript || transcript.trim().length === 0) {
    return {
      date: '',
      time: '',
      doctorType: 'General Practitioner',
      confidence: 0,
      wantsBooking: false,
    };
  }

  const loweredTranscript = transcript.toLowerCase();
  const appointmentKeywords = ['book', 'booking', 'appointment', 'schedule', 'visit', 'consultation', 'doctor', 'clinic', 'hospital'];
  const wantsBooking = appointmentKeywords.some((k) => loweredTranscript.includes(k));

  const date = extractDate(transcript);
  const time = extractTime(transcript);
  const doctorType = symptomsToDoctorType(symptoms || [], qdrantMatches);

  // Calculate confidence based on what was found
  let confidence = 0.3; // Base confidence for date/time extraction
  
  // Check if appointment-related keywords are in transcript
  if (wantsBooking) {
    confidence += 0.3;
  }
  
  // Check if time was explicitly mentioned (not defaulted)
  if (!/^10:00$/.test(time) && loweredTranscript.match(/\b\d{1,2}\s*(am|pm|a|p|o'clock|[:]\d{2})\b/i)) {
    confidence += 0.2;
  }
  
  // Check if date was explicitly mentioned
  if (loweredTranscript.match(/\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next\s+\w+)\b/i)) {
    confidence += 0.2;
  }

  return {
    date,
    time,
    doctorType,
    confidence: Math.min(confidence, 1),
    wantsBooking,
  };
}
