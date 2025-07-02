import { app } from 'electron'
import os from 'os'

/**
 * System information interface
 */
export interface SystemInfo {
  platform: NodeJS.Platform
  arch: string
  osRelease: string
  appVersion: string
  osString: string
  archString: string
}

/**
 * Get basic system constants for quick access
 * @returns {Object} Basic system constants
 */
export function getSystemConstants() {
  return {
    platform: process.platform,
    arch: process.arch,
    osRelease: os.release(),
    appVersion: app.getVersion()
  }
}

/**
 * Get system information
 * @returns {SystemInfo} Complete system information object
 */
export function getSystemInfo(): SystemInfo {
  const platform = process.platform
  const arch = process.arch
  const osRelease = os.release()
  const appVersion = app.getVersion()

  let osString = ''

  switch (platform) {
    case 'win32': {
      // Get Windows version
      const parts = osRelease.split('.')
      const buildNumber = parseInt(parts[2], 10)
      osString = buildNumber >= 22000 ? 'Windows 11' : 'Windows 10'
      break
    }
    case 'darwin': {
      // macOS version handling
      const macVersion = osRelease.split('.').slice(0, 2).join('_')
      osString = `Intel Mac OS X ${macVersion}`
      if (arch === 'arm64') {
        osString = `Mac OS X ${macVersion}`
      }
      break
    }
    case 'linux': {
      osString = `Linux ${arch}`
      break
    }
    default: {
      osString = `${platform} ${arch}`
    }
  }

  const archString = arch === 'x64' ? 'x86_64' : arch === 'arm64' ? 'arm64' : arch

  return {
    platform,
    arch,
    osRelease,
    appVersion,
    osString,
    archString
  }
}

/**
 * Generate User-Agent string based on user system data
 * @returns {string} Dynamically generated User-Agent string
 */
export function generateUserAgent(): string {
  const systemInfo = getSystemInfo()

  return `Mozilla/5.0 (${systemInfo.osString}; ${systemInfo.archString}) AppleWebKit/537.36 (KHTML, like Gecko) CherryStudio/${systemInfo.appVersion} Chrome/124.0.0.0 Safari/537.36`
}
