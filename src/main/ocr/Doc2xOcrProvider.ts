import fs from 'node:fs'

import { KnowledgeBaseParams } from '@types'
import axios, { AxiosRequestConfig } from 'axios'

import BaseOcrProvider from './BaseOcrProvider'

export default class Doc2xOcrProvider extends BaseOcrProvider {
  constructor(base: KnowledgeBaseParams) {
    super(base)
  }
  public async parseFile(filePath: string): Promise<{ uid: string }> {
    console.log('Parsing file:', filePath)
    const { uid, url } = await this.preupload()
    console.log('uid:', uid, 'url:', url)
    await this.putFile(filePath, url)
    while (true) {
      // 可以修改为根据progress延迟
      await this.delay(1000)
      const { status, progress } = await this.getStatus(uid)
      console.log('status:', status, 'progress', progress)
      if (status === 'success') {
        break
      } else if (status === 'failed') {
        throw new Error('parse failed')
      }
    }
    console.log('Parsing file success')
    return {
      uid: uid
    }
  }
  public async exportFile(filePath: string, uid: string): Promise<void> {
    console.log('Exporting file:', filePath)
    await this.convertFile(uid, filePath)
    console.log('Converted file success')
    let exportUrl = ''
    while (true) {
      await this.delay(1000)
      const { status, url } = await this.getParsedFile(uid)
      console.log('status:', status, 'url:', url)
      if (status === 'success') {
        exportUrl = url
        break
      } else if (status === 'failed') {
        throw new Error('export failed')
      }
    }
    await this.downloadFile(exportUrl, filePath)
    console.log('Exported file success')
  }

  private async preupload(): Promise<{ uid: string; url: string }> {
    const config: AxiosRequestConfig = { headers: { Authorization: `Bearer ${this.base.ocrProvider?.apiKey}` } }
    const { data } = await axios.post(`${this.base.ocrProvider?.apiHost}/api/v2/parse/preupload`, null, config)
    if (data.code === 'success') {
      return {
        uid: data.data.uid,
        url: data.data.url
      }
    } else {
      throw new Error(`get preupload url failed: ${data}`)
    }
  }

  private async putFile(filePath: string, url: string): Promise<void> {
    const fileContent = fs.readFileSync(filePath)
    const response = await axios.put(url, fileContent)
    if (response.status !== 200) {
      throw new Error(`put file failed: ${response.statusText}`)
    }
  }

  private async getStatus(uid: string): Promise<{ status: string; progress: number }> {
    const config: AxiosRequestConfig = { headers: { Authorization: `Bearer ${this.base.ocrProvider?.apiKey}` } }
    const response = await axios.get(`${this.base.ocrProvider?.apiHost}/api/v2/parse/status?uid=${uid}`, config)
    if (response.status !== 200) {
      throw new Error(`get status failed: ${response.statusText}`)
    }
    if (response.data.code !== 'success') {
      throw new Error(`get status failed: ${response.data}`)
    }
    return {
      status: response.data.data.status,
      progress: response.data.data.progress
    }
  }

  private async convertFile(uid: string, filePath: string): Promise<void> {
    const fileName = filePath.split('/').pop()?.split('.')[0]
    const config: AxiosRequestConfig = {
      headers: { Authorization: `Bearer ${this.base.ocrProvider?.apiKey}`, 'Content-Type': 'application/json' }
    }
    const data = {
      uid,
      to: 'md',
      formula_mode: 'normal',
      filename: fileName
    }
    const response = await axios.post(`${this.base.ocrProvider?.apiHost}/api/v2/convert/parse`, data, config)
    if (response.data.code !== 'success') {
      throw new Error(`convert file failed: ${response.statusText}`)
    }
  }

  private async getParsedFile(uid: string): Promise<{ status: string; url: string }> {
    const config: AxiosRequestConfig = { headers: { Authorization: `Bearer ${this.base.ocrProvider?.apiKey}` } }
    const response = await axios.get(`${this.base.ocrProvider?.apiHost}/api/v2/convert/parse/result?uid=${uid}`, config)
    if (response.status !== 200) {
      throw new Error(`get parsed file failed: ${response.statusText}`)
    }
    return {
      status: response.data.data.status,
      url: response.data.data.url
    }
  }

  private async downloadFile(url: string, filePath: string): Promise<void> {
    const fileName = filePath.split('/').pop()?.split('.')[0] + '.zip'
    const exportPath = `${filePath.split('/').slice(0, -1).join('/')}/${fileName}`
    console.log('exportPath:', exportPath)
    const response = await axios.get(url, { responseType: 'arraybuffer' })
    fs.writeFileSync(exportPath, response.data)
  }
}
