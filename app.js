let signals = [];
let currentFilter = "all";
let searchTerm = "";

const categoryColors = {
  "Insight": "bg-amber-100 text-amber-800",
  "Best Practice": "bg-emerald-100 text-emerald-800",
  "Idea": "bg-blue-100 text-blue-800",
  "Feature Request": "bg-indigo-100 text-indigo-800",
  "Complaint": "bg-rose-100 text-rose-800"
};

async function loadSignals() {
  try {
    const res = await fetch("signals.json");
    signals = await res.json();
    signals.sort((a, b) => new Date(b.date) - new Date(a.date));
    updateStats();
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
  document.getElementById("stat-ideas").textContent = signals.filter(s => s.category === "Idea" || s.category === "Feature Request").length;
}

function render() {
  const board = document.getElementById("board");
  const empty = document.getElementById("empty");
  const filtered = signals.filter(s => {
    const matchesFilter = currentFilter === "all" || s.category === currentFilter;
    const matchesSearch = !searchTerm || 
      s.title.toLowerCase().includes(searchTerm) ||
      s.excerpt.toLowerCase().includes(searchTerm) ||
      s.tags.some(t => t.toLowerCase().includes(searchTerm)) ||
      s.author.toLowerCase().includes(searchTerm);
    return matchesFilter && matchesSearch;
  });

  if (filtered.length === 0) {
    board.classList.add("hidden");
    empty.classList.remove("hidden");
    return;
  }

  board.classList.remove("hidden");
  empty.classList.add("hidden");

  board.innerHTML = filtered.map(s => `
    <article class="card bg-white rounded-xl border border-slate-200 p-5 flex flex-col">
      <div class="flex items-start justify-between gap-2 mb-3">
        <span class="category-badge px-2 py-0.5 rounded-full font-medium ${categoryColors[s.category] || 'bg-slate-100 text-slate-700'}">
          ${s.category}
        </span>
        <div class="flex items-center text-xs text-slate-400 gap-1">
          <i class="fa-regular fa-heart"></i>
          <span>${s.engagement}</span>
        </div>
      </div>
      <h2 class="font-semibold text-slate-900 leading-snug mb-2">${s.title}</h2>
      <p class="text-sm text-slate-600 leading-relaxed flex-1 mb-4">${s.excerpt}</p>
      <div class="flex flex-wrap gap-1.5 mb-4">
        ${s.tags.slice(0, 4).map(t => `<span class="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">${t}</span>`).join("")}
      </div>
      <div class="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
        <div>
          <span class="font-medium">${s.author}</span>
          <span class="mx-1">·</span>
          <span>${s.date}</span>
        </div>
        <a href="${s.url}" target="_blank" rel="noopener" class="text-slate-400 hover:text-slate-700 flex items-center gap-1">
          View on X <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
        </a>
      </div>
    </article>
  `).join("");
}

document.getElementById("filters").addEventListener("click", (e) => {
  const btn = e.target.closest(".filter-btn");
  if (!btn) return;
  document.querySelectorAll(".filter-btn").forEach(b => {
    b.classList.remove("bg-slate-900", "text-white");
    b.classList.add("bg-white", "border", "border-slate-200", "text-slate-700");
  });
  btn.classList.add("bg-slate-900", "text-white");
  btn.classList.remove("bg-white", "border", "border-slate-200", "text-slate-700");
  currentFilter = btn.dataset.filter;
  render();
});

document.getElementById("search").addEventListener("input", (e) => {
  searchTerm = e.target.value.toLowerCase().trim();
  render();
});

loadSignals();
