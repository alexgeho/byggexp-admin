import apiClient from '@/src/api/apiClient';

// A project's decomposed goal: { title, stages: [{ _id, title, taskIds[], order }] }.
// Progress (% and per-stage status) is derived on the client from task statuses.
export async function getProjectGoal(projectId) {
  const { data } = await apiClient.get(`/goals/project/${projectId}`);
  return data;
}

export async function updateProjectGoal(projectId, patch) {
  const { data } = await apiClient.put(`/goals/project/${projectId}`, patch);
  return data;
}
