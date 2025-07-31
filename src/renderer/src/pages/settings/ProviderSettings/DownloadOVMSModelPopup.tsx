import { TopView } from '@renderer/components/TopView'
import { Button, Flex, Form, FormProps, Input, Modal, Progress, Select } from 'antd'
import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

interface ShowParams {
  title: string
}

interface Props extends ShowParams {
  resolve: (data: any) => void
}

type FieldType = {
  modelName: string
  modelId: string
  modelSource: string
}

const PopupContainer: React.FC<Props> = ({ title, resolve }) => {
  const [open, setOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [cancelled, setCancelled] = useState(false)
  const [form] = Form.useForm()
  const { t } = useTranslation()
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup progress interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [])

  const startFakeProgress = () => {
    setProgress(0)
    progressIntervalRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          return prev // Stop at 90% until actual completion
        }
        // Simulate realistic download progress with slowing speed
        const increment = prev < 30 ? Math.random() * 1 + 0.25 : 
                         prev < 60 ? Math.random() * 0.5 + 0.125 : 
                         Math.random() * 0.25 + 0.03125

        return Math.min(prev + increment, 95)
      })
    }, 500)
  }

  const stopFakeProgress = (complete = false) => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
    if (complete) {
      setProgress(100)
      // Reset progress after a short delay
      setTimeout(() => setProgress(0), 1500)
    } else {
      setProgress(0)
    }
  }

  const onCancel = async () => {
    if (loading) {
      // Stop the download
      try {
        setCancelled(true) // Mark as cancelled by user
        console.log('Stopping download...')
        await window.api.ovms.stopAddModel()
        stopFakeProgress(false)
        setLoading(false)
      } catch (error) {
        console.error('Failed to stop download:', error)
      }
      return
    }
    setOpen(false)
  }

  const onClose = () => {
    resolve({})
  }

  const onFinish: FormProps<FieldType>['onFinish'] = async (values) => {
    setLoading(true)
    setCancelled(false) // Reset cancelled state
    startFakeProgress()
    try {
      const { modelName, modelId, modelSource } = values
      console.log(`🔄 Downloading model: ${modelName} with ID: ${modelId}, source: ${modelSource}`)
      const result = await window.api.ovms.addModel(modelName, modelId, modelSource)

      if (result.success) {
        stopFakeProgress(true) // Complete the progress bar
        Modal.success({
          title: t('settings.models.download.ov.success'),
          content: t('settings.models.download.ov.success.content', { modelName:modelName, modelId:modelId }),
          onOk: () => {
            setOpen(false)
          }
        })
      } else {
        stopFakeProgress(false) // Reset progress on error
        console.error('Download failed, is it cancelled?', cancelled)
        // Only show error if not cancelled by user
        if (!cancelled) {
          Modal.error({
            title: t('settings.models.download.ov.error'),
            content: (<div dangerouslySetInnerHTML={{ __html: result.message}}></div>),
            onOk: () => {
              // Keep the form open for retry
            }
          })
        }
      }
    } catch (error: any) {
      stopFakeProgress(false) // Reset progress on error
      console.error('Download creashed, is it cancelled?', cancelled)
      // Only show error if not cancelled by user
      if (!cancelled) {
        Modal.error({
          title: t('settings.models.download.ov.error'),
          content: error.message,
          onOk: () => {
            // Keep the form open for retry
          }
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      maskClosable={false}
      afterClose={onClose}
      footer={null}
      transitionName="animation-move-down"
      centered
      closeIcon={!loading}
    >
      <Form
        form={form}
        labelCol={{ flex: '110px' }}
        labelAlign="left"
        colon={false}
        style={{ marginTop: 25 }}
        onFinish={onFinish}
        disabled={false}
      >
        <Form.Item
          name="modelId"
          label={t('settings.models.add.model_id')}
          rules={[
            { required: true, message: t('settings.models.download.ov.model_id.required') },
            {
              pattern: /^OpenVINO\/.+/,
              message: t('settings.models.download.ov.model_id.model_id_pattern')
            }
          ]}
        >
          <Input
            placeholder={t('settings.models.download.ov.model_id.placeholder')}
            spellCheck={false}
            maxLength={200}
            disabled={loading}
            onChange={(e) => {
              const modelId = e.target.value
              if (modelId) {
                // Extract model name from model ID (part after last '/')
                const lastSlashIndex = modelId.lastIndexOf('/')
                if (lastSlashIndex !== -1 && lastSlashIndex < modelId.length - 1) {
                  const modelName = modelId.substring(lastSlashIndex + 1)
                  form.setFieldValue('modelName', modelName)
                }
              }
            }}
          />
        </Form.Item>
        <Form.Item
          name="modelName"
          label={t('settings.models.add.model_name')}
          rules={[{ required: true, message: t('settings.models.download.ov.model_name.required') }]}
        >
          <Input
            placeholder={t('settings.models.download.ov.model_name.placeholder')}
            spellCheck={false}
            maxLength={200}
            disabled={loading}
          />
        </Form.Item>
        <Form.Item
          name="modelSource"
          label={t('settings.models.add.model_source')}
          initialValue="https://hf-mirror.com"
          rules={[{ required: false}]}
        >
          <Select
            options={[
              { value: '', label: 'HuggingFace' },
              { value: 'https://hf-mirror.com', label: 'HF-Mirror' },
              { value: 'https://www.modelscope.cn/models', label: 'ModelScope' }
            ]}
            disabled={loading}
          />
        </Form.Item>
        {loading && (
          <Form.Item style={{ marginBottom: 16 }}>
            <Progress 
              percent={Math.round(progress)} 
              status={progress === 100 ? 'success' : 'active'}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
              showInfo={true}
              format={(percent) => `${percent}%`}
            />
            <div style={{ textAlign: 'center', marginTop: 8, color: '#666', fontSize: '14px' }}>
              The model is downloading, sometimes it takes hours. Please be patient...
            </div>
          </Form.Item>
        )}
        <Form.Item style={{ marginBottom: 8, textAlign: 'center' }}>
          <Flex justify="end" align="center" style={{ position: 'relative' }}>
            <Button 
              type="primary" 
              htmlType={loading ? "button" : "submit"} 
              size="middle" 
              loading={false}
              onClick={loading ? onCancel : undefined}
            >
              {loading ? t('common.cancel') : t('settings.models.download.ov.button')}
            </Button>
          </Flex>
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default class DownloadOVMSModelPopup {
  static topviewId = 0
  static hide() {
    TopView.hide('DownloadOVMSModelPopup')
  }
  static show(props: ShowParams) {
    return new Promise<any>((resolve) => {
      TopView.show(
        <PopupContainer
          {...props}
          resolve={(v) => {
            resolve(v)
            this.hide()
          }}
        />,
        'DownloadOVMSModelPopup'
      )
    })
  }
}
