import axios from "axios";

// Simple in-memory cache of disposable domains
let disposableDomains: Set<string> | null = null;
let lastLoaded = 0;

const SOURCES = [
  // Popular community-maintained lists
  "https://raw.githubusercontent.com/ivolo/disposable-email-domains/master/domains.json",
  "https://raw.githubusercontent.com/7c/fakefilter/main/lists/domains.txt"
];

const FALLBACK = [
  "tempmail.com","10minutemail.com","guerrillamail.com","mailinator.com","yopmail.com",
  "trashmail.com","getnada.com","temp-mail.org","fakeinbox.com","dispostable.com"
];

async function fetchList(): Promise<Set<string>> {
  for (const url of SOURCES) {
    try {
      const res = await axios.get(url, { timeout: 8000 });
      if (Array.isArray(res.data)) {
        return new Set(res.data.map((d: string) => d.trim().toLowerCase()));
      }
      if (typeof res.data === 'string') {
        const lines = res.data.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        return new Set(lines.map(l => l.toLowerCase()));
      }
    } catch (_e) {
      // try next
    }
  }
  return new Set(FALLBACK);
}

export async function loadDisposableDomains(force = false) {
  const now = Date.now();
  // Refresh at most every 6 hours
  if (!force && disposableDomains && now - lastLoaded < 6 * 60 * 60 * 1000) return;
  disposableDomains = await fetchList();
  lastLoaded = now;
}

export async function isDisposableEmail(email: string): Promise<boolean> {
  if (!disposableDomains) await loadDisposableDomains();
  const domain = (email.split('@')[1] || '').toLowerCase();
  if (!domain) return true;
  // Direct match
  if (disposableDomains!.has(domain)) return true;
  // Subdomain match
  const parts = domain.split('.');
  for (let i = 0; i < parts.length - 1; i++) {
    const cand = parts.slice(i).join('.');
    if (disposableDomains!.has(cand)) return true;
  }
  return false;
}
