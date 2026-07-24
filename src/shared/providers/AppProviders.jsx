'use client';

import { App, ConfigProvider } from 'antd';
import AuthHydrator from '@/src/shared/providers/AuthHydrator';
import AppMessageBridge from '@/src/shared/providers/AppMessageBridge';

export default function AppProviders({ children }) {
  return (
    <ConfigProvider
      theme={{
        token: {
          fontFamily: '"Inter", sans-serif',
        },
      }}
    >
      <App>
        <AppMessageBridge>
          <AuthHydrator>{children}</AuthHydrator>
        </AppMessageBridge>
      </App>
    </ConfigProvider>
  );
}
