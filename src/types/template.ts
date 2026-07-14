export interface Template {
  name: string
  content: string
}

export type TemplateSetKey =
  'constitution' | 'functionalSpec' | 'technicalSpec' | 'taskList' | 'meta'

export type TemplateSet = Record<TemplateSetKey, Template>
