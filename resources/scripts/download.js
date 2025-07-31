const https = require('https')
const http = require('http')
const fs = require('fs')
const url = require('url')

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

module.exports = { downloadWithRedirects }
