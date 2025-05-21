import React, { ReactNode } from "react";
import { StyleSheet, View, TextInput, TextInputProps } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";

interface AuthInputProps extends TextInputProps {
  iconName: string;
  rightIcon?: ReactNode;
}

export default function AuthInput({
  iconName,
  rightIcon,
  placeholder,
  ...props
}: AuthInputProps) {
  const { colors } = useTheme();
  
  return (
    <View style={[
      styles.inputContainer, 
      { 
        backgroundColor: colors.inputBackground,
        borderColor: colors.border
      }
    ]}>
      <View style={styles.iconContainer}>
        <FontAwesome5 name={iconName} size={16} color={colors.secondary} />
      </View>
      
      <TextInput
        style={[styles.input, { color: colors.inputText }]}
        placeholder={placeholder}
        placeholderTextColor={colors.secondary}
        {...props}
      />
      
      {rightIcon && <View style={styles.rightIconContainer}>{rightIcon}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 16,
    height: 56,
  },
  iconContainer: {
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: "100%",
  },
  rightIconContainer: {
    paddingHorizontal: 16,
  },
}); 