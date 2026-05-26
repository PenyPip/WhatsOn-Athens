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
      const { data } = await post('/venues/sync-program-status');
      setSummary(data?.summary ?? null);
      toggleNotification({
        type: 'success',
        message: data?.message || 'Ολοκληρώθηκε ο έλεγχος.',
      });
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
    <Layout>
      <HeaderLayout
        title="Έλεγχος προγράμματος σινεμά"
        subtitle="Διαβάζει το link από το info κάθε σινεμά· γράφει αποτέλεσμα στο info_update (το info δεν αλλάζει)."
        primaryAction={
          <Button onClick={runSync} loading={loading} startIcon={<Refresh />}>
            Τρέξιμο τώρα
          </Button>
        }
      />
      <ContentLayout>
        <Box padding={6} background="neutral0" shadow="filterShadow" hasRadius>
          <Typography variant="omega" textColor="neutral600">
            Σε κάθε σινεμά ανοίγει το URL από το info (όχι το more_link) και ψάχνει ημερομηνίες επόμενης
            εβδομάδας κινηματογράφου (Πέμ–Τετ). Η αυτόματη γραμμή πηγαίνει στο info_update· το info μένει ως έχει.
            Δεν αλλάζει το «ολοκλήρωσα» (updated).
          </Typography>
          {summary ? (
            <Box paddingTop={4}>
              <Typography>
                Ελέγχθηκαν {summary.total} σινεμά · {summary.complete} με προβολές · {summary.missing} needs_update ·{' '}
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
