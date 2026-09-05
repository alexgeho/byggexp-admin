'use client';

import { CloseOutlined, DownOutlined, GlobalOutlined, LogoutOutlined, MenuOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar, Button, Dropdown, Input, Space, Tooltip } from 'antd';
import { useRouter } from 'next/navigation';
import NotificationsDropdown from '@/src/shared/components/NotificationsDropdown';
import ApprovalsButton from '@/src/shared/components/ApprovalsButton';
import searchIcon from '@/src/assets/icons/search.svg';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { getRedirectPathForUser, useAuthStore } from '@/src/store/authStore';
import { useThemeStore } from '@/src/store/themeStore';

import { resolveSvgSrc } from '@/src/utils/assets';

// Theme-toggle glyphs: a sun (shown in dark mode → click for light) and a moon
// (shown in light mode → click for dark), the familiar convention.
// Sized to match the antd outline icons in the same row (20px, hollow/stroked).
const SunIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2v2.4M12 19.6V22M4.22 4.22l1.7 1.7M18.08 18.08l1.7 1.7M2 12h2.4M19.6 12H22M4.22 19.78l1.7-1.7M18.08 5.92l1.7-1.7" />
  </svg>
);
const MoonIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

export default function DashboardHeader({ isMenuOpen, onMenuToggle }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { lang, setLang, t } = useLanguage();
  const themeMode = useThemeStore((state) => state.mode);
  const toggleTheme = useThemeStore((state) => state.toggle);
  const isDark = themeMode === 'dark';

  const languageMenu = {
    selectable: true,
    selectedKeys: [lang],
    items: [
      { key: 'en', label: 'English' },
      { key: 'sv', label: 'Svenska' },
      { key: 'nb', label: 'Norsk' },
      { key: 'pl', label: 'Polski' },
      { key: 'uk', label: 'Українська' },
      { key: 'ru', label: 'Русский' },
      { key: 'fi', label: 'Suomi' },
      { key: 'et', label: 'Eesti' },
      { key: 'lt', label: 'Lietuvių' },
      { key: 'lv', label: 'Latviešu' },
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
          <Tooltip title={isDark ? t('Light mode') : t('Dark mode')}>
            <Button
              type="text"
              icon={isDark ? <SunIcon /> : <MoonIcon />}
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
