import React, { useCallback, useEffect, useState } from 'react';
import {
  Layout,
  HeaderLayout,
  ContentLayout,
  Box,
  Typography,
  Button,
  Flex,
  TextInput,
} from '@strapi/design-system';
import { useFetchClient, useNotification } from '@strapi/helper-plugin';

const App = () => {
  const { get, post } = useFetchClient();
  const toggleNotification = useNotification();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [hours, setHours] = useState('168');

  const refreshStatus = useCallback(async () => {
    try {
      const res = await get('/api/theater-alerts/status');
      setStatus(res?.data || null);
    } catch (error) {
      setStatus(null);
      toggleNotification({
        type: 'warning',
        message: error?.response?.data?.error || 'Αποτυχία φόρτωσης status mail.',
      });
    }
  }, [get, toggleNotification]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const onTest = async () => {
    setLoading(true);
    try {
      const res = await post('/api/theater-alerts/test', {
        ...(testTo.trim() ? { to: testTo.trim() } : {}),
      });
      const to = res?.data?.to || testTo || 'admin';
      toggleNotification({
        type: 'success',
        message: `Δοκιμαστικό mail στάλθηκε σε ${to}`,
      });
      await refreshStatus();
    } catch (error) {
      toggleNotification({
        type: 'warning',
        message:
          error?.response?.data?.error ||
          error?.response?.data?.message ||
          'Αποτυχία αποστολής δοκιμαστικού.',
      });
    } finally {
      setLoading(false);
    }
  };

  const onProcessRecent = async () => {
    setLoading(true);
    try {
      const res = await post('/api/theater-alerts/process-recent', {
        hours: Number(hours) || 168,
      });
      const d = res?.data || {};
      toggleNotification({
        type: 'success',
        message: `Catch-up: ${d.emailsSent ?? 0} emails · ${d.shows ?? 0} shows · venue ${d.venueEmails ?? 0}`,
      });
      await refreshStatus();
    } catch (error) {
      toggleNotification({
        type: 'warning',
        message:
          error?.response?.data?.error ||
          error?.response?.data?.message ||
          'Αποτυχία process-recent.',
      });
    } finally {
      setLoading(false);
    }
  };

  const mail = status?.mail;
  const smtp = status?.smtp;

  return (
    <Layout>
      <HeaderLayout
        title="Email ειδοποιήσεις θεάτρου"
        subtitle="Διάγνωση SMTP + δοκιμαστικό mail + catch-up για νέες παραστάσεις."
      />
      <ContentLayout>
        <Box padding={6} background="neutral0" shadow="filterShadow" hasRadius>
          <Typography variant="delta">Κατάσταση</Typography>
          <Box paddingTop={3}>
            <Typography variant="omega" textColor="neutral700">
              Enabled: {mail?.enabled ? 'ΝΑΙ' : 'ΟΧΙ'} · flag=
              {String(mail?.flag ?? '—')} · host={mail?.host || '—'} · from={mail?.from || '—'}
            </Typography>
          </Box>
          <Box paddingTop={2}>
            <Typography variant="omega" textColor={smtp?.ok ? 'success600' : 'danger600'}>
              SMTP verify: {smtp?.ok ? 'OK' : smtp?.error || smtp?.reason || '—'}
            </Typography>
          </Box>
          <Box paddingTop={2}>
            <Typography variant="pi" textColor="neutral600">
              {status?.hint || 'Φόρτωσε status μετά το deploy/restart.'}
            </Typography>
          </Box>

          <Flex gap={3} paddingTop={5} wrap="wrap" alignItems="flex-end">
            <Box style={{ minWidth: 220 }}>
              <TextInput
                label="Δοκιμαστικό προς (προαιρετικό)"
                name="testTo"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder="email@example.com"
              />
            </Box>
            <Button onClick={onTest} loading={loading}>
              Στείλε δοκιμαστικό
            </Button>
            <Button variant="secondary" onClick={refreshStatus} disabled={loading}>
              Ανανέωση status
            </Button>
          </Flex>

          <Flex gap={3} paddingTop={5} wrap="wrap" alignItems="flex-end">
            <Box style={{ minWidth: 140 }}>
              <TextInput
                label="Catch-up (ώρες)"
                name="hours"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            </Box>
            <Button variant="tertiary" onClick={onProcessRecent} loading={loading}>
              Ξαναστείλε πρόσφατα alerts
            </Button>
          </Flex>

          <Box paddingTop={4}>
            <Typography variant="pi" textColor="neutral600">
              Το catch-up κοιτάει παραστάσεις των τελευταίων Ν ωρών (default 168 = 7 ημέρες) και
              στέλνει σε follow + αγαπημένα θέατρα — χωρίς διπλότυπα.
            </Typography>
          </Box>
        </Box>
      </ContentLayout>
    </Layout>
  );
};

export default App;
