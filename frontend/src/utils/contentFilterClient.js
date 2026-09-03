/**
 * contentFilterClient.js
 * Client-Side Anti-Leak Detection for Audio Voice Notes & Text Input
 */

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

export function detectPersonalContactLeak(text) {
  if (!text || typeof text !== 'string') {
    return { detected: false };
  }

  const raw = text.trim();
  const lower = raw.toLowerCase();

  // 1. INSTAGRAM DETECTION
  const instaRegex = /\b(?:insta|instagram|ig)\b(?:\s*(?:id|handle|acc|account|profile|pe|par|pr|link)?\s*[:=\-]?\s*@?([a-zA-Z0-9._]{3,30}))?/i;
  const instaMatch = lower.match(instaRegex);
  if (instaMatch) {
    return {
      detected: true,
      type: 'INSTAGRAM',
      snippet: instaMatch[0],
      reason: 'Instagram handle ya ID share karna policy ke khilaaf hai.'
    };
  }

  // 2. FACEBOOK DETECTION
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

  // 3. OTHER MESSAGING APPS
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

  // 4. PHONE NUMBER IN DIGITS
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

  // Spaced / Punctuated phone number
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

  // Contiguous 10+ digits sequence
  const digitsOnly = raw.replace(/\D/g, '');
  if (digitsOnly.length >= 10) {
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

  // 5. PHONE NUMBERS IN WORDS OR CODE LANGUAGE (Hindi & English)
  const tokens = lower.split(/[\s,.\-_/\\|]+/).filter(Boolean);
  let convertedDigits = '';
  let matchedWordTokens = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (/^\d$/.test(token)) {
      convertedDigits += token;
      matchedWordTokens.push(token);
    } else if (NUMBER_WORD_MAP[token]) {
      if (token === 'no') {
        const prevIsNum = i > 0 && (NUMBER_WORD_MAP[tokens[i - 1]] || /^\d$/.test(tokens[i - 1]));
        const nextIsNum = i < tokens.length - 1 && (NUMBER_WORD_MAP[tokens[i + 1]] || /^\d$/.test(tokens[i + 1]));
        if (prevIsNum || nextIsNum) {
          convertedDigits += '9';
          matchedWordTokens.push(token);
        } else {
          if (convertedDigits.length >= 7) break;
          convertedDigits = '';
          matchedWordTokens = [];
        }
      } else {
        convertedDigits += NUMBER_WORD_MAP[token];
        matchedWordTokens.push(token);
      }
    } else {
      if (convertedDigits.length >= 7) {
        break;
      }
      convertedDigits = '';
      matchedWordTokens = [];
    }
  }

  if (convertedDigits.length >= 7) {
    const snippetText = matchedWordTokens.join(' ');
    return {
      detected: true,
      type: 'PHONE_NUMBER_WORDS',
      snippet: snippetText,
      reason: `Phone number code language ya words me bolna mana hai (Decoded: ${convertedDigits}).`
    };
  }

  return { detected: false };
}
