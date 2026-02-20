# Lexicographer — Game Balance Reference

All values computed directly from source formulas in `upgrades.js` and `lexicographer.jsx`.
Costs are paid in **ink** unless noted as **quills**.

---

## 1. Core Constants

| Constant | Value | Description |
|---|---|---|
| `INK_WELL_MAX` | 100 | Well capacity at L=0 (baseline) |
| `LETTER_INTERVAL` | 10s | Press cycle time at L=0 (baseline) |
| `MAX_LETTERS` | 50 | Max letter inventory (normal + special) |
| `BASE_INK_COST` | 15 | Ink to inscribe the first word |
| `INK_COST_SCALE` | 9 | Additional ink per word already in lexicon |
| `MAX_WELLS` | 5 | Max wells owned |
| `MAX_PRESSES` | 5 | Max presses owned |
| `scalingA` | 2 | Quill publish multiplier for word count (debug-tunable) |
| `scalingB` | 0.5 | Quill publish multiplier for lexicoin score (debug-tunable) |

---

## 2. Device Purchase Costs (ink)

Costs are indexed by how many you currently own (0-indexed). Paid in **ink**.

### Wells
| Buy | Current owned | Cost |
|---|---|---|
| 1st well | 0 | free (start with 1) |
| 2nd well | 1 | 500 |
| 3rd well | 2 | 2,500 |
| 4th well | 3 | 15,000 |
| 5th well | 4 | 75,000 |

### Presses
| Buy | Current owned | Cost |
|---|---|---|
| 1st press | 0 | 1,000 |
| 2nd press | 1 | 4,500 |
| 3rd press | 2 | 20,000 |
| 4th press | 3 | 90,000 |
| 5th press | 4 | 400,000 |

### Well Managers
| Buy | Current hired | Cost |
|---|---|---|
| 1st manager | 0 | 1,500 |
| 2nd manager | 1 | 7,500 |
| 3rd manager | 2 | 45,000 |
| 4th manager | 3 | 200,000 |
| 5th manager | 4 | 1,000,000 |

### Press Managers
| Buy | Current hired | Cost |
|---|---|---|
| 1st manager | 0 | 3,000 |
| 2nd manager | 1 | 15,000 |
| 3rd manager | 2 | 80,000 |
| 4th manager | 3 | 400,000 |
| 5th manager | 4 | 2,500,000 |

---

## 3. Cosmetics (cost in quills)

### Covers — publish multiplier applied per round
| Cover | Cost | Multiplier |
|---|---|---|
| Classic Leather | free | 1.00× |
| Midnight Blue | 20 quills | 1.05× |
| Forest Green | 20 quills | 1.05× |
| Royal Crimson | 50 quills | 1.10× |
| Gilded Edition | 100 quills | 1.15× |
| Arcane Tome | 200 quills | 1.20× |
| Celestial Atlas | 500 quills | 1.25× |

### Page Styles — publish multiplier applied per round
| Page | Cost | Multiplier |
|---|---|---|
| Parchment | free | 1.00× |
| Cream Linen | 15 quills | 1.02× |
| Aged Vellum | 30 quills | 1.05× |
| Dark Scholar | 60 quills | 1.08× |
| Blueprint | 100 quills | 1.10× |
| Rose Quartz | 150 quills | 1.12× |

**Max combined design multiplier:** 1.25 × 1.12 = **1.40×**

---

## 4. Word Inscription Cost (ink)

Formula: `ink_cost = 15 + (words_in_lexicon × 9)`

| Words in lexicon | Ink to add next word |
|---|---|
| 0 | 15 |
| 1 | 24 |
| 2 | 33 |
| 5 | 60 |
| 10 | 105 |
| 15 | 150 |
| 20 | 195 |
| 30 | 285 |
| 50 | 465 |
| 100 | 915 |

---

## 5. Quills Publish Formula

```
quills = floor(
  (A × wordCount + floor(B × totalLexicoins))
  × (1 + top10Score / 100)
  × coverMult
  × pageMult
)
```

