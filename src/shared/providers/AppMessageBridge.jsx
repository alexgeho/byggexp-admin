'use client';

import { App } from 'antd';
import { useEffect } from 'react';
import { bindAppMessage } from '@/src/utils/appMessage';

export default function AppMessageBridge({ children }) {
  const { message } = App.useApp();

  useEffect(() => {
    bindAppMessage(message);
  }, [message]);

  return children;
}
