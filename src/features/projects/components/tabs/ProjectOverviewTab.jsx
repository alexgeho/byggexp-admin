import { useEffect, useMemo, useState } from 'react';
import { Card, Progress, Tag } from 'antd';
import { Button } from '@/src/ui-kit';
import apiClient from '@/src/api/apiClient';
import StatIcon from '@/src/shared/components/StatIcon';
import { formatClientName } from '@/src/utils/clientName';
import { useShiftStore } from '@/src/store/shiftStore';
import { getProjectStatusColor, getProjectStatusLabel } from '@/src/utils/projectStatus';
import { formatAmount, formatSek } from '@/src/utils/formatCurrency';
import { formatProjectOverviewDate } from '@/src/features/projects/utils/projectDetailUtils';
import { useOverviewSectionCards } from '@/src/features/projects/components/tabs/ProjectOverviewSections';
import OverviewCustomizer from '@/src/features/projects/components/tabs/OverviewCustomizer';
import ProjectFinancialPlan from '@/src/features/projects/components/tabs/ProjectFinancialPlan';
import { useOverviewLayout } from '@/src/features/projects/hooks/useOverviewLayout';
import { OVERVIEW_BLOCK_MAP } from '@/src/features/projects/overviewBlocks';
import { useT } from '@/src/i18n/LanguageProvider';

const MS_PER_HOUR = 3600000;

