import React, { useCallback, useEffect, useMemo, useState } from 'react';
import '../program-import-admin.css';
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
  Textarea,
  SingleSelect,
  SingleSelectOption,
  Alert,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Checkbox,
} from '@strapi/design-system';
import { useFetchClient, useNotification } from '@strapi/helper-plugin';

const EXAMPLE_TEXT = `Πρόγραμμα κιν/φου ΔΙΑΝΑ Πέμπτη 25/6 - Τετάρτη 1/7:
🎬TOY STORY 5
Πέμπτη 17.20 μεταγλωττισμένο, Σάββατο 17.00 υποτιτλισμένο, Κυριακή 16.45 μεταγλωττισμένο, Τρίτη 19.15 υποτιτλισμένο
🎬ΡΟΜΕΡΙΑ
Πέμπτη 19.10, Παρασκευή 18.10, Σάββατο 18.40, Κυριακή 21.45
Δευτέρα 17.00, Τετάρτη 20.40`;

function parseSourceLabel(source) {
  if (source === 'ai') return 'AI';
  if (source === 'regex') return 'Κανόνες (fallback)';
  return source || '—';
}

function statusLabel(status) {
  if (status === 'new') return 'Νέα';
  if (status === 'exists') return 'Υπάρχει ήδη';
  if (status === 'unmatched') return 'Χωρίς ταινία CMS';
  return status;
}

