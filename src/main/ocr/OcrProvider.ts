import { KnowledgeBaseParams } from '@types'

import BaseOcrProvider from './BaseOcrProvider'
import OcrProviderFactory from './OcrProviderFactory'

export default class OcrProvider {
  private sdk: BaseOcrProvider
  constructor(base: KnowledgeBaseParams) {
    this.sdk = OcrProviderFactory.create(base)
  }
  public async parseFile(filePath: string): Promise<{ uid: string }> {
    return this.sdk.parseFile(filePath)
  }
  public async exportFile(filePath: string, uid: string): Promise<void> {
    return this.sdk.exportFile(filePath, uid)
  }
}
