import { OcrProvider } from '@types'

import BaseOcrProvider from './BaseOcrProvider'
import DefaultOcrProvider from './DefaultOcrProvider'
import Doc2xOcrProvider from './Doc2xOcrProvider'
import MistralOcrProvider from './MistralOcrProvider'
export default class OcrProviderFactory {
  static create(provider: OcrProvider): BaseOcrProvider {
    if (provider.id === 'doc2x') {
      return new Doc2xOcrProvider(provider)
    } else if (provider.id === 'mistral') {
      return new MistralOcrProvider(provider)
    }
    return new DefaultOcrProvider(provider)
  }
}