export default function App() {
  const { get, post } = useFetchClient();
  const toggleNotification = useNotification();

  const [cinemas, setCinemas] = useState([]);
  const [aiStatus, setAiStatus] = useState(null);
  const [venueId, setVenueId] = useState('');
  const [text, setText] = useState('');
  const [preview, setPreview] = useState(null);
  const [manualMovieByTitle, setManualMovieByTitle] = useState({});
  const [approvedById, setApprovedById] = useState({});
  const [loadingCinemas, setLoadingCinemas] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cinemaRes, statusRes] = await Promise.all([
          get('/api/program-import/cinemas'),
          get('/api/program-import/status'),
        ]);
        if (cancelled) return;
        setCinemas(cinemaRes?.data?.cinemas || []);
        setAiStatus(statusRes?.data || null);
      } catch (e) {
        toggleNotification({
          type: 'warning',
          message: e?.message || 'Αποτυχία φόρτωσης',
        });
      } finally {
        if (!cancelled) setLoadingCinemas(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [get, toggleNotification]);

  const cmsMovieById = useMemo(() => {
    const map = new Map();
    for (const m of preview?.cmsMovies || []) map.set(m.id, m.title);
    return map;
  }, [preview]);

  const movieIdForTitle = useCallback(
    (parsedTitle, movieMatch) => {
      const manual = manualMovieByTitle[parsedTitle];
      if (manual) return Number(manual);
      return movieMatch?.cmsId ?? null;
    },
    [manualMovieByTitle],
  );

  const enrichedProposals = useMemo(() => {
    if (!preview?.proposals) return [];
    return preview.proposals.map((row) => {
      const movieId = movieIdForTitle(row.parsedTitle, row.movieMatch);
      const cmsTitle = movieId ? cmsMovieById.get(movieId) || row.cmsTitle : null;
      const canApprove = Boolean(movieId) && !row.exists;
      const approved =
        approvedById[row.id] !== undefined ? approvedById[row.id] : row.approved;
      return {
        ...row,
        movieId,
        cmsTitle,
        canApprove,
        approved: canApprove ? approved : false,
        status: !movieId ? 'unmatched' : row.exists ? 'exists' : 'new',
      };
    });
  }, [approvedById, cmsMovieById, movieIdForTitle, preview]);

  const approvedCount = useMemo(
    () => enrichedProposals.filter((p) => p.approved).length,
    [enrichedProposals],
  );

  const unmatchedTitles = useMemo(() => {
    const set = new Set();
    for (const p of enrichedProposals) {
      if (!p.movieId) set.add(p.parsedTitle);
    }
    return [...set];
  }, [enrichedProposals]);

  const handleParse = useCallback(async () => {
    if (!venueId) {
      toggleNotification({ type: 'warning', message: 'Επίλεξε κινηματογράφο.' });
      return;
    }
    if (!text.trim()) {
      toggleNotification({ type: 'warning', message: 'Επικόλλησε το κείμενο προγράμματος.' });
      return;
    }
    setParsing(true);
    setPreview(null);
    setManualMovieByTitle({});
    setApprovedById({});
    try {
      const res = await post('/api/program-import/preview', { venueId: Number(venueId), text });
      const data = res?.data;
      if (!data?.ok) throw new Error(data?.error || 'Αποτυχία ανάλυσης');
      setPreview(data);
      const initialApproved = {};
      for (const p of data.proposals || []) {
        initialApproved[p.id] = p.approved;
      }
      setApprovedById(initialApproved);
      toggleNotification({
        type: 'success',
        message: `${data.summary.totalShowtimes} προβολές · ${parseSourceLabel(data.parseSource)}`,
      });
    } catch (e) {
      toggleNotification({ type: 'warning', message: e?.message || 'Αποτυχία ανάλυσης' });
    } finally {
      setParsing(false);
    }
  }, [post, text, toggleNotification, venueId]);

  const toggleProposal = useCallback((id, checked) => {
    setApprovedById((prev) => ({ ...prev, [id]: checked }));
  }, []);

  const toggleAllApprovals = useCallback(
    (checked) => {
      const next = {};
      for (const p of enrichedProposals) {
        if (p.canApprove) next[p.id] = checked;
      }
      setApprovedById((prev) => ({ ...prev, ...next }));
    },
    [enrichedProposals],
  );

  const handleCreate = useCallback(async () => {
    if (!preview || approvedCount === 0) return;

    const byTitle = new Map();
    for (const p of enrichedProposals) {
      if (!byTitle.has(p.parsedTitle)) {
        byTitle.set(p.parsedTitle, { parsedTitle: p.parsedTitle, movieId: p.movieId, showtimes: [] });
      }
      byTitle.get(p.parsedTitle).showtimes.push({
        datetime: p.datetime,
        note: p.note,
        approved: p.approved,
      });
    }

    setCreating(true);
    try {
      const res = await post('/api/program-import/create', {
        venueId: preview.venue.id,
        items: [...byTitle.values()],
      });
      const data = res?.data;
      if (!data?.ok) throw new Error(data?.error || 'Αποτυχία δημιουργίας');
      const s = data.summary;
      toggleNotification({
        type: 'success',
        message: `Δημιουργήθηκαν ${s.created} προβολές · ${s.skippedNotApproved || 0} δεν εγκρίθηκαν`,
      });
      await handleParse();
    } catch (e) {
      toggleNotification({ type: 'warning', message: e?.message || 'Αποτυχία δημιουργίας' });
    } finally {
      setCreating(false);
    }
  }, [approvedCount, enrichedProposals, handleParse, post, preview, toggleNotification]);

  const allApprovableSelected = useMemo(() => {
    const approvable = enrichedProposals.filter((p) => p.canApprove);
    return approvable.length > 0 && approvable.every((p) => p.approved);
  }, [enrichedProposals]);

  return (
    <Layout>
      <HeaderLayout
        title="Εισαγωγή προγράμματος"
        subtitle="AI ανάλυση ελεύθερου κειμένου · έγκριση πριν τη δημιουργία προβολών"
        as="section"
      />
      <ContentLayout>
        <Box padding={6} background="neutral0" shadow="filterShadow" hasRadius>
          <Grid gap={4}>
            <GridItem col={12}>
              <Flex gap={2} alignItems="center" wrap="wrap">
                <Typography variant="beta">1. Κινηματογράφος & κείμενο</Typography>
                {aiStatus ? (
                  <Badge>{aiStatus.aiEnabled ? `AI: ${aiStatus.aiModel}` : 'AI: off (μόνο κανόνες)'}</Badge>
                ) : null}
              </Flex>
            </GridItem>
            <GridItem col={12} s={6}>
              <Typography variant="pi" fontWeight="bold" as="label" htmlFor="venue-select">
                Κινηματογράφος
              </Typography>
              <SingleSelect
                id="venue-select"
                placeholder={loadingCinemas ? 'Φόρτωση…' : 'Επίλεξε σινεμά'}
                value={venueId}
                onChange={setVenueId}
                disabled={loadingCinemas}
              >
                {cinemas.map((v) => (
                  <SingleSelectOption key={v.id} value={String(v.id)}>
                    {v.name}
                  </SingleSelectOption>
                ))}
              </SingleSelect>
            </GridItem>
            <GridItem col={12}>
              <Flex justifyContent="space-between" alignItems="center" gap={2}>
                <Typography variant="pi" fontWeight="bold" as="label" htmlFor="program-text">
                  Κείμενο προγράμματος
                </Typography>
                <Button variant="tertiary" size="S" onClick={() => setText(EXAMPLE_TEXT)}>
                  Φόρτωσε παράδειγμα
                </Button>
              </Flex>
              <Textarea
                id="program-text"
                className="program-import-page"
                name="program-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Επικόλλησε ελεύθερο κείμενο — τίτλοι, μέρες, ώρες, ημερομηνίες…"
              />
              <Typography variant="pi" textColor="neutral600" style={{ marginTop: 8 }}>
                Ελεύθερη μορφή. Το AI εξάγει ταινίες και προβολές· εσύ εγκρίνεις τι θα μπει στο CMS.
              </Typography>
            </GridItem>
            <GridItem col={12}>
              <Button onClick={handleParse} loading={parsing} disabled={!venueId || !text.trim()}>
                Ανάλυση (AI)
              </Button>
            </GridItem>
          </Grid>
        </Box>

        {preview && (
          <Box padding={6} background="neutral0" shadow="filterShadow" hasRadius marginTop={4}>
            <Flex direction="column" alignItems="stretch" gap={4}>
              <Flex justifyContent="space-between" alignItems="center" gap={2} wrap="wrap">
                <Typography variant="beta">
                  2. Έγκριση — {preview.venue.name}
                  {preview.dateRange ? ` · ${preview.dateRange.label}` : ''}
                </Typography>
                <Flex gap={2}>
                  <Badge>{parseSourceLabel(preview.parseSource)}</Badge>
                  <Badge>{approvedCount} επιλεγμένες</Badge>
                </Flex>
              </Flex>

              {(preview.warnings || []).map((w) => (
                <Alert key={w} variant="default" title="Σημείωση" closeLabel="Κλείσιμο">
                  {w}
                </Alert>
              ))}

              {unmatchedTitles.length > 0 ? (
                <Box padding={3} background="neutral100" hasRadius>
                  <Typography variant="pi" fontWeight="bold" marginBottom={2}>
                    Ταύτιση ταινιών CMS
                  </Typography>
                  <Flex direction="column" gap={2}>
                    {unmatchedTitles.map((title) => (
                      <Flex key={title} gap={2} alignItems="center" wrap="wrap">
                        <Typography variant="pi" style={{ minWidth: 160 }}>
                          {title}
                        </Typography>
                        <Box minWidth="260px">
                          <SingleSelect
                            placeholder="Επίλεξε ταινία CMS"
                            value={
                              manualMovieByTitle[title]
                                ? String(manualMovieByTitle[title])
                                : undefined
                            }
                            onChange={(val) =>
                              setManualMovieByTitle((prev) => ({
                                ...prev,
                                [title]: Number(val),
                              }))
                            }
                          >
                            {(preview.cmsMovies || []).map((m) => (
                              <SingleSelectOption key={m.id} value={String(m.id)}>
                                {m.title}
                              </SingleSelectOption>
                            ))}
                          </SingleSelect>
                        </Box>
                      </Flex>
                    ))}
                  </Flex>
                </Box>
              ) : null}

              <div className="program-import-preview-table">
                <Table colCount={6} rowCount={enrichedProposals.length}>
                  <Thead>
                    <Tr>
                      <Th>
                        <Checkbox
                          aria-label="Επιλογή όλων"
                          checked={allApprovableSelected}
                          onChange={(e) => toggleAllApprovals(e.target.checked)}
                        />
                      </Th>
                      <Th>Ταινία (κείμενο)</Th>
                      <Th>Ταινία CMS</Th>
                      <Th>Ημ/νία & ώρα</Th>
                      <Th>Σημείωση</Th>
                      <Th>Κατάσταση</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {enrichedProposals.map((p) => (
                      <Tr key={p.id}>
                        <Td>
                          <Checkbox
                            aria-label={`Έγκριση ${p.parsedTitle} ${p.dateLabel}`}
                            disabled={!p.canApprove}
                            checked={p.approved}
                            onChange={(e) => toggleProposal(p.id, e.target.checked)}
                          />
                        </Td>
                        <Td>
                          <Typography variant="pi">{p.parsedTitle}</Typography>
                        </Td>
                        <Td>
                          <Typography variant="pi" textColor={p.cmsTitle ? 'neutral800' : 'danger600'}>
                            {p.cmsTitle || '—'}
                          </Typography>
                        </Td>
                        <Td>
                          <Typography variant="pi">
                            {p.dateLabel} · {p.timeLabel}
                          </Typography>
                        </Td>
                        <Td>
                          <Typography variant="pi" textColor="neutral600">
                            {p.note || '—'}
                          </Typography>
                        </Td>
                        <Td>
                          <Badge>{statusLabel(p.status)}</Badge>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </div>

              <Flex gap={2} alignItems="center" wrap="wrap">
                <Button
                  onClick={handleCreate}
                  loading={creating}
                  disabled={approvedCount === 0 || unmatchedTitles.length > 0}
                >
                  Έγκριση & δημιουργία {approvedCount} προβολών
                </Button>
                {unmatchedTitles.length > 0 ? (
                  <Typography variant="pi" textColor="danger600">
                    Ολοκλήρωσε την ταύτιση όλων των ταινιών πριν τη δημιουργία.
                  </Typography>
                ) : null}
              </Flex>
            </Flex>
          </Box>
        )}
      </ContentLayout>
    </Layout>
  );
}
