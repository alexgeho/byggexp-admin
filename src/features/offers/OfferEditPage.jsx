'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Card, Space, Spin, message } from 'antd';
import apiClient from '@/src/api/apiClient';
import OfferForm from '@/src/features/offers/components/OfferForm';
import { useLocation, useNavigate, useOutletContext, useParams } from '@/src/shared/routing/routerCompat';
import { formatApiError } from '@/src/utils/formError';

export default function OfferEditPage() {
  const { id } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { hideHeaderActions, showHeaderActions } = useOutletContext();
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hideHeaderActions();

    return () => showHeaderActions();
  }, [hideHeaderActions, showHeaderActions]);

  const loadOffer = useCallback(async () => {
    if (!id) {
      return;
    }

    setLoading(true);
    try {
      const { data } = await apiClient.get(`/offers/${id}`);
      setOffer(data);
    } catch (err) {
      setOffer(null);
      message.error(formatApiError(err, 'Failed to load offer'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadOffer();
  }, [loadOffer]);

  const goBackToOffers = () => {
    navigate(pathname.replace(/\/[^/]+\/edit$/, ''));
  };

  if (loading) {
    return (
      <div className="invoice-create-page">
        <Spin size="large" />
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="invoice-create-page">
        <Button icon={<ArrowLeftOutlined />} onClick={goBackToOffers}>
          Back to offers
        </Button>
      </div>
    );
  }

  return (
    <div className="invoice-create-page offer-create-page">
      <Space className="invoice-create-page__toolbar" align="center">
        <Button icon={<ArrowLeftOutlined />} onClick={goBackToOffers}>
          Back to offers
        </Button>
      </Space>

      <Card
        className="invoice-create-page__card"
        title="Edit offer"
        extra={(
          <Space>
            <Button onClick={goBackToOffers}>Cancel</Button>
            <Button type="primary" htmlType="submit" form="offer-form">
              Save offer
            </Button>
          </Space>
        )}
      >
        <OfferForm onClose={goBackToOffers} offerToEdit={offer} />
      </Card>
    </div>
  );
}
