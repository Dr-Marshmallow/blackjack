// blackjack
// last updated: 10/8/2024

const debug = true;
const suits  = ["C", "D", "H", "S"];
const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"];
const ACE_VALUE     = 11;
const STARTING_CHIPS = 1000;

const cardSfx    = new Audio("assets/sfx/new_card.mp3");
const gameOverSfx = new Audio("assets/sfx/card_game_over.wav");

// ── Deck ──────────────────────────────────────────────────────────────────────
var deck = [];

// ── Dealer state ──────────────────────────────────────────────────────────────
var dealerValue    = 0;
var dealerAceCount = 0;
var dealerExtraCards = 0;
var dealerRevealed = false;
var hiddenCard;

// ── Player state (array supports split) ───────────────────────────────────────
// Each hand: { value, aceCount, cards: [], bet }
var playerHands   = [];
var activeHandIdx = 0;
var hasSplit      = false;
var splitAces     = false;

// ── Game control ──────────────────────────────────────────────────────────────
var canHit  = false;
var canStay = false;
var sounds  = true;
var animationDelay = 500;

// ── Chips ─────────────────────────────────────────────────────────────────────
var chips      = STARTING_CHIPS;
var currentBet = 0;

// ── DOM refs ──────────────────────────────────────────────────────────────────
var hitBtn, stayBtn, doubleBtn, splitBtn;
var soundsBtn, hintsBtn, playAgainBtn;
var bettingArea, chipsDisplay, betDisplay, dealBtn, clearBetBtn;

window.onload = function()
{
    preloadImages();

    hitBtn      = document.getElementById("hit-btn");
    stayBtn     = document.getElementById("stay-btn");
    doubleBtn   = document.getElementById("double-btn");
    splitBtn    = document.getElementById("split-btn");
    soundsBtn   = document.getElementById("sounds-btn");
    hintsBtn    = document.getElementById("hints-btn");
    playAgainBtn = document.getElementById("play-again-btn");
    bettingArea  = document.getElementById("betting-area");
    chipsDisplay = document.getElementById("chips-display");
    betDisplay   = document.getElementById("bet-display");
    dealBtn      = document.getElementById("deal-btn");
    clearBetBtn  = document.getElementById("clear-bet-btn");

    hitBtn.addEventListener("click", hit);
    stayBtn.addEventListener("click", stay);
    doubleBtn.addEventListener("click", doubleDown);
    splitBtn.addEventListener("click", split);
    soundsBtn.addEventListener("click", toggleSound);
    hintsBtn.addEventListener("click", toggleHints);
    playAgainBtn.addEventListener("click", playAgain);
    dealBtn.addEventListener("click", dealCards);
    clearBetBtn.addEventListener("click", clearBet);

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
    if (currentBet + amount > chips) return;
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
    chips -= currentBet;           // upfront deduction
    updateHUD();
    bettingArea.style.display = "none";
    startGame();
}

function updateHUD()
{
    chipsDisplay.textContent = "Chips: " + chips;
    betDisplay.textContent   = "Bet: "   + currentBet;
}

function updateChipButtonStates()
{
    document.querySelectorAll(".chip-btn").forEach(btn => {
        btn.disabled = (currentBet + parseInt(btn.dataset.amount) > chips);
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
    hasSplit         = false;
    splitAces        = false;
    activeHandIdx    = 0;
    playerHands      = [{ value: 0, aceCount: 0, cards: [], bet: currentBet }];

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
    if (getPlayerHand(activeHandIdx) > 21)
    {
        markHandBust(activeHandIdx);
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
    if (chips < h.bet) return;

    chips -= h.bet;    // deduct extra amount upfront
    h.bet *= 2;
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
    if (h.cards.length !== 2 || chips < currentBet || !isSplittable(h)) return;

    // Move second card to new hand
    const splitCard  = h.cards.pop();
    const splitValue = getCardValue(splitCard);
    h.value -= splitValue;
    if (splitValue === ACE_VALUE) h.aceCount--;

    chips -= currentBet;    // upfront deduction for second hand
    updateHUD();

    playerHands.push({
        value:    splitValue,
        aceCount: splitValue === ACE_VALUE ? 1 : 0,
        cards:    [splitCard],
        bet:      currentBet
    });
    hasSplit = true;

    // Move card DOM node from hand-1 to hand-2
    const hand1El = document.getElementById("player-hand");
    const hand2El = document.getElementById("player-hand-2");
    document.getElementById("hand-wrap-2").style.display = "flex";
    hand2El.appendChild(hand1El.lastElementChild);

    // Disable during dealing animation
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
        // Split aces: one card each, no more actions
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
    // Reveal hidden card first, then decide whether to hit
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

        const delta = applyBetOutcome(outcome, ph.bet);
        totalDelta += delta;

        if (delta > 0)      msg += " (+" + delta + ")";
        else if (delta < 0) msg += " (" + delta + ")";
        else                msg += " (push)";

        messages.push(msg);
    });

    let statusText = messages.join("\n");
    if (playerHands.length > 1)
        statusText += "\nNet: " + (totalDelta >= 0 ? "+" : "") + totalDelta;

    document.getElementById("game-status").innerText = statusText;
    updateHUD();
    playSound(gameOverSfx);
    endGame();
}

// Chips are already deducted upfront; here we return winnings only.
function applyBetOutcome(outcome, bet)
{
    if (outcome === "player")
    {
        chips += bet * 2;                          // return bet + profit
        return bet;                                // display delta = profit
    }
    if (outcome === "blackjack")
    {
        const profit = Math.floor(bet * 1.5);
        chips += bet + profit;
        return profit;
    }
    if (outcome === "dealer")
    {
        return -bet;                               // already lost (deducted upfront)
    }
    // draw
    chips += bet;                                  // return original bet
    return 0;
}

// ── UI helpers ────────────────────────────────────────────────────────────────

function updateActionButtons()
{
    const h        = playerHands[activeHandIdx];
    const firstTwo = h && h.cards.length === 2;

    hitBtn.style.visibility    = canHit  ? "visible" : "hidden";
    stayBtn.style.visibility   = canStay ? "visible" : "hidden";
    doubleBtn.style.visibility = (canHit && canStay && firstTwo && chips >= h.bet)                         ? "visible" : "hidden";
    splitBtn.style.visibility  = (canHit && canStay && !hasSplit && firstTwo && chips >= currentBet && isSplittable(h)) ? "visible" : "hidden";
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
    playAgainBtn.textContent      = chips <= 0 ? "New Game" : "Play again";
    playAgainBtn.style.visibility = "visible";
    playAgainBtn.focus();
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
    if (chips <= 0) chips = STARTING_CHIPS;
    document.getElementById("game-status").innerText = "";
    clearHands();
    startBettingPhase();
}

// ── Card helpers ──────────────────────────────────────────────────────────────

function getCardValue(card)
{
    const rank = card.split("-")[0];
    if (rank === "A")       return ACE_VALUE;
    if (isNaN(rank))        return 10;
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
