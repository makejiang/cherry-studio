import dayjs from 'dayjs'
import { Model, Provider } from '@renderer/types'
import { OpenAISdkParams } from '@renderer/types/sdk'

interface ApiLogEntry {
  timestamp: string
  sessionId: string
  provider: Provider
  model: Model
  requestId: string
  type: 'REQUEST' | 'RESPONSE' | 'ERROR' | 'STREAM_START' | 'STREAM_COMPLETE'
  data: any
  duration?: number
  error?: string
}

interface ApiSession {
  sessionId: string
  startTime: string
  logs: ApiLogEntry[]
}

export class ApiLogger {
  private static instance: ApiLogger
  private currentSession: ApiSession | null = null
  private logDirectory = ''

  private constructor() {
    this.initializeLogDirectory()
  }

  public static getInstance(): ApiLogger {
    if (!ApiLogger.instance) {
      ApiLogger.instance = new ApiLogger()
    }
    return ApiLogger.instance
  }

  private async initializeLogDirectory(): Promise<void> {
    try {
      // 获取应用数据目录下的日志文件夹
      const appInfo = await window.api.getAppInfo()
      this.logDirectory = `${appInfo.appDataPath}/logs`
      
      // 确保日志目录存在
      await this.ensureDirectory(this.logDirectory)
    } catch (error) {
      console.error('[ApiLogger] Failed to initialize log directory:', error)
    }
  }

  /**
   * 确保目录存在
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      const fs = require('fs').promises
      await fs.mkdir(dirPath, { recursive: true })
    } catch (error) {
      // 目录可能已存在，忽略错误
      console.warn('[ApiLogger] Directory might already exist:', dirPath)
    }
  }

  /**
   * 开始新的API交互会话
   */
  public startSession(): string {
    const sessionId = this.generateSessionId()
    this.currentSession = {
      sessionId,
      startTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      logs: []
    }
    return sessionId
  }

  /**
   * 记录API请求
   */
  public async logRequest(
    provider: Provider,
    model: Model,
    payload: OpenAISdkParams,
    requestId: string
  ): Promise<void> {
    if (!this.currentSession) {
      this.startSession()
    }

    const logEntry: ApiLogEntry = {
      timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss.SSS'),
      sessionId: this.currentSession!.sessionId,
      provider,
      model,
      requestId,
      type: 'REQUEST',
      data: {
        url: provider.apiHost,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Cherry-Studio',
          // 不记录敏感信息如API密钥
          'Authorization': '***'
        },
        payload: this.sanitizePayload(payload)
      }
    }

