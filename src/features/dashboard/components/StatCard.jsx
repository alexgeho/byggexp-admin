import { Card, Space } from 'antd';

// One KPI tile in the dashboard stat row: a neutral icon, label and value.
// The signed today-vs-yesterday trend arrow was removed — a day-over-day delta on
// a cumulative count is near-meaningless and was the loudest, least-useful thing
// on the page (e.g. "Open tasks +4" rendered as a green up-arrow).
export default function StatCard({ icon, label, value }) {
  return (
    <Card className="dashboard-stat-card">
      <Space size={14} align="center">
        <span className="dashboard-stat-card__icon">{icon}</span>
        <span>
          <span className="dashboard-stat-card__label">{label}</span>
          <span className="dashboard-stat-card__value-row">
            <strong className="dashboard-stat-card__value">{value}</strong>
          </span>
        </span>
      </Space>
    </Card>
  );
}
