'use client';

import { useEffect } from 'react';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Card, Space } from 'antd';
import OfferForm from '@/src/features/offers/components/OfferForm';
import { useLocation, useNavigate, useOutletContext } from '@/src/shared/routing/routerCompat';

export default function OfferCreatePage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { hideHeaderActions, showHeaderActions } = useOutletContext();

  useEffect(() => {
    hideHeaderActions();

    return () => showHeaderActions();
  }, [hideHeaderActions, showHeaderActions]);

  const goBackToOffers = () => {
    navigate(pathname.replace(/\/new$/, ''));
  };

  return (
    <div className="invoice-create-page offer-create-page">
      <Space className="invoice-create-page__toolbar" align="center">
        <Button icon={<ArrowLeftOutlined />} onClick={goBackToOffers}>
          Back to offers
        </Button>
      </Space>

      <Card
        className="invoice-create-page__card"
        title="Create offer"
        extra={(
          <Space>
            <Button onClick={goBackToOffers}>Cancel</Button>
            <Button type="primary" htmlType="submit" form="offer-form">
              Create offer
            </Button>
          </Space>
        )}
      >
        <OfferForm onClose={goBackToOffers} />
      </Card>
    </div>
  );
}
