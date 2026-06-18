<template>
  <div class="report-page" id="reportPage">
    <!-- 顶部栏 -->
    <div class="top-bar no-print">
      <div><h1>统计报表</h1><span>多维度数据汇总分析</span></div>
      <div>
        <el-button type="danger" plain @click="exportFile('csv')">导出 Excel</el-button>
        <el-button type="danger" plain @click="exportFile('doc')">导出 Word</el-button>
        <el-button type="danger" plain @click="exportPDF">导出 PDF</el-button>
        <el-button type="danger" plain @click="isPrint=true">打印设置</el-button>
        <el-button type="danger" plain @click="$router.push('/')">返回管理页</el-button>
      </div>
    </div>
    <!-- 控制栏 -->
    <div class="control-bar no-print">
      <div class="control-row">
        <div class="control-item">
          <span class="ctrl-label">主维度：</span>
          <el-checkbox-group v-model="selectedDims" size="small">
            <el-checkbox-button v-for="d in dimOptions" :key="d.value" :label="d.value">{{ d.label }}</el-checkbox-button>
          </el-checkbox-group>
        </div>
        <div class="control-item">
          <span class="ctrl-label">副维度：</span>
          <el-radio-group v-model="selectedSubDim" size="small">
            <el-radio-button label="">无</el-radio-button>
            <el-radio-button v-for="d in dimOptions" :key="d.value" :label="d.value"
              :disabled="selectedDims.indexOf(d.value)!==-1">{{ d.label }}
            </el-radio-button>
          </el-radio-group>
        </div>
        <div class="control-item">
          <span class="ctrl-label">指标项：</span>
          <el-checkbox-group v-model="selectedMets" size="small">
            <el-checkbox-button v-for="opt in metOptions" :key="opt.value" :label="opt.value">{{ opt.label }}</el-checkbox-button>
          </el-checkbox-group>
        </div>
      </div>
    </div>
    <!-- 封面页 -->
    <div class="cover-page" v-if="printSettings.showCover">
      <div class="cover-title">{{ printSettings.coverTitle }}</div>
      <div class="cover-subtitle">{{ printSettings.coverSubtitle }}</div>
    </div>
    <!-- 表格区域 -->
    <div class="table-section" :class="{ 'edit-active': isEdit }" style="position:relative;">
      <!-- 编辑按钮 -->
      <div class="section-header">
        <div class="table-tools no-print">
          <el-button size="mini" @click="isEdit=!isEdit">{{ isEdit ? '完成编辑' : '编辑表格' }}</el-button>
          <el-button size="mini" @click="resetEdit">重置</el-button>
        </div>
      </div>
      <!-- 编辑输入框 -->
      <input v-if="editingCell" ref="floatInput" class="floating-input" :style="floatStyle"
             @blur="finishEdit()" @keyup.enter="finishEdit()"  />
      <!-- 表格数据 -->
      <el-table :data="dataRows" border style="width:100%" size="medium"
        :span-method="isMergeRows ? mergeSpan : undefined"
        :header-cell-style="{background:'#1a2745',color:'#e2e2e2',fontWeight:'bold'}">
        <!-- 表旁（维度）合并模式 —— 维度列 -->
        <el-table-column v-if="isMergeRows" prop="_dim" label="维度" min-width="100" align="center">
          <template slot-scope="s">
            <span class="header-text" :class="{ editable: isEdit }"
              @dblclick="isEdit && startEdit('dim', s.row._dim, $event)">{{ getLabel('dim', s.row._dim) }}
            </span>
          </template>
        </el-table-column>
        <!-- 分组列 -->
        <el-table-column prop="_p" :label="colName" min-width="120" align="center">
          <template slot="header">
            <span class="header-text" :class="{ editable: isEdit }"
              @dblclick="isEdit && startEdit('colHeader', '_group', $event)">{{ colName }}
            </span>
          </template>
          <template slot-scope="s">
            <span class="header-text" :class="{ editable: isEdit }"
              @dblclick="isEdit && startEdit('row', s.row._p, $event)">{{ getLabel('row', s.row._p) }}
            </span>
          </template>
        </el-table-column>
        <!-- 副维度模式 —— 指标列 -->
        <template v-if="isSubDim">
          <el-table-column v-for="mt in selectedMets" :key="'s'+mt" align="center">
            <template slot="header">
              <span class="header-text" :class="{ editable: isEdit }"
                @dblclick="isEdit && startEdit('metric', mt, $event)">{{ getLabel('met', mt) }}
              </span>
            </template>
            <el-table-column v-for="sv in subDimValues" :key="mt+'_'+sv" :prop="'_v_'+mt+'_'+sv" :min-width="80" align="center">
              <template slot="header">
                <span class="header-text" :class="{ editable: isEdit }"
                  @dblclick="isEdit && startEdit('subdim', sv, $event)">{{ getLabel('subdim', sv) }}
                </span>
              </template>
            </el-table-column>
          </el-table-column>
        </template>
        <!-- 表头（指标）合并模式 —— 指标列 -->
        <template v-else>
          <el-table-column v-for="mt in selectedMets" :key="mt" :prop="'_v_'+mt" :min-width="80" align="center">
            <template slot="header">
              <span class="header-text" :class="{ editable: isEdit }"
                @dblclick="isEdit && startEdit('col', '_v_'+mt, $event)">{{ getLabel('col', '_v_'+mt) }}
              </span>
            </template>
          </el-table-column>
        </template>
      </el-table>
    </div>
    <!-- 封底 -->
    <div class="cover-page" v-if="printSettings.showBackCover">
      <div class="cover-title">{{ printSettings.backCoverTitle }}</div>
      <div class="cover-subtitle">{{ printSettings.backCoverSubtitle }}</div>
    </div>
    <!-- 智能分析（ai）-->
    <div class="ai-panel no-print">
      <div class="ai-header">智能分析</div>
      <div class="ai-input-row">
        <el-input v-model="aiQuestion" placeholder="输入问题："
          @keyup.enter.native="askAI" clearable style="flex:1;"></el-input>
        <el-button type="danger" :loading="aiLoading" @click="askAI">分析</el-button>
      </div>
      <div v-if="aiResult" class="ai-result">
        <div class="ai-section">
          <div class="ai-section-title">{{ aiResult.title }}</div>
          <div id="aiChart" style="width:100%;height:300px;"></div>
        </div>
        <div class="ai-section">
          <div class="ai-section-title">SQL结果</div>
          <pre class="ai-sql">{{ aiResult.sql }}</pre>
        </div>
      </div>
    </div>
    <!-- 打印设置弹窗 -->
    <el-dialog title="打印设置" :visible.sync="isPrint" width="520px">
      <div class="ps-item"><div class="popup-label">页边距</div>
        <el-radio-group v-model="printSettings.margin">
          <el-radio label="narrow">窄 (10mm)</el-radio><el-radio label="normal">正常 (15mm)</el-radio><el-radio label="wide">宽 (20mm)</el-radio>
        </el-radio-group>
      </div>
      <div class="ps-item"><div class="popup-label">纸张大小</div>
        <el-radio-group v-model="printSettings.paperSize">
          <el-radio v-for="p in ['A4','A3','Letter','B5']" :key="p" :label="p">{{ p }}</el-radio>
        </el-radio-group>
      </div>
      <div class="ps-item"><div class="popup-label">打印方向</div>
        <el-radio-group v-model="printSettings.orientation">
          <el-radio label="portrait">纵向</el-radio><el-radio label="landscape">横向</el-radio>
        </el-radio-group>
      </div>
      <div class="ps-item" style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="popup-label" style="margin-bottom:0;">封面</div>
          <el-switch v-model="printSettings.showCover"></el-switch>
        </div>
        <template v-if="printSettings.showCover">
          <el-input v-model="printSettings.coverTitle" placeholder="封面标题：" style="width:160px;"></el-input>
          <el-input v-model="printSettings.coverSubtitle" placeholder="副标题：" style="width:160px;"></el-input>
        </template>
      </div>
      <div class="ps-item" style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="popup-label" style="margin-bottom:0;">封底</div>
          <el-switch v-model="printSettings.showBackCover"></el-switch>
        </div>
        <template v-if="printSettings.showBackCover">
          <el-input v-model="printSettings.backCoverTitle" placeholder="封底标题：" style="width:160px;"></el-input>
          <el-input v-model="printSettings.backCoverSubtitle" placeholder="副标题：" style="width:160px;"></el-input>
        </template>
      </div>
      <span slot="footer">
        <el-button type="danger" @click="doPrint">打印</el-button>
        <el-button @click="isPrint=false">关闭</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { USERS } from '../data/initialData'
