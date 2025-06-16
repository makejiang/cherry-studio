interface ProviderConfig {
  // A function that returns a dynamic import promise for the provider's package.
  // This approach is friendly to bundlers like Vite.
  import: () => Promise<any>
  // The name of the creator function within that package (e.g., 'createOpenAI')
  creatorFunctionName: string
}

export const PROVIDER_REGISTRY: Record<string, ProviderConfig> = {
  openai: {
    import: () => import('@ai-sdk/openai'),
    creatorFunctionName: 'createOpenAI'
  },
  anthropic: {
    import: () => import('@ai-sdk/anthropic'),
    creatorFunctionName: 'createAnthropic'
  },
  google: {
    import: () => import('@ai-sdk/google'),
    creatorFunctionName: 'createGoogle'
  },
  // mistral: {
  //   import: () => import('@ai-sdk/mistral'),
  //   creatorFunctionName: 'createMistral'
  // },
  xai: {
    import: () => import('@ai-sdk/xai'),
    creatorFunctionName: 'createXai'
  }
  // You can add all your providers here.
  // This file is the ONLY place you'll need to update when adding a new provider.
}
