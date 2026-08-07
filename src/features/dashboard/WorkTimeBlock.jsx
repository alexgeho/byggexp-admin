'use client';

import { useMemo } from 'react';
import { Card, Empty, Tag } from 'antd';
import { useT } from '@/src/i18n/LanguageProvider';
import { getEntityId } from '@/src/utils/entityId';
import { checkWorkTime } from '@/src/utils/workTimeCompliance';

// Working-time (Arbetstidslagen) heads-up: workers whose last 7 days show a
// rest gap under 11 h or more than 48 h of work. Advisory, not a legal audit.
export default function WorkTimeBlock({ shifts = [], users = [], now }) {
  const t = useT();

  const rows = useMemo(() => checkWorkTime(shifts, { now }), [shifts, now]);
  const nameOf = useMemo(() => {
    const map = {};
    users.forEach((u) => { map[getEntityId(u)] = u.name || u.email; });
    return (id) => map[id] || map[String(id)] || t('Employee');
  }, [users, t]);

  return (
    <Card className="dashboard-section-card" title={t('Working time')}>
      {rows.length ? (
        <div className="worktime__list">
          {rows.map((row) => (
            <div key={row.workerId} className="worktime__row">
              <span className="worktime__name">{nameOf(row.workerId)}</span>
              <span className="worktime__tags">
                {row.issues.includes('rest') ? (
                  <Tag color="red">
                    {row.shortestRest != null
                      ? t('Rest {h} h < 11 h').replace('{h}', String(row.shortestRest))
                      : t('Too short rest')}
                  </Tag>
                ) : null}
                {row.issues.includes('weekly') ? (
                  <Tag color="orange">{`${row.weeklyHours} h / ${t('week')}`}</Tag>
                ) : null}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('No working-time issues')} />
      )}
    </Card>
  );
}
