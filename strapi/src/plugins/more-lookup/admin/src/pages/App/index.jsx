import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
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

const CATALOG_KIND_FILTERS = [
  { id: 'all', label: 'Όλα' },
  { id: 'movie', label: 'Ταινίες' },
  { id: 'theater', label: 'Θέατρο' },
  { id: 'venue', label: 'Σινεμά (χώροι)' },
];

const CMS_MATCH_FILTERS = [
  { id: 'all', label: 'Όλα' },
  { id: 'movie', label: 'Ταινίες' },
  { id: 'theater_show', label: 'Θέατρο' },
  { id: 'venue', label: 'Σινεμά (χώροι)' },
];

function catalogMatchesKindFilter(row, filter) {
  if (filter === 'all') return true;
  if (filter === 'movie') return row.kind === 'movie' && row.category === 'cinema';
  if (filter === 'theater') {
    return row.category === 'theater' && row.kind !== 'venue_bundle';
  }
  if (filter === 'venue') return row.kind === 'venue_bundle';
  return true;
}

function matchesCmsContentFilter(row, filter) {
  if (filter === 'all') return true;
  return row.contentType === filter;
}

function TypeFilterBar({ label, value, options, onChange }) {
  return (
    <Box className="more-lookup-type-filters">
      {label ? (
        <Typography variant="pi" textColor="neutral600" paddingBottom={2} fontWeight="semiBold">
          {label}
        </Typography>
      ) : null}
      <Flex gap={1} wrap="wrap">
        {options.map((opt) => (
          <Button
            key={opt.id}
            size="S"
            variant={value === opt.id ? 'default' : 'tertiary'}
            onClick={() => onChange(opt.id)}
          >
            {opt.label}
            {opt.count != null ? ` (${opt.count})` : ''}
          </Button>
        ))}
      </Flex>
    </Box>
  );
}

const MORE_EVENTS_API_TEMPLATE =
  'https://www.more.com/_api/playdetails/getevents?eventGroupCode={code}';

function moreEventsApiUrl(code) {
  const c = String(code || '').trim();
  if (!c) return '';
  return MORE_EVENTS_API_TEMPLATE.replace('{code}', encodeURIComponent(c));
}

function buildSourceTooltip({ pageUrl, apiUrl, jsonPreview, error, extraLines = [] } = {}) {
  const lines = [];
  if (pageUrl) lines.push(`URL: ${pageUrl}`);
  if (apiUrl) lines.push(`API: ${apiUrl}`);
  for (const line of extraLines) {
    if (line) lines.push(line);
  }
  if (jsonPreview) lines.push(`JSON: ${jsonPreview}`);
  if (error) lines.push(`Σφάλμα: ${error}`);
  return lines.length ? lines.join('\n') : undefined;
}

function SourceInfo({ title, children, className }) {
  if (!title) return children;
  return (
    <span className={className} title={title} style={{ cursor: 'help' }}>
      {children}
    </span>
  );
}

function MorePageLink({ url, label, mono = false }) {
  const href = String(url || '').trim();
  const text = label || href;
  if (!href) return <EllipsisCell text={text || '—'} mono={mono} />;
  return (
    <SourceInfo title={`URL: ${href}`}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={mono ? 'more-lookup-cell-code' : 'more-lookup-cell-ellipsis'}
        style={{ color: '#4945ff', textDecoration: 'underline', textUnderlineOffset: '2px' }}
      >
        {text}
      </a>
    </SourceInfo>
  );
}

function ApiVerifyCell({ verify, eventGroupCode }) {
  const apiUrl = verify?.apiUrl || moreEventsApiUrl(eventGroupCode);
  const title = buildSourceTooltip({
    apiUrl,
    jsonPreview: verify?.jsonPreview,
    error: verify?.ok ? undefined : verify?.error,
  });
  const label = verify?.ok
    ? `${verify.eventCount}/${verify.venueCount}`
    : verify?.error || (apiUrl ? '—' : '—');
  return (
    <SourceInfo title={title}>
      <Typography variant="pi">{label}</Typography>
    </SourceInfo>
  );
}

function venueScrapeSummary(row) {
  const vs = row.venueScrape;
  if (!vs) return '—';
  if (!vs.ok) return vs.error || 'αποτυχία';
  const resolved = vs.resolvedCount ?? 0;
  const total = vs.eventCount ?? 0;
  const titles = (vs.uniqueTitles || []).slice(0, 3).join(', ');
  const suffix = titles ? ` · ${titles}${(vs.uniqueTitles?.length || 0) > 3 ? '…' : ''}` : '';
  return `${resolved}/${total} eventId→CMS${suffix}`;
}

function venueScrapeTooltip(row) {
  const vs = row.venueScrape;
  if (!vs) return undefined;
  return buildSourceTooltip({
    pageUrl: vs.moreLink,
    jsonPreview: vs.jsonPreview,
    error: vs.ok ? undefined : vs.error,
    extraLines: vs.hint ? [vs.hint] : [],
  });
}

function catalogCmsStatusLabel(row) {
  if (row.cmsStatus === 'in_cms' || catalogVenueResolved(row)) {
    if (row.kind === 'venue_bundle') return 'Χώρος στο CMS';
    return 'Στο CMS';
  }
  if (row.kind === 'venue_bundle') return 'Λείπει (χώρος)';
  return 'Λείπει';
}

/** Έχει γραφτεί κωδικός στο CMS. */
function catalogVenueResolved(row) {
  if (row.kind !== 'venue_bundle') return Boolean(row.inCms);
  const refs = row.cmsRefs || [];
  if (!refs.length) return false;
  return refs.some((ref) => ref.inCms !== false);
}

function catalogVenueNeedsSetup(row) {
  return row.kind === 'venue_bundle' && !catalogVenueResolved(row);
}

/** Ταινία / παράσταση στον κατάλογο που λείπει από CMS → έγκριση δημιουργίας draft. */
function catalogContentNeedsCreate(row) {
  if (catalogVenueResolved(row) || row.inCms) return false;
  return row.kind === 'movie' || row.kind === 'show';
}

function catalogContentTypeLabel(row) {
  if (row.kind === 'show' || row.category === 'theater') return 'παράσταση';
  return 'ταινία';
}

function cmsVenueChoicesForCatalogRow(row, allChoices = []) {
  if (row.category === 'theater') {
    return allChoices.filter(
      (v) => !v.venueType || v.venueType === 'theater' || v.venueType === 'other',
    );
  }
  return allChoices.filter((v) => !v.venueType || v.venueType === 'cinema');
}

function catalogVenueSuggestionOptions(row) {
  const seen = new Set();
  const options = [];
  const add = (opt) => {
    const id = Number(opt.id ?? opt.cmsId);
    if (!Number.isFinite(id) || seen.has(id)) return;
    seen.add(id);
    options.push({
      id,
      title: opt.title || opt.cmsTitle || `#${id}`,
      score: opt.score,
    });
  };
  for (const suggestion of row.venueSuggestions || []) add(suggestion);
  if (row.suggestedVenue) add(row.suggestedVenue);
  return options;
}

function catalogVenueOptionList(row, cmsVenueChoices = []) {
  const seen = new Set();
  const options = [];
  const add = (opt) => {
    const id = Number(opt.id ?? opt.cmsId);
    if (!Number.isFinite(id) || seen.has(id)) return;
    seen.add(id);
    options.push({
      id,
      title: opt.title || opt.cmsTitle || `#${id}`,
      score: opt.score,
    });
  };
  for (const suggestion of catalogVenueSuggestionOptions(row)) add(suggestion);
  for (const venue of cmsVenueChoicesForCatalogRow(row, cmsVenueChoices)) add(venue);
  return options;
}

