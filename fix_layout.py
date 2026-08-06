# -*- coding: utf-8 -*-
"""将尾数分析器从横版(行=尾数)改为竖版(行=段)"""

import re

with open('尾数分析器.html', 'r', encoding='utf-8-sig') as f:
    content = f.read()

# 找到 draw() 函数的起止位置
start_marker = 'function draw(){\nvar w=parseInt'
end_marker = "document.getElementById('tips').innerHTML=arr.join('<br>');"

start_idx = content.find(start_marker)
if start_idx == -1:
    print("ERROR: start_marker not found")
    exit(1)

end_idx = content.find(end_marker, start_idx)
if end_idx == -1:
    print("ERROR: end_marker not found")
    exit(1)

# 找到 end_marker 后面的那个 }
brace_idx = content.find('}', end_idx)
old_func = content[start_idx:brace_idx+1]
print(f"Found draw() function: {len(old_func)} chars")

# 新的竖版 draw 函数
new_draw = r"""function draw(){
var w=parseInt(document.getElementById('sz').value);
var vr=parseInt(document.getElementById('vr').value);
var wdata = ALLDATA[String(w)];

var all=[];
for(var st=1;st<=N;st+=w)all.push({st:st,en:Math.min(st+w-1,N),tot:Math.min(w,N-st+1),w:w,full:Math.min(w,N-st+1)===w});
var view=all;
if(vr>0&&vr<view.length)view=view.slice(-vr);

// 预计算每个尾数的段数据
var selSegs={};
for(var di=0;di<sel.length;di++){
  var d=sel[di],sa=segs(d,w);
  selSegs[d]=vr>0&&vr<sa.length?sa.slice(-vr):sa;
}

// 竖版：行=段，列=尾数
var h='<tr><th class="fix">段</th>';
for(var di=0;di<sel.length;di++){
  h+='<th>尾'+sel[di]+'</th>';
}
h+='<th>预测</th></tr>';

var b='',arr=[];
for(var i=0;i<view.length;i++){
  var ci=view[i];
  var segIdx = all.indexOf(ci);
  b+='<tr><td class="fix">S'+(segIdx+1)+'<br>'+ci.st+'-'+ci.en+''+(ci.full?'':'<br><span class="dim">('+ci.tot+'期)</span>')+'</td>';
  
  for(var di=0;di<sel.length;di++){
    var d=sel[di];
    var dv=selSegs[d];
    var e=dv[i];
    if(!e){b+='<td>-</td>';continue;}
    var a='';
    if(i>0&&dv[i-1]){
      var pv=dv[i-1].rate;
      if(e.rate>pv+3)a='<span class="arr" style="color:#16a34a">\u25b2</span>';
      else if(e.rate<pv-3)a='<span class="arr" style="color:#dc2626">\u25bc</span>';
      else a='<span class="arr" style="color:#aaa">\u2500</span>';
    }
    var dot=open(d,e.en)?' \u25cf':'';
    var lb = label(e.rate);
    var pred = wdata ? getPred(d, segIdx, w) : null;
    b+='<td class="'+cls(e.rate)+'">'+a+'<span class="big">'+f1(e.rate,1)+'%</span> '+lb+'<br>'+e.cnt+'/'+e.w+dot+(pred?'<div class="pred">'+pred+'</div>':'')+'</td>';
  }
  
  // 预测列
  var predHtml='';
  for(var di=0;di<sel.length;di++){
    var d=sel[di];
    var dv=selSegs[d];
    var e=dv[i];
    if(!e)continue;
    var p2=wdata?getPred(d,segIdx,w):null;
    if(p2){
      predHtml+='<span style="font-size:10px"><b>'+d+':</b> '+p2+'</span><br>';
    }
  }
  b+='<td style="font-size:10px;line-height:1.4;color:#6c5ce7;white-space:normal;min-width:120px">'+(predHtml||'-')+'</td>';
  b+='</tr>';
}

// 底部趋势摘要
for(var di=0;di<sel.length;di++){
  var d=sel[di],sa=segs(d,w);
  var pd='';
  if(sa.length>=2){
    var curRate=sa[sa.length-1].rate;
    var prevRate=sa[sa.length-2].rate;
    function getAbbr(r){if(r>=70)return'H';if(r>=60)return'W';if(r>=50)return'N';if(r>=40)return'L';if(r>=30)return'C';return'I';}
    var curAbbr=getAbbr(curRate);
    var prevAbbr=getAbbr(prevRate);
    var pattern=prevAbbr+curAbbr;
    var transData=ALLDATA[String(w)].trans;
    if(transData[pattern]&&transData[pattern].total>0){
      var total=transData[pattern].total;
      var upCount=0,downCount=0;
      var clsValues={'I':0,'C':1,'L':2,'N':3,'W':4,'H':5};
      var curValue=clsValues[curAbbr];
      for(var nextCls in transData[pattern]){
        if(nextCls==='total')continue;
        var nextValue=clsValues[nextCls];
        if(nextValue>curValue)upCount+=transData[pattern][nextCls];
        else if(nextValue<curValue)downCount+=transData[pattern][nextCls];
      }
      var upPct=Math.round(upCount/total*100);
      var downPct=Math.round(downCount/total*100);
      if(upPct>downPct)pd='\u25b2 上升 '+upPct+'%';
      else if(downPct>upPct)pd='\u25bc 下降 '+downPct+'%';
      else pd='\u2500 持平 '+upPct+'%';
    }else{pd='-';}
  }
  var sts=sa.slice(-3).map(function(x){return f1(x.rate,1)+'%';}).join(' \u2192 ');
  arr.push('<b style="color:#6c5ce7">尾'+d+'</b> '+pd+' <span style="color:#bbb">'+sts+'</span>');
}

document.getElementById('tbl').innerHTML=h+b;
document.getElementById('tips').innerHTML=arr.join('<br>');"""

# 替换
new_content = content[:start_idx] + new_draw + content[brace_idx+1:]

with open('尾数分析器.html', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Done! Layout changed to vertical (rows=segments, cols=digits)")
