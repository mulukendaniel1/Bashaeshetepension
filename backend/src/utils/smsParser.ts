// Shared SMS parsing logic used by both the owner-facing tester tool
// (POST /api/sms-bridge/test) and the real ingestion endpoint
// (POST /api/sms-bridge/ingest). Keeping this in one place guarantees the
// tester shows the owner exactly what will happen with a real SMS.

export type ParsedSms = {
  transactionType: "CREDIT" | "DEBIT" | "OTP" | "MARKETING" | "UNKNOWN";
  amount: number | null;
  reference: string | null;
  transactionDate: Date | null;
  confidence: number;
};

export type SmsRule = {
  amountPattern: string;
  accountPattern: string | null;
  referencePattern: string | null;
  datePattern: string | null;
  transactionTypePattern: string | null;
  creditKeywords: string;
  debitKeywords: string | null;
};

const MAX_PATTERN_LENGTH = 200;

// Guards against catastrophic regex input. We don't let the owner's rule
// patterns run unbounded, and we always match against a single SMS body
// (short text), so ReDoS risk is low, but a hard length cap on both the
// pattern and the input is a cheap, meaningful safety net.
function safeMatch(pattern: string, text: string): RegExpMatchArray | null {
  if (pattern.length > MAX_PATTERN_LENGTH || text.length > 2000) {
    return null;
  }

  try {
    const regex = new RegExp(pattern, "i");
    return text.match(regex);
  } catch {
    return null;
  }
}

function splitKeywords(keywords: string): string[] {
  return keywords
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);
}

function containsAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

const OTP_HINTS = ["otp", "one time password", "verification code", "do not share"];
const MARKETING_HINTS = ["offer", "discount", "promo", "unsubscribe", "win a prize"];

export function classifySms(text: string, rule: SmsRule): ParsedSms["transactionType"] {
  if (containsAny(text, OTP_HINTS)) {
    return "OTP";
  }

  if (containsAny(text, MARKETING_HINTS)) {
    return "MARKETING";
  }

  const creditKeywords = splitKeywords(rule.creditKeywords);
  const debitKeywords = rule.debitKeywords ? splitKeywords(rule.debitKeywords) : [];

  const isCredit = containsAny(text, creditKeywords);
  const isDebit = debitKeywords.length > 0 && containsAny(text, debitKeywords);

  if (isCredit && !isDebit) return "CREDIT";
  if (isDebit && !isCredit) return "DEBIT";

  return "UNKNOWN";
}

export function parseSms(text: string, rule: SmsRule): ParsedSms {
  const transactionType = classifySms(text, rule);

  if (transactionType !== "CREDIT" && transactionType !== "DEBIT") {
    return { transactionType, amount: null, reference: null, transactionDate: null, confidence: 0 };
  }

  let confidence = 50;

  const amountMatch = safeMatch(rule.amountPattern, text);
  // Strip thousands separators and any trailing non-digit characters a
  // loose pattern might have pulled in (e.g. a sentence-ending period).
  const rawAmount = amountMatch?.[1]?.replace(/,/g, "").replace(/[^0-9.]+$/, "");
  const amount = rawAmount && !isNaN(Number(rawAmount)) && rawAmount !== "" ? Number(rawAmount) : null;

  if (amount !== null) {
    confidence += 30;
  }

  const referenceMatch = rule.referencePattern ? safeMatch(rule.referencePattern, text) : null;
  const reference = referenceMatch?.[1] || null;

  if (reference) {
    confidence += 15;
  }

  let transactionDate: Date | null = null;

  if (rule.datePattern) {
    const dateMatch = safeMatch(rule.datePattern, text);

    if (dateMatch?.[1]) {
      const parsed = new Date(dateMatch[1]);

      if (!isNaN(parsed.getTime())) {
        transactionDate = parsed;
        confidence += 5;
      }
    }
  }

  return {
    transactionType,
    amount,
    reference,
    transactionDate,
    confidence: Math.min(confidence, 100),
  };
}

// A credit transaction is only safe to auto-queue when we actually parsed
// an amount. No amount means something about the rule or the SMS format
// doesn't line up, so it goes to REVIEW_REQUIRED instead of being treated
// as a real transaction with a null amount.
export function isAutoQueueable(parsed: ParsedSms): boolean {
  return parsed.transactionType === "CREDIT" && parsed.amount !== null && parsed.confidence >= 70;
}