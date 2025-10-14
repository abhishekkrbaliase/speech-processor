/**
 * Transcription Utilities
 * Post-processing functions to improve transcription accuracy
 */

export interface TranscriptionCorrection {
  original: string;
  corrected: string;
  confidence: number;
  corrections: string[];
}

/**
 * Apply post-processing corrections to transcription text
 */
export function correctTranscription(text: string, confidence: number): TranscriptionCorrection {
  let corrected = text;
  const corrections: string[] = [];
  
  // Apply time format corrections
  const timeResult = correctTimeFormats(corrected);
  corrected = timeResult.text;
  corrections.push(...timeResult.corrections);
  
  // Apply date format corrections
  const dateResult = correctDateFormats(corrected);
  corrected = dateResult.text;
  corrections.push(...dateResult.corrections);
  
  // Apply common word corrections
  const wordResult = correctCommonWords(corrected);
  corrected = wordResult.text;
  corrections.push(...wordResult.corrections);
  
  return {
    original: text,
    corrected,
    confidence,
    corrections
  };
}

/**
 * Correct common time format issues
 */
function correctTimeFormats(text: string): { text: string; corrections: string[] } {
  let corrected = text;
  const corrections: string[] = [];
  
  // Fix "11, 4:00 p.m." -> "11:04 PM"
  const timePattern1 = /(\d{1,2}),\s*(\d{1,2}):00\s*(p\.?m\.?|a\.?m\.?)/gi;
  corrected = corrected.replace(timePattern1, (match, hours, minutes, ampm) => {
    const correction = `${hours}:${minutes.padStart(2, '0')} ${ampm.toUpperCase().replace(/\./g, '')}`;
    corrections.push(`Time format: "${match}" → "${correction}"`);
    return correction;
  });
  
  // Fix "eleven, four p.m." -> "11:04 PM"
  const timePattern2 = /(eleven|twelve|one|two|three|four|five|six|seven|eight|nine|ten),\s*(oh\s+)?(zero\s+)?(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty)\s*(p\.?m\.?|a\.?m\.?)/gi;
  corrected = corrected.replace(timePattern2, (match, hours, oh, zero, minutes, ampm) => {
    const hourNum = wordToNumber(hours);
    const minNum = wordToNumber(minutes);
    if (hourNum !== null && minNum !== null) {
      const correction = `${hourNum}:${minNum.toString().padStart(2, '0')} ${ampm.toUpperCase().replace(/\./g, '')}`;
      corrections.push(`Time format: "${match}" → "${correction}"`);
      return correction;
    }
    return match;
  });
  
  // Fix "11 4 PM" -> "11:04 PM"
  const timePattern3 = /(\d{1,2})\s+(\d{1,2})\s+(p\.?m\.?|a\.?m\.?)/gi;
  corrected = corrected.replace(timePattern3, (match, hours, minutes, ampm) => {
    if (parseInt(minutes) < 60) {
      const correction = `${hours}:${minutes.padStart(2, '0')} ${ampm.toUpperCase().replace(/\./g, '')}`;
      corrections.push(`Time format: "${match}" → "${correction}"`);
      return correction;
    }
    return match;
  });
  
  // Standardize AM/PM
  corrected = corrected.replace(/\b(a\.?m\.?|p\.?m\.?)\b/gi, (match) => {
    const standardized = match.toLowerCase().includes('a') ? 'AM' : 'PM';
    if (match !== standardized) {
      corrections.push(`AM/PM format: "${match}" → "${standardized}"`);
    }
    return standardized;
  });
  
  return { text: corrected, corrections };
}

/**
 * Correct common date format issues
 */
function correctDateFormats(text: string): { text: string; corrections: string[] } {
  let corrected = text;
  const corrections: string[] = [];
  
  // Fix ordinal words to numbers for date format (e.g., "first October" -> "1 October")
  const ordinalToNumberPattern = /\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|thirteenth|fourteenth|fifteenth|sixteenth|seventeenth|eighteenth|nineteenth|twentieth|twenty first|twenty second|twenty third|twenty fourth|twenty fifth|twenty sixth|twenty seventh|twenty eighth|twenty ninth|thirtieth|thirty first)\s+(January|February|March|April|May|June|July|August|September|October|November|December)/gi;
  corrected = corrected.replace(ordinalToNumberPattern, (match, ordinalWord, month) => {
    const dayNumber = wordToNumber(ordinalWord.toLowerCase());
    if (dayNumber !== null) {
      const correction = `${dayNumber} ${month}`;
      corrections.push(`Date format: "${match}" → "${correction}"`);
      return correction;
    }
    return match;
  });
  
  // Fix ordinal numbers (1st, 2nd, 3rd, etc.) - only when not followed by month names
  const ordinalPattern = /\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|thirteenth|fourteenth|fifteenth|sixteenth|seventeenth|eighteenth|nineteenth|twentieth|twenty first|twenty second|twenty third|twenty fourth|twenty fifth|twenty sixth|twenty seventh|twenty eighth|twenty ninth|thirtieth|thirty first)\b(?!\s+(January|February|March|April|May|June|July|August|September|October|November|December))/gi;
  corrected = corrected.replace(ordinalPattern, (match) => {
    const ordinal = wordToOrdinal(match.toLowerCase());
    if (ordinal && ordinal !== match) {
      corrections.push(`Ordinal: "${match}" → "${ordinal}"`);
      return ordinal;
    }
    return match;
  });
  
  // Standardize month names
  const monthPattern = /\b(jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b/gi;
  corrected = corrected.replace(monthPattern, (match) => {
    const fullMonth = abbreviationToFullMonth(match.toLowerCase());
    if (fullMonth && fullMonth !== match) {
      corrections.push(`Month: "${match}" → "${fullMonth}"`);
      return fullMonth;
    }
    return match;
  });
  
  return { text: corrected, corrections };
}

