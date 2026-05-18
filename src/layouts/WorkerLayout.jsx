import { Layout, Menu, Dropdown, Space, Button } from 'antd';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { UserOutlined, SettingOutlined, SearchOutlined, ClockCircleOutlined, UploadOutlined } from '@ant-design/icons';
import { Link, useLocation, Outlet } from 'react-router-dom';
import headerLogo from '../assets/byggexp-logo.png';

const { Header, Content } = Layout;

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
    { key: 'my', label: 'My Projects', icon: <UserOutlined /> },
    { key: 'time-report', label: 'Log Time', icon: <ClockCircleOutlined /> },
    { key: 'upload', label: 'Upload Photos', icon: <UploadOutlined /> },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header className='header'>
        <Link to="/worker/my" className="header-logo-link" aria-label="Go to home">
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
