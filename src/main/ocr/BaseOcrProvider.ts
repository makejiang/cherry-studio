import fs from 'node:fs'
import path from 'node:path'

import { windowService } from '@main/services/WindowService'
import { FileSource, LocalFileSource, OcrProvider } from '@types'
import { app } from 'electron'
import Logger from 'electron-log'
import pdfParse from 'pdf-parse'
export default abstract class BaseOcrProvider {
  protected provider: OcrProvider
  private storageDir = path.join(app.getPath('userData'), 'Data', 'Files')

  constructor(provider: OcrProvider) {
    if (!provider) {
      throw new Error('Ocr provider is not set')
    }
    this.provider = provider
  }
  abstract parseFile(sourceId: string, file: FileSource): Promise<{ processedFile: LocalFileSource }>
  /**
   * 辅助方法：延迟执行
   */
  public delay = (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * 获取PDF文件的页数和文件大小
   * @param filePath PDF文件路径
   * @returns 包含页数和文件大小(字节)的对象
   */
  public async getPdfInfo(filePath: string): Promise<{ pageCount: number; fileSize: number }> {
    try {
      Logger.info(`Getting PDF info for: ${filePath}`)

      if (!filePath.toLowerCase().endsWith('.pdf')) {
        throw new Error('File is not a PDF')
      }

      const stats = fs.statSync(filePath)
      const fileSize = stats.size
      const dataBuffer = fs.readFileSync(filePath)
      const pdfData = await pdfParse(dataBuffer)

      Logger.info(`File ${filePath} has ${pdfData.numpages} pages and size: ${fileSize} bytes`)
      return {
        pageCount: pdfData.numpages,
        fileSize: fileSize
      }
    } catch (error) {
      Logger.error(`Failed to get PDF info for ${filePath}: ${error instanceof Error ? error.message : String(error)}`)
      throw new Error('Failed to get PDF information')
    }
  }

  public async sendOcrProgress(sourceId: string, progress: number): Promise<void> {
    const mainWindow = windowService.getMainWindow()
    mainWindow?.webContents.send('file-ocr-progress', {
      itemId: sourceId,
      progress: progress
    })
  }

  /**
   * 将文件移动到附件目录
   * @param fileId 文件id
   * @param filePaths 需要移动的文件路径数组
   * @returns 移动后的文件路径数组
   */
  public moveToAttachmentsDir(fileId: string, filePaths: string[]): string[] {
    const attachmentsPath = path.join(this.storageDir, fileId)
    if (!fs.existsSync(attachmentsPath)) {
      fs.mkdirSync(attachmentsPath, { recursive: true })
    }

    const movedPaths: string[] = []

    for (const filePath of filePaths) {
      if (fs.existsSync(filePath)) {
        const fileName = path.basename(filePath)
        const destPath = path.join(attachmentsPath, fileName)
        fs.copyFileSync(filePath, destPath)
        fs.unlinkSync(filePath) // 删除原文件，实现"移动"
        movedPaths.push(destPath)
      }
    }
    return movedPaths
  }
}
