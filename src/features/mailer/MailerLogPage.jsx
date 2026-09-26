'use client';

import MailerEventsTable from './MailerEventsTable';
import './mailer.scss';

export default function MailerLogPage() {
  return (
    <div className="mailer-card">
      <MailerEventsTable />
    </div>
  );
}
