import fs from 'fs'

export const fileToBase64 = async (filePath: string) => {
  const buffer = await fs.promises.readFile(filePath)
  return {
    data: buffer.toString('base64'),
    mimeType: 'application/pdf'
  }
}
