// content.js (self-contained, no imports — manifest v3 content scripts)
// normalization and matching logic duplicated from match.js.
// storage accessed directly via chrome.storage.sync.

(() => {
  "use strict";

  // ---- normalization (mirrors match.js) ----
  const SUFFIXES = [
    "pte. ltd.", "pte ltd.", "pte. ltd", "pte ltd",
    "sdn bhd",
    "llp", "llc",
    "inc.", "inc",
    "ltd.", "ltd",
    "co.", "co",
  ];

  function normalize(s) {
    if (!s) return "";
    let out = s.normalize("NFKC").toLowerCase();
    out = out.replace(/\s+/g, " ").trim();
    let changed = true;
    while (changed) {
      changed = false;
      for (const suf of SUFFIXES) {
        if (out.endsWith(" " + suf) || out === suf) {
          out = out.slice(0, out.length - suf.length).trim();
          changed = true;
          break;
        }
      }
    }
    out = out.replace(/[.,;:!?]+$/g, "").trim();
    return out;
  }

  function isBlocked(job, state) {
    const employer = job?.employer ?? "";
    const title = job?.title ?? "";
    if (!employer && !title) return false;
    const normEmployer = normalize(employer);
    if (state.blockedCompanies.includes(normEmployer)) return true;
    const lowerEmployer = employer.toLowerCase();
    const lowerTitle = title.toLowerCase();
    for (const kw of state.blockedKeywords) {
      if (!kw) continue;
      if (lowerEmployer.includes(kw) || lowerTitle.includes(kw)) return true;
    }
    return false;
  }

  // ---- selectors (mirrors selectors.js) ----
  const SELECTORS = {
    listingCard: '[data-testid="job-card"]',
    cardEmployer: '[data-testid="company-hire-info"]',
    cardTitle: '[data-testid="job-card__job-title"]',
    cardMount: '[data-testid="company-hire-info"]',
    detailEmployer: '[data-testid="company-hire-info"]',
    detailMount: '[data-testid="company-hire-info"]',
  };

  function extractJobFromCard(cardEl) {
    const employer = cardEl?.querySelector(SELECTORS.cardEmployer)?.textContent?.trim() ?? "";
    const title = cardEl?.querySelector(SELECTORS.cardTitle)?.textContent?.trim() ?? "";
    return { employer, title };
  }

  function extractJobFromDetail(doc) {
    const employer = doc?.querySelector(SELECTORS.detailEmployer)?.textContent?.trim() ?? "";
    return { employer, title: "" };
  }

  // ---- state ----
  let state = { schemaVersion: 1, blockedCompanies: [], blockedKeywords: [] };
  let applying = false;

  async function loadState() {
    const raw = await chrome.storage.sync.get(["schemaVersion", "blockedCompanies", "blockedKeywords"]);
    return {
      schemaVersion: raw.schemaVersion ?? 1,
      blockedCompanies: raw.blockedCompanies ?? [],
      blockedKeywords: raw.blockedKeywords ?? [],
    };
  }

  async function addCompany(raw) {
    const norm = normalize(raw);
    if (!norm) return;
    const current = await loadState();
    if (current.blockedCompanies.includes(norm)) return;
    await chrome.storage.sync.set({ blockedCompanies: [...current.blockedCompanies, norm] });
  }

  function applyBlocking() {
    if (applying) return;
    applying = true;
    try {
      const cards = document.querySelectorAll(SELECTORS.listingCard);
      for (const card of cards) {
        const job = extractJobFromCard(card);
        if (isBlocked(job, state)) {
          card.style.display = "none";
          card.setAttribute("data-mcf-hidden", "1");
        } else if (card.getAttribute("data-mcf-hidden") === "1") {
          card.style.display = "";
          card.removeAttribute("data-mcf-hidden");
        }
      }
    } catch (err) {
      console.error("[mcf-blocker] applyBlocking failed", err);
    } finally {
      applying = false;
    }
  }

  async function init() {
    try {
      state = await loadState();
    } catch (err) {
      console.error("[mcf-blocker] loadState failed", err);
    }
    applyBlocking();
    document.documentElement.classList.add("mcf-blocker-ready");
  }

  // safety: always lift the hide-before-ready veil even if init throws
  init().catch((err) => {
    console.error("[mcf-blocker] init fatal", err);
    document.documentElement.classList.add("mcf-blocker-ready");
  });
})();
