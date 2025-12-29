import { checkForApkUpdate } from "@/services/updateService";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { StatusBar } from "react-native";
import { PaperProvider } from 'react-native-paper';

export default function RootLayout() {
    useEffect(() => {
    checkForApkUpdate();
  }, []);
  return (
    <PaperProvider>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#ffffff"
        translucent={false}
      />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="add-person" />
        <Stack.Screen name="person-details" />
        <Stack.Screen name="calls" />
        <Stack.Screen name="posts" />
      </Stack>
    </PaperProvider>
  );
}