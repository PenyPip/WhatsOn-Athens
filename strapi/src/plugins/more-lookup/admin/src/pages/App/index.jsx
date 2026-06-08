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
  const [showtimeSyncEnabled, setShowtimeSyncEnabled] = useState(true);
  const [result, setResult] = useState(null);
  const [syncReport, setSyncReport] = useState(null);
  const [pendingApproval, setPendingApproval] = useState([]);
  const { get, post } = useFetchClient();
  const toggleNotification = useNotification();

  const loadPending = useCallback(async () => {
    try {
      const res = await get('/api/more-lookup/pending');
      setPendingApproval(Array.isArray(res?.data?.pending) ? res.data.pending : []);
    } catch {
      setPendingApproval([]);
    }
  }, [get]);

  const loadStatus = useCallback(async () => {
    try {
      const res = await get('/api/more-lookup/status');
      setEnabled(res?.data?.enabled !== false);
      setShowtimeSyncEnabled(res?.data?.showtimeSyncEnabled !== false);
      if (typeof res?.data?.applyMinScore === 'number') {
        setApplyMinScore(res.data.applyMinScore);
      }
      await loadPending();
    } catch {
      setEnabled(true);
    }
  }, [get, loadPending]);

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
      setPendingApproval(res?.data?.pendingApproval ?? []);
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
      setPendingApproval(res?.data?.pendingApproval ?? []);
      const applied = res?.data?.apply?.stats?.applied ?? 0;
      const skipped = res?.data?.apply?.stats?.skipped ?? 0;
      toggleNotification({
        type: applied > 0 ? 'success' : 'warning',
        message: res?.data?.message || `Αυτόματες: ${applied} · προς έγκριση: ${skipped}`,
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

  const approveMovie = async (movieId, overwrite = false) => {
    setLoading(true);
    try {
      const res = await post('/api/more-lookup/approve', {
        movieId,
        overwriteExisting: overwrite,
      });
      setPendingApproval(
        (prev) => prev.filter((r) => Number(r.movieId) !== Number(movieId)),
      );
      toggleNotification({
        type: 'success',
        message: res?.data?.message || 'Η ταινία εγκρίθηκε.',
      });
    } catch (error) {
      const message =
        error?.response?.data?.error?.message ||
        error?.response?.data?.errors?.[0]?.error ||
        'Αποτυχία έγκρισης.';
      toggleNotification({ type: 'warning', message });
    } finally {
      setLoading(false);
    }
  };

  const rejectMovie = async (movieId) => {
    setLoading(true);
    try {
      await post('/api/more-lookup/reject', { movieId });
      setPendingApproval((prev) => prev.filter((r) => Number(r.movieId) !== Number(movieId)));
      toggleNotification({ type: 'info', message: 'Η πρόταση απορρίφθηκε.' });
    } catch (error) {
      toggleNotification({ type: 'warning', message: 'Αποτυχία απόρριψης.' });
    } finally {
      setLoading(false);
    }
  };

  const approveAllPending = async () => {
    if (!pendingApproval.length) return;
    setLoading(true);
    try {
      const res = await post('/api/more-lookup/approve', {
        approvals: pendingApproval.map((r) => ({
          movieId: r.movieId,
          eventGroupCode: r.suggestedEventGroupCode,
        })),
        overwriteExisting,
      });
      setPendingApproval([]);
      toggleNotification({
        type: res?.data?.ok ? 'success' : 'warning',
        message: res?.data?.message || 'Ολοκληρώθηκε η μαζική έγκριση.',
      });
    } catch (error) {
      toggleNotification({ type: 'warning', message: 'Αποτυχία μαζικής έγκρισης.' });
    } finally {
      setLoading(false);
    }
  };

  const syncShowtimes = async () => {
    setLoading(true);
    setSyncReport(null);
    try {
      const res = await post('/api/more-lookup/sync-showtimes', {});
      setSyncReport(res.data);
      toggleNotification({
        type: res?.data?.created > 0 ? 'success' : 'info',
        message: res?.data?.message || 'Συγχρονισμός προβολών ολοκληρώθηκε.',
      });
    } catch (error) {
      const message =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        'Αποτυχία συγχρονισμού προβολών.';
      toggleNotification({ type: 'warning', message });
    } finally {
      setLoading(false);
    }
  };

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
                <strong>event_group_code</strong> (π.χ. <code>evg_arkoudotrupa_1902_38</code>). Για
                δεύτερο κωδικό ίδιας ταινίας πρόσθεσε <strong>More event groups</strong> στην
                επεξεργασία ταινίας.
                Το «Γράψε στο CMS» περνάει μόνο αξιόπιστες (score ≥ {applyMinScore.toFixed(2)}).
                Οι υπόλοιπες πάνε σε <strong>έγκριση</strong> πριν μπουν στο CMS.
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
                  Αυτόματες στο CMS
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

        <Box paddingTop={4} padding={6} background="neutral0" shadow="filterShadow" hasRadius>
          <Typography variant="delta">Συγχρονισμός προβολών (cron)</Typography>
          <Typography variant="omega" textColor="neutral600" paddingTop={2}>
            Για κάθε ταινία με <strong>event_group_code</strong> και/ή επιπλέον{' '}
            <strong>More event groups</strong> στο CMS καλεί το More API (όλοι οι κωδικοί) και
            δημιουργεί <strong>Προβολή ταινίας</strong> όταν ο χώρος έχει <strong>venue_id</strong>{' '}
            (More venueId, π.χ. 3345). Μόνο προσθήκη νέων προβολών · cron 06:45.
          </Typography>
          {!showtimeSyncEnabled ? (
            <Box paddingTop={3}>
              <Typography textColor="danger600">
                Απενεργοποιημένο (MORE_SHOWTIME_SYNC_ENABLED=false).
              </Typography>
            </Box>
          ) : (
            <Flex paddingTop={4}>
              <Button variant="success" loading={loading} onClick={syncShowtimes}>
                Συγχρονισμός προβολών τώρα
              </Button>
            </Flex>
          )}
        </Box>

        {syncReport ? (
          <Box paddingTop={4} padding={4} background="primary100" hasRadius>
            <Typography variant="pi" fontWeight="bold">
              {syncReport.message ||
                `Προβολές: +${syncReport.created} νέες · ${syncReport.alreadyExists} υπήρχαν · ${syncReport.skippedNoVenue} χωρίς venue_id`}
            </Typography>
            {syncReport.errors?.length ? (
              <Typography variant="pi" textColor="danger600" paddingTop={2}>
                Σφάλματα: {syncReport.errors.length}
              </Typography>
            ) : null}
          </Box>
        ) : null}

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

        {pendingApproval.length > 0 ? (
          <Box paddingTop={6} background="neutral0" shadow="filterShadow" hasRadius>
            <Box padding={4}>
              <Flex justifyContent="space-between" alignItems="center" wrap="wrap" gap={2}>
                <Typography variant="delta">
                  Προς έγκριση ({pendingApproval.length})
                </Typography>
                <Button size="S" variant="success" loading={loading} onClick={approveAllPending}>
                  Έγκριση όλων
                </Button>
              </Flex>
              <Typography variant="pi" textColor="neutral600" paddingTop={2}>
                Χαμηλό score (&lt; {applyMinScore.toFixed(2)}) — έλεγξε και πάτα Έγκριση για να
                γραφτεί το <code>event_group_code</code>.
              </Typography>
            </Box>
            <Table colCount={6} rowCount={pendingApproval.length}>
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
                    <Typography variant="sigma">CMS τώρα</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">Ενέργειες</Typography>
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {pendingApproval.map((row) => (
                  <Tr key={row.movieId}>
                    <Td>
                      <Typography>{row.cmsTitle}</Typography>
                    </Td>
                    <Td>
                      <Typography textColor="neutral600">{row.moreTitle || '—'}</Typography>
                    </Td>
                    <Td>
                      <Typography fontWeight="bold">{row.suggestedEventGroupCode}</Typography>
                    </Td>
                    <Td>
                      <Typography>{Number(row.score).toFixed(2)}</Typography>
                    </Td>
                    <Td>
                      {row.cmsEventGroupCode ? (
                        <Badge>{row.cmsEventGroupCode}</Badge>
                      ) : (
                        <Badge>κενό</Badge>
                      )}
                    </Td>
                    <Td>
                      <Flex gap={1} wrap="wrap">
                        <Button
                          size="S"
                          variant="success"
                          loading={loading}
                          onClick={() =>
                            approveMovie(row.movieId, Boolean(row.cmsEventGroupCode))
                          }
                        >
                          Έγκριση
                        </Button>
                        <Button
                          size="S"
                          variant="tertiary"
                          loading={loading}
                          onClick={() => rejectMovie(row.movieId)}
                        >
                          Απόρριψη
                        </Button>
                      </Flex>
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
              Χωρίς καμία πρόταση ({result.unmatched.length})
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
