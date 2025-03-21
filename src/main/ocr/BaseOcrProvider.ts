import { KnowledgeBaseParams } from '@types'

export default abstract class BaseOcrProvider {
  protected base: KnowledgeBaseParams
  constructor(base: KnowledgeBaseParams) {
    if (!base) {
      throw new Error('KnowledgeBaseParams is required')
    }
    if (!base.ocrProvider || base.ocrProvider?.apiKey === '') {
      throw new Error('Ocr provider is not set or apiKey is empty')
    }
    this.base = base
  }
  abstract parseFile(filePath: string): Promise<{ uid: string }>
  abstract exportFile(filePath: string, uid: string): Promise<void>
  /**
   * 辅助方法：延迟执行
   */
  public delay = (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
