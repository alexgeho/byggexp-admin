'use client';

import { useState } from 'react';
import { Button, Input } from 'antd';
import { useLanguage } from '@/src/i18n/LanguageProvider';

// Shared discussion panel. `guest` mode shows a name field (public page);
// team mode takes the author name from the caller. onSubmit({text, authorName}).
export default function CommentsPanel({ comments = [], onSubmit, guest = false }) {
  const { t } = useLanguage();
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await onSubmit({ text: text.trim(), authorName: guest ? (name.trim() || undefined) : undefined });
      setText('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ marginTop: 20, border: '1px solid var(--border,#e2e8f0)', borderRadius: 12, padding: '16px 18px' }}>
      <h3 style={{ margin: '0 0 10px' }}>{t('Discussion')}</h3>
      {comments.length === 0 ? (
        <p style={{ color: 'var(--muted,#64748b)', fontSize: 13, margin: '0 0 12px' }}>{t('No comments yet')}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
          {comments.map((c) => (
            <div key={c.id} style={{ borderLeft: '3px solid #c3d3ec', padding: '2px 0 2px 10px' }}>
              <div style={{ fontSize: 12, color: 'var(--muted,#64748b)' }}>
                <b style={{ color: '#0b1f3a' }}>{c.authorName || t('Guest')}</b>
                {c.guest ? ` · ${t('Guest')}` : ''} · {c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}
              </div>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>{c.text}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {guest ? (
          <Input placeholder={t('Your name')} value={name} onChange={(e) => setName(e.target.value)} style={{ maxWidth: 260 }} />
        ) : null}
        <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
          <Input placeholder={t('Write a comment…')} value={text} onChange={(e) => setText(e.target.value)}
            onPressEnter={submit} style={{ flex: 1, borderRadius: 10 }} />
          <Button type="primary" loading={busy} onClick={submit} style={{ flex: '0 0 auto', borderRadius: 10 }}>{t('Send')}</Button>
        </div>
      </div>
    </div>
  );
}
