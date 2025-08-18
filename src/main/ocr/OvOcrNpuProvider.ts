import { OcrProvider } from '@types'
import OvOcrProvider from './OvOcrProvider'

export default class OvOcrNpuProvider extends OvOcrProvider {
  protected readonly batFile = 'run.npu.bat'

  constructor(provider: OcrProvider) {
    super(provider)
  }
}