import { toCSV, downloadFile} from '../utils/exportUtils'
import { getChartOption } from '../utils/chartUtils'
import { MARGIN_MAP, DIM_OPTIONS, MET_OPTIONS, DIM_LABELS, MET_LABELS, groupBy, calcMetric, fillData } from '../utils/reportUtils'
import * as echarts from 'echarts'

export default {
  name: 'ReportPage',
  data: function () {
    return {
      // AI 分析
      aiQuestion: '',aiLoading: false,aiResult: null,aiChart: null,
      // 数据源
      users: [], dimOptions: DIM_OPTIONS, metOptions: MET_OPTIONS,
      // 控制栏状态
      selectedDims: ['department'], selectedSubDim: '', selectedMets: ['count', 'avg'],
      // 编辑模式
      isEdit: false, editingCell: null, floatStyle: {},
      cusLabels: {dim: {}, colHeader: null, row: {},col: {}, met: {}, subdim: {}},
      // 打印
      isPrint: false, printSettings: {
       paperSize: 'A4', orientation: 'landscape', margin: 'narrow',
       showCover: true, coverTitle: '数据统计报表', coverSubtitle: '',
       showBackCover: true, backCoverTitle: '封底', backCoverSubtitle: '' 
      }
    }
  },

  computed: {
    isMergeRows: function () {// 是否合并表旁（多维度）
      return this.selectedDims.length > 1 
    },
    isSubDim:   function () {// 是否启用副维度
      return this.selectedSubDim !== '' 
    },
    colName: function () {// 显示分组列名称
      return this.cusLabels.colHeader  || (this.isMergeRows ? '分组' : DIM_LABELS[this.selectedDims[0]])
    },
    subDimValues: function () { // 获取副维度取值 如 ['管理员', '编辑', '用户']；副维度模式时，标识会拼接为类似{prop:_v_count_用户}
      if (!this.selectedSubDim) return []
      var dim = this.selectedSubDim, seen = {}
      this.users.forEach(function (u) { seen[String(u[dim] || '未知')] = true })
      return Object.keys(seen)
    },
    dataRows: function () {// 生成表格数据行
      var self = this, rows = []
      var cfg = {
        isSubDim: self.isSubDim, selectedSubDim: self.selectedSubDim, subDimValues: self.subDimValues,
        selectedMets: self.selectedMets
      }
      ;(self.isMergeRows ? self.selectedDims : [self.selectedDims[0]]).forEach(function (dim) {// 主维度 如部门，角色
        var groups = groupBy(self.users, dim)
        Object.keys(groups).forEach(function (k) {// 分组 如 技术部，产品部
          var row = self.isMergeRows ? { _dim: dim, _p: k } : { _p: k }
          fillData(row, groups[k], cfg)
          rows.push(row)// 单行数据，如 技术部行的所有数据
        })
      })
      return rows
    }
  },

  watch: {
    selectedDims: function (val) {
      if (!val.length) this.selectedDims = ['department']
      if (val.indexOf(this.selectedSubDim) !== -1) this.selectedSubDim = ''
    },
    selectedMets: function (val) {
      if (!val.length) this.selectedMets = ['count'] 
    }
  },

  created: function () {// 初始化编辑缓冲区
   this._editBuf = '' 
  },
  mounted: function () {// 从 localStorage 读取用户数据
   this.loadFromLocal() 
  },
  beforeDestroy: function () {// 销毁实例，释放内存
    if (this.aiChart) {
      this.aiChart.dispose(); this.aiChart = null  
    } 
  },

  methods: {
    loadFromLocal: function () {// 数据持久化
      var data = localStorage.getItem('userList')
      this.users = data ? JSON.parse(data) : USERS.slice()
    },
    // ----AI分析----
    aiChartData: function (dimension, metric, filter) {// 获取图表数据（参数来自后端）
      var users = this.users
      if (filter && filter.length) {
        filter.forEach(function (f) {
          if (f.field && f.value) {
            users = users.filter(function (u) {
              return String(u[f.field] || '') === f.value
            })
          }
       })
      }
      var groups = groupBy(users, dimension)
      var cats = Object.keys(groups)
      var values = cats.map(function (k) { return calcMetric(groups[k], metric) })
      return { categories: cats, values: values }
    },   
    askAI: function () {// 发起AI请求
      if (!this.aiQuestion.trim()) return
      var self = this
      self.aiLoading = true
      self.aiResult = null
      // 发送请求到后端
      fetch('http://localhost:3001/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: self.aiQuestion })
      })
      // 解析相应，处理结果
      .then(function (res) { return res.json() })
      .then(function (json) {
        self.aiLoading = false// 关闭加载动画
        if (!json.success) { self.$message.error(json.error); return }// 提示错误信息
        self.aiResult = json.data
        if (json.data && json.data.dimension && json.data.metric) {
          var chartData = self.aiChartData(json.data.dimension, json.data.metric, json.data.filter)
          var chart = {
            type: json.data.chart_type || 'bar',
            title: json.data.title || '统计结果',
            categories: chartData.categories,
            series: [{ name: MET_LABELS[json.data.metric] || json.data.metric, data: chartData.values }]
          }
          self.$nextTick(function () { self.renderAIChart(chart) })
        }
      })
      .catch(function (e) {// 请求失败处理
        self.aiLoading = false
        self.$message.error('请求失败：' + e.message)
      })
    },
    renderAIChart: function (chart) {// 生成图表
      var el = document.getElementById('aiChart')
      if (!el || !chart || !chart.categories || !chart.series) return
      if (this.aiChart) this.aiChart.dispose()
      this.aiChart = echarts.init(el)// 创建新的 ECharts 实例
      var option = getChartOption(
        chart.type, chart.categories, chart.series[0].data,
        this.users, this.aiResult.dimension, this.aiResult.metric
      )
      this.aiChart.setOption(option, true)// 渲染图表
    },
    // ----表格----
    mergeSpan: function (param) {// 合并单元格
      if (param.columnIndex !== 0) return
      var rows = this.dataRows, dim = rows[param.rowIndex]._dim
      if (param.rowIndex > 0 && rows[param.rowIndex - 1]._dim === dim) 
      return { rowspan: 0, colspan: 0 }// 若维度相同则被上方单元格合并
      var count = 1
      for (var i = param.rowIndex + 1; i < rows.length; i++) {
         if (rows[i]._dim === dim) count++; 
         else break 
        }
      return { rowspan: count, colspan: 1 }
    },   
    getLabel: function (type, key) {// 获取编辑后的内容
      switch (type) {
        case 'dim':    return this.cusLabels.dim[key] || DIM_LABELS[key] 
        case 'row':    return this.cusLabels.row[key] || key
        case 'col':    return this.cusLabels.col[key] || MET_LABELS[key.replace('_v_', '')] 
        case 'met':    return this.cusLabels.met[key] || MET_LABELS[key] 
        case 'subdim': return this.cusLabels.subdim[key] || key
        case 'colHeader': return this.cusLabels.colHeader || (this.isMergeRows ? '分组' : DIM_LABELS[this.selectedDims[0]] )
        default: return key
      }
    },
    startEdit: function (type, key, event) {// 开始编辑
      if (!this.isEdit) return
      if (this.editingCell) this.finishEdit()// 如果正在编辑其他单元格，先完成当前编辑
      this.editingCell = { type: type, key: key }// 记录当前内容数据 如{ type: 'dim', key: 'department' }
      this._editBuf = this.getLabel(type, key)// 保存原始内容
      var target = event.target.closest('.cell') || event.target// 获取被双击的DOM元素，计算输入框位置
      var cRect = this.$el.querySelector('.table-section').getBoundingClientRect()
      var rect = target.getBoundingClientRect()
      this.floatStyle = { position: 'absolute', zIndex: 100,
        left: (rect.left - cRect.left) + 'px', top: (rect.top - cRect.top) + 'px',
        width: Math.max(rect.width, 100) + 'px', height: Math.max(rect.height, 30) + 'px' }
      var self = this
      this.$nextTick(function () {
        if (self.$refs.floatInput) {
          self.$refs.floatInput.value = self._editBuf;// 填入原始内容到输入框
          self.$refs.floatInput.focus(); self.$refs.floatInput.select() }
      })
    },
    finishEdit: function () {// 完成编辑
      if (!this.editingCell) return
      var val = this.$refs.floatInput.value.trim()// 输入的编辑内容
      var type = this.editingCell.type, key = this.editingCell.key
      if (val && val !== this.getLabel(type, key)) {// 保存编辑内容
        if (type === 'colHeader') { this.cusLabels.colHeader = val }
        else { this.$set(this.cusLabels[type], key, val) }// cusLabels[type]改变后相应的getLabel改变进而更新模板
      }
      this.editingCell = null; this.floatStyle = {}
    },
    resetEdit: function () {// 重置编辑
      this.cusLabels = {
       dim: {},colHeader: null, row: {}, col: {}, met: {}, subdim: {} 
      }
      this.isEdit = false; this.editingCell = null; this.floatStyle = {}
    },
    // ----导出与打印----
    exportData: function (format) {// 导出文件的数据
      var self = this, cols = []
      if (self.isMergeRows) 
      cols.push({ prop: '_dim', label: '维度' })
      cols.push({ prop: '_p', label: self.isMergeRows ? '分组' : self.colName })
      self.selectedMets.forEach(function (mt) {
        if (self.isSubDim) { self.subDimValues.forEach(function (sv) {
         cols.push({
          prop: '_v_' + mt + '_' + sv,
          label: MET_LABELS[mt] + '-' + sv }) 
        })}
        else {
         cols.push({
          prop: '_v_' + mt, 
          label: MET_LABELS[mt]
        })}
      })
      var headers = cols.map(function (c) { return c.label })
      var rows = self.dataRows.map(function (r) {
        return cols.map(function (c) {
          return r[c.prop] == null ? '' : String(r[c.prop]) 
        }) 
      })
      // csv格式
      if (format === 'csv') return toCSV(headers, rows)
      // html格式（导出.doc文件时，word直接打开html）
      var h = '<html><head><meta charset="utf-8"><style>'
      h += 'table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:8px;text-align:center}'
      h += 'th{background:#f0f0f0;font-weight:bold}</style></head><body><h2 style="text-align:center">统计报表</h2>'
      h += '<table><tr>' + headers.map(function (t) { return '<th>' + t + '</th>' }).join('') + '</tr>'
      rows.forEach(function (r) {
        h += '<tr>' + r.map(function (v) { return '<td>' + v + '</td>' }).join('') + '</tr>' 
      })
      return h + '</table></body></html>'
    },
    exportPDF: function () { window.print() },
    exportFile: function (format) {// 文件下载
      var mime = format === 'csv' ? 'text/csv;charset=utf-8;' : 'application/msword;charset=utf-8;'// MIME 类型，告诉浏览器文件的内容类型
      var ext = format === 'csv' ? '.csv' : '.doc'// 文件扩展名
     downloadFile(this.exportData(format), '统计报表_' + new Date().toLocaleDateString() + ext, mime)
    },
    doPrint: function () {// 执行打印
      var ps = this.printSettings, margin = MARGIN_MAP[ps.margin] || '15mm'
      var style = document.createElement('style')
      style.id = 'print-dynamic-style'
      style.textContent = '@page{size:' + ps.paperSize + ' ' + ps.orientation + ';margin:' + margin + '}'// 注入 @page 规则。@page 是 CSS 的页面规则，控制打印时的页面属性
      document.head.appendChild(style)
      window.onafterprint = function () {
        var el = document.getElementById('print-dynamic-style');
        if (el) el.remove(); 
        window.onafterprint = null 
      }
      this.$nextTick(function () { window.print() })
    },  
  }
}
</script>

