// all DOM selectors for mycareersfuture.gov.sg live in this file.
// when the site updates, only this file should need changes.

export const SELECTORS = {
  listingCard: '[data-testid="job-card"]',
  cardEmployer: '[data-testid="company-hire-info"]',
  cardTitle: '[data-testid="job-card__job-title"]',
  cardMount: '[data-testid="company-hire-info"]',
  detailEmployer: '[data-testid="company-hire-info"]',
  detailMount: '[data-testid="company-hire-info"]',
};

export function extractJobFromCard(cardEl) {
  const employer = cardEl?.querySelector(SELECTORS.cardEmployer)?.textContent?.trim() ?? "";
  const title = cardEl?.querySelector(SELECTORS.cardTitle)?.textContent?.trim() ?? "";
  return { employer, title };
}

export function extractJobFromDetail(doc) {
  const employer = doc?.querySelector(SELECTORS.detailEmployer)?.textContent?.trim() ?? "";
  return { employer, title: "" };
}
