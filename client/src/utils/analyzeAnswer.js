/**
 * analyzeAnswer.js
 *
 * Scores a spoken interview answer locally (no API call needed).
 * Returns a score 0-100 plus confidence, clarity, and sentiment as NUMBERS (0-100).
 *
 * Scoring breakdown (100 pts total):
 *   30 pts — length / depth  (word count)
 *   25 pts — keyword richness (technical / domain words)
 *   20 pts — structure       (uses examples, explains reasoning)
 *   15 pts — clarity         (sentence variety, not just filler)
 *   10 pts — confidence cues (assertive language)
 */

// ── word lists ────────────────────────────────────────────────────────────────

const TECH_KEYWORDS = [
  // engineering
  "algorithm","complexity","optimization","scalability","architecture","design",
  "pattern","framework","library","api","rest","graphql","database","sql","nosql",
  "cache","redis","queue","async","promise","callback","closure","recursion",
  "stack","heap","tree","graph","hash","binary","sorting","searching",
  "component","hook","state","props","context","redux","typescript","interface",
  "class","inheritance","polymorphism","encapsulation","abstraction","solid",
  "microservice","docker","kubernetes","ci","cd","git","testing","unit","integration",
  "performance","memory","thread","concurrent","parallel","network","protocol",
  "http","tcp","security","authentication","authorization","token","jwt",
  // soft / behavioural
  "collaborated","led","managed","implemented","designed","optimized","refactored",
  "deployed","reviewed","mentored","delivered","achieved","improved","reduced",
  "increased","solved","analysed","communicated","coordinated","prioritized",
  "deadline","stakeholder","agile","scrum","sprint","feedback","challenge","impact",
];

const FILLER_WORDS = [
  "um","uh","like","basically","literally","actually","you know","kind of",
  "sort of","i mean","right","okay","so","well","yeah","hmm",
];

const STRUCTURE_CUES = [
  "for example","for instance","such as","because","therefore","however",
  "on the other hand","first","second","finally","in addition","furthermore",
  "as a result","to summarise","in conclusion","the reason","this means",
  "which led to","so that","in order to","the approach","my solution",
  "the challenge was","i decided","we implemented","the outcome",
];

const CONFIDENCE_CUES = [
  "i built","i implemented","i designed","i led","i solved","i achieved",
  "i created","i developed","i managed","i improved","i reduced","i increased",
  "we built","we delivered","we deployed","my approach","my solution",
  "i am confident","i believe","i know","i understand","in my experience",
  "i have worked","i have used","i have built",
];

// ── helpers ───────────────────────────────────────────────────────────────────

const normalize  = (t) => t.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
const wordList   = (t) => normalize(t).split(/\s+/).filter(Boolean);
const countHits  = (words, list) =>
  list.reduce((n, kw) => n + (normalize(words.join(" ")).includes(kw) ? 1 : 0), 0);

// ── main export ───────────────────────────────────────────────────────────────

export const analyzeAnswer = (text = "") => {
  if (!text || text.trim().length < 3) {
    // Return numeric 0 values so the server validation passes
    return { score: 0, confidence: 0, clarity: 0, sentiment: 0 };
  }

  const words     = wordList(text);
  const wc        = words.length;

  // ── 1. Length / depth (30 pts) ────────────────────────────────────────────
  const lengthScore =
    wc >= 100 ? 30 :
    wc >=  80 ? 26 :
    wc >=  60 ? 22 :
    wc >=  40 ? 18 :
    wc >=  25 ? 13 :
    wc >=  15 ?  8 :
    wc >=   8 ?  4 : 0;

  // ── 2. Keyword richness (25 pts) ──────────────────────────────────────────
  const techHits     = countHits(words, TECH_KEYWORDS);
  const keywordScore =
    techHits >= 10 ? 25 :
    techHits >=  7 ? 21 :
    techHits >=  5 ? 17 :
    techHits >=  3 ? 13 :
    techHits >=  2 ?  9 :
    techHits >=  1 ?  5 : 0;

  // ── 3. Structure (20 pts) ─────────────────────────────────────────────────
  const structureHits  = countHits(words, STRUCTURE_CUES);
  const structureScore =
    structureHits >= 4 ? 20 :
    structureHits >= 3 ? 16 :
    structureHits >= 2 ? 12 :
    structureHits >= 1 ?  7 : 0;

  // ── 4. Clarity (15 pts) — penalise filler words ───────────────────────────
  const fillerHits  = countHits(words, FILLER_WORDS);
  const fillerRatio = wc > 0 ? fillerHits / wc : 1;
  const clarityScore =
    fillerRatio <= 0.02 ? 15 :
    fillerRatio <= 0.05 ? 12 :
    fillerRatio <= 0.10 ?  8 :
    fillerRatio <= 0.15 ?  4 : 1;

  // ── 5. Confidence cues (10 pts) ───────────────────────────────────────────
  const confHits      = countHits(words, CONFIDENCE_CUES);
  const confidenceScore =
    confHits >= 3 ? 10 :
    confHits >= 2 ?  7 :
    confHits >= 1 ?  4 : 0;

  // ── total score ────────────────────────────────────────────────────────────
  let score = lengthScore + keywordScore + structureScore + clarityScore + confidenceScore;

  // Soft floor: if the person said anything meaningful (≥ 8 words) give at least 10
  if (wc >= 8 && score < 10) score = 10;
  score = Math.min(100, Math.max(0, score));

  // ── FIXED: derived metrics as NUMBERS (0-100), not string labels ───────────
  // These are sent to the server which expects isFloat({ min: 0, max: 100 })
  const confidence = Math.min(100, Math.max(0,
    wc >= 80 && confHits >= 2 ? 85 :
    wc >= 40 || confHits >= 1 ? 60 : 30
  ));

  const clarity = Math.min(100, Math.max(0,
    clarityScore >= 12 ? 90 :
    clarityScore >=  8 ? 72 :
    clarityScore >=  4 ? 50 : 20
  ));

  const sentiment = Math.min(100, Math.max(0,
    score >= 70 ? score :
    score >= 40 ? Math.round(score * 0.85) :
    Math.round(score * 0.6)
  ));

  return { score, confidence, clarity, sentiment };
};