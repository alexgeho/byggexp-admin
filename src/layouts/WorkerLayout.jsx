import { Layout, Menu } from 'antd';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { UserOutlined, ClockCircleOutlined, UploadOutlined } from '@ant-design/icons';
import { useLocation, Outlet } from 'react-router-dom';
import AppHeader from '../components/AppHeader';

const { Content } = Layout;

export default function WorkerLayout() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { key: 'my', label: 'My Projects', icon: <UserOutlined /> },
    { key: 'time-report', label: 'Log Time', icon: <ClockCircleOutlined /> },
    { key: 'upload', label: 'Upload Photos', icon: <UploadOutlined /> },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <AppHeader homePath="/worker/my" onLogout={handleLogout} />

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
