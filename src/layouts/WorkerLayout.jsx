import { Layout, Menu, Dropdown, Avatar, Space, Button, Typography } from 'antd';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { LogoutOutlined, UserOutlined, SettingOutlined, SearchOutlined, ClockCircleOutlined, UploadOutlined } from '@ant-design/icons';
import { useLocation, Outlet } from 'react-router-dom';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export default function WorkerLayout() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const location = useLocation();

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
    { key: 'my', label: 'Мои проекты', icon: <UserOutlined /> },
    { key: 'time-report', label: 'Отметить время', icon: <ClockCircleOutlined /> },
    { key: 'upload', label: 'Загрузить фото', icon: <UploadOutlined /> },
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
          selectedKeys={[location.pathname.split('/')[2] || 'my']}
          items={menuItems}
          onClick={({ key }) => navigate(`/worker/${key}`)}
        />
      </div>

      <Layout>
        <Content style={{minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>

    </Layout>
  );
}
