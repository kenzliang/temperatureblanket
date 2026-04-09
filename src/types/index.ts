export interface Location {
  id: string;
  name: string;
  state: string;
  lat: number;
  lon: number;
}

// Shape returned by GET /api/checks?date=YYYY-MM-DD
export interface CheckApiRow {
  person: {
    id: string;
    name: string;
    location: Location;
  };
  completed: boolean;
}

// Shape returned by GET /api/weather?date=YYYY-MM-DD
export interface WeatherApiRow {
  id: string;
  date: string;
  locationId: string;
  location: Location;
  highTempF: number | null;
  precipIn: number;
  snowfallCm: number;
  rained: boolean;
  snowed: boolean;
}

// DB row shape for use in server-side library code
export interface DbLocation {
  id: string;
  name: string;
  state: string;
  lat: number;
  lon: number;
}

// Shape returned by GET /api/stats?year=YYYY
export interface DaySummary {
  date: string;
  totalPeople: number;
  completedCount: number;
  hasWeather: boolean;
  avgTempF: number | null;
}

export interface PersonProgress {
  personId: string;
  personName: string;
  locationName: string;
  completedDays: number;
  totalDays: number;
}

export interface StatsResponse {
  calendar: DaySummary[];
  progress: PersonProgress[];
}
