<template>
  <div class="report-page" id="reportPage">
    <!-- 顶部栏 -->
    <div class="top-bar no-print">
      <div><h1>统计报表</h1><span>多维度数据汇总分析</span></div>
      <div>
        <el-button type="danger" plain @click="exportFile('csv')">导出 Excel</el-button>
        <el-button type="danger" plain @click="exportFile('doc')">导出 Word</el-button>
        <el-button type="danger" plain @click="exportFile('pdf')">导出 PDF</el-button>
        <el-button type="danger" plain @click="isPrint=true">打印设置</el-button>
        <el-button type="danger" plain @click="$router.push('/')">返回管理页</el-button>
      </div>
    </div>

    <!-- 封面页 -->
    <div class="cover-page" v-if="printSettings.showCover">
      <div class="cover-title">{{ printSettings.coverTitle }}</div>
      <div class="cover-subtitle">{{ printSettings.coverSubtitle }}</div>
    </div>
    
    <!-- 智能分析 -->
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
        <div class="ai-section" v-if="aiSqlRows && aiSqlRows.length">
          <div class="ai-section-title">查询结果（{{ aiSqlRows.length }} 条）</div>
          <pre class="ai-sql">{{ aiResult.sql }}</pre>
          <el-table :data="aiSqlRows" border size="mini" style="width:100%"
            :header-cell-style="{background:'#1a2745',color:'#e2e2e2',fontWeight:'bold'}">
            <el-table-column v-for="col in Object.keys(aiSqlRows[0])" :key="col"
              :prop="col" :label="col" align="center"></el-table-column>
          </el-table>
        </div>
      </div>
    </div>

    <!-- 表格区域 -->
    <div class="table-section" :class="{'edit-active': isEdit}" style="position:relative;">
      <div class="section-header no-print">
        <div class="header-left">
          <span class="ctrl-label">统计维度：</span>
          <el-checkbox-group v-model="selectedDims" size="small">
            <el-checkbox-button v-for="d in dimOptions" :key="d.value" :label="d.value">{{ d.label }}</el-checkbox-button>
          </el-checkbox-group>
        </div>
        <div class="table-tools">
          <el-button size="mini" @click="isEdit=!isEdit">{{ isEdit ? '完成编辑' : '编辑表格' }}</el-button>
          <el-button size="mini" @click="resetEdit">重置</el-button>
          <el-button size="mini" type="danger" plain @click="openHeaderSettings">设置表头</el-button>
        </div>
      </div>

      <input v-if="editingCell" ref="floatInput" class="floating-input" :style="floatStyle"
        @blur="finishEdit()" @keyup.enter="finishEdit()" />

      <el-table :data="reportRows" border style="width:100%" size="medium"
        :span-method="mergeSpan"
        :header-cell-style="{background:'#1a2745',color:'#e2e2e2',fontWeight:'bold'}">

        <el-table-column v-for="dim in selectedDims" :key="'dim_'+dim"
          :label="getLabel(dim)" min-width="100" align="center">
          <template slot="header">
            <span class="header-text" :class="{editable: isEdit}"
              @dblclick="isEdit && startEdit('dim', dim, $event)">{{ getLabel(dim) }}</span>
          </template>
          <template slot-scope="s">
            <span>{{ s.row[dim] || '未知' }}</span>
          </template>
        </el-table-column>

        <el-table-column v-for="gc in groupColumns" :key="'gc_'+gc.key"
          :prop="gc.key" :min-width="gc.key==='count'?70:100" align="center">
          <template slot="header">
            <span class="header-text" :class="{editable: isEdit}"
              @dblclick="isEdit && startEdit('group', gc.key, $event)">{{ getLabel(gc.key) }}</span>
          </template>
        </el-table-column>

        <template v-for="group in visibleHeaderGroups">
          <el-table-column :key="'grp_'+group.key" align="center">
            <template slot="header">
              <span class="header-text" :class="{editable: isEdit}"
                @dblclick="isEdit && startEdit('headerGroup', group.key, $event)">{{ getLabel(group.key) }}</span>
            </template>
            <template v-for="child in group.children">
              <el-table-column v-if="!child.children" :key="'leaf_'+group.key+'_'+child.key"
                :prop="child.key" align="center" min-width="90">
                <template slot="header">
                  <span class="header-text" :class="{editable: isEdit}"
                    @dblclick="isEdit && startEdit('leaf', child.key, $event)">{{ getLabel(child.key) }}</span>
                </template>
                <template slot-scope="s">
                  <span>{{ formatVal(s.row[child.key], child.key) }}</span>
                </template>
              </el-table-column>
              <el-table-column v-else :key="'brch_'+group.key+'_'+child.key" align="center">
                <template slot="header">
                  <span class="header-text" :class="{editable: isEdit}"
                    @dblclick="isEdit && startEdit('leaf', child.key, $event)">{{ getLabel(child.key) }}</span>
                </template>
                <el-table-column v-for="leaf in child.children" :key="'lf_'+group.key+'_'+child.key+'_'+leaf.key"
                  :prop="leaf.key" align="center" min-width="80">
                  <template slot="header">
                    <span class="header-text" :class="{editable: isEdit}"
                      @dblclick="isEdit && startEdit('leaf', leaf.key, $event)">{{ getLabel(leaf.key) }}</span>
                  </template>
                  <template slot-scope="s">
                    <span>{{ formatVal(s.row[leaf.key], leaf.key) }}</span>
                  </template>
                </el-table-column>
              </el-table-column>
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

    <!-- 设置表头弹窗 -->
    <el-dialog title="设置表头" :visible.sync="headerSettingsVisible" width="460px">
      <div v-for="group in allHeaderGroups" :key="'cfg_'+group.key" style="margin-bottom:14px;">
        <el-checkbox v-model="headerGroupChecked[group.key]">
          {{ group.label }}
          <span style="color:#999;font-size:12px;margin-left:8px;">
            ({{ group.children.map(function(c){ return c.label }).join('、') }})
          </span>
        </el-checkbox>
      </div>
      <span slot="footer">
        <el-button type="danger" @click="applyHeaderSettings">确定</el-button>
        <el-button @click="headerSettingsVisible=false">关闭</el-button>
      </span>
    </el-dialog>

    <!-- 打印设置弹窗 -->
    <el-dialog title="打印设置" :visible.sync="isPrint" width="520px">
      <div class="ps-item"><div class="popup-label">页边距</div>
        <el-radio-group v-model="printSettings.margin">
          <el-radio label="narrow">窄 (10mm)</el-radio>
          <el-radio label="normal">正常 (15mm)</el-radio>
          <el-radio label="wide">宽 (20mm)</el-radio>
        </el-radio-group>
      </div>
      <div class="ps-item"><div class="popup-label">纸张大小</div>
        <el-radio-group v-model="printSettings.paperSize">
          <el-radio v-for="p in ['A4','A3','Letter','B5']" :key="p" :label="p">{{ p }}</el-radio>
        </el-radio-group>
      </div>
      <div class="ps-item"><div class="popup-label">打印方向</div>
        <el-radio-group v-model="printSettings.orientation">
          <el-radio label="portrait">纵向</el-radio>
          <el-radio label="landscape">横向</el-radio>
        </el-radio-group>
      </div>
      <!-- [V3] 封面/封底合并为 v-for 循环 -->
      <div class="ps-item" v-for="c in covers" :key="c.label"
        style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="popup-label" style="margin-bottom:0;">{{ c.label }}</div>
          <el-switch v-model="printSettings[c.show]"></el-switch>
        </div>
        <template v-if="printSettings[c.show]">
          <el-input v-model="printSettings[c.title]" :placeholder="c.label+'标题'" style="width:160px;"></el-input>
          <el-input v-model="printSettings[c.subtitle]" placeholder="副标题" style="width:160px;"></el-input>
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
import { exportCSV, exportWord, exportPDF } from '../utils/exportUtils'
import { getChartOption } from '../utils/chartUtils'
import { MARGIN_MAP, DIM_OPTIONS, MET_LABELS, GROUP_COLUMNS, HEADER_GROUPS, DEFAULT_GROUPS, buildHeaderTree } from '../utils/reportUtils'
import * as echarts from 'echarts'

