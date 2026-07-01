'use strict';

const { moreEventsApiUrl } = require('./moreApi');

const SYNC_PATH_LABELS = {
  movie_event_group: 'ταινία → event group codes',
  venue_bundle: 'χώρος σινεμά → venue bundle codes',
  theater_show_event_group: 'θεατρική παράσταση → event group codes',
  theater_venue_bundle: 'χώρος θεάτρου → venue bundle codes',
};

function eventJsonPreview(event) {
  try {
    const sample = {
      eventId: event?.eventId,
      venueId: event?.venueId,
      venueName: event?.venueName,
      eventDate: event?.eventDate,
      soldOut: event?.soldOut ?? event?.isSoldout,
    };
    const s = JSON.stringify(sample);
    return s.length > 400 ? `${s.slice(0, 400)}…` : s;
  } catch {
    return '';
  }
}

function contentMatchLines(resolution, contentKind) {
  if (!resolution) return [];
  const lines = [];
  const titleKey = contentKind === 'movie' ? 'movieTitle' : 'theaterShowTitle';
  const idKey = contentKind === 'movie' ? 'movieId' : 'theaterShowId';
  const label = contentKind === 'movie' ? 'ταινίας' : 'παράστασης';

  if (resolution.viaScrape) {
    const score =
      typeof resolution.matchScore === 'number'
        ? resolution.matchScore.toFixed(2)
        : resolution.matchScore;
    lines.push(`Ταύτιση ${label}: scrape play-title «${resolution.playTitle}» (score ${score})`);
    if (resolution.scrapeUrl) lines.push(`Scrape URL: ${resolution.scrapeUrl}`);
  } else if (resolution.viaPersisted) {
    lines.push(`Ταύτιση ${label}: cache eventId → «${resolution[titleKey]}» (#${resolution[idKey]})`);
  } else if (resolution[titleKey]) {
    lines.push(`Ταύτιση ${label}: eventId index → «${resolution[titleKey]}» (#${resolution[idKey]})`);
  }
  return lines;
}

function buildMoreImportTrace({
  syncPath,
  eventGroupCode,
  event,
  venue,
  contentResolution,
  contentKind,
}) {
  const lines = [];
  lines.push(`Πηγή: More sync — ${SYNC_PATH_LABELS[syncPath] || syncPath}`);
  if (eventGroupCode) {
    lines.push(`evg: ${eventGroupCode}`);
    lines.push(`API: ${moreEventsApiUrl(eventGroupCode)}`);
  }
  if (event?.eventId) lines.push(`eventId: ${event.eventId}`);
  if (event?.venueId) lines.push(`More venueId: ${event.venueId}`);
  if (event?.venueName) lines.push(`More χώρος: ${event.venueName}`);
  if (venue?.id) lines.push(`CMS χώρος: ${venue.name || '—'} (#${venue.id})`);

  let resolution = contentResolution;
  const moreLink = venue?.more_link || venue?.moreLink;
  if (moreLink && resolution?.viaScrape) {
    resolution = { ...resolution, scrapeUrl: moreLink };
  }
  lines.push(...contentMatchLines(resolution, contentKind));

  const json = eventJsonPreview(event);
  if (json) lines.push(`JSON: ${json}`);
  return lines.join('\n');
}

function buildRepeatExpandTrace({ sourceShowtimeId, startKey, endKey, trigger }) {
  const lines = [
    'Πηγή: Επανάληψη προβολής (repeat_expand)',
    `Πρωτότυπη προβολή: #${sourceShowtimeId}`,
    `Διάστημα: ${startKey} → ${endKey}`,
  ];
  if (trigger) lines.push(`Trigger: ${trigger}`);
  return lines.join('\n');
}

module.exports = {
  buildMoreImportTrace,
  buildRepeatExpandTrace,
};
