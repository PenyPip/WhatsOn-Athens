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
                · <strong>no_new</strong> — δεν βρέθηκαν καινούργιες προβολές
                <br />
                · <strong>complete</strong> — νέες προβολές και πλήρης συγχρονισμός
                <br />
                · <strong>needs_manual</strong> — απαιτεί χειροκίνητη δουλειά (λείπουν ταινίες, νέο
                auto-create σινεμά κ.λπ.)
                <br />
                Κάθε Δευτέρα 06:00 επανέρχεται σε <strong>no_new</strong>.
              </Typography>
            </Box>
          </Box>
        </Box>
      </ContentLayout>
    </Layout>
  );
};

export default SyncProgramPage;
