# VRPI HRMS - Android APK Build Guide (EAS Cloud)

## 1. Overview
Building Android binaries locally on Windows machines with 8 GB RAM often hits resource limits due to Android Studio, Gradle daemons, and JDK overhead. Therefore, VRPI HRMS leverages **Expo Application Services (EAS) Cloud Build** to reliably assemble production and preview APKs.

---

## 2. Prerequisites & Human Setup Steps

The human developer must execute interactive authentication steps:
1. **Expo Account**: Register at [https://expo.dev](https://expo.dev) if you do not have an account.
2. **Install EAS CLI**:
   ```powershell
   npm install --global eas-cli
   ```
3. **Authenticate**:
   ```powershell
   eas login
   ```
   *(Or set the `EXPO_TOKEN` environment variable in your terminal session).*

4. **Initialize EAS Project**:
   ```powershell
   cd apps/mobile
   eas build:configure
   ```

---

## 3. Configuration Files

### 3.1 `apps/mobile/eas.json`
```json
{
  "cli": {
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.yourdomain.com"
      }
    },
    "production": {
      "autoIncrement": true,
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

---

## 4. Pre-Build Validation Checklist
Before starting a cloud build:
1. Run `npx expo-doctor` in `apps/mobile` to check dependency compatibility.
2. Verify TypeScript compilation: `npm run typecheck`.
3. Perform dry bundling check:
   ```powershell
   cd apps/mobile; npx expo export --platform android
   ```

---

## 5. Initiating the Cloud Build
```powershell
cd apps/mobile
eas build --platform android --profile preview
```
- EAS prompts to generate an Android keystore automatically on the first build. Accept and backup the keystore credentials using `eas credentials`.
- Track progress via the generated web dashboard URL.
- Once finished, download the `.apk` file directly or scan the QR code with your phone.

---

## 6. Physical Phone Installation
1. Transfer the `.apk` file to your Android device via direct link, USB cable, or Google Drive.
2. On your device, tap the APK. When prompted, permit "Install unknown apps" for your browser or file manager.
3. Launch VRPI HRMS, ensure the backend URL is reachable over Wi-Fi / HTTPS tunnel, and log in with sample credentials.
