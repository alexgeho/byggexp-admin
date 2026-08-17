import { Card, Space } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';

function StatTrend({ value, formatter = (trendValue) => trendValue }) {
  const numericValue = Number(value) || 0;
  const isNegative = numericValue < 0;
  const TrendIcon = isNegative ? ArrowDownOutlined : ArrowUpOutlined;
  // No "today" label — just the sign, number and any unit from the formatter.
  const formattedValue = `${numericValue > 0 ? '+' : ''}${formatter(numericValue)}`;

  return (
    <span className={`dashboard-stat-card__trend dashboard-stat-card__trend--${isNegative ? 'negative' : 'positive'}`}>
      <TrendIcon />
      {formattedValue}
    </span>
  );
}

// One KPI tile in the dashboard stat row: coloured icon, value and a signed
// today-vs-yesterday trend.
export default function StatCard({ color, icon, label, value, trendValue, trendLabel, trendFormatter }) {
  return (
    <Card className="dashboard-stat-card">
      <Space size={16} align="start">
        <span className={`dashboard-stat-card__icon dashboard-stat-card__icon--${color}`}>
          {icon}
        </span>
        <span>
          <span className="dashboard-stat-card__label">{label}</span>
          <span className="dashboard-stat-card__value-row">
            <strong className="dashboard-stat-card__value">{value}</strong>
            <StatTrend value={trendValue} label={trendLabel} formatter={trendFormatter} />
          </span>
        </span>
      </Space>
    </Card>
  );
}
