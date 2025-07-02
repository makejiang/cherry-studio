import { RedoOutlined } from '@ant-design/icons'
import CustomTag from '@renderer/components/CustomTag'
import { HStack } from '@renderer/components/Layout'
import ListItem from '@renderer/components/ListItem'
import { useKnowledge } from '@renderer/hooks/useKnowledge'
import { NavbarIcon } from '@renderer/pages/home/Navbar'
import { getProviderName } from '@renderer/services/ProviderService'
import { KnowledgeBase } from '@renderer/types'
import { Button, Empty, Tag, Tooltip } from 'antd'
import { Book, Folder, Globe, Link, Notebook, Search, Settings2 } from 'lucide-react'
import { FC, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import KnowledgeSearchPopup from './components/KnowledgeSearchPopup'
import KnowledgeSettingsPopup from './components/KnowledgeSettingsPopup'
import KnowledgeDirectories from './items/KnowledgeDirectories'
import KnowledgeFiles from './items/KnowledgeFiles'
import KnowledgeNotes from './items/KnowledgeNotes'
import KnowledgeSitemaps from './items/KnowledgeSitemaps'
import KnowledgeUrls from './items/KnowledgeUrls'
import { KnowledgeSideNav } from './KnowledgePage'

interface KnowledgeContentProps {
  selectedBase: KnowledgeBase
}

const KnowledgeContent: FC<KnowledgeContentProps> = ({ selectedBase }) => {
  const { t } = useTranslation()
  const { base, urlItems, fileItems, directoryItems, noteItems, sitemapItems } = useKnowledge(selectedBase.id || '')
  const [activeKey, setActiveKey] = useState('files')

  const providerName = getProviderName(base?.model.provider || '')

  const knowledgeItems = [
    {
      key: 'files',
      title: t('files.title'),
      icon: <Book size={16} />,
      items: fileItems
    },
    {
      key: 'notes',
      title: t('knowledge.notes'),
      icon: <Notebook size={16} />,
      items: noteItems
    },
    {
      key: 'directories',
      title: t('knowledge.directories'),
      icon: <Folder size={16} />,
      items: directoryItems
    },
    {
      key: 'urls',
      title: t('knowledge.urls'),
      icon: <Link size={16} />,
      items: urlItems
    },
    {
      key: 'sitemaps',
      title: t('knowledge.sitemaps'),
      icon: <Globe size={16} />,
      items: sitemapItems
    }
  ]

  if (!base) {
    return null
  }

  return (
    <MainContainer>
      <HeaderContainer>
        <ModelInfo>
          <Button
            type="text"
            icon={<Settings2 size={18} color="var(--color-icon)" />}
            onClick={() => KnowledgeSettingsPopup.show({ base })}
            size="small"
          />
          <div className="model-row">
            <div className="label-column">
              <label>{t('models.embedding_model')}</label>
            </div>
            <Tooltip title={providerName} placement="bottom">
              <div className="tag-column">
                <Tag style={{ borderRadius: 20, margin: 0 }}>{base.model.name}</Tag>
              </div>
            </Tooltip>
            {base.rerankModel && <Tag style={{ borderRadius: 20, margin: 0 }}>{base.rerankModel.name}</Tag>}
          </div>
        </ModelInfo>
        <HStack gap={8} alignItems="center">
          {/* 使用selected base导致修改设置后没有响应式更新 */}
          <NarrowIcon onClick={() => base && KnowledgeSearchPopup.show({ base: base })}>
            <Search size={18} />
          </NarrowIcon>
        </HStack>
      </HeaderContainer>
      <RightContainer>
        <KnowledgeSideNav style={{ gap: 10 }}>
          {knowledgeItems.map((item) => (
            <ListItem
              key={item.key}
              title={item.title}
              icon={item.icon}
              active={activeKey === item.key}
              onClick={() => setActiveKey(item.key)}
              rightContent={
                <CustomTag size={12} color={item.items.length > 0 ? '#008001' : '#cccccc'}>
                  {item.items.length}
                </CustomTag>
              }
            />
          ))}
        </KnowledgeSideNav>
        <MainContent>
          {activeKey === 'files' && <KnowledgeFiles selectedBase={selectedBase} />}
          {activeKey === 'directories' && <KnowledgeDirectories selectedBase={selectedBase} />}
          {activeKey === 'urls' && <KnowledgeUrls selectedBase={selectedBase} />}
          {activeKey === 'sitemaps' && <KnowledgeSitemaps selectedBase={selectedBase} />}
          {activeKey === 'notes' && <KnowledgeNotes selectedBase={selectedBase} />}
        </MainContent>
      </RightContainer>
    </MainContainer>
  )
}

export const CollapseLabel = ({ label, count }: { label: string; count: number }) => {
  return (
    <HStack alignItems="center" gap={10}>
      <label style={{ fontWeight: 600 }}>{label}</label>
      <CustomTag size={12} color={count ? '#008001' : '#cccccc'}>
        {count}
      </CustomTag>
    </HStack>
  )
}

export const KnowledgeEmptyView = () => <Empty style={{ margin: 0 }} styles={{ image: { display: 'none' } }} />

export const ItemHeaderLabel = ({ label }: { label: string }) => {
  return (
    <HStack alignItems="center" gap={10}>
      <label style={{ fontWeight: 600 }}>{label}</label>
    </HStack>
  )
}

const MainContainer = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;
  position: relative;
`

const RightContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex: 1;
`

const MainContent = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 20px;
  padding-bottom: 50px;
`

const HeaderContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 16px;
  border-bottom: 0.5px solid var(--color-border);
`

const ModelInfo = styled.div`
  display: flex;
  color: var(--color-text-3);
  flex-direction: row;
  align-items: center;
  gap: 8px;
  height: 50px;

  .model-header {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .model-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }

  .label-column {
    flex-shrink: 0;
  }

  .tag-column {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
  }

  label {
    color: var(--color-text-2);
  }
`

const NarrowIcon = styled(NavbarIcon)`
  @media (max-width: 1000px) {
    display: none;
  }
`

export const ItemContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  flex: 1;
`

export const ItemHeader = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  border-bottom: 0.5px solid var(--color-border);
  padding-bottom: 10px;
  margin: 10px 15px;
`

export const StatusIconWrapper = styled.div`
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 2px;
`

export const RefreshIcon = styled(RedoOutlined)`
  font-size: 15px !important;
  color: var(--color-text-2);
`

export const ClickableSpan = styled.span`
  cursor: pointer;
  flex: 1;
  width: 0;
`

export const FlexAlignCenter = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`

export default KnowledgeContent
