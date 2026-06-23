'use client';

import { App, ConfigProvider } from 'antd';
import AuthHydrator from '@/src/shared/providers/AuthHydrator';

export default function AppProviders({ children }) {
  return (
    <ConfigProvider
      theme={{
        token: {
          fontFamily: '"DM Sans", sans-serif',
        },
      }}
    >
      <App>
        <AuthHydrator>{children}</AuthHydrator>
      </App>
    </ConfigProvider>
  );
}
