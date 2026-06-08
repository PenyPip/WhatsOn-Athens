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

function cmsTypeLabel(contentType) {
  if (contentType === 'theater_show') return 'Θέατρο';
  if (contentType === 'venue') return 'Χώρος';
  return 'Ταινία';
}

function catalogKindLabel(row) {
  if (row.kind === 'venue_bundle') return 'Σινεμά bundle';
  if (row.category === 'theater') return 'Θέατρο';
  return 'Ταινία';
}

function catalogCmsStatusLabel(row) {
  if (row.cmsStatus === 'in_cms') return 'Στο CMS';
  if (row.cmsStatus === 'pending') return 'Προς έγκριση';
  return 'Λείπει';
}

function rowKey(row) {
  return `${row.contentType || 'movie'}:${row.cmsId ?? row.movieId ?? row.theaterShowId}`;
}

const CATALOG_PAGE_SIZE = 50;

function ActionRow({ title, description, children }) {
  return (
    <Flex
      gap={4}
      padding={4}
      alignItems="flex-start"
      justifyContent="space-between"
      wrap="wrap"
      background="neutral100"
      hasRadius
    >
      <Box style={{ flex: '1 1 16rem', minWidth: '14rem' }}>
        <Typography fontWeight="semiBold" textColor="neutral800">
          {title}
        </Typography>
        <Typography variant="pi" textColor="neutral600" paddingTop={1}>
          {description}
        </Typography>
      </Box>
      <Flex alignItems="center" style={{ flexShrink: 0 }}>
        {children}
      </Flex>
    </Flex>
  );
}

function SectionIntro({ children }) {
  return (
    <Typography variant="omega" textColor="neutral600">
      {children}
    </Typography>
  );
}

