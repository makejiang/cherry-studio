import { ApiClientFactory } from '@renderer/aiCore/clients/ApiClientFactory'
import { BaseApiClient } from '@renderer/aiCore/clients/BaseApiClient'
import { isDedicatedImageGenerationModel, isFunctionCallingModel } from '@renderer/config/models'
import type { GenerateImageParams, Model, Provider } from '@renderer/types'
import { Chunk, ChunkType } from '@renderer/types/chunk'
import { Message } from '@renderer/types/newMessage'
import { RequestOptions, SdkModel } from '@renderer/types/sdk'
import { isEnabledToolUse } from '@renderer/utils/mcp-tools'
import { getMainTextContent } from '@renderer/utils/messageUtils/find'
import { type CoreMessage } from 'ai'

import { OpenAIAPIClient } from './clients'
import { AihubmixAPIClient } from './clients/AihubmixAPIClient'
import { AnthropicAPIClient } from './clients/anthropic/AnthropicAPIClient'
import { OpenAIResponseAPIClient } from './clients/openai/OpenAIResponseAPIClient'
import type { AiCoreRequest } from './clients/UniversalAiSdkClient'
import { CompletionsMiddlewareBuilder } from './middleware/builder'
import { MIDDLEWARE_NAME as AbortHandlerMiddlewareName } from './middleware/common/AbortHandlerMiddleware'
import { MIDDLEWARE_NAME as FinalChunkConsumerMiddlewareName } from './middleware/common/FinalChunkConsumerMiddleware'
import { applyCompletionsMiddlewares } from './middleware/composer'
import { MIDDLEWARE_NAME as McpToolChunkMiddlewareName } from './middleware/core/McpToolChunkMiddleware'
import { MIDDLEWARE_NAME as RawStreamListenerMiddlewareName } from './middleware/core/RawStreamListenerMiddleware'
import { MIDDLEWARE_NAME as ThinkChunkMiddlewareName } from './middleware/core/ThinkChunkMiddleware'
import { MIDDLEWARE_NAME as WebSearchMiddlewareName } from './middleware/core/WebSearchMiddleware'
import { MIDDLEWARE_NAME as ImageGenerationMiddlewareName } from './middleware/feat/ImageGenerationMiddleware'
import { MIDDLEWARE_NAME as ThinkingTagExtractionMiddlewareName } from './middleware/feat/ThinkingTagExtractionMiddleware'
import { MIDDLEWARE_NAME as ToolUseExtractionMiddlewareName } from './middleware/feat/ToolUseExtractionMiddleware'
import { MiddlewareRegistry } from './middleware/register'
import { CompletionsParams, CompletionsResult } from './middleware/schemas'

export default class AiProvider {
  private apiClient: BaseApiClient

  constructor(provider: Provider) {
    // Use the new ApiClientFactory to get a BaseApiClient instance
    this.apiClient = ApiClientFactory.create(provider)
  }

  public async completions(params: CompletionsParams, options?: RequestOptions): Promise<CompletionsResult> {
    // 1. 根据模型识别正确的客户端
    const model = params.assistant.model
    if (!model) {
      return Promise.reject(new Error('Model is required'))
    }

    // 根据client类型选择合适的处理方式
    let client: BaseApiClient

    if (this.apiClient instanceof AihubmixAPIClient) {
      // AihubmixAPIClient: 根据模型选择合适的子client
      client = this.apiClient.getClientForModel(model)
      if (client instanceof OpenAIResponseAPIClient) {
        client = client.getClient(model) as BaseApiClient
      }
    } else if (this.apiClient instanceof OpenAIResponseAPIClient) {
      // OpenAIResponseAPIClient: 根据模型特征选择API类型
      client = this.apiClient.getClient(model) as BaseApiClient
    } else {
      // 其他client直接使用
      client = this.apiClient
    }

    // 2. 构建中间件链
    const builder = CompletionsMiddlewareBuilder.withDefaults()
    // images api
    if (isDedicatedImageGenerationModel(model)) {
      builder.clear()
      builder
        .add(MiddlewareRegistry[FinalChunkConsumerMiddlewareName])
        .add(MiddlewareRegistry[AbortHandlerMiddlewareName])
        .add(MiddlewareRegistry[ImageGenerationMiddlewareName])
    } else {
      // Existing logic for other models
      if (!params.enableReasoning) {
        builder.remove(ThinkingTagExtractionMiddlewareName)
        builder.remove(ThinkChunkMiddlewareName)
      }
      // 注意：用client判断会导致typescript类型收窄
      if (!(this.apiClient instanceof OpenAIAPIClient)) {
        builder.remove(ThinkingTagExtractionMiddlewareName)
      }
      if (!(this.apiClient instanceof AnthropicAPIClient)) {
        builder.remove(RawStreamListenerMiddlewareName)
      }
      if (!params.enableWebSearch) {
        builder.remove(WebSearchMiddlewareName)
      }
      if (!params.mcpTools?.length) {
        builder.remove(ToolUseExtractionMiddlewareName)
        builder.remove(McpToolChunkMiddlewareName)
      }
      if (isEnabledToolUse(params.assistant) && isFunctionCallingModel(model)) {
        builder.remove(ToolUseExtractionMiddlewareName)
      }
      if (params.callType !== 'chat') {
        builder.remove(AbortHandlerMiddlewareName)
      }
    }

    const middlewares = builder.build()

    // 3. Create the wrapped SDK method with middlewares
    const wrappedCompletionMethod = applyCompletionsMiddlewares(client, client.createCompletions, middlewares)

    // 4. Execute the wrapped method with the original params
    return wrappedCompletionMethod(params, options)
  }

