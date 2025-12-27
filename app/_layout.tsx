import { Stack } from "expo-router";
import { PaperProvider } from 'react-native-paper';

export default function RootLayout() {
  return (
    <PaperProvider>
      <Stack>
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