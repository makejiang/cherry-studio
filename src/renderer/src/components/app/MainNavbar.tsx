import { EVENT_NAMES, EventEmitter } from '@renderer/services/EventService'
import { Tooltip } from 'antd'
import { t } from 'i18next'
import { MessageSquareDiff } from 'lucide-react'
import { FC } from 'react'
import styled from 'styled-components'

interface Props {}

const HeaderNavbar: FC<Props> = () => {
  return (
    <Container>
      <div></div>
      <Tooltip title={t('settings.shortcuts.new_topic')} mouseEnterDelay={0.8}>
        <NavbarIcon onClick={() => EventEmitter.emit(EVENT_NAMES.ADD_NEW_TOPIC)} style={{ marginRight: 5 }}>
          <MessageSquareDiff size={18} />
        </NavbarIcon>
      </Tooltip>
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  width: var(--assistant-width);
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 0;
  padding-left: var(--sidebar-width);
  height: var(--navbar-height);
  min-height: var(--navbar-height);
  background-color: transparent;
  -webkit-app-region: drag;
`

export const NavbarIcon = styled.div`
  -webkit-app-region: none;
  border-radius: 8px;
  height: 30px;
  padding: 0 7px;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  transition: all 0.2s ease-in-out;
  -webkit-app-region: no-drag;
  cursor: pointer;
  .iconfont {
    font-size: 18px;
    color: var(--color-icon);
    &.icon-a-addchat {
      font-size: 20px;
    }
    &.icon-a-darkmode {
      font-size: 20px;
    }
    &.icon-appstore {
      font-size: 20px;
    }
  }
  .anticon {
    color: var(--color-icon);
    font-size: 16px;
  }
  &:hover {
    background-color: var(--color-background-mute);
    color: var(--color-icon-white);
  }
`

export default HeaderNavbar
