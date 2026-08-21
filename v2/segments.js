(function () {
  "use strict";

  var RAW = window.APP_DATA.raw;
  var periods = Object.keys(RAW)
    .map(Number)
    .sort(function (a, b) { return a - b; });
  var N = periods.length;
  var BASE = [0.4717, 0.5539, 0.5539, 0.5539, 0.5539, 0.5539, 0.5539, 0.5539, 0.5539, 0.5539];

  var view = document.getElementById("view");
  var currentWindow = 15;

  function segsOf(w) {
    var segs = [];
    for (var st = 0; st < N; st += w) {
      var en = Math.min(st + w - 1, N - 1);
      segs.push({ si: st, ei: en, s: periods[st], e: periods[en], len: en - st + 1 });
    }
    return segs;
  }

  function countIn(tail, a, b) {
    var c = 0;
    for (var i = a; i <= b; i++) {
      if (RAW[String(periods[i])][tail] === "1") c++;
    }
    return c;
  }

  function render() {
    var segs = segsOf(currentWindow);
    var last3 = segs.slice(-3);

    var html = '<div class="section"><div class="section__head"><h2 class="section__title">窗口选择</h2></div><div class="chips">';
    [5, 7, 10, 15, 20, 27, 30].forEach(function (w) {
      html += '<button class="chip ' + (w === currentWindow ? "is-active" : "") + '" data-w="' + w + '">' + w + " 期</button>";
    });
    html += "</div></div>";

    html += '<div class="section"><div class="section__head"><h2 class="section__title">最近三段对比</h2><span class="section__hint">共 ' + segs.length + " 个分段，末段可能不满窗口</span></div>";
    html += '<div class="panel"><table class="table"><thead><tr><th>尾数</th>';

    last3.forEach(function (seg, idx) {
      var segNo = segs.length - 3 + idx + 1;
      html += '<th class="seg-cell"><div>第 ' + segNo + " 段</div><div class=\"seg-head\">" + seg.s + "-" + seg.e + " 期 · " + seg.len + " 期</div></th>";
    });
    html += "<th>趋势</th></tr></thead><tbody>";

    for (var t = 0; t < 10; t++) {
      html += "<tr><td>" + t + "</td>";
      var rates = last3.map(function (seg) {
        return countIn(t, seg.si, seg.ei) / seg.len;
      });
      last3.forEach(function (seg, idx) {
        var c = Math.round(rates[idx] * seg.len);
        var rate = rates[idx];
        var above = rate >= BASE[t];
        var color = above ? "var(--hot)" : "var(--cold)";
        html += '<td class="seg-cell"><div class="seg-rate" style="color:' + color + '">' + (rate * 100).toFixed(0) + '%</div><div class="seg-count">' + c + "/" + seg.len + '</div><div class="seg-bar"><i style="width:' + Math.round(rate * 100) + '%"></i></div></td>';
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
    html += '<p class="disclaimer">百分比 = 该尾数在该分段窗口内的开出率；颜色红=高于该尾数理论基准，蓝=低于基准。末段若不满窗口，以实际期数计算。</p>';

    view.innerHTML = html;
  }

  view.addEventListener("click", function (e) {
    var chip = e.target.closest("[data-w]");
    if (chip) {
      currentWindow = Number(chip.dataset.w);
      render();
    }
  });

  render();
})();
