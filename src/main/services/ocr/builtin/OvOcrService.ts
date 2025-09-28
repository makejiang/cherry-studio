import { isWin } from '@main/constant'
import { loggerService } from '@logger'
import { isImageFileMetadata, OcrResult, OcrOvConfig, SupportedOcrFile } from '@types'

import { OcrBaseService } from './OcrBaseService'

const logger = loggerService.withContext('OvOcrService')

export class OvOcrService extends OcrBaseService {
  constructor() {
    super()
  }

  private async ocrImage(filePath: string, options?: OcrOvConfig): Promise<OcrResult> {
    if (!isWin) {
      logger.warn('System OCR is only supported on Windows')
      return { text: '' }
    }
    logger.info(`Dummy OV OCR called on ${filePath} with options ${JSON.stringify(options)}`)
    return { text: 'dump text' }
  }

  public ocr = async (file: SupportedOcrFile, options?: OcrOvConfig): Promise<OcrResult> => {
    if (isImageFileMetadata(file)) {
      return this.ocrImage(file.path, options)
    } else {
      throw new Error('Unsupported file type, currently only image files are supported')
    }
  }
}

export const ovOcrService = new OvOcrService()
