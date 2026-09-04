# Rat's Kitchen — Card & Rat Reference (v3.9.0)

## Rat master set — 44 cards, fixed counts

One canonical set. Counts never change; only how they're split between deck and bins.

| Rat | Copies | Weight | Heat | Ability |
|---|---|---|---|---|
| Street Rat | 9 | 1 | 1 | — |
| Fat Rat | 6 | 2 | 2 | Cannot be Cat-shielded |
| Ratato Rat | 4 | 0 | 1 | Drawn straight into YOUR kitchen |
| Hot Ratato | 4 | 0 | 1 | Held in hand, thrown into a RIVAL kitchen |
| Runner Rat | 2 | 1 | 1 | Draw again when drawn |
| Sow Rat | 2 | 2 | 2 | Once/turn: draw instead of playing |
| Toll Rat | 2 | 1 | 1 | Inspector pays you a card |
| Feral Rat | 2 | 1 | 1 | Cannot be dumped (Ratata Quente) |
| Spice Rat | 2 | 1 | 1 | Cannot be exploded (Hot Chilli) |
| Boiler Rat | 2 | 1 | 1 | Cannot be stolen (Poach) |
| Larder Rat | 2 | 1 | 1 | May eat itself for +1 star |
| Grub Rat | 2 | 1 | 2 | Cheap but runs hot |
| Breeder Rat | 2 | 1 | 1 | Once/turn: spend 2 Food → top bins rat |
| Sewer Rat | 2 | 1 | 0 | Colourless — no inspection hits it |
| Alpha Rat | 1 | 2 | 2 | While in your kitchen, none of your rats can be Poached |

**Colour balance:** 42 colourable rats = exactly **14 red / 14 blue / 14 green**, every game. Sewer (2) is colourless.

## Deck / bins split — scales with player count

Deck rat count scales *down* as players increase (more cards dealt to hands = smaller deck), holding a constant **19% rat density in the draw deck**. Everything not in the deck starts in the bins, so all 44 rats stay reachable.

| Players | Rats in deck | Rats in bins | Deck density |
|---|---|---|---|
| 3 | 20 | 15 | 19% |
| 4 | 18 | 17 | 19% |
| 5 | 17 | 18 | 19% |
| 6 | 15 | 20 | 19% |
| 7 | 14 | 21 | 19% |
| 8 | 12 | 23 | 19% |

*(Ratato and Hot Ratato always ride in the deck; the table above covers the other 36.)*
**Which specific rats land in deck vs bins is random each game** — only the counts are fixed.

## Action cards

| Card | Category | Copies |
|---|---|---|
| **Inspections** | | |
| Mole (playable snap) | attack | 2–3 (scales) |
| Scheduled 1-colour | attack | 6 |
| Scheduled 2-colour | attack | 6 |
| WD Snap (1-colour) | when-drawn | 6 (2 per colour) |
| WD Mole (colourless) | when-drawn | 2 |
| **Attack** | | |
| Poach | attack | 5 |
| Switcheroo | attack | 6 |
| Hot Chilli | attack | 4 |
| Ratata Quente | attack | 4 |
| Grease the Palm | attack | 3 |
| Klepto | attack | 3 |
| Shakedown | attack | 3 |
| **Control / engine** | | |
| Territorial | control | 3 |
| Rat Trap | engine | 3 |
| Special Delivery | engine | 4 |
| Pelican Delivery | engine | 3 |
| Recycle | engine | 3 |
| Exterminator | engine | 4 |
| Inheritance | engine | 3 |
| Gambit | engine | 6 |
| **Defence / economy** | | |
| Board Up | defence | 4 |
| Cat | defence | 3 |
| Wok Block | defence | 3 |
| Food | buff | 12 |
| Last Resort | buff | 4 |

**Inspection colour balance:** exactly 8 slots per colour, every game.

## Win conditions
- **Rat King:** reach weight ≥ 6
- **Attrition:** last kitchen standing

*(Alpha no longer has a win condition — it is a defensive guard rat only.)*

## Key constants
- Stars: 4 · Starting hand: 7 (1 guaranteed Food) · Hand cap: 7
- 3 colours (red / blue / green) · Rat King threshold: 6
- Unlimited card plays per turn · Zone-once rule per turn
- 6 Market Days, one flipped at the start of each round

## Balance (sim, 400 games/count)
| Players | Attrition | Winner turns | Rounds |
|---|---|---|---|
| 3 | 41% | 12 | 10.7 |
| 4 | 44% | 16 | 12.5 |
| 5 | 51% | 18 | 13.4 |
| 6 | 66% | 25 | 16.5 |

*6P runs long — a known open item.*
