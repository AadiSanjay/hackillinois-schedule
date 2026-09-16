export interface EventLocation {
  description: string;
  latitude: number;
  longitude: number;
}

export interface HackIllinoisEvent {
  eventId: string;
  name: string;
  description: string;
  startTime: number;
  endTime: number;
  eventType: string;
  locations: EventLocation[];
  sponsor: string;
  isAsync: boolean;
  mapImageUrl?: string | null;
}
