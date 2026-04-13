import React, { useEffect, useState } from 'react';

const ATTACKING_TYPES = [
  'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Fighting', 'Poison',
  'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'
];

const TYPE_CHART = {
  Normal: { Rock: 0.5, Ghost: 0, Steel: 0.5 },
  Fire: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 2, Bug: 2, Rock: 0.5, Dragon: 0.5, Steel: 2 },
  Water: { Fire: 2, Water: 0.5, Grass: 0.5, Ground: 2, Rock: 2, Dragon: 0.5 },
  Electric: { Water: 2, Electric: 0.5, Grass: 0.5, Ground: 0, Flying: 2, Dragon: 0.5 },
  Grass: { Fire: 0.5, Water: 2, Grass: 0.5, Poison: 0.5, Ground: 2, Flying: 0.5, Bug: 0.5, Rock: 2, Dragon: 0.5, Steel: 0.5 },
  Ice: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 0.5, Ground: 2, Flying: 2, Dragon: 2, Steel: 0.5 },
  Fighting: { Normal: 2, Ice: 2, Poison: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Rock: 2, Ghost: 0, Dark: 2, Steel: 2, Fairy: 0.5 },
  Poison: { Grass: 2, Poison: 0.5, Ground: 0.5, Rock: 0.5, Ghost: 0.5, Steel: 0, Fairy: 2 },
  Ground: { Fire: 2, Electric: 2, Grass: 0.5, Poison: 2, Flying: 0, Bug: 0.5, Rock: 2, Steel: 2 },
  Flying: { Electric: 0.5, Grass: 2, Fighting: 2, Bug: 2, Rock: 0.5, Steel: 0.5 },
  Psychic: { Fighting: 2, Poison: 2, Psychic: 0.5, Dark: 0, Steel: 0.5 },
  Bug: { Fire: 0.5, Grass: 2, Fighting: 0.5, Poison: 0.5, Flying: 0.5, Psychic: 2, Ghost: 0.5, Dark: 2, Steel: 0.5, Fairy: 0.5 },
  Rock: { Fire: 2, Ice: 2, Fighting: 0.5, Ground: 0.5, Flying: 2, Bug: 2, Steel: 0.5 },
  Ghost: { Normal: 0, Psychic: 2, Ghost: 2, Dark: 0.5 },
  Dragon: { Dragon: 2, Steel: 0.5, Fairy: 0 },
  Dark: { Fighting: 0.5, Psychic: 2, Ghost: 2, Dark: 0.5, Fairy: 0.5 },
  Steel: { Fire: 0.5, Water: 0.5, Electric: 0.5, Ice: 2, Rock: 2, Steel: 0.5, Fairy: 2 },
  Fairy: { Fire: 0.5, Fighting: 2, Poison: 0.5, Dragon: 2, Dark: 2, Steel: 0.5 }
};

const EFFECTIVENESS_ORDER = [0, 0.25, 0.5, 1, 2, 4];
const DEFAULT_ATTACK_SCORES = { 0: -3, 0.25: -2, 0.5: -1, 1: 0, 2: 1, 4: 2 };
const DEFAULT_DEFENSE_SCORES = { 0: 3, 0.25: 2, 0.5: 1, 1: 0, 2: -1, 4: -2 };
const ITERATION_COUNT = 100;

const DEFENDER_TYPINGS = [
  ...ATTACKING_TYPES.map((type) => ({ key: type, label: type, types: [type] })),
  ...ATTACKING_TYPES.flatMap((leftType, leftIndex) =>
    ATTACKING_TYPES.slice(leftIndex + 1).map((rightType) => ({
      key: `${leftType}/${rightType}`,
      label: `${leftType} / ${rightType}`,
      types: [leftType, rightType]
    }))
  )
];

function getEffectiveness(attacker, defenderTypes) {
  return defenderTypes.reduce(
    (multiplier, defenderType) => multiplier * (TYPE_CHART[attacker]?.[defenderType] ?? 1),
    1
  );
}

function buildInitialRatings(entries) {
  return entries.reduce((ratings, entry) => {
    ratings[entry.key] = 100;
    return ratings;
  }, {});
}

function normalizeRatings(entries, rawRatings, totalScore) {
  if (totalScore === 0) {
    return buildInitialRatings(entries);
  }

  return entries.reduce((ratings, entry) => {
    ratings[entry.key] = (rawRatings[entry.key] * entries.length * 100) / totalScore;
    return ratings;
  }, {});
}

function getOffset(scoreMap) {
  const minimum = Math.min(...Object.values(scoreMap));
  return minimum < 0 ? -minimum : 0;
}

