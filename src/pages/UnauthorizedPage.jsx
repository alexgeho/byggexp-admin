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
      title="Доступ запрещён"
      subTitle="У вас недостаточно прав для просмотра этой страницы"
      extra={
        <Button type="primary" onClick={handleGoBack}>
          Вернуться на главную
        </Button>
      }
    />
  );
}
