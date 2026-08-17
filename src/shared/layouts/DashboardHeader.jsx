'use client';

import { BulbFilled, BulbOutlined, CloseOutlined, CompassOutlined, DownOutlined, GlobalOutlined, LogoutOutlined, MenuOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar, Button, Dropdown, Input, Space, Tooltip } from 'antd';
import { useRouter } from 'next/navigation';
import NotificationsDropdown from '@/src/shared/components/NotificationsDropdown';
import ApprovalsButton from '@/src/shared/components/ApprovalsButton';
import searchIcon from '@/src/assets/icons/search.svg';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { getRedirectPathForUser, useAuthStore } from '@/src/store/authStore';
import { useThemeStore } from '@/src/store/themeStore';
import { useTourStore } from '@/src/store/tourStore';

import { resolveSvgSrc } from '@/src/utils/assets';

export default function DashboardHeader({ isMenuOpen, onMenuToggle }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { lang, setLang, t } = useLanguage();
  const themeMode = useThemeStore((state) => state.mode);
  const toggleTheme = useThemeStore((state) => state.toggle);
  const startTour = useTourStore((state) => state.start);
  const isDark = themeMode === 'dark';

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

        <Space className="dashboard-header__actions" size={12} data-tour="header-actions">
          <Tooltip title={t('Take a tour')}>
            <Button
              type="text"
              data-tour="help"
              icon={<CompassOutlined />}
              onClick={startTour}
              aria-label={t('Take a tour')}
            />
          </Tooltip>

          <Tooltip title={isDark ? t('Light mode') : t('Dark mode')}>
            <Button
              type="text"
              icon={isDark ? <BulbFilled /> : <BulbOutlined />}
              onClick={toggleTheme}
              aria-label={isDark ? t('Light mode') : t('Dark mode')}
            />
          </Tooltip>

          <Dropdown menu={languageMenu} placement="bottomRight" trigger={['click']}>
            <Button type="text" icon={<GlobalOutlined />} aria-label={t('Language')}>
              {lang.toUpperCase()}
            </Button>
          </Dropdown>

          {user?.role === 'companyAdmin' ? <ApprovalsButton /> : null}

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
