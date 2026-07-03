// server/db/calendarEventsRepository.ts

import { query } from './client';

export interface CalendarEventRow {
  userId: string;
  provider: 'synkros' | 'google' | 'outlook' | 'apple';
  externalEventId: string | null;
  title: string;
  startTime: Date;
  endTime: Date;
  type: 'FIXED' | 'FLEXIBLE' | 'BUFFER';
  locationLat?: number | null;
  locationLng?: number | null;
  locationLabel?: string | null;
}

/**
 * Upsert idempotente: sincronizar el mismo evento externo múltiples veces
 * (cada webhook trigger, cada full sync) nunca genera duplicados -- la
 * unicidad de (user_id, provider, external_event_id) en el schema se
 * encarga de eso.
 */
export async function upsertCalendarEvent(event: CalendarEventRow): Promise<void> {
  await query(
    `insert into calendar_events
       (user_id, provider, external_event_id, title, start_time, end_time, type,
        location_lat, location_lng, location_label, last_synced_at, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), now())
     on conflict (user_id, provider, external_event_id) do update set
       title          = excluded.title,
       start_time     = excluded.start_time,
       end_time       = excluded.end_time,
       location_lat   = excluded.location_lat,
       location_lng   = excluded.location_lng,
       location_label = excluded.location_label,
       last_synced_at = now(),
       updated_at     = now()`,
    [
      event.userId,
      event.provider,
      event.externalEventId,
      event.title,
      event.startTime,
      event.endTime,
      event.type,
      event.locationLat ?? null,
      event.locationLng ?? null,
      event.locationLabel ?? null,
    ]
  );
}

export async function getNextFixedEvent(
  userId: string,
  afterTime: Date
): Promise<CalendarEventRow | null> {
  const rows = await query<any>(
    `select user_id as "userId", provider, external_event_id as "externalEventId",
            title, start_time as "startTime", end_time as "endTime", type,
            location_lat as "locationLat", location_lng as "locationLng", location_label as "locationLabel"
     from calendar_events
     where user_id = $1 and type = 'FIXED' and start_time > $2
     order by start_time asc
     limit 1`,
    [userId, afterTime]
  );
  return rows[0] ?? null;
}
