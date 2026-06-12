import { useEffect, useRef, useState } from "react";
import { setAudioModeAsync, setIsAudioActiveAsync, useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useSessionHistory } from "@/app/session-history";

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
const requestedBellSoundPath = "assets/sounds/timer-bell.mp3";
// Metro requires audio assets at build time. The requested MP3 is missing, so this bundled WAV keeps the app safe.
const completionSound = require("@/assets/sounds/timer-bell.wav");

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function HomeScreen() {
  const { activities, addActivity, addBreakSeconds, addSession } = useSessionHistory();
  const completionSoundPlayer = useAudioPlayer(completionSound);
  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedMode, setSelectedMode] = useState<TimerMode>("Focus");
  const [selectedActivityId, setSelectedActivityId] = useState("deep-work");
  const [newActivityName, setNewActivityName] = useState("");
  const [focusDurationMinutes, setFocusDurationMinutes] = useState(60);
  const focusDurationSeconds = focusDurationMinutes * 60;
  const [secondsLeft, setSecondsLeft] = useState(focusDurationSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [hasShownFiveMinuteWarning, setHasShownFiveMinuteWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [hasHandledCompletion, setHasHandledCompletion] = useState(false);

  const currentModeDurations: Record<TimerMode, number> = {
    Focus: focusDurationSeconds,
    "Short Break": modeDurations["Short Break"],
    "Long Break": modeDurations["Long Break"],
  };
  const selectedActivity = activities.find(
    (activity) => activity.id === selectedActivityId,
  ) ?? activities[0];

  useEffect(() => {
    completionSoundPlayer.volume = 1;
    console.warn(
      `${requestedBellSoundPath} was not found. Using assets/sounds/timer-bell.wav until you add the MP3 asset.`,
    );
    void setAudioModeAsync({ playsInSilentMode: true })
      .then(() => setIsAudioActiveAsync(true))
      .catch((error) => {
        console.warn("Completion sound setup failed", error);
      });

    return () => {
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, [completionSoundPlayer]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const intervalId = setInterval(() => {
      setSecondsLeft((currentSeconds) => {
        if (currentSeconds <= 1) {
          return 0;
        }

        return currentSeconds - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isRunning]);

  useEffect(() => {
    if (
      isRunning &&
      secondsLeft === 300 &&
      currentModeDurations[selectedMode] > 300 &&
      !hasShownFiveMinuteWarning
    ) {
      setHasShownFiveMinuteWarning(true);
      showFiveMinuteWarning();
    }
  }, [hasShownFiveMinuteWarning, isRunning, secondsLeft, selectedMode]);

  useEffect(() => {
    if (!isRunning || secondsLeft !== 0 || hasHandledCompletion) {
      return;
    }

    setHasHandledCompletion(true);
    handleTimerComplete();
  }, [hasHandledCompletion, isRunning, secondsLeft]);

  function clearWarningMessage() {
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }

    setWarningMessage("");
  }

  function resetFiveMinuteWarning() {
    setHasShownFiveMinuteWarning(false);
    clearWarningMessage();
  }

  function showFiveMinuteWarning() {
    setWarningMessage("5 minutes left.");
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    warningTimeoutRef.current = setTimeout(() => {
      setWarningMessage("");
      warningTimeoutRef.current = null;
    }, 3500);
  }

  async function playAlertSound() {
    console.log("Playing completion sound");

    try {
      completionSoundPlayer.pause();
      await completionSoundPlayer.seekTo(0);
      completionSoundPlayer.volume = 1;
      completionSoundPlayer.play();
    } catch (error) {
      console.warn("Completion sound failed", error);
    }
  }

  async function playTimerCompleteFeedback() {
    void playAlertSound();
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }

  function handleTimerComplete() {
    console.log("Timer completed");
    setIsRunning(false);
    setHasShownFiveMinuteWarning(false);
    clearWarningMessage();
    void playTimerCompleteFeedback();

    const completedDuration = currentModeDurations[selectedMode];
    const endTime = new Date();
    const startTime =
      sessionStartTime ?? new Date(endTime.getTime() - completedDuration * 1000);

    if (selectedMode === "Focus") {
      addSession({
        id: `${endTime.getTime()}`,
        activityName: selectedActivity.name,
        activityColor: selectedActivity.color,
        startTime,
        endTime,
        durationSeconds: completedDuration,
        durationMinutes: Math.round(completedDuration / 60),
        dateLabel: endTime.toLocaleDateString([], {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        mode: "Focus",
      });
    } else {
      addBreakSeconds(completedDuration);
    }

    setSessionStartTime(null);
  }

  function selectMode(mode: TimerMode) {
    setSelectedMode(mode);
    setSecondsLeft(currentModeDurations[mode]);
    setIsRunning(false);
    setSessionStartTime(null);
    setHasHandledCompletion(false);
    resetFiveMinuteWarning();
  }

  function resetTimer() {
    setSecondsLeft(currentModeDurations[selectedMode]);
    setIsRunning(false);
    setSessionStartTime(null);
    setHasHandledCompletion(false);
    resetFiveMinuteWarning();
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

    setSessionStartTime(null);
    setHasHandledCompletion(false);
    resetFiveMinuteWarning();
  }

  function decreaseFocusDuration() {
    updateFocusDuration(focusDurationMinutes - focusStepMinutes);
  }

  function increaseFocusDuration() {
    updateFocusDuration(focusDurationMinutes + focusStepMinutes);
  }

  function startTimer() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (secondsLeft === 0) {
      setSecondsLeft(currentModeDurations[selectedMode]);
    }
    setSessionStartTime((currentStartTime) => currentStartTime ?? new Date());
    setHasHandledCompletion(false);
    resetFiveMinuteWarning();
    setIsRunning(true);
  }

  function pauseTimer() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setIsRunning(false);
  }

  function addCustomActivity() {
    const activity = addActivity(newActivityName);

    if (activity) {
      setSelectedActivityId(activity.id);
      setNewActivityName("");
    }
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
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.contentArea}>
          <View style={styles.timerCard}>
            <View style={styles.activityRow}>
              {activities.map((activity) => {
                const isSelected = activity.id === selectedActivityId;

                return (
                  <Pressable
                    key={activity.id}
                    disabled={isRunning}
                    style={({ pressed }) => [
                      styles.activityButton,
                      isSelected && [
                        styles.selectedActivityButton,
                        {
                          borderColor: activity.color,
                          shadowColor: activity.color,
                        },
                      ],
                      isRunning && styles.disabledDurationButton,
                      pressed && !isRunning && styles.pressedButton,
                    ]}
                    onPress={() => setSelectedActivityId(activity.id)}
                  >
                    <Text
                      style={[
                        styles.activityButtonText,
                        isSelected && [
                          styles.selectedActivityButtonText,
                          { color: activity.color },
                        ],
                        isRunning && styles.inactiveButtonText,
                      ]}
                    >
                      {activity.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.addActivityRow}>
              <TextInput
                editable={!isRunning}
                value={newActivityName}
                onChangeText={setNewActivityName}
                placeholder="Add activity"
                placeholderTextColor="#687382"
                style={[
                  styles.activityInput,
                  isRunning && styles.disabledActivityInput,
                ]}
              />
              <Pressable
                disabled={isRunning || !newActivityName.trim()}
                style={({ pressed }) => [
                  styles.addActivityButton,
                  (isRunning || !newActivityName.trim()) && styles.disabledDurationButton,
                  pressed && !isRunning && newActivityName.trim() && styles.pressedButton,
                ]}
                onPress={addCustomActivity}
              >
                <Text
                  style={[
                    styles.addActivityButtonText,
                    (isRunning || !newActivityName.trim()) && styles.inactiveButtonText,
                  ]}
                >
                  Add
                </Text>
              </Pressable>
            </View>

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
            {warningMessage ? (
              <Text style={styles.warningMessage}>{warningMessage}</Text>
            ) : null}
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
            onPress={startTimer}
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
            onPress={pauseTimer}
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
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 96,
    alignItems: "center",
    justifyContent: "space-between",
  },
  contentArea: {
    width: "100%",
    alignItems: "center",
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
  activityRow: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  activityButton: {
    minWidth: "30%",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    backgroundColor: "#10151C",
    borderWidth: 1,
    borderColor: "#2A3442",
  },
  selectedActivityButton: {
    backgroundColor: "#1A3642",
    borderColor: "#6BE7FF",
    shadowColor: "#6BE7FF",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  activityButtonText: {
    color: "#9BA4B0",
    fontSize: 12,
    fontWeight: "700",
  },
  selectedActivityButtonText: {
    color: "#FFFFFF",
  },
  addActivityRow: {
    width: "100%",
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  activityInput: {
    flex: 1,
    height: 42,
    borderRadius: 14,
    paddingHorizontal: 14,
    color: "#FFFFFF",
    backgroundColor: "#10151C",
    borderWidth: 1,
    borderColor: "#2A3442",
    fontSize: 14,
    fontWeight: "600",
  },
  disabledActivityInput: {
    color: "#687382",
    backgroundColor: "#111821",
    borderColor: "#26313D",
  },
  addActivityButton: {
    height: 42,
    borderRadius: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#143B34",
    borderWidth: 1,
    borderColor: "#5EF4CE",
  },
  addActivityButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
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
  warningMessage: {
    marginTop: 12,
    color: "#BDFB5A",
    fontSize: 14,
    fontWeight: "700",
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
