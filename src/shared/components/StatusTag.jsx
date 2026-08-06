'use client';

import { Tag } from 'antd';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { STATUS_REGISTRY } from '@/src/shared/statusRegistry';

// One status badge for the whole app. Colour and bilingual label come from the
// shared STATUS_REGISTRY, so a given status looks and reads the same everywhere.
// Unknown statuses fall back to a neutral tag showing the raw value.
export default function StatusTag({ status, upper = false, className }) {
  const { lang } = useLanguage();
  if (status === null || status === undefined || status === '') return null;

  const meta = STATUS_REGISTRY[String(status).toLowerCase()];
  const label = meta ? (lang === 'sv' ? meta.sv : meta.en) : String(status);

  return (
    <Tag color={meta?.color || 'default'} className={className}>
      {upper ? label.toUpperCase() : label}
    </Tag>
  );
}
