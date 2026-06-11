import { useEffect, useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

type TimerMode = "Focus" | "Short Break" | "Long Break";

const modeDurations: Record<TimerMode, number> = {
  Focus: 60 * 60,
  "Short Break": 5 * 60,
  "Long Break": 15 * 60,
};

const timerModes: TimerMode[] = ["Focus", "Short Break", "Long Break"];

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function HomeScreen() {
  const [selectedMode, setSelectedMode] = useState<TimerMode>("Focus");
  const [secondsLeft, setSecondsLeft] = useState(modeDurations.Focus);
  const [isRunning, setIsRunning] = useState(false);
  const [completedFocusSessions, setCompletedFocusSessions] = useState(0);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const intervalId = setInterval(() => {
      setSecondsLeft((currentSeconds) => {
        if (currentSeconds <= 1) {
          setIsRunning(false);

          if (selectedMode === "Focus") {
            setCompletedFocusSessions((currentCount) => currentCount + 1);
          }

          return 0;
        }

        return currentSeconds - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isRunning, selectedMode]);

  function selectMode(mode: TimerMode) {
    setSelectedMode(mode);
    setSecondsLeft(modeDurations[mode]);
    setIsRunning(false);
  }

  function resetTimer() {
    setSecondsLeft(modeDurations[selectedMode]);
    setIsRunning(false);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        <Text style={styles.title}>Focus Timer</Text>
        <Text style={styles.subtitle}>
          Completed focus sessions: {completedFocusSessions}
        </Text>

        <View style={styles.modeRow}>
          {timerModes.map((mode) => {
            const isSelected = mode === selectedMode;

            return (
              <Pressable
                key={mode}
                style={[
                  styles.modeButton,
                  isSelected && styles.selectedModeButton,
                ]}
                onPress={() => selectMode(mode)}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    isSelected && styles.selectedModeButtonText,
                  ]}
                >
                  {mode}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.timerCircle}>
          <Text style={styles.modeLabel}>{selectedMode}</Text>
          <Text style={styles.timerText}>{formatTime(secondsLeft)}</Text>
        </View>

        <View style={styles.buttonRow}>
          <Pressable
            style={[styles.actionButton, styles.startButton]}
            onPress={() => setIsRunning(true)}
          >
            <Text style={styles.actionButtonText}>Start</Text>
          </Pressable>

          <Pressable
            style={styles.actionButton}
            onPress={() => setIsRunning(false)}
          >
            <Text style={styles.actionButtonText}>Pause</Text>
          </Pressable>

          <Pressable style={styles.actionButton} onPress={resetTimer}>
            <Text style={styles.actionButtonText}>Reset</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F6F7F9",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#18212F",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#667085",
    marginBottom: 32,
  },
  modeRow: {
    width: "100%",
    flexDirection: "row",
    gap: 8,
    marginBottom: 40,
  },
  modeButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D0D5DD",
  },
  selectedModeButton: {
    backgroundColor: "#2F6FED",
    borderColor: "#2F6FED",
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#344054",
  },
  selectedModeButtonText: {
    color: "#FFFFFF",
  },
  timerCircle: {
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
    borderWidth: 8,
    borderColor: "#D7E3FF",
  },
  modeLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2F6FED",
    marginBottom: 10,
  },
  timerText: {
    fontSize: 56,
    fontWeight: "700",
    color: "#18212F",
  },
  buttonRow: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#344054",
  },
  startButton: {
    backgroundColor: "#2F6FED",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
