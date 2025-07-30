import { isMac } from '@main/constant'
import { OcrProvider } from '@types'
import Logger from 'electron-log'

import BaseOcrProvider from './BaseOcrProvider'
import DefaultOcrProvider from './DefaultOcrProvider'
import MacSysOcrProvider from './MacSysOcrProvider'
import OvOcrProvider from './OvOcrProvider'
export default class OcrProviderFactory {
  static create(provider: OcrProvider): BaseOcrProvider {
    switch (provider.id) {
      case 'system':
        if (!isMac) {
          Logger.warn('[OCR] System OCR provider is only available on macOS')
        }
        return new MacSysOcrProvider(provider)
      case 'ovms':
        return new OvOcrProvider(provider)
      default:
        return new DefaultOcrProvider(provider)
    }
  }
}
