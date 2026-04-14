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
const DEFAULT_DUAL_ATTACK_WEIGHTS = { coverage: 0.3, overlap: 0.2 };
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

const DUAL_ATTACKERS = ATTACKING_TYPES.flatMap((leftType, leftIndex) =>
  ATTACKING_TYPES.slice(leftIndex + 1).map((rightType) => ({
    key: `${leftType}/${rightType}`,
    label: `${leftType} / ${rightType}`,
    types: [leftType, rightType]
  }))
);

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

function getShiftedAttackScore(effectiveness, attackScores, attackOffset) {
  return (attackScores[effectiveness] ?? attackScores[1]) + attackOffset;
}

function getUnshiftedAttackScore(effectiveness, attackScores) {
  return attackScores[effectiveness] ?? attackScores[1];
}

function calculateSingleAttackRawTotals(defenseRatings, attackScores, attackOffset) {
  const rawTotals = {};

  for (const attacker of ATTACKING_TYPES) {
    let weightedScore = 0;

    for (const defender of DEFENDER_TYPINGS) {
      const effectiveness = getEffectiveness(attacker, defender.types);
      weightedScore += getShiftedAttackScore(effectiveness, attackScores, attackOffset) * defenseRatings[defender.key];
    }

    rawTotals[attacker] = weightedScore;
  }

  return rawTotals;
}

function calculateDualAttackRankings(attackRatings, defenseRatings, attackScores, attackOffset, dualAttackWeights) {
  const singleAttackRawTotals = calculateSingleAttackRawTotals(defenseRatings, attackScores, attackOffset);

  const singleAttackEntries = ATTACKING_TYPES.map((type) => [type, attackRatings[type]]);

  const dualAttackEntries = DUAL_ATTACKERS.map((attacker) => {
    const [leftType, rightType] = attacker.types;
    const baseRating = Math.max(attackRatings[leftType], attackRatings[rightType]);
    const betterSingleRaw = Math.max(singleAttackRawTotals[leftType], singleAttackRawTotals[rightType]);
    let bestCoverageRaw = 0;
    let positiveOverlapRaw = 0;

    for (const defender of DEFENDER_TYPINGS) {
      const leftEffectiveness = getEffectiveness(leftType, defender.types);
      const rightEffectiveness = getEffectiveness(rightType, defender.types);
      const leftShiftedScore = getShiftedAttackScore(leftEffectiveness, attackScores, attackOffset);
      const rightShiftedScore = getShiftedAttackScore(rightEffectiveness, attackScores, attackOffset);
      const leftUnshiftedScore = getUnshiftedAttackScore(leftEffectiveness, attackScores);
      const rightUnshiftedScore = getUnshiftedAttackScore(rightEffectiveness, attackScores);

      bestCoverageRaw += Math.max(leftShiftedScore, rightShiftedScore) * defenseRatings[defender.key];
      positiveOverlapRaw += Math.max(0, Math.min(leftUnshiftedScore, rightUnshiftedScore)) * defenseRatings[defender.key];
    }

    const coverageRatio = betterSingleRaw > 0
      ? Math.max(0, (bestCoverageRaw - betterSingleRaw) / betterSingleRaw)
      : 0;
    const overlapRatio = bestCoverageRaw > 0
      ? Math.max(0, positiveOverlapRaw / bestCoverageRaw)
      : 0;

    return {
      label: attacker.label,
      multiplicativeRating: baseRating * (
        1
        + dualAttackWeights.coverage * coverageRatio
        + dualAttackWeights.overlap * overlapRatio
      ),
      additiveRating: baseRating
        + dualAttackWeights.coverage * baseRating * coverageRatio
        + dualAttackWeights.overlap * baseRating * overlapRatio
    };
  });

  return {
    multiplicative: [
      ...singleAttackEntries,
      ...dualAttackEntries.map(({ label, multiplicativeRating }) => [label, multiplicativeRating])
    ].sort(([, left], [, right]) => right - left),
    additive: [
      ...singleAttackEntries,
      ...dualAttackEntries.map(({ label, additiveRating }) => [label, additiveRating])
    ].sort(([, left], [, right]) => right - left)
  };
}

