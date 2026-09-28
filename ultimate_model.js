(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CAISHEN_ULTIMATE = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var VERSION = "ultimate-v1";
  var KEYS = ["D1", "D2"];
  var LABELS = {
    D1: "双号首推",
    D2: "双号备选"
  };
  var PATTERNS = {
    P1: { key: "P1", label: "平注", stakes: [1, 1, 1] },
    P2: { key: "P2", label: "轻加", stakes: [1, 1.25, 1.5] },
    P3: { key: "P3", label: "缓加", stakes: [1, 1.5, 2.25] },
    P4: { key: "P4", label: "中追", stakes: [1, 2, 3] },
    P5: { key: "P5", label: "强追", stakes: [1, 2, 4] },
    P6: { key: "P6", label: "保本", stakes: [1, 1.25, 2.8125] },
    P7: { key: "P7", label: "收益型", stakes: [1, 1.5, 3.375] },
    P8: { key: "P8", label: "激进", stakes: [1, 3, 9] }
  };
  var DEFAULT_OPTIONS = {
    startPeriod: 31,
    sampleMin: 20,
    skipBelow: 35,
    aggressiveAt: 60,
    p8At: 80,
    samplePattern: "P6",
    steadyPattern: "P6",
    strongPattern: "P7",
    extremePattern: "P8"
  };

  function periodList(raw) {
    return Object.keys(raw)
      .map(Number)
      .filter(function (p) { return Number.isFinite(p); })
      .sort(function (a, b) { return a - b; });
  }

  function actualTails(raw, period) {
    var bits = raw[String(period)] || "";
    var out = [];
    for (var i = 0; i < 10; i++) {
      if (bits[i] === "1") out.push(i);
    }
    return out;
  }

  function clamp(value, lo, hi) {
    return Math.max(lo, Math.min(hi, value));
  }

  function sum(values) {
    return values.reduce(function (a, b) { return a + b; }, 0);
  }

  function average(values) {
    return values.length ? sum(values) / values.length : 0;
  }

  function patternForScore(score, options) {
    if (score >= options.p8At) return options.extremePattern;
    if (score >= options.aggressiveAt) return options.strongPattern;
    if (score >= options.skipBelow) return options.steadyPattern;
    return null;
  }

  function stateKeyForScore(score, options) {
    if (score >= options.p8At) return "veryStrong";
    if (score >= options.aggressiveAt) return "strong";
    if (score >= options.skipBelow) return "steady";
    return "weak";
  }

  function stateLabel(stateKey) {
    if (stateKey === "veryStrong") return "极强";
    if (stateKey === "strong") return "强";
    if (stateKey === "steady") return "稳";
    if (stateKey === "sample") return "样本期";
    return "弱";
  }

  function monitorFromHistory(history, options) {
    var opts = Object.assign({}, DEFAULT_OPTIONS, options || {});
    var n = history.length;
    if (n < opts.sampleMin) {
      return {
        n: n,
        score: 50,
        stateKey: "sample",
        stateLabel: stateLabel("sample"),
        pattern: opts.samplePattern,
        recent10: null,
        recent20: null,
        recent50: null,
        expected20: null,
        edge20: null,
        currentHitStreak: 0,
        maxHitStreak: 0,
        currentOmission: 0,
        maxOmission: 0,
        omissionP90: 0,
        omissionP95: 0,
        omissionPercentile: 0
      };
    }

    var last10 = history.slice(-10);
    var last20 = history.slice(-20);
    var last50 = history.slice(-50);
    var recent10 = average(last10.map(function (x) { return x.hit ? 1 : 0; }));
    var recent20 = average(last20.map(function (x) { return x.hit ? 1 : 0; }));
    var recent50 = average(last50.map(function (x) { return x.hit ? 1 : 0; }));
    var expected20 = average(last20.map(function (x) { return x.baseRate; }));
    var expected50 = average(last50.map(function (x) { return x.baseRate; }));

    var currentHitStreak = 0;
    for (var hi = history.length - 1; hi >= 0 && history[hi].hit; hi--) {
      currentHitStreak++;
    }

    var currentOmission = 0;
    for (var mi = history.length - 1; mi >= 0 && !history[mi].hit; mi--) {
      currentOmission++;
    }

    var maxHitStreak = 0;
    var maxOmission = 0;
    var hitRun = 0;
    var missRun = 0;
    var completedMissRuns = [];
    history.forEach(function (item) {
      if (item.hit) {
        hitRun++;
        missRun = 0;
      } else {
        missRun++;
        hitRun = 0;
        if (missRun > maxOmission) maxOmission = missRun;
      }
      if (hitRun > maxHitStreak) maxHitStreak = hitRun;
      if (item.hit && missRun > 0) completedMissRuns.push(missRun);
    });
    if (currentOmission > maxOmission) maxOmission = currentOmission;

    completedMissRuns.sort(function (a, b) { return a - b; });
    function percentileValue(p) {
      if (!completedMissRuns.length) return 0;
      var idx = Math.min(completedMissRuns.length - 1, Math.floor((completedMissRuns.length - 1) * p));
      return completedMissRuns[idx];
    }
    var less = completedMissRuns.filter(function (x) { return x < currentOmission; }).length;
    var equal = completedMissRuns.filter(function (x) { return x === currentOmission; }).length;
    var omissionPercentile = completedMissRuns.length
      ? (less + equal * 0.5) / completedMissRuns.length
      : 0;

    var score = 50;
    score += clamp((recent20 - expected20) / 0.15, -1, 1) * 20;
    score += clamp((recent50 - expected50) / 0.10, -1, 1) * 10;
    if (currentOmission === 0) score += 4;
    else if (omissionPercentile >= 0.90) score -= 15;
    else if (omissionPercentile >= 0.75) score -= 8;
    if (currentHitStreak >= 2) score += 8;
    if (currentOmission >= 5) score -= 15;
    else if (currentOmission >= 3) score -= 8;
    score = clamp(score, 0, 100);

    var stateKey = stateKeyForScore(score, opts);
    return {
      n: n,
      score: score,
      stateKey: stateKey,
      stateLabel: stateLabel(stateKey),
      pattern: patternForScore(score, opts),
      recent10: recent10,
      recent20: recent20,
      recent50: recent50,
      expected20: expected20,
      edge20: recent20 - expected20,
      currentHitStreak: currentHitStreak,
      maxHitStreak: maxHitStreak,
      currentOmission: currentOmission,
      maxOmission: maxOmission,
      omissionP90: percentileValue(0.90),
      omissionP95: percentileValue(0.95),
      omissionPercentile: omissionPercentile
    };
  }

  function buildSignals(raw, model, options) {
    var opts = Object.assign({}, DEFAULT_OPTIONS, options || {});
    var periods = periodList(raw);
    var start = Number(opts.startPeriod || periods[0] || 1);
    var end = periods[periods.length - 1];
    if (!end) return [];

    var targetPeriods = periods.filter(function (p) { return p >= start && p <= end; });
    return targetPeriods.map(function (p) {
      var prediction = model.buildPrediction(p - 1);
      var doublePicks = prediction.doubleRecommendation || [];
      var actual = actualTails(raw, p);
      function item(pick) {
        if (!pick) return null;
        return {
          tail: pick.tail,
          score: pick.score,
          tag: pick.tag,
          grade: pick.grade || model.gradeOf(pick.score),
          baseRate: model.baseRate[pick.tail],
          hit: actual.indexOf(pick.tail) >= 0
        };
      }
      return {
        period: p,
        basedOn: p - 1,
        actual: actual,
        D1: item(doublePicks[0]),
        D2: item(doublePicks[1])
      };
    });
  }

  function keyHistory(signals, key, endIndex) {
    var out = [];
    var end = endIndex == null ? signals.length : Math.max(0, Math.min(endIndex, signals.length));
    for (var i = 0; i < end; i++) {
      var item = signals[i][key];
      if (!item) continue;
      out.push({ hit: item.hit, baseRate: item.baseRate });
    }
    return out;
  }

  function windowStats(signals, key) {
    var counts = { "1": 0, "2": 0, "3": 0, "4": 0 };
    for (var i = 0; i + 2 < signals.length; i++) {
      var item = signals[i][key];
      if (!item) continue;
      var firstHit = 4;
      for (var j = 0; j < 3; j++) {
        if (signals[i + j].actual.indexOf(item.tail) >= 0) {
          firstHit = j + 1;
          break;
        }
      }
      counts[String(firstHit)]++;
    }
    var total = counts["1"] + counts["2"] + counts["3"] + counts["4"];
    return {
      n: total,
      first: counts["1"],
      second: counts["2"],
      third: counts["3"],
      miss: counts["4"],
      firstRate: total ? counts["1"] / total : 0,
      secondRate: total ? counts["2"] / total : 0,
      thirdRate: total ? counts["3"] / total : 0,
      missRate: total ? counts["4"] / total : 0,
      hit3Rate: total ? (counts["1"] + counts["2"] + counts["3"]) / total : 0
    };
  }

  function analyze(raw, model, options) {
    var opts = Object.assign({}, DEFAULT_OPTIONS, options || {});
    var signals = buildSignals(raw, model, opts);
    var items = {};
    KEYS.forEach(function (key) {
      var history = keyHistory(signals, key);
      var currentPick = null;
      for (var i = signals.length - 1; i >= 0; i--) {
        if (signals[i][key]) {
          currentPick = Object.assign({ period: signals[i].period }, signals[i][key]);
          break;
        }
      }
      items[key] = {
        key: key,
        label: LABELS[key],
        currentPick: currentPick,
        monitor: monitorFromHistory(history, opts),
        window: windowStats(signals, key),
        records: signals
      };
    });
    var active = KEYS.filter(function (key) {
      return items[key].currentPick && items[key].monitor.pattern;
    });
    return {
      version: VERSION,
      options: opts,
      startPeriod: signals.length ? signals[0].period : null,
      endPeriod: signals.length ? signals[signals.length - 1].period : null,
      nextPeriod: signals.length ? signals[signals.length - 1].period + 1 : null,
      signals: signals,
      items: items,
      decision: {
        action: active.length ? "分批启用" : "观望",
        keys: active,
        reason: active.length ? "按D1/D2独立状态选择P6或P7" : "D1/D2均处于弱状态"
      }
    };
  }

  function settleOrder(order, raw) {
    if (!order || order.result !== "pending") return null;
    var start = Number(order.startPeriod);
    var tail = Number(order.tail);
    if (!Number.isFinite(start) || !Number.isFinite(tail) || tail < 0 || tail > 9) return null;
    for (var j = 0; j < 3; j++) {
      var period = start + j;
      var bits = raw[String(period)];
      if (!bits) return null;
      if (bits[tail] === "1") {
        return {
          result: "hit" + (j + 1),
          hitIndex: j + 1,
          settledPeriod: period,
          autoSettled: true
        };
      }
    }
    return {
      result: "miss",
      hitIndex: 0,
      settledPeriod: start + 2,
      autoSettled: true
    };
  }

  function netFor(t, pattern) {
    var stakes = PATTERNS[pattern].stakes;
    if (t === 1) return 0.8 * stakes[0];
    if (t === 2) return 1.8 * stakes[1] - stakes[0] - stakes[1];
    if (t === 3) return 1.8 * stakes[2] - stakes[0] - stakes[1] - stakes[2];
    return -(stakes[0] + stakes[1] + stakes[2]);
  }

  function summarizeEvents(events, signals, options) {
    var opts = Object.assign({}, DEFAULT_OPTIONS, options || {});
    var byPosition = {};
    KEYS.forEach(function (key) {
      byPosition[key] = {
        key: key,
        label: LABELS[key],
        sequences: 0,
        first: 0,
        second: 0,
        third: 0,
        miss: 0,
        net: 0,
        staked: 0,
        maxDrawdown: 0
      };
    });

    var patternCounts = {};
    Object.keys(PATTERNS).forEach(function (key) { patternCounts[key] = 0; });
    var byPeriod = {};
    events.forEach(function (event) {
      var stakes = PATTERNS[event.pattern].stakes;
      var steps = event.t === 4 ? 3 : event.t;
      var eventStake = 0;
      for (var j = 0; j < steps; j++) {
        var p = event.startPeriod + j;
        var stake = stakes[j];
        var isHit = event.t !== 4 && j === event.t - 1;
        eventStake += stake;
        if (!byPeriod[p]) byPeriod[p] = { net: 0, staked: 0, active: 0 };
        byPeriod[p].net += isHit ? 0.8 * stake : -stake;
        byPeriod[p].staked += stake;
        byPeriod[p].active++;
      }
      event.staked = eventStake;
      event.net = netFor(event.t, event.pattern);
      var stat = byPosition[event.key];
      stat.sequences++;
      if (event.t === 1) stat.first++;
      else if (event.t === 2) stat.second++;
      else if (event.t === 3) stat.third++;
      else stat.miss++;
      stat.net += event.net;
      stat.staked += eventStake;
      patternCounts[event.pattern]++;
    });

    Object.keys(byPosition).forEach(function (key) {
      var stat = byPosition[key];
      stat.net = Number(stat.net.toFixed(4));
      stat.staked = Number(stat.staked.toFixed(4));
      stat.roi = stat.staked ? stat.net / stat.staked : 0;
    });

    var periods = signals.map(function (s) { return s.period; });
    var cumulative = 0;
    var peak = 0;
    var peakPeriod = periods[0] || null;
    var currentPeakPeriod = peakPeriod;
    var maxDrawdown = 0;
    var maxDrawdownPeak = null;
    var maxDrawdownTrough = null;
    var positivePeriods = 0;
    var negativePeriods = 0;
    var flatPeriods = 0;
    var lossRun = 0;
    var maxLossRun = 0;
    var maxActive = 0;
    var maxExposure = 0;
    periods.forEach(function (p) {
      var bucket = byPeriod[p] || { net: 0, staked: 0, active: 0 };
      var cash = bucket.net;
      cumulative += cash;
      if (cash > 0) positivePeriods++;
      else if (cash < 0) {
        negativePeriods++;
        lossRun++;
        if (lossRun > maxLossRun) maxLossRun = lossRun;
      } else {
        flatPeriods++;
        lossRun = 0;
      }
      if (cumulative > peak) {
        peak = cumulative;
        currentPeakPeriod = p;
      }
      var dd = peak - cumulative;
      if (dd > maxDrawdown) {
        maxDrawdown = dd;
        maxDrawdownPeak = currentPeakPeriod;
        maxDrawdownTrough = p;
      }
      if (bucket.active > maxActive) maxActive = bucket.active;
      if (bucket.staked > maxExposure) maxExposure = bucket.staked;
    });

    var staked = events.reduce(function (acc, event) { return acc + event.staked; }, 0);
    var net = events.reduce(function (acc, event) { return acc + event.net; }, 0);
    var first = events.filter(function (e) { return e.t === 1; }).length;
    var second = events.filter(function (e) { return e.t === 2; }).length;
    var third = events.filter(function (e) { return e.t === 3; }).length;
    var miss = events.filter(function (e) { return e.t === 4; }).length;
    return {
      ruleVersion: VERSION,
      options: opts,
      sequences: events.length,
      first: first,
      second: second,
      third: third,
      miss: miss,
      net: Number(net.toFixed(4)),
      staked: Number(staked.toFixed(4)),
      roi: staked ? net / staked : 0,
      maxDrawdown: Number(maxDrawdown.toFixed(4)),
      maxDrawdownPeak: maxDrawdownPeak,
      maxDrawdownTrough: maxDrawdownTrough,
      maxActive: maxActive,
      maxExposure: Number(maxExposure.toFixed(4)),
      positivePeriods: positivePeriods,
      negativePeriods: negativePeriods,
      flatPeriods: flatPeriods,
      maxLossRun: maxLossRun,
      patternCounts: patternCounts,
      byPosition: byPosition,
      events: events
    };
  }

  function chaseAt(signals, index, key) {
    var item = signals[index][key];
    if (!item) return null;
    var t = 4;
    for (var j = 0; j < 3; j++) {
      if (index + j >= signals.length) return null;
      if (signals[index + j].actual.indexOf(item.tail) >= 0) {
        t = j + 1;
        break;
      }
    }
    return { item: item, t: t, duration: t === 4 ? 3 : t };
  }

  function runFixedBacktest(raw, model, patternKey, options) {
    var opts = Object.assign({}, DEFAULT_OPTIONS, options || {});
    if (!PATTERNS[patternKey]) throw new Error("unknown pattern: " + patternKey);
    var signals = buildSignals(raw, model, opts);
    var events = [];
    KEYS.forEach(function (key) {
      var index = 0;
      while (index < signals.length) {
        var chase = chaseAt(signals, index, key);
        if (!chase) {
          if (signals[index][key]) break;
          index++;
          continue;
        }
        events.push({
          key: key,
          startIndex: index,
          startPeriod: signals[index].period,
          pick: chase.item.tail,
          score: chase.item.score,
          tag: chase.item.tag,
          t: chase.t,
          duration: chase.duration,
          pattern: patternKey,
          state: null
        });
        index += chase.duration;
      }
    });
    events.sort(function (a, b) {
      return a.startPeriod - b.startPeriod || KEYS.indexOf(a.key) - KEYS.indexOf(b.key);
    });
    return summarizeEvents(events, signals, opts);
  }

  function runStrategyBacktest(raw, model, options) {
    var opts = Object.assign({}, DEFAULT_OPTIONS, options || {});
    var signals = buildSignals(raw, model, opts);
    var events = [];
    var skipped = [];
    KEYS.forEach(function (key) {
      var index = 0;
      while (index < signals.length) {
        var item = signals[index][key];
        if (!item) {
          index++;
          continue;
        }
        var history = keyHistory(signals, key, index);
        var state = monitorFromHistory(history, opts);
        if (!state.pattern) {
          skipped.push({ key: key, period: signals[index].period, state: state });
          index++;
          continue;
        }
        var chase = chaseAt(signals, index, key);
        if (!chase) break;
        events.push({
          key: key,
          startIndex: index,
          startPeriod: signals[index].period,
          pick: chase.item.tail,
          score: chase.item.score,
          tag: chase.item.tag,
          t: chase.t,
          duration: chase.duration,
          pattern: state.pattern,
          state: state
        });
        index += chase.duration;
      }
    });
    events.sort(function (a, b) {
      return a.startPeriod - b.startPeriod || KEYS.indexOf(a.key) - KEYS.indexOf(b.key);
    });
    var summary = summarizeEvents(events, signals, opts);
    summary.skipped = skipped.length;
    summary.skippedStarts = skipped;
    return summary;
  }

  function buildOverlappingEvents(signals, choosePattern, options) {
    var events = [];
    signals.forEach(function (row, index) {
      KEYS.forEach(function (key) {
        var item = row[key];
        if (!item) return;
        var chase = chaseAt(signals, index, key);
        if (!chase) return;
        var state = null;
        var pattern = null;
        if (choosePattern) {
          state = choosePattern(key, index);
          if (!state || !state.pattern) return;
          pattern = state.pattern;
        } else {
          pattern = "P6";
        }
        events.push({
          key: key,
          startIndex: index,
          startPeriod: row.period,
          pick: item.tail,
          score: item.score,
          tag: item.tag,
          t: chase.t,
          duration: chase.duration,
          pattern: pattern,
          state: state
        });
      });
    });
    events.sort(function (a, b) {
      return a.startPeriod - b.startPeriod || KEYS.indexOf(a.key) - KEYS.indexOf(b.key);
    });
    return events;
  }

  function runOverlappingBacktest(raw, model, patternKey, options) {
    var opts = Object.assign({}, DEFAULT_OPTIONS, options || {});
    if (!PATTERNS[patternKey]) throw new Error("unknown pattern: " + patternKey);
    var signals = buildSignals(raw, model, opts);
    var events = buildOverlappingEvents(signals, null, opts);
    events.forEach(function (event) { event.pattern = patternKey; });
    return summarizeEvents(events, signals, opts);
  }

  function runRecommendationBacktest(raw, model, options) {
    var opts = Object.assign({}, DEFAULT_OPTIONS, options || {});
    var signals = buildSignals(raw, model, opts);
    var events = buildOverlappingEvents(signals, function (key, index) {
      return monitorFromHistory(keyHistory(signals, key, index), opts);
    }, opts);
    var summary = summarizeEvents(events, signals, opts);
    summary.skipped = signals.reduce(function (count, row, index) {
      return count + KEYS.filter(function (key) {
        if (!row[key]) return false;
        var state = monitorFromHistory(keyHistory(signals, key, index), opts);
        return !state.pattern;
      }).length;
    }, 0);
    return summary;
  }

  return {
    VERSION: VERSION,
    KEYS: KEYS,
    LABELS: LABELS,
    PATTERNS: PATTERNS,
    DEFAULT_OPTIONS: DEFAULT_OPTIONS,
    analyze: analyze,
    settleOrder: settleOrder,
    buildSignals: buildSignals,
    monitorFromHistory: monitorFromHistory,
    windowStats: windowStats,
    runFixedBacktest: runFixedBacktest,
    runStrategyBacktest: runStrategyBacktest,
    runOverlappingBacktest: runOverlappingBacktest,
    runRecommendationBacktest: runRecommendationBacktest
  };
});
