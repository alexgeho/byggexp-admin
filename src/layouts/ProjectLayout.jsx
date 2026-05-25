import { Layout, Menu, Button } from 'antd';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useState, useCallback } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import RoleBasedAccess from '../components/RoleBasedAccess';
import AppHeader from '../components/AppHeader';

const { Content } = Layout;

export default function ProjectLayout() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const location = useLocation();

  const [addClickHandler, setAddClickHandler] = useState(null);
  const [addBtnText, setAddBtnText] = useState('Add');

  const registerAddButton = useCallback((handler, text) => {
    setAddClickHandler(() => handler);
    setAddBtnText(text);
  }, []);

  const unregisterAddButton = useCallback(() => {
    setAddClickHandler(null);
    setAddBtnText('Add');
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
    { key: 'my', label: 'My Projects' },
  ];

  return (
    <Layout className="app-shell">
      <AppHeader homePath="/projects/my" onLogout={handleLogout} />

      <div className="app-toolbar">
        <div className="app-toolbar__nav">
          <Menu
            className="app-toolbar__menu"
            disabledOverflow
            mode="horizontal"
            selectedKeys={[location.pathname.split('/')[2] || 'my']}
            items={menuItems}
            onClick={({ key }) => navigate(`/projects/${key}`)}
          />
        </div>
        <RoleBasedAccess allowedRoles={['superadmin', 'companyAdmin', 'projectAdmin']}>
          <div className="app-toolbar__actions">
            <Button type="primary" onClick={handleAddClick} disabled={!addClickHandler}>{addBtnText}</Button>
          </div>
        </RoleBasedAccess>
      </div>

      <Layout>
        <Content className="app-content">
          <Outlet context={{ registerAddButton, unregisterAddButton }} />
        </Content>
      </Layout>

    </Layout>
  );
}
