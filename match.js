const SUFFIXES = [
  "pte. ltd.", "pte ltd.", "pte. ltd", "pte ltd",
  "sdn bhd",
  "llp", "llc",
  "inc.", "inc",
  "ltd.", "ltd",
  "co.", "co",
];

export function normalize(s) {
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

export function isBlocked(job, state) {
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
