import { isMac } from '@main/constant'
import { PreprocessProvider } from '@types'
import Logger from 'electron-log'

import BasePreprocessProvider from './BasePreprocessProvider'
import DefaultPreprocessProvider from './DefaultPreprocessProvider'
import Doc2xPreprocessProvider from './Doc2xPreprocessProvider'
import MacSysOcrProvider from './MacSysOcrProvider'
import MineruPreprocessProvider from './MineruPreprocessProvider'
import MistralPreprocessProvider from './MistralPreprocessProvider'
export default class PreprocessProviderFactory {
  static create(provider: PreprocessProvider): BasePreprocessProvider {
    switch (provider.id) {
      case 'doc2x':
        return new Doc2xPreprocessProvider(provider)
      case 'mistral':
        return new MistralPreprocessProvider(provider)
      case 'system':
        if (!isMac) {
          Logger.warn('[OCR] System OCR provider is only available on macOS')
        }
        return new MacSysOcrProvider(provider)
      case 'mineru':
        return new MineruPreprocessProvider(provider)
      default:
        return new DefaultPreprocessProvider(provider)
    }
  }
}
