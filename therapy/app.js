// Crisis screening runs before anything else, per CLAUDE.md safety rule #2.
const CRISIS_PATTERNS = [
  /\bsuicid/i,
  /kill (myself|me)/i,
  /want(ed)? to die/i,
  /end(ing)? (my|it all|my life)/i,
  /no reason to (live|go on)/i,
  /better off dead/i,
  /can'?t go on/i,
  /hurt(ing)? (myself|me) (badly|seriously)/i,
  /harm(ing)? myself/i,
  /kill (someone|him|her|them)/i,
  /hurt (someone|him|her|them) (badly|seriously)/i,
  /being abused/i,
  /not safe (at home|here)/i
];

let knowledgeBase = [];
let selectedMoodIds = new Set();

async function loadKnowledgeBase() {
  const res = await fetch("data/knowledge-base.json");
  knowledgeBase = await res.json();
  renderMoodPicker();
}

function renderMoodPicker() {
  const container = document.getElementById("mood-picker");
  container.innerHTML = "";
  knowledgeBase.forEach(entry => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mood-btn";
    btn.textContent = entry.label;
    btn.dataset.id = entry.id;
    btn.addEventListener("click", () => {
      if (selectedMoodIds.has(entry.id)) {
        selectedMoodIds.delete(entry.id);
        btn.classList.remove("selected");
      } else {
        selectedMoodIds.add(entry.id);
        btn.classList.add("selected");
      }
    });
    container.appendChild(btn);
  });
}

function detectCrisis(text) {
  return CRISIS_PATTERNS.some(pattern => pattern.test(text));
}

function matchFreeText(text) {
  const lower = text.toLowerCase();
  return knowledgeBase.filter(entry =>
    entry.tags.some(tag => lower.includes(tag.toLowerCase()))
  );
}

function renderEntry(entry) {
  const card = document.createElement("div");
  card.className = "entry-card";

  const secondary = entry.secondaryLink
    ? ` &middot; <a href="${entry.secondaryLink}" target="_blank" rel="noopener">${entry.secondaryLabel || "additional source"}</a>`
    : "";

  card.innerHTML = `
    <h3>${entry.label}</h3>
    <div class="entry-modality">${entry.modality} — ${entry.therapist}</div>
    <p>${entry.caseSummary}</p>
    <p class="entry-caveats">${entry.caveats}</p>
    <div class="entry-source">
      <strong>Source:</strong> ${entry.source}<br>
      <a href="${entry.link}" target="_blank" rel="noopener">Read the original source</a>${secondary}
    </div>
  `;
  return card;
}

function renderResults(matches) {
  const results = document.getElementById("results");
  const content = document.getElementById("results-content");
  content.innerHTML = "";
  results.hidden = false;

  if (matches.length === 0) {
    const p = document.createElement("p");
    p.className = "no-match";
    p.textContent = "We don't have a well-sourced, linked match for exactly what you described yet. " +
      "That's a gap in this site's library, not a sign nothing can help — a licensed therapist or counselor " +
      "can help even where this page can't yet point to a specific documented case.";
    content.appendChild(p);
  } else {
    const reflection = document.createElement("p");
    reflection.className = "reflection";
    reflection.textContent = `Based on what you described, here's what's been documented to help people in similar situations:`;
    content.appendChild(reflection);

    matches.forEach(entry => content.appendChild(renderEntry(entry)));
  }

  const closing = document.createElement("div");
  closing.className = "closing-note";
  closing.textContent = "None of this is a diagnosis, and it isn't personalized to you specifically — it's a " +
    "summary of documented cases with similar themes. If any of it resonates, that's worth bringing to a " +
    "licensed therapist or counselor who can look at your actual situation.";
  content.appendChild(closing);

  results.scrollIntoView({ behavior: "smooth", block: "start" });
}

function handleSubmit() {
  const text = document.getElementById("free-text").value.trim();
  const crisisBanner = document.getElementById("crisis-banner");

  if (text && detectCrisis(text)) {
    crisisBanner.hidden = false;
    crisisBanner.scrollIntoView({ behavior: "smooth", block: "start" });
  } else {
    crisisBanner.hidden = true;
  }

  const picked = knowledgeBase.filter(entry => selectedMoodIds.has(entry.id));
  const fromText = text ? matchFreeText(text) : [];

  const seen = new Set();
  const combined = [...picked, ...fromText].filter(entry => {
    if (seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });

  renderResults(combined);
}

document.getElementById("submit-btn").addEventListener("click", handleSubmit);
loadKnowledgeBase();
