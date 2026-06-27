// ---- 打印边距 ----
var MARGIN_MAP = { narrow: '10mm', normal: '15mm', wide: '20mm' }

// ---- 维度选项 ----
var DIM_OPTIONS = [
  { label: '年度', value: 'year' },
  { label: '单位', value: 'company' },
  { label: '项目', value: 'project' }
]

// ---- 固定基础信息列 ----
var GROUP_COLUMNS = [
  { key: 'department', label: '部门' },
  { key: 'grp',        label: '小组' },
  { key: 'role',       label: '角色' },
  { key: 'count',      label: '人数' }
]

// ---- 列组配置（三层表头树） ----
var HEADER_GROUPS = [
  {
    key: 'scoreStats', label: '绩效分统计',
    children: [
      { key: 'score_avg', label: '平均分' },
      { key: 'score_min', label: '最低分' },
      { key: 'score_max', label: '最高分' }
    ]
  },
  {
    key: 'attStats', label: '考勤分统计',
    children: [
      { key: 'att_avg', label: '平均分' },
      { key: 'att_min', label: '最低分' },
      { key: 'att_max', label: '最高分' }
    ]
  },
  {
    key: 'quarterly', label: '季度分布',
    children: [
      { key: 'Q1', label: 'Q1', children: [{ key: 'q1_score', label: '绩效均分' }, { key: 'q1_att', label: '考勤均分' }] },
      { key: 'Q2', label: 'Q2', children: [{ key: 'q2_score', label: '绩效均分' }, { key: 'q2_att', label: '考勤均分' }] },
      { key: 'Q3', label: 'Q3', children: [{ key: 'q3_score', label: '绩效均分' }, { key: 'q3_att', label: '考勤均分' }] },
      { key: 'Q4', label: 'Q4', children: [{ key: 'q4_score', label: '绩效均分' }, { key: 'q4_att', label: '考勤均分' }] }
    ]
  },
  {
    key: 'passRate', label: '绩效合格率',
    children: [{ key: 'pass_rate', label: '合格率(%)' }]
  }
]

var DEFAULT_GROUPS = ['scoreStats', 'attStats']

// ---- SQL 列表达式映射 ----
// [R2] quarterly 数组直接内联，省去外部 forEach + push
var GROUP_SQL = {
  scoreStats: [
    'ROUND(AVG(score),1) as score_avg',
    'MIN(score) as score_min',
    'MAX(score) as score_max'
  ],
  attStats: [
    'ROUND(AVG(attendance),1) as att_avg',
    'MIN(attendance) as att_min',
    'MAX(attendance) as att_max'
  ],
  quarterly: [
    "ROUND(AVG(CASE WHEN quarter='Q1' THEN score END),1) as q1_score",
    "ROUND(AVG(CASE WHEN quarter='Q1' THEN attendance END),1) as q1_att",
    "ROUND(AVG(CASE WHEN quarter='Q2' THEN score END),1) as q2_score",
    "ROUND(AVG(CASE WHEN quarter='Q2' THEN attendance END),1) as q2_att",
    "ROUND(AVG(CASE WHEN quarter='Q3' THEN score END),1) as q3_score",
    "ROUND(AVG(CASE WHEN quarter='Q3' THEN attendance END),1) as q3_att",
    "ROUND(AVG(CASE WHEN quarter='Q4' THEN score END),1) as q4_score",
    "ROUND(AVG(CASE WHEN quarter='Q4' THEN attendance END),1) as q4_att"
  ],
  passRate: [
    "ROUND(100.0*SUM(CASE WHEN score>=60 AND score>0 THEN 1 ELSE 0 END)/COUNT(*),1) as pass_rate"
  ]
}

var MET_LABELS = {
  count: '人数', avg: '平均分', max: '最高分', min: '最低分',
  avg_attendance: '平均考勤分', score: '绩效分', attendance: '考勤分'
}

// ---- 工具函数 ----

function buildHeaderTree(selectedKeys) {
  return HEADER_GROUPS.filter(function (g) {
    return selectedKeys.indexOf(g.key) !== -1
  })
}

// [R3] 提取 dimCols 共用，消除 select/groupBy 各自重复 push
function buildReportSQL(dims, selectedGroups) {
  if (!dims || !dims.length) return null

  var dimCols = dims.map(function (dim) {
    return dim === 'group' ? '"group"' : dim
  })

  var groupByParts = dimCols.concat(['department', '"group"', 'role'])
  var selectParts = dimCols.concat(['department', '"group" as grp', 'role'])
  selectParts.push('COUNT(*) as count')

  selectedGroups.forEach(function (gk) {
    if (GROUP_SQL[gk]) {
      GROUP_SQL[gk].forEach(function (expr) { selectParts.push(expr) })
    }
  })

  var orderParts = dims.map(function (dim) {
    if (dim === 'company') {
      return "CASE company WHEN '总部' THEN 1 WHEN '上海分部' THEN 2 WHEN '广州分部' THEN 3 ELSE 4 END"
    }
    return dim === 'group' ? '"group"' : dim
  }).concat(['department', '"group"', 'role'])

  return 'SELECT ' + selectParts.join(', ') +
    ' FROM users' +
    ' GROUP BY ' + groupByParts.join(', ') +
    ' ORDER BY ' + orderParts.join(', ')
}

// [R5] 移除 getMergeMethod（前端未引用的死代码）

// CommonJS 导出（前端 webpack + 后端 Node.js 均可引用）
module.exports = {
  MARGIN_MAP, DIM_OPTIONS, MET_LABELS,
  GROUP_COLUMNS, HEADER_GROUPS, DEFAULT_GROUPS, GROUP_SQL,
  buildHeaderTree, buildReportSQL
}