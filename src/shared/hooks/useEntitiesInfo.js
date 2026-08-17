import { useEffect, useState } from 'react';
import apiClient from '@/src/api/apiClient';

const normalizeIds = (ids = []) => [...new Set(ids.filter(id => id && typeof id === 'string'))];

export const useUsersInfo = (userIds = []) => {
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const idsKey = normalizeIds(userIds).join(',');

  useEffect(() => {
    const uniqueIds = idsKey ? idsKey.split(',') : [];

    if (!uniqueIds.length) {
      setUsers({});
      return;
    }

    const loadUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await apiClient.post('/users/by-ids', { ids: uniqueIds });
        setUsers(Object.fromEntries(data.map((user) => [user.id, user])));
      } catch (err) {
        console.error('Error loading users:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [idsKey]);

  return { users, loading, error };
};

export const useCompaniesInfo = (companyIds = []) => {
  const [companies, setCompanies] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const idsKey = normalizeIds(companyIds).join(',');

  useEffect(() => {
    const uniqueIds = idsKey ? idsKey.split(',') : [];

    if (!uniqueIds.length) {
      setCompanies({});
      return;
    }

    const loadCompanies = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await apiClient.post('/company/by-ids', { ids: uniqueIds });
        setCompanies(Object.fromEntries(data.map((company) => [company.id, company])));
      } catch (err) {
        console.error('Error loading companies:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadCompanies();
  }, [idsKey]);

  return { companies, loading, error };
};

export const useProjectsInfo = (projectIds = []) => {
  const [projects, setProjects] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const idsKey = normalizeIds(projectIds).join(',');

  useEffect(() => {
    const uniqueIds = idsKey ? idsKey.split(',') : [];

    if (!uniqueIds.length) {
      setProjects({});
      return;
    }

    const loadProjects = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await apiClient.post('/projects/by-ids', { ids: uniqueIds });
        setProjects(Object.fromEntries(data.map((project) => [project.id, project])));
      } catch (err) {
        console.error('Error loading projects:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, [idsKey]);

  return { projects, loading, error };
};
