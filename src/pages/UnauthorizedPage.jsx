import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const getRedirectPath = useAuthStore((state) => state.getRedirectPath);

  const handleGoBack = () => {
    navigate(getRedirectPath());
  };

  return (
    <Result
      status="403"
      title="Access denied"
      subTitle="You do not have permission to view this page"
      extra={
        <Button type="primary" onClick={handleGoBack}>
          Return to home
        </Button>
      }
    />
  );
}
