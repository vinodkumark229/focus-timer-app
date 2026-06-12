import { createContext, PropsWithChildren, useCallback, useContext, useMemo, useState } from "react";

export type Activity = {
  id: string;
  name: string;
  color: string;
};

export type FocusSession = {
  id: string;
  activityName: string;
  activityColor: string;
  startTime: Date;
  endTime: Date;
  durationSeconds: number;
  durationMinutes: number;
  dateLabel: string;
  mode: "Focus";
};

type SessionHistoryContextValue = {
  activities: Activity[];
  sessions: FocusSession[];
  breakSeconds: number;
  addActivity: (name: string) => Activity | null;
  addBreakSeconds: (seconds: number) => void;
  addSession: (session: FocusSession) => void;
};

const defaultActivities: Activity[] = [
  { id: "deep-work", name: "Deep Work", color: "#5EF4CE" },
  { id: "learning", name: "Learning", color: "#8EA7FF" },
  { id: "gym", name: "Gym", color: "#F28C64" },
];

const customActivityColors = ["#BDFB5A", "#7DF9FF", "#C084FC", "#F472B6", "#60A5FA"];

function createActivityId(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

const SessionHistoryContext = createContext<SessionHistoryContextValue | null>(null);

export function SessionHistoryProvider({ children }: PropsWithChildren) {
  const [activities, setActivities] = useState<Activity[]>(defaultActivities);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [breakSeconds, setBreakSeconds] = useState(0);

  const addActivity = useCallback((name: string) => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      return null;
    }

    const existingActivity = activities.find(
      (activity) => activity.name.toLowerCase() === trimmedName.toLowerCase(),
    );

    if (existingActivity) {
      return existingActivity;
    }

    const customActivityCount = Math.max(0, activities.length - defaultActivities.length);
    const activity: Activity = {
      id: `${createActivityId(trimmedName)}-${Date.now()}`,
      name: trimmedName,
      color: customActivityColors[customActivityCount % customActivityColors.length],
    };

    setActivities((currentActivities) => [...currentActivities, activity]);

    return activity;
  }, [activities]);

  const addSession = useCallback((session: FocusSession) => {
    setSessions((currentSessions) => [session, ...currentSessions]);
  }, []);

  const addBreakSeconds = useCallback((seconds: number) => {
    setBreakSeconds((currentSeconds) => currentSeconds + seconds);
  }, []);

  const value = useMemo(
    () => ({
      activities,
      sessions,
      breakSeconds,
      addActivity,
      addBreakSeconds,
      addSession,
    }),
    [activities, addActivity, addBreakSeconds, addSession, breakSeconds, sessions],
  );

  return (
    <SessionHistoryContext.Provider value={value}>
      {children}
    </SessionHistoryContext.Provider>
  );
}

export function useSessionHistory() {
  const context = useContext(SessionHistoryContext);

  if (!context) {
    throw new Error("useSessionHistory must be used inside SessionHistoryProvider");
  }

  return context;
}
