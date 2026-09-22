(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CAISHEN_MODEL = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var BASE_RATE = [0.4717, 0.5539, 0.5539, 0.5539, 0.5539, 0.5539, 0.5539, 0.5539, 0.5539, 0.5539];
  var BOUNCE = { 0: 2, 1: 3, 2: 1, 3: 1, 4: 2, 5: 1, 6: 2, 7: 2, 8: 2, 9: 4 };
  var NEW_MODEL = {
    decayRate: 1.75,
    bounceThresh: 0.75,
    bounceThresh2: 0.65,
    wBounce: 5,
    wBounce2: 3,
    wDepth: 1,
    depthThresh: 0.5,
    minSample: 2
  };

  // 双号推荐五级强度映射（唯一权威定义，页面/监督脚本/统计脚本统一引用，禁止各算一套）
  var GRADE_TIERS = [
    { key: "S", min: 95.0 },
    { key: "A", min: 93.5 },
    { key: "B", min: 92.8 },
    { key: "C", min: 92.2 },
    { key: "D", min: -Infinity }
  ];

  function gradeOf(score) {
    for (var i = 0; i < GRADE_TIERS.length; i++) {
      if (score >= GRADE_TIERS[i].min) return GRADE_TIERS[i].key;
    }
    return "D";
  }

  // 分数整数分档（1分一档，供细分统计与风险标记；与 GRADE_TIERS 并存，不互相替代）
  var SCORE_BUCKETS = ["95.x", "94.x", "93.x", "92.x", "91.x", "其他"];

  function scoreBucketOf(score) {
    var f = Math.floor(Number(score));
    if (f === 95) return "95.x";
    if (f === 94) return "94.x";
    if (f === 93) return "93.x";
    if (f === 92) return "92.x";
    if (f === 91) return "91.x";
    return "其他";
  }

  // 单尾风险标记口径（以单个推荐尾号命中率为准，不用「双号至少中一」代替）
  var WILSON_Z = 1.96;
  var MIN_SAMPLE = 20;
  var DANGER_SAMPLE = 30;
  var BASE_RATE_SINGLE = 0.5539; // 单尾理论基准 55.39%

  function wilson(k, n) {
    if (!n || n <= 0) return null;
    var p = k / n;
    var z2 = WILSON_Z * WILSON_Z;
    var denom = 1 + z2 / n;
    var center = (p + z2 / (2 * n)) / denom;
    var margin = (WILSON_Z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
    return { lo: Math.max(0, center - margin), hi: Math.min(1, center + margin) };
  }

  function riskOf(n, hits) {
    if (n < MIN_SAMPLE) {
      if (n <= 0) return { label: "样本不足", flag: "insufficient" };
      var hint = hits / n < BASE_RATE_SINGLE ? "·初步偏弱" : "";
      return { label: "样本不足" + hint, flag: "insufficient" };
    }
    var ci = wilson(hits, n);
    if (n < DANGER_SAMPLE) {
      return { label: "观察", flag: "observe", ci: ci };
    }
    if (ci.hi < BASE_RATE_SINGLE) return { label: "🔴危险", flag: "danger", ci: ci };
    if (ci.lo > BASE_RATE_SINGLE) return { label: "🟢优势", flag: "advantage", ci: ci };
    return { label: "🟡正常或待观察", flag: "normal", ci: ci };
  }

  function createModel(raw) {
    var periods = Object.keys(raw).map(Number).sort(function (a, b) { return a - b; });

    function hit(p, d) {
      var b = raw[String(p)];
      return !!b && b[d] === "1";
    }

    function tailsOf(p) {
      var out = [];
      for (var d = 0; d < 10; d++) if (hit(p, d)) out.push(d);
      return out;
    }

    function cntRange(d, a, b) {
      var c = 0;
      for (var p = a; p <= b; p++) if (hit(p, d)) c++;
      return c;
    }

    function missUntil(d, upto) {
      var m = 0;
      for (var p = upto; p >= 1; p--) {
        if (hit(p, d)) break;
        m++;
      }
      return m;
    }

    function weightedExactBounce(d, upto, k) {
      var totalW = 0, hitsW = 0, run = 0;
      var total = 0, hits = 0;
      var uidx = periods.indexOf(upto);
      if (uidx < 0) return { rate: 0, sample: 0, total: 0, hits: 0 };
      for (var i = 0; i < periods.length - 1; i++) {
        if (periods[i] >= upto) break;
        if (hit(periods[i], d)) {
          run = 0;
        } else {
          run++;
          if (run === k) {
            var distFromEnd = uidx - i;
            var weight = Math.max(1, 10 - distFromEnd / NEW_MODEL.decayRate);
            totalW += weight;
            total++;
            if (hit(periods[i + 1], d)) {
              hitsW += weight;
              hits++;
            }
          }
        }
      }
      return { rate: totalW ? hitsW / totalW : 0, sample: totalW, total: total, hits: hits };
    }

    function missDepthRatio(d, upto) {
      var m = missUntil(d, upto);
      var maxM = 0, run = 0;
      for (var i = 0; i < periods.length; i++) {
        if (periods[i] > upto) break;
        if (hit(periods[i], d)) {
          run = 0;
        } else {
          run++;
          if (run > maxM) maxM = run;
        }
      }
      return { miss: m, maxMiss: maxM, ratio: maxM > 0 ? m / maxM : 0 };
    }

    function weightedPickAt(cur, k) {
      var last = {};
      for (var d = 0; d < 10; d++) last[d] = hit(cur, d);
      var cands = [];
      for (var d2 = 0; d2 < 10; d2++) {
        if (last[d2]) continue;
        var md = missDepthRatio(d2, cur);
        var wb = weightedExactBounce(d2, cur, md.miss);
        var score = 0;
        if (wb.sample >= NEW_MODEL.minSample) {
          if (wb.rate >= NEW_MODEL.bounceThresh) score += NEW_MODEL.wBounce;
          else if (wb.rate >= NEW_MODEL.bounceThresh2) score += NEW_MODEL.wBounce2;
        }
        if (md.ratio >= NEW_MODEL.depthThresh) score += NEW_MODEL.wDepth;
        cands.push({
          d: d2,
          score: score,
          miss: md.miss,
          maxMiss: md.maxMiss,
          ratio: md.ratio,
          wbr: wb.rate,
          wbSample: wb.sample,
          wbHits: wb.hits,
          wbTotal: wb.total
        });
      }
      cands.sort(function (a, b) { return b.score - a.score || a.d - b.d; });
      return cands.slice(0, k);
    }

    function pickTopAt(cur, k) {
      var picks = [];
      for (var d = 1; d <= 9; d++) {
        var streak = 0;
        for (var p = cur; p >= 1; p--) {
          if (hit(p, d)) streak++;
          else break;
        }
        var c5 = cntRange(d, Math.max(1, cur - 4), cur);
        var c7 = cntRange(d, Math.max(1, cur - 6), cur);
        var item = null;
        if (streak === 4) item = { d: d, sc: 95.3, tag: "连出4" };
        else if (streak === 3) item = { d: d, sc: 93.9, tag: "连出3" };
        else if (c5 === 3) item = { d: d, sc: 92.5, tag: "5期3次" };
        else if (c7 === 4) item = { d: d, sc: 92.1, tag: "7期4次" };
        if (item) picks.push(item);
      }
      picks.sort(function (a, b) { return b.sc - a.sc || a.d - b.d; });
      return picks.slice(0, k);
    }

    function buildPrediction(cur) {
      return {
        basedOn: cur,
        target: cur + 1,
        doubleRecommendation: pickTopAt(cur, 2).map(function (p) {
          return { tail: p.d, score: p.sc, tag: p.tag, grade: gradeOf(p.sc) };
        }),
        weightedBounce: weightedPickAt(cur, 2).map(function (p) {
          return {
            tail: p.d,
            score: p.score,
            miss: p.miss,
            maxMiss: p.maxMiss,
            ratio: p.ratio,
            weightedBounceRate: p.wbr,
            sample: p.wbSample
          };
        })
      };
    }

    return {
      periods: periods,
      hit: hit,
      tailsOf: tailsOf,
      pickTopAt: pickTopAt,
      weightedPickAt: weightedPickAt,
      buildPrediction: buildPrediction,
      gradeOf: gradeOf,
      baseRate: BASE_RATE,
      thresholds: NEW_MODEL,
      bounceCritical: BOUNCE
    };
  }

  return {
    createModel: createModel,
    gradeOf: gradeOf,
    GRADE_TIERS: GRADE_TIERS,
    SCORE_BUCKETS: SCORE_BUCKETS,
    scoreBucketOf: scoreBucketOf,
    wilson: wilson,
    riskOf: riskOf,
    BASE_RATE_SINGLE: BASE_RATE_SINGLE
  };
});