    this.currentSession!.logs.push(logEntry)
    console.log(`[ApiLogger] REQUEST logged for session ${this.currentSession!.sessionId}`)
  }

  /**
   * 记录API响应
   */
  public async logResponse(
    requestId: string,
    response: any,
    duration: number
  ): Promise<void> {
    if (!this.currentSession) {
      console.warn('[ApiLogger] No active session for response logging')
      return
    }

    const logEntry: ApiLogEntry = {
      timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss.SSS'),
      sessionId: this.currentSession.sessionId,
      provider: {} as Provider, // 从请求日志中获取
      model: {} as Model, // 从请求日志中获取
      requestId,
      type: 'RESPONSE',
      duration,
      data: {
        status: 200,
        response: response
        //response: this.sanitizeResponse(response)
      }
    }

    this.currentSession.logs.push(logEntry)
    console.log(`[ApiLogger] RESPONSE logged for session ${this.currentSession.sessionId}, duration: ${duration}ms`)
  }

  /**
   * 记录API错误
   */
  public async logError(
    requestId: string,
    error: Error,
    duration: number
  ): Promise<void> {
    if (!this.currentSession) {
      console.warn('[ApiLogger] No active session for error logging')
      return
    }

    const logEntry: ApiLogEntry = {
      timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss.SSS'),
      sessionId: this.currentSession.sessionId,
      provider: {} as Provider,
      model: {} as Model,
      requestId,
      type: 'ERROR',
      duration,
      error: error.message,
      data: {
        status: 'error',
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack
      }
    }

    this.currentSession.logs.push(logEntry)
    console.log(`[ApiLogger] ERROR logged for session ${this.currentSession.sessionId}`)
  }

  /**
   * 开始流式响应记录
   */
  public startStreamResponse(requestId: string): void {
    if (!this.currentSession) {
      console.warn('[ApiLogger] No active session for stream response')
      return
    }

    // 初始化流式响应条目
    const logEntry: ApiLogEntry = {
      timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss.SSS'),
      sessionId: this.currentSession.sessionId,
      provider: {} as Provider,
      model: {} as Model,
      requestId,
      type: 'STREAM_START',
      duration: 0,
      data: {
        status: 'streaming',
        chunkCount: 0,
        startTime: Date.now()
      }
    }

    this.currentSession.logs.push(logEntry)
  }

  /**
   * 记录流式响应块
   */
  public logStreamChunk(requestId: string, chunk: any): void {
    if (!this.currentSession) {
      return
    }

    // 找到对应的流式响应条目
    const streamEntry = this.currentSession.logs.find(
      log => log.requestId === requestId && log.type === 'STREAM_START'
    )

    if (streamEntry) {
      // 记录chunk计数，但不存储详细的chunk数据
      if (!streamEntry.data.chunkCount) {
        streamEntry.data.chunkCount = 0
      }
      streamEntry.data.chunkCount++

      // 存储最后一个chunk的基本信息，用于获取metadata
      streamEntry.data.lastChunk = {
        timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss.SSS'),
        chunkIndex: streamEntry.data.chunkCount - 1,
        chunk: {
          id: chunk.id,
          model: chunk.model,
          usage: chunk.usage,
          choices: chunk.choices ? [{
            finish_reason: chunk.choices[0]?.finish_reason
          }] : []
        }
      }

      // 累积完整响应内容
      if (!streamEntry.data.accumulatedResponse) {
        streamEntry.data.accumulatedResponse = {
          content: '',
          tool_calls: [],
          function_call: null,
          role: 'assistant'
        }
      }

      // 提取并累积内容
      if (chunk.choices?.[0]?.delta?.content) {
        streamEntry.data.accumulatedResponse.content += chunk.choices[0].delta.content
      }

      // 累积tool_calls
      if (chunk.choices?.[0]?.delta?.tool_calls) {
        const toolCalls = chunk.choices[0].delta.tool_calls
        for (const toolCall of toolCalls) {
          if (toolCall.index !== undefined) {
            // 确保数组有足够的长度
            while (streamEntry.data.accumulatedResponse.tool_calls.length <= toolCall.index) {
              streamEntry.data.accumulatedResponse.tool_calls.push({
                id: '',
                type: 'function',
                function: { name: '', arguments: '' }
              })
            }
            
            const existingToolCall = streamEntry.data.accumulatedResponse.tool_calls[toolCall.index]
            if (toolCall.id) existingToolCall.id = toolCall.id
            if (toolCall.type) existingToolCall.type = toolCall.type
            if (toolCall.function?.name) existingToolCall.function.name = toolCall.function.name
            if (toolCall.function?.arguments) {
              existingToolCall.function.arguments += toolCall.function.arguments
            }
          }
        }
      }

      // 累积function_call (旧版API)
      if (chunk.choices?.[0]?.delta?.function_call) {
        const functionCall = chunk.choices[0].delta.function_call
        if (!streamEntry.data.accumulatedResponse.function_call) {
          streamEntry.data.accumulatedResponse.function_call = { name: '', arguments: '' }
        }
        if (functionCall.name) {
          streamEntry.data.accumulatedResponse.function_call.name += functionCall.name
        }
        if (functionCall.arguments) {
          streamEntry.data.accumulatedResponse.function_call.arguments += functionCall.arguments
        }
      }
    }
  }

  /**
   * 结束流式响应记录
   */
  public endStreamResponse(requestId: string, finalUsage?: any): void {
    if (!this.currentSession) {
      return
    }

    // 找到对应的流式响应条目
    const streamEntry = this.currentSession.logs.find(
      log => log.requestId === requestId && log.type === 'STREAM_START'
    )

    if (streamEntry) {
      const endTime = Date.now()
      const startTime = streamEntry.data.startTime || endTime
      streamEntry.duration = endTime - startTime
      streamEntry.type = 'STREAM_COMPLETE'
      streamEntry.data.status = 'completed'
      streamEntry.data.endTime = endTime
      streamEntry.data.finalUsage = finalUsage
      streamEntry.data.totalChunks = streamEntry.data.chunkCount || 0
      
      // 添加完整的累积响应数据
      if (streamEntry.data.accumulatedResponse) {
        // 构建完整的消息对象
        const messageContent: any = {
          role: streamEntry.data.accumulatedResponse.role,
          content: streamEntry.data.accumulatedResponse.content || null
        }

        // 添加tool_calls（如果有）
        if (streamEntry.data.accumulatedResponse.tool_calls.length > 0) {
          messageContent.tool_calls = streamEntry.data.accumulatedResponse.tool_calls.filter(tc => tc.id) // 过滤掉空的tool_calls
        }

        // 添加function_call（如果有，旧版API）
        if (streamEntry.data.accumulatedResponse.function_call?.name) {
          messageContent.function_call = streamEntry.data.accumulatedResponse.function_call
        }

        // 获取finish_reason
        const finishReason = streamEntry.data.lastChunk?.chunk?.choices?.[0]?.finish_reason || 'stop'

        // 构建完整的OpenAI格式响应
        streamEntry.data.fullApiResponse = {
          id: streamEntry.data.lastChunk?.chunk?.id || `chatcmpl-${Date.now()}`,
          object: 'chat.completion',
          created: Math.floor(startTime / 1000),
          model: streamEntry.data.lastChunk?.chunk?.model || 'unknown',
          choices: [{
            message: messageContent,
            finish_reason: finishReason,
            index: 0
          }],
          usage: finalUsage || streamEntry.data.lastChunk?.chunk?.usage || {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0
          }
        }

        // 清理中间累积数据
        delete streamEntry.data.accumulatedResponse
      }
      
      // 清理临时存储的lastChunk
      delete streamEntry.data.lastChunk

      console.log(`[ApiLogger] STREAM completed for session ${this.currentSession.sessionId}, ${streamEntry.data.totalChunks} chunks, duration: ${streamEntry.duration}ms`)
    }
  }

  /**
   * 结束当前会话并保存日志到文件
   */
  public async endSession(): Promise<void> {
    if (!this.currentSession) {
      console.warn('[ApiLogger] No active session to end')
      return
    }

    try {
      const fileName = this.generateLogFileName(this.currentSession.sessionId)
      const filePath = `${this.logDirectory}/${fileName}`
      
      const logData = {
        sessionInfo: {
          sessionId: this.currentSession.sessionId,
          startTime: this.currentSession.startTime,
          endTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          totalLogs: this.currentSession.logs.length,
          totalDuration: this.calculateTotalDuration()
        },
        logs: this.currentSession.logs
      }

      const logContent = JSON.stringify(logData, null, 2)
      
      // 直接写入文件，不需要用户选择
      await window.api.file.write(filePath, logContent)
      
      console.log(`[ApiLogger] Session ${this.currentSession.sessionId} saved to: ${filePath}`)
      this.currentSession = null
    } catch (error) {
      console.error('[ApiLogger] Failed to save session log:', error)
    }
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    const timestamp = dayjs().format('YYYYMMDD-HHmmss')
    const random = Math.random().toString(36).substring(2, 8)
    return `session-${timestamp}-${random}`
  }

  /**
   * 生成日志文件名
   */
  private generateLogFileName(sessionId: string): string {
    const date = dayjs().format('YYYY-MM-DD')
    return `api-log-${date}-${sessionId}.json`
  }

  /**
   * 清理敏感信息的请求载荷
   */
  private sanitizePayload(payload: OpenAISdkParams): any {
    const sanitized = { ...payload }
    
    // 如果消息过长，只保留前面部分
    if (sanitized.messages) {
      sanitized.messages = sanitized.messages.map(msg => {
        const sanitizedMsg = { ...msg }
        if (typeof sanitizedMsg.content === 'string' && sanitizedMsg.content.length > 3000) {
          sanitizedMsg.content = sanitizedMsg.content.substring(0, 3000) + `... [truncated,${sanitizedMsg.content.length}]`
        }
        return sanitizedMsg
      })
    }

    return sanitized
  }

  /**
   * 计算会话总持续时间
   */
  private calculateTotalDuration(): number {
    if (!this.currentSession) return 0
    
    return this.currentSession.logs
      .filter(log => log.duration !== undefined)
      .reduce((total, log) => total + (log.duration || 0), 0)
  }

  /**
   * 获取当前会话ID
   */
  public getCurrentSessionId(): string | null {
    return this.currentSession?.sessionId || null
  }

  /**
   * 检查是否有活跃会话
   */
  public hasActiveSession(): boolean {
    return this.currentSession !== null
  }
}

export default ApiLogger.getInstance()
