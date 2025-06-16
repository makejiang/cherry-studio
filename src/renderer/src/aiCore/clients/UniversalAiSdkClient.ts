import type { CoreMessage, GenerateTextResult, LanguageModel, StreamTextResult } from 'ai'
import { generateText, streamText } from 'ai'

import { PROVIDER_REGISTRY } from './providerRegistry'

// This is our internal, standardized request object
export interface AiCoreRequest {
  modelId: string
  messages: CoreMessage[]
  tools?: Record<string, any>
  // ... any other standardized parameters you want to support
}

export class UniversalAiSdkClient {
  private provider: any // The instantiated provider (e.g., from createOpenAI)
  private isInitialized = false

  constructor(
    private providerName: string,
    private options: any // API keys, etc.
  ) {}

  // Initialization is now an async step because of dynamic imports
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    const config = PROVIDER_REGISTRY[this.providerName]
    if (!config) {
      throw new Error(`Provider "${this.providerName}" is not registered.`)
    }
    try {
      // Directly call the import function from the registry.
      // This is elegant and bundler-friendly.
      const module = await config.import()
      // Get the creator function (e.g., createOpenAI) from the module
      const creatorFunction = module[config.creatorFunctionName]

      if (typeof creatorFunction !== 'function') {
        throw new Error(
          `Creator function "${config.creatorFunctionName}" not found in the imported module for provider "${this.providerName}".`
        )
      }

      this.provider = creatorFunction(this.options)
      this.isInitialized = true
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to initialize provider "${this.providerName}": ${error.message}`)
      }
      throw new Error(`An unknown error occurred while initializing provider "${this.providerName}".`)
    }
  }

  // A helper to get the specific model instance from the provider
  private getModel(modelId: string): LanguageModel {
    if (!this.isInitialized) throw new Error('Client not initialized')
    // Most providers have a .chat() or similar method.
    // You might need a slightly more complex mapping here if some providers differ.
    return this.provider.chat(modelId)
  }

  // Implements the streaming logic using the core ai-sdk function
  async stream(request: AiCoreRequest): Promise<StreamTextResult<any, any>> {
    if (!this.isInitialized) await this.initialize()

    const model = this.getModel(request.modelId)

    // Directly call the standard ai-sdk function
    return streamText({
      model,
      messages: request.messages,
      tools: request.tools
    })
  }

  // Implements the non-streaming logic
  async generate(request: AiCoreRequest): Promise<GenerateTextResult<any, any>> {
    if (!this.isInitialized) await this.initialize()

    const model = this.getModel(request.modelId)

    return generateText({
      model,
      messages: request.messages,
      tools: request.tools
    })
  }
}
