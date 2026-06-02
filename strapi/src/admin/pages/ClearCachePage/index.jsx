import React, { useState } from 'react';
import { Layout, HeaderLayout, ContentLayout, Box, Typography, Button, Flex } from '@strapi/design-system';
import { useFetchClient, useNotification } from '@strapi/helper-plugin';

const ClearCachePage = () => {
  const [loading, setLoading] = useState(false);
  const { post } = useFetchClient();
  const toggleNotification = useNotification();

  const onClearCache = async () => {
    setLoading(true);
    try {
      const res = await post('/api/cache/clear');
      const message =
        typeof res?.data?.message === 'string' && res.data.message
          ? res.data.message
          : 'Η εκκαθάριση cache ολοκληρώθηκε.';
      toggleNotification({ type: 'success', message });
    } catch (error) {
      const message =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        'Αποτυχία εκκαθάρισης cache.';
      toggleNotification({ type: 'warning', message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <HeaderLayout
        title="Εκκαθάριση cache"
        subtitle="Χειροκίνητη εκκαθάριση cache και προαιρετικό purge webhook."
      />
      <ContentLayout>
        <Box padding={6} background="neutral0" shadow="filterShadow" hasRadius>
          <Typography variant="omega" textColor="neutral600">
            Πάτησε το κουμπί για να γίνει εκκαθάριση cache στο Strapi. Αν έχει οριστεί
            <strong> CACHE_PURGE_WEBHOOK_URL</strong>, θα καλεστεί και εξωτερικό purge endpoint.
          </Typography>
          <Flex paddingTop={4}>
            <Button onClick={onClearCache} loading={loading}>
              Εκκαθάριση cache
            </Button>
          </Flex>
        </Box>
      </ContentLayout>
    </Layout>
  );
};

export default ClearCachePage;
