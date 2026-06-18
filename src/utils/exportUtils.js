// CSV 字段转义（RFC 4180）
function escCSV(val) {
  var v = String(val == null ? '' : val)
  if (v.indexOf(',') !== -1 || v.indexOf('"') !== -1 || v.indexOf('\n') !== -1) {
    return '"' + v.replace(/"/g, '""') + '"'
  }
  return v
}

// 生成 CSV 字符串
function toCSV(headers, rows) {
  var csv = '\uFEFF' + headers.join(',') + '\n'
  rows.forEach(function (row) {
    csv += row.map(escCSV).join(',') + '\n'
  })
  return csv
}

// 触发下载
function downloadFile(content, fileName, mime) {
  var a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([content], { type: mime }))
  a.download = fileName
  a.click()
  URL.revokeObjectURL(a.href)
}

// 一步完成：CSV 生成 + 下载
function exportCSV(headers, rows, fileName) {
  downloadFile(toCSV(headers, rows), fileName, 'text/csv;charset=utf-8;')
}

export  { escCSV, toCSV, downloadFile, exportCSV }