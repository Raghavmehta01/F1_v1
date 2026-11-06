export type DriverStanding = {
  position: string;
  points: string;
  wins: string;
  Driver: {
    driverId: string;
    givenName: string;
    familyName: string;
    code?: string;
    permanentNumber?: string;
    nationality?: string;
  };
  Constructors: Array<{
    constructorId: string;
    name: string;
    nationality?: string;
  }>;
};

export type ConstructorStanding = {
  position: string;
  points: string;
  wins: string;
  Constructor: {
    constructorId: string;
    name: string;
    nationality?: string;
  };
};

export type Race = {
  season: string;
  round: string;
  raceName: string;
  date: string;
  time?: string;
  Circuit: {
    circuitId: string;
    circuitName: string;
    Location: {
      locality: string;
      country: string;
      lat?: string;
      long?: string;
    };
  };
  Results?: RaceResult[];
  QualifyingResults?: QualifyingResult[];
};

export type RaceResult = {
  position: string;
  points: string;
  grid: string;
  status: string;
  Driver: {
    driverId: string;
    givenName: string;
    familyName: string;
    code?: string;
  };
  Constructor: {
    constructorId: string;
    name: string;
  };
  Time?: { time: string; millis?: string };
  FastestLap?: {
    rank: string;
    lap: string;
    Time?: { time: string };
  };
};

export type QualifyingResult = {
  position: string;
  Driver: {
    driverId: string;
    givenName: string;
    familyName: string;
    code?: string;
  };
  Constructor: {
    constructorId: string;
    name: string;
  };
  Q1?: string;
  Q2?: string;
  Q3?: string;
};
