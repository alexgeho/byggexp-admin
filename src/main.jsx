import { createRoot } from 'react-dom/client';
import { ConfigProvider } from 'antd';
import App from './App';
import './styles/index.scss';

createRoot(document.getElementById('root')).render(
  <ConfigProvider
    theme={{
      token: {
        fontFamily: '"DM Sans", sans-serif',
      },
    }}
  >
    <App />
  </ConfigProvider>
);