import { startOfWeek } from "@/lib/week";

export type AnalyticsWindow = 4 | 12;

export type SessionLike = {
  date: string;
  dayName: string;
  durationMs: number;
  completedSets: number;
  totalSets: number;
};

export type CardioEntryLike = {
  date: string;
  minutes: number;
};

export type WorkoutAnalytics = {
  windowWeeks: number;
  sessionsCount: number;
  expectedSessions: number;
  adherencePercent: number;
  averageDurationMs: number;
  cardioMinutesDone: number;
  cardioMinutesGoal: number;
  muscleGroupFrequency: { name: string; count: number }[];
};

const SESSIONS_PER_WEEK = 5;

function windowStart(weeks: number, today = new Date()): Date {
  const start = startOfWeek(today);
  start.setDate(start.getDate() - (weeks - 1) * 7);
  return start;
}

export function computeWorkoutAnalytics(
  sessions: SessionLike[],
  cardioEntries: CardioEntryLike[],
  resolveCardioGoal: (weekStartISO: string) => number,
  weeks: AnalyticsWindow,
  today = new Date()
): WorkoutAnalytics {
  const start = windowStart(weeks, today);

  const inWindow = sessions.filter((s) => new Date(s.date) >= start);
  const sessionsCount = inWindow.length;
  const expectedSessions = weeks * SESSIONS_PER_WEEK;
  const adherencePercent = expectedSessions > 0 ? (sessionsCount / expectedSessions) * 100 : 0;
  const averageDurationMs =
    inWindow.length > 0 ? inWindow.reduce((acc, s) => acc + s.durationMs, 0) / inWindow.length : 0;

  const cardioInWindow = cardioEntries.filter((e) => new Date(`${e.date}T12:00:00`) >= start);
  const cardioMinutesDone = cardioInWindow.reduce((acc, e) => acc + e.minutes, 0);

  let cardioMinutesGoal = 0;
  const cursor = new Date(start);
  const todayWeekStart = startOfWeek(today);
  while (cursor <= todayWeekStart) {
    cardioMinutesGoal += resolveCardioGoal(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 7);
  }

  const freqMap = new Map<string, number>();
  for (const s of inWindow) {
    freqMap.set(s.dayName, (freqMap.get(s.dayName) ?? 0) + 1);
  }
  const muscleGroupFrequency = Array.from(freqMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return {
    windowWeeks: weeks,
    sessionsCount,
    expectedSessions,
    adherencePercent,
    averageDurationMs,
    cardioMinutesDone,
    cardioMinutesGoal,
    muscleGroupFrequency,
  };
}
