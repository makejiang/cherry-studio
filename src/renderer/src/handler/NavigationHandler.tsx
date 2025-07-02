import SettingsPopup from '@renderer/components/Popups/SettingsPopup'
import NavigationService from '@renderer/services/NavigationService'
import { useAppSelector } from '@renderer/store'
import { useEffect } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { useNavigate } from 'react-router-dom'

const NavigationHandler: React.FC = () => {
  const navigate = useNavigate()

  const showSettingsShortcutEnabled = useAppSelector(
    (state) => state.shortcuts.shortcuts.find((s) => s.key === 'show_settings')?.enabled
  )

  useEffect(() => {
    NavigationService.setNavigate(navigate)
  }, [navigate])

  useHotkeys(
    'meta+, ! ctrl+,',
    function () {
      SettingsPopup.show({ defaultTab: 'provider' })
    },
    {
      splitKey: '!',
      enableOnContentEditable: true,
      enableOnFormTags: true,
      enabled: showSettingsShortcutEnabled
    }
  )

  return null
}

export default NavigationHandler