const formatHours = (durationMs = 0) => {
  const hours = Math.round((durationMs / MS_PER_HOUR) * 10) / 10;
  return `${hours || 0}h`;
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getUsagePercent = (spent, planned) => {
  if (!planned || planned <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((spent / planned) * 100));
};

function ResourceTrackRow({ label, spentLabel, plannedLabel, percent, color, footLeft, footRight }) {
  return (
    <div className="project-resource-track">
      <div className="project-resource-track__top">
        <span className="project-resource-track__label">{label}</span>
        <span className="project-resource-track__value">
          {spentLabel}
          {plannedLabel ? <small> / {plannedLabel}</small> : null}
        </span>
      </div>
      <Progress
        className="project-resource-track__bar"
        percent={percent}
        showInfo={false}
        strokeColor={color}
        trailColor="#e7ecf0"
      />
      <div className="project-resource-track__foot">
        <span>{footLeft}</span>
        <span>{footRight}</span>
      </div>
    </div>
  );
}

const isCompletedTask = (task) => task?.status === 'completed';

const isOverdueTask = (task, now) => !isCompletedTask(task)
  && task?.dueDate && new Date(task.dueDate).getTime() < now;

function OverviewInfoRow({ label, value }) {
  if (!value) {
    return null;
  }

  return (
    <div className="project-overview-info__row">
      <span className="project-overview-info__label">{label}</span>
      <span className="project-overview-info__value">{value}</span>
    </div>
  );
}

function ProjectOverviewStatItem({ color, icon, label, value }) {
  return (
    <div className="project-overview-stats__item">
      <span className={`project-overview-stats__icon project-overview-stats__icon--${color}`}>
        {icon}
      </span>
      <span className="project-overview-stats__content">
        <span className="project-overview-stats__label">{label}</span>
        <strong className="project-overview-stats__value">{value}</strong>
      </span>
    </div>
  );
}

export default function ProjectOverviewTab({
  project,
  projectId,
  onEditInformation,
  onNavigateTab,
}) {
  const t = useT();
  const { shifts, fetchAllAccessible } = useShiftStore();
  const [invoicedTotal, setInvoicedTotal] = useState(0);
  const [supplierCost, setSupplierCost] = useState(0);
  const [expenseCost, setExpenseCost] = useState(0);
  const [approvedAta, setApprovedAta] = useState(0);
  const [laborCost, setLaborCost] = useState(0);

  useEffect(() => {
    if (!projectId) return undefined;
    let active = true;
    apiClient
      .get('/hours/labor-cost')
      .then(({ data }) => { if (active) setLaborCost(Number(data?.byProject?.[projectId]) || 0); })
      .catch(() => { if (active) setLaborCost(0); });
    return () => { active = false; };
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return undefined;
    let active = true;
    apiClient
      .get(`/supplier-invoices/project/${projectId}/summary`)
      .then(({ data }) => { if (active) setSupplierCost(Number(data?.total) || 0); })
      .catch(() => { if (active) setSupplierCost(0); });
    return () => { active = false; };
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return undefined;
    let active = true;
    apiClient
      .get(`/expenses/project/${projectId}/summary`)
      .then(({ data }) => { if (active) setExpenseCost(Number(data?.total) || 0); })
      .catch(() => { if (active) setExpenseCost(0); });
    return () => { active = false; };
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return undefined;
    let active = true;
    apiClient
      .get(`/ata/project/${projectId}/summary`)
      .then(({ data }) => { if (active) setApprovedAta(Number(data?.approvedTotal) || 0); })
      .catch(() => { if (active) setApprovedAta(0); });
    return () => { active = false; };
  }, [projectId]);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    void fetchAllAccessible({ projectId });
  }, [fetchAllAccessible, projectId]);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    let active = true;

    const loadInvoicedTotal = async () => {
      try {
        const { data } = await apiClient.get('/invoices');
        const total = (data || [])
          .filter((invoice) => {
            const invoiceProjectId = typeof invoice.projectId === 'object'
              ? invoice.projectId?._id
              : invoice.projectId;
            return invoiceProjectId && String(invoiceProjectId) === String(projectId);
          })
          .reduce((sum, invoice) => sum + (Number(invoice.total) || 0), 0);

        if (active) {
          setInvoicedTotal(total);
        }
      } catch {
        if (active) {
          setInvoicedTotal(0);
        }
      }
    };

    void loadInvoicedTotal();

    return () => {
      active = false;
    };
  }, [projectId]);

  const clientName = formatClientName(project?.clientId);
  const displayProjectId = projectId || project?._id || project?.id;
  const startDate = formatProjectOverviewDate(project?.beginningDate);
  const deadline = formatProjectOverviewDate(project?.endDate);
  const tasks = project?.tasks || [];
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
  const openTasks = Math.max(0, activeTasks - overdueTasks);
  const schedulePercent = (() => {
    const s = project?.beginningDate ? new Date(project.beginningDate).getTime() : null;
    const e = project?.endDate ? new Date(project.endDate).getTime() : null;
    if (!s || !e || e <= s) return null;
    return Math.max(0, Math.min(100, Math.round(((now - s) / (e - s)) * 100)));
  })();
  const completionPercent = tasks.length
    ? Math.round((completedTasks / tasks.length) * 100)
    : (schedulePercent ?? 0);
  const progressBasis = tasks.length ? 'tasks' : (schedulePercent != null ? 'schedule' : 'none');
  const progressLegend = [
    { key: 'completed', label: 'Completed', color: '#04B251', value: completedTasks },
    { key: 'open', label: 'In progress', color: '#0C77FD', value: openTasks },
    { key: 'overdue', label: 'Overdue', color: '#e5484d', value: overdueTasks },
  ];

  const budget = toNumber(project?.budget);
  const plannedHours = toNumber(project?.plannedHours);
  const plannedMaterialsCost = toNumber(project?.plannedMaterialsCost);
  const spentMaterialsCost = toNumber(project?.spentMaterialsCost) + supplierCost + expenseCost;
  const hoursSpent = Math.round((totalHours / MS_PER_HOUR) * 10) / 10;
  const margin = invoicedTotal - spentMaterialsCost;
  // Approved ÄTA (change orders) grow the contract value beyond the base budget.
  const contractValue = budget + approvedAta;

  // Financial plan: expected (plan) vs actual so far vs projected final.
  // Planned labour is valued at the blended rate observed so far (actual labour
  // cost / hours worked); materials from the project's planned figure.
  const effectiveRate = hoursSpent > 0 ? laborCost / hoursSpent : 0;
  const plannedLaborCost = plannedHours * effectiveRate;
  const plannedCost = plannedMaterialsCost + plannedLaborCost;
  const actualCost = spentMaterialsCost + laborCost;
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

  const layout = useOverviewLayout();
  const sectionCards = useOverviewSectionCards({
    project,
    projectId,
    shifts,
    onNavigateTab,
  });

  const stats = useMemo(() => ([
    {
      key: 'workers',
      label: 'Total workers',
      value: totalWorkers,
      icon: <StatIcon name="users" />,
      color: 'blue',
    },
    {
      key: 'hours',
      label: 'Total hours',
      value: formatHours(totalHours),
      icon: <StatIcon name="clock" />,
      color: 'blue',
    },
    {
      key: 'active-tasks',
      label: 'Active tasks',
      value: activeTasks,
      icon: <StatIcon name="check-circle" />,
      color: 'orange',
    },
    {
      key: 'completed-tasks',
      label: 'Completed tasks',
      value: completedTasks,
      icon: <StatIcon name="check-circle" />,
      color: 'green',
    },
  ]), [activeTasks, completedTasks, totalHours, totalWorkers]);

  const resourcesCard = hasResourceData ? (
    <Card
      className="dashboard-section-card project-overview__resources-card"
      title="Budget &amp; resources"
    >
      <div className="project-resource-tracker">
        <ResourceTrackRow
          label="Invoiced"
          spentLabel={formatSek(invoicedTotal, { decimals: false })}
          plannedLabel={contractValue > 0 ? `${formatSek(contractValue, { decimals: false })} contract` : ''}
          percent={getUsagePercent(invoicedTotal, contractValue)}
          color="#16a35f"
          footLeft={contractValue > 0 ? `${getUsagePercent(invoicedTotal, contractValue)}% of contract` : 'No budget set'}
          footRight={contractValue > 0 ? `${formatSek(Math.max(0, contractValue - invoicedTotal), { decimals: false })} left` : ''}
        />
        {approvedAta !== 0 ? (
          <ResourceTrackRow
            label="ÄTA"
            spentLabel={formatSek(approvedAta, { decimals: false })}
            plannedLabel={budget > 0 ? `${formatSek(budget, { decimals: false })} base budget` : ''}
            percent={budget > 0 ? getUsagePercent(Math.abs(approvedAta), budget) : 0}
            color="#f5a623"
            footLeft="Approved change orders"
            footRight={budget > 0 ? `${formatSek(contractValue, { decimals: false })} contract` : ''}
          />
        ) : null}
        <ResourceTrackRow
          label="Hours"
          spentLabel={`${formatAmount(hoursSpent, { decimals: false })}h`}
          plannedLabel={plannedHours > 0 ? `${formatAmount(plannedHours, { decimals: false })}h planned` : ''}
          percent={getUsagePercent(hoursSpent, plannedHours)}
          color="#8f46ff"
          footLeft={plannedHours > 0 ? `${getUsagePercent(hoursSpent, plannedHours)}% of planned hours` : 'No planned hours set'}
          footRight={plannedHours > 0 ? `${formatAmount(Math.max(0, plannedHours - hoursSpent), { decimals: false })}h left` : ''}
        />
        <ResourceTrackRow
          label="Costs"
          spentLabel={formatSek(spentMaterialsCost, { decimals: false })}
          plannedLabel={plannedMaterialsCost > 0 ? `${formatSek(plannedMaterialsCost, { decimals: false })} planned` : ''}
          percent={getUsagePercent(spentMaterialsCost, plannedMaterialsCost)}
          color="#0089f6"
          footLeft={supplierCost > 0 ? `${formatSek(supplierCost, { decimals: false })} from supplier invoices` : (plannedMaterialsCost > 0 ? `${getUsagePercent(spentMaterialsCost, plannedMaterialsCost)}% of budget` : 'No costs registered')}
          footRight={plannedMaterialsCost > 0 ? `${formatSek(Math.max(0, plannedMaterialsCost - spentMaterialsCost), { decimals: false })} left` : ''}
        />
        <ResourceTrackRow
          label="Margin"
          spentLabel={formatSek(margin, { decimals: false })}
          plannedLabel={invoicedTotal > 0 ? `${getUsagePercent(margin, invoicedTotal)}% margin` : ''}
          percent={invoicedTotal > 0 ? getUsagePercent(Math.max(0, margin), invoicedTotal) : 0}
          color={margin >= 0 ? '#16a35f' : '#e5484d'}
          footLeft="Invoiced − costs"
          footRight=""
        />
      </div>
    </Card>
  ) : null;

  const progressCard = (
    <Card
      className="dashboard-section-card project-overview__progress-card"
      title="Progress"
    >
      <div className="project-overview-progress">
        <div className="project-overview-progress__header">
          <span className="project-overview-progress__label">
            {progressBasis === 'schedule' ? 'Schedule elapsed' : 'Overall completion'}
          </span>
          <span className="project-overview-progress__value">{completionPercent}%</span>
        </div>
        <Progress
          className="project-overview-progress__bar"
          percent={completionPercent}
          showInfo={false}
          strokeColor="#0089f6"
          trailColor="#e7ecf0"
        />
        {progressBasis === 'tasks' ? (
          <div className="project-overview-progress__legend">
            {progressLegend.map((item) => (
              <div key={item.key} className="project-overview-progress__legend-item">
                <div className="project-overview-progress__legend-top">
                  <span
                    className="project-overview-progress__legend-dot"
                    style={{ backgroundColor: item.color }}
                    aria-hidden="true"
                  />
                  <span className="project-overview-progress__legend-label">{item.label}</span>
                </div>
                <span className="project-overview-progress__legend-value">{item.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="project-overview-progress__note">
            {progressBasis === 'schedule'
              ? 'Based on the project timeline — add tasks to track completion.'
              : 'Add tasks or set start/end dates to track progress.'}
          </div>
        )}
      </div>
    </Card>
  );

  const blocks = {
    resources: resourcesCard,
    progress: progressCard,
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

  const visibleBlocks = layout.order.filter((key) => !layout.isHidden(key) && blocks[key]);

  return (
    <div className="project-overview-tab">
      <div className="project-overview-tab__toolbar">
        <OverviewCustomizer
          order={layout.order}
          isHidden={layout.isHidden}
          toggle={layout.toggle}
          move={layout.move}
          reset={layout.reset}
          isCustomized={layout.isCustomized}
        />
      </div>
      <div className="project-overview">
        <Card
          className="dashboard-section-card project-overview__info-card"
          title="Project overview"
          extra={(
            <Button
              className="project-overview__edit-button"
              variant="secondary"
              onClick={onEditInformation}
            >
              Edit information
            </Button>
          )}
        >
          <div className="project-overview-info">
            <OverviewInfoRow label="Client" value={clientName || '—'} />
            <OverviewInfoRow label="Project ID" value={displayProjectId} />
            <OverviewInfoRow label="Address" value={project?.location} />
            <OverviewInfoRow
              label="Status"
              value={project?.status ? (
                <Tag className="status-tag" color={getProjectStatusColor(project.status)}>
                  {getProjectStatusLabel(project.status)}
                </Tag>
              ) : null}
            />
            <OverviewInfoRow label="Start date" value={startDate} />
            <OverviewInfoRow label="Deadline" value={deadline} />
            <OverviewInfoRow label="Budget" value={formatSek(budget || 0, { decimals: false })} />
            <OverviewInfoRow label="Description" value={project?.description} />
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

      {visibleBlocks.length ? (
        <div className="project-overview-blocks">
          {visibleBlocks.map((key) => (
            <div
              key={key}
              className={`project-overview-block project-overview-block--${OVERVIEW_BLOCK_MAP[key].size}`}
            >
              {blocks[key]}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
