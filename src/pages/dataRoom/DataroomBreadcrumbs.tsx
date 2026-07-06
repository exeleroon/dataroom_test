import { Link } from 'react-router-dom'
import { Fragment } from 'react'
import { ArrowLeft } from 'lucide-react'

import type { Crumb } from '@/types'
import { DATAROOMS_LABEL } from '@/constants'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface DataroomBreadcrumbsProps {
  dataroomId: string
  dataroomName: string
  /** Folder trail from the root down to the current folder. */
  trail: Crumb[]
}

/**
 * Resolve where the "up one level" arrow leads: the parent folder, else the
 * dataroom root, else the datarooms list when already sitting at the root.
 */
function resolveParent(
  dataroomId: string,
  dataroomName: string,
  trail: Crumb[],
): { path: string; label: string } {
  const parent = trail[trail.length - 2]
  if (parent?.id) return { path: `/d/${dataroomId}/f/${parent.id}`, label: parent.name }
  if (trail.length === 1) return { path: `/d/${dataroomId}`, label: dataroomName }
  return { path: '/', label: DATAROOMS_LABEL }
}

/**
 * Folder navigation header: a "back" arrow that steps up one level, followed by
 * the "Dataroom / Folder / Subfolder" trail (every hop but the last is linked).
 */
export function DataroomBreadcrumbs({
  dataroomId,
  dataroomName,
  trail,
}: DataroomBreadcrumbsProps) {
  const atRoot = trail.length === 0
  const up = resolveParent(dataroomId, dataroomName, trail)

  return (
    <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
          >
            <Link to={up.path} aria-label={`Back to ${up.label}`}>
              <ArrowLeft />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Back to {up.label}</TooltipContent>
      </Tooltip>

      <Breadcrumb>
        <BreadcrumbList>
          {/* Root crumb: always links back to the datarooms list (main page). */}
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/">{DATAROOMS_LABEL}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />

          <BreadcrumbItem>
            {atRoot ? (
              <BreadcrumbPage className="max-w-[16rem] truncate">
                {dataroomName}
              </BreadcrumbPage>
            ) : (
              <BreadcrumbLink asChild>
                <Link to={`/d/${dataroomId}`} className="max-w-[16rem] truncate">
                  {dataroomName}
                </Link>
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>

          {trail.map((crumb, index) => {
            const isLast = index === trail.length - 1
            return (
              <Fragment key={crumb.id}>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage className="max-w-[16rem] truncate">
                      {crumb.name}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link
                        to={`/d/${dataroomId}/f/${crumb.id}`}
                        className="max-w-[12rem] truncate"
                      >
                        {crumb.name}
                      </Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </Fragment>
            )
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  )
}