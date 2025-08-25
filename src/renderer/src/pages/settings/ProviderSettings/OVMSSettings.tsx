import { FC, useEffect, useState } from 'react'
import { VStack } from '@renderer/components/Layout'
import { Alert, Button } from 'antd'
import { SettingRow, SettingSubtitle } from '..'

const OVMSSettings: FC = () => {
  const urlGuide = 'https://github.com/openvinotoolkit/model_server/blob/c55551763d02825829337b62c2dcef9339706f79/docs/deploying_server_baremetal.md'

  const [ovmsStatus, setOvmsStatus] = useState<'not-installed' | 'not-running' | 'running'>('not-running')
  const [isInstallingOvms, setIsInstallingOvms] = useState(false)
  const [isRunningOvms, setIsRunningOvms] = useState(false)
  const [isStoppingOvms, setIsStoppingOvms] = useState(false)

  useEffect(() => {
    const checkStatus = async () => {
      const status = await window.api.ovms.getStatus()
      setOvmsStatus(status)
    }
    checkStatus()
  }, [])

  const installOvms = async () => {
    try {
      setIsInstallingOvms(true)
      await window.api.installOvmsBinary()
      // 安装成功后重新检查状态
      const status = await window.api.ovms.getStatus()
      setOvmsStatus(status)
      setIsInstallingOvms(false)
    } catch (error: any) {
      window.message.error({ content: `安装失败: ${error.message}`, key: 'ovms-install-error' })
      setIsInstallingOvms(false)
    }
  }

  const runOvms = async () => {
    try {
      setIsRunningOvms(true)
      await window.api.ovms.runOvms()
      // 运行成功后重新检查状态
      const status = await window.api.ovms.getStatus()
      setOvmsStatus(status)
      setIsRunningOvms(false)
    } catch (error: any) {
      window.message.error({ content: `运行失败: ${error.message}`, key: 'ovms-run-error' })
      setIsRunningOvms(false)
    }
  }

  const stopOvms = async () => {
    try {
      setIsStoppingOvms(true)
      await window.api.ovms.stopOvms()
      // 停止成功后重新检查状态
      const status = await window.api.ovms.getStatus()
      setOvmsStatus(status)
      setIsStoppingOvms(false)
    } catch (error: any) {
      window.message.error({ content: `停止失败: ${error.message}`, key: 'ovms-stop-error' })
      setIsStoppingOvms(false)
    }
  }

  const getAlertType = () => {
    switch (ovmsStatus) {
      case 'running':
        return 'success'
      case 'not-running':
        return 'warning'
      case 'not-installed':
        return 'error'
      default:
        return 'warning'
    }
  }

  const getStatusMessage = () => {
    switch (ovmsStatus) {
      case 'running':
        return 'OVMS is running'
      case 'not-running':
        return 'OVMS is not running'
      case 'not-installed':
        return 'OVMS is not installed'
      default:
        return 'OVMS status unknown'
    }
  }

  return (
    <>
      <Alert
        type={getAlertType()}
        banner
        style={{ borderRadius: 'var(--list-item-border-radius)' }}
        description={
          <VStack>
            <SettingRow style={{ width: '100%' }}>
              <SettingSubtitle style={{ margin: 0, fontWeight: 'normal' }}>
                {getStatusMessage()}
              </SettingSubtitle>
               {ovmsStatus==='not-installed' && (
                <Button
                  type="primary"
                  onClick={installOvms}
                  loading={isInstallingOvms}
                  disabled={isInstallingOvms}
                  size="small">
                  {isInstallingOvms ? 'Installing' : 'Install'}
                </Button>
              )}
              {ovmsStatus==='not-running' && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    type="primary"
                    onClick={installOvms}
                    loading={isInstallingOvms}
                    disabled={isInstallingOvms}
                    size="small">
                     {isInstallingOvms ? 'Installing' : 'Re-Install'}
                  </Button>
                  <Button
                    type="primary"
                    onClick={runOvms}
                    loading={isRunningOvms}
                    disabled={isRunningOvms}
                    size="small">
                    {isRunningOvms ? 'Starting' : 'Run OVMS'}
                  </Button>
                </div>
              )}
              {ovmsStatus==='running' && (
                <Button
                  type="primary"
                  danger
                  onClick={stopOvms}
                  loading={isStoppingOvms}
                  disabled={isStoppingOvms}
                  size="small">
                  {isStoppingOvms ? 'Stopping' : 'Stop OVMS'}
                </Button>
              )}
            </SettingRow>
          </VStack>
        }
      />
      <Alert
        type="info"
        style={{ marginTop: 5 }}
        message={'Intel OVMS Guide:'}
        description={<div>
          <p>You may need to configure Intel OVMS yourself.</p>
          <p>Intel OVMS will be installed in '%USERPROFILE%\.cherrystudio\ovms\ovms\' .</p>
          <p>Please refer to<a href={urlGuide}>Intel OVMS Guide</a></p>
        </div>}
        showIcon
      />
    </>
  )
}


export default OVMSSettings
