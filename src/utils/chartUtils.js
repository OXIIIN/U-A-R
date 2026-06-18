// 图表配色方案
var CC = ['#e94560','#4ecb71','#38bdf8','#f0c040','#ff7849','#6c5ce7','#888','#00cec9']
// 用户状态
var STS = ['活跃','未激活','已封禁']
// 图例通用配置
var LEG = {bottom:0,textStyle:{color:'#999'}}
// 按状态统计人数
function cnt(u,d,c,s){return c.map(function(x){
  return u.filter(function(u2){return u2[d]===x&&u2.status===s}).length
})}
// 平均分
function avgD(cats,users,dim){
  return cats.map(function(cat){
    var grp=users.filter(function(u){return String(u[dim])===cat})
    if(!grp.length)return{name:cat,value:0}
    var sum=grp.reduce(function(a,u){return a+Number(u.score||0)},0)
    return{name:cat,value:+(sum/grp.length).toFixed(1)}
  })
}
// 公共图表配置（适用于直角坐标系）
function stdOpt(cats,S,withLegend,trigger){// （分类轴 + 数值轴 + 图例 + 提示框）
  var o={
    tooltip:{trigger:trigger||'axis'},// 提示框，悬停显示
    grid:{left:60,right:20,bottom:40,top:20},// 绘图区域边距
    xAxis:{type:'category',data:cats,axisLabel:{color:'#999'}},
    yAxis:{type:'value',axisLabel:{color:'#999'},
    splitLine:{lineStyle:{color:'#2a2a4a'}}},// 网格线
    series:S}
  if(withLegend)o.legend=LEG// 图例
  return o
}
// ----柱状图----
function barOpt(type,cats,vals,users,dim){
  var S=[],C=['#4ecb71','#888','#e94560']
  if(type==='bar'){// 分区柱状图
    S=[{type:'bar',data:vals,itemStyle:{color:'#38bdf8'},barWidth:'40%'}]
  }
  else if(type==='stacked'||type==='multibar'){// 堆积柱状图与多系列柱状图
    S=STS.map(function(s,i){
    var r={name:s,type:'bar',data:cnt(users,dim,cats,s),itemStyle:{color:C[i]}};
    if(type==='stacked')r.stack='t';return r})// r.stack='t'，表示堆积在一起
    }
  else if(type==='contrast'){// 对比柱状图
    var avg=+(users.reduce(function(a,u){return a+Number(u.score||0)},0)/users.length).toFixed(1)
    S=[{name:'偏离均值',type:'bar',
      data:avgD(cats,users,dim).map(function(d){
        var v=+(d.value-avg).toFixed(1);
        return{name:d.name,value:v,barWidth:'40%',itemStyle:{color:v>=0?'#4ecb71':'#e94560'}}}),
      label:{show:true,position:'top',color:'#e2e2e2',formatter:function(p){return(p.value>=0?'+':'')+p.value}}}]
  }
  return stdOpt(cats,S,type!=='bar','axis')
}
function waterfallOpt(cats,vals){// 瀑布图
  var sum=vals.reduce(function(a,b){return a+b},0)
  var newcats=['合计'].concat(cats),bv=[sum].concat(vals)
  var cum=[0],rem=sum
  for(var i=1;i<bv.length;i++){rem-=bv[i];cum.push(rem)}
  return stdOpt(newcats,[
    {type:'bar',stack:'w',data:cum,itemStyle:{color:'transparent'},emphasis:{itemStyle:{color:'transparent'}}},// 透明底座
    {type:'bar',stack:'w',data:bv,itemStyle:{color:'#38bdf8'},label:{show:true,position:'inside',color:'#e2e2e2'}}
  ])
}
function comboOpt(cats,vals,users,dim){// 组合图
  var avgs=avgD(cats,users,dim).map(function(d){return d.value})
  return{
    tooltip:{trigger:'axis'},legend:LEG,grid:{left:60,right:60,bottom:40,top:40},
    xAxis:{type:'category',data:cats,axisLabel:{color:'#999'}},
    yAxis:[
      {type:'value',name:'人数',axisLabel:{color:'#999'},splitLine:{lineStyle:{color:'#2a2a4a'}}},
      {type:'value',name:'平均分',axisLabel:{color:'#999'},splitLine:{show:false}}],
      series:[
        {name:'人数',type:'bar',data:vals,itemStyle:{color:'#38bdf8'},barWidth:'40%'},
        {name:'平均分',type:'line',yAxisIndex:1,data:avgs,smooth:true,itemStyle:{color:'#e94560'},lineStyle:{color:'#e94560',width:2}}]}
}
// ----折线图----
function lineOpt(type,cats,vals,users,dim){
  var S=[]
  if(type==='line'){// 分区折线图
    S=[{type:'line',data:vals,smooth:true,lineStyle:{color:'#38bdf8'},itemStyle:{color:'#38bdf8'},areaStyle:{color:'rgba(56,189,248,0.15)'}}]
  }
  else if(type==='multiline'){// 多系列折线图
    S=STS.map(function(s,i){
    return{name:s,type:'line',smooth:true,data:cnt(users,dim,cats,s),lineStyle:{color:CC[i+1]},itemStyle:{color:CC[i+1]}}})
  }
  else if(type==='rangearea'){// 范围面积图
    var mean = vals.reduce(function(a,b){return a+b},0) / vals.length  
    var std = Math.sqrt(vals.reduce(function(a,b){return a+Math.pow(b-mean,2)},0) / vals.length) 
    var up = vals.map(function(v){return Math.round(v + std)}) 
    var lo = vals.map(function(v){return Math.max(0, Math.round(v - std))})
    var band = up.map(function(v,i){return v - lo[i]})
    S=[
      {name:'下限',type:'line',data:lo,smooth:true,lineStyle:{color:'#e2e2e2'},itemStyle:{color:'#e2e2e2'},areaStyle:{color:'#0d1b2e'},stack:'r'},
      {name:'上限',type:'line',data:band,smooth:true,lineStyle:{color:'#38bdf8'},itemStyle:{color:'#38bdf8'},areaStyle:{color:'rgba(56,189,248,0.2)'},stack:'r'},
      {name:'实际值',type:'line',data:vals,smooth:true,lineStyle:{color:'#e94560',width:2},itemStyle:{color:'#e94560'},areaStyle:{color:'rgba(233,69,96,0.1)'}}
    ]
  }
  return stdOpt(cats,S,type!=='line')
}
function radarOpt(cats,vals){// 折线雷达图
  var max=Math.max.apply(null,vals.concat([1]))
  return{
    tooltip:{},
    radar:{
      indicator:cats.map(function(c){return{name:c,max:max+1}}), shape:'polygon',
      splitArea:{areaStyle:{color:['#16213e','#1a2745']}},splitLine:{lineStyle:{color:'#2a2a4a'}},
      axisName:{color:'#999'},axisLine:{lineStyle:{color:'#2a2a4a'}}
    },
    series:[{
      type:'radar',
      data:[{value:vals,name:'人数',
        areaStyle:{color:'rgba(56,189,248,0.3)'},
        lineStyle:{color:'#38bdf8',width:1},
        itemStyle:{color:'#38bdf8',borderWidth:0}}]
      }]}
}
// 散点图
function scatterOpt(type,cats,vals,users,dim){
  var isB=type==='bubble'
  var data=isB
    ?avgD(cats,users,dim).map(function(d,i){return[i+1,vals[i],d.value,d.name]})
    :cats.map(function(c,i){return[i+1,vals[i]]})
  return{
    tooltip:{formatter:function(p){
      return isB
      ?p.data[3]+'<br/>人数: '+p.data[1]+'<br/>平均分: '+p.data[2]
      :cats[p.data[0]-1]+'<br/>人数:'+p.data[1]}},
    grid:{left:60,right:20,bottom:40,top:40},
    xAxis:{type:'value',min:0,max:cats.length+1,interval:1,
      axisLabel:{color:'#999',formatter:function(x){return cats[x-1]||''}},
      splitLine:{lineStyle:{color:'#2a2a4a'}}},
    yAxis:{type:'value',
      axisLabel:{color:'#999'},
      splitLine:{lineStyle:{color:'#2a2a4a'}}},
    series:[{type:'scatter',data:data,
      symbolSize:isB?function(p){return Math.max(p[2],20)}:20,
      itemStyle:{color:'#38bdf8',borderColor:'transparent',borderWidth:0}}]
  }
}
// ----饼图----
function pieOpt(type,cats,vals,users,dim,metric){
  var d=metric==='avg'?avgD(cats,users,dim):cats.map(function(x,i){// 人数与平均分 指标切换
    return{name:x,value:vals[i],itemStyle:{color:CC[i%CC.length]}}
  })
  var S=[]
  if(type==='pie'){// 饼图
    S=[{type:'pie',radius:['40%','70%'],data:d,label:{color:'#e2e2e2'}}]
  }
  else if(type==='rose'){// 玫瑰图
    S=[{type:'pie',radius:['20%','70%'],roseType:'area',data:d,label:{color:'#e2e2e2'}}]
  }
  else if(type==='nestedpie'){// 多层饼图
    var ds={};
    users.forEach(function(u){
      var k=String(u[dim]);
      if(!ds[k])ds[k]={};
      ds[k][u.status]=(ds[k][u.status]||0)+1
    });
      var inn=Object.keys(ds).map(function(d2){
        return{name:d2,value:Object.values(ds[d2]).reduce(function(a,b){return a+b},0)}
      }),out=[];
      Object.keys(ds).forEach(function(d2){
        Object.keys(ds[d2]).forEach(function(s){out.push({name:d2+'-'+s,value:ds[d2][s]})})
      });
      S=[{type:'pie',radius:['0%','40%'],data:inn,label:{color:'#e2e2e2'}},
      {type:'pie',radius:['50%','70%'],data:out,label:{color:'#e2e2e2'}}]
  }
  var opt={tooltip:{trigger:'item'},series:S}
  if(type!=='nestedpie'){opt.legend=LEG}
  return opt
}
// KPI指标卡
function kpiOpt(cats, vals, users, dim) {
  var data = avgD(cats, users, dim)
  var total = data.reduce(function (a, d) { return a + d.value }, 0)
  return { cards: data.map(function (d) {
    return { name: d.name, value: d.value, pct: total ? (d.value / total * 100).toFixed(1) + '%' : '-' }
  })}
}
// 热力区域图
function heatmapOpt(users,dim){
  var a1=[],a2=[],s1={},s2={}
  users.forEach(function(u){
    var r=u.role,k=String(u[dim])
    if(!s1[r]){a1.push(r);s1[r]=1}// x轴，角色
    if(!s2[k]){a2.push(k);s2[k]=1}// y轴，维度
  })
  var hd=[]
  a1.forEach(function(a,ai){
    a2.forEach(function(b,bi){
      hd.push([ai,bi,users.filter(function(u){return String(u[dim])===b&&u.role===a}).length])
    })
  })
  var hm=Math.max.apply(null,hd.map(function(x){return x[2]}).concat([1]))
  return{
    tooltip:{formatter:function(p){return a1[p.data[0]]+' / '+a2[p.data[1]]+': '+p.data[2]+'人'}},
    grid:{left:80,right:40,bottom:50,top:20},
    xAxis:{type:'category',data:a1,axisLabel:{color:'#999'}},
    yAxis:{type:'category',data:a2,axisLabel:{color:'#999'}},
    visualMap:{
      min:0,max:hm,calculable:true,orient:'horizontal',left:'center',bottom:0,
      inRange:{color:['#16213e','#38bdf8','#e94560']},textStyle:{color:'#999'}
    },
    series:[
      {type:'heatmap',data:hd,label:{show:true,color:'#e2e2e2'},itemStyle:{borderColor:'#1a1a2e',borderWidth:2}}
    ]}
}
// 矩形树图
function treemapOpt(cats, vals) {
  return {
   tooltip: {}, 
   series: [
    {
     type:'treemap',label:{ color:'#111010',fontSize: 15 },
     data: cats.map(function(c, i){return {name: c,value:vals[i] } }), 
     levels: [{itemStyle:{borderColor:'#16213e', borderWidth: 3, gapWidth: 3 }}],
     breadcrumb: { show: false }
    }
  ]}
}
// 词云图
function wordcloudOpt(users){
  var wm={}
  users.forEach(function(u){
    wm[u.name]=(wm[u.name]||0)+1;
    wm[u.department]=(wm[u.department]||0)+1;
    wm[u.role]=(wm[u.role]||0)+1})
  return{
    series:[
      {
        type:'wordCloud',shape:'circle',sizeRange:[14,60],rotationRange:[-30,30],gridSize:8,width:'90%',height:'80%',
        textStyle:{
          fontFamily:'Microsoft YaHei',fontWeight:'bold',
          color:function(){
            return'rgb('+Math.round(Math.random()*150+100)+','+Math.round(Math.random()*150+100)+','+Math.round(Math.random()*200+55)+')'
          }
        },
        data:Object.keys(wm).map(function(n){return{name:n,value:wm[n]}})
      }
    ]
  }
}
// 漏斗图
function funnelOpt(cats,vals,users,dim,metric){
  var d=metric==='avg'
  ?avgD(cats,users,dim)
  :cats.map(function(x,i){return{name:x,value:vals[i]}})
  return{
    tooltip:{trigger:'item'},
    legend:LEG,
    series:[
      {
        type:'funnel',left:'10%',top:60,bottom:60,width:'80%',sort:'descending',gap:2,data:d,
        label:{color:'#e2e2e2'},itemStyle:{borderColor:'#1a1a2e',borderWidth:2}
      }
    ]
  }
}
// 桑基图
function sankeyOpt(users){
  var ns=[],nsS={},lm={}
  users.forEach(function(u){
    if(!nsS[u.status]){ns.push(u.status);nsS[u.status]=1}
    if(!nsS[u.role]){ns.push(u.role);nsS[u.role]=1}
    if(!nsS[u.department]){ns.push(u.department);nsS[u.department]=1}
    var k1=u.status+'->'+u.role;lm[k1]=(lm[k1]||0)+1
    var k2=u.role+'->'+u.department;lm[k2]=(lm[k2]||0)+1
  })
  return{
    tooltip:{trigger:'item'},
    series:[
      {
        type:'sankey',left:'10%',right:'10%',
        data:ns.map(function(n){return{name:n}}),
        links:Object.keys(lm).map(function(k){
          var p=k.split('->');
          return{source:p[0],target:p[1],value:lm[k]}
        }),
        emphasis:{focus:'adjacency'},
        lineStyle:{color:'gradient',curveness:0.5},
        label:{color:'#e2e2e2'}
      }
    ]
  }
}
// 箱型图
function boxplotOpt(users,dim){
  var bg={},bc
  users.forEach(function(u){
    var k=String(u[dim]);
    if(!bg[k])bg[k]=[];
    bg[k].push(Number(u.score)||0)
  })// 分组并收集数据('市场部': [78, 65, 90, 82, 71, 88, 75],)
  bc=Object.keys(bg)
  var bd=bc.map(function(d){
    var a=bg[d].slice().sort(function(x,y){return x-y}),n=a.length// 分数排序
    return[
      a[0],
      a[Math.floor(n*0.25)],
      a[Math.floor(n*0.5)],
      a[Math.floor(n*0.75)],
      a[n-1]]
  })
  return stdOpt(
    bc,
    [
      {
        type:'boxplot',data:bd,
        label:{show:true,color:'#e2e2e2'},
        itemStyle:{color:'#38bdf8',borderColor:'#38bdf8'},
        emphasis:{itemStyle:{color:'#e94560',borderColor:'#e94560'}}
      }
    ],
    false,
    'item'
  )
}
// 统一分发器
function getChartOption(type, cats, vals, users, dim, metric) { 
  // 柱状图
  if (['bar','stacked','multibar','contrast'].indexOf(type)!==-1) return barOpt(type,cats,vals,users,dim)
  if (type==='waterfall') return waterfallOpt(cats,vals)
  if (type==='combo') return comboOpt(cats,vals,users,dim)
  // 折线图
  if (['line','multiline','rangearea'].indexOf(type)!==-1) return lineOpt(type,cats,vals,users,dim)
  if (type==='lineradar') return radarOpt(cats,vals)
  // 散点图
  if (['scatter','bubble'].indexOf(type)!==-1) return scatterOpt(type,cats,vals,users,dim)
  // 饼图
  if (['pie','rose','nestedpie'].indexOf(type)!==-1) return pieOpt(type,cats,vals,users,dim,metric)
  // 其他
  if (type==='kpi') return kpiOpt(cats,vals,users,dim)
  if (type==='funnel') return funnelOpt(cats,vals,users,dim,metric)
  if (type==='treemap') return treemapOpt(cats,vals)
  if (type==='heatmap') return heatmapOpt(users,dim)
  if (type==='wordcloud') return wordcloudOpt(users)
  if (type==='sankey') return sankeyOpt(users)
  if (type==='boxplot') return boxplotOpt(users,dim)
  return barOpt('bar',cats,vals,users,dim)
}
// 导出
export { getChartOption }
export const CG = [
  {
    label:'柱状图',
    children:[
      {label:'分区柱状图',value:'bar'},{label:'堆积柱状图',value:'stacked'},{label:'多系列柱状图',value:'multibar'},
      {label:'对比柱状图',value:'contrast'},{label:'瀑布图',value:'waterfall'},{label:'组合图',value:'combo'}
    ]
  },
  {
    label:'折线图',
    children:[
      {label:'分区折线图',value:'line'},{label:'多系列折线图',value:'multiline'},
      {label:'范围面积图',value:'rangearea'},{label:'折线雷达图',value:'lineradar'}
    ]
  },
  {
    label:'散点图',
    children:[{label:'散点图',value:'scatter'},{label:'聚合气泡图',value:'bubble'}]
  },
  {
    label:'饼图',
    children:[{label:'饼图',value:'pie'},{label:'多层饼图',value:'nestedpie'},{label:'玫瑰图',value:'rose'}]
  },
  {
    label:'其他',
    children:[
      {label:'KPI指标卡',value:'kpi'},{label:'漏斗图',value:'funnel'},{label:'矩形树图',value:'treemap'},{label:'热力区域图',value:'heatmap'},
      {label:'词云图',value:'wordcloud'},{label:'桑基图',value:'sankey'},{label:'箱型图',value:'boxplot'}]
    }
]
