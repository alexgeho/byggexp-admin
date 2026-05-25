import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import AppHeader from '../components/AppHeader';

const { Content } = Layout;

export default function PublicLayout() {
  return (
    <Layout className="app-shell">
      <AppHeader homePath="/login" showActions={false} />

      <Layout>
        <Content className="public-layout-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
