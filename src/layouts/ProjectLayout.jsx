import { Layout, Menu, Dropdown, Space, Button } from 'antd';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { UserOutlined, SettingOutlined, SearchOutlined } from '@ant-design/icons';
import { useState, useCallback } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import RoleBasedAccess from '../components/RoleBasedAccess';
import headerLogo from '../assets/byggexp-logo.png';

const { Header, Content } = Layout;

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

  const dropDownItems = [
    {
      key: '1',
      label: (
        <a target="_blank" rel="noopener noreferrer" onClick={handleLogout}>
          log out
        </a>
      ),
    },
  ];

  const menuItems = [
    { key: 'my', label: 'My Projects' },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header className='header'>
        <Link to="/projects/my" className="header-logo-link" aria-label="Go to home">
          <img src={headerLogo} alt="ByggHub" className="header-logo" />
        </Link>
        <Space className="header-actions" size={12}>
          <Button className="header-icon-button" icon={<SearchOutlined />} aria-label="Search" />
          <Dropdown menu={{ items: dropDownItems }} placement="bottomRight">
            <Button className="header-icon-button" icon={<UserOutlined />} aria-label="Profile" />
          </Dropdown>
          <Button className="header-icon-button" icon={<SettingOutlined />} aria-label="Settings" />
        </Space>
      </Header>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Menu
          mode="horizontal"
          selectedKeys={[location.pathname.split('/')[2] || 'my']}
          items={menuItems}
          onClick={({ key }) => navigate(`/projects/${key}`)}
        />
        <RoleBasedAccess allowedRoles={['superadmin', 'companyAdmin', 'projectAdmin']}>
          <div style={{ display: 'flex', gap: '8px', marginRight: '12px' }}>
            <Button type="primary" onClick={handleAddClick} disabled={!addClickHandler}>{addBtnText}</Button>
          </div>
        </RoleBasedAccess>
      </div>

      <Layout>
        <Content style={{minHeight: 280 }}>
          <Outlet context={{ registerAddButton, unregisterAddButton }} />
        </Content>
      </Layout>

    </Layout>
  );
}
