// apps/web/components/examples/projects-list-trpc.tsx
// Example: Using tRPC hooks for type-safe API calls
'use client';

import { trpc } from '@/lib/trpc';

/**
 * Example component showing tRPC usage
 * Notice the full type safety - no manual typing needed!
 */
export function ProjectsListTRPC() {
  // Query hook - fully typed, with loading/error states
  const { data: projects, isLoading, error, refetch } = trpc.projects.list.useQuery();

  // Mutation hook - for creating projects
  const createProject = trpc.projects.create.useMutation({
    onSuccess: () => {
      // Automatically refetch projects after creating
      refetch();
    },
  });

  // Mutation hook - for deleting projects
  const deleteProject = trpc.projects.delete.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleCreate = async () => {
    await createProject.mutateAsync({
      name: 'New Project',
      type: 'saas',
    });
  };

  const handleDelete = async (id: string) => {
    await deleteProject.mutateAsync({ id });
  };

  if (isLoading) {
    return <div>Loading projects...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div>
      <h1>Projects (tRPC)</h1>

      <button
        onClick={handleCreate}
        disabled={createProject.isPending}
      >
        {createProject.isPending ? 'Creating...' : 'Create Project'}
      </button>

      <ul>
        {projects?.map((project) => (
          <li key={project.id}>
            {/* All fields are fully typed! */}
            <h3>{project.name}</h3>
            <p>Type: {project.type}</p>
            <p>Status: {project.status}</p>
            <p>Domains: {project.domainsCompleted}</p>
            <p>Updated: {project.updatedAt}</p>

            <button
              onClick={() => handleDelete(project.id)}
              disabled={deleteProject.isPending}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Example: Using individual project query
 */
export function ProjectDetail({ id }: { id: string }) {
  const { data: project, isLoading } = trpc.projects.get.useQuery({ id });

  // Update mutation
  const updateProject = trpc.projects.update.useMutation();

  const handleUpdate = async () => {
    await updateProject.mutateAsync({
      id,
      data: {
        name: 'Updated Name',
        status: 'complete',
      },
    });
  };

  if (isLoading) return <div>Loading...</div>;
  if (!project) return <div>Project not found</div>;

  return (
    <div>
      <h2>{project.name}</h2>
      <p>Type: {project.type}</p>
      <p>Status: {project.status}</p>

      {/* Access interview data with full typing */}
      <pre>{JSON.stringify(project.interviewData, null, 2)}</pre>

      <button onClick={handleUpdate}>
        Update Project
      </button>
    </div>
  );
}

/**
 * Comparison: Before and After tRPC
 */

// BEFORE (REST API - no type safety):
/*
const [projects, setProjects] = useState<any[]>([]);

useEffect(() => {
  fetch('/api/projects')
    .then(r => r.json())
    .then(data => setProjects(data))
    .catch(err => console.error(err));
}, []);
*/

// AFTER (tRPC - fully typed):
/*
const { data: projects } = trpc.projects.list.useQuery();
// ✨ TypeScript knows exactly what 'projects' contains!
// ✨ Autocomplete for all fields
// ✨ Compile-time errors if API changes
*/
