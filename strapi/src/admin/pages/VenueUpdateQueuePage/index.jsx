import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Layout,
  HeaderLayout,
  ContentLayout,
  Box,
  Typography,
  Button,
  Flex,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Loader,
  Link,
} from '@strapi/design-system';
import { useFetchClient, useNotification } from '@strapi/helper-plugin';

const VENUE_COLLECTION = '/content-manager/collection-types/api::venue.venue';
const SYNC_POLL_MS = 2500;
const SYNC_MAX_WAIT_MS = 12 * 60 * 1000;

function venueEditPath(id) {
  return `${VENUE_COLLECTION}/${id}`;
}

function venueListPath(filters) {
  const params = new URLSearchParams({
    page: '1',
    pageSize: '50',
    sort: 'name:ASC',
    'filters[type][$eq]': 'cinema',
  });
  for (const [key, value] of Object.entries(filters)) {
    params.set(key, value);
  }
  return `${VENUE_COLLECTION}?${params.toString()}`;
}

function formatGeneratedAt(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('el-GR');
  } catch {
    return iso;
  }
}

function isTransientGatewayError(err) {
  const status = err?.response?.status ?? err?.status;
  return status === 502 || status === 503 || status === 504;
}

function QueueSection({ title, subtitle, tone, count, listPath, children }) {
  const toneBg = tone === 'warning' ? 'warning100' : tone === 'danger' ? 'danger100' : 'primary100';

  return (
    <Box padding={5} background="neutral0" shadow="filterShadow" hasRadius marginBottom={6}>
      <Flex justifyContent="space-between" alignItems="flex-start" gap={4} wrap="wrap" paddingBottom={4}>
        <Box>
          <Flex gap={3} alignItems="center" paddingBottom={2}>
            <Typography variant="beta" fontWeight="bold">
              {title}
            </Typography>
            <Badge background={toneBg}>{count}</Badge>
          </Flex>
          <Typography variant="pi" textColor="neutral600">
            {subtitle}
          </Typography>
        </Box>
        {listPath ? (
          <Button size="S" variant="secondary" tag="a" href={listPath} target="_self">
            Άνοιγμα στη λίστα CMS
          </Button>
        ) : null}
      </Flex>
      {children}
    </Box>
  );
}

function VenueDiagnosisBox({ report, progress }) {
  if (!report && !progress) return null;
  const d = report?.venueDiagnosis;
  const hints = Array.isArray(d?.hints) ? d.hints : [];

  return (
    <Box padding={5} background="primary100" hasRadius marginBottom={6}>
      <Typography variant="delta" textColor="primary700" paddingBottom={2}>
        Τελευταίο sync σινεμά
      </Typography>
      {progress && !report ? (
        <Typography variant="pi" textColor="primary600">
          {progress}
        </Typography>
      ) : null}
      {report?.message ? (
        <Typography variant="pi" textColor="neutral800" fontWeight="semiBold" paddingBottom={2}>
          {report.message}
        </Typography>
      ) : null}
      {d ? (
        <Box paddingTop={2}>
          <Typography variant="pi" textColor="neutral700">
            {d.name ? `«${d.name}»` : '—'}
            {d.venueId != null ? ` #${d.venueId}` : ''}
            {d.moreVenueId ? ` · More venueId ${d.moreVenueId}` : ' · χωρίς More venueId'}
            {d.hasBundle
              ? ` · bundle: ${(d.bundleCodes || []).join(', ') || 'ναι'}`
              : ' · χωρίς bundle'}
            {d.statusLabel ? ` · ${d.statusLabel}` : ''}
          </Typography>
          <Typography variant="pi" textColor="neutral600" paddingTop={2}>
            Νέες: {d.created ?? 0} · υπήρχαν: {d.alreadyExists ?? 0} · άγνωστο eventId:{' '}
            {d.skippedUnknownEventId ?? 0} · mismatch: {d.skippedVenueMismatch ?? 0}
            {d.weekExpected != null
              ? ` · εβδομάδα: ${d.weekSynced ?? 0}/${d.weekExpected}`
              : ''}
          </Typography>
          {hints.length ? (
            <Box paddingTop={3}>
              <Typography variant="pi" fontWeight="semiBold" textColor="neutral800">
                Τι φταίει / τι να κοιτάξεις
              </Typography>
              {hints.map((hint) => (
                <Typography key={hint} variant="pi" textColor="neutral700" paddingTop={1}>
                  · {hint}
                </Typography>
              ))}
            </Box>
          ) : null}
        </Box>
      ) : null}
    </Box>
  );
}

