import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@strapi/design-system';

function formatSyncProgressAge(iso) {
  if (!iso) return null;
  const sec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 5) return 'μόλις τώρα';
  if (sec < 60) return `πριν ${sec}s`;
  const min = Math.floor(sec / 60);
  return min === 1 ? 'πριν 1 λεπ.' : `πριν ${min} λεπ.`;
}

/**
 * Μόνο αυτό το component κάνει tick κάθε 1s — όχι ολόκληρο το App.
 */
export function SyncProgressBanner({ progress, progressAt, active }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [active]);

  if (!active || !progress) return null;

  return (
    <Box paddingTop={3}>
      <Typography variant="pi" textColor="primary700" fontWeight="semiBold">
        {progress}
      </Typography>
      <Typography variant="pi" textColor="neutral500" paddingTop={1}>
        Τρέχει σε worker στο background (10–20+ λεπτά). Η πρόοδος ενημερώνεται κάθε
        ~1 δευτερόλεπτο
        {progressAt ? ` · ${formatSyncProgressAge(progressAt)}` : ''}.
      </Typography>
    </Box>
  );
}
