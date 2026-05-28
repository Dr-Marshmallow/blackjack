// blackjack
// last updated: 10/8/2024

const debug = true;
const suits  = ["C", "D", "H", "S"];
const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"];
const ACE_VALUE       = 11;
const STARTING_FISHES = 1500;

const cardSfx     = new Audio("assets/sfx/new_card.mp3");
const gameOverSfx = new Audio("assets/sfx/card_game_over.wav");

// ── Deck ──────────────────────────────────────────────────────────────────────
var deck = [];

// ── Dealer state ──────────────────────────────────────────────────────────────
var dealerValue      = 0;
var dealerAceCount   = 0;
var dealerExtraCards = 0;
var dealerRevealed   = false;
var hiddenCard;
var dealerFaceUpCard = null;

// ── Player state (array supports split) ───────────────────────────────────────
// Each hand: { value, aceCount, cards: [], bet, doubled }
var playerHands   = [];
var activeHandIdx = 0;
var hasSplit      = false;
var splitAces     = false;

// ── Game control ──────────────────────────────────────────────────────────────
var canHit  = false;
var canStay = false;
var sounds  = true;
var animationDelay = 500;

// ── Fishes & Points ───────────────────────────────────────────────────────────
var fishes         = STARTING_FISHES;
var currentBet     = 0;
var totalPoints    = 0;
var chipsAtBetTime = 0;
var lastSavedName  = null;

// ── DOM refs ──────────────────────────────────────────────────────────────────
var hitBtn, stayBtn, doubleBtn, splitBtn;
var soundsBtn, hintsBtn, playAgainBtn;
var bettingArea, chipsDisplay, betDisplay, dealBtn, clearBetBtn;
var pointsDisplay;
var rulesBtn, rulesModal, rulesCloseBtn;
var leaderboardBtn, leaderboardModal, leaderboardCloseBtn;
var gameoverModal, gameoverCloseBtn;

window.onload = function()
{
    preloadImages();

    hitBtn        = document.getElementById("hit-btn");
    stayBtn       = document.getElementById("stay-btn");
    doubleBtn     = document.getElementById("double-btn");
    splitBtn      = document.getElementById("split-btn");
    soundsBtn     = document.getElementById("sounds-btn");
    hintsBtn      = document.getElementById("hints-btn");
    playAgainBtn  = document.getElementById("play-again-btn");
    bettingArea   = document.getElementById("betting-area");
    chipsDisplay  = document.getElementById("chips-display");
    betDisplay    = document.getElementById("bet-display");
    dealBtn       = document.getElementById("deal-btn");
    clearBetBtn   = document.getElementById("clear-bet-btn");
    pointsDisplay = document.getElementById("points-display");

    rulesBtn         = document.getElementById("rules-btn");
    rulesModal       = document.getElementById("rules-modal");
    rulesCloseBtn    = document.getElementById("rules-close-btn");
    leaderboardBtn   = document.getElementById("leaderboard-btn");
    leaderboardModal = document.getElementById("leaderboard-modal");
    leaderboardCloseBtn = document.getElementById("leaderboard-close-btn");
    gameoverModal    = document.getElementById("gameover-modal");
    gameoverCloseBtn = document.getElementById("gameover-close-btn");

    hitBtn.addEventListener("click", hit);
    stayBtn.addEventListener("click", stay);
    doubleBtn.addEventListener("click", doubleDown);
    splitBtn.addEventListener("click", split);
    soundsBtn.addEventListener("click", toggleSound);
    hintsBtn.addEventListener("click", toggleHints);
    playAgainBtn.addEventListener("click", playAgain);
    dealBtn.addEventListener("click", dealCards);
    clearBetBtn.addEventListener("click", clearBet);

    rulesBtn.addEventListener("click", () => rulesModal.style.display = "flex");
    rulesCloseBtn.addEventListener("click", () => rulesModal.style.display = "none");
    rulesModal.addEventListener("click", e => { if (e.target === rulesModal) rulesModal.style.display = "none"; });

    leaderboardBtn.addEventListener("click", () => { renderLeaderboard(); leaderboardModal.style.display = "flex"; });
    leaderboardCloseBtn.addEventListener("click", () => leaderboardModal.style.display = "none");
    leaderboardModal.addEventListener("click", e => { if (e.target === leaderboardModal) leaderboardModal.style.display = "none"; });

    gameoverCloseBtn.addEventListener("click", () => gameoverModal.style.display = "none");
    gameoverModal.addEventListener("click", e => { if (e.target === gameoverModal) gameoverModal.style.display = "none"; });

    document.querySelectorAll(".chip-btn").forEach(btn =>
        btn.addEventListener("click", () => placeBet(parseInt(btn.dataset.amount)))
    );

    [hitBtn, stayBtn, doubleBtn, splitBtn, playAgainBtn].forEach(b => b.style.visibility = "hidden");

    startBettingPhase();
};