function App() {
  const [attackScores, setAttackScores] = useState(DEFAULT_ATTACK_SCORES);
  const [defenseScores, setDefenseScores] = useState(DEFAULT_DEFENSE_SCORES);
  const [rankings, setRankings] = useState({ attack: [], defense: [] });

  useEffect(() => {
    let attackRatings = buildInitialRatings(
      ATTACKING_TYPES.map((type) => ({ key: type }))
    );
    let defenseRatings = buildInitialRatings(DEFENDER_TYPINGS);

    const attackOffset = getOffset(attackScores);
    const defenseOffset = getOffset(defenseScores);

    for (let iteration = 0; iteration < ITERATION_COUNT; iteration += 1) {
      const nextAttackRatings = {};
      let totalAttackScore = 0;

      for (const attacker of ATTACKING_TYPES) {
        let weightedScore = 0;

        for (const defender of DEFENDER_TYPINGS) {
          const effectiveness = getEffectiveness(attacker, defender.types);
          const scoreValue = (attackScores[effectiveness] ?? attackScores[1]) + attackOffset;
          weightedScore += scoreValue * defenseRatings[defender.key];
        }

        nextAttackRatings[attacker] = weightedScore;
        totalAttackScore += weightedScore;
      }

      attackRatings = normalizeRatings(
        ATTACKING_TYPES.map((type) => ({ key: type })),
        nextAttackRatings,
        totalAttackScore
      );

      const nextDefenseRatings = {};
      let totalDefenseScore = 0;

      for (const defender of DEFENDER_TYPINGS) {
        let weightedScore = 0;

        for (const attacker of ATTACKING_TYPES) {
          const effectiveness = getEffectiveness(attacker, defender.types);
          const scoreValue = (defenseScores[effectiveness] ?? defenseScores[1]) + defenseOffset;
          weightedScore += scoreValue * attackRatings[attacker];
        }

        nextDefenseRatings[defender.key] = weightedScore;
        totalDefenseScore += weightedScore;
      }

      defenseRatings = normalizeRatings(DEFENDER_TYPINGS, nextDefenseRatings, totalDefenseScore);
    }

    setRankings({
      attack: Object.entries(attackRatings).sort(([, left], [, right]) => right - left),
      defense: DEFENDER_TYPINGS
        .map((defender) => [defender.label, defenseRatings[defender.key]])
        .sort(([, left], [, right]) => right - left)
    });
  }, [attackScores, defenseScores]);

  const handleAttackScoreChange = (effectiveness, value) => {
    setAttackScores((previousScores) => ({
      ...previousScores,
      [effectiveness]: Number.parseFloat(value) || 0
    }));
  };

  const handleDefenseScoreChange = (effectiveness, value) => {
    setDefenseScores((previousScores) => ({
      ...previousScores,
      [effectiveness]: Number.parseFloat(value) || 0
    }));
  };

  return (
    <div className="app-shell">
      <div className="container py-5">
        <header className="hero card shadow-sm mb-4">
          <div className="card-body">
            <p className="eyebrow mb-2">Dual-Type Extension</p>
            <h1 className="mb-3">Pokemon Dual-Type Ranking</h1>
            <p className="lead mb-3">
              Attack rankings are computed for the 18 single move types. Defense rankings are
              computed for all 171 single and dual defender typings.
            </p>
            <p className="mb-0 text-secondary">
              Each side starts at 100, uses a linear weighted average against the other side&apos;s
              current ratings, and is renormalized so its own average returns to 100 after every
              iteration.
            </p>
          </div>
        </header>

        <div className="row g-4">
          <div className="col-lg-4">
            <div className="card shadow-sm mb-4">
              <div className="card-body">
                <h2 className="h4 mb-3">Model Setup</h2>
                <p className="small text-secondary mb-2">
                  Attackers: {ATTACKING_TYPES.length} single types
                </p>
                <p className="small text-secondary mb-2">
                  Defenders: {DEFENDER_TYPINGS.length} single and dual typings
                </p>
                <p className="small text-secondary mb-0">
                  Effectiveness buckets: {EFFECTIVENESS_ORDER.join(', ')}x
                </p>
              </div>
            </div>

            <div className="card shadow-sm mb-4">
              <div className="card-body">
                <h2 className="h4 mb-3">Attack Scores</h2>
                <p className="small text-secondary">
                  These values score how much an attacking move benefits from each effectiveness
                  outcome against a single or dual defender.
                </p>
                {EFFECTIVENESS_ORDER.map((effectiveness) => (
                  <div className="input-group mb-2" key={`attack-${effectiveness}`}>
                    <span className="input-group-text score-label">{effectiveness}x</span>
                    <input
                      type="number"
                      className="form-control"
                      value={attackScores[effectiveness]}
                      onChange={(event) => handleAttackScoreChange(effectiveness, event.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="card shadow-sm">
              <div className="card-body">
                <h2 className="h4 mb-3">Defense Scores</h2>
                <p className="small text-secondary">
                  These values score how favorable each incoming effectiveness outcome is for a
                  defender.
                </p>
                {EFFECTIVENESS_ORDER.map((effectiveness) => (
                  <div className="input-group mb-2" key={`defense-${effectiveness}`}>
                    <span className="input-group-text score-label">{effectiveness}x</span>
                    <input
                      type="number"
                      className="form-control"
                      value={defenseScores[effectiveness]}
                      onChange={(event) => handleDefenseScoreChange(effectiveness, event.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="col-lg-8">
            <div className="row g-4">
              <div className="col-xl-5">
                <div className="card shadow-sm h-100">
                  <div className="card-body">
                    <h2 className="h4 mb-3">Attack Rankings</h2>
                    <p className="small text-secondary">
                      Ranked as move types against the full defender pool.
                    </p>
                    <div className="table-responsive ranking-table">
                      <table className="table table-sm align-middle mb-0">
                        <thead>
                          <tr>
                            <th>Rank</th>
                            <th>Type</th>
                            <th className="text-end">Rating</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rankings.attack.map(([type, rating], index) => (
                            <tr key={type}>
                              <td>{index + 1}</td>
                              <td>{type}</td>
                              <td className="text-end">{rating.toFixed(3)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-xl-7">
                <div className="card shadow-sm h-100">
                  <div className="card-body">
                    <h2 className="h4 mb-3">Defense Rankings</h2>
                    <p className="small text-secondary">
                      Ranked as defending typings using all 18 attacking move types.
                    </p>
                    <div className="table-responsive ranking-table defense-table">
                      <table className="table table-sm align-middle mb-0">
                        <thead>
                          <tr>
                            <th>Rank</th>
                            <th>Typing</th>
                            <th className="text-end">Rating</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rankings.defense.map(([typeLabel, rating], index) => (
                            <tr key={typeLabel}>
                              <td>{index + 1}</td>
                              <td>{typeLabel}</td>
                              <td className="text-end">{rating.toFixed(3)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
