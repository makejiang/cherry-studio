import store from '@renderer/store'
import { Assistant, MCPTool } from '@renderer/types'

export const SYSTEM_PROMPT = `在这个环境中，你可以使用一系列工具来回答用户的问题。\
除了最后一条消息外，每条消息你可以使用一个工具，并在用户的回复中收到该工具使用的结果。\
首先，你需要将用户的需求分解为一个或多个步骤，\
然后你可以逐步使用工具来生成内容以完成给定的任务，每次工具使用都基于前一次工具使用的结果。\
另外，请在你的最后一条消息中展示生成的内容。

## 工具使用格式

工具使用采用XML风格的标签格式。工具名称用开始和结束标签包围，参数同样用自己的标签集包围。结构如下：

<tool_use>
  <name>{工具名称}</name>
  <arguments>{json参数}</arguments>
</tool_use>

工具名称应该是你正在使用的工具的确切名称，参数应该是一个包含该工具所需参数的**JSON对象**。例如：

<tool_use>
  <name>python_interpreter</name>
  <arguments>{"code": "5 + 3 + 1294.678"}</arguments>
</tool_use>

用户会以工具使用的结果回复，格式应该如下：

<tool_use_result>
  <name>{工具名称}</name>
  <result>{结果}</result>
</tool_use_result>

结果应该是一个字符串，可以表示文件或任何其他输出类型。你可以将此结果用作下一个动作的输入。
例如，如果工具使用的结果是一个图像文件，你可以在下一个动作中这样使用它：

<tool_use>
  <name>image_transformer</name>
  <arguments>{"image": "image_1.jpg"}</arguments>
</tool_use>

始终严格遵守此格式进行工具使用，以确保正确的解析和执行。

## 工具使用示例
{{ TOOL_USE_EXAMPLES }}

## 可用工具
上面的示例使用的是可能不存在的概念工具。你只能访问下面<tools>...</tools>中的这些工具：
{{ AVAILABLE_TOOLS }}

## 工具使用规则
以下是你在解决任务时应始终遵循的规则：
1. 始终为工具使用正确的参数。永远不要使用变量名作为动作参数，而要使用实际值。
2. 仅在需要时调用工具：如果不需要信息，不要调用搜索代理，尝试自己解决任务。
3. 如果不需要调用工具，直接回答问题。
4. 对于工具使用，确保使用上面示例中显示的XML标签格式。不要使用任何其他格式。
5. 如果在调用工具时遇到失败，请检查并调整参数后重试。
6. 任何操作都不需要用户确认。

# 用户指令
{{ USER_SYSTEM_PROMPT }}

现在开始！如果你正确解决了任务，你将获得$1,000,000的奖励。
`

export const ToolUseExamples = `
以下是一些使用概念工具的示例：
---
用户：生成文档中最年长的人的图像。

助手：我可以使用document_qa工具来找出文档中最年长的人是谁。
<tool_use>
  <name>document_qa</name>
  <arguments>{"document": "document.pdf", "question": "文档中提到的最年长的人是谁？"}</arguments>
</tool_use>

用户：<tool_use_result>
  <name>document_qa</name>
  <result>约翰·多伊，一个55岁的伐木工人，住在纽芬兰。</result>
</tool_use_result>

助手：我可以使用image_generator工具来创建约翰·多伊的肖像。
<tool_use>
  <name>image_generator</name>
  <arguments>{"prompt": "约翰·多伊的肖像，一个55岁的男人，住在加拿大。"}</arguments>
</tool_use>

用户：<tool_use_result>
  <name>image_generator</name>
  <result>image.png</result>
</tool_use_result>

助手：图像已生成为image.png

---
用户："以下运算的结果是什么：5 + 3 + 1294.678？"

助手：我可以使用python_interpreter工具来计算运算的结果。
<tool_use>
  <name>python_interpreter</name>
  <arguments>{"code": "5 + 3 + 1294.678"}</arguments>
</tool_use>

用户：<tool_use_result>
  <name>python_interpreter</name>
  <result>1302.678</result>
</tool_use_result>

助手：运算的结果是1302.678。

---
用户："广州和上海哪个城市人口更多？"

助手：我可以使用搜索工具来查找广州的人口。
<tool_use>
  <name>search</name>
  <arguments>{"query": "广州人口"}</arguments>
</tool_use>

用户：<tool_use_result>
  <name>search</name>
  <result>截至2021年，广州有1500万居民。</result>
</tool_use_result>

助手：我可以使用搜索工具来查找上海的人口。
<tool_use>
  <name>search</name>
  <arguments>{"query": "上海人口"}</arguments>
</tool_use>

用户：<tool_use_result>
  <name>search</name>
  <result>2600万（2019年）</result>
</tool_use_result>
助手：上海的人口是2600万，而广州的人口是1500万。因此，上海的人口更多。
`

