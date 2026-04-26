"use strict";

function extractRelationId(value) {
  if (value === null) return null;
  if (value === undefined) return undefined;

  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  if (typeof value === "object") {
    if ("id" in value && value.id != null) {
      const parsed = Number(value.id);
      return Number.isNaN(parsed) ? undefined : parsed;
    }

    if (Array.isArray(value.set)) {
      if (value.set.length === 0) return null;
      const first = value.set[0];
      if (first && typeof first === "object" && "id" in first) {
        const parsed = Number(first.id);
        return Number.isNaN(parsed) ? undefined : parsed;
      }
    }

    if (Array.isArray(value.connect) && value.connect.length > 0) {
      const first = value.connect[0];
      if (first && typeof first === "object" && "id" in first) {
        const parsed = Number(first.id);
        return Number.isNaN(parsed) ? undefined : parsed;
      }
    }

    if (Array.isArray(value.disconnect) && value.disconnect.length > 0) {
      return null;
    }
  }

  return undefined;
}

async function getExistingShowtime(id) {
  if (!id) return null;

  return strapi.entityService.findOne("api::showtime.showtime", id, {
    populate: {
      movie: true,
      theater_show: true,
      venue: true,
      show_slots: true,
    },
  });
}

async function validateShowtimeData(event) {
  const data = event.params?.data || {};
  const where = event.params?.where;
  const showtimeId = where?.id;
  const existing = await getExistingShowtime(showtimeId);

  const movieIdFromPayload = extractRelationId(data.movie);
  const theaterShowIdFromPayload = extractRelationId(data.theater_show);
  const venueIdFromPayload = extractRelationId(data.venue);

  const movieId = movieIdFromPayload !== undefined ? movieIdFromPayload : existing?.movie?.id ?? null;
  const theaterShowId =
    theaterShowIdFromPayload !== undefined ? theaterShowIdFromPayload : existing?.theater_show?.id ?? null;
  const venueId = venueIdFromPayload !== undefined ? venueIdFromPayload : existing?.venue?.id ?? null;

  if (!venueId) {
    throw new Error("Each showtime must be assigned to a venue.");
  }

  const hasMovie = !!movieId;
  const hasTheaterShow = !!theaterShowId;

  if (!hasMovie && !hasTheaterShow) {
    throw new Error("Each showtime must be linked to either a movie or a theater show.");
  }

  if (hasMovie && hasTheaterShow) {
    throw new Error("A showtime cannot be linked to both a movie and a theater show.");
  }

  const hasShowSlots = Array.isArray(data.show_slots)
    ? data.show_slots.some((slot) => !!slot?.datetime)
    : Array.isArray(existing?.show_slots) && existing.show_slots.some((slot) => !!slot?.datetime);

  if (!hasShowSlots) {
    throw new Error("Each showtime must include at least one show slot.");
  }
}

module.exports = {
  async beforeCreate(event) {
    await validateShowtimeData(event);
  },
  async beforeUpdate(event) {
    await validateShowtimeData(event);
  },
};
