/**
 * Lets a page declare its title, description, breadcrumbs and primary action.
 * `AppLayout` renders them in the global header so the header's primary action
 * changes with the active page (Dashboard → Add Transaction, Accounts → Add
 * Account, …).
 *
 * Two contexts are used on purpose: pages only subscribe to the *setter*
 * (stable), so updating the meta re-renders the Header but not the page —
 * otherwise a page passing a fresh `actions` element each render would loop.
 */
import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from 'react'
import { useDocumentTitle } from '@/hooks/use-document-title'

export interface Crumb {
  label: string
  to?: string
}

export interface PageHeaderMeta {
  title: string
  description?: string | null
  breadcrumbs?: Crumb[]
  /** Primary (and optional secondary) actions rendered in the header. */
  actions?: ReactNode
}

type Setter = (meta: PageHeaderMeta | null) => void

const PageHeaderMetaContext = createContext<PageHeaderMeta | null>(null)
const PageHeaderSetterContext = createContext<Setter | null>(null)

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [meta, setMeta] = useState<PageHeaderMeta | null>(null)
  return (
    <PageHeaderSetterContext.Provider value={setMeta}>
      <PageHeaderMetaContext.Provider value={meta}>{children}</PageHeaderMetaContext.Provider>
    </PageHeaderSetterContext.Provider>
  )
}

export function usePageHeaderMeta(): PageHeaderMeta | null {
  return useContext(PageHeaderMetaContext)
}

/**
 * Declare the header for the current page. Call once per page component.
 * `actions` may change between renders (e.g. to disable while pending).
 */
export function usePageHeader(meta: PageHeaderMeta) {
  const setMeta = useContext(PageHeaderSetterContext)
  useDocumentTitle(meta.title)
  const { title, description, actions } = meta
  const crumbsKey = JSON.stringify(meta.breadcrumbs ?? [])
  useLayoutEffect(() => {
    setMeta?.({ title, description, actions, breadcrumbs: JSON.parse(crumbsKey) as Crumb[] })
  }, [setMeta, title, description, actions, crumbsKey])
  useLayoutEffect(() => {
    return () => setMeta?.(null)
  }, [setMeta])
}
