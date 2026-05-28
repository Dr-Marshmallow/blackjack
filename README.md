# Blackjack Game 🃏

A web-based Blackjack game built with vanilla **HTML, CSS, and JavaScript**.

<div align="center">
  <img src="assets/demo.png" width="720px">
</div>

## Features

- **Fishes** betting system — start each game with 1500 fishes; bet before every round
- **Points** scoring — separate from fishes, accumulate across all hands; final score shown at Game Over
- **Hit**, **Stay**, **Double Down** (2× bet, one card), and **Split** (same-value pairs)
- Dealer deals in standard order: player → dealer (face up) → player → dealer (face down)
- Dealer reveals hidden card after the player's turn and hits until reaching 17+
- Natural Blackjack (21 on first two cards) auto-stands and pays 3:2 in fishes
- Bust and Blackjack indicators on player hands
- Live score counters for each hand (dealer shows partial until reveal); toggle on/off with 👁
- Sound effects toggle
- Animated card dealing
- **Rules popup** — full scoring formula explained in-game (📖)
- **Leaderboard** — top 10 scores saved locally (🏆); name entry at Game Over

## Scoring System

Points are earned on wins and draws; losses cost only fishes. The formula is:

```
points = fishes_bet × multiplier
```

The multiplier starts at **1.0** and adds bonuses:

| Condition | Bonus |
|---|---|
| Win | +1.5 |
| Draw | +0 (points = bet) |
| Blackjack (first 2 cards, no split) | +2.0 |
| Dealer shows 10 / J / Q / K | +1.0 |
| Dealer shows Ace | +1.5 |
| You doubled down | +1.0 |
| Margin of victory: (you − dealer) ÷ 21 | variable |
| Dealer busts (instead of margin) | +0.5 |
| Risk: bet ÷ fishes owned before bet | variable |

Split hands are scored independently — all bonuses apply per hand.

**Example:** 1000 fishes, bet 300, win 20 vs 18, dealer showed a King.  
Multiplier = 1.0 + 1.5 + 1.0 + (20−18)÷21 + 300÷1000 ≈ **3.9** → **1170 pts**

## How to Play

1. Place your bet using the chip buttons (5 / 25 / 50 / 100 / 500), then click **Deal**.
2. Your goal is to get closer to 21 than the dealer without going over.
3. Choose an action:
   - **Hit** — draw another card
   - **Stay** — end your turn
   - **Double** — double your bet, receive exactly one more card, then stand
   - **Split** — available when your first two cards share the same value; creates two independent hands, each with its own bet
4. After you stand (or bust), the dealer reveals the hidden card and draws until the hand is ≥ 17.
5. Each hand is resolved independently. Blackjack beats a regular 21.
6. The game ends when you run out of fishes. Enter your name to save your score, then click **New Game** to start over.

## Running

No build step required. Open `index.html` directly in a browser.

## License

MIT License
