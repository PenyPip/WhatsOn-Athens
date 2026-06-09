import { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { Box, Typography, Loader } from '@strapi/design-system';

const VENUE_COLLECTION_PATH = '/content-manager/collection-types/api::venue.venue';
const STORAGE_KEY = 'whatson-venue-type-filter';

const PAGE_TITLES = {
  cinema: 'Σινεμά',
  theater: 'Θέατρα',
  other: 'Άλλοι χώροι',
  all: 'Όλοι οι χώροι',
};

/**
 * Ανακατεύθυνση στη λίστα χώρων με προεπιλεγμένο φίλτρο τύπου (cinema / theater / other).
 * @param {string | null} venueType
 */
export function createVenueListRedirect(venueType) {
  return function VenueListRedirect() {
    const history = useHistory();
    const labelKey = venueType || 'all';
    const pageTitle = PAGE_TITLES[labelKey] || PAGE_TITLES.all;

    useEffect(() => {
      if (venueType) {
        sessionStorage.setItem(STORAGE_KEY, venueType);
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }

      document.title = `${pageTitle} — Χώροι`;

      const params = new URLSearchParams({
        page: '1',
        pageSize: '25',
        sort: 'name:ASC',
      });
      if (venueType) {
        params.set('filters[type][$eq]', venueType);
      }
      history.replace(`${VENUE_COLLECTION_PATH}?${params.toString()}`);
    }, [history, pageTitle]);

    return (
      <Box padding={8}>
        <Loader>Φόρτωση {pageTitle.toLowerCase()}…</Loader>
        <Box paddingTop={4}>
          <Typography variant="pi" textColor="neutral600">
            Ανακατεύθυνση στη λίστα χώρων ({pageTitle})
          </Typography>
        </Box>
      </Box>
    );
  };
}
