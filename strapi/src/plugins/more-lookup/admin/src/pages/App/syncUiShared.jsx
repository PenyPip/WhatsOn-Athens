import React from 'react';
import {
  Box,
  Typography,
  Button,
  Flex,
  Badge,
} from '@strapi/design-system';

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

function truncateLabel(text, max = 28) {
  const s = String(text || '').trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

/** Ελληνικός + πρωτότυπος τίτλος CMS για σύνδεση unmatched. */
function cmsDualTitleLabel(opt, { max = 56 } = {}) {
  if (!opt) return '';
  const el = String(opt.cmsTitle || opt.title || '').trim();
  const orig = String(opt.originalTitle || '').trim();
  if (el && orig && orig.toLocaleLowerCase('el') !== el.toLocaleLowerCase('el')) {
    return truncateLabel(`${el} (${orig})`, max);
  }
  return truncateLabel(el || orig || `#${opt.cmsId ?? opt.id ?? ''}`, max);
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

function compactSyncErrorMessage(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';

  const dataTooLong = s.match(/Data too long for column '([^']+)'/i);
  if (dataTooLong) return `Πολύ μεγάλη τιμή για το πεδίο «${dataTooLong[1]}»`;
  if (/Duplicate entry/i.test(s)) return 'Διπλότυπη εγγραφή (unique constraint)';

  const parts = s.split(' - ');
  const tail = parts[parts.length - 1]?.trim() || '';
  if (tail && tail.length < 240 && !/^insert into/i.test(tail)) {
    if (tail !== s) return compactSyncErrorMessage(tail);
    return tail;
  }
  if (/^insert into/i.test(s) && s.length > 120) {
    return compactSyncErrorMessage(tail) || 'Σφάλμα εγγραφής στη βάση';
  }
  return s.length > 240 ? `${s.slice(0, 237)}…` : s;
}

function syncErrorContextLabel(err) {
  if (!err || typeof err !== 'object') return 'Σφάλμα';
  if (err.action === 'create_venue') {
    const type = err.venueType === 'theater' ? 'θέατρο' : 'σινεμά';
    return `Δημιουργία χώρου (${type})`;
  }
  if (err.title) return err.title;
  if (err.name) return err.name;
  return 'Σφάλμα';
}

function syncErrorMetaLines(err) {
  if (!err || typeof err !== 'object') return [];
  const lines = [];
  if (err.moreVenueId) lines.push(`More venueId: ${err.moreVenueId}`);
  if (err.code) lines.push(`Κωδικός: ${err.code}`);
  if (err.movieId) lines.push(`Ταινία CMS #${err.movieId}`);
  if (err.theaterShowId) lines.push(`Παράσταση CMS #${err.theaterShowId}`);
  if (err.venueId) lines.push(`Χώρος CMS #${err.venueId}`);
  return lines;
}

function isTransientGatewayError(err) {
  const status = err?.response?.status ?? err?.status;
  if (status === 502 || status === 503 || status === 504) return true;
  const body =
    typeof err?.response?.data === 'string'
      ? err.response.data
      : typeof err?.response?.data?.message === 'string'
        ? err.response.data.message
        : '';
  const msg = `${err?.message || ''} ${body}`;
  return /502|503|504|bad gateway|gateway time-out|nginx/i.test(msg);
}

function groupSyncErrors(errors) {
  const groups = new Map();
  for (const err of errors || []) {
    const msg = compactSyncErrorMessage(err?.error || err?.message || err);
    const context = syncErrorContextLabel(err);
    const key = `${context}|${msg}`;
    const prev = groups.get(key);
    if (prev) {
      prev.count += 1;
      continue;
    }
    groups.set(key, { context, message: msg, meta: syncErrorMetaLines(err), count: 1, sample: err });
  }
  return [...groups.values()].sort((a, b) => b.count - a.count);
}

function groupVenueStatusByTransition(venues) {
  const groups = new Map();
  for (const row of venues || []) {
    const key = row.transition || 'unchanged';
    const list = groups.get(key) || [];
    list.push(row);
    groups.set(key, list);
  }
  return groups;
}

const VENUE_STATUS_GROUP_ORDER = [
  'became_complete',
  'no_new_to_manual',
  'became_manual',
  'complete_to_manual',
  'still_complete',
  'still_manual',
  'still_no_new',
  'unchanged',
];

const VENUE_STATUS_GROUP_META = {
  became_complete: { title: 'Έγιναν πλήρει', tone: 'success' },
  no_new_to_manual: { title: 'no_new → χειροκίνητα', tone: 'warning' },
  became_manual: { title: 'Έγιναν χειροκίνητα', tone: 'warning' },
  complete_to_manual: { title: 'Υποβάθμιση complete → χειροκίνητα', tone: 'danger' },
  still_complete: { title: 'Ήδη πλήρει (δεν άλλαξαν)', tone: 'neutral' },
  still_manual: { title: 'Παρέμειναν χειροκίνητα', tone: 'neutral' },
  still_no_new: { title: 'Παρέμειναν no_new', tone: 'neutral' },
  unchanged: { title: 'Άλλες αλλαγές', tone: 'neutral' },
};

function unmatchedRowKey(row) {
  if (typeof row === 'string') return row;
  return `${row.playTitle || ''}::${(row.eventIds || []).join(',') || row.eventId || ''}`;
}

export {
  cardStyle,
  actionButtonStyle,
  WorkflowStep,
  PanelHeader,
  truncateLabel,
  cmsDualTitleLabel,
  StatBadge,
  SyncMetricRow,
  SyncReportSection,
  compactSyncErrorMessage,
  syncErrorContextLabel,
  syncErrorMetaLines,
  isTransientGatewayError,
  groupSyncErrors,
  groupVenueStatusByTransition,
  VENUE_STATUS_GROUP_ORDER,
  VENUE_STATUS_GROUP_META,
  unmatchedRowKey,
};
