import { OcrProvider } from '@types'
import OvOcrProvider from './OvOcrProvider'

export default class OvOcrGpuProvider extends OvOcrProvider {
  protected readonly batFile = 'run.gpu.bat'

  constructor(provider: OcrProvider) {
    super(provider)
  }
}
