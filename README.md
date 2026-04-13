# Pokemon Dual-Type Ranking

This project extends the logic of the original `pokemon-type-ranking-app` to evaluate asymmetric type strength:

- Attack rankings are computed for the 18 single move types.
- Defense rankings are computed for all 171 legal single and dual defender typings.
- Both sides are initialized at 100 and iteratively updated by linear weighted averages, with renormalization after each round so the average rating on each side remains 100.

## Effectiveness Buckets

Because dual defenders introduce additional effectiveness outcomes, both score tables use six buckets:

- `0`
- `0.25`
- `0.5`
- `1`
- `2`
- `4`

Default scores:

- Attack: `[-3, -2, -1, 0, 1, 2]`
- Defense: `[3, 2, 1, 0, -1, -2]`

## Scripts

In the project directory, you can run:

### `npm start`

Runs the app in development mode.

### `npm run build`

Builds the app for production.
