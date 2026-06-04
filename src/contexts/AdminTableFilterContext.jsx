import { createContext, useContext } from 'react';

export const AdminTableFilterContext = createContext(null);

export function useAdminTableFilter() {
  return useContext(AdminTableFilterContext);
}
