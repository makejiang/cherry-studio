import { getFileIcon } from '@renderer/pages/home/Inputbar/AttachmentPreview'
import React, { memo } from 'react'
import styled from 'styled-components'

interface KnowledgeFileItemProps {
  fileInfo: {
    icon?: React.ReactNode
    name: React.ReactNode | string
    ext: string
    extra?: string
    actions: React.ReactNode
  }
  style?: React.CSSProperties
}

const KnowledgeFileItem: React.FC<KnowledgeFileItemProps> = ({ fileInfo, style }) => {
  const { name, ext, extra, actions, icon } = fileInfo

  return (
    <FileItemCard style={style}>
      <FileContainer>
        <FileIconContainer>
          <FileIcon>{icon || getFileIcon(ext)}</FileIcon>
        </FileIconContainer>
        <FileContent>
          <FileNameContainer>
            <FileName>{name}</FileName>
            {extra && <FileExtra>{extra}</FileExtra>}
          </FileNameContainer>
        </FileContent>
        <FileActions>{actions}</FileActions>
      </FileContainer>
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

const FileContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  min-height: 63px;
`

const FileIconContainer = styled.div`
  flex-shrink: 0;
`

const FileIcon = styled.div`
  width: 40px;
  height: 40px;
  color: var(--color-text-3);
  font-size: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
`

const FileContent = styled.div`
  flex: 1;
  min-width: 0;
`

const FileNameContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
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

const FileExtra = styled.div`
  font-size: 13px;
  color: var(--color-text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const FileActions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
`

export default memo(KnowledgeFileItem)
