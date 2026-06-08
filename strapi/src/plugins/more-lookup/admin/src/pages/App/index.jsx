import React, { useCallback, useEffect, useState } from 'react';
import './more-lookup-admin.css';
import {
  Layout,
  HeaderLayout,
  ContentLayout,
  Box,
  Typography,
  Button,
  Flex,
  Grid,
  GridItem,
  Divider,
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
  if (row.kind === 'venue_bundle') return 'Σινεμά';
  if (row.category === 'theater') return 'Θέατρο';
  return 'Ταινία';
}

function catalogCmsStatusLabel(row) {
  if (row.cmsStatus === 'in_cms') {
    if (row.kind === 'venue_bundle') return 'Χώρος στο CMS';
    return 'Στο CMS';
  }
  if (row.cmsStatus === 'pending') return 'Προς έγκριση';
  if (row.kind === 'venue_bundle') return 'Λείπει (χώρος)';
  return 'Λείπει';
}

function rowKey(row) {
  return `${row.contentType || 'movie'}:${row.cmsId ?? row.movieId ?? row.theaterShowId}`;
}

function formatCodeList(codes) {
  const list = Array.isArray(codes) ? codes.filter(Boolean) : [];
  if (!list.length) return '—';
  if (list.length === 1) return list[0];
  return list.join(' · ');
}

/** Μία γραμμή ανά κωδικό (κύριος + επιπλέον) για ξεκάθαρο πίνακα ταύτισης. */
function expandMatchRows(rows) {
  return rows.flatMap((row) => {
    const codes =
      row.suggestedEventGroupCodes?.length > 0
        ? row.suggestedEventGroupCodes
        : row.suggestedEventGroupCode
          ? [row.suggestedEventGroupCode]
          : [];
    if (!codes.length) return [];

    const byCode = new Map(
      (row.moreMatches || []).map((match) => [match.suggestedEventGroupCode, match]),
    );

    return codes.map((code, index) => {
      const match = byCode.get(code) || {};
      return {
        ...row,
        displayKey: `${rowKey(row)}:${code}`,
        displayCode: code,
        displayMoreTitle: match.moreTitle ?? row.moreTitle,
        displayScore: Number(match.score ?? row.score),
        displayVerify: match.verify ?? row.verify,
        displayMatchMethod: match.matchMethod ?? null,
        codeRole: index === 0 ? 'κύριος' : 'επιπλέον',
      };
    });
  });
}

const CATALOG_PAGE_SIZE = 50;

const cardStyle = {
  border: '1px solid #eaeaef',
  borderRadius: '4px',
};

const actionButtonStyle = {
  minWidth: '11rem',
  minHeight: '2.5rem',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: 1.25,
};

function WorkflowStep({ number, title, detail }) {
  return (
    <Flex gap={3} alignItems="flex-start" padding={3} background="neutral100" hasRadius style={{ height: '100%' }}>
      <Flex
        alignItems="center"
        justifyContent="center"
        background="primary100"
        hasRadius
        style={{ width: '2rem', height: '2rem', flexShrink: 0 }}
      >
        <Typography fontWeight="bold" textColor="primary600">
          {number}
        </Typography>
      </Flex>
      <Flex direction="column" alignItems="flex-start" gap={1} style={{ minWidth: 0 }}>
        <Typography fontWeight="semiBold" textColor="neutral800">
          {title}
        </Typography>
        <Typography variant="pi" textColor="neutral600">
          {detail}
        </Typography>
      </Flex>
    </Flex>
  );
}

