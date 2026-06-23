import { useAuthStore } from '@/src/store/authStore';

export default function RoleBasedAccess({ allowedRoles, children, fallback = null }) {
  const user = useAuthStore((state) => state.user);

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  if (!user?.role || !roles.includes(user.role)) {
    return fallback;
  }

  return children;
}
