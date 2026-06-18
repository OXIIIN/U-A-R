// 打印边距
var MARGIN_MAP = { narrow: '10mm', normal: '15mm', wide: '20mm' }
// 维度选项
var DIM_OPTIONS = [
  { label: '部门', value: 'department' }, { label: '角色', value: 'role' },
  { label: '入职年份', value: 'year' },   { label: '状态', value: 'status' }
]
// 统计选项
var MET_OPTIONS = [
  { label: '人数', value: 'count' },   { label: '平均分', value: 'avg' },
  { label: '最高分', value: 'max' },   { label: '最低分', value: 'min' }
]
// 存放映射如{role：角色}，便于在代码中快速查找
var DIM_LABELS = {}, MET_LABELS = {}
DIM_OPTIONS.forEach(function (d) { DIM_LABELS[d.value] = d.label })
MET_OPTIONS.forEach(function (d) { MET_LABELS[d.value] = d.label })

function groupBy(users, dim) {// 获取分组数据
  var g = {}
  users.forEach(function (u) {
     var d = String(u[dim] || '未知'); 
     if (!g[d]) g[d] = [];
     g[d].push(u) 
    })
  return g
}

function calcMetric(group, metric) {// 获取指标数据
  if (metric === 'count') return group.length
  if (!group.length) return '-'
  var scores = group.map(function (u) { return Number(u.score) || 0 })
  var sum = scores.reduce(function (a, b) { return a + b }, 0)
  if (metric === 'avg') return +(sum / scores.length).toFixed(1)// 平均分
  return metric === 'max' 
    ? Math.max.apply(null, scores)// 最高分
    : Math.min.apply(null, scores)// 最低分
}

function fillData(row, group, cfg) {// 填入指标数据
  cfg.selectedMets.forEach(function (mt) {
    if (cfg.isSubDim) {
      var sub = groupBy(group, cfg.selectedSubDim)
      cfg.subDimValues.forEach(function (sv) {
         row['_v_' + mt + '_' + sv] = calcMetric(sub[sv] || [], mt) 
        })
    } 
    else {
      row['_v_' + mt] = calcMetric(group, mt)
    }
  })// row如{ _p: '技术部',_v_count_管理员: 2,  _v_count_编辑: 2,  _v_count_用户: 2,}
}

export  {
  MARGIN_MAP, DIM_OPTIONS, MET_OPTIONS, DIM_LABELS, MET_LABELS,
  groupBy, calcMetric, fillData
}