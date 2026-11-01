import Badge from '@/components/ui/Badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/AlertDialog'
import { Button } from '@/components/ui/Button'
import { useDeleteProjectMutation } from '@/hooks/mutations/useDeleteProjectMutation.hook'
import { useUiStore } from '@/store/ui.store'
import type { ProjectSummary } from '@/types/project.types'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'

type ProjectListItemProps = { project: ProjectSummary }

const ProjectListItem = ({ project }: ProjectListItemProps) => {
  const deletion = useDeleteProjectMutation()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const handleSelect = () =>
    useUiStore.getState().selectProject(project.projectId)

  const isSelected = useUiStore(
    (state) => state.selectedProjectId === project.projectId,
  )

  const current = isSelected ? 'page' : undefined
  const className = isSelected
    ? 'w-full space-y-2 rounded-xl border bg-accent p-3 text-left'
    : 'w-full space-y-2 rounded-xl border border-transparent p-3 text-left hover:bg-muted'
  const projectTitle = project.title ?? project.topic

  const handleDelete = () => {
    setDeleteDialogOpen(false)
    deletion.mutate(project.projectId)
  }

  return (
    <li className="flex items-center gap-1">
      <button
        type="button"
        className={className}
        aria-current={current}
        onClick={handleSelect}
      >
        <span className="block text-sm font-medium wrap-anywhere">
          {projectTitle}
        </span>
        <Badge variant="outline">{project.status.replaceAll('_', ' ')}</Badge>
      </button>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={deletion.isPending}
              aria-label={`Delete ${projectTitle}`}
              title="Delete episode"
            />
          }
        >
          <Trash2 />
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete “{projectTitle}” and all its files? This cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  )
}

export default ProjectListItem
