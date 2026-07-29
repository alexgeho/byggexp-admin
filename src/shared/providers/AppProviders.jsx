'use client';

import { App } from 'antd';
import LanguageProvider from '@/src/i18n/LanguageProvider';
import AuthHydrator from '@/src/shared/providers/AuthHydrator';
import AppMessageBridge from '@/src/shared/providers/AppMessageBridge';
import CookieConsent from '@/src/shared/components/CookieConsent';

export default function AppProviders({ children }) {
  return (
    <LanguageProvider>
      <App>
        <AppMessageBridge>
          <AuthHydrator>{children}</AuthHydrator>
          <CookieConsent />
        </AppMessageBridge>
      </App>
    </LanguageProvider>
  );
}
