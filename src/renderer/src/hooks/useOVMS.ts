import store, { useAppSelector } from '@renderer/store'

export function useOVMSSettings() {
  const settings = useAppSelector((state) => state.llm.settings.ovms)

  return { ...settings }
}

export function getOVMSSettings() {
  return store.getState().llm.settings.ovms
}

export function getOVMSUrlBackend() {
  return store.getState().llm.settings.ovms.urlBackend
}
