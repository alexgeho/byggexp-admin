import { Layout, Menu, Button } from 'antd';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useState, useCallback } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import RoleBasedAccess from '../components/RoleBasedAccess';
import AppHeader from '../components/AppHeader';

const { Content } = Layout;

export default function CompanyLayout() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const location = useLocation();

  const [addClickHandler, setAddClickHandler] = useState(null);
  const [addBtnText, setAddBtnText] = useState('Add');
  const [headerActionsVisible, setHeaderActionsVisible] = useState(true);

  const registerAddButton = useCallback((handler, text) => {
    setAddClickHandler(() => handler);
    setAddBtnText(text);
  }, []);

  const unregisterAddButton = useCallback(() => {
    setAddClickHandler(null);
    setAddBtnText('Add');
  }, []);

  const hideHeaderActions = useCallback(() => {
    setHeaderActionsVisible(false);
  }, []);

  const showHeaderActions = useCallback(() => {
    setHeaderActionsVisible(true);
  }, []);

  const handleAddClick = () => {
    if (addClickHandler) {
      addClickHandler();
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { key: 'projects', label: 'Projects' },
    { key: 'tasks', label: 'Tasks' },
    { key: 'tools', label: 'Tools' },
    { key: 'shifts', label: 'Shifts' },
    { key: 'users', label: 'Employees' },
    { key: 'profile', label: 'Profile' },
  ];

  return (
    <Layout className="app-shell">
      <AppHeader homePath="/company/projects" onLogout={handleLogout} />

      <div className="app-toolbar">
        <div className="app-toolbar__nav">
          <Menu
            className="app-toolbar__menu"
            disabledOverflow
            mode="horizontal"
            selectedKeys={[location.pathname.split('/')[2] || 'projects']}
            items={menuItems}
            onClick={({ key }) => navigate(`/company/${key}`)}
          />
        </div>
        <RoleBasedAccess allowedRoles={['superadmin', 'companyAdmin']}>
          {headerActionsVisible && (
            <div className="app-toolbar__actions">
              <Button className="btn-light" disabled={!addClickHandler}>Add in bulk</Button>
              <Button type="primary" onClick={handleAddClick} disabled={!addClickHandler}>{addBtnText}</Button>
            </div>
          )}
        </RoleBasedAccess>
      </div>

      <Layout>
        <Content className="app-content">
          <Outlet context={{ registerAddButton, unregisterAddButton, hideHeaderActions, showHeaderActions }} />
        </Content>
      </Layout>

    </Layout>
  );
}
