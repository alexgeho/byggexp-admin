import { Layout, Dropdown, Space, Button } from 'antd';
import { UserOutlined, SettingOutlined, SearchOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import headerLogo from '../assets/byggexp-logo.png';

const { Header } = Layout;

export default function AppHeader({ homePath, onLogout, showActions = true }) {
  const profileMenu = {
    items: [{ key: 'logout', label: 'Log out' }],
    onClick: ({ key }) => {
      if (key === 'logout') {
        onLogout?.();
      }
    },
  };

  return (
    <Header className="header">
      <Link to={homePath} className="header-logo-link" aria-label="Go to home">
        <img src={headerLogo} alt="ByggHub" className="header-logo" />
      </Link>

      {showActions && (
        <Space className="header-actions" size={12}>
          <Button className="header-icon-button" icon={<SearchOutlined />} aria-label="Search" />
          <Dropdown menu={profileMenu} placement="bottomRight">
            <Button className="header-icon-button" icon={<UserOutlined />} aria-label="Profile" />
          </Dropdown>
          <Button className="header-icon-button" icon={<SettingOutlined />} aria-label="Settings" />
        </Space>
      )}
    </Header>
  );
}