| Term | Default | Notes |
|---|---|---|
| `A` | 2 | Flat quills per word inscribed |
| `B` | 0.5 | Fraction of total lexicoin score |
| `top10Score` | varies | Sum of lexicoin scores for top 10 highest-scoring words |
| `coverMult` | 1.00–1.25 | Active cover multiplier |
| `pageMult` | 1.00–1.12 | Active page style multiplier |

The `highMult = 1 + top10Score/100` means 100 total score in your top 10 = a 2× bonus.

### Example publish (no cosmetic upgrades)
- 20 words, total lexicoin score 80, top-10 score 60
- `base = 2×20 + floor(0.5×80) = 40 + 40 = 80`
- `highMult = 1 + 60/100 = 1.60`
- `total = floor(80 × 1.60 × 1.0 × 1.0) = 128 quills`

---

## 6. Letter Scores & Draw Frequencies

| Letter | Score | Draw Freq | Draw % |
|---|---|---|---|
| E | 1 | 12.7 | 12.68% |
| T | 1 | 9.1 | 9.08% |
| A | 1 | 8.2 | 8.19% |
| O | 1 | 7.5 | 7.49% |
| I | 1 | 7.0 | 6.99% |
| N | 1 | 6.7 | 6.69% |
| S | 1 | 6.3 | 6.29% |
| H | 1 | 6.1 | 6.09% |
| R | 1 | 6.0 | 5.99% |
| D | 2 | 4.3 | 4.29% |
| L | 2 | 4.0 | 3.99% |
| C | 3 | 2.8 | 2.80% |
| U | 3 | 2.8 | 2.80% |
| M | 3 | 2.4 | 2.40% |
| W | 3 | 2.4 | 2.40% |
| F | 4 | 2.2 | 2.20% |
| G | 4 | 2.0 | 2.00% |
| Y | 4 | 2.0 | 2.00% |
| P | 4 | 1.9 | 1.90% |
| B | 5 | 1.5 | 1.50% |
| V | 5 | 1.0 | 1.00% |
| K | 6 | 0.8 | 0.80% |
| J | 8 | 0.15 | 0.15% |
| X | 8 | 0.15 | 0.15% |
| Q | 10 | 0.10 | 0.10% |
| Z | 10 | 0.07 | 0.07% |

Total frequency pool: ~100.17