/**
 * Correct common word recognition issues
 */
function correctCommonWords(text: string): { text: string; corrections: string[] } {
  let corrected = text;
  const corrections: string[] = [];
  
  // Common yes/no variations
  const yesNoCorrections: { [key: string]: string } = {
    'yep': 'yes',
    'yup': 'yes',
    'yeah': 'yes',
    'yea': 'yes',
    'nope': 'no',
    'nah': 'no'
  };
  
  Object.entries(yesNoCorrections).forEach(([wrong, correct]) => {
    const pattern = new RegExp(`\\b${wrong}\\b`, 'gi');
    if (pattern.test(corrected)) {
      corrected = corrected.replace(pattern, correct);
      corrections.push(`Word: "${wrong}" → "${correct}"`);
    }
  });
  
  return { text: corrected, corrections };
}

/**
 * Convert word numbers to digits (including ordinal words)
 */
function wordToNumber(word: string): number | null {
  const numbers: { [key: string]: number } = {
    'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
    'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
    'thirty': 30, 'forty': 40, 'fifty': 50,
    // Ordinal words for dates
    'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5,
    'sixth': 6, 'seventh': 7, 'eighth': 8, 'ninth': 9, 'tenth': 10,
    'eleventh': 11, 'twelfth': 12, 'thirteenth': 13, 'fourteenth': 14, 'fifteenth': 15,
    'sixteenth': 16, 'seventeenth': 17, 'eighteenth': 18, 'nineteenth': 19, 'twentieth': 20,
    'twenty first': 21, 'twenty second': 22, 'twenty third': 23, 'twenty fourth': 24, 'twenty fifth': 25,
    'twenty sixth': 26, 'twenty seventh': 27, 'twenty eighth': 28, 'twenty ninth': 29, 'thirtieth': 30, 'thirty first': 31
  };
  
  return numbers[word.toLowerCase()] || null;
}

/**
 * Convert word ordinals to numeric ordinals
 */
function wordToOrdinal(word: string): string | null {
  const ordinals: { [key: string]: string } = {
    'first': '1st', 'second': '2nd', 'third': '3rd', 'fourth': '4th', 'fifth': '5th',
    'sixth': '6th', 'seventh': '7th', 'eighth': '8th', 'ninth': '9th', 'tenth': '10th',
    'eleventh': '11th', 'twelfth': '12th', 'thirteenth': '13th', 'fourteenth': '14th', 'fifteenth': '15th',
    'sixteenth': '16th', 'seventeenth': '17th', 'eighteenth': '18th', 'nineteenth': '19th', 'twentieth': '20th',
    'twenty first': '21st', 'twenty second': '22nd', 'twenty third': '23rd', 'twenty fourth': '24th', 'twenty fifth': '25th',
    'twenty sixth': '26th', 'twenty seventh': '27th', 'twenty eighth': '28th', 'twenty ninth': '29th', 'thirtieth': '30th', 'thirty first': '31st'
  };
  
  return ordinals[word] || null;
}

/**
 * Convert month abbreviations to full names
 */
function abbreviationToFullMonth(abbr: string): string | null {
  const months: { [key: string]: string } = {
    'jan': 'January', 'feb': 'February', 'mar': 'March', 'apr': 'April',
    'jun': 'June', 'jul': 'July', 'aug': 'August', 'sep': 'September', 'sept': 'September',
    'oct': 'October', 'nov': 'November', 'dec': 'December'
  };
  
  return months[abbr] || null;
}

/**
 * Validate and suggest corrections for date/time strings
 */
export function validateDateTime(text: string): {
  isValid: boolean;
  suggestions: string[];
  confidence: number;
} {
  const suggestions: string[] = [];
  let confidence = 1.0;
  
  // Check for common time format issues
  if (text.includes(', ') && /\d+,\s*\d+:\d+/.test(text)) {
    suggestions.push('Time format may need correction (comma between hour and minute)');
    confidence *= 0.7;
  }
  
  // Check for missing colons in time
  if (/\d+\s+\d+\s+(AM|PM)/i.test(text)) {
    suggestions.push('Time may be missing colon between hour and minute');
    confidence *= 0.8;
  }
  
  // Check for inconsistent AM/PM format
  if (/[ap]\.?m\.?/i.test(text) && !/\b(AM|PM)\b/.test(text)) {
    suggestions.push('AM/PM format could be standardized');
    confidence *= 0.9;
  }
  
  return {
    isValid: suggestions.length === 0,
    suggestions,
    confidence
  };
}