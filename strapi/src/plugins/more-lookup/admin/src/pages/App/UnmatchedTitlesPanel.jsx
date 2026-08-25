import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Button, Flex } from '@strapi/design-system';
import { useFetchClient } from '@strapi/helper-plugin';
import { cmsDualTitleLabel, truncateLabel, unmatchedRowKey } from './syncUiShared';

function UnmatchedRow({
  row,
  busyKey,
  pick,
  onPickChange,
  onLink,
  onDismiss,
  showBrowse,
  onToggleBrowse,
  filter,
  onFilterChange,
  remoteOptions,
  remoteLoading,
}) {
  const key = unmatchedRowKey(row);
  const title = row.playTitle;
  const venues =
    Array.isArray(row.venues) && row.venues.length
      ? row.venues
      : row.venueName
        ? [row.venueName]
        : [];
  const n = row.count || 1;
  const eventIds = row.eventIds?.length
    ? row.eventIds
    : row.eventId
      ? [row.eventId]
      : [];
  const playId = row.playId || row.playIds?.[0] || null;
  const canLink = eventIds.length > 0 || Boolean(playId) || Boolean(title);
  const suggestions = row.suggestions || [];
  const suggested = row.suggestedContent || suggestions[0] || null;
  const linkBusy = busyKey === `unmatched:${key}`;
  const suggestedBusy = busyKey === `unmatched-suggested:${key}`;
  const anyBusy = Boolean(busyKey);
  const kind = row.kind === 'theater_show' ? 'theater_show' : 'movie';

  const pickedOpt = useMemo(() => {
    if (!pick) return null;
    return (
      remoteOptions.find((c) => String(c.id) === String(pick)) ||
      suggestions.find((s) => String(s.cmsId ?? s.id) === String(pick)) ||
      null
    );
  }, [pick, remoteOptions, suggestions]);

  const browseOptions = useMemo(() => {
    if (!showBrowse) return [];
    const q = (filter || '').trim().toLocaleLowerCase('el');
    const sugIds = new Set(suggestions.map((s) => Number(s.cmsId ?? s.id)));
    const filteredSug = q
      ? suggestions.filter((s) =>
          `${s.cmsTitle || s.title || ''} ${s.originalTitle || ''}`
            .toLocaleLowerCase('el')
            .includes(q),
        )
      : suggestions;
    const fromRemote = (remoteOptions || []).filter((c) => !sugIds.has(Number(c.id)));
    return [...filteredSug, ...fromRemote].slice(0, 36);
  }, [showBrowse, filter, suggestions, remoteOptions]);

  const whereLabel = venues.length
    ? venues.slice(0, 3).join(' · ') + (venues.length > 3 ? ` +${venues.length - 3}` : '')
    : row.venueId
      ? `χώρος #${row.venueId}`
      : null;

  return (
    <Box
      paddingTop={2}
      paddingBottom={2}
      paddingLeft={2}
      paddingRight={2}
      background="neutral0"
      hasRadius
      style={{ border: '1px solid #ead9a0' }}
    >
      <Flex justifyContent="space-between" alignItems="center" gap={2} wrap="wrap">
        <Flex direction="column" gap={0} style={{ minWidth: 0, flex: '1 1 220px' }}>
          <Typography fontWeight="semiBold" textColor="neutral800" variant="pi">
            «{truncateLabel(title, 42)}»{n > 1 ? ` ×${n}` : ''}
          </Typography>
          {whereLabel ? (
            <Typography variant="pi" textColor="neutral600" style={{ fontSize: 11, lineHeight: 1.35 }}>
              Βρέθηκε: {whereLabel}
            </Typography>
          ) : null}
        </Flex>
        <Flex gap={1} wrap="wrap" alignItems="center">
          {suggested && canLink ? (
            <Button
              size="S"
              variant="success"
              loading={suggestedBusy}
              disabled={anyBusy && !suggestedBusy}
              onClick={() => onLink(row, suggested.cmsId ?? suggested.id, 'unmatched-suggested')}
              title={cmsDualTitleLabel(suggested, { max: 120 })}
            >
              → {cmsDualTitleLabel(suggested, { max: 34 })}
              {suggested.score != null ? ` · ${Number(suggested.score).toFixed(2)}` : ''}
            </Button>
          ) : null}
          {canLink ? (
            <>
              <Button
                size="S"
                variant="tertiary"
                disabled={anyBusy}
                onClick={onToggleBrowse}
              >
                {showBrowse ? '✕' : 'CMS…'}
              </Button>
              <Button
                size="S"
                variant="secondary"
                loading={linkBusy}
                disabled={!pick || (anyBusy && !linkBusy)}
                onClick={() => onLink(row, pick, 'unmatched')}
              >
                Σύνδ.
              </Button>
            </>
          ) : null}
          {onDismiss ? (
            <Button size="S" variant="tertiary" disabled={anyBusy} onClick={() => onDismiss(key)}>
              ×
            </Button>
          ) : null}
        </Flex>
      </Flex>

      {pick && pickedOpt && !showBrowse ? (
        <Typography variant="pi" textColor="primary600" paddingTop={1} style={{ fontSize: 11 }}>
          Επιλογή: {cmsDualTitleLabel(pickedOpt, { max: 72 })}
        </Typography>
      ) : null}

      {showBrowse && canLink ? (
        <Flex direction="column" alignItems="stretch" gap={1} paddingTop={2}>
          <input
            type="search"
            placeholder="Αναζήτηση ελληνικού / original…"
            value={filter || ''}
            onChange={(e) => onFilterChange(e.target.value)}
            style={{
              padding: '4px 8px',
              borderRadius: 4,
              border: '1px solid #dcdce4',
              fontSize: 12,
            }}
          />
          <Flex direction="column" gap={0} style={{ maxHeight: 160, overflowY: 'auto' }}>
            {remoteLoading && !browseOptions.length ? (
              <Typography variant="pi" textColor="neutral500">
                Αναζήτηση…
              </Typography>
            ) : null}
            {browseOptions.map((opt) => {
              const id = opt.cmsId ?? opt.id;
              const el = String(opt.cmsTitle || opt.title || '').trim();
              const orig = String(opt.originalTitle || '').trim();
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onPickChange(key, String(id))}
                  style={{
                    textAlign: 'left',
                    padding: '4px 6px',
                    border: 'none',
                    borderBottom: '1px solid #f0f0f5',
                    background: String(pick) === String(id) ? '#eaf3ff' : 'transparent',
                    cursor: 'pointer',
                    fontSize: 12,
                    lineHeight: 1.3,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{el || `#${id}`}</span>
                  {orig && orig.toLocaleLowerCase('el') !== el.toLocaleLowerCase('el') ? (
                    <span style={{ color: '#666687' }}> · {orig}</span>
                  ) : null}
                  {opt.score != null ? (
                    <span style={{ color: '#8e8ea9' }}> · {Number(opt.score).toFixed(2)}</span>
                  ) : null}
                </button>
              );
            })}
            {!remoteLoading && !browseOptions.length ? (
              <Typography variant="pi" textColor="neutral500">
                Καμία εγγραφή — δοκίμασε άλλο όρο
              </Typography>
            ) : null}
          </Flex>
          <Typography variant="pi" textColor="neutral500" style={{ fontSize: 10 }}>
            {kind === 'theater_show' ? 'Παραστάσεις' : 'Ταινίες'} · αναζήτηση CMS (όχι πλήρης κατάλογος
            στο report)
          </Typography>
        </Flex>
      ) : null}
    </Box>
  );
}

