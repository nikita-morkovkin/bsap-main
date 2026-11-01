import { apiClient } from '@/api/apiClient'
import QueryFeedback from '@/components/common/QueryFeedback'
import { useMusic } from '@/hooks/queries/useMusic.hook'
import { useProjectDefaults } from '@/hooks/queries/useProjectDefaults.hook'
import { useQuery } from '@tanstack/react-query'
import ProjectForm from './ProjectForm'

const CreateProjectView = () => {
  const query = useProjectDefaults()
  const music = useMusic()

  const videoDefaults = useQuery({
    queryKey: ['video-style-defaults'],
    queryFn: ({ signal }) => apiClient.projects.getVideoStyleDefaults(signal),
    staleTime: Infinity,
  })

  const handleRetry = () => {
    query.refetch()
    music.refetch()
    videoDefaults.refetch()
  }

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">
          Episode creator
        </h1>
        <p className="mt-3 text-muted-foreground">
          Start with a topic. Shape the voice. Let your local pipeline do the
          rest.
        </p>
      </header>

      {query.isPending && (
        <QueryFeedback message="Loading your default profile and prompts…" />
      )}

      {query.isError && (
        <QueryFeedback
          error
          message="Could not load the default profile."
          onRetry={handleRetry}
        />
      )}
      {music.isPending && <p role="status">Loading soundtrack choices…</p>}
      {music.isError && (
        <QueryFeedback
          error
          message="Could not load soundtrack choices."
          onRetry={handleRetry}
        />
      )}
      {videoDefaults.isPending && (
        <p role="status">Loading video style defaults…</p>
      )}
      {videoDefaults.isError && (
        <QueryFeedback
          error
          message="Could not load video style defaults."
          onRetry={handleRetry}
        />
      )}
      {query.data && music.data && videoDefaults.data && (
        <ProjectForm
          defaults={query.data}
          tracks={music.data.tracks}
          videoDefaults={videoDefaults.data}
        />
      )}
    </section>
  )
}

export default CreateProjectView
