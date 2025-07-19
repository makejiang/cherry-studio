import { TopView } from '@renderer/components/TopView'
import { Button, Flex, Form, FormProps, Input, Modal, Progress } from 'antd'
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
  timeout: number
}

const PopupContainer: React.FC<Props> = ({ title, resolve }) => {
  const [open, setOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
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
        const increment = prev < 30 ? Math.random() * 3 + 1 : 
                         prev < 60 ? Math.random() * 2 + 0.5 : 
                         Math.random() * 1 + 0.25
        return Math.min(prev + increment, 95)
      })
    }, 400)
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

  const onCancel = () => {
    if (loading) return
    setOpen(false)
  }

  const onClose = () => {
    resolve({})
  }

  const onFinish: FormProps<FieldType>['onFinish'] = async (values) => {
    setLoading(true)
    startFakeProgress()
    try {
      const { modelName, modelId, timeout } = values
      console.log(`🔄 Downloading model: ${modelName} with ID: ${modelId}, timeout: ${timeout}`)
      const result = await window.api.ovms.addModel(modelName, modelId, timeout)

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
        Modal.error({
          title: t('settings.models.download.ov.error'),
          content: (<div dangerouslySetInnerHTML={{ __html: result.message}}></div>),
          onOk: () => {
            // Keep the form open for retry
          }
        })
      }
    } catch (error: any) {
      stopFakeProgress(false) // Reset progress on error
      Modal.error({
        title: t('settings.models.download.ov.error'),
        content: error.message,
        onOk: () => {
          // Keep the form open for retry
        }
      })
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
    >
      <Form
        form={form}
        labelCol={{ flex: '110px' }}
        labelAlign="left"
        colon={false}
        style={{ marginTop: 25 }}
        onFinish={onFinish}
        disabled={loading}
      >
        <Form.Item
          name="modelName"
          label={t('settings.models.add.model_name')}
          rules={[{ required: true, message: t('settings.models.download.ov.model_name.required') }]}
        >
          <Input
            placeholder={t('settings.models.download.ov.model_name.placeholder')}
            spellCheck={false}
            maxLength={200}
          />
        </Form.Item>
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
          />
        </Form.Item>
        <Form.Item
          name="timeout"
          label={t('settings.models.download.ov.timeout.label')}
          initialValue={300}
          rules={[{ required: true, message: t('settings.models.download.ov.timeout.required') },
            { type: 'number', min: 60, max: 3600, message: t('settings.models.download.ov.timeout.range'),
                // Add this transform function
                transform: (value) => {
                    if (value) {
                    return Number(value);
                    }
                    return value;
                },
            }
          ]}
        >
          <Input
            type="number"
            min={60}
            max={3600}
            suffix="seconds"
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
          </Form.Item>
        )}
        <Form.Item style={{ marginBottom: 8, textAlign: 'center' }}>
          <Flex justify="end" align="center" style={{ position: 'relative' }}>
            <Button type="primary" htmlType="submit" size="middle" loading={loading}>
              {t('settings.models.download.ov.button')}
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
