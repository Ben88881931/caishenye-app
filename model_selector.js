(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CAISHEN_SELECTOR = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var VERSION = "selector-v1";
  var BASE_RATE = 0.5539;
  var DEFAULT_OPTIONS = {
    startPeriod: 31,
    endPeriod: null,
    recentWindow: 20,
    hotStreakLimit: 5,
    coldOmission: 4,
    minBounceRate: 0.55,
    minBounceSample: 5,
    minDoubleScore: 93.9,
    minWeightedConfirm: 0.65,
    missSwitchLimit: 3,
    minEdge: -0.01
  };

  function clamp(value, lo, hi) {
    return Math.max(lo, Math.min(hi, value));
  }

  function average(values) {
    if (!values.length) return 0;
    return values.reduce(function (a, b) { return a + b; }, 0) / values.length;
  }

  function periodsOf(raw) {
    return Object.keys(raw).map(Number).sort(function (a, b) { return a - b; });
  }

  function actualTails(raw, period) {
    var bits = raw[String(period)] || "";
    var out = [];
    for (var i = 0; i < 10; i++) {
      if (bits[i] === "1") out.push(i);
    }
    return out;
  }

  function tailStreak(raw, tail, upto) {
    var run = 0;
    for (var p = upto; p >= 1; p--) {
      var bits = raw[String(p)];
      if (!bits) break;
      if (bits[tail] !== "1") break;
      run++;
    }
    return run;
  }

  function makePick(pick, actual, model) {
    if (!pick) return null;
    return {
      tail: pick.tail,
      score: pick.score,
      tag: pick.tag || "",
      grade: pick.grade || model.gradeOf(pick.score),
      miss: pick.miss,
      maxMiss: pick.maxMiss,
      ratio: pick.ratio,
      weightedBounceRate: pick.weightedBounceRate,
      sample: pick.sample,
      baseRate: model.baseRate[pick.tail],
      hit: actual.indexOf(pick.tail) >= 0
    };
  }

  function buildSignals(raw, model, options) {
    var opts = Object.assign({}, DEFAULT_OPTIONS, options || {});
    var periods = periodsOf(raw);
    if (!periods.length) return [];
    var start = Number(opts.startPeriod || periods[0]);
    var end = periods[periods.length - 1];
    if (opts.endPeriod) end = Math.min(end, Number(opts.endPeriod));
    var rows = [];
    for (var p = start; p <= end; p++) {
      var prediction = model.buildPrediction(p - 1);
      var actual = actualTails(raw, p);
      var d = prediction.doubleRecommendation || [];
      var w = prediction.weightedBounce || [];
      rows.push({
        period: p,
        basedOn: p - 1,
        actual: actual,
        D1: makePick(d[0], actual, model),
        D2: makePick(d[1], actual, model),
        W1: makePick(w[0], actual, model),
        W2: makePick(w[1], actual, model)
      });
    }
    return rows;
  }

  function streamPick(row, stream) {
    if (stream === "double") return row.D1;
    if (stream === "weighted") return row.W1;
    return null;
  }

  function streamLabel(stream) {
    return stream === "weighted" ? "加权追冷" : "双号追热";
  }

  function historyBefore(rows, index, stream) {
    var out = [];
    for (var i = 0; i < index; i++) {
      var pick = streamPick(rows[i], stream);
      if (!pick) continue;
      out.push({ hit: pick.hit, baseRate: pick.baseRate, period: rows[i].period });
    }
    return out;
  }

  function streakStats(history) {
    var currentHit = 0;
    var currentMiss = 0;
    for (var i = history.length - 1; i >= 0 && history[i].hit; i--) currentHit++;
    for (var j = history.length - 1; j >= 0 && !history[j].hit; j--) currentMiss++;
    var maxHit = 0;
    var maxMiss = 0;
    var hitRun = 0;
    var missRun = 0;
    history.forEach(function (item) {
      if (item.hit) {
        hitRun++;
        missRun = 0;
      } else {
        missRun++;
        hitRun = 0;
      }
      maxHit = Math.max(maxHit, hitRun);
      maxMiss = Math.max(maxMiss, missRun);
    });
    return { currentHit: currentHit, currentMiss: currentMiss, maxHit: maxHit, maxMiss: maxMiss };
  }

  function windowRates(history, window) {
    var slice = history.slice(-window);
    var hitRate = average(slice.map(function (x) { return x.hit ? 1 : 0; }));
    var baseRate = average(slice.map(function (x) { return x.baseRate; }));
    return { n: slice.length, hitRate: hitRate, baseRate: baseRate, edge: hitRate - baseRate };
  }

  function threePeriodStats(rows, stream) {
    var counts = { "1": 0, "2": 0, "3": 0, "4": 0 };
    for (var i = 0; i + 2 < rows.length; i++) {
      var pick = streamPick(rows[i], stream);
      if (!pick) continue;
      var hitIndex = 4;
      for (var j = 0; j < 3; j++) {
        if (rows[i + j].actual.indexOf(pick.tail) >= 0) {
          hitIndex = j + 1;
          break;
        }
      }
      counts[String(hitIndex)]++;
    }
    var total = counts["1"] + counts["2"] + counts["3"] + counts["4"];
    return {
      n: total,
      first: counts["1"],
      second: counts["2"],
      third: counts["3"],
      miss: counts["4"],
      hitRate: total ? (counts["1"] + counts["2"] + counts["3"]) / total : 0
    };
  }

  function streamState(rows, index, stream, raw, options) {
    var opts = Object.assign({}, DEFAULT_OPTIONS, options || {});
    var history = historyBefore(rows, index, stream);
    var stats = streakStats(history);
    var recent = windowRates(history, opts.recentWindow);
    var current = streamPick(rows[index], stream);
    var emptyCount = 0;
    var start = Math.max(0, index - opts.recentWindow);
    for (var i = start; i < index; i++) {
      if (!streamPick(rows[i], stream)) emptyCount++;
    }
    var emptyRate = index > start ? emptyCount / (index - start) : 0;
    return {
      stream: stream,
      label: streamLabel(stream),
      current: current,
      n: history.length,
      recentN: recent.n,
      recentHitRate: recent.hitRate,
      recentBaseRate: recent.baseRate,
      edge: recent.edge,
      currentHitStreak: stats.currentHit,
      currentMissStreak: stats.currentMiss,
      maxHitStreak: stats.maxHit,
      maxMissStreak: stats.maxMiss,
      emptyRate: emptyRate,
      tailStreak: current ? tailStreak(raw, current.tail, rows[index].basedOn) : 0,
      threePeriod: threePeriodStats(rows.slice(0, index + 1), stream)
    };
  }

  function decide(rows, index, raw, options) {
    var opts = Object.assign({}, DEFAULT_OPTIONS, options || {});
    var d = streamState(rows, index, "double", raw, opts);
    var w = streamState(rows, index, "weighted", raw, opts);
    var overheat = !!(d.current && d.tailStreak >= opts.hotStreakLimit);
    var coldRebound = !!(w.current && Number(w.current.miss) >= opts.coldOmission &&
      Number(w.current.weightedBounceRate) >= opts.minBounceRate &&
      Number(w.current.sample) >= opts.minBounceSample);
    var dConfirmed = !!(d.current && !overheat && d.currentMissStreak !== 2 &&
      d.current.score >= opts.minDoubleScore && w.current &&
      Number(w.current.weightedBounceRate) >= opts.minWeightedConfirm);
    var wConfirmed = !!(w.current && (w.currentMissStreak === 2 || w.currentHitStreak === 1));

    var source = null;
    var reason = "";
    var rule = "";
    if (dConfirmed) {
      source = "double";
      rule = "P1/P6";
      reason = "双号达到A级且加权反弹信号确认";
    } else if (wConfirmed) {
      source = "weighted";
      rule = "P2/P4";
      reason = w.currentMissStreak === 2 ? "加权对错遗漏2期，进入反弹观察" : "加权刚连续命中1期";
    } else {
      source = null;
      rule = "P5/P6";
      reason = overheat ? "双号连出过热，等待更明确信号" : "双号未确认且加权未达到强切换门槛，空仓观望";
    }
    return {
      period: rows[index].period,
      source: source,
      action: source === "double" ? "跟双号" : source === "weighted" ? "跟加权" : "观望",
      rule: rule,
      reason: reason,
      double: d,
      weighted: w,
      overheat: overheat,
      coldRebound: coldRebound,
      dConfirmed: dConfirmed,
      wConfirmed: wConfirmed
    };
  }

  function analyze(raw, model, options) {
    var opts = Object.assign({}, DEFAULT_OPTIONS, options || {});
    var rows = buildSignals(raw, model, opts);
    if (!rows.length) return null;
    var periods = periodsOf(raw);
    var latest = periods[periods.length - 1];
    var prediction = model.buildPrediction(latest);
    var d = prediction.doubleRecommendation || [];
    var w = prediction.weightedBounce || [];
    var future = {
      period: latest + 1,
      basedOn: latest,
      actual: [],
      D1: makePick(d[0], [], model),
      D2: makePick(d[1], [], model),
      W1: makePick(w[0], [], model),
      W2: makePick(w[1], [], model)
    };
    var allRows = rows.concat([future]);
    var decision = decide(allRows, allRows.length - 1, raw, opts);
    return {
      version: VERSION,
      options: opts,
      rows: rows,
      latestPeriod: latest,
      nextPeriod: latest + 1,
      decision: decision
    };
  }

  function runBacktest(raw, model, mode, options) {
    var opts = Object.assign({}, DEFAULT_OPTIONS, options || {});
    var rows = buildSignals(raw, model, opts);
    var equity = 0;
    var peak = 0;
    var maxDrawdown = 0;
    var hits = 0;
    var bets = 0;
    var observed = 0;
    var actionCounts = { double: 0, weighted: 0, observe: 0 };
    var ruleCounts = {};
    for (var i = 0; i < rows.length; i++) {
      var pick = null;
      if (mode === "double") pick = rows[i].D1;
      else if (mode === "weighted") pick = rows[i].W1;
      else {
        var decision = decide(rows, i, raw, opts);
        pick = streamPick(rows[i], decision.source);
        actionCounts[decision.source || "observe"]++;
        ruleCounts[decision.rule] = (ruleCounts[decision.rule] || 0) + 1;
        if (!pick) {
          observed++;
          continue;
        }
      }
      if (!pick) continue;
      bets++;
      var pnl = pick.hit ? 0.8 : -1;
      if (pick.hit) hits++;
      equity += pnl;
      peak = Math.max(peak, equity);
      maxDrawdown = Math.max(maxDrawdown, peak - equity);
    }
    return {
      mode: mode,
      bets: bets,
      hits: hits,
      hitRate: bets ? hits / bets : 0,
      net: Number(equity.toFixed(4)),
      roi: bets ? equity / bets : 0,
      maxDrawdown: Number(maxDrawdown.toFixed(4)),
      observed: observed,
      actionCounts: actionCounts,
      ruleCounts: ruleCounts
    };
  }

  return {
    VERSION: VERSION,
    BASE_RATE: BASE_RATE,
    DEFAULT_OPTIONS: DEFAULT_OPTIONS,
    buildSignals: buildSignals,
    streamState: streamState,
    decide: decide,
    analyze: analyze,
    runBacktest: runBacktest
  };
});
