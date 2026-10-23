(function () {
  "use strict";

  var RAW = window.APP_DATA.raw;
  var D = window.APP_DATA.d;

  var periods = Object.keys(RAW)
    .map(Number)
    .sort(function (a, b) { return a - b; });
  var latest = periods[periods.length - 1];
  var WINDOW_RECORD_FORMAT = "每窗第1/2/3期 · 期号 + 尾号 + 中/错/待开奖 · 最新在左 · 左右滑动";
  var MODEL = window.CAISHEN_MODEL.createModel(RAW);
  var PROB_MODEL = window.CAISHEN_PROBABILITY;

  var byYearPeriod = new Map();
  D.forEach(function (e) {
    byYearPeriod.set(e.y + "-" + e.p, e);
  });
  var DATA_YEARS = D.map(function (row) { return Number(row.y); })
    .filter(function (year, index, list) { return list.indexOf(year) === index; })
    .sort(function (a, b) { return b - a; });

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



  function rateAt(tail, uptoIndex, w) {
    if (uptoIndex < w - 1) return null;
    var c = 0;
    for (var i = uptoIndex - w + 1; i <= uptoIndex; i++) {
      if (hit(periods[i], tail)) c++;
    }
    return c / w;
  }

  var state = {
    tab: lsGet("v2_current_tab", "directory"),
    group: lsGet("v2_nav_group", "recommend"),
    directoryGroup: lsGet("v2_directory_group", null),
    groupHistory: [],
    groupHistoryIndex: -1,
    tabHistoryByGroup: {},
    lastTabByGroup: {},
    window: 15,
    segWindow: 15,
    segTails: 7,
    segCount: 0,
    rollWindow: 10,
    tail: 0,
    year: latest ? rec(2026, latest) ? 2026 : 2026 : 2026,
    missOrderYear: DATA_YEARS[0] || 2026,
    windowMissYear: DATA_YEARS[0] || 2026,
    recordPage: 0,
    orderTail: lsGet("v2_order_tail", "all"),
    windowMultLine: "tail1",
    windowMultN: 2,
    windowMultView: "overview",
    windowMultDetailYears: 1,
    probYear: lsGet("v2_prob_year", null),
    ultimateMode: "number",
    numSearchQuery: "",
    numSearchMode: "all",
    numSearchType: "tail",
    betPlanMode: "three",
    windowMissMode: "three",   // 窗口遗漏热图自己的方案开关（与下注执行表完全独立）
    betLineMode: "all",
    betResearchOpen: false,
  };

  var TABS = [
    { id: "directory", label: "目录" },
    { id: "overview", label: "总览" },
    { id: "dailyreport", label: "每日最终报告" },
    { id: "pick3", label: "动态概率" },
    { id: "betexec", label: "下注执行表" },
    { id: "formulas", label: "公式表" },
    { id: "windowmult", label: "13线规律中心" },
    { id: "orderlog", label: "追三期下单" },
    { id: "segments", label: "分段对比" },
    { id: "missorder", label: "遗漏排序" },
    { id: "windowmiss", label: "窗口遗漏热图" },
    { id: "parity", label: "单双热图" },
    { id: "trend", label: "遗漏热图" },
    { id: "zodtrend", label: "生肖走势" },
    { id: "zodwindow", label: "生肖窗口" },
    { id: "zodmonitor", label: "生肖遗漏" },
    { id: "personality", label: "尾号性格" },
    { id: "datarecord", label: "三期规律" },
    { id: "notes", label: "我的笔记" },
    { id: "tails", label: "冷热分析" },
    { id: "windowk", label: "窗口走势" },
    { id: "zodrecords", label: "生肖开奖" },
    { id: "backtest", label: "策略回测" },
    { id: "numtrend", label: "号码走势" },
    { id: "numsearch", label: "号码搜索" },
  ];

  var NAV_GROUPS = [
    { id: "recommend", label: "模型流程", tabs: ["dailyreport", "pick3", "betexec", "formulas", "windowmult", "orderlog"] },
    { id: "trends", label: "走势总览", tabs: ["overview", "segments", "windowk", "numtrend", "zodtrend"] },
    { id: "miss", label: "遗漏分析", tabs: ["trend", "missorder", "windowmiss", "parity"] },
    { id: "zodiac", label: "生肖专区", tabs: ["zodrecords", "zodwindow", "zodmonitor"] },
    { id: "tools", label: "分析工具", tabs: ["numsearch", "personality", "datarecord", "tails", "backtest", "notes"] },
  ];

  var view = document.getElementById("view");
  var tabsEl = document.getElementById("tabs");



  function pct(x, digits) {
    return (x * 100).toFixed(digits == null ? 1 : digits) + "%";
  }

  // 我的笔记：纯本地保存（只在这台手机/浏览器），随时可加可删
  var NOTE_KEY = "v2_my_notes";
  function escapeHTML(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function notesLoad() {
    try { var a = JSON.parse(lsGet(NOTE_KEY, "[]")); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }
  function notesSave(a) { lsSet(NOTE_KEY, JSON.stringify(a)); }

  // ===== 性能：长表默认只上最近 60 期/窗，数据不删，点“显示全部”再全量渲染 =====
  var PERF_ROWS = 60;
  var perfExpandAll = {};
  function perfRows(key, list, keep) {
    var n = keep || PERF_ROWS;
    if (perfExpandAll[key] || list.length <= n) return list;
    return list.slice(list.length - n);
  }
  function perfMoreBtn(key, total, shown, unit) {
    if (perfExpandAll[key] || total <= shown) return "";
    return '<div class="perf-more-row"><button class="perf-more" type="button" data-perf-more="' + key + '">显示全部 ' + total + (unit || "期") + " · 当前只渲染最近 " + shown + (unit || "期") + "</button></div>";
  }
  function perfResetAll() {
    perfExpandAll = {};
  }

  // ===== 导航自定义排序 =====
  var TAB_ORDER_KEY = "v2_tab_order";
  var NAV_GROUP_KEY = "v2_nav_group";
  var NAV_GROUP_ORDER_KEY = "v2_nav_group_order";
  var NAV_PAGE_GROUPS_KEY = "v2_nav_page_groups";
  var TABLE_COL_ORDER_KEY = "v2_table_col_orders";
  var renderedTab = null;

  function groupById(groupId) {
    for (var i = 0; i < NAV_GROUPS.length; i++) {
      if (NAV_GROUPS[i].id === groupId) return NAV_GROUPS[i];
    }
    return null;
  }

  function getConfiguredGroups() {
    var saved = lsGet(NAV_GROUP_ORDER_KEY, null);

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



  function saveTabOrderIds(ids) {
    lsSet(TAB_ORDER_KEY, ids);
  }

  function savePageGroupMap(map) {
    if (map && typeof map === "object" && !Array.isArray(map)) lsSet(NAV_PAGE_GROUPS_KEY, map);
  }

  function resetTabOrder() {
    try {
      localStorage.removeItem(TAB_ORDER_KEY);
      localStorage.removeItem(NAV_GROUP_ORDER_KEY);
      localStorage.removeItem(NAV_PAGE_GROUPS_KEY);
      localStorage.removeItem(TABLE_COL_ORDER_KEY);
    } catch (e) {}
  }

  function firstTabInGroup(groupId) {
    var tabs = getVisibleTabs(groupId);
    return tabs.length ? tabs[0].id : "overview";
  }

  function persistTabOrderFromDom() {
    var groupIds = [].map.call(tabsEl.querySelectorAll(".nav-subtabs .tab[data-tab]"), function (button) {
      return button.dataset.tab;
    });
    var globalIds = getOrderedAllTabs().map(function (tab) { return tab.id; });
    var positions = [];
    globalIds.forEach(function (id, position) {
      if (groupIds.indexOf(id) >= 0) positions.push(position);
    });
    positions.forEach(function (position, index) { globalIds[position] = groupIds[index]; });
    saveTabOrderIds(globalIds);
  }

  function persistGroupOrderFromDom() {
    var ids = [].map.call(tabsEl.querySelectorAll(".nav-groups .nav-group[data-nav-group]"), function (button) {
      return button.dataset.navGroup;
    });
    if (ids.length) lsSet(NAV_GROUP_ORDER_KEY, ids);
  }

  function closeNavSortDialog(preserveClickGuard) {
    var dialog = document.querySelector("[data-nav-sort-dialog]");
    if (dialog) dialog.remove();
    document.body.classList.remove("nav-sort-dialog-open");
    if (!preserveClickGuard) navDragClickGuard = false;
  }

  function applyNavTabSort(tabId, groupId, position) {
    var group = groupById(groupId);
    if (!group || !TABS.some(function (tab) { return tab.id === tabId; })) return;
    var pageGroups = getPageGroupMap();
    pageGroups[tabId] = groupId;
    savePageGroupMap(pageGroups);
    var ids = getOrderedAllTabs().map(function (tab) { return tab.id; });
    var sourceIndex = ids.indexOf(tabId);
    if (sourceIndex >= 0) ids.splice(sourceIndex, 1);
    var targetIds = ids.filter(function (id) { return pageGroups[id] === groupId; });
    var targetIndex = Math.max(0, Math.min(targetIds.length, position - 1));
    var insertAt = ids.length;
    if (targetIndex < targetIds.length) insertAt = ids.indexOf(targetIds[targetIndex]);
    else if (targetIds.length) insertAt = ids.indexOf(targetIds[targetIds.length - 1]) + 1;
    ids.splice(insertAt, 0, tabId);
    saveTabOrderIds(ids);
    state.group = groupId;
    lsSet(NAV_GROUP_KEY, groupId);
    render();
  }

  function applyNavGroupSort(groupId, position) {
    var ids = getConfiguredGroups().map(function (group) { return group.id; });
    var sourceIndex = ids.indexOf(groupId);
    if (sourceIndex < 0) return;
    ids.splice(sourceIndex, 1);
    ids.splice(Math.max(0, Math.min(ids.length, position - 1)), 0, groupId);
    lsSet(NAV_GROUP_ORDER_KEY, ids);
    render();
  }

  function openNavSortDialog(gesture) {
    closeNavSortDialog(true);
    var kind = gesture.kind;
    var tabId = kind === "tab" ? gesture.target.dataset.tab : null;
    var groupButton = kind === "group" ? gesture.target.querySelector(".nav-group[data-nav-group]") : null;
    var groupId = kind === "group" ? (gesture.groupId || groupButton.dataset.navGroup) : (groupForTab(tabId) || NAV_GROUPS[0]).id;
    var tab = TABS.filter(function (item) { return item.id === tabId; })[0];
    var group = groupById(groupId) || NAV_GROUPS[0];
    var position = kind === "tab"
      ? getVisibleTabs(groupId).map(function (item) { return item.id; }).indexOf(tabId) + 1
      : getConfiguredGroups().map(function (item) { return item.id; }).indexOf(groupId) + 1;
    if (position < 1) position = 1;
    var maxPosition = kind === "tab" ? getVisibleTabs(groupId).length : getConfiguredGroups().length;
    var groupOptions = getConfiguredGroups().map(function (item) {
      return '<option value="' + item.id + '"' + (item.id === groupId ? " selected" : "") + '>' + escapeHTML(item.label) + "</option>";
    }).join("");
    var dialog = document.createElement("div");
    dialog.className = "nav-sort-dialog";
    dialog.setAttribute("data-nav-sort-dialog", "1");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.innerHTML = '<div class="nav-sort-dialog__panel">' +
      '<div class="nav-sort-dialog__head"><b>调整“' + escapeHTML(kind === "tab" ? tab.label : group.label) + '”</b><button class="nav-sort-dialog__close" type="button" data-nav-sort-cancel="1" aria-label="关闭">×</button></div>' +
      (kind === "tab" ? '<label class="nav-sort-field"><span>所属类目</span><select data-nav-sort-group="1">' + groupOptions + '</select></label>' : "") +
      '<label class="nav-sort-field"><span>' + (kind === "tab" ? "类目内顺位" : "一级类目顺位") + '</span><input data-nav-sort-position="1" type="number" inputmode="numeric" min="1" max="' + maxPosition + '" value="' + position + '"></label>' +
      '<div class="nav-sort-dialog__actions"><button class="chip" type="button" data-nav-sort-cancel="1">取消</button><button class="chip nav-sort-dialog__apply" type="button" data-nav-sort-apply="1">应用排序</button></div>' +
      '</div>';
    document.body.appendChild(dialog);
    document.body.classList.add("nav-sort-dialog-open");
    var input = dialog.querySelector("[data-nav-sort-position]");
    var select = dialog.querySelector("[data-nav-sort-group]");
    function syncPosition() {
      if (!select) return;
      var ids = getVisibleTabs(select.value).map(function (item) { return item.id; });
      var nextPosition = ids.indexOf(tabId) + 1;
      if (nextPosition < 1) nextPosition = ids.length + 1;
      input.max = String(ids.length + 1);
      input.value = String(nextPosition);
    }
    if (select) select.addEventListener("change", syncPosition);
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog || e.target.closest("[data-nav-sort-cancel]")) closeNavSortDialog();
    });
    dialog.querySelector("[data-nav-sort-apply]").addEventListener("click", function () {
      var positionValue = parseInt(input.value, 10);
      var maxValue = Math.max(1, parseInt(input.max, 10) || 1);
      positionValue = Math.max(1, Math.min(maxValue, positionValue || maxValue));
      var targetGroupId = select ? select.value : groupId;
      closeNavSortDialog();
      if (kind === "tab") applyNavTabSort(tabId, targetGroupId, positionValue);
      else applyNavGroupSort(groupId, positionValue);
    });
    dialog.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeNavSortDialog();
      if (e.key === "Enter") dialog.querySelector("[data-nav-sort-apply]").click();
    });
    requestAnimationFrame(function () { input.focus(); input.select(); });
  }

  var navDragState = null;
  var navDragClickGuard = false;
  var directoryGroupSortState = null;

  function clearDirectoryGroupSortState() {
    if (directoryGroupSortState && directoryGroupSortState.timer) clearTimeout(directoryGroupSortState.timer);
    directoryGroupSortState = null;
  }

  function startDirectoryGroupSort() {
    var sortState = directoryGroupSortState;
    if (!sortState) return;
    directoryGroupSortState = null;
    navDragClickGuard = true;
    openNavSortDialog({ kind: "group", groupId: sortState.groupId, target: sortState.target });
  }

  view.addEventListener("pointerdown", function (e) {
    if (e.button != null && e.button !== 0) return;
    var card = e.target.closest(".directory-card[data-directory-group]");
    if (!card) return;
    clearDirectoryGroupSortState();
    directoryGroupSortState = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      groupId: card.dataset.directoryGroup,
      target: card,
      timer: null
    };
    directoryGroupSortState.timer = setTimeout(startDirectoryGroupSort, 450);
  }, { passive: true });

  document.addEventListener("pointermove", function (e) {
    var sortState = directoryGroupSortState;
    if (!sortState || e.pointerId !== sortState.pointerId) return;
    if (Math.abs(e.clientX - sortState.startX) > 8 || Math.abs(e.clientY - sortState.startY) > 8) clearDirectoryGroupSortState();
  }, { passive: true });
  document.addEventListener("pointerup", clearDirectoryGroupSortState, true);
  document.addEventListener("pointercancel", clearDirectoryGroupSortState, true);

  function clearNavDragState() {
    if (!navDragState) return;
    if (navDragState.timer) clearTimeout(navDragState.timer);
    if (navDragState.active) navDragState.target.classList.remove("nav-sort-dragging");
    document.body.classList.remove("nav-sorting-active");
    navDragState = null;
  }

  function startNavDrag() {
    var gesture = navDragState;
    if (!gesture) return;
    gesture.active = true;
    gesture.target.classList.add("nav-sort-dragging");
    document.body.classList.add("nav-sorting-active");
    try { gesture.target.setPointerCapture(gesture.pointerId); } catch (e) {}
  }

  function moveNavDrag(e) {
    var gesture = navDragState;
    if (!gesture || e.pointerId !== gesture.pointerId) return;
    var dx = e.clientX - gesture.startX;
    var dy = e.clientY - gesture.startY;
    if (!gesture.active) {
      if (Math.sqrt(dx * dx + dy * dy) > 8) clearNavDragState();
      return;
    }
    e.preventDefault();
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) gesture.moved = true;
    var containerRect = gesture.container.getBoundingClientRect();
    if (e.clientX < containerRect.left + 28) gesture.container.scrollLeft -= 12;
    else if (e.clientX > containerRect.right - 28) gesture.container.scrollLeft += 12;
    var under = document.elementFromPoint(e.clientX, e.clientY);
    if (!under) return;
    if (gesture.kind === "tab") {
      var candidate = under.closest(".tab[data-tab]");
      if (!candidate || candidate === gesture.target || candidate.parentElement !== gesture.container) return;
      var targetRect = candidate.getBoundingClientRect();
      gesture.container.insertBefore(gesture.target, e.clientX > targetRect.left + targetRect.width / 2 ? candidate.nextSibling : candidate);
    } else {
      var candidateWrap = under.closest(".nav-group-wrap");
      if (!candidateWrap || candidateWrap === gesture.target || candidateWrap.parentElement !== gesture.container) return;
      var wrapRect = candidateWrap.getBoundingClientRect();
      gesture.container.insertBefore(gesture.target, e.clientX > wrapRect.left + wrapRect.width / 2 ? candidateWrap.nextSibling : candidateWrap);
    }
  }

  function endNavDrag(e) {
    var gesture = navDragState;
    if (!gesture || (e && e.pointerId !== gesture.pointerId)) return;
    if (!gesture.active) {
      clearNavDragState();
      return;
    }
    gesture.target.classList.remove("nav-sort-dragging");
    document.body.classList.remove("nav-sorting-active");
    navDragClickGuard = true;
    var done = gesture;
    navDragState = null;
    if (done.timer) clearTimeout(done.timer);
    if (!done.moved) {
      openNavSortDialog(done);
      return;
    }
    setTimeout(function () { navDragClickGuard = false; }, 450);
    if (gesture.kind === "tab") persistTabOrderFromDom();
    else persistGroupOrderFromDom();
  }

  tabsEl.addEventListener("pointerdown", function (e) {
    if (e.button != null && e.button !== 0) return;
    var tabButton = e.target.closest(".tab[data-tab]");
    var groupButton = e.target.closest(".nav-group[data-nav-group]");
    var target = tabButton || groupButton;
    if (!target) return;
    var kind = tabButton ? "tab" : "group";
    var container = kind === "tab"
      ? target.closest(".nav-subtabs")
      : target.closest(".nav-groups");
    if (!container) return;
    var dragTarget = kind === "tab" ? target : target.closest(".nav-group-wrap");
    clearNavDragState();
    navDragState = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      kind: kind,
      target: dragTarget,
      container: container,
      active: false,
      moved: false,
      timer: null
    };
    navDragState.timer = setTimeout(startNavDrag, 450);
  }, { passive: true });
  document.addEventListener("pointermove", moveNavDrag, { passive: false });
  document.addEventListener("pointerup", endNavDrag, true);
  document.addEventListener("pointercancel", endNavDrag, true);
  tabsEl.addEventListener("contextmenu", function (e) {
    if (navDragState || navDragClickGuard) e.preventDefault();
  });

  var tableDragState = null;
  var tableOrderObserver = null;

  function tableColumnOrdersLoad() {
    var saved = lsGet(TABLE_COL_ORDER_KEY, {});
    return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
  }

  function tableColumnOrdersSave(orders) {
    lsSet(TABLE_COL_ORDER_KEY, orders);
  }

  function tableBodyRows(table) {
    var rows = [];
    [].forEach.call(table.tBodies || [], function (body) {
      [].forEach.call(body.rows, function (row) { rows.push(row); });
    });
    return rows;
  }

  function normalizedColumnOrder(order, count) {
    if (!Array.isArray(order) || order.length !== count) return null;
    var seen = {};
    for (var i = 0; i < order.length; i++) {
      var value = Number(order[i]);
      if (!Number.isInteger(value) || value < 0 || value >= count || seen[value]) return null;
      seen[value] = true;
    }
    return order.map(Number);
  }

  function reorderTableColumns(table, order) {
    var header = table.tHead && table.tHead.rows[0];
    if (!header) return;
    var headerMap = {};
    [].forEach.call(header.cells, function (cell) {
      if (cell.dataset.colOriginal != null) headerMap[cell.dataset.colOriginal] = cell;
    });
    order.forEach(function (original) {
      if (headerMap[original]) header.appendChild(headerMap[original]);
    });
    tableBodyRows(table).forEach(function (row) {
      var cellMap = {};
      [].forEach.call(row.cells, function (cell) {
        if (cell.dataset.colOriginal != null) cellMap[cell.dataset.colOriginal] = cell;
      });
      order.forEach(function (original) {
        if (cellMap[original]) row.appendChild(cellMap[original]);
      });
    });
  }

  function prepareTableColumns(table, tableIndex) {
    if (!table || table.dataset.colsPrepared === "1") return;
    if (!table.tHead || table.tHead.rows.length !== 1) return;
    var header = table.tHead.rows[0];
    var headerCells = [].slice.call(header.cells);
    if (headerCells.length < 3) return;
    if (headerCells.some(function (cell) { return cell.colSpan > 1 || cell.rowSpan > 1; })) return;
    var rows = tableBodyRows(table);
    if (rows.some(function (row) {
      return row.cells.length !== headerCells.length || [].some.call(row.cells, function (cell) {
        return cell.colSpan > 1 || cell.rowSpan > 1;
      });
    })) return;
    headerCells.forEach(function (cell, index) { cell.dataset.colOriginal = String(index); });
    rows.forEach(function (row) {
      [].forEach.call(row.cells, function (cell, index) { cell.dataset.colOriginal = String(index); });
    });
    table.dataset.colsPrepared = "1";
    table.dataset.colOrderKey = state.tab + ":" + tableIndex;
    table.classList.add("table-cols-draggable");
    var orders = tableColumnOrdersLoad();
    var saved = normalizedColumnOrder(orders[table.dataset.colOrderKey], headerCells.length);
    if (saved && saved[0] === 0) reorderTableColumns(table, saved);
  }

  function applySavedTableColumnOrders() {
    if (tableDragState && tableDragState.active) return;
    var orders = tableColumnOrdersLoad();
    [].forEach.call(view.querySelectorAll("table"), function (table, index) {
      prepareTableColumns(table, index);
      var key = table.dataset.colOrderKey;
      if (!key || table.dataset.colsPrepared !== "1") return;
      var order = normalizedColumnOrder(orders[key], table.tHead.rows[0].cells.length);
      if (order && order[0] === 0) reorderTableColumns(table, order);
    });
  }

  function clearTableDrag() {
    if (!tableDragState) return;
    if (tableDragState.timer) clearTimeout(tableDragState.timer);
    if (tableDragState.active) tableDragState.target.classList.remove("table-col-dragging");
    document.body.classList.remove("table-sorting-active");
    tableDragState = null;
  }

  function startTableDrag() {
    if (!tableDragState) return;
    tableDragState.active = true;
    tableDragState.target.classList.add("table-col-dragging");
    document.body.classList.add("table-sorting-active");
    try { tableDragState.target.setPointerCapture(tableDragState.pointerId); } catch (e) {}
  }

  function moveTableDrag(e) {
    var gesture = tableDragState;
    if (!gesture || e.pointerId !== gesture.pointerId) return;
    var dx = e.clientX - gesture.startX;
    var dy = e.clientY - gesture.startY;
    if (!gesture.active) {
      if (Math.sqrt(dx * dx + dy * dy) > 8) clearTableDrag();
      return;
    }
    e.preventDefault();
    var under = document.elementFromPoint(e.clientX, e.clientY);
    var candidate = under && under.closest("th");
    if (!candidate || candidate === gesture.target || candidate.closest("table") !== gesture.table) return;
    if (Number(candidate.dataset.colOriginal) <= 0) return;
    var draggedOriginal = gesture.target.dataset.colOriginal;
    var candidateOriginal = candidate.dataset.colOriginal;
    var candidateRect = candidate.getBoundingClientRect();
    var after = e.clientX > candidateRect.left + candidateRect.width / 2;
    function moveRow(row) {
      var dragged = row.querySelector('[data-col-original="' + draggedOriginal + '"]');
      var target = row.querySelector('[data-col-original="' + candidateOriginal + '"]');
      if (!dragged || !target) return;
      row.insertBefore(dragged, after ? target.nextSibling : target);
    }
    moveRow(gesture.table.tHead.rows[0]);
    tableBodyRows(gesture.table).forEach(moveRow);
  }

  function endTableDrag(e) {
    var gesture = tableDragState;
    if (!gesture || (e && e.pointerId !== gesture.pointerId)) return;
    if (!gesture.active) {
      clearTableDrag();
      return;
    }
    var order = [].map.call(gesture.table.tHead.rows[0].cells, function (cell) {
      return Number(cell.dataset.colOriginal);
    });
    var orders = tableColumnOrdersLoad();
    orders[gesture.table.dataset.colOrderKey] = order;
    tableColumnOrdersSave(orders);
    gesture.target.classList.remove("table-col-dragging");
    document.body.classList.remove("table-sorting-active");
    if (gesture.timer) clearTimeout(gesture.timer);
    tableDragState = null;
  }

  view.addEventListener("pointerdown", function (e) {
    if (e.button != null && e.button !== 0) return;
    var th = e.target.closest("th");
    var table = th && th.closest("table");
    if (!table || table.dataset.colsPrepared !== "1") return;
    if (Number(th.dataset.colOriginal) <= 0) return;
    clearTableDrag();
    tableDragState = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      target: th,
      table: table,
      active: false,
      timer: null
    };
    tableDragState.timer = setTimeout(startTableDrag, 450);
  }, { passive: true });
  document.addEventListener("pointermove", moveTableDrag, { passive: false });
  document.addEventListener("pointerup", endTableDrag, true);
  document.addEventListener("pointercancel", endTableDrag, true);
  view.addEventListener("contextmenu", function (e) {
    if (tableDragState || e.target.closest("th")) e.preventDefault();
  });
  tableOrderObserver = new MutationObserver(function () {
    requestAnimationFrame(applySavedTableColumnOrders);
  });
  tableOrderObserver.observe(view, { childList: true });


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
    var directoryActive = state.tab === "directory";
    var groupHtml = "";
    if (directoryActive) {
      groupHtml = '<button class="nav-group nav-group--directory is-active" type="button" data-directory="1">目录</button>';
    } else {
      groupHtml = "";
    }
    var tabs = directoryActive ? [] : getVisibleTabs(group.id);
    var tabsHtml = tabs.map(function (t) {
      return '<button class="tab ' + (state.tab === t.id ? "is-active" : "") +
        '" type="button" data-tab="' + t.id + '">' + t.label + "</button>";
    }).join("");
    if (!directoryActive) {
      tabsHtml = '<button class="tab nav-back-tab" type="button" data-directory="1">← 返回目录</button>' + tabsHtml;
    }

    tabsHtml += '<button class="tab sort-reset nav-sort-reset" type="button" data-sort-reset="1">恢复默认</button>';

    tabsEl.classList.remove("sorting");
    tabsEl.innerHTML = (groupHtml ? '<div class="nav-groups">' + groupHtml + '</div>' : "") +
      '<div class="nav-subtabs">' + tabsHtml + "</div>";
    var nextGroups = tabsEl.querySelector(".nav-groups");
    var nextSubtabs = tabsEl.querySelector(".nav-subtabs");
    if (nextGroups) nextGroups.scrollLeft = groupScroll;
    if (nextSubtabs) nextSubtabs.scrollLeft = tabScroll;
    requestAnimationFrame(function () {
      nudgeNavItem(nextGroups, nextGroups && nextGroups.querySelector(".nav-group.is-active"));
      nudgeNavItem(nextSubtabs, nextSubtabs && nextSubtabs.querySelector(".tab.is-active"));
    });
  }





  function modelPairStrip(period) {
    if (!PROB_MODEL || !PROB_MODEL.analyze) return "";
    var result = PROB_MODEL.analyze(RAW, period - 1);
    var picks = result.top || [];
    var labels = result.legacyLocked
      ? ["锁定第1 · 296快照", "锁定第2 · 296快照", "锁定第3 · 296快照"]
      : ["三期第1 · 正式", "三期第2 · 正式", "三期第3 · 正式"];
    var tones = ["model-pair-card--p1", "model-pair-card--p2", "model-pair-card--p3"];
    return '<div class="model-pair-grid">' +
      picks.map(function (row, index) {
        return '<div class="model-pair-card ' + tones[index] + '"><span>' + labels[index] + '</span><b>尾' + row.tail + '</b><small>下期 ' + (row.nextProb * 100).toFixed(1) + '% · 三期 ' + (row.window3Prob * 100).toFixed(1) + '%</small></div>';
      }).join("") +
      (result.ambiguous ? '<div class="model-pair-note">前三名概率接近，当前排序不代表明显强弱</div>' : '') +
      '</div>';
  }

  function renderHeader() {
    document.getElementById("latestPeriod").textContent = latest;
    document.getElementById("latestTails").textContent = "尾 " + tailsOf(latest).join(" ");
  }





  function rememberGroup(groupId) {
    if (!groupId) return;
    var history = state.groupHistory;
    var index = state.groupHistoryIndex;
    if (history[index] === groupId) return;
    history = history.slice(0, index + 1);
    history.push(groupId);
    if (history.length > 40) {
      history = history.slice(history.length - 40);
    }
    state.groupHistory = history;
    state.groupHistoryIndex = history.length - 1;
  }

  function rememberTabInGroup(groupId, tabId) {
    if (!groupId || !tabId) return;
    var history = state.tabHistoryByGroup[groupId];
    if (!history) {
      history = { tabs: [], index: -1 };
      state.tabHistoryByGroup[groupId] = history;
    }
    if (history.tabs[history.index] === tabId) {
      state.lastTabByGroup[groupId] = tabId;
      return;
    }
    var tabs = history.tabs.slice(0, history.index + 1);
    tabs.push(tabId);
    if (tabs.length > 40) tabs = tabs.slice(tabs.length - 40);
    history.tabs = tabs;
    history.index = tabs.length - 1;
    state.lastTabByGroup[groupId] = tabId;
  }

  function orderedGroupAt(delta) {
    var groups = getConfiguredGroups();
    var index = -1;
    for (var i = 0; i < groups.length; i++) {
      if (groups[i].id === state.group) {
        index = i;
        break;
      }
    }
    if (index < 0) return null;
    return groups[index + delta] || null;
  }

  function orderedTabAt(delta) {
    var tabs = getVisibleTabs(state.group);
    var index = -1;
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].id === state.tab) {
        index = i;
        break;
      }
    }
    if (index < 0) return null;
    return tabs[index + delta] || null;
  }



  function stepGroupHistory(delta) {
    var group = orderedGroupAt(delta);
    if (!group) return;
    state.group = group.id;
    rememberGroup(state.group);
    if (state.tab !== "directory") {
      state.tab = firstTabInGroup(group.id);
      rememberTabInGroup(state.group, state.tab);
    }
    lsSet("v2_current_tab", state.tab);
    lsSet(NAV_GROUP_KEY, state.group);
    render();
  }

  var WM_VIEW_ORDER = ["overview", "windows", "personality", "formula", "years"];
  function stepWindowMultView(delta) {
    var current = state.windowMultView || "overview";
    var index = WM_VIEW_ORDER.indexOf(current);
    if (index < 0) index = 0;
    var next = WM_VIEW_ORDER[index + delta];
    if (!next) return;
    state.windowMultView = next;
    renderWindowMultiplierTest();
  }

  function stepTabHistory(delta) {
    if (state.tab === "directory") return;
    var tab = orderedTabAt(delta);
    if (!tab) return;
    state.tab = tab.id;
    rememberTabInGroup(state.group, state.tab);
    lsSet("v2_current_tab", state.tab);
    render();
  }

  function historyStackHTML() {
    return "";
  }

  // 一次遍历同时判断滚动条、横向容器和最内层滚动元素，避免每次触摸重复扫描三遍。
  function horizontalGestureInfoAt(e) {
    var el = e.target;
    var info = {
      onVerticalScrollbar: false,
      inHorizontalScroll: false
    };
    while (el && el.nodeType === 1 && el !== document.documentElement) {
      var hasX = el.scrollWidth > el.clientWidth + 1;
      var hasY = el.scrollHeight > el.clientHeight + 1;
      if (hasX || hasY) {
        var style = window.getComputedStyle(el);
        var xScroll = hasX && /(auto|scroll)/.test(style.overflowX);
        var yScroll = hasY && /(auto|scroll)/.test(style.overflowY);
        if (xScroll || yScroll) {
          var rect = el.getBoundingClientRect();
          if (xScroll) {
            info.inHorizontalScroll = true;
          }
          if (yScroll && e.clientX >= rect.left + el.clientWidth) info.onVerticalScrollbar = true;
        }
      }
      el = el.parentElement;
    }
    return info;
  }

  function horizontalWheelTargetAt(e) {
    var el = e.target;
    while (el && el.nodeType === 1 && el !== document.documentElement) {
      var hasX = el.scrollWidth > el.clientWidth + 1;
      var hasY = el.scrollHeight > el.clientHeight + 1;
      if (hasX) {
        var style = window.getComputedStyle(el);
        var xScroll = /(auto|scroll)/.test(style.overflowX);
        var yScroll = hasY && /(auto|scroll)/.test(style.overflowY);
        if (xScroll) {
          // 横向容器内部若还有独立纵向滚动，优先让容器自己处理。
          return yScroll ? null : el;
        }
      }
      el = el.parentElement;
    }
    return null;
  }

  function verticalWheelScrollsPage(e) {
    if (e.ctrlKey || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return false;
    if (!horizontalWheelTargetAt(e)) return false;
    var amount = e.deltaMode === 1 ? e.deltaY * 16 : (e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY);
    e.preventDefault();
    window.scrollTo(0, window.scrollY + amount);
    return true;
  }

  document.documentElement.addEventListener("wheel", verticalWheelScrollsPage, { capture: true, passive: false });

  function parseSearchNumbers(text, minValue, maxValue) {
    var seen = {};
    var rawValues = state.numSearchType === "tail"
      ? (String(text || "").match(/[0-9]/g) || [])
      : String(text || "").split(/[^0-9]+/);
    return rawValues.map(function (value) {
      return Number(value);
    }).filter(function (value) {
      if (!Number.isInteger(value) || value < minValue || value > maxValue || seen[value]) return false;
      seen[value] = true;
      return true;
    }).sort(function (a, b) { return a - b; });
  }

  function recordSearchValues(record, type) {
    if (type !== "tail") return (record.nums || []).slice();
    var tails = [];
    (record.nums || []).forEach(function (number) {
      var tail = number % 10;
      if (tails.indexOf(tail) < 0) tails.push(tail);
    });
    return tails.sort(function (a, b) { return a - b; });
  }

  function numSearchResultsHTML() {
    var isTail = state.numSearchType === "tail";
    var selected = parseSearchNumbers(state.numSearchQuery, isTail ? 0 : 1, isTail ? 9 : 49);
    if (!selected.length) return '<div class="numsearch-empty">请输入 ' + (isTail ? "0-9 尾号" : "1-49 号码") + '</div>';
    var rows = D.filter(function (record) {
      var values = recordSearchValues(record, state.numSearchType);
      if (state.numSearchMode === "exact") {
        return values.length === selected.length && selected.every(function (value) { return values.indexOf(value) >= 0; });
      }
      if (state.numSearchMode === "any") {
        return selected.some(function (value) { return values.indexOf(value) >= 0; });
      }
      return selected.every(function (value) { return values.indexOf(value) >= 0; });
    });
    if (!rows.length) return '<div class="numsearch-empty">没有找到相同记录</div>';
    var html = '<div class="section"><div class="section__head"><h2 class="section__title">搜索结果</h2><span class="section__hint">共 ' + rows.length + ' 期</span></div></div>';
    html += '<div class="panel"><div class="panel__body numsearch-results"><table class="table"><thead><tr><th>期数</th><th>号码</th><th>命中' + (isTail ? "尾号" : "号码") + '</th><th>尾数</th><th>生肖</th></tr></thead><tbody>';
    rows.slice().reverse().forEach(function (record) {
      var nums = record.nums || [];
      var zods = record.zods || [];
      var values = recordSearchValues(record, state.numSearchType);
      var hits = values.filter(function (value) { return selected.indexOf(value) >= 0; });
      var tails = recordSearchValues(record, "tail");
      html += '<tr><td><b>' + record.p + '</b></td><td>' + nums.join(" ") + '</td><td><b style="color:#2563eb">' + hits.join(" ") + '</b></td><td>' + tails.sort(function (a, b) { return a - b; }).join(" ") + '</td><td>' + zods.join(" ") + '</td></tr>';
    });
    html += '</tbody></table></div></div>';
    return html;
  }

  function renderNumSearch() {
    var typeButtons = [
      ["num", "号码"],
      ["tail", "尾号"]
    ].map(function (item) {
      return '<button class="chip numsearch-type' + (state.numSearchType === item[0] ? " is-active" : "") + '" type="button" data-numsearch-type="' + item[0] + '">' + item[1] + '</button>';
    }).join("");
    var modeButtons = [
      ["all", "全部包含"],
      ["any", "任意包含"],
      ["exact", "完全一致"]
    ].map(function (item) {
      return '<button class="chip numsearch-mode' + (state.numSearchMode === item[0] ? " is-active" : "") + '" type="button" data-numsearch-mode="' + item[0] + '">' + item[1] + '</button>';
    }).join("");
    var html = '<div class="section"><div class="section__head"><h2 class="section__title">号码搜索</h2><span class="section__hint">输入号码后搜索历史开奖记录</span></div></div>';
    html += '<div class="section"><div class="panel"><div class="panel__body numsearch-toolbar">';
    html += '<input class="numsearch-input" id="numSearchInput" data-numsearch-input="1" type="text" placeholder="' + (state.numSearchType === "tail" ? "例如：0359 或 0 3 5 9" : "例如：01 03 05 20") + '" value="' + String(state.numSearchQuery || "").replace(/"/g, "&quot;") + '">';
    html += '<button class="chip" type="button" data-numsearch-run="1">搜索</button>';
    html += '</div><div class="numsearch-modes">' + typeButtons + '</div><div class="numsearch-modes">' + modeButtons + '</div></div></div>';
    html += '<div id="numSearchResults">' + numSearchResultsHTML() + '</div>';
    view.innerHTML = html;
  }

  function renderDirectory() {
    var groups = getConfiguredGroups();
    var activeGroup = state.directoryGroup ? groupById(state.directoryGroup) : null;
    if (activeGroup) {
      var tabs = getVisibleTabs(activeGroup.id);
      var activeGroupHtml = '<div class="section"><div class="section__head"><h2 class="section__title">目录 · ' + activeGroup.label + '</h2><span class="section__hint">选择二级页面</span></div></div>';
      activeGroupHtml += '<div style="margin-bottom:10px"><button class="chip" type="button" data-directory-home="1">← 主目录</button></div>';
      activeGroupHtml += '<div class="directory-grid">';
      tabs.forEach(function (tab, index) {
        activeGroupHtml += '<button class="directory-card directory-card--tab" type="button" data-directory-tab="' + tab.id + '">';
        activeGroupHtml += '<span class="directory-card__index">' + (index + 1) + '</span>';
        activeGroupHtml += '<b>' + tab.label + '</b>';
        activeGroupHtml += '<span class="directory-card__pages">进入页面</span>';
        activeGroupHtml += '</button>';
      });
      activeGroupHtml += '</div>';
      view.innerHTML = activeGroupHtml;
      return;
    }
    var active = groupById(state.group) || groups[0];
    var homeHtml = '<div class="section"><div class="section__head"><h2 class="section__title">目录</h2><span class="section__hint">选择一级类目，进入该类目的页面目录</span></div></div>';
    homeHtml += '<div class="directory-grid">';
    groups.forEach(function (group, index) {
      var tabs = getVisibleTabs(group.id);
      homeHtml += '<button class="directory-card' + (group.id === active.id ? " is-active" : "") + '" type="button" data-directory-group="' + group.id + '">';
      homeHtml += '<span class="directory-card__index">' + (index + 1) + '</span>';
      homeHtml += '<b>' + group.label + '</b>';
      homeHtml += '<span class="directory-card__pages">' + tabs.map(function (tab) { return tab.label; }).join(" · ") + '</span>';
      homeHtml += '</button>';
    });
    homeHtml += '</div>';
    view.innerHTML = homeHtml;
  }

  function scrollToLatest() {
    if (state.tab === "pick3" || state.tab === "selector" || state.tab === "chasenumber" || state.tab === "chaserecommend" || state.tab === "orderlog") return;
    // 窗口遗漏热图：切页会先回顶，等布局完成后再把“最新”行滚到可视区底部，
    // 只滚到最新记录，不再把整页滚到最底下。
    if (state.tab === "windowmiss") {
      var jumpLatest = function () {
        var heat = view.querySelector(".panel--wmheat .heatmap");
        var latestRow = view.querySelector(".panel--wmheat tbody tr:last-child");
        if (heat) heat.scrollTop = heat.scrollHeight;
        if (latestRow) latestRow.scrollIntoView({ block: "end", inline: "nearest" });
      };
      requestAnimationFrame(function () { jumpLatest(); setTimeout(jumpLatest, 60); });
      return;
    }
    var sc = view.querySelector(".trend-scroll, .heatmap, .seg-hist-scroll");
    if (sc) {
      sc.scrollTop = sc.scrollHeight;
      return;
    }
    var lastRecord = view.querySelector(".record:last-child");
    if (lastRecord) lastRecord.scrollIntoView({ block: "end" });
  }

  function render() {
    if (state.tab === "selector" || state.tab === "chasenumber" || state.tab === "chaserecommend") state.tab = "pick3";
    // 「执行提示」「资金调度」已并入「下注执行表」：老入口一律转到主页面
    if (state.tab === "orderhint" || state.tab === "funds") {
      state.tab = "betexec";
      lsSet("v2_current_tab", state.tab);
    }
    if (state.tab === "miss") {
      state.tab = "trend";
      lsSet("v2_current_tab", state.tab);
    }
    var tabChanged = state.tab !== renderedTab;
    // 给 body 打上当前页面标记，方便按页面单独定尺寸（不同页面内容不一样，不能一刀切）
    document.body.dataset.page = state.tab;
    renderTabs();
    if (state.tab === "directory") renderDirectory();
    else if (state.tab === "overview") renderOverview();
    else if (state.tab === "dailyreport") renderDailyReport();
    else if (state.tab === "tails") renderTails();
    else if (state.tab === "segments") renderSegments();
    else if (state.tab === "trend") renderTrend();
    else if (state.tab === "windowmiss") renderWindowMiss();
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
    else if (state.tab === "pick3") renderProbabilityModel();
    else if (state.tab === "betexec") renderBetExec();
    else if (state.tab === "formulas") renderFormulaTable();
    else if (state.tab === "windowmult") renderWindowMultiplierTest();
    else if (state.tab === "orderlog") renderOrderLog();
    else if (state.tab === "personality") renderPersonality();
    else if (state.tab === "datarecord") renderDataRecord();
    else if (state.tab === "notes") renderNotes();
    else if (state.tab === "numsearch") renderNumSearch();
    var pagePrefix = historyStackHTML();
    if (state.tab !== "directory" && view.innerHTML && view.innerHTML.indexOf('class="model-pair-grid"') < 0) {
      pagePrefix += modelPairStrip(latest + 1);
    }
    if (pagePrefix) view.innerHTML = pagePrefix + view.innerHTML;
    applySavedTableColumnOrders();
    scrollToLatest();
    if (tabChanged) {
      renderedTab = state.tab;
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
    if (state.tab === "trend" || state.tab === "missorder") {
      requestAnimationFrame(function () {
        view.querySelectorAll(".trend-run-strip").forEach(function (strip) {
          strip.scrollLeft = 0;
        });
      });
    }
  }

  var PAGE_GUIDE_GROUPS = [
    {
      title: "模型与执行",
      desc: "这一组是每天真正用来选号、排仓、跟窗口和记录下单的页面。",
      items: [
        {
          name: "每日最终报告",
          summary: "把13条线在下注执行表、公式表、13线规律中心、窗口遗漏热图、尾号性格和动态概率里的分析综合成一份每日报告。",
          look: ["13线综合优秀度排名", "每条线的建议、推荐理由和风险", "当前窗口、近期、年度、公式仓位和新方法权重"],
          use: "每天先看这一页，直接知道哪条线值得关注、为什么、当前能不能执行。",
          source: "真实开奖窗口、真实快照、公式审计、年度统计、尾号性格和概率模型记录。",
          note: "综合分不按金额排序；结论只解释真实数据，概率三条线继续标明296期旧快照边界。"
        },
        {
          name: "动态概率",
          summary: "按5/7/15/21/30五个期数窗口分别训练权重，以完整三期内概率排序10个尾号；旧D1/D2退出正式推荐。",
          look: ["10个尾号三期概率和下一期概率", "5/7/15/21/30独立权重", "当前遗漏、连出和置信度"],
          use: "先看概率候选，再进入下注执行表检查真实窗口和仓位。",
          source: "2021-2024训练、2025验证、2026影子记录；只使用目标期之前的数据。",
          note: "用户已要求切换到新方法；2025验证段仍弱于旧方法，页面继续保留风险提示，已锁定的296期快照不改写。"
        },
        {
          name: "下注执行表",
          summary: "原来的「执行提示」和「资金调度」已经并进这一页：一条节奏链条走完，① 选方向 ② 选号 ③ 定轻重。",
          look: ["节奏链条：① 线方向（性格）→ ② 窗口选号 → ③ 第几期定轻重", "选号参考表：13条独立线路一屏对比，自己挑2-3条下", "今日规划：今天每一注的线路+尾号+金额+第几期", "每条线当前窗口第1/2/3期明细 + 对错滚动记录"],
          use: "下单前只看这一页：先按性格挑线，再看窗口锁尾号，最后按方案金额下单。",
          source: "公式表逐线公式、真实开奖窗口、开奖前真实快照。",
          note: "只提示不自动下单；不锚定本金，金额按公式表取当前窗口第几期；窗口等待和开窗等待是两种不同状态。"
        },
        {
          name: "公式表",
          summary: "正式执行公式的唯一来源，写清每条线第1、2、3期下多少。",
          look: ["每条线正式公式金额", "训练段和验证段结果", "配仓或未配仓状态"],
          use: "核查下注执行表是不是按正式公式在走。",
          source: "真实历史窗口回测、训练段和验证段结果。",
          note: "公式表目前是稳定版本，不会每天自动改；今年最优只作参考，不能冒充正式公式。"
        },
        {
          name: "13线规律中心",
          summary: "13条线各自的数据规律与窗口性格：逐条列出每个窗口第1/2/3期的命中或全错，比较不同倍率的收益、风险和逐年表现，并给出窗口级性格与重投/倍投参考建议。",
          look: ["当前有仓位的正式执行线路", "今年最优、年度稳健最优", "逐年收益、全错窗口和连续全错概率"],
          use: "研究公式有没有优化空间，比较不同年份是否稳定。",
          source: "真实窗口、真实开奖结果、公式表正式线计划。",
          note: "正式执行仓位只认公式表；倍投测试里的其他倍率只用于研究和对比。"
        },
        {
          name: "追三期下单",
          summary: "只记录你实际下单的号码、期数、倍率、结算和收益。",
          look: ["每个订单的历史轨迹", "下单金额、倍率、命中结果", "实际投入和实际收益"],
          use: "做真实执行账本，不负责推荐号，也不跟模型混在一起。",
          source: "本机真实下单记录。",
          note: "这里只记账和结算，不产生模型结论，不自动替你下注。"
        }
      ]
    },
    {
      title: "数据与走势",
      desc: "这一组用来查看历史开奖、冷热、遗漏、分段和号码走势。",
      items: [
        {
          name: "总览",
          summary: "一页看最新一期、近期冷热、遗漏和重点变化。",
          look: ["最新期号码和尾数", "近期最热、最冷尾号", "遗漏重点和走势摘要"],
          use: "每天打开先看总览，再决定深入哪一页。",
          source: "lottery_data.json、data.js、号码走势图.html。",
          note: "总览只展示真实开奖数据，不产生正式下注公式。"
        },
        {
          name: "分段对比",
          summary: "把历史拆成不同时间段，比较冷热和命中变化。",
          look: ["不同时间段的开出频率", "分段前后的变化", "各尾号的稳定性"],
          use: "判断一个规律是不是只在某一段时间有效。",
          source: "真实历史开奖数据。",
          note: "分段样本太短时只能参考，不能当稳定规律。"
        },
        {
          name: "窗口分析",
          summary: "看固定窗口里各个尾号的开出情况和偏热偏冷。",
          look: ["当前窗口开出次数", "窗口内偏热、偏冷号码", "窗口逐期记录"],
          use: "比较短窗口里的变化，不替代正式窗口账本。",
          source: "真实历史开奖数据。",
          note: "窗口分析是观察工具，不自动生成下单金额。"
        },
        {
          name: "号码走势",
          summary: "按号码看历史走势、遗漏和最近出现位置。",
          look: ["每个号码的逐期走势", "遗漏、连出和开出频率", "最近变化"],
          use: "研究具体号码的走势。",
          source: "真实历史开奖数据。",
          note: "走势只展示历史，不保证未来。"
        },
        {
          name: "生肖走势",
          summary: "按生肖查看历史走势和生肖整体变化。",
          look: ["生肖开出位置", "生肖遗漏和连出", "每年太岁生肖差异"],
          use: "研究生肖规律时使用，注意按农历立春划分年份。",
          source: "真实历史开奖数据和生肖换算。",
          note: "生肖每年会变化，跨年比较必须分开看。"
        },
        {
          name: "遗漏热图",
          summary: "用热图直接看哪些尾号长期没出、哪些刚出过。",
          look: ["遗漏长度", "冷热颜色", "历史遗漏分布"],
          use: "快速发现长期遗漏和集中开出区域。",
          source: "真实历史开奖数据。",
          note: "遗漏长不等于马上会出，不能只看一个指标。"
        },
        {
          name: "遗漏排序",
          summary: "把遗漏、连出和排序集中到一张表。",
          look: ["遗漏排序", "连出排序", "近期开出次数"],
          use: "快速比较尾号当前冷热状态。",
          source: "真实历史开奖数据。",
          note: "排序是辅助观察，不能单独当模型。"
        },
        {
          name: "单双热图",
          summary: "查看单双、大小或奇偶类指标的历史热图。",
          look: ["热图颜色", "连续开出", "冷热变化"],
          use: "观察整体分布是否偏斜。",
          source: "真实历史开奖数据。",
          note: "整体形态只作辅助。"
        },
        {
          name: "冷热分析",
          summary: "看每个尾号近期到底是热、冷还是正常。",
          look: ["近5期、近15期开出数", "冷热标签", "当前遗漏和连出"],
          use: "快速筛出近期偏热和偏冷的号码。",
          source: "真实历史开奖数据。",
          note: "冷热只是近期状态，不等于正式推荐。"
        }
      ]
    },
    {
      title: "生肖专区",
      desc: "这一组专门看生肖记录、生肖窗口和生肖遗漏。",
      items: [
        {
          name: "生肖记录",
          summary: "记录每期实际开出的生肖和历史变化。",
          look: ["每期生肖", "开出频率", "生肖历史记录"],
          use: "查看历史生肖数据和对应年份。",
          source: "真实开奖号码、生肖换算。",
          note: "年份边界按立春，不按公历1月1日。"
        },
        {
          name: "生肖窗口",
          summary: "看当前生肖窗口里哪些生肖偏热、偏冷。",
          look: ["窗口内生肖开出情况", "偏热偏冷", "逐期记录"],
          use: "研究短窗口生肖变化。",
          source: "真实历史开奖数据。",
          note: "生肖数量和各尾号权重不同，不能直接照搬尾号结论。"
        },
        {
          name: "生肖遗漏",
          summary: "看生肖当前遗漏和历史遗漏。",
          look: ["当前遗漏", "最高遗漏", "遗漏排名"],
          use: "观察生肖长期冷热。",
          source: "真实历史开奖数据。",
          note: "生肖遗漏只作观察。"
        }
      ]
    },
    {
      title: "工具与验证",
      desc: "这一组是性格分析、历史回测和页面说明。",
      items: [
        {
          name: "尾号性格",
          summary: "看每个尾号是偏反弹型、惯性型还是普通型。",
          look: ["当前遗漏和连出", "近5期、近15期", "反弹性格、惯性性格和当前判断"],
          use: "判断当前走势更像延续还是回补。",
          source: "真实历史开奖数据和模型性格阈值。",
          note: "性格判断是辅助，不直接生成正式下注金额。"
        },
        {
          name: "三期规律",
          summary: "专门看号码在三期窗口中的规律和记录。",
          look: ["三期开出结构", "窗口起始和结束", "历史命中分布"],
          use: "核查三期内窗口有没有异常或遗漏。",
          source: "真实历史开奖数据。",
          note: "这里重在记录，不替代公式表。"
        },
        {
          name: "策略回测",
          summary: "查看追号、追推荐和不同策略的历史成绩。",
          look: ["投入、收益、ROI", "最大回撤", "最长连亏和命中率"],
          use: "比较策略长期表现和风险，不用一天的成绩下结论。",
          source: "明确标注的历史回测数据。",
          note: "回测不是实盘，历史成绩不能保证未来。"
        }
      ]
    }
  ];

  var PAGE_GUIDE_BY_NAME = {};
  PAGE_GUIDE_GROUPS.forEach(function (group) {
    group.items.forEach(function (item) { PAGE_GUIDE_BY_NAME[item.name] = item; });
  });

  var PAGE_GUIDE_DISPLAY_GROUPS = [
    {
      title: "每日操作",
      desc: "每天按这个顺序走：先选号，再看窗口和执行，最后记录下单。",
      names: ["每日最终报告", "动态概率", "下注执行表", "公式表", "13线规律中心", "追三期下单"]
    },
    {
      title: "公式验证",
      desc: "正式公式从哪里来，以及公式和倍率到底有没有经过历史验证。",
      names: ["公式表", "13线规律中心", "策略回测"]
    },
    {
      title: "数据参考",
      desc: "这些页面只看走势、遗漏、冷热和规律，不直接决定今天下注。",
      names: ["总览", "分段对比", "窗口分析", "号码走势", "生肖走势", "遗漏热图", "遗漏排序", "单双热图", "冷热分析", "三期规律"]
    },
    {
      title: "生肖与辅助",
      desc: "生肖专项记录和尾号性格判断，作为补充参考。",
      names: ["生肖记录", "生肖窗口", "生肖遗漏", "尾号性格"]
    }
  ];

  var PAGE_LABEL_GUIDE = [
    {
      title: "号码和推荐",
      rows: [
        ["动态概率前三", "每期根据目标期之前的遗漏、连出、短中期频率重新计算10个尾号概率；概率接近时只算候选，不代表确定强弱。"],
        ["跟双号", "三期内调度建议本期按双号执行，不等于保证中奖。"],
        ["观望", "本期不建议按这条线下单。它只是建议，不会停止窗口记录。"],
        ["锁定号", "追号码窗口开始后，第1到第3期固定使用这个号码。"]
      ]
    },
    {
      title: "窗口状态",
      rows: [
        ["第1期仓位 / 第2期仓位 / 第3期仓位", "当前窗口已经走到第几期，应该看公式里的哪一个金额。"],
        ["窗口进行中", "当前还有未走完的窗口，下一期继续检查。"],
        ["窗口等待", "上一个窗口连续3期没中，已经结束；必须等最后追的尾号重新开出来一次，之后下一期才能重开。"],
        ["等待重开", "和窗口等待同一个意思，表示现在不下注，只等重新开窗条件。"],
        ["开窗等待", "新窗口可以开了，但公式第1期金额是0，所以先不下注，等后面有金额的期数。"],
        ["可开新窗口", "当前没有未结束窗口，也没有等待条件，下一期可以按公式开始新窗口。"],
        ["连续3期未中 · 本窗口结束", "该窗口第1、2、3期都没命中，本窗口到此关闭，不再继续追。"],
        ["等待尾X · 已等Y期", "窗口结束后正在等尾X重新出现，已经等了Y期。"]
      ]
    },
    {
      title: "公式和资金",
      rows: [
        ["阶段公式", "按第1期、第2期、第3期分别给下注金额。例如100/200/400，就是第1期100、第2期200、第3期400。"],
        ["倍投公式", "同一窗口内按倍数放大。现在正式基础是100元，N倍就是100/100×N/100×N²。"],
        ["正式执行公式", "公式表里的正式公式，是执行提示和资金调度实际金额的唯一依据。"],
        ["正式执行仓位", "按正式公式算出来的本期真实执行金额。"],
        ["今年测试仓位", "只按今年数据测试出来的参考仓位，不会直接替代正式公式。"],
        ["100元起", "最低下注单位是100元，不出现低于100元的正式下注金额。"],
        ["本期公式金额 / 本窗最大风险", "本期公式金额=各条线按公式表取当期金额直接相加；本窗最大风险=各条线公式三段相加的最大值。不锚定本金，也不设资金上限。"],
        ["本窗剩余风险", "如果后面几期继续按公式下，最坏情况下这个窗口还要投入多少钱。"]
      ]
    },
    {
      title: "数据、成绩和对比",
      rows: [
        ["真实快照", "开奖前先保存预测，开奖后再结算，不能用后面的数据补写前面的预测。"],
        ["历史回测", "用已经发生的数据模拟过去的表现，不是真实下单记录。"],
        ["已结算 / 待开奖", "已结算表示该期已经开奖并算完；待开奖表示号码还没出。"],
        ["命中率", "已经结算的窗口里，命中的比例。"],
        ["中窗 / 错窗", "中窗=窗口3期内命中过；错窗=3期连续都没命中。"],
        ["首次命中分布", "统计命中的窗口分别是在第1期、第2期还是第3期命中的。"],
        ["净收益 / ROI", "净收益是最后赚了多少钱；ROI是净收益相对于投入的比例。"],
        ["最大回撤", "历史过程中从最高收益回落到最低点最深的一次亏损幅度。"],
        ["最大连错 / 最大连中", "历史里连续错或连续中的最长次数。"],
        ["训练收益 / 验证收益", "训练段用来找公式，验证段用来检查公式到了后面还灵不灵；两段都为正才更可信。"],
        ["今年最优", "只看今年已开奖数据，算出来的今年表现最好的公式，属于参考口径。"],
        ["年度稳健最优", "看多年是否稳定，优先看正收益年份和最近三年，不只看总收益。"],
        ["全周期收益最高", "从全部历史合起来看，总净收益最高，但不代表每年都稳定。"],
        ["最优 X倍 / 不倍投 / 未通过", "最优X倍是测试里表现最好的倍率；不倍投表示基础金额不变；未通过表示训练和验证没有同时达标，不配仓。"]
      ]
    }
  ];

  var PAGE_GUIDE_TAB_MAP = {
    "每日最终报告": "dailyreport",
    "动态概率": "pick3",
    "下注执行表": "betexec",
    "公式表": "formulas",
    "13线规律中心": "windowmult",
    "追三期下单": "orderlog",
    "总览": "overview",
    "分段对比": "segments",
    "窗口分析": "windowk",
    "号码走势": "numtrend",
    "生肖走势": "zodtrend",
    "遗漏热图": "trend",
    "遗漏排序": "missorder",
    "单双热图": "parity",
    "冷热分析": "tails",
    "生肖记录": "zodrecords",
    "生肖窗口": "zodwindow",
    "生肖遗漏": "zodmonitor",
    "尾号性格": "personality",
    "三期规律": "datarecord",
    "策略回测": "backtest"
  };

  function pageGuideHTML() {
    var html = '<div class="section"><div class="section__head"><h2 class="section__title">页面说明 · 大白话版</h2><span class="section__hint">每个页面是干什么的、怎么看、怎么用、数据从哪里来，都在这里说清楚</span></div></div>';
    html += '<div class="section"><div class="panel" style="padding:12px"><div style="font-size:13px;color:#475569;line-height:1.8">总览按四层理解：先看“每日操作”决定今天怎么做，再看“公式验证”确认执行依据，然后看“数据参考”研究历史，最后看“生肖与辅助”做补充判断。</div></div></div>';
    function appendGuideGroup(group) {
      html += '<div class="section"><div class="section__head"><h2 class="section__title">' + group.title + '</h2><span class="section__hint">' + group.desc + '</span></div></div>';
      html += '<div class="section"><div class="overview-pages-grid">';
      group.names.forEach(function (name) {
        var item = PAGE_GUIDE_BY_NAME[name];
        if (!item) return;
        var tabId = PAGE_GUIDE_TAB_MAP[item.name] || "";
        html += '<article class="overview-page-card overview-page-card--guide" style="--guide-accent:#2563eb;--guide-soft:#eff6ff">';
        html += '<div class="overview-page-card__head"><span class="overview-page-card__group">' + group.title + '</span><h3>' + item.name + '</h3></div>';
        html += '<p class="overview-page-card__desc"><b>' + item.summary + '</b></p>';
        html += '<div class="overview-page-card__when"><b>主要看什么</b><span><ul style="margin:2px 0 0 16px;padding:0">';
        item.look.forEach(function (line) { html += '<li>' + line + '</li>'; });
        html += '</ul></span></div>';
        html += '<div class="overview-page-card__when"><b>怎么用</b><span>' + item.use + '</span></div>';
        html += '<div class="overview-page-card__when"><b>数据来源</b><span>' + item.source + '</span></div>';
        html += '<div class="overview-page-card__when" style="background:#fff7ed"><b>注意</b><span>' + item.note + '</span></div>';
        if (tabId) html += '<button class="overview-page-card__cta" data-overview-tab="' + tabId + '">打开页面 <span aria-hidden="true">→</span></button>';
        html += '</article>';
      });
      html += '</div></div>';
    }

    appendGuideGroup(PAGE_GUIDE_DISPLAY_GROUPS[0]);

    html += '<div class="section"><div class="section__head"><h2 class="section__title">页面上的标语怎么看</h2><span class="section__hint">先看懂这些常用标签，再看每个页面的明细就不会乱</span></div></div>';
    html += '<div class="section"><div class="overview-pages-grid">';
    PAGE_LABEL_GUIDE.forEach(function (group) {
      html += '<article class="overview-page-card overview-page-card--guide overview-page-card--label-guide" style="--guide-accent:#0f766e;--guide-soft:#ecfdf5">';
      html += '<div class="overview-page-card__head"><span class="overview-page-card__group">标语说明</span><h3>' + group.title + '</h3></div>';
      group.rows.forEach(function (row) {
        html += '<div class="label-guide-row"><b>' + row[0] + '</b><span>' + row[1] + '</span></div>';
      });
      html += '</article>';
    });
    html += '</div></div>';
    PAGE_GUIDE_DISPLAY_GROUPS.slice(1).forEach(appendGuideGroup);
    return html;
  }

  function dailyReportResult(w) {
    var hitIndex = Number(w && w.hitIndex);
    if (hitIndex >= 1 && hitIndex <= 3) {
      return { hit: true, label: "第" + hitIndex + "期中", color: "#15803d", soft: "#dcfce7" };
    }
    return { hit: false, label: "三期全错", color: "#b91c1c", soft: "#fee2e2" };
  }

  function dailyReportRate(rows) {
    var hits = rows.filter(function (w) { return Number(w.hitIndex) > 0; }).length;
    return { n: rows.length, hits: hits, rate: rows.length ? hits / rows.length : 0 };
  }

  function dailyReportYearStats(windows) {
    var byYear = {};
    windows.forEach(function (w) {
      var year = wmYearOf(w.start);
      if (!year) return;
      if (!byYear[year]) byYear[year] = { year: year, rows: [] };
      byYear[year].rows.push(w);
    });
    return Object.keys(byYear).map(function (year) {
      var item = byYear[year];
      item.stats = dailyReportRate(item.rows);
      return item;
    }).sort(function (a, b) { return b.year - a.year; });
  }

  function dailyReportCurrentRun(windows) {
    if (!windows.length) return { kind: "none", len: 0, year: null };
    var year = wmYearOf(windows[windows.length - 1].start);
    var rows = windows.filter(function (w) { return wmYearOf(w.start) === year; });
    var kind = Number(rows[rows.length - 1].hitIndex) > 0 ? "hit" : "miss";
    var len = 0;
    for (var i = rows.length - 1; i >= 0; i--) {
      var rowKind = Number(rows[i].hitIndex) > 0 ? "hit" : "miss";
      if (rowKind !== kind) break;
      len++;
    }
    return { kind: kind, len: len, year: year };
  }

  function dailyReportUnderlying(line, live) {
    if (line.kind === "tail") {
      var miss = currentMiss(line.tail);
      var streak = currentStreak(line.tail);
      var count30 = countWindow(line.tail, 30);
      var expected30 = BASE_RATE[line.tail] * 30;
      return {
        source: "尾号性格 + 遗漏排序",
        text: "尾" + line.tail + "当前遗漏" + miss + "期、连出" + streak +
          "期；近30期开出" + count30 + "次，理论约" + expected30.toFixed(1) + "次。"
      };
    }
    if (line.kind === "probability") {
      var snapshot = probabilitySnapshotRecord(latest + 1);
      var pick = snapshot && snapshot.top3 ? snapshot.top3[line.rank || 0] : null;
      var boundary = snapshot && snapshot.modelVersion === PROB_MODEL.LEGACY_VERSION
        ? "第296期仍是切换前旧快照，新方法从第297期生效。"
        : "当前使用5/7/15/21/30新方法快照。";
      return {
        source: "动态概率 + 真实快照",
        text: pick
          ? "当前锁尾" + pick.tail + "，三期概率" + (Number(pick.window3Prob) * 100).toFixed(1) +
            "%，下一期概率" + (Number(pick.nextProb) * 100).toFixed(1) + "%。" + boundary
          : "当前概率快照缺失；" + boundary
      };
    }
    return { source: "下注执行表", text: live && live.active ? "窗口进行中。" : "查看当前窗口状态。" };
  }

  function dailyReportCompositeScore(row) {
    var recentRate = Math.max(0, row.recentRate);
    var momentum = row.trend === "回暖" ? 1 : (row.trend === "平稳" ? 0.6 : (row.trend === "走弱" ? 0 : 0.4));
    var firstShare = row.recentHits ? row.first / row.recentHits : 0;
    var currentYearRate = row.currentYearStats && row.currentYearStats.stats ? row.currentYearStats.stats.rate : 0;
    var score =
      recentRate * 35 +
      row.recent6Rate * 20 +
      row.recent12Rate * 15 +
      row.historyRate * 10 +
      currentYearRate * 10 +
      momentum * 5 +
      firstShare * 5;
    if (row.live.waiting) score -= 18;
    if (row.windows.length < 12) score -= 5;
    return Math.max(0, Math.min(100, score));
  }

  function dailyReportAdviceFor(row) {
    if (row.live.waiting) {
      return { label: "等待重开", tier: "risk", color: "#b45309",
        reason: "上一窗三期全错，当前处于等待期，必须先等尾" + row.live.waiting.tail + "重新开出。" };
    }
    if (row.line.kind === "probability") {
      return {
        label: "正式选号 · 暂不配仓",
        tier: row.score >= 70 ? "watch" : "risk",
        color: row.score >= 70 ? "#1d4ed8" : "#b45309",
        reason: "新方法已用于选号，但仓位公式尚未验证；排序依据为近期、年度和模型记录，不代表建议下注金额。"
      };
    }
    if (planRisk(row.line.plan) === 0) {
      return {
        label: row.score >= 70 ? "可关注 · 暂不配仓" : "观望 · 不配仓",
        tier: row.score >= 70 ? "watch" : "risk",
        color: row.score >= 70 ? "#1d4ed8" : "#b45309",
        reason: "窗口数据可以观察，但公式表当前没有给这条线配置正式仓位。"
      };
    }
    if (row.score >= 75 && row.trend !== "走弱") {
      return { label: "优先关注", tier: "strong", color: "#15803d",
        reason: "近期窗口、近6窗、年度状态和当前窗口同时处于相对优势。" };
    }
    if (row.score >= 58) {
      return { label: "可以关注", tier: "watch", color: "#1d4ed8",
        reason: "综合表现不差，但仍有一项或多项指标需要继续观察。" };
    }
    return { label: "谨慎观察", tier: "risk", color: "#b45309",
      reason: "近期或长期至少一项明显偏弱，暂不列为优先线路。" };
  }

  function dailyReportReason(row) {
    var parts = [];
    parts.push("近3窗" + row.recentHits + "/" + row.recent.length + "，近6窗" + row.recent6Hits + "/" + row.recent6.length);
    parts.push("最近3个已中窗口里，第1期" + row.first + "次、第2期" + row.second + "次、第3期" + row.third + "次");
    if (row.previousRate != null) {
      parts.push("近3窗比前3窗" + (row.recentRate >= row.previousRate ? "高" : "低") +
        Math.abs((row.recentRate - row.previousRate) * 100).toFixed(1) + "个百分点");
    }
    if (row.live.waiting) parts.push("当前等尾" + row.live.waiting.tail + "重新开出");
    else if (row.live.active) parts.push("当前窗口已走到第" + Math.min(3, row.live.active.attempts.length + 1) + "期");
    if (row.line.kind === "probability") parts.push("当前为概率线，296期仍受旧快照边界约束");
    return parts.join("；") + "。";
  }

  function dailyReportInterpretation(row) {
    var parts = [];
    if (!row.recent.length) return "当前没有足够的已完成窗口，无法判断近期强弱势；只看长期记录容易产生误判。";
    if (row.trend === "回暖") parts.push("最近一段比前一段明显回暖");
    else if (row.trend === "走弱") parts.push("最近一段比前一段明显转弱");
    else parts.push("最近一段与前一段基本持平");
    if (row.recentRate > row.historyRate + 0.05) parts.push("近期命中率高于全历史");
    else if (row.recentRate < row.historyRate - 0.05) parts.push("近期命中率低于全历史");
    else parts.push("近期命中率与全历史接近");
    if (row.third > row.first) parts.push("第3期贡献较多，窗口拖得越久越依赖最后一期");
    else if (row.first > 0) parts.push("第1期贡献较多，开窗后较快结束的比例更高");
    if (row.currentRun.kind === "hit") parts.push("当前年度已完成窗口连续命中" + row.currentRun.len + "窗");
    else if (row.currentRun.kind === "miss") parts.push("当前年度已完成窗口连续全错" + row.currentRun.len + "窗");
    parts.push(String(row.underlying.text || "").replace(/。$/, ""));
    return parts.join("；") + "。";
  }

  function dailyReportRisk(row) {
    var risks = [];
    if (row.windows.length < 20) risks.push("已完成窗口样本不足20个");
    if (row.live.waiting) risks.push("当前窗口未重开，马上追会破坏窗口规则");
    if (row.recent.length && row.recentRate < row.historyRate - 0.08) risks.push("近期明显低于长期命中率");
    if (row.third > row.first + row.second) risks.push("过度依赖第3期命中");
    if (planRisk(row.line.plan) === 0) risks.push("公式表当前不配仓");
    if (row.line.kind === "probability") risks.push("296期仍显示切换前旧快照，297期才执行新方法");
    if (!risks.length) risks.push("未发现新增结构性风险，但仍按真实窗口结算");
    return risks.join("；") + "。";
  }

  function dailyReportLineStats(line, order) {
    var windows = wmWindowsForStage(line, 3).filter(function (w) {
      return w && w.hitIndex != null && Number(w.hitIndex) >= 0 &&
        (Number(w.hitIndex) > 0 || (w.attempts || []).length === 3);
    });
    var recent = windows.slice(-3);
    var previous = windows.slice(-6, -3);
    var hits = recent.filter(function (w) { return Number(w.hitIndex) > 0; }).length;
    var previousHits = previous.filter(function (w) { return Number(w.hitIndex) > 0; }).length;
    var first = recent.filter(function (w) { return Number(w.hitIndex) === 1; }).length;
    var second = recent.filter(function (w) { return Number(w.hitIndex) === 2; }).length;
    var third = recent.filter(function (w) { return Number(w.hitIndex) === 3; }).length;
    var historyHits = windows.filter(function (w) { return Number(w.hitIndex) > 0; }).length;
    var allFirst = windows.filter(function (w) { return Number(w.hitIndex) === 1; }).length;
    var allSecond = windows.filter(function (w) { return Number(w.hitIndex) === 2; }).length;
    var allThird = windows.filter(function (w) { return Number(w.hitIndex) === 3; }).length;
    var recent6 = windows.slice(-6);
    var recent12 = windows.slice(-12);
    var rate6 = dailyReportRate(recent6);
    var rate12 = dailyReportRate(recent12);
    var yearStats = dailyReportYearStats(windows);
    var currentYear = Number((D[D.length - 1] || {}).y) || 0;
    var currentYearStats = yearStats.filter(function (item) { return item.year === currentYear; })[0] || null;
    var live = wmCurrentState(line);
    var status = "可开新窗";
    var color = "#15803d";
    var tail = null;
    var period = null;
    if (live.waiting) {
      tail = Number(live.waiting.tail);
      status = "等待尾" + tail + "重开";
      color = "#b45309";
    } else if (live.active) {
      var checked = (live.active.attempts || []).length;
      tail = live.active.lockedTail;
      period = live.active.start + checked;
      status = checked ? ("下期第" + Math.min(3, checked + 1) + "期") : "第1期待开奖";
      color = "#1d4ed8";
    }
    var rate = recent.length ? hits / recent.length : -1;
    var previousRate = previous.length ? previousHits / previous.length : null;
    var trend = "样本不足";
    if (previousRate != null) {
      if (rate > previousRate + 0.15) trend = "回暖";
      else if (rate < previousRate - 0.15) trend = "走弱";
      else trend = "平稳";
    }
    var position = wmPositionForPlan(line, line.plan);
    var formulaAudit = EXEC_FORMULA_AUDIT[line.id] || null;
    var currentRun = dailyReportCurrentRun(windows);
    var underlying = dailyReportUnderlying(line, live);
    var result = {
      line: line,
      order: order,
      windows: windows,
      recent: recent,
      recentHits: hits,
      recentRate: rate,
      previousRate: previousRate,
      first: first,
      second: second,
      third: third,
      allFirst: allFirst,
      allSecond: allSecond,
      allThird: allThird,
      recent6: recent6,
      recent6Hits: rate6.hits,
      recent6Rate: rate6.rate,
      recent12: recent12,
      recent12Hits: rate12.hits,
      recent12Rate: rate12.rate,
      historyHits: historyHits,
      historyRate: windows.length ? historyHits / windows.length : 0,
      yearStats: yearStats,
      currentYearStats: currentYearStats,
      currentRun: currentRun,
      position: position,
      formulaAudit: formulaAudit,
      formulaRisk: planRisk(line.plan),
      underlying: underlying,
      trend: trend,
      status: status,
      color: color,
      tail: tail,
      period: period,
      live: live,
    };
    result.score = dailyReportCompositeScore(result);
    result.advice = dailyReportAdviceFor(result);
    result.reason = dailyReportReason(result);
    result.interpretation = dailyReportInterpretation(result);
    result.risk = dailyReportRisk(result);
    return result;
  }

  function dailyReportWindowChipHTML(w) {
    var result = dailyReportResult(w);
    return '<div class="daily-report-window-chip" style="--chip-color:' + result.color + ';--chip-soft:' + result.soft + '">' +
      '<b>' + wmPeriodLabel(w.start) + '</b>' +
      '<span>' + result.label + '</span>' +
      '<small>' + (w.attempts || []).map(function (attempt) {
        return "第" + (Number(attempt.period) - Number(w.start) + 1) + "期尾" + attempt.tail + (attempt.hit ? "中" : "错");
      }).join(" · ") + '</small></div>';
  }

  function dailyReportWeightRows(model) {
    var names = model.windows.map(function (window) { return window + "期"; }).concat(["遗漏", "连出"]);
    return names.map(function (name, index) {
      return {
        name: name,
        next: Number(model.next.weights[index + 1] || 0),
        window3: Number(model.window3.weights[index + 1] || 0),
      };
    });
  }

  function renderDailyReport() {
    var research = window.CAISHEN_PROBABILITY_WEIGHT_RESEARCH || null;
    var rows = EXEC_LINES.map(function (line, index) {
      return dailyReportLineStats(line, index);
    });
    rows.sort(function (a, b) {
      return b.score - a.score || a.order - b.order;
    });

    var latestRow = D[D.length - 1] || {};
    var html = '<div class="section"><div class="panel daily-report-panel">';
    html += '<div class="daily-report-head">' +
      '<div><span class="daily-report-kicker">每日最终报告</span>' +
      '<h2>13线综合分析报告</h2>' +
      '<p>数据截至第' + latestRow.p + '期 · 已开奖尾数 ' + tailsOf(latest).join(" ") + ' · 下一期待开奖第' + (Number(latestRow.p) + 1) + '期</p></div>' +
      '<strong>综合近3/6/12窗、年度状态、窗口性格和当前窗口<br>排序不按金额、不按下一期Top1</strong></div>';

    var totalHits = rows.reduce(function (sum, row) { return sum + row.recentHits; }, 0);
    var totalWindows = rows.reduce(function (sum, row) { return sum + row.recent.length; }, 0);
    var activeCount = rows.filter(function (row) { return row.status !== "可开新窗"; }).length;
    var averageScore = rows.reduce(function (sum, row) { return sum + row.score; }, 0) / Math.max(1, rows.length);
    html += '<div class="daily-report-metrics">' +
      '<div><b>' + averageScore.toFixed(1) + '</b><span>13线综合状态平均分</span></div>' +
      '<div><b>' + totalHits + ' / ' + totalWindows + '</b><span>近3窗命中 / 样本</span></div>' +
      '<div><b>' + activeCount + ' / 13</b><span>当前进行中或等待重开</span></div>' +
      '<div><b>' + rows.filter(function (row) { return row.trend === "走弱"; }).length + '</b><span>近3窗转弱线路</span></div>' +
      '</div>';

    html += '<div class="daily-report-block"><div class="daily-report-block__head"><h3>13线综合优秀度排名</h3><span>各项分析综合评分；同分时保持固定线路顺序</span></div>';
    html += '<div class="daily-report-table-wrap"><table class="table daily-report-rank-table"><thead><tr>' +
      '<th>排名</th><th>线路</th><th>综合分</th><th>当下建议</th><th>核心原因</th><th>近3窗</th><th>第1 / 2 / 3期中</th><th>当前窗口</th></tr></thead><tbody>';
    rows.forEach(function (row, index) {
      html += '<tr data-daily-report-row data-report-rate="' + (row.recent.length ? row.recentRate.toFixed(6) : "-1") + '" data-report-score="' + row.score.toFixed(3) + '">' +
        '<td><b>#' + (index + 1) + '</b></td>' +
        '<td><b>' + row.line.label + '</b></td>' +
        '<td><b style="color:' + row.advice.color + '">' + row.score.toFixed(1) + '</b></td>' +
        '<td><b data-report-advice style="color:' + row.advice.color + '">' + row.advice.label + '</b></td>' +
        '<td data-report-reason style="min-width:240px;line-height:1.55">' + row.reason + '</td>' +
        '<td><b>' + row.recentHits + ' / ' + row.recent.length + '</b><div style="font-size:10px;color:#64748b">近6窗 ' + row.recent6Hits + '/' + row.recent6.length + '</div></td>' +
        '<td>' + row.first + ' / ' + row.second + ' / ' + row.third + '</td>' +
        '<td><b style="color:' + row.color + '">' + row.status + '</b><div style="font-size:10px;color:#64748b">' +
          (row.period ? wmPeriodLabel(row.period) : "-") + (row.tail != null ? ' · 尾' + row.tail : "") + '</div></td></tr>';
    });
    html += '</tbody></table></div></div>';

    html += '<div class="daily-report-block"><div class="daily-report-block__head"><h3>13份单线综合报告</h3><span>固定线路顺序 · 每卡综合全部分析页面 · 左右滑动查看</span></div>';
    html += '<div class="daily-report-strip" data-daily-report-strip>';
    EXEC_LINES.forEach(function (line) {
      var row = rows.filter(function (item) { return item.line.id === line.id; })[0];
      var active = row.live.active;
      var waiting = row.live.waiting;
      var stage = active ? Math.min(3, (active.attempts || []).length + 1) : null;
      var nextPeriod = active ? active.start + (active.attempts || []).length : null;
      var currentWindowText = waiting
        ? "等待尾" + waiting.tail + "重新开出后，下一期才开新窗。"
        : (active
          ? "起始" + wmPeriodLabel(active.start) + "，现在第" + stage + "/3期，锁定尾" +
            (active.lockedTail != null ? active.lockedTail : "每期推荐") + "，下一次检查" + wmPeriodLabel(nextPeriod) + "。"
          : "当前没有进行中的窗口，下一期按规则检查是否开窗。");
      var yearText = row.yearStats.slice(0, 3).map(function (item) {
        return item.year + "年 " + item.stats.hits + "/" + item.stats.n + "（" + (item.stats.rate * 100).toFixed(1) + "%）";
      }).join(" · ") || "年度已完成窗口不足";
      var planText = (line.plan || []).join(" / ");
      var positionText = row.position.amount > 0
        ? row.position.label + " " + row.position.amount + "元"
        : (row.position.status || row.position.label);
      var auditText = row.formulaAudit
        ? (row.formulaAudit.formula || "无公式") +
          " · 训练" + (Number(row.formulaAudit.trainNet) >= 0 ? "+" : "") + Number(row.formulaAudit.trainNet || 0) +
          " / 验证" + (Number(row.formulaAudit.validNet) >= 0 ? "+" : "") + Number(row.formulaAudit.validNet || 0)
        : "公式表暂无这条线的审计记录";
      var sourceTags = ["下注执行表", "公式表", "13线规律中心", "窗口遗漏热图"];
      sourceTags.push(line.kind === "probability" ? "动态概率" : "尾号性格");
      html += '<article class="daily-report-line-card" data-daily-report-card data-line-id="' + line.id + '">' +
        '<div class="daily-report-line-card__head"><div><span>' + (line.kind === "probability" ? "新方法概率线" : "真实窗口线") + '</span><h3>' + line.label + '</h3></div><b style="color:' + row.advice.color + '" data-report-advice>' + row.advice.label + '</b></div>' +
        '<div class="daily-report-sources" data-report-sources="' + sourceTags.join("|") + '">' + sourceTags.map(function (source) { return '<span>' + source + '</span>'; }).join("") + '</div>' +
        '<div class="daily-report-section daily-report-section--conclusion" data-report-section="conclusion"><b>当下结论</b><p>' + row.advice.reason + '</p></div>' +
        '<div class="daily-report-section" data-report-section="reason"><b>为什么</b><p>' + row.reason + '</p></div>' +
        '<div class="daily-report-section" data-report-section="window"><b>当前窗口</b><p>' + currentWindowText + '</p><small>' + row.underlying.source + '：' + row.underlying.text + '</small></div>' +
        '<div class="daily-report-section" data-report-section="recent"><b>近期表现</b><div class="daily-report-recent-metrics"><span>近3窗 ' + row.recentHits + '/' + row.recent.length + '</span><span>近6窗 ' + row.recent6Hits + '/' + row.recent6.length + '</span><span>近12窗 ' + row.recent12Hits + '/' + row.recent12.length + '</span><span>趋势 ' + row.trend + '</span></div>';
      html += '<div class="daily-report-window-list">';
      if (row.recent.length) row.recent.slice().reverse().forEach(function (w) { html += dailyReportWindowChipHTML(w); });
      else html += '<div class="daily-report-empty">暂无已完成窗口</div>';
      html += '</div></div>';
      html += '<div class="daily-report-section" data-report-section="longterm"><b>长期与年度</b><p>全历史 ' + row.historyHits + '/' + row.windows.length + ' 窗（' + (row.historyRate * 100).toFixed(1) + '%）；首次命中分布 第1期' + row.allFirst + ' / 第2期' + row.allSecond + ' / 第3期' + row.allThird + '。</p><small>' + yearText + '。' + (row.currentRun.kind === "hit" ? "当前年度已完成窗口连中" + row.currentRun.len + "窗。" : (row.currentRun.kind === "miss" ? "当前年度已完成窗口连错" + row.currentRun.len + "窗。" : "")) + '</small></div>' +
        '<div class="daily-report-section" data-report-section="formula"><b>公式与仓位</b><p>' + auditText + '。</p><small>正式公式 ' + planText + ' · 当前状态 ' + positionText + '。</small></div>' +
        '<div class="daily-report-section daily-report-section--risk" data-report-section="risk"><b>风险与解读</b><p>' + row.risk + '</p><small>' + row.interpretation + '</small></div>' +
        '</article>';
    });
    html += '</div></div>';

    html += '<div class="daily-report-block daily-report-weights">';
    html += '<div class="daily-report-block__head"><h3>新方法已设为生产</h3><span>5 / 7 / 15 / 21 / 30 五项分别训练权重；旧10期仅保留为对比</span></div>';
    if (!research) {
      html += '<p class="daily-report-empty">权重研究数据未加载，暂不能显示。</p>';
    } else {
      html += '<details class="daily-report-professional"><summary>展开专业明细：两套权重、年度结果和统计检验</summary>';
      var modelOrder = ["p10", "p57152130"];
      html += '<div class="daily-report-weight-grid">';
      modelOrder.forEach(function (key) {
        var model = research.models[key];
        var isChallenger = key === "p57152130";
        html += '<section class="daily-report-weight-model" data-weight-model="' + key + '">' +
          '<div class="daily-report-weight-model__head"><span>' + (isChallenger ? "5/7/15/21/30 · 生产" : "5/10/20/30 · 对照") + '</span><b>' + model.label + '</b>' +
          '<small>训练样本 ' + model.sampleCount + ' · L2=' + research.l2 + '</small></div>' +
          '<table class="table"><thead><tr><th>特征</th><th>下一期权重</th><th>三期权重</th></tr></thead><tbody>';
        dailyReportWeightRows(model).forEach(function (item) {
          html += '<tr><td><b>' + item.name + '</b></td><td>' + item.next.toFixed(4) + '</td><td>' + item.window3.toFixed(4) + '</td></tr>';
        });
        html += '<tr><td>截距</td><td>' + Number(model.next.weights[0]).toFixed(4) + '</td><td>' + Number(model.window3.weights[0]).toFixed(4) + '</td></tr>';
        html += '</tbody></table></section>';
      });
      html += '</div>';
      html += '<div class="daily-report-weight-result"><div class="daily-report-weight-result__head"><b>完整三期内结果</b><span>排名按各自三期权重降序；2025验证、2026影子，不混训练样本</span></div>';
      html += '<div class="daily-report-table-wrap"><table class="table"><thead><tr><th>年份</th><th>10期三期命中</th><th>7期挑战三期命中</th><th>差值</th><th>McNemar p</th><th>判定</th></tr></thead><tbody>';
      research.annualComparison.forEach(function (row) {
        var delta = row.delta * 100;
        var yearLabel = row.year + "年" + (row.year === 2025 ? " · 验证" : (row.year === 2026 ? " · 影子" : " · 训练"));
        html += '<tr><td><b>' + yearLabel + '</b></td><td>' + (row.baseRate * 100).toFixed(2) + '%</td><td>' + (row.challengerRate * 100).toFixed(2) + '%</td>' +
          '<td style="color:' + (delta >= 0 ? "#15803d" : "#b91c1c") + ';font-weight:900">' + (delta >= 0 ? "+" : "") + delta.toFixed(2) + 'pp</td>' +
          '<td>' + row.pValue.toFixed(4) + '</td><td>' + (row.challengerRate > row.baseRate ? "7期较好" : (row.challengerRate < row.baseRate ? "10期较好" : "持平")) + '</td></tr>';
      });
      html += '</tbody></table></div></div>';
      html += '</details>';
      html += '<div class="daily-report-decision"><b>生产：5 / 7 / 15 / 21 / 30 新方法</b>' +
        '<span>2025验证 新方法 ' + (research.comparison.validation2025.challengerRate * 100).toFixed(2) + '%，旧方法 ' + (research.comparison.validation2025.baseRate * 100).toFixed(2) + '%；' +
        '2026影子 新方法 ' + (research.comparison.shadow2026.challengerRate * 100).toFixed(2) + '%，旧方法 ' + (research.comparison.shadow2026.baseRate * 100).toFixed(2) + '%。' +
        '研究风险保留：验证段仍少0.87个百分点，不能因为2026暂时领先就取消监控。</span></div>';
      html += '</div>';
    }
    html += '<p class="disclaimer">本页只解读真实开奖窗口、真实快照和独立训练权重，不保证中奖，不自动生成金额。排名口径是每条线最近3个已完成三期窗口；概率三线使用新方法选号，仓位公式仍需单独验证。</p>';
    html += '</div></div>';
    view.innerHTML = html;
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
    html += pageGuideHTML();


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

  // 全历史遗漏/连出：D 从2021年第1期开始，旧→新；每段只记录真实开奖。
  function fullTailRuns(tail, kind) {
    var wantHit = kind === "hit";
    var list = [], start = -1;
    for (var i = 0; i < D.length; i++) {
      var row = D[i];
      if (i > 0 && row.y !== D[i - 1].y && start >= 0) {
        list.push({ start: D[start], end: D[i - 1], n: i - start, ongoing: false });
        start = -1;
      }
      var hasTail = (row.nums || []).some(function (n) { return Number(n) % 10 === Number(tail); });
      var active = hasTail === wantHit;
      if (active && start < 0) start = i;
      if (!active && start >= 0) {
        list.push({ start: D[start], end: D[i - 1], n: i - start, ongoing: false });
        start = -1;
      }
    }
    if (start >= 0) list.push({ start: D[start], end: D[D.length - 1], n: D.length - start, ongoing: true });
    return list;
  }

  function compactRunPeriod(row) {
    var p = String(row.p);
    while (p.length < 3) p = "0" + p;
    return String(row.y) + "." + p;
  }

  function fullRunRange(run) {
    if (run.start.y === run.end.y && run.start.p === run.end.p) return compactRunPeriod(run.start);
    if (run.start.y === run.end.y) {
      var endP = String(run.end.p);
      while (endP.length < 3) endP = "0" + endP;
      return compactRunPeriod(run.start) + "–" + endP;
    }
    return compactRunPeriod(run.start) + "–" + compactRunPeriod(run.end);
  }

  function fullRunTitle(tail, kind, run) {
    return "尾" + tail + " · " + (kind === "hit" ? "连出" : "遗漏") + run.n + "期 · " +
      run.start.y + "年第" + run.start.p + "期–" + run.end.y + "年第" + run.end.p + "期" +
      (run.ongoing ? " · 当前仍在持续" : "");
  }

  function fullRunStripHTML(tail, kind, runs) {
    runs = runs || fullTailRuns(tail, kind);
    var isHit = kind === "hit";
    var ongoing = runs.length && runs[runs.length - 1].ongoing ? runs[runs.length - 1].n : 0;
    var html = '<div class="trend-run-row">';
    html += '<div class="trend-run-row__head"><b>' + (isHit ? "连出" : "遗漏") + '</b><span>历史 ' + runs.length + ' 段';
    if (ongoing) html += ' · 当前 ' + ongoing + ' 期';
    html += '</span></div>';
    html += '<div class="trend-run-strip" aria-label="尾' + tail + (isHit ? "连出" : "遗漏") + '全部历史记录">';
    if (!runs.length) {
      html += '<span class="trend-run-empty">暂无记录</span>';
    } else {
      runs.slice().reverse().forEach(function (run) {
        var cls = isHit ? " trend-run-chip--hit" : " trend-run-chip--miss";
        if (run.ongoing) cls += " is-current";
        html += '<span class="trend-run-chip' + cls + '" title="' + fullRunTitle(tail, kind, run) + '">';
        html += '<b>' + (isHit ? "连" : "漏") + run.n + '</b>';
        html += '<small>' + fullRunRange(run) + (run.ongoing ? ' · 当前' : '') + '</small>';
        html += "</span>";
      });
    }
    html += "</div></div>";
    return html;
  }

  function fullRunHistoryHTML() {
    var html = '<div class="section"><div class="section__head"><h2 class="section__title">遗漏 / 连出滚动记录</h2><span class="section__hint">新→旧 · 打开自动停在最新 · 覆盖2021年第1期至最新已开奖期 · 左右滑动看全部</span></div></div>';
    html += '<div class="section"><div class="panel trend-run-guide"><b>怎么看：</b>“漏3”=连续3期没开出；“连2”=连续2期开出；格内小字如“2021.001–003”表示2021年第1–3期。每年单独计算，跨年自动断段；最左边标“当前”的，就是还没结束的最新记录。</div></div>';
    var years = [];
    D.forEach(function (row) { if (years.indexOf(row.y) < 0) years.push(row.y); });
    for (var t = 0; t < 10; t++) {
      var missRuns = fullTailRuns(t, "miss");
      var hitRuns = fullTailRuns(t, "hit");
      html += '<div class="section"><div class="panel trend-run-card">';
      html += '<div class="trend-run-card__title"><b>尾' + t + '</b><span>当前漏 ' + currentMiss(t) + ' 期 · 当前连 ' + currentStreak(t) + ' 期</span>';
      html += '<div class="trend-run-card__years"><span class="trend-run-card__years-title">每年独立 · 最长遗漏 / 最长连出</span>';
      years.slice().reverse().forEach(function (year) {
        var longestMiss = missRuns.filter(function (run) { return run.start.y === year; })
          .reduce(function (max, run) { return Math.max(max, run.n); }, 0);
        var longestHit = hitRuns.filter(function (run) { return run.start.y === year; })
          .reduce(function (max, run) { return Math.max(max, run.n); }, 0);
        html += '<span class="trend-run-card__year" title="' + year + '年：最长遗漏 ' + longestMiss + ' 期，最长连出 ' + longestHit + ' 期">';
        html += '<b>' + year + '</b><small>漏' + longestMiss + ' · 连' + longestHit + '</small></span>';
      });
      html += '</div></div>';
      html += fullRunStripHTML(t, "miss", missRuns);
      html += fullRunStripHTML(t, "hit", hitRuns);
      html += "</div></div>";
    }
    html += '<p class="disclaimer">所有记录来自已开奖号码；没有把待开奖或未来期写成记录。连出包含连1，便于完整核对每一段。</p>';
    return html;
  }

  function wmWindowRunData(line, maxStage, year) {
    var windows = wmWindowsForStage(line, maxStage).filter(function (w) {
      return wmYearOf(w.start) === Number(year);
    });
    var numbered = windows.map(function (w, index) {
      return {
        window: w,
        number: index + 1,
        kind: Number(w.hitIndex) > 0 ? "hit" : "miss",
        startPeriod: betLocalPeriod(w.start),
        endPeriod: betLocalPeriod(w.start) + Math.max(1, (w.attempts || []).length) - 1
      };
    });
    var runs = [];
    numbered.forEach(function (item) {
      var last = runs[runs.length - 1];
      if (!last || last.kind !== item.kind) {
        last = {
          kind: item.kind,
          year: Number(year),
          n: 0,
          startWin: item.number,
          endWin: item.number,
          startPeriod: item.startPeriod,
          endPeriod: item.endPeriod,
          latest: false
        };
        runs.push(last);
      }
      last.n++;
      last.endWin = item.number;
      last.endPeriod = item.endPeriod;
      last.latest = item.number === numbered.length;
    });
    var missRuns = runs.filter(function (run) { return run.kind === "miss"; });
    var hitRuns = runs.filter(function (run) { return run.kind === "hit"; });
    [missRuns, hitRuns].forEach(function (kindRuns) {
      kindRuns.forEach(function (run, index) {
        var previous = index > 0 ? kindRuns[index - 1] : null;
        run.previousStartWin = previous ? previous.startWin : null;
        run.previousEndWin = previous ? previous.endWin : null;
        run.gapFromPrevStart = previous ? run.startWin - previous.startWin : null;
        run.gapFromPrevEnd = previous ? Math.max(0, run.startWin - previous.endWin - 1) : null;
      });
    });
    return {
      windows: numbered,
      miss: missRuns,
      hit: hitRuns
    };
  }

  function wmRunLengthCounts(runs) {
    var counts = { 1: 0, 2: 0, 3: 0, 4: 0, max: 0 };
    runs.forEach(function (run) {
      counts[Math.min(4, run.n)]++;
      counts.max = Math.max(counts.max, run.n);
    });
    return counts;
  }

  function wmRunCountsText(label, runs) {
    var counts = wmRunLengthCounts(runs);
    return label + "1×" + counts[1] + " · " + label + "2×" + counts[2] +
      " · " + label + "3×" + counts[3] + " · " + label + "4+×" + counts[4] +
      " · 最长" + counts.max;
  }

  function wmRunGapText(runs) {
    var gaps = runs.slice(1).map(function (run) { return run.gapFromPrevStart; }).filter(function (gap) {
      return gap != null && gap > 0;
    });
    if (!gaps.length) return "间隔样本不足";
    var latestGap = gaps[gaps.length - 1];
    var averageGap = gaps.reduce(function (sum, gap) { return sum + gap; }, 0) / gaps.length;
    var maxGap = Math.max.apply(null, gaps);
    return "最近隔" + latestGap + "窗 · 平均" + averageGap.toFixed(1) + "窗 · 最长" + maxGap + "窗";
  }

  function wmRunTitle(line, run) {
    var gapText = "";
    var kindLabel = run.kind === "hit" ? "连中" : "遗漏";
    if (run.gapFromPrevStart != null) {
      gapText = " · 距上次" + kindLabel + "起点" + run.gapFromPrevStart + "窗（距上次结束" + run.gapFromPrevEnd + "窗）";
    } else if (run.kind === "miss") {
      gapText = " · 该年第一次遗漏";
    } else {
      gapText = " · 该年第一次连中";
    }
    return line.label + " · 窗口" + (run.kind === "hit" ? "连中" : "遗漏") + run.n +
      "窗 · " + run.year + "年第" + run.startWin + "–" + run.endWin + "窗 · " +
      "当年第" + run.startPeriod + "–" + run.endPeriod + "期" + gapText;
  }

  function wmRunStripHTML(line, kind, runs, activeState) {
    var isHit = kind === "hit";
    var label = isHit ? "窗口连中" : "窗口遗漏";
    var countsText = wmRunCountsText(isHit ? "连" : "漏", runs);
    var html = '<div class="trend-run-row">';
    html += '<div class="trend-run-row__head"><b>' + label + '</b><span>' + countsText + '</span></div>';
    html += '<div class="trend-run-strip" aria-label="' + line.label + label + '滚动记录">';
    if (!runs.length) {
      html += '<span class="trend-run-empty">该年暂无' + (isHit ? "连中" : "遗漏") + '段</span>';
    } else {
      var reversed = runs.slice().reverse();
      reversed.forEach(function (run, index) {
        if (index > 0) {
          var newer = reversed[index - 1];
          var gapFromStart = newer.startWin - run.startWin;
          var gapBetween = Math.max(0, newer.startWin - run.endWin - 1);
          var kindLabel = isHit ? "连中" : "遗漏";
          var linkClass = "window-gap-link" + (isHit ? " window-gap-link--hit" : "");
          html += '<span class="' + linkClass + '" title="上次' + kindLabel + '第' + run.startWin + '–' + run.endWin +
            '窗，本次' + kindLabel + '第' + newer.startWin + '–' + newer.endWin + '窗；起点差' + gapFromStart +
            '窗，中间隔' + gapBetween + '个完整窗口">';
          html += '<b>起点差<span class="window-gap-link__start">' + gapFromStart + '</span></b>';
          html += '<small>中间<span class="window-gap-link__between">' + gapBetween + '</span>窗</small></span>';
        }
        var cls = isHit ? " trend-run-chip--hit" : " trend-run-chip--miss";
        if (run.latest && !(activeState && (activeState.active || activeState.waiting))) cls += " is-current";
        html += '<span class="trend-run-chip' + cls + '" title="' + wmRunTitle(line, run) + '">';
        html += '<b>' + (isHit ? "连" : "漏") + run.n + '窗</b>';
        html += '<small>第' + run.startWin + '–' + run.endWin + '窗</small>';
        html += "</span>";
      });
    }
    html += "</div></div>";
    return html;
  }

  function wmRunHistoryHTML(maxStage, year) {
    var latestYear = Number((D[D.length - 1] || {}).y);
    var isCurrentYear = Number(year) === latestYear;
    var html = '<div class="section"><div class="section__head"><h2 class="section__title">窗口遗漏 / 窗口连中滚动记录 · ' + year + '年</h2><span class="section__hint">单位=一个完整窗口，不是一期 · 每年重新开窗、跨年断段 · 新→旧 · 横向滑动看全部</span></div></div>';
    html += '<div class="section"><div class="panel trend-run-guide"><b>怎么看：</b>“漏2窗”=连续2个窗口三期全错；“连3窗”=连续3个窗口在三期内命中。遗漏铁链和连中铁链都按新→旧排列：当前段在左，连到上一次同类段，再到更上一次。<b>每块连接牌都写两组数：起点差=本次段起点减上次段起点；中间隔X窗=两段之间完整隔开的窗口数</b>。进行中的窗口还没结算，不计入已完成窗口的连错或连中。</div></div>';
    EXEC_LINES.forEach(function (line) {
      var data = wmWindowRunData(line, maxStage, year);
      var activeState = isCurrentYear ? wmStageNow(line, maxStage) : null;
      var status = "历史年份";
      if (isCurrentYear) {
        if (activeState && activeState.waiting) {
          status = "当前等待重开 · 尾" + activeState.waiting.tail;
        } else if (activeState && activeState.active) {
          status = "当前窗口进行中 · 第" + Math.min(maxStage, (activeState.active.attempts || []).length + 1) + "期";
        } else {
          var allRuns = data.miss.concat(data.hit).sort(function (a, b) { return a.endWin - b.endWin; });
          var lastRun = allRuns[allRuns.length - 1];
          status = lastRun ? "最近完成 · 连续" + (lastRun.kind === "hit" ? "中" : "错") + lastRun.n + "窗" : "暂无完整窗口";
        }
      }
      html += '<div class="section"><div class="panel trend-run-card">';
      html += '<div class="trend-run-card__title"><b>' + line.label + '</b><span>' + status + ' · 当年完成 ' + data.windows.length + ' 窗</span></div>';
      html += '<div class="wm-run-summary"><div class="wm-run-summary__title">' + year + '年窗口连续统计</div>';
      html += '<div class="wm-run-summary__item wm-run-summary__item--miss"><b>窗口遗漏</b><span>' + wmRunCountsText("漏", data.miss) + '</span><small>' + wmRunGapText(data.miss) + '</small></div>';
      html += '<div class="wm-run-summary__item wm-run-summary__item--hit"><b>窗口连中</b><span>' + wmRunCountsText("连", data.hit) + '</span><small>' + wmRunGapText(data.hit) + '</small></div>';
      html += '</div>';
      html += wmRunStripHTML(line, "miss", data.miss, activeState);
      html += wmRunStripHTML(line, "hit", data.hit, activeState);
      html += "</div></div>";
    });
    html += '<p class="disclaimer">窗口记录只读取本页同一套两期/三期窗口引擎；切换上方两期/三期或年份，整页一起切换。没有把未结算的当前窗口写成中或错。</p>';
    return html;
  }



  function yearChipsHTML(selectedYear, attrName) {
    var html = '<div class="chips page-year-chips" style="margin-bottom:8px">';
    html += '<span style="align-self:center;font-size:12px;font-weight:900;color:#64748b">年份</span>';
    DATA_YEARS.forEach(function (year) {
      html += '<button class="chip ' + (Number(selectedYear) === year ? "is-active" : "") + '" type="button" ' + attrName + '="' + year + '">' + year + "</button>";
    });
    return html + "</div>";
  }

  function rowTailsOf(row) {
    var out = [];
    (row && row.nums || []).forEach(function (number) {
      var tail = Number(number) % 10;
      if (out.indexOf(tail) < 0) out.push(tail);
    });
    return out.sort(function (a, b) { return a - b; });
  }

  function currentMissForRows(rows, tail) {
    var miss = 0;
    for (var i = rows.length - 1; i >= 0; i--) {
      if (rowTailsOf(rows[i]).indexOf(Number(tail)) >= 0) break;
      miss++;
    }
    return miss;
  }

  function buildMissInfoForRows(rows) {
    var info = {};
    var latestPeriod = rows.length ? Number(rows[rows.length - 1].p) : 0;
    for (var tail = 0; tail < 10; tail++) {
      info[tail] = {};
      var lastOpen = -1;
      rows.forEach(function (row) {
        var period = Number(row.p);
        if (rowTailsOf(row).indexOf(tail) < 0) return;
        if (lastOpen >= 0 && period > lastOpen + 1) {
          var cycleLen = period - lastOpen - 1;
          var cls = cycleLen >= 3 ? "cell-miss3" : cycleLen === 2 ? "cell-miss2" : "cell-miss1";
          for (var p = lastOpen + 1; p < period; p++) info[tail][p] = { cls: cls, mark: 0 };
          info[tail][period - 1] = { cls: cls, mark: cycleLen };
        }
        lastOpen = period;
      });
      if (lastOpen >= 0 && latestPeriod > lastOpen) {
        var openLen = latestPeriod - lastOpen;
        var openCls = openLen >= 3 ? "cell-miss3" : openLen === 2 ? "cell-miss2" : "cell-miss1";
        for (var openP = lastOpen + 1; openP <= latestPeriod; openP++) info[tail][openP] = { cls: openCls, mark: 0 };
        info[tail][latestPeriod] = { cls: openCls, mark: openLen };
      }
    }
    return info;
  }

  function missOrderTailsForRows(rows) {
    var arr = [];
    for (var t = 0; t < 10; t++) {
      var run = 0, runStart = 0, evStart = -1, evEnd = -1;
      for (var i = 0; i < rows.length; i++) {
        var period = Number(rows[i].p);
        if (rowTailsOf(rows[i]).indexOf(t) >= 0) {
          if (run >= 3) {
            evStart = runStart;
            evEnd = Number(rows[i - 1].p);
          }
          run = 0;
        } else {
          if (run === 0) runStart = period;
          run++;
        }
      }
      if (run >= 3) {
        evStart = runStart;
        evEnd = rows.length ? Number(rows[rows.length - 1].p) : 0;
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

  function currentYearRows() {
    var year = (D[D.length - 1] || {}).y;
    return D.filter(function (row) { return Number(row.y) === Number(year); });
  }

  function missOrderTails() {
    return missOrderTailsForRows(currentYearRows());
  }

  function renderMissOrderHeatmap() {
    var year = DATA_YEARS.indexOf(Number(state.missOrderYear)) >= 0 ? Number(state.missOrderYear) : DATA_YEARS[0];
    state.missOrderYear = year;
    var rows = D.filter(function (row) { return Number(row.y) === year; });

    var order = missOrderTailsForRows(rows);
    var missInfo = buildMissInfoForRows(rows);
    var html = '<div class="section"><div class="section__head"><h2 class="section__title">遗漏排序热图 · ' + year + '年</h2><span class="section__hint">每年独立排序 · 按该年最近遗漏满3期排序，最新放最后</span></div>';
    html += yearChipsHTML(year, "data-miss-order-year");
    html += '<div class="panel"><div class="panel__body heatmap"><table class="heatmap__table"><thead><tr><th class="row-label">期</th><th>开出</th><th>个</th>';
    order.forEach(function (t) {
      html += '<th>尾' + t + '<span class="heat-order-miss">漏' + currentMissForRows(rows, t) + '</span></th>';
    });
    html += "</tr></thead><tbody>";

    var shownRows = perfRows("missorder:" + year, rows);
    shownRows.forEach(function (record) {
      var p = Number(record.p);
      var drawn = rowTailsOf(record);
      html += '<tr><td class="row-label">' + p + '</td><td class="open-tails">' + drawn.join(" ") + '</td><td class="open-count">' + drawn.length + "</td>";
      order.forEach(function (d) {
        if (drawn.indexOf(d) >= 0) {
          html += '<td><span class="heat-cell cell-hit">' + d + "</span></td>";
        } else {
          var mi = missInfo[d][p];
          var cls = mi ? mi.cls : "cell-miss1";
          var mark = (mi && mi.mark > 0) ? (CN[mi.mark] || mi.mark) : "";
          html += '<td><span class="heat-cell ' + cls + '">' + mark + "</span></td>";
        }
      });
      html += "</tr>";
    });

    html += "</tbody></table></div></div>";
    html += perfMoreBtn("missorder:" + year, rows.length, shownRows.length);
    html += '<p class="disclaimer">' + year + '年独立排序：按该年每个尾数最近一次遗漏满 3 期及以上的时间排序，旧的放左、最新的放右；正在遗漏满 3 期及以上的放在最后。</p>';
    html += fullRunHistoryHTML();
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

    var shownPeriodsParity = perfRows("parity", periods);
    shownPeriodsParity.forEach(function (p) {
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
    html += perfMoreBtn("parity", periods.length, shownPeriodsParity.length);
    html += '<p class="disclaimer">单数尾数放左、双数尾数放右；左右两侧内部都按最近一次遗漏满 3 期及以上的时间排序，最新放最右。</p>';
    return html;
  }

  function renderTrend() {
    return renderTrendImpl();
  }

  // 我的笔记：想到什么写什么，随时加、随时删（只存本地）
  function renderNotes() {
    var notes = notesLoad();
    var html = '<div class="section"><div class="section__head"><h2 class="section__title">我的笔记</h2><span class="section__hint">只存在这台手机/浏览器里 · 不参与任何计算 · 随时能加能删</span></div></div>';
    html += '<div class="section"><div class="panel" style="padding:10px">';
    html += '<textarea id="noteInput" placeholder="写在这里，比如：今天尾9第1期中率61%，继续观察" style="width:100%;min-height:96px;font-size:14px;line-height:1.6;padding:10px;border:1px solid #e2e8f0;border-radius:8px;resize:vertical;box-sizing:border-box"></textarea>';
    html += '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">';
    html += '<button class="chip is-active" type="button" data-note-add="1" style="min-height:38px;padding:6px 16px">保存这条</button>';
    html += '<button class="chip" type="button" data-note-clear="1" style="min-height:38px;padding:6px 12px;color:#b91c1c;border-color:#fecaca">全部清空</button>';
    html += '</div></div></div>';
    html += '<div class="section"><div class="section__head"><h2 class="section__title">已保存 ' + notes.length + ' 条</h2><span class="section__hint">新→旧</span></div>';
    if (!notes.length) {
      html += '<div class="panel" style="padding:14px;color:#64748b;font-size:13px">还没有笔记，上面写一条试试。</div>';
    } else {
      html += '<div class="panel" style="padding:6px 8px">';
      notes.slice().reverse().forEach(function (n) {
        html += '<div style="display:flex;gap:8px;align-items:flex-start;border-bottom:1px solid #eef2f7;padding:9px 2px">';
        html += '<div style="flex:0 0 82px;font-size:11px;color:#94a3b8;line-height:1.5">' + escapeHTML(n.at || "") + '</div>';
        html += '<div style="flex:1;min-width:0;font-size:13px;line-height:1.6;white-space:pre-wrap;word-break:break-word">' + escapeHTML(n.text || "") + '</div>';
        html += '<button class="chip" type="button" data-note-del="' + escapeHTML(n.id) + '" style="flex:0 0 auto;color:#b91c1c;border-color:#fecaca">删除</button>';
        html += '</div>';
      });
      html += '</div>';
    }
    html += '</div>';
    view.innerHTML = html;
  }

  // 窗口遗漏热图：单位=窗口（不是期），13条线一屏，绿=中窗、红=错窗（数字=连错到第几窗），可左右上下滚动
  function renderWindowMiss() {
    var latestYear = Number((D[D.length - 1] || {}).y);
    var curYear = DATA_YEARS.indexOf(Number(state.windowMissYear)) >= 0 ? Number(state.windowMissYear) : latestYear;
    state.windowMissYear = curYear;
    var isCurrentYear = curYear === latestYear;
    // 本页自己的方案开关：两期=一个窗口最多2期。两期/三期各自一套窗口、各自命中率、各自规律，互不引用
    var maxStage = state.windowMissMode === "two" ? 2 : 3;
    var perLine = EXEC_LINES.map(function (line) {
      var rows = wmWindowsForStage(line, maxStage).filter(function (w) { return wmYearOf(w.start) === curYear; });
      var stNow = wmStageNow(line, maxStage);
      var nextStartFull = isCurrentYear && stNow && stNow.active ? Number(stNow.active.start) : null;
      // 每条线自己的竖排事件流：一窗一格；窗与窗之间“等号重开”的空档单独占一格
      var out = [], streak = 0;
      rows.forEach(function (w, i) {
        var hit = w.hitIndex > 0;
        streak = hit ? 0 : streak + 1;
        var startP = betLocalPeriod(w.start);
        var attempts = (w.attempts || []).length;
        var nextFull = (i + 1 < rows.length) ? Number(rows[i + 1].start) : nextStartFull;
        var nextP = nextFull ? betLocalPeriod(nextFull) : null;
        var wait = nextP ? Math.max(0, nextP - startP - attempts) : 0;
        // 命中的那一格写“在第几期中的”（窗口内第1/2/3期）
        out.push({ kind: hit ? "hit" : "miss", hitAt: hit ? Number(w.hitIndex) : null, miss: streak });
        // 错窗后等多号重新开出的空档：单独一格，写等了几期
        if (wait > 0) out.push({ kind: "wait", wait: wait });
      });
      // 现在还在等号重开、还没开出下一窗：最后一格必须是“等”（按已经等了几期算）
      if (isCurrentYear && stNow && stNow.waiting && rows.length) {
        var lastW = rows[rows.length - 1];
        var endP = betLocalPeriod(lastW.start) + ((lastW.attempts || []).length) - 1;
        var waitNow = latest - endP + 1;
        if (waitNow > 0) out.push({ kind: "wait", wait: waitNow, tail: stNow.waiting.tail, amount: 0 });
      }
      // 现在有正在跑的窗口：把“当前跑到第几期”作为最新一件事补一格（还没开奖，不算结果）
      if (isCurrentYear && stNow && stNow.active) {
        out.push({
          kind: "live",
          stage: (stNow.active.attempts || []).length + 1,
          start: wmPeriodLabel(stNow.active.start),
          tail: wmLiveTailFor(line, stNow.active, stNow.active.start),
          amount: Number((line.plan || [])[(stNow.active.attempts || []).length] || 0)
        });
      }
      // 保持时间正序（旧→新）：渲染时各线从底部对齐，最新的那件事永远在最下面一行
      return { label: line.label, events: out };
    });
    var maxN = 0;
    perLine.forEach(function (p) { if (p.events.length > maxN) maxN = p.events.length; });
    // 与「遗漏热图（尾数）」完全同一套风格与排序：旧在上、新在下，进页面自动滚到底；绿格=中，红格=连错第几窗（中文数字）
    var html = '<div class="section"><div class="panel" style="padding:10px;margin-bottom:8px">';
    html += yearChipsHTML(curYear, "data-window-miss-year");
    html += '<div class="wm-view-tabs" style="margin-bottom:6px">';
    html += '<button class="chip wm-view-tab' + (maxStage === 3 ? " is-active" : "") + '" type="button" data-wm-mode="three">三期窗口</button>';
    html += '<button class="chip wm-view-tab' + (maxStage === 2 ? " is-active" : "") + '" type="button" data-wm-mode="two">两期窗口</button>';
    html += '</div><div style="font-size:12px;color:#475569;line-height:1.7">当前：<b>' + (maxStage === 2 ? "两期窗口（一个窗口最多第2期）" : "三期窗口（一个窗口最多第3期）") + '</b> · 本页独立开关，只影响这一页；两期和三期各自一套窗口、命中率、性格规律，互不引用。</div></div></div>';
    html += '<div class="section"><div class="section__head"><h2 class="section__title">窗口遗漏热图 · ' + curYear + '年</h2><span class="section__hint">每年独立 · 每条线一竖列，从上往下走：旧在上、新在下，最底一行=最新 · 左起第一列是行号：最底一行「最新」=各线当下状态，往上依次 1、2、3…（数字=往前第几格，一格=一个窗口）· 只看窗口，不管期号</span></div>';
    html += '<div class="panel" style="padding:8px 10px;margin-bottom:8px"><div style="font-size:12px;line-height:1.8;color:#334155">最底下一行「最新」=13条线各自当前的状态；往上就是更早的窗口=比最新早1格、2格（一格=一个窗口或一个等待格）。<br>格子：<span class="heat-cell cell-hit">2</span> 红=这个窗口中了，数字=<b>在本窗第几期中的</b>（1/2/3）；<span class="heat-cell cell-miss1">一</span><span class="heat-cell cell-miss2">二</span><span class="heat-cell cell-miss3">三</span> 蓝/绿/黄=错窗，<b>连错到第几窗</b>；<span class="heat-cell cell-wait">等3</span> 浅绿格=正在等号重开（或两窗之间空等了几期）；<span class="heat-cell cell-live">进2</span> 淡紫格=这条线现在有窗口在跑、已经跑到第2期（还没开奖，不算结果）；空格=该线当年还没走到这一件。</div></div>';
    html += '<div class="panel panel--wmheat"><div class="panel__body heatmap wm-heat"><table class="heatmap__table"><thead><tr><th class="row-label">行</th>';
    perLine.forEach(function (p) { html += "<th>" + p.label.replace("追号码 ", "号").replace("追推荐 ", "推") + "</th>"; });
    html += "</tr></thead><tbody>";
    // 旧在上、新在下（和尾数遗漏热图同方向）：各线从底部对齐，最新的那件事永远在最底下一行
    // 性能：默认只渲染最近60行（和全站其它长表一致），点“显示全部”再全量画，避免手机上卡顿
    var showRows = perfExpandAll["windowMiss"] ? maxN : Math.min(maxN, 60);
    for (var r = maxN - showRows; r < maxN; r++) {
      // 行号保留数字（不要留空列）：最底「最新」，往上依次 1、2、3…（=往前第几格）
      var rowLabel = (r === maxN - 1) ? "最新" : String(maxN - 1 - r);
      // 不做“这一行中了几条线”的跨线合计：每一行不是同一个时点，各线窗口进度不同，加起来的数不成立
      html += '<tr><td class="row-label">' + rowLabel + "</td>";
      perLine.forEach(function (p) {
        var c = p.events[r - (maxN - p.events.length)];
        if (!c) { html += '<td><span class="heat-cell cell-empty">&nbsp;</span></td>'; return; }
        if (c.kind === "wait") {
          html += '<td data-window-amount="0" title="等待尾' + (c.tail != null ? c.tail : "-") + '重新开出 · 本期0元"><span class="heat-cell cell-wait">等' + c.wait;
          if (c.tail != null) html += '<span class="heat-cell__sub">尾' + c.tail + "</span>";
          html += "</span></td>";
          return;
        }
        if (c.kind === "live") {
          html += '<td data-window-amount="' + Number(c.amount || 0) + '" title="当前窗口起始 ' + (c.start || "-") + ' · 第' + c.stage + '期' + (c.tail != null ? " · 锁定尾" + c.tail : "") + ' · 本期' + Number(c.amount || 0) + '元"><span class="heat-cell cell-live">进' + c.stage;
          if (c.tail != null) html += '<span class="heat-cell__sub">尾' + c.tail + "</span>";
          html += '<span class="heat-cell__amount ' + (Number(c.amount || 0) > 0 ? "is-bet" : "is-zero") + '">' + Number(c.amount || 0) + "元</span>";
          html += "</span></td>";
          return;
        }
        if (c.kind === "hit") { html += '<td><span class="heat-cell cell-hit">' + c.hitAt + "</span></td>"; return; }
        var cls = "cell-miss" + Math.min(4, c.miss);
        html += '<td><span class="heat-cell ' + cls + '">' + (CN[c.miss] || c.miss) + "</span></td>";
      });
      html += "</tr>";
    }
    html += "</tbody></table></div></div></div>";
    html += perfMoreBtn("windowMiss", maxN, showRows, "行");
    html += wmRunHistoryHTML(maxStage, curYear);
    view.innerHTML = html;
    var hm = view.querySelector(".panel--wmheat .heatmap");
    if (hm) hm.scrollTop = hm.scrollHeight;
  }

  function renderTrendImpl() {
    var heatPeriods = perfRows("trend", periods);
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
    html += perfMoreBtn("trend", periods.length, heatPeriods.length);
    html += fullRunHistoryHTML();

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







  var segmentsPageCache = {};

  function segmentsHTMLFor(w) {
    var cacheKey = String(w) + "|" + D.length;
    if (segmentsPageCache[cacheKey]) return segmentsPageCache[cacheKey];
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
      segs.forEach(function(seg, idx) {
        var c = countInSeg(t, seg.si, seg.ei);
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
    segmentsPageCache[cacheKey] = html;
    return html;
  }

  function renderSegments() {
    view.innerHTML = segmentsHTMLFor(state.segWindow);
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
    { id: "prob1", label: "概率第1", kind: "probability", rank: 0, startPeriod: D.length - latest + 294, plan: [0, 0, 0], hold: "5/7/15/21/30新方法正式选号；仓位公式未验证，暂不配仓" },
    { id: "prob2", label: "概率第2", kind: "probability", rank: 1, startPeriod: D.length - latest + 294, plan: [0, 0, 0], hold: "5/7/15/21/30新方法正式选号；仓位公式未验证，暂不配仓" },
    { id: "prob3", label: "概率第3", kind: "probability", rank: 2, startPeriod: D.length - latest + 294, plan: [0, 0, 0], hold: "5/7/15/21/30新方法正式选号；仓位公式未验证，暂不配仓" },
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
    prob1: { formula: "正式选号·仓位待验证", train: [0, 0, 0], valid: [0, 0, 0], fullNet: 0, fullRoi: 0, trainNet: 0, validNet: 0, maxDrawdown: 0, miss: 0 },
    prob2: { formula: "正式选号·仓位待验证", train: [0, 0, 0], valid: [0, 0, 0], fullNet: 0, fullRoi: 0, trainNet: 0, validNet: 0, maxDrawdown: 0, miss: 0 },
    prob3: { formula: "正式选号·仓位待验证", train: [0, 0, 0], valid: [0, 0, 0], fullNet: 0, fullRoi: 0, trainNet: 0, validNet: 0, maxDrawdown: 0, miss: 0 },
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
    // 统一口径：已开奖的期次一律用「开奖前保存的真实快照」推荐，没快照的老期次才回落到模型重算
    var snap = execSnapshotPick(period, stream);
    if (snap) return snap;
    var prediction = execPrediction(period);
    var picks = prediction.doubleRecommendation || [];
    return picks[stream === "D1" ? 0 : 1] || null;
  }

  // 从 window.APP_SNAPSHOTS.detail（真实快照逐期记录）取该期该流的推荐号
  function execSnapshotPick(period, stream) {
    var detail = (window.APP_SNAPSHOTS && Array.isArray(window.APP_SNAPSHOTS.detail)) ? window.APP_SNAPSHOTS.detail : [];
    for (var i = detail.length - 1; i >= 0; i--) {
      var rec = detail[i];
      if (!rec || Number(rec.target) !== Number(period) || !Array.isArray(rec.picks)) continue;
      var p = rec.picks[stream === "D1" ? 0 : 1];
      return p ? { tail: p.tail, score: p.score, grade: p.grade, tag: p.tag, bucket: p.bucket, fromSnapshot: true } : null;
    }
    return null;
  }

  function execCurrentTail(line, result, period) {
    if (line.kind === "tail") return Number(line.tail);
    if (result && result.active && result.active.lockedTail != null) return Number(result.active.lockedTail);
    var pick = execPick(period, line.stream);
    if (pick) return Number(pick.tail);
    if (result && result.waiting) return Number(result.waiting.tail);
    return null;
  }

  function planRisk(plan) {
    return plan.reduce(function (sum, amount) { return sum + Number(amount || 0); }, 0);
  }


  // ===== 下注执行表：1:7:15 两套方案（只做两期 / 三期全打），逐期提醒每条线下多少 =====
  var BET_STAKES = [100, 700, 1500];
  var BET_HALF = [100, 300, 700];
  // 13线引擎跑在“全表序号”上；页面上统一显示“当年第几期”
  function betLocalPeriod(g) {
    var row = D[Number(g) - 1];
    if (row) return Number(row.p);
    var lastRow = D[D.length - 1];
    return lastRow ? Number(lastRow.p) + (Number(g) - D.length) : Number(g);
  }
  var BET_ODDS = 1.8;
  // 2026年验证为正的线路（两期方案和三期方案各自算）；其余线路本方案不配仓，仍可切“显示全部13条”查看
  var BET_POSITIVE = {
    // 追号码D1 / 追推荐D1 已暂停建仓（首推近期失效），不再出现在任何下注组合里
    two: ["tail0", "tail1", "tail6", "tail8", "tail9"],
    three: ["tail0", "tail1", "tail4", "tail6", "tail7", "tail9"],
  };
  function betPositiveLines(maxStage) {
    return BET_POSITIVE[maxStage >= 3 ? "three" : "two"];
  }

  // 每年最优5条：按该年净收益从高到低取前5（跑出来给页面看，用来分年对比）
  // 窗口体检：这个窗口该不该下、下多重（只看该窗口之前已结算的窗口，和回测同一套规则）
  function betVerdictFor(line, maxStage) {
    // 只按窗口对错算（连中/连错段长度），不看金额
    var rg = betRegimeFor(line, maxStage);
    if (!rg || !rg.state) return { verdict: "样本不足", stakes: null, reason: "对错样本不足，暂时按原额" };
    if (rg.state === 1) {
      if (!rg.winP75 || rg.len <= rg.winP75) {
        return { verdict: "正常下注", stakes: BET_STAKES.slice(0, maxStage), state: 1, len: rg.len, reason: "连中第" + rg.len + "窗 · 在连中段p75(" + (rg.winP75 || 0) + "窗)内" };
      }
      return { verdict: "轻仓·怕翻转", stakes: BET_HALF.slice(0, maxStage), state: 1, len: rg.len, reason: "连中第" + rg.len + "窗 · 已超连中段p75(" + rg.winP75 + "窗)" };
    }
    if (rg.loseP90 && rg.len > rg.loseP90) {
      return { verdict: "停 · 退出观察", stakes: null, state: -1, len: rg.len, reason: "连错第" + rg.len + "窗 · 超历史p90(" + rg.loseP90 + "窗)" };
    }
    if (rg.loseP75 && rg.len > rg.loseP75) {
      return { verdict: "轻仓·试单", stakes: BET_HALF.slice(0, maxStage), state: -1, len: rg.len, reason: "连错第" + rg.len + "窗 · 接近历史p90(p75=" + rg.loseP75 + "窗)" };
    }
    return { verdict: "不下 · 连错期", stakes: null, state: -1, len: rg.len, reason: "连错第" + rg.len + "窗 · 还在历史连错段均值(" + (rg.loseAvg || 0).toFixed(1) + "窗)以内" };
  }

  function betYearTop5(maxStage, year) {
    var rows = EXEC_LINES.map(function (line) {
      var acc = betLineAccount(line, maxStage, year);
      return { id: line.id, label: line.label, net: acc.net, windows: acc.windows, roi: acc.roi };
    });
    rows.sort(function (a, b) { return b.net - a.net; });
    return { top: rows.slice(0, 5), bottom: rows.slice(-5), all: rows,
      sum: rows.slice(0, 5).reduce(function (s, r) { return s + r.net; }, 0),
      bottomSum: rows.slice(-5).reduce(function (s, r) { return s + r.net; }, 0) };
  }

  // 规律轮动排队：盈利状态优先（离均值越远越好=状态越新），其次亏损但没超退出线的（越接近历史翻转点越好），超过p90的排最后
  // 性格序列：只看窗口对错，不看金额。每个窗口记“连中第几窗 / 连错第几窗”，年初重新起算。
  // 中窗（窗口3期内命中过）= 连中 +1；错窗（3期全错）= 连错 +1；中了/错了就按对错翻段。
  function betPersonalitySeries(line, maxStage) {
    var rows = wmWindowsForStage(line, maxStage);
    var states = [];
    var curYear = null, prevState = 0, len = 0;
    for (var i = 0; i < rows.length; i++) {
      var y = wmYearOf(rows[i].start);
      if (y !== curYear) { curYear = y; prevState = 0; len = 0; }
      var st = rows[i].hitIndex > 0 ? 1 : -1;
      if (st === prevState) len++; else { prevState = st; len = 1; }
      states.push({ state: st, len: len, start: rows[i].start });
    }
    return { rows: rows, states: states };
  }

  // 选号参考表：14 条线一行，给用户自己挑 2-3 条下注（只做参考，不是指令）
  function betPickRefRows(maxStage) {
    var out = {};
    EXEC_LINES.forEach(function (line) {
      var seq = wmWindowsForStage(line, maxStage).map(function (w) { return w.hitIndex > 0 ? 1 : 0; });
      var n = seq.length;
      var h = seq.reduce(function (a, b) { return a + b; }, 0);
      var streak = 0;
      for (var i = seq.length - 1; i >= 0 && seq[i] === 0; i--) streak++;
      var a1n = 0, a1h = 0;
      for (var j = 0; j + 1 < seq.length; j++) {
        if (seq[j] === 0) { a1n++; if (seq[j + 1]) a1h++; }
      }
      var now = wmStageNow(line, maxStage);
      var state = line.hold ? "暂停建仓"
        : (now.waiting ? "等待重开 · 等尾" + now.waiting.tail + "开出"
          : (now.active ? ("窗口第" + ((now.active.attempts || []).length + 1) + "期 · 锁尾" + (now.active.lockedTail != null ? now.active.lockedTail : "每期推荐"))
            : "可开新窗"));
      var rate = n ? h / n : 0;
      var after = a1n ? a1h / a1n : null;
      // 三期里"第1/2/3期"各自的条件命中率：第2期的分母=第1期没中的那些窗，第3期同理
      var t1 = 0, t2 = 0, t3 = 0, c1 = 0, c2 = 0, c3 = 0;
      wmWindowsForStage(line, maxStage).forEach(function (w) {
        var att = w.attempts || [];
        for (var k = 0; k < att.length && k < maxStage; k++) {
          if (k === 0) t1++;
          else if (k === 1) t2++;
          else if (k === 2) t3++;
          if (att[k] && att[k].hit) { if (k === 0) c1++; else if (k === 1) c2++; else if (k === 2) c3++; break; }
        }
      });
      var p1 = t1 ? c1 / t1 : 0, p2 = t2 ? c2 / t2 : 0, p3 = t3 ? c3 / t3 : 0;
      var verdict, color;
      if (line.hold) { verdict = "暂停建仓（首推失效）"; color = "#991b1b"; }
      else if (now.waiting) { verdict = "等待重开 · 先躲"; color = "#b45309"; }
      else if (n < 100) { verdict = "样本不足 · 观察"; color = "#64748b"; }
    // 门槛按口径分开：三期随机基准 91.1%、两期随机基准 80.1%（各算各的，别拿三期门槛卡两期）
    else if (rate < (maxStage === 2 ? 0.78 : 0.88)) { verdict = "避开（历史偏弱）"; color = "#dc2626"; }
    else if (streak >= 1) { verdict = "刚错窗 · 观望"; color = "#d97706"; }
    else if (after != null && after >= rate && rate >= (maxStage === 2 ? 0.82 : 0.90)) { verdict = "可关注"; color = "#16a34a"; }
      else { verdict = "中性"; color = "#475569"; }
      var ps = betPersonalitySeries(line, maxStage);
      var lastP = ps.states.length ? ps.states[ps.states.length - 1] : { state: 0, len: 0 };
      var personality = lastP.state === 1 ? ("连中" + lastP.len + "窗") : (lastP.state === -1 ? ("连错" + lastP.len + "窗") : "样本不足");
      var pColor = lastP.state === 1 ? "#16a34a" : (lastP.state === -1 ? "#dc2626" : "#64748b");
      out[line.id] = { line: line, n: n, rate: rate, streak: streak, after: after, a1n: a1n, net2026: betLineAccount(line, maxStage, 2026).net, state: state, verdict: verdict, color: color, personality: personality, pColor: pColor, p1: p1, p2: p2, p3: p3, t1: t1, t2: t2, t3: t3 };
    });
    return out;
  }

  // ===== 节奏链条（三个页面统一用这一条，不再各写一套）=====
  // ① 线性格选方向（这条线这个阶段跟不跟）
  // ② 窗口选号（当下这个窗口打不打、打哪个号）
  // ③ 第几期定轻重（这条线历史上第1/2/3期谁最容易中，决定重仓还是轻仓）
  // 只按窗口对错说规律：连中几窗 / 连错几窗，跟历史连中、连错段长度比
  function betChainRegimeText(rg) {
    if (!rg || !rg.state) return { text: "对错样本不足", color: "#64748b" };
    if (rg.state === 1) {
      var overWin = rg.winP75 && rg.len > rg.winP75;
      return {
        text: "连中第" + rg.len + "窗 · 历史连中段均值 " + rg.winAvg.toFixed(1) + " 窗" + (overWin ? " · 已超p75，注意翻转" : " · 正常"),
        color: overWin ? "#b45309" : "#166534"
      };
    }
    if (rg.loseP90 && rg.len > rg.loseP90) {
      return { text: "连错第" + rg.len + "窗 · 已超历史p90（" + rg.loseP90 + "窗）→ 建议停这条线观察", color: "#991b1b" };
    }
    if (rg.loseP75 && rg.len > rg.loseP75) {
      return { text: "连错第" + rg.len + "窗 · 超75%分位（" + rg.loseP75 + "窗）· 准备减仓", color: "#b45309" };
    }
    return {
      text: "连错第" + rg.len + "窗 · 历史连错段均值 " + (rg.loseAvg || 0).toFixed(1) + " 窗 · 还在正常范围（离历史p90还差 " + Math.max(0, (rg.loseP90 || 0) - rg.len) + " 窗）",
      color: "#166534"
    };
  }

  function betChainHTML(line, maxStage, liveIn, refIn, stakeIn) {
    var live = liveIn || betLiveInfo(line, maxStage);
    var ref = refIn || betPickRefRows(maxStage)[line.id];
    var rg = betRegimeFor(line, maxStage);
    var rgInfo = betChainRegimeText(rg);
    var stake = stakeIn != null ? stakeIn : live.stake;
    var dirText = line.hold ? "暂停建仓（首推失效）"
      : live.waiting ? "先躲 · 上窗全错等重开"
      : (rg && rg.state === 1 ? "可跟 · 连中段" : (rg && rg.state === -1 ? "观察 · 连错段" : "观察 · 对错样本不足"));
    var pickText = line.hold ? "暂停建仓 · 只跑窗口不建仓"
      : live.waiting ? ("等尾" + live.waiting.tail + "开出后才开新窗口")
      : live.active ? ("窗口第" + live.stage + "期 · " + (live.active.lockedTail != null ? "锁尾" + live.active.lockedTail : "每期最新推荐"))
      : "空仓等待新窗口";
    var acc = betLineAccount(line, maxStage, null);
    var pct = function (x) { return (x * 100).toFixed(0) + "%"; };
    var stakeText = stake > 0
      ? ("第" + live.stage + "期下 " + stake + "元")
      : (line.hold ? "不下（暂停建仓）" : (live.waiting ? "不下（等重开）" : "不下"));
    var html = '<div class="bet-chain">';
    html += '<div class="bet-chain__step bet-chain__step--dir"><b>① 线方向 · 选不选这条线</b>';
    html += '<span style="font-weight:900;color:' + ref.pColor + '">对错性格 ' + ref.personality + "</span> · " + dirText;
    html += '<span style="color:' + rgInfo.color + '">对错规律 · ' + rgInfo.text + "</span>";
    html += "</div>";
    html += '<div class="bet-chain__step bet-chain__step--pick"><b>② 窗口选号 · 这窗打不打</b>';
    html += "<span style=\"font-weight:900\">" + pickText + "</span>";
    html += '<span>本窗剩余风险 ' + (live.risk > 0 ? live.risk + "元" : "-") + " · 3期内命中率 " + (ref.rate * 100).toFixed(1) + "%（" + ref.n + "窗）</span>";
    html += "</div>";
    html += '<div class="bet-chain__step bet-chain__step--stake"><b>③ 第几期定轻重</b>';
    html += "<span>第1期中 " + pct(ref.p1) + "（" + ref.t1 + "）· 第2期中 " + pct(ref.p2) + "（" + ref.t2 + "）· 第3期中 " + pct(ref.p3) + "（" + ref.t3 + "）</span>";
    html += "<span>首次命中分布：第1期" + acc.firstHit[0] + " / 第2期" + acc.firstHit[1] + " / 第3期" + acc.firstHit[2] + " · 方案 " + BET_STAKES.slice(0, maxStage).join(" / ") + " · 本期 " + stakeText + "</span>";
    html += "</div></div>";
    return html;
  }

  function betRankLines(maxStage) {
    var rank = EXEC_LINES.map(function (line) {
      var rg = betRegimeFor(line, maxStage);
      var tier, score, note;
      if (!rg || !rg.state) {
        tier = 3; score = -1e6; note = "样本不足";
      } else if (rg.state === 1) {
        tier = 0; score = (rg.winAvg || 0) - rg.len;
        note = "连中第" + rg.len + "窗 · 历史连中段均值 " + (rg.winAvg || 0).toFixed(1) + "窗";
      } else if (rg.loseP90 && rg.len > rg.loseP90) {
        tier = 3; score = -1e6;
        note = "连错第" + rg.len + "窗 · 已超p90(" + rg.loseP90 + "窗)·退出观察";
      } else {
        tier = 1; score = -Math.abs((rg.loseAvg || 0) - rg.len);
        note = "连错第" + rg.len + "窗 · 历史连错段均值 " + (rg.loseAvg || 0).toFixed(1) + "窗";
      }
      return { line: line, rg: rg, tier: tier, score: score, note: note };
    });
    rank.sort(function (a, b) {
      if (a.tier !== b.tier) return a.tier - b.tier;
      return b.score - a.score;
    });
    return rank;
  }

  function betMaxStage() {
    return state.betPlanMode === "three" ? 3 : 2;
  }

  function betWindowRow(w, maxStage) {
    var att = w.attempts || [];
    var cost = 0;
    for (var k = 0; k < att.length; k++) cost += BET_STAKES[k] || 0;
    var hitAt = (w.hitIndex > 0 && w.hitIndex <= maxStage) ? w.hitIndex : 0;
    var back = hitAt ? BET_STAKES[hitAt - 1] * BET_ODDS : 0;
    return { cost: cost, back: back, net: back - cost, hitAt: hitAt };
  }

  function betLineAccount(line, maxStage, year) {
    var rows = wmWindowsForStage(line, maxStage);
    var acc = { windows: 0, hit: 0, miss: 0, cost: 0, back: 0, net: 0, roi: 0, firstHit: [0, 0, 0] };
    rows.forEach(function (w) {
      if (year && wmYearOf(w.start) !== year) return;
      var r = betWindowRow(w, maxStage);
      acc.windows++; acc.cost += r.cost; acc.back += r.back;
      if (r.hitAt) { acc.hit++; acc.firstHit[r.hitAt - 1]++; } else { acc.miss++; }
    });
    acc.net = acc.back - acc.cost;
    acc.roi = acc.cost ? acc.net / acc.cost : 0;
    return acc;
  }

  // 性格规律提示：当前盈亏状态（最近5窗累计）已持续多少窗，对照该线历史亏损段分位线
  function betRegimeFor(line, maxStage) {
    // 统一口径（唯一来源）：状态 = 本窗口之前最近 5 个已结算窗口的累计盈亏，≥0 记“稳定(盈利段)”，<0 记“动荡(亏损段)”，
    // 年初重新起算；len = 这个状态已经连续持续了几个窗口。逐窗标记(稳N/动荡N)、选号参考表、性格规律提示必须全部读这一套，禁止各算一套。
    var ps = betPersonalitySeries(line, maxStage);
    var states = ps.states;
    var runs = [];
    var cur = null;
    states.forEach(function (s) {
      if (!s.state) return;
      if (!cur || cur.sign !== s.state) { cur = { sign: s.state, len: 1 }; runs.push(cur); }
      else cur.len++;
    });
    var loseRuns = runs.filter(function (r) { return r.sign === -1; }).map(function (r) { return r.len; }).sort(function (a, b) { return a - b; });
    var winRuns = runs.filter(function (r) { return r.sign === 1; }).map(function (r) { return r.len; }).sort(function (a, b) { return a - b; });
    function avg(a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : 0; }
    function q(a, p) { return a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : 0; }
    var last = null;
    for (var i = states.length - 1; i >= 0; i--) {
      if (states[i].state) { last = states[i]; break; }
    }
    if (!last) return { state: 0, len: 0, samples: runs.length };
    return {
      state: last.state, len: last.len,
      loseAvg: avg(loseRuns), loseP75: q(loseRuns, 0.75), loseP90: q(loseRuns, 0.9),
      winAvg: avg(winRuns), winP75: q(winRuns, 0.75),
      samples: runs.length,
    };
  }

  function betLiveInfo(line, maxStage) {
    var st = wmStageNow(line, maxStage);
    if (st.waiting) return { waiting: st.waiting, active: null, stage: 0, stake: 0, risk: 0 };
    if (!st.active) return { waiting: null, active: null, stage: 0, stake: 0, risk: 0 };
    var stage = (st.active.attempts || []).length + 1;
    var stake = stage <= maxStage ? BET_STAKES[stage - 1] : 0;
    var risk = 0;
    for (var k = stage - 1; k < maxStage; k++) risk += BET_STAKES[k];
    return { waiting: null, active: st.active, stage: stage, stake: stake, risk: risk };
  }

  function betWindowRowsHTML(line, w, maxStage) {
    var out = "";
    // 只渲染本方案实际检查的期数：两期方案就是第1/2期，不再多列一行第3期（用户要求）
    for (var k = 0; k < maxStage; k++) {
      var g = Number(w.start) + k;
      var period = betLocalPeriod(g);
      var at = (w.attempts || [])[k] || null;
      var tail = at && at.tail != null ? at.tail : wmLiveTailFor(line, w, g);
      var stateText = at ? (at.hit ? "中" : "错") : (period <= latest ? "未记录" : "待开奖");
      var tone = at ? (at.hit ? "#16a34a" : "#dc2626") : "#2563eb";
      var inPlan = k + 1 <= maxStage;
      out += '<div style="display:flex;align-items:center;gap:6px;margin-top:3px;font-size:11px' + (inPlan ? "" : ";opacity:.45") + '">';
      out += '<span style="flex:0 0 34px;font-weight:900;color:#475569">第' + (k + 1) + '期</span>';
      out += '<span style="color:#6b7280">第' + period + '期</span>';
      out += '<span style="margin-left:auto;font-weight:900">' + (tail != null ? "尾" + tail : "待定") + "</span>";
      out += '<span style="flex:0 0 30px;text-align:right;font-weight:900;color:' + tone + '">' + stateText + "</span>";
      out += '<span style="flex:0 0 56px;text-align:right;color:#64748b">' + BET_STAKES[k] + "元</span>";
      out += "</div>";
    }
    return out;
  }

  function renderBetExec() {
    var maxStage = betMaxStage();
    execPredCache = {};
    var modeLabel = maxStage === 2 ? "只做两期（100 / 700）" : "三期全打（100 / 700 / 1500）";
    var year = 2026;
    var positiveLines = betPositiveLines(maxStage);
    var ranked = betRankLines(maxStage);
    var rankedIds = ranked.map(function (r) { return r.line.id; });
    var topFiveIds = ranked.slice(0, 5).map(function (r) { return r.line.id; });
    var yearTop = {};
    [2021, 2022, 2023, 2024, 2025, 2026].forEach(function (y) { yearTop[y] = betYearTop5(maxStage, y); });
    var lastYearTopIds = (yearTop[2025] || { top: [] }).top.map(function (r) { return r.id; });
    var lines;
    if (state.betLineMode === "verdict") lines = EXEC_LINES.slice();
    else if (state.betLineMode === "all") lines = EXEC_LINES.slice();
    else if (state.betLineMode === "positive") lines = EXEC_LINES.filter(function (l) { return positiveLines.indexOf(l.id) >= 0; });
    else if (state.betLineMode === "rotate5") lines = EXEC_LINES.filter(function (l) { return topFiveIds.indexOf(l.id) >= 0; });
    else if (state.betLineMode === "lastyear") lines = EXEC_LINES.filter(function (l) { return lastYearTopIds.indexOf(l.id) >= 0; });
    else lines = EXEC_LINES.filter(function (l) {
      var rr = ranked.filter(function (x) { return x.line.id === l.id; })[0];
      return rr && rr.rg && rr.rg.state === 1;
    }).slice(0, 5);
    var plan = [];
    lines.forEach(function (line) {
      var live = betLiveInfo(line, maxStage);
      var v = state.betLineMode === "verdict" ? betVerdictFor(line, maxStage) : null;
      var betStake = live.stake, risk = live.risk;
      if (line.hold) {
        // 暂停建仓的线：仓位一律归零，但窗口和对错记录照常跑
        betStake = 0; risk = 0;
      } else if (v) {
        if (v.stakes) {
          betStake = live.stage >= 1 && live.stage <= maxStage ? (v.stakes[live.stage - 1] || 0) : 0;
          risk = 0;
          for (var vk = live.stage - 1; vk < maxStage; vk++) risk += v.stakes[vk] || 0;
        } else { betStake = 0; risk = 0; }
      }
      plan.push({
        line: line,
        live: live,
        betStake: betStake,
        risk: risk,
        v: v,
        acc: betLineAccount(line, maxStage, year),
        all: betLineAccount(line, maxStage, null),
        regime: betRegimeFor(line, maxStage),
      });
    });
    var todayTotal = plan.reduce(function (s, r) { return s + r.betStake; }, 0);
    var todayRisk = plan.reduce(function (s, r) { return s + r.risk; }, 0);
    var skipCount = plan.filter(function (r) { return !(r.betStake > 0); }).length;
    var yearNet = plan.reduce(function (s, r) { return s + r.acc.net; }, 0);
    var yearCost = plan.reduce(function (s, r) { return s + r.acc.cost; }, 0);

    var modeShort = maxStage === 2 ? "只做两期" : "三期全打";
    var html = '';
    // 和追号码/追推荐同一个交互：一个页面，上面两个按钮点一下切换
    html += '<div class="section"><div class="panel" style="padding:12px">';
    html += '<div class="wm-view-tabs" style="margin-bottom:8px">';
    html += '<button class="chip wm-view-tab' + (maxStage === 3 ? " is-active" : "") + '" type="button" data-bet-mode="three">三期窗口（下单主口径）</button>';
    html += '<button class="chip wm-view-tab' + (maxStage === 2 ? " is-active" : "") + '" type="button" data-bet-mode="two">两期窗口（仅研究对照）</button>';
    html += '</div>';
    html += '<div class="panel__body" style="font-size:13px;line-height:1.75">当前方案：<b>' + modeLabel + '</b>。<br>';
    if (maxStage === 2) {
      html += "一个窗口只做两期：第1期100元、第2期700元；两期都没中就结束这个窗口，等锁定号重新开出后再开新窗口（两期口径自己一套，不看第3期）。";
    } else {
      html += "一个窗口做到第3期：第1期100元、第2期700元、第3期1500元；任意一期命中或三期全错就结束窗口，全错后等锁定号重新开出再开新窗口。";
    }
    html += '<br>赔率 ' + BET_ODDS + '（打平线 ' + (100 / BET_ODDS).toFixed(2) + '%）· 第1期中 +80 / 第2期中 +460' + (maxStage === 3 ? " / 第3期中 +400 / 三期全错 -2300" : " / 两期没中 -800") + ' · 窗口由真实开奖算出。</div>';
    html += '<details style="margin-top:8px"><summary style="font-size:12px;font-weight:800;color:#475569;cursor:pointer">口径与回测说明（默认收起 · 性格规律、走步回测、窗口体检）</summary>';
    html += '<div class="panel__body" style="font-size:12px;line-height:1.7;color:#475569;margin-top:6px">性格规律提示：把最近5个窗口的累计盈亏当作“当前状态”，看它已经持续了几个窗口，再跟这条线自己过去6年的状态段长度比——亏损状态超过 p75（约7窗）提示准备减仓，超过 p90（三期约10窗 / 两期约11窗）提示停这条线观察；盈利状态超过 p75 提示注意见顶。<b>点上面两个按钮切换方案时，性格提示会跟着用对应方案的窗口和阈值重算。</b></div>';
    html += '<div class="panel__body" style="font-size:12px;line-height:1.7;color:#475569;margin-top:4px">走步回测（2021-2026，无未来数据）：<b>只做盈利状态（≤5条）在两期方案下是唯一五年回测为正的组合</b>（+15,540 / ROI 0.8%，投入202万），比全做10条（-0.9%）和固定9条（0.0%）都好；三期方案下轮动反而更差，所以三期更该少换线。</div>';
    html += '<div class="panel__body" style="font-size:12px;line-height:1.7;color:#475569;margin-top:4px"><b>窗口体检</b>：热（盈利状态）就下、冷（亏损状态）就不下——盈利超 p75 转轻仓、亏损在 p75~p90 轻仓试、亏损超 p90 直接停。走步回测：两期方案 +11,260 / ROI 0.5%（下注 5,895 窗、跳过 5,219 窗，跳过约 47%）；三期方案体检反而变差（-0.5%），三期不建议用体检。</div>';
    html += '</details>';
    html += '</div></div>';

    html += '<div class="section"><div class="section__head"><h2 class="section__title">下注执行表 · ' + modeShort + '</h2><span class="section__hint">每一期提醒每条线下多少 · 固定线路顺序 · 只提示，不自动下单</span></div>';
    html += '<details' + (state.betResearchOpen ? " open" : "") + ' style="margin:4px 0 10px"><summary style="font-size:12px;font-weight:800;color:#475569;cursor:pointer">更多筛选 / 研究对照（默认不用 · 当前按 1:7:15 全做）</summary>';
    html += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">';
    html += '<button class="chip ' + (state.betLineMode === "verdict" ? "is-active" : "") + '" data-bet-lines="verdict">窗口体检下单（该下才下）</button>';
    html += '<button class="chip ' + (state.betLineMode === "win5" ? "is-active" : "") + '" data-bet-lines="win5">只做盈利状态（≤5条）</button>';
    html += '<button class="chip ' + (state.betLineMode === "rotate5" ? "is-active" : "") + '" data-bet-lines="rotate5">规律轮动 · 前5条（含亏损补位）</button>';
    html += '<button class="chip ' + (state.betLineMode === "lastyear" ? "is-active" : "") + '" data-bet-lines="lastyear">去年最优5条（走步）</button>';
    html += '<button class="chip ' + (state.betLineMode === "positive" ? "is-active" : "") + '" data-bet-lines="positive">只做验证为正的线（D1已剔除）</button>';
    html += '<button class="chip ' + (state.betLineMode === "all" ? "is-active" : "") + '" data-bet-lines="all">显示全部13条</button>';
    html += '</div>';
    // 规律排队：谁该在下注组里，一眼看完
    html += '<div class="wm-subhead">规律排队 · 1-5 当前组 / 6-10 第二组 / 11-14 待观察</div>';
    html += '<div class="wm-hscroll" style="display:flex;gap:6px;padding-bottom:4px">';
    ranked.forEach(function (r, i) {
      var inGroup = i < 5, inSecond = i >= 5 && i < 10;
      var tone = inGroup ? "#16a34a" : (inSecond ? "#2563eb" : "#cbd5e1");
      html += '<div style="min-width:176px;border:2px solid ' + tone + ';border-radius:8px;padding:7px 9px;background:' + (inGroup ? "#f0fdf4" : "#fff") + '">';
      html += '<div style="font-size:12px;font-weight:900;color:' + tone + '">#' + (i + 1) + (inGroup ? " · 当前组" : (inSecond ? " · 第二组" : " · 待观察")) + " " + r.line.label + "</div>";
      html += '<div style="font-size:11px;color:#475569;margin-top:3px">' + r.note + "</div>";
      html += "</div>";
    });
    html += "</div>";
    // 年度最优5条：每年一组，分开看
    html += '<div class="wm-subhead">年度最优5条 · 每年一组（走步可执行的只有“上一年”那一组）</div>';
    html += '<div class="wm-hscroll" style="display:flex;gap:6px;padding-bottom:4px">';
    [2021, 2022, 2023, 2024, 2025, 2026].forEach(function (y) {
      var t = yearTop[y];
      var used = (state.betLineMode === "lastyear" && y === 2025) || (state.betLineMode === "win5" && y === 2026);
      html += '<div style="min-width:216px;border:2px solid ' + (used ? "#16a34a" : "#e2e8f0") + ';border-radius:8px;padding:8px 9px;background:' + (used ? "#f0fdf4" : "#fff") + '">';
      html += '<div style="font-size:12px;font-weight:900;color:#0f172a">' + y + "年最优5条" + (used ? " · 当前在用" : "") + "</div>";
      html += '<div style="font-size:11px;color:#475569;margin-top:4px;line-height:1.7">' +
        t.top.map(function (r) { return r.label + " " + (r.net >= 0 ? "+" : "") + Math.round(r.net); }).join("<br>") + "</div>";
      html += '<div style="font-size:11px;font-weight:900;color:' + (t.sum >= 0 ? "#166534" : "#b91c1c") + ';margin-top:4px">这5条合计 ' + (t.sum >= 0 ? "+" : "") + Math.round(t.sum) + " 元</div>";
      html += "</div>";
    });
    html += "</div>";
    html += "</details>";
    html += '<div class="grid-3">';
    html += '<div class="stat"><div class="stat__value" style="color:#1d4ed8">' + todayTotal + '</div><div class="stat__label">本期合计（元）</div></div>';
    html += '<div class="stat"><div class="stat__value" style="color:#b45309">' + todayRisk + '</div><div class="stat__label">本窗最大风险（元）</div></div>';
    html += '<div class="stat"><div class="stat__value" style="color:' + (yearNet >= 0 ? "#16a34a" : "#dc2626") + '">' + (yearNet >= 0 ? "+" : "") + Math.round(yearNet) + '</div><div class="stat__label">2026年净收益（元）· ROI ' + (yearCost ? (yearNet / yearCost * 100).toFixed(1) : "0.0") + '%（假设13条全下）</div></div>';
    html += '<div class="stat"><div class="stat__value" style="color:#dc2626">' + skipCount + '</div><div class="stat__label">本期不下注（条）</div></div>';
    var totalWin = plan.reduce(function (s, r) { return s + r.acc.windows; }, 0);
    var totalHit = plan.reduce(function (s, r) { return s + r.acc.hit; }, 0);
    html += '<div class="stat"><div class="stat__value" style="color:#0f172a">' + (totalWin ? (totalHit / totalWin * 100).toFixed(1) : "0.0") + '%</div><div class="stat__label">2026年窗命中率 · 中' + totalHit + '/共' + totalWin + '窗</div></div>';
    var loseCount = plan.filter(function (r) { return r.acc.net < 0; }).length;
    html += '<div class="stat"><div class="stat__value" style="color:#dc2626">' + loseCount + '</div><div class="stat__label">亏损线（红卡）· 赚线 ' + (plan.length - loseCount) + ' 条</div></div>';
    var winStateCount = plan.filter(function (r) { return r.regime.state === 1; }).length;
    var loseStateCount = plan.filter(function (r) { return r.regime.state === -1; }).length;
    var overLine = plan.filter(function (r) { return r.regime.state === -1 && r.regime.loseP90 && r.regime.len > r.regime.loseP90; }).length;
    html += '<div class="stat"><div class="stat__value" style="color:#0f172a">' + winStateCount + " / " + loseStateCount + '</div><div class="stat__label">当前盈利状态 / 亏损状态 · 越退出线 ' + overLine + ' 条</div></div>';
    html += '</div></div>';

    // 今日规划：只列今天真要下的线路，号码 + 金额 + 第几期
    var betToday = plan.filter(function (r) { return r.betStake > 0; });
    html += '<div class="section"><div class="section__head"><h2 class="section__title">今日规划 · 第' + (latest + 1) + '期</h2><span class="section__hint">今天要下的每一注：线路 + 尾号 + 金额 + 第几期；按固定线路顺序排列，金额只按当前方案</span></div>';
    if (!betToday.length) {
      html += '<div style="font-size:14px;font-weight:900;color:#64748b">今天没有金额大于0的仓位，全部空仓</div>';
    } else {
      html += '<div class="position-card-grid">';
      betToday.forEach(function (r) {
        var line = r.line;
        var live = r.live;
        var tail = null;
        if (line.kind === "tail") tail = line.tail;
        else if (live.active && live.active.lockedTail != null) tail = live.active.lockedTail;
        else if (live.active) tail = wmLiveTailFor(line, live.active, Number(live.active.start) + (live.stage - 1));
        var title = line.label + (tail != null ? " · 尾" + tail : "");
        html += '<div class="position-card position-card--execution">';
        html += '<div class="position-card__title">' + title + "</div>";
        html += '<div style="font-size:18px;font-weight:900;color:#2563eb;margin-top:3px">' + r.betStake + "元</div>";
        html += '<div style="font-size:11px;color:#475569;margin-top:3px">第' + live.stage + "期 · " + (r.acc.net >= 0 ? "赚线" : "亏线") + "</div>";
        html += "</div>";
      });
      html += "</div>";
    }
    html += '<div class="grid-3" style="margin-top:10px">';
    html += '<div class="stat"><div class="stat__value" style="color:#1d4ed8">' + todayTotal + '</div><div class="stat__label">今日合计（元）</div></div>';
    html += '<div class="stat"><div class="stat__value" style="color:#b45309">' + todayRisk + '</div><div class="stat__label">本窗最大风险（元）</div></div>';
    html += '<div class="stat"><div class="stat__value" style="color:#dc2626">' + skipCount + '</div><div class="stat__label">今日不下注（条）</div></div>';
    html += '</div></div>';

    // 选号参考表：14 条线一行，自己挑 2-3 条下（只做参考，不是指令，也不自动下单）
    var refRows = betPickRefRows(maxStage);
    html += '<div class="section"><div class="section__head"><h2 class="section__title">选号参考表 · 自己挑 2-3 条下</h2><span class="section__hint">' + (maxStage === 2 ? "两期口径（一个窗口最多2期，没有第3期）" : "三期口径（一个窗口最多3期）") + ' · 不是指令：只看状态与规律，这窗下哪几条、下不下，你自己定</span></div>';
    html += '<div class="panel" style="padding:10px;overflow-x:auto;-webkit-overflow-scrolling:touch"><table class="table" style="min-width:1080px;font-size:12px"><thead><tr><th>线路</th><th>当前状态</th><th>对错性格</th><th>窗口命中率</th><th>第1期中</th><th>第2期中</th>' + (maxStage === 3 ? "<th>第3期中</th>" : "") + '<th>当前连错</th><th>错1窗后</th><th>今年净收益<br>（假设13条全下）</th><th>参考</th></tr></thead><tbody>';
    EXEC_LINES.forEach(function (line) {
      var r = refRows[line.id];
      html += '<tr><td><b>' + line.label + "</b></td>";
      html += "<td>" + r.state + "</td>";
      html += '<td><b style="color:' + r.pColor + '">' + r.personality + "</b></td>";
      html += "<td>" + (r.rate * 100).toFixed(1) + '%<span style="color:#94a3b8">（' + r.n + "窗）</span></td>";
      var mark = function (x) { return x >= 0.5556 ? '<b style="color:#16a34a">✅</b>' : '<span style="color:#94a3b8">·</span>'; };
      html += "<td>" + mark(r.p1) + " " + (r.p1 * 100).toFixed(0) + '%<span style="color:#94a3b8">（' + r.t1 + "）</span></td>";
      html += "<td>" + mark(r.p2) + " " + (r.p2 * 100).toFixed(0) + '%<span style="color:#94a3b8">（' + r.t2 + "）</span></td>";
      if (maxStage === 3) html += "<td>" + mark(r.p3) + " " + (r.p3 * 100).toFixed(0) + '%<span style="color:#94a3b8">（' + r.t3 + "）</span></td>";
      html += "<td>" + (r.streak ? r.streak + " 个" : "-") + "</td>";
      html += "<td>" + (r.after != null ? (r.after * 100).toFixed(0) + '%<span style="color:#94a3b8">（' + r.a1n + "）</span>" : "-") + "</td>";
      html += '<td style="color:' + (r.net2026 >= 0 ? "#16a34a" : "#dc2626") + '">' + (r.net2026 >= 0 ? "+" : "") + Math.round(r.net2026) + "</td>";
      html += '<td><b style="color:' + r.color + '">' + r.verdict + "</b></td></tr>";
    });
    html += "</tbody></table>";
    html += '<div style="font-size:11px;color:#64748b;margin-top:6px;line-height:1.7">读法：<b>对错性格</b>只看窗口对错、不看金额：<span style="color:#16a34a">连中N窗</span>=已连续N个窗口3期内命中，<span style="color:#dc2626">连错N窗</span>=已连续N个窗口3期全错（N是这一段连续长度，每年重新起算）。<b>可关注</b>=窗口命中率≥90% 且"错1窗后"不低于平时；<b>刚错窗·观望</b>=上一个窗口刚全错；<b>等待重开·先躲</b>=三期全错后正在等该号重新开出（此期间不下）；<b>避开</b>=历史窗口命中率低于88%；<b>暂停建仓</b>=模型首推近期失效。<b>净收益/ROI 都是"假设13条线全按公式下注"的模拟账，不是你实际下的单</b>（你的真账在「追三期下单」页）。</div>';
    html += "</div>";

    // ===== 两期 vs 三期 逐线对比（2026真实数据，只作参考，不改任何公式）=====
    var ref3 = betPickRefRows(3);
    var cmpRows = EXEC_LINES.map(function (line) {
      return { line: line, n2: betLineAccount(line, 2, 2026).net, n3: betLineAccount(line, 3, 2026).net, p3: ref3[line.id].p3 };
    });
    var sumTwo = 0, sumThree = 0;
    cmpRows.forEach(function (r) { sumTwo += r.n2; sumThree += r.n3; });
    html += '<div class="section"><div class="section__head"><h2 class="section__title">两期 / 三期 逐线对比 · 2026真实数据</h2><span class="section__hint">只作参考：正式战略固定三期；两期只做研究对照，不切换执行口径</span></div>';
    html += '<div class="panel" style="padding:10px;overflow-x:auto;-webkit-overflow-scrolling:touch"><table class="table" style="min-width:880px;font-size:12px"><thead><tr><th>线路</th><th>三期净收益（元）</th><th>两期净收益（元）</th><th>两期−三期</th><th>第3期中率</th><th>建议</th></tr></thead><tbody>';
    cmpRows.forEach(function (r) {
      var d = r.n2 - r.n3, advice, tone;
      var BE = 0.5556;   // 单期打平线（赔率1.8）
      if (r.line.hold) { advice = "永久不建仓"; tone = "#991b1b"; }
      else if (r.n2 < 0 && r.n3 < 0) { advice = "都亏 · 先躲"; tone = "#dc2626"; }
      // 第3期中率低于打平线 = 第3期这一注结构上就是亏的，不能因为今年三期多赚就选三期（那是波动）
      else if (r.p3 < BE && r.n3 > r.n2) { advice = "两期估算略高 · 正式仍按三期战略"; tone = "#2563eb"; }
      else if (r.n2 > r.n3 + 500) { advice = "两期估算略高 · 正式仍按三期战略"; tone = "#2563eb"; }
      else if (r.n3 > r.n2 + 500) { advice = "三期更优 · 正式口径"; tone = "#16a34a"; }
      else { advice = "差不多"; tone = "#475569"; }
      html += '<tr><td><b>' + r.line.label + "</b></td>";
      html += '<td style="color:' + (r.n3 >= 0 ? "#16a34a" : "#dc2626") + '">' + (r.n3 >= 0 ? "+" : "") + Math.round(r.n3) + "</td>";
      html += '<td style="color:' + (r.n2 >= 0 ? "#16a34a" : "#dc2626") + '">' + (r.n2 >= 0 ? "+" : "") + Math.round(r.n2) + "</td>";
      html += '<td style="color:' + (d >= 0 ? "#2563eb" : "#b45309") + '">' + (d >= 0 ? "+" : "") + Math.round(d) + "</td>";
      html += "<td>" + (r.p3 * 100).toFixed(1) + '%</td>';
      html += '<td><b style="color:' + tone + '">' + advice + "</b></td></tr>";
    });
    html += '<tr><td><b>合计</b></td><td><b>' + (sumThree >= 0 ? "+" : "") + Math.round(sumThree) + '</b></td><td><b>' + (sumTwo >= 0 ? "+" : "") + Math.round(sumTwo) + '</b></td><td><b>' + ((sumTwo - sumThree) >= 0 ? "+" : "") + Math.round(sumTwo - sumThree) + '</b></td><td>-</td><td>单窗最深亏 三期2300 / 两期800</td></tr>';
    html += "</tbody></table>";
    html += '<div style="font-size:11px;color:#64748b;margin-top:6px;line-height:1.7">读法：<b>两期−三期</b>正数=这条线两期多赚。第3期中率低的线（&lt;58%），三期第3期押1500只赚400、错一次亏2300，容易被拖死，两期只亏800更稳；第3期中率高的线（≥58%）三期能把+400收回来。两期单窗最深亏800、三期2300。</div>';
    html += "</div>";

    plan.forEach(function (row) {
      var line = row.line;
      var live = row.live;
      var stakeColor = row.betStake > 0 ? "#1d4ed8" : "#6b7280";
      // 亏钱的线单独配色：红边+红底+红标签，赚钱的绿边
      var losing = row.acc.net < 0;
      var lineTone = losing ? "#dc2626" : "#16a34a";
      var stateText = live.waiting ? ("等待重开 · 等尾" + live.waiting.tail + "开出")
        : (live.active ? ("窗口第" + live.stage + "期" + (row.betStake > 0 ? " · 本期下 " + row.betStake + "元" : " · 本期不下"))
          : "空仓等待新窗口");
      html += '<div class="section"><div class="panel" style="padding:12px 10px;border-left:6px solid ' + lineTone + ';background:' + (losing ? "#fef2f2" : "#fff") + '">';
      html += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">';
      html += '<b class="exec-line__label' + (line.kind === "tail" ? " exec-line__label--tail" : "") + '" style="' + (losing ? "color:#b91c1c" : "") + '">' + line.label + "</b>";
      if (losing) {
        html += '<span class="chip" style="background:#fee2e2;border-color:#fca5a5;color:#991b1b;font-weight:900">亏线（假设全下）· 本方案2026年 ' + Math.round(row.acc.net) + '元</span>';
      } else {
        html += '<span class="chip" style="background:#f0fdf4;border-color:#86efac;color:#166534;font-weight:900">赚线（假设全下）· 本方案2026年 ' + (row.acc.net >= 0 ? "+" : "") + Math.round(row.acc.net) + '元</span>';
      }
      html += '<span class="chip" style="font-weight:900;color:' + stakeColor + '">本期 ' + (row.betStake > 0 ? row.betStake + "元" : "-") + "</span>";
      html += '<span class="chip">' + stateText + "</span>";
      html += '<span class="chip">公式（元） ' + BET_STAKES.slice(0, maxStage).join(" / ") + "</span>";
      html += '<span class="chip">本窗剩余风险 ' + (row.risk > 0 ? row.risk + "元" : "-") + "</span>";
      html += '<span class="chip" style="background:' + (row.acc.net >= 0 ? "#f0fdf4" : "#fef2f2") + ';border-color:' + (row.acc.net >= 0 ? "#86efac" : "#fecaca") + ';color:' + (row.acc.net >= 0 ? "#166534" : "#b91c1c") + ';font-weight:900">2026年 ' + (row.acc.net >= 0 ? "+" : "") + Math.round(row.acc.net) + '元 · ROI ' + (row.acc.roi * 100).toFixed(1) + '%</span>';
      html += '<span class="chip">2026窗 ' + row.acc.windows + " · 中" + row.acc.hit + " / 错" + row.acc.miss + "</span>";
      html += '<span class="chip" style="font-weight:900">命中率 ' + (row.acc.windows ? (row.acc.hit / row.acc.windows * 100).toFixed(1) : "0.0") + '%</span>';
      var rankNo = rankedIds.indexOf(line.id) + 1;
      if (line.hold) {
        html += '<span class="chip" style="background:#fee2e2;border-color:#fca5a5;color:#991b1b;font-weight:900">暂停建仓 · ' + line.hold + "</span>";
      }
      if (state.betLineMode === "rotate5" && rankNo > 5) {
        html += '<span class="chip" style="background:#f1f5f9;color:#64748b;font-weight:900">不在当前组 · 规律排队 #' + rankNo + "</span>";
      } else if (state.betLineMode === "positive" && positiveLines.indexOf(line.id) < 0) {
        html += '<span class="chip" style="background:#f1f5f9;color:#64748b;font-weight:900">本方案不配仓</span>';
      }
      html += "</div>";

      // 节奏链条：① 线性格选方向 → ② 窗口选号 → ③ 第几期定轻重（随方案切换自动重算）
      html += '<div style="margin-top:8px">' + betChainHTML(line, maxStage, live, refRows[line.id], row.betStake) + "</div>";
      if (row.v) {
        var isOk = row.v.verdict.indexOf("正常") >= 0;
        var isStop = row.v.verdict.indexOf("停") >= 0;
        var isHalf = row.v.verdict.indexOf("轻仓") >= 0;
        var vTone = isOk ? "#166534" : (isStop ? "#991b1b" : (isHalf ? "#b45309" : "#475569"));
        var vBg = isOk ? "#f0fdf4" : (isStop ? "#fee2e2" : (isHalf ? "#fffbeb" : "#f1f5f9"));
        html += '<div style="margin-top:6px;padding:7px 9px;border-radius:8px;background:' + vBg + ';color:' + vTone + ';font-size:12px;font-weight:900">窗口体检 · ' +
          row.v.verdict + " ｜ " + row.v.reason + " ｜ 本期 " + (row.betStake > 0 ? row.betStake + "元" : "0元（不下）") + "</div>";
      }

      if (live.active) {
        html += '<div style="margin-top:9px;padding-top:8px;border-top:1px solid #e5e7eb">';
        html += '<div style="font-size:11px;font-weight:900;color:#475569">当前窗口 · 起始 第' + betLocalPeriod(live.active.start) + '期 · ' + (live.active.lockedTail != null ? "锁定尾" + live.active.lockedTail : "每期最新推荐") + "</div>";
        html += betWindowRowsHTML(line, live.active, maxStage);
        html += "</div>";
      } else if (live.waiting) {
        html += '<div style="margin-top:9px;padding-top:8px;border-top:1px solid #e5e7eb;font-size:11px;color:#b45309;font-weight:800">上窗三期全错 · 等尾' + live.waiting.tail + " 重新开出后再开新窗口（本期不下）</div>";
      }

      // 记录只展示最近一年（当年）的窗口
      var curYear = (D[D.length - 1] || {}).y;
      var rows = wmWindowsForStage(line, maxStage).filter(function (w) { return wmYearOf(w.start) === curYear; });
      // 窗口对错序列 + 连中/连错段长分布（只看对错，不看金额；不看金额也不只看最长，必须带出现频率）
      // 段长统计用全历史（多少年才出现一次才算得出频率），序列条只显示当年
      var allRows = wmWindowsForStage(line, maxStage);
      var yrSet = {};
      allRows.forEach(function (w) { yrSet[wmYearOf(w.start)] = 1; });
      var yearCount = Object.keys(yrSet).length || 1;
      var allWin = [], allLose = [], allSeg = null;
      allRows.forEach(function (w) {
        var v = w.hitIndex > 0 ? 1 : 0;
        if (!allSeg || allSeg.sign !== v) { allSeg = { sign: v, len: 1 }; (v ? allWin : allLose).push(allSeg); }
        else allSeg.len++;
      });
      var freqText = function (n) {
        if (!n) return "";
        var perYear = n / yearCount;
        if (perYear >= 1) return "约每年 " + (Math.round(perYear * 10) / 10) + " 次";
        var every = yearCount / n;
        return "约 " + (every >= 1.5 ? Math.round(every) : (Math.round(every * 10) / 10)) + " 年 1 次";
      };
      var runBrief = function (runs) {
        if (!runs.length) return "暂无";
        var lens = runs.map(function (r) { return r.len; });
        var sum = lens.reduce(function (a, b) { return a + b; }, 0);
        var maxLen = Math.max.apply(null, lens);
        var dist = {};
        lens.forEach(function (L) { var k = L >= 4 ? "4+" : String(L); dist[k] = (dist[k] || 0) + 1; });
        return "全历史 " + yearCount + " 年共 " + runs.length + " 段 · 均值 " + (sum / lens.length).toFixed(1) + " 窗 · 最长 " + maxLen + " 窗 · 长度出现频率 " + ["1", "2", "3", "4+"].filter(function (k) { return dist[k]; }).map(function (k) { return k + "窗×" + dist[k] + "次（" + freqText(dist[k]) + "）"; }).join(" / ");
      };
      var seqHit = rows.filter(function (w) { return w.hitIndex > 0; }).length;
      html += '<div style="margin-top:10px;padding-top:8px;border-top:1px solid #e5e7eb">';
      html += '<div class="record-format">窗口对错序列 · ' + WINDOW_RECORD_FORMAT + ' · 中 ' + seqHit + ' 窗 / 错 ' + (rows.length - seqHit) + ' 窗</div>';
      html += '<div class="exec-seq">';
      rows.slice().reverse().forEach(function (w) {
        var hit = w.hitIndex > 0;
        html += '<div class="exec-seq__cell ' + (hit ? "is-hit" : "is-miss") + '"><b>第' + betLocalPeriod(w.start) + '期</b><span>' + (hit ? "中" : "错") + '</span></div>';
      });
      html += "</div>";
      html += '<div style="font-size:11px;color:#334155;line-height:1.75"><b style="color:#16a34a">连中段</b>（连中几个窗口会断开）：' + runBrief(allWin) + '<br><b style="color:#dc2626">连错段</b>（错的时候连错几个窗口）：' + runBrief(allLose) + '<br><span style="color:#64748b">看危险不要只看最长：必须连频率一起看（多少年才出现一次）。</span></div>';
      // 逐年拆开：每年多少窗、中/错、连中段、连错段、连错2窗与3窗+各几次
      var yrsMap = {};
      allRows.forEach(function (w) { var y = wmYearOf(w.start); (yrsMap[y] = yrsMap[y] || []).push(w.hitIndex > 0 ? 1 : 0); });
      var segBrief = function (runs) {
        if (!runs.length) return "-";
        var lens = runs.map(function (r) { return r.len; });
        return (lens.reduce(function (a, b) { return a + b; }, 0) / lens.length).toFixed(1) + "窗 · 最长" + Math.max.apply(null, lens) + "窗";
      };
      html += '<div class="wm-hscroll" style="display:flex;gap:6px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding:6px 0;margin-top:2px">';
      [2021, 2022, 2023, 2024, 2025, 2026].forEach(function (y) {
        var seq = yrsMap[y] || [];
        if (!seq.length) return;
        var wR = [], lR = [], sg = null;
        seq.forEach(function (v) { if (!sg || sg.sign !== v) { sg = { sign: v, len: 1 }; (v ? wR : lR).push(sg); } else sg.len++; });
        var hitN = seq.filter(function (v) { return v; }).length;
        var l2 = lR.filter(function (r) { return r.len === 2; }).length;
        var l3 = lR.filter(function (r) { return r.len >= 3; }).length;
        html += '<div style="min-width:158px;border:1px solid #e2e8f0;border-radius:8px;padding:6px 8px;font-size:11px;line-height:1.65;background:#fff">';
        // 每年的窗口总数与命中率单独列出来（用户要求把总窗口按年拆开看）
        html += '<b>' + y + '年</b> · 共' + seq.length + '窗 · 中' + hitN + ' / 错' + (seq.length - hitN) + ' · <b style="color:#1d4ed8">命中率' + (seq.length ? (hitN / seq.length * 100).toFixed(1) : "0.0") + '%</b><br>';
        html += '连中段 ' + segBrief(wR) + '<br>连错段 ' + segBrief(lR) + '<br>';
        html += '连错2窗 ' + l2 + ' 次 · 连错3窗+ ' + l3 + ' 次</div>';
      });
      html += "</div>";
      html += "</div>";
      var allCount = rows.length;
      var showCount = perfExpandAll["betexec:" + line.id] ? allCount : Math.min(allCount, 12);
      rows = rows.slice(allCount - showCount).reverse();
      html += '<div class="record-format">对错滚动记录 · ' + WINDOW_RECORD_FORMAT + ' · 已结算 ' + allCount + ' 窗 · ' + modeLabel + '</div>';
      html += '<div class="exec-line__scroll" style="overflow-x:auto;-webkit-overflow-scrolling:touch">';
      html += '<div style="display:flex;gap:6px;min-width:max-content">';
      // 对错滚动记录的第1张 = 当前状态（每个页面的窗口都必须能看到现在走到哪一步）
      var liveTone = live.waiting ? "#b45309" : "#2563eb";
      var liveBg = live.waiting ? "#fffbeb" : "#eff6ff";
      var liveStageText, liveWaitText = "";
      if (live.waiting) {
        // 注意：这里的 rows 已经被截断/倒序过（只用于滚动记录展示），算等待期数必须用当年完整窗口列表
        var yrRowsAll = wmWindowsForStage(line, maxStage).filter(function (w) { return wmYearOf(w.start) === curYear; });
        var lastW = yrRowsAll.length ? yrRowsAll[yrRowsAll.length - 1] : null;
        var waitedN = 0;
        if (lastW) {
          var endP = betLocalPeriod(lastW.start) + ((lastW.attempts || []).length) - 1;
          waitedN = Math.max(1, latest - endP + 1);
        }
        liveStageText = "等待中 · 等尾" + live.waiting.tail + "开出（已等 " + waitedN + " 期）";
        liveWaitText = "上窗" + (maxStage === 2 ? "两期" : "三期") + "全错 · 等尾" + live.waiting.tail + "重新开出后才开新窗口（本期不下注）";
      } else if (live.active) {
        liveStageText = "进行中 · 第" + live.stage + "期 · " + (live.active.lockedTail != null ? "锁尾" + live.active.lockedTail : "每期最新推荐");
      } else {
        liveStageText = "空仓 · 等新窗口";
      }
      html += '<div class="exec-hist-card exec-hist-card--live" style="min-width:186px;border:1px dashed ' + liveTone + ';border-radius:8px;padding:7px 8px;background:' + liveBg + '">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#6b7280"><span>起始 ' + (live.active ? "第" + betLocalPeriod(live.active.start) + "期" : "—") + '</span><b style="color:' + liveTone + '">当前状态</b></div>';
      html += '<div style="font-size:12px;font-weight:900;color:' + liveTone + ';margin-top:2px">' + liveStageText + "</div>";
      if (live.active) html += betWindowRowsHTML(line, live.active, maxStage);
      else if (liveWaitText) html += '<div style="font-size:11px;color:#b45309;margin-top:3px">' + liveWaitText + "</div>";
      html += "</div>";
      var pMap = {};
      betPersonalitySeries(line, maxStage).states.forEach(function (s) { pMap[s.start] = s; });
      rows.forEach(function (w) {
        var r = betWindowRow(w, maxStage);
        var tone = r.hitAt ? "#16a34a" : "#dc2626";
        var bg = r.hitAt ? "#f0fdf4" : "#fef2f2";
        var border = r.hitAt ? "#bbf7d0" : "#fecaca";
        var psx = pMap[w.start] || { state: 0, len: 0 };
        var psTxt = psx.state === 1 ? ("连中" + psx.len) : (psx.state === -1 ? ("连错" + psx.len) : "样本不足");
        var psTone = psx.state === 1 ? "#16a34a" : (psx.state === -1 ? "#dc2626" : "#94a3b8");
        html += '<div class="exec-hist-card" style="min-width:186px;border:1px solid ' + border + ';border-radius:8px;padding:7px 8px;background:' + bg + '">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#6b7280"><span>起始 第' + betLocalPeriod(w.start) + '期</span><b style="color:' + psTone + '">' + psTxt + "</b></div>";
        html += '<div style="font-size:12px;font-weight:900;color:' + tone + ';margin-top:2px">' + (r.hitAt ? "第" + r.hitAt + "期中" : (w.hitIndex > 0 && w.hitIndex > maxStage ? "第" + w.hitIndex + "期中（超出本方案）" : "本方案内未中")) + '</div>';
        html += betWindowRowsHTML(line, w, maxStage);
        html += '<div style="display:flex;justify-content:space-between;margin-top:5px;font-size:11px"><span style="color:#64748b">投入 ' + r.cost + '</span><b style="color:' + tone + '">本窗 ' + (r.net >= 0 ? "+" : "") + Math.round(r.net) + '</b></div>';
        html += "</div>";
      });
      html += "</div></div>";
      html += perfMoreBtn("betexec:" + line.id, allCount, showCount, "窗");
      html += "</div></div>";
    });

    html += '<p class="disclaimer">本页只按方案提示金额，不预测、不自动下单。下单主口径=三期窗口（三期命中或三期全错才关窗）。10条尾号线窗口由真实开奖算出；3条概率线使用5/7/15/21/30新方法正式选号并继续按三期窗口记录，仓位公式尚未验证，暂不配仓。第294-296期保留切换前真实快照。</p>';
    view.innerHTML = html;
  }

  function renderFormulaTable() {
    var enabled = EXEC_LINES.filter(function (line) { return planRisk(line.plan) > 0; }).length;
    var disabled = EXEC_LINES.length - enabled;
    var html = '<div class="section"><div class="section__head"><h2 class="section__title">公式表 · 13条线路</h2><span class="section__hint">2021-2023训练 / 2024-2026验证 · 两段同为正才配仓 · 100元步进</span></div></div>';
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
      html += '<td><b style="color:' + (line.hold ? "#d97706" : (enabledLine ? "#16a34a" : "#dc2626")) + '">' +
        (line.hold ? "暂停建仓·观察" : (enabledLine ? "配仓" : "不配仓")) + "</b>" +
        (line.hold ? '<div style="font-size:10px;color:#92400e;margin-top:2px">' + line.hold + "</div>" : "") + "</td>";
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
  var wmSourceCache = {};
  var wmLineBestCache = { key: null, lineBest: null, currentYear: null, ytdBestByLine: null };
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
    var saved = execPick(betLocalPeriod(period), stream);
    if (saved && saved.tail != null) return saved;
    if (!wmFullPickCache[period]) wmFullPickCache[period] = wmFullModel().buildPrediction(period - 1);
    return (wmFullPickCache[period].doubleRecommendation || [])[stream === "D1" ? 0 : 1] || null;
  }

  function probabilitySnapshotRecord(target) {
    var snapshots = window.APP_PROBABILITY_SNAPSHOTS;
    var records = snapshots && Array.isArray(snapshots.records) ? snapshots.records : [];
    return records.filter(function (record) {
      return Number(record.target) === Number(target);
    })[0] || null;
  }

  function probabilityPickAt(period, rank) {
    var saved = probabilitySnapshotRecord(period);
    if (saved && saved.top3 && saved.top3[rank || 0]) {
      var savedRow = saved.top3[rank || 0];
      return { tail: savedRow.tail, score: savedRow.nextProb, window3Prob: savedRow.window3Prob, role: "probability-snapshot" };
    }
    if (!PROB_MODEL || !PROB_MODEL.analyze || period <= 1) return null;
    var localPeriod = betLocalPeriod(period);
    var result = PROB_MODEL.analyze(RAW, localPeriod - 1);
    var row = result.top && result.top[rank || 0];
    return row ? { tail: row.tail, score: row.nextProb, window3Prob: row.window3Prob, role: "probability" } : null;
  }

  function windowTriggerForLine(line, period) {
    if (line.kind === "tail") return { tail: line.tail };
    if (line.kind === "probability") return probabilityPickAt(period, line.rank || 0);
    return wmFullPick(period, line.stream);
  }

  function wmFixedSourceWindows(line) {
    if (wmSourceCache[line.id]) return wmSourceCache[line.id];
    var source = window.APP_SNAPSHOTS && Array.isArray(window.APP_SNAPSHOTS.sourceWindows)
      ? window.APP_SNAPSHOTS.sourceWindows.filter(function (w) {
        return w.stream === line.stream && (w.status === "hit" || w.status === "miss" || w.status === "pending");
      })
      : [];
    source.sort(function (a, b) { return Number(a.target) - Number(b.target); });
    var lastRow = D[D.length - 1] || {};
    var rows = [], active = null;
    source.forEach(function (w) {
      var start = D.length - Number(lastRow.p) + Number(w.target);
      var item = {
        start: start,
        lockedTail: w.tail,
        attempts: (w.attempts || []).map(function (attempt) {
          return {
            period: start + (Number(attempt.period) - Number(w.target)),
            tail: attempt.tail,
            hit: attempt.hit
          };
        }),
        hitIndex: w.hitIndex == null ? null : Number(w.hitIndex),
        sourceKind: "snapshot",
        sourceTarget: Number(w.target)
      };
      if (w.status === "pending") active = item;
      else rows.push(item);
    });
    var waiting = null;
    if (!active && rows.length) {
      var last = rows[rows.length - 1];
      if (Number(last.hitIndex) === 0) {
        var endAt = last.attempts.length ? Number(last.attempts[last.attempts.length - 1].period) : Number(last.start);
        var reopened = false;
        for (var p = endAt + 1; p <= D.length; p++) {
          var actual = (D[p - 1].nums || []).map(function (n) { return Number(n) % 10; });
          if (actual.indexOf(Number(last.lockedTail)) >= 0) { reopened = true; break; }
        }
        if (!reopened) waiting = { tail: Number(last.lockedTail) };
      }
    }
    wmSourceCache[line.id] = rows;
    wmWindowState[line.id] = { active: active, waiting: waiting };
    return rows;
  }

  var wmProbabilityCache = {};

  function wmProbabilityHistoryRows(line, cap) {
    var rows = [];
    var firstGlobal = {};
    D.forEach(function (row, index) {
      var year = Number(row.y);
      if (!firstGlobal[year]) firstGlobal[year] = index + 1;
    });
    var years = DATA_YEARS.slice().sort(function (a, b) { return a - b; });
    years.forEach(function (year) {
      var rawYear = probabilityYearRaw(year);
      var records = PROB_MODEL.windowBacktest(rawYear, line.rank || 0, cap);
      var offset = Number(firstGlobal[year] || 0);
      if (!offset) return;
      records.forEach(function (record) {
        rows.push({
          start: offset + Number(record.startPeriod) - 1,
          lockedTail: record.tail,
          attempts: (record.attempts || []).map(function (attempt) {
            return {
              period: offset + Number(attempt.period) - 1,
              tail: attempt.tail,
              hit: attempt.hit
            };
          }),
          hitIndex: record.hitIndex,
          sourceKind: "probability-test",
          testYear: year
        });
      });
    });
    return rows;
  }

  function wmProbabilityLiveState(line, cap) {
    var rows = [];
    var active = null;
    var waiting = null;
    var p = Number(line.startPeriod) || 1;
    var currentYear = 0;
    while (p <= D.length + 1) {
      if (p > D.length) {
        if (!active && !waiting) {
          var nextTrigger = windowTriggerForLine(line, p);
          if (nextTrigger) active = { start: p, lockedTail: nextTrigger.tail, attempts: [] };
        }
        break;
      }
      var year = wmYearOf(p);
      if (year && year !== currentYear) {
        currentYear = year;
        active = null;
        waiting = null;
      }
      if (waiting) {
        var waitRow = D[p - 1];
        var waitTails = waitRow ? (waitRow.nums || []).map(function (num) { return Number(num) % 10; }) : [];
        if (waitTails.indexOf(Number(waiting.tail)) >= 0) waiting = null;
        p++;
        continue;
      }
      var trigger = null;
      if (!active) {
        trigger = windowTriggerForLine(line, p);
        if (!trigger) { p++; continue; }
        active = { start: p, lockedTail: trigger.tail, attempts: [] };
      }
      var row = D[p - 1] || {};
      var actual = (row.nums || []).map(function (num) { return Number(num) % 10; });
      var tail = active.lockedTail;
      var hit = tail != null && actual.indexOf(Number(tail)) >= 0;
      active.attempts.push({ period: p, tail: tail, hit: hit });
      if (hit) {
        active.hitIndex = active.attempts.length;
        rows.push(active);
        active = null;
        p++;
      } else if (active.attempts.length >= cap) {
        active.hitIndex = 0;
        rows.push(active);
        active = null;
        p++;
        waiting = { tail: tail };
      } else {
        p++;
      }
    }
    return { rows: rows, active: active, waiting: waiting };
  }

  function wmProbabilityWindows(line, cap) {
    var stage = cap === 2 ? 2 : 3;
    var key = line.id + ":" + stage;
    if (wmProbabilityCache[key]) return wmProbabilityCache[key];
    var historyRows = wmProbabilityHistoryRows(line, stage);
    var live = wmProbabilityLiveState(line, stage);
    var byStart = {};
    historyRows.forEach(function (row) { byStart[String(row.start)] = row; });
    live.rows.forEach(function (row) { byStart[String(row.start)] = row; });
    var rows = Object.keys(byStart).map(Number).sort(function (a, b) { return a - b; }).map(function (start) { return byStart[String(start)]; });
    wmProbabilityCache[key] = rows;
    wmStageCache[key] = rows;
    wmStageState[key] = { active: live.active, waiting: live.waiting };
    if (stage === 3) {
      wmWindowCache[line.id] = rows;
      wmWindowState[line.id] = { active: live.active, waiting: live.waiting };
    }
    return rows;
  }
  function wmWindowsFor(line) {
    if (line.kind === "probability") return wmProbabilityWindows(line, 3);
    if (wmWindowCache[line.id]) return wmWindowCache[line.id];
    if (line.kind === "fixed" && window.APP_SNAPSHOTS && Array.isArray(window.APP_SNAPSHOTS.sourceWindows) && window.APP_SNAPSHOTS.sourceWindows.length) {
      return wmFixedSourceWindows(line);
    }
    var rows = [];
    var active = null;
    var waiting = null;
    var p = line.kind === "tail" ? 1 : (line.kind === "probability" && line.startPeriod ? line.startPeriod : 31);
    // 每年第一期重新开窗：跨年未完成窗口作废、等待重开清零，保证每一年的窗口单独成立
    var curYear = 0;
    // 多跑一期：最后一期之后那一期（待开奖）也要把新窗口开出来，只开窗不记结果
    while (p <= D.length + 1) {
      if (p > D.length) {
        if (!active && !waiting) {
          var nextTrigger = windowTriggerForLine(line, p);
          if (nextTrigger) {
            active = { start: p, lockedTail: line.kind === "recommend" ? null : nextTrigger.tail, attempts: [] };
          }
        }
        break;
      }
      var hereYear = wmYearOf(p);
      if (hereYear && hereYear !== curYear) {
        curYear = hereYear;
        active = null;
        waiting = null;
      }
      if (waiting) {
        var waitingRow = D[p - 1];
        var waitingTails = waitingRow ? (waitingRow.nums || []).map(function (num) { return Number(num) % 10; }) : [];
        if (waitingTails.indexOf(Number(waiting.tail)) >= 0) waiting = null;
        p++;
        continue;
      }
      var trigger = null;
      if (!active) {
        trigger = windowTriggerForLine(line, p);
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

  // 按“窗口最多检查几期”出窗口：2期方案做2期窗口，3期方案做3期窗口，其余规则完全一致
  var wmStageCache = {};
  var wmStageState = {};
  function wmWindowsForStage(line, maxStage) {
    var cap = maxStage >= 3 ? 3 : 2;
    if (cap === 3) {
      var rows3 = wmWindowsFor(line);
      wmStageCache[line.id + ":3"] = rows3;
      wmStageState[line.id + ":3"] = wmWindowState[line.id] || { active: null, waiting: null };
      return rows3;
    }
    var key = line.id + ":2";
    if (line.kind === "probability") return wmProbabilityWindows(line, 2);
    if (wmStageCache[key]) return wmStageCache[key];
    var rows = [];
    var active = null;
    var waiting = null;
    var p = line.kind === "tail" ? 1 : (line.kind === "probability" && line.startPeriod ? line.startPeriod : 31);
    var curYear = 0;
    while (p <= D.length + 1) {
      if (p > D.length) {
        if (!active && !waiting) {
          var nextTrigger = windowTriggerForLine(line, p);
          if (nextTrigger) active = { start: p, lockedTail: line.kind === "recommend" ? null : nextTrigger.tail, attempts: [] };
        }
        break;
      }
      var hereYear = wmYearOf(p);
      if (hereYear && hereYear !== curYear) {
        curYear = hereYear;
        active = null;
        waiting = null;
      }
      if (waiting) {
        var waitRow = D[p - 1];
        var waitTails = waitRow ? (waitRow.nums || []).map(function (num) { return Number(num) % 10; }) : [];
        if (waitTails.indexOf(Number(waiting.tail)) >= 0) waiting = null;
        p++;
        continue;
      }
      var trigger = null;
      if (!active) {
        trigger = windowTriggerForLine(line, p);
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
      } else if (active.attempts.length >= 2) {
        active.hitIndex = 0;
        rows.push(active);
        var waitTail = null;
        for (var wi = active.attempts.length - 1; wi >= 0; wi--) {
          if (active.attempts[wi].tail != null) { waitTail = active.attempts[wi].tail; break; }
        }
        active = null;
        p++;
        if (waitTail != null) waiting = { tail: waitTail };
      } else {
        p++;
      }
    }
    wmStageCache[key] = rows;
    wmStageState[key] = { active: active, waiting: waiting };
    return rows;
  }

  function wmStageNow(line, maxStage) {
    var cap = maxStage >= 3 ? 3 : 2;
    wmWindowsForStage(line, cap);
    return wmStageState[line.id + ":" + cap] || { active: null, waiting: null };
  }

  // 当期号码已知就写出来：已记录取记录，未开奖取锁定号 / 当期推荐号
  function wmLiveTailFor(line, w, period) {
    if (!w) return null;
    var attempts = w.attempts || [];
    for (var i = 0; i < attempts.length; i++) {
      var at = attempts[i];
      if (at && Number(at.period) === Number(period) && at.tail != null) return at.tail;
    }
    if (line.kind === "tail") return line.tail;
    if (w.lockedTail != null) return w.lockedTail;
    if (line.kind === "recommend") {
      // 每期最新推荐：只有“下一期（还没开奖的那期）”的推荐号是已经产生的；
      // 更未来的期次还没生成推荐，必须留空让页面写“待定”，绝不拿模型重算冒充未来数据
      // 注意：这里 period 是“全表序号”，下一期 = D.length + 1（当年第几期的换算在页面层做）
      if (Number(period) > D.length + 1) return null;
      var pick = wmFullPick(period, line.stream);
      if (pick && pick.tail != null) return pick.tail;
    }
    return null;
  }

  function wmPositionForPlan(line, plan) {
    var live = wmCurrentState(line);
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

  function wmCurrentPosition(line, n) {
    return wmPositionForPlan(line, wmPlanFor(n));
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

  function wmYearStats(line, n, simIn) {
    var sim = simIn || wmSimulate(line, n);
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

  function wmLineBestData() {
    var currentYear = Number((D[D.length - 1] || {}).y) || new Date().getFullYear();
    var sourceWindowCount = window.APP_SNAPSHOTS && Array.isArray(window.APP_SNAPSHOTS.sourceWindows)
      ? window.APP_SNAPSHOTS.sourceWindows.length
      : 0;
    var cacheKey = D.length + "|" + latest + "|" + sourceWindowCount;
    if (wmLineBestCache.key === cacheKey) return wmLineBestCache;
    var ns = [1, 1.5, 2, 2.5, 3];
    var lineBest = {};
    EXEC_LINES.forEach(function (item) {
      var itemSimulations = ns.map(function (n) { return wmSimulate(item, n); });
      var itemRobust = itemSimulations.filter(function (s) { return s.trainNet > 0 && s.validNet > 0; });
      var itemAnnual = {};
      itemSimulations.forEach(function (simulation) {
        itemAnnual[simulation.n] = wmYearStats(item, simulation.n, simulation);
      });
      var itemStable = itemRobust.slice().sort(function (a, b) {
        return itemAnnual[b.n].stableScore - itemAnnual[a.n].stableScore || b.net - a.net || a.maxDD - b.maxDD;
      });
      var itemNetBest = itemRobust.slice().sort(function (a, b) {
        return b.net - a.net || a.maxDD - b.maxDD;
      })[0] || null;
      lineBest[item.id] = {
        best: itemStable[0] || null,
        netBest: itemNetBest,
        simulations: itemSimulations,
        annual: itemAnnual
      };
    });
    var ytdBestByLine = {};
    EXEC_LINES.forEach(function (item) {
      ytdBestByLine[item.id] = wmYearBest(lineBest[item.id], currentYear);
    });
    wmLineBestCache = {
      key: cacheKey,
      lineBest: lineBest,
      currentYear: currentYear,
      ytdBestByLine: ytdBestByLine
    };
    return wmLineBestCache;
  }



  function renderWindowMultiplierTest() {
    var line = null;
    EXEC_LINES.forEach(function (item) {
      if (item.id === state.windowMultLine) line = item;
    });
    if (!line) line = EXEC_LINES[0];
    state.windowMultLine = line.id;
    var cachedLineData = wmLineBestData();
    var ns = [1, 1.5, 2, 2.5, 3];
    var lineBest = cachedLineData.lineBest;
    var currentYear = cachedLineData.currentYear;
    var ytdBestByLine = cachedLineData.ytdBestByLine;
    var orderedLines = EXEC_LINES.slice();
    // 真实快照样本（只有开奖前存过快照、开奖后已结算的期才算），用于标注回测与真实口径
    var snapDetailRows = window.APP_SNAPSHOTS && Array.isArray(window.APP_SNAPSHOTS.detail) ? window.APP_SNAPSHOTS.detail : [];
    var snapSettledTargets = snapDetailRows.filter(function (rec) {
      return rec && Number.isFinite(Number(rec.target)) && Array.isArray(rec.actualTails) && rec.actualTails.length > 0;
    }).map(function (rec) { return Number(rec.target); }).sort(function (a, b) { return a - b; });
    var snapSampleCount = snapSettledTargets.length;
    var snapSampleText = snapSampleCount
      ? ("真实快照 " + snapSampleCount + " 期（第" + snapSettledTargets[0] + "期起）")
      : "真实快照 0 期";
    var simulations = lineBest[line.id].simulations;
    var annualByN = lineBest[line.id].annual;
    var robust = simulations.filter(function (s) { return s.trainNet > 0 && s.validNet > 0; });
    robust.sort(function (a, b) { return annualByN[b.n].stableScore - annualByN[a.n].stableScore || b.net - a.net; });
    var best = robust[0] || null;
    var netBest = lineBest[line.id].netBest;
    var netBestText = netBest ? (netBest.n === 1 ? "不倍投" : netBest.n + "倍") : "未通过";
    var selectedYtdBest = ytdBestByLine[line.id] || null;
    var activeN = Number(state.windowMultN);
    var selectedYtdPosition = wmCurrentPosition(line, selectedYtdBest ? selectedYtdBest.n : activeN);
    var selectedYtdPeriod = selectedYtdPosition.period ? wmPeriodLabel(selectedYtdPosition.period) : "-";
    var selected = simulations.filter(function (s) { return s.n === activeN; })[0] || simulations[2];
    var liveState = wmCurrentState(line);
    var windowHitRate = selected.records.length ? ((selected.records.length - selected.missWindows) / selected.records.length) * 100 : 0;
    var missRate = selected.records.length ? (selected.missWindows / selected.records.length) * 100 : 0;
    var selectedPlanText = wmPlanText(selected.n);
    var selectedPosition = wmPositionForPlan(line, line.plan);
    var selectedPositionPeriod = selectedPosition.period ? wmPeriodLabel(selectedPosition.period) : "-";
    var wmView = state.windowMultView || "overview";
    var wmViewTabs = [
      ["overview", "总览"],
      ["windows", "窗口明细"],
      ["personality", "13线性格"],
      ["formula", "公式与仓位"],
      ["years", "年度测试"]
    ].map(function (item) {
      return '<button class="chip wm-view-tab' + (wmView === item[0] ? " is-active" : "") + '" type="button" data-wm-view="' + item[0] + '">' + item[1] + '</button>';
    }).join("");
    function wmCell(label, value, sub, color) {
      return '<div class="wm-cell"><div class="wm-cell__v"' + (color ? ' style="color:' + color + '"' : "") + '>' + value + '</div><div class="wm-cell__l">' + label + '</div>' + (sub ? '<div class="wm-cell__l" style="color:#94a3b8">' + sub + '</div>' : "") + '</div>';
    }
    function wmStat(label, value, color) {
      return '<div class="wm-stat"><div style="font-size:16px;font-weight:900' + (color ? ";color:" + color : "") + '">' + value + '</div><div style="font-size:11px;color:#64748b;margin-top:2px">' + label + '</div></div>';
    }
    var html = '<div class="section"><div class="panel wm-card">';
    html += '<div class="wm-card__head"><div><b class="wm-card__title">13线规律中心</b><span class="wm-card__hint">真实窗口规律账本 · 100元起 · 逐期记录每条线每个窗口的第1/2/3期尾号、命中或错误、第几期中、三期全错、等待重开和下一窗口；按窗口给出性格与重投/倍投参考，只按真实开奖结算，不预测、不补造、不改历史。</span></div></div>';
    html += '<div class="wm-view-tabs">' + wmViewTabs + '</div>';
    html += '<div class="wm-line-selector">';
    orderedLines.forEach(function (item) {
      var itemData = lineBest[item.id] || {};
      var itemSim = itemData.best || (itemData.simulations || []).filter(function (s) { return s.n === activeN; })[0] || null;
      var itemRate = itemSim && itemSim.records.length ? (((itemSim.records.length - itemSim.missWindows) / itemSim.records.length) * 100).toFixed(1) + "%" : "-";
      html += '<button class="chip wm-line-btn" type="button" data-wm-line="' + item.id + '" style="' + (item.id === line.id ? "background:#2563eb;color:#fff;border-color:#1d4ed8;box-shadow:0 0 0 2px #bfdbfe" : "") + '"><span class="wm-line-btn__name">' + item.label + '</span><span class="wm-line-btn__rate">窗口命中 ' + itemRate + '</span></button>';
    });
    html += '</div>';
    html += '</div></div>';
    html += '<div class="wm-view-group" data-wm-group="formula">';
    html += '<div class="section"><div class="panel wm-card">';
    html += '<div class="wm-card__head"><b class="wm-card__title">每个号码的最优下注公式</b><span class="wm-card__hint">100元起 · 只用训练段和验证段同时为正的倍率 · 尾0-尾9只按真实开奖结算；4条推荐线的回测只作参考，正式口径看真实快照 · 左右滑动</span></div>';
    html += '<div class="wm-formula-panel wm-hscroll">';
    orderedLines.forEach(function (item) {
      var itemData = lineBest[item.id] || { best: null };
      var itemBest = itemData.best;
      var planText = itemBest ? wmPlanText(itemBest.n) : "0 / 0 / 0";
      var bestText = itemBest ? (itemBest.n === 1 ? "不倍投" : itemBest.n + "倍") : "未通过";
      var itemAnnualStats = itemData.annual ? itemData.annual[itemBest ? itemBest.n : activeN] : null;
      var itemYtdBest = ytdBestByLine[item.id] || null;
      var itemYtdPosition = wmCurrentPosition(item, itemYtdBest ? itemYtdBest.n : activeN);
      var itemPosition = wmPositionForPlan(item, item.plan);
      var itemCurrentTail = execCurrentTail(item, wmCurrentState(item), latest + 1);
      var itemTailText = item.kind === "tail" ? "" : (itemCurrentTail != null ? ' · 尾' + itemCurrentTail : '');
      var itemPositionPeriod = itemPosition.period ? wmPeriodLabel(itemPosition.period) : "-";
      html += '<div class="wm-formula-row" style="border-left:4px solid ' + (itemBest ? "#16a34a" : "#dc2626") + ';background:' + (itemBest ? "#f0fdf4" : "#fef2f2") + '">';
      html += '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><b style="font-size:16px">' + item.label + '</b><span style="font-size:13px;font-weight:900;color:' + (itemBest ? "#16a34a" : "#dc2626") + '">' + bestText + '</span></div>';
      html += '<div style="font-size:15px;font-weight:900;color:#1d4ed8;margin-top:6px">' + planText + '</div>';
      html += '<div style="font-size:12px;font-weight:900;color:' + itemPosition.color + ';margin-top:5px">正式执行仓位 ' + itemPosition.label + itemTailText + ' · ' + (itemPosition.amount > 0 ? itemPosition.amount + "元" : itemPosition.status) + ' · 检查 ' + itemPositionPeriod + '</div>';
      if (itemYtdBest) {
        html += '<div style="font-size:11px;font-weight:900;color:#1d4ed8;margin-top:4px">今年最优 ' + (itemYtdBest.n === 1 ? "不倍投" : itemYtdBest.n + "倍") + ' · ' + wmPlanText(itemYtdBest.n) + '</div>';
        html += '<div style="font-size:11px;color:' + itemYtdPosition.color + ';margin-top:2px">今年测试仓位 ' + itemYtdPosition.label + ' · ' + (itemYtdPosition.amount > 0 ? itemYtdPosition.amount + "元" : itemYtdPosition.status) + '</div>';
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
      if (item.kind !== "tail") {
        html += '<div style="font-size:11px;color:#b45309;margin-top:4px">口径：回测窗口 ' + (itemBest ? itemBest.records.length : 0) + ' 个 · ' + snapSampleText + '（样本不足，暂不作正式结论）</div>';
      }
      html += '</div>';
    });
    html += '</div></div></div>';
    html += '</div>';
    html += '<div class="wm-view-group" data-wm-group="years">';
    var ytdRows = EXEC_LINES.map(function (item) {
      return { item: item, best: ytdBestByLine[item.id] || null };
    }).sort(function (a, b) {
      return (b.best ? b.best.year.net : -Infinity) - (a.best ? a.best.year.net : -Infinity);
    });
    html += '<div class="section"><div class="panel wm-card">';
    html += '<div class="wm-card__head"><b class="wm-card__title">年度测试</b><span class="wm-card__hint">' + currentYear + '年最优规律排名 + 13线逐年测试对比 · 公式固定100元起 · 左右滑动查看</span></div>';
    html += '<div class="wm-subhead">' + currentYear + '年最优规律排名</div>';
    html += '<div class="wm-hscroll"><table class="table" style="min-width:1120px"><thead><tr><th>名次</th><th>线路</th><th>今年最优公式</th><th>第1/2/3期仓位</th><th>今年净收益</th><th>今年ROI</th><th>命中/全错</th><th>今年当前仓位</th><th>全周期验证</th></tr></thead><tbody>';
    ytdRows.forEach(function (row, index) {
      var best = row.best;
      var position = wmPositionForPlan(row.item, row.item.plan);
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
    html += '</tbody></table></div>';
    var annualYears = (lineBest[line.id].annual[selected.n] || { years: [] }).years.map(function (row) { return row.year; });
    html += '<div class="wm-subhead">13线逐年测试对比 <span style="font-weight:400;color:#64748b">公式固定不变，逐年单算净收益/命中率；不要被某一年的高收益掩盖其他年份</span></div>';
    html += '<div class="wm-hscroll"><table class="table" style="min-width:1500px"><thead><tr><th>线路</th><th>年度稳健最优</th>';
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
    html += '</tbody></table></div>';
    html += '</div></div>';
    html += '</div>';
    html += '<div class="wm-view-group" data-wm-group="overview">';
    var multiplierButtons = ns.map(function (n) {
      return '<button class="chip" data-wm-n="' + n + '" style="' + (n === activeN ? "background:#2563eb;color:#fff;border-color:#1d4ed8" : "") + '">' + (n === 1 ? "不倍投" : n + "倍") + '</button>';
    }).join("");
    html += '<div class="section"><div class="panel wm-card">';
    html += '<div class="wm-card__head"><b class="wm-card__title">总览 · ' + line.label + '</b><span class="wm-card__hint">正式执行口径 = 公式表 line.plan；年度稳健最优 / 全周期收益最高 / 今年最优只作研究参考 · 左右滑动</span></div>';
    html += '<div class="wm-subhead">核心结论</div>';
    html += '<div class="wm-hscroll" style="display:flex;gap:6px">';
    html += wmCell("年度稳健最优", (best ? (best.n === 1 ? "不倍投" : best.n + "倍") : "未通过"), best ? ((best.net >= 0 ? "+" : "") + best.net + " · ROI " + best.roi.toFixed(2) + "%") : "训练/验证未同时通过", "#16a34a");
    html += wmCell("全周期收益最高", netBestText, netBest ? ((netBest.net >= 0 ? "+" : "") + netBest.net + " · ROI " + netBest.roi.toFixed(2) + "%") : "未通过", "#0f172a");
    html += wmCell(currentYear + "年最优", (selectedYtdBest ? (selectedYtdBest.n === 1 ? "不倍投" : selectedYtdBest.n + "倍") : "无数据"), selectedYtdBest ? wmPlanText(selectedYtdBest.n) : "0 / 0 / 0", "#1d4ed8");
    html += wmCell("正式执行仓位", selectedPosition.label, (selectedPosition.amount > 0 ? selectedPosition.amount + "元 · 检查 " + selectedPositionPeriod : selectedPosition.status), "#b45309");
    html += wmCell("今年测试仓位", selectedYtdPosition.label, (selectedYtdPosition.amount > 0 ? selectedYtdPosition.amount + "元 · 检查 " + selectedYtdPeriod : selectedYtdPosition.status), "#b45309");
    html += wmCell("当前倍率", (selected.n === 1 ? "不倍投" : selected.n + "倍"), "单窗金额 " + selectedPlanText, "#0f172a");
    html += '</div>';
    html += '<div class="wm-status"><b>当前窗口状态：</b>';
    if (liveState.waiting) {
      html += '等待重开 · 本期 0元 · 等待尾' + liveState.waiting.tail + '重新开出';
    } else if (liveState.active) {
      var activeStart = liveState.active.start;
      html += '窗口进行中 · 起始 ' + wmPeriodLabel(activeStart) + ' · ' + selectedPosition.label + ' · 本期 ' + selectedPosition.amount + '元 · 检查 ' + selectedPositionPeriod + ' ·';
      for (var ai = 0; ai < 3; ai++) {
        var expectedStart = activeStart + ai;
        var attempt = liveState.active.attempts[ai];
        var liveTail = attempt ? attempt.tail : wmLiveTailFor(line, liveState.active, expectedStart);
        var stateText = attempt ? (attempt.hit ? " 中" : " 错") : (expectedStart <= latest ? " 未记录" : " 待开奖");
        var label = liveTail != null ? ('尾' + liveTail + stateText) : stateText.trim();
        html += ' 第' + (ai + 1) + '期 ' + wmPeriodLabel(expectedStart) + ' ' + label + (ai < 2 ? ' ·' : '');
      }
    } else {
      html += '无进行中窗口 · 空仓等待';
    }
    html += '</div>';
    html += '<div class="wm-subhead">倍率选择</div><div style="display:flex;flex-wrap:wrap;gap:6px">' + multiplierButtons + '</div>';
    html += '<div class="wm-subhead">各倍率对比 <span style="font-weight:400;color:#64748b">点卡片切换当前倍率</span></div>';
    html += '<div class="wm-hscroll" style="display:flex;gap:6px">';
    simulations.forEach(function (s) {
      var isBest = best && best.n === s.n;
      var isCurrent = s.n === activeN;
      html += '<button data-wm-n="' + s.n + '" style="flex:0 0 168px;min-width:168px;text-align:left;border:2px solid ' + (isCurrent ? "#2563eb" : isBest ? "#16a34a" : "#e2e8f0") + ';background:' + (isBest ? "#f0fdf4" : "#fff") + ';border-radius:8px;padding:9px;cursor:pointer">';
      html += '<div style="font-size:15px;font-weight:900">' + (s.n === 1 ? "不倍投" : s.n + "倍") + (isCurrent ? " · 当前" : "") + (isBest ? " · 最优" : "") + '</div>';
      html += '<div style="font-size:18px;font-weight:900;color:' + (s.net >= 0 ? "#16a34a" : "#dc2626") + ';margin-top:4px">' + (s.net >= 0 ? "+" : "") + s.net + '</div>';
      html += '<div style="font-size:11px;color:#64748b;margin-top:3px">ROI ' + s.roi.toFixed(2) + '% · 回撤 ' + s.maxDD + '</div>';
      html += '<div style="font-size:11px;color:#64748b">最高 ' + s.maxMult.toFixed(2) + '倍 · 连错 ' + s.maxLossStreak + '窗</div>';
      html += '</button>';
    });
    html += '</div>';
    html += '<div class="wm-subhead">当前倍率统计</div>';
    html += '<div class="wm-hscroll" style="display:flex;gap:6px">';
    html += wmStat("真实窗口总数", selected.records.length);
    html += wmStat("窗口命中率", windowHitRate.toFixed(2) + "%");
    html += wmStat("三期全错率", missRate.toFixed(2) + "%", "#dc2626");
    html += wmStat("最大连续全错", selected.maxLossStreak + "窗", "#dc2626");
    html += wmStat("第1期中", selected.hits1 + " · " + (selected.records.length ? ((selected.hits1 / selected.records.length) * 100).toFixed(2) + "%" : "-"));
    html += wmStat("第2期中", selected.hits2 + " · " + (selected.records.length ? ((selected.hits2 / selected.records.length) * 100).toFixed(2) + "%" : "-"));
    html += wmStat("第3期中", selected.hits3 + " · " + (selected.records.length ? ((selected.hits3 / selected.records.length) * 100).toFixed(2) + "%" : "-"));
    html += wmStat("三期全错", selected.missWindows + " · " + (selected.records.length ? ((selected.missWindows / selected.records.length) * 100).toFixed(2) + "%" : "-"), "#dc2626");
    html += wmStat("实际下单命中率", selected.orderHit.toFixed(2) + "%");
    html += wmStat("单窗最大风险", selected.maxWindowRisk + "元");
    html += '</div>';
    var yearlyStage = {};
    selected.records.forEach(function (r) {
      var rYear = wmYearOf(r.window.start);
      if (!rYear) return;
      if (!yearlyStage[rYear]) yearlyStage[rYear] = { h1: 0, h2: 0, h3: 0 };
      if (r.window.hitIndex === 1) yearlyStage[rYear].h1++;
      else if (r.window.hitIndex === 2) yearlyStage[rYear].h2++;
      else if (r.window.hitIndex === 3) yearlyStage[rYear].h3++;
    });
    var selectedAnnual = (annualByN[selected.n] || { years: [] }).years.slice().sort(function (a, b) { return b.year - a.year; });
    html += '<div class="wm-subhead">当前倍率逐年统计 <span style="font-weight:400;color:#64748b">每年单独算，最新在左</span></div>';
    html += '<div class="wm-hscroll" style="display:flex;gap:6px">';
    if (!selectedAnnual.length) {
      html += '<div style="font-size:13px;color:#64748b">当前倍率没有可用的年度数据</div>';
    } else {
      selectedAnnual.forEach(function (row) {
        var yHit = row.windows ? (row.hitWindows / row.windows) * 100 : 0;
        var yMiss = row.windows ? (row.missWindows / row.windows) * 100 : 0;
        var stage = yearlyStage[row.year] || { h1: 0, h2: 0, h3: 0 };
        html += '<div class="wm-cell" style="flex:0 0 182px;min-width:182px">';
        html += '<div class="wm-cell__v">' + row.year + '年</div>';
        html += '<div class="wm-cell__l">窗口 ' + row.windows + ' · 中' + row.hitWindows + ' / 错' + row.missWindows + '</div>';
        html += '<div class="wm-cell__l">命中率 ' + yHit.toFixed(1) + '% · 全错率 ' + yMiss.toFixed(1) + '%</div>';
        html += '<div class="wm-cell__l">第1/2/3期中 ' + stage.h1 + ' / ' + stage.h2 + ' / ' + stage.h3 + '</div>';
        html += '<div class="wm-cell__l" style="color:' + (row.net >= 0 ? "#16a34a" : "#dc2626") + '">净收益 ' + (row.net >= 0 ? "+" : "") + Math.round(row.net) + ' · ROI ' + row.roi.toFixed(2) + '%</div>';
        html += '</div>';
      });
    }
    html += '</div>';
    html += '</div></div>';
    html += '</div>';
    html += '<div class="wm-view-group" data-wm-group="windows">';
    html += '<div class="section"><div class="panel wm-card">';
    html += '<div class="wm-card__head"><b class="wm-card__title">窗口明细 · ' + line.label + '</b><span class="wm-card__hint">' + WINDOW_RECORD_FORMAT + '</span></div>';
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
    var hitRuns = [];
    var currentHitRun = null;
    selected.records.forEach(function (item) {
      if (item.window.hitIndex > 0) {
        if (!currentHitRun) {
          currentHitRun = { length: 0, start: item.window.start, end: item.window.start, profit: 0 };
          hitRuns.push(currentHitRun);
        }
        currentHitRun.length++;
        currentHitRun.end = item.window.start;
        currentHitRun.profit += item.profit;
      } else {
        currentHitRun = null;
      }
    });
    var hitRunCounts = { two: 0, three: 0, fourPlus: 0 };
    var maxHitStreak = 0;
    hitRuns.forEach(function (run) {
      maxHitStreak = Math.max(maxHitStreak, run.length);
      if (run.length === 2) hitRunCounts.two++;
      else if (run.length === 3) hitRunCounts.three++;
      else if (run.length >= 4) hitRunCounts.fourPlus++;
    });
    html += '<div class="wm-subhead">连续全错规律</div>';
    html += '<div class="wm-hscroll" style="display:flex;gap:6px">';
    html += wmStat("单次全错次数", runCounts.one);
    html += wmStat("连续2窗全错", runCounts.two, "#d97706");
    html += wmStat("连续3窗全错", runCounts.three, "#dc2626");
    html += wmStat("连续4窗及以上", runCounts.fourPlus, "#991b1b");
    html += wmStat("1窗全错后继续错", afterOne.toFixed(2) + "%");
    html += wmStat("2窗连错后第3窗错", afterTwo.toFixed(2) + "%");
    html += wmStat("3窗连错后第4窗错", afterThree.toFixed(2) + "%");
    html += wmStat("历史最大连续全错", selected.maxLossStreak + "窗", "#dc2626");
    html += '</div>';
    html += '<div class="wm-subhead">连续命中规律</div>';
    html += '<div class="wm-hscroll" style="display:flex;gap:6px">';
    html += wmStat("历史最大连续命中", maxHitStreak + "窗", "#16a34a");
    html += wmStat("连续2窗命中", hitRunCounts.two, "#16a34a");
    html += wmStat("连续3窗命中", hitRunCounts.three, "#16a34a");
    html += wmStat("连续4窗及以上命中", hitRunCounts.fourPlus, "#16a34a");
    html += wmStat("命中窗总数", selected.records.length - selected.missWindows, "#16a34a");
    html += '</div>';
    var consecutiveHits = hitRuns.filter(function (run) { return run.length >= 2; }).slice().reverse();
    html += '<div class="wm-subhead">连续2窗及以上命中记录</div>';
    html += '<div class="wm-hscroll" style="display:flex;gap:6px">';
    if (!consecutiveHits.length) {
      html += '<div style="font-size:13px;color:#64748b">没有连续2窗命中记录</div>';
    } else {
      consecutiveHits.forEach(function (run) {
        html += '<div style="flex:0 0 230px;border:1px solid #bbf7d0;background:#f0fdf4;border-radius:8px;padding:9px">';
        html += '<div style="font-size:15px;font-weight:900;color:#15803d">连续' + run.length + '窗命中</div>';
        html += '<div style="font-size:12px;color:#475569;margin-top:4px">' + wmPeriodLabel(run.start) + ' → ' + wmPeriodLabel(run.end) + '</div>';
        html += '<div style="font-size:13px;font-weight:900;color:#16a34a;margin-top:4px">累计盈利 +' + Math.round(run.profit) + '</div>';
        html += '</div>';
      });
    }
    html += '</div>';
    var consecutiveRuns = missRuns.filter(function (run) { return run.length >= 2; }).slice().reverse();
    html += '<div class="wm-subhead">连续2窗及以上全错记录</div>';
    html += '<div class="wm-hscroll" style="display:flex;gap:6px">';
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
    html += '</div>';
    function wmWindowCard(w, isLive, item) {
      var tone = isLive ? "#2563eb" : w.hitIndex === 0 ? "#dc2626" : "#16a34a";
      var cls = isLive ? "live" : w.hitIndex === 0 ? "miss" : "hit";
      var resultText = isLive
        ? ("进行中 " + Math.min(w.attempts.length, 3) + "/3")
        : (w.hitIndex > 0 ? "第" + w.hitIndex + "期中" : "三期全错");
      var card = '<div class="wm-win-card wm-win-card--' + cls + '">';
      card += '<div class="wm-win-card__start">' + (isLive ? "当前窗口 · " : "") + "起始 " + wmPeriodLabel(w.start) + '</div>';
      card += '<div class="wm-win-card__result" style="color:' + tone + '">' + resultText + '</div>';
      for (var k = 0; k < 3; k++) {
        var cardPeriod = w.start + k;
        var att = w.attempts[k];
        card += '<div class="wm-win-card__row">';
        card += '<span class="wm-win-card__stage">第' + (k + 1) + '期</span>';
        if (att) {
          card += '<span class="wm-win-card__period">' + wmPeriodLabel(att.period) + '</span>';
          card += '<span class="wm-win-card__tail">尾' + att.tail + '</span>';
          card += '<span class="wm-win-card__state" style="color:' + (att.hit ? "#16a34a" : "#dc2626") + '">' + (att.hit ? "中" : "错") + '</span>';
        } else if (isLive) {
          var liveTail = wmLiveTailFor(line, w, cardPeriod);
          card += '<span class="wm-win-card__period">' + wmPeriodLabel(cardPeriod) + '</span>';
          card += '<span class="wm-win-card__tail" style="color:' + (cardPeriod <= latest ? "#94a3b8" : "#2563eb") + '">' + (liveTail != null ? "尾" + liveTail : (cardPeriod <= latest ? "未记录" : "待开奖")) + '</span>';
          if (liveTail != null) {
            card += '<span class="wm-win-card__state" style="color:' + (cardPeriod <= latest ? "#94a3b8" : "#2563eb") + '">' + (cardPeriod <= latest ? "未记录" : "待开奖") + '</span>';
          }
        } else {
          card += '<span class="wm-win-card__tail" style="color:#94a3b8">命中后停止</span>';
        }
        card += '</div>';
      }
      card += '<div class="wm-win-card__foot">';
      if (isLive) {
        card += '<span style="color:#1d4ed8;font-weight:900">已检查' + w.attempts.length + '期</span>';
        card += '<span style="color:#1d4ed8;font-weight:900">下期 ' + wmPeriodLabel(w.start + w.attempts.length) + '</span>';
      } else {
        card += '<span style="color:' + (item.missStreak ? "#dc2626" : "#94a3b8") + ';font-weight:900">' + (item.missStreak ? "第" + item.missStreak + "次连错" : "未连错") + '</span>';
        card += '<b style="color:' + (item.profit >= 0 ? "#16a34a" : "#dc2626") + '">本窗 ' + (item.profit >= 0 ? "+" : "") + Math.round(item.profit) + '</b>';
      }
      card += '</div></div>';
      return card;
    }
    html += '<div class="wm-subhead">窗口明细 · ' + WINDOW_RECORD_FORMAT + ' · 每年从第1期重新开窗 · <span style="font-weight:400;color:#64748b">中=绿 错=红 进行中=蓝</span></div>';
    html += '<div style="font-size:11px;color:#64748b;margin-bottom:6px">当前选择：' + (selected.n === 1 ? "不倍投" : selected.n + "倍") + ' · 单窗金额：' + wmPlanText(selected.n) + ' · 共' + selected.records.length + '个窗口</div>';
    html += '<div class="wm-hscroll" style="display:flex;gap:6px">';
    var detailYears = Number(state.windowMultDetailYears) || 1;
    var allYears = [];
    selected.records.forEach(function (r) {
      var rYear = wmYearOf(r.window.start);
      if (rYear && allYears.indexOf(rYear) < 0) allYears.push(rYear);
    });
    allYears.sort(function (a, b) { return b - a; });
    var shownYears = allYears.slice(0, detailYears);
    var detailTotal = selected.records.length;
    // 整条统一按时间倒序：最新在左，越往右越旧，中途不反转
    var detailRecords = selected.records.filter(function (r) {
      return shownYears.indexOf(wmYearOf(r.window.start)) >= 0;
    }).reverse();
    if (liveState.active) html += wmWindowCard(liveState.active, true, null);
    if (!detailTotal && !liveState.active) {
      html += '<div style="font-size:13px;color:#64748b">暂无窗口记录</div>';
    }
    var lastYearShown = null;
    detailRecords.forEach(function (item) {
      var itemYear = wmYearOf(item.window.start);
      if (itemYear !== lastYearShown) {
        lastYearShown = itemYear;
        html += '<div class="wm-year">' + itemYear + '年</div>';
      }
      html += wmWindowCard(item.window, false, item);
    });
    html += '</div>';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:6px">';
    html += '<span style="font-size:11px;color:#64748b">已显示最近 ' + shownYears.length + ' 年 · ' + detailRecords.length + ' 个窗口 / 共' + allYears.length + ' 年、' + detailTotal + ' 个窗口</span>';
    html += '<span style="display:flex;gap:6px">';
    if (shownYears.length < allYears.length) {
      html += '<button class="chip" type="button" data-wm-detail-more="1" style="font-weight:900">多看1年</button>';
    }
    if (detailYears > 1) {
      html += '<button class="chip" type="button" data-wm-detail-reset="1" style="font-weight:900">只看最近1年</button>';
    }
    html += '</span></div>';
    html += '</div></div>';
    html += '</div>';
    html += '<div class="wm-view-group" data-wm-group="personality">';
    html += '<div class="section"><div class="panel wm-card">';
    html += '<div class="wm-card__head"><b class="wm-card__title">13线性格规律 · 当下建议</b><span class="wm-card__hint">按“上一窗状态 → 下一窗命中率”判断性格，再按当前窗口状态给重投/轻仓建议，并按上一窗亏损给出回本倍投参考；金额只认公式表 line.plan，这里只作研究参考 · 左右滑动</span></div>';
    html += '<div class="wm-hscroll" style="display:flex;gap:6px">';
    orderedLines.forEach(function (item) {
      var itemSims = (lineBest[item.id] || {}).simulations;
      var sim = itemSims ? itemSims[0] : null;
      if (!sim) return;
      var recs = sim.records || [];
      var n = recs.length;
      var natHit = n ? (n - sim.missWindows) / n : 0;
      var natPm = n ? sim.missWindows / n : 0;
      var natP1 = n ? sim.hits1 / n : 0;
      var natP2 = n ? sim.hits2 / n : 0;
      var natP3 = n ? sim.hits3 / n : 0;
      // 窗口级规律：按“上一窗的状态”分组，统计下一窗的命中率（不是按期算）
      var buckets = {
        hit: { n: 0, h: 0 },
        miss1: { n: 0, h: 0 },
        miss2: { n: 0, h: 0 },
        miss3: { n: 0, h: 0 }
      };
      function prevStateOf(rec) {
        if (!rec) return "hit";
        if (rec.window.hitIndex > 0) return "hit";
        var streak = rec.missStreak || 1;
        return streak >= 3 ? "miss3" : (streak === 2 ? "miss2" : "miss1");
      }
      for (var wi = 1; wi < recs.length; wi++) {
        var prevState = prevStateOf(recs[wi - 1]);
        buckets[prevState].n++;
        if (recs[wi].window.hitIndex > 0) buckets[prevState].h++;
      }
      function bRate(bucket) { return bucket.n ? bucket.h / bucket.n : 0; }
      var lastRec = recs.length ? recs[recs.length - 1] : null;
      var curState = prevStateOf(lastRec);
      var curBucket = buckets[curState];
      var curRate = bRate(curBucket);
      // 性格判定：和该线自己的平均命中率比，而不是用绝对线
      var natB1 = bRate(buckets.miss1);
      var nature = "均衡";
      if (buckets.miss1.n >= 20 && natB1 >= natHit + 0.01) nature = "连错反弹型";
      else if ((buckets.miss1.n >= 20 && natB1 <= natHit - 0.03) || (buckets.miss2.n >= 3 && bRate(buckets.miss2) <= natHit - 0.10)) nature = "连错走弱型";
      else if (buckets.hit.n >= 20 && bRate(buckets.hit) >= natHit + 0.04) nature = "连中延续型";
      else if (natHit >= 0.9 && sim.maxLossStreak <= 2) nature = "稳";
      var natureNote = nature === "连错反弹型" ? "连错之后反而更容易命中，可以照追"
        : nature === "连错走弱型" ? "连错之后命中率逐级下降，连错2次以上要减仓或停追"
        : nature === "连中延续型" ? "命中之后容易接着命中，命中状态下正常追"
        : nature === "稳" ? "很少连错，按公式稳定执行"
        : "前后窗差别不大，按公式执行";
      var natPlan = item.plan || [0, 0, 0];
      var playStyle = (natPlan[0] === 0 && natPlan[1] === 0 && natPlan[2] === 0) ? "不配仓"
        : (natPlan[0] > 0 && natPlan[1] > natPlan[0] && natPlan[2] > natPlan[1]) ? "倍投型"
        : (natPlan[0] > 0 && natPlan[1] === 0 && natPlan[2] === 0) ? "首期一击"
        : (natPlan[0] === 0 && natPlan[1] > 0 && natPlan[2] === 0) ? "第二期一击"
        : (natPlan[0] === 0 && natPlan[1] === 0 && natPlan[2] > 0) ? "尾期一击"
        : "分段型";
      var natPos = wmPositionForPlan(item, natPlan);
      // 窗口级回本：上一窗输了，下一窗用多倍把这窗补回来（靠窗口命中率高）
      var avgNet = n ? sim.net / n : 0;
      var lossPerWindow = (natPlan[0] || 0) + (natPlan[1] || 0) + (natPlan[2] || 0);
      var lastWasMiss = lastRec ? lastRec.window.hitIndex === 0 : false;
      var recoveryMult = 0;
      var recoveryText = "";
      if (lastWasMiss && lossPerWindow > 0 && avgNet > 0) {
        recoveryMult = Math.ceil((lossPerWindow + 100) / avgNet);
        if (recoveryMult < 1) recoveryMult = 1;
        if (recoveryMult > 5) recoveryMult = 5;
        var scaledPlan = natPlan.map(function (x) { return x * recoveryMult; });
        recoveryText = (natPos.label === "等待重开" ? "等重新开窗后：" : "本窗：") + "上一窗全错亏 " + lossPerWindow + " 元 · 该线平均每窗 +" + avgNet.toFixed(0) + " 元 → 整体建议 ×" + recoveryMult + "（" + scaledPlan.join(" / ") + " 元），靠高命中率把上一窗补回来";
      } else if (lastWasMiss && avgNet <= 0) {
        recoveryText = "该线平均每窗不是正收益，不建议靠倍投回本，先维持公式";
      } else if (!lastWasMiss) {
        recoveryText = "上一窗是命中，没有亏损要补，本窗按公式标准走即可";
      }
      var stateText = curState === "hit" ? "上一窗命中" : curState === "miss1" ? "上一窗全错（1连错）" : curState === "miss2" ? "上一窗全错（2连错）" : "上一窗全错（3连错以上）";
      var advise = "不下";
      var adviseTone = "#6b7280";
      var adviseWhy = "";
      if (natPos.label === "等待重开") {
        advise = "不下";
        adviseTone = "#d97706";
        adviseWhy = "本线在等上次追的尾号重新开出，本窗先不下";
      } else if (!curBucket.n) {
        advise = "标准";
        adviseTone = "#2563eb";
        adviseWhy = "“" + stateText + "”之后没有历史样本，先按公式标准走";
      } else {
        var pctText = (curRate * 100).toFixed(1) + "%（" + curBucket.n + " 个窗口样本）";
        // 按“比自己平时好还是差”判轻重，避免每个都判重投
        var natDiff = curRate - natHit;
        if (natDiff >= 0.05) { advise = "可重投"; adviseTone = "#16a34a"; }
        else if (natDiff >= -0.05) { advise = "标准"; adviseTone = "#2563eb"; }
        else if (natDiff >= -0.15) { advise = "轻仓"; adviseTone = "#d97706"; }
        else { advise = "不下"; adviseTone = "#dc2626"; }
        adviseWhy = "历史上“" + stateText + "”之后，下一窗命中 " + pctText + "；该线平均命中 " + (natHit * 100).toFixed(1) + "%";
      }
      html += '<div class="wm-nat-card">';
      html += '<div><span class="wm-nat-card__name">' + item.label + '</span><span class="wm-nat-card__tag" style="color:' + (playStyle === "不配仓" ? "#dc2626" : "#16a34a") + '">' + playStyle + '</span></div>';
      html += '<div class="wm-nat-card__row"><span>性格</span><b style="color:#0f172a">' + nature + '</b></div>';
      html += '<div style="font-size:10px;color:#64748b;margin-top:2px;line-height:1.5">规律结论：' + natureNote + '</div>';
      html += '<div class="wm-nat-card__row"><span>窗口总数 / 命中 / 全错</span><b>' + n + '窗 · ' + (natHit * 100).toFixed(1) + '% · ' + (natPm * 100).toFixed(1) + '%</b></div>';
      html += '<div class="wm-nat-card__row"><span>窗口内第1/2/3期中</span><b>' + (natP1 * 100).toFixed(1) + '% / ' + (natP2 * 100).toFixed(1) + '% / ' + (natP3 * 100).toFixed(1) + '%</b></div>';
      html += '<div class="wm-nat-card__row"><span>最大连错</span><b>' + sim.maxLossStreak + ' 窗</b></div>';
      html += '<div class="wm-nat-card__advice">';
      html += '<div style="font-size:11px;font-weight:900;color:#0f172a;margin-bottom:3px">下一窗命中率（按上一窗状态）</div>';
      html += '<div class="wm-nat-card__row"><span>上窗命中</span><b>' + (bRate(buckets.hit) * 100).toFixed(1) + '% · ' + buckets.hit.n + '窗</b></div>';
      html += '<div class="wm-nat-card__row"><span>上窗全错1次</span><b>' + (bRate(buckets.miss1) * 100).toFixed(1) + '% · ' + buckets.miss1.n + '窗</b></div>';
      html += '<div class="wm-nat-card__row"><span>连错2次后</span><b>' + (bRate(buckets.miss2) * 100).toFixed(1) + '% · ' + buckets.miss2.n + '窗</b></div>';
      html += '<div class="wm-nat-card__row"><span>连错3次以上后</span><b>' + (bRate(buckets.miss3) * 100).toFixed(1) + '% · ' + buckets.miss3.n + '窗</b></div>';
      html += '<div class="wm-nat-card__row"><span>当下前窗状态</span><b>' + stateText + '</b></div>';
      html += '<div class="wm-nat-card__row"><span>本窗建议</span><b style="color:' + adviseTone + '">' + advise + '</b></div>';
      html += '<div style="font-size:10px;color:#64748b;margin-top:3px;line-height:1.5">' + adviseWhy + '</div>';
      html += '<div class="wm-nat-card__row"><span>回本倍投</span><b style="color:' + (recoveryMult > 1 ? "#b45309" : "#64748b") + '">' + (recoveryMult > 1 ? ("×" + recoveryMult) : "不加倍") + '</b></div>';
      if (recoveryText) {
        html += '<div style="font-size:10px;color:#b45309;margin-top:2px;line-height:1.5">' + recoveryText + '</div>';
      }
      html += '<div style="font-size:10px;color:#94a3b8;margin-top:2px">本期公式金额 ' + natPos.amount + ' 元（' + natPos.label + '）</div>';
      html += '</div></div>';
    });
    html += '</div>';
    html += '<p class="disclaimer" style="margin-top:8px">性格规律按窗口统计：先看该线在不同“上一窗状态”（上窗命中 / 上窗全错1次 / 连错2次 / 连错3次以上）之后下一窗的命中率，再按当前所处的窗口状态给建议。回本倍投 = （上一窗全错亏损 + 100）÷ 该线平均每窗净收益，向上取整、封顶5倍，只在上一窗确实亏损且该线平均每窗为正收益时给出。建议等级和回本倍数都只作研究参考，正式下注金额只认公式表 line.plan。</p>';
    html += '</div></div>';
    html += '</div>';
    html += '<p class="disclaimer">本页是13线规律中心，只做历史窗口规律测试，不自动下单。每个窗口从第1期开始，三期按N倍递增；中了就停止；三期全错后等待最后尾号重新开出，下一期用基础金额重新开窗。</p>';
    view.innerHTML = modelPairStrip(latest + 1) + html;
    Array.prototype.forEach.call(view.querySelectorAll(".wm-view-group"), function (group) {
      if (group.getAttribute("data-wm-group") !== wmView) group.style.display = "none";
    });
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



  // ===== 预估三层框架 + 下期推荐 =====
  // ===== 动态概率页面（连出惯性分层打分，每期推2个号，避尾0）=====


  function buildRealtimeSnapshotRateHTML(config) {
    var groups = Array.isArray(config.groups) ? config.groups : [{
      label: config.label || "",
      rows: config.rows || [],
      pendingText: config.pendingText || "-",
      color: config.color || "#111827"
    }];
    var html = '';
    html += '<div class="section"><div class="section__head"><h2 class="section__title">单期快照诊断 · 只观察不下注</h2><span class="section__hint">' + (config.hint || "单期只用于检查快照是否实时更新；正式战略成绩只看三期窗口命中，未开奖不计入") + '</span></div></div>';
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
      html += '<div class="stat"><div class="stat__value" style="color:' + (hits >= miss ? "#16a34a" : "#dc2626") + '">' + rate + '</div><div class="stat__label">单期命中率（非下单依据）· 中' + hits + ' 错' + miss + ' 共' + n + '</div></div>';
      html += '<div class="stat"><div class="stat__value">' + (rows.length ? rows[0].period : "-") + '</div><div class="stat__label">最新已结算快照期</div></div>';
      html += '<div class="stat"><div class="stat__value" style="color:#2563eb">' + (group.pendingText || "-") + '</div><div class="stat__label">待开奖 / 进行中</div></div>';
      html += '</div>';
      html += '<div style="font-size:11px;font-weight:900;color:#6b7280;margin:10px 0 6px">最新单期快照 · 新→旧</div>';
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

  // 单期快照诊断按“每一期”统计：只用于确认快照持续更新，不作为单期下注或战略结论。
  // 正式战略仍按三期窗口是否命中结算；单期记录不能替代窗口账。
  function threePeriodRealtimeSnapshotRows() {
    var detail = window.APP_SNAPSHOTS && Array.isArray(window.APP_SNAPSHOTS.detail) ? window.APP_SNAPSHOTS.detail : [];
    var rows = [];
    var pending = [];
    var maxTarget = null;
    var pendingTarget = null;
    detail.forEach(function (rec) {
      if (!rec || !Number.isFinite(Number(rec.target))) return;
      var target = Number(rec.target);
      if (maxTarget == null || target > maxTarget) maxTarget = target;
      var picks = Array.isArray(rec.picks) ? rec.picks : [];
      var actual = Array.isArray(rec.actualTails) ? rec.actualTails : [];
      if (!actual.length) {
        if (pendingTarget == null || target > pendingTarget) pendingTarget = target;
        return;
      }
      ["D1", "D2"].forEach(function (key, index) {
        var pick = picks[index];
        if (!pick || pick.tail == null) return;
        rows.push({
          period: target,
          hit: pick.hit === true || actual.indexOf(pick.tail) >= 0,
          stream: key
        });
      });
    });
    var nextPeriod = pendingTarget != null ? pendingTarget : (maxTarget != null ? maxTarget + 1 : null);
    if (nextPeriod != null) {
      ["D1", "D2"].forEach(function (key) { pending.push({ stream: key, period: nextPeriod }); });
    }
    return { rows: rows, pending: pending };
  }

  // 滚动条统一记录口径：每个窗口把第1/2/3期分别列出（期号 + 尾号 + 中/错/待开奖；未产生写待定）
  function threeRowsHTML(batch, isRecommendMode, rowFontSize) {
    var out = '';
    var fs = rowFontSize || 11;
    for (var k = 0; k < 3; k++) {
      var periodK = Number(batch.startPeriod) + k;
      var attK = (batch.attempts || [])[k] || null;
      // 每期最新推荐模式：还没开奖的当期，用当期推荐号补上（真未来期没有推荐号才留空）
      var recTail = null;
    // 只有“下一期（latest+1）”的推荐号已经产生；更未来的期次一律待定，绝不显示模型重算的号
    if (isRecommendMode && !attK && periodK > latest && periodK <= latest + 1 && batch.stream) {
        var pendingPick = execPick(periodK, batch.stream);
        if (pendingPick && pendingPick.tail != null) recTail = pendingPick.tail;
      }
      var tailK = attK && attK.tail != null ? attK.tail
        : isRecommendMode ? recTail
        : (batch.tail != null ? batch.tail : null);
      var textK, toneK;
      if (attK) {
        textK = attK.hit === true ? "中" : attK.hit === false ? "错" : "待开奖";
        toneK = attK.hit === true ? "#16a34a" : attK.hit === false ? "#dc2626" : "#2563eb";
      } else if (periodK <= latest) {
        textK = "未记录"; toneK = "#94a3b8";
      } else {
        textK = "待开奖"; toneK = "#2563eb";
      }
      out += '<div style="display:flex;align-items:center;gap:5px;margin-top:3px;font-size:' + fs + 'px">';
      out += '<span style="flex:0 0 32px;font-weight:900;color:#475569">第' + (k + 1) + '期</span>';
      out += '<span style="color:#6b7280">第' + periodK + '期</span>';
      out += '<span style="margin-left:auto;font-weight:900">' + (tailK != null ? "尾" + tailK : "待定") + '</span>';
      out += '<b style="flex:0 0 42px;text-align:right;color:' + toneK + '">' + textK + '</b>';
      out += '</div>';
    }
    return out;
  }

  function buildThreePeriodCorrectScrollHTML(streamThree, isRecommendMode) {
    var html = '';
    html += '<div class="section"><div class="section__head"><h2 class="section__title">三期内对错滚动条</h2><span class="section__hint">D1/D2 独立线 · ' + WINDOW_RECORD_FORMAT + ' · 中=绿 错=红 进行中=蓝</span></div></div>';
    html += '<div class="section"><div class="panel" style="padding:12px 10px">';
    ["D1", "D2"].forEach(function (key) {
      var result = streamThree[key] || { label: key, batches: [] };
      var batches = (result.batches || []).slice().sort(function (a, b) {
        return Number(b.startPeriod) - Number(a.startPeriod);
      });
      var corrTotal = batches.length;
      var corrKey = "corrscroll:" + key + (isRecommendMode ? ":rec" : ":num");
      if (corrTotal > 60 && !perfExpandAll[corrKey]) batches = batches.slice(0, 60);
      html += '<div id="threeCorrectScroll' + key + '"' + (key === "D1" ? ' style="margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #e5e7eb"' : '') + '>';
      html += '<div style="font-size:12px;font-weight:900;color:' + (key === "D1" ? "#16a34a" : "#2563eb") + ';margin-bottom:6px">' + key + ' ' + result.label + '</div>';
      html += '<div class="record-scroll" style="padding-bottom:2px">';
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
          html += '<div style="min-width:212px;border:1px solid ' + border + ';border-radius:6px;padding:6px 8px;background:' + bg + '">';
          html += '<div style="font-size:10px;color:#6b7280">起始 第' + batch.startPeriod + '期</div>';
          html += '<div style="font-size:13px;font-weight:900;color:' + tone + ';margin-top:2px">' + resultText + '</div>';
          html += '<div style="font-size:10px;color:#6b7280;margin-top:2px;white-space:nowrap">' + mainText + '</div>';
          html += threeRowsHTML(batch, isRecommendMode, 10);
          html += '</div>';
        });
      }
      html += '</div></div></div>';
      html += perfMoreBtn(corrKey, corrTotal, batches.length, "窗");
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

    autoSettleUltimateOrders();
    var analysis = UM.analyze(RAW, MODEL, options);






    function pctFmt(x) {
      if (x == null) return "-";
      return (x * 100).toFixed(1) + "%";
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
          ? "起始第" + activeWindow.target + "期 · 当前窗口第" + Math.min((activeWindow.attempts || []).length + 1, 3) + "期 · 锁定号不换"
          : (isRecommendMode ? "本期采用最新推荐" : "暂未开新窗口")
      });
    });
    var executeKey = gateAction === "跟双号" ? "D1" : null;
    var executePick = null;
    for (var exi = 0; exi < sourceRows.length; exi++) {
      if (sourceRows[exi].key === executeKey && sourceRows[exi].pick) executePick = sourceRows[exi].pick;
    }

    if (!gateBlocked && !executePick) {
      gateBlocked = true;
      gateAction = "观望";
      executeKey = null;
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
    var ultModeKey = isRecommendMode ? "recommend" : "number";
    html += '<div class="section"><div class="panel" style="padding:12px">';
    html += '<div class="wm-view-tabs" style="margin-bottom:8px">';
    html += '<button class="chip wm-view-tab' + (ultModeKey === "number" ? " is-active" : "") + '" type="button" data-ult-mode="number">锁号追3期</button>';
    html += '<button class="chip wm-view-tab' + (ultModeKey === "recommend" ? " is-active" : "") + '" type="button" data-ult-mode="recommend">每期最新推荐</button>';
    html += '</div>';
    html += '<div class="panel__body" style="font-size:13px;line-height:1.75">' + (isRecommendMode
      ? '<b>当前模式：每期最新推荐。</b><br>每个3期窗口的第1期、第2期、第3期分别采用当期最新推荐号，号码可以每期不同；任意一期命中或三期全错后该窗口结束。真实快照优先展示并实时记录；没有快照的历史窗口保留，并明确标注为历史回测。'
      : '<b>当前模式：锁号追3期。</b><br>窗口开始时锁定一个推荐号，连续检查3期，号码不变；任意一期命中或三期全错后结束。窗口结束后，下一期重新锁定最新推荐号开新窗口。真实快照优先展示；没有快照的历史窗口保留，并明确标注为历史回测。') + '</div>';
    html += '</div></div>';
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
      html += '<div class="source-window-card" data-source-stream="' + row.key + '" data-window-start="' + (row.activeWindow ? row.activeWindow.target : "") + '" data-window-stage="' + (row.activeWindow ? Math.min((row.activeWindow.attempts || []).length + 1, 3) : "") + '" data-window-tail="' + (row.pick ? row.pick.tail : "") + '" style="border:2px solid ' + (isExec ? lockTone.border : "#d1d5db") + ';border-radius:8px;padding:9px 10px;background:#fff">';
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
    var realtimeThree = threePeriodRealtimeSnapshotRows();
    var realtimePendingByStream = {};
    realtimeThree.pending.forEach(function (p) {
      realtimePendingByStream[p.stream] = "第" + p.period + "期";
    });
    html += buildRealtimeSnapshotRateHTML({
      hint: (isRecommendMode ? "三期内追推荐" : "三期内追号码") + " · 单期快照只作诊断；正式战略成绩只看三期窗口命中，开奖后立即更新",
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

    // 原“三期内滚动记录”与上面的“对错滚动条”是同一批窗口（重复），已删除，只保留对错滚动条

    html += '<!--ULT_RECORDS_END-->';
    html += '<p class="disclaimer">' + modeLabel + '只监控动态概率D1/D2。' + (isRecommendMode ? '追推荐模式窗口结束后，下一期按最新推荐重新开窗。' : '追号模式会锁定起始推荐号码，同一时间每个位置只追一条线。') + '第35/60分是当前规则阈值，后续必须用真实快照继续验证，不能把历史回测当成固定收益。</p>';
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



  function renderChaseNumber() {
    renderUltimateMode(state.ultimateMode === "recommend" ? "recommend" : "number");
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

  function probabilityYearRaw(year) {
    var rawYear = {};
    D.filter(function (row) { return Number(row.y) === Number(year); }).forEach(function (row) {
      var bits = Array(10).fill("0");
      (row.nums || []).forEach(function (num) { bits[Number(num) % 10] = "1"; });
      rawYear[String(row.p)] = bits.join("");
    });
    return rawYear;
  }

  var probabilitySinglePeriodCache = {};
  var probabilitySinglePeriodBuilds = {};

  function probabilityIdle(callback) {
    if (typeof window.requestIdleCallback === "function") {
      return window.requestIdleCallback(callback, { timeout: 400 });
    }
    return setTimeout(callback, 16);
  }

  function probabilitySinglePeriodByRankAsync(year, callback) {
    var cacheKey = String(year);
    if (probabilitySinglePeriodCache[cacheKey]) {
      callback(probabilitySinglePeriodCache[cacheKey]);
      return;
    }
    if (probabilitySinglePeriodBuilds[cacheKey]) {
      probabilitySinglePeriodBuilds[cacheKey].callbacks.push(callback);
      return;
    }
    var rawYear = probabilityYearRaw(year);
    var periods = Object.keys(rawYear).map(Number).sort(function (a, b) { return a - b; });
    var byRank = [[], [], []];
    var build = { callbacks: [callback] };
    probabilitySinglePeriodBuilds[cacheKey] = build;
    var index = 0;
    function processChunk() {
      var end = Math.min(periods.length, index + 24);
      while (index < end) {
        var period = periods[index++];
        var saved = probabilitySnapshotRecord(period);
        var prediction = saved
          ? { top: (saved.top3 || []).slice() }
          : PROB_MODEL.analyze(rawYear, period - 1, { method: "new" });
        var bits = rawYear[String(period)] || "";
        var actualTails = [];
        for (var tail = 0; tail < bits.length; tail++) {
          if (bits.charAt(tail) === "1") actualTails.push(tail);
        }
        prediction.top.forEach(function (pick, rank) {
          var pending = !!saved && !saved.settled;
          byRank[rank].push({
            period: period,
            tail: pick.tail,
            actualTails: actualTails,
            hit: pending ? null : actualTails.indexOf(Number(pick.tail)) >= 0,
            pending: pending,
            source: saved ? "snapshot" : "backtest"
          });
        });
      }
      if (index < periods.length) {
        probabilityIdle(processChunk);
        return;
      }
      probabilitySinglePeriodCache[cacheKey] = byRank;
      delete probabilitySinglePeriodBuilds[cacheKey];
      build.callbacks.forEach(function (done) { done(byRank); });
    }
    probabilityIdle(processChunk);
  }

  function probabilitySinglePeriodRows(year, rank, history, pendingResult) {
    var rows = history.slice();
    var latestYear = Number((D[D.length - 1] || {}).y);
    var pendingTarget = pendingResult ? Number(pendingResult.target) : null;
    var alreadyPresent = rows.some(function (row) { return Number(row.period) === pendingTarget; });
    if (!alreadyPresent && pendingResult && Number(year) === latestYear && pendingResult.top && pendingResult.top[rank]) {
      rows.push({
        period: pendingTarget,
        tail: pendingResult.top[rank].tail,
        actualTails: [],
        hit: null,
        pending: true,
        source: "snapshot"
      });
    }
    return rows;
  }

  function probabilitySinglePeriodChipHTML(year, row) {
    var tone = row.pending ? "is-pending" : (row.hit ? "is-hit" : "is-miss");
    var result = row.pending ? "待开奖" : (row.hit ? "中" : "错");
    var title = Number(year) + "年第" + row.period + "期 · 尾" + row.tail + " · " + result +
      (row.actualTails && row.actualTails.length ? " · 实开尾" + row.actualTails.join("/") : "");
    return '<span class="prob-single-period-chip ' + tone + '" data-period="' + row.period +
      '" data-source="' + row.source + '" title="' + title + '"><b>' + result +
      '</b><span>第' + row.period + '期 · 尾' + row.tail + '</span></span>';
  }

  function probabilitySinglePeriodSourceNote(year) {
    return Number(year) === 2026
      ? "历史回测 · 294期起真实快照"
      : (Number(year) === 2025 ? "验证回测" : "训练回测");
  }

  function probabilitySinglePeriodHTML(year, rank, pendingResult) {
    var pendingRows = probabilitySinglePeriodRows(year, rank, [], pendingResult);
    var chips = pendingRows.map(function (row) {
      return probabilitySinglePeriodChipHTML(year, row);
    }).join("");
    return '<div class="prob-single-period"><div class="prob-single-period__head"><b>单期对错</b>' +
      '<span>' + probabilitySinglePeriodSourceNote(year) + ' · 单期统计生成中</span></div>' +
      '<div class="prob-single-period-strip record-scroll" data-prob-single-rank="' + rank +
      '" data-prob-single-year="' + year + '" data-prob-single-total="0" data-prob-single-rendered="' +
      pendingRows.length + '">' +
      chips + '</div></div>';
  }

  function hydrateProbabilitySinglePeriods(year, pendingResult) {
    var strips = [].slice.call(document.querySelectorAll('[data-prob-single-year="' + year + '"]'));
    if (!strips.length) return;
    probabilitySinglePeriodByRankAsync(year, function (byRank) {
      if (!strips[0].isConnected) return;
      var jobs = strips.map(function (strip) {
        var rank = Number(strip.dataset.probSingleRank);
        var rows = probabilitySinglePeriodRows(year, rank, byRank[rank], pendingResult);
        var settled = rows.filter(function (row) { return !row.pending; });
        var hits = settled.filter(function (row) { return row.hit; }).length;
        var misses = settled.length - hits;
        var rate = settled.length ? (hits / settled.length * 100).toFixed(1) + "%" : "-";
        var head = strip.parentElement.querySelector(".prob-single-period__head span");
        if (head) {
          head.textContent = probabilitySinglePeriodSourceNote(year) + " · 已开奖" + settled.length +
            "期 · 中" + hits + " · 错" + misses + " · 命中率" + rate;
        }
        strip.dataset.probSingleTotal = String(rows.length);
        return { strip: strip, rows: byRank[rank], next: byRank[rank].length };
      });
      function appendNextChunk() {
        var active = false;
        jobs.forEach(function (job) {
          if (job.next <= 0 || !job.strip.isConnected) return;
          active = true;
          var start = Math.max(0, job.next - 42);
          var html = job.rows.slice(start, job.next).reverse().map(function (row) {
            return probabilitySinglePeriodChipHTML(year, row);
          }).join("");
          job.strip.insertAdjacentHTML("beforeend", html);
          job.next = start;
          job.strip.dataset.probSingleRendered = String(job.rows.length - job.next + (
            Number(job.strip.dataset.probSingleTotal) > job.rows.length ? 1 : 0
          ));
          if (job.next === 0) job.strip.dataset.probSingleComplete = "1";
        });
        if (active) probabilityIdle(appendNextChunk);
      }
      probabilityIdle(appendNextChunk);
    });
  }

  function probabilityWindowStepsHTML(attempts, startPeriod, currentStage) {
    var html = '<div class="prob-window-steps">';
    for (var stage = 1; stage <= 3; stage++) {
      var attempt = attempts && attempts[stage - 1] ? attempts[stage - 1] : null;
      var tone = "is-closed";
      var detail = "未进入";
      var result = "已关窗";
      if (attempt) {
        if (attempt.pending) {
          var isCurrent = Number(currentStage) === stage;
          tone = isCurrent ? "is-current" : "is-future";
          result = isCurrent ? "待开奖" : "待定";
        } else if (attempt.hit) {
          tone = "is-hit";
          result = "中";
        } else {
          tone = "is-miss";
          result = "错";
        }
        detail = "第" + attempt.period + "期 · 尾" + attempt.tail;
      }
      html += '<div class="prob-window-step ' + tone + '" data-window-stage="' + stage + '">' +
        '<b>第' + stage + '期</b><span>' + detail + '</span><em>' + result + '</em></div>';
    }
    return html + '</div>';
  }

  function probabilityWindowCardHTML(options) {
    var cardClass = "prob-test-card" + (options.tone ? " " + options.tone : "");
    var liveAttr = options.live ? ' data-prob-live-window="1"' : "";
    var startAttr = options.startPeriod == null ? "" : ' data-prob-window-start="' + options.startPeriod + '"';
    var meta = options.startPeriod == null
      ? "等待重开 · 等尾" + options.tail + "开出"
      : "起始第" + options.startPeriod + "期 · 锁定尾" + options.tail;
    return '<div class="' + cardClass + '" data-prob-window-card="1"' + liveAttr + startAttr + '>' +
      '<div class="prob-window-card__head"><b>' + options.label + '</b><span>' + options.state + '</span></div>' +
      '<div class="prob-window-card__meta">' + meta + '</div>' +
      probabilityWindowStepsHTML(options.attempts, options.startPeriod, options.currentStage) +
      "</div>";
  }

  function probabilityTestWindowHTML(selectedYear, pendingResult) {
    var year = Number(selectedYear);
    var rawYear = probabilityYearRaw(year);
    var trainingYear = year >= 2021 && year <= 2024;
    var segment = trainingYear ? "训练" : (year === 2025 ? "验证" : "正式");
    var segmentNote = trainingYear ? "训练段 · 样本内追溯" : (year === 2025 ? "验证段" : "2026正式记录 · 294-296保留切换前快照");
    var labels = ["概率第1", "概率第2", "概率第3"];
    var html = '<div class="section"><div class="section__head"><h2 class="section__title">测试窗口记录 · 全历史三期窗口</h2><span class="section__hint">' + year + segment + '窗口 · 切换年份查看全部历史 · ' + WINDOW_RECORD_FORMAT + '</span></div></div>';
    html += '<div class="section"><div class="panel trend-run-card"><div class="trend-run-card__title"><b>' + year + segment + '窗口</b><span>' + segmentNote + '</span></div>';
    labels.forEach(function (label, rank) {
        var records = PROB_MODEL.windowBacktest(rawYear, rank, 3);
        var first = records.filter(function (r) { return r.hitIndex === 1; }).length;
        var second = records.filter(function (r) { return r.hitIndex === 2; }).length;
        var third = records.filter(function (r) { return r.hitIndex === 3; }).length;
        var miss = records.filter(function (r) { return r.status === "miss"; }).length;
        var liveLine = EXEC_LINES.filter(function (item) {
          return item.kind === "probability" && Number(item.rank) === rank;
        })[0];
        var liveState = liveLine ? wmStageNow(liveLine, 3) : null;
        var liveRecord = null;
        var latestYear = Number((D[D.length - 1] || {}).y);
        if (liveState && year === latestYear) {
          if (liveState.active) {
            var activeStart = betLocalPeriod(liveState.active.start);
            var activeYear = wmYearOf(liveState.active.start) || latestYear;
            if (activeYear === year) {
              var liveAttempts = [];
              for (var liveStage = 0; liveStage < 3; liveStage++) {
                var recorded = liveState.active.attempts[liveStage] || null;
                liveAttempts.push({
                  period: activeStart + liveStage,
                  tail: liveState.active.lockedTail,
                  hit: recorded ? recorded.hit : null,
                  pending: !recorded
                });
              }
              liveRecord = {
                startPeriod: activeStart,
                tail: liveState.active.lockedTail,
                status: "pending",
                hitIndex: null,
                attempts: liveAttempts,
                currentStage: liveState.active.attempts.length + 1
              };
            }
          } else if (liveState.waiting) {
            liveRecord = {
              startPeriod: null,
              tail: liveState.waiting.tail,
              status: "waiting",
              hitIndex: null,
              attempts: []
            };
          }
        }
        html += '<div class="prob-test-row"><div class="prob-test-head"><b>' + label + '</b><span>共' + records.length + '窗 · 第1期中' + first + ' · 第2期中' + second + ' · 第3期中' + third + ' · 全错' + miss + '</span></div>';
        html += '<div class="prob-test-strip">';
        if (liveRecord && liveRecord.status === "pending") {
          html += probabilityWindowCardHTML({
            label: "当前窗口",
            state: "进行中 · 第" + liveRecord.currentStage + "/3期",
            tone: "is-live",
            live: true,
            startPeriod: liveRecord.startPeriod,
            tail: liveRecord.tail,
            attempts: liveRecord.attempts,
            currentStage: liveRecord.currentStage
          });
        } else if (liveRecord && liveRecord.status === "waiting") {
          html += probabilityWindowCardHTML({
            label: "当前窗口",
            state: "等待重开",
            tone: "is-live is-waiting",
            live: true,
            startPeriod: null,
            tail: liveRecord.tail,
            attempts: [],
            currentStage: 0
          });
        }
        if (!records.length) html += '<span class="trend-run-empty">暂无已结算窗口</span>';
        records.slice().reverse().forEach(function (record) {
          var result = record.status === "miss" ? "错窗" : "中" + record.hitIndex;
          html += probabilityWindowCardHTML({
            label: result,
            state: "已结束",
            tone: record.status === "miss" ? "is-miss" : "is-hit",
            live: false,
            startPeriod: record.startPeriod,
            tail: record.tail,
            attempts: record.attempts,
            currentStage: 0
          });
        });
        html += '</div>';
        html += probabilitySinglePeriodHTML(year, rank, pendingResult);
        html += '</div>';
      });
    html += '</div></div>';
    html += '<p class="disclaimer">2021-2024为训练段样本内追溯，2025为验证段，2026记录最终结果。当前生产切换为5/7/15/21/30新方法；切换年份只做历史研究，所有窗口按每年第1期重新起算，不引用未来开奖。</p>';
    return html;
  }

  function probabilitySnapshotPct(value) {
    return (Number(value) * 100).toFixed(1) + "%";
  }

  function probabilitySnapshotCardHTML(record, currentState) {
    var rows = Array.isArray(record.allTails) ? record.allTails : [];
    var actualTails = Array.isArray(record.actualTails) ? record.actualTails.map(Number) : [];
    var pending = !record.settled;
    var stateText = pending
      ? "待开奖"
      : (record.results && record.results.top1 ? "Top1中" : (record.results && record.results.top3 ? "Top3覆盖" : "未覆盖"));
    var tone = pending ? "is-pending" : (record.results && record.results.top3 ? "is-covered" : "is-miss");
    var top3 = (record.top3 || []).map(function (row) { return "尾" + row.tail; }).join(" · ");
    var rankingLabel = record.rankingMetric === "window3Prob" ? "三期概率" : "下一期概率";
    var rowHTML = rows.map(function (row, index) {
      var isDrawn = actualTails.indexOf(Number(row.tail)) >= 0;
      var state = currentState && currentState[String(row.tail)]
        ? "漏" + currentState[String(row.tail)].currentMiss + " / 连" + currentState[String(row.tail)].currentStreak
        : "—";
      return '<div class="prob-snapshot-row' + (index < 3 ? " is-top" : "") + (isDrawn ? " is-drawn" : "") + '">' +
        '<b class="prob-snapshot-rank">' + (index + 1) + '</b>' +
        '<span class="prob-snapshot-tail-cell"><strong class="prob-snapshot-tail">尾' + row.tail +
        '</strong><small>' + state + '</small></span>' +
        '<span class="prob-snapshot-value">' + probabilitySnapshotPct(row.nextProb) + '</span>' +
        '<span class="prob-snapshot-value">' + probabilitySnapshotPct(row.window3Prob) + '</span>' +
        '</div>';
    }).join("");
    if (rows.length !== 10) {
      rowHTML = '<div class="prob-snapshot-incomplete">快照不完整：应为10项，实际' + rows.length + '项</div>';
    }
    return '<article class="prob-snapshot-card ' + tone + '" data-prob-target="' + record.target + '">' +
      '<div class="prob-snapshot-card__head"><b>第' + record.target + '期</b><span>' + stateText + '</span></div>' +
      '<div class="prob-snapshot-card__meta">基于第' + record.basedOn + '期 · ' + rankingLabel + '排序 · ' + (record.modelVersion || "") + '</div>' +
      '<div class="prob-snapshot-columns"><span>排名</span><span>尾号</span><span>下一期</span><span>三期</span></div>' +
      '<div class="prob-snapshot-rows">' + rowHTML + '</div>' +
      '<div class="prob-snapshot-card__foot">Top3：' + (top3 || "缺失") +
      (actualTails.length ? ' · 实开尾' + actualTails.join("/") : "") + '</div>' +
      '</article>';
  }

  function probabilitySnapshotStripHTML(records, currentResult) {
    if (!records.length) return '<div class="trend-run-empty">暂无真实概率快照</div>';
    var currentState = {};
    (currentResult.rows || []).forEach(function (row) { currentState[String(row.tail)] = row; });
    return '<div class="prob-snapshot-strip" data-prob-snapshot-strip="1">' +
      records.map(function (record) {
        return probabilitySnapshotCardHTML(record, Number(record.target) === Number(currentResult.target) ? currentState : null);
      }).join("") +
      '</div>';
  }

  function mountProbabilitySnapshots(currentResult) {
    var mount = document.getElementById("probabilitySnapshotMount");
    if (!mount) return;
    function render(data) {
      if (!mount.isConnected) return;
      var records = Array.isArray(data.records) ? data.records.slice() : [];
      records.sort(function (a, b) { return Number(b.target) - Number(a.target); });
      mount.innerHTML = probabilitySnapshotStripHTML(records, currentResult);
      var strip = mount.querySelector("[data-prob-snapshot-strip]");
      if (strip) strip.scrollLeft = 0;
    }
    if (window.APP_PROBABILITY_SNAPSHOTS) {
      render(window.APP_PROBABILITY_SNAPSHOTS);
      return;
    }
    fetch("probability_snapshots.json", { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      })
      .then(function (data) {
        render(data);
      })
      .catch(function (error) {
        if (!mount.isConnected) return;
        mount.innerHTML = '<div class="trend-run-empty">概率快照读取失败：' + String(error.message || error) + '</div>';
      });
  }

  function renderProbabilityModel() {
    var result = PROB_MODEL.analyze(RAW, latest);
    var vm = PROB_MODEL.META.validation, sm = PROB_MODEL.META.shadow2026;
    var vb = PROB_MODEL.META.baseline.validation, sb = PROB_MODEL.META.baseline.shadow2026;
    function pct(v) { return (v * 100).toFixed(1) + "%"; }
    function delta(v, base) { var d = (v - base) * 100; return (d >= 0 ? "+" : "") + d.toFixed(1) + "pp"; }
    var years = [];
    D.forEach(function (row) {
      var year = Number(row.y);
      if (year && years.indexOf(year) < 0) years.push(year);
    });
    years.sort(function (a, b) { return b - a; });
    var selectedYear = years.indexOf(Number(state.probYear)) >= 0 ? Number(state.probYear) : years[0];
    state.probYear = selectedYear;
    var yearTabs = years.map(function (year) {
      var tag = year <= 2024 ? "训练" : year === 2025 ? "验证" : "正式";
      return '<button class="chip wm-view-tab ' + (year === selectedYear ? "is-active" : "") + '" type="button" data-prob-year="' + year + '">' + year + ' ' + tag + '</button>';
    }).join("");
    var heading = result.legacyLocked ? "第" + result.target + "期锁定快照" : "第" + result.target + "期三期优先预测";
    var methodHint = result.legacyLocked
      ? "旧10期权重已于开奖前锁定，保留原预测不改写；新方法从第297期开始"
      : "生产方法 " + PROB_MODEL.META.productionMethod.windows.join(" / ") + " 期 · 三期概率排序 · 下一期概率作诊断";
    var html = '<div class="section"><div class="section__head"><h2 class="section__title">动态概率模型 · ' + heading + '</h2><span class="section__hint">模型 ' + result.version + ' · ' + methodHint + '</span></div></div>';
    html += '<div class="section"><div class="panel prob-page-summary"><div class="prob-summary-state"><b>生产状态 · 用户已切换新方法</b><span>2025验证段 下一期Top1 ' + pct(vm.nextTop1) + ' / 随机 ' + pct(vb.next) + ' · 三期Top1 ' + pct(vm.window3Top1) + ' / 随机 ' + pct(vb.window3) + '</span><span>2026影子段 下一期Top1 ' + pct(sm.nextTop1) + ' / 随机 ' + pct(sb.next) + ' · 三期Top1 ' + pct(sm.window3Top1) + ' / 随机 ' + pct(sb.window3) + '</span><strong>研究提示：2025验证段仍弱于旧方法</strong></div><div class="prob-summary-note">新方法相对旧方法：2025 ' + delta(vm.window3Top1, 0.9090909090909091) + '，2026 ' + delta(sm.window3Top1, 0.8771331058020477) + '；按用户决定已切换生产，继续跟踪风险。</div></div></div>';
    html += '<div class="section"><div class="panel"><div class="wm-subhead">测试历史年份 · 2021-2026各年独立</div><div class="wm-view-tabs">' + yearTabs + '</div></div></div>';
    html += probabilityTestWindowHTML(selectedYear, result);
    html += '<div class="section"><div class="section__head"><h2 class="section__title">每期10尾完整排序快照</h2><span class="section__hint">真实保存 · 最新在左 · 完整10尾排序 · 每期10项 · 左右滑动</span></div></div>';
    html += '<div class="section"><div id="probabilitySnapshotMount" class="panel prob-snapshot-mount"><div class="trend-run-empty">概率快照读取中...</div></div></div>';
    html += '<p class="disclaimer">生产权重改为5/7/15/21/30期，各自使用训练段学出的系数并按完整三期内概率排序。第294-296期真实快照保持原样；第296期开奖前已锁定的旧模型前三名不得事后改写，新方法从第297期开始生成生产快照。</p>';
    view.innerHTML = modelPairStrip(latest + 1) + html;
    mountProbabilitySnapshots(result);
    hydrateProbabilitySinglePeriods(selectedYear, result);
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
      var bounceLimit = MODEL.bounceCritical && MODEL.bounceCritical[r.tail] != null ? MODEL.bounceCritical[r.tail] : 2;
      var status = r.miss >= bounceLimit ? "临界反弹" : r.c15 >= 10 ? "热惯性" : r.c15 <= 5 ? "冷待反弹" : r.streakNow >= 3 ? "连出中" : "中";
      var statusColor = r.miss >= bounceLimit ? "#dc2626" : r.c15 >= 10 ? "#16a34a" : r.c15 <= 5 ? "#2563eb" : "#6b7280";
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
    var shownNumTrend = perfRows("numtrend", arr);
    shownNumTrend.forEach(function (r) {
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
    html += perfMoreBtn("numtrend", arr.length, shownNumTrend.length);
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
    var shownZodTrend = perfRows("zodtrend", arr);
    var zodTrendStart = arr.length - shownZodTrend.length;
    shownZodTrend.forEach(function (r, k) {
      var i = zodTrendStart + k;
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
    html += perfMoreBtn("zodtrend", arr.length, shownZodTrend.length);
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
      var edgeTxt, edgeColor;
      if (bestTotal < 10) { edgeTxt = "样本不足"; edgeColor = "#94a3b8"; }
      else { edgeTxt = "中" + bestHit + "·错" + (bestTotal - bestHit); edgeColor = bestTotal < 20 ? "#eab308" : "#16a34a"; }
      html += '<tr><td><strong>' + num + "</strong></td><td>缺席 ≥ " + (bestGap || 2) + " 期</td><td style=\"color:" + edgeColor + ";font-weight:700\">" + edgeTxt + "</td><td>" + bestTotal + "</td><td>" + desc + "</td></tr>";
    }
    html += "</tbody></table></div></div>";
    html += '<p class="disclaimer">统计口径：当某数字连续缺席 N 期后，接下来 3 期内出现的概率；样本量不足时优先放宽到 3。仅供参考。</p>';
    view.innerHTML = html;
  }

  var SWIPE_X = 28;
  var SWIPE_PRIMARY_X = 22;
  var SWIPE_CANCEL_X = 20;
  var SWIPE_DIRECTION_RATIO = 1.12;
  // 左手模式：上半屏保持窄边缘，下半屏扩大左下拇指区，右下只留辅助区
  var LEFT_EDGE_FLIP_ZONE = 36;
  var RIGHT_EDGE_FLIP_ZONE = 56;
  var LEFT_ONE_HAND_ZONE = 96;
  var RIGHT_ONE_HAND_ZONE = 44;
  var ONE_HAND_ZONE_START = 0.42;
  var historyPointerStart = null;
  var gestureClickGuard = false;
  var gestureClickGuardTimer = null;
  var gestureCommitTimer = null;
  // 滑动后页面会整块重渲染，pointerup 可能丢失；用定时器兜底，避免下一次点击被吞掉
  function armGestureClickGuard() {
    gestureClickGuard = true;
    if (gestureClickGuardTimer) clearTimeout(gestureClickGuardTimer);
    gestureClickGuardTimer = setTimeout(function () { gestureClickGuard = false; }, 450);
  }

  function edgeFlipZoneAt(x, y) {
    if (y >= window.innerHeight * ONE_HAND_ZONE_START) {
      return x <= LEFT_ONE_HAND_ZONE || x >= window.innerWidth - RIGHT_ONE_HAND_ZONE;
    }
    return x <= LEFT_EDGE_FLIP_ZONE || x >= window.innerWidth - RIGHT_EDGE_FLIP_ZONE;
  }

  function commitGestureIntent(intent) {
    if (!intent) return;
    if (intent.type === "window-view") stepWindowMultView(intent.delta);
    else if (intent.type === "page") {
      if (intent.level === "group") stepGroupHistory(intent.delta);
      else stepTabHistory(intent.delta);
    }
  }

  function clearGestureCommitTimer() {
    if (!gestureCommitTimer) return;
    clearTimeout(gestureCommitTimer);
    gestureCommitTimer = null;
  }

  function scheduleGestureIntent(gesture, delay) {
    if (gestureCommitTimer) clearTimeout(gestureCommitTimer);
    gestureCommitTimer = setTimeout(function () {
      gestureCommitTimer = null;
      if (!historyPointerStart || historyPointerStart !== gesture || !gesture.intent) return;
      var intent = gesture.intent;
      gesture.intent = null;
      historyPointerStart = null;
      document.documentElement.classList.remove("gesture-active");
      commitGestureIntent(intent);
    }, delay == null ? 120 : delay);
  }

  function gestureIntentAt(gesture, x, y, threshold) {
    var dx = x - gesture.x;
    var dy = y - gesture.y;
    var absX = Math.abs(dx);
    var absY = Math.abs(dy);
    if (absX > 10 || absY > 10) armGestureClickGuard();
    if (gesture.inHorizontalScroll && !gesture.edgeSwipe) return null;
    if (gesture.windowViewSwipe) {
      if (absX < threshold || absX < absY * SWIPE_DIRECTION_RATIO) return null;
      return { type: "window-view", delta: dx > 0 ? -1 : 1 };
    }
    if (gesture.pageSwipeDisabled) return null;
    if (absX < threshold || absX < absY * SWIPE_DIRECTION_RATIO) return null;
    return { type: "page", level: gesture.level, delta: dx > 0 ? -1 : 1 };
  }

  function finishHistoryGesture(x, y, cancelled) {
    if (!historyPointerStart) return;
    clearGestureCommitTimer();
    var gesture = historyPointerStart;
    historyPointerStart = null;
    document.documentElement.classList.remove("gesture-active");
    var normalThreshold = gesture.level === "group" ? SWIPE_PRIMARY_X : SWIPE_X;
    var threshold = cancelled ? Math.min(normalThreshold, SWIPE_CANCEL_X) : normalThreshold;
    var intent = gesture.intent || gestureIntentAt(gesture, x, y, threshold);
    if (!intent) return;
    armGestureClickGuard();
    commitGestureIntent(intent);
  }

  document.documentElement.addEventListener("pointerdown", function (e) {
    clearGestureCommitTimer();
    if (!e.isPrimary || (e.pointerType === "mouse" && e.button !== 0)) {
      historyPointerStart = null;
      return;
    }
    if (e.target.closest("input, select, textarea, a, [contenteditable='true']")) {
      historyPointerStart = null;
      return;
    }
    var gestureInfo = horizontalGestureInfoAt(e);
    if (gestureInfo.onVerticalScrollbar) {
      historyPointerStart = null;
      return;
    }
    historyPointerStart = {
      x: e.clientX,
      y: e.clientY,
      id: e.pointerId,
      level: state.tab === "directory" || e.target.closest(".nav-groups") ? "group" : "tab",
      inHorizontalScroll: gestureInfo.inHorizontalScroll,
      edgeSwipe: edgeFlipZoneAt(e.clientX, e.clientY),
      windowViewSwipe: state.tab === "windowmult" && !e.target.closest(".wm-line-selector, .wm-view-tabs"),
      pageSwipeDisabled: state.tab === "windowmult",
      intent: null,
      handled: false
    };
    document.documentElement.classList.add("gesture-active");
  }, true);

  document.documentElement.addEventListener("pointermove", function (e) {
    if (!historyPointerStart || e.pointerId !== historyPointerStart.id || historyPointerStart.handled) return;
    if ((navDragState && navDragState.active) || (tableDragState && tableDragState.active)) {
      e.preventDefault();
      return;
    }
    var dx = e.clientX - historyPointerStart.x;
    var dy = e.clientY - historyPointerStart.y;
    var absX = Math.abs(dx);
    var absY = Math.abs(dy);
    var level = historyPointerStart.level;
    var swipeX = level === "group" ? SWIPE_PRIMARY_X : SWIPE_X;
    if (historyPointerStart.inHorizontalScroll && !historyPointerStart.edgeSwipe) return;
    if (historyPointerStart.windowViewSwipe) {
      if (absX >= swipeX && absX > absY * SWIPE_DIRECTION_RATIO) {
        historyPointerStart.handled = true;
        historyPointerStart.intent = { type: "window-view", delta: dx > 0 ? -1 : 1 };
        armGestureClickGuard();
        e.preventDefault();
        scheduleGestureIntent(historyPointerStart);
      }
      return;
    }
    if (historyPointerStart.pageSwipeDisabled) return;
    if (absX >= swipeX && absX > absY * SWIPE_DIRECTION_RATIO) {
      historyPointerStart.handled = true;
      historyPointerStart.intent = { type: "page", level: level, delta: dx > 0 ? -1 : 1 };
      armGestureClickGuard();
      e.preventDefault();
      scheduleGestureIntent(historyPointerStart);
    }
  }, true);

  document.documentElement.addEventListener("pointerup", function (e) {
    if (!historyPointerStart || e.pointerId !== historyPointerStart.id) return;
    finishHistoryGesture(e.clientX, e.clientY, false);
  }, true);

  document.documentElement.addEventListener("pointercancel", function (e) {
    if (historyPointerStart) {
      if (e.pointerId !== historyPointerStart.id) return;
      finishHistoryGesture(e.clientX, e.clientY, true);
      return;
    }
    clearGestureCommitTimer();
    document.documentElement.classList.remove("gesture-active");
  }, true);

  document.documentElement.addEventListener("click", function (e) {
    if (!gestureClickGuard) return;
    gestureClickGuard = false;
    e.preventDefault();
    e.stopPropagation();
  }, true);

  tabsEl.addEventListener("click", function (e) {
    if (navDragClickGuard) {
      e.preventDefault();
      e.stopPropagation();
      navDragClickGuard = false;
      return;
    }
    var directoryBtn = e.target.closest("[data-directory]");
    if (directoryBtn) {
      state.tab = "directory";
      state.directoryGroup = null;
      try { localStorage.removeItem("v2_directory_group"); } catch (err) {}
      lsSet("v2_current_tab", state.tab);
      render();
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
      perfResetAll();
      state.tab = btn.dataset.tab;
      rememberTabInGroup(state.group, state.tab);
      lsSet("v2_current_tab", state.tab);
      render();
    }
  });

  view.addEventListener("click", function (e) {
    var missOrderYearBtn = e.target.closest("[data-miss-order-year]");
    if (missOrderYearBtn) {
      state.missOrderYear = Number(missOrderYearBtn.dataset.missOrderYear);
      render();
      return;
    }
    var windowMissYearBtn = e.target.closest("[data-window-miss-year]");
    if (windowMissYearBtn) {
      state.windowMissYear = Number(windowMissYearBtn.dataset.windowMissYear);
      render();
      return;
    }
    var perfMore = e.target.closest("[data-perf-more]");
    if (perfMore) {
      perfExpandAll[perfMore.dataset.perfMore] = true;
      render();
      return;
    }
    var noteAdd = e.target.closest("[data-note-add]");
    if (noteAdd) {
      var noteBox = document.getElementById("noteInput");
      var noteTxt = noteBox ? String(noteBox.value || "").trim() : "";
      if (noteTxt) {
        var noteList = notesLoad();
        noteList.push({ id: String(Date.now()) + "-" + Math.random().toString(36).slice(2, 7), text: noteTxt, at: new Date().toLocaleString("zh-CN", { hour12: false }) });
        notesSave(noteList);
      }
      renderNotes();
      return;
    }
    var noteDel = e.target.closest("[data-note-del]");
    if (noteDel) {
      var noteDelId = String(noteDel.dataset.noteDel);
      notesSave(notesLoad().filter(function (n) { return String(n.id) !== noteDelId; }));
      renderNotes();
      return;
    }
    var noteClear = e.target.closest("[data-note-clear]");
    if (noteClear) {
      if (window.confirm("确定清空全部笔记？")) { notesSave([]); renderNotes(); }
      return;
    }
    var probYearBtn = e.target.closest("[data-prob-year]");
    if (probYearBtn) {
      state.probYear = Number(probYearBtn.dataset.probYear);
      lsSet("v2_prob_year", state.probYear);
      renderProbabilityModel();
      return;
    }
    var betMode = e.target.closest("[data-bet-mode]");
    if (betMode) {
      state.betPlanMode = betMode.dataset.betMode === "three" ? "three" : "two";
      renderBetExec();
      return;
    }
    var wmMode = e.target.closest("[data-wm-mode]");
    if (wmMode) {
      // 窗口遗漏热图自己的开关，只重渲染本页，不动下注执行表的方案
      state.windowMissMode = wmMode.dataset.wmMode === "two" ? "two" : "three";
      renderWindowMiss();
      return;
    }
    var betResearch = e.target.closest("#view details > summary");
    if (betResearch && betResearch.parentElement) {
      state.betResearchOpen = !betResearch.parentElement.open;
      return;
    }
    var betLines = e.target.closest("[data-bet-lines]");
    if (betLines) {
      var blMode = betLines.dataset.betLines;
      state.betLineMode = blMode === "all" ? "all"
        : (blMode === "positive" ? "positive"
          : (blMode === "rotate5" ? "rotate5"
            : (blMode === "lastyear" ? "lastyear"
              : (blMode === "win5" ? "win5" : "verdict"))));
      renderBetExec();
      return;
    }
    var ultModeBtn = e.target.closest("[data-ult-mode]");
    if (ultModeBtn) {
      state.ultimateMode = ultModeBtn.dataset.ultMode === "recommend" ? "recommend" : "number";
      renderChaseNumber();
      return;
    }
    var wmViewBtn = e.target.closest("[data-wm-view]");
    if (wmViewBtn) {
      state.windowMultView = wmViewBtn.dataset.wmView;
      renderWindowMultiplierTest();
      return;
    }
    var wmMoreBtn = e.target.closest("[data-wm-detail-more]");
    if (wmMoreBtn) {
      state.windowMultDetailYears = (Number(state.windowMultDetailYears) || 1) + Number(wmMoreBtn.dataset.wmDetailMore || 1);
      renderWindowMultiplierTest();
      return;
    }
    if (e.target.closest("[data-wm-detail-reset]")) {
      state.windowMultDetailYears = 1;
      renderWindowMultiplierTest();
      return;
    }
    var searchType = e.target.closest("[data-numsearch-type]");
    if (searchType) {
      state.numSearchType = searchType.dataset.numsearchType;
      var typeButtons = view.querySelectorAll("[data-numsearch-type]");
      for (var ti = 0; ti < typeButtons.length; ti++) {
        typeButtons[ti].classList.toggle("is-active", typeButtons[ti] === searchType);
      }
      var searchInput = document.getElementById("numSearchInput");
      if (searchInput) searchInput.placeholder = state.numSearchType === "tail" ? "例如：0359 或 0 3 5 9" : "例如：01 03 05 20";
      var typeResults = document.getElementById("numSearchResults");
      if (typeResults) typeResults.innerHTML = numSearchResultsHTML();
      return;
    }
    var searchMode = e.target.closest("[data-numsearch-mode]");
    if (searchMode) {
      state.numSearchMode = searchMode.dataset.numsearchMode;
      var modeButtons = view.querySelectorAll("[data-numsearch-mode]");
      for (var mi = 0; mi < modeButtons.length; mi++) {
        modeButtons[mi].classList.toggle("is-active", modeButtons[mi] === searchMode);
      }
      var modeResults = document.getElementById("numSearchResults");
      if (modeResults) modeResults.innerHTML = numSearchResultsHTML();
      return;
    }
    if (e.target.closest("[data-numsearch-run]")) {
      var queryInput = document.getElementById("numSearchInput");
      state.numSearchQuery = queryInput ? queryInput.value : "";
      var searchResults = document.getElementById("numSearchResults");
      if (searchResults) searchResults.innerHTML = numSearchResultsHTML();
      return;
    }
    var directoryHome = e.target.closest("[data-directory-home]");
    if (directoryHome) {
      state.directoryGroup = null;
      try { localStorage.removeItem("v2_directory_group"); } catch (err) {}
      renderDirectory();
      return;
    }
    var directoryTab = e.target.closest("[data-directory-tab]");
    if (directoryTab) {
      state.tab = directoryTab.dataset.directoryTab;
      state.directoryGroup = null;
      try { localStorage.removeItem("v2_directory_group"); } catch (err) {}
      rememberGroup(state.group);
      rememberTabInGroup(state.group, state.tab);
      lsSet("v2_current_tab", state.tab);
      render();
      return;
    }
    var directoryGroup = e.target.closest("[data-directory-group]");
    if (directoryGroup && navDragClickGuard) {
      navDragClickGuard = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (directoryGroup) {
      state.group = directoryGroup.dataset.directoryGroup;
      state.directoryGroup = state.group;
      rememberGroup(state.group);
      lsSet(NAV_GROUP_KEY, state.group);
      lsSet("v2_directory_group", state.group);
      renderDirectory();
      return;
    }
    var groupHistoryStep = e.target.closest("[data-group-history-step]");
    if (groupHistoryStep) {
      stepGroupHistory(Number(groupHistoryStep.dataset.groupHistoryStep));
      return;
    }
    var tabHistoryStep = e.target.closest("[data-tab-history-step]");
    if (tabHistoryStep) {
      stepTabHistory(Number(tabHistoryStep.dataset.tabHistoryStep));
      return;
    }
    var overviewTab = e.target.closest("[data-overview-tab]");
    if (overviewTab) {
      var targetTab = overviewTab.dataset.overviewTab;
      state.tab = targetTab;
      var targetGroup = groupForTab(targetTab);
      if (targetGroup) {
        state.group = targetGroup.id;
        rememberGroup(state.group);
      }
      rememberTabInGroup(state.group, state.tab);
      lsSet("v2_current_tab", state.tab);
      lsSet(NAV_GROUP_KEY, state.group);
      render();
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

  view.addEventListener("input", function (e) {
    if (!e.target.closest("[data-numsearch-input]")) return;
    state.numSearchQuery = e.target.value;
    var results = document.getElementById("numSearchResults");
    if (results) results.innerHTML = numSearchResultsHTML();
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
  // 刷新后停在原来那个页面（用户要求）；只有存的页面已经不存在了才回目录
  if (validTabs.indexOf(state.tab) === -1) state.tab = "directory";
  var currentGroup = groupForTab(state.tab) || groupById(state.group) || NAV_GROUPS[0];
  state.group = currentGroup.id;
  if (state.tab !== "directory") {
    rememberGroup(state.group);
    rememberTabInGroup(state.group, state.tab);
  }
  lsSet(NAV_GROUP_KEY, state.group);
  lsSet("v2_current_tab", state.tab);
  autoSettleUltimateOrders();
  renderHeader();
  render();
})();
