import React from 'react';
import { Box, Typography } from '@strapi/design-system';
import { Layout, HeaderLayout, ContentLayout } from '@strapi/design-system';

const SyncProgramPage = () => {
  return (
    <Layout>
      <HeaderLayout
        title="Αυτόματος έλεγχος (ανενεργός)"
        subtitle="Ο αυτόματος έλεγχος προγράμματος έχει καταργηθεί."
      />
      <ContentLayout>
        <Box padding={6} background="neutral0" shadow="filterShadow" hasRadius>
          <Typography variant="omega" textColor="neutral600">
            Δεν γίνεται πλέον κανένας αυτόματος έλεγχος/συγχρονισμός από link και δεν ενημερώνονται αυτόματα
            πεδία προγράμματος.
          </Typography>
          <Box paddingTop={4}>
            <Typography>
              Το πεδίο «updated» (σινεμά) ενημερώνεται από τον More sync και χειροκίνητα από administrator:
            </Typography>
            <Box paddingTop={2}>
              <Typography variant="pi" textColor="neutral600">
                · <strong>no_new</strong> — δεν έχουν μπει ακόμα οι προβολές της εβδομάδας-στόχου
                <br />
                · <strong>complete</strong> — όλες οι προβολές της εβδομάδας-στόχου πέρασαν από More sync
                <br />
                · <strong>needs_manual</strong> — κάποιες προβολές δεν πέρασαν (λείπουν ταινίες, mismatch venue κ.λπ.)
                <br />
                Εβδομάδα-στόχος: <strong>Πέμπτη–Κυριακή</strong> = τρέχουσα κινηματογραφική εβδομάδα ·{' '}
                <strong>Δευτέρα–Τετάρτη</strong> = επόμενη.
                <br />
                Κάθε <strong>Σάββατο 06:00</strong> όλα επανέρχονται σε <strong>no_new</strong>.
              </Typography>
            </Box>
          </Box>
        </Box>
      </ContentLayout>
    </Layout>
  );
};

export default SyncProgramPage;
