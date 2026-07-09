import React, { useCallback, useEffect, useState } from 'react';
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
import { useFetchClient } from '@strapi/helper-plugin';

const VENUE_COLLECTION = '/content-manager/collection-types/api::venue.venue';

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

function VenueQueueTable({ rows, emptyLabel, showAutoCreated = false }) {
  if (!rows?.length) {
    return (
      <Typography variant="pi" textColor="neutral500">
        {emptyLabel}
      </Typography>
    );
  }

  const colCount = showAutoCreated ? 5 : 4;

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
                <Link to={venueEditPath(row.id)}>Επεξεργασία</Link>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}

const VenueUpdateQueuePage = () => {
  const { get } = useFetchClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

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
  }, [load]);

  const counts = data?.counts || {};

  return (
    <Layout>
      <HeaderLayout
        title="Τι να ενημερώσω"
        subtitle="Λίστες σινεμά ανά κατάσταση ενημέρωσης — μόνο published στα «χωρίς νέες» / «χειροκίνητα»."
        primaryAction={
          <Button onClick={load} loading={loading} variant="secondary">
            Ανανέωση
          </Button>
        }
      />
      <ContentLayout>
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

        {data ? (
          <>
            <Box paddingBottom={4}>
              <Typography variant="pi" textColor="neutral600">
                Σύνολο σινεμά: {counts.cinemaTotal ?? 0} · Δημοσιευμένα: {counts.publishedTotal ?? 0} ·
                Ενημερώθηκαν: {formatGeneratedAt(data.generatedAt)}
              </Typography>
              <Typography variant="pi" textColor="neutral500" paddingTop={2}>
                Το <strong>complete</strong> αλλάζει μόνο με sync (όταν περάσουν όλες οι προβολές) ή επανέρχεται σε{' '}
                <strong>no_new</strong> κάθε Σάββατο 06:00. Τα <strong>needs_manual</strong> δεν εμφανίζονται στη
                λίστα «χωρίς νέες».
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
              />
            </QueueSection>
          </>
        ) : null}
      </ContentLayout>
    </Layout>
  );
};

export default VenueUpdateQueuePage;
