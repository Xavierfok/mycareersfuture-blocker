import { load, addCompany, removeCompany, addKeyword, removeKeyword } from "./storage.js";

const els = {
  companies: document.getElementById("companies"),
  keywords: document.getElementById("keywords"),
  emptyCompanies: document.getElementById("empty-companies"),
  emptyKeywords: document.getElementById("empty-keywords"),
  footer: document.getElementById("footer"),
  kwForm: document.getElementById("kw-form"),
  kwInput: document.getElementById("kw-input"),
  error: document.getElementById("error"),
};

function showError(msg) {
  els.error.textContent = msg;
  els.error.hidden = false;
}

function clearError() {
  els.error.hidden = true;
  els.error.textContent = "";
}

function renderList(ul, items, onRemove) {
  ul.innerHTML = "";
  for (const item of items) {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = item;
    span.title = item;
    const btn = document.createElement("button");
    btn.textContent = "✕";
    btn.title = "remove";
    btn.type = "button";
    btn.addEventListener("click", async () => {
      try {
        await onRemove(item);
        await render();
      } catch (err) {
        showError(err.message);
      }
    });
    li.append(span, btn);
    ul.appendChild(li);
  }
}

async function render() {
  clearError();
  const state = await load();

  renderList(els.companies, state.blockedCompanies, removeCompany);
  renderList(els.keywords, state.blockedKeywords, removeKeyword);

  els.emptyCompanies.hidden = state.blockedCompanies.length > 0;
  els.emptyKeywords.hidden = state.blockedKeywords.length > 0;
  els.footer.textContent = `${state.blockedCompanies.length} companies · ${state.blockedKeywords.length} keywords blocked`;
}

els.kwForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const raw = els.kwInput.value;
  try {
    await addKeyword(raw);
    els.kwInput.value = "";
    await render();
  } catch (err) {
    showError(err.message);
  }
});

render().catch((err) => showError(err.message));