// ── Betting phase ─────────────────────────────────────────────────────────────

function startBettingPhase()
{
    currentBet = 0;
    updateHUD();
    bettingArea.style.display = "flex";
    [hitBtn, stayBtn, doubleBtn, splitBtn, playAgainBtn].forEach(b => b.style.visibility = "hidden");
    updateChipButtonStates();
}

function placeBet(amount)
{
    if (currentBet + amount > fishes) return;
    currentBet += amount;
    updateHUD();
    updateChipButtonStates();
}

function clearBet()
{
    currentBet = 0;
    updateHUD();
    updateChipButtonStates();
}

function dealCards()
{
    if (currentBet === 0) return;
    chipsAtBetTime = fishes;        // capture BEFORE deduction (used in risk bonus)
    fishes -= currentBet;
    updateHUD();
    bettingArea.style.display = "none";
    startGame();
}

function updateHUD()
{
    chipsDisplay.textContent  = "Fishes: " + fishes;
    betDisplay.textContent    = "Bet: "    + currentBet;
    pointsDisplay.textContent = "Points: " + totalPoints;
}

function updateChipButtonStates()
{
    document.querySelectorAll(".chip-btn").forEach(btn => {
        btn.disabled = (currentBet + parseInt(btn.dataset.amount) > fishes);
    });
    dealBtn.disabled = (currentBet === 0);
}

// ── Game setup ────────────────────────────────────────────────────────────────

async function startGame()
{
    deck = [];
    buildDeck();
    shuffleDeck();

    dealerValue      = 0;
    dealerAceCount   = 0;
    dealerExtraCards = 0;
    dealerRevealed   = false;
    dealerFaceUpCard = null;
    hasSplit         = false;
    splitAces        = false;
    activeHandIdx    = 0;
    playerHands      = [{ value: 0, aceCount: 0, cards: [], bet: currentBet, doubled: false }];

    document.getElementById("hand-wrap-2").style.display = "none";
    ["player-hand", "player-hand-2"].forEach(id => {
        document.getElementById(id).className = '';
    });
    resetScores();

    dealToPlayer(0);
    await wait(animationDelay);
    dealToDealer();
    await wait(animationDelay);
    dealToPlayer(0);
    await wait(animationDelay);
    addHiddenCard();

    canHit  = true;
    canStay = true;
    updateActionButtons();

    if (getPlayerHand(0) === 21)
    {
        markHandBlackjack(0);
        canHit  = false;
        canStay = false;
        updateActionButtons();
        await wait(animationDelay * 2);
        await finishHand();
    }
}

// ── Deck ──────────────────────────────────────────────────────────────────────

function buildDeck()
{
    suits.forEach(s => values.forEach(v => deck.push(v + "-" + s)));
}

