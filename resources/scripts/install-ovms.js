const fs = require('fs')
const path = require('path')
const os = require('os')
const { execSync } = require('child_process')
const StreamZip = require('node-stream-zip')
const tar = require('tar')
const { downloadWithRedirects } = require('./download')

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

// Base URL for downloading OVMS binaries
const OVMS_RELEASE_BASE_URL = [
  'https://github.com/makejiang/blob/releases/download/v1.0.0/ovms250731.zip',
  'http://pet440.sh.intel.com/server1/download/ovms250731.zip',
  'http://makejiang.duckdns.org:8080/ovms250731.zip'
]



/**
 * Downloads and extracts the OVMS binary for the specified platform
 */
async function downloadOvmsBinary() {
  
  // Create output directory structure - OVMS goes into its own subdirectory
  const csDir = path.join(os.homedir(), '.cherrystudio')

  // Ensure directories exist
  fs.mkdirSync(csDir, { recursive: true })

  const tempdir = os.tmpdir()
  const tempFilename = path.join(tempdir, 'ovms.zip')

  // Try each URL until one succeeds
  let downloadSuccess = false
  let lastError = null

  for (let i = 0; i < OVMS_RELEASE_BASE_URL.length; i++) {
    const downloadUrl = OVMS_RELEASE_BASE_URL[i]
    console.log(`Attempting download from URL ${i + 1}/${OVMS_RELEASE_BASE_URL.length}: ${downloadUrl}`)

    try {
      console.log(`Downloading OVMS from ${downloadUrl} to ${tempFilename}...`)
      
      // Try PowerShell download first, fallback to Node.js download if it fails
      try {
        await downloadWithPowerShell(downloadUrl, tempFilename)
      } catch (psError) {
        console.warn(`PowerShell download failed: ${psError.message}`)
        console.log('Falling back to Node.js download method...')
        await downloadWithRedirects(downloadUrl, tempFilename)
      }

      // If we get here, download was successful
      downloadSuccess = true
      console.log(`Successfully downloaded from: ${downloadUrl}`)
      break

    } catch (error) {
      console.warn(`Download failed from ${downloadUrl}: ${error.message}`)
      lastError = error
      
      // Clean up failed download file if it exists
      if (fs.existsSync(tempFilename)) {
        try {
          fs.unlinkSync(tempFilename)
        } catch (cleanupError) {
          console.warn(`Failed to clean up temporary file: ${cleanupError.message}`)
        }
      }
      
      // Continue to next URL if this one failed
      if (i < OVMS_RELEASE_BASE_URL.length - 1) {
        console.log(`Trying next URL...`)
      }
    }
  }

  // Check if any download succeeded
  if (!downloadSuccess) {
    throw new Error(`All download URLs failed. Last error: ${lastError?.message || 'Unknown error'}`)
  }

  try {
    console.log(`Extracting to ${csDir}...`)
    
    // Use tar.exe to extract the ZIP file
    console.log(`Extracting OVMS to ${csDir}...`)
    execSync(`tar -xf ${tempFilename} -C ${csDir}`, { stdio: 'inherit' })
    console.log(`OVMS extracted to ${csDir}`)

    // Clean up temporary file
    fs.unlinkSync(tempFilename)
    console.log(`Installation directory: ${csDir}`)
    return true

  } catch (error) {
    console.error(`Error installing OVMS: ${error.message}`)

    if (fs.existsSync(tempFilename)) {
      fs.unlinkSync(tempFilename)
    }

    // Check if ovmsDir is empty and remove it if so
    try {
      const ovmsDir = path.join(csDir, 'ovms')
      const files = fs.readdirSync(ovmsDir)
      if (files.length === 0) {
        fs.rmSync(ovmsDir, { recursive: true })
        console.log(`Removed empty directory: ${ovmsDir}`)
      }
    } catch (cleanupError) {
      console.warn(`Warning: Failed to clean up directory: ${cleanupError.message}`)
    }

    return false
  }
}

/**
 * Main function to install OVMS
 */
async function installOvms() {
  const platform = os.platform()
  console.log(`Detected platform: ${platform}`)

  // only support windows
  if (platform !== 'win32') {
    console.error('OVMS installation is only supported on Windows.')
    return false
  }
  
  return await downloadOvmsBinary()
}

// Run the installation
installOvms()
  .then((success) => {
    if (success) {
      console.log('OVMS installation successful')
      process.exit(0)
    } else {
      console.error('OVMS installation failed')
      process.exit(1)
    }
  })
  .catch((error) => {
    console.error('OVMS installation failed:', error)
    process.exit(1)
  })
