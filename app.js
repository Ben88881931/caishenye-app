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
    tab: lsGet("v2_current_tab", "pick3"),
    group: lsGet("v2_nav_group", "recommend"),
    window: 15,
    segWindow: 15,
    segTails: 7,
    segCount: 0,
    rollWindow: 10,
    tail: 0,
    year: latest ? rec(2026, latest) ? 2026 : 2026 : 2026,
    recordPage: 0,
    orderTail: lsGet("v2_order_tail", "all"),
    windowMultLine: "tail1",
    windowMultN: 2,
  };

  var TABS = [
    { id: "overview", label: "总览" },
    { id: "pick3", label: "双号追热" },
    { id: "chasenumber", label: "三期内追号码" },
    { id: "chaserecommend", label: "三期内追推荐" },
    { id: "orderhint", label: "执行提示" },
    { id: "funds", label: "资金调度" },
    { id: "formulas", label: "公式表" },
    { id: "windowmult", label: "窗口倍投测试" },
    { id: "orderlog", label: "追三期下单" },
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
  ];

  var NAV_GROUPS = [
    { id: "recommend", label: "模型流程", tabs: ["pick3", "chasenumber", "chaserecommend", "orderhint", "funds", "formulas", "windowmult", "orderlog"] },
    { id: "trends", label: "走势总览", tabs: ["overview", "segments", "windowk", "numtrend", "zodtrend"] },
    { id: "miss", label: "遗漏分析", tabs: ["trend", "miss", "missorder", "parity"] },
    { id: "zodiac", label: "生肖专区", tabs: ["zodrecords", "zodwindow", "zodmonitor"] },
    { id: "tools", label: "分析工具", tabs: ["personality", "datarecord", "tails", "backtest"] },
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
  var NAV_GROUP_KEY = "v2_nav_group";
  var NAV_GROUP_ORDER_KEY = "v2_nav_group_order";
  var NAV_PAGE_GROUPS_KEY = "v2_nav_page_groups";
  var NAV_COLLAPSED_KEY = "v2_nav_collapsed";
  var tabSortMode = false;
  var renderedTab = null;

  function groupById(groupId) {
    for (var i = 0; i < NAV_GROUPS.length; i++) {
      if (NAV_GROUPS[i].id === groupId) return NAV_GROUPS[i];
    }
    return null;
  }

  function getConfiguredGroups() {
    var saved = lsGet(NAV_GROUP_ORDER_KEY, null);
    var defaultIds = NAV_GROUPS.map(function (g) { return g.id; });
    if (!Array.isArray(saved) || !saved.length) return NAV_GROUPS.slice();
    var seen = {};
    var result = [];
    saved.forEach(function (id) {
      var g = groupById(id);
      if (g && !seen[id]) {
        result.push(g);
        seen[id] = true;
      }
    });
    NAV_GROUPS.forEach(function (g) {
      if (!seen[g.id]) result.push(g);
    });
    return result;
  }

  function defaultPageGroupMap() {
    var map = {};
    NAV_GROUPS.forEach(function (g) {
      g.tabs.forEach(function (id) { map[id] = g.id; });
    });
    return map;
  }

  function getPageGroupMap() {
    var map = defaultPageGroupMap();
    var saved = lsGet(NAV_PAGE_GROUPS_KEY, null);
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return map;
    Object.keys(saved).forEach(function (id) {
      if (map[id] && groupById(saved[id])) map[id] = saved[id];
    });
    return map;
  }

  function savePageGroupMap(map) {
    lsSet(NAV_PAGE_GROUPS_KEY, map);
  }

  function groupForTab(tabId) {
    return groupById(getPageGroupMap()[tabId]);
  }

  // 合并默认顺序与自定义顺序：已保存且仍存在→按保存顺序；新增→追加末尾；已删除→忽略
  function getOrderedAllTabs() {
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

  function getVisibleTabs(groupId) {
    var group = groupById(groupId || state.group) || NAV_GROUPS[0];
    var pageGroups = getPageGroupMap();
    return getOrderedAllTabs().filter(function (t) { return pageGroups[t.id] === group.id; });
  }

  function saveTabOrder(tabs) {
    lsSet(TAB_ORDER_KEY, tabs.map(function (t) { return t.id; }));
  }

  function saveTabOrderIds(ids) {
    lsSet(TAB_ORDER_KEY, ids);
  }

  function resetTabOrder() {
    try {
      localStorage.removeItem(TAB_ORDER_KEY);
      localStorage.removeItem(NAV_GROUP_ORDER_KEY);
      localStorage.removeItem(NAV_PAGE_GROUPS_KEY);
      localStorage.removeItem(NAV_COLLAPSED_KEY);
    } catch (e) {}
  }

  function firstTabInGroup(groupId) {
    var tabs = getVisibleTabs(groupId);
    return tabs.length ? tabs[0].id : "overview";
  }

  function moveTabWithinGroup(tabId, dir) {
    var tabs = getVisibleTabs(state.group);
    var idx = tabs.map(function (t) { return t.id; }).indexOf(tabId);
    if (idx < 0) return;
    if (dir === "up" && idx > 0) {
      var tmp = tabs[idx - 1]; tabs[idx - 1] = tabs[idx]; tabs[idx] = tmp;
    } else if (dir === "down" && idx < tabs.length - 1) {
      var tmp2 = tabs[idx + 1]; tabs[idx + 1] = tabs[idx]; tabs[idx] = tmp2;
    } else {
      return;
    }
    var globalIds = getOrderedAllTabs().map(function (t) { return t.id; });
    var groupIds = tabs.map(function (t) { return t.id; });
    var positions = [];
    globalIds.forEach(function (id, pos) {
      if (groupIds.indexOf(id) >= 0) positions.push(pos);
    });
    positions.forEach(function (pos, i) { globalIds[pos] = groupIds[i]; });
    saveTabOrderIds(globalIds);
  }

  function moveTabToGroup(tabId, targetGroupId) {
    var map = getPageGroupMap();
    if (!map[tabId] || !groupById(targetGroupId) || map[tabId] === targetGroupId) return;
    map[tabId] = targetGroupId;
    savePageGroupMap(map);
    var ids = getOrderedAllTabs().map(function (t) { return t.id; }).filter(function (id) { return id !== tabId; });
    var insertAt = ids.length;
    for (var i = 0; i < ids.length; i++) {
      if (map[ids[i]] === targetGroupId) insertAt = i + 1;
    }
    ids.splice(insertAt, 0, tabId);
    saveTabOrderIds(ids);
    state.group = targetGroupId;
    state.tab = tabId;
    lsSet(NAV_GROUP_KEY, state.group);
    lsSet("v2_current_tab", state.tab);
    render();
  }

  function moveGroup(groupId, dir) {
    var groups = getConfiguredGroups();
    var ids = groups.map(function (g) { return g.id; });
    var idx = ids.indexOf(groupId);
    if (idx < 0) return;
    if (dir === "up" && idx > 0) {
      var tmp = ids[idx - 1]; ids[idx - 1] = ids[idx]; ids[idx] = tmp;
    } else if (dir === "down" && idx < ids.length - 1) {
      var tmp2 = ids[idx + 1]; ids[idx + 1] = ids[idx]; ids[idx] = tmp2;
    } else {
      return;
    }
    lsSet(NAV_GROUP_ORDER_KEY, ids);
  }

  function collapsedGroupIds() {
    var arr = lsGet(NAV_COLLAPSED_KEY, []);
    return Array.isArray(arr) ? arr : [];
  }

  function isGroupCollapsed(groupId) {
    return collapsedGroupIds().indexOf(groupId) >= 0;
  }

  function toggleGroupCollapsed(groupId) {
    var arr = collapsedGroupIds();
    var idx = arr.indexOf(groupId);
    if (idx >= 0) arr.splice(idx, 1);
    else arr.push(groupId);
    lsSet(NAV_COLLAPSED_KEY, arr);
  }

  function nudgeNavItem(container, item) {
    if (!container || !item) return;
    var pad = 12;
    var left = item.offsetLeft;
    var right = left + item.offsetWidth;
    if (left < container.scrollLeft + pad) {
      container.scrollLeft = Math.max(0, left - pad);
    } else if (right > container.scrollLeft + container.clientWidth - pad) {
      container.scrollLeft = right - container.clientWidth + pad;
    }
  }

  function renderTabs() {
    var groups = getConfiguredGroups();
    var group = groupById(state.group) || groups[0];
    var oldGroups = tabsEl.querySelector(".nav-groups");
    var oldSubtabs = tabsEl.querySelector(".nav-subtabs");
    var groupScroll = oldGroups ? oldGroups.scrollLeft : 0;
    var tabScroll = oldSubtabs ? oldSubtabs.scrollLeft : 0;
    var groupHtml = groups.map(function (g) {
      var collapsed = isGroupCollapsed(g.id);
      var h = '<span class="nav-group-wrap">';
      if (tabSortMode) {
        h += '<button class="nav-group-move" type="button" data-group-move="up" data-group-id="' + g.id + '" aria-label="' + g.label + ' 前移">↑</button>';
      }
      h += '<button class="nav-group' + (g.id === group.id ? " is-active" : "") + (collapsed ? " is-collapsed" : "") +
        '" type="button" data-nav-group="' + g.id + '" aria-expanded="' + (!collapsed) + '">' + g.label +
        '<span class="nav-group-caret" aria-hidden="true">' + (collapsed ? "▸" : "▾") + '</span></button>';
      if (tabSortMode) {
        h += '<button class="nav-group-move" type="button" data-group-move="down" data-group-id="' + g.id + '" aria-label="' + g.label + ' 后移">↓</button>';
      }
      h += "</span>";
      return h;
    }).join("");
    var tabs = isGroupCollapsed(group.id) ? [] : getVisibleTabs(group.id);
    var tabsHtml = tabs.map(function (t) {
      if (tabSortMode) {
        var moveOptions = groups.filter(function (g) { return g.id !== state.group; }).map(function (g) {
          return '<option value="' + g.id + '">移到' + g.label + "</option>";
        }).join("");
        return '<span class="sort-item-wrap">' +
          '<button class="sort-btn" type="button" data-sort="up" data-tab="' + t.id + '" aria-label="' + t.label + ' 前移">↑</button>' +
          '<button class="tab sort-item' + (state.tab === t.id ? " is-active" : "") + '" type="button" data-tab="' + t.id + '">' + t.label + "</button>" +
          '<button class="sort-btn" type="button" data-sort="down" data-tab="' + t.id + '" aria-label="' + t.label + ' 后移">↓</button>' +
          '<select class="tab-move-select" data-move-tab="' + t.id + '" aria-label="移动到其他分类"><option value="">移动</option>' + moveOptions + "</select>" +
          "</span>";
      }
      return '<button class="tab ' + (state.tab === t.id ? "is-active" : "") +
        '" type="button" data-tab="' + t.id + '">' + t.label + "</button>";
    }).join("");

    tabsHtml += '<div class="tab-sort-tail">';
    tabsHtml += '<button class="tab sort-toggle' + (tabSortMode ? " is-on" : "") + '" type="button" data-sort-toggle="1">' +
      (tabSortMode ? "退出排序" : "导航排序") + "</button>";
    if (tabSortMode) {
      tabsHtml += '<button class="tab sort-reset" type="button" data-sort-reset="1">恢复默认</button>';
    }
    tabsHtml += "</div>";

    tabsEl.classList.toggle("sorting", tabSortMode);
    tabsEl.innerHTML = '<div class="nav-groups">' + groupHtml + '</div><div class="nav-subtabs">' + tabsHtml + "</div>";
    var nextGroups = tabsEl.querySelector(".nav-groups");
    var nextSubtabs = tabsEl.querySelector(".nav-subtabs");
    if (nextGroups) nextGroups.scrollLeft = groupScroll;
    if (nextSubtabs) nextSubtabs.scrollLeft = tabScroll;
    requestAnimationFrame(function () {
      nudgeNavItem(nextGroups, nextGroups && nextGroups.querySelector(".nav-group.is-active"));
      nudgeNavItem(nextSubtabs, nextSubtabs && nextSubtabs.querySelector(".tab.is-active"));
    });
  }

  function promoteSectionToTop(title, anchorIds) {
    var anchor = null;
    for (var ai = 0; ai < anchorIds.length; ai++) {
      anchor = view.querySelector("#" + anchorIds[ai]);
      if (anchor) break;
    }
    if (!anchor || anchor.parentNode !== view) return;
    var sections = view.querySelectorAll(".section");
    for (var si = 0; si < sections.length; si++) {
      var heading = sections[si].querySelector(".section__title");
      if (heading && heading.textContent.indexOf(title) >= 0) {
        view.insertBefore(sections[si], anchor.nextSibling);
        sections[si].style.borderTop = "3px solid #2563eb";
        sections[si].style.paddingTop = "8px";
        break;
      }
    }
  }

  function moveSectionBeforeAnchor(title, anchorId) {
    var anchor = view.querySelector("#" + anchorId);
    if (!anchor || anchor.parentNode !== view) return;
    var sections = view.querySelectorAll(".section");
    for (var i = 0; i < sections.length; i++) {
      var heading = sections[i].querySelector(".section__title");
      if (heading && heading.textContent.indexOf(title) >= 0) {
        view.insertBefore(sections[i], anchor);
        break;
      }
    }
  }

  function renderHeader() {
    document.getElementById("latestPeriod").textContent = latest;
    document.getElementById("latestTails").textContent = "尾 " + tailsOf(latest).join(" ");
  }

  function scrollToLatest() {
    if (state.tab === "pick3" || state.tab === "selector" || state.tab === "chasenumber" || state.tab === "chaserecommend" || state.tab === "orderlog") return;
    var sc = view.querySelector(".trend-scroll, .heatmap, .seg-hist-scroll");
    if (sc) {
      sc.scrollTop = sc.scrollHeight;
      return;
    }
    var lastRecord = view.querySelector(".record:last-child");
    if (lastRecord) lastRecord.scrollIntoView({ block: "end" });
  }

  function render() {
    if (state.tab === "selector") state.tab = "chasenumber";
    var tabChanged = state.tab !== renderedTab;
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
    else if (state.tab === "predict") renderPredict();
    else if (state.tab === "pick3") renderPick3();
    else if (state.tab === "selector") renderSelector();
    else if (state.tab === "chasenumber") renderChaseNumber();
    else if (state.tab === "chaserecommend") renderChaseRecommendation();
    else if (state.tab === "orderhint") renderOrderHint();
    else if (state.tab === "funds") renderFunds();
    else if (state.tab === "formulas") renderFormulaTable();
    else if (state.tab === "windowmult") renderWindowMultiplierTest();
    else if (state.tab === "orderlog") renderOrderLog();
    else if (state.tab === "personality") renderPersonality();
    else if (state.tab === "datarecord") renderDataRecord();
    scrollToLatest();
    if (tabChanged) {
      renderedTab = state.tab;
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
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
    html += '<div class="section"><div class="section__head"><h2 class="section__title">每日选号下单顺序</h2><span class="section__hint">先选号、再看风险、最后手动记录</span></div></div>';
    var flowSteps = [
      ["选号码", "先打开“双号追热”，只看 D1、D2 两个推荐号；D1优先，D1状态不适合时再看 D2。"],
      ["看风险", "看推荐卡下方的四色状态和“连错遗漏记录”。绿色正常；黄色、橙色重点观察；红色为高风险提醒，不自动改号，是否下单仍由你确认。"],
      ["看调度", "打开“三期内追号码”，查看 D1、D2 当前窗口和最终动作；观望只作建议，窗口照常记录，是否下单由你确认。"],
      ["定执行", "需要下单时进入“追三期下单”，选择固定追号或每期追推荐，填写来源、位置、起始期、尾号和基础金额。"],
      ["选倍投", "按当前页面允许的 P 档手动选择；倍投、本金和是否下单都由你确认。"],
      ["等结算", "开奖数据更新后，系统自动结算第1期中、第2期中、第3期中或三期全错，并写入下单记录和追中记录。"]
    ];
    html += '<div class="section"><div class="panel"><div class="panel__body">';
    html += '<div class="overview-flow">';
    flowSteps.forEach(function (step, i) {
      html += '<div class="overview-step"><span class="overview-step__num">' + (i + 1) + '</span><div><b>' + step[0] + '</b><span>' + step[1] + '</span></div></div>';
    });
    html += '</div>';
    html += '<div class="overview-actions">';
    html += '<button class="chip" data-overview-tab="pick3">先看双号追热</button>';
    html += '<button class="chip" data-overview-tab="chasenumber">再看三期内追号码</button>';
    html += '<button class="chip" data-overview-tab="orderlog">去追三期下单</button>';
    html += '</div>';
    html += '<div class="overview-note">当前口径：双号追热只负责选号，四色状态负责预警，三期内必中只做结果账本，追三期下单只做手动记录和自动结算。任何页面都不自动替你下注。</div>';
    html += '</div></div></div>';

    var pageGuides = {
      overview: ["总览", "查看最新开奖、页面说明和每日操作顺序。", "每天打开小程序时先看。"],
      pick3: ["双号追热", "双号选号模型，输出 D1、D2，并显示四色风险状态和对错遗漏。", "每天第一步选号时看。"],
      chasenumber: ["三期内追号码", "锁定一个推荐号连续追3期，窗口内不换号；命中或三期全错后结束，下一期重新锁定推荐号开新窗口。", "按固定号码追三期时看。"],
      chaserecommend: ["三期内追推荐", "窗口内第1/2/3期分别采用当期最新推荐，号码可以每期不同；命中或三期全错后重新开窗。", "按每期最新推荐追三期时看。"],
      funds: ["资金调度", "只根据各线窗口状态、历史命中率和ROI分配下注金额；等待线强制0，当前总风险不能超过预算。", "决定今天下不下、每条线下多少时看。"],
      formulas: ["公式表", "展示14条线的阶段系数、训练/验证结果和最终下注公式，不预测号码。", "核查每条线下注公式是否通过历史验证时看。"],
      windowmult: ["窗口倍投测试", "逐条线路列出每个窗口第1/2/3期命中或全错，并比较跨窗口1.5倍、2倍、2.5倍、3倍后的收益、回撤和最大倍率。", "检查窗口倍投规律和资金风险时看。"],
      orderlog: ["追三期下单", "手动记录下单并自动结算，不读取模型自动改号。", "决定下单后使用。"],
      segments: ["分段对比", "按时间段对比开奖和模型表现。", "复盘阶段表现时看。"],
      missorder: ["遗漏排序", "按最近遗漏满3期的顺序查看尾号开奖。", "找遗漏结构时看。"],
      parity: ["单双热图", "单数在左、双数在右，查看逐期开出和遗漏。", "观察单双分布时看。"],
      trend: ["遗漏热图", "逐期查看尾数开出、遗漏深度和滚动开出率。", "复盘走势时看。"],
      zodtrend: ["生肖走势", "按年份查看生肖开出趋势。", "看生肖长期走势时看。"],
      zodwindow: ["生肖窗口", "按窗口统计生肖热度、遗漏和连出。", "看生肖短中期窗口时看。"],
      zodmonitor: ["生肖遗漏", "查看生肖当前遗漏、历史最大和最近15次遗漏。", "监控生肖遗漏时看。"],
      personality: ["尾号性格", "查看每个尾号的遗漏、反弹和连出统计。", "研究单个尾号性格时看。"],
      datarecord: ["三期规律", "查看三期组合和规律记录。", "研究三期组合时看。"],
      miss: ["遗漏监控", "查看尾号当前遗漏、历史最大和最近15次遗漏。", "监控尾号遗漏时看。"],
      tails: ["冷热分析", "按窗口比较尾号实际开出率与理论基准。", "判断冷热偏离时看。"],
      windowk: ["窗口走势", "按不同窗口查看尾号走势变化。", "比较窗口表现时看。"],
      zodrecords: ["生肖开奖", "按年份查看生肖开奖记录。", "查生肖历史开奖时看。"],
      backtest: ["策略回测", "查看样本、命中、基准、置信区间和结论。", "检验策略效果时看。"],
      numtrend: ["号码走势", "按号码查看历史走势和期数变化。", "查看号码级走势时看。"]
    };
    html += '<div class="section"><div class="section__head"><h2 class="section__title">页面说明</h2><span class="section__hint">每个页面负责什么 · 点击卡片可跳转</span></div></div>';
    var groupTheme = {
      recommend: ["#2563eb", "#eff6ff"],
      trends: ["#0891b2", "#ecfeff"],
      miss: ["#d97706", "#fffbeb"],
      zodiac: ["#c2410c", "#fff7ed"],
      tools: ["#7c3aed", "#f5f3ff"]
    };
    html += '<div class="section"><div class="overview-pages-grid">';
    NAV_GROUPS.forEach(function (group) {
      var theme = groupTheme[group.id] || ["#64748b", "#f8fafc"];
      group.tabs.forEach(function (id) {
        var guide = pageGuides[id];
        if (!guide) return;
        html += '<article class="overview-page-card" style="--guide-accent:' + theme[0] + ';--guide-soft:' + theme[1] + '">';
        html += '<div class="overview-page-card__head"><span class="overview-page-card__group">' + group.label + '</span><h3>' + guide[0] + '</h3></div>';
        html += '<p class="overview-page-card__desc">' + guide[1] + '</p>';
        html += '<div class="overview-page-card__when"><b>什么时候看</b><span>' + guide[2] + '</span></div>';
        html += '<button class="overview-page-card__cta" data-overview-tab="' + id + '">打开页面 <span aria-hidden="true">→</span></button>';
        html += '</article>';
      });
    });
    html += '</div></div>';

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

  // ===== 双号模型追三期下单表 =====
  var ULT_ORDER_KEY = "v2_ultimate_order_log";
  var SIMPLE_ORDER_KEY = "v2_simple_order_log";
  var SIMPLE_WINDOW_KEY = "v2_simple_order_windows";
  var HINT_PLANS = {
    0: [0, 500, 0],
    1: [0, 500, 500],
    2: [500, 500, 0],
    3: [0, 500, 0],
    4: [0, 500, 500],
    5: [0, 500, 500],
    6: [0, 500, 500],
    7: [0, 500, 500],
    8: [0, 500, 0],
    9: [500, 500, 0],
  };
  var EXEC_LINES = [
    { id: "tail0", label: "尾0", kind: "tail", tail: 0, plan: [0, 0, 0] },
    { id: "tail1", label: "尾1", kind: "tail", tail: 1, plan: [100, 200, 400] },
    { id: "tail2", label: "尾2", kind: "tail", tail: 2, plan: [300, 0, 0] },
    { id: "tail3", label: "尾3", kind: "tail", tail: 3, plan: [0, 0, 300] },
    { id: "tail4", label: "尾4", kind: "tail", tail: 4, plan: [0, 0, 300] },
    { id: "tail5", label: "尾5", kind: "tail", tail: 5, plan: [0, 0, 300] },
    { id: "tail6", label: "尾6", kind: "tail", tail: 6, plan: [100, 0, 300] },
    { id: "tail7", label: "尾7", kind: "tail", tail: 7, plan: [0, 0, 300] },
    { id: "tail8", label: "尾8", kind: "tail", tail: 8, plan: [0, 300, 0] },
    { id: "tail9", label: "尾9", kind: "tail", tail: 9, plan: [300, 0, 0] },
    { id: "fixedD1", label: "追号码 D1", kind: "fixed", stream: "D1", plan: [300, 0, 0] },
    { id: "fixedD2", label: "追号码 D2", kind: "fixed", stream: "D2", plan: [0, 300, 0] },
    { id: "recD1", label: "追推荐 D1", kind: "recommend", stream: "D1", plan: [100, 100, 100] },
    { id: "recD2", label: "追推荐 D2", kind: "recommend", stream: "D2", plan: [0, 300, 0] },
  ];

  // 公式来源：2021-2023训练段 + 2024-2026验证段，两段均为正的阶段系数才配仓。
  var EXEC_FORMULA_AUDIT = {
    tail0: { formula: "不配仓", train: [-0.1744, -0.1525, -0.0949], valid: [-0.1399, 0.0359, -0.0191], fullNet: 0, fullRoi: 0, trainNet: 0, validNet: 0, maxDrawdown: 0, miss: 119 },
    tail1: { formula: "双倍倍投", train: [0.0344, 0.0213, -0.0041], valid: [-0.0576, -0.0119, 0.0407], fullNet: 5680, fullRoi: 0.0264186047, trainNet: 2400, validNet: 3280, maxDrawdown: 4220, miss: 62 },
    tail2: { formula: "阶段公式", train: [0.0929, 0.0229, 0.0095], valid: [0.0629, -0.0152, -0.0190], fullNet: 19620, fullRoi: 0.0778571429, trainNet: 11700, validNet: 7920, maxDrawdown: 5100, miss: 68 },
    tail3: { formula: "阶段公式", train: [-0.0225, 0.0131, 0.0157], valid: [0.0378, -0.0187, 0.0124], fullNet: 3360, fullRoi: 0.0708860759, trainNet: 1800, validNet: 1560, maxDrawdown: 2160, miss: 64 },
    tail4: { formula: "阶段公式", train: [0.0073, -0.0301, 0.0254], valid: [-0.0672, -0.0599, 0.0104], fullNet: 4140, fullRoi: 0.0779661017, trainNet: 2940, validNet: 1200, maxDrawdown: 2220, miss: 71 },
    tail5: { formula: "阶段公式", train: [-0.0596, -0.0026, 0.0142], valid: [0.0671, -0.0343, 0.0014], fullNet: 1800, fullRoi: 0.0363636364, trainNet: 1620, validNet: 180, maxDrawdown: 2100, miss: 70 },
    tail6: { formula: "阶段公式", train: [0.0015, 0.0075, 0.0281], valid: [0.0168, -0.0457, 0.0322], fullNet: 7040, fullRoi: 0.1111461951, trainNet: 3148, validNet: 3892, maxDrawdown: 1380, miss: 61 },
    tail7: { formula: "阶段公式", train: [0.0142, -0.0254, 0.0294], valid: [-0.0418, -0.0020, 0.0060], fullNet: 4200, fullRoi: 0.0843373494, trainNet: 3480, validNet: 720, maxDrawdown: 3300, miss: 66 },
    tail8: { formula: "阶段公式", train: [0.0010, 0.0026, -0.0078], valid: [-0.0145, 0.0020, -0.0155], fullNet: 540, fullRoi: 0.0051282051, trainNet: 300, validNet: 240, maxDrawdown: 5220, miss: 74 },
    tail9: { formula: "阶段公式", train: [0.0450, -0.0419, -0.0394], valid: [0.0280, 0.0488, -0.0270], fullNet: 8820, fullRoi: 0.0361623616, trainNet: 5280, validNet: 3540, maxDrawdown: 6540, miss: 82 },
    fixedD1: { formula: "阶段公式", train: [0.0211, 0.0090, 0.0074], valid: [0.0055, -0.0284, -0.0055], fullNet: 3060, fullRoi: 0.0130769231, trainNet: 2400, validNet: 660, maxDrawdown: 8040, miss: 69 },
    fixedD2: { formula: "阶段公式", train: [0.0594, 0.0198, -0.0078], valid: [-0.0599, 0.0035, 0.0079], fullNet: 2700, fullRoi: 0.0256410256, trainNet: 2280, validNet: 420, maxDrawdown: 4380, miss: 67 },
    recD1: { formula: "连追100", train: [0.0246, 0.0262, 0.0031], valid: [0.0378, 0.0158, 0.0014], fullNet: 4400, fullRoi: 0.0339244410, trainNet: 2100, validNet: 2300, maxDrawdown: 2980, miss: 63 },
    recD2: { formula: "阶段公式", train: [0.1122, 0.0333, -0.0084], valid: [-0.0618, 0.0060, 0.0015], fullNet: 4740, fullRoi: 0.0456647399, trainNet: 4020, validNet: 720, maxDrawdown: 3720, miss: 66 },
  };
  var ORDER_PATTERNS = {
    P6: [1, 1.25, 2.8125],
    P7: [1, 1.5, 3.375],
    P8: [1, 3, 9]
  };

  function ultimateOrdersLoad() {
    var rows = lsGet(ULT_ORDER_KEY, []);
    return Array.isArray(rows) ? rows : [];
  }

  function ultimateOrdersSave(rows) {
    lsSet(ULT_ORDER_KEY, rows);
  }

  function settleManualOrder(row) {
    if (!row || row.result !== "pending") return null;
    var start = Number(row.startPeriod);
    var tail = Number(row.tail);
    if (!Number.isFinite(start) || !Number.isFinite(tail) || tail < 0 || tail > 9) return null;
    for (var j = 0; j < 3; j++) {
      var period = start + j;
      var bits = RAW[String(period)];
      if (!bits) return null;
      if (bits[tail] === "1") {
        return { result: "hit" + (j + 1), hitIndex: j + 1, settledPeriod: period, autoSettled: true };
      }
    }
    return { result: "miss", hitIndex: 0, settledPeriod: start + 2, autoSettled: true };
  }

  function autoSettleUltimateOrders() {
    var rows = ultimateOrdersLoad();
    var changed = false;
    rows.forEach(function (row) {
      if (row.result !== "pending") return;
      var settled = settleManualOrder(row);
      if (!settled) return;
      row.result = settled.result;
      row.hitIndex = settled.hitIndex;
      row.settledPeriod = settled.settledPeriod;
      row.autoSettled = settled.autoSettled;
      row.settledAt = new Date().toISOString();
      changed = true;
    });
    if (changed) ultimateOrdersSave(rows);
    return rows;
  }

  function ultimateOrderNet(row) {
    var stakes = ORDER_PATTERNS[row.pattern];
    if (!stakes) return 0;
    var base = Number(row.base || 1);
    if (row.result === "hit1") return +(base * 0.8 * stakes[0]).toFixed(2);
    if (row.result === "hit2") return +(base * (1.8 * stakes[1] - stakes[0] - stakes[1])).toFixed(2);
    if (row.result === "hit3") return +(base * (1.8 * stakes[2] - stakes[0] - stakes[1] - stakes[2])).toFixed(2);
    if (row.result === "miss") return +(-base * (stakes[0] + stakes[1] + stakes[2])).toFixed(2);
    return null;
  }

  function ultimateResultLabel(result) {
    if (result === "hit1") return "第1期中";
    if (result === "hit2") return "第2期中";
    if (result === "hit3") return "第3期中";
    if (result === "miss") return "三期全错";
    return "待开奖";
  }

  function simpleOrdersLoad() {
    var rows = lsGet(SIMPLE_ORDER_KEY, []);
    return Array.isArray(rows) ? rows : [];
  }

  function simpleOrdersSave(rows) {
    lsSet(SIMPLE_ORDER_KEY, rows);
  }

  function simpleWindowsLoad() {
    var rows = lsGet(SIMPLE_WINDOW_KEY, []);
    return Array.isArray(rows) ? rows : [];
  }

  function simpleWindowsSave(rows) {
    lsSet(SIMPLE_WINDOW_KEY, rows);
  }

  function simpleWindowStatus(windowRow) {
    var tail = Number(windowRow.tail);
    var start = Number(windowRow.startPeriod);
    var attempts = [];
    for (var i = 0; i < 3; i++) {
      var period = start + i;
      var bits = RAW[String(period)];
      if (!bits) break;
      var hit = bits[tail] === "1";
      attempts.push({ period: period, hit: hit });
      if (hit) {
        return { status: "hit", hitIndex: i + 1, attempts: attempts, settledPeriod: period };
      }
    }
    if (attempts.length === 3) {
      return { status: "miss", hitIndex: 0, attempts: attempts, settledPeriod: start + 2 };
    }
    return { status: "pending", hitIndex: null, attempts: attempts, settledPeriod: null };
  }

  function attachSimpleWindow(tail, period) {
    var windows = simpleWindowsLoad();
    var active = windows.filter(function (w) {
      return Number(w.tail) === Number(tail)
        && Number(w.startPeriod) <= Number(period)
        && Number(w.startPeriod) + 2 >= Number(period)
        && simpleWindowStatus(w).status === "pending";
    }).sort(function (a, b) { return Number(b.startPeriod) - Number(a.startPeriod); })[0];
    if (active) return active.startPeriod;
    windows.push({
      id: Date.now() + "-" + Math.random().toString(16).slice(2),
      tail: Number(tail),
      startPeriod: Number(period),
      createdAt: new Date().toISOString()
    });
    simpleWindowsSave(windows);
    return Number(period);
  }

  function settleSimpleOrder(row) {
    if (!row || row.result !== "pending") return row;
    var period = Number(row.period);
    var tail = Number(row.tail);
    var bits = RAW[String(period)];
    if (!Number.isFinite(period) || !Number.isFinite(tail) || tail < 0 || tail > 9 || !bits) return row;
    var hit = bits[tail] === "1";
    row.result = hit ? "hit" : "miss";
    row.settledPeriod = period;
    row.settledAt = new Date().toISOString();
    return row;
  }

  function autoSettleSimpleOrders() {
    var rows = simpleOrdersLoad();
    var changed = false;
    rows.forEach(function (row) {
      if (row.result !== "pending") return;
      var before = row.result;
      settleSimpleOrder(row);
      if (row.result !== before) changed = true;
    });
    if (changed) simpleOrdersSave(rows);
    return rows;
  }

  function simpleOrderProfit(row) {
    var amount = Number(row.amount || 1);
    if (!Number.isFinite(amount) || row.result === "pending") return null;
    if (row.result === "hit") return +(amount * 0.8).toFixed(2);
    if (row.result === "miss") return +(-amount).toFixed(2);
    return null;
  }

  var execPredCache = {};
  function execPrediction(period) {
    if (!execPredCache[period]) execPredCache[period] = MODEL.buildPrediction(period - 1);
    return execPredCache[period];
  }

  function execPick(period, stream) {
    if (period <= 1) return null;
    var prediction = execPrediction(period);
    var picks = prediction.doubleRecommendation || [];
    return picks[stream === "D1" ? 0 : 1] || null;
  }

  function execHasTail(period, tail) {
    var d1 = execPick(period, "D1");
    var d2 = execPick(period, "D2");
    return !!(d1 && Number(d1.tail) === Number(tail)) || !!(d2 && Number(d2.tail) === Number(tail));
  }

  function buildExecWindows(line) {
    var windows = [];
    var active = null;
    var waiting = null;
    var p = line.kind === "tail" ? 1 : 31;
    while (p <= latest) {
      if (waiting) {
        var waitingActual = MODEL.tailsOf(p);
        if (waitingActual.indexOf(Number(waiting.tail)) >= 0) {
          waiting = null;
        }
        p++;
        continue;
      }
      var trigger = null;
      if (!active) {
        if (line.kind === "tail") {
          trigger = { tail: line.tail };
        } else {
          trigger = execPick(p, line.stream);
        }
        if (!trigger) { p++; continue; }
        active = {
          start: p,
          lockedTail: line.kind === "recommend" ? null : trigger.tail,
          attempts: []
        };
      }
      var actual = MODEL.tailsOf(p);
      var pick = line.kind === "recommend" ? execPick(p, line.stream) : { tail: active.lockedTail };
      var tail = pick ? pick.tail : null;
      var hit = tail != null && actual.indexOf(Number(tail)) >= 0;
      active.attempts.push({ period: p, tail: tail, hit: hit });
      if (hit) {
        active.hitIndex = active.attempts.length;
        active.status = "hit";
        windows.push(active);
        active = null;
        p++;
      } else if (active.attempts.length >= 3) {
        active.hitIndex = 0;
        active.status = "miss";
        windows.push(active);
        var waitTail = null;
        for (var wi = active.attempts.length - 1; wi >= 0; wi--) {
          if (active.attempts[wi].tail != null) {
            waitTail = active.attempts[wi].tail;
            break;
          }
        }
        active = null;
        p++;
        if (waitTail != null) {
          waiting = { tail: waitTail, fromPeriod: p };
        }
      } else {
        p++;
      }
    }
    return {
      windows: windows,
      active: active,
      waiting: waiting ? {
        tail: waiting.tail,
        fromPeriod: waiting.fromPeriod,
        waited: latest >= waiting.fromPeriod ? latest - waiting.fromPeriod + 1 : 0
      } : null
    };
  }

  function execWindowProfit(line, windowRow) {
    var plan = line.plan;
    if (windowRow.hitIndex === 1) return +(plan[0] * 0.8).toFixed(2);
    if (windowRow.hitIndex === 2) return +(-plan[0] + plan[1] * 0.8).toFixed(2);
    if (windowRow.hitIndex === 3) return +(-plan[0] - plan[1] + plan[2] * 0.8).toFixed(2);
    return +(-plan[0] - plan[1] - plan[2]).toFixed(2);
  }

  function execLineStats(line, windows) {
    var settled = windows.filter(function (w) { return w.status !== "pending"; });
    var turnover = 0;
    var net = 0;
    var first = 0, second = 0, third = 0, miss = 0;
    windows.forEach(function (w) {
      var attempts = w.hitIndex === 1 ? 1 : w.hitIndex === 2 ? 2 : 3;
      turnover += line.plan[0] + (attempts > 1 ? line.plan[1] : 0) + (attempts > 2 ? line.plan[2] : 0);
    });
    settled.forEach(function (w) {
      net += execWindowProfit(line, w);
      if (w.hitIndex === 1) first++;
      else if (w.hitIndex === 2) second++;
      else if (w.hitIndex === 3) third++;
      else miss++;
    });
    var hits = first + second + third;
    return {
      turnover: turnover,
      net: +net.toFixed(2),
      roi: turnover ? net / turnover : 0,
      settled: settled.length,
      first: first,
      second: second,
      third: third,
      miss: miss,
      hitWindows: hits,
      missWindows: miss,
      hitRate: settled.length ? hits / settled.length : 0
    };
  }

  function execWindowText(windowRow) {
    if (windowRow.status === "hit") {
      var tail = windowRow.attempts[windowRow.hitIndex - 1].tail;
      return "第" + windowRow.start + "期 · 尾<span class=\"exec-window-card__tail\">" + tail + "</span> · 第" + windowRow.hitIndex + "期中";
    }
    return "第" + windowRow.start + "期 · 连续3期未中 · 本窗口结束";
  }

  function execAttemptText(attempt) {
    return "尾<span class=\"exec-window-card__tail\">" + attempt.tail + "</span>" + (attempt.hit ? "中" : "错");
  }

  function execNextAction(line, result, nextPeriod) {
    if (planRisk(line.plan) <= 0) {
      return {
        action: "不配仓",
        amount: 0,
        stage: "-",
        status: "历史阶段系数未通过",
        color: "#dc2626"
      };
    }
    if (result.waiting) {
      return {
        action: "等待",
        amount: 0,
        stage: "等待开奖",
        status: "尾" + result.waiting.tail + "开出后下一期重开",
        color: "#d97706"
      };
    }
    if (result.active) {
      var attempts = result.active.attempts.length;
      var expected = Number(result.active.start) + attempts;
      if (expected === nextPeriod && attempts < 3) {
        return {
          action: line.plan[attempts] > 0 ? "下注" : "等待",
          amount: Number(line.plan[attempts] || 0),
          stage: "第" + (attempts + 1) + "期",
          status: "窗口进行中",
          color: line.plan[attempts] > 0 ? "#16a34a" : "#2563eb"
        };
      }
      return { action: "检查", amount: 0, stage: "-", status: "窗口状态不连续", color: "#dc2626" };
    }
    var willTrigger = line.kind === "tail" ? true : !!execPick(nextPeriod, line.stream);
    if (willTrigger) {
      return {
        action: line.plan[0] > 0 ? "下注" : "开窗等待",
        amount: Number(line.plan[0] || 0),
        stage: "第1期",
        status: "可开新窗口",
        color: line.plan[0] > 0 ? "#16a34a" : "#2563eb"
      };
    }
    return { action: "不下", amount: 0, stage: "-", status: "等待重新推荐", color: "#6b7280" };
  }

  function renderOrderHint() {
    execPredCache = {};
    var nextPeriod = latest + 1;
    var html = '<div class="section"><div class="section__head"><h2 class="section__title">执行提示 · 14条独立线路</h2><span class="section__hint">10个尾数线只看开奖数据 · 4条推荐线只看D1/D2 · 第' + nextPeriod + '期 · 只提示，不自动下单</span></div></div>';
    EXEC_LINES.forEach(function (line) {
      var result = buildExecWindows(line);
      var stats = execLineStats(line, result.windows);
      var action = execNextAction(line, result, nextPeriod);
      var planText = line.plan.join(" / ");
      var firstStart = result.windows.length ? result.windows[0].start : (result.active ? result.active.start : (line.kind === "tail" ? 1 : 31));
      html += '<div class="section"><div class="panel" style="padding:12px 10px">';
      html += '<div class="exec-line-summary">';
      html += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px">';
      html += '<b class="exec-line__label' + (line.kind === "tail" ? " exec-line__label--tail" : "") + '">' + line.label + '</b>';
      html += '<span class="chip">公式（元） ' + line.plan.join(":") + '</span>';
      html += '<span class="chip">记录起点 第' + firstStart + '期</span>';
      html += '<span class="chip">3期内命中率 ' + (stats.hitRate * 100).toFixed(1) + '%</span>';
      html += '<span class="chip">首次命中分布：第1期' + stats.first + ' / 第2期' + stats.second + ' / 第3期' + stats.third + '</span>';
      html += '<span class="chip" style="background:#ecfdf5;border-color:#86efac;color:#166534;font-weight:900">已结算窗口：中' + stats.hitWindows + '窗 / 错' + stats.missWindows + '窗</span>';
      if (result.waiting) {
        html += '<span class="chip" style="background:#fffbeb;border-color:#fcd34d;color:#92400e;font-weight:900">等待尾' + result.waiting.tail + ' · 已等' + result.waiting.waited + '期</span>';
      }
      html += '<span style="font-size:12px;color:' + (stats.net >= 0 ? "#16a34a" : "#dc2626") + '">历史净收益 ' + (stats.net >= 0 ? "+" : "") + stats.net + ' 元 · ROI ' + (stats.roi * 100).toFixed(1) + '%</span>';
      html += '</div>';
      html += '</div>';
      html += '<div style="font-size:11px;font-weight:900;color:#6b7280;margin:10px 0 6px">对错滚动记录 · 从第' + firstStart + '期起 · 已结算中' + stats.hitWindows + '窗 / 错' + stats.missWindows + '窗 · 新→旧</div>';
      html += '<div style="font-size:11px;color:#64748b;margin:0 0 6px">中窗=3期内至少中1次；错窗=连续3期未中；首次命中分布之和=中窗数。</div>';
      html += '<div class="exec-line__scroll">';
      html += '<div class="exec-window-card--current" data-current-window="1" data-current-period="' + nextPeriod + '" style="min-width:190px;border:1px solid ' + action.color + ';border-radius:8px;padding:8px 9px;background:#f8fafc">';
      html += '<div style="font-size:11px;font-weight:900;color:' + action.color + '">当前窗口 · 当下第' + nextPeriod + '期</div>';
      html += '<div style="font-size:15px;font-weight:900;color:' + action.color + ';margin-top:3px">' + action.action + (action.amount > 0 ? ' · ' + action.amount + '元' : '') + '</div>';
      if (result.waiting) {
        html += '<div style="font-size:11px;color:#b45309;margin-top:3px">等待开奖 · 等待尾<span class="exec-window-card__tail">' + result.waiting.tail + '</span> · 已等' + result.waiting.waited + '期</div>';
      } else if (result.active) {
        html += '<div style="font-size:11px;color:#475569;margin-top:3px">' + action.stage + ' · ' + (result.active.attempts || []).map(execAttemptText).join('→') + '</div>';
      } else {
        var extraStatus = action.status === "可开新窗口" ? "" : " · " + action.status;
        html += '<div style="font-size:11px;color:#475569;margin-top:3px">' + action.stage + extraStatus + ' · 计划 ' + planText + '</div>';
      }
      html += '</div>';
      var recent = result.windows.slice().sort(function (a, b) {
        return Number(b.start) - Number(a.start);
      });
      if (!recent.length) {
        html += '<span style="font-size:12px;color:#9ca3af">暂无已结束窗口</span>';
      } else {
        recent.forEach(function (w) {
          var tone = w.status === "hit" ? "#16a34a" : "#dc2626";
          var bg = w.status === "hit" ? "#f0fdf4" : "#fef2f2";
          var border = w.status === "hit" ? "#bbf7d0" : "#fecaca";
          html += '<div style="min-width:150px;border:1px solid ' + border + ';border-radius:8px;padding:6px 7px;background:' + bg + '">';
          html += '<div style="font-size:10px;color:#6b7280">起始 第' + w.start + '期</div>';
          html += '<div style="font-size:12px;font-weight:900;color:' + tone + ';margin-top:2px">' + execWindowText(w) + '</div>';
          html += '<div style="font-size:10px;color:#6b7280;margin-top:3px">' + (w.attempts || []).map(execAttemptText).join("→") + '</div>';
          html += '</div>';
        });
      }
      html += '</div></div></div>';
    });
    html += '<p class="disclaimer">尾0–尾9只读取各自开奖结果，完全不读取D1/D2；追号码D1/D2和追推荐D1/D2各自只读取对应模型信号。本页只做执行提示和线路对错记录，不自动下单；历史公式仍需时间外验证。</p>';
    view.innerHTML = html;
    requestAnimationFrame(function () {
      Array.prototype.forEach.call(view.querySelectorAll(".exec-line__scroll"), function (scroll) {
        scroll.scrollLeft = 0;
      });
    });
  }

  function fundsWindowPattern(line, result, stats, nextPeriod) {
    if (result.waiting) {
      return { label: "等待 0倍", weight: 0, color: "#d97706", score: 0, reason: "错窗等待中，等确认尾号开出" };
    }
    var target = null;
    if (line.kind === "tail") target = line.tail;
    else if (result.active && result.active.lockedTail != null) target = result.active.lockedTail;
    else {
      var nextPick = execPick(nextPeriod, line.stream);
      target = nextPick ? nextPick.tail : null;
    }
    if (target == null) {
      return { label: "无号 0倍", weight: 0, color: "#dc2626", score: 0, reason: "当前没有可用推荐号" };
    }
    var count5 = 0;
    var count10 = 0;
    for (var p = Math.max(1, latest - 9); p <= latest; p++) {
      if (MODEL.tailsOf(p).indexOf(Number(target)) >= 0) {
        count10++;
        if (p >= latest - 4) count5++;
      }
    }
    var omission = 0;
    for (var q = latest; q >= 1; q--) {
      if (MODEL.tailsOf(q).indexOf(Number(target)) >= 0) break;
      omission++;
    }
    var hitWindows = stats.first + stats.second + stats.third;
    var firstShare = hitWindows ? stats.first / hitWindows : 0;
    var thirdShare = hitWindows ? stats.third / hitWindows : 0;
    var stage = result.active ? result.active.attempts.length + 1 : 1;
    var score = 50;
    score += (stats.hitRate - 0.90) * 120;
    score += (firstShare - 0.55) * 70;
    score -= thirdShare * 20;
    score += (count5 / 5 - 0.55) * 30;
    score += (count10 / 10 - 0.55) * 15;
    score += Math.max(-6, Math.min(8, (6 - omission) * 1.2));
    if (stage === 2) score += stats.second > stats.third ? 4 : -4;
    if (stage === 3) score -= 6;
    score = Math.max(0, Math.min(100, score));
    var reason = "规律分" + score.toFixed(0) + " · 1期中率" + (firstShare * 100).toFixed(1) + "% · 3期中率" + (stats.hitRate * 100).toFixed(1) + "% · 第3期占比" + (thirdShare * 100).toFixed(1) + "% · 近5期" + count5 + "次 · 遗漏" + omission;
    if (score >= 78) return { label: "加仓 1.5倍", weight: 1.5, color: "#dc2626", score: score, reason: reason + " · 窗口规律强" };
    if (score >= 65) return { label: "重 1.0倍", weight: 1, color: "#16a34a", score: score, reason: reason + " · 窗口规律较好" };
    if (score >= 52) return { label: "标准 0.75倍", weight: 0.75, color: "#2563eb", score: score, reason: reason + " · 窗口规律一般" };
    return { label: "轻 0.5倍", weight: 0.5, color: "#d97706", score: score, reason: reason + " · 窗口规律偏弱，仍轻仓" };
  }

  function scaleFundPlan(plan, weight) {
    return plan.map(function (amount) {
      if (!amount || weight <= 0) return 0;
      return Math.max(100, Math.round(amount * weight / 100) * 100);
    });
  }

  function planRisk(plan) {
    return plan.reduce(function (sum, amount) { return sum + Number(amount || 0); }, 0);
  }

  var FUND_CAPITAL = 10000;

  function renderFundsLegacy() {
    var nextPeriod = latest + 1;
    var lockedRisk = 0;
    var drafts = EXEC_LINES.map(function (line) {
      var result = buildExecWindows(line);
      var stats = execLineStats(line, result.windows);
      var quality = fundsWindowPattern(line, result, stats, nextPeriod);
      var row = {
        line: line,
        result: result,
        stats: stats,
        quality: quality,
        mode: "new",
        weight: quality.weight,
        plan: line.plan.slice(),
        remainingRisk: 0,
        reason: quality.reason
      };
      if (planRisk(line.plan) <= 0) {
        row.mode = "blocked";
        row.weight = 0;
        row.plan = [0, 0, 0];
        row.reason = "历史阶段系数未通过，公式为0:0:0";
      } else if (result.waiting) {
        row.mode = "waiting";
        row.weight = 0;
        row.plan = [0, 0, 0];
        row.reason = "错窗等待中：等尾" + result.waiting.tail + "开出";
      } else if (result.active) {
        row.mode = "active";
        row.weight = quality.weight > 1 ? quality.weight : 1;
        row.finalPlan = scaleFundPlan(line.plan, row.weight);
        row.remainingRisk = planRisk(row.finalPlan.slice(result.active.attempts.length));
        lockedRisk += row.remainingRisk;
        row.reason = "窗口进行中，原公式锁仓" + (row.weight > 1 ? " · 当前机会高，建议加仓" : "");
      } else if (quality.weight <= 0) {
        row.mode = "blocked";
        row.plan = [0, 0, 0];
      }
      return row;
    });

    drafts
      .filter(function (row) { return row.mode === "new" && row.quality.weight > 0; })
      .forEach(function (row) {
        var candidatePlan = scaleFundPlan(row.line.plan, row.quality.weight);
        var candidateRisk = planRisk(candidatePlan);
        row.finalPlan = candidatePlan;
        row.maxLoss = candidateRisk;
      });
    var newRisk = 0;
    var activeCount = 0;
    var waitingCount = 0;
    var newCount = 0;
    var blockedCount = 0;

    var rows = drafts.map(function (row) {
      var action = "";
      var amount = 0;
      var maxLoss = 0;
      var color = row.quality.color;
      var displayQuality = row.quality;
      var finalPlan = row.plan.slice();
      if (row.mode === "waiting") {
        action = "等待";
        waitingCount++;
        color = "#d97706";
      } else if (row.mode === "active") {
        action = "续追";
        activeCount++;
        finalPlan = row.finalPlan || row.line.plan.slice();
        amount = Number(finalPlan[row.result.active.attempts.length] || 0);
        maxLoss = row.remainingRisk;
        color = "#2563eb";
        if (row.weight === 1 && row.quality.weight < 1) {
          displayQuality = {
            label: "锁仓 1.0倍",
            weight: 1,
            color: "#2563eb",
            score: row.quality.score,
            reason: row.reason
          };
          color = "#2563eb";
        }
      } else if (row.mode === "blocked") {
        action = "无号";
        blockedCount++;
        color = "#dc2626";
      } else {
        finalPlan = row.finalPlan || scaleFundPlan(row.line.plan, row.quality.weight);
        maxLoss = row.maxLoss || planRisk(finalPlan);
        action = row.line.plan[0] > 0 ? "下注" : "开窗";
        amount = Number(finalPlan[0] || 0);
        newCount++;
        newRisk += maxLoss;
        if (finalPlan.join(":") !== row.line.plan.join(":")) row.reason += "；按100元起注取整";
      }
      return {
        line: row.line,
        stats: row.stats,
        quality: displayQuality,
        action: action,
        amount: amount,
        maxLoss: maxLoss,
        plan: finalPlan,
        color: color,
        reason: row.reason,
        waiting: row.result.waiting
      };
    });

    var totalRisk = lockedRisk + newRisk;
    var capitalUse = FUND_CAPITAL ? totalRisk / FUND_CAPITAL : 0;
    var html = '<div class="section"><div class="section__head"><h2 class="section__title">资金调度 · 14条线统一定档</h2><span class="section__hint">按每个号码自己的三期窗口规律定轻/重；本金锚定1万元，下注100元起</span></div></div>';
    html += '<div class="section"><div class="panel fund-controls"><div class="ord-grid">';
    html += '<div class="ord-item"><label>定档规则</label><input type="text" value="按窗口规律分：加仓1.5倍 / 重1.0倍 / 标准0.75倍 / 轻0.5倍 / 等待0倍" disabled></div>';
    html += '<div class="ord-item"><label>本金锚定</label><input type="text" value="10,000元 · 最低下注100元" disabled></div>';
    html += '</div></div></div>';
    html += '<div class="section"><div class="panel" style="padding:12px"><div style="font-size:14px;font-weight:900;color:#334155;margin-bottom:7px">仓位倍数标准</div>';
    html += '<div style="font-size:13px;line-height:1.8;color:#475569">';
    html += '<div><b style="color:#dc2626">加仓：1.5倍</b> · 该号码窗口规律分不低于78。</div>';
    html += '<div><b style="color:#16a34a">重：1.0倍</b> · 窗口规律分65–77。</div>';
    html += '<div><b style="color:#2563eb">标准：0.75倍</b> · 窗口规律分52–64。</div>';
    html += '<div><b style="color:#d97706">轻：0.5倍</b> · 窗口规律分低于52，仍按轻仓下注。</div>';
    html += '<div><b style="color:#d97706">等待/无号：0倍</b> · 错窗等待确认或当前没有推荐号时才为0。</div>';
    html += '<div>最终金额 = 原公式金额 × 对应倍数，单笔最低100元，并按100元递增。</div>';
    html += '</div></div></div>';

    html += '<div class="section"><div class="grid-3">';
    html += '<div class="stat"><div class="stat__value">' + FUND_CAPITAL + '</div><div class="stat__label">本金锚定（元）</div></div>';
    html += '<div class="stat"><div class="stat__value" style="color:#2563eb">' + lockedRisk + '</div><div class="stat__label">窗口已锁定风险（元）</div></div>';
    html += '<div class="stat"><div class="stat__value" style="color:#d97706">' + newRisk + '</div><div class="stat__label">本轮新开风险（元）</div></div>';
    html += '<div class="stat"><div class="stat__value" style="color:#16a34a">' + totalRisk + '</div><div class="stat__label">本窗合计风险（元）</div></div>';
    html += '<div class="stat"><div class="stat__value" style="color:' + (capitalUse > 1 ? "#dc2626" : "#16a34a") + '">' + (capitalUse * 100).toFixed(1) + '%</div><div class="stat__label">本金占用率（参考）</div></div>';
    html += '<div class="stat"><div class="stat__value">' + activeCount + '/' + newCount + '/' + waitingCount + '</div><div class="stat__label">续追 / 新开 / 等待</div></div>';
    html += '<div class="stat"><div class="stat__value" style="color:#dc2626">' + blockedCount + '</div><div class="stat__label">无号不下</div></div>';
    html += '<div class="stat"><div class="stat__value" style="font-size:18px">1.5 / 1.0 / 0.75 / 0.5 / 0</div><div class="stat__label">加仓 / 重 / 标准 / 轻 / 等待倍数</div></div>';
    html += '</div></div>';

    rows.forEach(function (row) {
      html += '<div class="section"><div class="panel fund-line" style="border-left-color:' + row.color + '">';
      html += '<div class="exec-line__head">';
      html += '<b class="exec-line__label' + (row.line.kind === "tail" ? " exec-line__label--tail" : "") + '">' + row.line.label + '</b>';
      html += '<span class="chip" style="color:' + row.color + ';font-weight:900">' + row.quality.label + '</span>';
      html += '<span class="chip">窗口命中率 ' + (row.stats.hitRate * 100).toFixed(1) + '%</span>';
      html += '<span class="chip">ROI ' + (row.stats.roi * 100).toFixed(1) + '%</span>';
      html += '<span class="chip">规律分 ' + row.quality.score.toFixed(0) + '</span>';
      if (row.waiting) html += '<span class="chip" style="background:#fffbeb;border-color:#fcd34d;color:#92400e">等待尾' + row.waiting.tail + ' · 已等' + row.waiting.waited + '期</span>';
      html += '</div>';
      html += '<div class="exec-line__metrics">';
      html += '<div class="stat"><div class="stat__value" style="color:' + row.color + '">' + row.action + '</div><div class="stat__label">建议动作</div></div>';
      html += '<div class="stat"><div class="stat__value">' + (row.amount > 0 ? row.amount + "元" : "-") + '</div><div class="stat__label">本期金额</div></div>';
      html += '<div class="stat"><div class="stat__value">' + (row.maxLoss > 0 ? row.maxLoss + "元" : "-") + '</div><div class="stat__label">本窗最大亏损</div></div>';
      html += '<div class="stat"><div class="stat__value" style="font-size:18px">' + row.plan.join(" / ") + '</div><div class="stat__label">建议计划</div></div>';
      html += '</div>';
      html += '<div class="fund-reason">' + row.reason + ' · 下一检查期 第' + nextPeriod + '期</div>';
      html += '</div></div>';
    });

    html += '<p class="disclaimer">资金调度只做倍率建议，不自动下单。本金1万元只用于计算占用率参考，不自动砍线；等待线金额强制为0；窗口进行中机会低时锁仓1.0倍、机会高时可加仓；任何下注最低100元。</p>';
    view.innerHTML = html;
  }

  function renderFunds() {
    var nextPeriod = latest + 1;
    var totalCurrent = 0;
    var totalRisk = 0;
    var rows = EXEC_LINES.map(function (line) {
      var result = buildExecWindows(line);
      var enabled = planRisk(line.plan) > 0;
      var formulaName = (EXEC_FORMULA_AUDIT[line.id] || {}).formula || "阶段公式";
      var nextTail = line.kind === "tail" ? line.tail : (result.active && result.active.lockedTail != null ? result.active.lockedTail : (execPick(nextPeriod, line.stream) ? execPick(nextPeriod, line.stream).tail : null));
      var stage = 1;
      var action = "下注";
      var amount = Number(line.plan[0] || 0);
      var maxLoss = planRisk(line.plan);
      var status = "新窗口";
      var color = "#16a34a";
      if (!enabled) {
        action = "无有效公式";
        amount = 0;
        maxLoss = 0;
        status = "历史阶段系数未通过";
        color = "#dc2626";
      } else if (result.waiting) {
        action = "等待";
        amount = 0;
        maxLoss = 0;
        status = "等尾" + result.waiting.tail + "开出 · 已等" + result.waiting.waited + "期";
        color = "#d97706";
      } else if (result.active) {
        stage = result.active.attempts.length + 1;
        amount = Number(line.plan[stage - 1] || 0);
        action = amount > 0 ? "续追" : "本期等待";
        maxLoss = planRisk(line.plan.slice(stage - 1));
        status = "窗口第" + stage + "期";
        color = amount > 0 ? "#2563eb" : "#6b7280";
      } else {
        action = amount > 0 ? "新窗口下注" : "开窗等待";
        status = "窗口第1期";
        color = amount > 0 ? "#16a34a" : "#6b7280";
      }
      totalCurrent += amount;
      totalRisk += maxLoss;
      return { line, formulaName, nextTail, action, amount, maxLoss, stage, status, color, enabled };
    });
    var betRows = rows.filter(function (row) {
      return row.amount > 0 && row.nextTail != null;
    }).sort(function (a, b) {
      return Number(a.nextTail) - Number(b.nextTail) || a.line.label.localeCompare(b.line.label);
    });
    var use = FUND_CAPITAL ? totalCurrent / FUND_CAPITAL : 0;
    var html = '<div class="section"><div class="section__head"><h2 class="section__title">资金调度 · 直接按公式安排</h2><span class="section__hint">公式表负责定金额，资金调度只按当前窗口取第几期金额；不再另算轻重模型</span></div></div>';
    html += '<div class="section"><div class="panel" style="background:#111827;color:#fff;border:2px solid #111827"><div style="font-size:13px;font-weight:800;color:#cbd5e1;margin-bottom:8px">当期下注号码与金额 · 按线路单独列</div><div style="display:flex;flex-wrap:wrap;gap:8px">';
    if (!betRows.length) {
      html += '<div style="font-size:22px;font-weight:900">本期不下注</div>';
    } else {
      betRows.forEach(function (row) {
        html += '<div style="display:flex;align-items:center;gap:8px;background:#fff;color:#111827;border-radius:8px;padding:8px 12px"><span style="font-size:30px;font-weight:900">' + row.nextTail + '</span><span style="font-size:12px;font-weight:800;color:#475569">' + row.line.label + '</span><span style="font-size:18px;font-weight:900;color:#2563eb">' + row.amount + '元</span></div>';
      });
    }
    html += '</div></div></div>';
    html += '<div class="section"><div class="grid-3">';
    html += '<div class="stat"><div class="stat__value">' + FUND_CAPITAL + '</div><div class="stat__label">本金锚定（元）</div></div>';
    html += '<div class="stat"><div class="stat__value">' + totalCurrent + '</div><div class="stat__label">本期公式金额（元）</div></div>';
    html += '<div class="stat"><div class="stat__value">' + totalRisk + '</div><div class="stat__label">本窗最大风险（元）</div></div>';
    html += '<div class="stat"><div class="stat__value" style="color:' + (use > 1 ? "#dc2626" : "#16a34a") + '">' + (use * 100).toFixed(1) + '%</div><div class="stat__label">本金占用率（参考）</div></div>';
    html += '<div class="stat"><div class="stat__value">' + rows.filter(function (r) { return r.action !== "无有效公式" && r.action !== "等待"; }).length + '</div><div class="stat__label">当前有公式线路</div></div>';
    html += '</div></div>';
    rows.forEach(function (row) {
      html += '<div class="section"><div class="panel fund-line" style="border-left-color:' + row.color + '">';
      html += '<div class="exec-line__head"><b class="exec-line__label' + (row.line.kind === "tail" ? " exec-line__label--tail" : "") + '">' + row.line.label + '</b>';
      html += '<span class="chip">公式（元） ' + row.formulaName + ' · ' + row.line.plan.join(":") + '</span>';
      html += '<span class="chip" style="color:' + row.color + ';font-weight:900">' + row.action + '</span></div>';
      html += '<div class="exec-line__metrics">';
      html += '<div class="stat" style="background:#eff6ff;border:2px solid #2563eb;border-radius:8px;padding:8px"><div class="stat__value" style="font-size:26px;color:#1d4ed8">' + (row.amount > 0 ? row.amount + "元" : "-") + '</div><div class="stat__label">当期资金 · 本期按公式金额</div></div>';
      html += '<div class="stat"><div class="stat__value">' + (row.maxLoss > 0 ? row.maxLoss + "元" : "-") + '</div><div class="stat__label">本窗剩余风险</div></div>';
      html += '<div class="stat"><div class="stat__value" style="font-size:18px">第' + row.stage + '期</div><div class="stat__label">当前窗口期序</div></div>';
      html += '<div class="stat" style="background:' + (row.amount > 0 ? "#f0fdf4" : "#fffbeb") + ';border:2px solid ' + row.color + ';border-radius:8px;padding:8px"><div class="stat__value" style="font-size:20px;color:' + row.color + '">' + row.status + '</div><div class="stat__label">当前状态</div></div>';
      html += '</div></div></div>';
    });
    html += '<p class="disclaimer">资金调度只按公式表执行，不再自行计算轻重倍率。公式为0表示历史训练和验证均未通过，不配仓；等待窗口金额为0；本金1万元只作占用率参考。</p>';
    view.innerHTML = html;
  }

  function renderFormulaTable() {
    var enabled = EXEC_LINES.filter(function (line) { return planRisk(line.plan) > 0; }).length;
    var disabled = EXEC_LINES.length - enabled;
    var html = '<div class="section"><div class="section__head"><h2 class="section__title">公式表 · 14条线路</h2><span class="section__hint">2021-2023训练 / 2024-2026验证 · 两段同为正才配仓 · 100元步进</span></div></div>';
    html += '<div class="section"><div class="grid-3">';
    html += '<div class="stat"><div class="stat__value">' + EXEC_LINES.length + '</div><div class="stat__label">独立线路</div></div>';
    html += '<div class="stat"><div class="stat__value" style="color:#16a34a">' + enabled + '</div><div class="stat__label">通过验证并配仓</div></div>';
    html += '<div class="stat"><div class="stat__value" style="color:#dc2626">' + disabled + '</div><div class="stat__label">未通过验证，不配仓</div></div>';
    html += '</div></div>';
    html += '<div class="section"><div class="panel" style="padding:12px"><div style="font-size:13px;color:#475569;line-height:1.7">公式按真实三期窗口逐期测试，选择训练段和验证段都盈利的方案。命中只按实际开奖记录结算；全错窗口会结束当前窗口，等锁定号重新开出后再开新窗。</div></div></div>';
    html += '<div class="section"><div class="panel" style="padding:10px;overflow-x:auto;-webkit-overflow-scrolling:touch"><table class="table" style="min-width:1180px"><thead><tr><th>线路</th><th>最终公式</th><th>第1/2/3期金额（元）</th><th>全周期净收益 / ROI</th><th>训练 / 验证净收益</th><th>最大回撤</th><th>全错窗口</th><th>状态</th></tr></thead><tbody>';
    EXEC_LINES.forEach(function (line) {
      var audit = EXEC_FORMULA_AUDIT[line.id] || { formula: "阶段公式", train: [0, 0, 0], valid: [0, 0, 0], fullNet: 0, fullRoi: 0, trainNet: 0, validNet: 0, maxDrawdown: 0, miss: 0 };
      var enabledLine = planRisk(line.plan) > 0;
      var fullColor = audit.fullNet > 0 ? "#16a34a" : audit.fullNet < 0 ? "#dc2626" : "#475569";
      html += '<tr>';
      html += '<td><b>' + line.label + '</b></td>';
      html += '<td><b>' + audit.formula + '</b></td>';
      html += '<td><b>' + line.plan.join(" / ") + '</b></td>';
      html += '<td style="color:' + fullColor + ';font-weight:900">' + (audit.fullNet >= 0 ? "+" : "") + audit.fullNet + ' / ' + (audit.fullRoi * 100).toFixed(2) + '%</td>';
      html += '<td>' + (audit.trainNet >= 0 ? "+" : "") + audit.trainNet + ' / ' + (audit.validNet >= 0 ? "+" : "") + audit.validNet + '</td>';
      html += '<td>' + audit.maxDrawdown + '</td>';
      html += '<td>' + audit.miss + '</td>';
      html += '<td><b style="color:' + (enabledLine ? "#16a34a" : "#dc2626") + '">' + (enabledLine ? "配仓" : "不配仓") + '</b></td>';
      html += '</tr>';
    });
    html += '</tbody></table></div></div>';
    html += '<p class="disclaimer">公式表只展示历史验证结果，不预测下一期，不自动下单。训练或验证任一段不能稳定盈利时整条线不配仓；金额只表示历史测试中该线路在第1、2、3期应重或应轻。</p>';
    view.innerHTML = html;
  }

  var wmFullModelCache = null;
  var wmFullPickCache = {};
  var wmWindowCache = {};
  var wmWindowState = {};
  var WM_BASE = 100;

  function wmPlanFor(n) {
    return [WM_BASE, WM_BASE * n, WM_BASE * n * n].map(function (v) {
      return Math.round(v);
    });
  }

  function wmPlanText(n) {
    return wmPlanFor(n).join(" / ");
  }

  function wmFullModel() {
    if (wmFullModelCache) return wmFullModelCache;
    var fullRaw = {};
    D.forEach(function (row, index) {
      var bits = Array(10).fill("0");
      (row.nums || []).forEach(function (num) { bits[Number(num) % 10] = "1"; });
      fullRaw[String(index + 1)] = bits.join("");
    });
    wmFullModelCache = window.CAISHEN_MODEL.createModel(fullRaw);
    return wmFullModelCache;
  }

  function wmFullPick(period, stream) {
    if (period <= 1) return null;
    if (!wmFullPickCache[period]) wmFullPickCache[period] = wmFullModel().buildPrediction(period - 1);
    return (wmFullPickCache[period].doubleRecommendation || [])[stream === "D1" ? 0 : 1] || null;
  }

  function wmWindowsFor(line) {
    if (wmWindowCache[line.id]) return wmWindowCache[line.id];
    var rows = [];
    var active = null;
    var waiting = null;
    var p = line.kind === "tail" ? 1 : 31;
    while (p <= D.length) {
      if (waiting) {
        var waitingRow = D[p - 1];
        var waitingTails = waitingRow ? (waitingRow.nums || []).map(function (num) { return Number(num) % 10; }) : [];
        if (waitingTails.indexOf(Number(waiting.tail)) >= 0) waiting = null;
        p++;
        continue;
      }
      var trigger = null;
      if (!active) {
        if (line.kind === "tail") trigger = { tail: line.tail };
        else trigger = wmFullPick(p, line.stream);
        if (!trigger) { p++; continue; }
        active = { start: p, lockedTail: line.kind === "recommend" ? null : trigger.tail, attempts: [] };
      }
      var row = D[p - 1] || {};
      var actual = (row.nums || []).map(function (num) { return Number(num) % 10; });
      var pick = line.kind === "recommend" ? wmFullPick(p, line.stream) : { tail: active.lockedTail };
      var tail = pick ? pick.tail : null;
      var isHit = tail != null && actual.indexOf(Number(tail)) >= 0;
      active.attempts.push({ period: p, tail: tail, hit: isHit });
      if (isHit) {
        active.hitIndex = active.attempts.length;
        rows.push(active);
        active = null;
        p++;
      } else if (active.attempts.length >= 3) {
        active.hitIndex = 0;
        rows.push(active);
        var waitTail = null;
        for (var i = active.attempts.length - 1; i >= 0; i--) {
          if (active.attempts[i].tail != null) { waitTail = active.attempts[i].tail; break; }
        }
        active = null;
        p++;
        if (waitTail != null) waiting = { tail: waitTail };
      } else {
        p++;
      }
    }
    wmWindowCache[line.id] = rows;
    wmWindowState[line.id] = { active: active, waiting: waiting };
    return rows;
  }

  function wmCurrentState(line) {
    wmWindowsFor(line);
    return wmWindowState[line.id] || { active: null, waiting: null };
  }

  function wmCurrentPosition(line, n) {
    var live = wmCurrentState(line);
    var plan = wmPlanFor(n);
    if (live.waiting) {
      return { label: "等待重开", amount: 0, stage: 0, period: null, status: "等待尾" + live.waiting.tail, color: "#d97706" };
    }
    if (live.active) {
      var stage = Math.min(live.active.attempts.length + 1, 3);
      var period = live.active.start + live.active.attempts.length;
      return { label: "第" + stage + "期仓位", amount: Number(plan[stage - 1] || 0), stage: stage, period: period, status: "窗口进行中", color: "#2563eb" };
    }
    return { label: "空仓等待", amount: 0, stage: 0, period: null, status: "无进行中窗口", color: "#16a34a" };
  }

  function wmYearOf(start) {
    var row = D[start - 1];
    return row ? Number(row.y) : 0;
  }

  function wmPeriodLabel(start) {
    var row = D[start - 1];
    if (row) return row.y + "年第" + row.p + "期";
    var last = D[D.length - 1];
    if (last && start > D.length) return last.y + "年第" + (Number(last.p) + start - D.length) + "期";
    return "第" + start + "期";
  }

  function wmSimulate(line, n) {
    var result = { windows: wmWindowsFor(line) };
    var plan = wmPlanFor(n);
    var net = 0;
    var turnover = 0;
    var bets = 0;
    var hits = 0;
    var trainNet = 0;
    var validNet = 0;
    var hits1 = 0;
    var hits2 = 0;
    var hits3 = 0;
    var missWindows = 0;
    var maxDD = 0;
    var equity = 0;
    var peak = 0;
    var maxMult = n * n;
    var maxLossStreak = 0;
    var lossStreak = 0;
    var maxWindowRisk = 0;
    var records = [];
    result.windows.forEach(function (w) {
      var tries = w.hitIndex === 0 ? 3 : w.hitIndex;
      var staked = 0;
      for (var j = 0; j < tries; j++) {
        var amount = plan[j] || 0;
        if (amount > 0) {
          staked += amount;
          turnover += amount;
          bets++;
          if (w.hitIndex === j + 1) hits++;
        }
      }
      var payout = w.hitIndex > 0 ? (plan[w.hitIndex - 1] || 0) * 1.8 : 0;
      var profit = payout - staked;
      maxWindowRisk = Math.max(maxWindowRisk, plan.reduce(function (a, b) { return a + b; }, 0));
      net += profit;
      equity += profit;
      peak = Math.max(peak, equity);
      maxDD = Math.max(maxDD, peak - equity);
      if (wmYearOf(w.start) <= 2023) trainNet += profit;
      else validNet += profit;
      if (w.hitIndex === 1) hits1++;
      else if (w.hitIndex === 2) hits2++;
      else if (w.hitIndex === 3) hits3++;
      else missWindows++;
      var missStreak = 0;
      if (w.hitIndex > 0) {
        lossStreak = 0;
      } else {
        lossStreak++;
        missStreak = lossStreak;
        maxLossStreak = Math.max(maxLossStreak, lossStreak);
      }
      records.push({ window: w, profit: profit, staked: staked, missStreak: missStreak });
    });
    return {
      n: n,
      records: records,
      net: Math.round(net),
      turnover: turnover,
      roi: turnover ? (net / turnover) * 100 : 0,
      trainNet: Math.round(trainNet),
      validNet: Math.round(validNet),
      bets: bets,
      hits: hits,
      orderHit: bets ? (hits / bets) * 100 : 0,
      hits1: hits1,
      hits2: hits2,
      hits3: hits3,
      missWindows: missWindows,
      maxDD: Math.round(maxDD),
      maxMult: maxMult,
      maxLossStreak: maxLossStreak,
      maxWindowRisk: maxWindowRisk
    };
  }

  function wmYearStats(line, n) {
    var sim = wmSimulate(line, n);
    var byYear = {};
    sim.records.forEach(function (item) {
      var year = wmYearOf(item.window.start);
      if (!year) return;
      if (!byYear[year]) {
        byYear[year] = { year: year, windows: 0, hitWindows: 0, missWindows: 0, net: 0, turnover: 0, maxDD: 0, peak: 0, equity: 0, lossStreak: 0, maxLossStreak: 0 };
      }
      var row = byYear[year];
      row.windows++;
      row.net += item.profit;
      row.turnover += item.staked;
      row.equity += item.profit;
      row.peak = Math.max(row.peak, row.equity);
      row.maxDD = Math.max(row.maxDD, row.peak - row.equity);
      if (item.window.hitIndex > 0) {
        row.hitWindows++;
        row.lossStreak = 0;
      } else {
        row.missWindows++;
        row.lossStreak++;
        row.maxLossStreak = Math.max(row.maxLossStreak, row.lossStreak);
      }
    });
    var years = Object.keys(byYear).map(function (key) { return byYear[key]; }).sort(function (a, b) { return a.year - b.year; });
    years.forEach(function (row) {
      row.hitRate = row.windows ? (row.hitWindows / row.windows) * 100 : 0;
      row.roi = row.turnover ? (row.net / row.turnover) * 100 : 0;
    });
    var positiveYears = years.filter(function (row) { return row.net > 0; }).length;
    var negativeYears = years.filter(function (row) { return row.net < 0; }).length;
    var recent = years.slice(-3);
    var recent3Positive = recent.filter(function (row) { return row.net > 0; }).length;
    var stableScore = positiveYears * 100000 + recent3Positive * 10000 + sim.net - negativeYears * 50000;
    return { years: years, positiveYears: positiveYears, negativeYears: negativeYears, recent3Positive: recent3Positive, stableScore: stableScore, net: sim.net, maxDD: sim.maxDD };
  }

  function wmYearBest(lineData, year) {
    var rows = [];
    lineData.simulations.forEach(function (sim) {
      var annual = lineData.annual && lineData.annual[sim.n];
      var row = annual && annual.years.filter(function (item) { return item.year === year; })[0];
      if (!row) return;
      rows.push({ n: sim.n, year: row, sim: sim, robust: sim.trainNet > 0 && sim.validNet > 0 });
    });
    rows.sort(function (a, b) {
      return b.year.net - a.year.net || b.year.roi - a.year.roi || a.year.maxDD - b.year.maxDD;
    });
    return rows[0] || null;
  }

  function wmAttemptCell(w, index) {
    if (index >= w.attempts.length) {
      return '<span style="color:#94a3b8">命中后停止</span>';
    }
    var item = w.attempts[index];
    var color = item.hit ? "#16a34a" : "#dc2626";
    return '<div style="font-size:10px;color:#64748b">' + wmPeriodLabel(item.period) + '</div>尾<b style="font-size:16px">' + item.tail + '</b><b style="color:' + color + ';margin-left:4px">' + (item.hit ? "中" : "错") + '</b>';
  }

  function renderWindowMultiplierTest() {
    var line = null;
    EXEC_LINES.forEach(function (item) {
      if (item.id === state.windowMultLine) line = item;
    });
    if (!line) line = EXEC_LINES[0];
    state.windowMultLine = line.id;
    var ns = [1, 1.5, 2, 2.5, 3];
    var lineBest = {};
    EXEC_LINES.forEach(function (item) {
      var itemSimulations = ns.map(function (n) { return wmSimulate(item, n); });
      var itemRobust = itemSimulations.filter(function (s) { return s.trainNet > 0 && s.validNet > 0; });
      var itemAnnual = {};
      itemSimulations.forEach(function (s) { itemAnnual[s.n] = wmYearStats(item, s.n); });
      var itemStable = itemRobust.slice().sort(function (a, b) {
        return itemAnnual[b.n].stableScore - itemAnnual[a.n].stableScore || b.net - a.net || a.maxDD - b.maxDD;
      });
      var itemNetBest = itemRobust.slice().sort(function (a, b) { return b.net - a.net || a.maxDD - b.maxDD; })[0] || null;
      lineBest[item.id] = { best: itemStable[0] || null, netBest: itemNetBest, simulations: itemSimulations, annual: itemAnnual };
    });
    var currentYear = Number((D[D.length - 1] || {}).y) || new Date().getFullYear();
    var ytdBestByLine = {};
    EXEC_LINES.forEach(function (item) { ytdBestByLine[item.id] = wmYearBest(lineBest[item.id], currentYear); });
    var orderedLines = EXEC_LINES.slice().sort(function (a, b) {
      var aBest = ytdBestByLine[a.id];
      var bBest = ytdBestByLine[b.id];
      var aPos = wmCurrentPosition(a, aBest ? aBest.n : activeN);
      var bPos = wmCurrentPosition(b, bBest ? bBest.n : activeN);
      var aBucket = aPos.amount > 0 ? 3 : aPos.label === "等待重开" ? 2 : 1;
      var bBucket = bPos.amount > 0 ? 3 : bPos.label === "等待重开" ? 2 : 1;
      return bBucket - aBucket || bPos.amount - aPos.amount || bPos.stage - aPos.stage || a.label.localeCompare(b.label);
    });
    var simulations = lineBest[line.id].simulations;
    var annualByN = lineBest[line.id].annual;
    var robust = simulations.filter(function (s) { return s.trainNet > 0 && s.validNet > 0; });
    robust.sort(function (a, b) { return annualByN[b.n].stableScore - annualByN[a.n].stableScore || b.net - a.net; });
    var best = robust[0] || null;
    var netBest = lineBest[line.id].netBest;
    var netBestText = netBest ? (netBest.n === 1 ? "不倍投" : netBest.n + "倍") : "未通过";
    var selectedYtdBest = ytdBestByLine[line.id] || null;
    var selectedYtdPosition = wmCurrentPosition(line, selectedYtdBest ? selectedYtdBest.n : activeN);
    var selectedYtdPeriod = selectedYtdPosition.period ? wmPeriodLabel(selectedYtdPosition.period) : "-";
    var activeN = Number(state.windowMultN);
    var selected = simulations.filter(function (s) { return s.n === activeN; })[0] || simulations[2];
    var liveState = wmCurrentState(line);
    var windowHitRate = selected.records.length ? ((selected.records.length - selected.missWindows) / selected.records.length) * 100 : 0;
    var missRate = selected.records.length ? (selected.missWindows / selected.records.length) * 100 : 0;
    var selectedPlanText = wmPlanText(selected.n);
    var selectedPosition = wmCurrentPosition(line, selected.n);
    var selectedPositionPeriod = selectedPosition.period ? wmPeriodLabel(selectedPosition.period) : "-";
    var html = '<div class="section"><div class="section__head"><h2 class="section__title">窗口倍投测试 · 正式版候选</h2><span class="section__hint">真实窗口规律账本 · 100元起 · 年度稳健最优/全周期收益最高/今年最优分开标注</span></div></div>';
    html += '<div class="section"><div class="panel" style="padding:12px;background:#f8fafc;border:1px solid #e2e8f0"><div style="font-size:13px;font-weight:900;color:#0f172a;margin-bottom:6px">本页作用</div><div style="font-size:12px;color:#475569;line-height:1.8">把每条线的每一个窗口拆开，逐期记录第1/2/3期尾号、命中、错误、第几期中、三期全错、等待重开和下一窗口。数据只按真实开奖结果结算，不预测、不补造、不改历史。</div></div></div>';
    html += '<div class="section"><div class="panel" style="padding:10px"><div style="display:flex;flex-wrap:wrap;gap:6px">';
    orderedLines.forEach(function (item) {
      var itemBest = (lineBest[item.id] || {}).best;
      var itemBestText = itemBest ? (itemBest.n === 1 ? "不倍投" : itemBest.n + "倍") : "未通过";
      var itemPosition = wmCurrentPosition(item, itemBest ? itemBest.n : activeN);
      html += '<button class="chip" data-wm-line="' + item.id + '" style="min-width:132px;min-height:68px;padding:9px 12px;font-size:14px;font-weight:900;text-align:left;' + (item.id === line.id ? "background:#111827;color:#fff" : "") + '"><span style="display:block;font-size:15px">' + item.label + '</span><span style="display:block;font-size:11px;font-weight:800;color:' + (item.id === line.id ? "#bfdbfe" : itemBest ? "#16a34a" : "#dc2626") + '">最优 ' + itemBestText + '</span><span style="display:block;font-size:11px;font-weight:900;color:' + (item.id === line.id ? "#fde68a" : itemPosition.color) + '">当前 ' + itemPosition.label + '</span></button>';
    });
    html += '</div></div></div>';
    var activePositionRows = orderedLines.map(function (item) {
      var itemBest = ytdBestByLine[item.id];
      var position = wmCurrentPosition(item, itemBest ? itemBest.n : activeN);
      return { item: item, best: itemBest, position: position, period: position.period ? wmPeriodLabel(position.period) : "-" };
    }).filter(function (row) { return row.position.amount > 0; });
    html += '<div class="section"><div class="section__head"><h2 class="section__title">当前有仓位 · 优先显示</h2><span class="section__hint">按今年最优公式计算，金额大于0的线路排在最上面</span></div></div>';
    html += '<div class="section"><div class="panel" style="padding:10px">';
    if (!activePositionRows.length) {
      html += '<div style="font-size:14px;font-weight:900;color:#64748b">当前没有金额大于0的仓位</div>';
    } else {
      html += '<div style="display:flex;flex-wrap:wrap;gap:8px">';
      activePositionRows.forEach(function (row) {
        html += '<div style="background:#eff6ff;border:2px solid #2563eb;border-radius:8px;padding:9px 12px;min-width:170px">';
        html += '<div style="font-size:15px;font-weight:900;color:#1e3a8a">' + row.item.label + ' · ' + row.position.label + '</div>';
        html += '<div style="font-size:18px;font-weight:900;color:#2563eb;margin-top:3px">' + row.position.amount + '元</div>';
        html += '<div style="font-size:11px;color:#475569;margin-top:3px">检查 ' + row.period + (row.best ? ' · ' + (row.best.n === 1 ? "不倍投" : row.best.n + "倍") : '') + '</div>';
        html += '</div>';
      });
      html += '</div>';
    }
    html += '</div></div>';
    html += '<div class="section"><div class="section__head"><h2 class="section__title">每个号码的最优下注公式</h2><span class="section__hint">100元起 · 只用训练段和验证段同时为正的倍率 · 全周期净收益最高</span></div></div>';
    html += '<div class="section"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px">';
    orderedLines.forEach(function (item) {
      var itemData = lineBest[item.id] || { best: null };
      var itemBest = itemData.best;
      var planText = itemBest ? wmPlanText(itemBest.n) : "0 / 0 / 0";
      var bestText = itemBest ? (itemBest.n === 1 ? "不倍投" : itemBest.n + "倍") : "未通过";
      var itemAnnualStats = itemData.annual ? itemData.annual[itemBest ? itemBest.n : activeN] : null;
      var itemYtdBest = ytdBestByLine[item.id] || null;
      var itemYtdPosition = wmCurrentPosition(item, itemYtdBest ? itemYtdBest.n : activeN);
      var itemPosition = wmCurrentPosition(item, itemBest ? itemBest.n : activeN);
      var itemPositionPeriod = itemPosition.period ? wmPeriodLabel(itemPosition.period) : "-";
      html += '<div class="panel" style="padding:10px;border:2px solid ' + (itemBest ? "#bbf7d0" : "#fecaca") + ';background:' + (itemBest ? "#f0fdf4" : "#fef2f2") + '">';
      html += '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><b style="font-size:16px">' + item.label + '</b><span style="font-size:13px;font-weight:900;color:' + (itemBest ? "#16a34a" : "#dc2626") + '">' + bestText + '</span></div>';
      html += '<div style="font-size:15px;font-weight:900;color:#1d4ed8;margin-top:6px">' + planText + '</div>';
      html += '<div style="font-size:12px;font-weight:900;color:' + itemPosition.color + ';margin-top:5px">当前仓位 ' + itemPosition.label + ' · ' + (itemPosition.amount > 0 ? itemPosition.amount + "元" : itemPosition.status) + ' · 检查 ' + itemPositionPeriod + '</div>';
      if (itemYtdBest) {
        html += '<div style="font-size:11px;font-weight:900;color:#1d4ed8;margin-top:4px">今年最优 ' + (itemYtdBest.n === 1 ? "不倍投" : itemYtdBest.n + "倍") + ' · ' + wmPlanText(itemYtdBest.n) + '</div>';
        html += '<div style="font-size:11px;color:' + itemYtdPosition.color + ';margin-top:2px">今年仓位 ' + itemYtdPosition.label + ' · ' + (itemYtdPosition.amount > 0 ? itemYtdPosition.amount + "元" : itemYtdPosition.status) + '</div>';
      } else {
        html += '<div style="font-size:11px;color:#d97706;margin-top:4px">今年无可用数据</div>';
      }
      if (itemAnnualStats) {
        html += '<div style="font-size:11px;color:#475569;margin-top:4px">年度正收益 ' + itemAnnualStats.positiveYears + '/' + itemAnnualStats.years.length + ' 年 · 最近3年 ' + itemAnnualStats.recent3Positive + '/3</div>';
      }
      if (itemBest) {
        html += '<div style="font-size:11px;color:#475569;margin-top:5px">全周期 ' + (itemBest.net >= 0 ? "+" : "") + itemBest.net + ' · ROI ' + itemBest.roi.toFixed(2) + '%</div>';
        html += '<div style="font-size:11px;color:#475569">训练 ' + (itemBest.trainNet >= 0 ? "+" : "") + itemBest.trainNet + ' / 验证 ' + (itemBest.validNet >= 0 ? "+" : "") + itemBest.validNet + '</div>';
        html += '<div style="font-size:11px;color:#dc2626">最大回撤 ' + itemBest.maxDD + ' · 最大连错 ' + itemBest.maxLossStreak + '窗</div>';
      } else {
        html += '<div style="font-size:11px;color:#dc2626;margin-top:5px">训练段或验证段未同时通过，不配仓</div>';
      }
      html += '</div>';
    });
    html += '</div></div>';
    var ytdRows = EXEC_LINES.map(function (item) {
      return { item: item, best: ytdBestByLine[item.id] || null };
    }).sort(function (a, b) {
      return (b.best ? b.best.year.net : -Infinity) - (a.best ? a.best.year.net : -Infinity);
    });
    html += '<div class="section"><div class="section__head"><h2 class="section__title">' + currentYear + '年最优规律排名</h2><span class="section__hint">只按今年已开奖数据对比，公式固定为100元起；同时标注是否通过全周期验证</span></div></div>';
    html += '<div class="section"><div class="panel" style="padding:10px;overflow-x:auto;-webkit-overflow-scrolling:touch"><table class="table" style="min-width:1120px"><thead><tr><th>名次</th><th>线路</th><th>今年最优公式</th><th>第1/2/3期仓位</th><th>今年净收益</th><th>今年ROI</th><th>命中/全错</th><th>今年当前仓位</th><th>全周期验证</th></tr></thead><tbody>';
    ytdRows.forEach(function (row, index) {
      var best = row.best;
      var position = wmCurrentPosition(row.item, best ? best.n : activeN);
      var periodText = position.period ? wmPeriodLabel(position.period) : "-";
      html += '<tr>';
      html += '<td><b>#' + (index + 1) + '</b></td>';
      html += '<td><b>' + row.item.label + '</b></td>';
      html += '<td><b>' + (best ? (best.n === 1 ? "不倍投" : best.n + "倍") : "无数据") + '</b></td>';
      html += '<td><b style="color:#1d4ed8">' + (best ? wmPlanText(best.n) : "0 / 0 / 0") + '</b></td>';
      if (best) {
        html += '<td><b style="color:' + (best.year.net >= 0 ? "#16a34a" : "#dc2626") + '">' + (best.year.net >= 0 ? "+" : "") + Math.round(best.year.net) + '</b></td>';
        html += '<td>' + best.year.roi.toFixed(2) + '%</td>';
        html += '<td>中' + best.year.hitWindows + ' / 全错' + best.year.missWindows + '</td>';
        html += '<td style="color:' + position.color + ';font-weight:900">' + position.label + ' · ' + (position.amount > 0 ? position.amount + "元" : position.status) + ' · ' + periodText + '</td>';
        html += '<td><b style="color:' + (best.robust ? "#16a34a" : "#d97706") + '">' + (best.robust ? "通过" : "仅今年有效") + '</b></td>';
      } else {
        html += '<td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>';
      }
      html += '</tr>';
    });
    html += '</tbody></table></div></div>';
    var annualYears = (lineBest[line.id].annual[selected.n] || { years: [] }).years.map(function (row) { return row.year; });
    html += '<div class="section"><div class="section__head"><h2 class="section__title">14线逐年测试对比</h2><span class="section__hint">公式固定不变，逐年单算净收益/命中率；不要被某一年的高收益掩盖其他年份</span></div></div>';
    html += '<div class="section"><div class="panel" style="padding:10px;overflow-x:auto;-webkit-overflow-scrolling:touch"><table class="table" style="min-width:1500px"><thead><tr><th>线路</th><th>年度稳健最优</th>';
    annualYears.forEach(function (year) { html += '<th>' + year + '年</th>'; });
    html += '<th>正收益年</th><th>最近3年</th><th>全周期</th></tr></thead><tbody>';
    orderedLines.forEach(function (item) {
      var itemData = lineBest[item.id] || {};
      var itemBest = itemData.best;
      var itemStats = itemBest && itemData.annual ? itemData.annual[itemBest.n] : null;
      html += '<tr><td><b>' + item.label + '</b></td><td><b>' + (itemBest ? (itemBest.n === 1 ? "不倍投" : itemBest.n + "倍") : "未通过") + '</b></td>';
      annualYears.forEach(function (year) {
        var row = itemStats ? itemStats.years.filter(function (y) { return y.year === year; })[0] : null;
        if (!row) {
          html += '<td style="color:#94a3b8">无数据</td>';
        } else {
          var color = row.net >= 0 ? "#16a34a" : "#dc2626";
          html += '<td><b style="color:' + color + '">' + (row.net >= 0 ? "+" : "") + Math.round(row.net) + '</b><div style="font-size:10px;color:#64748b">中' + row.hitWindows + '/错' + row.missWindows + ' · ROI ' + row.roi.toFixed(1) + '%</div></td>';
        }
      });
      html += '<td><b>' + (itemStats ? itemStats.positiveYears + '/' + itemStats.years.length : "-") + '</b></td>';
      html += '<td><b>' + (itemStats ? itemStats.recent3Positive + '/3' : "-") + '</b></td>';
      html += '<td style="font-weight:900;color:' + (itemStats && itemStats.net >= 0 ? "#16a34a" : "#dc2626") + '">' + (itemStats ? (itemStats.net >= 0 ? "+" : "") + itemStats.net : "-") + '</td></tr>';
    });
    html += '</tbody></table></div></div>';
    html += '<div class="section"><div class="panel" style="padding:10px"><div style="font-size:12px;color:#64748b;margin-bottom:6px">倍率选择</div><div style="display:flex;flex-wrap:wrap;gap:6px">';
    ns.forEach(function (n) {
      html += '<button class="chip" data-wm-n="' + n + '" style="' + (n === activeN ? "background:#111827;color:#fff" : "") + '">' + (n === 1 ? "不倍投" : n + "倍") + '</button>';
    });
    html += '</div></div></div>';
    html += '<div class="section"><div class="panel" style="padding:14px;background:#111827;color:#fff;border:0"><div style="font-size:13px;font-weight:800;color:#cbd5e1;margin-bottom:8px">核心结论 · ' + line.label + '</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px">';
    html += '<div style="background:rgba(255,255,255,.08);border-radius:8px;padding:10px"><div style="font-size:24px;font-weight:900">' + (best ? (best.n === 1 ? "不倍投" : best.n + "倍") : "未通过") + '</div><div style="font-size:11px;color:#cbd5e1">年度稳健最优</div></div>';
    html += '<div style="background:rgba(255,255,255,.08);border-radius:8px;padding:10px"><div style="font-size:24px;font-weight:900">' + netBestText + '</div><div style="font-size:11px;color:#cbd5e1">全周期收益最高</div></div>';
    html += '<div style="background:rgba(255,255,255,.08);border-radius:8px;padding:10px"><div style="font-size:24px;font-weight:900;color:#bfdbfe">' + (selectedYtdBest ? (selectedYtdBest.n === 1 ? "不倍投" : selectedYtdBest.n + "倍") : "无数据") + '</div><div style="font-size:11px;color:#cbd5e1">' + currentYear + '年最优 · ' + (selectedYtdBest ? wmPlanText(selectedYtdBest.n) : "0 / 0 / 0") + '</div></div>';
    html += '<div style="background:rgba(255,255,255,.08);border-radius:8px;padding:10px"><div style="font-size:24px;font-weight:900;color:#fde68a">' + selectedPosition.label + '</div><div style="font-size:11px;color:#cbd5e1">当前仓位 · ' + (selectedPosition.amount > 0 ? selectedPosition.amount + "元" : selectedPosition.status) + '</div></div>';
    html += '<div style="background:rgba(255,255,255,.08);border-radius:8px;padding:10px"><div style="font-size:24px;font-weight:900;color:#fde68a">' + selectedYtdPosition.label + '</div><div style="font-size:11px;color:#cbd5e1">今年仓位 · ' + (selectedYtdPosition.amount > 0 ? selectedYtdPosition.amount + "元 · " + selectedYtdPeriod : selectedYtdPosition.status) + '</div></div>';
    html += '<div style="background:rgba(255,255,255,.08);border-radius:8px;padding:10px"><div style="font-size:24px;font-weight:900">' + windowHitRate.toFixed(2) + '%</div><div style="font-size:11px;color:#cbd5e1">窗口命中率</div></div>';
    html += '<div style="background:rgba(255,255,255,.08);border-radius:8px;padding:10px"><div style="font-size:24px;font-weight:900;color:#fca5a5">' + missRate.toFixed(2) + '%</div><div style="font-size:11px;color:#cbd5e1">三期全错率</div></div>';
    html += '<div style="background:rgba(255,255,255,.08);border-radius:8px;padding:10px"><div style="font-size:24px;font-weight:900;color:#fca5a5">' + selected.maxLossStreak + '窗</div><div style="font-size:11px;color:#cbd5e1">最大连续全错</div></div>';
    html += '</div><div style="font-size:12px;color:#e2e8f0;margin-top:8px">当前显示：' + (selected.n === 1 ? "不倍投" : selected.n + "倍") + ' · 单窗金额 ' + selectedPlanText + '</div></div></div>';
    html += '<div class="section"><div class="panel" style="padding:12px;border:2px solid ' + (liveState.waiting ? "#f59e0b" : liveState.active ? "#2563eb" : "#16a34a") + '"><div style="font-size:13px;font-weight:900;margin-bottom:8px">当前窗口状态</div>';
    if (liveState.waiting) {
      html += '<div style="font-size:15px;font-weight:900;color:#92400e;margin-top:6px">当前仓位：等待重开 · 本期金额 0元 · 等待尾' + liveState.waiting.tail + '</div>';
      html += '<div style="font-size:18px;font-weight:900;color:#d97706">等待尾' + liveState.waiting.tail + '重新开出</div>';
      html += '<div style="font-size:12px;color:#475569;margin-top:5px">最后完成的窗口结束后，必须等该尾号重新开出，下一期才开新窗口。</div>';
    } else if (liveState.active) {
      var activeStart = liveState.active.start;
      html += '<div style="font-size:18px;font-weight:900;color:#2563eb">窗口进行中 · 起始 ' + wmPeriodLabel(activeStart) + '</div>';
      html += '<div style="font-size:15px;font-weight:900;color:#1d4ed8;margin-top:6px">当前仓位：' + selectedPosition.label + ' · 本期金额 ' + selectedPosition.amount + '元 · 检查 ' + selectedPositionPeriod + '</div>';
      for (var ai = 0; ai < 3; ai++) {
        var expectedStart = activeStart + ai;
        var attempt = liveState.active.attempts[ai];
        var label = attempt ? ('尾' + attempt.tail + (attempt.hit ? ' 中' : ' 错')) : (expectedStart <= latest ? "未记录" : "待开奖");
        html += '<div style="margin-top:6px;font-size:13px;font-weight:800">第' + (ai + 1) + '期检查 · ' + wmPeriodLabel(expectedStart) + ' · <span style="color:' + (attempt && attempt.hit ? "#16a34a" : "#dc2626") + '">' + label + '</span></div>';
      }
    } else {
      html += '<div style="font-size:18px;font-weight:900;color:#16a34a">当前无进行中窗口</div>';
      html += '<div style="font-size:12px;color:#475569;margin-top:5px">当前仓位：空仓等待 · 下一期检查第1期。</div>';
    }
    html += '</div></div>';
    html += '<div class="section"><div class="grid-3">';
    html += '<div class="stat"><div class="stat__value" style="font-size:18px">' + line.label + '</div><div class="stat__label">当前线路</div></div>';
    html += '<div class="stat"><div class="stat__value" style="font-size:18px">' + (best ? (best.n === 1 ? "不倍投" : best.n + "倍") : "未通过") + '</div><div class="stat__label">年度稳健最优倍率</div></div>';
    html += '<div class="stat"><div class="stat__value">' + wmPlanText(selected.n) + '</div><div class="stat__label">当前单窗金额</div></div>';
    html += '<div class="stat"><div class="stat__value">' + selected.records.length + '</div><div class="stat__label">真实窗口总数</div></div>';
    html += '<div class="stat"><div class="stat__value">' + (selected.records.length ? (((selected.records.length - selected.missWindows) / selected.records.length) * 100).toFixed(2) + "%" : "-") + '</div><div class="stat__label">窗口命中率</div></div>';
    html += '<div class="stat"><div class="stat__value" style="color:#dc2626">' + (selected.records.length ? ((selected.missWindows / selected.records.length) * 100).toFixed(2) + "%" : "-") + '</div><div class="stat__label">三期全错率</div></div>';
    html += '<div class="stat"><div class="stat__value" style="color:#dc2626">' + selected.maxLossStreak + '窗</div><div class="stat__label">最大连续全错</div></div>';
    html += '</div></div>';
    html += '<div class="section"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:8px">';
    simulations.forEach(function (s) {
      var isBest = best && best.n === s.n;
      var isCurrent = s.n === activeN;
      html += '<button data-wm-n="' + s.n + '" style="text-align:left;border:2px solid ' + (isCurrent ? "#2563eb" : isBest ? "#16a34a" : "#e2e8f0") + ';background:' + (isBest ? "#f0fdf4" : "#fff") + ';border-radius:8px;padding:10px;cursor:pointer">';
      html += '<div style="font-size:18px;font-weight:900">' + (s.n === 1 ? "不倍投" : s.n + "倍") + (isBest ? " · 最优" : "") + '</div>';
      html += '<div style="font-size:20px;font-weight:900;color:' + (s.net >= 0 ? "#16a34a" : "#dc2626") + ';margin-top:5px">' + (s.net >= 0 ? "+" : "") + s.net + '</div>';
      html += '<div style="font-size:11px;color:#64748b;margin-top:4px">ROI ' + s.roi.toFixed(2) + '%</div>';
      html += '<div style="font-size:11px;color:#64748b">回撤 ' + s.maxDD + ' · 最高 ' + s.maxMult.toFixed(2) + '倍</div>';
      html += '<div style="font-size:11px;color:#dc2626">连续全错 ' + s.maxLossStreak + ' 窗</div>';
      html += '</button>';
    });
    html += '</div></div>';
    html += '<div class="section"><div class="grid-3">';
    html += '<div class="stat"><div class="stat__value">' + selected.hits1 + ' · ' + (selected.records.length ? ((selected.hits1 / selected.records.length) * 100).toFixed(2) + "%" : "-") + '</div><div class="stat__label">第1期中</div></div>';
    html += '<div class="stat"><div class="stat__value">' + selected.hits2 + ' · ' + (selected.records.length ? ((selected.hits2 / selected.records.length) * 100).toFixed(2) + "%" : "-") + '</div><div class="stat__label">第2期中</div></div>';
    html += '<div class="stat"><div class="stat__value">' + selected.hits3 + ' · ' + (selected.records.length ? ((selected.hits3 / selected.records.length) * 100).toFixed(2) + "%" : "-") + '</div><div class="stat__label">第3期中</div></div>';
    html += '<div class="stat"><div class="stat__value" style="color:#dc2626">' + selected.missWindows + ' · ' + (selected.records.length ? ((selected.missWindows / selected.records.length) * 100).toFixed(2) + "%" : "-") + '</div><div class="stat__label">三期全错</div></div>';
    html += '<div class="stat"><div class="stat__value">' + selected.orderHit.toFixed(2) + '%</div><div class="stat__label">实际下单命中率</div></div>';
    html += '<div class="stat"><div class="stat__value">' + selected.maxWindowRisk + '</div><div class="stat__label">单窗最大风险（元）</div></div>';
    html += '</div></div>';
    var missRuns = [];
    var currentRun = null;
    selected.records.forEach(function (item) {
      if (item.window.hitIndex === 0) {
        if (!currentRun) {
          currentRun = { length: 0, start: item.window.start, end: item.window.start, loss: 0, waitTail: null };
          missRuns.push(currentRun);
        }
        currentRun.length++;
        currentRun.end = item.window.start;
        currentRun.loss += item.profit;
        currentRun.waitTail = item.window.attempts.length ? item.window.attempts[item.window.attempts.length - 1].tail : "-";
      } else {
        currentRun = null;
      }
    });
    var runCounts = { one: 0, two: 0, three: 0, fourPlus: 0 };
    missRuns.forEach(function (run) {
      if (run.length === 1) runCounts.one++;
      else if (run.length === 2) runCounts.two++;
      else if (run.length === 3) runCounts.three++;
      else runCounts.fourPlus++;
    });
    function continueMissRate(streak) {
      var base = 0;
      var nextMiss = 0;
      for (var i = 0; i + streak < selected.records.length; i++) {
        var allMiss = true;
        for (var j = 0; j < streak; j++) {
          if (selected.records[i + j].window.hitIndex !== 0) { allMiss = false; break; }
        }
        if (!allMiss) continue;
        base++;
        if (selected.records[i + streak].window.hitIndex === 0) nextMiss++;
      }
      return base ? (nextMiss / base) * 100 : 0;
    }
    var afterOne = continueMissRate(1);
    var afterTwo = continueMissRate(2);
    var afterThree = continueMissRate(3);
    html += '<div class="section"><div class="section__head"><h2 class="section__title">窗口连续全错规律</h2><span class="section__hint">统计连续2窗、3窗、4窗以上全错，以及继续全错的概率</span></div></div>';
    html += '<div class="section"><div class="grid-3">';
    html += '<div class="stat"><div class="stat__value">' + runCounts.one + '</div><div class="stat__label">单次全错次数</div></div>';
    html += '<div class="stat"><div class="stat__value" style="color:#d97706">' + runCounts.two + '</div><div class="stat__label">连续2窗全错</div></div>';
    html += '<div class="stat"><div class="stat__value" style="color:#dc2626">' + runCounts.three + '</div><div class="stat__label">连续3窗全错</div></div>';
    html += '<div class="stat"><div class="stat__value" style="color:#991b1b">' + runCounts.fourPlus + '</div><div class="stat__label">连续4窗及以上</div></div>';
    html += '<div class="stat"><div class="stat__value">' + afterOne.toFixed(2) + '%</div><div class="stat__label">1窗全错后，下窗继续错</div></div>';
    html += '<div class="stat"><div class="stat__value">' + afterTwo.toFixed(2) + '%</div><div class="stat__label">2窗连错后，第3窗继续错</div></div>';
    html += '<div class="stat"><div class="stat__value">' + afterThree.toFixed(2) + '%</div><div class="stat__label">3窗连错后，第4窗继续错</div></div>';
    html += '<div class="stat"><div class="stat__value" style="color:#dc2626">' + selected.maxLossStreak + '窗</div><div class="stat__label">历史最大连续全错</div></div>';
    html += '</div></div>';
    var consecutiveRuns = missRuns.filter(function (run) { return run.length >= 2; }).slice().reverse();
    html += '<div class="section"><div class="panel" style="padding:10px;overflow-x:auto;-webkit-overflow-scrolling:touch"><div style="font-size:13px;font-weight:900;color:#0f172a;margin-bottom:8px">连续2窗及以上记录 · 左右滑动查看</div><div style="display:flex;gap:8px;min-width:max-content">';
    if (!consecutiveRuns.length) {
      html += '<div style="font-size:13px;color:#64748b">没有连续2窗全错记录</div>';
    } else {
      consecutiveRuns.forEach(function (run) {
        html += '<div style="flex:0 0 230px;border:1px solid #fecaca;background:#fef2f2;border-radius:8px;padding:9px">';
        html += '<div style="font-size:15px;font-weight:900;color:#b91c1c">连续' + run.length + '窗全错</div>';
        html += '<div style="font-size:12px;color:#475569;margin-top:4px">' + wmPeriodLabel(run.start) + ' → ' + wmPeriodLabel(run.end) + '</div>';
        html += '<div style="font-size:12px;color:#475569">等待尾' + run.waitTail + '重新开出</div>';
        html += '<div style="font-size:13px;font-weight:900;color:#dc2626;margin-top:4px">累计亏损 ' + Math.round(run.loss) + '</div>';
        html += '</div>';
      });
    }
    html += '</div></div></div>';
    if (liveState.active) {
      var active = liveState.active;
      html += '<div class="section"><div class="panel" style="padding:10px;border:2px solid #2563eb;background:#eff6ff"><div style="font-size:13px;font-weight:900;color:#1d4ed8;margin-bottom:8px">当前进行中窗口 · ' + wmPeriodLabel(active.start) + '</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px">';
      for (var aj = 0; aj < 3; aj++) {
        var expectedPeriod = active.start + aj;
        var activeAttempt = active.attempts[aj];
        html += '<div style="background:#fff;border-radius:8px;padding:9px">';
        html += '<div style="font-size:12px;font-weight:900">第' + (aj + 1) + '期检查 · ' + wmPeriodLabel(expectedPeriod) + '</div>';
        if (activeAttempt) {
          html += '<div style="font-size:15px;font-weight:900;color:' + (activeAttempt.hit ? "#16a34a" : "#dc2626") + ';margin-top:5px">尾' + activeAttempt.tail + (activeAttempt.hit ? ' 中' : ' 错') + '</div>';
        } else if (expectedPeriod <= latest) {
          html += '<div style="font-size:15px;font-weight:900;color:#94a3b8;margin-top:5px">未记录</div>';
        } else {
          html += '<div style="font-size:15px;font-weight:900;color:#2563eb;margin-top:5px">待开奖</div>';
        }
        html += '</div>';
      }
      html += '</div></div></div>';
    } else if (liveState.waiting) {
      html += '<div class="section"><div class="panel" style="padding:12px;border:2px solid #f59e0b;background:#fffbeb"><div style="font-size:15px;font-weight:900;color:#92400e">当前等待窗口 · 等尾' + liveState.waiting.tail + '重新开出</div></div></div>';
    }
    html += '<div class="section"><div class="panel" style="padding:10px"><div style="font-size:12px;color:#64748b;margin-bottom:8px">当前选择：' + (selected.n === 1 ? "不倍投" : selected.n + "倍") + ' · 单窗金额：' + wmPlanText(selected.n) + ' · 共' + selected.records.length + '个窗口 · 最新在前</div><div style="overflow-x:auto;-webkit-overflow-scrolling:touch"><table class="table" style="min-width:980px"><thead><tr><th>窗口起始</th><th>第1期检查</th><th>第2期检查</th><th>第3期检查</th><th>结果</th><th>连续全错</th><th>本窗盈亏</th></tr></thead><tbody>';
    if (liveState.active) {
      var liveWindow = liveState.active;
      html += '<tr style="background:#dbeafe;outline:2px solid #2563eb">';
      html += '<td><b>当前窗口 · ' + wmPeriodLabel(liveWindow.start) + '</b></td>';
      for (var lj = 0; lj < 3; lj++) {
        var livePeriod = liveWindow.start + lj;
        if (lj < liveWindow.attempts.length) {
          html += '<td>' + wmAttemptCell(liveWindow, lj) + '</td>';
        } else if (livePeriod <= latest) {
          html += '<td><span style="color:#94a3b8">未记录</span></td>';
        } else {
          html += '<td><span style="color:#2563eb;font-weight:900">待开奖</span></td>';
        }
      }
      html += '<td style="color:#1d4ed8;font-weight:900">进行中 · 已检查' + liveWindow.attempts.length + '期</td>';
      html += '<td>-</td><td>--</td>';
      html += '</tr>';
    }
    selected.records.slice().reverse().forEach(function (item) {
      var w = item.window;
      var resultText = w.hitIndex > 0 ? '第' + w.hitIndex + '期中' : '三期全错';
      var color = w.hitIndex > 0 ? "#16a34a" : "#dc2626";
      var rowBg = w.hitIndex === 0 ? "#fef2f2" : w.hitIndex === 3 ? "#fffbeb" : w.hitIndex === 2 ? "#eff6ff" : "#f0fdf4";
      html += '<tr style="background:' + rowBg + '">';
      html += '<td><b>' + wmPeriodLabel(w.start) + '</b></td>';
      html += '<td>' + wmAttemptCell(w, 0) + '</td>';
      html += '<td>' + wmAttemptCell(w, 1) + '</td>';
      html += '<td>' + wmAttemptCell(w, 2) + '</td>';
      html += '<td style="color:' + color + ';font-weight:900">' + resultText + '</td>';
      html += '<td style="font-weight:900;color:' + (item.missStreak ? "#dc2626" : "#94a3b8") + '">' + (item.missStreak ? "第" + item.missStreak + "次连错" : "-") + '</td>';
      html += '<td style="font-weight:900;color:' + (item.profit >= 0 ? "#16a34a" : "#dc2626") + '">' + (item.profit >= 0 ? "+" : "") + Math.round(item.profit) + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table></div></div></div>';
    html += '<p class="disclaimer">页面只做历史窗口倍投测试，不自动下单。每个窗口从第1期开始，三期按N倍递增；中了就停止；三期全错后等待最后尾号重新开出，下一期用基础金额重新开窗。</p>';
    view.innerHTML = html;
  }

  function renderOrderLog() {
    var allRows = autoSettleSimpleOrders();
    var activeTail = state.orderTail && state.orderTail !== "all" ? Number(state.orderTail) : "all";
    var rows = activeTail === "all" ? allRows : allRows.filter(function (r) { return Number(r.tail) === activeTail; });
    var settled = rows.filter(function (r) { return r.result !== "pending"; });
    var totalProfit = settled.reduce(function (sum, r) { return sum + (simpleOrderProfit(r) || 0); }, 0);
    var html = '<div class="section"><div class="section__head"><h2 class="section__title">' + (activeTail === "all" ? "下单记录表" : "尾" + activeTail + " · 历史下单轨迹") + '</h2><span class="section__hint">记录期数、号码、下单金额；赔率固定1.8，结果按实际开奖自动判定 · 本机保存</span></div></div>';

    html += '<div class="section"><div class="grid-3">';
    html += '<div class="stat"><div class="stat__value">' + rows.length + '</div><div class="stat__label">' + (activeTail === "all" ? "全部记录" : "尾" + activeTail + "记录") + '</div></div>';
    html += '<div class="stat"><div class="stat__value">' + rows.filter(function (r) { return r.result === "pending"; }).length + '</div><div class="stat__label">待开奖</div></div>';
    html += '<div class="stat"><div class="stat__value" style="color:' + (totalProfit >= 0 ? "#16a34a" : "#dc2626") + '">' + (totalProfit >= 0 ? "+" : "") + totalProfit.toFixed(2) + '</div><div class="stat__label">累计收益（元）</div></div>';
    html += '</div></div>';

    html += '<div class="section"><div class="panel" style="padding:10px"><div style="font-size:11px;font-weight:900;color:#6b7280;margin-bottom:7px">号码历史轨迹入口</div><div style="display:flex;flex-wrap:wrap;gap:6px">';
    html += '<button class="chip" data-order-tail="all" style="' + (activeTail === "all" ? "background:#111827;color:#fff" : "") + '">全部</button>';
    for (var td = 0; td < 10; td++) {
      var tailRows = allRows.filter(function (r) { return Number(r.tail) === td; });
      var tailProfit = tailRows.filter(function (r) { return r.result !== "pending"; }).reduce(function (sum, r) { return sum + (simpleOrderProfit(r) || 0); }, 0);
      html += '<button class="chip" data-order-tail="' + td + '" style="' + (activeTail === td ? "background:#111827;color:#fff" : "") + '">尾' + td + ' · ' + tailRows.length + '笔 · ' + (tailProfit >= 0 ? "+" : "") + tailProfit.toFixed(2) + '</button>';
    }
    html += '</div></div></div>';

    var allWindows = simpleWindowsLoad();
    var visibleWindows = activeTail === "all" ? allWindows : allWindows.filter(function (w) { return Number(w.tail) === activeTail; });
    visibleWindows = visibleWindows.slice().sort(function (a, b) { return Number(b.startPeriod) - Number(a.startPeriod); });
    html += '<div class="section"><div class="section__head"><h2 class="section__title">三期内锁定窗口</h2><span class="section__hint">每个号码第一次下单自动锁定3期，期间号码不变；中出或三期全错后关闭</span></div></div>';
    html += '<div class="section"><div class="panel" style="padding:10px;overflow-x:auto;-webkit-overflow-scrolling:touch"><div style="display:flex;gap:7px;min-width:max-content">';
    if (!visibleWindows.length) {
      html += '<span style="font-size:12px;color:#9ca3af">暂无锁定窗口</span>';
    } else {
      visibleWindows.forEach(function (w) {
        var status = simpleWindowStatus(w);
        var statusText = status.status === "hit" ? "第" + status.hitIndex + "期中" : status.status === "miss" ? "三期全错" : "进行中";
        var statusColor = status.status === "hit" ? "#16a34a" : status.status === "miss" ? "#dc2626" : "#2563eb";
        var attemptsText = status.attempts.length
          ? status.attempts.map(function (a) { return "第" + a.period + "期" + (a.hit ? "中" : "错"); }).join(" · ")
          : "尚未开奖";
        html += '<div style="min-width:180px;border:1px solid #e0e3e8;border-radius:8px;padding:8px 9px;background:#fff">';
        html += '<div style="font-size:12px;font-weight:900">尾' + w.tail + ' · 起始第' + w.startPeriod + '期</div>';
        html += '<div style="font-size:10px;color:#6b7280;margin-top:3px">窗口 第' + w.startPeriod + '–' + (Number(w.startPeriod) + 2) + '期</div>';
        html += '<div style="font-size:13px;font-weight:900;color:' + statusColor + ';margin-top:5px">' + statusText + '</div>';
        html += '<div style="font-size:10px;color:#6b7280;margin-top:4px;white-space:nowrap">' + attemptsText + '</div>';
        html += '</div>';
      });
    }
    html += '</div></div></div>';

    html += '<div class="section"><div class="panel"><div class="panel__body">';
    html += '<div class="ord-grid">';
    html += '<div class="ord-item"><label>期数</label><input id="soPeriod" type="number" min="1" value="' + (latest + 1) + '"></div>';
    html += '<div class="ord-item"><label>号码（尾号）</label><input id="soTail" type="number" min="0" max="9" value="0"></div>';
    html += '<div class="ord-item"><label>下单金额（元）</label><input id="soAmount" type="number" min="0.01" step="0.01" value="1"></div>';
    html += '<div class="ord-item"><label>赔率</label><div style="padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;background:#f9fafb;font-weight:900">固定 1.8</div></div>';
    html += '</div>';
    html += '<button class="btn-primary" data-so-add="1" style="margin-top:10px">新增下单记录</button>';
    html += '</div></div></div>';

    html += '<div class="section"><div class="panel" style="padding:10px;overflow-x:auto;-webkit-overflow-scrolling:touch">';
    html += '<div style="min-width:720px">';
    html += '<div style="display:grid;grid-template-columns:1.2fr .7fr .7fr .7fr .7fr .7fr .7fr .5fr;gap:6px;padding:7px;border-bottom:1px solid #e5e7eb;font-size:11px;font-weight:800;color:#6b7280">';
    html += '<span>时间</span><span>期数</span><span>号码</span><span>金额</span><span>赔率</span><span>结果</span><span>收益</span><span>操作</span></div>';
    if (!rows.length) {
      html += '<div style="padding:18px;text-align:center;color:#9ca3af;font-size:12px">暂无下单记录</div>';
    } else {
      rows.slice().sort(function (a, b) {
        return Number(b.period || 0) - Number(a.period || 0) || String(b.createdAt).localeCompare(String(a.createdAt));
      }).forEach(function (row) {
        var profit = simpleOrderProfit(row);
        var resultText = row.result === "hit" ? "中" : row.result === "miss" ? "错" : "待开奖";
        var resultColor = row.result === "hit" ? "#16a34a" : row.result === "miss" ? "#dc2626" : "#2563eb";
        html += '<div style="display:grid;grid-template-columns:1.2fr .7fr .7fr .7fr .7fr .7fr .7fr .5fr;gap:6px;padding:8px 7px;border-bottom:1px solid #f0f0f0;font-size:12px;align-items:center">';
        html += '<span>' + (row.createdAt || "").replace("T", " ").slice(0, 16) + '</span>';
        html += '<span>第' + row.period + '期</span>';
        html += '<span>尾' + row.tail + '</span>';
        html += '<span>' + Number(row.amount || 1).toFixed(2) + '</span>';
        html += '<span>1.8</span>';
        html += '<span style="font-weight:800;color:' + resultColor + '">' + resultText + '</span>';
        html += '<span style="font-weight:800;color:' + (profit == null ? "#6b7280" : profit >= 0 ? "#16a34a" : "#dc2626") + '">' + (profit == null ? "-" : (profit >= 0 ? "+" : "") + profit.toFixed(2)) + '</span>';
        html += '<button class="chip" data-so-del="' + row.id + '">删</button>';
        html += '</div>';
      });
    }
    html += '</div></div></div>';
    html += '<p class="disclaimer">本页只记录下单期数、号码和金额，不读取模型推荐，不自动生成订单，不参与选号。赔率固定1.8，命中净收益 +0.8×金额，未中 -1×金额。</p>';
    view.innerHTML = html;
  }

  function hitLogSectionHTML(mode) {
    var rows = ultimateOrdersLoad().filter(function (row) {
      return row.mode === mode && (row.result === "hit1" || row.result === "hit2" || row.result === "hit3");
    });
    var hit1 = rows.filter(function (r) { return r.result === "hit1"; }).length;
    var hit2 = rows.filter(function (r) { return r.result === "hit2"; }).length;
    var hit3 = rows.filter(function (r) { return r.result === "hit3"; }).length;
    var net = rows.reduce(function (sum, r) { return sum + (ultimateOrderNet(r) || 0); }, 0);

    var html = '<div class="section"><div class="section__head"><h2 class="section__title">追中记录</h2><span class="section__hint">' + (mode === "recommend" ? "追推荐模式" : "追号模式") + ' · 只显示命中记录 · 明确标记第几期中</span></div></div>';
    html += '<div class="section"><div class="grid-2">';
    html += '<div class="stat"><div class="stat__value" style="color:#16a34a">' + rows.length + '</div><div class="stat__label">追中总数</div></div>';
    html += '<div class="stat"><div class="stat__value">' + hit1 + '</div><div class="stat__label">第1期中</div></div>';
    html += '<div class="stat"><div class="stat__value">' + hit2 + '</div><div class="stat__label">第2期中</div></div>';
    html += '<div class="stat"><div class="stat__value">' + hit3 + '</div><div class="stat__label">第3期中</div></div>';
    html += '</div></div>';
    html += '<div class="section"><div class="grid-2">';
    html += '<div class="stat"><div class="stat__value" style="color:' + (net >= 0 ? "#16a34a" : "#dc2626") + '">' + (net >= 0 ? "+" : "") + net.toFixed(2) + '</div><div class="stat__label">命中记录净收益（元）</div></div>';
    html += '<div class="stat"><div class="stat__value">' + (rows.length ? ((hit1 / rows.length * 100).toFixed(1) + "%") : "-") + '</div><div class="stat__label">第1期直接命中占比</div></div>';
    html += '</div></div>';

    html += '<div class="section"><div class="panel" style="padding:10px;overflow-x:auto;-webkit-overflow-scrolling:touch">';
    html += '<div style="max-height:260px;overflow-y:auto;-webkit-overflow-scrolling:touch">';
    html += '<div style="min-width:790px">';
    html += '<div style="display:grid;grid-template-columns:1.1fr .7fr .6fr .6fr .55fr 1.1fr 1fr .7fr .7fr;gap:6px;padding:7px;border-bottom:1px solid #e5e7eb;font-size:11px;font-weight:800;color:#6b7280">';
    html += '<span>时间</span><span>模式</span><span>位置</span><span>起始期</span><span>尾号</span><span>倍投</span><span>中在第几期</span><span>结算期</span><span>净收益</span></div>';
    if (!rows.length) {
      html += '<div style="padding:18px;text-align:center;color:#9ca3af;font-size:12px">暂无追中记录</div>';
    } else {
      rows.slice().sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); }).forEach(function (row) {
        var hitIndex = row.result === "hit1" ? 1 : row.result === "hit2" ? 2 : 3;
        var value = ultimateOrderNet(row);
        html += '<div style="display:grid;grid-template-columns:1.1fr .7fr .6fr .6fr .55fr 1.1fr 1fr .7fr .7fr;gap:6px;padding:8px 7px;border-bottom:1px solid #f0f0f0;font-size:12px;align-items:center">';
        html += '<span>' + (row.createdAt || "").replace("T", " ").slice(0, 16) + '</span>';
        html += '<span>' + (row.mode === "recommend" ? "追推荐" : "追号") + '</span>';
        html += '<span>' + row.position + '</span>';
        html += '<span>' + row.startPeriod + '</span>';
        html += '<span>尾' + row.tail + '</span>';
        html += '<span>' + (ORDER_PATTERNS[row.pattern] || []).join("/") + '</span>';
        html += '<span style="color:#16a34a;font-weight:800">第' + hitIndex + '期中</span>';
        html += '<span>' + (Number(row.startPeriod) + hitIndex - 1) + '</span>';
        html += '<span style="color:' + (value >= 0 ? "#16a34a" : "#dc2626") + '">' + (value >= 0 ? "+" : "") + value.toFixed(2) + '</span>';
        html += '</div>';
      });
    }
    html += '</div></div></div></div>';
    html += '<p class="disclaimer">追中记录只读取“追三期下单”中已标记为第1期、第2期或第3期命中的记录；未命中和待开奖记录不会显示在这里。</p>';
    return html;
  }

  // ===== 预估三层框架 + 下期推荐 =====
  // ===== 双号追热页面（连出惯性分层打分，每期推2个号，避尾0）=====
  function pickTopAt(cur, k) {
    return MODEL.pickTopAt(cur, k);
  }

  function buildRealtimeSnapshotRateHTML(config) {
    var groups = Array.isArray(config.groups) ? config.groups : [{
      label: config.label || "",
      rows: config.rows || [],
      pendingText: config.pendingText || "-",
      color: config.color || "#111827"
    }];
    var html = '';
    html += '<div class="section"><div class="section__head"><h2 class="section__title">真实快照命中率 · 实时记录</h2><span class="section__hint">' + (config.hint || "只统计开奖前保存、开奖后已结算的真实快照；未开奖不计入") + '</span></div></div>';
    groups.forEach(function (group) {
      var rows = (group.rows || []).slice().sort(function (a, b) {
        return Number(b.period) - Number(a.period);
      });
      var n = rows.length;
      var hits = rows.filter(function (r) { return r.hit === true; }).length;
      var miss = n - hits;
      var rate = n ? (hits / n * 100).toFixed(1) + "%" : "样本不足";
      html += '<div class="section"><div class="panel" style="padding:12px 10px;border-left:4px solid ' + (group.color || "#6b7280") + '">';
      html += '<div style="font-size:13px;font-weight:900;color:' + (group.color || "#111827") + ';margin-bottom:8px">' + (group.label || "合计") + '</div>';
      html += '<div class="grid-3">';
      html += '<div class="stat"><div class="stat__value" style="color:' + (hits >= miss ? "#16a34a" : "#dc2626") + '">' + rate + '</div><div class="stat__label">命中率 · 中' + hits + ' 错' + miss + ' 共' + n + '</div></div>';
      html += '<div class="stat"><div class="stat__value">' + (rows.length ? rows[0].period : "-") + '</div><div class="stat__label">最新已结算快照期</div></div>';
      html += '<div class="stat"><div class="stat__value" style="color:#2563eb">' + (group.pendingText || "-") + '</div><div class="stat__label">待开奖 / 进行中</div></div>';
      html += '</div>';
      html += '<div style="font-size:11px;font-weight:900;color:#6b7280;margin:10px 0 6px">最新真实快照记录 · 新→旧</div>';
      html += '<div style="display:flex;gap:6px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:3px">';
      if (!rows.length) {
        html += '<span style="font-size:12px;color:#9ca3af">暂无已结算真实快照</span>';
      } else {
        rows.slice(0, 30).forEach(function (r) {
          var tone = r.hit ? "#16a34a" : "#dc2626";
          var bg = r.hit ? "#f0fdf4" : "#fef2f2";
          var border = r.hit ? "#bbf7d0" : "#fecaca";
          html += '<div style="min-width:76px;border:1px solid ' + border + ';border-radius:8px;padding:6px 7px;background:' + bg + ';text-align:center">';
          html += '<div style="font-size:10px;color:#6b7280">第' + r.period + '期' + (r.stream ? ' · ' + r.stream : '') + '</div>';
          html += '<div style="font-size:14px;font-weight:900;color:' + tone + ';margin-top:2px">' + (r.hit ? '中' : '错') + '</div>';
          html += '</div>';
        });
      }
      html += '</div></div></div>';
    });
    return html;
  }

  function threePeriodRealtimeSnapshotRows(streamThree) {
    var rows = [];
    var pending = [];
    ["D1", "D2"].forEach(function (key) {
      var batches = (streamThree[key] && streamThree[key].batches) || [];
      batches.forEach(function (batch) {
        if (batch.status === "pending" || batch.hitIndex == null) {
          if (batch.status === "pending") pending.push({ stream: key, period: batch.startPeriod });
          return;
        }
        if (batch.sourceKind !== "snapshot") return;
        var attempts = batch.attempts || [];
        rows.push({
          period: attempts.length ? attempts[attempts.length - 1].period : batch.startPeriod,
          hit: batch.status === "hit" || (batch.hitIndex >= 1 && batch.hitIndex <= 3),
          stream: key
        });
      });
    });
    return { rows: rows, pending: pending };
  }

  function buildThreePeriodCorrectScrollHTML(streamThree, isRecommendMode) {
    var html = '';
    html += '<div class="section"><div class="section__head"><h2 class="section__title">三期内对错滚动条</h2><span class="section__hint">D1/D2 独立线 · 新→旧 · 中=绿 错=红 进行中=蓝</span></div></div>';
    html += '<div class="section"><div class="panel" style="padding:12px 10px">';
    ["D1", "D2"].forEach(function (key) {
      var result = streamThree[key] || { label: key, batches: [] };
      var batches = (result.batches || []).slice().sort(function (a, b) {
        return Number(b.startPeriod) - Number(a.startPeriod);
      });
      html += '<div id="threeCorrectScroll' + key + '"' + (key === "D1" ? ' style="margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #e5e7eb"' : '') + '>';
      html += '<div style="font-size:12px;font-weight:900;color:' + (key === "D1" ? "#16a34a" : "#2563eb") + ';margin-bottom:6px">' + key + ' ' + result.label + '</div>';
      html += '<div style="overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:2px">';
      html += '<div style="display:flex;gap:6px;min-width:max-content">';
      if (!batches.length) {
        html += '<span style="font-size:12px;color:#9ca3af">暂无记录</span>';
      } else {
        batches.forEach(function (batch) {
          var isPending = batch.status === "pending" || batch.hitIndex == null;
          var isHit = !isPending && batch.status !== "miss" && batch.hitIndex >= 1 && batch.hitIndex <= 3;
          var tone = isPending ? "#2563eb" : (isHit ? "#16a34a" : "#dc2626");
          var bg = isPending ? "#eff6ff" : (isHit ? "#f0fdf4" : "#fef2f2");
          var border = isPending ? "#bfdbfe" : (isHit ? "#bbf7d0" : "#fecaca");
          var attemptsCount = (batch.attempts || []).length;
          var resultText = isPending
            ? (attemptsCount ? "进行中 " + Math.min(attemptsCount, 3) + "/3" : "待检查")
            : (isHit ? "第" + batch.hitIndex + "期中" : "三期全错");
          var mainText = isRecommendMode
            ? "推荐 " + (batch.attempts || []).map(function (a) { return a.tail == null ? "空" : "尾" + a.tail; }).join("→")
            : "锁定 尾" + batch.tail;
          html += '<div style="min-width:96px;border:1px solid ' + border + ';border-radius:8px;padding:6px 7px;background:' + bg + '">';
          html += '<div style="font-size:10px;color:#6b7280">起始 第' + batch.startPeriod + '期</div>';
          html += '<div style="font-size:13px;font-weight:900;color:' + tone + ';margin-top:2px">' + resultText + '</div>';
          html += '<div style="font-size:10px;color:#6b7280;margin-top:3px;white-space:nowrap">' + mainText + '</div>';
          html += '</div>';
        });
      }
      html += '</div></div></div>';
    });
    html += '</div></div>';
    return html;
  }

  function renderUltimateMode(mode) {
    var UM = window.CAISHEN_ULTIMATE;
    if (!UM) {
      view.innerHTML = '<div class="section"><div class="panel"><div class="panel__body"><div class="empty">终极模型模块未加载</div></div></div></div>';
      return;
    }

    var options = { startPeriod: 31 };
    var isRecommendMode = mode === "recommend";
    var modeLabel = isRecommendMode ? "三期内追推荐" : "三期内追号码";
    var modeHint = isRecommendMode ? "三期内追推荐 · 每期采用当期最新推荐 · 优先展示真实快照" : "锁定一个推荐号码固定追3期 · 同一时间只跑一条线";
    autoSettleUltimateOrders();
    var analysis = UM.analyze(RAW, MODEL, options);
    var strategyResult = isRecommendMode
      ? UM.runRecommendationBacktest(RAW, MODEL, options)
      : UM.runStrategyBacktest(RAW, MODEL, options);
    var fixedP6 = isRecommendMode
      ? UM.runOverlappingBacktest(RAW, MODEL, "P6", options)
      : UM.runFixedBacktest(RAW, MODEL, "P6", options);
    var fixedP7 = isRecommendMode
      ? UM.runOverlappingBacktest(RAW, MODEL, "P7", options)
      : UM.runFixedBacktest(RAW, MODEL, "P7", options);
    var fixedP8 = isRecommendMode
      ? UM.runOverlappingBacktest(RAW, MODEL, "P8", options)
      : UM.runFixedBacktest(RAW, MODEL, "P8", options);
    var stateColor = { veryStrong: "#b91c1c", strong: "#16a34a", steady: "#2563eb", weak: "#dc2626", sample: "#6b7280" };

    function pctFmt(x) {
      if (x == null) return "-";
      return (x * 100).toFixed(1) + "%";
    }

    function numFmt(x) {
      return Number(x || 0).toFixed(2);
    }

    function actionText(item) {
      var state = item.monitor;
      if (!item.currentPick) return "无信号";
      if (!state.pattern) return "观望";
      return state.pattern + " " + UM.PATTERNS[state.pattern].label;
    }

    function nextCandidates() {
      var out = [];
      if (analysis.endPeriod == null) return out;
      var prediction = MODEL.buildPrediction(analysis.endPeriod);
      var picks = prediction.doubleRecommendation || [];
      UM.KEYS.forEach(function (key, index) {
        var item = analysis.items[key];
        var pick = picks[index];
        if (!item || !pick) return;
        out.push({
          key: key,
          label: item.label,
          pick: pick,
          monitor: item.monitor
        });
      });
      return out;
    }

    function rankedCandidates(candidates) {
      return candidates.slice().sort(function (a, b) {
        var aActive = a.monitor.pattern ? 1 : 0;
        var bActive = b.monitor.pattern ? 1 : 0;
        if (aActive !== bActive) return bActive - aActive;
        if (b.monitor.score !== a.monitor.score) return b.monitor.score - a.monitor.score;
        return UM.KEYS.indexOf(a.key) - UM.KEYS.indexOf(b.key);
      });
    }

    var gateAction = "未加载";
    var gateBlocked = true;
    var gateStreams = null;
    if (window.CAISHEN_SELECTOR && window.CAISHEN_SELECTOR.analyze) {
      var gateAnalysis = window.CAISHEN_SELECTOR.analyze(RAW, MODEL, options);
      gateAction = gateAnalysis.decision.action;
      gateBlocked = gateAction === "观望";
      gateStreams = gateAnalysis.decision.streams;
    }
    var lockTone = { border: "#16a34a", bg: "#f0fdf4", text: "#166534", soft: "#bbf7d0" };
    var gateTone = { border: "#d97706", bg: "#fffbeb", text: "#92400e", soft: "#fef3c7" };
    function activeSnapshotWindow(stream) {
      var wins = window.APP_SNAPSHOTS && Array.isArray(window.APP_SNAPSHOTS.sourceWindows)
        ? window.APP_SNAPSHOTS.sourceWindows
        : [];
      return wins.filter(function (w) {
        return w.stream === stream && w.status === "pending";
      }).sort(function (a, b) {
        return Number(b.target) - Number(a.target);
      })[0] || null;
    }
    var sourceRows = [];
    ["D1", "D2"].forEach(function (key) {
      var state = gateStreams && gateStreams[key];
      var activeWindow = !isRecommendMode ? activeSnapshotWindow(key) : null;
      var pick = activeWindow ? {
        tail: activeWindow.tail,
        score: Number(activeWindow.score || 0),
        grade: activeWindow.grade || "-",
        tag: activeWindow.tag || "-"
      } : (state ? state.current : null);
      sourceRows.push({
        key: key,
        label: state ? state.label : key,
        pick: pick,
        model: key.charAt(0) === "D" ? "双号" : "下期",
        activeWindow: activeWindow,
        statusText: activeWindow
          ? "当前窗口第" + Math.min((activeWindow.attempts || []).length + 1, 3) + "期 · 锁定号不换"
          : (isRecommendMode ? "本期采用最新推荐" : "暂未开新窗口")
      });
    });
    var executeKey = gateAction === "跟双号" ? "D1" : null;
    var executePick = null;
    for (var exi = 0; exi < sourceRows.length; exi++) {
      if (sourceRows[exi].key === executeKey && sourceRows[exi].pick) executePick = sourceRows[exi].pick;
    }
    var executeLabel = gateAction === "跟双号" ? "双号 D1" : "";
    if (!gateBlocked && !executePick) {
      gateBlocked = true;
      gateAction = "观望";
      executeKey = null;
      executeLabel = "";
    }
    var windowProgressText = "";
    if (isRecommendMode) {
      windowProgressText = "第" + analysis.nextPeriod + "期采用最新推荐";
    } else {
      var activeCount = sourceRows.filter(function (row) { return !!row.activeWindow; }).length;
      windowProgressText = activeCount > 0
        ? "第" + analysis.nextPeriod + "期继续当前窗口 · 号码不变"
        : "第" + analysis.nextPeriod + "期暂不开新窗口";
    }
    var html = "";
    if (isRecommendMode) {
      html += '<div class="section"><div class="panel"><div class="panel__body" style="font-size:13px;line-height:1.75"><b>本页记录：三期内追推荐。</b><br>每个3期窗口依次采用第1期、第2期、第3期当期的最新推荐号，号码可以每期不同；任意一期命中或三期全错后，该窗口结束。真实快照优先展示并实时记录；没有快照的历史窗口保留，并明确标注为历史回测。</div></div></div>';
    } else {
      html += '<div class="section"><div class="panel"><div class="panel__body" style="font-size:13px;line-height:1.75"><b>本页记录：三期内追号码。</b><br>窗口开始时锁定一个推荐号，连续检查3期，号码不变；任意一期命中或三期全错后结束。窗口结束后，下一期重新锁定最新推荐号开新窗口。真实快照优先展示；没有快照的历史窗口保留，并明确标注为历史回测。</div></div></div>';
    }
    html += '<div class="section" id="ultimateLockCard"><div class="panel" style="padding:16px 14px;border:2px solid ' + lockTone.border + ';background:' + lockTone.bg + '">';
    html += '<div style="font-size:12px;font-weight:900;color:' + lockTone.text + ';letter-spacing:.08em">' + modeLabel + ' · ' + "窗口记录" + '</div>';
    html += '<div style="font-size:40px;line-height:1.05;font-weight:900;color:' + lockTone.text + ';margin:6px 0">' + (gateBlocked ? "建议：观望" : "建议：跟双号") + '</div>';
    html += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">';
    html += '<span style="padding:4px 8px;border:1px solid ' + gateTone.border + ';border-radius:6px;background:' + gateTone.bg + ';color:' + gateTone.text + ';font-size:12px;font-weight:900">仅建议，不代替执行</span>';
    html += '<span style="font-size:12px;color:' + lockTone.text + '">' + windowProgressText + '</span>';
    html += '</div>';
    html += '<div style="margin-top:12px;padding-top:10px;border-top:1px solid ' + lockTone.soft + '">';
    html += '<div style="font-size:12px;font-weight:900;color:' + lockTone.text + ';margin-bottom:6px">两个原始号源 · 不再二次筛选</div>';
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px">';
    sourceRows.forEach(function (row) {
      var isExec = false;
      html += '<div style="border:2px solid ' + (isExec ? lockTone.border : "#d1d5db") + ';border-radius:8px;padding:9px 10px;background:#fff">';
      html += '<div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap"><b style="color:' + (isExec ? lockTone.text : "#374151") + '">' + row.key + ' ' + row.label + '</b><span class="chip">' + (row.pick ? "尾" + row.pick.tail : "空") + '</span></div>';
      html += '<div style="font-size:11px;color:var(--muted);margin-top:5px">' + (row.pick ? row.pick.grade + '级 ' + row.pick.score.toFixed(1) + '分 · ' + (row.pick.tag || "-") : "空推荐") + ' · ' + row.model + '</div>';
      html += '<div style="font-size:11px;font-weight:800;color:' + (isExec ? lockTone.text : "#6b7280") + ';margin-top:5px">' + (row.statusText || "窗口照常记录") + '</div>';
      html += '</div>';
    });
    html += '</div></div>';
    html += '<div style="margin-top:10px;font-size:12px;color:' + (gateBlocked ? gateTone.text : lockTone.text) + '">' + "窗口和记录不受建议影响；是否下单由你确认。" + '</div>';
    html += '</div></div>';
    html += '<!--ULT_CARD_HISTORY-->';

    var streamThree = {};
    if (window.CAISHEN_SELECTOR && window.CAISHEN_SELECTOR.runThreePeriodStreamBacktest) {
      ["D1", "D2"].forEach(function (key) {
        streamThree[key] = isRecommendMode
          ? runRecommendationWindowBacktest(RAW, MODEL, key, options)
          : window.CAISHEN_SELECTOR.runThreePeriodStreamBacktest(RAW, MODEL, key, options);
      });
    }
    if (!isRecommendMode && window.APP_SNAPSHOTS && Array.isArray(window.APP_SNAPSHOTS.sourceWindows)) {
      ["D1", "D2"].forEach(function (key) {
        if (!streamThree[key]) streamThree[key] = { stream: key, label: key === "D1" ? "双号首推" : "双号备选", batches: [] };
        window.APP_SNAPSHOTS.sourceWindows.filter(function (w) { return w.stream === key; }).forEach(function (w) {
          streamThree[key].batches = streamThree[key].batches.filter(function (b) { return b.startPeriod !== w.target; });
          streamThree[key].batches.push({
            stream: key,
            label: streamThree[key].label,
            sourceKind: "snapshot",
            status: w.status || "pending",
            startPeriod: w.target,
            tail: w.tail,
            hitIndex: w.hitIndex == null ? null : w.hitIndex,
            attempts: (w.attempts || []).map(function (a) { return { period: a.period, tail: a.tail, hit: a.hit, source: "snapshot" }; })
          });
        });
        streamThree[key].batches.sort(function (a, b) { return b.startPeriod - a.startPeriod; });
      });
    }
    if (!isRecommendMode) {
      ["D1", "D2"].forEach(function (key) {
        if (!streamThree[key]) streamThree[key] = { stream: key, label: key === "D1" ? "双号首推" : "双号备选", batches: [] };
        (streamThree[key].batches || []).forEach(function (b) {
          if (!b.sourceKind) b.sourceKind = "backtest";
          if (!b.status) b.status = b.hitIndex >= 1 && b.hitIndex <= 3 ? "hit" : "miss";
        });
      });
    }
    if (isRecommendMode) {
      var livePrediction = MODEL.buildPrediction(analysis.endPeriod);
      var livePicks = livePrediction.doubleRecommendation || [];
      ["D1", "D2"].forEach(function (key, index) {
        if (!streamThree[key]) streamThree[key] = { stream: key, label: key === "D1" ? "双号首推" : "双号备选", batches: [] };
        var p = livePicks[index];
        var liveAttempt = { period: analysis.nextPeriod, tail: p ? p.tail : null, hit: null, source: "live" };
        var pendingBatch = (streamThree[key].batches || []).filter(function (b) {
          return b.status === "pending" && Array.isArray(b.attempts) && b.attempts.length < 3;
        }).sort(function (a, b) {
          return Number(b.startPeriod) - Number(a.startPeriod);
        })[0] || null;
        if (pendingBatch) {
          var alreadyLive = pendingBatch.attempts.some(function (a) { return Number(a.period) === Number(analysis.nextPeriod); });
          if (!alreadyLive) pendingBatch.attempts.push(liveAttempt);
          pendingBatch.sourceKind = pendingBatch.sourceKind === "snapshot" ? "snapshot+live" : "live";
          pendingBatch.recommendationSequence = pendingBatch.attempts.map(function (a) { return a.tail; });
        } else {
          streamThree[key].batches.push({
            stream: key,
            label: streamThree[key].label,
            sourceKind: "live",
            status: "pending",
            startPeriod: analysis.nextPeriod,
            tail: p ? p.tail : null,
            recommendationSequence: [p ? p.tail : null],
            hitIndex: null,
            attempts: [liveAttempt]
          });
        }
        streamThree[key].batches.sort(function (a, b) { return b.startPeriod - a.startPeriod; });
      });
    }

    ["D1", "D2"].forEach(function (key) {
      var all = streamThree[key].batches || [];
      var done = all.filter(function (b) { return b.status !== "pending" && b.hitIndex != null; });
      var counts2 = { first: 0, second: 0, third: 0, miss: 0 };
      done.forEach(function (b) { if (b.hitIndex === 1) counts2.first++; else if (b.hitIndex === 2) counts2.second++; else if (b.hitIndex === 3) counts2.third++; else counts2.miss++; });
      var n2 = done.length, hits2 = counts2.first + counts2.second + counts2.third;
      streamThree[key].n = n2;
      streamThree[key].hits = hits2;
      streamThree[key].hitRate = n2 ? hits2 / n2 : 0;
      streamThree[key].first = counts2.first;
      streamThree[key].second = counts2.second;
      streamThree[key].third = counts2.third;
      streamThree[key].miss = counts2.miss;
      streamThree[key].firstRate = n2 ? counts2.first / n2 : 0;
      streamThree[key].secondRate = n2 ? counts2.second / n2 : 0;
      streamThree[key].thirdRate = n2 ? counts2.third / n2 : 0;
      streamThree[key].missRate = n2 ? counts2.miss / n2 : 0;
    });
    html += '<!--ULT_RECORDS_START-->';
    var realtimeThree = threePeriodRealtimeSnapshotRows(streamThree);
    var realtimePendingByStream = {};
    realtimeThree.pending.forEach(function (p) {
      realtimePendingByStream[p.stream] = "第" + p.period + "期";
    });
    html += buildRealtimeSnapshotRateHTML({
      hint: (isRecommendMode ? "三期内追推荐" : "三期内追号码") + " · 只统计真实快照已结算窗口；进行中窗口不计入",
      groups: [
        {
          label: "第一推荐 D1",
          rows: realtimeThree.rows.filter(function (r) { return r.stream === "D1"; }),
          pendingText: realtimePendingByStream.D1 || "无",
          color: "#16a34a"
        },
        {
          label: "第二推荐 D2",
          rows: realtimeThree.rows.filter(function (r) { return r.stream === "D2"; }),
          pendingText: realtimePendingByStream.D2 || "无",
          color: "#2563eb"
        }
      ]
    });
    html += buildThreePeriodCorrectScrollHTML(streamThree, isRecommendMode);
    html += '<div class="section"><div class="section__head"><h2 class="section__title">执行规则</h2><span class="section__hint">两个页面只负责执行方式，不重新选号</span></div></div>';
    html += '<div class="section"><div class="panel"><div class="panel__body" style="font-size:13px;line-height:1.8">';
    if (isRecommendMode) {
      html += '<div><b>追推荐号：</b>窗口内第1/2/3期分别采用当期最新推荐，号码可以每期不同；任意一期命中或三期全错后，该窗口结束。</div>';
      html += '<div><b>重新开窗：</b>窗口结束后，下一期重新开始一个新的3期窗口。</div>';
    } else {
      html += '<div><b>固定追三期：</b>拿到原始推荐号后固定追3期，未结束前不换号。</div>';
      html += '<div><b>本页作用：</b>记录固定号码在3期窗口内的结果，不进行P档或强弱二次筛选。</div>';
    }
    html += '</div></div></div>';

    html += '<div class="section"><div class="section__head"><h2 class="section__title">双流三期内命中结构</h2><span class="section__hint">D1、D2独立统计 · 原始推荐号</span></div></div>';
    html += '<div class="section"><div class="panel" style="overflow-x:auto;-webkit-overflow-scrolling:touch">';
    html += '<div style="min-width:620px">';
    html += '<div style="display:grid;grid-template-columns:1.2fr .7fr .8fr .8fr .8fr .8fr .8fr;gap:6px;padding:7px;border-bottom:1px solid #e5e7eb;font-size:11px;font-weight:800;color:#6b7280">';
    html += '<span>推荐流</span><span>批次</span><span>3期中</span><span>第1期中</span><span>第2期中</span><span>第3期中</span><span>三期全错</span></div>';
    ["D1", "D2"].forEach(function (key) {
      var r = streamThree[key];
      html += '<div style="display:grid;grid-template-columns:1.2fr .7fr .8fr .8fr .8fr .8fr .8fr;gap:6px;padding:8px 7px;border-bottom:1px solid #f0f0f0;font-size:12px">';
      html += '<b style="color:' + (key.charAt(0) === "D" ? "#16a34a" : "#2563eb") + '">' + r.label + '</b>';
      html += '<span>' + r.n + '</span><span>' + pctFmt(r.hitRate) + '</span><span>' + r.first + '</span><span>' + r.second + '</span><span>' + r.third + '</span><span>' + r.miss + '</span>';
      html += '</div>';
    });
    html += '</div></div></div>';

    var renderBatchCard = function (batch) {
      var isPending = batch.status === "pending" || batch.hitIndex == null;
      var isHit = !isPending && batch.status !== "miss" && batch.hitIndex >= 1 && batch.hitIndex <= 3;
      var endPeriod = batch.attempts && batch.attempts.length ? batch.attempts[batch.attempts.length - 1].period : batch.startPeriod;
      var sourceText = isRecommendMode ? (batch.sourceKind === "snapshot" ? "真实快照" : batch.sourceKind === "snapshot+live" ? "快照+当前" : batch.sourceKind === "live" ? "当前窗口" : batch.sourceKind === "mixed" ? "快照+回测" : "历史回测") : (batch.sourceKind === "snapshot" ? "真实快照" : "历史回测");
      var h = '<div style="width:156px;flex:0 0 auto;border:1px solid #e0e3e8;border-radius:8px;padding:7px;background:#fff">';
      h += '<div style="font-size:11px;font-weight:800">' + batch.label + '</div>';
      h += '<div style="font-size:11px;color:var(--muted);margin-top:2px">起始 第' + batch.startPeriod + '期 · ' + sourceText + '</div>';
      var batchMain = isRecommendMode
        ? '推荐序列 ' + (batch.attempts || []).map(function (a) { return a.tail == null ? '空' : '尾' + a.tail; }).join('→')
        : '原始号 尾' + batch.tail;
      h += '<div style="font-size:16px;font-weight:900;margin:4px 0">' + batchMain + '</div>';
      (batch.attempts || []).forEach(function (a) {
        var tone = a.hit === true ? "#16a34a" : a.hit === false ? "#dc2626" : "#2563eb";
        var mark = a.hit === true ? "中" : a.hit === false ? "错" : "待开奖";
        h += '<div style="font-size:11px;color:' + tone + '">第' + a.period + '期 · ' + (isRecommendMode ? '当期推荐' : '锁定号') + ' 尾' + a.tail + ' · ' + mark + '</div>';
      });
      var expectedEnd = batch.startPeriod + 2;
      if (isPending) {
        var nextCheckPeriod = batch.attempts && batch.attempts.length
          ? batch.attempts[batch.attempts.length - 1].period + 1
          : batch.startPeriod;
        if (nextCheckPeriod > expectedEnd) nextCheckPeriod = expectedEnd;
        h += '<div style="margin-top:4px;font-size:11px;font-weight:800;color:#2563eb">当前状态：窗口进行中 · 下一期检查 第' + nextCheckPeriod + '期</div>';
      } else {
        h += '<div style="margin-top:4px;font-size:11px;font-weight:800;color:' + (isHit ? "#16a34a" : "#dc2626") + '">结束 第' + endPeriod + '期 · ' + (isHit ? "第" + batch.hitIndex + "期中" : "三期全错") + '</div>';
      }
      h += '</div>';
      return h;
    };
    ["D1", "D2"].forEach(function (key) {
      var streamResult = streamThree[key] || { label: key, batches: [] };
      var batches = (streamResult.batches || []).slice().sort(function (a, b) { return b.startPeriod - a.startPeriod; });
      var streamName = key + " " + streamResult.label + (key === "D1" ? " · 首推" : " · 备选");
      html += '<div class="section"><div class="section__head"><h2 class="section__title">三期内滚动记录 · ' + streamName + '</h2><span class="section__hint">' + streamName + '独立滚动条 · 新→旧</span></div></div>';
      html += '<div class="panel" style="padding:10px;overflow-x:auto;-webkit-overflow-scrolling:touch">';
      html += '<div style="display:flex;gap:6px;min-width:max-content">';
      batches.forEach(function (batch) { html += renderBatchCard(batch); });
      if (!batches.length) html += '<div style="color:#9ca3af;font-size:12px">暂无记录</div>';
      html += '</div></div>';
    });

    html += '<!--ULT_RECORDS_END-->';
    html += '<p class="disclaimer">' + modeLabel + '只监控双号追热D1/D2。' + (isRecommendMode ? '追推荐模式窗口结束后，下一期按最新推荐重新开窗。' : '追号模式会锁定起始推荐号码，同一时间每个位置只追一条线。') + '第35/60分是当前规则阈值，后续必须用真实快照继续验证，不能把历史回测当成固定收益。</p>';
    var ultStartMarker = '<!--ULT_RECORDS_START-->';
    var ultEndMarker = '<!--ULT_RECORDS_END-->';
    var ultStart = html.indexOf(ultStartMarker);
    var ultEnd = html.indexOf(ultEndMarker);
    if (ultStart >= 0 && ultEnd > ultStart) {
      var embeddedRecords = html.slice(ultStart + ultStartMarker.length, ultEnd);
      html = html.slice(0, ultStart) + html.slice(ultEnd + ultEndMarker.length);
      html = html.replace('<!--ULT_CARD_HISTORY-->', function () { return '<div class="card-followup">' + embeddedRecords + '</div>'; });
    }
    view.innerHTML = html;
  }

  var selectorHistoryFilter = "ALL";

  function renderChaseNumber() {
    renderUltimateMode("number");
  }

  function renderChaseRecommendation() {
    renderUltimateMode("recommend");
  }

  function streamStreakSnapshot(rows, stream) {
    var hitStreak = 0, missStreak = 0;
    var maxHit = 0, maxMiss = 0;
    var hitRun = 0, missRun = 0;
    var recent = [];
    rows.forEach(function (row) {
      var pick = row[stream];
      if (!pick) return;
      recent.push(pick.hit ? 1 : 0);
      if (recent.length > 20) recent.shift();
      if (pick.hit) {
        hitRun++;
        missRun = 0;
      } else {
        missRun++;
        hitRun = 0;
      }
      if (hitRun > maxHit) maxHit = hitRun;
      if (missRun > maxMiss) maxMiss = missRun;
    });
    for (var i = rows.length - 1; i >= 0; i--) {
      var item = rows[i][stream];
      if (!item) continue;
      if (item.hit) {
        if (missStreak) break;
        hitStreak++;
      } else {
        if (hitStreak) break;
        missStreak++;
      }
    }
    var recentHits = recent.reduce(function (a, b) { return a + b; }, 0);
    return {
      hitStreak: hitStreak,
      missStreak: missStreak,
      maxHit: maxHit,
      maxMiss: maxMiss,
      recent20: recent.length ? recentHits / recent.length : 0
    };
  }

  function streakRiskState(snapshot) {
    var hs = snapshot.hitStreak || 0;
    var ms = snapshot.missStreak || 0;
    if (hs >= 8 || ms >= 6) {
      return {
        key: "red",
        label: "红色",
        color: "#b91c1c",
        bg: "#fef2f2",
        border: "#fecaca",
        text: hs >= 8 ? "连中" + hs + "期，进入历史深水区" : "连错" + ms + "期，进入历史深水区"
      };
    }
    if (hs >= 5 || ms >= 3) {
      return {
        key: "orange",
        label: "橙色",
        color: "#c2410c",
        bg: "#fff7ed",
        border: "#fed7aa",
        text: hs >= 5 ? "连中" + hs + "期，明显偏热" : "连错" + ms + "期，明显偏弱"
      };
    }
    if (hs >= 3 || ms >= 2) {
      return {
        key: "yellow",
        label: "黄色",
        color: "#a16207",
        bg: "#fffbeb",
        border: "#fde68a",
        text: hs >= 3 ? "连中" + hs + "期，开始偏热" : "连错" + ms + "期，开始偏弱"
      };
    }
    return {
      key: "green",
      label: "绿色",
      color: "#15803d",
      bg: "#f0fdf4",
      border: "#bbf7d0",
      text: hs > 0 ? "连中" + hs + "期，状态正常" : (ms > 0 ? "连错" + ms + "期，状态正常" : "当前状态正常")
    };
  }

  function riskChipHtml(label, snapshot) {
    var risk = streakRiskState(snapshot);
    return '<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 7px;border:1px solid ' + risk.border +
      ';border-radius:999px;background:' + risk.bg + ';color:' + risk.color + ';font-size:11px;font-weight:800">' +
      label + " " + risk.label + "</span>";
  }

  function buildMissScrollHTML(records, options) {
    options = options || {};
    var fMiss = 0, sMiss = 0, fMax = 0, sMax = 0;
    var missCells = [];
    for (var ri = 0; ri < records.length; ri++) {
      var q = records[ri] || {};
      var picks = q.picks || [];
      var actual = q.actual || [];
      var fh = null, sh = null;
      if (picks.length && actual.length && !q.live) fh = actual.indexOf(picks[0]) >= 0;
      if (picks.length > 1 && actual.length && !q.live) sh = actual.indexOf(picks[1]) >= 0;
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
    var hint = options.hint || ('①第一推荐 最高连错 ' + fMax + ' 期 · ②第二推荐 最高连错 ' + sMax +
      ' 期 · 当前连错 ①' + fMiss + ' ②' + sMiss + ' · 横向滑动 · 新→旧');
    var sectionId = options.id || "pick3MissScroll";
    var html = '<div class="section" id="' + sectionId + '"><div class="section__head"><h2 class="section__title">连错遗漏记录</h2><span class="section__hint">' + hint + '</span></div></div>';
    html += '<div class="panel" style="padding:12px 10px;overflow-x:auto;-webkit-overflow-scrolling:touch">';
    html += '<div style="display:flex;gap:5px;min-width:max-content">';
    for (var ri = missCells.length - 1; ri >= 0; ri--) {
      var q = missCells[ri];
      html += '<div style="min-width:54px;text-align:center;border:1px solid #e0e3e8;border-radius:8px;padding:6px 3px;background:#fff">';
      html += '<div style="font-size:12px;color:var(--muted);margin-bottom:3px">' + q.period + '</div>';
      html += '<div style="font-size:16px;font-weight:800;line-height:1.45">' + q.c1 + '</div>';
      html += '<div style="font-size:16px;font-weight:800;line-height:1.45">' + q.c2 + '</div>';
      html += '</div>';
    }
    html += '</div></div>';
    return html;
  }

  function runRecommendationWindowBacktest(raw, model, stream, options) {
    var S = window.CAISHEN_SELECTOR;
    var rows = S && S.buildSignals ? S.buildSignals(raw, model, options || { startPeriod: 31 }) : [];
    var label = stream === "D1" ? "双号首推" : "双号备选";
    var snapDetail = window.APP_SNAPSHOTS && Array.isArray(window.APP_SNAPSHOTS.detail) ? window.APP_SNAPSHOTS.detail : [];
    var snapMap = {};
    snapDetail.forEach(function (rec) {
      if (!rec || rec.target == null || !Array.isArray(rec.picks)) return;
      snapMap[Number(rec.target)] = rec;
    });
    rows.forEach(function (row) {
      var rec = snapMap[Number(row.period)];
      if (!rec) { row.source = "backtest"; return; }
      var actual = Array.isArray(rec.actualTails) ? rec.actualTails : [];
      row.source = "snapshot";
      row.actual = actual;
      var p = rec.picks[stream === "D1" ? 0 : 1];
      var pick = p ? { tail: p.tail, hit: actual.indexOf(p.tail) >= 0 } : null;
      if (stream === "D1") row.D1 = pick; else row.D2 = pick;
    });
    var batches = [];
    var i = 0;
    while (i < rows.length) {
      var attempts = [];
      var hitIndex = 4;
      var incomplete = false;
      for (var j = 0; j < 3; j++) {
        if (i + j >= rows.length) { incomplete = true; break; }
        var pick = rows[i + j][stream];
        var hit = !!(pick && rows[i + j].actual.indexOf(pick.tail) >= 0);
        attempts.push({ period: rows[i + j].period, tail: pick ? pick.tail : null, hit: hit, source: rows[i + j].source || "backtest" });
        if (hit) { hitIndex = j + 1; break; }
      }
      if (incomplete) {
        if (attempts.length) {
          var pendingSources = attempts.map(function (a) { return a.source; });
          var pendingSourceKind = pendingSources.every(function (s) { return s === "snapshot"; })
            ? "snapshot"
            : (pendingSources.some(function (s) { return s === "snapshot"; }) ? "mixed" : "backtest");
          batches.push({
            stream: stream,
            label: label,
            sourceKind: pendingSourceKind,
            status: "pending",
            startPeriod: rows[i].period,
            tail: attempts.length ? attempts[0].tail : null,
            recommendationSequence: attempts.map(function (a) { return a.tail; }),
            hitIndex: null,
            result: "pending",
            attempts: attempts
          });
        }
        break;
      }
      var sourceKinds = attempts.map(function (a) { return a.source; });
      var sourceKind = sourceKinds.every(function (s) { return s === "snapshot"; }) ? "snapshot" : (sourceKinds.some(function (s) { return s === "snapshot"; }) ? "mixed" : "backtest");
      batches.push({
        stream: stream,
        label: label,
        sourceKind: sourceKind,
        startPeriod: rows[i].period,
        tail: attempts.length ? attempts[0].tail : null,
        recommendationSequence: attempts.map(function (a) { return a.tail; }),
        hitIndex: hitIndex,
        result: hitIndex === 1 ? "hit1" : hitIndex === 2 ? "hit2" : hitIndex === 3 ? "hit3" : "miss",
        attempts: attempts
      });
      i += hitIndex === 4 ? 3 : hitIndex;
    }
    var counts = { first: 0, second: 0, third: 0, miss: 0 };
    batches.filter(function (b) { return b.status !== "pending"; }).forEach(function (b) {
      if (b.hitIndex === 1) counts.first++;
      else if (b.hitIndex === 2) counts.second++;
      else if (b.hitIndex === 3) counts.third++;
      else counts.miss++;
    });
    var n = batches.length;
    var hits = counts.first + counts.second + counts.third;
    return { stream: stream, label: label, batches: batches, n: n, hits: hits, hitRate: n ? hits / n : 0, first: counts.first, second: counts.second, third: counts.third, miss: counts.miss, firstRate: n ? counts.first / n : 0, secondRate: n ? counts.second / n : 0, thirdRate: n ? counts.third / n : 0, missRate: n ? counts.miss / n : 0 };
  }

  function renderPick3() {
    var N = latest;
    var top2 = pickTopAt(N, 2);
    var riskRows = (window.CAISHEN_SELECTOR && window.CAISHEN_SELECTOR.buildSignals)
      ? window.CAISHEN_SELECTOR.buildSignals(RAW, MODEL, { startPeriod: 31 })
      : [];
    var riskSnaps = {
      D1: streamStreakSnapshot(riskRows, "D1"),
      D2: streamStreakSnapshot(riskRows, "D2")
    };

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

    var html = '<div class="section" id="pick3RecommendCard"><div class="section__head"><h2 class="section__title">双号追热</h2><span class="section__hint">连出惯性 · 预测第 ' + (N + 1) + ' 期 · 避尾0 · 每期推2号</span></div></div>';

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
        var riskKey = i === 0 ? "D1" : "D2";
        var riskState = streakRiskState(riskSnaps[riskKey]);
        html += '<div style="margin-top:7px">' + riskChipHtml(riskKey, riskSnaps[riskKey]) + '</div>';
        html += '<div style="font-size:11px;color:' + riskState.color + ';margin-top:3px;font-weight:700">' + riskState.text + '</div>';
        html += '</div>';
      });
      html += '</div>';
    }
    html += '<div style="margin-top:12px;padding-top:10px;border-top:1px solid #e5e7eb;font-size:11px;color:var(--muted);text-align:center">预警：绿=正常 · 黄=连中3-4/连错2 · 橙=连中5-7/连错3-5 · 红=连中8+/连错6+</div>';
    html += '</div></div>';

    html += buildMissScrollHTML(hist, { id: "pick3MissScroll" });

    var snapStats = window.APP_SNAPSHOTS || null;
    if (snapStats && Array.isArray(snapStats.detail)) {
      var firstSnapshotRows = [], secondSnapshotRows = [];
      snapStats.detail.filter(function (rec) {
        return rec && Number.isFinite(Number(rec.target));
      }).forEach(function (rec) {
        var target = Number(rec.target);
        var picks = Array.isArray(rec.picks) ? rec.picks : [];
        if (picks[0]) firstSnapshotRows.push({ period: target, hit: picks[0].hit === true });
        if (picks[1]) secondSnapshotRows.push({ period: target, hit: picks[1].hit === true });
      });
      var doublePending = "第" + (N + 1) + "期";
      html += buildRealtimeSnapshotRateHTML({
        hint: "第一推荐 D1、第二推荐 D2 分别独立统计；只统计开奖前保存、开奖后已结算的真实快照，未开奖不计入",
        groups: [
          { label: "第一推荐 D1", rows: firstSnapshotRows, pendingText: doublePending, color: "#16a34a" },
          { label: "第二推荐 D2", rows: secondSnapshotRows, pendingText: doublePending, color: "#2563eb" }
        ]
      });
    }
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

    html += '<p class="disclaimer">双号追热基于连出惯性分层打分，每期动态重算推2个号（第一+第二推荐）。历史业绩为 walk-forward 逐期喂数据（零未来数据），赔率按1.8计（命中1注+0.8、未中-1）。第' + N + '期及以前=回测，第' + (N + 1) + '期起=实盘。仅供参考，不做高命中承诺。</p>';
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

  // ===== 数据记录系统（三期窗口规律分析） =====
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
    var html = '<div class="section"><div class="section__head"><h2 class="section__title">三期规律</h2><span class="section__hint">三期窗口规律分析</span></div>';
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
    var groupMove = e.target.closest("[data-group-move]");
    if (groupMove) {
      moveGroup(groupMove.dataset.groupId, groupMove.dataset.groupMove);
      renderTabs();
      return;
    }
    var collapseBtn = e.target.closest("[data-collapse-group]");
    if (collapseBtn) {
      toggleGroupCollapsed(collapseBtn.dataset.collapseGroup);
      renderTabs();
      return;
    }
    var navGroup = e.target.closest("[data-nav-group]");
    if (navGroup) {
      var nextGroup = navGroup.dataset.navGroup;
      if (state.group === nextGroup && !tabSortMode) {
        toggleGroupCollapsed(nextGroup);
        renderTabs();
        return;
      }
      state.group = nextGroup;
      var collapsed = collapsedGroupIds().filter(function (id) { return id !== state.group; });
      lsSet(NAV_COLLAPSED_KEY, collapsed);
      state.tab = firstTabInGroup(state.group);
      lsSet(NAV_GROUP_KEY, state.group);
      lsSet("v2_current_tab", state.tab);
      tabSortMode = false;
      render();
      return;
    }
    // 箭头移动（↑前移 / ↓后移），只在当前分类内调整，立即保存
    var sortBtn = e.target.closest(".sort-btn");
    if (sortBtn) {
      moveTabWithinGroup(sortBtn.dataset.tab, sortBtn.dataset.sort);
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
      var resetGroup = groupForTab(state.tab);
      if (resetGroup) {
        state.group = resetGroup.id;
        lsSet(NAV_GROUP_KEY, state.group);
      }
      render();
      return;
    }
    var btn = e.target.closest(".tab");
    if (btn && !btn.dataset.sortToggle && !btn.dataset.sortReset) {
      state.tab = btn.dataset.tab;
      lsSet("v2_current_tab", state.tab);
      render();
    }
  });

  tabsEl.addEventListener("change", function (e) {
    var moveSelect = e.target.closest("[data-move-tab]");
    if (!moveSelect || !moveSelect.value) return;
    moveTabToGroup(moveSelect.dataset.moveTab, moveSelect.value);
  });

  view.addEventListener("click", function (e) {
    var overviewTab = e.target.closest("[data-overview-tab]");
    if (overviewTab) {
      var targetTab = overviewTab.dataset.overviewTab;
      state.tab = targetTab;
      var targetGroup = groupForTab(targetTab);
      if (targetGroup) state.group = targetGroup.id;
      lsSet("v2_current_tab", state.tab);
      lsSet(NAV_GROUP_KEY, state.group);
      render();
      return;
    }
    var selectorHistoryBtn = e.target.closest("[data-selector-history-filter]");
    if (selectorHistoryBtn) {
      selectorHistoryFilter = selectorHistoryBtn.dataset.selectorHistoryFilter;
      renderSelector();
      return;
    }
    var wmLineBtn = e.target.closest("[data-wm-line]");
    if (wmLineBtn) {
      state.windowMultLine = wmLineBtn.dataset.wmLine;
      renderWindowMultiplierTest();
      return;
    }
    var wmNBtn = e.target.closest("[data-wm-n]");
    if (wmNBtn) {
      state.windowMultN = Number(wmNBtn.dataset.wmN);
      renderWindowMultiplierTest();
      return;
    }
    var orderTailBtn = e.target.closest("[data-order-tail]");
    if (orderTailBtn) {
      state.orderTail = orderTailBtn.dataset.orderTail;
      lsSet("v2_order_tail", state.orderTail);
      renderOrderLog();
      return;
    }
    var hintOpen = e.target.closest("[data-hint-open]");
    if (hintOpen) {
      attachSimpleWindow(Number(hintOpen.dataset.hintOpen), latest + 1);
      renderOrderHint();
      return;
    }
    var soDel = e.target.closest("[data-so-del]");
    if (soDel) {
      var soId = soDel.dataset.soDel;
      simpleOrdersSave(simpleOrdersLoad().filter(function (r) { return r.id !== soId; }));
      renderOrderLog();
      return;
    }
    if (e.target.closest("[data-so-add]")) {
      var soPeriod = Number(document.getElementById("soPeriod").value);
      var soTail = Number(document.getElementById("soTail").value);
      var soAmount = Number(document.getElementById("soAmount").value);
      if (!Number.isFinite(soPeriod) || soPeriod < 1) { alert("期数不正确"); return; }
      if (!Number.isFinite(soTail) || soTail < 0 || soTail > 9) { alert("号码必须为0-9"); return; }
      if (!Number.isFinite(soAmount) || soAmount <= 0) { alert("下单金额必须大于0"); return; }
      var simpleRows = simpleOrdersLoad();
      var windowStart = attachSimpleWindow(soTail, soPeriod);
      simpleRows.push({
        id: Date.now() + "-" + Math.random().toString(16).slice(2),
        createdAt: new Date().toISOString(),
        period: soPeriod,
        tail: soTail,
        amount: soAmount,
        odds: 1.8,
        windowStart: windowStart,
        result: "pending"
      });
      simpleOrdersSave(simpleRows);
      renderOrderLog();
      return;
    }
    var uoDel = e.target.closest("[data-uo-del]");
    if (uoDel) {
      var uoId = uoDel.dataset.uoDel;
      ultimateOrdersSave(ultimateOrdersLoad().filter(function (r) { return r.id !== uoId; }));
      renderOrderLog();
      return;
    }
    if (e.target.closest("[data-uo-add]")) {
      var mode = document.getElementById("uoMode").value;
      var pos = document.getElementById("uoPos").value;
      var startPeriod = Number(document.getElementById("uoStart").value);
      var tail = Number(document.getElementById("uoTail").value);
      var pattern = document.getElementById("uoPattern").value;
      var base = Number(document.getElementById("uoBase").value);
      var result = document.getElementById("uoResult").value;
      if (!Number.isFinite(startPeriod) || startPeriod < 1) { alert("起始期数不正确"); return; }
      if (!Number.isFinite(tail) || tail < 0 || tail > 9) { alert("尾号必须为0-9"); return; }
      if (!Number.isFinite(base) || base <= 0) { alert("基础金额必须大于0"); return; }
      var rows = ultimateOrdersLoad();
      rows.push({
        id: Date.now() + "-" + Math.random().toString(16).slice(2),
        createdAt: new Date().toISOString(),
        mode: mode,
        position: pos,
        startPeriod: startPeriod,
        tail: tail,
        pattern: pattern,
        base: base,
        result: result
      });
      ultimateOrdersSave(rows);
      renderOrderLog();
      return;
    }
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

  view.addEventListener("change", function (e) {
    var resultSelect = e.target.closest("[data-uo-result]");
    if (!resultSelect) return;
    var id = resultSelect.dataset.uoResult;
    var rows = ultimateOrdersLoad();
    var changed = false;
    rows.forEach(function (row) {
      if (row.id === id) {
        row.result = resultSelect.value;
        changed = true;
      }
    });
    if (changed) {
      ultimateOrdersSave(rows);
      renderOrderLog();
    }
  });

  var validTabs = TABS.map(function (t) { return t.id; });
  var validGroups = NAV_GROUPS.map(function (g) { return g.id; });
  if (validGroups.indexOf(state.group) === -1) state.group = NAV_GROUPS[0].id;
  if (validTabs.indexOf(state.tab) === -1) state.tab = firstTabInGroup(state.group);
  var currentGroup = groupForTab(state.tab) || groupById(state.group) || NAV_GROUPS[0];
  state.group = currentGroup.id;
  lsSet(NAV_GROUP_KEY, state.group);
  lsSet("v2_current_tab", state.tab);
  autoSettleUltimateOrders();
  renderHeader();
  render();
})();
