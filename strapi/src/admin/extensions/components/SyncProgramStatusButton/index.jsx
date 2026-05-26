import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@strapi/design-system';
import { Refresh } from '@strapi/icons';
import { useNotification, useFetchClient } from '@strapi/helper-plugin';

const VENUE_UID = 'api::venue.venue';

const SyncProgramStatusButton = () => {
  const { pathname } = useLocation();
  const [loading, setLoading] = useState(false);
  const toggleNotification = useNotification();
  const { post } = useFetchClient();

  if (!pathname.includes(`/collection-types/${VENUE_UID}`)) {
    return null;
  }

  const handleClick = async () => {
    setLoading(true);
    try {
      const { data } = await post('/venues/sync-program-status');
      toggleNotification({
        type: 'success',
        message: data?.message || 'Ολοκληρώθηκε ο έλεγχος προγράμματος.',
      });
      window.location.reload();
    } catch (err) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        'Αποτυχία ελέγχου προγράμματος.';
      toggleNotification({ type: 'warning', message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="secondary" startIcon={<Refresh />} onClick={handleClick} loading={loading}>
      Έλεγχος προγράμματος
    </Button>
  );
};

export default SyncProgramStatusButton;