export const AvailableTools = (tools: MCPTool[]) => {
  const availableTools = tools
    .map((tool) => {
      return `
<tool>
  <name>${tool.id}</name>
  <description>${tool.description}</description>
  <arguments>
    ${tool.inputSchema ? JSON.stringify(tool.inputSchema) : ''}
  </arguments>
</tool>
`
    })
    .join('\n')
  return `<tools>
${availableTools}
</tools>`
}

export const buildSystemPrompt = async (
  userSystemPrompt: string,
  tools?: MCPTool[],
  assistant?: Assistant
): Promise<string> => {
  if (typeof userSystemPrompt === 'string') {
    const now = new Date()
    if (userSystemPrompt.includes('{{date}}')) {
      const date = now.toLocaleDateString()
      userSystemPrompt = userSystemPrompt.replace(/{{date}}/g, date)
    }

    if (userSystemPrompt.includes('{{time}}')) {
      const time = now.toLocaleTimeString()
      userSystemPrompt = userSystemPrompt.replace(/{{time}}/g, time)
    }

    if (userSystemPrompt.includes('{{datetime}}')) {
      const datetime = now.toLocaleString()
      userSystemPrompt = userSystemPrompt.replace(/{{datetime}}/g, datetime)
    }

    if (userSystemPrompt.includes('{{system}}')) {
      try {
        const systemType = await window.api.system.getDeviceType()
        userSystemPrompt = userSystemPrompt.replace(/{{system}}/g, systemType)
      } catch (error) {
        console.error('Failed to get system type:', error)
        userSystemPrompt = userSystemPrompt.replace(/{{system}}/g, 'Unknown System')
      }
    }

    if (userSystemPrompt.includes('{{language}}')) {
      try {
        const language = store.getState().settings.language
        userSystemPrompt = userSystemPrompt.replace(/{{language}}/g, language)
      } catch (error) {
        console.error('Failed to get language:', error)
        userSystemPrompt = userSystemPrompt.replace(/{{language}}/g, 'Unknown System Language')
      }
    }

    if (userSystemPrompt.includes('{{arch}}')) {
      try {
        const appInfo = await window.api.getAppInfo()
        userSystemPrompt = userSystemPrompt.replace(/{{arch}}/g, appInfo.arch)
      } catch (error) {
        console.error('Failed to get architecture:', error)
        userSystemPrompt = userSystemPrompt.replace(/{{arch}}/g, 'Unknown Architecture')
      }
    }

    if (userSystemPrompt.includes('{{model_name}}')) {
      try {
        userSystemPrompt = userSystemPrompt.replace(/{{model_name}}/g, assistant?.model?.name || 'Unknown Model')
      } catch (error) {
        console.error('Failed to get model name:', error)
        userSystemPrompt = userSystemPrompt.replace(/{{model_name}}/g, 'Unknown Model')
      }
    }

    if (userSystemPrompt.includes('{{username}}')) {
      try {
        const username = store.getState().settings.userName || 'Unknown Username'
        userSystemPrompt = userSystemPrompt.replace(/{{username}}/g, username)
      } catch (error) {
        console.error('Failed to get username:', error)
        userSystemPrompt = userSystemPrompt.replace(/{{username}}/g, 'Unknown Username')
      }
    }
  }

  if (tools && tools.length > 0) {
    return SYSTEM_PROMPT.replace('{{ USER_SYSTEM_PROMPT }}', userSystemPrompt)
      .replace('{{ TOOL_USE_EXAMPLES }}', ToolUseExamples)
      .replace('{{ AVAILABLE_TOOLS }}', AvailableTools(tools))
  }

  return userSystemPrompt
}
