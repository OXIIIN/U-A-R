// 用户字段配置（弹窗表单） 
var FIELDS = [
  { key: 'status',     label: '状态',     modes: ['detail', 'edit'],        options: ['活跃', '未激活', '已封禁'] },
  { key: 'name',       label: '姓名',     modes: ['detail', 'add', 'edit'] },
  { key: 'department', label: '部门',     modes: ['detail', 'add', 'edit'], options: ['技术部', '市场部', '销售部', '产品部'] },
  { key: 'group',      label: '小组',     modes: ['detail', 'edit'],        options: [] },
  { key: 'role',       label: '角色',     modes: ['detail', 'add', 'edit'], options: ['管理员', '编辑', '用户'] },
  { key: 'year',       label: '入职年份', modes: ['detail', 'add', 'edit'], options: ['2018','2019','2020','2021','2022','2023','2024'] },
  { key: 'score',      label: '绩效分',   modes: ['detail', 'edit'] },
  { key: 'email',      label: '邮箱',     modes: ['detail', 'add', 'edit'] },
  { key: 'phone',      label: '手机号',   modes: ['detail', 'add', 'edit'] },
  { key: 'address',    label: '地址',     modes: ['detail', 'add', 'edit'] }
]

// 部门小组映射（弹窗下拉联动） 
var GROUPS = {
  '技术部': ['前端组', '后端组', '运维组'],
  '市场部': ['推广组', '调研组'],
  '销售部': ['演示组', '渠道组'],
  '产品部': ['产品组', '设计组']
}

// 分析维度  
var DIM_OPTS = [
  { label: '部门', value: 'department' }, { label: '状态', value: 'status' },
  { label: '角色', value: 'role' },       { label: '年份', value: 'year' }
]

// 维度钻取链  
var DP_MAP = {
  department: ['department', 'group', 'name'],
  status: ['status', 'department', 'group', 'name'],
  role: ['role', 'department', 'group', 'name'],
  year: ['year', 'department', 'group', 'name']
}

// 不支持维度切换的图表类型
var DNS = ['heatmap', 'wordcloud', 'sankey', 'boxplot', 'nestedpie']
// 支持指标切换的图表类型
var MYS = ['pie', 'rose', 'funnel']

// 搜索字段  
var SF = ['status', 'department', 'group', 'name', 'role', 'year', 'email', 'phone', 'address']

// 表格列配置  
var TABLECOLS = [
  { label: '部门', prop: 'department', width: 100 },
  { label: '小组', prop: 'group', width: 100 },
  { label: '角色', prop: 'role', width: 100 },
  { label: '姓名', prop: 'name', width: 100 },
  { label: '邮箱', prop: 'email' }
]

export  {
  FIELDS, GROUPS, DIM_OPTS, DP_MAP, DNS, MYS, SF, TABLECOLS
}