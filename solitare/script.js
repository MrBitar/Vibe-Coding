(function () {
  const SUITS = [
    { name: "spades", symbol: "♠", color: "black" },
    { name: "hearts", symbol: "♥", color: "red" },
    { name: "clubs", symbol: "♣", color: "black" },
    { name: "diamonds", symbol: "♦", color: "red" },
  ];
  const RANK_LABELS = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

  let stock = [];
  let waste = [];
  let foundations = [[], [], [], []];
  let tableau = [[], [], [], [], [], [], []];
  let selection = null; // { source: 'tableau'|'waste'|'foundation', col, cardIndex }
  let moveCount = 0;
  let cardIdCounter = 0;
  let history = [];
  let hintTimer = null;
  let autoPlayTimer = null;

  function makeDeck() {
    const deck = [];
    for (let s = 0; s < 4; s++) {
      for (let r = 1; r <= 13; r++) {
        deck.push({ suit: s, rank: r, faceUp: false, id: cardIdCounter++ });
      }
    }
    return deck;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function colorOf(card) {
    return SUITS[card.suit].color;
  }

  function snapshot() {
    return {
      stock: stock.map((c) => ({ ...c })),
      waste: waste.map((c) => ({ ...c })),
      foundations: foundations.map((pile) => pile.map((c) => ({ ...c }))),
      tableau: tableau.map((pile) => pile.map((c) => ({ ...c }))),
      moveCount,
    };
  }

  function pushHistory() {
    history.push(snapshot());
    if (history.length > 200) history.shift();
  }

  function undo() {
    if (history.length === 0) return;
    const s = history.pop();
    stock = s.stock;
    waste = s.waste;
    foundations = s.foundations;
    tableau = s.tableau;
    moveCount = s.moveCount;
    clearSelection();
    document.getElementById("moves").textContent = "Moves: " + moveCount;
    setStatus("");
    render();
  }

  function dealNewGame() {
    if (autoPlayTimer) {
      clearInterval(autoPlayTimer);
      autoPlayTimer = null;
    }
    stock = shuffle(makeDeck());
    waste = [];
    foundations = [[], [], [], []];
    tableau = [[], [], [], [], [], [], []];
    selection = null;
    moveCount = 0;
    history = [];

    for (let col = 0; col < 7; col++) {
      for (let i = 0; i <= col; i++) {
        const card = stock.pop();
        card.faceUp = i === col;
        tableau[col].push(card);
      }
    }
    updateMoves(0);
    setStatus("");
    render();
  }

  function setStatus(text) {
    document.getElementById("status").textContent = text;
  }

  function updateMoves(delta) {
    moveCount += delta;
    document.getElementById("moves").textContent = "Moves: " + moveCount;
  }

  function canPlaceOnTableau(card, destCol) {
    const dest = tableau[destCol];
    if (dest.length === 0) return card.rank === 13;
    const top = dest[dest.length - 1];
    if (!top.faceUp) return false;
    return top.rank === card.rank + 1 && colorOf(top) !== colorOf(card);
  }

  function canPlaceOnFoundation(card, suitIndex) {
    if (card.suit !== suitIndex) return false;
    const pile = foundations[suitIndex];
    if (pile.length === 0) return card.rank === 1;
    return pile[pile.length - 1].rank === card.rank - 1;
  }

  function isValidRun(cards) {
    for (let i = 0; i < cards.length - 1; i++) {
      if (!cards[i].faceUp || !cards[i + 1].faceUp) return false;
      if (cards[i].rank !== cards[i + 1].rank + 1) return false;
      if (colorOf(cards[i]) === colorOf(cards[i + 1])) return false;
    }
    return true;
  }

  function clearSelection() {
    selection = null;
  }

  function onStockClick() {
    if (stock.length === 0) {
      if (waste.length === 0) return;
      pushHistory();
      while (waste.length) {
        const c = waste.pop();
        c.faceUp = false;
        stock.push(c);
      }
      updateMoves(1);
    } else {
      pushHistory();
      const c = stock.pop();
      c.faceUp = true;
      waste.push(c);
      updateMoves(1);
    }
    clearSelection();
    render();
  }

  function tryAutoMoveToFoundation(card) {
    for (let s = 0; s < 4; s++) {
      if (canPlaceOnFoundation(card, s)) return s;
    }
    return -1;
  }

  function removeFromSource(sel) {
    if (sel.source === "waste") {
      return [waste.pop()];
    }
    if (sel.source === "foundation") {
      return [foundations[sel.col].pop()];
    }
    if (sel.source === "tableau") {
      const col = tableau[sel.col];
      const picked = col.splice(sel.cardIndex, col.length - sel.cardIndex);
      if (col.length > 0) col[col.length - 1].faceUp = true;
      return picked;
    }
    return [];
  }

  function onWasteClick() {
    if (waste.length === 0) return;
    if (selection && selection.source === "waste") {
      clearSelection();
    } else {
      selection = { source: "waste", col: null, cardIndex: waste.length - 1 };
    }
    render();
  }

  function onFoundationClick(suitIndex) {
    const pile = foundations[suitIndex];
    if (selection) {
      const cards = selectionCards();
      if (cards.length === 1 && canPlaceOnFoundation(cards[0], suitIndex)) {
        pushHistory();
        const moved = removeFromSource(selection);
        foundations[suitIndex].push(moved[0]);
        updateMoves(1);
        clearSelection();
        checkWin();
        render();
        return;
      }
      clearSelection();
      render();
      return;
    }
    if (pile.length === 0) return;
    selection = { source: "foundation", col: suitIndex, cardIndex: pile.length - 1 };
    render();
  }

  function selectionCards() {
    if (!selection) return [];
    if (selection.source === "waste") return [waste[waste.length - 1]];
    if (selection.source === "foundation") {
      const pile = foundations[selection.col];
      return pile.length ? [pile[pile.length - 1]] : [];
    }
    if (selection.source === "tableau") {
      return tableau[selection.col].slice(selection.cardIndex);
    }
    return [];
  }

  function onTableauCardClick(col, cardIndex) {
    const pile = tableau[col];
    const card = pile[cardIndex];

    if (selection) {
      const isSameCard =
        selection.source === "tableau" &&
        selection.col === col &&
        selection.cardIndex === cardIndex;
      if (isSameCard) {
        clearSelection();
        render();
        return;
      }
      const moving = selectionCards();
      if (moving.length && canPlaceOnTableau(moving[0], col)) {
        pushHistory();
        const removed = removeFromSource(selection);
        tableau[col].push(...removed);
        updateMoves(1);
        clearSelection();
        checkWin();
        render();
        return;
      }
    }

    if (!card.faceUp) {
      clearSelection();
      render();
      return;
    }

    const run = pile.slice(cardIndex);
    if (!isValidRun(run)) {
      clearSelection();
      render();
      return;
    }
    selection = { source: "tableau", col, cardIndex };
    render();
  }

  function onTableauEmptyClick(col) {
    if (!selection) return;
    const moving = selectionCards();
    if (tableau[col].length === 0 && moving.length && canPlaceOnTableau(moving[0], col)) {
      pushHistory();
      const removed = removeFromSource(selection);
      tableau[col].push(...removed);
      updateMoves(1);
      clearSelection();
      checkWin();
    } else {
      clearSelection();
    }
    render();
  }

  function onTableauDoubleClick(col, cardIndex) {
    const pile = tableau[col];
    const card = pile[cardIndex];
    if (!card.faceUp || cardIndex !== pile.length - 1) return;
    const dest = tryAutoMoveToFoundation(card);
    if (dest >= 0) {
      pushHistory();
      pile.pop();
      if (pile.length > 0) pile[pile.length - 1].faceUp = true;
      foundations[dest].push(card);
      updateMoves(1);
      clearSelection();
      checkWin();
      render();
    }
  }

  function onWasteDoubleClick() {
    if (waste.length === 0) return;
    const card = waste[waste.length - 1];
    const dest = tryAutoMoveToFoundation(card);
    if (dest >= 0) {
      pushHistory();
      waste.pop();
      foundations[dest].push(card);
      updateMoves(1);
      clearSelection();
      checkWin();
      render();
    }
  }

  function findHint() {
    if (waste.length) {
      const card = waste[waste.length - 1];
      const dest = tryAutoMoveToFoundation(card);
      if (dest >= 0) return { type: "foundation", card, to: { pile: "foundation", index: dest } };
    }
    for (let col = 0; col < 7; col++) {
      const pile = tableau[col];
      if (!pile.length) continue;
      const card = pile[pile.length - 1];
      if (!card.faceUp) continue;
      const dest = tryAutoMoveToFoundation(card);
      if (dest >= 0) return { type: "foundation", card, to: { pile: "foundation", index: dest } };
    }
    for (let col = 0; col < 7; col++) {
      const pile = tableau[col];
      for (let idx = 0; idx < pile.length; idx++) {
        if (!pile[idx].faceUp) continue;
        const run = pile.slice(idx);
        if (!isValidRun(run)) continue;
        for (let dcol = 0; dcol < 7; dcol++) {
          if (dcol === col) continue;
          if (idx === 0 && tableau[dcol].length === 0) continue;
          if (canPlaceOnTableau(run[0], dcol)) {
            return { type: "tableau", card: run[0], to: { pile: "tableau", index: dcol } };
          }
        }
      }
    }
    if (waste.length) {
      const card = waste[waste.length - 1];
      for (let dcol = 0; dcol < 7; dcol++) {
        if (canPlaceOnTableau(card, dcol)) {
          return { type: "tableau", card, to: { pile: "tableau", index: dcol } };
        }
      }
    }
    if (stock.length > 0) return { type: "draw" };
    if (waste.length > 0) return { type: "recycle" };
    return null;
  }

  function findCardElement(card) {
    return document.querySelector('.card[data-card-id="' + card.id + '"]');
  }

  function clearHintGlow() {
    document.querySelectorAll(".hint-glow").forEach((el) => el.classList.remove("hint-glow"));
  }

  function showHint() {
    clearHintGlow();
    if (hintTimer) clearTimeout(hintTimer);
    const hint = findHint();
    if (!hint) {
      setStatus("No moves left — try Undo or New Game.");
      return;
    }
    setStatus("");
    const sourceEl = hint.card ? findCardElement(hint.card) : document.getElementById("stock");
    let destEl = null;
    if (hint.to) {
      if (hint.to.pile === "foundation") {
        destEl = document.getElementById("foundation-" + hint.to.index);
      } else if (hint.to.pile === "tableau") {
        const pile = tableau[hint.to.index];
        destEl = pile.length ? findCardElement(pile[pile.length - 1]) : document.getElementById("tableau-" + hint.to.index);
      }
    }
    if (sourceEl) sourceEl.classList.add("hint-glow");
    if (destEl) destEl.classList.add("hint-glow");
    hintTimer = setTimeout(clearHintGlow, 1800);
  }

  function hasAnyFoundationMove() {
    if (waste.length && tryAutoMoveToFoundation(waste[waste.length - 1]) >= 0) return true;
    for (let col = 0; col < 7; col++) {
      const pile = tableau[col];
      const card = pile[pile.length - 1];
      if (card && card.faceUp && tryAutoMoveToFoundation(card) >= 0) return true;
    }
    return false;
  }

  function autoCompleteStep() {
    if (waste.length) {
      const card = waste[waste.length - 1];
      const dest = tryAutoMoveToFoundation(card);
      if (dest >= 0) {
        waste.pop();
        foundations[dest].push(card);
        updateMoves(1);
        return true;
      }
    }
    for (let col = 0; col < 7; col++) {
      const pile = tableau[col];
      const card = pile[pile.length - 1];
      if (!card || !card.faceUp) continue;
      const dest = tryAutoMoveToFoundation(card);
      if (dest >= 0) {
        pile.pop();
        if (pile.length > 0) pile[pile.length - 1].faceUp = true;
        foundations[dest].push(card);
        updateMoves(1);
        return true;
      }
    }
    return false;
  }

  function autoComplete() {
    if (autoPlayTimer) return;
    if (!hasAnyFoundationMove()) {
      setStatus("No more cards can be auto-completed.");
      return;
    }
    setStatus("");
    clearSelection();
    clearHintGlow();
    pushHistory();
    autoPlayTimer = setInterval(() => {
      const moved = autoCompleteStep();
      render();
      if (!moved) {
        clearInterval(autoPlayTimer);
        autoPlayTimer = null;
        checkWin();
        render();
      }
    }, 150);
    render();
  }

  function checkWin() {
    const total = foundations.reduce((sum, f) => sum + f.length, 0);
    if (total === 52) {
      document.getElementById("winMoves").textContent = "Completed in " + moveCount + " moves.";
      document.getElementById("winOverlay").classList.remove("hidden");
    }
  }

  function makeCardEl(card, faceUpOverride) {
    const faceUp = faceUpOverride === undefined ? card.faceUp : faceUpOverride;
    const el = document.createElement("div");
    el.className = "card";
    el.dataset.cardId = card.id;
    if (faceUp) {
      const face = document.createElement("div");
      face.className = "card-face " + SUITS[card.suit].color;
      const label = RANK_LABELS[card.rank];
      const symbol = SUITS[card.suit].symbol;
      face.innerHTML =
        '<div class="corner top"><span>' + label + "</span><span>" + symbol + '</span></div>' +
        '<div class="center-suit">' + symbol + '</div>' +
        '<div class="corner bottom"><span>' + label + "</span><span>" + symbol + '</span></div>';
      el.appendChild(face);
    } else {
      const back = document.createElement("div");
      back.className = "card-back";
      el.appendChild(back);
    }
    return el;
  }

  function isSelected(source, col, idx) {
    return (
      selection &&
      selection.source === source &&
      selection.col === col &&
      idx >= selection.cardIndex
    );
  }

  function render() {
    // Stock
    const stockEl = document.getElementById("stock");
    stockEl.innerHTML = "";
    if (stock.length > 0) {
      stockEl.appendChild(makeCardEl(stock[stock.length - 1], false));
    } else {
      const hint = document.createElement("div");
      hint.className = "pile-hint";
      hint.textContent = "↺";
      stockEl.appendChild(hint);
    }
    stockEl.onclick = onStockClick;

    // Waste
    const wasteEl = document.getElementById("waste");
    wasteEl.innerHTML = "";
    if (waste.length > 0) {
      const top = waste[waste.length - 1];
      const cardEl = makeCardEl(top, true);
      if (isSelected("waste", null, waste.length - 1)) cardEl.classList.add("selected");
      cardEl.onclick = (e) => { e.stopPropagation(); onWasteClick(); };
      cardEl.ondblclick = (e) => { e.stopPropagation(); onWasteDoubleClick(); };
      wasteEl.appendChild(cardEl);
    }
    wasteEl.onclick = () => {};

    // Foundations
    for (let s = 0; s < 4; s++) {
      const el = document.getElementById("foundation-" + s);
      el.innerHTML = "";
      const pile = foundations[s];
      if (pile.length > 0) {
        const top = pile[pile.length - 1];
        const cardEl = makeCardEl(top, true);
        if (isSelected("foundation", s, pile.length - 1)) cardEl.classList.add("selected");
        cardEl.onclick = (e) => { e.stopPropagation(); onFoundationClick(s); };
        el.appendChild(cardEl);
      } else {
        const hint = document.createElement("div");
        hint.className = "pile-hint";
        hint.textContent = SUITS[s].symbol;
        el.appendChild(hint);
      }
      el.onclick = () => onFoundationClick(s);
    }

    // Tableau
    for (let col = 0; col < 7; col++) {
      const el = document.getElementById("tableau-" + col);
      el.innerHTML = "";
      const pile = tableau[col];
      pile.forEach((card, idx) => {
        const cardEl = makeCardEl(card);
        cardEl.style.top = idx * 34 + "px";
        cardEl.style.zIndex = idx;
        if (isSelected("tableau", col, idx)) cardEl.classList.add("selected");
        cardEl.onclick = (e) => { e.stopPropagation(); onTableauCardClick(col, idx); };
        cardEl.ondblclick = (e) => { e.stopPropagation(); onTableauDoubleClick(col, idx); };
        el.appendChild(cardEl);
      });
      el.onclick = () => onTableauEmptyClick(col);
    }

    document.getElementById("undoBtn").disabled = history.length === 0;
    document.getElementById("autoBtn").disabled = autoPlayTimer !== null || !hasAnyFoundationMove();
  }

  function maximizeWindow() {
    try {
      window.moveTo(0, 0);
      window.resizeTo(screen.availWidth, screen.availHeight);
    } catch (e) {
      // Some browsers block programmatic resize of user-opened windows; ignored.
    }
  }

  document.getElementById("newGameBtn").addEventListener("click", () => {
    document.getElementById("winOverlay").classList.add("hidden");
    dealNewGame();
  });
  document.getElementById("undoBtn").addEventListener("click", undo);
  document.getElementById("hintBtn").addEventListener("click", showHint);
  document.getElementById("autoBtn").addEventListener("click", autoComplete);
  document.getElementById("playAgainBtn").addEventListener("click", () => {
    document.getElementById("winOverlay").classList.add("hidden");
    dealNewGame();
  });

  window.addEventListener("load", maximizeWindow);

  dealNewGame();
})();
