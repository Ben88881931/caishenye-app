(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CAISHEN_PROBABILITY = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var VERSION = "prob-v1-20261020";
  var META = {
    train: "2021-2024",
    validation: "2025",
    shadow: "2026",
    samples: { train: 9240, validation: 2310, shadow: 2910 },
    baseline: {
      validation: { next: 0.5428571428571428, window3: 0.9103896103896104 },
      shadow2026: { next: 0.5474226804123712, window3: 0.9030927835051546 }
    },
    validation: {
      nextTop1: 136 / 231,
      nextTop3Coverage: 214 / 231,
      window3Top1: 212 / 231,
      window3CoverageTop3: 231 / 231
    },
    shadow2026: {
      nextTop1: 160 / 291,
      nextTop3Coverage: 279 / 291,
      window3Top1: 261 / 291,
      window3CoverageTop3: 291 / 291
    }
  };
  var MEAN = [1, 0.1, 0.5406277056277154, 0.5346969696969679, 0.5228192640692708, 0.5109920634920567, 0.08581168831169216, 0.2350000000000066];
  var SD = [1, 0.29999999999998567, 0.2353656911766265, 0.18044442235191768, 0.15036609659599928, 0.14621742471589189, 0.1329281908875932, 0.2926814751354063];
  var NEXT_W = [0.19029309294887506, -0.12530924983240235, 0.03316944549864856, 0.026108260684124224, -0.04153563674658185, -0.0029537304122937732, -0.01450090578656891, 0.028530663826202226];
  var WINDOW_W = [2.251916669082404, -0.26660959188369804, 0.06632032531575861, 0.051851421476236205, -0.1444534827590099, 0.024303114488335727, -0.06840156899215752, 0.011659888691652215];

  function periodsOf(raw) {
    return Object.keys(raw).map(Number).filter(Number.isFinite).sort(function (a, b) { return a - b; });
  }

  function hasTail(raw, period, tail) {
    var bits = raw[String(period)];
    return !!bits && bits[tail] === "1";
  }

  function featuresAt(raw, basedOn, tail) {
    var periods = periodsOf(raw).filter(function (period) { return period <= basedOn; });
    var yearPeriods = periods;
    var c5 = 0, c10 = 0, c20 = 0, c30 = 0;
    yearPeriods.slice(-30).forEach(function (period) {
      var age = basedOn - period + 1;
      var hit = hasTail(raw, period, tail);
      if (age <= 5 && hit) c5++;
      if (age <= 10 && hit) c10++;
      if (age <= 20 && hit) c20++;
      if (age <= 30 && hit) c30++;
    });
    var miss = 0, streak = 0;
    for (var i = yearPeriods.length - 1; i >= 0; i--) {
      if (!hasTail(raw, yearPeriods[i], tail)) miss++;
      else break;
    }
    for (var j = yearPeriods.length - 1; j >= 0; j--) {
      if (hasTail(raw, yearPeriods[j], tail)) streak++;
      else break;
    }
    return [
      1,
      tail === 0 ? 1 : 0,
      c5 / 5,
      c10 / 10,
      c20 / 20,
      c30 / 30,
      Math.min(10, miss) / 10,
      Math.min(5, streak) / 5
    ];
  }

  function rawStateAt(raw, basedOn, tail) {
    var periods = periodsOf(raw).filter(function (period) { return period <= basedOn; });
    var miss = 0, streak = 0;
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

  function predictWith(features, weights) {
    var z = weights[0];
    for (var i = 1; i < weights.length; i++) z += weights[i] * (features[i] - MEAN[i]) / SD[i];
    return sigmoid(z);
  }

  function analyze(raw, basedOn) {
    var rows = [];
    for (var tail = 0; tail <= 9; tail++) {
      var features = featuresAt(raw, basedOn, tail);
      var state = rawStateAt(raw, basedOn, tail);
      rows.push({
        tail: tail,
        nextProb: predictWith(features, NEXT_W),
        window3Prob: predictWith(features, WINDOW_W),
        currentMiss: state.miss,
        currentStreak: state.streak,
        features: features
      });
    }
    rows.sort(function (a, b) { return b.nextProb - a.nextProb || a.tail - b.tail; });
    var top = rows.slice(0, 3);
    var spread = top[0].nextProb - top[2].nextProb;
    return {
      version: VERSION,
      meta: META,
      basedOn: basedOn,
      target: basedOn + 1,
      rows: rows,
      top: top,
      ambiguous: spread < 0.01,
      spread: spread
    };
  }

  return { VERSION: VERSION, META: META, analyze: analyze };
});
