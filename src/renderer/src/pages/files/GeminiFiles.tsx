import { DeleteOutlined } from '@ant-design/icons'
import type { File } from '@google/genai'
import { useProvider } from '@renderer/hooks/useProvider'
import { runAsyncFunction } from '@renderer/utils'
import { MB } from '@shared/config/constant'
import { Spin } from 'antd'
import dayjs from 'dayjs'
import { FC, useCallback, useEffect, useState } from 'react'
import styled from 'styled-components'

import FileItem from './FileItem'

interface GeminiFilesProps {
  id: string
}

const GeminiFiles: FC<GeminiFilesProps> = ({ id }) => {
  const { provider } = useProvider(id)
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)

  const fetchFiles = useCallback(async () => {
    const reponses = await window.api.fileService.list(provider.type, provider.apiKey)
    const files = reponses.files.map((file) => file.originalFile as FileMetadataResponse)
    setFiles(files)
  }, [provider])

  const columns: ColumnsType<FileMetadataResponse> = [
    {
      title: t('files.name'),
      dataIndex: 'displayName',
      key: 'displayName'
    },
    {
      title: t('files.type'),
      dataIndex: 'mimeType',
      key: 'mimeType'
    },
    {
      title: t('files.size'),
      dataIndex: 'sizeBytes',
      key: 'sizeBytes',
      render: (size: string) => `${(parseInt(size) / 1024 / 1024).toFixed(2)} MB`
    },
    {
      title: t('files.created_at'),
      dataIndex: 'createTime',
      key: 'createTime',
      render: (time: string) => new Date(time).toLocaleString()
    },
    {
      title: t('files.actions'),
      dataIndex: 'actions',
      key: 'actions',
      align: 'center',
      render: (_, record) => {
        return (
          <DeleteOutlined
            style={{ cursor: 'pointer', color: 'var(--color-error)' }}
            onClick={() => {
              setFiles(files.filter((file) => file.name !== record.name))
              window.api.fileService.delete(provider.type, provider.apiKey, record.name).catch((error) => {
                console.error('Failed to delete file:', error)
                setFiles((prev) => [...prev, record])
              })
            }}
          />
        )
      }
    }
  ]

  useEffect(() => {
    runAsyncFunction(async () => {
      try {
        setLoading(true)
        await fetchFiles()
        setLoading(false)
      } catch (error: any) {
        console.error('Failed to fetch files:', error)
        window.message.error(error.message)
        setLoading(false)
      }
    })
  }, [fetchFiles])

  useEffect(() => {
    setFiles([])
  }, [id])

  if (loading) {
    return (
      <Container>
        <LoadingWrapper>
          <Spin />
        </LoadingWrapper>
      </Container>
    )
  }

  return (
    <Container>
      <FileListContainer>
        {files.map((file) => (
          <FileItem
            key={file.name}
            fileInfo={{
              name: file.displayName,
              ext: `.${file.name?.split('.').pop()}`,
              extra: `${dayjs(file.createTime).format('MM-DD HH:mm')} · ${(parseInt(file.sizeBytes || '0') / MB).toFixed(2)} MB`,
              actions: (
                <DeleteOutlined
                  style={{ cursor: 'pointer', color: 'var(--color-error)' }}
                  onClick={() => {
                    setFiles(files.filter((f) => f.name !== file.name))
                    window.api.gemini.deleteFile(file.name!, provider.apiKey).catch((error) => {
                      console.error('Failed to delete file:', error)
                      setFiles((prev) => [...prev, file])
                    })
                  }}
                />
              )
            }}
          />
        ))}
      </FileListContainer>
    </Container>
  )
}

const Container = styled.div`
  width: 100%;
`

const FileListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const LoadingWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
`

export default GeminiFiles
