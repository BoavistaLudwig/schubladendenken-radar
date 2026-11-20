let signals = [];
let currentFilter = "all";
let currentSource = "all";
let searchTerm = "";

const categoryColors = {
  "Insight": "bg-amber-100 text-amber-800",
  "Best Practice": "bg-emerald-100 text-emerald-800",
  "Idea": "bg-blue-100 text-blue-800",
  "Feature Request": "bg-indigo-100 text-indigo-800",
  "Complaint": "bg-rose-100 text-rose-800"
};

const sourceColors = {
  "X": "bg-slate-900 text-white",
  "Reddit": "bg-orange-100 text-orange-800",
  "LinkedIn": "bg-sky-100 text-sky-900"
};

function sourceOf(signal) {
  if (signal.source) return signal.source;
  const url = String(signal.url || "");
  if (url.includes("reddit.com")) return "Reddit";
  if (url.includes("linkedin.com")) return "LinkedIn";
  return "X";
}

function escapeHtml(value) {
  const amp = "&" + "amp;";
  const lt = "&" + "lt;";
  const gt = "&" + "gt;";
  const quot = "&" + "quot;";
  const apos = "&" + "#39;";
  return String(value ?? "")
    .replace(/&/g, amp)
    .replace(/</g, lt)
    .replace(/>/g, gt)
    .replace(/"/g, quot)
    .replace(/'/g, apos);
}

async function loadSignals() {
  try {
    const res = await fetch("signals.json");
    signals = await res.json();
    signals.sort((a, b) => new Date(b.date) - new Date(a.date));
    updateStats();
    updateLastUpdated();
    render();
  } catch (e) {
    console.error("Failed to load signals", e);
    document.getElementById("board").innerHTML = "<p class='text-red-500'>Could not load signals.json</p>";
  }
}

function updateStats() {
  document.getElementById("stat-total").textContent = signals.length;
  document.getElementById("stat-insights").textContent = signals.filter(s => s.category === "Insight").length;
  document.getElementById("stat-practices").textContent = signals.filter(s => s.category === "Best Practice").length;
  document.getElementById("stat-complaints").textContent = signals.filter(s => s.category === "Complaint").length;
  document.getElementById("stat-ideas").textContent = signals.filter(s => s.category === "Idea" || s.category === "Feature Request").length;
}

function updateLastUpdated() {
  if (signals.length === 0) return;
  const newest = signals[0].date;
  const el = document.getElementById("last-updated");
  if (el) el.textContent = `Latest: ${newest}`;
}

function setActive(selector, attr, value) {
  document.querySelectorAll(selector).forEach(btn => {
    const on = btn.dataset[attr] === value;
    btn.classList.toggle("bg-slate-900", on);
    btn.classList.toggle("text-white", on);
    btn.classList.toggle("bg-white", !on);
    btn.classList.toggle("border", !on);
    btn.classList.toggle("border-slate-200", !on);
    btn.classList.toggle("text-slate-700", !on);
  });
}

function render() {
  const board = document.getElementById("board");
  const empty = document.getElementById("empty");
  const filtered = signals.filter(s => {
    const source = sourceOf(s);
    const matchesFilter = currentFilter === "all" || s.category === currentFilter;
    const matchesSource = currentSource === "all" || source === currentSource;
    const matchesSearch = !searchTerm ||
      s.title.toLowerCase().includes(searchTerm) ||
      s.excerpt.toLowerCase().includes(searchTerm) ||
      (s.tags || []).some(t => t.toLowerCase().includes(searchTerm)) ||
      s.author.toLowerCase().includes(searchTerm) ||
      source.toLowerCase().includes(searchTerm);
    return matchesFilter && matchesSource && matchesSearch;
  });

  if (filtered.length === 0) {
    board.classList.add("hidden");
    empty.classList.remove("hidden");
    return;
  }

  board.classList.remove("hidden");
  empty.classList.add("hidden");

  board.innerHTML = filtered.map(s => {
    const source = sourceOf(s);
    const tags = (s.tags || []).slice(0, 4).map(t =>
      `<span class="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">${escapeHtml(t)}</span>`
    ).join("");
    return `
    <article class="card bg-white rounded-xl border border-slate-200 p-5 flex flex-col">
      <div class="flex items-start justify-between gap-2 mb-3">
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="source-badge px-2 py-0.5 rounded-full font-medium ${sourceColors[source] || "bg-slate-100 text-slate-700"}">${escapeHtml(source)}</span>
          <span class="category-badge px-2 py-0.5 rounded-full font-medium ${categoryColors[s.category] || "bg-slate-100 text-slate-700"}">${escapeHtml(s.category)}</span>
        </div>
        <div class="flex items-center text-xs text-slate-400 gap-1 shrink-0" title="Engagement on the source">
          <i class="fa-regular fa-heart"></i>
          <span>${escapeHtml(s.engagement)}</span>
        </div>
      </div>
      <h2 class="font-semibold text-slate-900 leading-snug mb-2">${escapeHtml(s.title)}</h2>
      <p class="text-sm text-slate-600 leading-relaxed flex-1 mb-4">${escapeHtml(s.excerpt)}</p>
      <div class="flex flex-wrap gap-1.5 mb-4">${tags}</div>
      <div class="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
        <div>
          <span class="font-medium">${escapeHtml(s.author)}</span>
          <span class="mx-1">·</span>
          <span>${escapeHtml(s.date)}</span>
        </div>
        <a href="${escapeHtml(s.url)}" target="_blank" rel="noopener" class="text-slate-400 hover:text-slate-700 flex items-center gap-1">
          View on ${escapeHtml(source)} <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
        </a>
      </div>
    </article>`;
  }).join("");
}

document.getElementById("filters").addEventListener("click", (e) => {
  const btn = e.target.closest(".filter-btn");
  if (!btn) return;
  currentFilter = btn.dataset.filter;
  setActive(".filter-btn", "filter", currentFilter);
  render();
});

document.getElementById("source-filters").addEventListener("click", (e) => {
  const btn = e.target.closest(".source-btn");
  if (!btn) return;
  currentSource = btn.dataset.source;
  setActive(".source-btn", "source", currentSource);
  render();
});

document.getElementById("search").addEventListener("input", (e) => {
  searchTerm = e.target.value.toLowerCase().trim();
  render();
});

loadSignals();
