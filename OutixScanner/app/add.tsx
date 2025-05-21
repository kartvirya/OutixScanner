import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { FontAwesome5 } from "@expo/vector-icons";

export default function AddEvent() {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");

  const isFormValid = () => {
    return title.trim() !== "" && date.trim() !== "" && time.trim() !== "" && location.trim() !== "";
  };

  const handleSubmit = () => {
    if (!isFormValid()) {
      Alert.alert("Missing Information", "Please fill in all fields");
      return;
    }

    // Here you would typically add the event to your state/database
    // For demo purposes, we'll just show a success message and navigate back
    Alert.alert(
      "Success",
      "Event added successfully!",
      [
        {
          text: "OK",
          onPress: () => {
            // Clear form and navigate back to events list
            setTitle("");
            setDate("");
            setTime("");
            setLocation("");
            router.replace("/");
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.header}>Add New Event</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Event Title</Text>
          <View style={styles.inputWrapper}>
            <FontAwesome5
              name="calendar-day"
              size={16}
              color="#007AFF"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Enter event title"
              value={title}
              onChangeText={setTitle}
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Date</Text>
          <View style={styles.inputWrapper}>
            <FontAwesome5
              name="calendar"
              size={16}
              color="#007AFF"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={date}
              onChangeText={setDate}
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Time</Text>
          <View style={styles.inputWrapper}>
            <FontAwesome5
              name="clock"
              size={16}
              color="#007AFF"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="HH:MM AM/PM"
              value={time}
              onChangeText={setTime}
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Location</Text>
          <View style={styles.inputWrapper}>
            <FontAwesome5
              name="map-marker-alt"
              size={16}
              color="#007AFF"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Enter location"
              value={location}
              onChangeText={setLocation}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            !isFormValid() && styles.buttonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!isFormValid()}
        >
          <Text style={styles.buttonText}>Add Event</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  scrollContainer: {
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
    color: "#1C1C1E",
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
    color: "#3C3C43",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1C1C1E",
  },
  button: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 16,
  },
  buttonDisabled: {
    backgroundColor: "#A2C9F9",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
}); 