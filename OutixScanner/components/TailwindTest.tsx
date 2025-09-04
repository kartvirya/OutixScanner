import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import "../global.css";

export default function TailwindTest() {
  return (
    <ScrollView className="flex-1 bg-gray-100">
      <View className="p-6">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-3xl font-bold text-blue-600 mb-2">
            NativeWind Test
          </Text>
          <Text className="text-gray-600 text-base">
            Testing Tailwind CSS classes in React Native
          </Text>
        </View>

        {/* Colors Test */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-800 mb-3">
            Color Classes Test:
          </Text>
          <View className="flex-row flex-wrap gap-2">
            <View className="w-16 h-16 bg-red-500 rounded-lg items-center justify-center">
              <Text className="text-white text-xs">Red</Text>
            </View>
            <View className="w-16 h-16 bg-green-500 rounded-lg items-center justify-center">
              <Text className="text-white text-xs">Green</Text>
            </View>
            <View className="w-16 h-16 bg-blue-500 rounded-lg items-center justify-center">
              <Text className="text-white text-xs">Blue</Text>
            </View>
            <View className="w-16 h-16 bg-yellow-500 rounded-lg items-center justify-center">
              <Text className="text-black text-xs">Yellow</Text>
            </View>
            <View className="w-16 h-16 bg-purple-500 rounded-lg items-center justify-center">
              <Text className="text-white text-xs">Purple</Text>
            </View>
          </View>
        </View>

        {/* Spacing Test */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-800 mb-3">
            Spacing Test:
          </Text>
          <View className="bg-white p-4 rounded-lg">
            <View className="bg-blue-200 p-2 mb-2">
              <Text className="text-blue-800">Margin bottom 2</Text>
            </View>
            <View className="bg-green-200 p-2 mb-4">
              <Text className="text-green-800">Margin bottom 4</Text>
            </View>
            <View className="bg-red-200 p-2">
              <Text className="text-red-800">No margin</Text>
            </View>
          </View>
        </View>

        {/* Typography Test */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-800 mb-3">
            Typography Test:
          </Text>
          <View className="bg-white p-4 rounded-lg">
            <Text className="text-xs text-gray-600 mb-1">Extra Small Text</Text>
            <Text className="text-sm text-gray-600 mb-1">Small Text</Text>
            <Text className="text-base text-gray-800 mb-1">Base Text</Text>
            <Text className="text-lg text-gray-800 mb-1">Large Text</Text>
            <Text className="text-xl font-semibold text-gray-800 mb-1">Extra Large Text</Text>
            <Text className="text-2xl font-bold text-gray-900">2XL Bold Text</Text>
          </View>
        </View>

        {/* Flexbox Test */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-800 mb-3">
            Flexbox Test:
          </Text>
          <View className="bg-white p-4 rounded-lg">
            <View className="flex-row justify-between mb-2">
              <View className="bg-blue-200 p-2 rounded">
                <Text className="text-blue-800">Left</Text>
              </View>
              <View className="bg-green-200 p-2 rounded">
                <Text className="text-green-800">Center</Text>
              </View>
              <View className="bg-red-200 p-2 rounded">
                <Text className="text-red-800">Right</Text>
              </View>
            </View>
            <View className="flex-row justify-center space-x-2">
              <View className="bg-purple-200 p-2 rounded">
                <Text className="text-purple-800">Item 1</Text>
              </View>
              <View className="bg-purple-200 p-2 rounded">
                <Text className="text-purple-800">Item 2</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Button Test */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-800 mb-3">
            Button Test:
          </Text>
          <TouchableOpacity className="bg-blue-500 p-4 rounded-lg mb-2">
            <Text className="text-white text-center font-semibold">
              Primary Button
            </Text>
          </TouchableOpacity>
          <TouchableOpacity className="bg-gray-200 p-4 rounded-lg mb-2">
            <Text className="text-gray-800 text-center font-semibold">
              Secondary Button
            </Text>
          </TouchableOpacity>
          <TouchableOpacity className="border-2 border-red-500 p-4 rounded-lg">
            <Text className="text-red-500 text-center font-semibold">
              Outline Button
            </Text>
          </TouchableOpacity>
        </View>

        {/* Border Radius Test */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-800 mb-3">
            Border Radius Test:
          </Text>
          <View className="flex-row space-x-2">
            <View className="w-16 h-16 bg-blue-500 rounded-none items-center justify-center">
              <Text className="text-white text-xs">None</Text>
            </View>
            <View className="w-16 h-16 bg-green-500 rounded items-center justify-center">
              <Text className="text-white text-xs">Default</Text>
            </View>
            <View className="w-16 h-16 bg-red-500 rounded-lg items-center justify-center">
              <Text className="text-white text-xs">Large</Text>
            </View>
            <View className="w-16 h-16 bg-purple-500 rounded-full items-center justify-center">
              <Text className="text-white text-xs">Full</Text>
            </View>
          </View>
        </View>

        {/* Shadow Test */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-800 mb-3">
            Shadow Test:
          </Text>
          <View className="space-y-4">
            <View className="bg-white p-4 rounded-lg shadow">
              <Text className="text-gray-800">Default Shadow</Text>
            </View>
            <View className="bg-white p-4 rounded-lg shadow-md">
              <Text className="text-gray-800">Medium Shadow</Text>
            </View>
            <View className="bg-white p-4 rounded-lg shadow-lg">
              <Text className="text-gray-800">Large Shadow</Text>
            </View>
          </View>
        </View>

        {/* Success Message */}
        <View className="bg-green-100 border border-green-400 p-4 rounded-lg">
          <Text className="text-green-800 font-semibold text-center">
            ✅ NativeWind is working correctly!
          </Text>
          <Text className="text-green-700 text-center mt-1">
            All Tailwind CSS classes are being applied properly.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