function escapeCsvValue(value) {
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function downloadCsv(filename, headers, rows) {
  const csvLines = [
    headers.map(escapeCsvValue).join(','),
    ...rows.map((row) => row.map(escapeCsvValue).join(','))
  ];
  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function App() {
  const [attackScores, setAttackScores] = useState(DEFAULT_ATTACK_SCORES);
  const [defenseScores, setDefenseScores] = useState(DEFAULT_DEFENSE_SCORES);
  const [dualAttackWeights, setDualAttackWeights] = useState(DEFAULT_DUAL_ATTACK_WEIGHTS);
  const [rankings, setRankings] = useState({
    attack: [],
    defense: [],
    attackTypingsMultiplicative: [],
    attackTypingsAdditive: []
  });

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
          const scoreValue = getShiftedAttackScore(effectiveness, attackScores, attackOffset);
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

    const dualAttackRankings = calculateDualAttackRankings(
      attackRatings,
      defenseRatings,
      attackScores,
      attackOffset,
      dualAttackWeights
    );

    setRankings({
      attack: Object.entries(attackRatings).sort(([, left], [, right]) => right - left),
      defense: DEFENDER_TYPINGS
        .map((defender) => [defender.label, defenseRatings[defender.key]])
        .sort(([, left], [, right]) => right - left),
      attackTypingsMultiplicative: dualAttackRankings.multiplicative,
      attackTypingsAdditive: dualAttackRankings.additive
    });
  }, [attackScores, defenseScores, dualAttackWeights]);

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

  const handleDualAttackWeightChange = (weightName, value) => {
    setDualAttackWeights((previousWeights) => ({
      ...previousWeights,
      [weightName]: Number.parseFloat(value) || 0
    }));
  };

  const handleDownloadAttackCsv = () => {
    downloadCsv(
      'attack-rankings.csv',
      ['Rank', 'Type', 'Rating'],
      rankings.attack.map(([type, rating], index) => [index + 1, type, rating.toFixed(6)])
    );
  };

  const handleDownloadDefenseCsv = () => {
    downloadCsv(
      'defense-rankings.csv',
      ['Rank', 'Typing', 'Rating'],
      rankings.defense.map(([typeLabel, rating], index) => [index + 1, typeLabel, rating.toFixed(6)])
    );
  };

  const handleDownloadAttackTypingsCsv = () => {
    downloadCsv(
      'attack-typings-rankings.csv',
      ['Rank', 'Typing', 'Rating'],
      rankings.attackTypingsAdditive.map(([typeLabel, rating], index) => [index + 1, typeLabel, rating.toFixed(6)])
    );
  };

  return (
    <div className="app-shell">
      <div className="container py-5">
        <header className="hero card shadow-sm mb-4">
          <div className="card-body">
            <h1 className="mb-3">Pokemon Dual-Type Ranking</h1>
            <p className="mb-0 text-secondary">
              Each score is initalized at 100. Then in each iteration, a linear weighted average against the other side&apos;s
              current ratings based on effectiveness is calculated, and is renormalized so its own average returns to 100 after every
              iteration. This simple methods satisfies some intuitive bounds. See <a href="https://sungwon-kim.com/blog/2024/ranking-pokemon-types/" target="_blank" rel="noreferrer">this blog post</a> for context.
            </p>
            <p className="mb-0 mt-3 text-secondary">
              Combined attack-typing estimates currently use the following calculation:
              <code className="ms-1">
                max(type1, type2) + coverageWeight * max(type1, type2) * coverage + overlapWeight * max(type1, type2) * overlap
              </code>
              . Single typings keep their original attack ratings.
            </p>
            <p className="mb-0 mt-3 text-secondary">
              Original single-type app:
              <a
                className="hero-link ms-1"
                href="https://sungwon-kim.com/pokemon-type-ranking-app/"
                target="_blank"
                rel="noreferrer"
              >
                pokemon-type-ranking-app
              </a>
            </p>
          </div>
        </header>

        <div className="row g-4">
          <div className="col-lg-4">
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

            <div className="card shadow-sm mb-4">
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

            <div className="card shadow-sm">
              <div className="card-body">
                <h2 className="h4 mb-3">Dual Attack Weights</h2>
                <p className="small text-secondary mb-3">
                  For a dual attacking type, <strong>base</strong> is the larger of its two single-type
                  attack ratings: <code>max(type1, type2)</code>.
                </p>
                <p className="small text-secondary mb-3">
                  Dual attack score:
                  <code className="ms-1">
                    base + coverageWeight * base * coverage + overlapWeight * base * overlap.
                  </code>
                  modify the weights as you seem fit.
                </p>
                <div className="input-group mb-2">
                  <span className="input-group-text score-label-wide">Coverage Weight</span>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    value={dualAttackWeights.coverage}
                    onChange={(event) => handleDualAttackWeightChange('coverage', event.target.value)}
                  />
                </div>
                <div className="input-group mb-0">
                  <span className="input-group-text score-label-wide">Overlap Weight</span>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    value={dualAttackWeights.overlap}
                    onChange={(event) => handleDualAttackWeightChange('overlap', event.target.value)}
                  />
                </div>
                <details className="formula-details mt-3">
                  <summary>How the combined attack-typing score is calculated</summary>
                  <div className="formula-body small text-secondary mt-3">
                    <p className="mb-2">
                      For a dual attacking typing <code>(A, B)</code>, the baseline is
                      <code className="ms-1">max(singleAttack(A), singleAttack(B))</code>.
                    </p>
                    <p className="mb-2">
                      For each defender <code>D</code>, the app computes
                      <code className="ms-1">scoreA(D)</code> and <code>scoreB(D)</code>
                      using the current attack score table, then weights them by the current
                      defender rating.
                    </p>
                    <p className="mb-2">
                      <strong>Coverage raw total</strong>:
                      <code className="ms-1">
                        bestCoverageRaw = Σ_D max(scoreA(D), scoreB(D)) * defenseRating(D)
                      </code>
                    </p>
                    <p className="mb-2">
                      <strong>Better single raw total</strong>:
                      <code className="ms-1">
                        betterSingleRaw = max(rawSingle(A), rawSingle(B))
                      </code>
                    </p>
                    <p className="mb-2">
                      <strong>Coverage</strong>:
                      <code className="ms-1">
                        coverage = max(0, (bestCoverageRaw - betterSingleRaw) / betterSingleRaw)
                      </code>
                    </p>
                    <p className="mb-2">
                      <strong>Overlap raw total</strong>:
                      <code className="ms-1">
                        positiveOverlapRaw = Σ_D max(0, min(unshiftedScoreA(D), unshiftedScoreB(D))) * defenseRating(D)
                      </code>
                    </p>
                    <p className="mb-2">
                      <strong>Overlap</strong>:
                      <code className="ms-1">
                        overlap = max(0, positiveOverlapRaw / bestCoverageRaw)
                      </code>
                    </p>
                    <p className="mb-0">
                      Additive-bonus score:
                      <code className="ms-1">
                        base + coverageWeight * base * coverage + overlapWeight * base * overlap
                      </code>
                    </p>
                  </div>
                </details>
              </div>
            </div>
          </div>

          <div className="col-lg-8">
            <div className="row g-4">
              <div className="col-xl-5">
                <div className="card shadow-sm h-100">
                  <div className="card-body">
                    <div className="section-header mb-3">
                      <h2 className="h4 mb-0">Attack Rankings</h2>
                      <button type="button" className="download-button" onClick={handleDownloadAttackCsv}>
                        Download CSV
                      </button>
                    </div>
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
                    <div className="section-header mb-3">
                      <h2 className="h4 mb-0">Defense Rankings</h2>
                      <button type="button" className="download-button" onClick={handleDownloadDefenseCsv}>
                        Download CSV
                      </button>
                    </div>
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

            <div className="row g-4 mt-1">
              <div className="col-12">
                <div className="card shadow-sm h-100">
                  <div className="card-body">
                    <div className="section-header mb-3">
                      <h2 className="h4 mb-0">Attack Typings Rankings</h2>
                      <button type="button" className="download-button" onClick={handleDownloadAttackTypingsCsv}>
                        Download CSV
                      </button>
                    </div>
                    <p className="small text-secondary">
                      Includes all 18 single attacking types and 153 dual attacking typings.
                      Dual typings use the base-scaled additive heuristic
                      <code className="ms-1">max(type1, type2) + coverageWeight * max(type1, type2) * coverage + overlapWeight * max(type1, type2) * overlap</code>.
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
                          {rankings.attackTypingsAdditive.map(([typeLabel, rating], index) => (
                            <tr key={`attack-typings-${typeLabel}`}>
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
