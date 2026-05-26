import React, { useState } from 'react';
import { Box, Button, Typography } from '@strapi/design-system';
import { Layout, HeaderLayout, ContentLayout } from '@strapi/design-system';
import { Refresh } from '@strapi/icons';
import { useNotification, useFetchClient } from '@strapi/helper-plugin';

const SyncProgramPage = () => {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const toggleNotification = useNotification();
  const { post } = useFetchClient();

  const runSync = async () => {
    setLoading(true);
    try {
      const { data } = await post('/api/venues/sync-program-status');
      setSummary(data?.summary ?? null);
      toggleNotification({
        type: 'success',
        message: data?.message || 'Ολοκληρώθηκε ο έλεγχος.',
      });
    } catch (err) {
      const status = err?.response?.status;
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        (status ? `Σφάλμα ${status}` : null) ||
        err?.message ||
        'Αποτυχία ελέγχου προγράμματος.';
      toggleNotification({ type: 'warning', message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <HeaderLayout
        title="Έλεγχος προγράμματος σινεμά"
        subtitle="Διαβάζει το more_link (μέρες κάλυψης πάνω στην σελίδα)· ενημερώνει μόνο needs_update και info_update."
        primaryAction={
          <Button onClick={runSync} loading={loading} startIcon={<Refresh />}>
            Τρέξιμο τώρα
          </Button>
        }
      />
      <ContentLayout>
        <Box padding={6} background="neutral0" shadow="filterShadow" hasRadius>
          <Typography variant="omega" textColor="neutral600">
            Σε κάθε σινεμά ανοίγει το more_link και ψάχνει τουλάχιστον μία ημερομηνία της επόμενης εβδομάδας
            κινηματογράφου (Πέμπτη–Τετάρτη). Αλλάζει μόνο needs_update και info_update — ποτέ το updated.
          </Typography>
          {summary ? (
            <Box paddingTop={4}>
              <Typography>
                Ελέγχθηκαν {summary.total} σινεμά · {summary.ok} OK · {summary.needsImport} needs_update ·{' '}
                {summary.pendingManual} χωρίς «ολοκλήρωσα».
              </Typography>
            </Box>
          ) : null}
        </Box>
      </ContentLayout>
    </Layout>
  );
};

export default SyncProgramPage;
