'use client';

import { useState } from 'react';
import { BellOutlined } from '@ant-design/icons';
import { Badge, Button, Popover } from 'antd';
import './NotificationsDropdown.scss';

const EXAMPLE_NOTIFICATIONS = [
  {
    id: '1',
    text: 'Здесь появится уведомление, кликнув на которое можно будет перейти к сути уведомления',
    time: '10:24',
  },
  {
    id: '2',
    text: 'Здесь появится уведомление, кликнув на которое можно будет перейти к сути уведомления',
    time: '09:15',
  },
  {
    id: '3',
    text: 'Здесь появится уведомление, кликнув на которое можно будет перейти к сути уведомления',
    time: 'Вчера',
  },
];

export default function NotificationsDropdown() {
  const [open, setOpen] = useState(false);

  const handleNotificationClick = () => {
    setOpen(false);
    // Navigation to notification target will be added when API is ready.
  };

  const content = (
    <ul className="notifications-panel__list">
      {EXAMPLE_NOTIFICATIONS.map((notification) => (
        <li key={notification.id} className="notifications-panel__item-wrap">
          <button
            type="button"
            className="notifications-panel__item"
            onClick={handleNotificationClick}
          >
            <span className="notifications-panel__text">{notification.text}</span>
            <span className="notifications-panel__time">{notification.time}</span>
          </button>
        </li>
      ))}
    </ul>
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
      <Badge count={EXAMPLE_NOTIFICATIONS.length} offset={[-14, 5]}>
        <Button
          className="header-icon-button header-icon-button--notifications"
          icon={<BellOutlined />}
          aria-label="Notifications"
        />
      </Badge>
    </Popover>
  );
}
