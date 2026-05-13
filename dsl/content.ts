import type { Form } from './form/types.ts'
import type { Table } from './table/types.ts'
import type { Alert } from './alert-notification/types.ts'
import type { Display } from './display/types.ts'
import type { Block } from './block/types.ts'

export type PanelContent = string | Form | Table | Alert | Display | Block