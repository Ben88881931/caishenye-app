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
          return { tail: p.d, score: p.sc, tag: p.tag };
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
      baseRate: BASE_RATE,
      thresholds: NEW_MODEL,
      bounceCritical: BOUNCE
    };
  }

  return { createModel: createModel };
});
