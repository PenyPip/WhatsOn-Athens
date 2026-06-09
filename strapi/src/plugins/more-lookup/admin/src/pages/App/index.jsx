import React, { useCallback, useEffect, useState } from 'react';
import '../more-lookup-admin.css';
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

function EllipsisCell({ text, tone = 'neutral800', mono = false }) {
  const value = String(text ?? '—');
  return (
    <Typography
      variant="pi"
      textColor={tone}
      fontWeight={mono ? 'bold' : undefined}
      ellipsis
      title={value}
      className={mono ? 'more-lookup-cell-code' : 'more-lookup-cell-ellipsis'}
    >
      {value}
    </Typography>
  );
}

function MatchRowActions({ loading, onApprove, onReject, queued = false }) {
  return (
    <div className="more-lookup-row-actions">
      <Button size="S" variant="tertiary" loading={loading} onClick={onReject} title="Απόρριψη">
        Απόρ.
      </Button>
      <Button
        size="S"
        variant={queued ? 'secondary' : 'success'}
        loading={loading}
        onClick={onApprove}
        disabled={queued}
        title={queued ? 'Στην ουρά εγγραφής' : 'Έγκριση'}
      >
        {queued ? 'Στην ουρά' : 'Έγκρ.'}
      </Button>
    </div>
  );
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

    return codes
      .filter((code) => !(row.cmsEventGroupCodes || []).includes(code))
      .map((code, index) => {
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
          isQueued: (row.cmsApprovedMoreCodes || []).includes(code),
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
            {report.movieEventGroupCodesTotal != null ? (
              <SyncMetricRow
                label="Κωδικοί More (σύνολο)"
                value={report.movieEventGroupCodesTotal}
                detail={`κύριος + more_event_groups${(report.moviesWithMultipleEventGroupCodes ?? 0) > 0 ? ` · ${report.moviesWithMultipleEventGroupCodes} ταινίες με 2+` : ''}`}
              />
            ) : null}
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
            <SyncMetricRow
              label="Νέοι χώροι σινεμά"
              value={`+${report.createdCinemaVenues ?? 0}`}
              detail={
                (report.createdCinemaVenues ?? 0) > 0
                  ? 'Δημιουργήθηκαν αυτόματα από More'
                  : 'Αυτόματη δημιουργία όταν λείπει venue_id'
              }
              last={!(report.createdCinemaVenuesList?.length > 0)}
            />
            {report.createdCinemaVenuesList?.length > 0 ? (
              <Typography variant="pi" textColor="neutral600" paddingTop={1}>
                {report.createdCinemaVenuesList
                  .slice(0, 8)
                  .map((v) => v.name)
                  .join(' · ')}
              </Typography>
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
              Τα venueId δεν αντιστοιχούν ακόμα σε χώρο CMS. Στο sync δημιουργούνται αυτόματα σινεμά/θέατρα
              (εκτός αν απενεργοποιηθεί με MORE_CINEMA_SYNC_AUTO_CREATE_VENUES / MORE_THEATER_SYNC_AUTO_CREATE_VENUES).
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
        message: res?.data?.message || `Εγγράφηκαν: ${applied} · παραλείφθηκαν: ${skipped}`,
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
  const approvedQueueCount =
    result?.stats?.approvedQueue ??
    (result?.approvedQueue || []).reduce(
      (sum, row) => sum + (row.approvedEventGroupCodes?.length || 0),
      0,
    );
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
        message: res?.data?.message || 'Προστέθηκε στην ουρά εγγραφής.',
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

  const pruneMatchDisplayRow = (displayKey) => {
    setResult((prev) => {
      if (!prev?.matches?.length) return prev;
      const matches = prev.matches
        .map((row) => {
          const codes = (row.suggestedEventGroupCodes || []).filter(
            (code) => `${rowKey(row)}:${code}` !== displayKey,
          );
          const moreMatches = (row.moreMatches || []).filter(
            (match) => `${rowKey(row)}:${match.suggestedEventGroupCode}` !== displayKey,
          );
          const best = moreMatches[0] || null;
          return {
            ...row,
            moreMatches,
            suggestedEventGroupCodes: codes,
            suggestedEventGroupCode: best?.suggestedEventGroupCode ?? null,
            moreTitle: best?.moreTitle ?? row.moreTitle,
            score: Number(best?.score ?? 0),
            matched: codes.length > 0,
          };
        })
        .filter((row) => row.matched || (row.moreMatches || []).length > 0);
      return { ...prev, matches };
    });
  };

  const queueMatchRow = (displayKey, code) => {
    setResult((prev) => {
      if (!prev?.matches?.length) return prev;
      return {
        ...prev,
        matches: prev.matches.map((matchRow) => {
          const key = `${rowKey(matchRow)}:${code}`;
          if (key !== displayKey) return matchRow;
          const approved = [...new Set([...(matchRow.cmsApprovedMoreCodes || []), code])];
          return { ...matchRow, cmsApprovedMoreCodes: approved };
        }),
        stats: {
          ...prev.stats,
          approvedQueue: (prev.stats?.approvedQueue ?? 0) + 1,
        },
      };
    });
  };

  const approveMatchCode = async (row) => {
    setLoading(true);
    try {
      const res = await post('/api/more-lookup/approve', {
        contentType: row.contentType,
        cmsId: row.cmsId ?? row.movieId ?? row.theaterShowId,
        movieId: row.movieId,
        theaterShowId: row.theaterShowId,
        eventGroupCode: row.displayCode,
      });
      if (res?.data?.alreadyPresent) {
        pruneMatchDisplayRow(row.displayKey);
      } else {
        queueMatchRow(row.displayKey, row.displayCode);
      }
      toggleNotification({
        type: 'success',
        message:
          res?.data?.message ||
          (res?.data?.queued
            ? `Στην ουρά: ${row.displayCode}`
            : `Εγκρίθηκε ${row.displayCode}`),
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

  const unqueueMatchRow = (displayKey, code) => {
    setResult((prev) => {
      if (!prev?.matches?.length) return prev;
      return {
        ...prev,
        matches: prev.matches.map((matchRow) => {
          const key = `${rowKey(matchRow)}:${code}`;
          if (key !== displayKey) return matchRow;
          return {
            ...matchRow,
            cmsApprovedMoreCodes: (matchRow.cmsApprovedMoreCodes || []).filter((c) => c !== code),
          };
        }),
        stats: {
          ...prev.stats,
          approvedQueue: Math.max(0, (prev.stats?.approvedQueue ?? 0) - 1),
        },
      };
    });
  };

  const rejectMatchCode = async (row) => {
    setLoading(true);
    try {
      const res = await post('/api/more-lookup/reject', {
        contentType: row.contentType,
        cmsId: row.cmsId ?? row.movieId ?? row.theaterShowId,
        movieId: row.movieId,
        theaterShowId: row.theaterShowId,
        eventGroupCode: row.displayCode,
      });
      if (row.isQueued) unqueueMatchRow(row.displayKey, row.displayCode);
      pruneMatchDisplayRow(row.displayKey);
      toggleNotification({
        type: 'info',
        message: res?.data?.message || `Απορρίφθηκε ${row.displayCode}`,
      });
    } catch (error) {
      toggleNotification({ type: 'warning', message: 'Αποτυχία απόρριψης.' });
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
        eventGroupCode: row.suggestedEventGroupCode,
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
                    detail="Έγκριση → ουρά · «Γράψε αυτόματα» → CMS"
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
                subtitle="Έγκριση → ουρά · «Γράψε αυτόματα» γράφει μόνο εγκεκριμένους κωδικούς"
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
                  Η ταύτιση δείχνει μόνο κωδικούς που λείπουν από το CMS. Πάτα «Έγκρ.» ανά γραμμή, μετά
                  «Γράψε αυτόματα»{approvedQueueCount > 0 ? ` (${approvedQueueCount} στην ουρά)` : ''}.
                </Typography>
              </Box>
            </Box>

            <Box paddingTop={4} padding={5} background="neutral0" shadow="filterShadow" hasRadius style={cardStyle}>
              <PanelHeader
                title="Βήμα 2 — Συγχρονισμός προβολών"
                subtitle="More API → Προβολή ταινίας / Παράσταση · μόνο χειροκίνητα (χωρίς cron)"
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
                    Χρειάζεται event_group_code ανά ταινία/παράσταση. Αν λείπει σινεμά ή θέατρο στο CMS,
                    δημιουργείται αυτόματα από More (venueId + όνομα) και μετά προστίθενται προβολές.
                    Δημιουργούνται μόνο νέες εγγραφές προβολών.
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
            {approvedQueueCount > 0 ? (
              <StatBadge label="Ουρά εγγραφής" value={approvedQueueCount} tone="success" />
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
                subtitle="Πρώτα «Έγκρ.» ανά γραμμή · μετά «Γράψε αυτόματα». Δεν εμφανίζονται κωδικοί που υπάρχουν ήδη στο CMS."
              />
            </Box>
            <Box className="more-lookup-match-table more-lookup-match-table--matches">
            <Table colCount={7} rowCount={matchDisplayRows.length}>
              <Thead>
                <Tr>
                  <Th className="more-lookup-col-actions">
                    <Typography variant="sigma">Απόρ./Έγκρ.</Typography>
                  </Th>
                  <Th className="more-lookup-col-cms-title">
                    <Typography variant="sigma">CMS</Typography>
                  </Th>
                  <Th className="more-lookup-col-more-title">
                    <Typography variant="sigma">More</Typography>
                  </Th>
                  <Th className="more-lookup-col-code">
                    <Typography variant="sigma">evg_</Typography>
                  </Th>
                  <Th className="more-lookup-col-type">
                    <Typography variant="sigma">Τύπος</Typography>
                  </Th>
                  <Th className="more-lookup-col-score">
                    <Typography variant="sigma">Sc</Typography>
                  </Th>
                  <Th className="more-lookup-col-api">
                    <Typography variant="sigma">API</Typography>
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {matchDisplayRows.map((row) => (
                  <Tr key={row.displayKey}>
                    <Td className="more-lookup-col-actions">
                      <MatchRowActions
                        loading={loading}
                        queued={row.isQueued}
                        onReject={() => rejectMatchCode(row)}
                        onApprove={() => approveMatchCode(row)}
                      />
                    </Td>
                    <Td className="more-lookup-col-cms-title">
                      <EllipsisCell text={row.cmsTitle} />
                    </Td>
                    <Td className="more-lookup-col-more-title">
                      <EllipsisCell text={row.displayMoreTitle} tone="neutral600" />
                    </Td>
                    <Td className="more-lookup-col-code">
                      <EllipsisCell text={row.displayCode} mono />
                      {row.codeRole !== 'κύριος' ? (
                        <Typography variant="pi" textColor="neutral500">
                          {row.codeRole}
                        </Typography>
                      ) : null}
                    </Td>
                    <Td className="more-lookup-col-type">
                      <Badge>{cmsTypeLabel(row.contentType)}</Badge>
                    </Td>
                    <Td className="more-lookup-col-score">
                      <Typography variant="pi">{row.displayScore.toFixed(2)}</Typography>
                      {row.displayMatchMethod === 'more_page_slug' ? (
                        <Badge>slug</Badge>
                      ) : null}
                    </Td>
                    <Td className="more-lookup-col-api">
                      <Typography variant="pi">
                        {row.displayVerify?.ok
                          ? `${row.displayVerify.eventCount}/${row.displayVerify.venueCount}`
                          : row.displayVerify?.error || '—'}
                      </Typography>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
            </Box>
          </Box>
        ) : null}

        {pendingApproval.length > 0 ? (
          <Box paddingBottom={6} background="neutral0" shadow="filterShadow" hasRadius style={cardStyle}>
            <Box padding={4}>
              <PanelHeader
                title={`Πίνακας 2 — Προς έγκριση (${pendingApproval.length})`}
                subtitle={`Χαμηλό score (< ${applyMinScore.toFixed(2)}) — «Έγκρ.» → ουρά, μετά «Γράψε αυτόματα»`}
                action={
                  <Button size="S" variant="success" loading={loading} onClick={approveAllPending} disabled={loading}>
                    Έγκριση όλων
                  </Button>
                }
              />
            </Box>
            <Box className="more-lookup-match-table more-lookup-match-table--pending">
            <Table colCount={6} rowCount={pendingApproval.length}>
              <Thead>
                <Tr>
                  <Th className="more-lookup-col-actions">
                    <Typography variant="sigma">Απόρ./Έγκρ.</Typography>
                  </Th>
                  <Th className="more-lookup-col-cms-title">
                    <Typography variant="sigma">CMS</Typography>
                  </Th>
                  <Th className="more-lookup-col-more-title">
                    <Typography variant="sigma">More</Typography>
                  </Th>
                  <Th className="more-lookup-col-code">
                    <Typography variant="sigma">evg_</Typography>
                  </Th>
                  <Th className="more-lookup-col-score">
                    <Typography variant="sigma">Sc</Typography>
                  </Th>
                  <Th className="more-lookup-col-type">
                    <Typography variant="sigma">Τύπος</Typography>
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {pendingApproval.map((row) => (
                  <Tr key={rowKey(row)}>
                    <Td className="more-lookup-col-actions">
                      <MatchRowActions
                        loading={loading}
                        onReject={() => rejectItem(row)}
                        onApprove={() => approveItem(row, Boolean(row.cmsEventGroupCode))}
                      />
                    </Td>
                    <Td className="more-lookup-col-cms-title">
                      <EllipsisCell text={row.cmsTitle} />
                    </Td>
                    <Td className="more-lookup-col-more-title">
                      <EllipsisCell text={row.moreTitle || '—'} tone="neutral600" />
                    </Td>
                    <Td className="more-lookup-col-code">
                      <EllipsisCell text={row.suggestedEventGroupCode} mono />
                    </Td>
                    <Td className="more-lookup-col-score">
                      <Typography variant="pi">{Number(row.score).toFixed(2)}</Typography>
                    </Td>
                    <Td className="more-lookup-col-type">
                      <Badge>{cmsTypeLabel(row.contentType)}</Badge>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
            </Box>
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
