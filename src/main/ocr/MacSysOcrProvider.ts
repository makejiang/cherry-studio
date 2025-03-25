import MacOCR, { OCRResult } from '@cherrystudio/mac-system-ocr'
import { FileSource, isLocalFile, LocalFileSource, OcrProvider } from '@types'
import Logger from 'electron-log'
import * as fs from 'fs'
import PQueue from 'p-queue'
import * as path from 'path'

import BaseOcrProvider from './BaseOcrProvider'

export default class MacSysOcrProvider extends BaseOcrProvider {
  constructor(provider: OcrProvider) {
    super(provider)
  }

  private async processPage(
    pageBuffer: Buffer,
    pageNum: number,
    totalPages: number,
    sourceId: string,
    writeStream: fs.WriteStream
  ): Promise<void> {
    try {
      const text: OCRResult = await MacOCR.recognizeFromBuffer(pageBuffer)
      writeStream.write(text.text + '\n')
      await this.sendOcrProgress(sourceId, (pageNum / totalPages) * 100)
    } catch (error) {
      Logger.error(`[OCR] Error processing page ${pageNum}:`, error)
      throw error
    }
  }

  public async parseFile(sourceId: string, file: FileSource): Promise<{ processedFile: LocalFileSource }> {
    Logger.info(`[OCR] Starting OCR process for file: ${file.name}`)
    if (isLocalFile(file)) {
      if (file.ext === '.pdf') {
        try {
          const { pdf } = await import('pdf-to-img')
          const readStream = fs.createReadStream(file.path)
          const results = await pdf(readStream)
          const pages = results.length
          Logger.info('[OCR] PDF successfully converted to image')

          const baseDir = path.dirname(file.path)
          const baseName = path.basename(file.path, path.extname(file.path))
          const txtFileName = `${baseName}.txt`
          const txtFilePath = path.join(baseDir, txtFileName)

          // Create a write stream
          const writeStream = fs.createWriteStream(txtFilePath)

          const queue = new PQueue({ concurrency: 5 })
          const tasks: Promise<void>[] = []

          for (let i = 0; i < pages; i++) {
            const pageNum = i + 1
            const task = queue.add(async () => {
              const pageBuffer = await results.getPage(pageNum)
              await this.processPage(pageBuffer, pageNum, pages, sourceId, writeStream)
            })
            tasks.push(task)
          }

          await Promise.all(tasks)

          await new Promise<void>((resolve, reject) => {
            writeStream.end(() => {
              Logger.info('[OCR] OCR process completed successfully')
              resolve()
            })
            writeStream.on('error', reject)
          })

          return {
            processedFile: {
              ...file,
              name: txtFileName,
              path: txtFilePath,
              ext: '.txt',
              size: fs.statSync(txtFilePath).size
            }
          }
        } catch (error) {
          Logger.error('[OCR] Error during OCR process:', error)
          throw error
        }
      }
      return { processedFile: file }
    }
    throw new Error('Only local files are supported')
  }
}
