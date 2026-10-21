import { Fragment } from 'react'
import { Link } from 'react-router'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import type { Crumb } from './page-header-context'

export function Breadcrumbs({ items, current }: { items: Crumb[]; current: string }) {
  if (items.length === 0) return null
  return (
    <Breadcrumb className="hidden md:block">
      <BreadcrumbList className="text-xs">
        {items.map((crumb, i) => (
          <Fragment key={`${crumb.label}-${i}`}>
            <BreadcrumbItem>
              {crumb.to ? (
                <BreadcrumbLink asChild>
                  <Link to={crumb.to}>{crumb.label}</Link>
                </BreadcrumbLink>
              ) : (
                <span>{crumb.label}</span>
              )}
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </Fragment>
        ))}
        <BreadcrumbItem>
          <BreadcrumbPage>{current}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}
