import { KnowledgeBaseParams } from '@types'

import BaseOcrProvider from './BaseOcrProvider'

export default class DefaultOcrProvider extends BaseOcrProvider {
  constructor(base: KnowledgeBaseParams) {
    super(base)
  }
  parseFile(): Promise<{ uid: string }> {
    throw new Error('Method not implemented.')
  }
  exportFile(): Promise<void> {
    throw new Error('Method not implemented.')
  }
}
