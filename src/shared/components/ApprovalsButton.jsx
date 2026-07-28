'use client';

import { useEffect } from 'react';
import { Badge, Button } from 'antd';
import { CheckSquareOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useApprovalsStore } from '@/src/store/approvalsStore';
import { useT } from '@/src/i18n/LanguageProvider';

// Header entry to the "Att göra" approvals centre, with a live badge of items
// waiting for the owner (expenses + supplier invoices + leave). Sits next to
// the notifications bell.
export default function ApprovalsButton() {
  const t = useT();
  const router = useRouter();
  const { expenses, supplier, leave, fetchAll } = useApprovalsStore();

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  const count = expenses.length + supplier.length + leave.length;

  return (
    <Badge count={count} offset={[-14, 5]}>
      <Button
        className="header-icon-button header-icon-button--notifications"
        icon={<CheckSquareOutlined />}
        aria-label={t('To do')}
        onClick={() => router.push('/company/approvals')}
      />
    </Badge>
  );
}
