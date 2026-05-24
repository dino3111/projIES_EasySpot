package pt.ua.deti.apieasyspot.occupancy.model;

/**
 * Operational status of a parking lot.
 *
 * Business rules:
 *  - ACTIVE    : Park is fully operational. Visible to drivers in search results,
 *                visible on the map, and accepts new reservations.
 *  - SUSPENDED : Park is suspended (e.g. maintenance, safety inspection, sensor failures).
 *                Hidden from driver-facing search and map, does NOT accept new reservations.
 *                Existing confirmed reservations remain valid and are honoured.
 *                Only managers and technicians can see the park and its status.
 *
 * Transitions:
 *  - ACTIVE    → SUSPENDED : Manager suspends the park.
 *  - SUSPENDED → ACTIVE    : Manager reactivates the park.
 *
 * Default: ACTIVE (all seeded parks start operational).
 */
public enum ParkStatus {
    ACTIVE,
    SUSPENDED
}
