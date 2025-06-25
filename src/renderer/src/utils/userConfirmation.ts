// 存储每个工具的确认Promise的resolve函数
const toolConfirmResolvers = new Map<string, (value: boolean) => void>()

export function requestUserConfirmation(): Promise<boolean> {
  return new Promise((resolve) => {
    const globalKey = '_global'
    toolConfirmResolvers.set(globalKey, resolve)
  })
}

export function requestToolConfirmation(toolId: string): Promise<boolean> {
  return new Promise((resolve) => {
    toolConfirmResolvers.set(toolId, resolve)
  })
}

export function confirmToolAction(toolId: string) {
  const resolve = toolConfirmResolvers.get(toolId)
  if (resolve) {
    resolve(true)
    toolConfirmResolvers.delete(toolId)
  }
}

export function cancelToolAction(toolId: string) {
  const resolve = toolConfirmResolvers.get(toolId)
  if (resolve) {
    resolve(false)
    toolConfirmResolvers.delete(toolId)
  }
}

// 获取所有待确认的工具ID
export function getPendingToolIds(): string[] {
  return Array.from(toolConfirmResolvers.keys()).filter((id) => id !== '_global')
}

// 检查某个工具是否在等待确认
export function isToolPending(toolId: string): boolean {
  return toolConfirmResolvers.has(toolId)
}