<style scoped>
/* 页面整体 */
.report-page { width: 1100px; margin: 30px auto; background: #16213e; border-radius: 12px; padding: 30px; }
/* 顶部栏 */
.top-bar { display: flex; justify-content: space-between; align-items: center; padding-bottom: 16px; border-bottom: 1px solid #2a2a4a; margin-bottom: 24px; }
.top-bar h1 { color: #e2e2e2; font-size: 24px; margin: 0; }
.top-bar span { color: #999; font-size: 13px; }
/* 控制栏 */
.control-bar { display: flex; flex-direction: column; margin-bottom: 20px; padding: 8px 20px; background: #0f3460; border-radius: 8px; }
.control-row { display: flex; align-items: center; flex-wrap: wrap; padding: 10px 0; gap: 12px 28px; }
.control-item { display: flex; align-items: center; gap: 10px; color: #d1d1d1; font-size: 12px; white-space: nowrap; margin-bottom: 10px; }
.ctrl-label { min-width: 5px; text-align: right; }
/* 封面 */
.cover-page { display: none; }
.cover-title { font-size: 36px; font-weight: bold; color: #333; margin-bottom: 20px; }
.cover-subtitle { font-size: 18px; color: #666; margin-bottom: 40px; }
/* 智能分析 */
.ai-panel { background: #0f3460; border-radius: 10px; padding: 20px; margin-bottom: 20px; }
.ai-header { color: #e2e2e2; font-size: 16px; font-weight: bold; margin-bottom: 12px; }
.ai-input-row { display: flex; gap: 10px; margin-bottom: 16px; }
.ai-result { border-top: 1px solid #2a2a4a; padding-top: 16px; }
.ai-section { margin-bottom: 16px; }
.ai-section-title { color: #38bdf8; font-size: 14px; margin-bottom: 8px; }
.ai-sql { background: #0d1117; color: #4ecb71; padding: 12px 16px; border-radius: 6px; font-family: 'DM Mono', monospace; font-size: 12px; overflow-x: auto; white-space: pre-wrap; }
/* 表格 */
.table-section { background: #0f3460; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
.section-header { display: flex; justify-content: flex-end; margin-bottom: 10px; }
.table-tools { display: flex; gap: 5px; }
.header-text { cursor: default; }
.header-text.editable { cursor: pointer; border-bottom: 1px dashed #38bdf8; padding: 2px 4px; }
.floating-input { background: #16213e; border: 1px solid #e94560; border-radius: 3px; color: #e2e2e2; padding: 4px 8px; font-size: 12px; text-align: center; outline: none; box-sizing: border-box; }
.edit-active .el-table th .cell > span,
.edit-active .el-table th .cell > div > span { cursor: pointer; }
/* 弹窗 */
.popup-label { color: #888; font-size: 14px; margin-bottom: 8px; }
.ps-item { margin-bottom: 16px; }
/* 打印 */
@media print {
  .no-print { display: none !important; }
  .report-page { width: 100%; max-width: 100%; margin: 0; padding: 0; background: #fff; border-radius: 0; overflow-x: hidden; }
  .table-section { page-break-inside: avoid; page-break-after: always; background: #fff; padding: 10px; }
  .cover-page { display: block; text-align: center; page-break-after: always; padding: 200px 20px 20px 20px; }
}
</style>

<style>
/* 打印表格 */
@media print {
  .el-table th { background: #f5f5f5 !important; color: #333 !important; }
  .el-table td { color: #333 !important; background: #fff !important; }
  .el-table td, .el-table th { border-color: #ccc !important; word-break: break-all; font-size: 11px; padding: 4px 6px; }
  .el-table--border { border: 1px solid #ccc !important; }
  .el-table__gutter { display: none !important; }
  .el-table__body-wrapper { height: auto !important; }
  .el-dialog__wrapper, .v-modal { display: none !important; }
}
</style>