function shuffleDeck()
{
    let i = deck.length;
    while (i--)
    {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

// ── Card dealing ──────────────────────────────────────────────────────────────

function dealToDealer()
{
    const card  = deck.pop();
    const value = getCardValue(card);
    if (dealerFaceUpCard === null) dealerFaceUpCard = card;   // first call = face-up card
    dealerValue += value;
    if (value === ACE_VALUE) dealerAceCount++;
    log("dealer: " + card);
    spawnCard(createCard(card), "dealer-hand");
    updateDealerScore();
}

function dealToPlayer(handIdx)
{
    const card  = deck.pop();
    const value = getCardValue(card);
    const h     = playerHands[handIdx];
    h.cards.push(card);
    h.value += value;
    if (value === ACE_VALUE) h.aceCount++;
    log("player[" + handIdx + "]: " + card);
    spawnCard(createCard(card), handIdx === 0 ? "player-hand" : "player-hand-2");
    updatePlayerScore(handIdx);
}

function addHiddenCard()
{
    hiddenCard     = document.createElement("img");
    hiddenCard.src = "assets/cards/hidden.png";
    spawnCard(hiddenCard, "dealer-hand");
    updateDealerScore();
}

function revealCard()
{
    const card  = deck.pop();
    const value = getCardValue(card);
    hiddenCard.src = "assets/cards/" + card + ".png";
    dealerValue += value;
    if (value === ACE_VALUE) dealerAceCount++;
    log("dealer reveal: " + card);
    playSound(cardSfx);
    dealerRevealed = true;
    updateDealerScore();
}

function spawnCard(card, targetId)
{
    playSound(cardSfx);
    document.getElementById(targetId).appendChild(card);
}

function createCard(card)
{
    const img = document.createElement("img");
    img.src = "assets/cards/" + card + ".png";
    return img;
}

// ── Hand values ───────────────────────────────────────────────────────────────

function getDealerHand()
{
    while (dealerValue > 21 && dealerAceCount > 0)
    {
        dealerValue -= 10;
        dealerAceCount--;
    }
    return dealerValue;
}

function getPlayerHand(idx)
{
    const h = playerHands[idx];
    while (h.value > 21 && h.aceCount > 0)
    {
        h.value -= 10;
        h.aceCount--;
    }
    return h.value;
}

// ── Player actions ────────────────────────────────────────────────────────────

async function hit()
{
    if (!canHit) return;
    dealToPlayer(activeHandIdx);
    const total = getPlayerHand(activeHandIdx);
    if (total > 21)
    {
        markHandBust(activeHandIdx);
        await wait(animationDelay);
        await finishHand();
    }
    else if (total === 21)
    {
        await wait(animationDelay);
        await finishHand();
    }
    else
    {
        updateActionButtons();
    }
}

async function stay()
{
    if (!canStay) return;
    await finishHand();
}

async function doubleDown()
{
    if (!canHit || !canStay) return;
    const h = playerHands[activeHandIdx];
    if (fishes < h.bet) return;

    fishes -= h.bet;
    h.bet     *= 2;
    h.doubled  = true;
    updateHUD();

    canHit  = false;
    canStay = false;
    updateActionButtons();

    dealToPlayer(activeHandIdx);
    if (getPlayerHand(activeHandIdx) > 21) markHandBust(activeHandIdx);
    await wait(animationDelay);
    await finishHand();
}

async function split()
{
    if (!canHit || !canStay || hasSplit) return;
    const h = playerHands[0];
    if (h.cards.length !== 2 || fishes < currentBet || !isSplittable(h)) return;

    const splitCard  = h.cards.pop();
    const splitValue = getCardValue(splitCard);
    h.value -= splitValue;
    if (splitValue === ACE_VALUE) h.aceCount--;

    fishes -= currentBet;
    updateHUD();

    playerHands.push({
        value:    splitValue,
        aceCount: splitValue === ACE_VALUE ? 1 : 0,
        cards:    [splitCard],
        bet:      currentBet,
        doubled:  false
    });
    hasSplit = true;

    const hand1El = document.getElementById("player-hand");
    const hand2El = document.getElementById("player-hand-2");
    document.getElementById("hand-wrap-2").style.display = "flex";
    hand2El.appendChild(hand1El.lastElementChild);

    canHit  = false;
    canStay = false;
    updateActionButtons();

    await wait(animationDelay * 0.5);
    dealToPlayer(0);
    await wait(animationDelay);
    dealToPlayer(1);
    await wait(animationDelay * 0.5);

    activeHandIdx = 0;
    updateActiveHandIndicator();

    if (splitValue === ACE_VALUE)
    {
        splitAces = true;
        await wait(animationDelay);
        await finishHand();
    }
    else
    {
        canHit  = true;
        canStay = true;
        updateActionButtons();
    }
}

async function finishHand()
{
    canHit  = false;
    canStay = false;
    updateActionButtons();

    if (activeHandIdx < playerHands.length - 1)
    {
        activeHandIdx++;
        updateActiveHandIndicator();

        if (splitAces)
        {
            await wait(animationDelay * 0.5);
            await finishHand();
        }
        else
        {
            canHit  = true;
            canStay = true;
            updateActionButtons();
        }
    }
    else
    {
        await dealerPlay();
    }
}

// ── Dealer logic ──────────────────────────────────────────────────────────────

async function dealerPlay()
{
    revealCard();
    await wait(animationDelay);

    while (getDealerHand() < 17)
    {
        dealToDealer();
        dealerExtraCards++;
        await wait(animationDelay * 1.5);
    }

    await wait(animationDelay * 0.25);
    checkWinner();
}

// ── Points calculation ────────────────────────────────────────────────────────

function calcPoints(outcome, bet, playerScore, dealerScore, handObj)
{
    if (outcome === "dealer") return 0;

    var m = 1.0;
    if (outcome === "player" || outcome === "blackjack") m += 1.5;
    if (outcome === "blackjack") m += 2.0;

    var rank = dealerFaceUpCard ? dealerFaceUpCard.split("-")[0] : null;
    if (rank === "T" || rank === "J" || rank === "Q" || rank === "K") m += 1.0;
    else if (rank === "A") m += 1.5;

    if (handObj.doubled) m += 1.0;

    if (dealerScore > 21)
    {
        m += 0.5;
    }
    else if (outcome !== "draw")
    {
        m += (playerScore - dealerScore) / 21;
    }

    if (chipsAtBetTime > 0) m += bet / chipsAtBetTime;

    return Math.round(bet * m);
}

// ── Winner determination ──────────────────────────────────────────────────────

function checkWinner()
{
    const dealer   = getDealerHand();
    const dealerBJ = dealerExtraCards === 0 && dealer === 21;

    const messages = [];
    let   totalDelta = 0;

    playerHands.forEach((ph, i) =>
    {
        const player   = getPlayerHand(i);
        const playerBJ = !hasSplit && ph.cards.length === 2 && player === 21;
        const label    = playerHands.length > 1 ? "Hand " + (i + 1) + ": " : "";

        let outcome, msg;

        if (player > 21)
        {
            outcome = "dealer";    msg = label + "Bust";
        }
        else if (dealer > 21)
        {
            outcome = "player";    msg = label + "Dealer busted";
        }
        else if (playerBJ && dealerBJ)
        {
            outcome = "draw";      msg = label + "Both Blackjack";
        }
        else if (playerBJ)
        {
            outcome = "blackjack"; msg = label + "Blackjack!";
        }
        else if (dealerBJ)
        {
            outcome = "dealer";    msg = label + "Dealer Blackjack";
        }
        else if (player === dealer)
        {
            outcome = "draw";      msg = label + "Push";
        }
        else if (player > dealer)
        {
            outcome = "player";    msg = label + "You win";
        }
        else
        {
            outcome = "dealer";    msg = label + "Dealer wins";
        }

        const fishDelta = applyBetOutcome(outcome, ph.bet);
        totalDelta += fishDelta;

        const pts = calcPoints(outcome, ph.bet, player, dealer, ph);
        totalPoints += pts;

        if (fishDelta > 0)      msg += " (+" + fishDelta + " fishes";
        else if (fishDelta < 0) msg += " (" + fishDelta + " fishes";
        else                    msg += " (push";

        if (pts > 0) msg += ", +" + pts + " pts)";
        else         msg += ")";

        messages.push(msg);
    });

    let statusText = messages.join("\n");
    if (playerHands.length > 1)
        statusText += "\nNet: " + (totalDelta >= 0 ? "+" : "") + totalDelta + " fishes";

    document.getElementById("game-status").innerText = statusText;
    updateHUD();
    playSound(gameOverSfx);
    endGame();
}

// Fishes are already deducted upfront; here we return winnings only.
function applyBetOutcome(outcome, bet)
{
    if (outcome === "player")
    {
        fishes += bet * 2;
        return bet;
    }
    if (outcome === "blackjack")
    {
        const profit = Math.floor(bet * 1.5);
        fishes += bet + profit;
        return profit;
    }
    if (outcome === "dealer")
    {
        return -bet;
    }
    // draw
    fishes += bet;
    return 0;
}

// ── UI helpers ────────────────────────────────────────────────────────────────

function updateActionButtons()
{
    const h        = playerHands[activeHandIdx];
    const firstTwo = h && h.cards.length === 2;

    hitBtn.style.visibility    = canHit  ? "visible" : "hidden";
    stayBtn.style.visibility   = canStay ? "visible" : "hidden";
    doubleBtn.style.visibility = (canHit && canStay && firstTwo && fishes >= h.bet)                           ? "visible" : "hidden";
    splitBtn.style.visibility  = (canHit && canStay && !hasSplit && firstTwo && fishes >= currentBet && isSplittable(h)) ? "visible" : "hidden";
}

function markHandBust(idx)
{
    const el = document.getElementById(idx === 0 ? "player-hand" : "player-hand-2");
    el.classList.remove("active-hand");
    el.classList.add("hand-bust");
    const label = document.createElement("span");
    label.className   = "hand-result-label";
    label.textContent = "Bust!";
    el.appendChild(label);
}

function markHandBlackjack(idx)
{
    const el = document.getElementById(idx === 0 ? "player-hand" : "player-hand-2");
    el.classList.add("hand-blackjack");
    const label = document.createElement("span");
    label.className   = "hand-result-label";
    label.textContent = "Blackjack!";
    el.appendChild(label);
}

function calcBestValue(value, aceCount)
{
    let v = value, ac = aceCount;
    while (v > 21 && ac > 0) { v -= 10; ac--; }
    return v;
}

function updateDealerScore()
{
    const el = document.getElementById("dealer-score");
    if (dealerRevealed)
    {
        el.textContent = calcBestValue(dealerValue, dealerAceCount);
    }
    else
    {
        el.textContent = dealerValue > 0 ? dealerValue + " + ?" : "?";
    }
}

function updatePlayerScore(idx)
{
    const id = idx === 0 ? "player-score" : "player-score-2";
    const h  = playerHands[idx];
    document.getElementById(id).textContent = calcBestValue(h.value, h.aceCount);
}

function resetScores()
{
    ["dealer-score", "player-score", "player-score-2"].forEach(id => {
        document.getElementById(id).textContent = "";
    });
}

function toggleHints()
{
    document.body.classList.toggle("scores-hidden");
    hintsBtn.style.opacity = document.body.classList.contains("scores-hidden") ? 0.5 : 1;
}

function isSplittable(h)
{
    if (!h || h.cards.length !== 2) return false;
    return getCardValue(h.cards[0]) === getCardValue(h.cards[1]);
}

function updateActiveHandIndicator()
{
    document.getElementById("player-hand").classList.toggle("active-hand", activeHandIdx === 0);
    document.getElementById("player-hand-2").classList.toggle("active-hand", activeHandIdx === 1);
}

function endGame()
{
    [hitBtn, stayBtn, doubleBtn, splitBtn].forEach(b => b.style.visibility = "hidden");
    document.getElementById("player-hand").classList.remove("active-hand");
    document.getElementById("player-hand-2").classList.remove("active-hand");

    if (fishes <= 0)
    {
        playAgainBtn.textContent      = "New Game";
        playAgainBtn.style.visibility = "visible";
        playAgainBtn.focus();
        showGameOverModal();
    }
    else
    {
        playAgainBtn.textContent      = "Play again";
        playAgainBtn.style.visibility = "visible";
        playAgainBtn.focus();
    }
}

function clearHands()
{
    ["dealer-hand", "player-hand", "player-hand-2"].forEach(id => {
        const el = document.getElementById(id);
        el.innerHTML = '';
        el.className = '';
    });
    document.getElementById("hand-wrap-2").style.display = "none";
    resetScores();
}

function playAgain()
{
    if (fishes <= 0)
    {
        fishes        = STARTING_FISHES;
        totalPoints   = 0;
        lastSavedName = null;
    }
    document.getElementById("game-status").innerText = "";
    clearHands();
    startBettingPhase();
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

async function loadScores()
{
    try
    {
        const res = await fetch("/public/scores.json");
        if (!res.ok) throw new Error();
        return await res.json();
    }
    catch (e)
    {
        // fallback to localStorage when running without the server
        return JSON.parse(localStorage.getItem("bj_scores") || "[]");
    }
}

async function saveScore(name, pts)
{
    const entry = { name: name || "Anonimo", pts, date: new Date().toLocaleDateString("it-IT") };
    try
    {
        const res = await fetch("/api/scores", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(entry)
        });
        if (!res.ok) throw new Error();
        return await res.json();
    }
    catch (e)
    {
        // fallback to localStorage
        const scores = JSON.parse(localStorage.getItem("bj_scores") || "[]");
        scores.push(entry);
        scores.sort((a, b) => b.pts - a.pts);
        localStorage.setItem("bj_scores", JSON.stringify(scores.slice(0, 10)));
        return scores.slice(0, 10);
    }
}

async function renderLeaderboard(highlightName)
{
    const youName = highlightName !== undefined ? highlightName : lastSavedName;
    const list    = document.getElementById("leaderboard-list");
    list.innerHTML = "<li class='lb-empty'>Caricamento...</li>";

    const scores = await loadScores();
    list.innerHTML = "";

    if (scores.length === 0)
    {
        const li = document.createElement("li");
        li.className   = "lb-empty";
        li.textContent = "Nessun punteggio ancora.";
        list.appendChild(li);
        return;
    }

    scores.forEach((s, i) => {
        const li    = document.createElement("li");
        const isYou = youName && s.name === youName;
        const medal = i === 0 ? "🥇 " : i === 1 ? "🥈 " : i === 2 ? "🥉 " : (i + 1) + ". ";
        if (isYou) li.classList.add("lb-you");
        li.innerHTML =
            "<span class='lb-rank'>"  + medal           + "</span>" +
            "<span class='lb-name'>"  + escHtml(s.name) + (isYou ? " <span class='lb-you-tag'>(Tu)</span>" : "") + "</span>" +
            "<span class='lb-pts'>"   + s.pts + " pts"  + "</span>" +
            "<span class='lb-date'>"  + s.date          + "</span>";
        list.appendChild(li);
    });
}

function showGameOverModal()
{
    const totalEl   = document.getElementById("gameover-points");
    const nameInput = document.getElementById("gameover-name");
    const saveBtn   = document.getElementById("gameover-save-btn");
    const errorEl   = document.getElementById("gameover-error");

    totalEl.textContent = totalPoints + " pts";
    nameInput.value     = "";
    errorEl.textContent = "";
    gameoverModal.style.display = "flex";
    nameInput.focus();

    const doSave = async function() {
        const rawName = nameInput.value.trim();
        errorEl.textContent = "";

        const scores = await loadScores();
        let name;

        if (!rawName)
        {
            // Auto-generate "Sconosciuto N"
            const nums = scores
                .map(s => { const m = s.name.match(/^Sconosciuto (\d+)$/); return m ? parseInt(m[1]) : 0; })
                .filter(n => n > 0);
            name = "Sconosciuto " + (nums.length > 0 ? Math.max(...nums) + 1 : 1);
        }
        else
        {
            // Uniqueness check (case-insensitive)
            if (scores.some(s => s.name.toLowerCase() === rawName.toLowerCase()))
            {
                errorEl.textContent = "Nome già in uso, scegline un altro.";
                nameInput.focus();
                return;
            }
            name = rawName;
        }

        await saveScore(name, totalPoints);
        lastSavedName = name;
        gameoverModal.style.display = "none";
        await renderLeaderboard(name);
        leaderboardModal.style.display = "flex";
    };

    saveBtn.onclick = doSave;

    nameInput.onkeydown = function(e) {
        if (e.key === "Enter") doSave();
    };
}

function escHtml(str)
{
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

// ── Card helpers ──────────────────────────────────────────────────────────────

function getCardValue(card)
{
    const rank = card.split("-")[0];
    if (rank === "A")  return ACE_VALUE;
    if (isNaN(rank))   return 10;
    return parseInt(rank);
}

// ── Utilities ─────────────────────────────────────────────────────────────────

async function wait(ms)
{
    return new Promise(resolve => setTimeout(resolve, ms));
}

function preloadImages()
{
    suits.forEach(s => values.forEach(v => {
        const img = new Image();
        img.src = "assets/cards/" + v + "-" + s + ".png";
    }));
}

function toggleSound()
{
    sounds = !sounds;
    soundsBtn.style.opacity = sounds ? 1 : 0.5;
}

function playSound(audio)
{
    if (audio && typeof audio.play === "function" && sounds) audio.play();
}

function log(msg)
{
    if (debug) console.log(msg);
}
