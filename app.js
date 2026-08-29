(function () {
  "use strict";

  var RAW = window.APP_DATA.raw;
  var D = window.APP_DATA.d;

  var periods = Object.keys(RAW)
    .map(Number)
    .sort(function (a, b) { return a - b; });
  var latest = periods[periods.length - 1];

  var byYearPeriod = new Map();
  D.forEach(function (e) {
    byYearPeriod.set(e.y + "-" + e.p, e);
  });

  function rec(year, period) {
    return byYearPeriod.get(year + "-" + period);
  }

  function bin(period) {
    return RAW[String(period)];
  }

  function tailsOf(period) {
    var b = bin(period);
    var out = [];
    for (var i = 0; i < 10; i++) {
      if (b[i] === "1") out.push(i);
    }
    return out;
  }

  function hit(period, tail) {
    return bin(period)[tail] === "1";
  }

  function currentMiss(tail) {
    var m = 0;
    for (var i = periods.length - 1; i >= 0; i--) {
      if (hit(periods[i], tail)) break;
      m++;
    }
    return m;
  }

  function maxMiss(tail) {
    var m = 0, run = 0;
    periods.forEach(function (p) {
      if (hit(p, tail)) {
        run = 0;
      } else {
        run++;
        if (run > m) m = run;
      }
    });
    return m;
  }

  function countWindow(tail, w) {
    var c = 0;
    for (var i = periods.length - 1; i >= Math.max(0, periods.length - w); i--) {
      if (hit(periods[i], tail)) c++;
    }
    return c;
  }

  function reversalRate(tail) {
    var total = 0, hits = 0;
    for (var i = 1; i < periods.length; i++) {
      if (!hit(periods[i - 1], tail)) {
        total++;
        if (hit(periods[i], tail)) hits++;
      }
    }
    return total ? hits / total : 0;
  }

  // 理论基准率：1-49 中，尾数 0 只有 4 个号(10/20/30/40)，尾数 1-9 各有 5 个号。
  // 每期开 7 个不同号码，尾数至少出现一次的概率 = 1 - C(49-c,7)/C(49,7)。
  var BASE_RATE = [0.4717, 0.5539, 0.5539, 0.5539, 0.5539, 0.5539, 0.5539, 0.5539, 0.5539, 0.5539];

  function missRebound(tail) {
    var k = currentMiss(tail);
    var total = 0, hits = 0, run = 0;
    for (var i = 0; i < periods.length - 1; i++) {
      if (hit(periods[i], tail)) {
        run = 0;
      } else {
        run++;
        if (run >= k) {
          total++;
          if (hit(periods[i + 1], tail)) hits++;
        }
      }
    }
    return { k: k, hits: hits, total: total, rate: total ? hits / total : 0 };
  }

  function countEnding(tail, upto, w) {
    var c = 0;
    for (var j = Math.max(0, upto - w + 1); j <= upto; j++) {
      if (hit(periods[j], tail)) c++;
    }
    return c;
  }

  function missedRun(tail, upto, k) {
    for (var j = upto; j > upto - k && j >= 0; j--) {
      if (hit(periods[j], tail)) return false;
    }
    return true;
  }

  function zScore(tail, w) {
    var c = countWindow(tail, w);
    var p = BASE_RATE[tail];
    var exp = w * p;
    var sd = Math.sqrt(w * p * (1 - p));
    return { count: c, expected: exp, rate: c / w, base: p, diff: c / w - p, z: sd > 0 ? (c - exp) / sd : 0 };
  }

  function backtestSignal(name, isSignal) {
    var n = 0, hitSum = 0, baseSum = 0;
    for (var i = 15; i < periods.length - 1; i++) {
      for (var t = 0; t < 10; t++) {
        if (isSignal(t, i)) {
          n++;
          if (hit(periods[i + 1], t)) hitSum++;
          baseSum += BASE_RATE[t];
        }
      }
    }
    return { name: name, n: n, avgHit: n ? hitSum / n : 0, avgBase: n ? baseSum / n : 0, edge: n ? (hitSum - baseSum) / n : 0 };
  }

  function segsOf(w) {
    var segs = [];
    for (var st = 0; st < periods.length; st += w) {
      var en = Math.min(st + w - 1, periods.length - 1);
      segs.push({ si: st, ei: en, s: periods[st], e: periods[en], len: en - st + 1 });
    }
    return segs;
  }

  function futureSegment(w, segs) {
    var last = segs[segs.length - 1];
    if (!last || last.len !== w) return null;
    return {
      si: periods.length,
      ei: periods.length + w - 1,
      s: last.e + 1,
      e: last.e + w,
      len: 0,
      c: 0,
      rate: 0,
      future: true
    };
  }

  function countInSeg(tail, a, b) {
    var c = 0;
    for (var i = a; i <= b; i++) {
      if (hit(periods[i], tail)) c++;
    }
    return c;
  }

  function tailSegs(tail, w) {
    return segsOf(w).map(function (seg) {
      var c = countInSeg(tail, seg.si, seg.ei);
      return { si: seg.si, ei: seg.ei, s: seg.s, e: seg.e, len: seg.len, c: c, rate: c / w };
    });
  }

  function segColorClass(rate) {
    if (rate >= 0.7) return "seg-hot";
    if (rate >= 0.6) return "seg-warm";
    if (rate >= 0.5) return "seg-norm";
    if (rate >= 0.4) return "seg-cool";
    if (rate >= 0.3) return "seg-cold";
    return "seg-ice";
  }

  function segTextLabel(rate) {
    if (rate >= 0.7) return "热";
    if (rate >= 0.6) return "暖";
    if (rate >= 0.5) return "平";
    if (rate >= 0.4) return "凉";
    if (rate >= 0.3) return "冷";
    return "冰";
  }

  function segStats(tail, w) {
    var arr = tailSegs(tail, w);
    if (!arr.length) return null;
    var max = -Infinity, min = Infinity, sum = 0;
    var labels = {};
    arr.forEach(function (e) {
      var r = e.rate;
      if (r > max) max = r;
      if (r < min) min = r;
      sum += r;
      var l = segTextLabel(r);
      labels[l] = (labels[l] || 0) + 1;
    });
    var most = "", mostCnt = 0;
    Object.keys(labels).forEach(function (l) {
      if (labels[l] > mostCnt) { most = l; mostCnt = labels[l]; }
    });
    var range = max - min;
    var rangeLabel = range >= 50 ? "大" : range >= 30 ? "中" : "小";
    return {
      max: max, min: min, avg: sum / arr.length, most: most, mostCnt: mostCnt,
      total: arr.length, range: range, rangeLabel: rangeLabel,
      rule: "最高" + Math.round(max) + "% 最低" + Math.round(min) + "% 最频" + most + "(" + mostCnt + "/" + arr.length + ")"
    };
  }

  function segStatus(cnt, w) {
    if (w <= 7) {
      if (cnt <= w * 0.2) return "冷";
      if (cnt >= w * 0.7) return "热";
      return "中";
    }
    if (cnt <= w * 0.33) return "冷";
    if (cnt >= w * 0.66) return "热";
    return "中";
  }

  function predictSegmentCount(tail, w) {
    var arr = tailSegs(tail, w);
    if (!arr.length) return { pred: w * BASE_RATE[tail], sample: 0, lo: 0, hi: w, method: "基准" };
    var cur = arr[arr.length - 1];
    var nexts = [];
    for (var i = 0; i < arr.length - 1; i++) {
      if (segStatus(arr[i].c, w) === segStatus(cur.c, w)) nexts.push(arr[i + 1].c);
    }
    var method = "同类状态";
    if (nexts.length < 3) {
      nexts = [];
      for (var j = 0; j < arr.length - 1; j++) {
        if (Math.abs(arr[j].c - cur.c) <= 1) nexts.push(arr[j + 1].c);
      }
      method = "相近次数";
    }
    if (nexts.length < 3) {
      nexts = arr.slice(1).map(function (e) { return e.c; });
      method = "全历史";
    }
    if (!nexts.length) return { pred: w * BASE_RATE[tail], sample: 0, lo: 0, hi: w, method: "基准" };
    var sum = nexts.reduce(function (a, b) { return a + b; }, 0);
    return {
      pred: sum / nexts.length,
      sample: nexts.length,
      lo: Math.min.apply(null, nexts),
      hi: Math.max.apply(null, nexts),
      method: method
    };
  }

  function missRunAt(tail, upto) {
    var run = 0;
    for (var i = upto; i >= 0; i--) {
      if (hit(periods[i], tail)) break;
      run++;
    }
    return run;
  }

  var CN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十'];

  function buildMissInfo() {
    var info = {};
    for (var d = 0; d < 10; d++) {
      info[d] = {};
      var lastOpen = -1;
      for (var i = 0; i < periods.length; i++) {
        var period = periods[i];
        if (hit(period, d)) {
          if (lastOpen >= 0 && period > lastOpen + 1) {
            var cycleLen = period - lastOpen - 1;
            var cls = cycleLen >= 3 ? "cell-miss3" : cycleLen === 2 ? "cell-miss2" : "cell-miss1";
            for (var p = lastOpen + 1; p < period; p++) {
              info[d][p] = { cls: cls, mark: 0 };
            }
            info[d][period - 1] = { cls: cls, mark: cycleLen };
          }
          lastOpen = period;
        }
      }
      var latestPeriod = periods[periods.length - 1];
      if (lastOpen >= 0 && latestPeriod > lastOpen) {
        var cycleLen2 = latestPeriod - lastOpen;
        var cls2 = cycleLen2 >= 3 ? "cell-miss3" : cycleLen2 === 2 ? "cell-miss2" : "cell-miss1";
        for (var p2 = lastOpen + 1; p2 <= latestPeriod; p2++) {
          info[d][p2] = { cls: cls2, mark: 0 };
        }
        info[d][latestPeriod] = { cls: cls2, mark: cycleLen2 };
      }
    }
    return info;
  }

  var MISS_INFO = buildMissInfo();

  function statusOf(rate, w) {
    if (w <= 7) {
      if (rate <= 0.2) return "冷";
      if (rate >= 0.7) return "热";
      return "中";
    }
    if (rate <= 0.33) return "冷";
    if (rate >= 0.66) return "热";
    return "中";
  }

  function rateAt(tail, uptoIndex, w) {
    if (uptoIndex < w - 1) return null;
    var c = 0;
    for (var i = uptoIndex - w + 1; i <= uptoIndex; i++) {
      if (hit(periods[i], tail)) c++;
    }
    return c / w;
  }

  var state = {
    tab: lsGet("v2_current_tab", "overview"),
    window: 15,
    segWindow: 15,
    segTails: 7,
    segCount: 0,
    rollWindow: 10,
    tail: 0,
    year: latest ? rec(2026, latest) ? 2026 : 2026 : 2026,
    recordPage: 0,
  };

  var TABS = [
    { id: "overview", label: "总览" },
    { id: "personality", label: "尾号性格" },
    { id: "segments", label: "分段对比" },
    { id: "windowk", label: "窗口走势" },
    { id: "trend", label: "遗漏热图" },
    { id: "missorder", label: "遗漏排序" },
    { id: "parity", label: "单双热图" },
    { id: "predict", label: "下期预估" },
    { id: "datarecord", label: "三期规律" },
    { id: "miss", label: "遗漏监控" },
    { id: "tails", label: "冷热分析" },
    { id: "backtest", label: "策略回测" },
    { id: "zodrecords", label: "生肖开奖" },
    { id: "numtrend", label: "号码走势" },
    { id: "zodtrend", label: "生肖走势" },
    { id: "order", label: "下单追投" },
  ];

  var view = document.getElementById("view");
  var tabsEl = document.getElementById("tabs");

  function el(html) {
    var t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function pct(x, digits) {
    return (x * 100).toFixed(digits == null ? 1 : digits) + "%";
  }

  function renderTabs() {
    tabsEl.innerHTML = TABS.map(function (t) {
      if (t.group) return '<span class="tab-group">' + t.group + "</span>";
      return '<button class="tab ' + (state.tab === t.id ? "is-active" : "") +
        '" data-tab="' + t.id + '">' + t.label + "</button>";
    }).join("");
  }

  function renderHeader() {
    document.getElementById("latestPeriod").textContent = latest;
    document.getElementById("latestTails").textContent = "尾 " + tailsOf(latest).join(" ");
  }

  function scrollToLatest() {
    var sc = view.querySelector(".trend-scroll, .heatmap, .seg-hist-scroll");
    if (sc) {
      sc.scrollTop = sc.scrollHeight;
      return;
    }
    var lastRecord = view.querySelector(".record:last-child");
    if (lastRecord) lastRecord.scrollIntoView({ block: "end" });
  }

  function render() {
    renderTabs();
    if (state.tab === "overview") renderOverview();
    else if (state.tab === "tails") renderTails();
    else if (state.tab === "segments") renderSegments();
    else if (state.tab === "miss") renderMiss();
    else if (state.tab === "trend") renderTrend();
    else if (state.tab === "windowk") renderWindowK();
    else if (state.tab === "missorder") view.innerHTML = renderMissOrderHeatmap();
    else if (state.tab === "parity") view.innerHTML = renderParityHeatmap();
    else if (state.tab === "numtrend") renderNumTrend();
    else if (state.tab === "zodtrend") renderZodTrend();
    else if (state.tab === "zodrecords") renderZodRecords();
    else if (state.tab === "records") renderRecords();
    else if (state.tab === "history") renderHistory();
    else if (state.tab === "backtest") renderBacktest();
    else if (state.tab === "order") renderOrder();
    else if (state.tab === "predict") renderPredict();
    else if (state.tab === "personality") renderPersonality();
    else if (state.tab === "datarecord") renderDataRecord();
    scrollToLatest();
  }

  function renderOverview() {
    var latestRec = rec(2026, latest);
    var latestTails = tailsOf(latest);

    var freq = [];
    for (var t = 0; t < 10; t++) freq.push({ tail: t, count: countWindow(t, 15) });
    var maxFreq = Math.max.apply(null, freq.map(function (f) { return f.count; }));

    var misses = [];
    for (var d = 0; d < 10; d++) misses.push({ tail: d, miss: currentMiss(d) });
    var topMiss = misses.slice().sort(function (a, b) { return b.miss - a.miss; })[0];

    var refs = [];
    for (var k = 0; k < 10; k++) {
      if (!hit(latest, k)) {
        var mb = missRebound(k);
        refs.push({
          tail: k,
          miss: mb.k,
          base: BASE_RATE[k],
          rate: mb.rate,
          sample: mb.total,
          edge: mb.total ? mb.rate - BASE_RATE[k] : 0
        });
      }
    }
    refs.sort(function (a, b) { return b.edge - a.edge; });

    var html = "";
    html += '<div class="section">';
    html += '<div class="grid-3">';
    html += '<div class="stat"><div class="stat__value">' + latest + "</div><div class=\"stat__label\">最新期数</div></div>";
    html += '<div class="stat"><div class="stat__value">' + latestTails.length + "</div><div class=\"stat__label\">本期尾数</div></div>";
    html += '<div class="stat"><div class="stat__value">尾' + topMiss.tail + "</div><div class=\"stat__label\">遗漏最长 " + topMiss.miss + " 期</div></div>";
    html += "</div></div>";

    if (latestRec) {
      html += '<div class="section"><div class="section__head"><h2 class="section__title">第 ' + latest + " 期开奖</h2></div>";
      html += '<div class="panel"><div class="panel__body"><div class="num-list">';
      latestRec.nums.forEach(function (n, i) {
        html += '<div style="text-align:center"><div class="num">' + n + '</div><div class="zod">' + latestRec.zods[i] + "</div></div>";
      });
      html += "</div></div></div></div>";
    }

    html += '<div class="section"><div class="section__head"><h2 class="section__title">近 15 期尾数频次</h2><span class="section__hint">共 ' + maxFreq + " 次为上限</span></div>";
    html += '<div class="panel"><div class="panel__body"><div class="bars">';
    freq.forEach(function (f) {
      var width = maxFreq ? Math.round(f.count / maxFreq * 100) : 0;
      html += '<div class="bar-row"><span class="bar-row__label">' + f.tail + '</span><div class="bar-track"><div class="bar-fill" style="width:' + width + '%"></div></div><span class="bar-row__value">' + f.count + "</span></div>";
    });
    html += "</div></div></div></div>";

    html += '<div class="section"><div class="section__head"><h2 class="section__title">统计参考</h2><span class="section__hint">上期未出 · 与理论基准对比</span></div>';
    html += '<div class="panel"><table class="table"><thead><tr><th>尾数</th><th>遗漏</th><th>基准率</th><th>遗漏后开出</th><th>样本</th><th>差值</th><th>判定</th></tr></thead><tbody>';
    refs.forEach(function (r) {
      var verdict = "无信号";
      if (r.sample >= 20 && r.edge >= 0.04) verdict = "偏热";
      else if (r.sample >= 20 && r.edge <= -0.04) verdict = "偏冷";
      var verdictCls = verdict === "偏热" ? "cell--hot" : verdict === "偏冷" ? "cell--cold" : "";
      html += "<tr><td>" + r.tail + '</td><td class="' + (r.miss >= 4 ? "cell--hot" : "cell--cold") + '">' + r.miss + '</td><td>' + pct(r.base) + "</td><td>" + pct(r.rate) + "</td><td>" + r.sample + '</td><td>' + (r.edge >= 0 ? "+" : "") + pct(r.edge) + '</td><td class="' + verdictCls + '">' + verdict + "</td></tr>";
    });
    html += "</tbody></table></div></div>";

    html += '<p class="disclaimer">尾数 0 的理论出现率约 47%，尾数 1-9 约 55%（因为 1-49 中尾数 0 只有 4 个号，其余各有 5 个号）。差值需样本足够才有参考意义；当前多数信号都在统计噪声范围内，不应据此追号。</p>';

    view.innerHTML = html;
  }

  function renderTails() {
    var w = state.window;
    var html = '<div class="section"><div class="section__head"><h2 class="section__title">冷热分析</h2></div>';
    html += '<div class="chips">';
    [5, 7, 10, 15, 20, 27, 30].forEach(function (n) {
      html += '<button class="chip ' + (w === n ? "is-active" : "") + '" data-window="' + n + '">' + n + " 期</button>";
    });
    html += "</div></div>";

    html += '<div class="section"><div class="panel"><table class="table"><thead><tr><th>尾数</th><th>近 ' + w + " 期</th><th>期望</th><th>偏离</th><th>判定</th><th>当前遗漏</th></tr></thead><tbody>";
    for (var t = 0; t < 10; t++) {
      var z = zScore(t, w);
      var miss = currentMiss(t);
      var verdict = "正常", cls = "";
      if (z.z >= 2) { verdict = "偏热"; cls = "cell--hot"; }
      else if (z.z <= -2) { verdict = "偏冷"; cls = "cell--cold"; }
      html += "<tr><td>" + t + '</td><td>' + z.count + "/" + w + "</td><td>" + z.expected.toFixed(1) + '</td><td>' + (z.diff >= 0 ? "+" : "") + pct(z.diff) + '</td><td class="' + cls + '">' + verdict + '</td><td class="cell--' + (miss >= 4 ? "hot" : "cold") + '">' + miss + " 期</td></tr>";
    }
    html += "</tbody></table></div></div>";
    html += '<p class="disclaimer">偏离 = 实际开出率减去该尾数理论基准率；判定按 z 分数（|z|≥2 视为显著偏离），已考虑尾数 0 与 1-9 的天然差异。</p>';

    view.innerHTML = html;
  }

  function missClass(m) {
    if (m <= 1) return "miss-0";
    if (m === 2) return "miss-2";
    if (m === 3) return "miss-3";
    if (m >= 4) return "miss-5";
    return "";
  }

  function renderMiss() {
    var html = '<div class="section"><div class="section__head"><h2 class="section__title">遗漏监控</h2><span class="section__hint">颜色越深，遗漏越久</span></div>';
    html += '<div class="panel"><table class="table"><thead><tr><th>尾数</th><th>当前遗漏</th><th>历史最大</th><th>近 5 次遗漏</th></tr></thead><tbody>';
    for (var t = 0; t < 10; t++) {
      var miss = currentMiss(t);
      var max = maxMiss(t);
      var history = recentMisses(t, 5);
      html += '<tr><td>' + t + '</td><td class="' + missClass(miss) + '">' + miss + " 期</td><td>" + max + " 期</td><td>" + history.join(" · ") + "</td></tr>";
    }
    html += "</tbody></table></div></div>";
    html += '<p class="disclaimer">当前遗漏 = 截至最新一期连续未开出的期数。</p>';
    view.innerHTML = html;
  }

  function recentMisses(tail, n) {
    var out = [];
    var run = 0;
    for (var i = periods.length - 1; i >= 0 && out.length < n; i--) {
      if (hit(periods[i], tail)) {
        if (run > 0) out.push(run);
        run = 0;
      } else {
        run++;
      }
    }
    while (out.length < n) out.push(0);
    return out;
  }

  function lastOpenIdx(tail) {
    for (var i = periods.length - 1; i >= 0; i--) {
      if (hit(periods[i], tail)) return i;
    }
    return -1;
  }

  function missOrderTails() {
    var arr = [];
    for (var t = 0; t < 10; t++) {
      var run = 0, runStart = 0, evStart = -1, evEnd = -1;
      for (var i = 0; i < periods.length; i++) {
        if (hit(periods[i], t)) {
          if (run >= 3) {
            evStart = runStart;
            evEnd = periods[i - 1];
          }
          run = 0;
        } else {
          if (run === 0) runStart = periods[i];
          run++;
        }
      }
      if (run >= 3) {
        evStart = runStart;
        evEnd = periods[periods.length - 1];
      }
      arr.push({ tail: t, evStart: evStart, evEnd: evEnd });
    }
    arr.sort(function (a, b) {
      if (a.evEnd !== b.evEnd) return a.evEnd - b.evEnd;
      if (a.evStart !== b.evStart) return a.evStart - b.evStart;
      return a.tail - b.tail;
    });
    return arr.map(function (x) { return x.tail; });
  }

  function renderMissOrderHeatmap() {
    var order = missOrderTails();
    var html = '<div class="section"><div class="section__head"><h2 class="section__title">遗漏排序热图</h2><span class="section__hint">按最近遗漏满3期排序，最新放最后</span></div>';
    html += '<div class="panel"><div class="panel__body heatmap"><table class="heatmap__table"><thead><tr><th class="row-label">期</th><th>开出</th><th>个</th>';
    order.forEach(function (t) {
      html += '<th>尾' + t + '<span class="heat-order-miss">漏' + currentMiss(t) + '</span></th>';
    });
    html += "</tr></thead><tbody>";

    periods.forEach(function (p) {
      var drawn = tailsOf(p);
      html += '<tr><td class="row-label">' + p + '</td><td class="open-tails">' + drawn.join(" ") + '</td><td class="open-count">' + drawn.length + "</td>";
      order.forEach(function (d) {
        if (hit(p, d)) {
          html += '<td><span class="heat-cell cell-hit">' + d + "</span></td>";
        } else {
          var mi = MISS_INFO[d][p];
          var cls = mi ? mi.cls : "cell-miss1";
          var mark = (mi && mi.mark > 0) ? (CN[mi.mark] || mi.mark) : "";
          html += '<td><span class="heat-cell ' + cls + '">' + mark + "</span></td>";
        }
      });
      html += "</tr>";
    });

    html += "</tbody></table></div></div>";
    html += '<p class="disclaimer">排序规则：按每个尾数最近一次遗漏满 3 期及以上的时间排序，旧的放左、最新的放右；正在遗漏满 3 期及以上的放在最后。</p>';
    return html;
  }

  function renderParityHeatmap() {
    var allOrder = missOrderTails();
    var order = allOrder.filter(function (t) { return t % 2 === 1; }).concat(allOrder.filter(function (t) { return t % 2 === 0; }));
    var splitIdx = order.length;
    for (var si = 0; si < order.length; si++) {
      if (order[si] % 2 === 0) { splitIdx = si; break; }
    }

    var html = '<div class="section"><div class="section__head"><h2 class="section__title">单双热图</h2><span class="section__hint">单数在左 · 双数在右 · 按最近遗漏满3期排序</span></div>';
    html += '<div class="panel"><div class="panel__body heatmap"><table class="heatmap__table"><thead><tr><th class="row-label">期</th><th>开出</th><th>个</th>';
    order.forEach(function (t, i) {
      if (i === splitIdx) html += '<th class="heat-order-divider"></th>';
      html += '<th>尾' + t + '<span class="heat-order-miss">漏' + currentMiss(t) + '</span></th>';
    });
    html += "</tr></thead><tbody>";

    periods.forEach(function (p) {
      var drawn = tailsOf(p);
      html += '<tr><td class="row-label">' + p + '</td><td class="open-tails">' + drawn.join(" ") + '</td><td class="open-count">' + drawn.length + "</td>";
      order.forEach(function (d, i) {
        if (i === splitIdx) html += '<td class="heat-order-divider"></td>';
        if (hit(p, d)) {
          html += '<td><span class="heat-cell cell-hit">' + d + "</span></td>";
        } else {
          var mi = MISS_INFO[d][p];
          var cls = mi ? mi.cls : "cell-miss1";
          var mark = (mi && mi.mark > 0) ? (CN[mi.mark] || mi.mark) : "";
          html += '<td><span class="heat-cell ' + cls + '">' + mark + "</span></td>";
        }
      });
      html += "</tr>";
    });

    html += "</tbody></table></div></div>";
    html += '<p class="disclaimer">单数尾数放左、双数尾数放右；左右两侧内部都按最近一次遗漏满 3 期及以上的时间排序，最新放最右。</p>';
    return html;
  }

  function renderTrend() {
    var heatPeriods = periods;
    var html = '<div class="section"><div class="section__head"><h2 class="section__title">遗漏热图</h2><span class="section__hint">第 ' + periods[0] + ' 期 - 第 ' + latest + " 期 · 共 " + periods.length + " 期</span></div>";
    html += '<div class="panel"><div class="panel__body heatmap"><table class="heatmap__table"><thead><tr><th class="row-label">期</th><th>开出</th><th>个</th>';
    for (var t = 0; t < 10; t++) html += "<th>" + t + "</th>";
    html += "</tr></thead><tbody>";
    heatPeriods.forEach(function (p) {
      var drawn = tailsOf(p);
      html += '<tr><td class="row-label">' + p + '</td><td class="open-tails">' + drawn.join(" ") + '</td><td class="open-count">' + drawn.length + "</td>";
      for (var d = 0; d < 10; d++) {
        if (hit(p, d)) {
          html += '<td><span class="heat-cell cell-hit">' + d + "</span></td>";
        } else {
          var mi = MISS_INFO[d][p];
          var cls = mi ? mi.cls : "cell-miss1";
          var mark = (mi && mi.mark > 0) ? (CN[mi.mark] || mi.mark) : "";
          html += '<td><span class="heat-cell ' + cls + '">' + mark + "</span></td>";
        }
      }
      html += "</tr>";
    });
    html += "</tbody></table></div></div></div>";

    html += '<div class="section"><div class="section__head"><h2 class="section__title">尾数滚动开出率</h2><span class="section__hint">' + state.rollWindow + ' 期窗口 · 红点 = 开出</span></div>';
    html += '<div class="chips" style="margin-bottom:8px">';
    [5, 7, 10, 15, 20, 30].forEach(function (n) {
      html += '<button class="chip ' + (state.rollWindow === n ? "is-active" : "") + '" data-rollw="' + n + '">' + n + " 期</button>";
    });
    html += "</div>";
    html += '<div class="chips" style="margin-bottom:8px">';
    for (var k = 0; k < 10; k++) {
      html += '<button class="chip ' + (state.tail === k ? "is-active" : "") + '" data-tail="' + k + '">尾 ' + k + "</button>";
    }
    html += "</div>";
    html += '<div class="panel"><div class="panel__body"><div id="linechart" class="linechart"></div></div></div></div>';

    view.innerHTML = html;

    drawLineChart();
    var hm = view.querySelector(".heatmap");
    if (hm) hm.scrollTop = hm.scrollHeight;
  }

  function drawLineChart() {
    var host = document.getElementById("linechart");
    if (!host) return;
    drawCandleChart(host, state.tail, state.rollWindow, 60);
  }

  function drawCandleChart(host, tail, w, count) {
    var start = Math.max(0, periods.length - count);
    var values = [];
    var labels = [];
    for (var i = start; i < periods.length; i++) {
      var r = rateAt(tail, i, w);
      values.push(r == null ? 0 : r * 100);
      labels.push(periods[i]);
    }
    var maxV = Math.max(100, Math.max.apply(null, values));
    var width = 640, height = 180;
    var padL = 34, padR = 8, padT = 10, padB = 20;
    var plotW = width - padL - padR;
    var plotH = height - padT - padB;
    var markers = values.map(function (v, idx) {
      if (!hit(periods[start + idx], tail)) return "";
      var x = padL + (values.length === 1 ? 0 : idx / (values.length - 1) * plotW);
      var y = padT + plotH - (v / maxV) * plotH;
      return '<span class="linechart-dot" style="left:' + (x / width * 100).toFixed(2) + '%;top:' + (y / height * 100).toFixed(2) + '%"></span>';
    }).join("");
    var pts = values.map(function (v, idx) {
      var x = padL + (values.length === 1 ? 0 : idx / (values.length - 1) * plotW);
      var y = padT + plotH - (v / maxV) * plotH;
      return x.toFixed(1) + "," + y.toFixed(1);
    }).join(" ");

    var grid = "";
    var ylabels = "";
    for (var g = 0; g <= 4; g++) {
      var gy = padT + plotH - (g / 4) * plotH;
      grid += '<line x1="' + padL + '" y1="' + gy.toFixed(1) + '" x2="' + (padL + plotW) + '" y2="' + gy.toFixed(1) + '" stroke="#eef0f2" stroke-width="1"/>';
      ylabels += '<text x="' + (padL - 5) + '" y="' + (gy + 3).toFixed(1) + '" font-size="9" fill="#9aa1ab" text-anchor="end">' + (g * 25) + "%</text>";
    }

    var xlabels = "";
    var chartStartP = labels[0];
    var chartEndP = labels[labels.length - 1];
    var segs = [];
    for (var ss = chartStartP; ss <= chartEndP; ss += w) {
      segs.push({ s: ss, e: Math.min(ss + w - 1, chartEndP) });
    }
    var step = Math.max(1, Math.ceil(segs.length / 6));
    var tickMap = {};
    for (var si = 0; si < segs.length; si += step) {
      var seg = segs[si];
      var idx = seg.e - chartStartP;
      if (idx < 0 || idx >= labels.length) continue;
      var lx = padL + (values.length === 1 ? 0 : idx / (values.length - 1) * plotW);
      grid += '<line x1="' + lx.toFixed(1) + '" y1="' + padT + '" x2="' + lx.toFixed(1) + '" y2="' + (padT + plotH) + '" stroke="#f1f3f5" stroke-width="1"/>';
      xlabels += '<text x="' + lx.toFixed(1) + '" y="' + (height - 4) + '" font-size="9" fill="#9aa1ab" text-anchor="middle">' + seg.s + "~" + seg.e + "</text>";
      tickMap[idx] = true;
    }
    var lastSeg = segs[segs.length - 1];
    var lastIdx = lastSeg.e - chartStartP;
    if (!tickMap[lastIdx]) {
      var lx2 = padL + (values.length === 1 ? 0 : lastIdx / (values.length - 1) * plotW);
      xlabels += '<text x="' + lx2.toFixed(1) + '" y="' + (height - 4) + '" font-size="9" fill="#9aa1ab" text-anchor="middle">' + lastSeg.s + "~" + lastSeg.e + "</text>";
    }

    var svg = '<svg viewBox="0 0 ' + width + " " + height + '" preserveAspectRatio="none" style="width:100%;height:180px">' +
      grid +
      '<polyline points="' + pts + '" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<text x="' + padL + '" y="9" font-size="9" fill="#9aa1ab">尾 ' + tail + " " + w + "期走势</text>" +
      ylabels +
      xlabels +
      "</svg>";
    host.innerHTML = '<div style="position:relative;width:100%;height:180px">' + svg + markers + "</div>";
  }

  function drawPeriodChart(host, tail, w, count) {
    if (!host) return;
    var start = Math.max(0, periods.length - count);
    var firstP = periods[start];
    var chartEnd = periods[periods.length - 1];
    var segStart = Math.floor((firstP - 1) / w) * w + 1;
    var labels = [], values = [], score = 0;
    for (var p = segStart; p <= chartEnd; p++) {
      score += hit(p, tail) ? 1 : -1;
      if (p >= firstP) {
        values.push(score);
        labels.push(p);
      }
    }

    var width = 640, height = 180;
    var padL = 34, padR = 8, padT = 10, padB = 20;
    var plotW = width - padL - padR;
    var plotH = height - padT - padB;
    var maxV = w;

    function yOf(v) { return padT + (w - v) / (2 * w) * plotH; }

    var pts = values.map(function (v, idx) {
      var x = padL + (values.length === 1 ? 0 : idx / (values.length - 1) * plotW);
      return x.toFixed(1) + "," + yOf(v).toFixed(1);
    }).join(" ");

    var grid = "", ylabels = "";
    [-w, 0, w].forEach(function (level) {
      var gy = yOf(level);
      var isZero = level === 0;
      grid += '<line x1="' + padL + '" y1="' + gy.toFixed(1) + '" x2="' + (padL + plotW) + '" y2="' + gy.toFixed(1) + '" stroke="' + (isZero ? "#9aa1ab" : "#eef0f2") + '" stroke-width="' + (isZero ? 1.5 : 1) + '"/>';
      ylabels += '<text x="' + (padL - 5) + '" y="' + (gy + 3).toFixed(1) + '" font-size="9" fill="#9aa1ab" text-anchor="end">' + (level > 0 ? "+" : "") + level + "</text>";
    });

    var xlabels = "";
    var chartStartP = labels[0];
    var chartEndP = labels[labels.length - 1];
    var segs = [];
    for (var ss = chartStartP; ss <= chartEndP; ss += w) {
      segs.push({ s: ss, e: Math.min(ss + w - 1, chartEndP) });
    }
    var step = Math.max(1, Math.ceil(segs.length / 6));
    var tickMap = {};
    for (var si = 0; si < segs.length; si += step) {
      var seg = segs[si];
      var idx = seg.e - chartStartP;
      if (idx < 0 || idx >= labels.length) continue;
      var lx = padL + (values.length === 1 ? 0 : idx / (values.length - 1) * plotW);
      grid += '<line x1="' + lx.toFixed(1) + '" y1="' + padT + '" x2="' + lx.toFixed(1) + '" y2="' + (padT + plotH) + '" stroke="#f1f3f5" stroke-width="1"/>';
      xlabels += '<text x="' + lx.toFixed(1) + '" y="' + (height - 4) + '" font-size="9" fill="#9aa1ab" text-anchor="middle">' + seg.s + "~" + seg.e + "</text>";
      tickMap[idx] = true;
    }
    var lastSeg = segs[segs.length - 1];
    var lastIdx = lastSeg.e - chartStartP;
    if (!tickMap[lastIdx]) {
      var lx2 = padL + (values.length === 1 ? 0 : lastIdx / (values.length - 1) * plotW);
      xlabels += '<text x="' + lx2.toFixed(1) + '" y="' + (height - 4) + '" font-size="9" fill="#9aa1ab" text-anchor="middle">' + lastSeg.s + "~" + lastSeg.e + "</text>";
    }

    var svg = '<svg viewBox="0 0 ' + width + " " + height + '" preserveAspectRatio="none" style="width:100%;height:180px">' +
      grid +
      '<polyline points="' + pts + '" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<text x="' + padL + '" y="9" font-size="9" fill="#9aa1ab">尾 ' + tail + " " + w + "期每期浮动</text>" +
      ylabels +
      xlabels +
      "</svg>";
    host.innerHTML = svg;
  }

  function renderWindowK() {
    var windows = [5, 7, 10, 15, 21, 30];
    var html = '<div class="section"><div class="section__head"><h2 class="section__title">窗口走势</h2><span class="section__hint">每个窗口内，每期开出上浮、未开出下浮</span></div>';
    html += '<div class="chips" style="margin-bottom:8px">';
    for (var t = 0; t < 10; t++) {
      html += '<button class="chip ' + (state.tail === t ? "is-active" : "") + '" data-wk-tail="' + t + '">尾 ' + t + "</button>";
    }
    html += "</div></div>";
    windows.forEach(function (w) {
      html += '<div class="section"><div class="section__head"><h2 class="section__title">' + w + "期窗口</h2><span class=\"section__hint\">尾 " + state.tail + "</span></div>";
      html += '<div class="panel"><div class="panel__body"><div id="wkchart-' + w + '" class="linechart"></div></div></div></div>';
    });
    view.innerHTML = html;
    windows.forEach(function (w) {
      drawPeriodChart(document.getElementById("wkchart-" + w), state.tail, w, 60);
    });
  }

  function drawZodiacBars() {
    var host = document.getElementById("zodchart");
    if (!host) return;
    var ZODIACS = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];
    var counts = {};
    ZODIACS.forEach(function (z) { counts[z] = 0; });
    D.forEach(function (e) {
      if (e.y === state.year) {
        e.zods.forEach(function (z) { counts[z]++; });
      }
    });
    var max = Math.max.apply(null, ZODIACS.map(function (z) { return counts[z]; }));
    host.innerHTML = ZODIACS.map(function (z) {
      var width = max ? Math.round(counts[z] / max * 100) : 0;
      return '<div class="bar-row"><span class="bar-row__label">' + z + '</span><div class="bar-track"><div class="bar-fill" style="width:' + width + '%"></div></div><span class="bar-row__value">' + counts[z] + "</span></div>";
    }).join("");
  }

  function recordCard(r) {
    var balls = "";
    for (var j = 0; j < r.nums.length; j++) {
      var n = r.nums[j];
      balls += '<div style="text-align:center"><div class="num c' + numberColorOf(n) + '">' + (n < 10 ? "0" + n : n) + '</div><div class="zod">' + r.zods[j] + "</div></div>";
    }
    return '<div class="record"><div class="record__top"><span class="record__period">第 ' + r.p + ' 期</span><span class="record__meta">' + r.y + " · 太岁 " + r.tai + '</span></div><div class="num-list">' + balls + "</div></div>";
  }

  function renderRecords() {
    var year = state.year;
    var list = D.filter(function (e) { return e.y === year; }).sort(function (a, b) { return b.p - a.p; });
    var pageSize = 10;
    var totalPages = Math.max(1, Math.ceil(list.length / pageSize));
    if (state.recordPage >= totalPages) state.recordPage = totalPages - 1;
    var page = list.slice(state.recordPage * pageSize, state.recordPage * pageSize + pageSize);

    var html = '<div class="section"><div class="section__head"><h2 class="section__title">7号开奖</h2><span class="section__hint">7 号码 + 生肖</span></div>';
    html += '<div class="chips" style="margin-bottom:8px">';
    [2026, 2025, 2024, 2023, 2022, 2021].forEach(function (y) {
      html += '<button class="chip ' + (year === y ? "is-active" : "") + '" data-year="' + y + '">' + y + "</button>";
    });
    html += "</div></div>";

    html += '<div class="section"><div class="panel">';
    if (!page.length) {
      html += '<div class="empty">暂无记录</div>';
    } else {
      page.forEach(function (r) {
        html += recordCard(r);
      });
    }
    html += "</div></div>";

    html += '<div class="pager"><button data-prev="1" ' + (state.recordPage === 0 ? "disabled" : "") + '>上一页</button><span>' + (state.recordPage + 1) + " / " + totalPages + '</span><button data-next="1" ' + (state.recordPage >= totalPages - 1 ? "disabled" : "") + '>下一页</button></div>';

    view.innerHTML = html;
  }

  function renderBacktest() {
    var signals = [
      backtestSignal("热号跟踪（近15期≥10次）", function (t, i) { return countEnding(t, i, 15) >= 10; }),
      backtestSignal("冷号反弹（近15期≤5次）", function (t, i) { return countEnding(t, i, 15) <= 5; }),
      backtestSignal("遗漏≥2期后反弹", function (t, i) { return missedRun(t, i, 2); }),
      backtestSignal("遗漏≥3期后反弹", function (t, i) { return missedRun(t, i, 3); })
    ];
    var html = '<div class="section"><div class="section__head"><h2 class="section__title">策略回测</h2><span class="section__hint">信号出现后，下一期真实命中率 vs 理论基准</span></div>';
    html += '<div class="panel"><table class="table"><thead><tr><th>信号</th><th>样本</th><th>实际命中</th><th>基准</th><th>差值</th><th>结论</th></tr></thead><tbody>';
    signals.forEach(function (s) {
      var verdict = "无优势", cls = "";
      if (s.n < 50) { verdict = "样本不足"; }
      else if (s.edge >= 0.03) { verdict = "略优"; cls = "cell--hot"; }
      else if (s.edge <= -0.03) { verdict = "略劣"; cls = "cell--cold"; }
      html += "<tr><td>" + s.name + '</td><td>' + s.n + '</td><td>' + pct(s.avgHit) + '</td><td>' + pct(s.avgBase) + '</td><td>' + (s.edge >= 0 ? "+" : "") + pct(s.edge) + '</td><td class="' + cls + '">' + verdict + "</td></tr>";
    });
    html += "</tbody></table></div></div>";
    html += '<p class="disclaimer">结论 = 信号出现后，下一期实际命中率与理论基准率的平均差值。差值接近 0 说明该信号没有稳定预测能力，不应据此加注。</p>';
    view.innerHTML = html;
  }

  function renderSegHistory(w, tails, segCount) {
    var allSegs = segsOf(w);
    var tailMap = {};
    tails.forEach(function (t) { tailMap[t] = tailSegs(t, w); });
    var viewSegs = (segCount > 0 && segCount < allSegs.length) ? allSegs.slice(-segCount) : allSegs;
    var nextSeg = futureSegment(w, allSegs);
    if (nextSeg) viewSegs.push(nextSeg);

    var html = '<div class="section"><div class="section__head"><h2 class="section__title">历史分段</h2><span class="section__hint">第 ' + allSegs[0].s + '-' + allSegs[allSegs.length - 1].e + " 期 · 共 " + allSegs.length + " 段</span></div>";

    html += '<div class="chips" style="margin-bottom:8px">';
    [[0, "全部"], [20, "近20段"], [15, "近15段"], [10, "近10段"], [8, "近8段"]].forEach(function (opt) {
      html += '<button class="chip ' + (segCount === opt[0] ? "is-active" : "") + '" data-segcount="' + opt[0] + '">' + opt[1] + "</button>";
    });
    html += "</div>";

    html += '<div class="panel"><div class="panel__body seg-hist-scroll"><table class="seg-hist-table"><thead><tr><th class="seg-hist-label">段</th>';
    tails.forEach(function (t) { html += "<th>尾" + t + "</th>"; });
    html += "</tr></thead><tbody>";

    viewSegs.forEach(function (seg) {
      if (seg.future) {
        html += '<tr><td class="seg-hist-label">' + seg.s + "-" + seg.e + "期</td>";
        tails.forEach(function (t) {
          var pr = predictSegmentCount(t, w);
          html += '<td class="seg-hist-cell seg-ice"><span class="seg-hist-period">' + seg.s + '-' + seg.e + '期</span><span class="seg-hist-arrow">─</span><span class="seg-hist-rate">预估 ' + pr.pred.toFixed(1) + ' 次</span> <b>' + pr.method + '</b><br><b>样本 ' + pr.sample + ' · 0/' + w + '</b></td>';
        });
        html += "</tr>";
        return;
      }
      var segIdx = allSegs.indexOf(seg);
      html += '<tr><td class="seg-hist-label">' + seg.s + "-" + seg.e + "期</td>";
      tails.forEach(function (t) {
        var arr = tailMap[t];
        var e = arr[segIdx];
        if (!e) { html += "<td>-</td>"; return; }

        var arrow = "", arrowColor = "#555";
        if (segIdx > 0 && arr[segIdx - 1]) {
          var prevRate = arr[segIdx - 1].rate;
          if (e.rate > prevRate + 0.03) { arrow = "▲"; arrowColor = "#15803d"; }
          else if (e.rate < prevRate - 0.03) { arrow = "▼"; arrowColor = "#b91c1c"; }
          else { arrow = "─"; arrowColor = "#555"; }
        }
        var dot = hit(periods[e.ei], t) ? " ●" : "";
        var arrowStyle = "color:" + arrowColor;
        var cell = '<td class="seg-hist-cell ' + segColorClass(e.rate) + '">';
        cell += '<span class="seg-hist-period">' + e.s + '-' + e.e + '期</span>';
        cell += '<span class="seg-hist-arrow" style="' + arrowStyle + '">' + arrow + '</span>';
        cell += '<span class="seg-hist-rate">' + (e.rate * 100).toFixed(1) + '%</span> <b>' + segTextLabel(e.rate) + '</b><br><b>' + e.c + '/' + w + '</b>' + dot;
        cell += '</td>';
        html += cell;
      });
      html += "</tr>";
    });

    html += '</tbody><tfoot><tr class="seg-hist-summary"><td class="seg-hist-label">总数</td>';
    tails.forEach(function (t) {
      var totalHits = 0;
      for (var i = 0; i < periods.length; i++) if (hit(periods[i], t)) totalHits++;
      html += '<td>' + totalHits + "/" + periods.length + "</td>";
    });
    html += "</tr>";

    html += '<tr class="seg-hist-summary"><td class="seg-hist-label">规律</td>';
    tails.forEach(function (t) {
      var s = segStats(t, w);
      html += "<td>" + (s ? s.rule : "-") + "</td>";
    });
    html += "</tr>";

    html += '<tr class="seg-hist-summary"><td class="seg-hist-label">波动</td>';
    tails.forEach(function (t) {
      var s = segStats(t, w);
      if (s) {
        html += '<td>' + Math.round(s.max) + '%~' + Math.round(s.min) + '% 幅度' + Math.round(s.range) + '% ' + s.rangeLabel + ' ' + s.most + '(' + s.mostCnt + '/' + s.total + ')</td>';
      } else {
        html += "<td>-</td>";
      }
    });
    html += "</tr></tfoot></table></div></div></div>";

    return html;
  }

  function renderWindowSummary() {
    var windows = [5, 7, 10, 15, 21, 30];
    var html = '<div class="section"><div class="section__head"><h2 class="section__title">窗口开出次数统计</h2><span class="section__hint">当前段与最近5段实际次数</span></div>';
    html += '<div class="panel"><div class="panel__body window-summary-scroll"><table class="table window-summary-table"><thead><tr><th>尾数</th>';
    windows.forEach(function (w) { html += '<th>' + w + "期</th>"; });
    html += "</tr></thead><tbody>";
    for (var t = 0; t < 10; t++) {
      html += "<tr><td>尾" + t + "</td>";
      windows.forEach(function (w) {
        var arr = tailSegs(t, w);
        var cur = arr[arr.length - 1];
        var history = arr.slice(-6, -1).map(function (e) { return e.c + '/' + e.len; }).join(" · ");
        html += '<td><div class="win-cur">' + cur.c + '/' + cur.len + '</div><div class="win-hist">' + history + "</div></td>";
      });
      html += "</tr>";
    }
    html += "</tbody></table></div></div></div>";
    return html;
  }

  function renderFullWindowHistory(w) {
    var allSegs = segsOf(w);
    var tailMap = {};
    for (var t = 0; t < 10; t++) tailMap[t] = tailSegs(t, w);

    var html = '<div class="section"><div class="section__head"><h2 class="section__title">全历史分段实际次数</h2><span class="section__hint">' + w + "期窗口 · 从第" + allSegs[0].s + "期到第" + allSegs[allSegs.length - 1].e + "期 · 共" + allSegs.length + "段</span></div>";
    html += '<div class="panel"><div class="panel__body seg-hist-scroll"><table class="seg-hist-table full-hist-table"><thead><tr><th class="seg-hist-label">尾数</th>';
    allSegs.forEach(function (seg) { html += '<th>' + seg.s + "~" + seg.e + "</th>"; });
    html += "</tr></thead><tbody>";

    for (var t = 0; t < 10; t++) {
      var pr = predictSegmentCount(t, w);
      var cur = tailMap[t][allSegs.length - 1];
      var curRate = cur.c / cur.len;
      var predRate = pr.pred / w;
      var trendText, trendCls;
      if (predRate - curRate >= 0.05) { trendText = "预计升温"; trendCls = "trend-up"; }
      else if (curRate - predRate >= 0.05) { trendText = "预计降温"; trendCls = "trend-down"; }
      else { trendText = "预计平稳"; trendCls = "trend-flat"; }

      html += '<tr><td class="seg-hist-label">尾' + t + "</td>";
      allSegs.forEach(function (seg, idx) {
        var e = tailMap[t][idx];
        var cell = '<td class="seg-hist-cell ' + (e ? segColorClass(e.rate) : "") + '">' + (e ? e.c : "-");
        if (idx === allSegs.length - 1) cell += '<div class="full-hist-trend ' + trendCls + '">' + trendText + "</div>";
        html += cell + "</td>";
      });
      html += "</tr>";
    }

    html += "</tbody></table></div></div></div>";
    return html;
  }

  function renderSegments() {
    var w = state.segWindow;
    var segs = segsOf(w);
    var last3 = segs.slice(-3);
    var nextSeg = futureSegment(w, segs);
    var comparisonSegs = last3.slice();
    var hasNext = !!nextSeg;
    if (nextSeg) comparisonSegs.push(nextSeg);
    var futurePreds = {};
    if (nextSeg) {
      for (var tp = 0; tp < 10; tp++) futurePreds[tp] = predictSegmentCount(tp, w);
    }

    var html = '<div class="section"><div class="section__head"><h2 class="section__title">窗口选择</h2></div><div class="chips">';
    [5, 7, 10, 15, 21, 30].forEach(function (n) {
      html += '<button class="chip ' + (w === n ? "is-active" : "") + '" data-segw="' + n + '">' + n + " 期</button>";
    });
    html += "</div></div>";
    if (nextSeg) {
      html += '<div class="next-seg-banner">下一段 ' + nextSeg.s + '-' + nextSeg.e + "期 · " + w + "期窗口 · 未开</div>";
    }

    html += '<div class="section"><div class="section__head"><h2 class="section__title">最近三段对比</h2><span class="section__hint">' + (hasNext ? "已接下一段" : "共 " + segs.length + " 个分段，末段可能不满窗口") + "</span></div>";
    html += '<div class="panel"><div class="seg-compare-scroll"><table class="table"><thead><tr><th>尾数</th>';
    comparisonSegs.forEach(function (seg, idx) {
      if (seg.future) {
        html += '<th class="seg-cell"><div>下一段</div><div class="seg-head">' + seg.s + '-' + seg.e + " 期 · 未开</div></th>";
      } else {
        var segNo = segs.length - 3 + idx + 1;
        html += '<th class="seg-cell"><div>第 ' + segNo + ' 段</div><div class="seg-head">' + seg.s + '-' + seg.e + ' 期 · ' + seg.len + ' 期</div></th>';
      }
    });
    html += "</tr></thead><tbody>";

    for (var t = 0; t < 10; t++) {
      html += "<tr><td>" + t + "</td>";
      var counts = comparisonSegs.map(function (seg) { return seg.future ? 0 : countInSeg(t, seg.si, seg.ei); });
      var rates = comparisonSegs.map(function (seg, idx) { return seg.future ? 0 : counts[idx] / seg.len; });
      comparisonSegs.forEach(function (seg, idx) {
        if (seg.future) {
          var pr = futurePreds[t];
          var predFill = Math.max(0, Math.min(100, pr.pred / w * 100));
          html += '<td class="seg-cell"><div class="seg-rate">预估 ' + pr.pred.toFixed(1) + ' 次</div><div class="seg-count" style="color:var(--muted)">样本 ' + pr.sample + ' · ' + pr.method + '</div><div class="seg-bar"><i style="width:' + Math.round(predFill) + '%"></i></div></td>';
          return;
        }
        var c = counts[idx];
        var fill = c / w;
        var above = rates[idx] >= BASE_RATE[t];
        var color = above ? "var(--hot)" : "var(--cold)";
        var isLast = idx === comparisonSegs.length - 1;
        var est = "";
        if (!seg.future && isLast && seg.len < w) {
          var pr = predictSegmentCount(t, w);
          est = '<div class="seg-est">预估 ' + pr.pred.toFixed(1) + ' 次 · 样本' + pr.sample + '</div>';
        }
        html += '<td class="seg-cell"><div class="seg-rate">' + (fill * 100).toFixed(0) + '%</div><div class="seg-count" style="color:' + color + '">' + c + '/' + seg.len + ' 期</div><div class="seg-bar"><i style="width:' + Math.round(fill * 100) + '%"></i></div>' + est + '</td>';
      });
      html += "</tr>";
    }
    html += "</tbody></table></div></div></div>";
    html += '<p class="disclaimer">百分比与进度条 = 该尾数在本段开出次数相对完整窗口（' + w + ' 期）的进度；末段不满窗口时也按完整窗口计算。下一段/未完成段的预估按历史同类或相近段口推算，样本不足时回退全历史均值。</p>';

    html += renderFullWindowHistory(w);

    var reportSeg = nextSeg || segs[segs.length - 1];
    var reportEnd = reportSeg ? reportSeg.s + w - 1 : 0;
    var reportRange = reportSeg ? reportSeg.s + "~" + reportEnd + "期" : "当前段";
    var segReport = [];
    for (var rt = 0; rt < 10; rt++) segReport.push({ tail: rt, pr: predictSegmentCount(rt, w) });
    segReport.sort(function (a, b) { return b.pr.pred - a.pr.pred; });
    html += '<div class="section"><div class="section__head"><h2 class="section__title">分段预测报告</h2><span class="section__hint">' + reportRange + ' · ' + w + ' 期窗口</span></div>';
    html += '<div class="panel"><div class="panel__body report">';
    html += '<p><b>预测窗口：</b>' + reportRange + '。</p>';
    segReport.slice(0, 3).forEach(function (item, idx) {
      html += '<p><b>' + (idx + 1) + '. 尾 ' + item.tail + '（' + reportRange + '）：</b>预计 ' + item.pr.pred.toFixed(1) + ' 次；依据 ' + item.pr.method + '；样本 ' + item.pr.sample + '。</p>';
    });
    html += '<p><b>逻辑：</b>优先匹配历史同类状态段口，样本不足时匹配相近次数，再不足则回退全历史均值；预测值只作为透明参考。</p>';
    html += "</div></div></div>";

    view.innerHTML = html;
  }

  // ===== 下单系统 =====
  function lsGet(key, def) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch (e) { return def; }
  }
  function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  var orderData = {
    orders: lsGet("v2_orders", []),
    history: lsGet("v2_order_hist", []),
    sel: {},
    base: 1000,
    m1: 1,
    m2: 2.25,
    m3: 30,
    ret: 1.8
  };

  function saveOrders() {
    lsSet("v2_orders", orderData.orders);
    lsSet("v2_order_hist", orderData.history);
  }

  function orderListHTML() {
    if (orderData.orders.length === 0) return '<div class="panel"><div class="panel__body"><div class="empty">暂无下单</div></div></div>';
    var h = "";
    orderData.orders.forEach(function (o) {
      var totalBet = o.periods.reduce(function (s, p) { return s + p.bet; }, 0);
      h += '<div class="panel" style="margin-bottom:10px"><div class="panel__body">';
      h += '<div class="record__top"><span class="record__period">尾 ' + o.nums.join(" ") + '</span><span class="record__meta">起始第 ' + o.startP + " 期 · 总投 " + totalBet + " 元</span></div>";
      h += '<table class="table"><thead><tr><th>期数</th><th>下注</th><th>状态</th><th>操作</th></tr></thead><tbody>';
      o.periods.forEach(function (p, i) {
        var cls = p.status === "pending" ? "ord-pending" : p.status === "hit" ? "ord-hit" : "ord-miss";
        var txt = p.status === "pending" ? "待开奖" : p.status === "hit" ? "中奖" : "未中";
        h += '<tr><td>' + p.p + "</td><td>" + p.bet + ' 元</td><td class="' + cls + '">' + txt + "</td>";
        if (p.status === "pending") {
          h += '<td><button class="chip" data-ordhit="' + o.id + "," + i + '">中</button> <button class="chip" data-ordmiss="' + o.id + "," + i + '">未中</button></td>';
        } else {
          h += "<td>-</td>";
        }
        h += "</tr>";
      });
      h += '</tbody></table><div style="margin-top:8px;text-align:right"><button class="chip" data-orddel="' + o.id + '">删除</button></div>';
      h += "</div></div>";
    });
    return h;
  }

  function orderStatsHTML() {
    var totalOrders = orderData.history.length;
    var hitOrders = orderData.history.filter(function (h) { return h.periods.some(function (p) { return p.status === "hit"; }); }).length;
    var totalBet = orderData.history.reduce(function (s, h) { return s + h.periods.reduce(function (ss, p) { return ss + p.bet; }, 0); }, 0);
    var totalReturn = orderData.history.reduce(function (s, h) {
      return s + h.periods.reduce(function (ss, p) { if (p.status === "hit") return ss + p.bet * h.ret; return ss; }, 0);
    }, 0);
    var profit = totalReturn - totalBet;
    var h = '<div class="grid-2">';
    h += '<div class="stat"><div class="stat__value">' + totalOrders + '</div><div class="stat__label">完成订单</div></div>';
    h += '<div class="stat"><div class="stat__value">' + hitOrders + '</div><div class="stat__label">中奖订单</div></div>';
    h += '<div class="stat"><div class="stat__value">' + totalBet + '</div><div class="stat__label">总投入</div></div>';
    h += '<div class="stat"><div class="stat__value ' + (profit >= 0 ? "ord-hit" : "ord-miss") + '">' + (profit >= 0 ? "+" : "") + profit + '</div><div class="stat__label">净利润</div></div>';
    h += "</div>";
    if (orderData.history.length === 0) {
      h += '<div class="panel"><div class="panel__body"><div class="empty">暂无历史</div></div></div>';
    } else {
      h += '<div class="panel"><table class="table"><thead><tr><th>号码</th><th>期数</th><th>结果</th><th>操作</th></tr></thead><tbody>';
      orderData.history.slice().reverse().forEach(function (o) {
        var hitCount = o.periods.filter(function (p) { return p.status === "hit"; }).length;
        var result = hitCount > 0 ? '<span class="ord-hit">中 ' + hitCount + "</span>" : '<span class="ord-miss">全未中</span>';
        h += '<tr><td>尾 ' + o.nums.join(" ") + "</td><td>" + o.startP + "-" + (o.startP + 2) + "</td><td>" + result + '</td><td><button class="chip" data-orddelhist="' + o.id + '">删</button></td></tr>';
      });
      h += "</tbody></table></div>";
    }
    return h;
  }

  function renderOrder() {
    var next = latest + 1;
    var html = '<div class="section"><div class="section__head"><h2 class="section__title">下单追投</h2><span class="section__hint">数据保存在本机浏览器</span></div>';
    html += '<div class="panel"><div class="panel__body">';
    html += '<div class="ord-grid">';
    html += '<div class="ord-item"><label>基础金额</label><input id="ordBase" type="number" min="1" value="' + orderData.base + '"> 元</div>';
    html += '<div class="ord-item"><label>第1期</label><input id="ordM1" type="number" min="0.1" step="0.1" value="' + orderData.m1 + '"> 倍</div>';
    html += '<div class="ord-item"><label>第2期</label><input id="ordM2" type="number" min="0.1" step="0.1" value="' + orderData.m2 + '"> 倍</div>';
    html += '<div class="ord-item"><label>第3期</label><input id="ordM3" type="number" min="0.1" step="0.1" value="' + orderData.m3 + '"> 倍</div>';
    html += '<div class="ord-item"><label>回报率</label><input id="ordRet" type="number" min="1" step="0.1" value="' + orderData.ret + '"> 倍</div>';
    html += "</div>";
    html += '<div class="ord-formula" id="ordFormula"></div>';
    html += "</div></div></div>";

    html += '<div class="section"><div class="panel"><div class="panel__body">';
    html += '<div class="section__head" style="margin:0 0 8px"><h2 class="section__title">选择号码</h2><span class="section__hint">最新第 ' + latest + " 期开出尾数：" + tailsOf(latest).join(" ") + "</span></div>";
    html += '<div class="chips">';
    for (var t = 0; t < 10; t++) {
      html += '<button class="chip ' + (orderData.sel[t] ? "is-active" : "") + '" data-ordsn="' + t + '">尾 ' + t + "</button>";
    }
    html += "</div>";
    html += '<div class="ord-item" style="margin-top:8px"><label>起始期数</label><input id="ordStart" type="number" min="1" value="' + next + '"></div>';
    html += '<button class="btn-primary" data-ordcreate="1">创建下单</button>';
    html += "</div></div></div>";

    html += '<div class="section"><div class="section__head"><h2 class="section__title">当前下单</h2></div>' + orderListHTML() + "</div>";
    html += '<div class="section"><div class="section__head"><h2 class="section__title">历史统计</h2></div>' + orderStatsHTML() + "</div>";
    html += '<p class="disclaimer">下单金额 = 基础金额 × 倍数 × 所选号码个数。中奖回报 = 该期下注 × 回报率。数据仅保存在本机浏览器。</p>';
    view.innerHTML = html;
    updateOrderFormula();
  }

  function updateOrderFormula() {
    var el = document.getElementById("ordFormula");
    if (!el) return;
    el.textContent = "第1期 " + (orderData.base * orderData.m1) + " 元 | 第2期 " + (orderData.base * orderData.m2) + " 元 | 第3期 " + (orderData.base * orderData.m3) + " 元 | 回报率 " + orderData.ret + " 倍";
  }

  function orderCreate() {
    var nums = Object.keys(orderData.sel).filter(function (k) { return orderData.sel[k]; }).map(Number).sort(function (a, b) { return a - b; });
    if (nums.length === 0) { alert("请选择号码"); return; }
    var startEl = document.getElementById("ordStart");
    var startP = parseInt(startEl.value, 10);
    if (!startP) { alert("请输入起始期数"); return; }
    var cnt = nums.length;
    var order = {
      id: Date.now(),
      nums: nums,
      startP: startP,
      ret: orderData.ret,
      periods: [
        { p: startP, bet: Math.round(orderData.base * orderData.m1 * cnt), status: "pending" },
        { p: startP + 1, bet: Math.round(orderData.base * orderData.m2 * cnt), status: "pending" },
        { p: startP + 2, bet: Math.round(orderData.base * orderData.m3 * cnt), status: "pending" }
      ],
      created: new Date().toISOString()
    };
    orderData.orders.push(order);
    saveOrders();
    orderData.sel = {};
    renderOrder();
  }

  function orderMark(id, idx, status) {
    var o = orderData.orders.find(function (x) { return x.id === id; });
    if (!o) return;
    o.periods[idx].status = status;
    if (o.periods.every(function (p) { return p.status !== "pending"; })) {
      o.completed = new Date().toISOString();
      orderData.history.push(o);
      orderData.orders = orderData.orders.filter(function (x) { return x.id !== id; });
    }
    saveOrders();
    renderOrder();
  }

  function orderDelete(id) {
    orderData.orders = orderData.orders.filter(function (x) { return x.id !== id; });
    saveOrders();
    renderOrder();
  }

  function orderDeleteHist(id) {
    orderData.history = orderData.history.filter(function (x) { return x.id !== id; });
    saveOrders();
    renderOrder();
  }

  // ===== 预估三层框架 + 下期推荐 =====
  var BOUNCE = { 0: 4, 1: 4, 2: 5, 3: 4, 4: 4, 5: 3, 6: 2, 7: 5, 8: 2, 9: 1 };

  function cntRange(d, a, b) {
    var c = 0;
    for (var p = a; p <= b; p++) if (hit(p, d)) c++;
    return c;
  }

  function renderPredict() {
    var N = latest;
    var html = '<div class="section"><div class="section__head"><h2 class="section__title">三层分析框架</h2><span class="section__hint">第1层 15期方向 · 第2层 5/7/10期 · 第3层 反弹临界点</span></div>';
    html += '<div class="panel"><table class="table"><thead><tr><th>尾数</th><th>15段</th><th>近5期</th><th>近7期</th><th>近10期</th><th>遗漏</th><th>临界</th><th>方向</th></tr></thead><tbody>';
    var cands = [];
    var lastBin = bin(N);
    for (var d = 0; d < 10; d++) {
      var cnt15 = cntRange(d, N - 14, N);
      var cnt5 = cntRange(d, N - 4, N);
      var cnt7 = cntRange(d, N - 6, N);
      var cnt10 = cntRange(d, N - 9, N);
      var miss = currentMiss(d);
      var bt = BOUNCE[d];
      var dir = cnt15 >= 10 ? "热惯性" : cnt15 <= 5 ? (miss >= bt ? "🔥超临界" : "冷反弹") : "中";
      var s15 = cnt15 >= 10 ? "热" : cnt15 <= 5 ? "冷" : "中";
      var s5 = cnt5 >= 4 ? "热" : cnt5 <= 1 ? "冷" : "中";
      var bg15 = cnt15 >= 10 ? "#22c55e" : cnt15 <= 5 ? "#ef4444" : "#94a3b8";
      var bg5 = cnt5 >= 4 ? "#22c55e" : cnt5 <= 1 ? "#ef4444" : "#94a3b8";
      var score = 0;
      if (cnt15 <= 5) score += 3;
      if (cnt5 <= 1) score += 2;
      if (miss >= bt) score += 5; else if (miss >= bt - 1) score += 2;
      if (lastBin[d] === "0") {
        var reb = missRebound(d);
        var rebEdge = reb.total ? reb.rate - BASE_RATE[d] : 0;
        var rebConf = reb.total >= 20 && rebEdge >= 0.04 ? 2 : reb.total >= 20 && rebEdge <= -0.04 ? -2 : 0;
        cands.push({ d: d, miss: miss, cnt15: cnt15, cnt5: cnt5, bt: bt, score: score + rebConf, dir: dir, rebRate: reb.rate, rebSample: reb.total, rebEdge: rebEdge });
      }
      html += '<tr><td>尾' + d + '</td><td style="background:' + bg15 + ';color:#fff">' + cnt15 + "/15 " + s15 + '</td><td style="background:' + bg5 + ';color:#fff">' + cnt5 + "/5 " + s5 + '</td><td>' + cnt7 + "/7</td><td>" + cnt10 + "/10</td><td>" + miss + "期</td><td>" + bt + "期</td><td>" + dir + "</td></tr>";
    }
    html += "</tbody></table></div></div>";

    cands.sort(function (a, b) { return b.score - a.score; });
    html += '<div class="section"><div class="section__head"><h2 class="section__title">下期推荐</h2><span class="section__hint">冷热+遗漏+临界+历史反弹率</span></div>';
    html += '<div class="panel"><div class="panel__body">';
    if (cands.length === 0) {
      html += '<div class="empty">上期全中，无未出号，建议跳过</div>';
    } else if (cands.length >= 2 && cands[0].score === cands[1].score) {
      html += '<div class="empty">信号接近，建议跳过</div>';
      html += '<div style="margin-top:8px;font-size:12px;color:var(--muted)">并列候选：' + cands.slice(0, 3).map(function (c) { return "尾" + c.d; }).join("、") + "</div>";
    } else {
      var top = cands[0];
      html += '<div style="font-size:16px;font-weight:700;color:var(--accent)">首选：尾 ' + top.d + "</div>";
      html += '<div style="margin-top:4px;font-size:12px;color:var(--muted)">遗漏 ' + top.miss + " 期 | 15段 " + top.cnt15 + "/15 | 近5期 " + top.cnt5 + "/5 | 临界 " + top.bt + " 期</div>";
      html += '<div style="margin-top:4px">方向：' + top.dir + "</div>";
      html += '<div style="margin-top:4px;font-size:12px;color:var(--muted)">历史反弹率 ' + pct(top.rebRate) + "（样本 " + top.rebSample + "）" + (top.rebSample < 20 ? " · 样本不足" : "") + "</div>";
      if (cands.length >= 2) {
        var sec = cands[1];
        html += '<div style="margin-top:10px;color:var(--muted)">备选：尾 ' + sec.d + "（遗漏 " + sec.miss + " 期 | 15段 " + sec.cnt15 + "/15）</div>";
      }
    }
    html += "</div></div></div>";

    html += '<div class="section"><div class="section__head"><h2 class="section__title">每日分析报告</h2><span class="section__hint">' + new Date().toLocaleDateString("zh-CN") + " · 第 " + N + " 期</span></div>";
    html += '<div class="panel"><div class="panel__body report">';
    if (cands.length === 0) {
      html += '<p><b>结论：</b>上期尾数全部开出，没有未开尾数可供预测，建议本期跳过。</p>';
    } else if (cands.length >= 2 && cands[0].score === cands[1].score) {
      html += '<p><b>结论：</b>候选分数并列，没有明显优势，建议本期跳过。</p>';
      html += '<p><b>并列候选：</b>' + cands.slice(0, 3).map(function (c) { return "尾" + c.d; }).join("、") + '</p>';
      html += '<p><b>逻辑：</b>当第一、第二名综合分相同时，强行选一个只会放大随机性，因此系统选择等待。</p>';
    } else {
      var top = cands[0];
      var reasons = [];
      if (top.cnt15 <= 5) reasons.push("近15期只开 " + top.cnt15 + "/15，处于冷区");
      if (top.cnt5 <= 1) reasons.push("近5期只开 " + top.cnt5 + "/5，短期偏冷");
      if (top.miss >= top.bt) reasons.push("当前遗漏 " + top.miss + " 期，已达到临界 " + top.bt + " 期");
      else if (top.miss >= top.bt - 1) reasons.push("当前遗漏 " + top.miss + " 期，接近临界 " + top.bt + " 期");
      if (top.rebSample >= 20 && top.rebEdge >= 0.04) reasons.push("历史同类遗漏后反弹率 " + pct(top.rebRate) + "，高于理论基准 " + pct(BASE_RATE[top.d]));
      if (!reasons.length) reasons.push("综合评分最高");

      html += '<p><b>结论：</b>首选尾数 <b>' + top.d + '</b>。</p>';
      html += '<p><b>理由：</b>' + reasons.join("；") + '。</p>';
      html += '<p><b>数据：</b>遗漏 ' + top.miss + ' 期；15段 ' + top.cnt15 + '/15；近5期 ' + top.cnt5 + '/5；历史反弹率 ' + pct(top.rebRate) + '，样本 ' + top.rebSample + '。</p>';
      if (cands.length >= 2) {
        html += '<p><b>备选：</b>尾 ' + cands[1].d + '（遗漏 ' + cands[1].miss + ' 期；15段 ' + cands[1].cnt15 + '/15）。</p>';
      }
    }
    html += '<p><b>评分规则：</b>15期冷区 +3；近5期冷区 +2；达到临界 +5、接近临界 +2；历史反弹率显著偏高 +2、显著偏低 -2。分数并列时跳过。</p>';
    html += '<p><b>风险提示：</b>历史回测显示这类信号没有稳定优势，报告只做透明推演，不应据此重注。</p>';
    html += "</div></div></div>";

    html += '<p class="disclaimer">评分结合冷热、遗漏、临界和历史反弹率；当候选分数并列时宁可跳过。历史回测仍显示这类信号没有稳定优势，仅供参考。</p>';
    view.innerHTML = html;
  }

  // ===== 尾号性格表 =====
  function bounceStats(d) {
    var b = {};
    var lo = -1;
    for (var i = 0; i < periods.length; i++) {
      if (hit(periods[i], d)) {
        if (lo >= 0) {
          var miss = periods[i] - lo - 1;
          for (var x = 1; x <= miss; x++) {
            if (!b[x]) b[x] = { h: 0, t: 0 };
            b[x].t++;
            if (x === miss) b[x].h++;
          }
        }
        lo = periods[i];
      }
    }
    return b;
  }

  function streakStats(d) {
    var b = {};
    var run = 0;
    for (var i = 0; i < periods.length - 1; i++) {
      if (hit(periods[i], d)) {
        run++;
        if (!b[run]) b[run] = { h: 0, t: 0 };
        b[run].t++;
        if (hit(periods[i + 1], d)) b[run].h++;
      } else {
        run = 0;
      }
    }
    return b;
  }

  function currentStreak(d) {
    var run = 0;
    for (var i = periods.length - 1; i >= 0; i--) {
      if (hit(periods[i], d)) run++;
      else break;
    }
    return run;
  }

  function renderPersonality() {
    var html = '<div class="section"><div class="section__head"><h2 class="section__title">尾号性格</h2><span class="section__hint">该尾数「遗漏N期后下一期开出」的概率</span></div>';
    html += '<div class="panel"><table class="table"><thead><tr><th>尾号</th><th>遗1</th><th>遗2</th><th>遗3</th><th>遗4</th><th>遗5+</th><th>性格</th><th>当前遗漏</th></tr></thead><tbody>';
    for (var d = 0; d < 10; d++) {
      var b = bounceStats(d);
      function cell(x) {
        var s = b[x];
        if (!s) return "<td>-</td>";
        if (s.t < 3) return '<td style="color:#bbb">' + (s.h / s.t * 100).toFixed(0) + "%*</td>";
        var r = s.h / s.t * 100;
        var c = r >= 62 ? "#16a34a" : r >= 52 ? "#eab308" : "#dc2626";
        return '<td style="color:' + c + ";font-weight:700\">" + r.toFixed(0) + "%</td>";
      }
      var arr = [];
      for (var x = 1; x <= 3; x++) { var s = b[x]; if (s && s.t >= 3) arr.push(s.h / s.t * 100); }
      var grade = "—", gc = "#999";
      if (arr.length) {
        var avg = arr.reduce(function (a, b2) { return a + b2; }, 0) / arr.length;
        grade = avg >= 62 ? "🟢稳" : avg >= 52 ? "🟡中" : "🔴险";
        gc = avg >= 62 ? "#16a34a" : avg >= 52 ? "#eab308" : "#dc2626";
      }
      var miss = currentMiss(d);
      html += "<tr><td>尾" + d + "</td>" + cell(1) + cell(2) + cell(3) + cell(4) + cell(5) + '<td style="color:' + gc + ";font-weight:700\">" + grade + "</td><td>" + miss + "期</td></tr>";
    }
    html += "</tbody></table></div></div>";
    html += '<div class="section"><div class="section__head"><h2 class="section__title">连出性格表</h2><span class="section__hint">该尾数「连续开出N期后下一期继续开出」的概率</span></div>';
    html += '<div class="panel"><table class="table"><thead><tr><th>尾号</th><th>连1</th><th>连2</th><th>连3</th><th>连4</th><th>连5+</th><th>性格</th><th>当前连出</th></tr></thead><tbody>';
    for (var d2 = 0; d2 < 10; d2++) {
      var b2 = streakStats(d2);
      function scell(x) {
        var s = b2[x];
        if (!s) return "<td>-</td>";
        if (s.t < 3) return '<td style="color:#bbb">' + (s.h / s.t * 100).toFixed(0) + "%*</td>";
        var r = s.h / s.t * 100;
        var c = r >= 62 ? "#16a34a" : r >= 52 ? "#eab308" : "#dc2626";
        return '<td style="color:' + c + ";font-weight:700\">" + r.toFixed(0) + "%</td>";
      }
      var arr2 = [];
      for (var x2 = 1; x2 <= 3; x2++) { var s2 = b2[x2]; if (s2 && s2.t >= 3) arr2.push(s2.h / s2.t * 100); }
      var grade2 = "—", gc2 = "#999";
      if (arr2.length) {
        var avg2 = arr2.reduce(function (a, b3) { return a + b3; }, 0) / arr2.length;
        grade2 = avg2 >= 62 ? "🟢稳" : avg2 >= 52 ? "🟡中" : "🔴险";
        gc2 = avg2 >= 62 ? "#16a34a" : avg2 >= 52 ? "#eab308" : "#dc2626";
      }
      var cs = currentStreak(d2);
      html += "<tr><td>尾" + d2 + "</td>" + scell(1) + scell(2) + scell(3) + scell(4) + scell(5) + '<td style="color:' + gc2 + ";font-weight:700\">" + grade2 + "</td><td>" + cs + "连</td></tr>";
    }
    html += "</tbody></table></div></div>";
    html += '<p class="disclaimer">连出率 = 该尾数历史上「连续开出N期后、下一期继续开出」的概率；样本小于3标 *。🟢稳 / 🟡中 / 🔴险 按连1-3连出率平均划分。</p>';
    html += '<p class="disclaimer">反弹率 = 该尾数历史上「连续遗漏N期后、下一期开出」的概率；样本小于3标 *。🟢稳 / 🟡中 / 🔴险 按遗1-3反弹率平均划分。</p>';

    html += '<div class="section"><div class="section__head"><h2 class="section__title">当下状态</h2><span class="section__hint">各尾数最新状态</span></div>';
    html += '<div class="panel"><table class="table"><thead><tr><th>尾号</th><th>当前遗漏</th><th>当前连出</th><th>近15期</th><th>近5期</th><th>判定</th></tr></thead><tbody>';
    for (var d3 = 0; d3 < 10; d3++) {
      var miss3 = currentMiss(d3);
      var streak3 = currentStreak(d3);
      var c15 = countWindow(d3, 15);
      var c5 = countWindow(d3, 5);
      var s15 = c15 >= 10 ? "热" : c15 <= 5 ? "冷" : "中";
      var s5 = c5 >= 4 ? "热" : c5 <= 1 ? "冷" : "中";
      var status = miss3 >= BOUNCE[d3] ? "临界反弹" : c15 >= 10 ? "热惯性" : c15 <= 5 ? "冷待反弹" : streak3 >= 3 ? "连出中" : "中";
      var statusColor = miss3 >= BOUNCE[d3] ? "#dc2626" : c15 >= 10 ? "#16a34a" : c15 <= 5 ? "#2563eb" : "#6b7280";
      html += '<tr><td>尾' + d3 + '</td><td>' + miss3 + '期</td><td>' + streak3 + '连</td><td>' + c15 + '/15 ' + s15 + '</td><td>' + c5 + '/5 ' + s5 + '</td><td style="color:' + statusColor + ';font-weight:700">' + status + "</td></tr>";
    }
    html += "</tbody></table></div></div>";

    view.innerHTML = html;
  }

  // ===== 号码走势图 / 生肖走势图（照搬老版） =====
  var ZODS12 = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
  var RED_NUM = [1, 2, 7, 8, 12, 13, 18, 19, 23, 24, 29, 30, 34, 35, 40, 45, 46];
  var BLUE_NUM = [3, 4, 9, 10, 14, 15, 20, 25, 26, 31, 36, 37, 41, 42, 47, 48];

  function numberColorOf(n) {
    return RED_NUM.indexOf(n) >= 0 ? 0 : (BLUE_NUM.indexOf(n) >= 0 ? 1 : 2);
  }

  function numZodMap(y) {
    var arr = D.filter(function (r) { return r.y === y; });
    var map = {};
    arr.forEach(function (r) {
      for (var j = 0; j < r.nums.length; j++) map[r.nums[j]] = r.zods[j];
    });
    if (map[1]) {
      var ti = ZODS12.indexOf(map[1]);
      for (var n = 1; n <= 49; n++) {
        if (!map[n]) map[n] = ZODS12[((ti - (n - 1)) % 12 + 12) % 12];
      }
    }
    return map;
  }

  function trendYearChips(y) {
    var h = '<div class="chips" style="margin-bottom:8px">';
    [2026, 2025, 2024, 2023, 2022, 2021].forEach(function (yy) {
      h += '<button class="chip ' + (y === yy ? "is-active" : "") + '" data-year="' + yy + '">' + yy + "</button>";
    });
    return h + "</div>";
  }

  function renderNumTrend() {
    var y = state.year;
    var arr = D.filter(function (r) { return r.y === y; });
    var zmap = numZodMap(y);

    var html = '<div class="section"><div class="section__head"><h2 class="section__title">号码走势图</h2><span class="section__hint">' + y + " 年 · 共 " + arr.length + " 期</span></div>";
    html += trendYearChips(y);
    html += '</div><div class="panel"><div class="panel__body trend-dark trend-scroll"><table class="trend-table">';
    html += "<thead><tr><th class=\"period\">期号</th>";
    for (var n = 1; n <= 49; n++) {
      html += '<th><div class="numhdr">' + (n < 10 ? "0" + n : n) + '</div><div class="zodhdr">' + (zmap[n] || "-") + "</div></th>";
    }
    html += "</tr></thead><tbody>";
    arr.forEach(function (r) {
      var info = {};
      for (var j = 0; j < r.nums.length; j++) info[r.nums[j]] = { c: numberColorOf(r.nums[j]), z: r.zods[j] };
      html += '<tr><td class="period">' + r.p + "</td>";
      for (var m = 1; m <= 49; m++) {
        if (info[m]) {
          html += '<td class="hit"><span class="ballcell"><span class="ballnum c' + info[m].c + '">' + m + '</span><span class="ballzod">' + info[m].z + "</span></span></td>";
        } else {
          html += "<td></td>";
        }
      }
      html += "</tr>";
    });
    html += "</tbody></table></div></div></div>";
    view.innerHTML = html;
    var ntsc = view.querySelector(".trend-scroll");
    if (ntsc) ntsc.scrollTop = ntsc.scrollHeight;
  }

  function renderZodTrend() {
    var y = state.year;
    var arr = D.filter(function (r) { return r.y === y; });
    var tai = arr.length ? arr[arr.length - 1].tai : "马";
    var ti = ZODS12.indexOf(tai);
    function zodiacOf(n) { return ZODS12[((ti - (n - 1)) % 12 + 12) % 12]; }

    var nmap = {};
    ZODS12.forEach(function (z) { nmap[z] = []; });
    for (var n = 1; n <= 49; n++) nmap[zodiacOf(n)].push(n);

    var periodOpen = arr.map(function (r) {
      var o = {};
      for (var j = 0; j < r.zods.length; j++) o[r.zods[j]] = true;
      return { p: r.p, open: o };
    });

    var zcolor = [], zmark = [];
    for (var i = 0; i < arr.length; i++) { zcolor.push({}); zmark.push({}); }
    ZODS12.forEach(function (z) {
      var start = null;
      for (var i = 0; i <= arr.length; i++) {
        var isMiss = (i < arr.length) && !periodOpen[i].open[z];
        if (isMiss) {
          if (start === null) start = i;
        } else if (start !== null) {
          var len = i - start;
          var cls = len === 1 ? "z-m1" : (len === 2 ? "z-m2" : "z-m3");
          for (var k = start; k < i; k++) zcolor[k][z] = cls;
          zmark[i - 1][z] = len;
          start = null;
        }
      }
    });

    var html = '<div class="section"><div class="section__head"><h2 class="section__title">生肖走势图</h2><span class="section__hint">' + y + " 年 · 太岁 " + tai + " · 共 " + arr.length + " 期</span></div>";
    html += trendYearChips(y);
    html += '</div><div class="panel"><div class="panel__body trend-dark trend-scroll"><table class="trend-table">';
    html += '<thead><tr><th class="period" rowspan="2">期</th>';
    ZODS12.forEach(function (z) {
      html += '<th colspan="' + (nmap[z].length + 1) + '"><div class="zodname">' + z + "</div></th>";
    });
    html += "</tr><tr>";
    ZODS12.forEach(function (z) {
      html += '<th class="znth"></th>';
      nmap[z].forEach(function (n) { html += '<th><div class="numhdr">' + (n < 10 ? "0" + n : n) + "</div></th>"; });
    });
    html += "</tr></thead><tbody>";
    arr.forEach(function (r, i) {
      var nc = {};
      for (var j = 0; j < r.nums.length; j++) nc[r.nums[j]] = numberColorOf(r.nums[j]);
      html += '<tr><td class="period">' + r.p + "</td>";
      ZODS12.forEach(function (z) {
        var opened = periodOpen[i].open[z];
        var zcls, ztxt;
        if (opened) { zcls = "z-out"; ztxt = z; }
        else {
          zcls = zcolor[i][z] || "z-m3";
          var mk = zmark[i][z];
          ztxt = (mk !== undefined) ? mk : "";
        }
        html += '<td class="zodcell"><span class="zp ' + zcls + '">' + ztxt + "</span></td>";
        nmap[z].forEach(function (n) {
          if (nc[n] !== undefined) {
            html += '<td class="numcol hit"><span class="ball c' + nc[n] + '">' + (n < 10 ? "0" + n : n) + "</span></td>";
          } else {
            html += '<td class="numcol"></td>';
          }
        });
      });
      html += "</tr>";
    });
    html += "</tbody></table></div></div></div>";
    html += '<p class="disclaimer">生肖字格：开出写生肖名，蓝=遗漏1期、绿=遗漏2期、黄=遗漏3期及以上并写期数；号码球红/蓝/绿为号码颜色分类。</p>';
    view.innerHTML = html;
    var ztsc = view.querySelector(".trend-scroll");
    if (ztsc) ztsc.scrollTop = ztsc.scrollHeight;
  }

  function renderZodRecords() {
    var y = state.year;
    var list = D.filter(function (r) { return r.y === y; }).sort(function (a, b) { return b.p - a.p; });
    var cnt = {};
    ZODS12.forEach(function (z) { cnt[z] = 0; });
    list.forEach(function (r) { r.zods.forEach(function (z) { cnt[z]++; }); });
    var totalZC = list.length * 7;
    var pageSize = 10;
    var totalPages = Math.max(1, Math.ceil(list.length / pageSize));
    if (state.recordPage >= totalPages) state.recordPage = totalPages - 1;
    var page = list.slice(state.recordPage * pageSize, state.recordPage * pageSize + pageSize);

    var html = '<div class="section"><div class="section__head"><h2 class="section__title">生肖开奖</h2><span class="section__hint">' + y + " 年</span></div>";
    html += trendYearChips(y);
    html += "</div>";

    html += '<div class="panel"><div class="panel__body trend-dark">';
    html += '<div class="zstat-title">' + y + "年 生肖出现统计（" + totalZC + "个号码）</div>";
    html += '<div class="zgrid">';
    ZODS12.forEach(function (z) {
      var pct = (cnt[z] / totalZC * 100).toFixed(1);
      html += '<div class="zitem"><div class="zn">' + z + '</div><div class="zc">' + cnt[z] + "次 " + pct + "%</div></div>";
    });
    html += "</div></div></div>";

    html += '<div class="section"><div class="panel">';
    if (!page.length) {
      html += '<div class="empty">暂无记录</div>';
    } else {
      page.forEach(function (r) {
        html += recordCard(r);
      });
    }
    html += "</div></div>";

    html += '<div class="pager"><button data-prev="1" ' + (state.recordPage === 0 ? "disabled" : "") + '>上一页</button><span>' + (state.recordPage + 1) + " / " + totalPages + '</span><button data-next="1" ' + (state.recordPage >= totalPages - 1 ? "disabled" : "") + '>下一页</button></div>';

    html += '<div class="section"><div class="section__head"><h2 class="section__title">生肖分布</h2><span class="section__hint">' + y + " 年</span></div>";
    html += '<div class="panel"><div class="panel__body"><div id="zodchart" class="bars"></div></div></div></div>';

    view.innerHTML = html;
    drawZodiacBars();
  }

  // ===== 开奖历史记录（文本表） =====
  function renderHistory() {
    var html = '<div class="section"><div class="section__head"><h2 class="section__title">开奖记录</h2><span class="section__hint">共 ' + periods.length + " 期</span></div>";
    html += '<div class="panel"><div class="panel__body hist-scroll"><table class="hist-table"><thead><tr><th class="hist-p">期号</th><th>开奖尾号</th><th>个数</th>';
    for (var t = 0; t < 10; t++) html += "<th>" + t + "</th>";
    html += "<th>遗漏</th></tr></thead><tbody>";
    periods.forEach(function (p, idx) {
      var tails = tailsOf(p);
      html += '<tr><td class="hist-p">' + p + '</td><td>' + tails.join(" ") + "</td><td>" + tails.length + "</td>";
      for (var d = 0; d < 10; d++) {
        if (hit(p, d)) {
          html += '<td class="hist-hit">' + d + "</td>";
        } else {
          var run = 0;
          for (var q = p; q >= 1; q--) { if (hit(q, d)) break; run++; }
          html += '<td class="hist-miss">' + run + "</td>";
        }
      }
      if (idx === periods.length - 1) {
        var missArr = [];
        for (var d2 = 0; d2 < 10; d2++) missArr.push(currentMiss(d2));
        html += '<td class="hist-miss-sum">' + missArr.join(" ") + "</td>";
      } else {
        html += "<td></td>";
      }
      html += "</tr>";
    });
    html += "</tbody></table></div></div></div>";
    view.innerHTML = html;
    var hsc = view.querySelector(".hist-scroll");
    if (hsc) hsc.scrollTop = hsc.scrollHeight;
  }

  // ===== 数据记录系统（三期内必出规律分析） =====
  function calcGapStats(num) {
    var stats = {};
    for (var gap = 1; gap <= 5; gap++) {
      var total = 0, hitC = 0;
      for (var i = 0; i < periods.length - gap - 2; i++) {
        var allMissing = true;
        for (var j = 1; j <= gap; j++) { if (hit(periods[i + j], num)) { allMissing = false; break; } }
        if (!allMissing) continue;
        var appeared = false;
        for (var k = 1; k <= 3; k++) {
          var idx = i + gap + k;
          if (idx < periods.length && hit(periods[idx], num)) { appeared = true; break; }
        }
        total++;
        if (appeared) hitC++;
      }
      if (total > 0) stats[gap] = { hit: hitC, total: total, rate: hitC / total };
    }
    return stats;
  }

  function renderDataRecord() {
    var html = '<div class="section"><div class="section__head"><h2 class="section__title">三期规律</h2><span class="section__hint">三期内必出规律分析</span></div>';
    html += '<div class="grid-3">';
    html += '<div class="stat"><div class="stat__value">' + periods.length + '</div><div class="stat__label">总期数</div></div>';
    html += '<div class="stat"><div class="stat__value">' + latest + '</div><div class="stat__label">最新期</div></div>';
    html += '<div class="stat"><div class="stat__value">' + tailsOf(latest).join(",") + '</div><div class="stat__label">最新尾数</div></div>';
    html += "</div></div>";

    html += '<div class="section"><div class="panel"><table class="table"><thead><tr><th>数字</th><th>最佳触发条件</th><th>三期内命中率</th><th>样本量</th><th>说明</th></tr></thead><tbody>';
    for (var num = 0; num <= 9; num++) {
      var stats = calcGapStats(num);
      var bestGap = null, bestRate = 0, bestHit = 0, bestTotal = 0;
      Object.keys(stats).forEach(function (g) {
        if (stats[g].total >= 5 && stats[g].rate > bestRate) { bestGap = Number(g); bestRate = stats[g].rate; bestHit = stats[g].hit; bestTotal = stats[g].total; }
      });
      if (!bestGap) {
        Object.keys(stats).forEach(function (g) {
          if (stats[g].total >= 3 && stats[g].rate > bestRate) { bestGap = Number(g); bestRate = stats[g].rate; bestHit = stats[g].hit; bestTotal = stats[g].total; }
        });
      }
      if (!bestGap && Object.keys(stats).length > 0) {
        bestGap = Math.min.apply(null, Object.keys(stats).map(Number));
        bestRate = stats[bestGap].rate; bestHit = stats[bestGap].hit; bestTotal = stats[bestGap].total;
      }
      var desc = "需要等待";
      if (bestRate >= 0.98) desc = "完美触发";
      else if (bestRate >= 0.95) desc = "非常稳定";
      else if (bestRate >= 0.90) desc = "稳定可靠";
      var cls = bestRate >= 0.95 ? "ord-hit" : bestRate >= 0.90 ? "ord-pending" : "ord-miss";
      html += '<tr><td><strong>' + num + "</strong></td><td>缺席 ≥ " + (bestGap || 2) + " 期</td><td class=\"" + cls + "\">" + (bestRate * 100).toFixed(1) + "%</td><td>" + bestHit + "/" + bestTotal + "</td><td>" + desc + "</td></tr>";
    }
    html += "</tbody></table></div></div>";
    html += '<p class="disclaimer">统计口径：当某数字连续缺席 N 期后，接下来 3 期内出现的概率；样本量不足时优先放宽到 3。仅供参考。</p>';
    view.innerHTML = html;
  }

  tabsEl.addEventListener("click", function (e) {
    var btn = e.target.closest(".tab");
    if (btn) {
      state.tab = btn.dataset.tab;
      lsSet("v2_current_tab", state.tab);
      render();
    }
  });

  view.addEventListener("click", function (e) {
    var ordsn = e.target.closest("[data-ordsn]");
    if (ordsn) {
      var t = Number(ordsn.dataset.ordsn);
      if (orderData.sel[t]) delete orderData.sel[t]; else orderData.sel[t] = true;
      renderOrder();
      return;
    }
    if (e.target.closest("[data-ordcreate]")) { orderCreate(); return; }
    var ordhit = e.target.closest("[data-ordhit]");
    if (ordhit) { var hp = ordhit.dataset.ordhit.split(","); orderMark(Number(hp[0]), Number(hp[1]), "hit"); return; }
    var ordmiss = e.target.closest("[data-ordmiss]");
    if (ordmiss) { var mp = ordmiss.dataset.ordmiss.split(","); orderMark(Number(mp[0]), Number(mp[1]), "miss"); return; }
    var orddel = e.target.closest("[data-orddel]");
    if (orddel) { orderDelete(Number(orddel.dataset.orddel)); return; }
    var orddelhist = e.target.closest("[data-orddelhist]");
    if (orddelhist) { orderDeleteHist(Number(orddelhist.dataset.orddelhist)); return; }

    var chip = e.target.closest("[data-window]");
    if (chip) {
      state.window = Number(chip.dataset.window);
      renderTails();
      return;
    }
    var segChip = e.target.closest("[data-segw]");
    if (segChip) {
      state.segWindow = Number(segChip.dataset.segw);
      renderSegments();
      return;
    }
    var segTailsChip = e.target.closest("[data-segtails]");
    if (segTailsChip) {
      state.segTails = Number(segTailsChip.dataset.segtails);
      renderSegments();
      return;
    }
    var segCountChip = e.target.closest("[data-segcount]");
    if (segCountChip) {
      state.segCount = Number(segCountChip.dataset.segcount);
      renderSegments();
      return;
    }
    var rollChip = e.target.closest("[data-rollw]");
    if (rollChip) {
      state.rollWindow = Number(rollChip.dataset.rollw);
      renderTrend();
      return;
    }
    var tailChip = e.target.closest("[data-tail]");
    if (tailChip) {
      state.tail = Number(tailChip.dataset.tail);
      renderTrend();
      return;
    }
    var wkTailChip = e.target.closest("[data-wk-tail]");
    if (wkTailChip) {
      state.tail = Number(wkTailChip.dataset.wkTail);
      renderWindowK();
      return;
    }
    var yearChip = e.target.closest("[data-year]");
    if (yearChip) {
      state.year = Number(yearChip.dataset.year);
      if (state.tab === "trend") renderTrend();
      else if (state.tab === "numtrend") renderNumTrend();
      else if (state.tab === "zodtrend") renderZodTrend();
      else if (state.tab === "zodrecords") renderZodRecords();
      else if (state.tab === "records") renderRecords();
      return;
    }
    if (e.target.closest("[data-prev]")) {
      if (state.recordPage > 0) {
        state.recordPage--;
        if (state.tab === "zodrecords") renderZodRecords();
        else renderRecords();
      }
      return;
    }
    if (e.target.closest("[data-next]")) {
      state.recordPage++;
      if (state.tab === "zodrecords") renderZodRecords();
      else renderRecords();
      return;
    }
  });

  view.addEventListener("input", function (e) {
    var id = e.target.id;
    if (id === "ordBase" || id === "ordM1" || id === "ordM2" || id === "ordM3" || id === "ordRet") {
      var v = parseFloat(e.target.value);
      if (isNaN(v)) return;
      if (id === "ordBase") orderData.base = v;
      else if (id === "ordM1") orderData.m1 = v;
      else if (id === "ordM2") orderData.m2 = v;
      else if (id === "ordM3") orderData.m3 = v;
      else orderData.ret = v;
      updateOrderFormula();
    }
  });

  var validTabs = TABS.filter(function (t) { return !t.group; }).map(function (t) { return t.id; });
  if (validTabs.indexOf(state.tab) === -1) state.tab = "overview";
  renderHeader();
  render();
})();
