import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';

export const useUsersInfo = (userIds = []) => {
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const uniqueIds = [...new Set(userIds.filter(id => id && typeof id === 'string'))];
    
    if (!uniqueIds.length) return;

    const loadUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await apiClient.post('/users/by-ids', { ids: uniqueIds });
        setUsers(data.reduce((acc, user) => ({ ...acc, [user.id]: user }), {}));
      } catch (err) {
        console.error('Error loading users:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [userIds]);

  return { users, loading, error };
};

export const useCompaniesInfo = (companyIds = []) => {
  const [companies, setCompanies] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const uniqueIds = [...new Set(companyIds.filter(id => id && typeof id === 'string'))];
    
    if (!uniqueIds.length) return;

    const loadCompanies = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await apiClient.post('/company/by-ids', { ids: uniqueIds });
        setCompanies(data.reduce((acc, company) => ({ ...acc, [company.id]: company }), {}));
      } catch (err) {
        console.error('Error loading companies:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadCompanies();
  }, [companyIds]);

  return { companies, loading, error };
};

export const useProjectsInfo = (projectIds = []) => {
  const [projects, setProjects] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const uniqueIds = [...new Set(projectIds.filter(id => id && typeof id === 'string'))];
    
    if (!uniqueIds.length) return;

    const loadProjects = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await apiClient.post('/projects/by-ids', { ids: uniqueIds });
        setProjects(data.reduce((acc, project) => ({ ...acc, [project.id]: project }), {}));
      } catch (err) {
        console.error('Error loading projects:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, [projectIds]);

  return { projects, loading, error };
};

export const useUserInfo = (userId) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;

    const loadUser = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await apiClient.get(`/users/info/${userId}`);
        setUser(data);
      } catch (err) {
        console.error('Error loading user:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [userId]);

  return { user, loading, error };
};

export const useCompanyInfo = (companyId) => {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!companyId) return;

    const loadCompany = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await apiClient.get(`/company/info/${companyId}`);
        setCompany(data);
      } catch (err) {
        console.error('Error loading company:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadCompany();
  }, [companyId]);

  return { company, loading, error };
};

export const useProjectInfo = (projectId) => {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!projectId) return;

    const loadProject = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await apiClient.get(`/projects/info/${projectId}`);
        setProject(data);
      } catch (err) {
        console.error('Error loading project:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [projectId]);

  return { project, loading, error };
};
