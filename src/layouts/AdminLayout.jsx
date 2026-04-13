import { Layout, Menu, Dropdown, Avatar, Space, Button, Typography } from 'antd';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { LogoutOutlined, UserOutlined, SettingOutlined, SearchOutlined } from '@ant-design/icons';
import { useState, useCallback } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import RoleBasedAccess from '../components/RoleBasedAccess';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export default function AdminLayout() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const hasRole = useAuthStore((state) => state.hasRole);
  const location = useLocation();

  const [addClickHandler, setAddClickHandler] = useState(null);
  const [addBtnText, setAddBtnText] = useState('Добавить');

  const registerAddButton = useCallback((handler, text) => {
    setAddClickHandler(() => handler);
    setAddBtnText(text);
  }, []);

  const unregisterAddButton = useCallback(() => {
    setAddClickHandler(null);
    setAddBtnText('Добавить');
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
    ... (hasRole('superadmin') ? [
      { key: 'companies', label: 'Компании' },
      { key: 'users', label: 'Пользователи' },
      { key: 'projects', label: 'Проекты' },
    ] : []),
    
    ... (hasRole('companyAdmin') ? [
      { key: 'projects', label: 'Проекты' },
      { key: 'users', label: 'Сотрудники' },
      { key: 'profile', label: 'Профиль' },
    ] : []),
    
    ... (hasRole('projectAdmin') ? [
      { key: 'projects', label: 'Проекты' },
      { key: 'reports', label: 'Отчёты' },
    ] : []),
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header className='header' style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px' }}>
        <div style={{display: 'flex', flexDirection: 'column', gap: '0'}}>
            <Title style={{ color: 'white', fontSize: '24px', fontWeight: 'bold', marginBottom: '0' }}>BYGGEXP</Title>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: '12px', }}>Construction management software</Text>
        </div>
        <Space style={{display: 'flex', alignItems: 'center'}}>
          <Button icon={<SearchOutlined />} size="large" style={{ color: '#052D50', borderRadius: '50%', width: '30px', height: '30px' }} />
          <Dropdown menu={{ items: dropDownItems }} placement="bottomRight">
            <Button icon={<UserOutlined />} size="large" style={{ color: '#052D50', borderRadius: '50%', width: '30px', height: '30px' }} />
          </Dropdown>
          <Button icon={<SettingOutlined />} size="large" style={{ color: '#052D50', borderRadius: '50%', width: '30px', height: '30px' }} />
        </Space>
      </Header>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Menu
          mode="horizontal"
          selectedKeys={[location.pathname.split('/')[2] || 'companies']}
          items={menuItems}
          onClick={({ key }) => navigate(`/admin/${key}`)}
        />
        <RoleBasedAccess allowedRoles={['superadmin', 'companyAdmin']}>
          <div style={{ display: 'flex', gap: '8px', marginRight: '12px' }}>
            <Button type="primary" onClick={handleAddClick} disabled={!addClickHandler}>{addBtnText}</Button>
            <Button>Add in bulk</Button>
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
