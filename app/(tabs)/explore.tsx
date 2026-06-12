import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

import { useSessionHistory } from "@/app/session-history";

type ActivitySummary = {
  activityName: string;
  activityColor: string;
  totalSeconds: number;
  sessionCount: number;
};

function formatSessionDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function formatClockTime(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function HistoryScreen() {
  const { breakSeconds, sessions } = useSessionHistory();
  const todayLabel = new Date().toDateString();
  const totalFocusSeconds = sessions.reduce(
    (totalSeconds, session) => totalSeconds + session.durationSeconds,
    0,
  );
  const focusSecondsToday = sessions
    .filter((session) => session.startTime.toDateString() === todayLabel)
    .reduce((totalSeconds, session) => totalSeconds + session.durationSeconds, 0);
  const activitySummaries = sessions.reduce<ActivitySummary[]>((summaries, session) => {
    const existingSummary = summaries.find(
      (summary) => summary.activityName === session.activityName,
    );

    if (existingSummary) {
      existingSummary.totalSeconds += session.durationSeconds;
      existingSummary.sessionCount += 1;
      return summaries;
    }

    return [
      ...summaries,
      {
        activityName: session.activityName,
        activityColor: session.activityColor,
        totalSeconds: session.durationSeconds,
        sessionCount: 1,
      },
    ];
  }, []);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>History</Text>
          <Text style={styles.subtitle}>Totals, activities, and completed focus sessions</Text>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Focus Time</Text>
            <Text style={styles.summaryValue}>{formatSessionDuration(totalFocusSeconds)}</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Focus Time Today</Text>
            <Text style={styles.summaryValue}>{formatSessionDuration(focusSecondsToday)}</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Break Time</Text>
            <Text style={styles.summaryValue}>{formatSessionDuration(breakSeconds)}</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Sessions</Text>
            <Text style={styles.summaryValue}>{sessions.length}</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Activity Summary</Text>
          {activitySummaries.length === 0 ? (
            <Text style={styles.emptySectionText}>Activity totals will appear here.</Text>
          ) : (
            <View style={styles.activityList}>
              {activitySummaries.map((summary) => (
                <View key={summary.activityName} style={styles.activitySummaryRow}>
                  <View style={styles.activitySummaryTitleRow}>
                    <View
                      style={[
                        styles.activityDot,
                        { backgroundColor: summary.activityColor },
                      ]}
                    />
                    <View>
                      <Text style={styles.activityName}>{summary.activityName}</Text>
                      <Text style={styles.activityMeta}>
                        {summary.sessionCount} {summary.sessionCount === 1 ? "session" : "sessions"}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.durationText}>
                    {formatSessionDuration(summary.totalSeconds)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {sessions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No sessions yet</Text>
            <Text style={styles.emptyText}>Complete a focus session to see your history.</Text>
          </View>
        ) : (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Completed Sessions</Text>
            <View style={styles.list}>
            {sessions.map((session) => (
              <View
                key={session.id}
                style={[
                  styles.sessionCard,
                  { borderLeftColor: session.activityColor },
                ]}
              >
                <View style={styles.sessionTopRow}>
                  <View style={styles.activityTitleRow}>
                    <View
                      style={[
                        styles.activityDot,
                        { backgroundColor: session.activityColor },
                      ]}
                    />
                    <Text style={styles.activityName}>{session.activityName}</Text>
                  </View>
                  <Text style={styles.durationText}>
                    {formatSessionDuration(session.durationSeconds)}
                  </Text>
                </View>

                <Text style={styles.dateText}>{session.dateLabel}</Text>

                <View style={styles.timeRow}>
                  <View style={styles.timeBlock}>
                    <Text style={styles.timeLabel}>Start</Text>
                    <Text style={styles.timeValue}>{formatClockTime(session.startTime)}</Text>
                  </View>
                  <View style={styles.timeDivider} />
                  <View style={styles.timeBlock}>
                    <Text style={styles.timeLabel}>End</Text>
                    <Text style={styles.timeValue}>{formatClockTime(session.endTime)}</Text>
                  </View>
                </View>
              </View>
            ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#030507",
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 18,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 6,
  },
  subtitle: {
    color: "#9BA4B0",
    fontSize: 14,
    fontWeight: "600",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 14,
  },
  summaryCard: {
    width: "48%",
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#10151C",
    borderWidth: 1,
    borderColor: "#232D38",
  },
  summaryLabel: {
    color: "#9BA4B0",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 10,
  },
  summaryValue: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },
  sectionCard: {
    borderRadius: 24,
    padding: 16,
    backgroundColor: "#10151C",
    borderWidth: 1,
    borderColor: "#232D38",
    marginBottom: 14,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 14,
  },
  emptySectionText: {
    color: "#9BA4B0",
    fontSize: 14,
    lineHeight: 20,
  },
  emptyCard: {
    borderRadius: 24,
    padding: 22,
    backgroundColor: "#10151C",
    borderWidth: 1,
    borderColor: "#232D38",
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
  },
  emptyText: {
    color: "#9BA4B0",
    fontSize: 14,
    lineHeight: 20,
  },
  list: {
    gap: 12,
  },
  activityList: {
    gap: 10,
  },
  activitySummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 18,
    padding: 14,
    backgroundColor: "#151B23",
    borderWidth: 1,
    borderColor: "#26313D",
  },
  activitySummaryTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 12,
  },
  activityMeta: {
    color: "#9BA4B0",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  sessionCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: "#10151C",
    borderWidth: 1,
    borderColor: "#232D38",
    borderLeftWidth: 4,
    shadowColor: "#0BAF9A",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  sessionTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  activityName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  activityTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 12,
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  durationText: {
    color: "#BDFB5A",
    fontSize: 16,
    fontWeight: "800",
  },
  dateText: {
    color: "#9BA4B0",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 16,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    padding: 14,
    backgroundColor: "#151B23",
    borderWidth: 1,
    borderColor: "#26313D",
  },
  timeBlock: {
    flex: 1,
  },
  timeDivider: {
    width: 1,
    height: 34,
    backgroundColor: "#2A3442",
    marginHorizontal: 14,
  },
  timeLabel: {
    color: "#9BA4B0",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },
  timeValue: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
