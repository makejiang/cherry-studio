import {
  FileExcelFilled,
  FileImageFilled,
  FileMarkdownFilled,
  FilePdfFilled,
  FilePptFilled,
  FileTextFilled,
  FileUnknownFilled,
  FileWordFilled,
  FileZipFilled,
  FolderOpenFilled,
  GlobalOutlined,
  LinkOutlined
} from '@ant-design/icons'
import { t } from 'i18next'
import React, { memo } from 'react'
import styled from 'styled-components'

interface FileItemProps {
  fileInfo: {
    icon?: React.ReactNode
    name: React.ReactNode | string
    ext: string
    size: string
    created_at: string
    count?: number
    checkbox?: React.ReactNode
    actions: React.ReactNode
  }
  style?: React.CSSProperties
  gridTemplate?: string
}

const getFileIcon = (type?: string) => {
  if (!type) return <FileUnknownFilled />

  const ext = type.toLowerCase()

  if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)) {
    return <FileImageFilled />
  }

  if (['.doc', '.docx'].includes(ext)) {
    return <FileWordFilled />
  }
  if (['.xls', '.xlsx'].includes(ext)) {
    return <FileExcelFilled />
  }
  if (['.ppt', '.pptx'].includes(ext)) {
    return <FilePptFilled />
  }
  if (ext === '.pdf') {
    return <FilePdfFilled />
  }
  if (['.md', '.markdown'].includes(ext)) {
    return <FileMarkdownFilled />
  }

  if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(ext)) {
    return <FileZipFilled />
  }

  if (['.txt', '.json', '.log', '.yml', '.yaml', '.xml', '.csv'].includes(ext)) {
    return <FileTextFilled />
  }

  if (['.url'].includes(ext)) {
    return <LinkOutlined />
  }

  if (['.sitemap'].includes(ext)) {
    return <GlobalOutlined />
  }

  if (['.folder'].includes(ext)) {
    return <FolderOpenFilled />
  }

  return <FileUnknownFilled />
}

const FileItem: React.FC<FileItemProps> = ({ fileInfo, style, gridTemplate = '' }) => {
  const { name, ext, size, created_at, count, actions, icon, checkbox } = fileInfo

  return (
    <FileItemCard style={style}>
      <FileGrid style={{ gridTemplateColumns: gridTemplate }}>
        {checkbox && <FileCell>{checkbox}</FileCell>}
        <FileCell>
          <FileIcon>{icon || getFileIcon(ext)}</FileIcon>
        </FileCell>
        <FileCell>
          <FileNameColumn>
            <FileName>{name}</FileName>
            {count && (
              <FileCount>
                {count} {t('files.count')}
              </FileCount>
            )}
          </FileNameColumn>
        </FileCell>
        <FileCell style={{ textAlign: 'right' }}>{size}</FileCell>
        <FileCell style={{ textAlign: 'right' }}>{created_at}</FileCell>
        <FileCell style={{ justifyContent: 'center' }}>{actions}</FileCell>
      </FileGrid>
    </FileItemCard>
  )
}

const FileItemCard = styled.div`
  border-radius: 8px;
  overflow: hidden;
  border: 0.5px solid var(--color-border);
  flex-shrink: 0;
  transition:
    box-shadow 0.2s ease,
    background-color 0.2s ease;
  --shadow-color: rgba(0, 0, 0, 0.05);
  &:hover {
    box-shadow:
      0 10px 15px -3px var(--shadow-color),
      0 4px 6px -4px var(--shadow-color);
  }
  body[theme-mode='dark'] & {
    --shadow-color: rgba(255, 255, 255, 0.02);
  }
`

const FileGrid = styled.div`
  display: grid;
  gap: 8px;
  padding: 8px 8px 8px 16px;
  align-items: center;
`

const FileCell = styled.div`
  display: flex;
  align-items: center;
  min-width: 0;
`

const FileIcon = styled.div`
  max-height: 44px;
  width: 100%;
  color: var(--color-text-3);
  font-size: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`

const FileNameColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  width: 100%;
`

const FileName = styled.div`
  font-size: 15px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  transition: color 0.2s ease;
  span {
    font-size: 15px;
  }
  &:hover {
    color: var(--color-primary);
  }
`

const FileCount = styled.div`
  font-size: 13px;
  color: var(--color-text-2);
`

export default memo(FileItem)
