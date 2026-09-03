/**
 * contentFilter.js
 * Intelligent Anti-Leak Privacy & Content Moderation Engine
 * Detects Instagram, Facebook, Social IDs, and Phone Numbers (Digits, Spaced, Words & Code Language)
 */

// Mapping of English & Hindi/Hinglish Number Words to Digits
const NUMBER_WORD_MAP = {
  // English
  'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
  'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
  
  // Hindi / Hinglish Words
  'shunya': '0', 'sunya': '0', 'sifar': '0',
  'ek': '1', 'ik': '1',
  'do': '2',
  'teen': '3', 'tin': '3',
  'char': '4', 'chaar': '4',
  'paanch': '5', 'panch': '5',
  'chhe': '6', 'che': '6', 'chhah': '6',
  'saat': '7', 'sat': '7',
  'aath': '8', 'ath': '8',
  'nau': '9', 'no': '9'
};

/**
 * Main Detection Function
 * @param {string} text - The message or comment text to scan
 * @returns {object} { detected: boolean, type: string, snippet: string, reason: string }
 */
function detectPersonalContactLeak(text) {
  if (!text || typeof text !== 'string') {
    return { detected: false };
  }

  const raw = text.trim();
  const lower = raw.toLowerCase();

  // -------------------------------------------------------------
  // 1. INSTAGRAM DETECTION
  // -------------------------------------------------------------
  // Examples: "insta rohit_007", "instagram id", "my ig: @amit", "insta pe aao"
  const instaRegex = /\b(?:insta|instagram|ig)\b(?:\s*(?:id|handle|acc|account|profile|pe|par|pr|link)?\s*[:=\-]?\s*@?([a-zA-Z0-9._]{3,30}))?/i;
  const instaMatch = lower.match(instaRegex);
  if (instaMatch) {
    // If it mentions insta handle or directly asks to connect on insta
    const snippet = instaMatch[0];
    return {
      detected: true,
      type: 'INSTAGRAM',
      snippet: snippet,
      reason: 'Instagram handle ya ID share karna policy ke khilaaf hai.'
    };
  }

  // Standalone handle with @ followed by social trigger: e.g. "follow @username" or "dm @username"
  const atSocialRegex = /\b(?:follow|dm|contact|id|add)\s+@([a-zA-Z0-9._]{3,30})\b/i;
  const atSocialMatch = lower.match(atSocialRegex);
  if (atSocialMatch) {
    return {
      detected: true,
      type: 'SOCIAL_HANDLE',
      snippet: atSocialMatch[0],
      reason: 'Social media handle share karna allow nahi hai.'
    };
  }

  // -------------------------------------------------------------
  // 2. FACEBOOK DETECTION
  // -------------------------------------------------------------
  // Examples: "fb id amit_sharma", "facebook profile", "fb pe search karo"
  const fbRegex = /\b(?:facebook|fb)\b(?:\s*(?:id|profile|account|acc|pe|par|pr)?\s*[:=\-]?\s*([a-zA-Z0-9._\- ]{3,30}))?/i;
  const fbMatch = lower.match(fbRegex);
  if (fbMatch) {
    return {
      detected: true,
      type: 'FACEBOOK',
      snippet: fbMatch[0],
      reason: 'Facebook profile ya ID share karna policy ke khilaaf hai.'
    };
  }

  // -------------------------------------------------------------
  // 3. OTHER SOCIAL MESSAGING APPS (WhatsApp, Telegram, Snapchat)
  // -------------------------------------------------------------
  const otherAppsRegex = /\b(?:whatsapp|whats\s*app|watsapp|wa\s*no|whtsapp|telegram|tele\s*id|snapchat|snap\s*id)\b/i;
  const otherAppsMatch = lower.match(otherAppsRegex);
  if (otherAppsMatch) {
    return {
      detected: true,
      type: 'OTHER_MESSENGER',
      snippet: otherAppsMatch[0],
      reason: 'WhatsApp, Telegram ya Snapchat contact share karna allow nahi hai.'
    };
  }

  // -------------------------------------------------------------
  // 4. PHONE NUMBER IN DIGITS (Standard, Spaced, Dotted, or Dashed)
  // -------------------------------------------------------------
  // A. Standard 10-digit Indian mobile number format [6-9]xxxxxxxxx
  // Handles: 9876543210, +919876543210, 09876543210
  const standardPhoneRegex = /(?:(?:\+|0{0,2})91[\s-]*)?([6-9]\d{9})\b/;
  const standardPhoneMatch = raw.match(standardPhoneRegex);
  if (standardPhoneMatch) {
    return {
      detected: true,
      type: 'PHONE_NUMBER_DIGITS',
      snippet: standardPhoneMatch[0],
      reason: 'Phone number digits me share karna sakht mana hai.'
    };
  }

  // B. Spaced / Punctuated phone number: e.g. "9 8 7 6 5 4 3 2 1 0" or "98765-43210" or "98.76.54.32.10"
  const spacedPhoneRegex = /\b[6-9](?:[\s.\-_*,]{0,2}\d){9}\b/;
  const spacedPhoneMatch = raw.match(spacedPhoneRegex);
  if (spacedPhoneMatch) {
    return {
      detected: true,
      type: 'PHONE_NUMBER_SPACED',
      snippet: spacedPhoneMatch[0],
      reason: 'Spaced ya disguised phone number share karna policy ke khilaaf hai.'
    };
  }

  // C. Any contiguous or semi-spaced 10+ digits sequence
  // Strip non-digits and test if 10 consecutive digits form an Indian mobile
  const digitsOnly = raw.replace(/\D/g, '');
  if (digitsOnly.length >= 10) {
    // Check if any 10-digit slice starts with 6, 7, 8, or 9
    for (let i = 0; i <= digitsOnly.length - 10; i++) {
      const slice = digitsOnly.substr(i, 10);
      if (/^[6-9]\d{9}$/.test(slice)) {
        return {
          detected: true,
          type: 'PHONE_NUMBER_DIGITS',
          snippet: slice,
          reason: 'Phone number share karna sakht mana hai.'
        };
      }
    }
  }

  // -------------------------------------------------------------
  // 5. PHONE NUMBERS IN WORDS OR CODE LANGUAGE (Hindi & English)
  // -------------------------------------------------------------
  // Examples:
  // "nau aath saat chhe paanch char teen do ek zero"
  // "nine eight seven six five four three two one zero"
  // "call me 9 eight 7 six five 4 three 2 one 0"
  const tokens = lower.split(/[\s,.\-_/\\|]+/).filter(Boolean);
  let convertedDigits = '';
  let matchedWordTokens = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (/^\d$/.test(token)) {
      convertedDigits += token;
      matchedWordTokens.push(token);
    } else if (NUMBER_WORD_MAP[token]) {
      // Avoid treating isolated Hindi word "no" (meaning 'no/nahi') as 9 unless preceded or followed by numbers
      if (token === 'no') {
        const prevIsNum = i > 0 && (NUMBER_WORD_MAP[tokens[i - 1]] || /^\d$/.test(tokens[i - 1]));
        const nextIsNum = i < tokens.length - 1 && (NUMBER_WORD_MAP[tokens[i + 1]] || /^\d$/.test(tokens[i + 1]));
        if (prevIsNum || nextIsNum) {
          convertedDigits += '9';
          matchedWordTokens.push(token);
        } else {
          // Break sequence
          if (convertedDigits.length >= 7) break;
          convertedDigits = '';
          matchedWordTokens = [];
        }
      } else {
        convertedDigits += NUMBER_WORD_MAP[token];
        matchedWordTokens.push(token);
      }
    } else {
      // Non-number word encountered
      if (convertedDigits.length >= 7) {
        // We already accumulated a long number sequence
        break;
      }
      convertedDigits = '';
      matchedWordTokens = [];
    }
  }

  // If a sequence of 7 to 10+ digits was assembled from words/digits
  if (convertedDigits.length >= 7) {
    const snippetText = matchedWordTokens.join(' ');
    return {
      detected: true,
      type: 'PHONE_NUMBER_WORDS',
      snippet: snippetText,
      reason: `Phone number code language ya words me dena mana hai (Decoded: ${convertedDigits}).`
    };
  }

  return { detected: false };
}

module.exports = {
  detectPersonalContactLeak,
  NUMBER_WORD_MAP
};