const App = () => {
  const [query, setQuery] = useState('');
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogOnlyMissing, setCatalogOnlyMissing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [applyMinScore, setApplyMinScore] = useState(0.45);
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

  useEffect(() => {
    setCatalogPage(1);
  }, [result, catalogOnlyMissing]);

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
  const catalogFiltered = catalogOnlyMissing
    ? catalog.filter((row) => !row.inCms)
    : catalog;
  const catalogPageCount = Math.max(1, Math.ceil(catalogFiltered.length / CATALOG_PAGE_SIZE));
  const catalogPageSafe = Math.min(Math.max(1, catalogPage), catalogPageCount);
  const catalogPageRows = catalogFiltered.slice(
    (catalogPageSafe - 1) * CATALOG_PAGE_SIZE,
    catalogPageSafe * CATALOG_PAGE_SIZE,
  );
  const applyResult = result?.apply;

  const approveItem = async (row, overwrite = false) => {
    setLoading(true);
    try {
      const res = await post('/api/more-lookup/approve', {
        contentType: row.contentType,
        cmsId: row.cmsId ?? row.movieId ?? row.theaterShowId,
        movieId: row.movieId,
        theaterShowId: row.theaterShowId,
        overwriteExisting: overwrite,
      });
      setPendingApproval((prev) => prev.filter((r) => rowKey(r) !== rowKey(row)));
      toggleNotification({
        type: 'success',
        message: res?.data?.message || 'Η εγγραφή εγκρίθηκε.',
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

  const rejectItem = async (row) => {
    setLoading(true);
    try {
      await post('/api/more-lookup/reject', {
        contentType: row.contentType,
        cmsId: row.cmsId ?? row.movieId ?? row.theaterShowId,
        movieId: row.movieId,
        theaterShowId: row.theaterShowId,
      });
      setPendingApproval((prev) => prev.filter((r) => rowKey(r) !== rowKey(row)));
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
          contentType: r.contentType,
          cmsId: r.cmsId ?? r.movieId ?? r.theaterShowId,
          movieId: r.movieId,
          theaterShowId: r.theaterShowId,
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
        message: res?.data?.message || 'Συγχρονισμός ολοκληρώθηκε.',
      });
    } catch (error) {
      const message =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        'Αποτυχία συγχρονισμού.';
      toggleNotification({ type: 'warning', message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <HeaderLayout
        title="More — κωδικοί & συγχρονισμός"
        subtitle="Σύνδεση CMS (ταινίες, θέατρο) με More.com και εισαγωγή προβολών"
      />
      <ContentLayout>
        {!enabled ? (
          <Box padding={6} background="neutral0" shadow="filterShadow" hasRadius>
            <Typography textColor="danger600">
              Απενεργοποιημένο (MORE_LOOKUP_ENABLED=false). Άλλαξε env και κάνε restart Strapi.
            </Typography>
          </Box>
        ) : (
          <>
            <Box padding={6} background="neutral0" shadow="filterShadow" hasRadius>
              <Typography variant="delta">Τι κάνει αυτή η σελίδα</Typography>
              <Box paddingTop={3}>
                <SectionIntro>
                  Το More.com δίνει σε κάθε ταινία/παράσταση έναν κωδικό{' '}
                  <strong>event_group_code</strong> (π.χ. <code>evg_arkoudotrupa_…</code>). Με αυτόν
                  συγχρονίζονται οι ώρες προβολής. Εδώ:
                </SectionIntro>
                <Box paddingTop={2} paddingLeft={2}>
                  <Typography variant="pi" textColor="neutral600">
                    1. Βρίσκεις/ταυτίζεις κωδικούς CMS ↔ More
                    <br />
                    2. Τους γράφεις στο πεδίο <strong>event_group_code</strong> της ταινίας ή της
                    παράστασης
                    <br />
                    3. Τρέχεις συγχρονισμό για νέες προβολές / θεατρικές παραστάσεις
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Box paddingTop={4} padding={6} background="neutral0" shadow="filterShadow" hasRadius>
              <Typography variant="delta">Βήμα 1 — Κωδικοί More</Typography>
              <Box paddingTop={2} paddingBottom={4} maxWidth="32rem">
                <TextInput
                  label="Φίλτρο τίτλου (προαιρετικό)"
                  name="query"
                  hint="Περιορίζει ταύτιση ή κατάλογο — π.χ. «Αρκουδότρυπα»"
                  placeholder="π.χ. Αρκουδότρυπα"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </Box>

              <Flex direction="column" gap={3}>
                <ActionRow
                  title="1. Ταύτιση με CMS (μόνο προβολή)"
                  description="Συγκρίνει ταινίες και παραστάσεις θεάτρου του CMS με τον κατάλογο More. Δείχνει πίνακα προτάσεων και «Προς έγκριση» για χαμηλό score — δεν αλλάζει τίποτα στο CMS."
                >
                  <Button loading={loading} onClick={() => runLookup({ matchCms: true, listAll: false })}>
                    Εκτέλεση ταύτισης
                  </Button>
                </ActionRow>

                <ActionRow
                  title="2. Αυτόματη εγγραφή στο CMS"
                  description={`Γράφει event_group_code όπου το score ≥ ${applyMinScore.toFixed(2)}. Για ταινίες με χαμηλότερο score: έλεγξε τον πίνακα και βάλε τον κωδικό χειροκίνητα. Για θέατρο: «Προς έγκριση».`}
                >
                  <Button variant="success" loading={loading} onClick={applyToCms}>
                    Γράψε αυτόματα
                  </Button>
                </ActionRow>

                <ActionRow
                  title="3. Δείγμα καταλόγου More"
                  description="Τα πρώτα ~25 entries από More (ταινίες + θέατρο) με στήλη CMS: τι υπάρχει ήδη στο site. Χρήσιμο για γρήγορη αναφορά."
                >
                  <Button
                    variant="secondary"
                    loading={loading}
                    onClick={() => runLookup({ matchCms: false, listAll: false })}
                  >
                    Δείγμα καταλόγου
                  </Button>
                </ActionRow>

                <ActionRow
                  title="4. Πλήρης κατάλογος More"
                  description="Όλες οι εγγραφές More (~370+) με σελιδοποίηση και φίλτρο «μόνο μη περασμένα». Δεν γράφει στο CMS."
                >
                  <Button
                    variant="tertiary"
                    loading={loading}
                    onClick={() => runLookup({ matchCms: false, listAll: true })}
                  >
                    Πλήρης κατάλογος
                  </Button>
                </ActionRow>
              </Flex>

              <Box paddingTop={4} padding={3} background="neutral100" hasRadius>
                <Checkbox
                  checked={overwriteExisting}
                  onCheckedChange={(checked) => setOverwriteExisting(checked === true)}
                >
                  Αντικατάσταση υπάρχοντος event_group_code (όταν υπάρχει ήδη διαφορετικός κωδικός)
                </Checkbox>
              </Box>
            </Box>

            <Box paddingTop={4} padding={6} background="neutral0" shadow="filterShadow" hasRadius>
              <Typography variant="delta">Βήμα 2 — Συγχρονισμός προβολών</Typography>
              <Box paddingTop={2}>
                <SectionIntro>
                  Για κάθε ταινία/παράσταση με <strong>event_group_code</strong> καλεί το More API και
                  δημιουργεί <strong>Προβολή ταινίας</strong> ή <strong>Θεατρική παράσταση</strong>.
                  Χρειάζεται χώρος με <strong>venue_id</strong> ή venue bundle — αλλιώς δημιουργείται
                  σινεμά/θέατρο αυτόματα όπου επιτρέπεται. Μόνο νέες εγγραφές · cron καθημερινά 06:45.
                </SectionIntro>
              </Box>
              {!showtimeSyncEnabled ? (
                <Box paddingTop={3}>
                  <Typography textColor="danger600">
                    Απενεργοποιημένο (MORE_SHOWTIME_SYNC_ENABLED=false).
                  </Typography>
                </Box>
              ) : (
                <Box paddingTop={4}>
                  <ActionRow
                    title="Συγχρονισμός τώρα"
                    description="Ίδια λογική με το cron — χειροκίνητο trigger για άμεσο αποτέλεσμα. Το report εμφανίζεται από κάτω."
                  >
                    <Button variant="success" loading={loading} onClick={syncShowtimes}>
                      Τρέξε sync
                    </Button>
                  </ActionRow>
                </Box>
              )}
            </Box>
          </>
        )}

        {syncReport ? (
          <Box paddingTop={4} padding={4} background="primary100" hasRadius>
            <Typography variant="pi" fontWeight="bold">
              {syncReport.message ||
                `Προβολές: +${syncReport.created} νέες · ${syncReport.alreadyExists} υπήρχαν · ${syncReport.skippedNoVenue} χωρίς venue_id`}
            </Typography>
            {syncReport.theaterShowsScanned != null ? (
              <Typography variant="pi" textColor="neutral600" paddingTop={1}>
                Θέατρο: {syncReport.theaterShowsScanned} παραστάσεις · +{syncReport.createdFromTheaterShows ?? 0}{' '}
                από κωδικούς · +{syncReport.createdFromTheaterVenues ?? 0} από venue bundle
                {(syncReport.createdCinemaVenues ?? 0) > 0
                  ? ` · +${syncReport.createdCinemaVenues} νέα σινεμά από More`
                  : ''}
                {(syncReport.createdTheaterVenues ?? 0) > 0
                  ? ` · +${syncReport.createdTheaterVenues} νέοι χώροι θεάτρου από More`
                  : ''}
              </Typography>
            ) : null}
            {syncReport.venueUpdatedStatuses?.updated ? (
              <Typography variant="pi" textColor="neutral600" paddingTop={1}>
                Updated σινεμά: {syncReport.venueUpdatedStatuses.complete} πλήρη ·{' '}
                {syncReport.venueUpdatedStatuses.needs_manual} χειροκίνητα ·{' '}
                {syncReport.venueUpdatedStatuses.no_new} χωρίς νέα
              </Typography>
            ) : null}
            {syncReport.missingVenueIds?.length ? (
              <Typography variant="pi" textColor="danger600" paddingTop={2}>
                Λείπουν More venueId στο CMS:{' '}
                {[...new Set(syncReport.missingVenueIds.map((m) => m.moreVenueId))].slice(0, 12).join(', ')}
              </Typography>
            ) : null}
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
              {result.durationMs}ms · More σινεμά: {result.stats.moreMovies} · θέατρο:{' '}
              {result.stats.moreTheaterShows ?? '—'} · venue bundles: {result.stats.venueBundles}
              {result.stats.matched != null
                ? ` · ταύτιση CMS: ${result.stats.matched}/${(result.stats.cmsMovies ?? 0) + (result.stats.cmsTheaterShows ?? 0)}`
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
              <Typography variant="delta">Αποτελέσματα ταύτισης (CMS → More)</Typography>
              <Typography variant="pi" textColor="neutral600" paddingTop={1}>
                Προτάσεις κωδικού ανά εγγραφή CMS · Score = βεβαιότητα ταύτισης · API = επαλήθευση
                από More
              </Typography>
            </Box>
            <Table colCount={7} rowCount={matchedRows.length}>
              <Thead>
                <Tr>
                  <Th>
                    <Typography variant="sigma">Τύπος</Typography>
                  </Th>
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
                  <Tr key={rowKey(row)}>
                    <Td>
                      <Badge>{cmsTypeLabel(row.contentType)}</Badge>
                    </Td>
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
                Χαμηλό score (&lt; {applyMinScore.toFixed(2)}) — μόνο για <strong>θέατρο</strong>:
                έλεγξε και πάτα Έγκριση. Για <strong>ταινίες</strong> γράψε τον κωδικό χειροκίνητα στο
                CMS ή τρέξε «Γράψε αυτόματα» αν το score είναι αρκετό.
              </Typography>
            </Box>
            <Table colCount={7} rowCount={pendingApproval.length}>
              <Thead>
                <Tr>
                  <Th>
                    <Typography variant="sigma">Τύπος</Typography>
                  </Th>
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
                  <Tr key={rowKey(row)}>
                    <Td>
                      <Badge>{cmsTypeLabel(row.contentType)}</Badge>
                    </Td>
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
                            approveItem(row, Boolean(row.cmsEventGroupCode))
                          }
                        >
                          Έγκριση
                        </Button>
                        <Button
                          size="S"
                          variant="tertiary"
                          loading={loading}
                          onClick={() => rejectItem(row)}
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
              <Flex justifyContent="space-between" alignItems="center" gap={2} wrap="wrap">
                <Typography variant="delta">Κατάλογος More</Typography>
                <Typography variant="pi" textColor="neutral600">
                  {catalogFiltered.length}
                  {catalogOnlyMissing ? ' μη περασμένα' : ''} · {catalog.length} σύνολο · στο CMS:{' '}
                  {result?.stats?.catalogInCms ?? catalog.filter((row) => row.inCms).length} · λείπουν:{' '}
                  {result?.stats?.catalogMissing ?? catalog.filter((row) => !row.inCms).length}
                </Typography>
              </Flex>
              <Box paddingTop={3}>
                <Checkbox
                  checked={catalogOnlyMissing}
                  onCheckedChange={(checked) => setCatalogOnlyMissing(checked === true)}
                >
                  Εμφάνιση μόνο κωδικών που λείπουν από το CMS
                </Checkbox>
              </Box>
            </Box>
            <Table colCount={6} rowCount={catalogPageRows.length}>
              <Thead>
                <Tr>
                  <Th>
                    <Typography variant="sigma">Τύπος</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">Τίτλος More</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">event_group_code</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">CMS</Typography>
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
                {catalogPageRows.map((row) => (
                  <Tr key={row.eventGroupCode}>
                    <Td>
                      <Badge>{catalogKindLabel(row)}</Badge>
                    </Td>
                    <Td>
                      <Typography>{row.moreTitle}</Typography>
                    </Td>
                    <Td>
                      <Typography fontWeight="bold">{row.eventGroupCode}</Typography>
                    </Td>
                    <Td>
                      {row.inCms ? (
                        <Badge>
                          {catalogCmsStatusLabel(row)}
                          {row.cmsRefs?.[0]?.cmsTitle ? `: ${row.cmsRefs[0].cmsTitle}` : ''}
                        </Badge>
                      ) : row.cmsStatus === 'pending' ? (
                        <Badge>Προς έγκριση</Badge>
                      ) : (
                        <Badge>Λείπει</Badge>
                      )}
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
            {catalogFiltered.length > CATALOG_PAGE_SIZE ? (
              <Box padding={4}>
                <Flex justifyContent="space-between" alignItems="center" gap={3} wrap="wrap">
                  <Typography variant="pi" textColor="neutral600">
                    {(catalogPageSafe - 1) * CATALOG_PAGE_SIZE + 1}–
                    {Math.min(catalogPageSafe * CATALOG_PAGE_SIZE, catalogFiltered.length)} από{' '}
                    {catalogFiltered.length}
                  </Typography>
                  <Flex gap={2} alignItems="center">
                    <Button
                      size="S"
                      variant="tertiary"
                      disabled={catalogPageSafe <= 1}
                      onClick={() => setCatalogPage((p) => Math.max(1, p - 1))}
                    >
                      Προηγούμενη
                    </Button>
                    <Typography variant="pi">
                      Σελίδα {catalogPageSafe} / {catalogPageCount}
                    </Typography>
                    <Button
                      size="S"
                      variant="tertiary"
                      disabled={catalogPageSafe >= catalogPageCount}
                      onClick={() => setCatalogPage((p) => Math.min(catalogPageCount, p + 1))}
                    >
                      Επόμενη
                    </Button>
                  </Flex>
                </Flex>
              </Box>
            ) : null}
          </Box>
        ) : null}
      </ContentLayout>
    </Layout>
  );
};

export default App;
