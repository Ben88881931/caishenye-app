(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CAISHEN_PERSONALITY = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var METHOD = "per-line-long-term-personality-v1";
  var LINE_PRIOR = 30;
  var STATE_PRIOR = 20;
  var VALIDATION_YEARS = [2025, 2026];
  var LINES = [
    { id: "tail0", label: "尾0", kind: "tail", tail: 0 },
    { id: "tail1", label: "尾1", kind: "tail", tail: 1 },
    { id: "tail2", label: "尾2", kind: "tail", tail: 2 },
    { id: "tail3", label: "尾3", kind: "tail", tail: 3 },
    { id: "tail4", label: "尾4", kind: "tail", tail: 4 },
    { id: "tail5", label: "尾5", kind: "tail", tail: 5 },
    { id: "tail6", label: "尾6", kind: "tail", tail: 6 },
    { id: "tail7", label: "尾7", kind: "tail", tail: 7 },
    { id: "tail8", label: "尾8", kind: "tail", tail: 8 },
    { id: "tail9", label: "尾9", kind: "tail", tail: 9 },
    { id: "prob1", label: "概率第1", kind: "probability", rank: 0 },
    { id: "prob2", label: "概率第2", kind: "probability", rank: 1 },
    { id: "prob3", label: "概率第3", kind: "probability", rank: 2 }
  ];

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function hasTailFromNums(row, tail) {
    return (row && row.nums ? row.nums : []).some(function (num) {
      return Number(num) % 10 === Number(tail);
    });
  }

  function yearRows(d) {
    var byYear = {};
    d.forEach(function (row, index) {
      var year = Number(row.y);
      if (!byYear[year]) byYear[year] = [];
      byYear[year].push({ row: row, index: index + 1 });
    });
    return byYear;
  }

  function rawYear(rows) {
    var raw = {};
    rows.forEach(function (item, index) {
      var bits = Array(10).fill("0");
      (item.row.nums || []).forEach(function (num) {
        bits[Number(num) % 10] = "1";
      });
      raw[String(index + 1)] = bits.join("");
    });
    return raw;
  }

  function tailFrequency(d, tail, beforePeriod) {
    var seen = 0;
    var total = 0;
    d.slice(0, Math.max(0, beforePeriod - 1)).forEach(function (row) {
      total++;
      if (hasTailFromNums(row, tail)) seen++;
    });
    return total ? seen / total : 0.5556;
  }

  function windowBaseline(d, tail, startPeriod) {
    var frequency = clamp(tailFrequency(d, tail, startPeriod), 0.01, 0.99);
    return 1 - Math.pow(1 - frequency, 3);
  }

  function buildFixedYear(rows, tail) {
    var windows = [];
    var period = 0;
    var active = null;
    var waiting = null;
    while (period < rows.length) {
      if (waiting != null) {
        if (hasTailFromNums(rows[period].row, waiting)) waiting = null;
        period++;
        continue;
      }
      if (!active) {
        active = {
          start: rows[period].index,
          lockedTail: Number(tail),
          attempts: [],
          sourceKind: "tail"
        };
      }
      var hit = hasTailFromNums(rows[period].row, tail);
      active.attempts.push({
        period: rows[period].index,
        tail: Number(tail),
        hit: hit
      });
      if (hit) {
        active.hitIndex = active.attempts.length;
        active.end = active.attempts[active.attempts.length - 1].period;
        windows.push(active);
        active = null;
        period++;
      } else if (active.attempts.length >= 3) {
        active.hitIndex = 0;
        active.end = active.attempts[active.attempts.length - 1].period;
        windows.push(active);
        waiting = Number(tail);
        active = null;
        period++;
      } else {
        period++;
      }
    }
    if (!active && waiting == null && rows.length) {
      active = {
        start: rows[rows.length - 1].index + 1,
        lockedTail: Number(tail),
        attempts: [],
        sourceKind: "tail-pending"
      };
    }
    return { windows: windows, active: active, waiting: waiting };
  }

  function buildProbabilityYear(rows, rank, probabilityModel) {
    var records = probabilityModel.windowBacktest(rawYear(rows), rank, 3);
    var offset = rows.length ? rows[0].index - 1 : 0;
    var windows = records.map(function (record) {
      return {
        start: offset + Number(record.startPeriod),
        end: record.attempts.length
          ? offset + Number(record.attempts[record.attempts.length - 1].period)
          : offset + Number(record.startPeriod),
        lockedTail: Number(record.tail),
        hitIndex: Number(record.hitIndex),
        attempts: (record.attempts || []).map(function (attempt) {
          return {
            period: offset + Number(attempt.period),
            tail: Number(attempt.tail),
            hit: !!attempt.hit
          };
        }),
        sourceKind: "probability-test"
      };
    });
    var active = null;
    var waiting = null;
    var period = 1;
    while (period <= rows.length) {
      if (waiting != null) {
        if (hasTailFromNums(rows[period - 1].row, waiting)) {
          waiting = null;
        }
        period++;
        continue;
      }
      if (!active) {
        var prediction = probabilityModel.analyze(rawYear(rows), period - 1, { method: "new" });
        var pick = prediction.top && prediction.top[rank];
        if (!pick) {
          period++;
          continue;
        }
        active = {
          start: offset + period,
          lockedTail: Number(pick.tail),
          attempts: [],
          sourceKind: "probability-live"
        };
      }
      var hit = hasTailFromNums(rows[period - 1].row, active.lockedTail);
      active.attempts.push({
        period: offset + period,
        tail: active.lockedTail,
        hit: hit
      });
      if (hit) {
        active.hitIndex = active.attempts.length;
        active = null;
        period++;
      } else if (active.attempts.length >= 3) {
        waiting = active.lockedTail;
        active = null;
        period++;
      } else {
        period++;
      }
    }
    if (!active && waiting == null && rows.length) {
      var nextPrediction = probabilityModel.analyze(rawYear(rows), rows.length, { method: "new" });
      var nextPick = nextPrediction.top && nextPrediction.top[rank];
      if (nextPick) {
        active = {
          start: offset + rows.length + 1,
          lockedTail: Number(nextPick.tail),
          attempts: [],
          sourceKind: "probability-pending"
        };
      }
    }
    return { windows: windows, active: active, waiting: waiting };
  }

  function buildWindows(d, line, probabilityModel) {
    var grouped = yearRows(d);
    var years = Object.keys(grouped).map(Number).sort(function (a, b) { return a - b; });
    var windows = [];
    var active = null;
    var waiting = null;
    years.forEach(function (year) {
      var built = line.kind === "tail"
        ? buildFixedYear(grouped[year], line.tail)
        : buildProbabilityYear(grouped[year], line.rank || 0, probabilityModel);
      built.windows.forEach(function (window) { window.year = year; });
      windows = windows.concat(built.windows);
      if (year === years[years.length - 1]) {
        active = built.active;
        waiting = built.waiting;
      }
    });
    windows.sort(function (a, b) { return a.start - b.start; });
    return { windows: windows, active: active, waiting: waiting };
  }

  function trailingMisses(yearWindows) {
    var misses = 0;
    for (var i = yearWindows.length - 1; i >= 0; i--) {
      if (Number(yearWindows[i].hitIndex) > 0) break;
      misses++;
    }
    return misses;
  }

  function stateBucket(yearWindows) {
    if (!yearWindows.length) return "year_start";
    var last = yearWindows[yearWindows.length - 1];
    if (Number(last.hitIndex) > 0) return "after_hit";
    var misses = trailingMisses(yearWindows);
    if (misses <= 1) return "after_one_miss";
    if (misses === 2) return "after_two_misses";
    return "after_three_plus_misses";
  }

  function stateLabel(state) {
    return {
      year_start: "年初首窗",
      after_hit: "上一窗命中",
      after_one_miss: "上一窗全错1次",
      after_two_misses: "连续全错2窗",
      after_three_plus_misses: "连续全错3窗以上"
    }[state] || state;
  }

  function withEntryStates(d, windows) {
    var byYear = {};
    var annotated = [];
    windows.forEach(function (window) {
      var row = d[window.start - 1] || {};
      var year = Number(row.y);
      if (!byYear[year]) byYear[year] = [];
      var copy = {
        start: window.start,
        end: window.end,
        lockedTail: window.lockedTail,
        hitIndex: Number(window.hitIndex),
        attempts: window.attempts,
        sourceKind: window.sourceKind,
        year: year,
        entryState: stateBucket(byYear[year]),
        baseline: windowBaseline(d, window.lockedTail, window.start)
      };
      byYear[year].push(copy);
      annotated.push(copy);
    });
    return annotated;
  }

  function summarizeYearStats(windows) {
    var byYear = {};
    windows.forEach(function (window) {
      var year = Number((window.year || 0));
      if (!byYear[year]) byYear[year] = { year: year, windows: 0, hits: 0 };
      byYear[year].windows++;
      if (Number(window.hitIndex) > 0) byYear[year].hits++;
    });
    return Object.keys(byYear).map(function (year) {
      var item = byYear[year];
      return {
        year: Number(year),
        windows: item.windows,
        hits: item.hits,
        rate: item.windows ? item.hits / item.windows : 0
      };
    }).sort(function (a, b) { return a.year - b.year; });
  }

  function runDistribution(windows, hit) {
    var counts = {};
    var streak = 0;
    windows.forEach(function (window) {
      var isHit = Number(window.hitIndex) > 0;
      if (isHit !== hit) {
        streak = 0;
        return;
      }
      streak++;
      var key = String(Math.min(4, streak));
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }

  function longTermProfile(windows, d) {
    var total = windows.length;
    var hits = windows.filter(function (window) { return Number(window.hitIndex) > 0; }).length;
    var first = windows.filter(function (window) { return Number(window.hitIndex) === 1; }).length;
    var second = windows.filter(function (window) { return Number(window.hitIndex) === 2; }).length;
    var third = windows.filter(function (window) { return Number(window.hitIndex) === 3; }).length;
    var baseline = total
      ? windows.reduce(function (sum, window) {
        return sum + windowBaseline(d, window.lockedTail, window.start);
      }, 0) / total
      : 0.91;
    var stateCounts = {};
    windows.forEach(function (window) {
      if (!stateCounts[window.entryState]) {
        stateCounts[window.entryState] = { windows: 0, hits: 0 };
      }
      stateCounts[window.entryState].windows++;
      if (Number(window.hitIndex) > 0) stateCounts[window.entryState].hits++;
    });
    return {
      windows: total,
      hits: hits,
      misses: total - hits,
      rate: total ? hits / total : 0,
      baseline: baseline,
      edge: total ? hits / total - baseline : 0,
      stageShare: {
        first: hits ? first / hits : 0,
        second: hits ? second / hits : 0,
        third: hits ? third / hits : 0
      },
      stageCounts: { first: first, second: second, third: third },
      hitRuns: runDistribution(windows, true),
      missRuns: runDistribution(windows, false),
      stateCounts: stateCounts
    };
  }

  function wilsonInterval(hits, total, z) {
    if (!total) return { lower: 0, upper: 1 };
    var p = hits / total;
    var z2 = z * z;
    var denominator = 1 + z2 / total;
    var center = (p + z2 / (2 * total)) / denominator;
    var spread = z * Math.sqrt((p * (1 - p) + z2 / (4 * total)) / total) / denominator;
    return { lower: clamp(center - spread, 0, 1), upper: clamp(center + spread, 0, 1) };
  }

  function predictFromHistory(history, state, baseline) {
    var lineHits = history.filter(function (window) { return Number(window.hitIndex) > 0; }).length;
    var lineRate = (lineHits + LINE_PRIOR * baseline) / (history.length + LINE_PRIOR);
    var stateHistory = history.filter(function (window) { return window.entryState === state; });
    var stateHits = stateHistory.filter(function (window) { return Number(window.hitIndex) > 0; }).length;
    var predictedRate = (stateHits + STATE_PRIOR * lineRate) / (stateHistory.length + STATE_PRIOR);
    return {
      predictedRate: clamp(predictedRate, 0.001, 0.999),
      stateSamples: stateHistory.length,
      stateHits: stateHits,
      lineRate: lineRate,
      lineSamples: history.length
    };
  }

  function currentYearWindows(windows, year) {
    return windows.filter(function (window) {
      var row = window.year;
      return Number(row) === Number(year);
    });
  }

  function currentStatus(d, line, built, asOfPeriod) {
    var latest = d[asOfPeriod - 1] || {};
    var year = Number(latest.y);
    var thisYear = currentYearWindows(built.windows, year);
    var state = stateBucket(thisYear);
    var status = "active";
    var lockedTail = line.kind === "tail" ? Number(line.tail) : null;
    if (built.waiting != null) status = "waiting";
    if (built.active && built.active.lockedTail != null) lockedTail = Number(built.active.lockedTail);
    if (!line.kind || !built.active) {
      if (line.kind === "tail") lockedTail = Number(line.tail);
    }
    return {
      year: year,
      state: state,
      stateLabel: stateLabel(state),
      status: status,
      lockedTail: lockedTail,
      currentWindow: built.active
        ? { start: built.active.start, attempts: (built.active.attempts || []).length }
        : null,
      waitingTail: built.waiting
    };
  }

  function validationFor(windows, year) {
    var targetRows = windows.filter(function (window) { return Number(window.year) === year; });
    var history = [];
    var predictions = [];
    windows.forEach(function (window) {
      if (Number(window.year) === year) {
        if (!history.length) return;
        var prediction = predictFromHistory(history, window.entryState, window.baseline);
        var hit = Number(window.hitIndex) > 0;
        predictions.push({
          start: window.start,
          state: window.entryState,
          predictedRate: prediction.predictedRate,
          baseline: window.baseline,
          hit: hit
        });
      }
      if (Number(window.year) <= year) history.push(window);
    });
    var hits = predictions.filter(function (item) { return item.hit; }).length;
    var brier = predictions.length
      ? predictions.reduce(function (sum, item) {
        return sum + Math.pow(item.predictedRate - (item.hit ? 1 : 0), 2);
      }, 0) / predictions.length
      : 0;
    var baselineBrier = predictions.length
      ? predictions.reduce(function (sum, item) {
        return sum + Math.pow(item.baseline - (item.hit ? 1 : 0), 2);
      }, 0) / predictions.length
      : 0;
    var logLoss = predictions.length
      ? predictions.reduce(function (sum, item) {
        var p = clamp(item.predictedRate, 0.001, 0.999);
        return sum - (item.hit ? Math.log(p) : Math.log(1 - p));
      }, 0) / predictions.length
      : 0;
    var baselineLogLoss = predictions.length
      ? predictions.reduce(function (sum, item) {
        var p = clamp(item.baseline, 0.001, 0.999);
        return sum - (item.hit ? Math.log(p) : Math.log(1 - p));
      }, 0) / predictions.length
      : 0;
    var baseline = targetRows.length
      ? targetRows.reduce(function (sum, window) { return sum + window.baseline; }, 0) / targetRows.length
      : 0;
    return {
      year: year,
      predictions: predictions.length,
      hits: hits,
      rate: predictions.length ? hits / predictions.length : 0,
      baseline: baseline,
      brier: brier,
      baselineBrier: baselineBrier,
      brierSkill: baselineBrier ? 1 - brier / baselineBrier : 0,
      logLoss: logLoss,
      baselineLogLoss: baselineLogLoss
    };
  }

  function build(options) {
    var raw = options && options.raw;
    var d = options && options.d;
    var probabilityModel = options && options.probabilityModel;
    var asOfPeriod = Number(options && options.asOfPeriod) || (d ? d.length : 0);
    if (!raw || !d || !probabilityModel || !asOfPeriod) {
      throw new Error("personality model requires raw, d, probabilityModel, and asOfPeriod");
    }
    var availableD = d.slice(0, asOfPeriod);
    var lines = LINES.map(function (line) {
      var built = buildWindows(availableD, line, probabilityModel);
      var windows = withEntryStates(availableD, built.windows);
      var longTerm = longTermProfile(windows, availableD);
      var status = currentStatus(availableD, line, built, asOfPeriod);
      var historyBeforeCurrent = windows.filter(function (window) {
        return !status.currentWindow || window.start < status.currentWindow.start;
      });
      var prediction = predictFromHistory(historyBeforeCurrent, status.state, longTerm.baseline);
      var interval = wilsonInterval(prediction.stateHits, prediction.stateSamples, 1.28);
      var confidence = "样本不足";
      if (status.status === "waiting") confidence = "等待重开";
      else if (prediction.stateSamples >= 20 && interval.lower > longTerm.baseline) confidence = "高于基准";
      else if (prediction.stateSamples >= 20 && interval.upper < longTerm.baseline) confidence = "低于基准";
      else if (prediction.stateSamples >= 20) confidence = "接近基准";
      var reason = "长期 " + (longTerm.rate * 100).toFixed(1) + "%（" +
        longTerm.hits + "/" + longTerm.windows + "），第1/2/3期结束 " +
        (longTerm.stageShare.first * 100).toFixed(0) + "/" +
        (longTerm.stageShare.second * 100).toFixed(0) + "/" +
        (longTerm.stageShare.third * 100).toFixed(0) + "%，当前状态“" +
        status.stateLabel + "”历史 " + prediction.stateHits + "/" + prediction.stateSamples + "。";
      return {
        id: line.id,
        label: line.label,
        kind: line.kind,
        longTerm: longTerm,
        yearly: summarizeYearStats(windows),
        validation: VALIDATION_YEARS.map(function (year) { return validationFor(windows, year); }),
        current: {
          state: status.state,
          stateLabel: status.stateLabel,
          status: status.status,
          lockedTail: status.lockedTail,
          waitingTail: status.waitingTail,
          samples: prediction.stateSamples,
          hits: prediction.stateHits,
          lineRate: prediction.lineRate,
          predictedRate: prediction.predictedRate,
          baseline: longTerm.baseline,
          edge: prediction.predictedRate - longTerm.baseline,
          lower: interval.lower,
          upper: interval.upper,
          confidence: confidence,
          windowStart: status.currentWindow ? status.currentWindow.start : null,
          windowAttempts: status.currentWindow ? status.currentWindow.attempts : 0,
          reason: reason
        }
      };
    });
    var ranking = lines.slice().sort(function (a, b) {
      return b.current.predictedRate - a.current.predictedRate ||
        b.current.edge - a.current.edge ||
        a.id.localeCompare(b.id);
    }).map(function (line, index) {
      return Object.assign({ rank: index + 1 }, line);
    });
    return {
      version: "personality-v1-20261025",
      method: METHOD,
      generatedAt: null,
      asOfPeriod: asOfPeriod,
      trainingYears: [2021, 2022, 2023, 2024],
      validationYears: VALIDATION_YEARS,
      linePrior: LINE_PRIOR,
      statePrior: STATE_PRIOR,
      uniformWeightsUsed: false,
      oneTwoThreeWeightMix: false,
      lookAheadUsed: false,
      lines: lines,
      ranking: ranking
    };
  }

  return {
    VERSION: "personality-v1-20261025",
    METHOD: METHOD,
    build: build
  };
});
