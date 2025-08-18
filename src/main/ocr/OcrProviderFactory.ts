import { isMac } from '@main/constant'
import { OcrProvider } from '@types'
import Logger from 'electron-log'

import BaseOcrProvider from './BaseOcrProvider'
import DefaultOcrProvider from './DefaultOcrProvider'
import MacSysOcrProvider from './MacSysOcrProvider'
import OvOcrNpuProvider from './OvOcrNpuProvider'
import OvOcrCpuProvider from './OvOcrCpuProvider'
import OvOcrGpuProvider from './OvOcrGpuProvider'
export default class OcrProviderFactory {
  static create(provider: OcrProvider): BaseOcrProvider {
    switch (provider.id) {
      case 'system':
        if (!isMac) {
          Logger.warn('[OCR] System OCR provider is only available on macOS')
        }
        return new MacSysOcrProvider(provider)
      case 'ovocrnpu':
        return new OvOcrNpuProvider(provider)
      case 'ovocrcpu':
        return new OvOcrCpuProvider(provider)
      case 'ovocrgpu':
        return new OvOcrGpuProvider(provider)
      default:
        return new DefaultOcrProvider(provider)
    }
  }
}
