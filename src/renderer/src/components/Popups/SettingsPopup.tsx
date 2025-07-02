import AboutSettings from '@renderer/pages/settings/AboutSettings'
import DataSettings from '@renderer/pages/settings/DataSettings/DataSettings'
import DisplaySettings from '@renderer/pages/settings/DisplaySettings/DisplaySettings'
import GeneralSettings from '@renderer/pages/settings/GeneralSettings'
import ModelSettings from '@renderer/pages/settings/ModelSettings/ModelSettings'
import ProvidersList from '@renderer/pages/settings/ProviderSettings'
import QuickAssistantSettings from '@renderer/pages/settings/QuickAssistantSettings'
import QuickPhraseSettings from '@renderer/pages/settings/QuickPhraseSettings'
import SelectionAssistantSettings from '@renderer/pages/settings/SelectionAssistantSettings/SelectionAssistantSettings'
import ShortcutSettings from '@renderer/pages/settings/ShortcutSettings'
import WebSearchSettings from '@renderer/pages/settings/WebSearchSettings'
import { Modal, Spin } from 'antd'
import {
  Cloud,
  Command,
  Globe,
  HardDrive,
  Info,
  MonitorCog,
  Package,
  Rocket,
  Settings2,
  TextCursorInput,
  Zap
} from 'lucide-react'
import React, { Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import { TopView } from '../TopView'

type SettingsTab =
  | 'provider'
  | 'model'
  | 'web-search'
  | 'general'
  | 'display'
  | 'shortcut'
  | 'quickAssistant'
  | 'selectionAssistant'
  | 'data'
  | 'about'
  | 'quickPhrase'

interface SettingsPopupShowParams {
  defaultTab?: SettingsTab
}

interface Props extends SettingsPopupShowParams {
  resolve?: (value: any) => void
}

const SettingsPopupContainer: React.FC<Props> = ({ defaultTab = 'provider', resolve }) => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<SettingsTab>(defaultTab)
  const [open, setOpen] = useState(true)

  const menuItems = [
    { key: 'provider', icon: <Cloud size={18} />, label: t('settings.provider.title') },
    { key: 'model', icon: <Package size={18} />, label: t('settings.model') },
    { key: 'web-search', icon: <Globe size={18} />, label: t('settings.websearch.title') },
    { key: 'general', icon: <Settings2 size={18} />, label: t('settings.general') },
    { key: 'display', icon: <MonitorCog size={18} />, label: t('settings.display.title') },
    { key: 'shortcut', icon: <Command size={18} />, label: t('settings.shortcuts.title') },
    { key: 'quickAssistant', icon: <Rocket size={18} />, label: t('settings.quickAssistant.title') },
    { key: 'selectionAssistant', icon: <TextCursorInput size={18} />, label: t('selection.name') },
    { key: 'quickPhrase', icon: <Zap size={18} />, label: t('settings.quickPhrase.title') },
    { key: 'data', icon: <HardDrive size={18} />, label: t('settings.data.title') },
    { key: 'about', icon: <Info size={18} />, label: t('settings.about') }
  ] as const

  const renderContent = () => {
    switch (activeTab) {
      case 'provider':
        return (
          <Suspense fallback={<Spin />}>
            <ProvidersList />
          </Suspense>
        )
      case 'model':
        return <ModelSettings />
      case 'web-search':
        return <WebSearchSettings />
      case 'general':
        return <GeneralSettings />
      case 'display':
        return <DisplaySettings />
      case 'shortcut':
        return <ShortcutSettings />
      case 'quickAssistant':
        return <QuickAssistantSettings />
      case 'selectionAssistant':
        return <SelectionAssistantSettings />
      case 'data':
        return <DataSettings />
      case 'about':
        return <AboutSettings />
      case 'quickPhrase':
        return <QuickPhraseSettings />
      default:
        return <ProvidersList />
    }
  }

  const onCancel = () => {
    setOpen(false)
  }

  const onAfterClose = () => {
    resolve && resolve(null)
    TopView.hide(TopViewKey)
  }

  // 设置全局隐藏方法
  SettingsPopup.hide = onCancel

  return (
    <StyledModal
      title={t('settings.title')}
      open={open}
      onCancel={onCancel}
      afterClose={onAfterClose}
      footer={null}
      width={1000}
      centered
      destroyOnClose>
      <ContentContainer>
        <SettingMenus>
          {menuItems.map((item) => (
            <MenuItem
              key={item.key}
              className={activeTab === item.key ? 'active' : ''}
              onClick={() => setActiveTab(item.key as SettingsTab)}>
              {item.icon}
              {item.label}
            </MenuItem>
          ))}
        </SettingMenus>
        <SettingContent>{renderContent()}</SettingContent>
      </ContentContainer>
    </StyledModal>
  )
}

const TopViewKey = 'SettingsPopup'

export default class SettingsPopup {
  static hide() {
    TopView.hide(TopViewKey)
  }

  static show(props: SettingsPopupShowParams = {}) {
    return new Promise<any>((resolve) => {
      TopView.show(<SettingsPopupContainer {...props} resolve={resolve} />, TopViewKey)
    })
  }
}

const StyledModal = styled(Modal)`
  .ant-modal-content {
    height: 80vh;
    display: flex;
    flex-direction: column;
  }

  .ant-modal-body {
    flex: 1;
    padding: 0;
    overflow: hidden;
  }
`

const ContentContainer = styled.div`
  display: flex;
  flex: 1;
  height: 100%;
`

const SettingMenus = styled.div`
  display: flex;
  flex-direction: column;
  min-width: var(--settings-width);
  border-right: 0.5px solid var(--color-border);
  padding: 10px;
  user-select: none;
  background: var(--color-background);
`

const MenuItem = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  width: 100%;
  cursor: pointer;
  border-radius: var(--list-item-border-radius);
  font-weight: 500;
  transition: all 0.2s ease-in-out;
  border: 0.5px solid transparent;
  margin-bottom: 5px;

  .anticon {
    font-size: 16px;
    opacity: 0.8;
  }

  .iconfont {
    font-size: 18px;
    line-height: 18px;
    opacity: 0.7;
    margin-left: -1px;
  }

  &:hover {
    background: var(--color-background-soft);
  }

  &.active {
    background: var(--color-background-soft);
    border: 0.5px solid var(--color-border);
  }
`

const SettingContent = styled.div`
  display: flex;
  height: 100%;
  flex: 1;
  overflow: auto;
`
