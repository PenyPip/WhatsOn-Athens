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
              Το πεδίο «updated» ενημερώνεται χειροκίνητα από administrator. Κάθε Δευτέρα 06:00 (ώρα server)
              επανέρχεται αυτόματα σε false για όλα τα σινεμά.
            </Typography>
          </Box>
        </Box>
      </ContentLayout>
    </Layout>
  );
};

export default SyncProgramPage;
