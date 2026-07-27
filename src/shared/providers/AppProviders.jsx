'use client';

import { App } from 'antd';
import LanguageProvider from '@/src/i18n/LanguageProvider';
import AuthHydrator from '@/src/shared/providers/AuthHydrator';
import AppMessageBridge from '@/src/shared/providers/AppMessageBridge';

export default function AppProviders({ children }) {
  return (
    <LanguageProvider>
      <App>
        <AppMessageBridge>
          <AuthHydrator>{children}</AuthHydrator>
        </AppMessageBridge>
      </App>
    </LanguageProvider>
  );
}
