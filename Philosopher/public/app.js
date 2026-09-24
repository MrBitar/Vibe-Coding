const menuView = document.getElementById("menu-view");
const chatView = document.getElementById("chat-view");
const grid = document.getElementById("philosopher-grid");
const backBtn = document.getElementById("back-btn");
const chatName = document.getElementById("chat-name");
const chatPhilosophy = document.getElementById("chat-philosophy");
const messagesEl = document.getElementById("messages");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");

let currentPhilosopher = null;
let history = []; // [{role: "user"|"assistant", content: string}]

async function loadPhilosophers() {
  const res = await fetch("/api/philosophers");
  const philosophers = await res.json();
  grid.innerHTML = "";
  for (const p of philosophers) {
    const card = document.createElement("button");
    card.className = "philosopher-card";
    card.innerHTML = `
      <div class="philosophy">${escapeHtml(p.philosophy)}</div>
      <div class="name">${escapeHtml(p.name)}</div>
      <div class="tagline">${escapeHtml(p.tagline)}</div>
    `;
    card.addEventListener("click", () => openChat(p));
    grid.appendChild(card);
  }
}

function openChat(p) {
  currentPhilosopher = p;
  history = [];
  messagesEl.innerHTML = "";
  chatName.textContent = p.name;
  chatPhilosophy.textContent = p.philosophy;
  menuView.hidden = true;
  chatView.hidden = false;
  chatInput.focus();
}

backBtn.addEventListener("click", () => {
  chatView.hidden = true;
  menuView.hidden = false;
  currentPhilosopher = null;
});

function addMessageBubble(role, text) {
  const el = document.createElement("div");
  el.className = `message ${role === "user" ? "user" : "philosopher"}`;
  el.textContent = text;
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return el;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text || !currentPhilosopher) return;

  chatInput.value = "";
  chatInput.style.height = "auto";
  history.push({ role: "user", content: text });
  addMessageBubble("user", text);

  sendBtn.disabled = true;
  chatInput.disabled = true;

  const bubble = addMessageBubble("philosopher", "");
  bubble.classList.add("streaming");

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        philosopherId: currentPhilosopher.id,
        messages: history,
      }),
    });

    if (!res.ok || !res.body) {
      const errText = await res.text();
      bubble.textContent = `[Error: ${errText || res.statusText}]`;
      bubble.classList.remove("streaming");
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullText += decoder.decode(value, { stream: true });
      bubble.textContent = fullText;
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    bubble.classList.remove("streaming");
    history.push({ role: "assistant", content: fullText });
  } catch (err) {
    bubble.textContent = `[Error: ${err.message}]`;
    bubble.classList.remove("streaming");
  } finally {
    sendBtn.disabled = false;
    chatInput.disabled = false;
    chatInput.focus();
  }
});

chatInput.addEventListener("input", () => {
  chatInput.style.height = "auto";
  chatInput.style.height = Math.min(chatInput.scrollHeight, 140) + "px";
});

chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    chatForm.requestSubmit();
  }
});

loadPhilosophers();