function VenueQueueTable({
  rows,
  emptyLabel,
  showAutoCreated = false,
  showTargetWeekDiagnostics = false,
  onSyncVenue,
  syncingVenueId,
}) {
  if (!rows?.length) {
    return (
      <Typography variant="pi" textColor="neutral500">
        {emptyLabel}
      </Typography>
    );
  }

  const colCount =
    3 + (showTargetWeekDiagnostics ? 1 : 0) + 1 + (showAutoCreated ? 1 : 0) + 1;

  return (
    <Box style={{ overflowX: 'auto' }}>
      <Table colCount={colCount} rowCount={rows.length}>
        <Thead>
          <Tr>
            <Th>
              <Typography variant="sigma">Σινεμά</Typography>
            </Th>
            <Th>
              <Typography variant="sigma">Κατάσταση</Typography>
            </Th>
            {showTargetWeekDiagnostics ? (
              <Th>
                <Typography variant="sigma">Προβολές εβδομάδας-στόχου</Typography>
              </Th>
            ) : null}
            <Th>
              <Typography variant="sigma">Bundle / venueId</Typography>
            </Th>
            {showAutoCreated ? (
              <Th>
                <Typography variant="sigma">Από sync</Typography>
              </Th>
            ) : null}
            <Th>
              <Typography variant="sigma">Ενέργεια</Typography>
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((row) => (
            <Tr key={row.id}>
              <Td>
                <Typography fontWeight="semiBold">{row.name}</Typography>
                <Typography variant="pi" textColor="neutral500">
                  #{row.id}
                  {row.slug ? ` · ${row.slug}` : ''}
                </Typography>
              </Td>
              <Td>
                <Typography variant="pi" textColor="neutral600">
                  {row.updatedLabel}
                </Typography>
              </Td>
              {showTargetWeekDiagnostics ? (
                <Td>
                  <Typography fontWeight="semiBold" textColor="neutral800">
                    {row.showtimesInTargetWeek != null ? row.showtimesInTargetWeek : '—'}
                  </Typography>
                  {row.noNewHint ? (
                    <Typography variant="pi" textColor="neutral500">
                      {row.noNewHint}
                    </Typography>
                  ) : null}
                </Td>
              ) : null}
              <Td>
                <Typography variant="pi" textColor="neutral600">
                  {row.hasBundle ? 'Έχει bundle' : 'Χωρίς bundle'}
                  {row.venueId ? ` · venueId ${row.venueId}` : ''}
                </Typography>
              </Td>
              {showAutoCreated ? (
                <Td>
                  {row.autoCreatedFromSync ? (
                    <Badge background="warning100" textColor="warning700">
                      Αυτόματο
                    </Badge>
                  ) : (
                    <Typography variant="pi" textColor="neutral500">
                      —
                    </Typography>
                  )}
                </Td>
              ) : null}
              <Td>
                <Flex gap={3} alignItems="center" wrap="wrap">
                  <Button
                    size="S"
                    variant="secondary"
                    loading={syncingVenueId === row.id}
                    disabled={syncingVenueId != null && syncingVenueId !== row.id}
                    onClick={() => onSyncVenue?.(row)}
                  >
                    {row.hasAthinoramaLink ? 'Sync Athinorama' : 'Sync More'}
                  </Button>
                  <Link to={venueEditPath(row.id)}>Επεξεργασία</Link>
                </Flex>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}

const VenueUpdateQueuePage = () => {
  const { get, post } = useFetchClient();
  const toggleNotification = useNotification();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [syncingVenueId, setSyncingVenueId] = useState(null);
  const [syncProgress, setSyncProgress] = useState('');
  const [syncReport, setSyncReport] = useState(null);
  const [athinoramaSyncing, setAthinoramaSyncing] = useState(false);
  const [athinoramaReport, setAthinoramaReport] = useState(null);
  const pollCancelled = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await get('/api/venues/update-queues');
      setData(res?.data || null);
    } catch (err) {
      const message =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Αποτυχία φόρτωσης λιστών.';
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [get]);

  useEffect(() => {
    load();
    return () => {
      pollCancelled.current = true;
    };
  }, [load]);

  const pollSyncJob = useCallback(async () => {
    const started = Date.now();
    while (!pollCancelled.current && Date.now() - started < SYNC_MAX_WAIT_MS) {
      await new Promise((resolve) => setTimeout(resolve, SYNC_POLL_MS));
      if (pollCancelled.current) break;
      const res = await get('/api/more-lookup/sync-showtimes/status');
      const job = res?.data;
      if (job?.progress) setSyncProgress(job.progress);
      if (job?.status === 'completed' && job?.report) return job.report;
      if (job?.status === 'failed') {
        throw new Error(job?.error || job?.progress || 'Αποτυχία συγχρονισμού');
      }
    }
    throw new Error('Λήξη χρόνου αναμονής sync — έλεγξε data/more-showtime-sync-worker.log');
  }, [get]);

  const syncVenue = useCallback(
    async (row) => {
      if (!row?.id || syncingVenueId != null) return;
      pollCancelled.current = false;
      setSyncingVenueId(row.id);
      setSyncReport(null);
      setSyncProgress(`Έναρξη sync «${row.name}»…`);
      try {
        let res;
        try {
          res = await post('/api/more-lookup/sync-showtimes', {
            scope: 'cinema',
            venueId: row.id,
          });
        } catch (postErr) {
          if (isTransientGatewayError(postErr)) {
            setSyncProgress('502 στην έναρξη — αναμονή worker…');
            await new Promise((resolve) => setTimeout(resolve, 10000));
            const report = await pollSyncJob();
            setSyncReport(report);
            toggleNotification({
              type: report?.created > 0 ? 'success' : 'info',
              message: report?.message || 'Sync ολοκληρώθηκε.',
            });
            await load();
            return;
          }
          throw postErr;
        }

        const dataRes = res?.data;
        if (dataRes?.status === 'completed' && dataRes?.report) {
          setSyncReport(dataRes.report);
          toggleNotification({
            type: dataRes.report?.created > 0 ? 'success' : 'info',
            message: dataRes.report?.message || 'Sync ολοκληρώθηκε.',
          });
          await load();
          return;
        }
        if (dataRes?.status === 'running' || dataRes?.status === 'started') {
          if (dataRes?.progress) setSyncProgress(dataRes.progress);
          const report = await pollSyncJob();
          setSyncReport(report);
          toggleNotification({
            type: report?.created > 0 ? 'success' : 'info',
            message: report?.message || 'Sync ολοκληρώθηκε.',
          });
          await load();
          return;
        }
        if (dataRes?.status === 'failed') {
          throw new Error(dataRes?.error || dataRes?.progress || 'Αποτυχία συγχρονισμού');
        }
        throw new Error(dataRes?.error || dataRes?.progress || 'Δεν ξεκίνηκε συγχρονισμός');
      } catch (err) {
        const message =
          err?.response?.data?.error?.message || err?.message || 'Αποτυχία sync σινεμά.';
        setSyncProgress('');
        toggleNotification({ type: 'warning', message });
      } finally {
        setSyncingVenueId(null);
        setSyncProgress('');
      }
    },
    [syncingVenueId, post, pollSyncJob, toggleNotification, load],
  );

  const syncAthinoramaPending = useCallback(async () => {
    if (athinoramaSyncing || syncingVenueId != null) return;
    setAthinoramaSyncing(true);
    setAthinoramaReport(null);
    try {
      const res = await post('/api/venues/sync-athinorama-pending', {});
      const report = res?.data;
      setAthinoramaReport(report || null);
      toggleNotification({
        type: report?.failed > 0 ? 'warning' : 'success',
        message: report?.message || 'Athinorama sync ολοκληρώθηκε.',
      });
      await load();
    } catch (err) {
      const message =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Αποτυχία Athinorama sync.';
      toggleNotification({ type: 'warning', message });
    } finally {
      setAthinoramaSyncing(false);
    }
  }, [athinoramaSyncing, syncingVenueId, post, toggleNotification, load]);

  const counts = data?.counts || {};
  const tableProps = {
    onSyncVenue: syncVenue,
    syncingVenueId,
  };

  return (
    <Layout>
      <HeaderLayout
        title="Τι να ενημερώσω"
        subtitle="Λίστες σινεμά ανά κατάσταση — Sync More ή Athinorama για όσα δεν είναι ενημερωμένα."
        primaryAction={
          <Flex gap={2}>
            <Button
              onClick={syncAthinoramaPending}
              loading={athinoramaSyncing}
              disabled={syncingVenueId != null}
            >
              Sync Athinorama ({counts.athinoramaPending ?? '…'})
            </Button>
            <Button onClick={load} loading={loading} variant="secondary" disabled={athinoramaSyncing}>
              Ανανέωση
            </Button>
          </Flex>
        }
      />
      <ContentLayout>
        <Box padding={5} background="primary100" hasRadius marginBottom={6}>
          <Flex justifyContent="space-between" alignItems="flex-start" gap={4} wrap="wrap">
            <Box>
              <Typography variant="delta" textColor="primary700">
                Sync Athinorama — τρέχουσα εβδομάδα
              </Typography>
              <Typography variant="pi" textColor="neutral700" paddingTop={2}>
                Ενημερώνει όλα τα δημοσιευμένα σινεμά με Athinorama link που δεν είναι ακόμα complete
                ({counts.athinoramaPending ?? 0} εκκρεμή). Μόνο την τρέχουσα εβδομάδα Πέμ→Τετ.
              </Typography>
            </Box>
            <Button
              size="L"
              onClick={syncAthinoramaPending}
              loading={athinoramaSyncing}
              disabled={syncingVenueId != null}
            >
              Sync Athinorama ({counts.athinoramaPending ?? '…'})
            </Button>
          </Flex>
        </Box>

        {loading && !data ? (
          <Box padding={8}>
            <Loader>Φόρτωση λιστών…</Loader>
          </Box>
        ) : null}

        {error ? (
          <Box padding={5} background="danger100" hasRadius marginBottom={6}>
            <Typography textColor="danger700">{error}</Typography>
          </Box>
        ) : null}

        <VenueDiagnosisBox report={syncReport} progress={syncProgress} />

        {athinoramaReport ? (
          <Box padding={5} background="secondary100" hasRadius marginBottom={6}>
            <Typography variant="delta" paddingBottom={2}>
              Τελευταίο Athinorama sync
            </Typography>
            <Typography variant="pi" textColor="neutral800" fontWeight="semiBold">
              {athinoramaReport.message}
            </Typography>
            <Typography variant="pi" textColor="neutral600" paddingTop={2}>
              Εβδομάδα: {athinoramaReport.weekLabel || '—'} · εκκρεμή:{' '}
              {athinoramaReport.pendingCount ?? '—'} · OK: {athinoramaReport.synced ?? 0} · νέες:{' '}
              {athinoramaReport.created ?? athinoramaReport.createdTotal ?? 0} · υπήρχαν:{' '}
              {athinoramaReport.alreadyExists ?? 0} · αποτυχίες: {athinoramaReport.failed ?? 0}
              {athinoramaReport.currentWeekPhase === false
                ? ' · (Δευ–Τετ: δεν αλλάζει το πεδίο updated — στόχος είναι η επόμενη εβδομάδα)'
                : ''}
            </Typography>
            {Array.isArray(athinoramaReport.results) && athinoramaReport.results.some((r) => !r.ok) ? (
              <Box paddingTop={3}>
                {athinoramaReport.results
                  .filter((r) => !r.ok)
                  .slice(0, 12)
                  .map((r) => (
                    <Typography key={r.venueId} variant="pi" textColor="danger600" paddingTop={1}>
                      · {r.venueName || `#${r.venueId}`}: {r.error || 'σφάλμα'}
                    </Typography>
                  ))}
              </Box>
            ) : null}
          </Box>
        ) : null}

        {data ? (
          <>
            <Box paddingBottom={4}>
              <Typography variant="pi" textColor="neutral600">
                Σύνολο σινεμά: {counts.cinemaTotal ?? 0} · Δημοσιευμένα: {counts.publishedTotal ?? 0} ·
                Ενημερώθηκαν: {formatGeneratedAt(data.generatedAt)}
              </Typography>
              <Typography variant="pi" textColor="neutral700" paddingTop={2} fontWeight="semiBold">
                Εβδομάδα-στόχος ({data.targetWeekPhase || '—'}): {data.targetWeekLabel || '—'}
              </Typography>
              <Typography variant="pi" textColor="neutral500" paddingTop={2}>
                <strong>Πέμπτη–Κυριακή:</strong> ελέγχουμε την <strong>τρέχουσα</strong> εβδομάδα κινηματογράφου
                (Πέμ→Τετ). <strong>Δευτέρα–Τετάρτη:</strong> την <strong>ερχόμενη</strong>. Κάθε{' '}
                <strong>Σάββατο 06:00</strong> όλα επανέρχονται σε <strong>no_new</strong>. Το{' '}
                <strong>Sync Athinorama</strong> φορτώνει μόνο την τρέχουσα εβδομάδα για σινεμά με link που δεν
                είναι complete (cron Πέμπτη 3×). Ανά σινεμά: αν έχει Athinorama link → Athinorama, αλλιώς More.
              </Typography>
            </Box>

            <QueueSection
              title="Χωρίς νέες προβολές (no_new)"
              subtitle="Δημοσιευμένα σινεμά που περιμένουν sync / νέο πρόγραμμα εβδομάδας. Δεν περιλαμβάνει needs_manual ούτε draft."
              tone="primary"
              count={counts.noNew ?? 0}
              listPath={venueListPath({
                'filters[updated][$eq]': 'no_new',
                'filters[publishedAt][$notNull]': 'true',
              })}
            >
              <VenueQueueTable
                rows={data.noNew}
                emptyLabel="Κανένα δημοσιευμένο σινεμά σε κατάσταση no_new."
                showTargetWeekDiagnostics
                {...tableProps}
              />
            </QueueSection>

            <QueueSection
              title="Απαιτεί χειροκίνητη δουλειά (needs_manual)"
              subtitle="Sync έτρεξε αλλά κάποιες προβολές δεν πέρασαν (άγνωστα eventId, mismatch, σφάλματα κ.λπ.)."
              tone="warning"
              count={counts.needsManual ?? 0}
              listPath={venueListPath({
                'filters[updated][$eq]': 'needs_manual',
                'filters[publishedAt][$notNull]': 'true',
              })}
            >
              <VenueQueueTable
                rows={data.needsManual}
                emptyLabel="Κανένα δημοσιευμένο σινεμά σε κατάσταση needs_manual."
                {...tableProps}
              />
            </QueueSection>

            <QueueSection
              title="Πλήρης ενημέρωση (complete)"
              subtitle="Όλες οι προβολές της εβδομάδας πέρασαν. Μέχρι το επόμενο Σάββατο δεν εμφανίζονται στις λίστες εκκρεμοτήτων."
              tone="neutral"
              count={counts.complete ?? 0}
              listPath={venueListPath({
                'filters[updated][$eq]': 'complete',
                'filters[publishedAt][$notNull]': 'true',
              })}
            >
              <VenueQueueTable
                rows={data.complete}
                emptyLabel="Κανένα δημοσιευμένο σινεμά σε κατάσταση complete."
                {...tableProps}
              />
            </QueueSection>

            <QueueSection
              title="Draft / προς δημοσίευση"
              subtitle="Unpublished σινεμά — ειδικά αυτά που δημιουργήθηκαν αυτόματα από sync για να περάσουν ταινίες."
              tone="danger"
              count={counts.unpublished ?? 0}
              listPath={venueListPath({
                'filters[publishedAt][$null]': 'true',
              })}
            >
              <Flex gap={4} wrap="wrap" paddingBottom={4}>
                <Badge background="danger100">
                  Σύνολο draft: {counts.unpublished ?? 0}
                </Badge>
                <Badge background="warning100">
                  Αυτόματα από sync: {counts.unpublishedAutoCreated ?? 0}
                </Badge>
                <Badge background="neutral150">
                  Άλλα draft: {counts.unpublishedOther ?? 0}
                </Badge>
              </Flex>
              <VenueQueueTable
                rows={data.unpublished}
                emptyLabel="Κανένα unpublished σινεμά."
                showAutoCreated
                {...tableProps}
              />
            </QueueSection>
          </>
        ) : null}
      </ContentLayout>
    </Layout>
  );
};

export default VenueUpdateQueuePage;
