import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  IconButton,
} from '@strapi/design-system';
import { Cross } from '@strapi/icons';
import { useFetchClient, useNotification } from '@strapi/helper-plugin';

const EXAMPLE_TEXT = `Πρόγραμμα κιν/φου ΔΙΑΝΑ Πέμπτη 25/6 - Τετάρτη 1/7:
🎬TOY STORY 5
Πέμπτη 17.20 μεταγλωττισμένο, Σάββατο 17.00 υποτιτλισμένο, Κυριακή 16.45 μεταγλωττισμένο, Τρίτη 19.15 υποτιτλισμένο
🎬ΡΟΜΕΡΙΑ
Πέμπτη 19.10, Παρασκευή 18.10, Σάββατο 18.40, Κυριακή 21.45
Δευτέρα 17.00, Τετάρτη 20.40`;

const MAX_IMAGES_DEFAULT = 4;

function parseSourceLabel(source) {
  if (source === 'ai_vision') return 'AI (εικόνα)';
  if (source === 'ai') return 'AI (κείμενο)';
  if (source === 'regex') return 'Κανόνες (fallback)';
  return source || '—';
}

function statusLabel(status) {
  if (status === 'new') return 'Νέα';
  if (status === 'exists') return 'Υπάρχει ήδη';
  if (status === 'unmatched') return 'Χωρίς ταινία CMS';
  return status;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Αποτυχία ανάγνωσης αρχείου'));
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const { get, post } = useFetchClient();
  const toggleNotification = useNotification();
  const fileInputRef = useRef(null);

  const [cinemas, setCinemas] = useState([]);
  const [aiStatus, setAiStatus] = useState(null);
  const [venueId, setVenueId] = useState('');
  const [inputMode, setInputMode] = useState('text');
  const [text, setText] = useState('');
  const [images, setImages] = useState([]);
  const [preview, setPreview] = useState(null);
  const [manualMovieByTitle, setManualMovieByTitle] = useState({});
  const [approvedById, setApprovedById] = useState({});
  const [skippedMovieTitles, setSkippedMovieTitles] = useState({});
  const [loadingCinemas, setLoadingCinemas] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [creating, setCreating] = useState(false);

  const maxImages = aiStatus?.maxImages || MAX_IMAGES_DEFAULT;

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

  const pendingUnmatchedTitles = useMemo(
    () => unmatchedTitles.filter((title) => !skippedMovieTitles[title]),
    [skippedMovieTitles, unmatchedTitles],
  );

  const skippedUnmatchedCount = unmatchedTitles.length - pendingUnmatchedTitles.length;

  const canParse =
    venueId &&
    (inputMode === 'text' ? text.trim().length > 0 : images.length > 0) &&
    (inputMode !== 'image' || aiStatus?.aiEnabled);

  const runPreview = useCallback(
    async ({ venueId: vId, mode, textValue, imageValues }) => {
      const payload = { venueId: Number(vId) };
      if (mode === 'image') {
        payload.images = imageValues.map((img) => img.dataUrl);
      } else {
        payload.text = textValue;
      }
      const res = await post('/api/program-import/preview', payload);
      const data = res?.data;
      if (!data?.ok) throw new Error(data?.error || 'Αποτυχία ανάλυσης');
      setPreview(data);
      const initialApproved = {};
      for (const p of data.proposals || []) {
        initialApproved[p.id] = p.approved;
      }
      setApprovedById(initialApproved);
      setSkippedMovieTitles({});
      return data;
    },
    [post],
  );

  const handleParse = useCallback(async () => {
    if (!venueId) {
      toggleNotification({ type: 'warning', message: 'Επίλεξε κινηματογράφο.' });
      return;
    }
    if (inputMode === 'text' && !text.trim()) {
      toggleNotification({ type: 'warning', message: 'Επικόλλησε το κείμενο προγράμματος.' });
      return;
    }
    if (inputMode === 'image' && !images.length) {
      toggleNotification({ type: 'warning', message: 'Ανέβασε τουλάχιστον μία εικόνα.' });
      return;
    }
    if (inputMode === 'image' && !aiStatus?.aiEnabled) {
      toggleNotification({
        type: 'warning',
        message: 'Η ανάλυση εικόνας απαιτεί OPENAI_API_KEY στο Strapi.',
      });
      return;
    }

    setParsing(true);
    setPreview(null);
    setManualMovieByTitle({});
    setApprovedById({});
    setSkippedMovieTitles({});
    try {
      const data = await runPreview({
        venueId,
        mode: inputMode,
        textValue: text,
        imageValues: images,
      });
      toggleNotification({
        type: 'success',
        message: `${data.summary.totalShowtimes} προβολές · ${parseSourceLabel(data.parseSource)}`,
      });
    } catch (e) {
      toggleNotification({ type: 'warning', message: e?.message || 'Αποτυχία ανάλυσης' });
    } finally {
      setParsing(false);
    }
  }, [aiStatus, images, inputMode, runPreview, text, toggleNotification, venueId]);

  const handleFilesSelected = useCallback(
    async (event) => {
      const files = [...(event.target.files || [])];
      event.target.value = '';
      if (!files.length) return;

      const remaining = maxImages - images.length;
      if (remaining <= 0) {
        toggleNotification({ type: 'warning', message: `Μέγιστο ${maxImages} εικόνες.` });
        return;
      }

      const slice = files.slice(0, remaining);
      try {
        const next = [];
        for (const file of slice) {
          if (!file.type.startsWith('image/')) {
            toggleNotification({ type: 'warning', message: `Παράλειψη «${file.name}» — όχι εικόνα.` });
            continue;
          }
          const dataUrl = await readFileAsDataUrl(file);
          next.push({
            id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
            name: file.name,
            dataUrl,
          });
        }
        if (next.length) setImages((prev) => [...prev, ...next]);
      } catch (e) {
        toggleNotification({ type: 'warning', message: e?.message || 'Αποτυχία φόρτωσης εικόνας' });
      }
    },
    [images.length, maxImages, toggleNotification],
  );

  const removeImage = useCallback((id) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  }, []);

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

  const skipUnmatchedTitle = useCallback((title) => {
    setSkippedMovieTitles((prev) => ({ ...prev, [title]: true }));
    setManualMovieByTitle((prev) => {
      if (!prev[title]) return prev;
      const next = { ...prev };
      delete next[title];
      return next;
    });
  }, []);

  const skipAllUnmatchedTitles = useCallback(() => {
    const next = {};
    for (const title of pendingUnmatchedTitles) next[title] = true;
    setSkippedMovieTitles((prev) => ({ ...prev, ...next }));
    setManualMovieByTitle({});
  }, [pendingUnmatchedTitles]);

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
      const skippedParts = [
        s.skippedNotApproved ? `${s.skippedNotApproved} δεν εγκρίθηκαν` : null,
        s.skippedNoMovie ? `${s.skippedNoMovie} χωρίς ταινία CMS` : null,
      ].filter(Boolean);
      toggleNotification({
        type: 'success',
        message: `Δημιουργήθηκαν ${s.created} προβολές${skippedParts.length ? ` · ${skippedParts.join(' · ')}` : ''}`,
      });
      await runPreview({
        venueId: preview.venue.id,
        mode: preview.inputKind || inputMode,
        textValue: text,
        imageValues: images,
      });
    } catch (e) {
      toggleNotification({ type: 'warning', message: e?.message || 'Αποτυχία δημιουργίας' });
    } finally {
      setCreating(false);
    }
  }, [
    approvedCount,
    enrichedProposals,
    images,
    inputMode,
    post,
    preview,
    runPreview,
    text,
    toggleNotification,
  ]);

  const allApprovableSelected = useMemo(() => {
    const approvable = enrichedProposals.filter((p) => p.canApprove);
    return approvable.length > 0 && approvable.every((p) => p.approved);
  }, [enrichedProposals]);

  return (
    <Layout>
      <HeaderLayout
        title="Εισαγωγή προγράμματος"
        subtitle="AI από κείμενο ή screenshot · έγκριση πριν τη δημιουργία προβολών"
        as="section"
      />
      <ContentLayout>
        <Box padding={6} background="neutral0" shadow="filterShadow" hasRadius>
          <Grid gap={4}>
            <GridItem col={12}>
              <Flex gap={2} alignItems="center" wrap="wrap">
                <Typography variant="beta">1. Κινηματογράφος & πηγή</Typography>
                {aiStatus ? (
                  <Badge>
                    {aiStatus.aiEnabled
                      ? `AI: ${aiStatus.visionModel || aiStatus.aiModel}`
                      : 'AI: off'}
                  </Badge>
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
              <div className="program-import-mode-tabs">
                <Button
                  variant={inputMode === 'text' ? 'default' : 'tertiary'}
                  onClick={() => setInputMode('text')}
                >
                  Κείμενο
                </Button>
                <Button
                  variant={inputMode === 'image' ? 'default' : 'tertiary'}
                  onClick={() => setInputMode('image')}
                >
                  Εικόνα / screenshot
                </Button>
              </div>
            </GridItem>

            {inputMode === 'text' ? (
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
                  placeholder="Επικόλλησε ελεύθερο κείμενο — τίτλοι, μέρες, ώρες…"
                />
              </GridItem>
            ) : (
              <GridItem col={12}>
                <Typography variant="pi" fontWeight="bold" as="label">
                  Screenshot προγράμματος
                </Typography>
                <Typography variant="pi" textColor="neutral600" style={{ marginTop: 4 }}>
                  Ανέβασε 1–{maxImages} εικόνες (Facebook post, site, αφίσα). Το AI διαβάζει το πρόγραμμα·
                  εσύ εγκρίνεις τι μπαίνει στο CMS.
                </Typography>
                <Flex gap={2} marginTop={2} wrap="wrap">
                  <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                    Επιλογή εικόνων
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    hidden
                    onChange={handleFilesSelected}
                  />
                  {images.length ? (
                    <Typography variant="pi" textColor="neutral600">
                      {images.length}/{maxImages} εικόνες
                    </Typography>
                  ) : null}
                </Flex>
                {images.length > 0 ? (
                  <div className="program-import-image-grid">
                    {images.map((img) => (
                      <div key={img.id} className="program-import-image-thumb">
                        <img src={img.dataUrl} alt={img.name} />
                        <IconButton
                          label={`Αφαίρεση ${img.name}`}
                          icon={<Cross />}
                          onClick={() => removeImage(img.id)}
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
                {!aiStatus?.aiEnabled ? (
                  <Box marginTop={2}>
                    <Alert variant="danger" title="AI απενεργοποιημένο">
                      Για εικόνες χρειάζεται OPENAI_API_KEY στο Strapi (.env).
                    </Alert>
                  </Box>
                ) : null}
              </GridItem>
            )}

            <GridItem col={12}>
              <Button onClick={handleParse} loading={parsing} disabled={!canParse}>
                Ανάλυση & προεπισκόπηση
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
                  {preview.imageCount > 0 ? (
                    <Badge>{preview.imageCount} εικόν{preview.imageCount === 1 ? 'α' : 'ες'}</Badge>
                  ) : null}
                  <Badge>{approvedCount} επιλεγμένες</Badge>
                </Flex>
              </Flex>

              {(preview.warnings || []).map((w) => (
                <Alert key={w} variant="default" title="Σημείωση" closeLabel="Κλείσιμο">
                  {w}
                </Alert>
              ))}

              {pendingUnmatchedTitles.length > 0 ? (
                <Box padding={3} background="neutral100" hasRadius>
                  <Flex justifyContent="space-between" alignItems="center" gap={2} wrap="wrap" marginBottom={2}>
                    <Typography variant="pi" fontWeight="bold">
                      Ταύτιση ταινιών CMS ({pendingUnmatchedTitles.length} χωρίς ταύτιση)
                    </Typography>
                    <Button variant="tertiary" size="S" onClick={skipAllUnmatchedTitles}>
                      Παράλειψη όλων
                    </Button>
                  </Flex>
                  <Typography variant="pi" textColor="neutral600" marginBottom={2}>
                    Ταίριαξε με ταινία CMS ή παράλειψε — οι προβολές χωρίς ταινία δεν θα δημιουργηθούν.
                  </Typography>
                  <Flex direction="column" gap={2}>
                    {pendingUnmatchedTitles.map((title) => (
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
                        <Button variant="tertiary" size="S" onClick={() => skipUnmatchedTitle(title)}>
                          Παράλειψη
                        </Button>
                      </Flex>
                    ))}
                  </Flex>
                </Box>
              ) : skippedUnmatchedCount > 0 ? (
                <Alert variant="default" title="Παραλείφθηκαν ταινίες" closeLabel="Κλείσιμο">
                  {skippedUnmatchedCount} ταινί{skippedUnmatchedCount === 1 ? 'α' : 'ες'} χωρίς εισαγωγή στο CMS —
                  οι προβολές τους δεν θα δημιουργηθούν.
                </Alert>
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
                      <Th>Ταινία (πηγή)</Th>
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
                <Button onClick={handleCreate} loading={creating} disabled={approvedCount === 0}>
                  Έγκριση & δημιουργία {approvedCount} προβολών
                </Button>
                {pendingUnmatchedTitles.length > 0 ? (
                  <Typography variant="pi" textColor="neutral600">
                    {pendingUnmatchedTitles.length} ταινί
                    {pendingUnmatchedTitles.length === 1 ? 'α' : 'ες'} χωρίς ταύτιση — θα παραλειφθούν αν δεν
                    τις ταιριάξεις.
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
