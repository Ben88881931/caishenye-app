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
    minDoubleScore: 93.9,
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
      rows.push({
        period: p,
        basedOn: p - 1,
        actual: actual,
        D1: makePick(d[0], actual, model),
        D2: makePick(d[1], actual, model)
      });
    }
    return rows;
  }

  function streamPick(row, stream) {
    if (stream === "double" || stream === "D1") return row.D1;
    if (stream === "D2") return row.D2;
    return null;
  }

  function streamLabel(stream) {
    if (stream === "D1" || stream === "double") return "双号首推";
    if (stream === "D2") return "双号备选";
    return stream;
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

  function correctnessKey(state) {
    if (state.currentMissStreak > 0) return "M" + Math.min(state.currentMissStreak, 3);
    return "H" + Math.min(state.currentHitStreak, 2);
  }

  function conditionalTable(rows, endIndex, stream) {
    var table = {};
    var prior = { n: 0, h: 0 };
    var runType = null;
    var runLen = 0;
    for (var i = 0; i < endIndex; i++) {
      var pick = streamPick(rows[i], stream);
      if (!pick) continue;
      if (runType) {
        var key = (runType === "hit" ? "H" : "M") + Math.min(runLen, runType === "hit" ? 2 : 3);
        if (!table[key]) table[key] = { n: 0, h: 0 };
        table[key].n++;
        table[key].h += pick.hit ? 1 : 0;
        prior.n++;
        prior.h += pick.hit ? 1 : 0;
      }
      var nextType = pick.hit ? "hit" : "miss";
      if (nextType === runType) runLen++;
      else {
        runType = nextType;
        runLen = 1;
      }
    }
    return { table: table, prior: prior };
  }

  function independentConfidence(rows, index, stream, state, raw, options) {
    var opts = Object.assign({}, DEFAULT_OPTIONS, options || {});
    var tableInfo = conditionalTable(rows, index, stream);
    var priorP = tableInfo.prior.n ? tableInfo.prior.h / tableInfo.prior.n : BASE_RATE;
    if (!state.current) {
      return {
        pCorrect: null,
        score: 0,
        band: "空推荐",
        action: "无信号",
        sample: 0,
        stateKey: null,
        baseRate: priorP,
        baseEligible: priorP >= BASE_RATE
      };
    }
    var key = correctnessKey(state);
    var bucket = tableInfo.table[key] || { n: 0, h: 0 };
    var alpha = 5;
    var pState = (bucket.h + priorP * alpha) / (bucket.n + alpha);
    var recentP = state.recentN ? state.recentHitRate : priorP;
    var pCorrect = pState;
    var baseEligible = priorP >= BASE_RATE;
    if (state.tailStreak >= opts.hotStreakLimit) pCorrect = Math.min(pCorrect, 0.45);
    var score = clamp((pCorrect - 0.5) / 0.15, 0, 1) * 100;
    var band = pCorrect >= 0.65 ? "高" : pCorrect >= 0.58 ? "中" : pCorrect >= 0.5556 ? "低" : "避开";
    var action = pCorrect >= 0.56 ? "优先" : pCorrect >= 0.54 ? "观察" : "避让";
    if (state.tailStreak >= opts.hotStreakLimit) {
      band = "避开";
      action = "避让";
    }
    if (!baseEligible && pCorrect < 0.65) {
      band = "避开";
      action = "避让";
    }
    return {
      pCorrect: pCorrect,
      score: score,
      band: band,
      action: action,
      sample: bucket.n,
      stateKey: key,
      pState: pState,
      recentP: recentP,
      baseRate: priorP,
      baseEligible: baseEligible
    };
  }

  function decide(rows, index, raw, options) {
    var opts = Object.assign({}, DEFAULT_OPTIONS, options || {});
    var d1 = streamState(rows, index, "D1", raw, opts);
    var d2 = streamState(rows, index, "D2", raw, opts);
    d1.confidence = independentConfidence(rows, index, "D1", d1, raw, opts);
    d2.confidence = independentConfidence(rows, index, "D2", d2, raw, opts);
    var d = d1;
    var overheat = !!(d.current && d.tailStreak >= opts.hotStreakLimit);
    var dConfirmed = !!(d.current && !overheat && d.currentMissStreak !== 2 &&
      d.current.score >= opts.minDoubleScore && d2.currentHitStreak < 3);

    var source = null;
    var reason = "";
    var rule = "";
    if (dConfirmed) {
      source = "double";
      rule = "P1/P6";
      reason = "双号达到A级且未触发过热或备选连中限制";
    } else {
      source = null;
      rule = "P5/P6";
      reason = overheat ? "双号连出过热，等待更明确信号" : "双号未确认，空仓观望";
    }
    return {
      period: rows[index].period,
      source: source,
      action: source === "double" ? "跟双号" : "观望",
      rule: rule,
      reason: reason,
      double: d,
      streams: { D1: d1, D2: d2 },
      overheat: overheat,
      dConfirmed: dConfirmed
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
    var future = {
      period: latest + 1,
      basedOn: latest,
      actual: [],
      D1: makePick(d[0], [], model),
      D2: makePick(d[1], [], model)
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
    var actionCounts = { double: 0, observe: 0 };
    var ruleCounts = {};
    for (var i = 0; i < rows.length; i++) {
      var pick = null;
      if (mode === "double") pick = rows[i].D1;
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

  function runConfidenceBacktest(raw, model, stream, options) {
    var opts = Object.assign({}, DEFAULT_OPTIONS, options || {});
    var rows = buildSignals(raw, model, opts);
    var equity = 0;
    var peak = 0;
    var maxDrawdown = 0;
    var bets = 0;
    var hits = 0;
    var skipped = 0;
    for (var i = 0; i < rows.length; i++) {
      var state = streamState(rows, i, stream, raw, opts);
      var confidence = independentConfidence(rows, i, stream, state, raw, opts);
      var pick = streamPick(rows[i], stream);
      if (!pick || confidence.action !== "优先") {
        skipped++;
        continue;
      }
      bets++;
      if (pick.hit) hits++;
      var pnl = pick.hit ? 0.8 : -1;
      equity += pnl;
      peak = Math.max(peak, equity);
      maxDrawdown = Math.max(maxDrawdown, peak - equity);
    }
    return {
      stream: stream,
      bets: bets,
      hits: hits,
      hitRate: bets ? hits / bets : 0,
      net: Number(equity.toFixed(4)),
      roi: bets ? equity / bets : 0,
      maxDrawdown: Number(maxDrawdown.toFixed(4)),
      skipped: skipped,
      observed: skipped
    };
  }

  function runThreePeriodBacktest(raw, model, options) {
    var opts = Object.assign({}, DEFAULT_OPTIONS, options || {});
    var rows = buildSignals(raw, model, opts);
    var batches = [];
    var i = 0;
    while (i < rows.length) {
      var decision = decide(rows, i, raw, opts);
      if (!decision.source) {
        i++;
        continue;
      }
      var pick = streamPick(rows[i], decision.source);
      if (!pick) {
        i++;
        continue;
      }
      var hitIndex = 4;
      for (var j = 0; j < 3; j++) {
        if (i + j >= rows.length) {
          hitIndex = 99;
          break;
        }
        if (rows[i + j].actual.indexOf(pick.tail) >= 0) {
          hitIndex = j + 1;
          break;
        }
      }
      if (hitIndex === 99) break;
      batches.push({
        period: rows[i].period,
        source: decision.source,
        tail: pick.tail,
        hitIndex: hitIndex
      });
      i += hitIndex === 4 ? 3 : hitIndex;
    }
    var counts = { first: 0, second: 0, third: 0, miss: 0 };
    var sources = { double: 0 };
    batches.forEach(function (batch) {
      if (batch.hitIndex === 1) counts.first++;
      else if (batch.hitIndex === 2) counts.second++;
      else if (batch.hitIndex === 3) counts.third++;
      else counts.miss++;
      sources[batch.source]++;
    });
    var total = batches.length;
    var hits = counts.first + counts.second + counts.third;
    return {
      batches: batches,
      n: total,
      hits: hits,
      hitRate: total ? hits / total : 0,
      first: counts.first,
      second: counts.second,
      third: counts.third,
      miss: counts.miss,
      firstRate: total ? counts.first / total : 0,
      secondRate: total ? counts.second / total : 0,
      thirdRate: total ? counts.third / total : 0,
      missRate: total ? counts.miss / total : 0,
      sources: sources
    };
  }

  function runThreePeriodStreamBacktest(raw, model, stream, options) {
    var opts = Object.assign({}, DEFAULT_OPTIONS, options || {});
    var rows = buildSignals(raw, model, opts);
    var batches = [];
    var i = 0;
    while (i < rows.length) {
      var pick = streamPick(rows[i], stream);
      if (!pick) {
        i++;
        continue;
      }
      var hitIndex = 4;
      var attempts = [];
      for (var j = 0; j < 3; j++) {
        if (i + j >= rows.length) {
          hitIndex = 99;
          break;
        }
        var hit = rows[i + j].actual.indexOf(pick.tail) >= 0;
        attempts.push({ period: rows[i + j].period, tail: pick.tail, hit: hit });
        if (hit) {
          hitIndex = j + 1;
          break;
        }
      }
      if (hitIndex === 99) break;
      batches.push({
        stream: stream,
        label: streamLabel(stream),
        startPeriod: rows[i].period,
        tail: pick.tail,
        hitIndex: hitIndex,
        result: hitIndex === 1 ? "hit1" : hitIndex === 2 ? "hit2" : hitIndex === 3 ? "hit3" : "miss",
        attempts: attempts
      });
      i += hitIndex === 4 ? 3 : hitIndex;
    }
    var counts = { first: 0, second: 0, third: 0, miss: 0 };
    batches.forEach(function (batch) {
      if (batch.hitIndex === 1) counts.first++;
      else if (batch.hitIndex === 2) counts.second++;
      else if (batch.hitIndex === 3) counts.third++;
      else counts.miss++;
    });
    var total = batches.length;
    var hits = counts.first + counts.second + counts.third;
    return {
      stream: stream,
      label: streamLabel(stream),
      batches: batches,
      n: total,
      hits: hits,
      hitRate: total ? hits / total : 0,
      first: counts.first,
      second: counts.second,
      third: counts.third,
      miss: counts.miss,
      firstRate: total ? counts.first / total : 0,
      secondRate: total ? counts.second / total : 0,
      thirdRate: total ? counts.third / total : 0,
      missRate: total ? counts.miss / total : 0
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
    runBacktest: runBacktest,
    runConfidenceBacktest: runConfidenceBacktest,
    runThreePeriodBacktest: runThreePeriodBacktest,
    runThreePeriodStreamBacktest: runThreePeriodStreamBacktest
  };
});