### Word scoring with tiles
```
word_score = (sum of letter scores × their tile multipliers) × word_multiplier
```
- **Double Letter (DL):** that letter's score ×2
- **Triple Letter (TL):** that letter's score ×3
- **Double Word (DW):** whole word ×2 (stacks multiplicatively with other DW/TW)
- **Triple Word (TW):** whole word ×3
- **Golden Tile ★:** counted separately, no direct score modifier
- **Lexicoin ◈:** wildcard, no score of its own (uses substituted letter's score)

---

## 7. Special Tile Base Probabilities

These are the chances per letter produced before any press upgrades. Additive bonuses stack on top.

| Tile | Base Chance | Upgrade |
|---|---|---|
| Double Letter (DL) | 1.50% | +Double Letter % |
| Triple Letter (TL) | 0.50% | +Triple Letter % |
| Double Word (DW) | 0.80% | +Double Word % |
| Triple Word (TW) | 0.20% | +Triple Word % |
| Lexicoin Wildcard ◈ | 0.30% | +Wildcard % |
| Golden Tile ★ | 0.05% | +Golden Tile % |
| Normal | ~96.65% | — |

---

## 8. Upgrade Tables

Upgrades are **per-device** (each well/press/manager has its own upgrade levels).

---

### INK WELL UPGRADES

---

#### Well Speed
**Formula:** `value = 2 × 1.0202^L` (ink/s fill rate)
**Cost:** `50 × 1.12^L` ink
**Max level:** 1000

| L | Value (ink/s) | Cost (ink) | Cumulative cost |
|---|---|---|---|
| 0 | 2.00 | 50 | 50 |
| 1 | 2.04 | 56 | 106 |
| 5 | 2.21 | 88 | 437 |
| 10 | 2.44 | 155 | 886 |
| 25 | 3.29 | 850 | 6,890 |
| 50 | 5.41 | 14,460 | 126,900 |
| 100 | 14.6 | 4.18M | 37.9M |
| 200 | 107 | 3.49B | 31.7B |
| 500 | 39,900 | 2.44 × 10²⁴ | — |
| 1000 | 970M | 5.95 × 10⁴⁹ | — |

---

#### Well Capacity
**Formula:** `value = 100 × 1.0162^L` (max ink stored)
**Cost:** `100 × 1.11^L` ink
**Max level:** 1000

| L | Value (ink) | Cost (ink) |
|---|---|---|
| 0 | 100 | 100 |
| 1 | 101.6 | 111 |
| 5 | 108.4 | 169 |
| 10 | 117.5 | 284 |
| 25 | 149.4 | 1,359 |
| 50 | 223.3 | 18,460 |
| 100 | 498.8 | 3.41M |
| 200 | 2,487 | 116B |
| 500 | 306,600 | — |
| 1000 | 941M | — |

---

#### Crit Chance
**Formula:** `value = (0.01 + L × 0.01)` → displayed as %
**Cost:** `500 × 1.4^L` ink
**Max level:** 99 (= 100% crit)

| L | Crit Chance | Cost (ink) |
|---|---|---|
| 0 | 1% | 500 |
| 1 | 2% | 700 |
| 5 | 6% | 2,689 |
| 10 | 11% | 14,460 |
| 20 | 21% | 418,600 |
| 30 | 31% | 12.1M |
| 50 | 51% | 318.5M |
| 75 | 76% | 389.5B |
| 99 | 100% | 75.9T |

---

#### Crit Multiplier
**Formula:** `value = 5 + L × 0.1` (× multiplier on collection)
**Cost:** `2500 × 1.3^L` ink
**Max level:** 100 (= 15.0×)

| L | Multiplier | Cost (ink) |
|---|---|---|
| 0 | 5.0× | 2,500 |
| 1 | 5.1× | 3,250 |
| 5 | 5.5× | 9,283 |
| 10 | 6.0× | 34,470 |
| 25 | 7.5× | 1.76M |
| 50 | 10.0× | 1.24B |
| 75 | 12.5× | 877B |
| 100 | 15.0× | 620T |

---

### MANAGER UPGRADES

---

#### Manager Speed
**Formula:** `value = 10 - L × 0.1` (seconds to collect when triggered)
**Cost:** `5000 × 1.25^L` ink
**Max level:** 99 (minimum 0.1s)

| L | Collect Time | Cost (ink) |
|---|---|---|
| 0 | 10.0s | 5,000 |
| 1 | 9.9s | 6,250 |
| 5 | 9.5s | 15,260 |
| 10 | 9.0s | 46,560 |
| 20 | 8.0s | 433,700 |
| 30 | 7.0s | 4.04M |
| 50 | 5.0s | 350.3M |
| 75 | 2.5s | 113.5B |
| 99 | 0.1s | 6.9T |

---

#### Efficiency
**Formula:** `value = 0.5 + L × 0.01` (fraction of well ink collected)
**Cost:** `10000 × 1.3^L` ink
**Max level:** 50 (= 1.00×, full collection)

| L | Collection Rate | Cost (ink) |
|---|---|---|
| 0 | 0.50× | 10,000 |
| 1 | 0.51× | 13,000 |
| 5 | 0.55× | 37,130 |
| 10 | 0.60× | 137,860 |
| 20 | 0.70× | 1.90M |
| 30 | 0.80× | 26.2M |
| 40 | 0.90× | 362M |
| 50 | 1.00× | 4.98B |

---

### PRESS UPGRADES

---

#### Press Speed
**Formula:** `value = 10 - L × 0.1` (cycle time in seconds)
**Cost:** `10000 × 1.15^L` ink
**Max level:** 99 (minimum 0.1s)

| L | Cycle Time | Cost (ink) |
|---|---|---|
| 0 | 10.0s | 10,000 |
| 1 | 9.9s | 11,500 |
| 5 | 9.5s | 20,110 |
| 10 | 9.0s | 40,460 |
| 20 | 8.0s | 163,700 |
| 30 | 7.0s | 662,100 |
| 50 | 5.0s | 10.84M |
| 75 | 2.5s | 3.38B |
| 99 | 0.1s | 61.3B |

---

#### Press Yield
**Formula:** `value = 1 + L` (letters produced per cycle)
**Cost:** `100000 × 3^L` ink
**Max level:** 9 (= 10 letters)

| L | Letters/Cycle | Cost (ink) |
|---|---|---|
| 0 | 1 | 100,000 |
| 1 | 2 | 300,000 |
| 2 | 3 | 900,000 |
| 3 | 4 | 2.7M |
| 4 | 5 | 8.1M |
| 5 | 6 | 24.3M |
| 6 | 7 | 72.9M |
| 7 | 8 | 218.7M |
| 8 | 9 | 656.1M |
| 9 | 10 | 1.97B |

---

#### Double Letter % (DL chance bonus)
**Base chance:** 1.50% | **Formula:** `bonus = L × 0.01` → `effective = 1.5% + bonus`
**Cost:** `50000 × 1.4^L` ink
**Max level:** 10 (= +10%, so 11.5% total)

| L | Bonus | Effective Chance | Cost (ink) |
|---|---|---|---|
| 0 | +0% | 1.5% | 50,000 |
| 1 | +1% | 2.5% | 70,000 |
| 2 | +2% | 3.5% | 98,000 |
| 3 | +3% | 4.5% | 137,200 |
| 4 | +4% | 5.5% | 192,100 |
| 5 | +5% | 6.5% | 268,900 |
| 6 | +6% | 7.5% | 376,500 |
| 7 | +7% | 8.5% | 527,100 |
| 8 | +8% | 9.5% | 737,900 |
| 9 | +9% | 10.5% | 1.03M |
| 10 | +10% | 11.5% | 1.44M |

---

#### Triple Letter % (TL chance bonus)
**Base chance:** 0.50% | **Formula:** `bonus = L × 0.01` → `effective = 0.5% + bonus`
**Cost:** `100000 × 1.5^L` ink
**Max level:** 10 (= +10%, so 10.5% total)

| L | Bonus | Effective Chance | Cost (ink) |
|---|---|---|---|
| 0 | +0% | 0.5% | 100,000 |
| 1 | +1% | 1.5% | 150,000 |
| 2 | +2% | 2.5% | 225,000 |
| 3 | +3% | 3.5% | 337,500 |
| 4 | +4% | 4.5% | 506,300 |
| 5 | +5% | 5.5% | 759,400 |
| 6 | +6% | 6.5% | 1.14M |
| 7 | +7% | 7.5% | 1.71M |
| 8 | +8% | 8.5% | 2.56M |
| 9 | +9% | 9.5% | 3.84M |
| 10 | +10% | 10.5% | 5.77M |

---

#### Double Word % (DW chance bonus)
**Base chance:** 0.80% | **Formula:** `bonus = L × 0.005` → `effective = 0.8% + bonus`
**Cost:** `250000 × 1.6^L` ink
**Max level:** 10 (= +5%, so 5.8% total)

| L | Bonus | Effective Chance | Cost (ink) |
|---|---|---|---|
| 0 | +0.0% | 0.8% | 250,000 |
| 1 | +0.5% | 1.3% | 400,000 |
| 2 | +1.0% | 1.8% | 640,000 |
| 3 | +1.5% | 2.3% | 1.02M |
| 4 | +2.0% | 2.8% | 1.64M |
| 5 | +2.5% | 3.3% | 2.62M |
| 6 | +3.0% | 3.8% | 4.19M |
| 7 | +3.5% | 4.3% | 6.71M |
| 8 | +4.0% | 4.8% | 10.7M |
| 9 | +4.5% | 5.3% | 17.2M |
| 10 | +5.0% | 5.8% | 27.5M |

---

#### Triple Word % (TW chance bonus)
**Base chance:** 0.20% | **Formula:** `bonus = L × 0.005` → `effective = 0.2% + bonus`
**Cost:** `500000 × 1.7^L` ink
**Max level:** 10 (= +5%, so 5.2% total)

| L | Bonus | Effective Chance | Cost (ink) |
|---|---|---|---|
| 0 | +0.0% | 0.2% | 500,000 |
| 1 | +0.5% | 0.7% | 850,000 |
| 2 | +1.0% | 1.2% | 1.45M |
| 3 | +1.5% | 1.7% | 2.46M |
| 4 | +2.0% | 2.2% | 4.18M |
| 5 | +2.5% | 2.7% | 7.10M |
| 6 | +3.0% | 3.2% | 12.1M |
| 7 | +3.5% | 3.7% | 20.5M |
| 8 | +4.0% | 4.2% | 34.9M |
| 9 | +4.5% | 4.7% | 59.3M |
| 10 | +5.0% | 5.2% | 100.8M |

---

#### Wildcard % (Lexicoin ◈ chance bonus)
**Base chance:** 0.30% | **Formula:** `bonus = L × 0.003` → `effective = 0.3% + bonus`
**Cost:** `1000000 × 1.8^L` ink
**Max level:** 10 (= +3%, so 3.3% total)

| L | Bonus | Effective Chance | Cost (ink) |
|---|---|---|---|
| 0 | +0.0% | 0.3% | 1.00M |
| 1 | +0.3% | 0.6% | 1.80M |
| 2 | +0.6% | 0.9% | 3.24M |
| 3 | +0.9% | 1.2% | 5.83M |
| 4 | +1.2% | 1.5% | 10.5M |
| 5 | +1.5% | 1.8% | 18.9M |
| 6 | +1.8% | 2.1% | 34.0M |
| 7 | +2.1% | 2.4% | 61.2M |
| 8 | +2.4% | 2.7% | 110.2M |
| 9 | +2.7% | 3.0% | 198.4M |
| 10 | +3.0% | 3.3% | 357M |

---

#### Golden Tile % (★ chance bonus)
**Base chance:** 0.05% | **Formula:** `bonus = L × 0.002` → `effective = 0.05% + bonus`
**Cost:** `2000000 × 2.0^L` ink
**Max level:** 10 (= +2%, so 2.05% total)

| L | Bonus | Effective Chance | Cost (ink) |
|---|---|---|---|
| 0 | +0.00% | 0.05% | 2.00M |
| 1 | +0.20% | 0.25% | 4.00M |
| 2 | +0.40% | 0.45% | 8.00M |
| 3 | +0.60% | 0.65% | 16.0M |
| 4 | +0.80% | 0.85% | 32.0M |
| 5 | +1.00% | 1.05% | 64.0M |
| 6 | +1.20% | 1.25% | 128M |
| 7 | +1.40% | 1.45% | 256M |
| 8 | +1.60% | 1.65% | 512M |
| 9 | +1.80% | 1.85% | 1.02B |
| 10 | +2.00% | 2.05% | 2.05B |

---

## 9. Balance Notes & Observations

### Cost curve steepness comparison (cost multiplier per level)
| Upgrade | Growth Rate | Rough feel |
|---|---|---|
| Well Speed | ×1.12/level | Moderate — affordable to ~L50 |
| Well Capacity | ×1.11/level | Moderate — affordable to ~L50 |
| Crit Chance | ×1.40/level | Steep — gets very expensive fast |
| Crit Multiplier | ×1.30/level | Steep |
| Manager Speed | ×1.25/level | Steep |
| Efficiency | ×1.30/level | Steep |
| Press Speed | ×1.15/level | Moderate |
| Press Yield | ×3.00/level | Very steep — max L9 costs 1.97B |
| DL / TL % | ×1.40–1.50/level | Steep |
| DW / TW % | ×1.60–1.70/level | Very steep |
| Wildcard % | ×1.80/level | Very steep |
| Golden Tile % | ×2.00/level | Doubles every level |

### Efficiency warning
Efficiency caps at 1.00× at L50 (4.98B ink), but starts at 0.50× — meaning managers waste 50% of ink until upgraded. This is a significant hidden tax on early auto-collection.

### Press Yield vs Press Speed
- L9 Press Yield (10 letters/cycle) costs 1.97B ink total
- L99 Press Speed (0.1s/cycle, 100× faster) costs ~61.3B ink to max, but gives throughput comparable to 100× the presses
- At L=50, Press Speed is 5.0s (2× baseline), costing 10.84M total

### Special tile probability ceiling
At max upgrades on a single press, the special tile chances are:
- DL: 11.5%, TL: 10.5%, DW: 5.8%, TW: 5.2%, Lexicoin: 3.3%, Golden: 2.05%
- Total special: ~38.35% of letters produced are special tiles
- Normal letter probability falls to ~61.65%
