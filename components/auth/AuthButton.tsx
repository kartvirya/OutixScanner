import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  TouchableOpacityProps,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";

interface AuthButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  secondary?: boolean;
}

export default function AuthButton({
  title,
  loading = false,
  disabled = false,
  secondary = false,
  ...props
}: AuthButtonProps) {
  const { colors } = useTheme();
  
  const buttonStyles = [
    styles.button,
    { backgroundColor: secondary ? 'transparent' : colors.primary },
    secondary && { borderWidth: 1, borderColor: colors.primary },
    disabled && { backgroundColor: "#CCCCCC", borderWidth: 0 },
  ];
  
  const textStyles = [
    styles.buttonText,
    { color: secondary ? colors.primary : "#FFFFFF" },
    disabled && { color: "#FFFFFF" },
  ];
  
  return (
    <TouchableOpacity
      style={buttonStyles}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
}); 