import { OcrProvider } from '@types'
import OvOcrProvider from './OvOcrProvider'

export default class OvOcrCpuProvider extends OvOcrProvider {
  protected readonly batFile = 'run.cpu.bat'

  constructor(provider: OcrProvider) {
    super(provider)
  }
}
