(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./probability_weight_research.js"));
  } else {
    root.CAISHEN_PROBABILITY = factory(root.CAISHEN_PROBABILITY_WEIGHT_RESEARCH);
  }
})(typeof self !== "undefined" ? self : this, function (WEIGHT_RESEARCH) {
  "use strict";

  var VERSION = "prob-v2-20261022-57152130";
  var LEGACY_VERSION = "prob-v1-20261020";
  var PRODUCTION_MODEL_KEY = "p57152130";
  var LEGACY_LOCK = { basedOn: 295, target: 296 };
  var PRODUCTION_MODEL = WEIGHT_RESEARCH.models[PRODUCTION_MODEL_KEY];
  var VALIDATION = PRODUCTION_MODEL.evaluation[2025];
  var SHADOW = PRODUCTION_MODEL.evaluation[2026];
  var META = {
    train: "2021-2024",
    validationYear: 2025,
    shadow: "2026",
    samples: {
      train: PRODUCTION_MODEL.sampleCount,
      validation: VALIDATION.periods,
      shadow: SHADOW.periods
    },
    baseline: {
      validation: { next: VALIDATION.nextBaseline, window3: VALIDATION.baseline },
      shadow2026: { next: SHADOW.nextBaseline, window3: SHADOW.baseline }
    },
    validation: {
      nextTop1: VALIDATION.first / VALIDATION.periods,
      nextTop3Coverage: VALIDATION.nextTop3CoverageHits / VALIDATION.periods,
      window3Top1: VALIDATION.hits / VALIDATION.periods,
      window3CoverageTop3: VALIDATION.window3Top3CoverageHits / VALIDATION.periods
    },
    shadow2026: {
      nextTop1: SHADOW.first / SHADOW.periods,
      nextTop3Coverage: SHADOW.nextTop3CoverageHits / SHADOW.periods,
      window3Top1: SHADOW.hits / SHADOW.periods,
      window3CoverageTop3: SHADOW.window3Top3CoverageHits / SHADOW.periods
    },
    productionMethod: {
      key: PRODUCTION_MODEL_KEY,
      windows: PRODUCTION_MODEL.windows,
      ranking: "window3Prob descending, then nextProb descending, then tail ascending",
      researchRecommendation: WEIGHT_RESEARCH.researchRecommendation,
      decision: WEIGHT_RESEARCH.decision,
      override: WEIGHT_RESEARCH.override
    },
    legacyLock: LEGACY_LOCK
  };

  // 296期快照在切换前已经锁定，保留旧模型重算同一结果，禁止开奖后换号。
  var LEGACY = {
    windows: [5, 10, 20, 30],
    mean: [1, 0.1, 0.5406277056277154, 0.5346969696969679, 0.5228192640692708, 0.5109920634920567, 0.08581168831169216, 0.2350000000000066],
    sd: [1, 0.29999999999998567, 0.2353656911766265, 0.18044442235191768, 0.15036609659599928, 0.14621742471589189, 0.1329281908875932, 0.2926814751354063],
    nextWeights: [0.19029309294887506, -0.12530924983240235, 0.03316944549864856, 0.026108260684124224, -0.04153563674658185, -0.0029537304122937732, -0.01450090578656891, 0.028530663826202226],
    window3Weights: [2.251916669082404, -0.26660959188369804, 0.06632032531575861, 0.051851421476236205, -0.1444534827590099, 0.024303114488335727, -0.06840156899215752, 0.011659888691652215]
  };

  function periodsOf(raw) {
    return Object.keys(raw).map(Number).filter(Number.isFinite).sort(function (a, b) { return a - b; });
  }

  function hasTail(raw, period, tail) {
    var bits = raw[String(period)];
    return !!bits && bits[tail] === "1";
  }

  function featuresAt(raw, basedOn, tail, windows, legacyBias) {
    var periods = periodsOf(raw).filter(function (period) { return period <= basedOn; });
    var values = legacyBias ? [1, tail === 0 ? 1 : 0] : [];
    windows.forEach(function (window) {
      var count = 0;
      var start = Math.max(1, basedOn - window + 1);
      for (var period = start; period <= basedOn; period++) {
        if (hasTail(raw, period, tail)) count++;
      }
      values.push(count / window);
    });
    var miss = 0;
    var streak = 0;
    for (var i = periods.length - 1; i >= 0; i--) {
      if (!hasTail(raw, periods[i], tail)) miss++;
      else break;
    }
    for (var j = periods.length - 1; j >= 0; j--) {
      if (hasTail(raw, periods[j], tail)) streak++;
      else break;
    }
    values.push(Math.min(10, miss) / 10, Math.min(5, streak) / 5);
    return values;
  }

  function rawStateAt(raw, basedOn, tail) {
    var periods = periodsOf(raw).filter(function (period) { return period <= basedOn; });
    var miss = 0;
    var streak = 0;
    for (var i = periods.length - 1; i >= 0; i--) {
      if (!hasTail(raw, periods[i], tail)) miss++;
      else break;
    }
    for (var j = periods.length - 1; j >= 0; j--) {
      if (hasTail(raw, periods[j], tail)) streak++;
      else break;
    }
    return { miss: miss, streak: streak };
  }

  function sigmoid(value) {
    var z = Math.max(-20, Math.min(20, value));
    return 1 / (1 + Math.exp(-z));
  }

  function predictWith(features, mean, sd, weights, legacyBias) {
    var z = weights[0];
    for (var i = 1; i < weights.length; i++) {
      var index = legacyBias ? i : i - 1;
      z += weights[i] * (features[index] - mean[index]) / sd[index];
    }
    return sigmoid(z);
  }

  function analyze(raw, basedOn, options) {
    var forceNew = options && options.method === "new";
    var legacyLocked = !forceNew && Number(basedOn) === LEGACY_LOCK.basedOn;
    var windows = legacyLocked ? LEGACY.windows : PRODUCTION_MODEL.windows;
    var mean = legacyLocked ? LEGACY.mean : PRODUCTION_MODEL.window3.mean;
    var sd = legacyLocked ? LEGACY.sd : PRODUCTION_MODEL.window3.sd;
    var nextWeights = legacyLocked ? LEGACY.nextWeights : PRODUCTION_MODEL.next.weights;
    var window3Weights = legacyLocked ? LEGACY.window3Weights : PRODUCTION_MODEL.window3.weights;
    var rows = [];
    for (var tail = 0; tail <= 9; tail++) {
      var features = featuresAt(raw, basedOn, tail, windows, legacyLocked);
      var state = rawStateAt(raw, basedOn, tail);
      rows.push({
        tail: tail,
        nextProb: predictWith(features, mean, sd, nextWeights, legacyLocked),
        window3Prob: predictWith(features, mean, sd, window3Weights, legacyLocked),
        currentMiss: state.miss,
        currentStreak: state.streak,
        features: features
      });
    }
    rows.sort(function (a, b) {
      if (legacyLocked) return b.nextProb - a.nextProb || a.tail - b.tail;
      return b.window3Prob - a.window3Prob || b.nextProb - a.nextProb || a.tail - b.tail;
    });
    var top = rows.slice(0, 3);
    var spread = top[0].window3Prob - top[2].window3Prob;
    return {
      version: legacyLocked ? LEGACY_VERSION : VERSION,
      modelKey: legacyLocked ? "legacy-p10" : PRODUCTION_MODEL_KEY,
      legacyLocked: legacyLocked,
      meta: META,
      basedOn: basedOn,
      target: basedOn + 1,
      rows: rows,
      top: top,
      ambiguous: spread < 0.01,
      spread: spread
    };
  }

  function windowBacktest(raw, rank, maxStage) {
    var cap = maxStage === 2 ? 2 : 3;
    var periods = periodsOf(raw);
    if (!periods.length) return [];
    var maxPeriod = periods[periods.length - 1];
    var records = [];
    var waitingTail = null;
    var period = 1;
    while (period <= maxPeriod) {
      if (waitingTail != null) {
        var reopened = null;
        for (var wait = period; wait <= maxPeriod; wait++) {
          if (hasTail(raw, wait, waitingTail)) {
            reopened = wait;
            break;
          }
        }
        if (reopened == null) break;
        period = reopened + 1;
        waitingTail = null;
        continue;
      }
      var prediction = analyze(raw, period - 1, { method: "new" });
      var pick = prediction.top[rank || 0];
      if (!pick) {
        period++;
        continue;
      }
      var attempts = [];
      var hitIndex = 0;
      for (var offset = 0; offset < cap && period + offset <= maxPeriod; offset++) {
        var at = period + offset;
        var hit = hasTail(raw, at, pick.tail);
        attempts.push({ period: at, tail: pick.tail, hit: hit });
        if (hit) {
          hitIndex = offset + 1;
          break;
        }
      }
      if (hitIndex > 0) {
        records.push({ startPeriod: period, tail: pick.tail, status: "hit", hitIndex: hitIndex, attempts: attempts });
        period += hitIndex;
      } else if (attempts.length === cap) {
        records.push({ startPeriod: period, tail: pick.tail, status: "miss", hitIndex: 0, attempts: attempts });
        waitingTail = pick.tail;
        period += cap;
      } else {
        break;
      }
    }
    return records;
  }

  return {
    VERSION: VERSION,
    LEGACY_VERSION: LEGACY_VERSION,
    META: META,
    analyze: analyze,
    windowBacktest: windowBacktest
  };
});
