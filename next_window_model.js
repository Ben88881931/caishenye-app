(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CAISHEN_NEXT_WINDOW = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var METHOD = "per-line-dual-direction-risk-cascade-v6";
  var VERSION = "next-window-v7-20261026";
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

  function stateAt(rows, localIndex, tail) {
    if (localIndex <= 0) return "year_start";
    if (hasTail(rows[localIndex - 1].row, tail)) return "after_hit";
    var misses = 0;
    for (var i = localIndex - 1; i >= 0; i--) {
      if (hasTail(rows[i].row, tail)) break;
      misses++;
    }
    if (misses <= 1) return "after_one_miss";
    if (misses === 2) return "after_two_misses";
    return "after_three_plus_misses";
  }

  function stateLabel(state) {
    return {
      year_start: "年初开始",
      after_hit: "上一期开出",
      after_one_miss: "连续遗漏1期",
      after_two_misses: "连续遗漏2期",
      after_three_plus_misses: "连续遗漏3期以上"
    }[state] || state;
  }

  function buildCandidates(d, line, grouped, probabilityCache, cap) {
    var width = cap || 3;
    var candidates = [];
    Object.keys(grouped).map(Number).sort(function (a, b) { return a - b; }).forEach(function (year) {
      var rows = grouped[year];
      for (var localIndex = 0; localIndex + width - 1 < rows.length; localIndex++) {
        var tail = line.kind === "tail"
          ? Number(line.tail)
          : Number((probabilityCache[year][localIndex] || [])[line.rank || 0]);
        if (!Number.isFinite(tail)) continue;
        var start = rows[localIndex].index;
        var attempts = [];
        var hitIndex = 0;
        for (var offset = 0; offset < width; offset++) {
          var item = rows[localIndex + offset];
          var hit = hasTail(item.row, tail);
          attempts.push({ period: item.index, tail: tail, hit: hit });
          if (hit) {
            hitIndex = offset + 1;
            break;
          }
        }
        if (!hitIndex && attempts.length < width) continue;
        candidates.push({
          start: start,
          end: attempts[attempts.length - 1].period,
          year: year,
          localStart: localIndex + 1,
          tail: tail,
          attempts: attempts,
          hitIndex: hitIndex,
          state: stateAt(rows, localIndex, tail),
          baseline: windowBaseline(d, tail, start, width)
        });
      }
    });
    return candidates;
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
      var combined = combineDirectionalPredictions(row, reverseRow, row.baseline, row.lineRate);
      return {
        start: row.start,
        year: row.year,
        state: row.state,
        hit: row.hit,
        baseline: row.baseline,
        predictedRate: combined.predictedRate,
        cascadeDecision: combined.label,
        forward: row,
        reverse: reverseRow
      };
    });
  }

  function combineDirectionalPredictions(forward, reverse, baseline, lineRate) {
    var forwardAllRisk = forward.riskLevels.every(function (level) { return level === "risk"; });
    var reverseAllRisk = reverse.riskLevels.every(function (level) { return level === "risk"; });
    var forwardAllSafe = forward.riskLevels.every(function (level) { return level === "safe"; });
    var reverseAllSafe = reverse.riskLevels.every(function (level) { return level === "safe"; });
    if (forwardAllRisk && reverseAllRisk) {
      return {
        label: "双向全风险·低分",
        predictedRate: Math.min(forward.predictedRate, reverse.predictedRate, baseline) * 0.72
      };
    }
    if (forwardAllSafe && reverseAllSafe) {
      return {
        label: "双向全安全·高分",
        predictedRate: Math.max(forward.predictedRate, reverse.predictedRate, baseline)
      };
    }
    if (forwardAllSafe !== reverseAllSafe) {
      return { label: "方向分歧·中性", predictedRate: lineRate };
    }
    return {
      label: "双方向混合·观察",
      predictedRate: (forward.predictedRate + reverse.predictedRate) / 2
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
          groups[row.start].push({ lineId: item.id, hit: row.hit, predictedRate: row.predictedRate });
        });
      });
      var periods = Object.keys(groups).map(Number).filter(function (start) {
        return groups[start].length >= 2;
      });
      function selectedStats(count) {
        var selected = [];
        periods.forEach(function (start) {
          groups[start].slice().sort(function (a, b) {
            return b.predictedRate - a.predictedRate;
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

  function currentState(d, line, tail, target) {
    var year = Number((d[target - 1] || d[d.length - 1] || {}).y);
    var current = [];
    d.forEach(function (row, index) {
      if (Number(row.y) === year && index + 1 < target) current.push({ row: row, index: index + 1 });
    });
    return stateAt(current, current.length, tail);
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
      var state = currentState(available, line, tail, target);
      var submodels = {};
      ["one", "two", "three"].forEach(function (key) {
        var cap = key === "one" ? 1 : (key === "two" ? 2 : 3);
        var baseline = windowBaseline(available, tail, target, cap);
        var prediction = predict(detail.candidates[key], state, baseline);
        submodels[key] = {
          cap: cap,
          predictedRate: prediction.predictedRate,
          baseline: baseline,
          edge: prediction.predictedRate - baseline,
          samples: prediction.stateSamples,
          hits: prediction.stateHits,
          lineRate: prediction.lineRate
        };
      });
      var baseline = submodels.three.baseline;
      var forwardCascade = currentDirectionPrediction(submodels, detail.aligned, "forward");
      var reverseCascade = currentDirectionPrediction(submodels, detail.aligned, "reverse");
      var combinedCascade = combineDirectionalPredictions(
        forwardCascade,
        reverseCascade,
        baseline,
        submodels.three.lineRate
      );
      var predictedRate = combinedCascade.predictedRate;
      var interval = wilson(submodels.three.hits, submodels.three.samples, 1.28);
      var confidence = submodels.three.samples >= 20
        ? (interval.lower > baseline ? "高于基准" : (interval.upper < baseline ? "低于基准" : "接近基准"))
        : "样本不足";
      var profile = longTermProfile(detail.candidates.three);
      return {
        id: line.id,
        label: line.label,
        kind: line.kind,
        longTerm: profile,
        yearly: yearlyStats(detail.candidates.three),
        validation: VALIDATION_YEARS.map(function (year) { return validate(detail.cascade, year); }),
        current: {
          target: target,
          tail: tail,
          state: state,
          stateLabel: stateLabel(state),
          samples: submodels.three.samples,
          hits: submodels.three.hits,
          lineRate: submodels.three.lineRate,
          predictedRate: predictedRate,
          baseline: baseline,
          edge: predictedRate - baseline,
          lower: interval.lower,
          upper: interval.upper,
          confidence: confidence,
          submodels: submodels,
          riskLevels: forwardCascade.riskLevels,
          riskPattern: forwardCascade.riskPattern + "|" + reverseCascade.riskPattern,
          directionPredictions: {
            forward: forwardCascade,
            reverse: reverseCascade
          },
          cascadeDecision: combinedCascade.label,
          reason: "长期新三期窗口 " + (profile.rate * 100).toFixed(1) + "%（" +
            profile.hits + "/" + profile.windows + "），第1/2/3期结束 " +
            (profile.stageShare.first * 100).toFixed(0) + "/" +
            (profile.stageShare.second * 100).toFixed(0) + "/" +
            (profile.stageShare.third * 100).toFixed(0) + "%，当前" + stateLabel(state) +
            "状态。综合：一期" + (submodels.one.predictedRate * 100).toFixed(1) +
            "% / 两期" + (submodels.two.predictedRate * 100).toFixed(1) +
            "% / 三期" + (submodels.three.predictedRate * 100).toFixed(1) +
            "%，正向 1→2→3 " + forwardCascade.riskLevels.map(function (level) {
              return level === "safe" ? "安全" : "风险";
            }).join("→") + "（" + forwardCascade.patternHits + "/" + forwardCascade.patternSamples +
            "）；反向 3→2→1 " + reverseCascade.riskLevels.map(function (level) {
              return level === "safe" ? "安全" : "风险";
            }).join("→") + "（" + reverseCascade.patternHits + "/" + reverseCascade.patternSamples +
            "），最终判定：" + combinedCascade.label + "。"
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
      riskCascade: true,
      bidirectionalRiskCascade: true,
      lookAheadUsed: false,
      overlappingWindows: true,
      lines: lines,
      ranking: ranking,
      selectionValidation: selection,
      review: reviewSchedule(options, asOfPeriod, lines, selection),
    };
  }

  return { VERSION: VERSION, METHOD: METHOD, build: build };
});
