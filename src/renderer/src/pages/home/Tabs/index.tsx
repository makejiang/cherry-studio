import AddAssistantPopup from '@renderer/components/Popups/AddAssistantPopup'
import { useAssistants, useDefaultAssistant } from '@renderer/hooks/useAssistant'
import { useSettings } from '@renderer/hooks/useSettings'
import { useShowTopics } from '@renderer/hooks/useStore'
import { Assistant, Topic } from '@renderer/types'
import { uuid } from '@renderer/utils'
import { Segmented as AntSegmented } from 'antd'
import { FC } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import Assistants from './AssistantsTab'
import Settings from './SettingsTab'
import Topics from './TopicsTab'

interface Props {
  tab: Tab
  activeAssistant: Assistant
  activeTopic: Topic
  setActiveAssistant: (assistant: Assistant) => void
  setActiveTopic: (topic: Topic) => void
  position: 'left' | 'right'
  forceToSeeAllTab?: boolean
  style?: React.CSSProperties
}

type Tab = 'assistants' | 'topic' | 'settings'

const HomeTabs: FC<Props> = ({
  tab,
  activeAssistant,
  activeTopic,
  setActiveAssistant,
  setActiveTopic,
  position,
  forceToSeeAllTab,
  style
}) => {
  const { addAssistant } = useAssistants()
  const { topicPosition } = useSettings()
  const { defaultAssistant } = useDefaultAssistant()
  const { showTopics, toggleShowTopics } = useShowTopics()

  const { t } = useTranslation()

  const showTab = !(position === 'left' && topicPosition === 'right')

  const assistantTab = {
    label: t('assistants.abbr'),
    value: 'assistants'
    // icon: <BotIcon size={16} />
  }

  const onCreateAssistant = async () => {
    const assistant = await AddAssistantPopup.show()
    assistant && setActiveAssistant(assistant)
  }

  const onCreateDefaultAssistant = () => {
    const assistant = { ...defaultAssistant, id: uuid() }
    addAssistant(assistant)
    setActiveAssistant(assistant)
  }

  // useEffect(() => {
  //   const unsubscribes = [
  //     EventEmitter.on(EVENT_NAMES.SHOW_ASSISTANTS, (): any => {
  //       showTab && setTab('assistants')
  //     }),
  //     EventEmitter.on(EVENT_NAMES.SHOW_TOPIC_SIDEBAR, (): any => {
  //       showTab && setTab('topic')
  //     }),
  //     EventEmitter.on(EVENT_NAMES.SHOW_CHAT_SETTINGS, (): any => {
  //       showTab && setTab('settings')
  //     }),
  //     EventEmitter.on(EVENT_NAMES.SWITCH_TOPIC_SIDEBAR, () => {
  //       showTab && setTab('topic')
  //       if (position === 'left' && topicPosition === 'right') {
  //         toggleShowTopics()
  //       }
  //     })
  //   ]
  //   return () => unsubscribes.forEach((unsub) => unsub())
  // }, [position, showTab, tab, toggleShowTopics, topicPosition])

  // useEffect(() => {
  //   if (position === 'right' && topicPosition === 'right' && tab === 'assistants') {
  //     setTab('topic')
  //   }
  //   if (position === 'left' && topicPosition === 'right' && forceToSeeAllTab != true && tab !== 'assistants') {
  //     setTab('assistants')
  //   }
  // }, [position, tab, topicPosition, forceToSeeAllTab])

  return (
    <Container style={{ ...style }} className="home-tabs">
      <TabContent className="home-tabs-content">
        {tab === 'assistants' && (
          <Assistants
            activeAssistant={activeAssistant}
            setActiveAssistant={setActiveAssistant}
            onCreateAssistant={onCreateAssistant}
            onCreateDefaultAssistant={onCreateDefaultAssistant}
          />
        )}
        {tab === 'topic' && (
          <Topics assistant={activeAssistant} activeTopic={activeTopic} setActiveTopic={setActiveTopic} />
        )}
        {tab === 'settings' && <Settings assistant={activeAssistant} />}
      </TabContent>
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  max-width: var(--assistants-width);
  min-width: var(--assistants-width);
  background-color: transparent;
  overflow: hidden;
  .collapsed {
    width: 0;
    border-left: none;
  }
`

const TabContent = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
`

const Divider = styled.div`
  border-top: 0.5px solid var(--color-border);
  margin-top: 10px;
  margin-left: 10px;
  margin-right: 10px;
`

const Segmented = styled(AntSegmented)`
  font-family: var(--font-family);

  &.ant-segmented {
    background-color: transparent;
    margin: 0 10px;
    margin-top: 10px;
    padding: 0;
  }
  .ant-segmented-item {
    overflow: hidden;
    transition: none !important;
    height: 34px;
    line-height: 34px;
    background-color: transparent;
    user-select: none;
    border-radius: var(--list-item-border-radius);
    box-shadow: none;
  }
  .ant-segmented-item-selected,
  .ant-segmented-item-selected:active {
    transition: none !important;
    background-color: var(--color-list-item);
  }
  .ant-segmented-item-label {
    align-items: center;
    display: flex;
    flex-direction: row;
    justify-content: center;
    font-size: 13px;
    height: 100%;
  }
  .ant-segmented-item-label[aria-selected='true'] {
    color: var(--color-text);
  }
  .icon-business-smart-assistant {
    margin-right: -2px;
  }
  .ant-segmented-thumb {
    transition: none !important;
    background-color: var(--color-list-item);
    border-radius: var(--list-item-border-radius);
    box-shadow: none;
    &:hover {
      background-color: transparent;
    }
  }
  .ant-segmented-item-label,
  .ant-segmented-item-icon {
    display: flex;
    align-items: center;
  }
  /* These styles ensure the same appearance as before */
  border-radius: 0;
  box-shadow: none;
`

export default HomeTabs
