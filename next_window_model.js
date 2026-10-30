(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CAISHEN_NEXT_WINDOW = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var METHOD = "per-line-independent-window-personality-v8.1";
  var VERSION = "next-window-v8.1-20261030";
  var LINE_PRIOR = 30;
  var STATE_PRIOR = 20;
  var PATTERN_PRIOR = 20;
  var VALIDATION_YEARS = [2025, 2026];
  var REVIEW_MAX_PERIODS = 30;
  var REVIEW_MAX_DAYS = 30;
  var DAY_MS = 24 * 60 * 60 * 1000;
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
    { id: "prob1", label: "A", kind: "probability", rank: 0 },
    { id: "prob2", label: "B", kind: "probability", rank: 1 },
    { id: "prob3", label: "C", kind: "probability", rank: 2 }
  ];

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function hasTail(row, tail) {
    return (row && row.nums ? row.nums : []).some(function (num) {
      return Number(num) % 10 === Number(tail);
    });
  }

  function yearGroups(d) {
    var grouped = {};
    d.forEach(function (row, index) {
      var year = Number(row.y);
      if (!grouped[year]) grouped[year] = [];
      grouped[year].push({ row: row, index: index + 1 });
    });
    return grouped;
  }

  function makeRawYear(rows) {
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

  function buildProbabilityCache(grouped, probabilityModel) {
    var cache = {};
    Object.keys(grouped).forEach(function (year) {
      var rows = grouped[year];
      var raw = makeRawYear(rows);
      cache[year] = [];
      for (var i = 0; i < rows.length; i++) {
        var analysis = probabilityModel.analyze(raw, i, { method: "new" });
        cache[year].push((analysis.top || []).map(function (pick) {
          return Number(pick.tail);
        }));
      }
    });
    return cache;
  }

  function tailFrequency(d, tail, beforePeriod) {
    var hits = 0;
    var total = 0;
    d.slice(0, Math.max(0, beforePeriod - 1)).forEach(function (row) {
      total++;
      if (hasTail(row, tail)) hits++;
    });
    return total ? hits / total : 0.5556;
  }

  function windowBaseline(d, tail, startPeriod, cap) {
    var frequency = clamp(tailFrequency(d, tail, startPeriod), 0.01, 0.99);
    return 1 - Math.pow(1 - frequency, cap || 3);
  }

  function outcomeKey(candidate) {
    return candidate && Number(candidate.hitIndex) > 0
      ? "hit" + Number(candidate.hitIndex)
      : "miss";
  }

  function streakCategory(streak) {
    var count = Number(streak) || 1;
    if (count >= 3) return "three_plus";
    if (count === 2) return "two";
    return "one";
  }

  function previousWindowState(candidate) {
    if (!candidate) return "year_start";
    return outcomeKey(candidate) + "|" + streakCategory(candidate.outcomeStreak);
  }

  function annotateWindowStates(candidates) {
    var byYear = {};
    candidates.forEach(function (candidate) {
      if (!byYear[candidate.year]) byYear[candidate.year] = [];
      byYear[candidate.year].push(candidate);
    });
    Object.keys(byYear).forEach(function (year) {
      var rows = byYear[year].slice().sort(function (a, b) { return a.start - b.start; });
      var completed = [];
      var hitStreak = 0;
      var missStreak = 0;
      var pointer = 0;
      rows.forEach(function (candidate, index) {
        while (pointer < index && Number(rows[pointer].end) < Number(candidate.start)) {
          var finished = rows[pointer];
          if (finished.hitIndex > 0) {
            hitStreak++;
            missStreak = 0;
          } else {
            missStreak++;
            hitStreak = 0;
          }
          finished.outcomeStreak = finished.hitIndex > 0 ? hitStreak : missStreak;
          completed.push(finished);
          pointer++;
        }
        var previous = completed.length ? completed[completed.length - 1] : null;
        candidate.state = previousWindowState(previous);
        candidate.prevOutcome = previous ? outcomeKey(previous) : "year_start";
        candidate.prevOutcomeStreak = previous ? Number(previous.outcomeStreak) || 1 : 0;
      });
    });
    return candidates;
  }

  function stateLabel(state) {
    if (state === "year_start") return "年初开始";
    var parts = String(state).split("|");
    var outcome = {
      hit1: "上一窗第1期命中",
      hit2: "上一窗第2期命中",
      hit3: "上一窗第3期命中",
      miss: "上一窗全错"
    }[parts[0]] || parts[0];
    var streak = {
      one: "首次",
      two: "连续第2窗",
      three_plus: "连续3窗以上"
    }[parts[1]] || parts[1];
    return outcome + " · " + streak;
  }

  function buildCandidates(d, line, grouped, probabilityCache, cap) {
    var width = cap || 3;
    var candidates = [];
    Object.keys(grouped).map(Number).sort(function (a, b) { return a - b; }).forEach(function (year) {
      var rows = grouped[year];
      function tailAt(localIndex) {
        return line.kind === "tail"
          ? Number(line.tail)
          : Number((probabilityCache[year][localIndex] || [])[line.rank || 0]);
      }
      function pushCandidate(startIndex, tail, attempts, hitIndex) {
        if (!Number.isFinite(tail) || !attempts.length) return;
        var start = rows[startIndex].index;
        candidates.push({
          start: start,
          end: attempts[attempts.length - 1].period,
          year: year,
          localStart: startIndex + 1,
          tail: tail,
          attempts: attempts,
          hitIndex: hitIndex,
          baseline: windowBaseline(d, tail, start, width)
        });
      }
      if (width === 1) {
        // 一期热图：每一期都是一个独立的一期窗口，不锁尾、不等待。
        rows.forEach(function (item, localIndex) {
          var tail = tailAt(localIndex);
          var hit = hasTail(item.row, tail);
          pushCandidate(localIndex, tail, [{ period: item.index, tail: tail, hit: hit }], hit ? 1 : 0);
        });
        return;
      }
      // 两期/三期热图：锁尾到上限；全错后等该尾重新开出，再于下一期开新窗。
      var localIndex = 0;
      var active = null;
      var waitingTail = null;
      while (localIndex < rows.length) {
        var item = rows[localIndex];
        if (waitingTail != null) {
          if (hasTail(item.row, waitingTail)) waitingTail = null;
          localIndex++;
          continue;
        }
        if (!active) {
          var startTail = tailAt(localIndex);
          if (!Number.isFinite(startTail)) {
            localIndex++;
            continue;
          }
          active = { startIndex: localIndex, tail: startTail, attempts: [], hitIndex: 0 };
        }
        var hit = hasTail(item.row, active.tail);
        active.attempts.push({ period: item.index, tail: active.tail, hit: hit });
        if (hit) {
          active.hitIndex = active.attempts.length;
          pushCandidate(active.startIndex, active.tail, active.attempts, active.hitIndex);
          active = null;
        } else if (active.attempts.length >= width) {
          pushCandidate(active.startIndex, active.tail, active.attempts, 0);
          waitingTail = active.tail;
          active = null;
        }
        localIndex++;
      }
    });
    return annotateWindowStates(candidates);
  }

  function summarizeRate(rows) {
    var hits = rows.filter(function (row) { return row.hitIndex > 0; }).length;
    return { n: rows.length, hits: hits, rate: rows.length ? hits / rows.length : 0 };
  }

  function longTermProfile(candidates) {
    var stats = summarizeRate(candidates);
    var baseline = candidates.length
      ? candidates.reduce(function (sum, row) { return sum + row.baseline; }, 0) / candidates.length
      : 0.91;
    var first = candidates.filter(function (row) { return row.hitIndex === 1; }).length;
    var second = candidates.filter(function (row) { return row.hitIndex === 2; }).length;
    var third = candidates.filter(function (row) { return row.hitIndex === 3; }).length;
    var stateCounts = {};
    candidates.forEach(function (row) {
      if (!stateCounts[row.state]) stateCounts[row.state] = { n: 0, hits: 0 };
      stateCounts[row.state].n++;
      if (row.hitIndex > 0) stateCounts[row.state].hits++;
    });
    return {
      windows: stats.n,
      hits: stats.hits,
      misses: stats.n - stats.hits,
      rate: stats.rate,
      baseline: baseline,
      edge: stats.rate - baseline,
      stageShare: {
        first: stats.hits ? first / stats.hits : 0,
        second: stats.hits ? second / stats.hits : 0,
        third: stats.hits ? third / stats.hits : 0
      },
      stageCounts: { first: first, second: second, third: third },
      stateCounts: stateCounts
    };
  }

  function yearlyStats(candidates) {
    var byYear = {};
    candidates.forEach(function (row) {
      if (!byYear[row.year]) byYear[row.year] = [];
      byYear[row.year].push(row);
    });
    return Object.keys(byYear).map(function (year) {
      var stats = summarizeRate(byYear[year]);
      return { year: Number(year), windows: stats.n, hits: stats.hits, rate: stats.rate };
    }).sort(function (a, b) { return a.year - b.year; });
  }

  function drawDate(year, localPeriod) {
    return new Date(Date.UTC(Number(year), 0, 1) + (Number(localPeriod) - 1) * DAY_MS);
  }

  function temporalStats(rows, longRate, minSamples) {
    var stats = summarizeRate(rows);
    var delta = stats.n ? stats.rate - longRate : 0;
    var standardError = stats.n
      ? Math.sqrt(Math.max(0.0001, longRate * (1 - longRate)) / stats.n)
      : 1;
    var z = stats.n ? delta / standardError : 0;
    return {
      windows: stats.n,
      hits: stats.hits,
      rate: stats.rate,
      longRate: longRate,
      delta: delta,
      z: z,
      trend: stats.n < minSamples ? "样本不足" : (z >= 1 ? "转强" : (z <= -1 ? "转弱" : "稳定"))
    };
  }

  function realtimeProfile(candidates, latestRow, asOfPeriod, longRate) {
    var latestYear = Number(latestRow.y);
    var latestLocal = Number(latestRow.p);
    var latestDate = drawDate(latestYear, latestLocal);
    var latestMonth = latestDate.getUTCMonth();
    var latestHalf = latestDate.getUTCDate() <= 15 ? 1 : 2;
    var weekStart = latestDate.getTime() - 6 * DAY_MS;
    var rows = candidates.filter(function (row) {
      return Number(row.end) <= Number(asOfPeriod);
    }).sort(function (a, b) { return a.end - b.end; });
    var yearRows = rows.filter(function (row) { return Number(row.year) === latestYear; });
    var monthRows = yearRows.filter(function (row) {
      var date = drawDate(row.year, row.localStart);
      return date.getUTCMonth() === latestMonth;
    });
    var halfRows = monthRows.filter(function (row) {
      var date = drawDate(row.year, row.localStart);
      var half = date.getUTCDate() <= 15 ? 1 : 2;
      return half === latestHalf;
    });
    var weekRows = rows.filter(function (row) {
      var time = drawDate(row.year, row.localStart).getTime();
      return time >= weekStart && time <= latestDate.getTime();
    });
    var recent12 = rows.slice(-12);
    var last = rows.length ? rows[rows.length - 1] : null;
    return {
      latestDate: latestDate.toISOString().slice(0, 10),
      year: temporalStats(yearRows, longRate, 20),
      month: temporalStats(monthRows, longRate, 8),
      halfMonth: temporalStats(halfRows, longRate, 5),
      week: temporalStats(weekRows, longRate, 3),
      recent12: temporalStats(recent12, longRate, 8),
      lastWindow: last ? {
        start: Number(last.start),
        end: Number(last.end),
        outcome: outcomeKey(last),
        streak: Number(last.outcomeStreak) || 1
      } : null
    };
  }

  var PHASE_FLAT_MARGIN = 0.005;

  function phaseDiagnostic(metric, label) {
    var windows = Number(metric && metric.windows || 0);
    var delta = Number(metric && metric.delta || 0);
    var direction = "flat";
    if (windows > 0 && delta >= PHASE_FLAT_MARGIN) direction = "up";
    else if (windows > 0 && delta <= -PHASE_FLAT_MARGIN) direction = "down";
    return {
      label: label,
      windows: windows,
      hits: Number(metric && metric.hits || 0),
      rate: windows ? Number(metric.rate || 0) : null,
      delta: windows ? delta : null,
      direction: direction,
    };
  }

  function horizonDiagnostic(submodel, realtime, label) {
    var phases = [
      phaseDiagnostic(realtime && realtime.year, "本年"),
      phaseDiagnostic(realtime && realtime.month, "本月"),
      phaseDiagnostic(realtime && realtime.halfMonth, "本半月"),
      phaseDiagnostic(realtime && realtime.week, "近7日")
    ];
    var samples = Number(submodel && submodel.samples || 0);
    var hits = Number(submodel && submodel.hits || 0);
    var edge = Number(submodel && submodel.edge || 0);
    var upCount = phases.filter(function (item) { return item.direction === "up"; }).length;
    var downCount = phases.filter(function (item) { return item.direction === "down"; }).length;
    var flatCount = phases.filter(function (item) { return item.direction === "flat" && item.windows > 0; }).length;
    var stage = "rebound";
    if (!samples) stage = "unseen";
    else if (edge < 0 && downCount >= upCount) stage = "risk";
    else if (edge > 0 && upCount > 0 && upCount >= downCount) stage = "safe";
    return {
      label: label,
      stage: stage,
      edge: edge,
      samples: samples,
      hits: hits,
      actualRate: samples ? hits / samples : null,
      rare: samples > 0 && samples <= 5,
      upCount: upCount,
      downCount: downCount,
      flatCount: flatCount,
      phases: phases,
    };
  }

  function combineHorizonDiagnostics(diagnostics) {
    var safeCount = diagnostics.filter(function (item) { return item.stage === "safe"; }).length;
    var reboundCount = diagnostics.filter(function (item) { return item.stage === "rebound"; }).length;
    var riskCount = diagnostics.filter(function (item) { return item.stage === "risk"; }).length;
    var unseenCount = diagnostics.filter(function (item) { return item.stage === "unseen"; }).length;
    return {
      safeCount: safeCount,
      reboundCount: reboundCount,
      riskCount: riskCount,
      unseenCount: unseenCount,
      rareCount: diagnostics.filter(function (item) { return item.rare; }).length,
      upCount: diagnostics.reduce(function (sum, item) { return sum + item.upCount; }, 0),
      downCount: diagnostics.reduce(function (sum, item) { return sum + item.downCount; }, 0),
      worstEdge: diagnostics.length
        ? Math.min.apply(null, diagnostics.map(function (item) { return item.edge; }))
        : 0,
    };
  }

  function predict(history, state, baseline) {
    var lineHits = history.filter(function (row) { return row.hitIndex > 0; }).length;
    var lineRate = (lineHits + LINE_PRIOR * baseline) / (history.length + LINE_PRIOR);
    var stateRows = history.filter(function (row) { return row.state === state; });
    var stateHits = stateRows.filter(function (row) { return row.hitIndex > 0; }).length;
    return {
      predictedRate: clamp((stateHits + STATE_PRIOR * lineRate) / (stateRows.length + STATE_PRIOR), 0.001, 0.999),
      lineRate: lineRate,
      lineSamples: history.length,
      stateSamples: stateRows.length,
      stateHits: stateHits
    };
  }

  function walkForward(candidates) {
    var byEnd = {};
    candidates.forEach(function (row) {
      if (!byEnd[row.end]) byEnd[row.end] = [];
      byEnd[row.end].push(row);
    });
    var history = [];
    var predictions = [];
    candidates.slice().sort(function (a, b) { return a.start - b.start; }).forEach(function (candidate) {
      Object.keys(byEnd).map(Number).filter(function (end) { return end < candidate.start; })
        .forEach(function (end) {
          byEnd[end].forEach(function (row) {
            if (!row._addedToHistory) {
              row._addedToHistory = true;
              history.push(row);
            }
          });
        });
      if (!history.length) return;
      var result = predict(history, candidate.state, candidate.baseline);
      predictions.push({
        start: candidate.start,
        year: candidate.year,
        state: candidate.state,
        hit: candidate.hitIndex > 0,
        predictedRate: result.predictedRate,
        lineRate: result.lineRate,
        baseline: candidate.baseline
      });
    });
    candidates.forEach(function (row) { delete row._addedToHistory; });
    return predictions;
  }

  function alignedSubmodels(submodelPredictions) {
    var byStart = {};
    ["one", "two", "three"].forEach(function (key) {
      submodelPredictions[key].forEach(function (row) {
        if (!byStart[row.start]) byStart[row.start] = { start: row.start };
        byStart[row.start][key] = row;
      });
    });
    return Object.keys(byStart).map(Number).sort(function (a, b) { return a - b; })
      .map(function (start) { return byStart[start]; })
      .filter(function (row) { return row.one && row.two && row.three; });
  }

  function riskLevel(row) {
    return row.predictedRate >= Math.max(row.baseline, row.lineRate) ? "safe" : "risk";
  }

  function orderedRiskLevels(row, direction) {
    var levels = [riskLevel(row.one), riskLevel(row.two), riskLevel(row.three)];
    return direction === "reverse" ? levels.slice().reverse() : levels;
  }

  function directionalCascade(aligned, direction) {
    var patternCounts = {};
    return aligned.slice().sort(function (a, b) { return a.start - b.start; }).map(function (row) {
      var levels = orderedRiskLevels(row, direction);
      var pattern = levels.join("-");
      if (!patternCounts[pattern]) patternCounts[pattern] = { n: 0, hits: 0 };
      var count = patternCounts[pattern];
      var predictedRate = (count.hits + PATTERN_PRIOR * row.three.lineRate) /
        (count.n + PATTERN_PRIOR);
      var result = {
        start: row.start,
        year: row.three.year,
        state: row.three.state,
        hit: row.three.hit,
        baseline: row.three.baseline,
        lineRate: row.three.lineRate,
        predictedRate: predictedRate,
        riskPattern: pattern,
        riskLevels: levels,
        patternSamples: count.n,
        patternHits: count.hits
      };
      count.n++;
      if (row.three.hit) count.hits++;
      return result;
    });
  }

  function dualDirectionPredictions(aligned) {
    var forward = directionalCascade(aligned, "forward");
    var reverse = directionalCascade(aligned, "reverse");
    return forward.map(function (row, index) {
      var reverseRow = reverse[index];
      var alignedRow = aligned[index];
      var combined = combineIndependentHorizons(alignedRow);
      return {
        start: row.start,
        year: row.year,
        state: row.state,
        hit: row.hit,
        baseline: row.baseline,
        predictedRate: combined.predictedRate,
        cascadeDecision: combined.label,
        compositeScore: combined.compositeScore,
        safeHorizons: combined.safeHorizons,
        horizonEdges: combined.horizonEdges,
        forward: row,
        reverse: reverseRow
      };
    });
  }

  function horizonRisk(horizon) {
    if (!horizon) return "risk";
    return Number(horizon.predictedRate) >= Math.max(Number(horizon.baseline), Number(horizon.lineRate))
      ? "safe"
      : "risk";
  }

  function combineIndependentHorizons(submodels) {
    var horizons = [submodels.one, submodels.two, submodels.three];
    var levels = horizons.map(horizonRisk);
    var edges = horizons.map(function (horizon) {
      return horizon ? Number(horizon.predictedRate) - Number(horizon.baseline) : -1;
    });
    var safeHorizons = levels.filter(function (level) { return level === "safe"; }).length;
    var worstEdge = Math.min.apply(null, edges);
    var label = safeHorizons === 3 ? "三窗独立一致安全·高分" :
      safeHorizons === 2 ? "两窗独立安全·观察" :
        safeHorizons === 1 ? "仅一窗安全·低分" : "三窗独立一致风险·低分";
    return {
      label: label,
      safeHorizons: safeHorizons,
      riskLevels: levels,
      horizonEdges: edges,
      compositeScore: worstEdge,
      predictedRate: submodels.three ? Number(submodels.three.predictedRate) : 0
    };
  }

  function currentDirectionPrediction(submodels, aligned, direction) {
    var baseLevels = ["one", "two", "three"].map(function (key) { return riskLevel(submodels[key]); });
    var levels = direction === "reverse" ? baseLevels.slice().reverse() : baseLevels;
    var pattern = levels.join("-");
    var matching = aligned.filter(function (row) {
      return orderedRiskLevels(row, direction).join("-") === pattern;
    });
    var hits = matching.filter(function (row) { return row.three.hit; }).length;
    return {
      riskLevels: levels,
      riskPattern: pattern,
      patternSamples: matching.length,
      patternHits: hits,
      predictedRate: (hits + PATTERN_PRIOR * submodels.three.lineRate) /
        (matching.length + PATTERN_PRIOR)
    };
  }

  function validate(predictions, year) {
    var rows = predictions.filter(function (row) { return row.year === year; });
    var hits = rows.filter(function (row) { return row.hit; }).length;
    var baseline = rows.length
      ? rows.reduce(function (sum, row) { return sum + row.baseline; }, 0) / rows.length
      : 0;
    var brier = rows.length
      ? rows.reduce(function (sum, row) {
        return sum + Math.pow(row.predictedRate - (row.hit ? 1 : 0), 2);
      }, 0) / rows.length
      : 0;
    var baselineBrier = rows.length
      ? rows.reduce(function (sum, row) {
        return sum + Math.pow(row.baseline - (row.hit ? 1 : 0), 2);
      }, 0) / rows.length
      : 0;
    return {
      year: year,
      predictions: rows.length,
      hits: hits,
      rate: rows.length ? hits / rows.length : 0,
      baseline: baseline,
      brier: brier,
      baselineBrier: baselineBrier,
      brierSkill: baselineBrier ? 1 - brier / baselineBrier : 0
    };
  }

  function selectionValidation(linePredictions) {
    return VALIDATION_YEARS.map(function (year) {
      var groups = {};
      linePredictions.forEach(function (item) {
        item.predictions.forEach(function (row) {
          if (row.year !== year) return;
          if (!groups[row.start]) groups[row.start] = [];
          groups[row.start].push({
            lineId: item.id,
            hit: row.hit,
            predictedRate: row.predictedRate,
            compositeScore: row.compositeScore,
            safeHorizons: row.safeHorizons,
          });
        });
      });
      var periods = Object.keys(groups).map(Number).filter(function (start) {
        return groups[start].length >= 2;
      });
      function selectedStats(count) {
        var selected = [];
        periods.forEach(function (start) {
          groups[start].slice().sort(function (a, b) {
            return b.safeHorizons - a.safeHorizons ||
              b.compositeScore - a.compositeScore ||
              b.predictedRate - a.predictedRate;
          }).slice(0, count).forEach(function (row) { selected.push(row); });
        });
        var hits = selected.filter(function (row) { return row.hit; }).length;
        return { n: selected.length, hits: hits, rate: selected.length ? hits / selected.length : 0 };
      }
      var all = [];
      periods.forEach(function (start) { all = all.concat(groups[start]); });
      var allStats = summarizeRate(all.map(function (row) { return { hitIndex: row.hit ? 1 : 0 }; }));
      var top2 = selectedStats(2);
      var top3 = selectedStats(3);
      return {
        year: year,
        periods: periods.length,
        all: { n: allStats.n, hits: allStats.hits, rate: allStats.rate },
        top2: top2,
        top3: top3,
        top2Lift: top2.rate - allStats.rate,
        top3Lift: top3.rate - allStats.rate
      };
    });
  }

  function currentTail(line, grouped, cache, latestPeriod) {
    if (line.kind === "tail") return Number(line.tail);
    var latest = latestPeriod - 1;
    var latestRow = arguments[4];
    var year = Number(latestRow.y);
    var rows = grouped[year];
    var localBefore = rows.filter(function (item) { return item.index <= latest; }).length;
    return Number((cache[year][localBefore] || [])[line.rank || 0]);
  }

  function currentWindowState(candidates, target) {
    var completed = candidates.filter(function (candidate) {
      return Number(candidate.end) < Number(target);
    }).sort(function (a, b) { return a.end - b.end || a.start - b.start; });
    var previous = completed.length ? completed[completed.length - 1] : null;
    return {
      state: previousWindowState(previous),
      prevOutcome: previous ? outcomeKey(previous) : "year_start",
      prevOutcomeStreak: previous ? Number(previous.outcomeStreak) || 1 : 0,
      previousStart: previous ? Number(previous.start) : null,
      previousEnd: previous ? Number(previous.end) : null,
      previousHitIndex: previous ? Number(previous.hitIndex) : null,
    };
  }

  function wilson(hits, total, z) {
    if (!total) return { lower: 0, upper: 1 };
    var p = hits / total;
    var z2 = z * z;
    var denom = 1 + z2 / total;
    var center = (p + z2 / (2 * total)) / denom;
    var spread = z * Math.sqrt((p * (1 - p) + z2 / (4 * total)) / total) / denom;
    return { lower: clamp(center - spread, 0, 1), upper: clamp(center + spread, 0, 1) };
  }

  function mean(values) {
    var finite = values.filter(function (value) { return Number.isFinite(Number(value)); });
    return finite.length
      ? finite.reduce(function (sum, value) { return sum + Number(value); }, 0) / finite.length
      : 0;
  }

  function reviewMetrics(lines, selection) {
    return {
      meanLongTermRate: mean(lines.map(function (line) { return line.longTerm.rate; })),
      meanCurrentPrediction: mean(lines.map(function (line) { return line.current.predictedRate; })),
      meanBrierSkill: mean(lines.flatMap(function (line) {
        return (line.validation || []).map(function (item) { return item.brierSkill; });
      })),
      selectionTop2: mean((selection || []).map(function (item) { return item.top2.rate; })),
      selectionTop3: mean((selection || []).map(function (item) { return item.top3.rate; })),
      selectionAll: mean((selection || []).map(function (item) { return item.all.rate; })),
    };
  }

  function reviewSchedule(options, asOfPeriod, lines, selection) {
    var reviewedAt = new Date(options && options.reviewedAt ? options.reviewedAt : Date.now());
    if (!Number.isFinite(reviewedAt.getTime())) reviewedAt = new Date();
    var previous = options && options.previousReview && typeof options.previousReview === "object"
      ? options.previousReview
      : null;
    var observed = reviewMetrics(lines, selection);
    var policy = {
      maxPeriods: REVIEW_MAX_PERIODS,
      maxDays: REVIEW_MAX_DAYS,
      trigger: "whichever-first",
    };
    var lastReviewedPeriod = Number(previous && previous.lastReviewedPeriod);
    var lastReviewedAt = previous && previous.lastReviewedAt
      ? new Date(previous.lastReviewedAt)
      : null;
    var nextReviewPeriod = Number(previous && previous.nextReviewPeriod);
    var nextReviewAt = previous && previous.nextReviewAt
      ? new Date(previous.nextReviewAt)
      : null;
    var dueNow = !!(previous &&
      (
        (Number.isFinite(nextReviewPeriod) && asOfPeriod >= nextReviewPeriod) ||
        (nextReviewAt && Number.isFinite(nextReviewAt.getTime()) && reviewedAt >= nextReviewAt)
      ));
    var reviewNumber = Math.max(1, Number(previous && previous.reviewNumber) || 1);
    var status = "baseline";

    if (!previous || !Number.isFinite(lastReviewedPeriod) || !lastReviewedAt ||
        !Number.isFinite(lastReviewedAt.getTime())) {
      lastReviewedPeriod = asOfPeriod;
      lastReviewedAt = reviewedAt;
      nextReviewPeriod = lastReviewedPeriod + REVIEW_MAX_PERIODS;
      nextReviewAt = new Date(lastReviewedAt.getTime() + REVIEW_MAX_DAYS * DAY_MS);
    } else if (dueNow) {
      reviewNumber++;
      lastReviewedPeriod = asOfPeriod;
      lastReviewedAt = reviewedAt;
      nextReviewPeriod = lastReviewedPeriod + REVIEW_MAX_PERIODS;
      nextReviewAt = new Date(lastReviewedAt.getTime() + REVIEW_MAX_DAYS * DAY_MS);
      status = "completed";
    } else {
      status = "waiting";
    }

    var metrics = (!previous || dueNow) ? observed : (previous.metrics || observed);
    return {
      policy: policy,
      status: status,
      dueNow: dueNow,
      reviewNumber: reviewNumber,
      lastReviewedPeriod: lastReviewedPeriod,
      lastReviewedAt: lastReviewedAt.toISOString(),
      nextReviewPeriod: nextReviewPeriod,
      nextReviewAt: nextReviewAt.toISOString(),
      periodsUntilReview: Math.max(0, nextReviewPeriod - asOfPeriod),
      daysUntilReview: Math.max(0, Math.ceil((nextReviewAt.getTime() - reviewedAt.getTime()) / DAY_MS)),
      metrics: metrics,
      previousMetrics: dueNow && previous ? (previous.metrics || null) : null,
      observedMetrics: observed,
      candidateOnly: dueNow,
      ruleReplacement: dueNow ? "pending-shadow-review" : "hold-current",
    };
  }

  function build(options) {
    var d = options && options.d;
    var probabilityModel = options && options.probabilityModel;
    var asOfPeriod = Number(options && options.asOfPeriod) || (d ? d.length : 0);
    if (!d || !probabilityModel || !asOfPeriod) throw new Error("missing model inputs");
    var available = d.slice(0, asOfPeriod);
    var grouped = yearGroups(available);
    var cache = buildProbabilityCache(grouped, probabilityModel);
    var details = LINES.map(function (line) {
      var candidates = {
        one: buildCandidates(available, line, grouped, cache, 1),
        two: buildCandidates(available, line, grouped, cache, 2),
        three: buildCandidates(available, line, grouped, cache, 3)
      };
      var predictions = {
        one: walkForward(candidates.one),
        two: walkForward(candidates.two),
        three: walkForward(candidates.three)
      };
      var aligned = alignedSubmodels(predictions);
      return {
        line: line,
        candidates: candidates,
        predictions: predictions,
        aligned: aligned,
        cascade: dualDirectionPredictions(aligned)
      };
    });
    var target = asOfPeriod + 1;
    var latest = available[available.length - 1];
    var lines = details.map(function (detail) {
      var line = detail.line;
      var tail = currentTail(line, grouped, cache, asOfPeriod, latest);
      var states = {
        one: currentWindowState(detail.candidates.one, target),
        two: currentWindowState(detail.candidates.two, target),
        three: currentWindowState(detail.candidates.three, target)
      };
      var submodels = {};
      ["one", "two", "three"].forEach(function (key) {
        var cap = key === "one" ? 1 : (key === "two" ? 2 : 3);
        var baseline = windowBaseline(available, tail, target, cap);
        var prediction = predict(detail.candidates[key], states[key].state, baseline);
        submodels[key] = {
          cap: cap,
          predictedRate: prediction.predictedRate,
          baseline: baseline,
          edge: prediction.predictedRate - baseline,
          samples: prediction.stateSamples,
          hits: prediction.stateHits,
          lineRate: prediction.lineRate,
          state: states[key].state,
          stateLabel: stateLabel(states[key].state),
          prevOutcome: states[key].prevOutcome,
          prevOutcomeStreak: states[key].prevOutcomeStreak,
          previousStart: states[key].previousStart,
          previousEnd: states[key].previousEnd,
          previousHitIndex: states[key].previousHitIndex
        };
      });
      var baseline = submodels.three.baseline;
      var forwardCascade = currentDirectionPrediction(submodels, detail.aligned, "forward");
      var reverseCascade = currentDirectionPrediction(submodels, detail.aligned, "reverse");
      var combinedCascade = combineIndependentHorizons(submodels);
      var predictedRate = submodels.three.predictedRate;
      var interval = wilson(submodels.three.hits, submodels.three.samples, 1.28);
      var confidence = submodels.three.samples >= 20
        ? (interval.lower > baseline ? "高于基准" : (interval.upper < baseline ? "低于基准" : "接近基准"))
        : "样本不足";
      var profiles = {
        one: longTermProfile(detail.candidates.one),
        two: longTermProfile(detail.candidates.two),
        three: longTermProfile(detail.candidates.three)
      };
      var profile = profiles.three;
      var realtimeByHorizon = {
        one: realtimeProfile(detail.candidates.one, latest, asOfPeriod, profiles.one.rate),
        two: realtimeProfile(detail.candidates.two, latest, asOfPeriod, profiles.two.rate),
        three: realtimeProfile(detail.candidates.three, latest, asOfPeriod, profiles.three.rate)
      };
      var diagnosticByHorizon = {
        one: horizonDiagnostic(submodels.one, realtimeByHorizon.one, "一期窗口"),
        two: horizonDiagnostic(submodels.two, realtimeByHorizon.two, "两期窗口"),
        three: horizonDiagnostic(submodels.three, realtimeByHorizon.three, "三期窗口")
      };
      var diagnostic = combineHorizonDiagnostics([
        diagnosticByHorizon.one,
        diagnosticByHorizon.two,
        diagnosticByHorizon.three
      ]);
      var validationByHorizon = {
        one: VALIDATION_YEARS.map(function (year) { return validate(detail.predictions.one, year); }),
        two: VALIDATION_YEARS.map(function (year) { return validate(detail.predictions.two, year); }),
        three: VALIDATION_YEARS.map(function (year) { return validate(detail.predictions.three, year); })
      };
      return {
        id: line.id,
        label: line.label,
        kind: line.kind,
        longTerm: profile,
        longTermByHorizon: profiles,
        yearly: yearlyStats(detail.candidates.three),
        yearlyByHorizon: {
          one: yearlyStats(detail.candidates.one),
          two: yearlyStats(detail.candidates.two),
          three: yearlyStats(detail.candidates.three)
        },
        validation: validationByHorizon.three,
        validationByHorizon: validationByHorizon,
        current: {
          target: target,
          tail: tail,
          state: submodels.three.state,
          stateLabel: submodels.three.stateLabel,
          stateByHorizon: {
            one: submodels.one.state,
            two: submodels.two.state,
            three: submodels.three.state
          },
          stateLabelByHorizon: {
            one: submodels.one.stateLabel,
            two: submodels.two.stateLabel,
            three: submodels.three.stateLabel
          },
          realtimeByHorizon: realtimeByHorizon,
          diagnosticByHorizon: diagnosticByHorizon,
          diagnostic: diagnostic,
          samples: submodels.three.samples,
          hits: submodels.three.hits,
          lineRate: submodels.three.lineRate,
          predictedRate: predictedRate,
          threeWindowRate: predictedRate,
          threeWindowBaseline: baseline,
          threeWindowEdge: predictedRate - baseline,
          compositeScore: combinedCascade.compositeScore,
          safeHorizons: combinedCascade.safeHorizons,
          horizonEdges: combinedCascade.horizonEdges,
          baseline: baseline,
          edge: predictedRate - baseline,
          lower: interval.lower,
          upper: interval.upper,
          confidence: confidence,
          submodels: submodels,
          riskLevels: combinedCascade.riskLevels,
          riskPattern: forwardCascade.riskPattern + "|" + reverseCascade.riskPattern,
          directionPredictions: {
            forward: forwardCascade,
            reverse: reverseCascade
          },
          cascadeDecision: combinedCascade.label,
          reason: "三期窗口长期 " + (profile.rate * 100).toFixed(1) + "%（" +
            profile.hits + "/" + profile.windows + "），第1/2/3期结束 " +
            (profile.stageShare.first * 100).toFixed(0) + "/" +
            (profile.stageShare.second * 100).toFixed(0) + "/" +
            (profile.stageShare.third * 100).toFixed(0) + "%。独立性格：一期" +
            submodels.one.stateLabel + " → " + (submodels.one.predictedRate * 100).toFixed(1) +
            "%，两期" + submodels.two.stateLabel + " → " + (submodels.two.predictedRate * 100).toFixed(1) +
            "%，三期" + submodels.three.stateLabel + " → " + (submodels.three.predictedRate * 100).toFixed(1) +
            "%。综合安全窗 " + combinedCascade.safeHorizons + "/3，" +
            "最差窗口增量 " + (combinedCascade.compositeScore >= 0 ? "+" : "") +
            (combinedCascade.compositeScore * 100).toFixed(1) + "pp；判定：" +
            combinedCascade.label + "。"
        }
      };
    });
    var ranking = lines.slice().sort(function (a, b) {
      return b.current.safeHorizons - a.current.safeHorizons ||
        b.current.compositeScore - a.current.compositeScore ||
        b.current.threeWindowEdge - a.current.threeWindowEdge ||
        b.current.threeWindowRate - a.current.threeWindowRate ||
        a.id.localeCompare(b.id);
    }).map(function (line, index) {
      return Object.assign({ rank: index + 1 }, line);
    });
    var diagnosticRanking = lines.slice().sort(function (a, b) {
      return b.current.diagnostic.safeCount - a.current.diagnostic.safeCount ||
        a.current.diagnostic.riskCount - b.current.diagnostic.riskCount ||
        (b.current.diagnostic.upCount - b.current.diagnostic.downCount) -
          (a.current.diagnostic.upCount - a.current.diagnostic.downCount) ||
        b.current.diagnostic.worstEdge - a.current.diagnostic.worstEdge ||
        b.current.threeWindowEdge - a.current.threeWindowEdge ||
        b.current.threeWindowRate - a.current.threeWindowRate ||
        a.id.localeCompare(b.id);
    }).map(function (line, index) {
      return Object.assign({ rank: index + 1 }, line);
    });
    var threeWindowRanking = lines.slice().sort(function (a, b) {
      return b.current.threeWindowRate - a.current.threeWindowRate ||
        b.current.threeWindowEdge - a.current.threeWindowEdge ||
        a.id.localeCompare(b.id);
    }).map(function (line, index) {
      return Object.assign({ rank: index + 1 }, line);
    });
    var selection = selectionValidation(details.map(function (item) {
      return { id: item.line.id, predictions: item.cascade };
    }));
    return {
      version: VERSION,
      method: METHOD,
      generatedAt: null,
      asOfPeriod: asOfPeriod,
      target: target,
      trainingYears: [2021, 2022, 2023, 2024],
      validationYears: VALIDATION_YEARS,
      linePrior: LINE_PRIOR,
      statePrior: STATE_PRIOR,
      uniformWeightsUsed: false,
      oneTwoThreeWeightMix: false,
      independentHorizons: true,
      riskCascade: false,
      bidirectionalRiskCascade: false,
      stateDefinition: "previous-completed-window",
      compositeRule: "safe-horizons-then-worst-edge",
      diagnosticRule: "three-stage-cycle-then-risk-count",
      activeRankingRule: "legacy-until-diagnostic-snapshot-locked",
      lookAheadUsed: false,
      overlappingWindows: true,
      lines: lines,
      ranking: ranking,
      legacyRanking: ranking,
      diagnosticRanking: diagnosticRanking,
      threeWindowRanking: threeWindowRanking,
      selectionValidation: selection,
      review: reviewSchedule(options, asOfPeriod, lines, selection),
    };
  }

  return { VERSION: VERSION, METHOD: METHOD, build: build };
});
