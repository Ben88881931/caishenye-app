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

  function countInSeg(tail, a, b) {
    var c = 0;
    for (var i = a; i <= b; i++) {
      if (hit(periods[i], tail)) c++;
    }
    return c;
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
    tab: "overview",
    window: 15,
    segWindow: 15,
    rollWindow: 10,
    tail: 0,
    year: latest ? rec(2026, latest) ? 2026 : 2026 : 2026,
    recordPage: 0,
  };

  var TABS = [
    { id: "overview", label: "总览" },
    { id: "tails", label: "尾数分析" },
    { id: "segments", label: "分段对比" },
    { id: "miss", label: "遗漏" },
    { id: "trend", label: "走势" },
    { id: "records", label: "记录" },
    { id: "backtest", label: "回测" },
    { id: "order", label: "下单" },
    { id: "predict", label: "预估" },
    { id: "personality", label: "性格" },
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
      return '<button class="tab ' + (state.tab === t.id ? "is-active" : "") +
        '" data-tab="' + t.id + '">' + t.label + "</button>";
    }).join("");
  }

  function renderHeader() {
    document.getElementById("latestPeriod").textContent = latest;
    document.getElementById("latestTails").textContent = "尾 " + tailsOf(latest).join(" ");
  }

  function render() {
    renderTabs();
    if (state.tab === "overview") renderOverview();
    else if (state.tab === "tails") renderTails();
    else if (state.tab === "segments") renderSegments();
    else if (state.tab === "miss") renderMiss();
    else if (state.tab === "trend") renderTrend();
    else if (state.tab === "records") renderRecords();
    else if (state.tab === "backtest") renderBacktest();
    else if (state.tab === "order") renderOrder();
    else if (state.tab === "predict") renderPredict();
    else if (state.tab === "personality") renderPersonality();
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
    var html = '<div class="section"><div class="section__head"><h2 class="section__title">尾数分段窗口分析</h2></div>';
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

  function renderTrend() {
    var heatPeriods = periods;
    var html = '<div class="section"><div class="section__head"><h2 class="section__title">尾数走势热力图</h2><span class="section__hint">第 ' + periods[0] + ' 期 - 第 ' + latest + " 期 · 共 " + periods.length + " 期</span></div>";
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

    html += '<div class="section"><div class="section__head"><h2 class="section__title">尾数滚动开出率</h2><span class="section__hint">' + state.rollWindow + ' 期窗口</span></div>';
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

    html += '<div class="section"><div class="section__head"><h2 class="section__title">生肖分布</h2><span class="section__hint">' + state.year + " 年</span></div>";
    html += '<div class="chips" style="margin-bottom:8px">';
    [2026, 2025, 2024, 2023, 2022, 2021].forEach(function (y) {
      html += '<button class="chip ' + (state.year === y ? "is-active" : "") + '" data-year="' + y + '">' + y + "</button>";
    });
    html += "</div>";
    html += '<div class="panel"><div class="panel__body"><div id="zodchart" class="bars"></div></div></div></div>';

    view.innerHTML = html;

    drawLineChart();
    drawZodiacBars();
    var hm = view.querySelector(".heatmap");
    if (hm) hm.scrollTop = hm.scrollHeight;
  }

  function drawLineChart() {
    var host = document.getElementById("linechart");
    if (!host) return;
    var w = state.rollWindow;
    var count = 60;
    var start = Math.max(0, periods.length - count);
    var values = [];
    var labels = [];
    for (var i = start; i < periods.length; i++) {
      var r = rateAt(state.tail, i, w);
      values.push(r == null ? 0 : r * 100);
      labels.push(periods[i]);
    }
    var maxV = Math.max(100, Math.max.apply(null, values));
    var width = 640, height = 180;
    var padL = 24, padR = 8, padT = 10, padB = 20;
    var plotW = width - padL - padR;
    var plotH = height - padT - padB;
    var pts = values.map(function (v, idx) {
      var x = padL + (values.length === 1 ? 0 : idx / (values.length - 1) * plotW);
      var y = padT + plotH - (v / maxV) * plotH;
      return x.toFixed(1) + "," + y.toFixed(1);
    }).join(" ");

    var grid = "";
    for (var g = 0; g <= 4; g++) {
      var gy = padT + plotH - (g / 4) * plotH;
      grid += '<line x1="' + padL + '" y1="' + gy.toFixed(1) + '" x2="' + (padL + plotW) + '" y2="' + gy.toFixed(1) + '" stroke="#eef0f2" stroke-width="1"/>';
    }

    var xlabels = "";
    for (var li = 0; li < labels.length; li += Math.ceil(labels.length / 6)) {
      var lx = padL + li / (values.length - 1) * plotW;
      xlabels += '<text x="' + lx.toFixed(1) + '" y="' + (height - 4) + '" font-size="9" fill="#9aa1ab" text-anchor="middle">' + labels[li] + "</text>";
    }

    host.innerHTML = '<svg viewBox="0 0 ' + width + " " + height + '" preserveAspectRatio="none" style="width:100%;height:180px">' +
      grid +
      '<polyline points="' + pts + '" fill="none" stroke="#2563eb" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<text x="' + padL + '" y="9" font-size="9" fill="#9aa1ab">尾 ' + state.tail + " " + w + "期开出率</text>" +
      xlabels +
      "</svg>";
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

  function renderRecords() {
    var year = state.year;
    var list = D.filter(function (e) { return e.y === year; }).sort(function (a, b) { return b.p - a.p; });
    var pageSize = 10;
    var totalPages = Math.max(1, Math.ceil(list.length / pageSize));
    if (state.recordPage >= totalPages) state.recordPage = totalPages - 1;
    var page = list.slice(state.recordPage * pageSize, state.recordPage * pageSize + pageSize);

    var html = '<div class="section"><div class="section__head"><h2 class="section__title">开奖记录</h2><span class="section__hint">7 号码 + 生肖</span></div>';
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
        html += '<div class="record"><div class="record__top"><span class="record__period">第 ' + r.p + ' 期</span><span class="record__meta">' + r.y + " · 太岁 " + r.tai + "</span></div><div class=\"num-list\">";
        r.nums.forEach(function (n, i) {
          html += '<div style="text-align:center"><div class="num">' + n + '</div><div class="zod">' + r.zods[i] + "</div></div>";
        });
        html += "</div></div>";
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

  function renderSegments() {
    var w = state.segWindow;
    var segs = segsOf(w);
    var last3 = segs.slice(-3);

    var html = '<div class="section"><div class="section__head"><h2 class="section__title">窗口选择</h2></div><div class="chips">';
    [5, 7, 10, 15, 20, 27, 30].forEach(function (n) {
      html += '<button class="chip ' + (w === n ? "is-active" : "") + '" data-segw="' + n + '">' + n + " 期</button>";
    });
    html += "</div></div>";

    html += '<div class="section"><div class="section__head"><h2 class="section__title">最近三段对比</h2><span class="section__hint">共 ' + segs.length + " 个分段，末段可能不满窗口</span></div>";
    html += '<div class="panel"><table class="table"><thead><tr><th>尾数</th>';
    last3.forEach(function (seg, idx) {
      var segNo = segs.length - 3 + idx + 1;
      html += '<th class="seg-cell"><div>第 ' + segNo + ' 段</div><div class="seg-head">' + seg.s + '-' + seg.e + ' 期 · ' + seg.len + ' 期</div></th>';
    });
    html += "<th>趋势</th></tr></thead><tbody>";

    for (var t = 0; t < 10; t++) {
      html += "<tr><td>" + t + "</td>";
      var counts = last3.map(function (seg) { return countInSeg(t, seg.si, seg.ei); });
      var rates = counts.map(function (c, idx) { return c / last3[idx].len; });
      last3.forEach(function (seg, idx) {
        var c = counts[idx];
        var fill = c / w;
        var above = rates[idx] >= BASE_RATE[t];
        var color = above ? "var(--hot)" : "var(--cold)";
        var isLast = idx === last3.length - 1;
        var est = "";
        if (isLast && seg.len < w) {
          var predicted = c + (w - seg.len) * BASE_RATE[t];
          est = '<div class="seg-est">预估 ' + predicted.toFixed(1) + ' 次</div>';
        }
        html += '<td class="seg-cell"><div class="seg-rate">' + (fill * 100).toFixed(0) + '%</div><div class="seg-count" style="color:' + color + '">' + c + '/' + seg.len + ' 期</div><div class="seg-bar"><i style="width:' + Math.round(fill * 100) + '%"></i></div>' + est + '</td>';
      });
      var prev = rates[1], last = rates[2];
      var trend, cls;
      if (last - prev >= 0.05) { trend = "↗ 升温"; cls = "trend-up"; }
      else if (prev - last >= 0.05) { trend = "↘ 降温"; cls = "trend-down"; }
      else { trend = "→ 平稳"; cls = "trend-flat"; }
      html += '<td class="' + cls + '">' + trend + "</td>";
      html += "</tr>";
    }
    html += "</tbody></table></div></div>";
    html += '<p class="disclaimer">百分比与进度条 = 该尾数在本段开出次数相对完整窗口（' + w + ' 期）的进度；末段不满窗口时也按完整窗口计算，副标签显示实际期数。颜色 = 实际开出率相对该尾理论基准（红=偏热，蓝=偏冷）。</p>';
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
    var html = '<div class="section"><div class="section__head"><h2 class="section__title">下单系统</h2><span class="section__hint">数据保存在本机浏览器</span></div>';
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
      if (lastBin[d] === "0") cands.push({ d: d, miss: miss, cnt15: cnt15, cnt5: cnt5, bt: bt, score: score, dir: dir });
      html += '<tr><td>尾' + d + '</td><td style="background:' + bg15 + ';color:#fff">' + cnt15 + "/15 " + s15 + '</td><td style="background:' + bg5 + ';color:#fff">' + cnt5 + "/5 " + s5 + '</td><td>' + cnt7 + "/7</td><td>" + cnt10 + "/10</td><td>" + miss + "期</td><td>" + bt + "期</td><td>" + dir + "</td></tr>";
    }
    html += "</tbody></table></div></div>";

    cands.sort(function (a, b) { return b.score - a.score; });
    html += '<div class="section"><div class="section__head"><h2 class="section__title">下期推荐</h2><span class="section__hint">按冷热+遗漏+临界打分</span></div>';
    html += '<div class="panel"><div class="panel__body">';
    if (cands.length === 0) {
      html += '<div class="empty">上期全中，无未出号，建议跳过</div>';
    } else {
      var top = cands[0];
      html += '<div style="font-size:16px;font-weight:700;color:var(--accent)">首选：尾 ' + top.d + "</div>";
      html += '<div style="margin-top:4px;font-size:12px;color:var(--muted)">遗漏 ' + top.miss + " 期 | 15段 " + top.cnt15 + "/15 | 近5期 " + top.cnt5 + "/5 | 临界 " + top.bt + " 期</div>";
      html += '<div style="margin-top:4px">方向：' + top.dir + "</div>";
      if (cands.length >= 2) {
        var sec = cands[1];
        html += '<div style="margin-top:10px;color:var(--muted)">备选：尾 ' + sec.d + "（遗漏 " + sec.miss + " 期 | 15段 " + sec.cnt15 + "/15）</div>";
      }
    }
    html += "</div></div></div>";
    html += '<p class="disclaimer">这是老版三层框架的移植，评分基于冷热与遗漏；历史回测显示这类信号没有稳定优势，仅供参考。</p>';
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

  function renderPersonality() {
    var html = '<div class="section"><div class="section__head"><h2 class="section__title">尾号性格表</h2><span class="section__hint">该尾数「遗漏N期后下一期开出」的概率</span></div>';
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
    html += '<p class="disclaimer">反弹率 = 该尾数历史上「连续遗漏N期后、下一期开出」的概率；样本小于3标 *。🟢稳 / 🟡中 / 🔴险 按遗1-3反弹率平均划分。</p>';
    view.innerHTML = html;
  }

  tabsEl.addEventListener("click", function (e) {
    var btn = e.target.closest(".tab");
    if (btn) {
      state.tab = btn.dataset.tab;
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
    var yearChip = e.target.closest("[data-year]");
    if (yearChip) {
      state.year = Number(yearChip.dataset.year);
      if (state.tab === "trend") renderTrend();
      else if (state.tab === "records") renderRecords();
      return;
    }
    if (e.target.closest("[data-prev]")) {
      if (state.recordPage > 0) {
        state.recordPage--;
        renderRecords();
      }
      return;
    }
    if (e.target.closest("[data-next]")) {
      state.recordPage++;
      renderRecords();
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

  renderHeader();
  render();
})();
