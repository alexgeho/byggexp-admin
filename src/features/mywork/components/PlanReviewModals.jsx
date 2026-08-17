import { Empty } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import AdminModal from '@/src/shared/components/AdminModal';
import { useT } from '@/src/i18n/LanguageProvider';

// One selectable task row shared by both day rituals.
function PlanRow({ task, selected, onToggle, dueLabel }) {
  const due = dueLabel(task);
  return (
    <button
      type="button"
      className={`mywork__plan-row${selected ? ' is-on' : ''}`}
      onClick={() => onToggle(task._id)}
    >
      <span className={`mywork__plan-check${selected ? ' is-on' : ''}`}>{selected ? <CheckOutlined /> : null}</span>
      <span className="mywork__plan-title">{task.taskTitle}</span>
      {due ? <span className={`mytasks__due mytasks__due--${due.tone}`}>{due.text}</span> : null}
    </button>
  );
}

// "Plan the day" ritual — pick what to pull into today.
export function PlanDayModal({ open, onCancel, onSave, candidates, selected, onToggle, saving, dueLabel }) {
  const t = useT();
  return (
    <AdminModal
      title={t('Plan the day')}
      open={open}
      onCancel={onCancel}
      onSave={onSave}
      saveText={selected.size ? `${t('Plan it')} ${selected.size}` : t('Plan it')}
      saveDisabled={!selected.size}
      saveLoading={saving}
      width={620}
      destroyOnHidden
    >
      <div className="mywork__plan">
        <p className="mywork__plan-sub">{t('Pick what you want to get done today')}</p>
        {candidates.length ? candidates.map((task) => (
          <PlanRow key={task._id} task={task} selected={selected.has(task._id)} onToggle={onToggle} dueLabel={dueLabel} />
        )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('Nothing to plan')} />}
      </div>
    </AdminModal>
  );
}

// "End the day" ritual — carry unfinished tasks over to tomorrow.
export function ReviewDayModal({ open, onCancel, onSave, candidates, selected, onToggle, saving, doneTodayCount, dueLabel }) {
  const t = useT();
  return (
    <AdminModal
      title={t('End the day')}
      open={open}
      onCancel={onCancel}
      onSave={onSave}
      saveText={selected.size ? `${t('Move to tomorrow')} (${selected.size})` : t('Done')}
      saveLoading={saving}
      width={620}
      destroyOnHidden
    >
      <div className="mywork__plan">
        <div className="mywork__review-stat">
          🎉 {t('You completed {n} today').replace('{n}', String(doneTodayCount))}
        </div>
        {candidates.length ? (
          <>
            <p className="mywork__plan-sub">{t('Move what you didn’t finish to tomorrow')}</p>
            {candidates.map((task) => (
              <PlanRow key={task._id} task={task} selected={selected.has(task._id)} onToggle={onToggle} dueLabel={dueLabel} />
            ))}
          </>
        ) : <p className="mywork__plan-sub">{t('All clear — nothing left for today.')}</p>}
      </div>
    </AdminModal>
  );
}
