(function () {
  "use strict";

  var RAW = window.APP_DATA.raw;
  var D = window.APP_DATA.d;

  var periods = Object.keys(RAW)
    .map(Number)
    .sort(function (a, b) { return a - b; });
  var latest = periods[periods.length - 1];
  var MODEL = window.CAISHEN_MODEL.createModel(RAW);

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

  function hitMissTxt(h, t) {
    if (t < 10) return { txt: "样本不足", color: "#94a3b8" };
    var miss = t - h;
    var color = t < 20 ? "#eab308" : "#16a34a";
    return {
      txt: '<span style="color:#16a34a">中' + h + '</span>·<span style="color:#dc2626">错' + miss + '</span>·<span style="color:#9ca3af">共' + t + '</span>',
      color: color
    };
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
    return { name: name, n: n, hitSum: hitSum, avgHit: n ? hitSum / n : 0, avgBase: n ? baseSum / n : 0, edge: n ? (hitSum - baseSum) / n : 0 };
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
    var maxC = 0, minC = 0;
    var labels = {};
    arr.forEach(function (e) {
      var r = e.rate;
      if (r > max) { max = r; maxC = e.c; }
      if (r < min) { min = r; minC = e.c; }
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
      max: max, min: min, maxC: maxC, minC: minC, avg: sum / arr.length, most: most, mostCnt: mostCnt,
      total: arr.length, range: range, rangeLabel: rangeLabel,
      rule: "最高" + maxC + "/" + w + " 最低" + minC + "/" + w + " 最频" + most + "(" + mostCnt + "/" + arr.length + ")"
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
    tab: lsGet("v2_current_tab", "segments"),
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
    { id: "predict", label: "下期预估" },
    { id: "pick3", label: "双号推荐" },
    { id: "segments", label: "分段对比" },
    { id: "missorder", label: "遗漏排序" },
    { id: "parity", label: "单双热图" },
    { id: "trend", label: "遗漏热图" },
    { id: "zodtrend", label: "生肖走势" },
    { id: "zodwindow", label: "生肖窗口" },
    { id: "zodmonitor", label: "生肖遗漏" },
    { id: "personality", label: "尾号性格" },
    { id: "datarecord", label: "三期规律" },
    { id: "miss", label: "遗漏监控" },
    { id: "tails", label: "冷热分析" },
    { id: "windowk", label: "窗口走势" },
    { id: "zodrecords", label: "生肖开奖" },
    { id: "backtest", label: "策略回测" },
    { id: "numtrend", label: "号码走势" },
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

  // ===== 导航自定义排序 =====
  var TAB_ORDER_KEY = "v2_tab_order";
  var tabSortMode = false;

  // 合并默认顺序与自定义顺序：已保存且仍存在→按保存顺序；新增→追加末尾；已删除→忽略
  function getVisibleTabs() {
    var saved = lsGet(TAB_ORDER_KEY, null);
    if (!Array.isArray(saved) || !saved.length) return TABS.slice();
    var byId = {};
    TABS.forEach(function (t) { byId[t.id] = t; });
    var seen = {};
    var result = [];
    saved.forEach(function (id) {
      if (byId[id] && !seen[id]) {
        result.push(byId[id]);
        seen[id] = true;
      }
    });
    TABS.forEach(function (t) {
      if (!seen[t.id]) {
        result.push(t);
        seen[t.id] = true;
      }
    });
    return result;
  }

  function saveTabOrder(tabs) {
    lsSet(TAB_ORDER_KEY, tabs.map(function (t) { return t.id; }));
  }

  function resetTabOrder() {
    try { localStorage.removeItem(TAB_ORDER_KEY); } catch (e) {}
  }

  function renderTabs() {
    var tabs = getVisibleTabs();
    var html = tabs.map(function (t) {
      if (t.group) return '<span class="tab-group">' + t.group + "</span>";
      if (tabSortMode) {
        return '<span class="sort-item-wrap">' +
          '<button class="sort-btn" type="button" data-sort="up" data-tab="' + t.id + '" aria-label="' + t.label + ' 前移">↑</button>' +
          '<button class="tab sort-item' + (state.tab === t.id ? " is-active" : "") + '" type="button" data-tab="' + t.id + '">' + t.label + "</button>" +
          '<button class="sort-btn" type="button" data-sort="down" data-tab="' + t.id + '" aria-label="' + t.label + ' 后移">↓</button>' +
          "</span>";
      }
      return '<button class="tab ' + (state.tab === t.id ? "is-active" : "") +
        '" type="button" data-tab="' + t.id + '">' + t.label + "</button>";
    }).join("");

    html += '<div class="tab-sort-tail">';
    html += '<button class="tab sort-toggle' + (tabSortMode ? " is-on" : "") + '" type="button" data-sort-toggle="1">' +
      (tabSortMode ? "退出排序" : "导航排序") + "</button>";
    if (tabSortMode) {
      html += '<button class="tab sort-reset" type="button" data-sort-reset="1">恢复默认</button>';
    }
    html += "</div>";

    tabsEl.classList.toggle("sorting", tabSortMode);
    tabsEl.innerHTML = html;
  }

  function renderHeader() {
    document.getElementById("latestPeriod").textContent = latest;
    document.getElementById("latestTails").textContent = "尾 " + tailsOf(latest).join(" ");
  }

  function scrollToLatest() {
    if (state.tab === "pick3") return;
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
    else if (state.tab === "zodwindow") renderZodWindow();
    else if (state.tab === "zodmonitor") renderZodMonitor();
    else if (state.tab === "zodrecords") renderZodRecords();
    else if (state.tab === "records") renderRecords();
    else if (state.tab === "history") renderHistory();
    else if (state.tab === "backtest") renderBacktest();
    else if (state.tab === "order") renderOrder();
    else if (state.tab === "predict") renderPredict();
    else if (state.tab === "pick3") renderPick3();
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
          hits: mb.hits,
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
    html += '<div class="panel"><table class="table"><thead><tr><th>尾数</th><th>遗漏</th><th>理论基准</th><th>命中/错</th><th>样本</th><th>多/少中</th><th>判定</th></tr></thead><tbody>';
    refs.forEach(function (r) {
      var verdict = "无信号";
      if (r.sample >= 20 && r.edge >= 0.04) verdict = "偏热";
      else if (r.sample >= 20 && r.edge <= -0.04) verdict = "偏冷";
      var verdictCls = verdict === "偏热" ? "cell--hot" : verdict === "偏冷" ? "cell--cold" : "";
      var rhitTxt, rhitColor;
      if (r.sample < 10) { rhitTxt = "样本不足"; rhitColor = "#94a3b8"; }
      else { rhitTxt = "中" + r.hits + "·错" + (r.sample - r.hits); rhitColor = r.sample < 20 ? "#eab308" : "#16a34a"; }
      var rbaseHit = Math.round(r.sample * r.base);
      var redgeCnt = r.hits - rbaseHit;
      var redgeTxt = redgeCnt >= 0 ? "多中" + redgeCnt + "个" : "少中" + (-redgeCnt) + "个";
      html += "<tr><td>" + r.tail + '</td><td class="' + (r.miss >= 4 ? "cell--hot" : "cell--cold") + '">' + r.miss + '</td><td>' + pct(r.base) + "</td><td style=\"color:" + rhitColor + ";font-weight:700\">" + rhitTxt + "</td><td>" + r.sample + "</td><td>" + redgeTxt + '</td><td class="' + verdictCls + '">' + verdict + "</td></tr>";
    });
    html += "</tbody></table></div></div>";

    html += '<p class="disclaimer">理论基准率：尾数 0 为 47.17%，尾数 1-9 为 55.39%（因为 1-49 中尾数 0 只有 4 个号，其余各有 5 个号）。差值需样本足够才有参考意义；当前多数信号都在统计噪声范围内，不应据此追号。</p>';

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

    html += '<div class="section"><div class="panel"><table class="table"><thead><tr><th>尾数</th><th>近 ' + w + " 期</th><th>期望</th><th>多/少中</th><th>判定</th><th>当前遗漏</th></tr></thead><tbody>";
    for (var t = 0; t < 10; t++) {
      var z = zScore(t, w);
      var miss = currentMiss(t);
      var verdict = "正常", cls = "";
      if (z.z >= 2) { verdict = "偏热"; cls = "cell--hot"; }
      else if (z.z <= -2) { verdict = "偏冷"; cls = "cell--cold"; }
      var zdiff = Math.round(z.count - z.expected);
      var zdTxt = zdiff >= 0 ? "多中" + zdiff + "个" : "少中" + (-zdiff) + "个";
      html += "<tr><td>" + t + '</td><td>' + z.count + "/" + w + "</td><td>" + z.expected.toFixed(1) + '</td><td>' + zdTxt + '</td><td class="' + cls + '">' + verdict + '</td><td class="cell--' + (miss >= 4 ? "hot" : "cold") + '">' + miss + " 期</td></tr>";
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
    var historyCount = 15;
    var html = '<div class="section"><div class="section__head"><h2 class="section__title">遗漏监控</h2><span class="section__hint">颜色越深，遗漏越久 · 最近 15 次记录按旧到新排列</span></div>';
    html += '<div class="panel"><table class="table"><thead><tr><th>尾数</th><th>当前遗漏</th><th>历史最大</th><th>近 15 次遗漏（旧→新）</th></tr></thead><tbody>';
    for (var t = 0; t < 10; t++) {
      var miss = currentMiss(t);
      var max = maxMiss(t);
      var history = recentMisses(t, historyCount);
      var chips = history.map(function (v) {
        var bg = v >= 4 ? "#fee2e2" : v === 3 ? "#fef3c7" : v === 2 ? "#dcfce7" : v === 1 ? "#dbeafe" : "#f3f4f6";
        var color = v >= 4 ? "#b91c1c" : v === 3 ? "#a16207" : v === 2 ? "#15803d" : v === 1 ? "#1d4ed8" : "#6b7280";
        return '<span style="display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:22px;padding:0 5px;border-radius:5px;background:' + bg + ';color:' + color + ';font-weight:700">' + v + "</span>";
      }).join("");
      html += '<tr><td>' + t + '</td><td class="' + missClass(miss) + '">' + miss + " 期</td><td>" + max + " 期</td><td><div style=\"display:flex;flex-wrap:wrap;gap:4px;min-width:220px\">" + chips + "</div></td></tr>";
    }
    html += "</tbody></table></div></div>";
    html += '<p class="disclaimer">当前遗漏 = 截至最新一期连续未开出的期数；历史遗漏按完成一次遗漏后重新开出的记录统计。</p>';
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
    return out.reverse();
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
    var w = state.windowK || 10;
    var startIdx = Math.max(0, periods.length - w);
    var recentPeriods = periods.slice(startIdx);
    var recent = recentPeriods.length;
    var lastPeriod = recentPeriods[recentPeriods.length - 1];
    var rows = [];
    var hotTails = [], coldTails = [], warmingTails = [], coolingTails = [];

    for (var t = 0; t < 10; t++) {
      var count = 0;
      var split = Math.floor(recentPeriods.length / 2);
      var older = recentPeriods.slice(0, split);
      var newer = recentPeriods.slice(split);
      var olderHits = 0, newerHits = 0;
      var cells = [];
      recentPeriods.forEach(function (p, idx) {
        var isHit = hit(p, t);
        if (isHit) count++;
        if (idx < split) {
          if (isHit) olderHits++;
        } else if (isHit) {
          newerHits++;
        }
        var bg = isHit ? "#dcfce7" : "#f3f4f6";
        var color = isHit ? "#16a34a" : "#9ca3af";
        var border = p === lastPeriod ? "box-shadow:inset 0 0 0 2px #2563eb;" : "";
        cells.push('<span title="第' + p + "期 " + (isHit ? "开出" : "未出") + '" style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:4px;background:' + bg + ';color:' + color + ';font-weight:800;' + border + '">' + (isHit ? "●" : "○") + "</span>");
      });

      var rate = recent ? count / recent : 0;
      var expected = recent * BASE_RATE[t];
      var delta = count - expected;
      var olderRate = older.length ? olderHits / older.length : 0;
      var newerRate = newer.length ? newerHits / newer.length : 0;
      var trend = "平稳", trendColor = "#6b7280";
      if (newerRate - olderRate >= 0.2) { trend = "↑升温"; trendColor = "#16a34a"; }
      else if (newerRate - olderRate <= -0.2) { trend = "↓降温"; trendColor = "#2563eb"; }

      var status, statusColor;
      if (rate >= 0.6) { status = "热"; statusColor = "#16a34a"; }
      else if (rate <= 0.2) { status = "冷"; statusColor = "#dc2626"; }
      else { status = "中"; statusColor = "#6b7280"; }

      if (status === "热") hotTails.push(t);
      if (status === "冷") coldTails.push(t);
      if (trend === "↑升温") warmingTails.push(t);
      if (trend === "↓降温") coolingTails.push(t);

      rows.push({
        tail: t,
        count: count,
        rate: rate,
        expected: expected,
        delta: delta,
        trend: trend,
        trendColor: trendColor,
        status: status,
        statusColor: statusColor,
        miss: currentMiss(t),
        streak: currentStreak(t),
        lastHit: hit(lastPeriod, t),
        cells: cells.join("")
      });
    }

    var fmtTails = function (arr) {
      return arr.length ? arr.map(function (x) { return "尾" + x; }).join("、") : "无";
    };
    var deltaText = function (x) {
      var v = Math.round(Math.abs(x) * 10) / 10;
      return x >= 0 ? "+" + v : "-" + v;
    };

    var html = '<div class="section"><div class="section__head"><h2 class="section__title">窗口走势</h2><span class="section__hint">第' + recentPeriods[0] + '期 - 第' + lastPeriod + "期 · 共" + recent + "期</span></div>";
    html += '<div class="chips" style="margin-bottom:12px">';
    [5, 7, 10, 15, 21, 30].forEach(function(n) {
      html += '<button class="chip ' + (w === n ? "is-active" : "") + '" data-wk-window="' + n + '">' + n + "期</button>";
    });
    html += '</div>';

    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-bottom:10px">';
    html += '<div class="stat"><div class="stat__value" style="font-size:15px">' + fmtTails(hotTails) + '</div><div class="stat__label">本窗口偏热</div></div>';
    html += '<div class="stat"><div class="stat__value" style="font-size:15px">' + fmtTails(coldTails) + '</div><div class="stat__label">本窗口偏冷</div></div>';
    html += '<div class="stat"><div class="stat__value" style="font-size:15px">' + fmtTails(warmingTails) + '</div><div class="stat__label">后半段升温</div></div>';
    html += '<div class="stat"><div class="stat__value" style="font-size:15px">' + fmtTails(coolingTails) + '</div><div class="stat__label">后半段降温</div></div>';
    html += '</div>';

    html += '<div class="panel"><div class="panel__body" style="overflow-x:auto;-webkit-overflow-scrolling:touch"><table class="table" style="font-size:12px;min-width:760px"><thead><tr><th style="position:sticky;left:0;z-index:2;background:#fafafa">尾号</th><th>当前（漏/连）</th><th>本窗口</th><th>比基准</th><th>升温/降温</th><th>最新</th><th style="min-width:230px">窗口逐期</th></tr></thead><tbody>';
    rows.forEach(function (r) {
      html += '<tr><td style="position:sticky;left:0;z-index:1;background:#fff"><b>尾' + r.tail + "</b></td>";
      html += "<td>漏" + r.miss + " · 连" + r.streak + "</td>";
      html += '<td><b>' + r.count + "/" + recent + '</b> <span style="color:' + r.statusColor + ';font-weight:700">' + r.status + '</span><br><small style="color:var(--muted)">' + Math.round(r.rate * 100) + "%</small></td>";
      html += '<td><span style="color:' + (r.delta >= 0 ? "#16a34a" : "#dc2626") + ';font-weight:700">' + deltaText(r.delta) + "</span><br><small style=\"color:var(--muted)\">期望" + r.expected.toFixed(1) + "</small></td>";
      html += '<td style="color:' + r.trendColor + ';font-weight:700">' + r.trend + "</td>";
      html += '<td><span style="color:' + (r.lastHit ? "#16a34a" : "#9ca3af") + ';font-weight:700">' + (r.lastHit ? "开出" : "未出") + "</span></td>";
      html += '<td><div style="display:flex;gap:3px;align-items:center">' + r.cells + "</div></td></tr>";
    });
    html += "</tbody></table></div></div></div>";
    html += '<p class="disclaimer">“比基准”=本窗口实际开出次数减去按该尾数理论概率计算的期望次数；升温/降温按窗口前半段与后半段开出率的变化判断。</p>';
    view.innerHTML = html;
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
    var CM = window.CAISHEN_MODEL || {};
    var wilsonFn = CM.wilson || function () { return null; };
    var signals = [
      backtestSignal("热号跟踪（近15期≥10次）", function (t, i) { return countEnding(t, i, 15) >= 10; }),
      backtestSignal("冷号反弹（近15期≤5次）", function (t, i) { return countEnding(t, i, 15) <= 5; }),
      backtestSignal("遗漏≥2期后反弹", function (t, i) { return missedRun(t, i, 2); }),
      backtestSignal("遗漏≥3期后反弹", function (t, i) { return missedRun(t, i, 3); })
    ];
    var html = '<div class="section"><div class="section__head"><h2 class="section__title">策略回测</h2><span class="section__hint">信号出现后，下一期真实命中率 vs 理论基准</span></div>';
    html += '<div class="panel"><div class="panel__body" style="overflow-x:auto;-webkit-overflow-scrolling:touch"><table class="table" style="min-width:880px"><thead><tr><th style="position:sticky;left:0;z-index:2;background:#fafafa">信号</th><th>样本</th><th>命中/未中</th><th>命中率</th><th>理论基准</th><th>差值</th><th>95%CI</th><th>结论</th></tr></thead><tbody>';
    signals.forEach(function (s) {
      var ci = s.n ? wilsonFn(s.hitSum, s.n) : null;
      var verdict = "样本不足", cls = "";
      if (s.n >= 30 && ci) {
        if (ci.lo > s.avgBase) { verdict = "有优势"; cls = "cell--hot"; }
        else if (ci.hi < s.avgBase) { verdict = "偏弱"; cls = "cell--cold"; }
        else { verdict = "无显著优势"; }
      }
      var hitTxt, hitColor;
      if (s.n < 10) { hitTxt = "样本不足"; hitColor = "#94a3b8"; }
      else { hitTxt = "中" + s.hitSum + "·未中" + (s.n - s.hitSum); hitColor = s.n < 30 ? "#d97706" : "#16a34a"; }
      var edgePct = (s.avgHit - s.avgBase) * 100;
      var edgeTxt = (edgePct >= 0 ? "+" : "") + edgePct.toFixed(1) + "个百分点";
      var ciTxt = ci ? pct(ci.lo) + "~" + pct(ci.hi) : "样本不足";
      html += '<tr><td style="position:sticky;left:0;z-index:1;background:#fff;text-align:left;font-weight:700">' + s.name + "</td>";
      html += "<td>" + s.n + "</td>";
      html += '<td style="color:' + hitColor + ';font-weight:700">' + hitTxt + "</td>";
      html += "<td><b>" + pct(s.avgHit) + "</b></td>";
      html += "<td>" + pct(s.avgBase) + "</td>";
      html += '<td style="color:' + (edgePct >= 0 ? "#16a34a" : "#dc2626") + ';font-weight:700">' + edgeTxt + "</td>";
      html += "<td>" + ciTxt + "</td>";
      html += '<td class="' + cls + '">' + verdict + "</td></tr>";
    });
    html += "</tbody></table></div></div></div>";
    
    // 添加当前信号板块
    var currentIdx = periods.length - 1;
    var currentPeriod = periods[currentIdx];
    var hotTails = [], coldTails = [], miss2Tails = [], miss3Tails = [];
    for (var t = 0; t < 10; t++) {
      if (countEnding(t, currentIdx, 15) >= 10) hotTails.push(t);
      if (countEnding(t, currentIdx, 15) <= 5) coldTails.push(t);
      if (missedRun(t, currentIdx, 2)) miss2Tails.push(t);
      if (missedRun(t, currentIdx, 3)) miss3Tails.push(t);
    }
    
    html += '<div class="section"><div class="section__head"><h2 class="section__title">当前信号</h2><span class="section__hint">第' + currentPeriod + '期后触发信号的尾数</span></div>';
    html += '<div class="panel"><div class="panel__body">';
    
    // 热号信号
    html += '<div style="margin-bottom:12px"><b style="color:#dc2626">🔥 热号信号（近15期≥10次）</b>';
    if (hotTails.length > 0) {
      html += '<div style="margin-top:6px">触发尾数：';
      hotTails.forEach(function(t) { html += '<span style="background:#fee2e2;color:#dc2626;padding:2px 8px;border-radius:4px;margin-right:6px;font-weight:700">尾' + t + '</span>'; });
      html += '</div>';
    } else {
      html += '<div style="margin-top:6px;color:#999">无触发尾数</div>';
    }
    html += '</div>';
    
    // 冷号信号
    html += '<div style="margin-bottom:12px"><b style="color:#2563eb">❄️ 冷号信号（近15期≤5次）</b>';
    if (coldTails.length > 0) {
      html += '<div style="margin-top:6px">触发尾数：';
      coldTails.forEach(function(t) { html += '<span style="background:#dbeafe;color:#2563eb;padding:2px 8px;border-radius:4px;margin-right:6px;font-weight:700">尾' + t + '</span>'; });
      html += '</div>';
    } else {
      html += '<div style="margin-top:6px;color:#999">无触发尾数</div>';
    }
    html += '</div>';
    
    // 遗漏2期信号
    html += '<div style="margin-bottom:12px"><b style="color:#ea580c">⏰ 遗漏≥2期信号</b>';
    if (miss2Tails.length > 0) {
      html += '<div style="margin-top:6px">触发尾数：';
      miss2Tails.forEach(function(t) { html += '<span style="background:#ffedd5;color:#ea580c;padding:2px 8px;border-radius:4px;margin-right:6px;font-weight:700">尾' + t + '</span>'; });
      html += '</div>';
    } else {
      html += '<div style="margin-top:6px;color:#999">无触发尾数</div>';
    }
    html += '</div>';
    
    // 遗漏3期信号
    html += '<div style="margin-bottom:0"><b style="color:#7c3aed">⏰ 遗漏≥3期信号</b>';
    if (miss3Tails.length > 0) {
      html += '<div style="margin-top:6px">触发尾数：';
      miss3Tails.forEach(function(t) { html += '<span style="background:#ede9fe;color:#7c3aed;padding:2px 8px;border-radius:4px;margin-right:6px;font-weight:700">尾' + t + '</span>'; });
      html += '</div>';
    } else {
      html += '<div style="margin-top:6px;color:#999">无触发尾数</div>';
    }
    html += '</div>';
    
    html += '</div></div></div>';
    
    html += '<p class="disclaimer">结论依据真实命中率的Wilson 95%区间：区间整体高于理论基准才算有优势，整体低于基准才算偏弱；区间跨过基准时不能判定有优势。样本少于30期统一显示样本不足。</p>';
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
        var shm = hitMissTxt(e.c, w);
        cell += '<span class="seg-hist-rate" style="color:' + shm.color + '">' + shm.txt + '</span> <b>' + segTextLabel(e.rate) + '</b><br><b>' + e.c + '/' + w + '</b>' + dot;
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
        html += '<td>最高' + s.maxC + '/' + w + ' 最低' + s.minC + '/' + w + ' ' + s.rangeLabel + ' ' + s.most + '(' + s.mostCnt + '/' + s.total + ')</td>';
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
    
    var html = '<div class="section"><div class="section__head"><h2 class="section__title">分段对比</h2><span class="section__hint">共' + segs.length + '段 · 横向滑动查看</span></div>';
    html += '<div class="chips" style="margin-bottom:12px">';
    [5, 7, 10, 15, 21, 30].forEach(function(n) {
      html += '<button class="chip ' + (w === n ? "is-active" : "") + '" data-segw="' + n + '">' + n + "期</button>";
    });
    html += '</div>';
    html += '<div class="panel"><div class="panel__body" style="overflow-x:auto"><table class="table" style="font-size:12px;white-space:nowrap"><thead><tr><th style="position:sticky;left:0;background:#fff;z-index:2;min-width:40px">尾数</th>';
    segs.forEach(function(seg, idx) {
      html += '<th style="text-align:center;min-width:52px">第' + (idx+1) + '段<br><span style="font-size:10px;color:#999">' + seg.s + '-' + seg.e + '期</span></th>';
    });
    html += '<th style="text-align:center;position:sticky;right:0;background:#fff;z-index:2;min-width:50px">预估</th></tr></thead><tbody>';
    
    for (var t = 0; t < 10; t++) {
      html += '<tr><td style="position:sticky;left:0;background:#fff;z-index:1"><b>尾' + t + '</b></td>';
      var firstCount = 0, lastCount = 0;
      segs.forEach(function(seg, idx) {
        var c = countInSeg(t, seg.si, seg.ei);
        if (idx === 0) firstCount = c;
        if (idx === segs.length - 1) lastCount = c;
        var hotThresh = Math.ceil(seg.len * 0.6);
        var coldThresh = Math.floor(seg.len * 0.2);
        var color = c >= hotThresh ? '#16a34a' : c > coldThresh ? '#6b7280' : c > 0 ? '#eab308' : '#dc2626';
        html += '<td style="text-align:center"><span style="color:' + color + ';font-weight:700;font-size:16px">' + c + '</span><span style="color:#999;font-size:10px">/' + seg.len + '</span></td>';
      });
      var pred = predictSegmentCount(t, w);
      var predColor = pred.pred >= w * 0.6 ? '#16a34a' : pred.pred >= w * 0.4 ? '#6b7280' : pred.pred >= w * 0.2 ? '#eab308' : '#dc2626';
      html += '<td style="text-align:center;position:sticky;right:0;background:#fff;z-index:1;color:' + predColor + ';font-weight:700">' + pred.pred.toFixed(1) + '</td></tr>';
    }
    html += '</tbody></table></div></div></div>';
    html += '<p class="disclaimer">数字=开出次数 · <span style="color:#16a34a">绿≥60%</span> <span style="color:#6b7280">灰中间</span> <span style="color:#eab308">黄偏冷</span> <span style="color:#dc2626">红≤20%</span> · 预估=下一段预计开出次数 · 可横向滑动</p>';
    view.innerHTML = html;
    // 自动滚动到最新位置（最右边）
    var scrollContainer = view.querySelector('.panel__body');
    if (scrollContainer) {
      scrollContainer.scrollLeft = scrollContainer.scrollWidth;
    }
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
  // 新模型：加权恰好遗漏k期反弹率（回测 中23·错21·共44）
  var BOUNCE = { 0: 2, 1: 3, 2: 1, 3: 1, 4: 2, 5: 1, 6: 2, 7: 2, 8: 2, 9: 4 };
  var NEW_MODEL = { decayRate: 1.75, bounceThresh: 0.75, bounceThresh2: 0.65, wBounce: 5, wBounce2: 3, wDepth: 1, depthThresh: 0.5, minSample: 2 };

  // 方案B：多因子加分
  function streakBonus(d, upto) {
    var run = 0;
    for (var i = periods.length - 1; i >= 0; i--) {
      if (periods[i] > upto) continue;
      if (hit(periods[i], d)) run++; else break;
    }
    return run >= 2 ? 2 : run >= 1 ? 1 : 0;
  }
  function hotWindowBonus(d, upto) {
    var c = cntRange(d, upto - 6, upto);
    return c >= 4 ? 2 : c >= 3 ? 1 : 0;
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

  function reboundUntil(d, upto) {
    var k = missUntil(d, upto);
    var total = 0, hits = 0, run = 0;
    for (var p = 1; p < upto; p++) {
      if (hit(p, d)) run = 0;
      else {
        run++;
        if (run >= k) {
          total++;
          if (hit(p + 1, d)) hits++;
        }
      }
    }
    return { rate: total ? hits / total : 0, total: total };
  }

  // 新模型核心：恰好遗漏k期的加权近期反弹率
  function weightedExactBounce(d, upto, k) {
    var totalW = 0, hitsW = 0, run = 0;
    var total = 0, hits = 0;
    var uidx = periods.indexOf(upto);
    if (uidx < 0) {
      for (var x = 0; x < periods.length; x++) { if (periods[x] === upto) { uidx = x; break; } }
    }
    if (uidx < 0) return { rate: 0, sample: 0, total: 0, hits: 0 };
    for (var i = 0; i < periods.length - 1; i++) {
      if (periods[i] >= upto) break;
      if (hit(periods[i], d)) { run = 0; }
      else {
        run++;
        if (run === k) {
          var distFromEnd = uidx - i;
          var weight = Math.max(1, 10 - distFromEnd / NEW_MODEL.decayRate);
          totalW += weight;
          total++;
          if (hit(periods[i + 1], d)) { hitsW += weight; hits++; }
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
      if (hit(periods[i], d)) { run = 0; } else { run++; if (run > maxM) maxM = run; }
    }
    return { miss: m, maxMiss: maxM, ratio: maxM > 0 ? m / maxM : 0 };
  }

  function newModelScore(d, upto) {
    var md = missDepthRatio(d, upto);
    var wb = weightedExactBounce(d, upto, md.miss);
    var score = 0;
    if (wb.sample >= NEW_MODEL.minSample) {
      if (wb.rate >= NEW_MODEL.bounceThresh) score += NEW_MODEL.wBounce;
      else if (wb.rate >= NEW_MODEL.bounceThresh2) score += NEW_MODEL.wBounce2;
    }
    if (md.ratio >= NEW_MODEL.depthThresh) score += NEW_MODEL.wDepth;
    return { score: score, wbr: wb.rate, wbSample: wb.sample, miss: md.miss, maxMiss: md.maxMiss, ratio: md.ratio };
  }

  function tailReviewAt(N) {
    if (N < 1 || !bin(N + 1)) return null;
    var cands = [];
    var lastBin = bin(N);
    for (var d = 0; d < 10; d++) {
      if (lastBin[d] === "0") {
        var ns = newModelScore(d, N);
        cands.push({ d: d, miss: ns.miss, score: ns.score, wbr: ns.wbr, wbSample: ns.wbSample, maxMiss: ns.maxMiss, ratio: ns.ratio });
      }
    }
    cands.sort(function (a, b) { return b.score - a.score; });
    var actual = tailsOf(N + 1);
    return { N: N, actual: actual, cands: cands };
  }

  function prevTailReview() {
    return tailReviewAt(latest - 1);
  }

  function tailReviewHistory() {
    var out = [];
    for (var N = 1; N <= latest - 1; N++) {
      var r = tailReviewAt(N);
      if (!r) continue;
      var row = { N: N, period: N + 1, actual: r.actual, source: "回测", settledAt: null };
      if (r.cands.length === 0) {
        row.status = "跳过";
      } else if (r.cands[0].score <= 0) {
        row.status = "跳过";
      } else if (r.cands.length >= 2 && r.cands[0].score === r.cands[1].score) {
        row.status = "跳过";
      } else {
        row.top = r.cands[0].d;
        row.sec = r.cands.length >= 2 ? r.cands[1].d : null;
        row.topHit = r.actual.indexOf(row.top) >= 0;
        row.secHit = row.sec === null ? null : r.actual.indexOf(row.sec) >= 0;
        row.atLeastOne = row.topHit || row.secHit === true;
        row.status = row.atLeastOne ? "对" : "错";
      }
      out.push(row);
    }
    return out;
  }

  function weightedSnapshotHistory() {
    var stats = window.APP_SNAPSHOTS || {};
    var records = Array.isArray(stats.weightedRecords) ? stats.weightedRecords : [];
    return records.filter(function (r) { return r.settled; }).map(function (r) {
      var picks = Array.isArray(r.picks) ? r.picks : [];
      var top = picks.length ? picks[0].tail : undefined;
      var sec = picks.length >= 2 ? picks[1].tail : undefined;
      var topHit = top === undefined ? null : (r.actualTails || []).indexOf(top) >= 0;
      var secHit = sec === undefined ? null : (r.actualTails || []).indexOf(sec) >= 0;
      return {
        N: r.basedOn,
        period: r.target,
        actual: r.actualTails || [],
        top: top,
        sec: sec,
        topHit: topHit,
        secHit: secHit,
        atLeastOne: topHit === true || secHit === true,
        status: !picks.length ? "跳过" : ((topHit === true || secHit === true) ? "对" : "错"),
        snapshot: true,
        source: "真实快照",
        settledAt: r.settledAt || null
      };
    });
  }

  function combinedPredictHistory() {
    var byPeriod = {};
    byPeriod[periods[0]] = {
      N: 0,
      period: periods[0],
      actual: tailsOf(periods[0]),
      source: "回测",
      status: "起点",
      start: true,
      settledAt: null
    };
    tailReviewHistory().forEach(function (row) { byPeriod[row.period] = row; });
    weightedSnapshotHistory().forEach(function (row) { byPeriod[row.period] = row; });
    return Object.keys(byPeriod).map(function (p) { return byPeriod[p]; })
      .sort(function (a, b) { return a.period - b.period; });
  }

  function weightedStreakStats(rows) {
    var defs = {
      first: { missRun: 0, maxMiss: 0 },
      second: { missRun: 0, maxMiss: 0 }
    };
    var cells = [];

    function update(st, isHit) {
      if (isHit) {
        st.missRun = 0;
      } else {
        st.missRun++;
        if (st.missRun > st.maxMiss) st.maxMiss = st.missRun;
      }
    }

    function mark(st, isHit) {
      if (isHit) return { text: "中", color: "#16a34a" };
      return {
        text: String(st.missRun),
        color: "#dc2626"
      };
    }

    rows.forEach(function (row) {
      if (row.top === undefined || !row.actual || !row.actual.length) return;
      var firstHit = row.topHit === true;
      var secondHit = row.secHit === true;
      update(defs.first, firstHit);
      if (row.sec !== null && row.sec !== undefined) update(defs.second, secondHit);
      cells.push({
        period: row.period,
        first: mark(defs.first, firstHit),
        second: row.sec === null || row.sec === undefined ? { text: "空", color: "#9ca3af" } : mark(defs.second, secondHit)
      });
    });

    return { defs: defs, cells: cells };
  }

  function weightedHistoryPerformance(rows) {
    var perf = {
      actDays: 0,
      tHits: 0,
      tMiss: 0,
      cum: 0,
      peak: 0,
      maxDD: 0
    };
    rows.forEach(function (row) {
      if (row.top === undefined || !row.actual || !row.actual.length) return;
      var isHit = row.actual.indexOf(row.top) >= 0;
      perf.actDays++;
      if (isHit) perf.tHits++;
      else perf.tMiss++;
      var pnl = isHit ? 0.8 : -1;
      perf.cum = +(perf.cum + pnl).toFixed(2);
      if (perf.cum > perf.peak) perf.peak = perf.cum;
      var dd = +(perf.peak - perf.cum).toFixed(2);
      if (dd > perf.maxDD) perf.maxDD = dd;
    });
    perf.singleRate = perf.actDays ? perf.tHits / perf.actDays * 100 : 0;
    return perf;
  }

  function renderPredict() {
    var N = latest;
    var snapStats = window.APP_SNAPSHOTS || {};
    var weightedSnapshots = Array.isArray(snapStats.weightedRecords) ? snapStats.weightedRecords : [];
    var pendingSnapshot = null;
    for (var psi = 0; psi < weightedSnapshots.length; psi++) {
      if (!weightedSnapshots[psi].settled && weightedSnapshots[psi].target === N + 1) {
        pendingSnapshot = weightedSnapshots[psi];
        break;
      }
    }
    var html = '<div class="section"><div class="section__head"><h2 class="section__title">加权反弹率分析</h2><span class="section__hint">恰好遗漏k期 · 加权近期反弹率 · 回测 中23·错21·共44</span></div>';
    html += '<div class="panel"><table class="table"><thead><tr><th>尾数</th><th>当前遗漏</th><th>历史最大</th><th>遗漏/最大</th><th>反弹命中</th><th>样本</th><th>得分</th></tr></thead><tbody>';
    var cands = [];
    var lastBin = bin(N);
    for (var d = 0; d < 10; d++) {
      var miss = currentMiss(d);
      var md = missDepthRatio(d, N);
      var wb = weightedExactBounce(d, N, md.miss);
      var score = 0;
      if (lastBin[d] === "0") {
        if (wb.sample >= NEW_MODEL.minSample) {
          if (wb.rate >= NEW_MODEL.bounceThresh) score += NEW_MODEL.wBounce;
          else if (wb.rate >= NEW_MODEL.bounceThresh2) score += NEW_MODEL.wBounce2;
        }
        if (md.ratio >= NEW_MODEL.depthThresh) score += NEW_MODEL.wDepth;
        cands.push({ d: d, miss: md.miss, maxMiss: md.maxMiss, ratio: md.ratio, wbr: wb.rate, wbSample: wb.sample, wbHits: wb.hits, wbTotal: wb.total, score: score });
      }
      var ratioTxt = md.maxMiss > 0 ? md.miss + "/" + md.maxMiss + "期" : "-";
      var ratioColor = md.ratio >= 0.5 ? '#dc2626' : md.ratio >= 0.3 ? '#eab308' : '#22c55e';
      var wbhm = hitMissTxt(wb.hits, wb.total);
      html += '<tr><td>尾' + d + '</td><td>' + md.miss + '期</td><td>' + md.maxMiss + '期</td><td style="color:' + ratioColor + ';font-weight:700">' + ratioTxt + '</td><td style="color:' + wbhm.color + ';font-weight:700;white-space:nowrap">' + wbhm.txt + '</td><td>' + wb.sample.toFixed(1) + '</td><td>' + score + '分</td></tr>';
    }
    html += "</tbody></table></div></div>";

    cands.sort(function (a, b) { return b.score - a.score; });
    var recItems = [];
    if (pendingSnapshot && pendingSnapshot.picks && pendingSnapshot.picks.length) {
      pendingSnapshot.picks.forEach(function (p) {
        recItems.push({
          d: p.tail,
          miss: p.miss,
          maxMiss: p.maxMiss,
          ratio: p.ratio,
          wbr: p.weightedBounceRate,
          wbSample: p.sample,
          wbHits: null,
          wbTotal: null,
          score: p.score,
          snapshot: true
        });
      });
    } else {
      cands.slice(0, 2).forEach(function (p) {
        recItems.push({
          d: p.d,
          miss: p.miss,
          maxMiss: p.maxMiss,
          ratio: p.ratio,
          wbr: p.wbr,
          wbSample: p.wbSample,
          wbHits: p.wbHits,
          wbTotal: p.wbTotal,
          score: p.score,
          snapshot: false
        });
      });
    }
    var recMeta = function (p) {
      if (p.wbHits !== null && p.wbHits !== undefined && p.wbTotal !== null && p.wbTotal !== undefined) {
        return "反弹 中" + p.wbHits + "·错" + (p.wbTotal - p.wbHits) + "·共" + p.wbTotal;
      }
      return "反弹率 " + (p.wbr * 100).toFixed(1) + "% · 样本 " + Number(p.wbSample).toFixed(1);
    };
    html += '<div class="section"><div class="section__head"><h2 class="section__title">下期推荐</h2><span class="section__hint">加权反弹率≥75% +5分 · ≥65% +3分 · 遗漏深度≥50% +1分</span></div>';
    html += '<div class="panel"><div class="panel__body">';
    if (recItems.length === 0) {
      html += '<div class="empty">上期全中，无未出号，建议跳过</div>';
    } else {
      var recTitle = recItems.length >= 2
        ? (recItems[0].snapshot ? "开奖前快照：双推荐" : "双推荐")
        : (recItems[0].snapshot ? "开奖前快照：首选" : "首选");
      html += '<div style="font-size:16px;font-weight:700;color:var(--accent)">' + recTitle + '：尾 ' + recItems.map(function (p) { return p.d; }).join(" 、尾 ") + "</div>";
      recItems.forEach(function (p) {
        html += '<div style="margin-top:6px;font-size:12px;color:var(--muted)">尾' + p.d + "：遗漏 " + p.miss + " 期 | 历史最大 " + p.maxMiss + " 期 | " + recMeta(p) + "</div>";
      });
    }
    html += "</div></div></div>";

    html += '<div class="section"><div class="section__head"><h2 class="section__title">每日分析报告</h2><span class="section__hint">' + new Date().toLocaleDateString("zh-CN") + " · 第 " + N + " 期</span></div>";
    html += '<div class="panel"><div class="panel__body report">';
    if (recItems.length === 0) {
      html += '<p><b>结论：</b>上期尾数全部开出，没有未开尾数可供预测，建议本期跳过。</p>';
    } else {
      var reportTitle = recItems[0].snapshot ? "开奖前快照推荐" : "本期推荐";
      html += '<p><b>结论：</b>' + reportTitle + '：' + recItems.map(function (p, idx) {
        return (idx === 0 ? "首选尾 " : "备选尾 ") + '<b>' + p.d + '</b>';
      }).join("，") + "。</p>";
      html += '<p><b>数据：</b>' + recItems.map(function (p) {
        return '尾' + p.d + '（遗漏 ' + p.miss + ' 期；' + recMeta(p) + '）';
      }).join("；") + "。</p>";
    }
    html += '<p><b>评分规则：</b>加权反弹率≥75% +5分；≥65% +3分；遗漏深度≥50% +1分。分数并列时给双推荐。</p>';
    html += '<p><b>模型原理：</b>恰好遗漏k期的加权近期反弹率，衰减因子1.75（越近权重越高），回测 中23·错21·共44。</p>';
    html += '<p><b>风险提示：</b>模型仅供参考，不应据此重注。</p>';
    html += "</div></div></div>";

    var reviewSnapshot = null;
    for (var rsi = 0; rsi < weightedSnapshots.length; rsi++) {
      if (weightedSnapshots[rsi].settled && weightedSnapshots[rsi].target === latest) {
        reviewSnapshot = weightedSnapshots[rsi];
        break;
      }
    }
    var review = prevTailReview();
    if (reviewSnapshot) {
      var rpicks = reviewSnapshot.picks || [];
      html += '<div class="section"><div class="section__head"><h2 class="section__title">上期预测反馈</h2><span class="section__hint">开奖前真实快照 · 第 ' + reviewSnapshot.basedOn + ' 期数据回看第 ' + latest + " 期</span></div>";
      html += '<div class="panel"><div class="panel__body report">';
      html += '<p><b>当时推荐：</b>' + (rpicks.length ? rpicks.map(function (p, idx) {
        return (idx === 0 ? "首选" : "备选") + "尾 " + p.tail;
      }).join("、") : "跳过");
      html += '</p><p><b>实际开出：</b>' + (reviewSnapshot.actualTails || []).join(" ");
      html += '</p><p><b>结果：</b><span style="color:' + (reviewSnapshot.hit ? "#16a34a" : "#dc2626") + ';font-weight:700">' + (reviewSnapshot.hit ? "命中" : "未中") + "</span></p>";
      html += "</div></div></div>";
    } else if (review) {
      html += '<div class="section"><div class="section__head"><h2 class="section__title">上期预测反馈</h2><span class="section__hint">用第 ' + review.N + ' 期数据回看第 ' + latest + " 期</span></div>";
      html += '<div class="panel"><div class="panel__body report">';
      html += '<p><b>当时推荐：</b>';
      if (review.cands.length === 0) {
        html += "上期全中，系统建议跳过";
        html += '</p><p><b>实际开出：</b>' + review.actual.join(" ") + "。跳过建议合理。</p>";
      } else if (review.cands.length >= 2 && review.cands[0].score === review.cands[1].score) {
        var rhit1 = review.actual.indexOf(review.cands[0].d) >= 0;
        var rhit2 = review.actual.indexOf(review.cands[1].d) >= 0;
        html += "双推荐：尾 " + review.cands[0].d + " 、尾 " + review.cands[1].d;
        html += '</p><p><b>实际开出：</b>' + review.actual.join(" ");
        var dualHit = rhit1 || rhit2;
        html += '</p><p><b>结果：</b><span style="color:' + (dualHit ? "#16a34a" : "#dc2626") + ';font-weight:700">' + (dualHit ? (rhit1 && rhit2 ? "全中" : "命中一个") : "未中") + "</span></p>";
      } else {
        var rtop = review.cands[0];
        var rhit = review.actual.indexOf(rtop.d) >= 0;
        html += "首选尾 " + rtop.d + "；备选尾 " + (review.cands.length >= 2 ? review.cands[1].d : "-");
        html += '</p><p><b>实际开出：</b>' + review.actual.join(" ");
        html += '</p><p><b>结果：</b><span style="color:' + (rhit ? "#16a34a" : "#dc2626") + ';font-weight:700">' + (rhit ? "正确，首选命中" : "未中，首选未开出") + "</span></p>";
      }
      html += "</div></div></div>";
    }

    var historyRows = combinedPredictHistory();
    if (historyRows.length) {
      var snapshotCount = historyRows.filter(function (r) { return r.snapshot; }).length;
      var backtestCount = historyRows.length - snapshotCount;
      var streakStats = weightedStreakStats(historyRows);
      var backtestPerf = weightedHistoryPerformance(historyRows.filter(function (r) { return !r.snapshot && r.period >= 31; }));
      var snapshotPerf = weightedHistoryPerformance(historyRows.filter(function (r) { return r.snapshot; }));
      html += '<div class="section"><div class="section__head"><h2 class="section__title">历史业绩</h2><span class="section__hint">只计算第一推荐 · 赔率1.8 · 回测与真实快照分账</span></div></div>';
      html += '<div class="section"><div class="grid-2">';
      html += '<div class="stat"><div class="stat__value" style="color:#16a34a">' + backtestPerf.singleRate.toFixed(2) + '%</div><div class="stat__label">回测首推命中率 中' + backtestPerf.tHits + '·错' + backtestPerf.tMiss + '·共' + backtestPerf.actDays + '</div></div>';
      html += '<div class="stat"><div class="stat__value" style="color:#2563eb">' + backtestPerf.tHits + '/' + backtestPerf.actDays + '</div><div class="stat__label">回测首推命中 / 已结算</div></div>';
      html += '<div class="stat"><div class="stat__value" style="color:' + (backtestPerf.cum >= 0 ? '#16a34a' : '#dc2626') + '">' + (backtestPerf.cum >= 0 ? '+' : '') + backtestPerf.cum.toFixed(2) + '</div><div class="stat__label">回测累计盈亏（元）</div></div>';
      html += '<div class="stat"><div class="stat__value" style="color:#dc2626">' + backtestPerf.maxDD.toFixed(2) + '</div><div class="stat__label">回测最大回撤（元）</div></div>';
      html += '</div></div>';
      html += '<div class="section"><div class="section__head"><h2 class="section__title">真实快照账</h2><span class="section__hint">262期起 · 只计算第一推荐</span></div></div>';
      html += '<div class="section"><div class="grid-2">';
      html += '<div class="stat"><div class="stat__value" style="color:#16a34a">' + snapshotPerf.singleRate.toFixed(2) + '%</div><div class="stat__label">快照首推命中率 中' + snapshotPerf.tHits + '·错' + snapshotPerf.tMiss + '·共' + snapshotPerf.actDays + '</div></div>';
      html += '<div class="stat"><div class="stat__value" style="color:#2563eb">' + snapshotPerf.tHits + '/' + snapshotPerf.actDays + '</div><div class="stat__label">快照首推命中 / 已结算</div></div>';
      html += '<div class="stat"><div class="stat__value" style="color:' + (snapshotPerf.cum >= 0 ? '#16a34a' : '#dc2626') + '">' + (snapshotPerf.cum >= 0 ? '+' : '') + snapshotPerf.cum.toFixed(2) + '</div><div class="stat__label">快照累计盈亏（元）</div></div>';
      html += '<div class="stat"><div class="stat__value" style="color:#dc2626">' + snapshotPerf.maxDD.toFixed(2) + '</div><div class="stat__label">快照最大回撤（元）</div></div>';
      html += '</div></div>';
      html += '<div class="section"><div class="section__head"><h2 class="section__title">连错遗漏记录</h2><span class="section__hint">①第一推荐 最高连错 ' + streakStats.defs.first.maxMiss + ' 期 · ②第二推荐 最高连错 ' + streakStats.defs.second.maxMiss + ' 期 · 当前连错 ①' + streakStats.defs.first.missRun + ' ②' + streakStats.defs.second.missRun + ' · 横向滑动 · 新→旧</span></div></div>';
      html += '<div class="panel" style="padding:12px 10px;overflow-x:auto;-webkit-overflow-scrolling:touch">';
      html += '<div style="display:flex;gap:5px;min-width:max-content">';
      for (var sci = streakStats.cells.length - 1; sci >= 0; sci--) {
        var sc = streakStats.cells[sci];
        html += '<div style="min-width:54px;text-align:center;border:1px solid #e0e3e8;border-radius:8px;padding:6px 3px;background:#fff">';
        html += '<div style="font-size:12px;color:var(--muted);margin-bottom:3px">' + sc.period + "</div>";
        html += '<div style="font-size:16px;font-weight:800;line-height:1.45;color:' + sc.first.color + '">①' + sc.first.text + "</div>";
        html += '<div style="font-size:16px;font-weight:800;line-height:1.45;color:' + sc.second.color + '">②' + sc.second.text + "</div>";
        html += "</div>";
      }
      html += "</div></div>";

      html += '<div class="section"><div class="section__head"><h2 class="section__title">逐期记录</h2><span class="section__hint">第1期为起点，实际预测从第2期开始 · 262期起真实快照 · 快照' + snapshotCount + "期/回测" + backtestCount + "期</span></div></div>";
      html += '<div class="panel"><div style="max-height:520px;overflow-y:auto;-webkit-overflow-scrolling:touch">';
      html += '<div style="position:sticky;top:0;z-index:2;background:#f3f4f6;border-bottom:1px solid #e5e7eb;padding:6px 10px;font-size:11px;color:#6b7280;font-weight:700">期数 · 来源 · 首推/备选结果</div>';
      historyRows.slice().reverse().forEach(function (row) {
        var topText = row.top === undefined ? "-" : "尾" + row.top;
        var secText = row.sec === undefined ? "-" : "尾" + row.sec;
        var topRes = row.topHit === null || row.topHit === undefined ? "-" : (row.topHit ? "✅" : "❌");
        var secRes = row.secHit === null || row.secHit === undefined ? "-" : (row.secHit ? "✅" : "❌");
        var settled = row.settledAt ? row.settledAt.replace("T", " ").slice(0, 16) : "";
        html += '<div style="padding:8px 10px;border-bottom:1px solid #f0f0f0">';
        html += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px">';
        html += '<b>第' + row.period + '期</b>';
        html += '<span class="chip">' + (row.snapshot ? "真实快照" : "回测") + "</span>";
        html += "</div>";
        html += '<div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:4px;font-size:12px">';
        html += '<span>首推 <b>' + topText + "</b> " + topRes + "</span>";
        html += '<span>备选 <b>' + secText + "</b> " + secRes + "</span>";
        html += "</div>";
        html += '<div style="margin-top:4px;font-size:11px;color:var(--muted)">实际开出：' + row.actual.join(" ") + (settled ? " · 结算 " + settled : "") + "</div>";
        html += "</div>";
      });
      html += "</div></div></div>";
    }

    html += '<p class="disclaimer">模型基于恰好遗漏k期的加权近期反弹率，回测 中23·错21·共44。修复数据泄露后已退随机（理论基准约55.39%），无预测价值，仅供历史回看。仅供参考，不应据此重注。</p>';
    view.innerHTML = html;
  }

  // ===== 双号推荐页面（连出惯性分层打分，每期推2个号，避尾0）=====
  function pickTopAt(cur, k) {
    return MODEL.pickTopAt(cur, k);
  }

  function renderPick3() {
    var N = latest;
    var top2 = pickTopAt(N, 2);

    var html = '<div class="section"><div class="section__head"><h2 class="section__title">双号推荐</h2><span class="section__hint">连出惯性 · 预测第 ' + (N + 1) + ' 期 · 避尾0 · 每期推2号</span></div></div>';

    html += '<div class="section"><div class="panel" style="padding:18px 14px">';
    if (top2.length === 0) {
      html += '<div class="empty">本期无满足信号的尾号，建议观望</div>';
    } else {
      html += '<div style="display:flex;align-items:flex-start;gap:24px;flex-wrap:wrap;justify-content:center">';
      top2.forEach(function (p, i) {
        html += '<div style="text-align:center;min-width:96px">';
        html += '<div style="font-size:12px;color:var(--muted);font-weight:700;margin-bottom:8px">' + (i === 0 ? '第一推荐' : '第二推荐') + '</div>';
        html += '<div class="num" style="width:60px;height:60px;font-size:26px;font-weight:800">尾' + p.d + '</div>';
        html += '<div style="margin-top:8px"><span class="chip">' + p.tag + '</span></div>';
        html += '<div style="font-size:14px;color:#16a34a;font-weight:700;margin-top:6px">' + p.sc + ' 分 · ' + MODEL.gradeOf(p.sc) + '级</div>';
        html += '</div>';
      });
      html += '</div>';
    }
    html += '</div></div>';

    var snapStats = window.APP_SNAPSHOTS || null;
    function snapRate(nr, hr) {
      return nr >= 20 ? (hr / nr * 100).toFixed(1) + '%' : '样本不足';
    }
    function snapTime(iso) {
      return (iso || '').replace('T', ' ').slice(0, 16);
    }
    if (snapStats && snapStats.grades) {
      var confTiers = [
        { k: "S", label: "S级 &#8805;95.0", color: "#16a34a" },
        { k: "A", label: "A级 93.5-94.99", color: "#65a30d" },
        { k: "B", label: "B级 92.8-93.49", color: "#d97706" },
        { k: "C", label: "C级 92.2-92.79", color: "#ea580c" },
        { k: "D", label: "D级 <92.2", color: "#6b7280" }
      ];
      var gradeRecords = { S: [], A: [], B: [], C: [], D: [] };
      (snapStats.detail || []).forEach(function (rec) {
        (rec.picks || []).forEach(function (p) {
          var g = p.grade;
          if (gradeRecords[g]) {
            gradeRecords[g].push({
              target: rec.target,
              tail: p.tail,
              score: p.score,
              actualTails: rec.actualTails || [],
              hit: p.hit,
              settledAt: rec.settledAt
            });
          }
        });
      });

      html += '<div class="section"><div class="section__head"><h2 class="section__title">五级强度 · 逐期对错</h2><span class="section__hint">真实快照账（开奖前保存·开奖后结算）· 每级累计摘要 + 逐期滚动记录（最新在上）· 样本≥20期才显示命中率</span></div></div>';
      html += '<div class="section">';
      html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px">';
      confTiers.forEach(function (t) {
        var st = snapStats.grades[t.k] || { single: { n: 0, hits: 0, miss: 0 } };
        var missed = (st.single.miss != null) ? st.single.miss : (st.single.n - st.single.hits);
        var sRate = snapRate(st.single.n, st.single.hits);
        var recs = gradeRecords[t.k] || [];
        html += '<div style="border:1px solid #e0e3e8;border-radius:10px;padding:12px;background:#fff;display:flex;flex-direction:column;min-width:0">';
        html += '<div style="font-size:14px;font-weight:800;color:' + t.color + ';margin-bottom:6px">' + t.label + '</div>';
        html += '<div style="font-size:12px;color:var(--muted);line-height:1.6">样本 <b>' + st.single.n + '</b> · 命中 <b>' + st.single.hits + '</b> · 未中 <b>' + missed + '</b></div>';
        html += '<div style="font-size:12px;margin:2px 0 8px">单尾命中率 <b style="color:' + t.color + '">' + sRate + '</b></div>';
        html += '<div style="font-size:11px;color:var(--muted);font-weight:700;margin-bottom:4px">逐期对错记录</div>';
        html += '<div style="max-height:180px;overflow-y:auto;-webkit-overflow-scrolling:touch;border:1px solid #e5e7eb;border-radius:6px;background:#fafafa">';
        html += '<div style="position:sticky;top:0;background:#f3f4f6;padding:5px 8px;font-size:11px;font-weight:700;color:#6b7280;z-index:1;border-bottom:1px solid #e5e7eb">期 · 尾 · 分数 · 结果</div>';
        if (!recs.length) {
          html += '<div style="padding:14px 8px;font-size:11px;color:#9ca3af;text-align:center">暂无记录</div>';
        } else {
          for (var rr = recs.length - 1; rr >= 0; rr--) {
            var rc = recs[rr];
            html += '<div style="padding:6px 8px;border-bottom:1px solid #f0f0f0">';
            html += '<div style="display:flex;align-items:center;gap:8px;font-size:11px;white-space:nowrap">';
            html += '<span style="font-weight:700">第' + rc.target + '期</span>';
            html += '<span class="num" style="width:26px;height:26px;font-size:14px;font-weight:800">' + rc.tail + '</span>';
            html += '<span style="color:var(--muted)">' + rc.score + '分</span>';
            html += '<span style="margin-left:auto;font-weight:700">' + (rc.hit ? '<span style="color:#16a34a">✅命中</span>' : '<span style="color:#dc2626">❌未中</span>') + '</span>';
            html += '</div>';
            html += '<div style="font-size:10px;color:var(--muted);margin-top:2px">实际 ' + rc.actualTails.join(',') + ' · 结算 ' + snapTime(rc.settledAt) + '</div>';
            html += '</div>';
          }
        }
        html += '</div>';
        html += '</div>';
      });
      html += '</div>';
      html += '</div>';

      html += '<div class="section"><div class="section__head"><h2 class="section__title">双号整体 & 等级组合</h2><span class="section__hint">真实快照账 · 双号整体至少中一 + 按两尾号等级组合分组 · 样本≥20期才显示命中率</span></div></div>';
      html += '<div class="section"><div class="panel" style="padding:12px">';
      var ov = snapStats.overallAtLeastOne || { n: 0, hits: 0, miss: 0 };
      var ovMiss = (ov.miss != null) ? ov.miss : (ov.n - ov.hits);
      html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap">';
      html += '<span style="font-size:13px;font-weight:700">双号整体至少中一</span>';
      html += '<span class="chip">' + ov.hits + '/' + ov.n + '</span>';
      html += '<span style="font-size:13px;color:var(--muted)">未中' + ovMiss + ' · ' + snapRate(ov.n, ov.hits) + '</span>';
      html += '</div>';
      var comboMap = snapStats.combos || {};
      var comboKeys = Object.keys(comboMap);
      comboKeys.sort(function (a, b) { return comboMap[b].n - comboMap[a].n; });
      html += '<div style="display:flex;flex-wrap:wrap;gap:6px">';
      comboKeys.forEach(function (ck) {
        var c = comboMap[ck];
        var cMiss = (c.miss != null) ? c.miss : (c.n - c.hits);
        html += '<div style="border:1px solid #e0e3e8;border-radius:8px;padding:6px 10px;background:#fff;font-size:12px">';
        html += '<b>' + ck + '</b> ' + c.hits + '/' + c.n + '（未中' + cMiss + '） <span style="color:var(--muted)">' + snapRate(c.n, c.hits) + '</span>';
        html += '</div>';
      });
      if (!comboKeys.length) html += '<span style="color:#9ca3af;font-size:12px">暂无组合样本</span>';
      html += '</div>';
      html += '</div></div>';

      var CM = window.CAISHEN_MODEL || {};
      var riskOfFn = CM.riskOf || function () { return { label: "样本不足", flag: "insufficient" }; };
      var pctFn = function (x) { return (x * 100).toFixed(1) + '%'; };
      var riskColor = { danger: "#dc2626", observe: "#d97706", advantage: "#16a34a", normal: "#6b7280", insufficient: "#9ca3af" };

      var riskRowCard = function (title, stat, rolls) {
        var n = stat.n || 0;
        var hits = stat.hits || 0;
        var miss = (stat.miss != null) ? stat.miss : (n - hits);
        var r = riskOfFn(n, hits);
        var flag = r.flag || "insufficient";
        var color = riskColor[flag] || "#9ca3af";
        var rateText2 = n >= 20 ? (n ? pctFn(hits / n) : "-") : "样本不足";
        var missRate = n ? pctFn(miss / n) : "-";
        var ciText = "";
        if (n >= 20 && r.ci) ciText = "95%CI " + pctFn(r.ci.lo) + "~" + pctFn(r.ci.hi);
        var canRoll = (flag === "danger" || flag === "observe") && rolls && rolls.length;
        var h = '';
        h += '<div style="border:1px solid #e0e3e8;border-radius:10px;padding:10px 12px;background:#fff;min-width:0">';
        h += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">';
        h += '<b style="font-size:13px">' + title + '</b>';
        h += '<span class="chip">' + hits + '/' + n + '</span>';
        h += '<span style="font-size:12px;color:var(--muted)">未中' + miss + ' · 错误率' + missRate + '</span>';
        h += '<span style="margin-left:auto;font-size:12px;font-weight:700;color:' + color + '">' + (r.label || "") + '</span>';
        h += '</div>';
        h += '<div style="font-size:11px;color:var(--muted)">命中率 ' + rateText2 + (ciText ? ' · ' + ciText : '') + '</div>';
        if (canRoll) {
          h += '<div style="margin-top:6px;font-size:11px;color:var(--muted);font-weight:700">逐期对错</div>';
          h += '<div style="max-height:150px;overflow-y:auto;-webkit-overflow-scrolling:touch;border:1px solid #e5e7eb;border-radius:6px;background:#fafafa">';
          h += '<div style="position:sticky;top:0;background:#f3f4f6;padding:4px 8px;font-size:10px;font-weight:700;color:#6b7280;border-bottom:1px solid #e5e7eb">期 · 尾 · 分数 · 结果</div>';
          for (var ri = rolls.length - 1; ri >= 0; ri--) {
            var rr = rolls[ri];
            h += '<div style="padding:4px 8px;border-bottom:1px solid #f0f0f0;font-size:11px;display:flex;gap:8px;align-items:center">';
            h += '<span style="font-weight:700">第' + rr.target + '期</span>';
            h += '<span>尾' + rr.tail + '</span>';
            h += '<span style="color:var(--muted)">' + rr.score + '分</span>';
            h += '<span style="margin-left:auto;font-weight:700">' + (rr.hit ? '<span style="color:#16a34a">✅</span>' : '<span style="color:#dc2626">❌</span>') + '</span>';
            h += '</div>';
          }
          h += '</div>';
        }
        h += '</div>';
        return h;
      };

      var sBuckets = snapStats.scoreBuckets || {};
      html += '<div class="section"><div class="section__head"><h2 class="section__title">分数细分风险表</h2><span class="section__hint">1分一档 · 单尾口径 · 基准55.39% · 样本≥20显示命中率，样本不足不标危险</span></div></div>';
      html += '<div class="section"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:8px">';
      var bucketOrder = (CM.SCORE_BUCKETS || []).slice();
      if (!bucketOrder.length) bucketOrder = Object.keys(sBuckets);
      bucketOrder.forEach(function (b) {
        var st = sBuckets[b] || { n: 0, hits: 0, miss: 0, rolls: [] };
        html += riskRowCard(b, st, st.rolls || []);
      });
      html += '</div></div>';

      var sTags = snapStats.tags || {};
      var TAG_ORDER = ["连出4", "连出3", "5期3次", "7期4次"];
      var tagKeys3 = Object.keys(sTags);
      var orderedTags3 = TAG_ORDER.filter(function (t) { return sTags[t]; }).concat(tagKeys3.filter(function (t) { return TAG_ORDER.indexOf(t) < 0; }).sort());
      html += '<div class="section"><div class="section__head"><h2 class="section__title">信号标签命中率表</h2><span class="section__hint">按信号标签分组 · 单尾口径 · 基准55.39%</span></div></div>';
      html += '<div class="section"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:8px">';
      if (!orderedTags3.length) {
        html += '<span style="color:#9ca3af;font-size:12px">暂无标签样本</span>';
      } else {
        orderedTags3.forEach(function (tg) {
          var st = sTags[tg] || { n: 0, hits: 0, miss: 0, rolls: [] };
          html += riskRowCard(tg, st, st.rolls || []);
        });
      }
      html += '</div></div>';
    }

    var hist = [], cum = 0, peak = 0, maxDD = 0;
    var actDays = 0, tHits = 0, tPicks = 0;
    var d0 = 0, d1 = 0, d2 = 0;
    for (var cur = 1; cur <= N - 1; cur++) {
      var sel = pickTopAt(cur, 2);
      var actual = tailsOf(cur + 1);
      if (!sel.length) {
        hist.push({ period: cur + 1, picks: [], sig: [], actual: actual, hits: null, pnl: null, cum: cum, dd: +(peak - cum).toFixed(2), live: false });
        continue;
      }
      var h = 0;
      for (var i = 0; i < sel.length; i++) if (actual.indexOf(sel[i].d) >= 0) h++;
      actDays++; tPicks += sel.length; tHits += h;
      if (h === 0) d0++; else if (h === 1) d1++; else d2++;
      var pnl = +(h * 0.8 - (sel.length - h) * 1).toFixed(2);
      cum = +(cum + pnl).toFixed(2);
      if (cum > peak) peak = cum;
      var dd = +(peak - cum).toFixed(2);
      if (dd > maxDD) maxDD = dd;
      hist.push({ period: cur + 1, picks: sel.map(function (c) { return c.d; }), sig: sel.map(function (c) { return c.tag; }), actual: actual, hits: h, pnl: pnl, cum: cum, dd: dd, live: false });
    }
    hist.push({ period: N + 1, picks: top2.map(function (c) { return c.d; }), sig: top2.map(function (c) { return c.tag; }), actual: null, hits: null, pnl: null, cum: cum, dd: +(peak - cum).toFixed(2), live: true });

    var singleRate = tPicks ? (tHits / tPicks * 100).toFixed(2) : '0.00';
    var atLeast1 = actDays - d0;

    html += '<div class="section"><div class="section__head"><h2 class="section__title">历史业绩</h2><span class="section__hint">第2~' + N + '期回测 · 第' + (N + 1) + '期实盘待开奖 · 每期推2号 · 赔率1.8</span></div></div>';
    html += '<div class="section"><div class="grid-2">';
    html += '<div class="stat"><div class="stat__value" style="color:#16a34a">' + singleRate + '%</div><div class="stat__label">单号命中率 中' + tHits + '·错' + (tPicks - tHits) + '·共' + tPicks + '</div></div>';
    html += '<div class="stat"><div class="stat__value" style="color:#2563eb">' + atLeast1 + '/' + actDays + '</div><div class="stat__label">至少中1个（落空' + d0 + '期）</div></div>';
    html += '<div class="stat"><div class="stat__value" style="color:' + (cum >= 0 ? '#16a34a' : '#dc2626') + '">' + (cum >= 0 ? '+' : '') + cum.toFixed(2) + '</div><div class="stat__label">累计盈亏（元）</div></div>';
    html += '<div class="stat"><div class="stat__value" style="color:#dc2626">' + maxDD.toFixed(2) + '</div><div class="stat__label">最大回撤（元）</div></div>';
    html += '</div></div>';
    html += '<div class="section"><div class="grid-3">';
    html += '<div class="stat"><div class="stat__value">' + d0 + '</div><div class="stat__label">中0</div></div>';
    html += '<div class="stat"><div class="stat__value">' + d1 + '</div><div class="stat__label">中1</div></div>';
    html += '<div class="stat"><div class="stat__value">' + d2 + '</div><div class="stat__label">中2</div></div>';
    html += '</div></div>';

    // 连错遗漏记录：横向滚动条（①第一推荐 ②第二推荐，显示连错遗漏值），最新在最左
    var fMiss = 0, sMiss = 0, fMax = 0, sMax = 0;
    var missCells = [];
    for (var ri2 = 0; ri2 < hist.length; ri2++) {
      var q = hist[ri2];
      var fh = null, sh = null;
      if (q.picks.length) {
        if (q.actual) fh = q.actual.indexOf(q.picks[0]) >= 0;
        if (q.picks.length > 1 && q.actual) sh = q.actual.indexOf(q.picks[1]) >= 0;
      }
      var c1, c2;
      if (q.live) {
        c1 = '<span style="color:#2563eb">①待</span>';
        c2 = '<span style="color:#2563eb">②待</span>';
      } else if (fh === null) {
        c1 = '<span style="color:#9ca3af">①空</span>';
        c2 = '<span style="color:#9ca3af">②空</span>';
      } else {
        if (fh) { fMiss = 0; c1 = '<span style="color:#16a34a">①中</span>'; }
        else { fMiss++; if (fMiss > fMax) fMax = fMiss; c1 = '<span style="color:#dc2626">①' + fMiss + '</span>'; }
        if (sh !== null) {
          if (sh) { sMiss = 0; c2 = '<span style="color:#16a34a">②中</span>'; }
          else { sMiss++; if (sMiss > sMax) sMax = sMiss; c2 = '<span style="color:#dc2626">②' + sMiss + '</span>'; }
        } else {
          c2 = '<span style="color:#9ca3af">②空</span>';
        }
      }
      missCells.push({ period: q.period, c1: c1, c2: c2 });
    }
    var fCur = fMiss, sCur = sMiss;

    html += '<div class="section"><div class="section__head"><h2 class="section__title">连错遗漏记录</h2><span class="section__hint">①第一推荐 最高连错 ' + fMax + ' 期 · ②第二推荐 最高连错 ' + sMax + ' 期 · 当前连错 ①' + fCur + ' ②' + sCur + ' · 横向滑动 · 新→旧</span></div></div>';
    html += '<div class="panel" style="padding:12px 10px;overflow-x:auto;-webkit-overflow-scrolling:touch">';
    html += '<div style="display:flex;gap:5px;min-width:max-content">';
    for (var ri2 = missCells.length - 1; ri2 >= 0; ri2--) {
      var q = missCells[ri2];
      html += '<div style="min-width:54px;text-align:center;border:1px solid #e0e3e8;border-radius:8px;padding:6px 3px;background:#fff">';
      html += '<div style="font-size:12px;color:var(--muted);margin-bottom:3px">' + q.period + '</div>';
      html += '<div style="font-size:16px;font-weight:800;line-height:1.45">' + q.c1 + '</div>';
      html += '<div style="font-size:16px;font-weight:800;line-height:1.45">' + q.c2 + '</div>';
      html += '</div>';
    }
    html += '</div></div>';

    html += '<div class="section"><div class="section__head"><h2 class="section__title">逐期记录</h2><span class="section__hint">第' + (N + 1) + '期~第2期（倒序，最新在上）· ①第一推荐 ②第二推荐 · 绿=中 灰=未中</span></div></div>';
    html += '<div class="panel">';
    for (var ri = hist.length - 1; ri >= 0; ri--) {
      var r = hist[ri];
      html += '<div class="record">';
      html += '<div class="record__top">';
      html += '<span class="record__period">第 ' + r.period + ' 期</span>';
      html += '<span class="record__meta">' + (r.live ? '<span style="color:#2563eb;font-weight:700">实盘·待开奖</span>' : '<span style="color:#9ca3af">回测</span>') + '</span>';
      html += '</div>';
      html += '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:8px">';
      if (r.picks.length) {
        for (var pj = 0; pj < r.picks.length; pj++) {
          var pn = r.picks[pj];
          var isHit = r.actual && r.actual.indexOf(pn) >= 0;
          html += '<div style="display:flex;align-items:center;gap:5px">';
          html += '<span style="font-size:11px;color:var(--muted)">' + (pj === 0 ? '①' : '②') + '</span>';
          html += '<div class="num" style="' + (isHit ? 'background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;' : '') + '">尾' + pn + '</div>';
          html += '</div>';
        }
      } else {
        html += '<span style="color:#9ca3af">空仓</span>';
      }
      if (r.hits !== null && !r.live) {
        html += '<div style="margin-left:auto">' + (r.hits >= 1 ? '<span class="hit--yes">中' + r.hits + '</span>' : '<span class="hit--no">未中</span>') + '</div>';
      }
      html += '</div>';
      if (r.sig && r.sig.length) {
        html += '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px">';
        r.sig.forEach(function (s) { html += '<span class="chip">' + s + '</span>'; });
        html += '</div>';
      }
      if (r.pnl !== null) {
        html += '<div style="display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--muted)">';
        html += '<span>盈亏 <b style="color:' + (r.pnl >= 0 ? '#16a34a' : '#dc2626') + '">' + (r.pnl >= 0 ? '+' : '') + r.pnl + '</b></span>';
        html += '<span>累计 <b style="color:var(--accent)">' + r.cum + '</b></span>';
        html += '<span>回撤 <b style="color:#dc2626">' + r.dd + '</b></span>';
        html += '</div>';
      }
      if (r.actual && r.actual.length) {
        html += '<div style="margin-top:8px"><div style="font-size:11px;color:var(--muted);margin-bottom:4px">实际尾数</div><div class="num-list">';
        r.actual.forEach(function (t) { html += '<div class="num">' + t + '</div>'; });
        html += '</div></div>';
      }
      html += '</div>';
    }
    html += '</div>';

    html += '<p class="disclaimer">双号推荐基于连出惯性分层打分，每期动态重算推2个号（第一+第二推荐）。历史业绩为 walk-forward 逐期喂数据（零未来数据），赔率按1.8计（命中1注+0.8、未中-1）。第' + N + '期及以前=回测，第' + (N + 1) + '期起=实盘。仅供参考，不做高命中承诺。</p>';
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
    function gradeInfo(avg) {
      if (avg == null) return { txt: "—", color: "#999" };
      if (avg >= 62) return { txt: "🟢稳", color: "#16a34a" };
      if (avg >= 52) return { txt: "🟡中", color: "#d97706" };
      return { txt: "🔴险", color: "#dc2626" };
    }

    function overallRate(stats) {
      var total = 0, hits = 0;
      for (var x = 1; x <= 10; x++) {
        var s = stats[x];
        if (s && s.t) {
          total += s.t;
          hits += s.h;
        }
      }
      return total ? hits / total * 100 : null;
    }

    function rateCell(s) {
      if (!s || !s.t) return '<td><span style="color:#9ca3af">—</span></td>';
      if (s.t < 10) {
        return '<td><span style="color:#94a3b8;font-weight:700">样本不足</span><br><small style="color:#9ca3af">' + s.h + "/" + s.t + "</small></td>";
      }
      var rate = s.h / s.t * 100;
      var color = s.t < 20 ? "#d97706" : (rate >= 55.39 ? "#16a34a" : "#dc2626");
      return '<td><b style="color:' + color + '">' + rate.toFixed(1) + '%</b><br><small style="color:#9ca3af">' + s.h + "/" + s.t + "</small></td>";
    }

    function windowCell(count, size) {
      var text = count + "/" + size;
      var color = "#6b7280";
      var hi = size === 15 ? 10 : 4;
      var lo = size === 15 ? 5 : 1;
      if (count >= hi) color = "#16a34a";
      else if (count <= lo) color = "#2563eb";
      return '<td><b style="color:' + color + '">' + text + "</b></td>";
    }

    var rows = [];
    for (var d = 0; d < 10; d++) {
      var b = bounceStats(d);
      var b2 = streakStats(d);
      rows.push({
        tail: d,
        bounce: b,
        streak: b2,
        bounceGrade: gradeInfo(overallRate(b)),
        streakGrade: gradeInfo(overallRate(b2)),
        miss: currentMiss(d),
        streakNow: currentStreak(d),
        c15: countWindow(d, 15),
        c5: countWindow(d, 5)
      });
    }

    var html = '<div class="section"><div class="section__head"><h2 class="section__title">尾号性格 · 当下速览</h2><span class="section__hint">先看当前遗漏、连出和短窗热度，再查看下方明细</span></div>';
    html += '<div class="panel"><table class="table"><thead><tr><th>尾号</th><th>当前（漏/连）</th><th>近15期</th><th>近5期</th><th>反弹性格</th><th>连出性格</th><th>当前判定</th></tr></thead><tbody>';
    rows.forEach(function (r) {
      var status = r.miss >= BOUNCE[r.tail] ? "临界反弹" : r.c15 >= 10 ? "热惯性" : r.c15 <= 5 ? "冷待反弹" : r.streakNow >= 3 ? "连出中" : "中";
      var statusColor = r.miss >= BOUNCE[r.tail] ? "#dc2626" : r.c15 >= 10 ? "#16a34a" : r.c15 <= 5 ? "#2563eb" : "#6b7280";
      html += "<tr><td>尾" + r.tail + '</td><td><b>漏' + r.miss + " · 连" + r.streakNow + "</b></td>";
      html += windowCell(r.c15, 15) + windowCell(r.c5, 5);
      html += '<td style="color:' + r.bounceGrade.color + ';font-weight:700">' + r.bounceGrade.txt + "</td>";
      html += '<td style="color:' + r.streakGrade.color + ';font-weight:700">' + r.streakGrade.txt + "</td>";
      html += '<td style="color:' + statusColor + ';font-weight:700">' + status + "</td></tr>";
    });
    html += "</tbody></table></div></div>";

    html += '<div class="section"><div class="section__head"><h2 class="section__title">遗漏后反弹明细</h2><span class="section__hint">遗漏1至10期后，下一期开出的历史命中率 · 横向滑动</span></div>';
    html += '<div class="panel"><div class="panel__body" style="overflow-x:auto;-webkit-overflow-scrolling:touch"><table class="table" style="min-width:1180px"><thead><tr><th style="position:sticky;left:0;z-index:2;background:#fafafa">尾号</th>';
    for (var bx = 1; bx <= 10; bx++) html += "<th>遗漏" + bx + "期后</th>";
    html += "<th>反弹判定</th></tr></thead><tbody>";
    rows.forEach(function (r) {
      html += '<tr><td style="position:sticky;left:0;z-index:1;background:#fff"><b>尾' + r.tail + "</b></td>";
      for (var x = 1; x <= 10; x++) html += rateCell(r.bounce[x]);
      html += '<td style="color:' + r.bounceGrade.color + ';font-weight:700">' + r.bounceGrade.txt + "</td></tr>";
    });
    html += "</tbody></table></div></div></div>";
    html += '<p class="disclaimer">样本不足时只显示记录数；10~19期为观察样本，达到20期后再用命中率判断稳定程度。</p>';

    html += '<div class="section"><div class="section__head"><h2 class="section__title">连出后延续明细</h2><span class="section__hint">连出1至10期后，下一期继续开出的历史命中率 · 横向滑动</span></div>';
    html += '<div class="panel"><div class="panel__body" style="overflow-x:auto;-webkit-overflow-scrolling:touch"><table class="table" style="min-width:1180px"><thead><tr><th style="position:sticky;left:0;z-index:2;background:#fafafa">尾号</th>';
    for (var sx = 1; sx <= 10; sx++) html += "<th>连出" + sx + "期后</th>";
    html += "<th>连出判定</th></tr></thead><tbody>";
    rows.forEach(function (r) {
      html += '<tr><td style="position:sticky;left:0;z-index:1;background:#fff"><b>尾' + r.tail + "</b></td>";
      for (var x = 1; x <= 10; x++) html += rateCell(r.streak[x]);
      html += '<td style="color:' + r.streakGrade.color + ';font-weight:700">' + r.streakGrade.txt + "</td></tr>";
    });
    html += "</tbody></table></div></div></div>";
    html += '<p class="disclaimer">判定综合连出1至10期的历史表现；样本较少时以观察为主，不单独作为推荐依据。</p>';

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

  function choose(n, k) {
    if (k < 0 || k > n) return 0;
    var r = 1;
    for (var i = 1; i <= k; i++) r = r * (n - k + i) / i;
    return r;
  }

  function zodBaseRate(z, y) {
    var map = numZodMap(y);
    var count = 0;
    for (var n = 1; n <= 49; n++) if (map[n] === z) count++;
    if (!count) return 0;
    return 1 - choose(49 - count, 7) / choose(49, 7);
  }

  function zodOpen(record, z) {
    return !!(record && record.zods && record.zods.indexOf(z) >= 0);
  }

  function zodCurrentMiss(records, z) {
    var miss = 0;
    for (var i = records.length - 1; i >= 0; i--) {
      if (zodOpen(records[i], z)) break;
      miss++;
    }
    return miss;
  }

  function zodCurrentStreak(records, z) {
    var streak = 0;
    for (var i = records.length - 1; i >= 0; i--) {
      if (!zodOpen(records[i], z)) break;
      streak++;
    }
    return streak;
  }

  function zodMaxMiss(records, z) {
    var max = 0, run = 0;
    records.forEach(function (r) {
      if (zodOpen(r, z)) run = 0;
      else {
        run++;
        if (run > max) max = run;
      }
    });
    return max;
  }

  function zodRecentMissRuns(records, z, n) {
    var out = [], run = 0;
    for (var i = records.length - 1; i >= 0 && out.length < n; i--) {
      if (zodOpen(records[i], z)) {
        if (run > 0) out.push(run);
        run = 0;
      } else {
        run++;
      }
    }
    while (out.length < n) out.push(0);
    return out.reverse();
  }

  function renderZodWindow() {
    var y = state.year;
    var records = D.filter(function (r) { return r.y === y; });
    var w = state.zodWindow || 10;
    var recent = records.slice(Math.max(0, records.length - w));
    var lastPeriod = recent.length ? recent[recent.length - 1].p : "-";
    var rows = [];
    var hot = [], cold = [], warming = [], cooling = [];

    ZODS12.forEach(function (z) {
      var count = 0, olderHits = 0, newerHits = 0;
      var split = Math.floor(recent.length / 2);
      var cells = [];
      recent.forEach(function (r, idx) {
        var isHit = zodOpen(r, z);
        if (isHit) count++;
        if (idx < split) {
          if (isHit) olderHits++;
        } else if (isHit) newerHits++;
        var bg = isHit ? "#dcfce7" : "#f3f4f6";
        var color = isHit ? "#16a34a" : "#9ca3af";
        var border = r.p === lastPeriod ? "box-shadow:inset 0 0 0 2px #2563eb;" : "";
        cells.push('<span title="第' + r.p + "期 " + (isHit ? "出现" : "未出") + '" style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:4px;background:' + bg + ';color:' + color + ';font-weight:800;' + border + '">' + (isHit ? "●" : "○") + "</span>");
      });
      var rate = recent.length ? count / recent.length : 0;
      var base = zodBaseRate(z, y);
      var expected = recent.length * base;
      var olderRate = split ? olderHits / split : 0;
      var newerLen = recent.length - split;
      var newerRate = newerLen ? newerHits / newerLen : 0;
      var trend = "平稳", trendColor = "#6b7280";
      if (newerRate - olderRate >= 0.2) { trend = "↑升温"; trendColor = "#16a34a"; }
      else if (newerRate - olderRate <= -0.2) { trend = "↓降温"; trendColor = "#2563eb"; }
      var status, statusColor;
      if (rate >= 0.6) { status = "热"; statusColor = "#16a34a"; }
      else if (rate <= 0.2) { status = "冷"; statusColor = "#dc2626"; }
      else { status = "中"; statusColor = "#6b7280"; }
      if (status === "热") hot.push(z);
      if (status === "冷") cold.push(z);
      if (trend === "↑升温") warming.push(z);
      if (trend === "↓降温") cooling.push(z);
      rows.push({
        z: z,
        count: count,
        rate: rate,
        expected: expected,
        delta: count - expected,
        trend: trend,
        trendColor: trendColor,
        status: status,
        statusColor: statusColor,
        miss: zodCurrentMiss(records, z),
        streak: zodCurrentStreak(records, z),
        lastHit: recent.length ? zodOpen(recent[recent.length - 1], z) : false,
        cells: cells.join("")
      });
    });

    var fmt = function (arr) { return arr.length ? arr.join("、") : "无"; };
    var html = '<div class="section"><div class="section__head"><h2 class="section__title">生肖窗口走势</h2><span class="section__hint">' + y + " 年 · 第" + (recent[0] ? recent[0].p : "-") + "期 - 第" + lastPeriod + "期 · 共" + recent.length + "期</span></div>";
    html += trendYearChips(y);
    html += '<div class="chips" style="margin-bottom:12px">';
    [5, 7, 10, 15, 21, 30].forEach(function (n) {
      html += '<button class="chip ' + (w === n ? "is-active" : "") + '" data-zod-window="' + n + '">' + n + "期</button>";
    });
    html += "</div></div>";

    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-bottom:10px">';
    html += '<div class="stat"><div class="stat__value" style="font-size:15px">' + fmt(hot) + '</div><div class="stat__label">本窗口偏热</div></div>';
    html += '<div class="stat"><div class="stat__value" style="font-size:15px">' + fmt(cold) + '</div><div class="stat__label">本窗口偏冷</div></div>';
    html += '<div class="stat"><div class="stat__value" style="font-size:15px">' + fmt(warming) + '</div><div class="stat__label">后半段升温</div></div>';
    html += '<div class="stat"><div class="stat__value" style="font-size:15px">' + fmt(cooling) + '</div><div class="stat__label">后半段降温</div></div>';
    html += '</div>';

    html += '<div class="panel"><div class="panel__body" style="overflow-x:auto;-webkit-overflow-scrolling:touch"><table class="table" style="font-size:12px;min-width:760px"><thead><tr><th style="position:sticky;left:0;z-index:2;background:#fafafa">生肖</th><th>当前（漏/连）</th><th>本窗口</th><th>比基准</th><th>升温/降温</th><th>最新</th><th style="min-width:230px">窗口逐期</th></tr></thead><tbody>';
    rows.forEach(function (r) {
      html += '<tr><td style="position:sticky;left:0;z-index:1;background:#fff"><b>' + r.z + "</b></td>";
      html += "<td>漏" + r.miss + " · 连" + r.streak + "</td>";
      html += '<td><b>' + r.count + "/" + recent.length + '</b> <span style="color:' + r.statusColor + ';font-weight:700">' + r.status + '</span><br><small style="color:var(--muted)">' + Math.round(r.rate * 100) + "%</small></td>";
      var delta = Math.round(r.delta * 10) / 10;
      html += '<td><span style="color:' + (delta >= 0 ? "#16a34a" : "#dc2626") + ';font-weight:700">' + (delta >= 0 ? "+" : "") + delta + "</span><br><small style=\"color:var(--muted)\">期望" + r.expected.toFixed(1) + "</small></td>";
      html += '<td style="color:' + r.trendColor + ';font-weight:700">' + r.trend + "</td>";
      html += '<td><span style="color:' + (r.lastHit ? "#16a34a" : "#9ca3af") + ';font-weight:700">' + (r.lastHit ? "出现" : "未出") + "</span></td>";
      html += '<td><div style="display:flex;gap:3px;align-items:center">' + r.cells + "</div></td></tr>";
    });
    html += "</tbody></table></div></div></div>";
    html += '<p class="disclaimer">理论基准按当年各生肖实际包含的号码个数计算；升温/降温对比窗口前半段与后半段。</p>';
    view.innerHTML = html;
  }

  function renderZodMonitor() {
    var y = state.year;
    var records = D.filter(function (r) { return r.y === y; });
    var html = '<div class="section"><div class="section__head"><h2 class="section__title">生肖遗漏监控</h2><span class="section__hint">' + y + " 年 · 最近15次记录按旧到新排列</span></div>";
    html += trendYearChips(y);
    html += '</div><div class="panel"><table class="table"><thead><tr><th>生肖</th><th>当前遗漏</th><th>历史最大</th><th>近15次遗漏（旧→新）</th></tr></thead><tbody>';
    ZODS12.forEach(function (z) {
      var current = zodCurrentMiss(records, z);
      var max = zodMaxMiss(records, z);
      var history = zodRecentMissRuns(records, z, 15);
      var chips = history.map(function (v) {
        var bg = v >= 4 ? "#fee2e2" : v === 3 ? "#fef3c7" : v === 2 ? "#dcfce7" : v === 1 ? "#dbeafe" : "#f3f4f6";
        var color = v >= 4 ? "#b91c1c" : v === 3 ? "#a16207" : v === 2 ? "#15803d" : v === 1 ? "#1d4ed8" : "#6b7280";
        return '<span style="display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:22px;padding:0 5px;border-radius:5px;background:' + bg + ';color:' + color + ';font-weight:700">' + v + "</span>";
      }).join("");
      html += '<tr><td><b>' + z + '</b></td><td class="' + missClass(current) + '">' + current + ' 期</td><td>' + max + ' 期</td><td><div style="display:flex;flex-wrap:wrap;gap:4px;min-width:220px">' + chips + "</div></td></tr>";
    });
    html += "</tbody></table></div></div>";
    html += '<p class="disclaimer">当前遗漏 = 截至该年最新一期连续未出现的期数；历史遗漏按已完成的一轮遗漏统计。</p>';
    view.innerHTML = html;
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
      var hm = hitMissTxt(cnt[z], totalZC);
      html += '<div class="zitem"><div class="zn">' + z + '</div><div class="zc">' + hm.txt + "</div></div>";
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

    html += '<div class="section"><div class="panel"><table class="table"><thead><tr><th>数字</th><th>最佳触发条件</th><th>命中/错</th><th>样本</th><th>说明</th></tr></thead><tbody>';
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
      var edgeTxt, edgeColor;
      if (bestTotal < 10) { edgeTxt = "样本不足"; edgeColor = "#94a3b8"; }
      else { edgeTxt = "中" + bestHit + "·错" + (bestTotal - bestHit); edgeColor = bestTotal < 20 ? "#eab308" : "#16a34a"; }
      html += '<tr><td><strong>' + num + "</strong></td><td>缺席 ≥ " + (bestGap || 2) + " 期</td><td style=\"color:" + edgeColor + ";font-weight:700\">" + edgeTxt + "</td><td>" + bestTotal + "</td><td>" + desc + "</td></tr>";
    }
    html += "</tbody></table></div></div>";
    html += '<p class="disclaimer">统计口径：当某数字连续缺席 N 期后，接下来 3 期内出现的概率；样本量不足时优先放宽到 3。仅供参考。</p>';
    view.innerHTML = html;
  }

  tabsEl.addEventListener("click", function (e) {
    // 箭头移动（↑前移 / ↓后移），立即保存，不重渲染页面内容
    var sortBtn = e.target.closest(".sort-btn");
    if (sortBtn) {
      var sid = sortBtn.dataset.tab;
      var dir = sortBtn.dataset.sort;
      var tabs = getVisibleTabs();
      var idx = -1;
      for (var i = 0; i < tabs.length; i++) { if (tabs[i].id === sid) { idx = i; break; } }
      if (idx < 0) return;
      if (dir === "up" && idx > 0) {
        var tmp = tabs[idx - 1]; tabs[idx - 1] = tabs[idx]; tabs[idx] = tmp;
      } else if (dir === "down" && idx < tabs.length - 1) {
        var tmp2 = tabs[idx + 1]; tabs[idx + 1] = tabs[idx]; tabs[idx] = tmp2;
      } else {
        return;
      }
      saveTabOrder(tabs);
      renderTabs();
      return;
    }
    // 进入/退出排序模式，只重渲染导航，不重渲染页面内容
    if (e.target.closest(".sort-toggle")) {
      tabSortMode = !tabSortMode;
      renderTabs();
      return;
    }
    // 恢复默认顺序
    if (e.target.closest(".sort-reset")) {
      resetTabOrder();
      renderTabs();
      return;
    }
    var btn = e.target.closest(".tab");
    if (btn && !btn.dataset.sortToggle && !btn.dataset.sortReset) {
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
    var wkWindowChip = e.target.closest("[data-wk-window]");
    if (wkWindowChip) {
      state.windowK = Number(wkWindowChip.dataset.wkWindow);
      renderWindowK();
      return;
    }
    var zodWindowChip = e.target.closest("[data-zod-window]");
    if (zodWindowChip) {
      state.zodWindow = Number(zodWindowChip.dataset.zodWindow);
      renderZodWindow();
      return;
    }
    var yearChip = e.target.closest("[data-year]");
    if (yearChip) {
      state.year = Number(yearChip.dataset.year);
      if (state.tab === "trend") renderTrend();
      else if (state.tab === "numtrend") renderNumTrend();
      else if (state.tab === "zodtrend") renderZodTrend();
      else if (state.tab === "zodwindow") renderZodWindow();
      else if (state.tab === "zodmonitor") renderZodMonitor();
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
