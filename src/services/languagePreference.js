// Server-side language preference for the chat pipeline: 'hi' | 'en' | 'hinglish'.
// Priority: explicit instruction (sticky) > current message > established
// context (acks retain) > uiLanguage fallback. Pure functions — unit-testable.

const DEVANAGARI_RE = /[\u0900-\u097F]/;

// Explicit language instructions, checked newest-first so the latest wins.
const EXPLICIT_HI = [
  /speak (to me )?in hindi/i,
  /reply in hindi/i,
  /respond in hindi/i,
  /talk to me in hindi/i,
  /hindi (me|main|mein)\s+(bol|bolo|baat|bato|batao|likh|jawab)/i,
  /(mujhse|mujh se)\s+hindi\s+(me|main|mein)/i,
  /हिंदी\s+में/,
  /हिन्दी\s+में/,
];

const EXPLICIT_EN = [
  /speak (to me )?in english/i,
  /reply in english/i,
  /respond in english/i,
  /talk to me in english/i,
  /english\s+me\s+(bol|bolo|baat|jawab|likh)/i,
  /angrezi\s+me/i,
  /अंग्रेज़?ी\s+में/,
];

// Romanized Hindi content words (low false-positive rate in catering chat).
const ROMAN_HI_WORDS = [
  'mujhe', 'tumhe', 'tumhein', 'aapko', 'humko', 'hamko', 'unko', 'isko', 'usko',
  'kya', 'kaise', 'kaun', 'kab', 'kahan', 'kaha', 'kyun', 'kyon', 'kitne', 'kitna',
  'kaunsa', 'kaunsi', 'batao', 'bataiye', 'batayen', 'bataen', 'kaho', 'kahiye',
  'chahiye', 'chahie', 'karo', 'kijiye', 'kiye', 'dijiye', 'lijiye', 'hai', 'hain',
  'tha', 'thi', 'the', 'hoga', 'hogi', 'honge', 'raha', 'rahi', 'rahe',
  'shukriya', 'dhanyavad', 'dhanyavaad', 'namaste', 'namaskar', 'theek', 'thik',
  'achha', 'accha', 'acha', 'bahut', 'bohot', 'zyada', 'kam', 'jada',
  'shaadi', 'shadi', 'shaddy', 'vivah', 'mehman', 'mehmaan', 'khana', 'khaana',
  'mithaas', 'sangeet', 'mehendi', 'haldi', 'baraat', 'bidaai', 'vidaai',
  'kimat', 'daam', 'paisa', 'paise', 'sasta', 'mehnga', 'jagah', 'sthal',
  'aage', 'aapki', 'aapke', 'hamare', 'hamari', 'tumhare', 'meri', 'mere', 'mera',
  'apna', 'apne', 'apni', 'sab', 'sabhi', 'koi', 'kuch', 'zyada', 'aur',
];
const ROMAN_HI_SET = new Set(ROMAN_HI_WORDS);

// Short acknowledgments: retain established preference, never switch on these.
const ACKS = new Set([
  'ok', 'okay', 'okays', 'yes', 'yeah', 'yep', 'no', 'nope', 'thanks', 'thank you',
  'thankyou', 'welcome', 'please', 'sure', 'great', 'nice', 'perfect', 'done',
  'haan', 'han', 'haanji', 'hanji', 'ji', 'nahi', 'nahin', 'theek hai', 'thik hai',
  'achha', 'accha', 'theek', 'thik', 'shukriya', 'dhanyavad', 'dhanyavaad',
  'namaste', 'ठीक है', 'ठीक', 'अच्छा', 'हाँ', 'हां', 'जी', 'नहीं', 'शुक्रिया', 'नमस्ते',
]);

export function detectExplicitInstruction(text) {
  if (!text || typeof text !== 'string') return null;
  if (EXPLICIT_HI.some((re) => re.test(text))) return 'hi';
  if (EXPLICIT_EN.some((re) => re.test(text))) return 'en';
  return null;
}

function tokenizeLatin(text) {
  return text.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
}

export function classifyMessage(text) {
  if (!text || typeof text !== 'string' || !text.trim()) return 'ambiguous';
  const trimmed = text.trim();
  // Explicit instructions classify by intent, not by script.
  const explicit = detectExplicitInstruction(trimmed);
  if (explicit) return explicit;
  if (ACKS.has(trimmed.toLowerCase())) return 'ambiguous';

  const devCount = (trimmed.match(/[\u0900-\u097F]/g) || []).length;
  const letters = (trimmed.match(/[\u0900-\u097F A-Za-z]/g) || []).length;
  // Devanagari-dominant: Hindi. A lone English tech term must not flip it.
  if (letters > 0 && devCount / letters >= 0.15) return 'hi';

  const words = tokenizeLatin(trimmed);
  if (words.length === 0) return 'ambiguous';
  // A lone 1–3 letter Latin token ("hi", "hey") is a greeting in both
  // languages — ambiguous, so the fallback/context decides.
  if (words.length === 1 && words[0].length <= 3) return 'ambiguous';
  const romanHits = words.filter((w) => ROMAN_HI_SET.has(w)).length;
  const englishWords = words.length - romanHits;
  if (romanHits >= 2 && englishWords >= 2) return 'hinglish';
  if (romanHits >= 2) return 'hi';
  // Single romanized word inside an English sentence: not a switch signal.
  if (englishWords >= 3) return 'en';
  if (romanHits >= 1) return 'hi';
  return 'en';
}

// Scan newest user messages first: latest explicit instruction wins and stays
// active; otherwise the current message decides; acks inherit prior context.
export function resolveLanguagePreference({ messages, uiLanguage }) {
  const fallback = uiLanguage === 'hi' ? 'hi' : 'en';
  const users = (Array.isArray(messages) ? messages : [])
    .filter((m) => m && m.role === 'user' && typeof m.content === 'string')
    .map((m) => m.content)
    .slice(-10);
  if (users.length === 0) return fallback;

  for (let i = users.length - 1; i >= 0; i -= 1) {
    const explicit = detectExplicitInstruction(users[i]);
    if (explicit) return explicit;
  }
  const current = classifyMessage(users[users.length - 1]);
  if (current !== 'ambiguous') return current;
  for (let i = users.length - 2; i >= 0; i -= 1) {
    const prior = classifyMessage(users[i]);
    if (prior !== 'ambiguous') return prior;
  }
  return fallback;
}

export function languageDirective(pref) {
  if (pref === 'hi') {
    return 'Language: reply in Hindi using Devanagari script. An explicit user language instruction always wins over automatic detection. Keep Hindi for short follow-ups and acknowledgments unless the user asks otherwise. Do not announce the language choice.';
  }
  if (pref === 'hinglish') {
    return 'Language: reply in natural Hinglish, matching the user\u2019s Hindi-English mix (Roman script where the user uses Roman, Devanagari where they use Devanagari). Do not switch fully to one language mid-answer without reason. Do not announce the language choice.';
  }
  return 'Language: reply in English. An explicit user language instruction always wins over automatic detection. Keep English for short follow-ups unless the user asks otherwise. Do not announce the language choice.';
}
