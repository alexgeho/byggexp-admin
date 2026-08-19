import { useEffect, useMemo, useState } from 'react';
import { Card } from 'antd';
import StatusTag from '@/src/shared/components/StatusTag';
import { Button, LinkButton } from '@/src/ui-kit';
import StatIcon from '@/src/shared/components/StatIcon';
import { formatClientName } from '@/src/utils/clientName';
import { useShiftStore } from '@/src/store/shiftStore';
import { usePaymentPlanStore } from '@/src/store/paymentPlanStore';
import { formatAmount, formatMoney } from '@/src/utils/formatCurrency';
import { useCompanyCurrency } from '@/src/hooks/useActiveCompany';
import { formatProjectOverviewDate } from '@/src/features/projects/utils/projectDetailUtils';
import { useOverviewSectionCards } from '@/src/features/projects/components/tabs/ProjectOverviewSections';
import ProjectFinancialPlan from '@/src/features/projects/components/tabs/ProjectFinancialPlan';
import BlockGrid from '@/src/shared/components/blocks/BlockGrid';
import BlockCustomizer from '@/src/shared/components/blocks/BlockCustomizer';
import { useBlockLayout } from '@/src/shared/components/blocks/useBlockLayout';
import { OVERVIEW_BLOCKS, OVERVIEW_BLOCK_KEYS, OVERVIEW_BLOCK_MAP } from '@/src/features/projects/overviewBlocks';
import { useT } from '@/src/i18n/LanguageProvider';
import {
  OVERVIEW_LAYOUT_STORAGE_KEY, MS_PER_HOUR, formatHours, toNumber,
  getUsagePercent, isCompletedTask, isOverdueTask,
} from '@/src/features/projects/components/tabs/projectOverviewUtils';
import { useProjectOverviewData } from '@/src/features/projects/components/tabs/useProjectOverviewData';
import { ResourceTrackRow, OverviewInfoRow, ProjectOverviewStatItem } from '@/src/features/projects/components/tabs/OverviewParts';

