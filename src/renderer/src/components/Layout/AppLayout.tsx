import { HStack } from '@renderer/components/Layout'
import MainSidebar from '@renderer/pages/home/MainSidebar/MainSidebar'
import { FC } from 'react'
import styled from 'styled-components'

interface AppLayoutProps {
  children: React.ReactNode
}

const AppLayout: FC<AppLayoutProps> = ({ children }) => {
  return (
    <HStack style={{ display: 'flex', flex: 1 }} id="app-layout">
      <MainSidebar />
      <ContentArea>{children}</ContentArea>
    </HStack>
  )
}

const ContentArea = styled.div`
  min-width: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100vh;
`

export default AppLayout
