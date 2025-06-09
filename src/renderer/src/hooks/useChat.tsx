import { EVENT_NAMES, EventEmitter } from '@renderer/services/EventService'
import { useAppDispatch, useAppSelector } from '@renderer/store'
import { setActiveAssistant, setActiveTopic } from '@renderer/store/runtime'
import { loadTopicMessagesThunk } from '@renderer/store/thunk/messageThunk'
import { Assistant } from '@renderer/types'
import { Topic } from '@renderer/types'
import { find } from 'lodash'
import { useEffect } from 'react'

import { useAssistants } from './useAssistant'

export const useChat = () => {
  const { assistants } = useAssistants()
  const activeAssistant = useAppSelector((state) => state.runtime.chat.activeAssistant) || assistants[0]
  const activeTopic = useAppSelector((state) => state.runtime.chat.activeTopic) || activeAssistant?.topics[0]!
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (activeTopic) {
      dispatch(loadTopicMessagesThunk(activeTopic.id))
      EventEmitter.emit(EVENT_NAMES.CHANGE_TOPIC, activeTopic)
    }
  }, [activeTopic, dispatch])

  useEffect(() => {
    // activeTopic not in assistant.topics
    if (activeAssistant && !find(activeAssistant.topics, { id: activeTopic?.id })) {
      dispatch(setActiveTopic(activeAssistant.topics[0]))
    }
  }, [activeTopic?.id, activeAssistant, dispatch])

  return {
    activeAssistant,
    activeTopic,
    setActiveAssistant: (assistant: Assistant) => {
      dispatch(setActiveAssistant(assistant))
    },
    setActiveTopic: (topic: Topic) => {
      dispatch(setActiveTopic(topic))
    }
  }
}