  public async completionsAiSdk(params: CompletionsParams): Promise<CompletionsResult> {
    if (!params.assistant?.model) {
      throw new Error('Assistant model configuration is missing.')
    }

    // --- 1. Get Provider Info & API Key ---
    // The provider type (e.g., 'openai') is on the model object.
    const providerType = params.assistant.model.provider
    // The API key is retrieved from the currently initialized apiClient on the instance.
    // This assumes that a relevant apiClient has been set up before this call.
    if (!this.apiClient) {
      // If no client, create one based on the current assistant's provider info
      this.apiClient = ApiClientFactory.create(params.assistant.model.provider)
    }
    const providerOptions = { apiKey: this.apiClient.apiKey }

    // --- 2. Message Conversion ---
    const extractTextFromMessage = (message: Message): string => getMainTextContent(message)

    const coreMessages: CoreMessage[] = (Array.isArray(params.messages) ? params.messages : [])
      .map((msg) => {
        const content = extractTextFromMessage(msg)
        console.log('content', content)
        // Correctly handle the discriminated union for CoreMessage
        if (msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system') {
          return { role: msg.role, content }
        }
        // Handle other roles like 'tool' if they have a different structure,
        // or filter them out if they are not meant for this call.
        return null
      })
      .filter((msg): msg is CoreMessage => msg !== null && msg.content !== '')

    if (coreMessages.length === 0) {
      throw new Error('Could not extract any valid content from messages.')
    }

    // --- 3. Prepare and Execute Request ---
    const client = await ApiClientFactory.createAiSdkClient('xai', providerOptions)

    const request: AiCoreRequest = {
      modelId: params.assistant.model.id,
      messages: coreMessages
    }

    const request = async () => {
      const result = await client.stream(request)
      return result.fullStream
    }

    let fullText = ''

    // --- 4. Process Stream ---
    for await (const part of result.fullStream) {
      if (part.type === 'text-delta' && params.onChunk) {
        fullText += part.textDelta
        const chunk: Chunk = {
          type: ChunkType.TEXT_DELTA,
          text: part.textDelta
        }
        params.onChunk(chunk)
      }
    }

    // --- 5. Return Correct Result Shape ---
    return {
      getText: () => fullText
    }
  }

  public async models(): Promise<SdkModel[]> {
    return this.apiClient.listModels()
  }

  public async getEmbeddingDimensions(model: Model): Promise<number> {
    try {
      // Use the SDK instance to test embedding capabilities
      const dimensions = await this.apiClient.getEmbeddingDimensions(model)
      return dimensions
    } catch (error) {
      console.error('Error getting embedding dimensions:', error)
      return 0
    }
  }

  public async generateImage(params: GenerateImageParams): Promise<string[]> {
    return this.apiClient.generateImage(params)
  }

  public getBaseURL(): string {
    return this.apiClient.getBaseURL()
  }

  public getApiKey(): string {
    return this.apiClient.getApiKey()
  }
}
