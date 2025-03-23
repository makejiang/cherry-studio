import { FileListResponse, FileUploadResponse, LocalFileSource } from '@types'
import { fileFrom } from 'fetch-blob/from.js'

import { MistralClientManager } from '../MistralClientManager'
import { BaseFileService } from './BaseFileService'

export class MistralService extends BaseFileService {
  private readonly client

  constructor(apiKey: string) {
    super(apiKey)
    const clientManager = MistralClientManager.getInstance()
    clientManager.initializeClient(apiKey)
    this.client = clientManager.getClient()
  }

  async uploadFile(file: LocalFileSource): Promise<FileUploadResponse> {
    try {
      const blob = await fileFrom(file.path)
      const response = await this.client.files.upload({
        file: blob,
        purpose: 'ocr'
      })

      return {
        fileId: response.id,
        displayName: file.origin_name,
        status: 'success'
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      return {
        fileId: '',
        displayName: file.origin_name,
        status: 'failed'
      }
    }
  }

  async listFiles(): Promise<FileListResponse> {
    try {
      const response = await this.client.files.list({})
      return {
        files: response.data.map((file) => ({
          id: file.id,
          displayName: file.filename || '',
          size: 0, // Size information not available in SDK response
          status: 'success' // All listed files are processed
        }))
      }
    } catch (error) {
      console.error('Error listing files:', error)
      return { files: [] }
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      await this.client.files.delete({
        fileId
      })
    } catch (error) {
      console.error('Error deleting file:', error)
      throw error
    }
  }

  async retrieveFile(fileId: string): Promise<FileUploadResponse> {
    try {
      const response = await this.client.files.retrieve({
        fileId
      })

      return {
        fileId: response.id,
        displayName: response.filename || '',
        status: 'success' // Retrieved files are always processed
      }
    } catch (error) {
      console.error('Error retrieving file:', error)
      throw error
    }
  }
}
