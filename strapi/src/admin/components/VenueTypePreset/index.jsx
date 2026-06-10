import React, { useEffect, useRef } from 'react';
import { useCMEditViewDataManager } from '@strapi/helper-plugin';

const STORAGE_KEY = 'whatson-venue-type-filter';

class VenueTypePresetBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.warn('[whatson] VenueTypePreset disabled:', error);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

/**
 * Όταν δημιουργείς χώρο από «Σινεμά» / «Θέατρα» στο μενού, προεπιλέγει το πεδίο type.
 */
function VenueTypePresetInner() {
  const { slug, isCreatingEntry, modifiedData, onChange } = useCMEditViewDataManager();
  const applied = useRef(false);

  useEffect(() => {
    if (slug !== 'api::venue.venue' || !isCreatingEntry || applied.current) return;

    const preset = sessionStorage.getItem(STORAGE_KEY);
    if (!preset || !['cinema', 'theater', 'other'].includes(preset)) return;
    if (modifiedData?.type) {
      applied.current = true;
      return;
    }

    onChange({ target: { name: 'type', value: preset } });
    applied.current = true;
  }, [slug, isCreatingEntry, modifiedData?.type, onChange]);

  return null;
}

export default function VenueTypePreset() {
  return (
    <VenueTypePresetBoundary>
      <VenueTypePresetInner />
    </VenueTypePresetBoundary>
  );
}
