import { useAuthStore } from '../store/authStore';

export default function RoleBasedAccess({ allowedRoles, children, fallback = null }) {
  const hasRole = useAuthStore((state) => state.hasRole);

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  if (!hasRole(roles)) {
    return fallback;
  }

  return children;
}
