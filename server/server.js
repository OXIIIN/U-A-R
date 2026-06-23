// ----导入依赖----
const cors = require('cors')
const fetch = require('node-fetch')
const dbModule = require('./db')// 导入数据库模块
const express = require('express')
const app = express()
app.use(cors())
app.use(express.json())// // 注册 JSON 解析中间件，自动把请求体中的 JSON 字符串转为 JS 对象

const API_KEY = process.env.DASHSCOPE_API_KEY
console.log('API Key:', API_KEY ?
     '已读取（前5位：' + API_KEY.slice(0, 5) + '）' : '未读取到')

// ----提示词----
const SCHEMA = `数据表 users，字段如下：
id(整数,主键),status(状态，取值：活跃/未激活/已封禁),department(部门), "group"(小组), name(姓名), role(角色，取值：管理员/编辑/用户),
year(入职年份，取值：2018-2024),score(绩效分数，0-100之间的整数), email(邮箱), phone(电话), address(地址)

示例部门：技术部(含前端组/后端组/运维组)、市场部(含推广组/调研组)、销售部(含演示组/渠道组)、产品部(含产品组/设计组)`

const SYSTEM_PROMPT = `你是一个数据分析助手。用户会用自然语言提问数据相关问题。

请根据问题生成 SQLite 语法的 SQL 查询语句。

返回格式必须严格为以下 JSON，不要包含任何其他文字、代码块标记或解释：
{
  "sql": "SELECT ... FROM users WHERE ... GROUP BY ...",
  "chart_type": "bar",
  "title": "图表标题"
}

chart_type 只能是：bar, line, pie, radar, scatter

SQL 规则：
1. "group" 是保留字，所有引用 group 字段的地方必须写成 "group"（双引号包裹）
   例如 SELECT "group", COUNT(*) ... GROUP BY "group"
2. 统计列必须使用以下固定别名（as 关键字）：
   - 统计人数：COUNT(*) as count
   - 平均分：ROUND(AVG(score), 1) as avg
   - 最高分：MAX(score) as max
   - 最低分：MIN(score) as min
3. 查询结果的第一列必须是分组维度（用于图表分类轴），第二列必须是统计结果（用于图表数值轴）
4. 不要使用 SUM 函数，本项目没有求和场景

数据表结构：
${SCHEMA}`

// ----AI 分析-----
app.post('/api/ask', async (req, res) => {
  const question = req.body.question
  if (!question || !question.trim()) {// 空输入防御
    return res.json({ success: false, error: '请输入问题' })
  }
  try {// 调用大模型API
    const resp = await fetch(// await 是"等待异步操作完成"。大模型需要几秒钟思考，await 让代码停在这里等结果回来，再执行下一行
      'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-v4-flash',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: question }
          ],
          temperature: 0.2
        })
      }
    )
    const data = await resp.json()// 解析大模型响应
    console.log('API 响应：', JSON.stringify(data, null, 2))
    // 错误检查
    if (data.error) {
      return res.json({ success: false, error: data.error.message || JSON.stringify(data.error) })
    }
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return res.json({ success: false, error: 'API返回格式异常：' + JSON.stringify(data) })
    }
    // 处理数据
    const content = data.choices[0].message.content// 提取
    console.log('大模型原始返回：', content)
    const jsonStr = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()// 清理markdown标记
    const result = JSON.parse(jsonStr)

    res.json({ success: true, data: result })
  }
  catch (e) {
    res.json({ success: false, error: e.message })
  }
})
// 执行SQL
app.post('/api/query', (req, res) => {
  try {
    const sql = req.body.sql
    if (!sql || !sql.trim().toUpperCase().startsWith('SELECT')) {
      return res.json({ success: false, error: '只允许查询操作' })
    }
    res.json({ success: true, data: dbModule.queryAll(sql) })// 执行sql
  } catch (e) {
    res.json({ success: false, error: e.message })
  }
})
// 查询用户列表（支持搜索）
app.get('/api/users', (req, res) => {
  const search = req.query.search || ''
  let users
  if (search) {
    const fields = ['name', 'department', '"group"', 'role', 'status', 'year', 'email', 'phone', 'address']
    const sql = 'SELECT * FROM users WHERE ' + fields.map(f => f + ' LIKE ?').join(' OR ')
    const params = fields.map(() => '%' + search + '%')
    users = dbModule.queryAll(sql + ' ORDER BY id DESC', params)// 返回搜索过滤后的数据
  } else {
    users = dbModule.queryAll('SELECT * FROM users ORDER BY id DESC')// 返回所有用户数据（按 id 降序，最新的排最前
  }
  res.json({ success: true, data: users })
})
// 新增用户
app.post('/api/users', (req, res) => {
    const u = req.body;
    const result = dbModule.run(
        'INSERT INTO users (status, department, "group", name, role, year, score, email, phone, address) VALUES (?,?,?,?,?,?,?,?,?,?)',
        ['未激活', u.department, u.group, u.name, u.role || '用户', u.year || '2024', 0, u.email, u.phone || '未填写', u.address || '未填写']
    );
    if (result.changes === 0) {
        return res.json({ success: false, error: '新增失败' });
    }
    res.json({ success: true, id: result.lastInsertRowid });
});
// 编辑用户
app.put('/api/users/:id', (req, res) => {
  const u = req.body
  dbModule.run(
    'UPDATE users SET status=?, department=?, "group"=?, name=?, role=?, year=?, score=?, email=?, phone=?, address=? WHERE id=?',
    [u.status, u.department, u.group, u.name, u.role, u.year, u.score, u.email, u.phone, u.address, Number(req.params.id)]
  )
  res.json({ success: true })
})

// 删除用户
app.delete('/api/users/:id', (req, res) => {
  dbModule.run('DELETE FROM users WHERE id=?', [Number(req.params.id)])// 删除指定id用户
  res.json({ success: true })
})

// 批量删除
app.post('/api/users/batch-delete', (req, res) => {
  const ids = req.body.ids
  ids.forEach(id => { dbModule.run('DELETE FROM users WHERE id=?', [id]) })// 逐个删除指定id的用户
  res.json({ success: true })
})

// 批量修改状态（可拓展为批量编辑）
// app.post('/api/users/batch-status', (req, res) => {
//   const ids = req.body.ids
//   const status = req.body.status
//   ids.forEach(id => { dbModule.run('UPDATE users SET status=? WHERE id=?', [status, id]) })// 逐个修改指定id用户的状态
//   res.json({ success: true })
// })

// ----启动服务器（改为先初始化数据库再启动）----
dbModule.initDB(() => {
  app.listen(3001, function () {
    console.log('AI 分析服务已启动，端口 3001')
  })
})