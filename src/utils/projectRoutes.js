export function getProjectDetailPath(pathname, projectId) {
  const id = String(projectId);

  if (pathname.startsWith('/admin')) {
    return `/admin/projects/${id}`;
  }

  if (pathname.startsWith('/company')) {
    return `/company/projects/${id}`;
  }

  if (pathname.startsWith('/worker')) {
    return `/worker/projects/${id}`;
  }

  return `/projects/${id}`;
}