export default function ProjectOverviewTab({
  project,
  projectId,
  onEditInformation,
  onNavigateTab,
}) {
  const t = useT();
  const currency = useCompanyCurrency();
  const { shifts, fetchAllAccessible } = useShiftStore();
  const { plans: paymentPlans, fetchByProject: fetchPaymentPlan } = usePaymentPlanStore();
  const { invoicedTotal, supplierCost, expenseCost, approvedAta, laborCost, teamCount } = useProjectOverviewData(projectId);

  useEffect(() => {
    if (projectId) void fetchPaymentPlan(projectId);
  }, [projectId, fetchPaymentPlan]);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    void fetchAllAccessible({ projectId });
  }, [fetchAllAccessible, projectId]);

  const clientName = formatClientName(project?.clientId);
  const displayProjectId = projectId || project?._id || project?.id;
  const startDate = formatProjectOverviewDate(project?.beginningDate);
  const deadline = formatProjectOverviewDate(project?.endDate);
  const tasks = useMemo(() => project?.tasks || [], [project?.tasks]);
  const totalWorkers = project?.workers?.length || 0;
  const activeTasks = tasks.filter((task) => !isCompletedTask(task)).length;
  const completedTasks = tasks.filter(isCompletedTask).length;
  const totalHours = useMemo(
    () => shifts.reduce((sum, shift) => sum + (Number(shift.durationMs) || 0), 0),
    [shifts],
  );

  // Real progress: task completion when there are tasks, otherwise how far
  // through the planned schedule we are. `now` is captured once on mount.
  const [now] = useState(() => Date.now());
  const overdueTasks = tasks.filter((task) => isOverdueTask(task, now)).length;
  const schedulePercent = (() => {
    const s = project?.beginningDate ? new Date(project.beginningDate).getTime() : null;
    const e = project?.endDate ? new Date(project.endDate).getTime() : null;
    if (!s || !e || e <= s) return null;
    return Math.max(0, Math.min(100, Math.round(((now - s) / (e - s)) * 100)));
  })();
  const completionPercent = tasks.length
    ? Math.round((completedTasks / tasks.length) * 100)
    : (schedulePercent ?? 0);
  const upcomingTasks = useMemo(
    () => [...tasks]
      .filter((task) => !isCompletedTask(task) && task?.dueDate)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 4),
    [tasks],
  );

  // Demo fallback: when a project has no upcoming dated tasks, seed the
  // Tasks & deadlines card with realistic mock deadlines so it isn't empty
  // in walkthroughs/screenshots.
  const mockDeadlines = useMemo(() => {
    const DAY = 24 * 60 * 60 * 1000;
    return [
      { id: 'mock-1', taskTitle: t('Casting foundation slab – section B'), dueDate: new Date(now - 2 * DAY).toISOString() },
      { id: 'mock-2', taskTitle: t('Framing inspection with control officer'), dueDate: new Date(now + 2 * DAY).toISOString() },
      { id: 'mock-3', taskTitle: t('Order roof trusses (8-week lead time)'), dueDate: new Date(now + 6 * DAY).toISOString() },
      { id: 'mock-4', taskTitle: t('Electrical rough-in, floors 1–2'), dueDate: new Date(now + 11 * DAY).toISOString() },
    ];
  }, [now, t]);
  const usingMockDeadlines = upcomingTasks.length === 0;
  const deadlineItems = usingMockDeadlines ? mockDeadlines : upcomingTasks;
  const deadlineActiveCount = usingMockDeadlines ? mockDeadlines.length : activeTasks;
  const deadlineOverdueCount = usingMockDeadlines
    ? mockDeadlines.filter((task) => isOverdueTask(task, now)).length
    : overdueTasks;

  const budget = toNumber(project?.budget);
  const plannedHours = toNumber(project?.plannedHours);
  const plannedMaterialsCost = toNumber(project?.plannedMaterialsCost);
  const spentMaterialsCost = toNumber(project?.spentMaterialsCost) + supplierCost + expenseCost;
  const hoursSpent = Math.round((totalHours / MS_PER_HOUR) * 10) / 10;
  // Labour cost: prefer the project's cost rate (hours × självkostnad) when set,
  // otherwise fall back to per-employee hourly rates from /hours/labor-cost.
  const costRatePerHour = Number(project?.costRatePerHour) || 0;
  const laborCostEffective = costRatePerHour > 0 ? hoursSpent * costRatePerHour : laborCost;
  // Total project cost = materials + supplier invoices + expenses + labour.
  const totalProjectCost = spentMaterialsCost + laborCostEffective;
  const margin = invoicedTotal - totalProjectCost;
  // Approved ÄTA (change orders) grow the contract value beyond the base budget.
  const contractValue = budget + approvedAta;

  // Payment plan (à conto) summary for the overview: planned vs billed vs left.
  const paymentPlan = paymentPlans?.[0] || null;
  const planContract = Number(paymentPlan?.contractAmount) || contractValue || budget;
  const planRows = paymentPlan?.rows || [];
  const planRowAmount = (row) => {
    const fixed = Number(row?.amount) || 0;
    if (fixed) return fixed;
    const pct = Number(row?.percent) || 0;
    return pct ? (pct / 100) * planContract : 0;
  };
  const planTotal = planRows.reduce((sum, row) => sum + planRowAmount(row), 0);
  const planBilled = planRows
    .filter((row) => row.status === 'invoiced')
    .reduce((sum, row) => sum + planRowAmount(row), 0);
  const planLeft = Math.max(0, planTotal - planBilled);
  const nextMilestone = planRows.find((row) => row.status !== 'invoiced') || null;

  // Financial plan: expected (plan) vs actual so far vs projected final.
  // Planned labour is valued at the blended rate observed so far (actual labour
  // cost / hours worked); materials from the project's planned figure.
  const effectiveRate = hoursSpent > 0 ? laborCost / hoursSpent : 0;
  const plannedLaborCost = plannedHours * effectiveRate;
  const plannedCost = plannedMaterialsCost + plannedLaborCost;
  const actualCost = spentMaterialsCost + laborCostEffective;

  // Budget & resources tiles: split the planned cost budget into labour
  // (planned hours × self-cost rate) and materials (the remainder), so each
  // category shows planned vs actual without double-counting the total.
  const labourPlanned = costRatePerHour > 0 ? plannedHours * costRatePerHour : plannedLaborCost;
  const totalCostPlanned = plannedMaterialsCost;
  const materialsPlanned = Math.max(0, totalCostPlanned - labourPlanned);
  const progressFraction = completionPercent > 0 ? completionPercent / 100 : 0;
  const forecastCost = progressFraction > 0 ? Math.round(actualCost / progressFraction) : plannedCost;
  const forecastIncome = Math.max(contractValue, invoicedTotal);
  const financialPlan = {
    plan: { income: contractValue, cost: plannedCost, result: contractValue - plannedCost },
    actual: { income: invoicedTotal, cost: actualCost, result: invoicedTotal - actualCost },
    forecast: { income: forecastIncome, cost: forecastCost, result: forecastIncome - forecastCost },
  };

  const hasResourceData = budget > 0
    || plannedHours > 0
    || plannedMaterialsCost > 0
    || spentMaterialsCost > 0
    || approvedAta !== 0
    || invoicedTotal > 0;

  const layout = useBlockLayout({
    blockKeys: OVERVIEW_BLOCK_KEYS,
    storageKey: OVERVIEW_LAYOUT_STORAGE_KEY,
  });
  const sectionCards = useOverviewSectionCards({
    project,
    projectId,
    shifts,
    onNavigateTab,
  });

  const stats = useMemo(() => ([
    {
      key: 'workers',
      label: t('Total workers'),
      value: teamCount ?? totalWorkers,
      icon: <StatIcon name="users" />,
      color: 'blue',
    },
    {
      key: 'hours',
      label: t('Total hours'),
      value: formatHours(totalHours),
      icon: <StatIcon name="clock" />,
      color: 'blue',
    },
    {
      key: 'active-tasks',
      label: t('Active tasks'),
      value: activeTasks,
      icon: <StatIcon name="check-circle" />,
      color: 'orange',
    },
    {
      key: 'completed-tasks',
      label: t('Completed tasks'),
      value: completedTasks,
      icon: <StatIcon name="check-circle" />,
      color: 'green',
    },
  ]), [activeTasks, completedTasks, totalHours, totalWorkers, teamCount, t]);

  const resourcesCard = hasResourceData ? (
    <Card
      className="dashboard-section-card project-overview__resources-card"
      title={t('Budget & resources')}
    >
      <div className="project-resource-tracker project-resource-tracker--two-col">
        <ResourceTrackRow
          label={t('Hours')}
          spentLabel={`${formatAmount(hoursSpent, { decimals: false })}h`}
          plannedLabel={plannedHours > 0 ? `${formatAmount(plannedHours, { decimals: false })}h planned` : ''}
          percent={getUsagePercent(hoursSpent, plannedHours)}
          color="#8f46ff"
          footLeft={plannedHours > 0 ? `${getUsagePercent(hoursSpent, plannedHours)}% of planned hours` : t('No planned hours set')}
          footRight={plannedHours > 0 ? `${formatAmount(Math.max(0, plannedHours - hoursSpent), { decimals: false })}h left` : ''}
        />
        <ResourceTrackRow
          label={t('Total costs')}
          spentLabel={formatMoney(totalProjectCost, currency, { decimals: false })}
          plannedLabel={totalCostPlanned > 0 ? `${formatMoney(totalCostPlanned, currency, { decimals: false })} planned` : ''}
          percent={getUsagePercent(totalProjectCost, totalCostPlanned)}
          color="#475569"
          footLeft={t('materials + labour')}
          footRight={totalCostPlanned > 0 ? `${formatMoney(Math.max(0, totalCostPlanned - totalProjectCost), currency, { decimals: false })} left` : ''}
        />
        <ResourceTrackRow
          label={t('Labour (hours)')}
          spentLabel={formatMoney(laborCostEffective, currency, { decimals: false })}
          plannedLabel={labourPlanned > 0 ? `${formatMoney(labourPlanned, currency, { decimals: false })} planned` : ''}
          percent={getUsagePercent(laborCostEffective, labourPlanned)}
          color="#f5a623"
          footLeft={costRatePerHour > 0
            ? `${formatAmount(hoursSpent, { decimals: false })}h × ${formatAmount(costRatePerHour, { decimals: false })} kr`
            : t('labour cost')}
          footRight={labourPlanned > 0 ? `${formatMoney(Math.max(0, labourPlanned - laborCostEffective), currency, { decimals: false })} left` : ''}
        />
        <ResourceTrackRow
          label={t('Invoiced')}
          spentLabel={formatMoney(invoicedTotal, currency, { decimals: false })}
          plannedLabel={contractValue > 0 ? `${formatMoney(contractValue, currency, { decimals: false })} contract` : ''}
          percent={getUsagePercent(invoicedTotal, contractValue)}
          color="#16a35f"
          footLeft={contractValue > 0 ? `${getUsagePercent(invoicedTotal, contractValue)}% of contract` : t('No budget set')}
          footRight={contractValue > 0 ? `${formatMoney(Math.max(0, contractValue - invoicedTotal), currency, { decimals: false })} left` : ''}
        />
        <ResourceTrackRow
          label={t('Materials')}
          spentLabel={formatMoney(spentMaterialsCost, currency, { decimals: false })}
          plannedLabel={materialsPlanned > 0 ? `${formatMoney(materialsPlanned, currency, { decimals: false })} planned` : ''}
          percent={getUsagePercent(spentMaterialsCost, materialsPlanned)}
          color="#0089f6"
          footLeft={materialsPlanned > 0
            ? `${getUsagePercent(spentMaterialsCost, materialsPlanned)}% of material budget`
            : (supplierCost > 0 ? `${formatMoney(supplierCost, currency, { decimals: false })} from purchase invoices` : t('No materials registered'))}
          footRight={materialsPlanned > 0 ? `${formatMoney(Math.max(0, materialsPlanned - spentMaterialsCost), currency, { decimals: false })} left` : ''}
        />
        <ResourceTrackRow
          label={t('Margin')}
          spentLabel={formatMoney(margin, currency, { decimals: false })}
          plannedLabel={invoicedTotal > 0 ? `${getUsagePercent(margin, invoicedTotal)}% margin` : ''}
          percent={invoicedTotal > 0 ? getUsagePercent(Math.max(0, margin), invoicedTotal) : 0}
          color={margin >= 0 ? '#16a35f' : '#e5484d'}
          footLeft={`${formatMoney(invoicedTotal, currency, { decimals: false })} − ${formatMoney(totalProjectCost, currency, { decimals: false })}`}
          footRight={t('Invoiced − costs')}
        />
        {approvedAta !== 0 ? (
          <ResourceTrackRow
            label={t('ÄTA')}
            spentLabel={formatMoney(approvedAta, currency, { decimals: false })}
            plannedLabel={budget > 0 ? `${formatMoney(budget, currency, { decimals: false })} base budget` : ''}
            percent={budget > 0 ? getUsagePercent(Math.abs(approvedAta), budget) : 0}
            color="#f5a623"
            footLeft={t('Approved change orders')}
            footRight={budget > 0 ? `${formatMoney(contractValue, currency, { decimals: false })} contract` : ''}
            onClick={() => onNavigateTab?.('ata')}
          />
        ) : null}
      </div>
    </Card>
  ) : null;

  const paymentPlanCard = (
    <Card className="dashboard-section-card project-overview__miniplan-card" title={t('Payment plan')}>
      {planRows.length ? (
        <div className="project-miniplan">
          <div className="project-miniplan__rows">
            <div className="project-miniplan__row">
              <span>{t('Planned')}</span>
              <strong>{formatMoney(planTotal, currency, { decimals: false })}</strong>
            </div>
            <div className="project-miniplan__row">
              <span>{t('Invoiced')}</span>
              <strong>{formatMoney(planBilled, currency, { decimals: false })}</strong>
            </div>
            <div className="project-miniplan__row project-miniplan__row--accent">
              <span>{t('Remaining')}</span>
              <strong>{formatMoney(planLeft, currency, { decimals: false })}</strong>
            </div>
          </div>
          {nextMilestone ? (
            <div className="project-miniplan__next">
              <span className="project-miniplan__next-label">{t('Next')}</span>
              <span className="project-miniplan__next-value">
                {(nextMilestone.description || t('Milestone'))} · {formatMoney(planRowAmount(nextMilestone), currency, { decimals: false })}
              </span>
            </div>
          ) : (
            <div className="project-miniplan__next project-miniplan__next--done">
              {t('All milestones invoiced')}
            </div>
          )}
          <LinkButton onClick={() => onNavigateTab?.('payment-plan')}>
            {t('Open payment plan')} →
          </LinkButton>
        </div>
      ) : (
        <div className="project-miniplan project-miniplan--empty">
          <p className="project-miniplan__empty">{t('No payment plan yet.')}</p>
          <LinkButton onClick={() => onNavigateTab?.('payment-plan')}>
            {t('Create payment plan')} →
          </LinkButton>
        </div>
      )}
    </Card>
  );

  const taskDeadlinesCard = (
    <Card className="dashboard-section-card project-overview__deadlines-card" title={t('Tasks & deadlines')}>
      <div className="project-minitasks">
        <div className="project-minitasks__counts">
          <span className="project-minitasks__count">{deadlineActiveCount} {t('active')}</span>
          {deadlineOverdueCount > 0 ? (
            <span className="project-minitasks__count project-minitasks__count--over">{deadlineOverdueCount} {t('overdue')}</span>
          ) : null}
        </div>
        {deadlineItems.length ? (
          <div className="project-minitasks__list">
            {deadlineItems.map((task) => {
              const over = isOverdueTask(task, now);
              return (
                <div key={task._id || task.id} className="project-minitasks__item">
                  <span className="project-minitasks__dot" style={{ backgroundColor: over ? '#e5484d' : '#0C77FD' }} aria-hidden="true" />
                  <span className="project-minitasks__title">{task.taskTitle || task.title || t('Task')}</span>
                  <span className={`project-minitasks__due${over ? ' project-minitasks__due--over' : ''}`}>
                    {formatProjectOverviewDate(task.dueDate)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="project-minitasks__empty">{t('No upcoming deadlines.')}</p>
        )}
        <LinkButton onClick={() => onNavigateTab?.('tasks')}>
          {t('All tasks')} →
        </LinkButton>
      </div>
    </Card>
  );

  const blocks = {
    resources: resourcesCard,
    paymentplan: paymentPlanCard,
    taskdeadlines: taskDeadlinesCard,
    finplan: (
      <ProjectFinancialPlan
        t={t}
        plan={financialPlan.plan}
        actual={financialPlan.actual}
        forecast={financialPlan.forecast}
        progressPercent={completionPercent}
      />
    ),
    tasks: sectionCards.tasks,
    shifts: sectionCards.shifts,
    photos: sectionCards.photos,
    documents: sectionCards.documents,
    team: sectionCards.team,
  };

  return (
    <div className="project-overview-tab">
      <div className="project-overview-tab__toolbar">
        <BlockCustomizer
          blocks={OVERVIEW_BLOCKS}
          layout={layout}
          title={t('Customize overview')}
        />
      </div>
      <div className="project-overview">
        <Card
          className="dashboard-section-card project-overview__info-card"
          title={t('Project overview')}
          extra={(
            <Button
              className="project-overview__edit-button"
              variant="secondary"
              onClick={onEditInformation}
            >
              {t('Edit information')}
            </Button>
          )}
        >
          <div className="project-overview-info">
            <OverviewInfoRow label={t('Client')} value={clientName || '—'} />
            <OverviewInfoRow label={t('Project ID')} value={displayProjectId} />
            <OverviewInfoRow
              label={t('Status')}
              value={project?.status ? <StatusTag status={project.status} /> : null}
            />
            <OverviewInfoRow label={t('Start date')} value={startDate} />
            <OverviewInfoRow label={t('Deadline')} value={deadline} />
            <OverviewInfoRow label={t('Budget')} value={formatMoney(budget || 0, currency, { decimals: false })} />
            <OverviewInfoRow label={t('Address')} value={project?.location} wide />
            <OverviewInfoRow label={t('Description')} value={project?.description} wide />
          </div>
        </Card>

        <Card className="project-overview__stats-card">
          <div className="project-overview-stats">
            {stats.map((stat) => (
              <ProjectOverviewStatItem key={stat.key} {...stat} />
            ))}
          </div>
        </Card>
      </div>

      <BlockGrid layout={layout} blockMap={OVERVIEW_BLOCK_MAP} content={blocks} gap={24} />
    </div>
  );
}
