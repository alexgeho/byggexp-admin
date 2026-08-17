import { Empty, Table } from 'antd';
import SectionCard from '@/src/features/dashboard/components/SectionCard';
import { getEntityId } from '@/src/utils/entityId';

// Live personnel roster table (status / today's hours / project). Columns are
// built by the page since they depend on live shift data and navigation.
export default function PersonnelOverview({ actionHref, columns, rows, filters, hasActiveFilter }) {
  return (
    <SectionCard actionHref={actionHref} title="Personnel overview" filters={filters}>
      {rows.length ? (
        <Table
          className="dashboard-overview__table dashboard-personnel-overview__table"
          columns={columns}
          dataSource={rows}
          pagination={false}
          rowKey={(record) => getEntityId(record) || record.email || record.name}
          size="small"
        />
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={hasActiveFilter ? 'No personnel found for this project' : 'No personnel found'}
        />
      )}
    </SectionCard>
  );
}
