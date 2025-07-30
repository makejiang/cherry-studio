import MacOSLogo from '@renderer/assets/images/providers/macos.svg'
import OVMSLogo from '@renderer/assets/images/providers/intel.png'

export function getOcrProviderLogo(providerId: string) {
  switch (providerId) {
    case 'system':
      return MacOSLogo
    case 'ovms':
      return OVMSLogo
    default:
      return undefined
  }
}

export const OCR_PROVIDER_CONFIG = {}