function StatBadge({ label, value, tone = 'neutral', hint }) {
  const bg =
    tone === 'success'
      ? 'success100'
      : tone === 'warning'
        ? 'warning100'
        : tone === 'danger'
          ? 'danger100'
          : 'neutral100';
  const valueColor =
    tone === 'danger' ? 'danger700' : tone === 'success' ? 'success700' : 'neutral800';
  return (
    <Box padding={3} background={bg} hasRadius style={{ minWidth: '7rem', flex: '1 1 8rem' }}>
      <Flex direction="column" alignItems="flex-start" gap={1}>
        <Typography variant="pi" textColor="neutral600">
          {label}
        </Typography>
        <Typography fontWeight="bold" textColor={valueColor}>
          {value}
        </Typography>
        {hint ? (
          <Typography variant="pi" textColor="neutral500">
            {hint}
          </Typography>
        ) : null}
      </Flex>
    </Box>
  );
}

function SyncMetricRow({ label, value, detail, last }) {
  return (
    <Flex
      justifyContent="space-between"
      alignItems="baseline"
      gap={3}
      paddingTop={2}
      paddingBottom={2}
      style={last ? undefined : { borderBottom: '1px solid #eaeaef' }}
    >
      <Typography variant="pi" textColor="neutral600">
        {label}
      </Typography>
      <Flex direction="column" alignItems="flex-end" gap={1}>
        <Typography fontWeight="semiBold" textColor="neutral800">
          {value}
        </Typography>
        {detail ? (
          <Typography variant="pi" textColor="neutral500">
            {detail}
          </Typography>
        ) : null}
      </Flex>
    </Flex>
  );
}

function SyncReportSection({ title, children, tone = 'neutral' }) {
  const bg =
    tone === 'warning' ? 'warning100' : tone === 'danger' ? 'danger100' : 'neutral0';
  return (
    <Box
      padding={4}
      background={bg}
      hasRadius
      style={{ border: '1px solid #eaeaef', height: '100%' }}
    >
      <Typography variant="sigma" textColor="neutral600" fontWeight="semiBold">
        {title}
      </Typography>
      <Box paddingTop={2}>{children}</Box>
    </Box>
  );
}

function formatSyncErrorLine(err) {
  if (!err || typeof err !== 'object') return String(err ?? '—');
  const parts = [];
  if (err.title) parts.push(err.title);
  else if (err.name) parts.push(err.name);
  if (err.code) parts.push(`κωδικός ${err.code}`);
  if (err.moreVenueId) parts.push(`venueId ${err.moreVenueId}`);
  if (err.action) parts.push(err.action);
  const head = parts.length ? parts.join(' · ') : 'Σφάλμα';
  const msg = err.error || err.message || '';
  return msg ? `${head}: ${msg}` : head;
}

