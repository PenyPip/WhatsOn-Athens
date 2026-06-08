import { useEffect } from 'react';
import { useHistory } from 'react-router-dom';

const VENUE_COLLECTION_PATH = '/content-manager/collection-types/api::venue.venue';

/**
 * Ανακατεύθυνση στη λίστα χώρων με προεπιλεγμένο φίλτρο τύπου (cinema / theater).
 * @param {string | null} venueType
 */
export function createVenueListRedirect(venueType) {
  return function VenueListRedirect() {
    const history = useHistory();

    useEffect(() => {
      const params = new URLSearchParams({
        page: '1',
        pageSize: '25',
        sort: 'name:ASC',
      });
      if (venueType) {
        params.set('filters[type][$eq]', venueType);
      }
      history.replace(`${VENUE_COLLECTION_PATH}?${params.toString()}`);
    }, [history]);

    return null;
  };
}
