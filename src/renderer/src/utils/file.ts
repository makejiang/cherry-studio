export const fileToBase64 = async (filePath: string) => {
  const result = await window.api.file.base64Image(filePath)
  return {
    data: result.base64,
    mimeType: result.mime
  }
}
