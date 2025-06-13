import {
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined
} from '@ant-design/icons'
import { NavbarCenter, NavbarMain } from '@renderer/components/app/Navbar'
import ListItem from '@renderer/components/ListItem'
import TextEditPopup from '@renderer/components/Popups/TextEditPopup'
import Logger from '@renderer/config/logger'
import db from '@renderer/databases'
import FileManager from '@renderer/services/FileManager'
import store from '@renderer/store'
import { FileType, FileTypes } from '@renderer/types'
import { Message } from '@renderer/types/newMessage'
import { formatFileSize } from '@renderer/utils'
import { Button, Checkbox, Empty, Flex, Popconfirm } from 'antd'
import dayjs from 'dayjs'
import { useLiveQuery } from 'dexie-react-hooks'
import { File as FileIcon, FileImage, FileText, FileType as FileTypeIcon } from 'lucide-react'
import { FC, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import FileList from './FileList'

const GRID_TEMPLATE = 'auto 60px 1fr 120px 140px 100px'

type SortField = 'created_at' | 'size' | 'name'
type SortOrder = 'asc' | 'desc'

const FilesPage: FC = () => {
  const { t } = useTranslation()
  const [fileType, setFileType] = useState<string>('document')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([])

  const tempFilesSort = (files: FileType[]) => {
    return files.sort((a, b) => {
      const aIsTemp = a.origin_name.startsWith('temp_file')
      const bIsTemp = b.origin_name.startsWith('temp_file')
      if (aIsTemp && !bIsTemp) return 1
      if (!aIsTemp && bIsTemp) return -1
      return 0
    })
  }

  const sortFiles = (files: FileType[]) => {
    return [...files].sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'created_at':
          comparison = dayjs(a.created_at).unix() - dayjs(b.created_at).unix()
          break
        case 'size':
          comparison = a.size - b.size
          break
        case 'name':
          comparison = a.origin_name.localeCompare(b.origin_name)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }

  const files = useLiveQuery<FileType[]>(() => {
    if (fileType === 'all') {
      return db.files.orderBy('count').toArray().then(tempFilesSort)
    }
    return db.files.where('type').equals(fileType).sortBy('count').then(tempFilesSort)
  }, [fileType])

  const sortedFiles = files ? sortFiles(files) : []

  const handleDelete = async (fileId: string) => {
    const file = await FileManager.getFile(fileId)
    if (!file) return

    const paintings = await store.getState().paintings.paintings
    const paintingsFiles = paintings.flatMap((p) => p.files)

    if (paintingsFiles.some((p) => p.id === fileId)) {
      window.modal.warning({ content: t('files.delete.paintings.warning'), centered: true })
      return
    }
    if (file) {
      await FileManager.deleteFile(fileId, true)
    }

    const relatedBlocks = await db.message_blocks.where('file.id').equals(fileId).toArray()

    const blockIdsToDelete = relatedBlocks.map((block) => block.id)

    const blocksByMessageId: Record<string, string[]> = {}
    for (const block of relatedBlocks) {
      if (!blocksByMessageId[block.messageId]) {
        blocksByMessageId[block.messageId] = []
      }
      blocksByMessageId[block.messageId].push(block.id)
    }

    try {
      const affectedMessageIds = [...new Set(relatedBlocks.map((b) => b.messageId))]

      if (affectedMessageIds.length === 0 && blockIdsToDelete.length > 0) {
        // This case should ideally not happen if relatedBlocks were found,
        // but handle it just in case: only delete blocks.
        await db.message_blocks.bulkDelete(blockIdsToDelete)
        Logger.log(
          `Deleted ${blockIdsToDelete.length} blocks related to file ${fileId}. No associated messages found (unexpected).`
        )
        return
      }

      await db.transaction('rw', db.topics, db.message_blocks, async () => {
        // Fetch all topics (potential performance bottleneck if many topics)
        const allTopics = await db.topics.toArray()
        const topicsToUpdate: Record<string, { messages: Message[] }> = {} // Store updates keyed by topicId

        for (const topic of allTopics) {
          let topicModified = false
          // Ensure topic.messages exists and is an array before mapping
          const currentMessages = Array.isArray(topic.messages) ? topic.messages : []
          const updatedMessages = currentMessages.map((message) => {
            // Check if this message is affected
            if (affectedMessageIds.includes(message.id)) {
              // Ensure message.blocks exists and is an array
              const currentBlocks = Array.isArray(message.blocks) ? message.blocks : []
              const originalBlockCount = currentBlocks.length
              // Filter out the blocks marked for deletion
              const newBlocks = currentBlocks.filter((blockId) => !blockIdsToDelete.includes(blockId))
              if (newBlocks.length < originalBlockCount) {
                topicModified = true
                return { ...message, blocks: newBlocks } // Return updated message
              }
            }
            return message // Return original message
          })

          if (topicModified) {
            // Store the update for this topic
            topicsToUpdate[topic.id] = { messages: updatedMessages }
          }
        }

        // Apply updates to topics
        const updatePromises = Object.entries(topicsToUpdate).map(([topicId, updateData]) =>
          db.topics.update(topicId, updateData)
        )
        await Promise.all(updatePromises)

        // Finally, delete the MessageBlocks
        await db.message_blocks.bulkDelete(blockIdsToDelete)
      })

      Logger.log(`Deleted ${blockIdsToDelete.length} blocks and updated relevant topic messages for file ${fileId}.`)
    } catch (error) {
      Logger.error(`Error updating topics or deleting blocks for file ${fileId}:`, error)
      window.modal.error({ content: t('files.delete.db_error'), centered: true }) // 提示数据库操作失败
      // Consider whether to attempt to restore the physical file (usually difficult)
    }
  }

  const handleRename = async (fileId: string) => {
    const file = await FileManager.getFile(fileId)
    if (file) {
      const newName = await TextEditPopup.show({ text: file.origin_name })
      if (newName) {
        FileManager.updateFile({ ...file, origin_name: newName })
      }
    }
  }

  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFileIds(sortedFiles.map((file) => file.id))
    } else {
      setSelectedFileIds([])
    }
  }

  // 单个文件选择
  const handleFileSelect = (fileId: string, checked: boolean) => {
    if (checked) {
      setSelectedFileIds((prev) => [...prev, fileId])
    } else {
      setSelectedFileIds((prev) => prev.filter((id) => id !== fileId))
    }
  }

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedFileIds.length === 0) return

    try {
      for (const fileId of selectedFileIds) {
        await handleDelete(fileId)
      }
      setSelectedFileIds([])
    } catch (error) {
      Logger.error('Batch delete error:', error)
    }
  }

  const dataSource = sortedFiles?.map((file) => {
    return {
      key: file.id,
      file: <span onClick={() => window.api.file.openPath(file.path)}>{FileManager.formatFileName(file)}</span>,
      size: formatFileSize(file.size),
      size_bytes: file.size,
      count: file.count,
      path: file.path,
      ext: file.ext,
      created_at: dayjs(file.created_at).format('MM-DD HH:mm'),
      created_at_unix: dayjs(file.created_at).unix(),
      checkbox: (
        <Checkbox
          checked={selectedFileIds.includes(file.id)}
          onChange={(e) => handleFileSelect(file.id, e.target.checked)}
        />
      ),
      actions: (
        <Flex align="center" gap={0} style={{ opacity: 0.7 }}>
          <Button type="text" icon={<EditOutlined />} onClick={() => handleRename(file.id)} />
          <Popconfirm
            title={t('files.delete.title')}
            description={t('files.delete.content', { count: 1 })}
            okText={t('common.confirm')}
            cancelText={t('common.cancel')}
            onConfirm={() => handleDelete(file.id)}
            icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Flex>
      )
    }
  })

  const menuItems = [
    { key: FileTypes.DOCUMENT, label: t('files.document'), icon: <FileIcon size={16} /> },
    { key: FileTypes.IMAGE, label: t('files.image'), icon: <FileImage size={16} /> },
    { key: FileTypes.TEXT, label: t('files.text'), icon: <FileTypeIcon size={16} /> },
    { key: 'all', label: t('files.all'), icon: <FileText size={16} /> }
  ]

  return (
    <Container>
      <NavbarMain>
        <NavbarCenter style={{ borderRight: 'none' }}>{t('files.title')}</NavbarCenter>
      </NavbarMain>
      <ContentContainer id="content-container">
        <SideNav>
          {menuItems.map((item) => (
            <ListItem
              key={item.key}
              icon={item.icon}
              title={item.label}
              active={fileType === item.key}
              onClick={() => setFileType(item.key as FileTypes)}
            />
          ))}
        </SideNav>
        <MainContent>
          <TableHeader>
            <TableGrid style={{ gridTemplateColumns: GRID_TEMPLATE }}>
              <TableCell>
                <CheckboxContainer className={`header-checkbox ${selectedFileIds.length > 0 ? 'selected' : ''}`}>
                  <Checkbox
                    indeterminate={selectedFileIds.length > 0 && selectedFileIds.length < sortedFiles.length}
                    checked={selectedFileIds.length === sortedFiles.length && sortedFiles.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    disabled={sortedFiles.length === 0}
                  />
                </CheckboxContainer>
              </TableCell>
              <TableCell>{/* 图标列 */}</TableCell>
              <TableCell>
                <SortButton
                  active={sortField === 'name'}
                  onClick={() => {
                    if (sortField === 'name') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                    } else {
                      setSortField('name')
                      setSortOrder('desc')
                    }
                  }}>
                  {t('files.name')}
                  {sortField === 'name' &&
                    (sortOrder === 'desc' ? <SortDescendingOutlined /> : <SortAscendingOutlined />)}
                </SortButton>
              </TableCell>
              <TableCell>
                <SortButton
                  active={sortField === 'size'}
                  onClick={() => {
                    if (sortField === 'size') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                    } else {
                      setSortField('size')
                      setSortOrder('desc')
                    }
                  }}>
                  {t('files.size')}
                  {sortField === 'size' &&
                    (sortOrder === 'desc' ? <SortDescendingOutlined /> : <SortAscendingOutlined />)}
                </SortButton>
              </TableCell>
              <TableCell>
                <SortButton
                  active={sortField === 'created_at'}
                  onClick={() => {
                    if (sortField === 'created_at') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                    } else {
                      setSortField('created_at')
                      setSortOrder('desc')
                    }
                  }}>
                  {t('files.created_at')}
                  {sortField === 'created_at' &&
                    (sortOrder === 'desc' ? <SortDescendingOutlined /> : <SortAscendingOutlined />)}
                </SortButton>
              </TableCell>
              <TableCell style={{ justifyContent: 'center' }}>
                {selectedFileIds.length > 0 && (
                  <Popconfirm
                    title={t('files.delete.title')}
                    description={t('files.delete.content', { count: selectedFileIds.length })}
                    okText={t('common.confirm')}
                    cancelText={t('common.cancel')}
                    onConfirm={handleBatchDelete}
                    icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}>
                    <Button type="text" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                )}
              </TableCell>
            </TableGrid>
          </TableHeader>

          {dataSource && dataSource?.length > 0 ? (
            <FileList
              id={fileType}
              list={dataSource}
              files={sortedFiles}
              selectedFileIds={selectedFileIds}
              onFileSelect={handleFileSelect}
              columnWidths={GRID_TEMPLATE}
            />
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </MainContent>
      </ContentContainer>
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  height: calc(100vh - var(--navbar-height));
`

const MainContent = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
`

const ContentContainer = styled.div`
  display: flex;
  flex: 1;
  flex-direction: row;
  min-height: 100%;
`

const SideNav = styled.div`
  display: flex;
  flex-direction: column;
  width: var(--settings-width);
  border-right: 0.5px solid var(--color-border);
  padding: 12px 10px;
  user-select: none;
  gap: 6px;

  .ant-menu {
    border-inline-end: none !important;
    background: transparent;
  }

  .ant-menu-item {
    height: 36px;
    line-height: 36px;
    margin: 4px 0;
    width: 100%;
    border-radius: var(--list-item-border-radius);
    border: 0.5px solid transparent;

    &:hover {
      background-color: var(--color-background-soft) !important;
    }

    &.ant-menu-item-selected {
      background-color: var(--color-background-soft);
      color: var(--color-primary);
      border: 0.5px solid var(--color-border);
      color: var(--color-text);
    }
  }
`

const SortButton = styled.div<{ active?: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  height: 30px;
  color: ${(props) => (props.active ? 'var(--color-text)' : 'var(--color-text-secondary)')};
  font-weight: ${(props) => (props.active ? '500' : '400')};
  cursor: pointer;
  z-index: 1;

  &::before {
    content: '';
    position: absolute;
    top: -4px;
    left: -8px;
    right: -8px;
    bottom: -4px;
    border-radius: var(--list-item-border-radius);
    border: 0.5px solid ${(props) => (props.active ? 'var(--color-border)' : 'transparent')};
    background-color: ${(props) => (props.active ? 'var(--color-background-soft)' : 'transparent')};
    transition: all 0.2s ease;
    z-index: -1;
  }

  &:hover::before {
    background-color: var(--color-background-soft);
    border-color: var(--color-border);
  }

  > * {
    position: relative;
    z-index: 2;
  }

  .anticon {
    font-size: 12px;
  }
`

const TableGrid = styled.div`
  display: grid;
  gap: 8px;
  padding: 8px 8px 0px 16px;
  align-items: center;
`

const TableCell = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;

  &:last-child {
    justify-content: center;
  }
`

const TableHeader = styled.div`
  margin: 0 16px;

  .header-checkbox {
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  &:hover .header-checkbox {
    opacity: 1;
  }

  .header-checkbox.selected {
    opacity: 1;
  }
`

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`

export default FilesPage