function SyncReportPanel({ report }) {
  const [showAllMissingIds, setShowAllMissingIds] = React.useState(false);
  const [showErrors, setShowErrors] = React.useState(false);

  const created = Number(report.created ?? 0);
  const alreadyExists = Number(report.alreadyExists ?? 0);
  const skippedNoVenue = Number(report.skippedNoVenue ?? 0);
  const skippedUnknown = Number(report.skippedUnknownEventId ?? 0);
  const skippedPast = Number(report.skippedPast ?? 0);
  const errorCount = Array.isArray(report.errors) ? report.errors.length : 0;

  const missingIds = [
    ...new Set(
      (report.missingVenueIds ?? [])
        .map((m) => (m?.moreVenueId != null ? String(m.moreVenueId).trim() : ''))
        .filter(Boolean),
    ),
  ];
  const visibleMissingIds = showAllMissingIds ? missingIds : missingIds.slice(0, 12);

  const durationSec =
    report.durationMs != null ? `${(Number(report.durationMs) / 1000).toFixed(1)}s` : null;

  const venueStatus = report.venueUpdatedStatuses;
  const hasVenueStatus = Number(venueStatus?.updated ?? 0) > 0;

  return (
    <Box padding={5} background="primary100" hasRadius style={cardStyle}>
      <Flex justifyContent="space-between" alignItems="flex-start" gap={4} wrap="wrap" paddingBottom={4}>
        <Flex direction="column" alignItems="flex-start" gap={2}>
          <Typography variant="delta" textColor="primary700">
            Αναφορά συγχρονισμού
          </Typography>
          <Typography variant="pi" textColor="primary600">
            Προβολές ταινίας & παραστάσεις από More API
          </Typography>
        </Flex>
        {durationSec ? (
          <Badge background="primary200" textColor="primary700">
            {durationSec}
          </Badge>
        ) : null}
      </Flex>

      <Flex gap={3} wrap="wrap" paddingBottom={4}>
        <StatBadge
          label="Νέες εγγραφές"
          value={created}
          tone={created > 0 ? 'success' : 'neutral'}
          hint="Σύνολο στο CMS"
        />
        <StatBadge label="Ήδη υπήρχαν" value={alreadyExists} />
        <StatBadge
          label="Χωρίς venue_id"
          value={skippedNoVenue}
          tone={skippedNoVenue > 0 ? 'warning' : 'neutral'}
        />
        <StatBadge
          label="Άγνωστο eventId"
          value={skippedUnknown}
          tone={skippedUnknown > 0 ? 'warning' : 'neutral'}
        />
        {skippedPast > 0 ? (
          <StatBadge label="Παρελθούσες" value={skippedPast} tone="neutral" hint="Παραλείφθηκαν" />
        ) : null}
        <StatBadge
          label="Σφάλματα"
          value={errorCount}
          tone={errorCount > 0 ? 'danger' : 'neutral'}
        />
      </Flex>

      <Grid gap={4} paddingBottom={missingIds.length || errorCount ? 4 : 0}>
        <GridItem col={6} s={12}>
          <SyncReportSection title="Ταινίες">
            <SyncMetricRow label="Σκανάρισμα ταινιών" value={report.moviesScanned ?? '—'} />
            <SyncMetricRow
              label="Από κωδικούς ταινίας"
              value={`+${report.createdFromMovies ?? 0}`}
              detail="Νέες προβολές"
            />
            <SyncMetricRow
              label="Από bundle σινεμά"
              value={`+${report.createdFromVenues ?? 0}`}
              detail="Νέες προβολές"
              last={(report.createdCinemaVenues ?? 0) <= 0}
            />
            {(report.createdCinemaVenues ?? 0) > 0 ? (
              <SyncMetricRow
                label="Νέοι χώροι σινεμά"
                value={`+${report.createdCinemaVenues}`}
                detail="Δημιουργήθηκαν από More"
                last
              />
            ) : null}
          </SyncReportSection>
        </GridItem>
        <GridItem col={6} s={12}>
          <SyncReportSection title="Θέατρο">
            <SyncMetricRow label="Σκανάρισμα έργων" value={report.theaterShowsScanned ?? '—'} />
            <SyncMetricRow
              label="Από κωδικούς θεάτρου"
              value={`+${report.createdFromTheaterShows ?? 0}`}
              detail="Νέες παραστάσεις"
            />
            <SyncMetricRow
              label="Από bundle θεάτρου"
              value={`+${report.createdFromTheaterVenues ?? 0}`}
              detail="Νέες παραστάσεις"
              last={
                (report.createdTheaterVenues ?? 0) <= 0 && (report.updatedSoldOut ?? 0) <= 0
              }
            />
            {(report.createdTheaterVenues ?? 0) > 0 ? (
              <SyncMetricRow
                label="Νέοι χώροι θεάτρου"
                value={`+${report.createdTheaterVenues}`}
                detail="Δημιουργήθηκαν από More"
                last={(report.updatedSoldOut ?? 0) <= 0}
              />
            ) : null}
            {(report.updatedSoldOut ?? 0) > 0 ? (
              <SyncMetricRow label="Sold out ενημερώσεις" value={report.updatedSoldOut} last />
            ) : null}
          </SyncReportSection>
        </GridItem>
      </Grid>

      {hasVenueStatus ? (
        <Box paddingBottom={missingIds.length || errorCount ? 4 : 0}>
          <SyncReportSection title="Κατάσταση σινεμά (updated)">
            <Flex gap={3} wrap="wrap" paddingTop={1}>
              <StatBadge label="Πλήρη" value={venueStatus.complete ?? 0} tone="success" />
              <StatBadge label="Χειροκίνητα" value={venueStatus.needs_manual ?? 0} tone="warning" />
              <StatBadge label="Χωρίς νέα" value={venueStatus.no_new ?? 0} />
            </Flex>
          </SyncReportSection>
        </Box>
      ) : null}

      {missingIds.length > 0 ? (
        <Box paddingBottom={errorCount ? 4 : 0}>
          <SyncReportSection title={`Λείπουν More venueId (${missingIds.length})`} tone="warning">
            <Typography variant="pi" textColor="neutral600" paddingBottom={3}>
              Τα venueId δεν υπάρχουν ακόμα στους χώρους CMS — χρειάζεται ταύτιση ή δημιουργία χώρου.
            </Typography>
            <Flex gap={2} wrap="wrap">
              {visibleMissingIds.map((id) => (
                <Badge key={id} background="warning200" textColor="warning700">
                  {id}
                </Badge>
              ))}
            </Flex>
            {missingIds.length > 12 ? (
              <Box paddingTop={3}>
                <Button
                  size="S"
                  variant="tertiary"
                  onClick={() => setShowAllMissingIds((v) => !v)}
                >
                  {showAllMissingIds ? 'Λιγότερα' : `Όλα (${missingIds.length})`}
                </Button>
              </Box>
            ) : null}
          </SyncReportSection>
        </Box>
      ) : null}

      {errorCount > 0 ? (
        <SyncReportSection title={`Σφάλματα (${errorCount})`} tone="danger">
          <Box paddingBottom={showErrors ? 3 : 0}>
            <Button size="S" variant="tertiary" onClick={() => setShowErrors((v) => !v)}>
              {showErrors ? 'Απόκρυψη λεπτομερειών' : 'Εμφάνιση λεπτομερειών'}
            </Button>
          </Box>
          {showErrors ? (
            <ul style={{ margin: 0, paddingLeft: '1.25rem', maxHeight: '16rem', overflowY: 'auto' }}>
              {report.errors.slice(0, 40).map((err, i) => (
                <li key={`sync-err-${i}`} style={{ marginBottom: '0.5rem' }}>
                  <Typography variant="pi" textColor="danger700">
                    {formatSyncErrorLine(err)}
                  </Typography>
                </li>
              ))}
              {errorCount > 40 ? (
                <li style={{ listStyle: 'none', marginLeft: '-1.25rem' }}>
                  <Typography variant="pi" textColor="neutral500" paddingTop={2}>
                    … και {errorCount - 40} ακόμα
                  </Typography>
                </li>
              ) : null}
            </ul>
          ) : (
            <Typography variant="pi" textColor="neutral600">
              Πάτησε για λίστα με τίτλους / κωδικούς και μηνύματα σφάλματος.
            </Typography>
          )}
        </SyncReportSection>
      ) : null}
    </Box>
  );
}

