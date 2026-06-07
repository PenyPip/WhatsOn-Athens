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
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Checkbox,
} from '@strapi/design-system';
import { useFetchClient, useNotification } from '@strapi/helper-plugin';

const App = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [applyMinScore, setApplyMinScore] = useState(0.85);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [result, setResult] = useState(null);
  const { get, post } = useFetchClient();
  const toggleNotification = useNotification();

  const loadStatus = useCallback(async () => {
    try {
      const res = await get('/api/more-lookup/status');
      setEnabled(res?.data?.enabled !== false);
      if (typeof res?.data?.applyMinScore === 'number') {
        setApplyMinScore(res.data.applyMinScore);
      }
    } catch {
      setEnabled(true);
    }
  }, [get]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const runLookup = async ({ matchCms, listAll }) => {
    setLoading(true);
    setResult(null);
    try {
      const res = await post('/api/more-lookup/run', {
        query: query.trim() || undefined,
        matchCms,
        listAll,
      });
      setResult(res.data);
      toggleNotification({
        type: 'success',
        message: res?.data?.message || 'Η αναζήτηση ολοκληρώθηκε.',
      });
    } catch (error) {
      const message =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        'Αποτυχία αναζήτησης More.';
      toggleNotification({ type: 'warning', message });
    } finally {
      setLoading(false);
    }
  };

  const applyToCms = async () => {
    setLoading(true);
    try {
      const res = await post('/api/more-lookup/run', {
        query: query.trim() || undefined,
        apply: true,
        overwriteExisting,
      });
      setResult(res.data);
      const applied = res?.data?.apply?.stats?.applied ?? 0;
      const skipped = res?.data?.apply?.stats?.skipped ?? 0;
      toggleNotification({
        type: applied > 0 ? 'success' : 'warning',
        message: res?.data?.message || `Ενημερώθηκαν ${applied} ταινίες · παραλείφθηκαν ${skipped}`,
      });
    } catch (error) {
      const message =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        'Αποτυχία εγγραφής στο CMS.';
      toggleNotification({ type: 'warning', message });
    } finally {
      setLoading(false);
    }
  };

  const matches = result?.matches ?? [];
  const matchedRows = matches.filter((r) => r.matched);
  const catalog = result?.catalog ?? [];
  const applyResult = result?.apply;

  return (
    <Layout>
      <HeaderLayout
        title="More event_group_code"
        subtitle="Αναζήτηση κωδικών More.com και ταύτιση με ταινίες CMS"
      />
      <ContentLayout>
        <Box padding={6} background="neutral0" shadow="filterShadow" hasRadius>
          {!enabled ? (
            <Typography textColor="danger600">
              Απενεργοποιημένο (MORE_LOOKUP_ENABLED=false). Άλλαξε env και κάνε restart Strapi.
            </Typography>
          ) : (
            <>
              <Typography variant="omega" textColor="neutral600">
                Ταυτίζει ταινίες CMS με More.com και μπορεί να γράψει απευθείας το{' '}
                <strong>event_group_code</strong> (π.χ. <code>evg_arkoudotrupa_1902_38</code>).
                Γράφει μόνο κενά πεδία με score ≥ {applyMinScore.toFixed(2)} και επιβεβαιωμένο More API.
              </Typography>

              <Box paddingTop={4} paddingBottom={2} maxWidth="480px">
                <TextInput
                  label="Αναζήτηση τίτλου (προαιρετικό)"
                  name="query"
                  placeholder="π.χ. Αρκουδότρυπα, Scary Movie"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </Box>

              <Flex gap={2} paddingTop={2} wrap="wrap">
                <Button loading={loading} onClick={() => runLookup({ matchCms: true, listAll: false })}>
                  Ταύτιση με CMS
                </Button>
                <Button variant="success" loading={loading} onClick={applyToCms}>
                  Γράψε στο CMS
                </Button>
                <Button
                  variant="secondary"
                  loading={loading}
                  onClick={() => runLookup({ matchCms: false, listAll: false })}
                >
                  Κατάλογος More (20)
                </Button>
                <Button
                  variant="tertiary"
                  loading={loading}
                  onClick={() => runLookup({ matchCms: false, listAll: true })}
                >
                  Πλήρης κατάλογος More
                </Button>
              </Flex>

              <Box paddingTop={3}>
                <Checkbox
                  checked={overwriteExisting}
                  onCheckedChange={(checked) => setOverwriteExisting(checked === true)}
                >
                  Αντικατάσταση υπάρχοντος event_group_code (conflicts)
                </Checkbox>
              </Box>
            </>
          )}
        </Box>

        {result?.stats ? (
          <Box paddingTop={4}>
            <Typography variant="pi" textColor="neutral600">
              {result.durationMs}ms · More ταινίες: {result.stats.moreMovies} · venue bundles:{' '}
              {result.stats.venueBundles}
              {result.stats.matched != null
                ? ` · ταύτιση CMS: ${result.stats.matched}/${result.stats.cmsMovies}`
                : ''}
            </Typography>
          </Box>
        ) : null}

        {applyResult ? (
          <Box paddingTop={4} padding={4} background="success100" hasRadius>
            <Typography variant="pi" fontWeight="bold">
              Εγγραφή CMS: {applyResult.stats.applied} ενημερώθηκαν · {applyResult.stats.skipped}{' '}
              παραλείφθηκαν
            </Typography>
            {applyResult.applied?.length ? (
              <Typography variant="pi" textColor="neutral600" paddingTop={2}>
                {applyResult.applied
                  .slice(0, 15)
                  .map((r) => `${r.cmsTitle} → ${r.eventGroupCode}`)
                  .join(' · ')}
              </Typography>
            ) : null}
          </Box>
        ) : null}

        {matchedRows.length > 0 ? (
          <Box paddingTop={6} background="neutral0" shadow="filterShadow" hasRadius>
            <Box padding={4}>
              <Typography variant="delta">Προτεινόμενα event_group_code (CMS → More)</Typography>
            </Box>
            <Table colCount={6} rowCount={matchedRows.length}>
              <Thead>
                <Tr>
                  <Th>
                    <Typography variant="sigma">CMS τίτλος</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">More τίτλος</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">event_group_code</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">Score</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">API</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">CMS</Typography>
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {matchedRows.map((row) => (
                  <Tr key={row.movieId}>
                    <Td>
                      <Typography textColor="neutral800">{row.cmsTitle}</Typography>
                    </Td>
                    <Td>
                      <Typography textColor="neutral600">{row.moreTitle}</Typography>
                    </Td>
                    <Td>
                      <Typography fontWeight="bold">{row.suggestedEventGroupCode}</Typography>
                    </Td>
                    <Td>
                      <Typography>{row.score.toFixed(2)}</Typography>
                    </Td>
                    <Td>
                      <Typography variant="pi">
                        {row.verify?.ok
                          ? `${row.verify.eventCount} ev / ${row.verify.venueCount} venues`
                          : row.verify?.error || '—'}
                      </Typography>
                    </Td>
                    <Td>
                      {row.cmsEventGroupCode ? (
                        row.conflict ? (
                          <Badge>έχει: {row.cmsEventGroupCode}</Badge>
                        ) : (
                          <Badge>OK</Badge>
                        )
                      ) : (
                        <Badge>κενό</Badge>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        ) : null}

        {result?.unmatched?.length > 0 ? (
          <Box paddingTop={4} padding={4} background="neutral100" hasRadius>
            <Typography variant="pi" fontWeight="bold">
              Χωρίς αξιόπιστο match ({result.unmatched.length})
            </Typography>
            <Typography variant="pi" textColor="neutral600" paddingTop={2}>
              {result.unmatched
                .slice(0, 20)
                .map((r) => r.cmsTitle)
                .join(' · ')}
            </Typography>
          </Box>
        ) : null}

        {catalog.length > 0 ? (
          <Box paddingTop={6} background="neutral0" shadow="filterShadow" hasRadius>
            <Box padding={4}>
              <Typography variant="delta">Κατάλογος More</Typography>
            </Box>
            <Table colCount={4} rowCount={Math.min(catalog.length, 50)}>
              <Thead>
                <Tr>
                  <Th>
                    <Typography variant="sigma">Ταινία More</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">event_group_code</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">events</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">venues</Typography>
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {catalog.slice(0, 50).map((row) => (
                  <Tr key={row.eventGroupCode}>
                    <Td>
                      <Typography>{row.moreTitle}</Typography>
                    </Td>
                    <Td>
                      <Typography fontWeight="bold">{row.eventGroupCode}</Typography>
                    </Td>
                    <Td>
                      <Typography>{row.verify?.ok ? row.verify.eventCount : '—'}</Typography>
                    </Td>
                    <Td>
                      <Typography>{row.verify?.ok ? row.verify.venueCount : '—'}</Typography>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
            {catalog.length > 50 ? (
              <Box padding={4}>
                <Typography variant="pi" textColor="neutral600">
                  Εμφανίζονται 50 από {catalog.length}. Χρησιμοποίησε φίλτρο τίτλου για στενότερη αναζήτηση.
                </Typography>
              </Box>
            ) : null}
          </Box>
        ) : null}
      </ContentLayout>
    </Layout>
  );
};

export default App;
