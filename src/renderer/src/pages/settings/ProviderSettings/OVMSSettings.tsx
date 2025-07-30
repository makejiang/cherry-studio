import { getOVMSUrlBackend } from '@renderer/hooks/useOVMS'
import { FC, useEffect, useState } from 'react'
import { VStack } from '@renderer/components/Layout'
import { Alert, Button } from 'antd'
import { useTranslation } from 'react-i18next'

import { SettingDescription, SettingRow, SettingSubtitle } from '..'

const OVMSSettings: FC = () => {
  const urlBackend = getOVMSUrlBackend()
  const { t } = useTranslation()
  const urlGuide = 'https://github.com/openvinotoolkit/model_server/blob/c55551763d02825829337b62c2dcef9339706f79/docs/deploying_server_baremetal.md'

  const [isOVMSRunning, setIsOVMSRunning] = useState(false)

  useEffect(() => {
    const checkStatus = async () => {
      const running = await window.api.ovms.isRunning()
      setIsOVMSRunning(running)
    }
    checkStatus()
  }, [])

  return (
    <>
      <Alert
        type={isOVMSRunning ? 'success' : 'warning'}
        banner
        style={{ borderRadius: 'var(--list-item-border-radius)' }}
        description={
          <VStack>
            <SettingRow style={{ width: '100%' }}>
              <SettingSubtitle style={{ margin: 0, fontWeight: 'normal' }}>
                {isOVMSRunning ? 'OVMS is running' : `OVMS is not running`}
              </SettingSubtitle>
            </SettingRow>
          </VStack>
        }
      />
      <Alert
        type="info"
        style={{ marginTop: 5 }}
        message={'Intel OVMS Guide:'}
        description={<div>
          <p>1. Download OVMS runtime package: <a href={urlBackend}>{urlBackend}</a></p>
          <p>2. Unzip the package.</p>
          <p>3. Run OVMS with reference documents.</p>
          <p><a href={urlGuide}>OVMS Deployment</a></p>
        </div>}
        showIcon
      />
    </>
  )
}


export default OVMSSettings
