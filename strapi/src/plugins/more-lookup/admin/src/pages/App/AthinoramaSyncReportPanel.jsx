import React from 'react';
import { Box, Typography, Flex } from '@strapi/design-system';
import { cardStyle, StatBadge, unmatchedRowKey } from './syncUiShared';
import { UnmatchedTitlesPanel } from './UnmatchedTitlesPanel';

/** Αναφορά από sync Athinorama (εκκρεμή σινεμά, τρέχουσα εβδομάδα). */
export function AthinoramaSyncReportPanel({
  report,
  unmatchedBusyKey,
  unmatchedPicks,
  onUnmatchedPickChange,
  onUnmatchedLink,
  onUnmatchedDismiss,
  dismissedUnmatchedKeys,
}) {
  const results = Array.isArray(report?.results) ? report.results : [];
  const failedRows = results.filter((r) => !r?.ok);
  const okRows = results.filter((r) => r?.ok);
  const created = Number(report?.created ?? report?.createdTotal ?? 0);
  const alreadyExists = Number(report?.alreadyExists ?? 0);

  return (
    <Box padding={5} background="secondary100" hasRadius style={cardStyle}>
      <Flex justifyContent="space-between" alignItems="flex-start" gap={4} wrap="wrap" paddingBottom={4}>
        <Flex direction="column" alignItems="flex-start" gap={2}>
          <Typography variant="delta" textColor="secondary700">
            Αναφορά Athinorama
          </Typography>
          <Typography variant="pi" textColor="neutral700">
            {report?.message || 'Sync τρέχουσας εβδομάδας για εκκρεμή σινεμά'}
          </Typography>
          {report?.weekLabel ? (
            <Typography variant="pi" textColor="neutral600">
              Εβδομάδα: {report.weekLabel}
            </Typography>
          ) : null}
        </Flex>
      </Flex>

      <Flex gap={3} wrap="wrap" paddingBottom={4}>
        <StatBadge
          label="Νέες προβολές"
          value={created}
          tone={created > 0 ? 'success' : 'neutral'}
          hint="Δημιουργήθηκαν τώρα"
        />
        <StatBadge label="Ήδη υπήρχαν" value={alreadyExists} />
        <StatBadge
          label="Σινεμά OK"
          value={`${report?.synced ?? 0}/${report?.pendingCount ?? results.length}`}
          tone="success"
        />
        <StatBadge
          label="→ complete"
          value={report?.becameComplete ?? 0}
          tone={(report?.becameComplete ?? 0) > 0 ? 'success' : 'neutral'}
        />
        {(report?.unmatchedMovies ?? 0) > 0 ? (
          <StatBadge
            label="Χωρίς CMS ταινία"
            value={report.unmatchedMovies}
            tone="warning"
          />
        ) : null}
        <StatBadge
          label="Αποτυχίες"
          value={report?.failed ?? 0}
          tone={(report?.failed ?? 0) > 0 ? 'danger' : 'neutral'}
        />
      </Flex>

      {okRows.length ? (
        <Box paddingBottom={failedRows.length ? 4 : 0}>
          <Typography variant="sigma" textColor="neutral600" fontWeight="semiBold" paddingBottom={2}>
            Ανά σινεμά
          </Typography>
          <Flex direction="column" gap={1} alignItems="stretch">
            {okRows.slice(0, 40).map((row) => (
              <Typography key={row.venueId} variant="pi" textColor="neutral700">
                · {row.venueName || `#${row.venueId}`}: +{row.created ?? 0} νέες
                {row.skippedExists ? ` · ${row.skippedExists} υπήρχαν` : ''}
                {row.venueUpdatedLabel ? ` · ${row.venueUpdatedLabel}` : ''}
                {row.unmatchedMovies ? ` · ${row.unmatchedMovies} χωρίς CMS` : ''}
              </Typography>
            ))}
            {okRows.length > 40 ? (
              <Typography variant="pi" textColor="neutral500">
                …και {okRows.length - 40} ακόμα
              </Typography>
            ) : null}
          </Flex>
        </Box>
      ) : null}

      <Box paddingTop={okRows.length || failedRows.length ? 4 : 0}>
        <UnmatchedTitlesPanel
          titles={(
            report?.unmatchedTitles?.length
              ? report.unmatchedTitles
              : okRows.flatMap((row) =>
                  (row.unmatchedTitles || []).map((playTitle) => ({
                    playTitle,
                    venues: row.venueName ? [row.venueName] : [],
                    suggestions: [],
                  })),
                )
          ).filter((row) => !dismissedUnmatchedKeys?.has?.(unmatchedRowKey(row)))}
          count={report?.unmatchedMovies}
          busyKey={unmatchedBusyKey}
          picks={unmatchedPicks}
          onPickChange={onUnmatchedPickChange}
          onLink={onUnmatchedLink}
          onDismiss={onUnmatchedDismiss}
          capped={Boolean(report?.scrapeTitleMissesCapped)}
          dropped={report?.scrapeTitleMissesDropped ?? 0}
          titleMatchHint={report?.titleMatchHint}
        />
      </Box>

      {failedRows.length ? (
        <Box>
          <Typography variant="sigma" textColor="danger600" fontWeight="semiBold" paddingBottom={2}>
            Αποτυχίες
          </Typography>
          {failedRows.slice(0, 20).map((row) => (
            <Typography key={row.venueId} variant="pi" textColor="danger600" paddingTop={1}>
              · {row.venueName || `#${row.venueId}`}: {row.error || 'σφάλμα'}
            </Typography>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}