function PanelHeader({ title, subtitle, action }) {
  return (
    <Flex justifyContent="space-between" alignItems="flex-start" gap={4} wrap="wrap" paddingBottom={4}>
      <Flex direction="column" alignItems="flex-start" gap={2} style={{ flex: '1 1 12rem', minWidth: 0 }}>
        <Typography variant="delta">{title}</Typography>
        {subtitle ? (
          <Typography variant="pi" textColor="neutral600">
            {subtitle}
          </Typography>
        ) : null}
      </Flex>
      {action ? <Box style={{ flexShrink: 0 }}>{action}</Box> : null}
    </Flex>
  );
}

const App = () => {
  const [query, setQuery] = useState('');
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogOnlyMissing, setCatalogOnlyMissing] = useState(true);
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

  const runLookup = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await post('/api/more-lookup/run', {
        query: query.trim() || undefined,
        matchCms: true,
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
  const matchDisplayRows = expandMatchRows(matchedRows);
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
  const catalogInCms = result?.stats?.catalogInCms ?? catalog.filter((row) => row.inCms).length;
  const catalogMissing = result?.stats?.catalogMissing ?? catalog.filter((row) => !row.inCms).length;
  const hasResults =
    Boolean(result) ||
    Boolean(syncReport) ||
    matchedRows.length > 0 ||
    pendingApproval.length > 0 ||
    (catalog.length > 0 && (!catalogOnlyMissing || catalogFiltered.length > 0));

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
        <div className="more-lookup-page">
        {!enabled ? (
          <Box padding={6} background="neutral0" shadow="filterShadow" hasRadius>
            <Typography textColor="danger600">
              Απενεργοποιημένο (MORE_LOOKUP_ENABLED=false). Άλλαξε env και κάνε restart Strapi.
            </Typography>
          </Box>
        ) : (
          <>
            <Box padding={5} background="neutral0" shadow="filterShadow" hasRadius style={cardStyle}>
              <Typography variant="sigma" textColor="neutral600" fontWeight="semiBold">
                ΡΟΗ ΕΡΓΑΣΙΑΣ
              </Typography>
              <Box paddingTop={4}>
              <Grid gap={3}>
                <GridItem col={4} s={12}>
                  <WorkflowStep
                    number="1"
                    title="Ταύτιση"
                    detail="Σύγκριση CMS ↔ More · προτάσεις κωδικών"
                  />
                </GridItem>
                <GridItem col={4} s={12}>
                  <WorkflowStep
                    number="2"
                    title="Εγγραφή"
                    detail="Αυτόματη ή χειροκίνητη στο event_group_code"
                  />
                </GridItem>
                <GridItem col={4} s={12}>
                  <WorkflowStep
                    number="3"
                    title="Sync"
                    detail="Νέες προβολές / παραστάσεις από More API"
                  />
                </GridItem>
              </Grid>
              </Box>
            </Box>

            <Box paddingTop={4} padding={5} background="neutral0" shadow="filterShadow" hasRadius style={cardStyle}>
              <PanelHeader
                title="Βήμα 1 — Κωδικοί More"
                subtitle="Ταύτιση και εγγραφή event_group_code · δεν αλλάζει τίποτα χωρίς «Γράψε αυτόματα»"
              />
              <Grid gap={4}>
                <GridItem col={7} s={12}>
                  <TextInput
                    label="Φίλτρο τίτλου"
                    name="query"
                    hint="Προαιρετικό — π.χ. «Αρκουδότρυπα»"
                    placeholder="Αναζήτηση τίτλου…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={loading}
                  />
                </GridItem>
                <GridItem col={5} s={12}>
                  <Box paddingTop={6}>
                    <Checkbox
                      checked={overwriteExisting}
                      onCheckedChange={(checked) => setOverwriteExisting(checked === true)}
                      disabled={loading}
                    >
                      Αντικατάσταση υπάρχοντος κωδικού
                    </Checkbox>
                    <Box paddingLeft={6} paddingTop={2}>
                      <Typography variant="pi" textColor="neutral500">
                        Όταν υπάρχει ήδη διαφορετικός event_group_code
                      </Typography>
                    </Box>
                  </Box>
                </GridItem>
              </Grid>

              <Flex gap={3} paddingTop={4} wrap="wrap" alignItems="center">
                <Button
                  loading={loading}
                  onClick={runLookup}
                  disabled={loading}
                  style={actionButtonStyle}
                >
                  Εκτέλεση ταύτισης
                </Button>
                <Button
                  variant="success"
                  loading={loading}
                  onClick={applyToCms}
                  disabled={loading}
                  style={actionButtonStyle}
                >
                  Γράψε αυτόματα
                </Button>
              </Flex>
              <Box paddingTop={4}>
                <Typography variant="pi" textColor="neutral500">
                  Η ταύτιση δείχνει πλήρη κατάλογο More και προτάσεις. Το «Γράψε αυτόματα» εφαρμόζει
                  κωδικούς με score ≥ {applyMinScore.toFixed(2)} (κύριος + more_event_groups).
                </Typography>
              </Box>
            </Box>

            <Box paddingTop={4} padding={5} background="neutral0" shadow="filterShadow" hasRadius style={cardStyle}>
              <PanelHeader
                title="Βήμα 2 — Συγχρονισμός προβολών"
                subtitle="More API → Προβολή ταινίας / Παράσταση · cron καθημερινά 06:45"
                action={
                  showtimeSyncEnabled ? (
                    <Button
                      variant="success"
                      loading={loading}
                      onClick={syncShowtimes}
                      disabled={loading}
                      style={actionButtonStyle}
                    >
                      Τρέξε sync
                    </Button>
                  ) : null
                }
              />
              {!showtimeSyncEnabled ? (
                <Typography textColor="danger600">
                  Απενεργοποιημένο (MORE_SHOWTIME_SYNC_ENABLED=false).
                </Typography>
              ) : (
                <Box paddingTop={1}>
                  <Typography variant="pi" textColor="neutral600">
                    Χρειάζεται event_group_code ανά ταινία/παράσταση και χώρος με venue_id ή bundle.
                    Δημιουργούνται μόνο νέες εγγραφές.
                  </Typography>
                </Box>
              )}
            </Box>
          </>
        )}

        {hasResults ? (
          <Box paddingTop={6}>
            <Divider />
            <Box paddingTop={5} paddingBottom={2}>
              <Typography variant="delta">Αποτελέσματα</Typography>
            </Box>
          </Box>
        ) : null}

        {result?.stats ? (
          <Flex gap={3} wrap="wrap" paddingBottom={4}>
            {result.stats.matched != null ? (
              <StatBadge
                label="Ταύτιση CMS"
                value={`${result.stats.matched}/${(result.stats.cmsMovies ?? 0) + (result.stats.cmsTheaterShows ?? 0)}`}
                tone="success"
              />
            ) : null}
            {result.stats.catalogMissing != null ? (
              <StatBadge label="Λείπουν από CMS" value={catalogMissing} tone={catalogMissing > 0 ? 'warning' : 'success'} />
            ) : null}
            {result.stats.catalogInCms != null ? (
              <StatBadge label="Στο CMS" value={catalogInCms} />
            ) : null}
            {result.stats.pendingApproval != null ? (
              <StatBadge label="Προς έγκριση" value={result.stats.pendingApproval} />
            ) : null}
            <StatBadge label="Διάρκεια" value={`${result.durationMs}ms`} />
          </Flex>
        ) : null}

        {syncReport ? (
          <Box paddingBottom={4}>
            <SyncReportPanel report={syncReport} />
          </Box>
        ) : null}

        {applyResult ? (
          <Box paddingBottom={4} padding={4} background="success100" hasRadius style={cardStyle}>
            <Flex direction="column" alignItems="flex-start" gap={2}>
              <Typography fontWeight="semiBold">
                Εγγραφή CMS · {applyResult.stats.applied} ενημερώθηκαν · {applyResult.stats.skipped}{' '}
                παραλείφθηκαν
              </Typography>
              {applyResult.applied?.length ? (
                <Typography variant="pi" textColor="neutral600">
                  {applyResult.applied
                    .slice(0, 20)
                    .map((r) =>
                      `${r.cmsTitle} → ${r.eventGroupCode}${r.addedAsSecondary ? ' (επιπλέον)' : ''}`,
                    )
                    .join(' · ')}
                </Typography>
              ) : null}
            </Flex>
          </Box>
        ) : null}

        {matchDisplayRows.length > 0 ? (
          <Box paddingBottom={6} background="neutral0" shadow="filterShadow" hasRadius style={cardStyle}>
            <Box padding={4}>
              <PanelHeader
                title="Πίνακας 1 — Προτάσεις ταύτισης"
                subtitle="Τι θα έγραφε το «Γράψε αυτόματα». Ταύτιση τίτλου + slug σελίδας More (/cinemas/… → data-code). Μόνο προβολή."
              />
            </Box>
            <Table colCount={8} rowCount={matchDisplayRows.length}>
              <Thead>
                <Tr>
                  <Th>
                    <Typography variant="sigma">Τύπος</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">CMS τίτλος</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">Ρόλος</Typography>
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
                    <Typography variant="sigma">CMS τώρα</Typography>
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {matchDisplayRows.map((row) => (
                  <Tr key={row.displayKey}>
                    <Td>
                      <Badge>{cmsTypeLabel(row.contentType)}</Badge>
                    </Td>
                    <Td>
                      <Typography textColor="neutral800">{row.cmsTitle}</Typography>
                    </Td>
                    <Td>
                      <Badge>{row.codeRole}</Badge>
                    </Td>
                    <Td>
                      <Typography textColor="neutral600">{row.displayMoreTitle}</Typography>
                    </Td>
                    <Td>
                      <Typography fontWeight="bold">{row.displayCode}</Typography>
                    </Td>
                    <Td>
                      <Flex direction="column" alignItems="flex-start" gap={1}>
                        <Typography>{row.displayScore.toFixed(2)}</Typography>
                        {row.displayMatchMethod === 'more_page_slug' ? (
                          <Badge>slug More</Badge>
                        ) : null}
                      </Flex>
                    </Td>
                    <Td>
                      <Typography variant="pi">
                        {row.displayVerify?.ok
                          ? `${row.displayVerify.eventCount} ev / ${row.displayVerify.venueCount} venues`
                          : row.displayVerify?.error || '—'}
                      </Typography>
                    </Td>
                    <Td>
                      {(row.cmsEventGroupCodes?.length ?? 0) > 0 ? (
                        <Badge>{formatCodeList(row.cmsEventGroupCodes)}</Badge>
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
          <Box paddingBottom={6} background="neutral0" shadow="filterShadow" hasRadius style={cardStyle}>
            <Box padding={4}>
              <PanelHeader
                title={`Πίνακας 2 — Προς έγκριση (${pendingApproval.length})`}
                subtitle={`Διαφορετικός από τον πίνακα 1: χαμηλό score (< ${applyMinScore.toFixed(2)}), κυρίως θέατρο — χρειάζεται κλικ «Έγκριση»`}
                action={
                  <Button size="S" variant="success" loading={loading} onClick={approveAllPending} disabled={loading}>
                    Έγκριση όλων
                  </Button>
                }
              />
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
          <Box paddingBottom={4} padding={4} background="warning100" hasRadius style={cardStyle}>
            <Flex direction="column" alignItems="flex-start" gap={2}>
              <Typography fontWeight="semiBold">
                Χωρίς πρόταση ({result.unmatched.length})
              </Typography>
              <Typography variant="pi" textColor="neutral600">
                {result.unmatched
                  .slice(0, 20)
                  .map((r) => r.cmsTitle)
                  .join(' · ')}
              </Typography>
            </Flex>
          </Box>
        ) : null}

        {catalog.length > 0 && (!catalogOnlyMissing || catalogFiltered.length > 0) ? (
          <Box paddingBottom={6} background="neutral0" shadow="filterShadow" hasRadius style={cardStyle}>
            <Box padding={4}>
              <PanelHeader
                title="Πίνακας 3 — Κατάλογος More"
                subtitle={`Όλα από More (όχι ανά CMS ταινία). ${catalogFiltered.length} εμφανίζονται · ${catalogMissing} λείπουν από CMS`}
              />
              <Box paddingTop={2}>
                <Checkbox
                  checked={catalogOnlyMissing}
                  onCheckedChange={(checked) => setCatalogOnlyMissing(checked === true)}
                >
                  Μόνο κωδικοί που λείπουν από το CMS
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
        </div>
      </ContentLayout>
    </Layout>
  );
};

export default App;
