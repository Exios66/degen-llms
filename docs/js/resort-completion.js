/** Resort completion tracker — room events, pool events, guest book, channels. */

import { TV_CHANNELS, ROOM_EVENTS, ensureRoomAmenities } from "./room-amenities.js";
import { POOL_EVENTS, ensurePoolComplex } from "./pool-complex.js";
import { ensureHotel } from "./hotel.js";
import { hasSigned } from "./guest-directory.js";

const TOTAL_ROOM_EVENTS = Object.keys(ROOM_EVENTS).length;
const TOTAL_POOL_EVENTS = Object.keys(POOL_EVENTS).length;
const TOTAL_TV_CHANNELS = Object.keys(TV_CHANNELS).length;

/** @param {import("./core.js").PlayerSession} session */
export function getResortCompletion(session) {
  const hotel = ensureHotel(session);
  const ra = ensureRoomAmenities(hotel);
  const pc = ensurePoolComplex(session);
  const playerName = session.playerName?.trim() || "Guest";

  const roomEvents = ra.unlockedEvents.length;
  const poolEvents = pc.unlockedEvents.length;
  const channelsWatched = ra.channelsWatched.length;
  const guestBookSigned = hasSigned(playerName);

  const items = [
    { id: "room_events", label: "Room vignettes", current: roomEvents, total: TOTAL_ROOM_EVENTS },
    { id: "pool_events", label: "Pool vignettes", current: poolEvents, total: TOTAL_POOL_EVENTS },
    { id: "tv_channels", label: "TV channels sampled", current: channelsWatched, total: TOTAL_TV_CHANNELS },
    { id: "guest_book", label: "Guest directory signed", current: guestBookSigned ? 1 : 0, total: 1 },
  ];

  const earned = items.reduce((sum, i) => sum + Math.min(i.current, i.total), 0);
  const possible = items.reduce((sum, i) => sum + i.total, 0);
  const percent = possible ? Math.round((earned / possible) * 100) : 0;

  return {
    items,
    earned,
    possible,
    percent,
    isComplete: earned >= possible,
    tagline: percent >= 100
      ? "Vegas highlight reel — complete. The sharks nod approvingly."
      : percent >= 75
        ? "Almost a Mandalay legend. One more bad decision."
        : percent >= 40
          ? "Mid-stay debauchery — respectable."
          : "The resort awaits your questionable choices.",
  };
}

/** @param {import("./core.js").PlayerSession} session */
export function maybeAutoSignGuestBook(session, playerName) {
  const hotel = ensureHotel(session);
  const ra = ensureRoomAmenities(hotel);
  if (ra.unlockedEvents.length < TOTAL_ROOM_EVENTS) return null;
  if (hasSigned(playerName)) return null;
  return {
    name: playerName,
    note: "Unlocked every in-room Vegas vignette — the bay remembers.",
  };
}
