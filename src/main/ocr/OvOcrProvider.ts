import { FileMetadata, OcrProvider } from '@types'
import Logger from 'electron-log'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

import BaseOcrProvider from './BaseOcrProvider'

const execAsync = promisify(exec)

export default class OvOcrProvider extends BaseOcrProvider {
  constructor(provider: OcrProvider) {
    super(provider)
  }

  private getOvOcrPath(): string {
    return path.join(os.homedir(), '.cherrystudio', 'ov-ocr')
  }

  private getImgDir(): string {
    return path.join(this.getOvOcrPath(), 'img')
  }

  private getOutputDir(): string {
    return path.join(this.getOvOcrPath(), 'output')
  }


  private async clearDirectory(dirPath: string): Promise<void> {
    if (fs.existsSync(dirPath)) {
      const files = await fs.promises.readdir(dirPath)
      for (const file of files) {
        const filePath = path.join(dirPath, file)
        const stats = await fs.promises.stat(filePath)
        if (stats.isDirectory()) {
          await this.clearDirectory(filePath)
          await fs.promises.rmdir(filePath)
        } else {
          await fs.promises.unlink(filePath)
        }
      }
    } else {
      // 如果目录不存在，创建它
      await fs.promises.mkdir(dirPath, { recursive: true })
    }
  }

  private async copyFileToImgDir(sourceFilePath: string, targetFileName: string): Promise<void> {
    const imgDir = this.getImgDir()
    const targetFilePath = path.join(imgDir, targetFileName)
    await fs.promises.copyFile(sourceFilePath, targetFilePath)
  }

  private async runOcrBatch(): Promise<void> {
    const runBatPath = path.join(this.getOvOcrPath(), 'run.bat')
    const ovOcrPath = this.getOvOcrPath()
    
    try {
      // 在ov-ocr目录下执行run.bat
      await execAsync(`"${runBatPath}"`, { 
        cwd: ovOcrPath,
        timeout: 60000 // 60秒超时
      })
    } catch (error) {
      Logger.error('[OCR] Error running ov-ocr batch:', error)
      throw new Error(`Failed to run OCR batch: ${error}`)
    }
  }

  public async parseFile(sourceId: string, file: FileMetadata): Promise<{ processedFile: FileMetadata }> {
    Logger.info(`[OCR] Starting OV OCR process for file: ${file.name}`)

    try {
      // 1. 检查run.bat文件必须存在
      const runBatPath = path.join(this.getOvOcrPath(), 'run.bat')
      if (!fs.existsSync(runBatPath)) {
        throw new Error(`OV OCR run.bat not found at: ${runBatPath}`)
      }

      // 2. 清空img目录和output目录
      await this.clearDirectory(this.getImgDir())
      await this.clearDirectory(this.getOutputDir())

      // 3. 把file放到img目录中
      const fileName = path.basename(file.path)
      await this.copyFileToImgDir(file.path, fileName)
      Logger.info(`[OCR] File copied to img directory: ${fileName}`)

      // 发送进度：准备阶段完成
      await this.sendOcrProgress(sourceId, 25)

      // 4. 运行run.bat
      Logger.info('[OCR] Running OV OCR batch process...')
      await this.runOcrBatch()
      
      // 发送进度：OCR处理完成
      await this.sendOcrProgress(sourceId, 75)

      // 5. 检查output/[basename].txt文件必须存在
      const baseNameWithoutExt = path.basename(fileName, path.extname(fileName))
      const outputFilePath = path.join(this.getOutputDir(), `${baseNameWithoutExt}.txt`)
      if (!fs.existsSync(outputFilePath)) {
        throw new Error(`OV OCR output file not found at: ${outputFilePath}`)
      }

      // 6. 将[basename].txt文件moveToAttachmentsDir并改名
      const baseDir = path.dirname(file.path)
      const baseName = path.basename(file.path, path.extname(file.path))
      const txtFileName = `${baseName}.txt`
      const tempTxtFilePath = path.join(baseDir, txtFileName)

      // 先复制到临时位置，然后移动到附件目录
      await fs.promises.copyFile(outputFilePath, tempTxtFilePath)      
      const movedPaths = this.moveToAttachmentsDir(file.id, [tempTxtFilePath])
      
      // 发送进度：完成
      await this.sendOcrProgress(sourceId, 100)

      Logger.info(`[OCR] OV OCR process completed successfully for ${file.origin_name}`)

      return {
        processedFile: {
          ...file,
          name: txtFileName,
          path: movedPaths[0],
          ext: '.txt',
          size: fs.statSync(movedPaths[0]).size
        }
      }
    } catch (error) {
      Logger.error('[OCR] Error during OV OCR process:', error)
      throw error
    }
  }
}