// [V1] 一次性构建扁平标签查找表
var _labelFlat = {}
DIM_OPTIONS.forEach(function (d) { _labelFlat[d.value] = d.label })
GROUP_COLUMNS.forEach(function (c) { _labelFlat[c.key] = c.label })
HEADER_GROUPS.forEach(function (g) {
  _labelFlat[g.key] = g.label
  g.children.forEach(function (c) {
    _labelFlat[c.key] = c.label
    if (c.children) {
      c.children.forEach(function (k) { _labelFlat[k.key] = k.label })
    }
  })
})

export default {
  name: 'ReportPage',
  data: function () {
    return {
      aiQuestion: '', aiLoading: false, aiResult: null, aiChart: null, aiSqlRows: null,
      users: [],
      reportRows: [],
      dimOptions: DIM_OPTIONS,
      selectedDims: ['company'],
      groupColumns: GROUP_COLUMNS,
      allHeaderGroups: HEADER_GROUPS,
      selectedHeaderGroups: DEFAULT_GROUPS.slice(),
      // [V4] reduce 一行初始化
      headerGroupChecked: HEADER_GROUPS.reduce(function (o, g) {
        o[g.key] = DEFAULT_GROUPS.indexOf(g.key) !== -1; return o
      }, {}),
      headerSettingsVisible: false,
      // [V3] 封面/封底配置数据
      covers: [
        { show: 'showCover', title: 'coverTitle', subtitle: 'coverSubtitle', label: '封面' },
        { show: 'showBackCover', title: 'backCoverTitle', subtitle: 'backCoverSubtitle', label: '封底' }
      ],
      isEdit: false, editingCell: null, floatStyle: {},
      cusLabels: {},
      isPrint: false,
      printSettings: {
        paperSize: 'A4', orientation: 'landscape', margin: 'narrow',
        showCover: true, coverTitle: '', coverSubtitle: '',
        showBackCover: true, backCoverTitle: '', backCoverSubtitle: ''
      }
    }
  },

  computed: {
    visibleHeaderGroups: function () {
      return buildHeaderTree(this.selectedHeaderGroups)
    }
  },

  watch: {
    selectedDims: function (val) {
      if (!val.length) { this.selectedDims = ['company']; return }
      this.loadReportData()
    },
    selectedHeaderGroups: function () {
      this.loadReportData()
    }
  },

  mounted: function () {
    this.loadUsers()
    this.loadReportData()
  },

  beforeDestroy: function () {
    if (this.aiChart) { this.aiChart.dispose(); this.aiChart = null }
  },

  methods: {
    loadUsers: function () {
      var self = this
      fetch('http://localhost:3001/api/users')
        .then(function (res) { return res.json() })
        .then(function (json) { if (json.success) { self.users = json.data } })
        .catch(function (e) { self.$message.error('用户数据加载失败：' + e.message) })
    },

    loadReportData: function () {// 获取报表数据
      var self = this
      fetch('http://localhost:3001/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dims: self.selectedDims, selectedGroups: self.selectedHeaderGroups })
      })
        .then(function (res) { return res.json() })
        .then(function (json) {
          if (json.success) { self.reportRows = json.data || [] }
          else { self.$message.error(json.error || '报表数据加载失败') }
        })
        .catch(function (e) { self.$message.error('请求失败：' + e.message) })
    },

    // [V2] askAI 改为 async/await，消除嵌套 .then
    askAI: async function () {
      if (!this.aiQuestion.trim()) return
      var self = this
      self.aiLoading = true; self.aiResult = null; self.aiSqlRows = null
      try {
        var res1 = await fetch('http://localhost:3001/api/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: self.aiQuestion })
        })
        var json = await res1.json()
        self.aiLoading = false
        if (!json.success) { self.$message.error(json.error); return }
        self.aiResult = json.data
        if (!json.data || !json.data.sql) return

        var res2 = await fetch('http://localhost:3001/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql: json.data.sql })
        })
        var qRes = await res2.json()
        if (!qRes.success) { self.$message.error('SQL执行失败：' + qRes.error); return }
        self.aiSqlRows = qRes.data
        var chartData = self.dataFromSQL(qRes.data)
        if (chartData.categories.length) {
          var chart = {
            type: json.data.chart_type || 'bar',
            title: json.data.title || '统计结果',
            categories: chartData.categories,
            series: [{ name: MET_LABELS[chartData.metric] || chartData.metric, data: chartData.values }],
            dimension: chartData.dimension,
            metric: chartData.metric
          }
          self.$nextTick(function () { self.renderAIChart(chart) })
        }
      } catch (e) {
        self.aiLoading = false
        self.$message.error('请求失败：' + e.message)
      }
    },

    dataFromSQL: function (rows) {
      if (!rows || !rows.length) return { categories: [], values: [], dimension: '', metric: '' }
      var keys = Object.keys(rows[0])
      var catKey = keys[0], valKey = keys[1]
      return {
        categories: rows.map(function (r) { return String(r[catKey] || '未知') }),
        values: rows.map(function (r) { return r[valKey] != null ? r[valKey] : 0 }),
        dimension: catKey, metric: valKey
      }
    },

    renderAIChart: function (chart) {
      var el = document.getElementById('aiChart')
      if (!el || !chart || !chart.categories || !chart.series) return
      if (this.aiChart) this.aiChart.dispose()
      this.aiChart = echarts.init(el)
      this.aiChart.setOption(getChartOption(
        chart.type, chart.categories, chart.series[0].data,
        this.users, chart.dimension, chart.metric
      ), true)
    },

    mergeSpan: function (param) {
      if (param.columnIndex !== 0) return
      if (!this.selectedDims.length || !this.reportRows.length) return
      var firstDim = this.selectedDims[0], rows = this.reportRows
      var val = rows[param.rowIndex][firstDim]
      if (param.rowIndex > 0 && rows[param.rowIndex - 1][firstDim] === val) {
        return { rowspan: 0, colspan: 0 }
      }
      var count = 1
      for (var i = param.rowIndex + 1; i < rows.length; i++) {
        if (rows[i][firstDim] === val) count++; else break
      }
      return { rowspan: count, colspan: 1 }
    },

    // [V1] 扁平查找表 O(1)，替代三层 for 循环
    getLabel: function (key) {
      return this.cusLabels[key] || _labelFlat[key] || key
    },

    formatVal: function (val, key) {
      if (val == null || val === '') return '-'
      if (key === 'pass_rate') return val + '%'
      return String(val)
    },

    startEdit: function (type, key, event) {
      if (!this.isEdit) return
      if (this.editingCell) this.finishEdit()
      this.editingCell = { type: type, key: key }
      this._editBuf = this.getLabel(key)
      var target = event.target.closest('.cell') || event.target
      var cRect = this.$el.querySelector('.table-section').getBoundingClientRect()
      var rect = target.getBoundingClientRect()
      this.floatStyle = {
        position: 'absolute', zIndex: 100,
        left: (rect.left - cRect.left) + 'px',
        top: (rect.top - cRect.top) + 'px',
        width: Math.max(rect.width, 100) + 'px',
        height: Math.max(rect.height, 30) + 'px'
      }
      var self = this
      this.$nextTick(function () {
        if (self.$refs.floatInput) {
          self.$refs.floatInput.value = self._editBuf
          self.$refs.floatInput.focus()
          self.$refs.floatInput.select()
        }
      })
    },

    finishEdit: function () {
      if (!this.editingCell) return
      var val = this.$refs.floatInput.value.trim()
      var key = this.editingCell.key
      if (val && val !== this.getLabel(key)) {
        this.$set(this.cusLabels, key, val)
      }
      this.editingCell = null; this.floatStyle = {}
    },

    resetEdit: function () {
      this.cusLabels = {}
      this.isEdit = false; this.editingCell = null; this.floatStyle = {}
    },

    // [V5] reduce 一行完成
    openHeaderSettings: function () {
      var sel = this.selectedHeaderGroups
      this.headerGroupChecked = HEADER_GROUPS.reduce(function (o, g) {
        o[g.key] = sel.indexOf(g.key) !== -1; return o
      }, {})
      this.headerSettingsVisible = true
    },

    applyHeaderSettings: function () {
      var selected = []
      var checked = this.headerGroupChecked
      Object.keys(checked).forEach(function (k) {
        if (checked[k]) selected.push(k)
      })
      if (!selected.length) { this.$message.warning('请至少选择一个列组'); return }
      this.selectedHeaderGroups = selected
      this.headerSettingsVisible = false
    },

    getTableData: function () {
      var self = this
      var headers = [], props = []
      self.selectedDims.forEach(function (dim) {
        headers.push(self.getLabel(dim)); props.push(dim)
      })
      GROUP_COLUMNS.forEach(function (gc) {
        headers.push(self.getLabel(gc.key)); props.push(gc.key)
      })
      self.visibleHeaderGroups.forEach(function (group) {
        group.children.forEach(function (child) {
          if (!child.children) {
            headers.push(self.getLabel(group.key) + '-' + self.getLabel(child.key))
            props.push(child.key)
          } else {
            child.children.forEach(function (leaf) {
              headers.push(self.getLabel(child.key) + '-' + self.getLabel(leaf.key))
              props.push(leaf.key)
            })
          }
        })
      })
      return {
        headers: headers,
        rows: self.reportRows.map(function (r) {
          return props.map(function (p) { return r[p] == null ? '-' : String(r[p]) })
        })
      }
    },

    exportFile: function (format) {
      var data = this.getTableData()
      var name = '统计报表_' + new Date().toLocaleDateString()
      if (format === 'pdf') {
        exportPDF(this.$el, name + '.pdf', this.printSettings.paperSize, this.printSettings.orientation)
      } else if (format === 'csv') {
        exportCSV(data.headers, data.rows, name + '.csv')
      } else {
        exportWord(data.headers, data.rows, name + '.doc', '统计报表')
      }
    },

    doPrint: function () {
      var ps = this.printSettings, margin = MARGIN_MAP[ps.margin] || '15mm'
      var style = document.createElement('style')
      style.id = 'print-dynamic-style'
      style.textContent = '@page{size:' + ps.paperSize + ' ' + ps.orientation + ';margin:' + margin + '}'
      document.head.appendChild(style)
      window.onafterprint = function () {
        var el = document.getElementById('print-dynamic-style')
        if (el) el.remove()
        window.onafterprint = null
      }
      this.$nextTick(function () { window.print() })
    }
  }
}
</script>

