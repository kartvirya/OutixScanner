import React, { ReactNode } from "react";
import { StyleSheet, View, TextInput, TextInputProps } from "react-native";
import { Mail, Lock } from "lucide-react-native";
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
  
  // Function to render the appropriate icon based on the iconName
  const renderIcon = () => {
    switch (iconName) {
      case 'envelope':
        return <Mail size={16} color={colors.secondary} />;
      case 'lock':
        return <Lock size={16} color={colors.secondary} />;
      default:
        return <Mail size={16} color={colors.secondary} />;
    }
  };
  
  return (
    <View style={[
      styles.inputContainer, 
      { 
        backgroundColor: colors.inputBackground,
        borderColor: colors.border
      }
    ]}>
      <View style={styles.iconContainer}>
        {renderIcon()}
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