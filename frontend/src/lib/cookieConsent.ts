/** Όνομα cookie συναίνεσης (αποθηκεύεται στον browser, δωρεάν — χωρίς εξωτερικό CMP). */
export const COOKIE_CONSENT_COOKIE = "whatson_cc";
export const COOKIE_CONSENT_STORAGE_KEY = "whatson_cookie_consent";

export type CookieConsentValue = "essential" | "all";

const ONE_YEAR_SEC = 60 * 60 * 24 * 365;

function parseStored(raw: string | null | undefined): CookieConsentValue | null {
  if (raw === "essential" || raw === "all") return raw;
  return null;
}

/** Διαβάζει την αποθηκευμένη επιλογή (cookie πρώτα, μετά localStorage). */
export function readCookieConsent(): CookieConsentValue | null {
  if (typeof document === "undefined") return null;

  const fromCookie = document.cookie
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${COOKIE_CONSENT_COOKIE}=`));
  if (fromCookie) {
    const v = decodeURIComponent(fromCookie.slice(COOKIE_CONSENT_COOKIE.length + 1));
    const p = parseStored(v);
    if (p) return p;
  }

  try {
    return parseStored(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function hasCookieConsentAnswer(): boolean {
  return readCookieConsent() !== null;
}

/** Αποθήκευση επιλογής: απαραίτητα μόνο vs όλα (π.χ. μελλοντικά analytics). */
export function saveCookieConsent(value: CookieConsentValue): void {
  if (typeof document === "undefined") return;

  document.cookie = `${COOKIE_CONSENT_COOKIE}=${encodeURIComponent(value)}; path=/; max-age=${ONE_YEAR_SEC}; SameSite=Lax`;

  try {
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, value);
  } catch {
    /* ignore */
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("whatson:cookie-consent", { detail: { value } }));
  }
}

export const COOKIE_BANNER_OPEN_EVENT = "whatson:open-cookie-banner";

/** Διαγραφή επιλογής (π.χ. από σελίδα «Προτιμήσεις cookies») ώστε να ξαναεμφανιστεί το banner. */
export function clearCookieConsent(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_CONSENT_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  try {
    localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Αν στο μέλλον φορτώσεις analytics, κάλεσε μόνο όταν readCookieConsent() === "all". */
export function analyticsCookiesAllowed(): boolean {
  return readCookieConsent() === "all";
}