<style scoped>
.report-page { width: 1500px; zoom: 0.8; margin: 30px auto; background: #16213e; border-radius: 12px; padding: 30px; }
.top-bar { display: flex; justify-content: space-between; align-items: center; padding-bottom: 16px; border-bottom: 1px solid #2a2a4a; margin-bottom: 24px; }
.top-bar h1 { color: #e2e2e2; font-size: 24px; margin: 0; }
.top-bar span { color: #999; font-size: 13px; }
.cover-page { display: none; }
.cover-title { font-size: 36px; font-weight: bold; color: #333; margin-bottom: 20px; }
.cover-subtitle { font-size: 18px; color: #666; margin-bottom: 40px; }
.ai-panel { background: #0f3460; border-radius: 10px; padding: 20px; margin-bottom: 20px; }
.ai-header { color: #e2e2e2; font-size: 16px; font-weight: bold; margin-bottom: 12px; }
.ai-input-row { display: flex; gap: 10px; margin-bottom: 16px; }
.ai-result { border-top: 1px solid #2a2a4a; padding-top: 16px; }
.ai-section { margin-bottom: 16px; }
.ai-section-title { color: #38bdf8; font-size: 14px; margin-bottom: 8px; }
.ai-sql { background: #0d1117; color: #4ecb71; padding: 12px 16px; border-radius: 6px; font-family: 'DM Mono', monospace; font-size: 12px; overflow-x: auto; white-space: pre-wrap; }
.table-section { background: #0f3460; padding: 20px; border-radius: 10px; margin-bottom: 20px; overflow-x: auto; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.header-left { display: flex; align-items: center; gap: 10px; }
.ctrl-label { color: #d1d1d1; font-size: 12px; white-space: nowrap; }
.table-tools { display: flex; gap: 5px; }
.header-text { cursor: default; }
.header-text.editable { cursor: pointer; border-bottom: 1px dashed #38bdf8; padding: 2px 4px; }
.floating-input { background: #16213e; border: 1px solid #e94560; border-radius: 3px; color: #e2e2e2; padding: 4px 8px; font-size: 12px; text-align: center; outline: none; box-sizing: border-box; }
.edit-active .el-table th .cell > span,
.edit-active .el-table th .cell > div > span { cursor: pointer; }
.popup-label { color: #888; font-size: 14px; margin-bottom: 8px; }
.ps-item { margin-bottom: 16px; }
@media print {
  .no-print { display: none !important; }
  .report-page { width: 100%; max-width: 100%; margin: 0; padding: 0; background: #fff; border-radius: 0; overflow-x: hidden; }
  .table-section { page-break-inside: avoid; page-break-after: always; background: #fff; padding: 10px; }
  .cover-page { display: block; text-align: center; page-break-after: always; padding: 200px 20px 20px 20px; }
}
</style>

<style>
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