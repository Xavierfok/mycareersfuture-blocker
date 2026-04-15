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

  function injectCardButton(card, job) {
    // the employer <p> lives inside <a data-testid="job-card-link">, so a button
    // mounted next to it would be inside the anchor and clicks would navigate.
    // mount the button directly on the card (sibling of the anchor) with absolute
    // positioning. the card has class "card relative" so position:relative is set.
    if (card.querySelector(":scope > [data-mcf-blocker-btn]")) return;
    if (!job.employer) return;

    const btn = document.createElement("button");
    btn.setAttribute("data-mcf-blocker-btn", "1");
    btn.type = "button";
    btn.textContent = "🚫 block";
    btn.title = `block "${job.employer}"`;
    btn.style.cssText =
      "position:absolute;top:6px;left:6px;z-index:10;padding:3px 7px;font-size:11px;background:#fff;border:1px solid #c00;color:#c00;border-radius:4px;cursor:pointer;font-weight:600;";
    // stop propagation on pointerdown, mousedown, and click because react/SPAs
    // sometimes wire listeners at different phases.
    const stop = (e) => { e.stopPropagation(); e.stopImmediatePropagation(); };
    btn.addEventListener("pointerdown", stop);
    btn.addEventListener("mousedown", stop);
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      stop(e);
      btn.disabled = true;
      btn.textContent = "blocking...";
      try {
        await addCompany(job.employer);
        state = await loadState();
        applyBlocking();
        maybeAutoPaginate();
      } catch (err) {
        btn.disabled = false;
        btn.textContent = "🚫 block";
        alert("mcf-blocker: " + err.message);
      }
    });
    card.appendChild(btn);
  }

  // ---- auto-paginate after block ----
  // when an explicit block drops visible-card count below MIN_VISIBLE, click the
  // site's "next page" button. triggered only from the block handler (never from
  // the observer) so it never runs without explicit user intent.
  const MIN_VISIBLE_AFTER_BLOCK = 10;
  let autoPaginateCooldown = false;

  function countVisibleCards() {
    let count = 0;
    for (const c of document.querySelectorAll(SELECTORS.listingCard)) {
      if (c.getAttribute("data-mcf-hidden") !== "1") count++;
    }
    return count;
  }

  function maybeAutoPaginate() {
    if (autoPaginateCooldown) return;
    if (countVisibleCards() >= MIN_VISIBLE_AFTER_BLOCK) return;

    const nextBtn = document.querySelector('[data-testid="pagination-button--❯"]');
    if (!nextBtn || nextBtn.disabled) return;

    // cooldown prevents accidental double-advances if the user rapidly blocks
    // multiple companies; reset after 2s gives the site time to render the next page.
    autoPaginateCooldown = true;
    setTimeout(() => { autoPaginateCooldown = false; }, 2000);

    nextBtn.click();
  }

  function tryInjectDetailButton() {
    // detect detail page: url path starts with /job/
    if (!/^\/job\//.test(location.pathname)) return;

    const mount = document.querySelector(SELECTORS.detailMount);
    if (!mount) return;
    if (mount.nextElementSibling?.getAttribute("data-mcf-blocker-detail-btn") === "1") return;

    const job = extractJobFromDetail(document);
    if (!job.employer) return;

    const btn = document.createElement("button");
    btn.setAttribute("data-mcf-blocker-detail-btn", "1");
    btn.type = "button";
    btn.textContent = "🚫 block this company";
    btn.style.cssText =
      "margin:8px 0;padding:6px 12px;background:#fff;border:1px solid #c00;color:#c00;border-radius:4px;cursor:pointer;display:inline-block;";
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        await addCompany(job.employer);
        state = await loadState();
        btn.textContent = "🚫 blocked";
        btn.disabled = true;
      } catch (err) {
        alert("mcf-blocker: " + err.message);
      }
    });
    mount.insertAdjacentElement("afterend", btn);
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
          continue;
        } else if (card.getAttribute("data-mcf-hidden") === "1") {
          card.style.display = "";
          card.removeAttribute("data-mcf-hidden");
        }
        injectCardButton(card, job);
      }
      tryInjectDetailButton();
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

  // ---- mutation observer ----
  let rafHandle = null;
  let trailingTimer = null;

  function scheduleApply() {
    if (rafHandle) return;
    rafHandle = requestAnimationFrame(() => {
      rafHandle = null;
      if (trailingTimer) clearTimeout(trailingTimer);
      trailingTimer = setTimeout(() => {
        trailingTimer = null;
        applyBlocking();
      }, 100);
    });
  }

  const observer = new MutationObserver((mutations) => {
    if (applying) return;
    for (const m of mutations) {
      if (m.type === "childList" && (m.addedNodes.length || m.removedNodes.length)) {
        scheduleApply();
        break;
      }
    }
  });

  function startObserver() {
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", startObserver, { once: true });
      return;
    }
    observer.observe(document.body, { childList: true, subtree: true });
  }

  startObserver();

  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area !== "sync") return;
    if (!("blockedCompanies" in changes) && !("blockedKeywords" in changes)) return;
    try {
      state = await loadState();
      applyBlocking();
    } catch (err) {
      console.error("[mcf-blocker] onChanged reload failed", err);
    }
  });
})();
