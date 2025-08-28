const https = require('https')
const http = require('http')
const fs = require('fs')
const url = require('url')
const path = require('path')
const { execSync } = require('child_process')

/**
 * Downloads a file from a URL with redirect handling
 * @param {string} url The URL to download from
 * @param {string} destinationPath The path to save the file to
 * @returns {Promise<void>} Promise that resolves when download is complete
 */
async function downloadWithRedirects(downloadUrl, destinationPath) {
  return new Promise((resolve, reject) => {
    const request = (downloadUrl) => {
      const parsedUrl = url.parse(downloadUrl)
      const isHttps = parsedUrl.protocol === 'https:'
      const client = isHttps ? https : http

      client
        .get(parsedUrl, (response) => {
          if (response.statusCode == 301 || response.statusCode == 302) {
            request(response.headers.location)
            return
          }
          if (response.statusCode !== 200) {
            reject(new Error(`Download failed: ${response.statusCode} ${response.statusMessage}`))
            return
          }
          const file = fs.createWriteStream(destinationPath)
          response.pipe(file)
          file.on('finish', () => resolve())
        })
        .on('error', (err) => {
          reject(err)
        })
    }
    request(downloadUrl)
  })
}

/**
 * Downloads a file using PowerShell Invoke-WebRequest command
 * @param {string} url The URL to download from
 * @param {string} outputPath The path to save the file to
 * @returns {Promise<boolean>} Promise that resolves to true if download succeeds
 */
async function downloadWithPowerShell(url, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      // Ensure the output directory exists
      const outputDir = path.dirname(outputPath)
      fs.mkdirSync(outputDir, { recursive: true })

      // PowerShell command to download the file with progress disabled for faster download
      const psCommand = `powershell -Command "$ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest '${url}' -OutFile '${outputPath}'"`
      
      console.log(`Downloading with PowerShell: ${url}`)
      execSync(psCommand, { stdio: 'inherit' })
      
      // Check if file was downloaded successfully
      if (fs.existsSync(outputPath)) {
        console.log(`Download completed: ${outputPath}`)
        resolve(true)
      } else {
        reject(new Error('Download failed: File not found after download'))
      }
    } catch (error) {
      reject(new Error(`PowerShell download failed: ${error.message}`))
    }
  })
}

module.exports = { downloadWithRedirects, downloadWithPowerShell }
