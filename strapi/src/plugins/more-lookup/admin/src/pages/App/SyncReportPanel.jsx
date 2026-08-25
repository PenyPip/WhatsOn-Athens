import React from 'react';
import {
  Box,
  Typography,
  Button,
  Flex,
  Grid,
  GridItem,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
} from '@strapi/design-system';
import {
  cardStyle,
  StatBadge,
  SyncMetricRow,
  SyncReportSection,
  groupSyncErrors,
  groupVenueStatusByTransition,
  VENUE_STATUS_GROUP_ORDER,
  VENUE_STATUS_GROUP_META,
  unmatchedRowKey,
} from './syncUiShared';
import { UnmatchedTitlesPanel } from './UnmatchedTitlesPanel';
import { AthinoramaSyncReportPanel } from './AthinoramaSyncReportPanel';

function VenueStatusTransitionsPanel({ venueStatus }) {
  const [expanded, setExpanded] = React.useState({});
  const venues = Array.isArray(venueStatus?.venues) ? venueStatus.venues : [];
  const groups = React.useMemo(() => groupVenueStatusByTransition(venues), [venues]);
  if (!venues.length) return null;

  const orderedKeys = [
    ...VENUE_STATUS_GROUP_ORDER.filter((k) => groups.has(k)),
    ...[...groups.keys()].filter((k) => !VENUE_STATUS_GROUP_ORDER.includes(k)),
  ];

  return (
    <Flex direction="column" gap={4} paddingTop={2}>
      {orderedKeys.map((key) => {
        const meta = VENUE_STATUS_GROUP_META[key] || {
          title: key,
          tone: 'neutral',
        };
        const rows = groups.get(key) || [];
        const isOpen = expanded[key] === true;
        const preview = rows.slice(0, isOpen ? rows.length : 4);
        return (
          <Box key={key}>
            <Flex justifyContent="space-between" alignItems="center" gap={2} paddingBottom={2}>
              <Typography variant="pi" fontWeight="semiBold" textColor="neutral700">
                {meta.title} ({rows.length})
              </Typography>
              {rows.length > 4 ? (
                <Button
                  size="S"
                  variant="tertiary"
                  onClick={() => setExpanded((prev) => ({ ...prev, [key]: !isOpen }))}
                >
                  {isOpen ? 'Λιγότερα' : `Όλα (${rows.length})`}
                </Button>
              ) : null}
            </Flex>
            <Box background="neutral0" hasRadius style={{ border: '1px solid #eaeaef', overflowX: 'auto' }}>
              <Table colCount={4} rowCount={preview.length}>
                <Thead>
                  <Tr>
                    <Th>
                      <Typography variant="sigma">Κινηματογράφος</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Κατάσταση</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Μετάβαση</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Γιατί όχι complete / τι έγινε</Typography>
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {preview.map((row) => {
                    const prev =
                      row.previousStatusLabel && row.previousStatus !== row.status
                        ? `${row.previousStatusLabel} → `
                        : '';
                    return (
                      <Tr key={`${key}-${row.venueId}`}>
                        <Td>
                          <Typography fontWeight="semiBold" textColor="neutral800">
                            {row.venueName}
                          </Typography>
                          <Typography variant="pi" textColor="neutral500">
                            #{row.venueId}
                          </Typography>
                        </Td>
                        <Td>
                          <Typography variant="pi" textColor="neutral600">
                            {prev}
                            {row.statusLabel}
                          </Typography>
                        </Td>
                        <Td>
                          {row.transitionLabel ? (
                            <Badge background={`${meta.tone}100`} textColor={`${meta.tone}600`}>
                              {row.transitionLabel}
                            </Badge>
                          ) : (
                            <Typography variant="pi" textColor="neutral500">
                              —
                            </Typography>
                          )}
                        </Td>
                        <Td>
                          <Typography variant="pi" textColor="neutral600">
                            {row.reasonDetail || '—'}
                          </Typography>
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </Box>
          </Box>
        );
      })}
    </Flex>
  );
}

function SyncReportPanel({
  report,
  unmatchedBusyKey,
  unmatchedPicks,
  onUnmatchedPickChange,
  onUnmatchedLink,
  onUnmatchedDismiss,
  dismissedUnmatchedKeys,
}) {
  const [showAllMissingIds, setShowAllMissingIds] = React.useState(false);
  const [showErrors, setShowErrors] = React.useState(false);
  const errorGroups = React.useMemo(() => groupSyncErrors(report?.errors), [report?.errors]);

  if (!report) return null;

  const isAthinorama = report.source === 'athinorama';
  const created = Number(report.created ?? report.createdTotal ?? 0);
  const createdFromBuckets = Number(report.createdFromBuckets ?? created);
  const createdInDb = report.createdInDb != null ? Number(report.createdInDb) : null;
  const createdMismatch = createdInDb != null && createdInDb !== createdFromBuckets;
  const alreadyExists = Number(report.alreadyExists ?? 0);
  const skippedNoVenue = Number(report.skippedNoVenue ?? 0);
  const skippedUnknown = Number(report.skippedUnknownEventId ?? 0);
  const resolvedViaScrape = Number(report.resolvedViaVenueScrape ?? 0);
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
  const venueStatusRows = Array.isArray(venueStatus?.venues) ? venueStatus.venues : [];
  const hasVenueStatus = venueStatusRows.length > 0 || Number(venueStatus?.updated ?? 0) > 0;

  if (isAthinorama) {
    return (
      <AthinoramaSyncReportPanel
        report={report}
        unmatchedBusyKey={unmatchedBusyKey}
        unmatchedPicks={unmatchedPicks}
        onUnmatchedPickChange={onUnmatchedPickChange}
        onUnmatchedLink={onUnmatchedLink}
        onUnmatchedDismiss={onUnmatchedDismiss}
        dismissedUnmatchedKeys={dismissedUnmatchedKeys}
      />
    );
  }

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
        {createdMismatch ? (
          <StatBadge
            label="Όντως στη βάση"
            value={createdInDb}
            tone="warning"
            hint={`Μετρητές sync: ${createdFromBuckets} — ασυμφωνία`}
          />
        ) : null}
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
        {resolvedViaScrape > 0 ? (
          <StatBadge
            label="Scrape→CMS"
            value={resolvedViaScrape}
            tone="success"
            hint="Άγνωστα eventId από more_link"
          />
        ) : null}
        {(report.scrapeTitleUnmatched ?? 0) > 0 ? (
          <StatBadge
            label="Χωρίς ταύτιση τίτλου"
            value={report.scrapeTitleUnmatched}
            tone="warning"
            hint="Δες λίστα από κάτω"
          />
        ) : null}
        {skippedPast > 0 ? (
          <StatBadge label="Παρελθούσες" value={skippedPast} tone="neutral" hint="Παραλείφθηκαν" />
        ) : null}
        <StatBadge
          label="Σφάλματα"
          value={errorCount}
          tone={errorCount > 0 ? 'danger' : 'neutral'}
        />
      </Flex>

      {(report.scrapeTitleMisses?.length || report.scrapeTitleUnmatched) ? (
        <Box paddingBottom={4}>
          <UnmatchedTitlesPanel
            titles={(report.scrapeTitleMisses || []).filter(
              (row) => !dismissedUnmatchedKeys?.has?.(unmatchedRowKey(row)),
            )}
            count={report.scrapeTitleUnmatched}
            busyKey={unmatchedBusyKey}
            picks={unmatchedPicks}
            onPickChange={onUnmatchedPickChange}
            onLink={onUnmatchedLink}
            onDismiss={onUnmatchedDismiss}
            capped={Boolean(report.scrapeTitleMissesCapped)}
            dropped={report.scrapeTitleMissesDropped ?? 0}
            titleMatchHint={report.titleMatchHint}
          />
          {report.persistDegraded ? (
            <Typography variant="pi" textColor="warning700" paddingTop={2}>
              Η πλήρης αναφορά δεν αποθηκεύτηκε στο disk (συμπυκνωμένη/sidecar).
            </Typography>
          ) : null}
        </Box>
      ) : null}

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
            <Flex gap={3} wrap="wrap" paddingTop={1} paddingBottom={3}>
              <StatBadge
                label="Έγιναν πλήρει"
                value={venueStatus.became_complete ?? 0}
                tone={(venueStatus.became_complete ?? 0) > 0 ? 'success' : 'neutral'}
              />
              <StatBadge
                label="no_new → χειροκίνητα"
                value={venueStatus.no_new_to_manual ?? 0}
                tone={(venueStatus.no_new_to_manual ?? 0) > 0 ? 'warning' : 'neutral'}
              />
              <StatBadge label="Πλήρει (σύνολο)" value={venueStatus.complete ?? 0} tone="success" />
              <StatBadge
                label="Χειροκίνητα"
                value={venueStatus.needs_manual ?? 0}
                tone={(venueStatus.needs_manual ?? 0) > 0 ? 'warning' : 'neutral'}
              />
              {(venueStatus.preserved_complete ?? 0) > 0 ? (
                <StatBadge
                  label="Ήδη complete"
                  value={venueStatus.preserved_complete}
                />
              ) : null}
              {(venueStatus.complete_to_manual ?? 0) > 0 ? (
                <StatBadge
                  label="complete → manual"
                  value={venueStatus.complete_to_manual}
                  tone="danger"
                />
              ) : null}
            </Flex>
            <VenueStatusTransitionsPanel venueStatus={venueStatus} />
          </SyncReportSection>
        </Box>
      ) : null}

      {report.venueDiagnosis ? (
        <Box paddingBottom={missingIds.length || errorCount ? 4 : 0}>
          <SyncReportSection title="Διάγνωση σινεμά" tone="warning">
            <Typography variant="pi" textColor="neutral700" paddingBottom={2}>
              {report.venueDiagnosis.name
                ? `«${report.venueDiagnosis.name}»`
                : '—'}
              {report.venueDiagnosis.venueId != null
                ? ` #${report.venueDiagnosis.venueId}`
                : ''}
              {report.venueDiagnosis.moreVenueId
                ? ` · More venueId ${report.venueDiagnosis.moreVenueId}`
                : ' · χωρίς More venueId'}
              {report.venueDiagnosis.hasBundle
                ? ` · bundle: ${(report.venueDiagnosis.bundleCodes || []).join(', ') || 'ναι'}`
                : ' · χωρίς bundle'}
            </Typography>
            <Typography variant="pi" textColor="neutral600" paddingBottom={2}>
              Νέες: {report.venueDiagnosis.created ?? 0} · υπήρχαν:{' '}
              {report.venueDiagnosis.alreadyExists ?? 0} · άγνωστο eventId:{' '}
              {report.venueDiagnosis.skippedUnknownEventId ?? 0}
              {report.venueDiagnosis.weekExpected != null
                ? ` · εβδομάδα: ${report.venueDiagnosis.weekSynced ?? 0}/${report.venueDiagnosis.weekExpected}`
                : ''}
              {report.venueDiagnosis.statusLabel
                ? ` · ${report.venueDiagnosis.statusLabel}`
                : ''}
            </Typography>
            {(report.venueDiagnosis.hints || []).map((hint) => (
              <Typography key={hint} variant="pi" textColor="neutral700" paddingTop={1}>
                · {hint}
              </Typography>
            ))}
          </SyncReportSection>
        </Box>
      ) : null}

      {missingIds.length > 0 ? (
        <Box paddingBottom={errorCount ? 4 : 0}>
          <SyncReportSection title={`Λείπουν More venueId (${missingIds.length})`} tone="warning">
            <Typography variant="pi" textColor="neutral600" paddingBottom={3}>
              Δεν βρέθηκε χώρος CMS με το ίδιο More venueId (ούτε με ίδιο όνομα). Στο sync δημιουργούνται
              αυτόματα σινεμά/θέατρα (εκτός αν απενεργοποιηθεί με MORE_CINEMA_SYNC_AUTO_CREATE_VENUES /
              MORE_THEATER_SYNC_AUTO_CREATE_VENUES).
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
          <Typography variant="pi" textColor="neutral600" paddingBottom={3}>
            {errorGroups.length} διαφορετικοί τύποι σφάλματος
            {errorCount > errorGroups.length ? ` · ${errorCount} συνολικές εγγραφές στο log` : ''}
          </Typography>
          <Flex direction="column" gap={2} paddingBottom={showErrors ? 3 : 0}>
            {errorGroups.slice(0, showErrors ? 40 : 6).map((group, i) => (
              <Box
                key={`sync-err-group-${i}`}
                className="more-lookup-sync-error-card"
                padding={3}
                background="danger100"
                hasRadius
              >
                <Flex justifyContent="space-between" alignItems="flex-start" gap={2} wrap="wrap">
                  <Typography variant="pi" fontWeight="semiBold" textColor="danger700">
                    {group.context}
                    {group.sample?.name && group.context !== group.sample.name
                      ? ` · ${group.sample.name}`
                      : ''}
                  </Typography>
                  {group.count > 1 ? (
                    <Badge background="danger200" textColor="danger700">
                      ×{group.count}
                    </Badge>
                  ) : null}
                </Flex>
                <Typography variant="pi" textColor="danger700" paddingTop={1}>
                  {group.message}
                </Typography>
                {group.meta.length > 0 ? (
                  <Typography variant="pi" textColor="neutral600" paddingTop={1}>
                    {group.meta.join(' · ')}
                  </Typography>
                ) : null}
              </Box>
            ))}
          </Flex>
          {errorGroups.length > 6 ? (
            <Box paddingBottom={showErrors ? 0 : 2}>
              <Button size="S" variant="tertiary" onClick={() => setShowErrors((v) => !v)}>
                {showErrors ? 'Λιγότερα' : `Όλα (${errorGroups.length} τύποι)`}
              </Button>
            </Box>
          ) : null}
        </SyncReportSection>
      ) : null}
    </Box>
  );
}


export { SyncReportPanel };
