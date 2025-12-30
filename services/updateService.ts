// services/updateService.ts
import * as Application from 'expo-application';
import { Alert, Linking, Platform } from 'react-native';

const VERSION_URL = 'https://nexovisionai.com/apk/version.json';

export async function checkForApkUpdate() {
  if (Platform.OS !== 'android') return;

  try {
    const res = await fetch(VERSION_URL);
    const data = await res.json();

    const currentVersionCode = parseInt(
      Application.nativeBuildVersion ?? '0',
      10
    );

    if (!currentVersionCode) return;

    if (data.versionCode > currentVersionCode) {
      Alert.alert(
        'Update Available',
        'A new version is available. Please update to continue.',
        [
          {
            text: 'Update',
            onPress: () => Linking.openURL(data.apkUrl)
          }
        ],
        { cancelable: !data.forceUpdate }
      );
    }
  } catch (err) {
    console.log('Update check failed', err);
  }
}
