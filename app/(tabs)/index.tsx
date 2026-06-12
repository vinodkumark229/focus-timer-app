import { useEffect, useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

type TimerMode = "Focus" | "Short Break" | "Long Break";

const modeDurations: Record<TimerMode, number> = {
  Focus: 60 * 60,
  "Short Break": 5 * 60,
  "Long Break": 15 * 60,
};

const timerModes: TimerMode[] = ["Focus", "Short Break", "Long Break"];
const focusDurationPresets = [15, 30, 45, 60, 90, 120];
const progressSegments = Array.from({ length: 120 }, (_, index) => index);
const minimumFocusMinutes = 1;
const maximumFocusMinutes = 180;
const focusStepMinutes = 5;

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatStatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  return `${minutes}m`;
}

export default function HomeScreen() {
  const [selectedMode, setSelectedMode] = useState<TimerMode>("Focus");
  const [focusDurationMinutes, setFocusDurationMinutes] = useState(60);
  const focusDurationSeconds = focusDurationMinutes * 60;
  const [secondsLeft, setSecondsLeft] = useState(focusDurationSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [completedFocusSessions, setCompletedFocusSessions] = useState(0);
  const [totalFocusSeconds, setTotalFocusSeconds] = useState(0);
  const [totalBreakSeconds, setTotalBreakSeconds] = useState(0);

  const currentModeDurations: Record<TimerMode, number> = {
    Focus: focusDurationSeconds,
    "Short Break": modeDurations["Short Break"],
    "Long Break": modeDurations["Long Break"],
  };

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const intervalId = setInterval(() => {
      setSecondsLeft((currentSeconds) => {
        if (currentSeconds <= 1) {
          setIsRunning(false);
          const completedDuration = currentModeDurations[selectedMode];

          if (selectedMode === "Focus") {
            setCompletedFocusSessions((currentCount) => currentCount + 1);
            setTotalFocusSeconds((currentTotal) => currentTotal + completedDuration);
          } else {
            setTotalBreakSeconds((currentTotal) => currentTotal + completedDuration);
          }

          return 0;
        }

        return currentSeconds - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [focusDurationSeconds, isRunning, selectedMode]);

  function selectMode(mode: TimerMode) {
    setSelectedMode(mode);
    setSecondsLeft(currentModeDurations[mode]);
    setIsRunning(false);
  }

  function resetTimer() {
    setSecondsLeft(currentModeDurations[selectedMode]);
    setIsRunning(false);
  }

  function updateFocusDuration(durationMinutes: number) {
    const nextDurationMinutes = Math.min(
      maximumFocusMinutes,
      Math.max(minimumFocusMinutes, durationMinutes),
    );

    setFocusDurationMinutes(nextDurationMinutes);

    if (selectedMode === "Focus") {
      setSecondsLeft(nextDurationMinutes * 60);
    }
  }

  function decreaseFocusDuration() {
    updateFocusDuration(focusDurationMinutes - focusStepMinutes);
  }

  function increaseFocusDuration() {
    updateFocusDuration(focusDurationMinutes + focusStepMinutes);
  }

  const totalSeconds = currentModeDurations[selectedMode];
  const elapsedSeconds = totalSeconds - secondsLeft;
  const ringCycleSeconds = totalSeconds > 60 ? 60 : totalSeconds;
  const secondsIntoRingCycle =
    secondsLeft === 0 ? ringCycleSeconds : elapsedSeconds % ringCycleSeconds;
  const progressPercent = secondsIntoRingCycle / ringCycleSeconds;
  const activeProgressSegments = Math.floor(progressPercent * progressSegments.length);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        <View style={styles.contentArea}>
          <View style={styles.statsCard}>
            <View style={styles.statBlock}>
              <Text style={styles.statLabel}>Total Focus</Text>
              <Text style={styles.statValue}>{formatStatDuration(totalFocusSeconds)}</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statBlock}>
              <Text style={styles.statLabel}>Break Time</Text>
              <Text style={styles.statValue}>{formatStatDuration(totalBreakSeconds)}</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statBlock}>
              <Text style={styles.statLabel}>Sessions</Text>
              <Text style={styles.sessionCount}>{completedFocusSessions}</Text>
            </View>
          </View>

          <View style={styles.timerCard}>
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

            <View style={styles.focusDurationCard}>
              <Text style={styles.focusDurationLabel}>Focus duration</Text>
              <View style={styles.durationStepper}>
                <Pressable
                  disabled={isRunning || focusDurationMinutes === minimumFocusMinutes}
                  style={({ pressed }) => [
                    styles.stepperButton,
                    (isRunning || focusDurationMinutes === minimumFocusMinutes) &&
                      styles.disabledDurationButton,
                    pressed &&
                      !isRunning &&
                      focusDurationMinutes !== minimumFocusMinutes &&
                      styles.pressedButton,
                  ]}
                  onPress={decreaseFocusDuration}
                >
                  <Text
                    style={[
                      styles.stepperButtonText,
                      (isRunning || focusDurationMinutes === minimumFocusMinutes) &&
                        styles.inactiveButtonText,
                    ]}
                  >
                    -
                  </Text>
                </Pressable>

                <View
                  style={[
                    styles.durationValueCard,
                    isRunning && styles.disabledDurationButton,
                  ]}
                >
                  <Text
                    style={[
                      styles.durationValue,
                      isRunning && styles.inactiveButtonText,
                    ]}
                  >
                    {focusDurationMinutes}
                  </Text>
                  <Text
                    style={[
                      styles.durationUnit,
                      isRunning && styles.inactiveButtonText,
                    ]}
                  >
                    min
                  </Text>
                </View>

                <Pressable
                  disabled={isRunning || focusDurationMinutes === maximumFocusMinutes}
                  style={({ pressed }) => [
                    styles.stepperButton,
                    (isRunning || focusDurationMinutes === maximumFocusMinutes) &&
                      styles.disabledDurationButton,
                    pressed &&
                      !isRunning &&
                      focusDurationMinutes !== maximumFocusMinutes &&
                      styles.pressedButton,
                  ]}
                  onPress={increaseFocusDuration}
                >
                  <Text
                    style={[
                      styles.stepperButtonText,
                      (isRunning || focusDurationMinutes === maximumFocusMinutes) &&
                        styles.inactiveButtonText,
                    ]}
                  >
                    +
                  </Text>
                </Pressable>
              </View>

              <View style={styles.presetRow}>
                {focusDurationPresets.map((durationMinutes) => {
                  const isSelected = durationMinutes === focusDurationMinutes;

                  return (
                    <Pressable
                      key={durationMinutes}
                      disabled={isRunning}
                      style={({ pressed }) => [
                        styles.presetButton,
                        isSelected && styles.selectedPresetButton,
                        isRunning && styles.disabledDurationButton,
                        pressed && !isRunning && styles.pressedButton,
                      ]}
                      onPress={() => updateFocusDuration(durationMinutes)}
                    >
                      <Text
                        style={[
                          styles.presetButtonText,
                          isSelected && styles.selectedPresetButtonText,
                          isRunning && styles.inactiveButtonText,
                        ]}
                      >
                        {durationMinutes}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.progressRing}>
              <View style={styles.progressTrack} />
              {progressSegments.map((segment) => {
                const isActive = segment < activeProgressSegments;

                return (
                  <View
                    key={segment}
                    style={[
                      styles.progressSegment,
                      isActive && styles.activeProgressSegment,
                      {
                      transform: [
                        { rotate: `${segment * 3}deg` },
                        { translateY: -128 },
                      ],
                    },
                  ]}
                />
              );
            })}
            <View
              style={[
                styles.progressMarker,
                {
                  transform: [
                    { rotate: `${progressPercent * 360}deg` },
                    { translateY: -128 },
                  ],
                },
              ]}
            />

            <View style={styles.timerCircle}>
                <Text style={styles.modeLabel}>{selectedMode}</Text>
                <Text style={styles.timerText}>{formatTime(secondsLeft)}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.buttonRow}>
          <Pressable
            disabled={isRunning}
            style={({ pressed }) => [
              styles.actionButton,
              isRunning ? styles.startButtonInactive : styles.startButton,
              pressed && !isRunning && styles.pressedButton,
            ]}
            onPress={() => setIsRunning(true)}
          >
            <Text
              style={[
                styles.actionButtonText,
                isRunning && styles.inactiveButtonText,
              ]}
            >
              Start
            </Text>
          </Pressable>

          <Pressable
            disabled={!isRunning}
            style={({ pressed }) => [
              styles.actionButton,
              isRunning ? styles.pauseButtonActive : styles.pauseButtonInactive,
              pressed && isRunning && styles.pressedButton,
            ]}
            onPress={() => setIsRunning(false)}
          >
            <Text
              style={[
                styles.actionButtonText,
                !isRunning && styles.inactiveButtonText,
              ]}
            >
              Pause
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.resetButton,
              pressed && styles.pressedButton,
            ]}
            onPress={resetTimer}
          >
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
    backgroundColor: "#030507",
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 28,
    alignItems: "center",
    justifyContent: "space-between",
  },
  contentArea: {
    width: "100%",
    alignItems: "center",
  },
  statsCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: "#12171F",
    borderWidth: 1,
    borderColor: "#242B36",
    marginBottom: 16,
    shadowColor: "#000000",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
  },
  statBlock: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    height: 34,
    backgroundColor: "#26313D",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9BA4B0",
    marginBottom: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  sessionCount: {
    fontSize: 20,
    fontWeight: "700",
    color: "#BDFB5A",
  },
  timerCard: {
    width: "100%",
    alignItems: "center",
    borderRadius: 28,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 24,
    backgroundColor: "#10151C",
    borderWidth: 1,
    borderColor: "#232D38",
    marginBottom: 0,
    shadowColor: "#0BAF9A",
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
  },
  modeRow: {
    width: "100%",
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#171D26",
    borderWidth: 1,
    borderColor: "#283442",
  },
  selectedModeButton: {
    backgroundColor: "#143B34",
    borderColor: "#5EF4CE",
    shadowColor: "#5EF4CE",
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9BA4B0",
  },
  selectedModeButtonText: {
    color: "#FFFFFF",
  },
  focusDurationCard: {
    width: "100%",
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#151B23",
    borderWidth: 1,
    borderColor: "#26313D",
    marginBottom: 18,
  },
  focusDurationLabel: {
    color: "#9BA4B0",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 10,
  },
  durationStepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  stepperButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10151C",
    borderWidth: 1,
    borderColor: "#2A3442",
  },
  stepperButtonText: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "700",
  },
  durationValueCard: {
    flex: 1,
    height: 52,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A3642",
    borderWidth: 1,
    borderColor: "#6BE7FF",
    shadowColor: "#6BE7FF",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  durationValue: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    marginRight: 6,
  },
  durationUnit: {
    color: "#BDFB5A",
    fontSize: 15,
    fontWeight: "700",
  },
  presetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  presetButton: {
    minWidth: 44,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    backgroundColor: "#10151C",
    borderWidth: 1,
    borderColor: "#2A3442",
  },
  selectedPresetButton: {
    backgroundColor: "#143B34",
    borderColor: "#5EF4CE",
  },
  disabledDurationButton: {
    backgroundColor: "#111821",
    borderColor: "#26313D",
  },
  presetButtonText: {
    color: "#9BA4B0",
    fontSize: 12,
    fontWeight: "700",
  },
  selectedPresetButtonText: {
    color: "#FFFFFF",
  },
  progressRing: {
    width: 286,
    height: 286,
    alignItems: "center",
    justifyContent: "center",
  },
  progressTrack: {
    position: "absolute",
    top: 5,
    left: 5,
    width: 276,
    height: 276,
    borderRadius: 138,
    borderWidth: 10,
    borderColor: "#202A35",
  },
  progressSegment: {
    position: "absolute",
    top: 143,
    left: 143,
    marginTop: -7,
    marginLeft: -2,
    width: 4,
    height: 14,
    borderRadius: 999,
    backgroundColor: "#2C3542",
  },
  activeProgressSegment: {
    backgroundColor: "#6BE7FF",
    shadowColor: "#6BE7FF",
    shadowOpacity: 0.75,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  progressMarker: {
    position: "absolute",
    top: 143,
    left: 143,
    marginTop: -7,
    marginLeft: -7,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#7DF9FF",
    borderWidth: 2,
    borderColor: "#BDFB5A",
    shadowColor: "#7DF9FF",
    shadowOpacity: 0.9,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  timerCircle: {
    width: 224,
    height: 224,
    borderRadius: 112,
    backgroundColor: "#171C25",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#2D3A48",
    shadowColor: "#77D9FF",
    shadowOpacity: 0.22,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 },
  },
  modeLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#5EF4CE",
    marginBottom: 10,
  },
  timerText: {
    fontSize: 62,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  buttonRow: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
    paddingTop: 18,
  },
  actionButton: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    backgroundColor: "#161C25",
    borderWidth: 1,
    borderColor: "#2A3442",
  },
  pressedButton: {
    opacity: 0.72,
    transform: [{ scale: 0.97 }],
  },
  startButton: {
    backgroundColor: "#1D6B50",
    borderColor: "#BDFB5A",
    shadowColor: "#BDFB5A",
    shadowOpacity: 0.38,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  startButtonInactive: {
    backgroundColor: "#111821",
    borderColor: "#26313D",
  },
  pauseButtonActive: {
    backgroundColor: "#5A3D16",
    borderColor: "#F5B84B",
    shadowColor: "#F5B84B",
    shadowOpacity: 0.32,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  pauseButtonInactive: {
    backgroundColor: "#10151C",
    borderColor: "#26313D",
  },
  resetButton: {
    backgroundColor: "#21141B",
    borderColor: "#E76B8D",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  inactiveButtonText: {
    color: "#687382",
  },
});
