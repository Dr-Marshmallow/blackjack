# Blackjack Game 🃏

A web-based Blackjack game built with vanilla **HTML, CSS, and JavaScript**.

<div align="center">
  <img src="assets/demo.png" width="720px">
</div>

## Features

- Full chip betting system — place your bet before each round; start with 1000 chips
- **Hit**, **Stay**, **Double Down** (2× bet, one card), and **Split** (same-value pairs)
- Blackjack pays 3:2; Double Down and Split deduct chips immediately
- Dealer deals in standard order: player → dealer (face up) → player → dealer (face down)
- Dealer reveals hidden card after the player's turn and hits until reaching 17+
- Natural Blackjack (21 on first two cards) auto-stands and pays 3:2
- Bust and Blackjack indicators on player hands
- Live score counters for each hand (dealer shows partial until reveal); toggle on/off with 👁
- Sound effects toggle
- Animated card dealing

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
6. If you run out of chips, click **New Game** to reset to 1000.

## Running

No build step required. Open `index.html` directly in a browser.

## License

MIT License
