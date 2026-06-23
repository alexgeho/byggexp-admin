'use client';

import { BellOutlined, LogoutOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar, Badge, Button, Dropdown, Input, Space } from 'antd';
import { useRouter } from 'next/navigation';
import { getRedirectPathForUser, useAuthStore } from '@/src/store/authStore';

export default function DashboardHeader() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const getProfilePath = () => {
    const currentUser = useAuthStore.getState().user;
    const role = currentUser?.role;

    if (role === 'superadmin') {
      return '/admin/profile';
    }

    if (role === 'companyAdmin') {
      return '/company/profile';
    }

    return getRedirectPathForUser(currentUser);
  };

  const profileMenu = {
    items: [
      {
        key: 'profile',
        icon: <UserOutlined />,
        label: 'Profile',
      },
      {
        type: 'divider',
      },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: 'Log out',
      },
    ],
    onClick: ({ key }) => {
      if (key === 'logout') {
        useAuthStore.getState().logout();
        router.replace('/login');
        return;
      }

      if (key === 'profile') {
        router.push(getProfilePath());
      }
    },
  };

  return (
    <div className="dashboard-header__inner">
      <Input
        className="dashboard-header__search"
        prefix={<SearchOutlined />}
        placeholder="Search"
        allowClear
      />

      <Space className="dashboard-header__actions" size={12}>
        <Badge dot offset={[-2, 4]}>
          <Button className="header-icon-button" icon={<BellOutlined />} aria-label="Notifications" />
        </Badge>

        <Dropdown menu={profileMenu} placement="bottomRight" trigger={['click']}>
          <button type="button" className="dashboard-header__profile">
            <Avatar icon={<UserOutlined />} src={user?.avatarUrl} />
            <span className="dashboard-header__profile-text">
              <strong>{user?.name || 'Profile'}</strong>
              <span>{user?.role || 'User'}</span>
            </span>
          </button>
        </Dropdown>
      </Space>
    </div>
  );
}