export function UnmatchedTitlesPanel({
  titles,
  count,
  busyKey,
  picks = {},
  onPickChange,
  onLink,
  onDismiss,
}) {
  const { get } = useFetchClient();
  const [filterByKey, setFilterByKey] = useState({});
  const [browseByKey, setBrowseByKey] = useState({});
  const [remoteByKey, setRemoteByKey] = useState({});
  const [loadingByKey, setLoadingByKey] = useState({});

  const rows = useMemo(
    () =>
      Array.isArray(titles)
        ? titles.filter((t) => t?.playTitle || typeof t === 'string')
        : [],
    [titles],
  );
  const total = Number(count ?? rows.length);

  useEffect(() => {
    let cancelled = false;
    const timers = [];

    for (const raw of rows.slice(0, 50)) {
      const row = typeof raw === 'string' ? { playTitle: raw, kind: 'movie' } : raw;
      const key = unmatchedRowKey(row);
      if (browseByKey[key] !== true) continue;
      const kind = row.kind === 'theater_show' ? 'theater_show' : 'movie';
      const q = (filterByKey[key] || '').trim();

      const timer = setTimeout(() => {
        setLoadingByKey((prev) => ({ ...prev, [key]: true }));
        get(
          `/api/more-lookup/cms-search?q=${encodeURIComponent(q)}&contentType=${encodeURIComponent(kind)}&limit=36`,
        )
          .then((res) => {
            if (cancelled) return;
            const items = res?.data?.items || res?.items || [];
            setRemoteByKey((prev) => ({ ...prev, [key]: items }));
          })
          .catch(() => {
            if (cancelled) return;
            setRemoteByKey((prev) => ({ ...prev, [key]: [] }));
          })
          .finally(() => {
            if (cancelled) return;
            setLoadingByKey((prev) => ({ ...prev, [key]: false }));
          });
      }, q ? 220 : 0);
      timers.push(timer);
    }

    return () => {
      cancelled = true;
      for (const t of timers) clearTimeout(t);
    };
  }, [browseByKey, filterByKey, rows, get]);

  if (!rows.length && total <= 0) return null;

  return (
    <Box padding={3} background="warning100" hasRadius>
      <Typography fontWeight="semiBold" textColor="warning700" variant="pi">
        Χωρίς ταύτιση CMS ({total || rows.length}) — σύνδεσε χειροκίνητα
      </Typography>
      <Flex direction="column" gap={1} paddingTop={2} alignItems="stretch">
        {rows.slice(0, 50).map((raw) => {
          const row =
            typeof raw === 'string'
              ? { playTitle: raw, suggestions: [], eventIds: [], venues: [] }
              : raw;
          const key = unmatchedRowKey(row);
          return (
            <UnmatchedRow
              key={key}
              row={row}
              busyKey={busyKey}
              pick={picks[key] || ''}
              onPickChange={onPickChange}
              onLink={onLink}
              onDismiss={onDismiss}
              showBrowse={browseByKey[key] === true}
              onToggleBrowse={() =>
                setBrowseByKey((prev) => ({ ...prev, [key]: !prev[key] }))
              }
              filter={filterByKey[key] || ''}
              onFilterChange={(v) => setFilterByKey((prev) => ({ ...prev, [key]: v }))}
              remoteOptions={remoteByKey[key] || []}
              remoteLoading={loadingByKey[key] === true}
            />
          );
        })}
        {rows.length > 50 ? (
          <Typography variant="pi" textColor="neutral600">
            …και {rows.length - 50} ακόμα
          </Typography>
        ) : null}
      </Flex>
    </Box>
  );
}

export { unmatchedRowKey };
