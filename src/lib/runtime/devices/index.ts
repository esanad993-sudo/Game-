import { ButtonDevice } from './button'
import { CounterDevice } from './counter'
import { GiveCoinsDevice } from './giveCoins'
import { ShowMessageDevice } from './showMessage'
import { SpawnPointDevice } from './spawnPoint'
import type { DeviceDefinition } from '../types'

export const BUILTIN_DEVICES: DeviceDefinition[] = [
  ButtonDevice,
  CounterDevice,
  GiveCoinsDevice,
  ShowMessageDevice,
  SpawnPointDevice,
]

export * from './button'
export * from './counter'
export * from './giveCoins'
export * from './showMessage'
export * from './spawnPoint'
