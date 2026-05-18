import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import AppHeader from '../components/AppHeader';

const { Content } = Layout;

export default function PublicLayout() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <AppHeader homePath="/login" showActions={false} />

      <Layout>
        <Content className="public-layout-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
