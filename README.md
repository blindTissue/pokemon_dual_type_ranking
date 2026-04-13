# Pokemon Dual-Type Ranking

This app extends the original `pokemon-type-ranking-app` in two directions:

- defense rankings cover every single and dual defending typing
- attack-typing rankings include both single attacking types and estimated dual attacking typings

The core design choice is asymmetric:

- offense is still grounded in the 18 move types
- defense uses the full pool of 171 single and dual typings

## What The App Calculates

The app has three ranking outputs:

- `Attack Rankings`: the original 18 single attacking move types
- `Defense Rankings`: all 171 single and dual defending typings
- `Attack Typings Rankings`: all 18 single attacking typings plus all 153 unordered dual attacking typings

The dual attack-typing ranking is an estimate. It is not meant to model a literal in-battle move sequence. It is a controlled heuristic that tries to reward useful offensive pairing without letting dual typings become obviously overpowered.

## Type Effectiveness

The app starts from the standard single-type attack chart in [src/App.js](/Users/sungwonkim/Desktop/pokemon_type_ranking/src/App.js).

For a dual defender, effectiveness is computed multiplicatively:

- `Electric -> Water / Flying = 2 * 2 = 4`
- `Fire -> Water / Dragon = 0.5 * 0.5 = 0.25`
- `Ground -> Flying / Steel = 0 * 2 = 0`

Because dual defenders introduce new outcomes, the score buckets are:

- `0`
- `0.25`
- `0.5`
- `1`
- `2`
- `4`

Default score settings:

- Attack scores: `[-3, -2, -1, 0, 1, 2]`
- Defense scores: `[3, 2, 1, 0, -1, -2]`

## Base Single-Type Rating System

The single-type attack and defense ratings are still computed by the same iterative logic as the original project.

### Initialization

Every attacking type starts at `100`.

Every defending typing starts at `100`.

### Iteration

For each round:

1. Each attacking type gets a weighted score against all defending typings.
2. Those attack-side scores are renormalized so the average attack rating is `100`.
3. Each defending typing gets a weighted score against all attacking types.
4. Those defense-side scores are renormalized so the average defense rating is `100`.

This process repeats for `100` iterations.

### Why Renormalize

Renormalization keeps the scale stable. Without it, the raw totals would drift upward or downward and the ratings would stop being easy to compare. With renormalization, `100` remains the system-wide midpoint.

## Dual Attack-Typing Logic

This is the main custom part of the app.

The app keeps two dual-attack formulas in code:

- a multiplicative version
- an additive version based on the fixed baseline `100`

The current UI uses the additive `100`-baseline version.

### Why Not Just Add Type A And Type B

A naive dual attack score like:

```text
typeA + typeB
```

overstates dual typings badly. It effectively gives full credit to both components at once, even though a Pokemon only uses one move at a time.

### Why Not Fully Recompute Dual Attackers Directly

A full “best of the two types against every defender” recomputation also tends to make dual offense too strong, because broad coverage gets rewarded everywhere with too little restraint.

### Chosen Idea

Instead, the dual typing starts from the better of its two single-type attack ratings and then gets a controlled bonus.

For a dual attacking typing `(A, B)`:

```text
base = max(singleAttack(A), singleAttack(B))
```

This enforces a conservative anchor:

- the pair should not be worse than its better component
- the pair does not automatically get full credit for both types

### Coverage

For every defender, the app looks at the better attack score available from the two types.

That creates a dual-type “best available pressure” total across the full defender pool.

The app compares that total against the better single component and defines:

```text
coverageRatio = max(0, (dualBestCoverageRaw - betterSingleRaw) / betterSingleRaw)
```

Interpretation:

- if the second type adds useful new targets, `coverageRatio` goes up
- if the pair does not improve much over the better single type, `coverageRatio` stays small

### Overlap

The app also measures how often both types are positively useful against the same defenders.

For each defender, it takes the smaller of the two unshifted attack scores, but only when that smaller value is positive:

```text
positiveOverlap += max(0, min(scoreA, scoreB))
```

Then:

```text
overlapRatio = max(0, positiveOverlapRaw / dualBestCoverageRaw)
```

Interpretation:

- overlap is high when both types pressure the same targets
- overlap stays low when one type is doing almost all the work

This was added because a pair where both components are strong into the same targets should usually rank above a pair where only one component is carrying each matchup.

## Final Dual Attack Formula

The current UI uses:

```text
dualAttack(A, B) =
  base
  + coverageWeight * 100 * coverageRatio
  + overlapWeight * 100 * overlapRatio
```

with:

```text
base = max(singleAttack(A), singleAttack(B))
```

Default weights:

- `coverageWeight = 0.2`
- `overlapWeight = 0.4`

### Why Use `100` Here

The system baseline is `100`, so using `100` in the additive bonus makes the bonus scale uniform across typings.

This avoids one of the main issues with the multiplicative version:

- if the bonus is multiplied by `base`, already-strong singles get larger synergy rewards automatically
- with the `100`-baseline additive version, synergy is measured on a common absolute scale

That makes the dual bonus easier to interpret and usually a bit less “rich get richer.”

## Benefits Of The Current Heuristic

- It is conservative. Dual typings do not explode upward just because they have two STAB types.
- It keeps the better single type as the anchor.
- It distinguishes `coverage` from `overlap` instead of collapsing them into one number.
- It is tunable. Users can change the coverage and overlap weights in the UI.
- It is explainable. Each term has a clear interpretation.

## Limitations

- This is still a heuristic, not a literal game simulation.
- It does not model movepool limits, physical/special constraints, power, accuracy, or abilities.
- The exact results depend on the chosen coverage and overlap weights.
- Different reasonable definitions of overlap or coverage could lead to different rankings.

## Scripts

In the project directory:

### `npm start`

Runs the app in development mode.

### `npm run build`

Builds the app for production.
