import { Card, Col, Row, Space } from 'antd';
import DashboardStatIcon from '@/src/shared/components/DashboardStatIcon';
import scheduleClipboardIcon from '@/src/assets/icons/schedule-clipboard.svg';

const resolveSvgSrc = (asset) => (typeof asset === 'string' ? asset : asset.src);

function ScheduleStatCard({ color, icon, label, value }) {
  return (
    <Card className="dashboard-stat-card schedule-page__stat-card">
      <Space size={16} align="start">
        <span className={`dashboard-stat-card__icon dashboard-stat-card__icon--${color}`}>
          {icon}
        </span>
        <span>
          <span className="dashboard-stat-card__label">{label}</span>
          <strong className="dashboard-stat-card__value">{value}</strong>
        </span>
      </Space>
    </Card>
  );
}

export default function ScheduleStats({
  activeEmployees,
  activeAssignments,
  activeTasks,
  totalHours,
}) {
  const stats = [
    {
      key: 'active-employees',
      label: 'Active employees',
      value: activeEmployees,
      color: 'blue',
      icon: <DashboardStatIcon name="users" />,
    },
    {
      key: 'active-assignments',
      label: 'Active assignments',
      value: activeAssignments,
      color: 'green',
      icon: (
        <img
          src={resolveSvgSrc(scheduleClipboardIcon)}
          alt=""
          className="dashboard-stat-card__icon-image"
          aria-hidden="true"
        />
      ),
    },
    {
      key: 'active-tasks',
      label: 'Active tasks',
      value: activeTasks,
      color: 'orange',
      icon: <DashboardStatIcon name="check-circle" />,
    },
    {
      key: 'total-hours',
      label: 'Total hours',
      value: totalHours,
      color: 'purple',
      icon: <DashboardStatIcon name="clock" />,
    },
  ];

  return (
    <Row gutter={[16, 16]} className="schedule-page__stats">
      {stats.map(({ key, ...statProps }) => (
        <Col xs={24} sm={12} xl={6} key={key}>
          <ScheduleStatCard {...statProps} />
        </Col>
      ))}
    </Row>
  );
}
