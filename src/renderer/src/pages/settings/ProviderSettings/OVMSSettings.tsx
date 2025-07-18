import { getOVMSUrlBackend } from '@renderer/hooks/useOVMS'
import { FC, useState } from 'react'
import { Alert } from 'antd'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import { SettingHelpText, SettingHelpTextRow, SettingSubtitle } from '..'

const OVMSSettings: FC = () => {
  const urlBackend = getOVMSUrlBackend()
  const [url] = useState(urlBackend)
  const { t } = useTranslation()

  return (
    <>
      <SettingSubtitle style={{ marginBottom: 5 }}>
        OVMS Backend URL:
      </SettingSubtitle>
      <Alert
        type="info"
        style={{ marginTop: 5 }}
        message={urlBackend}
        showIcon
      />
    </>
  )
}


export default OVMSSettings
