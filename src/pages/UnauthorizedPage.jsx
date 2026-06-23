import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getRedirectPathForUser, useAuthStore } from '../store/authStore';

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const handleGoBack = () => {
    navigate(getRedirectPathForUser(user));
  };

  return (
    <div className="public-page-card">
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
    </div>
  );
}
