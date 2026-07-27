'use client';

import { CloseOutlined, DownOutlined, GlobalOutlined, LogoutOutlined, MenuOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar, Button, Dropdown, Input, Space } from 'antd';
import { useRouter } from 'next/navigation';
import NotificationsDropdown from '@/src/shared/components/NotificationsDropdown';
import searchIcon from '@/src/assets/icons/search.svg';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { getRedirectPathForUser, useAuthStore } from '@/src/store/authStore';

const resolveSvgSrc = (asset) => (typeof asset === 'string' ? asset : asset.src);

export default function DashboardHeader({ isMenuOpen, onMenuToggle }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { lang, setLang, t } = useLanguage();

  const languageMenu = {
    selectable: true,
    selectedKeys: [lang],
    items: [
      { key: 'en', label: 'English' },
      { key: 'sv', label: 'Svenska' },
    ],
    onClick: ({ key }) => setLang(key),
  };

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
        label: t('Profile'),
      },
      {
        type: 'divider',
      },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: t('Log out'),
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
      <button
        type="button"
        className="dashboard-header__menu-toggle"
        onClick={onMenuToggle}
        aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isMenuOpen}
      >
        {isMenuOpen ? <CloseOutlined /> : <MenuOutlined />}
      </button>

      <div className="dashboard-header__spacer" />

      <div className="dashboard-header__right">
        <Input
          className="dashboard-header__search"
          prefix={(
            <img
              src={resolveSvgSrc(searchIcon)}
              width={20}
              height={20}
              alt=""
              aria-hidden="true"
            />
          )}
          placeholder={`${t('Search')}...`}
          allowClear
        />

        <Space className="dashboard-header__actions" size={12}>
          <Dropdown menu={languageMenu} placement="bottomRight" trigger={['click']}>
            <Button type="text" icon={<GlobalOutlined />} aria-label={t('Language')}>
              {lang.toUpperCase()}
            </Button>
          </Dropdown>

          <NotificationsDropdown />

          <Dropdown menu={profileMenu} placement="bottomRight" trigger={['click']}>
            <button type="button" className="dashboard-header__profile">
              <Avatar size={40} icon={<UserOutlined />} src={user?.avatarUrl} />
              <span className="dashboard-header__profile-text">
                <strong>{user?.name || 'Profile'}</strong>
                <span>{user?.role || 'User'}</span>
              </span>
              <DownOutlined className="dashboard-header__profile-chevron" />
            </button>
          </Dropdown>
        </Space>
      </div>
    </div>
  );
}
