import { getOVMSUrlBackend } from '@renderer/hooks/useOVMS'
import { FC, useState } from 'react'
import { Alert } from 'antd'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import { SettingHelpText, SettingHelpTextRow, SettingSubtitle } from '..'

const OVMSSettings: FC = () => {
  const urlBackend = getOVMSUrlBackend()
  const urlGuide = 'https://github.com/openvinotoolkit/model_server/blob/c55551763d02825829337b62c2dcef9339706f79/docs/deploying_server_baremetal.md'
  const { t } = useTranslation()
  
  return (
    <>
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
