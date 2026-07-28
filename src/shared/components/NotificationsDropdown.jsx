'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BellOutlined } from '@ant-design/icons';
import { Badge, Button, Empty, Popover } from 'antd';
import { useT } from '@/src/i18n/LanguageProvider';
import { useNotifications } from '@/src/shared/hooks/useNotifications';
import { formatAdminDate } from '@/src/utils/formatDateTime';
import { formatSek } from '@/src/utils/formatCurrency';
import './NotificationsDropdown.scss';

const SECTION_SEGMENTS = ['admin', 'company', 'worker'];

const hrefFor = (type, base) => {
  if (type === 'task') return `/${base}/tasks`;
  if (type === 'supplier') return `/${base}/invoicing/supplier-invoices`;
  if (type === 'invoice') return `/${base}/invoicing/invoices`;
  return `/${base}`;
};

export default function NotificationsDropdown() {
  const t = useT();
  const pathname = usePathname();
  const notifications = useNotifications();
  const [open, setOpen] = useState(false);

  const segment = pathname?.split('/')[1];
  const base = SECTION_SEGMENTS.includes(segment) ? segment : 'company';

  const content = notifications.length ? (
    <ul className="notifications-panel__list">
      {notifications.map((notification) => (
        <li key={notification.id} className="notifications-panel__item-wrap">
          <Link
            href={hrefFor(notification.type, base)}
            className={`notifications-panel__item notifications-panel__item--${notification.type}`}
            onClick={() => setOpen(false)}
          >
            <span className="notifications-panel__body">
              <span className="notifications-panel__title">{t(notification.title)}</span>
              <span className="notifications-panel__text">
                {notification.text}
                {notification.amount != null
                  ? ` · ${formatSek(notification.amount, { decimals: false })}`
                  : ''}
              </span>
            </span>
            <span className="notifications-panel__time">
              {notification.dueDate ? formatAdminDate(notification.dueDate) : ''}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  ) : (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={t('No notifications')}
    />
  );

  return (
    <Popover
      content={content}
      trigger="click"
      placement="bottomRight"
      arrow={false}
      open={open}
      onOpenChange={setOpen}
      classNames={{ root: 'notifications-popover' }}
    >
      <Badge count={notifications.length} offset={[-14, 5]}>
        <Button
          className="header-icon-button header-icon-button--notifications"
          icon={<BellOutlined />}
          aria-label={t('Notifications')}
        />
      </Badge>
    </Popover>
  );
}
