import { useEffect, useState } from "react";
import type { HackIllinoisEvent } from "./types/Event";
import "./App.css";

function App() {
  const [events, setEvents] = useState<HackIllinoisEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedDay, setSelectedDay] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const [selectedEvent, setSelectedEvent] =
    useState<HackIllinoisEvent | null>(null);

  const [currentTime, setCurrentTime] = useState(
    Math.floor(Date.now() / 1000)
  );

  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    const savedFavorites = localStorage.getItem("favoriteEvents");

    return savedFavorites
      ? JSON.parse(savedFavorites)
      : [];
  });

  // Fetch HackIllinois events when the app first loads.
  useEffect(() => {
    async function fetchEvents() {
      try {
        const response = await fetch(
        import.meta.env.DEV
    ? "https://adonix.hackillinois.org/event/"
    : "/api/events"
);

        if (!response.ok) {
          throw new Error("Failed to fetch events");
        }

        const data = await response.json();

        setEvents(data.events);
      } catch (error) {
        console.error(error);
        setError("Unable to load events.");
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, []);

  // Persist the user's saved schedule across browser sessions.
  useEffect(() => {
    localStorage.setItem(
      "favoriteEvents",
      JSON.stringify(favoriteIds)
    );
  }, [favoriteIds]);

  // Keep live schedule information current.
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(
        Math.floor(Date.now() / 1000)
      );
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  function toggleFavorite(eventId: string) {
    setFavoriteIds((currentFavorites) =>
      currentFavorites.includes(eventId)
        ? currentFavorites.filter(
            (id) => id !== eventId
          )
        : [...currentFavorites, eventId]
    );
  }

  function formatTime(timestamp: number) {
    return new Date(
      timestamp * 1000
    ).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/Chicago",
    });
  }

  function getDayKey(timestamp: number) {
    return new Date(
      timestamp * 1000
    ).toLocaleDateString("en-US", {
      timeZone: "America/Chicago",
    });
  }

  function formatDay(timestamp: number) {
    return new Date(
      timestamp * 1000
    ).toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: "America/Chicago",
    });
  }

  function formatEventType(type: string) {
    if (type === "ALL") return "All";

    if (type === "MINIEVENT") {
      return "Mini Events";
    }

    return (
      type.charAt(0) +
      type.slice(1).toLowerCase()
    );
  }

  function getTimeStatus(
    event: HackIllinoisEvent
  ) {
    if (
      currentTime >= event.startTime &&
      currentTime < event.endTime
    ) {
      return "Happening now";
    }

    if (event.startTime <= currentTime) {
      return "";
    }

    const secondsUntil =
      event.startTime - currentTime;

    const minutesUntil = Math.floor(
      secondsUntil / 60
    );

    if (minutesUntil < 60) {
      return `Starts in ${minutesUntil} min`;
    }

    const hoursUntil = Math.floor(
      minutesUntil / 60
    );

    if (hoursUntil < 24) {
      return `Starts in ${hoursUntil} hr${
        hoursUntil === 1 ? "" : "s"
      }`;
    }

    return "";
  }

  function getConflictingEvents(
    event: HackIllinoisEvent
  ) {
    return events.filter(
      (otherEvent) =>
        otherEvent.eventId !== event.eventId &&
        favoriteIds.includes(
          otherEvent.eventId
        ) &&
        event.startTime <
          otherEvent.endTime &&
        event.endTime >
          otherEvent.startTime
    );
  }

  function clearFilters() {
    setSelectedType("ALL");
    setSearchQuery("");
    setShowFavoritesOnly(false);
  }

  function escapeICS(text: string) {
    return text
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  }

  function formatICSDate(
    timestamp: number
  ) {
    return new Date(timestamp * 1000)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z");
  }

  function addToCalendar(
    event: HackIllinoisEvent
  ) {
    const location =
      event.locations.length > 0
        ? event.locations[0].description
        : "";

    const nowTimestamp = Math.floor(
      Date.now() / 1000
    );

    const calendarData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//HackIllinois Schedule//EN
BEGIN:VEVENT
UID:${event.eventId}@hackillinois
DTSTAMP:${formatICSDate(nowTimestamp)}
DTSTART:${formatICSDate(event.startTime)}
DTEND:${formatICSDate(event.endTime)}
SUMMARY:${escapeICS(event.name)}
DESCRIPTION:${escapeICS(event.description)}
LOCATION:${escapeICS(location)}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob(
      [calendarData],
      {
        type: "text/calendar;charset=utf-8",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download = `${event.name
      .replace(/[^a-z0-9]/gi, "-")
      .toLowerCase()}.ics`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  async function shareEvent(
    event: HackIllinoisEvent
  ) {
    const location =
      event.locations.length > 0
        ? event.locations[0].description
        : "HackIllinois";

    const shareText = `${event.name}
${formatDay(
  event.startTime
)}, ${formatTime(
      event.startTime
    )} – ${formatTime(event.endTime)}
${location}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: event.name,
          text: shareText,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(
          `${shareText}\n${window.location.href}`
        );

        alert(
          "Event details copied to clipboard!"
        );
      }
    } catch (error) {
      console.error(
        "Unable to share event:",
        error
      );
    }
  }

  const eventTypes = [
    "ALL",
    ...Array.from(
      new Set(
        events.map(
          (event) => event.eventType
        )
      )
    ),
  ];

  if (loading) {
    return (
      <div className="status-screen">
        <div className="loader" />

        <p>Loading the schedule...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="status-screen">
        <h2>Something went wrong</h2>

        <p>{error}</p>
      </div>
    );
  }

  const sortedEvents = [...events].sort(
    (a, b) =>
      a.startTime - b.startTime
  );

  const days = Array.from(
    new Set(
      sortedEvents.map((event) =>
        getDayKey(event.startTime)
      )
    )
  );

  const activeDay =
    selectedDay || days[0];

  const visibleEvents =
    sortedEvents.filter(
      (event) =>
        getDayKey(event.startTime) ===
        activeDay
    );

  const happeningNow =
    visibleEvents.find(
      (event) =>
        currentTime >=
          event.startTime &&
        currentTime < event.endTime
    );

  const upNext =
    visibleEvents.find(
      (event) =>
        event.startTime > currentTime
    );

  const spotlightEvent =
    happeningNow ||
    upNext ||
    visibleEvents[0];

  const spotlightLabel =
    happeningNow
      ? "● HAPPENING NOW"
      : upNext
        ? "UP NEXT"
        : `FIRST UP ${
            spotlightEvent
              ? formatDay(
                  spotlightEvent.startTime
                ).toUpperCase()
              : ""
          }`;

  // Derive displayed events from the user's filters.
  const filteredEvents =
    visibleEvents.filter((event) => {
      const matchesType =
        selectedType === "ALL" ||
        event.eventType ===
          selectedType;

      const query =
        searchQuery.toLowerCase();

      const matchesSearch =
        event.name
          .toLowerCase()
          .includes(query) ||
        event.description
          .toLowerCase()
          .includes(query) ||
        event.sponsor
          .toLowerCase()
          .includes(query) ||
        event.locations.some(
          (location) =>
            location.description
              .toLowerCase()
              .includes(query)
        );

      const matchesFavorites =
        !showFavoritesOnly ||
        favoriteIds.includes(
          event.eventId
        );

      return (
        matchesType &&
        matchesSearch &&
        matchesFavorites
      );
    });

  return (
    <main className="app">
      <div className="ocean-glow ocean-glow-one" />
      <div className="ocean-glow ocean-glow-two" />

      <div className="page-container">
        {/* Header */}
        <header className="hero">
          <p className="eyebrow">
            HACKILLINOIS
          </p>

          <h1>
            Dive Into Your
            <span> Schedule</span>
          </h1>

          <p className="hero-description">
            Explore events, discover
            workshops, and build your
            perfect HackIllinois weekend.
          </p>
        </header>

        {/* Day navigation */}
        <nav className="day-tabs">
          {days.map((day) => {
            const exampleEvent =
              sortedEvents.find(
                (event) =>
                  getDayKey(
                    event.startTime
                  ) === day
              );

            if (!exampleEvent) {
              return null;
            }

            return (
              <button
                type="button"
                key={day}
                className={
                  activeDay === day
                    ? "day-tab active"
                    : "day-tab"
                }
                onClick={() =>
                  setSelectedDay(day)
                }
              >
                {formatDay(
                  exampleEvent.startTime
                )}
              </button>
            );
          })}
        </nav>

        {/* Current / upcoming event */}
        {spotlightEvent && (
          <section
            className="spotlight"
            onClick={() =>
              setSelectedEvent(
                spotlightEvent
              )
            }
          >
            <div>
              <p className="spotlight-label">
                {spotlightLabel}
              </p>

              <h2>
                {spotlightEvent.name}
              </h2>

              <div className="spotlight-meta">
                <span>
                  {formatTime(
                    spotlightEvent.startTime
                  )}{" "}
                  –{" "}
                  {formatTime(
                    spotlightEvent.endTime
                  )}
                </span>

                {spotlightEvent
                  .locations.length >
                  0 && (
                  <span>
                    📍{" "}
                    {
                      spotlightEvent
                        .locations[0]
                        .description
                    }
                  </span>
                )}
              </div>
            </div>

            <span className="spotlight-arrow">
              →
            </span>
          </section>
        )}

        {/* Search + filters */}
        <section className="controls">
          <div className="search-wrapper">
            <span className="search-icon">
              ⌕
            </span>

            <input
              className="search-input"
              type="text"
              placeholder="Search events, locations, sponsors..."
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(
                  event.target.value
                )
              }
            />
          </div>

          <div className="filter-row">
            {eventTypes.map((type) => (
              <button
                type="button"
                key={type}
                className={
                  selectedType === type
                    ? "filter-chip active"
                    : "filter-chip"
                }
                onClick={() =>
                  setSelectedType(type)
                }
              >
                {formatEventType(type)}
              </button>
            ))}

            {(selectedType !== "ALL" ||
              searchQuery !== "" ||
              showFavoritesOnly) && (
              <button
                type="button"
                className="clear-filter"
                onClick={clearFilters}
              >
                Clear filters ×
              </button>
            )}
          </div>

          <div className="schedule-toggle">
            <button
              type="button"
              className={
                !showFavoritesOnly
                  ? "schedule-option active"
                  : "schedule-option"
              }
              onClick={() =>
                setShowFavoritesOnly(
                  false
                )
              }
            >
              All Events
            </button>

            <button
              type="button"
              className={
                showFavoritesOnly
                  ? "schedule-option active"
                  : "schedule-option"
              }
              onClick={() =>
                setShowFavoritesOnly(
                  true
                )
              }
            >
              ★ My Schedule
            </button>
          </div>
        </section>

        {/* Event heading */}
        <div className="schedule-heading">
          <div>
            <p className="schedule-label">
              YOUR DAY
            </p>

            <h2>
              {activeDay &&
                (() => {
                  const event =
                    sortedEvents.find(
                      (item) =>
                        getDayKey(
                          item.startTime
                        ) ===
                        activeDay
                    );

                  return event
                    ? formatDay(
                        event.startTime
                      )
                    : "";
                })()}
            </h2>
          </div>

          <span className="event-count">
            {filteredEvents.length}{" "}
            {filteredEvents.length === 1
              ? "event"
              : "events"}
          </span>
        </div>

        {/* Events */}
        {filteredEvents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              ≈
            </div>

            <h2>No events found</h2>

            <p>
              Try changing your search or
              filters.
            </p>
          </div>
        ) : (
          <div className="event-grid">
            {filteredEvents.map(
              (event) => {
                const conflicts =
                  getConflictingEvents(
                    event
                  );

                const timeStatus =
                  getTimeStatus(event);

                return (
                  <article
                    className="event-card"
                    key={event.eventId}
                    onClick={() =>
                      setSelectedEvent(
                        event
                      )
                    }
                  >
                    <div className="event-card-top">
                      <div>
                        <p className="event-time">
                          {formatTime(
                            event.startTime
                          )}{" "}
                          –{" "}
                          {formatTime(
                            event.endTime
                          )}
                        </p>

                        <div className="event-badges">
                          <span className="event-type">
                            {formatEventType(
                              event.eventType
                            )}
                          </span>

                          {timeStatus && (
                            <span className="time-status">
                              {timeStatus}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        className={
                          favoriteIds.includes(
                            event.eventId
                          )
                            ? "favorite-button active"
                            : "favorite-button"
                        }
                        aria-label="Toggle favorite"
                        onClick={(
                          clickEvent
                        ) => {
                          clickEvent.stopPropagation();

                          toggleFavorite(
                            event.eventId
                          );
                        }}
                      >
                        {favoriteIds.includes(
                          event.eventId
                        )
                          ? "★"
                          : "☆"}
                      </button>
                    </div>

                    <h3>{event.name}</h3>

                    {event.locations.length >
                      0 && (
                      <p className="event-location">
                        📍{" "}
                        {
                          event
                            .locations[0]
                            .description
                        }
                      </p>
                    )}

                    {event.sponsor && (
                      <p className="sponsor-badge">
                        Sponsored by{" "}
                        {event.sponsor}
                      </p>
                    )}

                    {favoriteIds.includes(
                      event.eventId
                    ) &&
                      conflicts.length >
                        0 && (
                        <div className="conflict-warning">
                          ⚠ Conflicts with{" "}
                          {
                            conflicts[0]
                              .name
                          }
                        </div>
                      )}

                    <p className="event-description">
                      {event.description}
                    </p>

                    <div className="event-footer">
                      <span>
                        View details
                      </span>

                      <span>→</span>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </div>

      {/* Event modal */}
      {selectedEvent && (
        <div
          className="modal-overlay"
          onClick={() =>
            setSelectedEvent(null)
          }
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="modal-close"
              onClick={() =>
                setSelectedEvent(null)
              }
            >
              ✕
            </button>

            <span className="modal-type">
              {formatEventType(
                selectedEvent.eventType
              )}
            </span>

            {getTimeStatus(
              selectedEvent
            ) && (
              <span className="modal-time-status">
                {getTimeStatus(
                  selectedEvent
                )}
              </span>
            )}

            <h2>
              {selectedEvent.name}
            </h2>

            <div className="modal-meta">
              <p>
                {formatDay(
                  selectedEvent.startTime
                )}{" "}
                •{" "}
                {formatTime(
                  selectedEvent.startTime
                )}{" "}
                –{" "}
                {formatTime(
                  selectedEvent.endTime
                )}
              </p>

              {selectedEvent.locations
                .length > 0 && (
                <p>
                  📍{" "}
                  {
                    selectedEvent
                      .locations[0]
                      .description
                  }
                </p>
              )}

              {selectedEvent.sponsor && (
                <p>
                  Sponsored by{" "}
                  {
                    selectedEvent.sponsor
                  }
                </p>
              )}
            </div>

            <p className="modal-description">
              {selectedEvent.description}
            </p>

            {selectedEvent.mapImageUrl && (
              <div className="modal-map">
                <p className="modal-section-label">
                  VENUE MAP
                </p>

                <img
                  src={
                    selectedEvent.mapImageUrl
                  }
                  alt={`Map for ${selectedEvent.name}`}
                />
              </div>
            )}

            {favoriteIds.includes(
              selectedEvent.eventId
            ) &&
              getConflictingEvents(
                selectedEvent
              ).length > 0 && (
                <div className="modal-conflict">
                  <strong>
                    ⚠ Schedule conflict
                  </strong>

                  <p>
                    This overlaps with{" "}
                    {
                      getConflictingEvents(
                        selectedEvent
                      )[0].name
                    }
                    .
                  </p>
                </div>
              )}

            <div className="modal-actions">
              <button
                type="button"
                onClick={() =>
                  addToCalendar(
                    selectedEvent
                  )
                }
              >
                + Add to Calendar
              </button>

              <button
                type="button"
                onClick={() =>
                  shareEvent(
                    selectedEvent
                  )
                }
              >
                ↗ Share Event
              </button>
            </div>

            <button
              type="button"
              className="modal-favorite"
              onClick={() =>
                toggleFavorite(
                  selectedEvent.eventId
                )
              }
            >
              {favoriteIds.includes(
                selectedEvent.eventId
              )
                ? "★ Remove from My Schedule"
                : "☆ Add to My Schedule"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;