function CatalogVenuePicker({ row, cmsVenueChoices, value, onChange, disabled, compact = false }) {
  const [showBrowse, setShowBrowse] = React.useState(false);
  const [filter, setFilter] = React.useState('');

  if (!catalogVenueNeedsSetup(row)) return null;

  const suggestions = React.useMemo(() => catalogVenueSuggestionOptions(row), [row]);
  const browseOptions = React.useMemo(() => {
    if (!showBrowse) return [];
    const q = filter.trim().toLocaleLowerCase('el');
    return cmsVenueChoicesForCatalogRow(row, cmsVenueChoices)
      .filter((venue) => {
        if (!q) return true;
        return String(venue.title || '')
          .toLocaleLowerCase('el')
          .includes(q);
      })
      .slice(0, 60);
  }, [showBrowse, filter, row, cmsVenueChoices]);

  const selectedId = value ? Number(value) : null;
  const selectedTitle = React.useMemo(() => {
    if (!Number.isFinite(selectedId)) return '';
    const fromList = catalogVenueOptionList(row, cmsVenueChoices).find((opt) => opt.id === selectedId);
    return fromList?.title || `#${selectedId}`;
  }, [selectedId, row, cmsVenueChoices]);

  const pickVenue = (id) => {
    onChange(String(id));
    setShowBrowse(false);
    setFilter('');
  };

  const renderVenueButton = (opt, { score } = {}) => {
    const isSelected = selectedId === Number(opt.id);
    return (
      <button
        key={opt.id}
        type="button"
        className={[
          'more-lookup-venue-picker-option',
          isSelected ? 'more-lookup-venue-picker-option--selected' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        disabled={disabled}
        onClick={() => pickVenue(opt.id)}
      >
        {opt.title}
        {score != null ? ` (Sc ${Number(score).toFixed(2)})` : ''}
      </button>
    );
  };

  return (
    <Flex direction="column" alignItems="flex-start" gap={2} className="more-lookup-venue-picker">
      {!compact ? (
        <Typography variant="pi" textColor="neutral600" fontWeight="semiBold">
          Άλλος χώρος CMS
        </Typography>
      ) : null}
      {selectedId ? (
        <Flex gap={2} alignItems="center" wrap="wrap">
          <Typography variant="pi" textColor="primary600">
            Επιλέχθηκε: {selectedTitle}
          </Typography>
          <Button
            size="S"
            variant="tertiary"
            disabled={disabled}
            onClick={() => onChange('')}
          >
            Ακύρωση
          </Button>
        </Flex>
      ) : (
        <Typography variant="pi" textColor="neutral500">
          Δεν έχει επιλεγεί χώρος — πάτα μία πρόταση ή αναζήτηση
        </Typography>
      )}
      {suggestions.length > 0 ? (
        <div
          className="more-lookup-venue-picker-list more-lookup-venue-picker-list--suggestions"
          role="listbox"
          aria-label="Προτεινόμενοι χώροι CMS"
        >
          {suggestions.map((opt) => renderVenueButton(opt, { score: opt.score }))}
        </div>
      ) : null}
      <Button
        size="S"
        variant="tertiary"
        disabled={disabled}
        onClick={() => setShowBrowse((open) => !open)}
      >
        {showBrowse ? 'Κλείσιμο λίστας CMS' : 'Όλοι οι χώροι CMS…'}
      </Button>
      {showBrowse ? (
        <>
          <input
            className="more-lookup-catalog-venue-input"
            type="search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            disabled={disabled}
            placeholder="Αναζήτηση χώρου…"
            autoComplete="off"
          />
          <div
            className="more-lookup-venue-picker-list"
            role="listbox"
            aria-label="Όλοι οι χώροι CMS"
          >
            {browseOptions.length > 0 ? (
              browseOptions.map((venue) => renderVenueButton({ id: venue.id, title: venue.title }))
            ) : (
              <Typography variant="pi" textColor="neutral500" padding={2}>
                Δεν βρέθηκε χώρος
              </Typography>
            )}
          </div>
        </>
      ) : null}
    </Flex>
  );
}

function catalogKindForRow(row) {
  if (row.category === 'theater') return 'theater_venue';
  return 'venue_bundle';
}

function defaultCreateVenueName(row) {
  return (
    row.suggestedCreateVenue?.name ||
    row.moreTitle ||
    row.verify?.sampleVenues?.[0]?.name ||
    ''
  );
}

function CatalogVenueCreateFields({ row, nameValue, onNameChange, disabled }) {
  if (!catalogVenueNeedsSetup(row)) return null;
  const venueType = row.category === 'theater' ? 'theater' : 'cinema';
  const sampleVenueId = row.verify?.sampleVenues?.[0]?.id;
  const nameHint = defaultCreateVenueName(row);
  return (
    <Flex direction="column" alignItems="flex-start" gap={1} style={{ width: '100%', maxWidth: '18rem' }}>
      <Typography variant="pi" textColor="neutral600" fontWeight="semiBold">
        Νέος χώρος ({venueType === 'theater' ? 'θέατρο' : 'σινεμά'})
      </Typography>
      <Typography variant="pi" textColor="neutral500">
        Δημιουργεί draft χώρο με event_group_code.
      </Typography>
      <input
        className="more-lookup-catalog-venue-input"
        type="text"
        value={nameValue || ''}
        onChange={(event) => onNameChange(event.target.value)}
        disabled={disabled}
        placeholder={nameHint || 'Όνομα νέου χώρου'}
        title="Όνομα για draft εγγραφή — δημιουργείται αμέσως με το κουμπί Δημιουργία"
      />
      {nameHint && !nameValue?.trim() ? (
        <Typography variant="pi" textColor="neutral500">
          Πρόταση ονόματος: {nameHint}
        </Typography>
      ) : null}
      {sampleVenueId ? (
        <Typography variant="pi" textColor="neutral500">
          More venueId: {sampleVenueId}
        </Typography>
      ) : null}
    </Flex>
  );
}

function CatalogVenueBundlePanel({
  row,
  cmsVenueChoices,
  pick,
  onPickChange,
  createName,
  onCreateNameChange,
  busyKey,
  onLinkVenue,
  onLinkSuggested,
  onCreateVenue,
}) {
  if (!catalogVenueNeedsSetup(row)) {
    return (
      <Typography variant="pi" textColor="neutral500">
        —
      </Typography>
    );
  }

  const codeKey = row.eventGroupCode || '';
  const linkBusy = busyKey === `link:${codeKey}`;
  const createBusy = busyKey === `create:${codeKey}`;
  const suggestedBusy = busyKey === `suggested:${codeKey}`;
  const anyBusy = Boolean(busyKey);
  const suggested = row.suggestedVenue;
  const hasPick = Boolean(pick);

  return (
    <Flex direction="column" alignItems="stretch" gap={3} className="more-lookup-venue-bundle-panel">
      {suggested ? (
        <Flex direction="column" alignItems="flex-start" gap={1}>
          <Typography variant="pi" textColor="neutral600" fontWeight="semiBold">
            Πρόταση ταύτισης
          </Typography>
          <Button
            size="S"
            variant="success"
            loading={suggestedBusy}
            disabled={anyBusy && !suggestedBusy}
            onClick={() => onLinkSuggested(row, suggested)}
            title="Σύνδεση More κωδικού με τον προτεινόμενο χώρο CMS"
          >
            Σύνδεση με «{suggested.cmsTitle || suggested.title}»
          </Button>
          <Typography variant="pi" textColor="neutral500">
            Score {Number(suggested.score || 0).toFixed(2)} · 1 κλικ
          </Typography>
        </Flex>
      ) : null}

      <Flex direction="column" alignItems="stretch" gap={2}>
        <Typography variant="pi" textColor="neutral600" fontWeight="semiBold">
          {suggested ? 'Ή άλλος χώρος' : 'Υπάρχων χώρος CMS'}
        </Typography>
        <CatalogVenuePicker
          row={row}
          cmsVenueChoices={cmsVenueChoices}
          value={pick}
          onChange={onPickChange}
          disabled={anyBusy}
          compact
        />
        <Button
          size="S"
          variant="secondary"
          loading={linkBusy}
          disabled={!hasPick || (anyBusy && !linkBusy)}
          onClick={() => onLinkVenue(row)}
        >
          Σύνδεση
        </Button>
      </Flex>

      <Flex direction="column" alignItems="stretch" gap={2}>
        <CatalogVenueCreateFields
          row={row}
          nameValue={createName}
          onNameChange={onCreateNameChange}
          disabled={anyBusy}
        />
        <Button
          size="S"
          variant="default"
          loading={createBusy}
          disabled={anyBusy && !createBusy}
          onClick={() => onCreateVenue(row)}
        >
          Δημιουργία χώρου
        </Button>
      </Flex>
    </Flex>
  );
}

function rowKey(row) {
  return `${row.contentType || 'movie'}:${row.cmsId ?? row.movieId ?? row.theaterShowId ?? row.venueId}`;
}

function catalogKindForMatchRow(row) {
  if (row.contentType === 'venue') return 'venue_bundle';
  if (row.contentType === 'theater_show') return 'show';
  return 'movie';
}

function mapMatchToApiRow(row) {
  return {
    contentType: row.contentType,
    cmsId: row.cmsId ?? row.movieId ?? row.theaterShowId ?? row.venueId,
    movieId: row.movieId,
    theaterShowId: row.theaterShowId,
    venueId: row.venueId,
    eventGroupCode: row.displayCode,
  };
}

function lookupErrorMessage(error) {
  const raw =
    error?.response?.data?.error?.message ||
    error?.response?.data?.error ||
    error?.message ||
    error?.response?.data?.message ||
    '';
  const text = String(raw || 'Αποτυχία λειτουργίας More lookup.');
  if (/aborted/i.test(text)) {
    return 'Timeout σύνδεσης με more.com — το server δεν πρόλαβε απάντηση. Δοκίμασε ξανά ή όρισε MORE_HTTP_PROXY / MORE_LOOKUP_FETCH_TIMEOUT_MS.';
  }
  return text;
}

function formatCodeList(codes) {
  const list = Array.isArray(codes) ? codes.filter(Boolean) : [];
  if (!list.length) return '—';
  if (list.length === 1) return list[0];
  return list.join(' · ');
}

function SelectCheckbox({ checked, onChange, disabled = false, indeterminate = false, ariaLabel }) {
  const isOn = Boolean(checked) || Boolean(indeterminate);

  const handleToggle = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (disabled) return;
    // indeterminate → επιλογή όλων (όχι toggle off)
    if (indeterminate) {
      onChange(true);
      return;
    }
    onChange(!checked);
  };

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : Boolean(checked)}
      aria-label={ariaLabel}
      disabled={disabled}
      className={[
        'more-lookup-select-checkbox',
        isOn ? 'more-lookup-select-checkbox--on' : '',
        indeterminate ? 'more-lookup-select-checkbox--indeterminate' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={handleToggle}
    >
      <span className="more-lookup-select-checkbox-mark" aria-hidden>
        {indeterminate ? '−' : checked ? '✓' : ''}
      </span>
    </button>
  );
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

function MatchRowActions({ loading, onLink, onReject }) {
  return (
    <div className="more-lookup-row-actions">
      <Button size="S" variant="tertiary" loading={loading} disabled={loading} onClick={onReject} title="Απόρριψη">
        Απόρ.
      </Button>
      <Button
        size="S"
        variant="success"
        loading={loading}
        disabled={loading}
        onClick={onLink}
        title="Σύνδεση → more_event_groups"
      >
        Σύνδ.
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
          displayMoreUrl: match.moreUrl ?? row.moreUrl ?? null,
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

function SyncReportPanel({ report }) {
  const [showAllMissingIds, setShowAllMissingIds] = React.useState(false);
  const [showErrors, setShowErrors] = React.useState(false);

  const created = Number(report.created ?? 0);
  const createdFromBuckets = Number(report.createdFromBuckets ?? created);
  const createdInDb = report.createdInDb != null ? Number(report.createdInDb) : null;
  const createdMismatch = createdInDb != null && createdInDb !== createdFromBuckets;
  const alreadyExists = Number(report.alreadyExists ?? 0);
  const skippedNoVenue = Number(report.skippedNoVenue ?? 0);
  const skippedUnknown = Number(report.skippedUnknownEventId ?? 0);
  const resolvedViaScrape = Number(report.resolvedViaVenueScrape ?? 0);
  const skippedPast = Number(report.skippedPast ?? 0);
  const errorCount = Array.isArray(report.errors) ? report.errors.length : 0;
  const errorGroups = React.useMemo(() => groupSyncErrors(report.errors), [report.errors]);

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

function formatSyncProgressAge(iso) {
  if (!iso) return null;
  const sec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 5) return 'μόλις τώρα';
  if (sec < 60) return `πριν ${sec}s`;
  const min = Math.floor(sec / 60);
  return min === 1 ? 'πριν 1 λεπ.' : `πριν ${min} λεπ.`;
}

const App = () => {
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogOnlyMissing, setCatalogOnlyMissing] = useState(true);
  const [catalogKindFilter, setCatalogKindFilter] = useState('all');
  const [matchContentFilter, setMatchContentFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState(null);
  const [enabled, setEnabled] = useState(true);
  const [applyMinScore, setApplyMinScore] = useState(0.45);
  const [showtimeSyncEnabled, setShowtimeSyncEnabled] = useState(true);
  const [result, setResult] = useState(null);
  const [syncReport, setSyncReport] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncProgress, setSyncProgress] = useState(null);
  const [syncProgressAt, setSyncProgressAt] = useState(null);
  const [, setProgressTick] = useState(0);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupProgress, setLookupProgress] = useState(null);
  const [lookupJobKind, setLookupJobKind] = useState(null);
  const [selectedMatchKeys, setSelectedMatchKeys] = useState(() => new Set());
  const [catalogVenuePick, setCatalogVenuePick] = useState({});
  const [catalogCreateName, setCatalogCreateName] = useState({});
  const { get, post } = useFetchClient();
  const toggleNotification = useNotification();

  useEffect(() => {
    if (!syncLoading) return undefined;
    const id = setInterval(() => setProgressTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [syncLoading]);

  const mergeApplyIntoResult = useCallback((applyResult) => {
    if (!applyResult) return;
    setResult((prev) => ({
      ...(prev || {}),
      apply: applyResult.apply ?? prev?.apply,
    }));
  }, []);

  const applySyncStatus = useCallback((data) => {
    if (data?.progress) setSyncProgress(data.progress);
    if (data?.lastProgressAt) setSyncProgressAt(data.lastProgressAt);
  }, []);

  const pollSyncJob = useCallback(async () => {
    // ~45 λεπτά (2700 × 1s) — μεγάλα sync με πολλούς κωδικούς More.
    let gatewayPauses = 0;
    for (let attempt = 0; attempt < 2700; attempt += 1) {
      let data;
      try {
        const res = await get('/api/more-lookup/sync-showtimes/status');
        data = res?.data;
        gatewayPauses = 0;
      } catch (netErr) {
        if (isTransientGatewayError(netErr)) {
          gatewayPauses += 1;
          setSyncProgress(
            `502/503 από nginx — το Strapi φορτώνει ξανά (${gatewayPauses})… Μην κλείσεις τη σελίδα.`,
          );
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }
        if (attempt < 5) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }
        throw new Error(
          netErr?.message || 'Αποτυχία επικοινωνίας με το Strapi κατά το sync (δίκτυο/server).',
        );
      }
      applySyncStatus(data);
      if (data?.status === 'completed') {
        if (data?.report) return data.report;
        if (data?.hasPhaseReports) {
          throw new Error(
            'Το sync ολοκληρώθηκε αλλά η αναφορά δεν φορτώθηκε — κάνε refresh ή δες data/more-showtime-sync-worker.log.',
          );
        }
        throw new Error(
          'Το sync ολοκληρώθηκε χωρίς αναφορά (πιθανό crash worker). Δες data/more-showtime-sync-worker.log.',
        );
      }
      if (data?.status === 'failed') {
        if (data?.report) setSyncReport(data.report);
        throw new Error(data?.error || data?.progress || 'Αποτυχία συγχρονισμού');
      }
      if (!data?.status) {
        throw new Error(
          'Το sync διακόπηκε — δεν υπάρχει ενεργή εργασία (πιθανή επανεκκίνηση Strapi). Τρέξε ξανά.',
        );
      }
      if (data?.status !== 'running' && data?.status !== 'started') {
        throw new Error(
          data?.error ||
            data?.progress ||
            `Το sync σταμάτησε (${data?.status || 'άγνωστη κατάσταση'}). Δες data/more-showtime-sync-worker.log.`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error('Το sync ξεπέρασε το χρονικό όριο αναμονής (~45 λεπτά).');
  }, [applySyncStatus, get, setSyncReport]);

  const pollLookupJob = useCallback(async () => {
    for (let attempt = 0; attempt < 480; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      const res = await get('/api/more-lookup/run/status');
      const data = res?.data;
      if (data?.kind) setLookupJobKind(data.kind);
      if (data?.progress) setLookupProgress(data.progress);
      if (data?.status === 'completed' && data?.result) return data.result;
      if (data?.status === 'failed') {
        throw new Error(
          data?.error || (data?.kind === 'apply' ? 'Αποτυχία εγγραφής CMS' : 'Αποτυχία ταύτισης'),
        );
      }
      if (data?.status !== 'running' && data?.status !== 'started') break;
    }
    throw new Error('Η διαδικασία ξεπέρασε το χρονικό όριο αναμονής (~20 λεπτά).');
  }, [get]);

  const resumeLookupIfRunning = useCallback(async () => {
    try {
      const res = await get('/api/more-lookup/run/status');
      const data = res?.data;
      if (data?.status !== 'running' && data?.status !== 'started') return;
      const isApply = data.kind === 'apply';
      setLookupJobKind(isApply ? 'apply' : 'run');
      setLookupLoading(true);
      setLookupProgress(
        data.progress || (isApply ? 'Εγγραφή CMS σε εξέλιξη…' : 'Ταύτιση σε εξέλιξη…'),
      );
      const jobResult = await pollLookupJob();
      if (isApply) {
        mergeApplyIntoResult(jobResult);
      } else {
        setResult(jobResult);
      }
      toggleNotification({
        type: 'success',
        message:
          jobResult?.message || (isApply ? 'Η εγγραφή CMS ολοκληρώθηκε.' : 'Η ταύτιση ολοκληρώθηκε.'),
      });
    } catch (error) {
      toggleNotification({ type: 'warning', message: lookupErrorMessage(error) });
    } finally {
      setLookupLoading(false);
      setLookupProgress(null);
      setLookupJobKind(null);
    }
  }, [get, mergeApplyIntoResult, pollLookupJob, toggleNotification]);

  const resumeSyncIfRunning = useCallback(async () => {
    try {
      const res = await get('/api/more-lookup/sync-showtimes/status');
      const data = res?.data;
      if (data?.status !== 'running' && data?.status !== 'started') {
        if (data?.status === 'completed' && data?.report) setSyncReport(data.report);
        if (data?.status === 'failed') {
          if (data?.report) setSyncReport(data.report);
          toggleNotification({
            type: 'warning',
            message: data?.error || data?.progress || 'Το sync απέτυχε.',
          });
        }
        return;
      }
      setSyncLoading(true);
      applySyncStatus(data);
      if (!data?.lastProgressAt) {
        setSyncProgress(data.progress || 'Συγχρονισμός σε εξέλιξη…');
      }
      const report = await pollSyncJob();
      setSyncReport(report);
      toggleNotification({
        type: report?.created > 0 ? 'success' : 'info',
        message: report?.message || 'Συγχρονισμός ολοκληρώθηκε.',
      });
    } catch (error) {
      const message = error?.message || 'Αποτυχία συγχρονισμού.';
      toggleNotification({ type: 'warning', message });
    } finally {
      setSyncLoading(false);
      setSyncProgress(null);
      setSyncProgressAt(null);
    }
  }, [applySyncStatus, get, pollSyncJob, toggleNotification]);

  const loadStatus = useCallback(async () => {
    try {
      const res = await get('/api/more-lookup/status');
      setEnabled(res?.data?.enabled !== false);
      setShowtimeSyncEnabled(res?.data?.showtimeSyncEnabled !== false);
      if (typeof res?.data?.applyMinScore === 'number') {
        setApplyMinScore(res.data.applyMinScore);
      }
      await resumeLookupIfRunning();
      await resumeSyncIfRunning();
    } catch {
      setEnabled(true);
    }
  }, [get, resumeLookupIfRunning, resumeSyncIfRunning]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    setCatalogPage(1);
  }, [result, catalogOnlyMissing, catalogKindFilter, matchContentFilter]);

  useEffect(() => {
    if (!result?.catalog?.length) return;
    setCatalogVenuePick((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const row of result.catalog) {
        if (!catalogVenueNeedsSetup(row)) continue;
        if (next[row.eventGroupCode]) continue;
        const suggestedId = row.suggestedVenue?.cmsId ?? row.suggestedVenue?.id;
        if (suggestedId != null) {
          next[row.eventGroupCode] = String(suggestedId);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [result?.catalog]);

  const finishLookupJob = async (postBody) => {
    const res = await post('/api/more-lookup/run', postBody);
    const data = res?.data;
    if (data?.status === 'completed' && data?.result) return data.result;
    if (data?.status === 'running' || data?.status === 'started') {
      setLookupProgress(data.progress || 'Ταύτιση σε εξέλιξη…');
      return pollLookupJob();
    }
    return data;
  };

  const runLookup = async () => {
    setLookupLoading(true);
    setLookupJobKind('run');
    setLookupProgress('Έναρξη ταύτισης…');
    setResult(null);
    try {
      const lookupResult = await finishLookupJob({
        matchCms: true,
      });
      setResult(lookupResult);
      toggleNotification({
        type: 'success',
        message: lookupResult?.message || 'Η αναζήτηση ολοκληρώθηκε.',
      });
    } catch (error) {
      toggleNotification({ type: 'warning', message: lookupErrorMessage(error) });
    } finally {
      setLookupLoading(false);
      setLookupProgress(null);
      setLookupJobKind(null);
    }
  };

  const matchDisplayRows = useMemo(
    () =>
      expandMatchRows(
        (result?.matches ?? [])
          .filter((r) => r.matched)
          .filter((r) => matchesCmsContentFilter(r, matchContentFilter)),
      ),
    [result?.matches, matchContentFilter],
  );
  const matchVisibleKeys = useMemo(
    () => matchDisplayRows.map((row) => row.displayKey),
    [matchDisplayRows],
  );
  const matchSelectedVisibleCount = matchVisibleKeys.filter((key) =>
    selectedMatchKeys.has(key),
  ).length;
  const allMatchVisibleSelected =
    matchVisibleKeys.length > 0 && matchSelectedVisibleCount === matchVisibleKeys.length;
  const someMatchVisibleSelected =
    matchSelectedVisibleCount > 0 && !allMatchVisibleSelected;

  useEffect(() => {
    setSelectedMatchKeys((prev) => {
      const visible = new Set(matchVisibleKeys);
      let changed = false;
      const next = new Set();
      for (const key of prev) {
        if (visible.has(key)) next.add(key);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [matchVisibleKeys]);

  const catalog = result?.catalog ?? [];
  const catalogScope = catalog.filter(
    (row) => !catalogOnlyMissing || !row.inCms,
  );
  const catalogFilterOptions = CATALOG_KIND_FILTERS.map((opt) => ({
    ...opt,
    count: catalogScope.filter((row) => catalogMatchesKindFilter(row, opt.id)).length,
  }));
  const matchFilterOptions = CMS_MATCH_FILTERS.map((opt) => ({
    ...opt,
    count:
      opt.id === 'all'
        ? (result?.matches ?? []).filter((r) => r.matched).length
        : (result?.matches ?? []).filter((r) => r.matched && matchesCmsContentFilter(r, opt.id)).length,
  }));
  const catalogFiltered = catalogScope
    .filter((row) => catalogMatchesKindFilter(row, catalogKindFilter))
    .sort((a, b) => {
      const ao = Number(a.moreCatalogOrder);
      const bo = Number(b.moreCatalogOrder);
      if (Number.isFinite(ao) && Number.isFinite(bo)) return ao - bo;
      if (Number.isFinite(ao)) return -1;
      if (Number.isFinite(bo)) return 1;
      return String(a.moreTitle || '').localeCompare(String(b.moreTitle || ''), 'el');
    });
  const catalogMissingFiltered = catalogFiltered.filter((row) => !row.inCms).length;
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
    matchDisplayRows.length > 0 ||
    (catalog.length > 0 && (!catalogOnlyMissing || catalogFiltered.length > 0));

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

  const linkMatchCode = async (row) => {
    const key = `match-link:${row.displayKey}`;
    setBusyKey(key);
    try {
      const res = await post('/api/more-lookup/link', {
        contentType: row.contentType,
        cmsId: row.cmsId ?? row.movieId ?? row.theaterShowId ?? row.venueId,
        movieId: row.movieId,
        theaterShowId: row.theaterShowId,
        venueId: row.venueId,
        eventGroupCode: row.displayCode,
        catalogKind: catalogKindForMatchRow(row),
        moreTitle: row.displayMoreTitle,
      });
      if (res?.data?.ok) {
        pruneMatchDisplayRow(row.displayKey);
      }
      toggleNotification({
        type: res?.data?.alreadyLinked ? 'info' : 'success',
        message: res?.data?.message || `Συνδέθηκε ${row.displayCode}`,
      });
    } catch (error) {
      const message =
        error?.response?.data?.error?.message ||
        error?.response?.data?.errors?.[0]?.error ||
        'Αποτυχία σύνδεσης.';
      toggleNotification({ type: 'warning', message });
    } finally {
      setBusyKey(null);
    }
  };

  const rejectMatchCode = async (row) => {
    setLoading(true);
    try {
      const res = await post('/api/more-lookup/reject', {
        contentType: row.contentType,
        cmsId: row.cmsId ?? row.movieId ?? row.theaterShowId ?? row.venueId,
        movieId: row.movieId,
        theaterShowId: row.theaterShowId,
        venueId: row.venueId,
        eventGroupCode: row.displayCode,
      });
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

  const toggleMatchSelection = (key, checked) => {
    setSelectedMatchKeys((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const toggleAllMatchSelection = (checked) => {
    setSelectedMatchKeys(checked ? new Set(matchVisibleKeys) : new Set());
  };

  const rejectMatchRows = async (rows, { clearSelection = false, bulkLabel = 'μαζική' } = {}) => {
    if (!rows.length) return;
    setLoading(true);
    try {
      const res = await post('/api/more-lookup/reject', {
        rejections: rows.map(mapMatchToApiRow),
      });
      rows.forEach((row) => {
        pruneMatchDisplayRow(row.displayKey);
      });
      if (clearSelection) {
        const cleared = new Set(rows.map((row) => row.displayKey));
        setSelectedMatchKeys((prev) => {
          const next = new Set(prev);
          for (const key of cleared) next.delete(key);
          return next;
        });
      }
      toggleNotification({
        type: res?.data?.ok ? 'info' : 'warning',
        message: res?.data?.message || `Ολοκληρώθηκε η ${bulkLabel} απόρριψη (${rows.length}).`,
      });
    } catch (error) {
      toggleNotification({ type: 'warning', message: 'Αποτυχία μαζικής απόρριψης.' });
    } finally {
      setLoading(false);
    }
  };

  const rejectSelectedMatches = () => {
    const rows = matchDisplayRows.filter((row) => selectedMatchKeys.has(row.displayKey));
    return rejectMatchRows(rows, { clearSelection: true, bulkLabel: 'επιλεγμένων' });
  };

  const markCatalogVenueLinked = (row, { cmsId, cmsTitle }) => {
    setResult((prev) => {
      if (!prev?.catalog?.length) return prev;
      return {
        ...prev,
        catalog: prev.catalog.map((catRow) =>
          catRow.eventGroupCode === row.eventGroupCode
            ? {
                ...catRow,
                inCms: true,
                cmsStatus: 'in_cms',
                cmsRefs: [
                  {
                    contentType: 'venue',
                    cmsId: Number(cmsId),
                    cmsTitle,
                    inCms: true,
                    writtenInField: true,
                  },
                ],
                canLinkVenue: false,
                canCreateVenue: false,
              }
            : catRow,
        ),
      };
    });
  };

  const markCatalogContentCreated = (row, { cmsId, cmsTitle, contentType }) => {
    setResult((prev) => {
      if (!prev?.catalog?.length) return prev;
      return {
        ...prev,
        catalog: prev.catalog.map((catRow) =>
          catRow.eventGroupCode === row.eventGroupCode
            ? {
                ...catRow,
                inCms: true,
                cmsStatus: 'in_cms',
                cmsRefs: [
                  {
                    contentType: contentType || (row.kind === 'show' ? 'theater_show' : 'movie'),
                    cmsId: Number(cmsId),
                    cmsTitle,
                    inCms: true,
                    writtenInField: true,
                  },
                ],
              }
            : catRow,
        ),
      };
    });
  };

  const createCatalogContent = async (row) => {
    if (!row.eventGroupCode || !catalogContentNeedsCreate(row)) return;
    const code = row.eventGroupCode;
    setBusyKey(`content:${code}`);
    try {
      const res = await post('/api/more-lookup/create-content', {
        eventGroupCode: code,
        kind: row.kind,
        category: row.category,
        title: row.moreTitle,
        moreTitle: row.moreTitle,
        moreUrl: row.moreUrl,
      });
      const entry = res?.data?.entry;
      const contentType = res?.data?.contentType;
      if (entry?.id) {
        markCatalogContentCreated(row, {
          cmsId: entry.id,
          cmsTitle: entry.title,
          contentType,
        });
      }
      const enrichedBits = [];
      const en = res?.data?.enriched;
      if (en?.synopsis) enrichedBits.push('σύνοψη');
      if (en?.duration) enrichedBits.push(`${en.duration}'`);
      if (en?.runStart) enrichedBits.push(`από ${en.runStart}`);
      if (en?.eventCount) enrichedBits.push(`${en.eventCount} events`);
      if (en?.posterUploaded) enrichedBits.push('αφίσα');
      else if (en?.posterUrl) enrichedBits.push('αφίσα (δεν ανέβηκε)');
      toggleNotification({
        type: 'success',
        message:
          res?.data?.message ||
          (entry
            ? `Draft «${entry.title}» (#${entry.id}) — unpublished`
            : 'Δημιουργήθηκε draft.'),
      });
      if (enrichedBits.length) {
        toggleNotification({
          type: 'info',
          message: `Συμπληρώθηκαν: ${enrichedBits.join(' · ')}`,
        });
      }
    } catch (error) {
      const message =
        error?.response?.data?.error?.message ||
        error?.response?.data?.errors?.[0]?.error ||
        'Αποτυχία δημιουργίας draft.';
      toggleNotification({ type: 'warning', message });
    } finally {
      setBusyKey(null);
    }
  };

  const linkCatalogVenueWithId = async (row, cmsId, busySuffix = 'link') => {
    const code = row.eventGroupCode;
    if (!cmsId || !code) {
      toggleNotification({ type: 'warning', message: 'Επίλεξε πρώτα χώρο CMS.' });
      return;
    }
    const busy = `${busySuffix}:${code}`;
    setBusyKey(busy);
    try {
      const res = await post('/api/more-lookup/link', {
        contentType: 'venue',
        cmsId: Number(cmsId),
        venueId: Number(cmsId),
        eventGroupCode: code,
        catalogKind: catalogKindForRow(row),
        moreTitle: row.moreTitle,
      });
      const pickedTitle =
        catalogVenueOptionList(row, result?.cmsVenueChoices || []).find(
          (opt) => opt.id === Number(cmsId),
        )?.title ||
        row.suggestedVenue?.cmsTitle ||
        `#${cmsId}`;
      markCatalogVenueLinked(row, { cmsId, cmsTitle: pickedTitle });
      toggleNotification({
        type: 'success',
        message:
          res?.data?.message ||
          `Γράφτηκε ${code} → ${pickedTitle}.`,
      });
    } catch (error) {
      const message =
        error?.response?.data?.error?.message ||
        error?.response?.data?.errors?.[0]?.error ||
        'Αποτυχία σύνδεσης.';
      toggleNotification({ type: 'warning', message });
    } finally {
      setBusyKey(null);
    }
  };

  const linkCatalogVenue = (row) => {
    const cmsId = catalogVenuePick[row.eventGroupCode] || null;
    return linkCatalogVenueWithId(row, cmsId, 'link');
  };

  const linkCatalogVenueSuggested = (row, suggestion) => {
    const cmsId = suggestion?.cmsId ?? suggestion?.id;
    return linkCatalogVenueWithId(row, cmsId, 'suggested');
  };

  const createCatalogVenue = async (row) => {
    if (!row.eventGroupCode) return;
    const name = String(
      catalogCreateName[row.eventGroupCode] || '',
    ).trim();
    const fallbackName = defaultCreateVenueName(row);
    const finalName = name || fallbackName.trim();
    if (!finalName) {
      toggleNotification({ type: 'warning', message: 'Συμπλήρωσε όνομα για τον νέο χώρο.' });
      return;
    }
    const code = row.eventGroupCode;
    setBusyKey(`create:${code}`);
    try {
      const sampleVenueId = row.verify?.sampleVenues?.[0]?.id;
      const res = await post('/api/more-lookup/create-venue', {
        eventGroupCode: row.eventGroupCode,
        name: finalName,
        type: row.category === 'theater' ? 'theater' : 'cinema',
        venueId: sampleVenueId != null ? String(sampleVenueId) : undefined,
        moreTitle: row.moreTitle,
        moreUrl: row.moreUrl,
        category: row.category,
        catalogKind: catalogKindForRow(row),
        verify: row.verify,
      });
      const venue = res?.data?.venue;
      if (venue) {
        markCatalogVenueLinked(row, { cmsId: venue.id, cmsTitle: venue.name });
      }
      toggleNotification({
        type: 'success',
        message:
          res?.data?.message ||
          (venue
            ? `Δημιουργήθηκε «${venue.name}» (#${venue.id}) με event_group_code`
            : 'Δημιουργήθηκε χώρος.'),
      });
    } catch (error) {
      const message =
        error?.response?.data?.error?.message ||
        error?.response?.data?.errors?.[0]?.error ||
        'Αποτυχία δημιουργίας χώρου.';
      toggleNotification({ type: 'warning', message });
    } finally {
      setBusyKey(null);
    }
  };

  const runSyncRequest = async (scope = 'all') => {
    const scopeLabel = scope === 'cinema' ? 'σινεμά' : scope === 'theater' ? 'θέατρο' : 'σινεμά + θέατρο';
    setSyncLoading(true);
    setSyncProgress(`Έναρξη συγχρονισμού (${scopeLabel})…`);
    setSyncReport(null);
    let finishedOk = false;
    try {
      let res;
      try {
        res = await post('/api/more-lookup/sync-showtimes', { scope });
      } catch (postErr) {
        if (isTransientGatewayError(postErr)) {
          setSyncProgress('502 στην έναρξη — το worker μπορεί να ξεκίνησε, αναμονή…');
          await new Promise((resolve) => setTimeout(resolve, 12000));
          const report = await pollSyncJob();
          setSyncReport(report);
          finishedOk = true;
          toggleNotification({
            type: report?.created > 0 ? 'success' : 'info',
            message: report?.message || 'Συγχρονισμός ολοκληρώθηκε (μετά από 502).',
          });
          return;
        }
        throw postErr;
      }

      const data = res?.data;
      if (data?.status === 'completed' && data?.report) {
        setSyncReport(data.report);
        finishedOk = true;
        toggleNotification({
          type: data.report?.created > 0 ? 'success' : 'info',
          message: data.report?.message || 'Συγχρονισμός ολοκληρώθηκε.',
        });
        return;
      }
      if (data?.status === 'completed' && !data?.report) {
        throw new Error(
          'Το sync ολοκληρώθηκε χωρίς αναφορά. Δες data/more-showtime-sync-worker.log.',
        );
      }
      if (data?.status === 'running' || data?.status === 'started') {
        applySyncStatus(data);
        if (!data?.lastProgressAt) {
          setSyncProgress(data.progress || 'Συγχρονισμός σε εξέλιξη (worker)…');
        }
        const report = await pollSyncJob();
        setSyncReport(report);
        finishedOk = true;
        toggleNotification({
          type: report?.created > 0 ? 'success' : 'info',
          message: report?.message || 'Συγχρονισμός ολοκληρώθηκε.',
        });
        return;
      }
      if (data?.status === 'failed') {
        throw new Error(data?.error || data?.progress || 'Αποτυχία συγχρονισμού');
      }
      throw new Error(
        data?.error ||
          data?.progress ||
          'Δεν ξεκίνηκε συγχρονισμός — έλεγξε data/more-showtime-sync-worker.log',
      );
    } catch (error) {
      if (isTransientGatewayError(error)) {
        setSyncProgress('502 κατά την έναρξη — αναμονή Strapi…');
        await new Promise((resolve) => setTimeout(resolve, 8000));
        try {
          const report = await pollSyncJob();
          setSyncReport(report);
          finishedOk = true;
          toggleNotification({
            type: report?.created > 0 ? 'success' : 'info',
            message: report?.message || 'Συγχρονισμός ολοκληρώθηκε (μετά από 502).',
          });
          return;
        } catch (retryErr) {
          toggleNotification({
            type: 'warning',
            message:
              retryErr?.message ||
              '502 Bad Gateway — έλεγξε docker compose logs strapi και data/more-showtime-sync-worker.log',
          });
          return;
        }
      }
      const message =
        error?.response?.data?.error?.message ||
        error?.message ||
        error?.response?.data?.message ||
        'Αποτυχία συγχρονισμού.';
      setSyncProgress(message);
      toggleNotification({ type: 'warning', message });
    } finally {
      setSyncLoading(false);
      if (finishedOk) {
        setSyncProgress(null);
        setSyncProgressAt(null);
      }
    }
  };

  const syncShowtimes = () => runSyncRequest('all');
  const syncShowtimesCinema = () => runSyncRequest('cinema');
  const syncShowtimesTheater = () => runSyncRequest('theater');

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
                    title="Εγγραφή & σύνδεση"
                    detail="Έγκριση ταινίας/θεάτρου (draft) ή σύνδεση/δημιουργία χώρου"
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
                subtitle="Σύνδεση κωδικών απευθείας στο more_event_groups"
              />
              <Flex gap={3} paddingTop={2} wrap="wrap" alignItems="center">
                <Button
                  loading={lookupLoading}
                  onClick={runLookup}
                  disabled={lookupLoading || syncLoading}
                  style={actionButtonStyle}
                >
                  {lookupLoading ? 'Ταύτιση…' : 'Εκτέλεση ταύτισης'}
                </Button>
              </Flex>
              {lookupLoading && lookupProgress ? (
                <Box paddingTop={3}>
                  <Typography variant="pi" textColor="primary700" fontWeight="semiBold">
                    {lookupProgress}
                  </Typography>
                  <Typography variant="pi" textColor="neutral500" paddingTop={1}>
                    Η ταύτιση τρέχει στο server — μπορεί να διαρκέσει 1–5 λεπτά (κατάλογος More + επαλήθευση API).
                  </Typography>
                </Box>
              ) : null}
              <Box paddingTop={4}>
                <Typography variant="pi" textColor="neutral500">
                  Η ταύτιση δείχνει κωδικούς που λείπουν από το CMS. Πάτα «Σύνδ.» για εγγραφή στο more_event_groups.
                </Typography>
              </Box>
            </Box>

            <Box paddingTop={4} padding={5} background="neutral0" shadow="filterShadow" hasRadius style={cardStyle}>
              <PanelHeader
                title="Βήμα 2 — Συγχρονισμός προβολών"
                subtitle="More API → Προβολή ταινίας / Παράσταση · μόνο χειροκίνητα (χωρίς cron)"
                action={
                  showtimeSyncEnabled ? (
                    <Flex gap={2} wrap="wrap">
                      <Button
                        variant="success"
                        loading={syncLoading}
                        onClick={syncShowtimes}
                        disabled={syncLoading || loading}
                        style={actionButtonStyle}
                        title="Σινεμά → Θέατρο σε δύο σειριακά worker processes (λιγότερη μνήμη)"
                      >
                        {syncLoading ? 'Sync…' : 'Τρέξε sync (Όλα)'}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={syncShowtimesCinema}
                        disabled={syncLoading || loading}
                        title="Μόνο προβολές σινεμά (ταινίες) — χαμηλότερο peak μνήμης"
                      >
                        Σινεμά
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={syncShowtimesTheater}
                        disabled={syncLoading || loading}
                        title="Μόνο παραστάσεις θεάτρου — χαμηλότερο peak μνήμης"
                      >
                        Θέατρο
                      </Button>
                    </Flex>
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
                  <Typography variant="pi" textColor="neutral500" paddingTop={2}>
                    «Όλα» = σινεμά και θέατρο σε δύο σειριακά worker processes (καθαρό heap ανά φάση →
                    λιγότερη μνήμη). «Σινεμά» / «Θέατρο» τρέχουν μόνο το ένα σκέλος — χρήσιμα αν θέλεις
                    χαμηλό peak μνήμης ή γρήγορη ενημέρωση μόνο της μίας κατηγορίας.
                  </Typography>
                  {syncLoading && syncProgress ? (
                    <Box paddingTop={3}>
                      <Typography variant="pi" textColor="primary700" fontWeight="semiBold">
                        {syncProgress}
                      </Typography>
                      <Typography variant="pi" textColor="neutral500" paddingTop={1}>
                        Τρέχει σε worker στο background (10–20+ λεπτά). Η πρόοδος ενημερώνεται κάθε
                        ~1 δευτερόλεπτο
                        {syncProgressAt ? ` · ${formatSyncProgressAge(syncProgressAt)}` : ''}.
                      </Typography>
                    </Box>
                  ) : null}
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
                value={`${result.stats.matched}/${(result.stats.cmsMovies ?? 0) + (result.stats.cmsTheaterShows ?? 0) + (result.stats.cmsCinemaVenues ?? 0)}`}
                tone="success"
              />
            ) : null}
            {result.stats.venueMatched != null && result.stats.venueMatched > 0 ? (
              <StatBadge label="Χώροι σινεμά" value={result.stats.venueMatched} tone="success" />
            ) : null}
            {result.stats.catalogMissing != null ? (
              <StatBadge label="Λείπουν από CMS" value={catalogMissing} tone={catalogMissing > 0 ? 'warning' : 'success'} />
            ) : null}
            {result.stats.catalogInCms != null ? (
              <StatBadge label="Στο CMS" value={catalogInCms} />
            ) : null}
            {result.stats.catalogVenueScrapeResolved > 0 ? (
              <StatBadge
                label="Scrape venue"
                value={result.stats.catalogVenueScrapeResolved}
                tone="success"
                hint="eventId→CMS από more_link"
              />
            ) : null}
            {result.stats.lowScoreMatches != null && result.stats.lowScoreMatches > 0 ? (
              <StatBadge label="Χαμηλό score" value={result.stats.lowScoreMatches} tone="warning" />
            ) : null}
            <StatBadge label="Διάρκεια" value={`${result.durationMs}ms`} />
          </Flex>
        ) : null}

        {result?.sources ? (
          <Box paddingBottom={4} padding={3} background="neutral100" hasRadius style={cardStyle}>
            <Typography variant="pi" textColor="neutral600" fontWeight="semiBold">
              Πηγές δεδομένων
            </Typography>
            <Box paddingTop={2}>
              <Typography variant="pi" textColor="neutral600">
                Κατάλογος σινεμά:{' '}
                <a href={result.sources.catalogCinemaUrl} target="_blank" rel="noopener noreferrer">
                  {result.sources.catalogCinemaUrl}
                </a>
              </Typography>
              <Box paddingTop={1}>
                <Typography variant="pi" textColor="neutral600">
                  Κατάλογος θεάτρου:{' '}
                  <a href={result.sources.catalogTheaterUrl} target="_blank" rel="noopener noreferrer">
                    {result.sources.catalogTheaterUrl}
                  </a>
                </Typography>
              </Box>
              <Box paddingTop={1}>
                <Typography variant="pi" textColor="neutral500">
                  API προβολών: {result.sources.eventsApiTemplate || MORE_EVENTS_API_TEMPLATE}
                </Typography>
              </Box>
              <Box paddingTop={1}>
                <Typography variant="pi" textColor="neutral500">
                  Hover σε evg_ / API / Scrape για JSON δείγμα από την απάντηση.
                </Typography>
              </Box>
            </Box>
          </Box>
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

        {matchDisplayRows.length > 0 || (result?.matches ?? []).some((r) => r.matched) ? (
          <Box paddingBottom={6} background="neutral0" shadow="filterShadow" hasRadius style={cardStyle}>
            <Box padding={4}>
              <PanelHeader
                title="Πίνακας 1 — Προτάσεις ταύτισης"
                subtitle={`«Σύνδ.» → more_event_groups · ${matchDisplayRows.length} εμφανίζονται`}
                action={
                  <Button
                    size="S"
                    variant="tertiary"
                    loading={loading}
                    onClick={rejectSelectedMatches}
                    disabled={loading || matchSelectedVisibleCount === 0}
                  >
                    Απόρριψη επιλεγμένων ({matchSelectedVisibleCount})
                  </Button>
                }
              />
              <Box paddingTop={3}>
                <TypeFilterBar
                  label="Τύπος CMS"
                  value={matchContentFilter}
                  options={matchFilterOptions}
                  onChange={setMatchContentFilter}
                />
              </Box>
            </Box>
            {matchDisplayRows.length === 0 ? (
              <Box padding={4} paddingTop={0}>
                <Typography variant="pi" textColor="neutral600">
                  Δεν υπάρχουν προτάσεις με το τρέχον φίλτρο τύπου.
                </Typography>
              </Box>
            ) : (
            <Box className="more-lookup-match-table more-lookup-match-table--matches">
            <Table colCount={8} rowCount={matchDisplayRows.length}>
              <Thead>
                <Tr>
                  <Th className="more-lookup-col-select">
                    <SelectCheckbox
                      ariaLabel="Επιλογή όλων των ορατών προτάσεων"
                      checked={allMatchVisibleSelected}
                      indeterminate={someMatchVisibleSelected}
                      onChange={toggleAllMatchSelection}
                      disabled={loading || matchVisibleKeys.length === 0}
                    />
                  </Th>
                  <Th className="more-lookup-col-actions">
                    <Typography variant="sigma">Απόρ./Σύνδ.</Typography>
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
                {matchDisplayRows.map((row, rowIndex) => (
                  <Tr key={`${row.displayKey}::${rowIndex}`}>
                    <Td className="more-lookup-col-select">
                      <SelectCheckbox
                        ariaLabel={`Επιλογή ${row.cmsTitle}`}
                        checked={selectedMatchKeys.has(row.displayKey)}
                        onChange={(next) => toggleMatchSelection(row.displayKey, next)}
                        disabled={loading}
                      />
                    </Td>
                    <Td className="more-lookup-col-actions">
                      <MatchRowActions
                        loading={busyKey === `match-link:${row.displayKey}`}
                        onReject={() => rejectMatchCode(row)}
                        onLink={() => linkMatchCode(row)}
                      />
                    </Td>
                    <Td className="more-lookup-col-cms-title">
                      <EllipsisCell text={row.cmsTitle} />
                    </Td>
                    <Td className="more-lookup-col-more-title">
                      {row.displayMoreUrl ? (
                        <MorePageLink url={row.displayMoreUrl} label={row.displayMoreTitle} />
                      ) : (
                        <EllipsisCell text={row.displayMoreTitle} tone="neutral600" />
                      )}
                    </Td>
                    <Td className="more-lookup-col-code">
                      <SourceInfo
                        title={buildSourceTooltip({
                          pageUrl: row.displayMoreUrl,
                          apiUrl: moreEventsApiUrl(row.displayCode),
                          jsonPreview: row.displayVerify?.jsonPreview,
                        })}
                      >
                        <EllipsisCell text={row.displayCode} mono />
                      </SourceInfo>
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
                      <ApiVerifyCell verify={row.displayVerify} eventGroupCode={row.displayCode} />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
            </Box>
            )}
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

        {catalog.length > 0 ? (
          <Box paddingBottom={6} background="neutral0" shadow="filterShadow" hasRadius style={cardStyle}>
            <Box padding={4}>
              <PanelHeader
                title="Πίνακας 2 — Κατάλογος More"
                subtitle={`Σύνδεση / δημιουργία · έγκριση ταινίας/παράστασης ως draft · ${catalogFiltered.length} εμφανίζονται · ${catalogMissingFiltered} λείπουν`}
              />
              <Flex gap={4} wrap="wrap" paddingTop={3} alignItems="flex-end">
                <TypeFilterBar
                  label="Τύπος More"
                  value={catalogKindFilter}
                  options={catalogFilterOptions}
                  onChange={setCatalogKindFilter}
                />
                <Box paddingBottom={1} className="more-lookup-catalog-missing-toggle">
                  <label className="more-lookup-checkbox-label">
                    <SelectCheckbox
                      checked={catalogOnlyMissing}
                      onChange={setCatalogOnlyMissing}
                      ariaLabel="Μόνο κωδικοί που λείπουν από το CMS"
                    />
                    <span>Μόνο κωδικοί που λείπουν από το CMS</span>
                  </label>
                </Box>
              </Flex>
            </Box>
            {catalogFiltered.length === 0 ? (
              <Box padding={4} paddingTop={0}>
                <Typography variant="pi" textColor="neutral600">
                  Δεν υπάρχουν εγγραφές με τα τρέχοντα φίλτρα.
                </Typography>
              </Box>
            ) : (
            <Box className="more-lookup-catalog-table">
            <Table colCount={8} rowCount={catalogPageRows.length}>
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
                  <Th>
                    <Typography variant="sigma">Scrape</Typography>
                  </Th>
                  <Th className="more-lookup-col-actions">
                    <Typography variant="sigma">Ενέργειες</Typography>
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
                      {row.moreUrl ? (
                        <MorePageLink url={row.moreUrl} label={row.moreTitle} />
                      ) : (
                        <Typography>{row.moreTitle}</Typography>
                      )}
                    </Td>
                    <Td>
                      <SourceInfo
                        title={buildSourceTooltip({
                          pageUrl: row.moreUrl,
                          apiUrl: row.verify?.apiUrl || moreEventsApiUrl(row.eventGroupCode),
                          jsonPreview: row.verify?.jsonPreview,
                        })}
                      >
                        <Typography fontWeight="bold">{row.eventGroupCode}</Typography>
                      </SourceInfo>
                    </Td>
                    <Td>
                      {catalogVenueResolved(row) || (row.inCms && row.kind !== 'venue_bundle') ? (
                        <Badge>
                          {catalogCmsStatusLabel(row)}
                          {row.cmsRefs?.[0]?.cmsTitle ? `: ${row.cmsRefs[0].cmsTitle}` : ''}
                        </Badge>
                      ) : row.kind === 'venue_bundle' ? (
                        <Flex direction="column" alignItems="flex-start" gap={1}>
                          <Badge>Λείπει (χώρος)</Badge>
                          {row.suggestedVenue ? (
                            <Typography variant="pi" textColor="neutral600">
                              Πρόταση: {row.suggestedVenue.cmsTitle} (Sc{' '}
                              {Number(row.suggestedVenue.score).toFixed(2)})
                            </Typography>
                          ) : (
                            <Typography variant="pi" textColor="neutral500">
                              Δεν βρέθηκε ταύτιση — δημιούργησε ή διάλεξε χώρο δεξιά
                            </Typography>
                          )}
                        </Flex>
                      ) : (
                        <Badge>Λείπει</Badge>
                      )}
                    </Td>
                    <Td>
                      <SourceInfo
                        title={buildSourceTooltip({
                          apiUrl: row.verify?.apiUrl || moreEventsApiUrl(row.eventGroupCode),
                          jsonPreview: row.verify?.jsonPreview,
                          error: row.verify?.ok ? undefined : row.verify?.error,
                        })}
                      >
                        <Typography variant="pi">
                          {row.verify?.ok ? row.verify.eventCount : row.verify?.error || '—'}
                        </Typography>
                      </SourceInfo>
                    </Td>
                    <Td>
                      <SourceInfo
                        title={buildSourceTooltip({
                          apiUrl: row.verify?.apiUrl || moreEventsApiUrl(row.eventGroupCode),
                          jsonPreview: row.verify?.jsonPreview,
                        })}
                      >
                        <Typography variant="pi">
                          {row.verify?.ok ? row.verify.venueCount : '—'}
                        </Typography>
                      </SourceInfo>
                    </Td>
                    <Td>
                      <SourceInfo title={venueScrapeTooltip(row)}>
                        <Typography variant="pi">
                          {row.kind === 'venue_bundle' ? venueScrapeSummary(row) : '—'}
                        </Typography>
                      </SourceInfo>
                    </Td>
                    <Td className="more-lookup-col-actions">
                      {row.kind === 'venue_bundle' ? (
                        <CatalogVenueBundlePanel
                          row={row}
                          cmsVenueChoices={result?.cmsVenueChoices || []}
                          pick={catalogVenuePick[row.eventGroupCode] || ''}
                          onPickChange={(next) =>
                            setCatalogVenuePick((prev) => ({
                              ...prev,
                              [row.eventGroupCode]: next,
                            }))
                          }
                          createName={catalogCreateName[row.eventGroupCode] || ''}
                          onCreateNameChange={(next) =>
                            setCatalogCreateName((prev) => ({
                              ...prev,
                              [row.eventGroupCode]: next,
                            }))
                          }
                          busyKey={busyKey}
                          onLinkVenue={linkCatalogVenue}
                          onLinkSuggested={linkCatalogVenueSuggested}
                          onCreateVenue={createCatalogVenue}
                        />
                      ) : catalogContentNeedsCreate(row) ? (
                        <Flex direction="column" alignItems="flex-start" gap={1}>
                          <Typography variant="pi" textColor="neutral600">
                            Δημιουργεί unpublished {catalogContentTypeLabel(row)} με όσα βρίσκει στο More
                            (τίτλος, σύνοψη, διάρκεια, κωδικός, αφίσα αν υπάρχει).
                          </Typography>
                          <Button
                            size="S"
                            variant="success"
                            loading={busyKey === `content:${row.eventGroupCode}`}
                            disabled={Boolean(busyKey) && busyKey !== `content:${row.eventGroupCode}`}
                            onClick={() => createCatalogContent(row)}
                            title="Έγκριση → draft unpublished στο CMS"
                          >
                            Έγκριση → draft
                          </Button>
                        </Flex>
                      ) : (
                        <Typography variant="pi" textColor="neutral500">
                          —
                        </Typography>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
            </Box>
            )}
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
