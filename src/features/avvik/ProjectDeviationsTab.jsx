import DeviationsView from '@/src/features/avvik/DeviationsView';

// Project → «Avvik» tab: the same list, fixed to this project.
export default function ProjectDeviationsTab({ projectId }) {
  return <DeviationsView projectId={projectId} />;
}
