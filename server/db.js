// ----导入依赖----
const initSqlJs = require('sql.js')// 导入 sql.js（纯 JS 实现的 SQLite，无需编译）
const fs = require('fs')// 导入文件系统模块，用于读写数据库文件

let db// 数据库实例
const dbPath = './data.db'// 数据库文件路径

// ----初始化数据库----
function initDB(callback) {
  initSqlJs().then(SQL => {
    if (fs.existsSync(dbPath)) {// data.db文件已存在
      const dbData = fs.readFileSync(dbPath)// 读取文件的二进制内容
      db = new SQL.Database(dbData)// 采用已有数据创建数据库实例
    } else {// data.db文件不存在
      db = new SQL.Database()// 创建一个空的数据库实例
    }

    // 若不存在，则创建一个表（无数据）
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        status TEXT DEFAULT '未激活',
        department TEXT,
        "group" TEXT,
        name TEXT,
        role TEXT DEFAULT '用户',
        year TEXT DEFAULT '2024',
        score INTEGER DEFAULT 0,
        email TEXT,
        phone TEXT DEFAULT '未填写',
        address TEXT DEFAULT '未填写'
      )
    `)

    // 表为空时插入初始数据（20个用户）
    const result = db.exec('SELECT COUNT(*) as c FROM users')// 格式为[{ columns: ['c'], values: [[20]] }]
    const count = result[0].values[0][0]
    if (count === 0) {
      const stmt = db.prepare(
        'INSERT INTO users (id, status, department, "group", name, role, year, score, email, phone, address) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
      )
      const initialUsers = [
        [1, '活跃', '技术部', '前端组', '张伟', '管理员', '2019', 92, 'zhangwei@company.cn', '138-0001-0001', '北京市海淀区中关村大街1号'],
        [2, '活跃', '技术部', '前端组', '陈天', '用户', '2021', 78, 'chenhao@company.cn', '135-0005-0005', '杭州市西湖区文三路478号'],
        [3, '未激活', '技术部', '前端组', '刘洋', '用户', '2023', 0, 'liuyang@company.cn', '139-0008-0008', '成都市武侯区科华北路88号'],
        [4, '已封禁', '技术部', '后端组', '张土', '用户', '2022', 63, 'zhangtu@company.cn', '138-0001-0002', '北京市海淀区中关村大街2号'],
        [5, '活跃', '技术部', '后端组', '孙磊', '编辑', '2020', 88, 'sunlei@company.cn', '136-0009-0009', '武汉市洪山区光谷大道1号'],
        [6, '活跃', '技术部', '运维组', '周杰', '用户', '2021', 75, 'zhoujie@company.cn', '133-0007-0007', '南京市鼓楼区中山北路200号'],
        [7, '活跃', '市场部', '推广组', '李娜', '编辑', '2020', 90, 'lina@company.cn', '139-0002-0002', '上海市浦东新区陆家嘴环路1000号'],
        [8, '未激活', '市场部', '推广组', '赵敏', '编辑', '2022', 0, 'zhaomin@company.cn', '136-0004-0004', '深圳市南山区科技园南路'],
        [9, '活跃', '市场部', '推广组', '吴芳', '用户', '2024', 68, 'wufang@company.cn', '158-0010-0010', '重庆市渝中区解放碑步行街'],
        [10, '活跃', '市场部', '调研组', '郑涛', '用户', '2019', 83, 'zhengtao@company.cn', '177-0011-0011', '西安市雁塔区高新路66号'],
        [11, '已封禁', '市场部', '调研组', '黄丽', '用户', '2023', 65, 'huangli@company.cn', '155-0012-0012', '长沙市岳麓区麓山路36号'],
        [12, '活跃', '销售部', '演示组', '王强', '用户', '2018', 91, 'wangqiang@company.cn', '137-0003-0003', '广州市天河区珠江新城华夏路'],
        [13, '活跃', '销售部', '演示组', '杨帆', '编辑', '2020', 86, 'yangfan@company.cn', '186-0013-0013', '苏州市工业园区星湖街328号'],
        [14, '未激活', '销售部', '渠道组', '林峰', '用户', '2022', 0, 'linfeng@company.cn', '132-0014-0014', '青岛市市南区香港中路76号'],
        [15, '活跃', '销售部', '渠道组', '何雪', '用户', '2021', 82, 'hexue@company.cn', '150-0015-0015', '大连市中山区人民路88号'],
        [16, '活跃', '产品部', '产品组', '马超', '管理员', '2019', 95, 'machao@company.cn', '188-0016-0016', '深圳市福田区深南大道6001号'],
        [17, '活跃', '产品部', '产品组', '宋佳', '编辑', '2020', 89, 'songjia@company.cn', '131-0017-0017', '天津市和平区南京路189号'],
        [18, '已封禁', '产品部', '设计组', '唐明', '用户', '2021', 61, 'tangming@company.cn', '176-0018-0018', '郑州市金水区花园路114号'],
        [19, '活跃', '产品部', '设计组', '许晨', '用户', '2022', 87, 'xuchen@company.cn', '182-0019-0019', '济南市历下区泉城路180号'],
        [20, '活跃', '产品部', '设计组', '高洁', '用户', '2023', 76, 'gaojie@company.cn', '159-0020-0020', '昆明市五华区翠湖南路2号']
        ]
      initialUsers.forEach(u => { stmt.run(u) })// 将数组中的值替换 stmt 的 ? 占位符并执行
      stmt.free()// 释放 prepared statement
      console.log('已插入 ' + initialUsers.length + ' 条初始数据')
    }

    saveDB()// 保存到文件
    callback()// 数据库就绪后执行回调（启动服务器）
  })
}

// ----保存数据库到文件----
function saveDB() {
  const data = db.export()// 导出为 Uint8Array
  const dbData = Buffer.from(data)// 转为 Node.js dbData
  fs.writeFileSync(dbPath, dbData)// 写入文件
}

// ----查询（返回对象数组）----
function queryAll(sql, params) {
  const stmt = db.prepare(sql)
  if (params) 
  stmt.bind(params.map(function (p) {// 
    return p === undefined ? null : p 
  }))
  const rows = []
  while (stmt.step()) { rows.push(stmt.getAsObject()) }// getAsObject() — 把当前行数据转为 { id: 1, name: '张伟', department: '技术部', ... } 这样的对象。
  stmt.free()
  return rows
}

// ----执行（INSERT/UPDATE/DELETE）----
function run(sql, params) {
    // 执行 SQL
    db.run(sql, params && params.map(p => p == null ? null : p));
    const changes = db.getRowsModified();// 获取受影响行数（DELETE/UPDATE 会用到）
    const lastInsertRowid = /^\s*INSERT/i.test(sql)// 获取最后插入的 rowid（仅 INSERT 有效）
        ? db.exec('SELECT last_insert_rowid()')[0].values[0][0]
        : null;
    saveDB();
    return { lastInsertRowid, changes };
}

module.exports = { initDB, queryAll, run }