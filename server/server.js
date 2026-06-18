// ----导入依赖----
const express = require('express')// 导入 express，创建 Web 服务器
const cors = require('cors')// 导入 cors，解决前端(localhost:8080)访问后端(localhost:3001)的跨域问题
const fetch = require('node-fetch')// 导入 fetch，在 Node.js 中向大模型 API 发送 HTTP 请求
const app = express()// 创建 express 应用实例
app.use(cors())// 注册 cors 中间件，允许所有来源的跨域请求
app.use(express.json())// 注册 JSON 解析中间件，自动把请求体中的 JSON 字符串转为 JS 对象

const API_KEY = process.env.DASHSCOPE_API_KEY// API环境变量
console.log('API Key:', API_KEY ?
     '已读取（前5位：' + API_KEY.slice(0, 5) + '）' : '未读取到')

// ----提示词----
// 数据表结构描述
const SCHEMA = `数据表 users，字段如下：
id(整数,主键),status(状态，取值：活跃/未激活/已封禁),department(部门), group(小组), name(姓名), role(角色，取值：管理员/编辑/用户),
year(入职年份，取值：2018-2024),score(绩效分数，0-100之间的整数), email(邮箱), phone(电话), address(地址)

示例部门：技术部(含前端组/后端组/运维组)、市场部(含推广组/调研组)、销售部(含演示组/渠道组)、产品部(含产品组/设计组)`
// 系统提示词
const SYSTEM_PROMPT = `你是一个数据分析助手。用户会用自然语言提问数据相关问题。

请根据问题生成 SQLite 语法的 SQL 查询语句，并判断分组维度和统计指标。

返回格式必须严格为以下 JSON，不要包含任何其他文字、代码块标记或解释：
{
  "sql": "SELECT ... FROM users WHERE ... GROUP BY ...",
  "chart_type": "bar",
  "title": "图表标题",
  "dimension": "department",
  "metric": "count",
  "filter": [{"field": "department", "value": "技术部"}, {"field": "year", "value": "2024"}]
}

chart_type 只能是：bar, line, pie, radar, scatter
dimension 只能是：department, group, name, role, year, status
metric 只能是：count, avg, max, min

重要：用户说"部门"时 dimension 填 department，说"小组"时 dimension 填 group。

filter 规则：
- filter 是数组格式，可以包含多个筛选条件
- 如果问题中有筛选条件，按自然语言的逻辑顺序填入（先出现的条件在前）
- 例如"技术部2024年入职的" → [{"field":"department","value":"技术部"},{"field":"year","value":"2024"}]
- 如果没有筛选条件，填空数组 []

数据表结构：
${SCHEMA}`

// ----API 路由-----
app.post('/api/ask', async (req, res) => {// 接收前端的自然语言问题，调用大模型，返回结果
  const question = req.body.question// 从请求体中取出用户的问题
  if (!question || !question.trim()) {// 空输入防御
    return res.json({ success: false, error: '请输入问题' })
  }
  try {
    const resp = await fetch(// 向大模型 API 发送请求
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
          temperature: 0.2  // 低温度，输出更稳定、格式更一致
        })
      }
    )
    const data = await resp.json()// 解析大模型响应
    console.log('API 响应：', JSON.stringify(data, null, 2))

    if (data.error) {// 检查是否错误
      return res.json({ success: false, error: data.error.message || JSON.stringify(data.error) })
    }
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {// 检查 choices 是否存在
      return res.json({ success: false, error: 'API返回格式异常：' + JSON.stringify(data) })
    }

    const content = data.choices[0].message.content// 取出大模型生成的文本
    console.log('大模型原始返回：', content)
    const jsonStr = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()// 清楚markdown代码块标记
    const result = JSON.parse(jsonStr)// 解析 JSON 字符串为 JavaScript 对象

    res.json({ success: true, data: result })// 向前端返回成功响应
  } 
  catch (e) {// 捕获所有错误
    res.json({ success: false, error: e.message })
  }
})

// ----启动服务器----
app.listen(3001, function () {
  console.log('AI 分析服务已启动，端口 3001')
})

