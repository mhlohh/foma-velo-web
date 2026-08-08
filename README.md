# Foma Velo - Performance Management Chart (PMC) & Cycling Analytics

**Foma Velo** is a modern Android application built with Kotlin and Jetpack Compose for cyclists and endurance athletes. It parses Strava CSV export archives (`activities.csv`), calculates Training Stress Scores (TSS), and renders an interactive **Performance Management Chart (PMC)** tracking **Fitness (CTL)**, **Fatigue (ATL)**, and **Form (TSB)** over time.

---

## 🚀 Key Features

* **Performance Management Chart (PMC)**:
  * **Fitness (CTL)**: 42-day exponentially weighted moving average of daily TSS.
  * **Fatigue (ATL)**: 7-day exponentially weighted moving average of daily TSS.
  * **Form (TSB)**: Readiness indicator calculated as `CTL - ATL`.
  * **Ramp Rate**: Weekly rate of fitness gain to prevent overtraining and injury risk.
* **Strava Archive CSV Import**:
  * Seamlessly parses official Strava `activities.csv` archives.
  * Filters and extracts cycling activities (*Ride, VirtualRide, Gravel, Mountain Bike*).
  * Resilient parsing handling `null` values, missing power/HR metrics, and variable date formats.
* **Training Intensity Zones**:
  * **Coggan 7-Zone Power Model** based on Functional Threshold Power (FTP).
  * **Friel 5-Zone Heart Rate Model** based on LTHR (Lactate Threshold Heart Rate).
* **Workout Planning &PMC Forecast**:
  * Schedule future workouts with target TSS to project future CTL, ATL, and TSB readiness.
* **Sleek Interface Design**:
  * Material Design 3 UI with dynamic colors, rounded surfaces, and dark/light adaptive themes.

---

## 📋 Requirements

* **Operating System**: macOS, Linux, or Windows
* **JDK**: Java Development Kit 17 or higher
* **Android Studio**: Android Studio Ladybug (2024.2.1+) or newer
* **Android SDK**:
  * `compileSdk`: 35
  * `targetSdk`: 35
  * `minSdk`: 26 (Android 8.0 Oreo or higher)
* **Gradle**: 8.x with Kotlin 2.0+

---

## 🛠️ Installation & Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/velopulse.git
   cd velopulse
   ```

2. **Open in Android Studio**:
   * Open Android Studio.
   * Select **Open an Existing Project** and navigate to the project directory.

3. **Sync Gradle**:
   * Android Studio will automatically resolve dependencies via Gradle.
   * Ensure `compile_applet` passes without issues.

---

## 🏗️ Building & Running

### Option 1: Android Studio (Recommended)
1. Connect an Android device (USB Debugging enabled) or start an Android Virtual Device (AVD Emulator).
2. Select the `app` configuration.
3. Click **Run** (`Shift` + `F10`).

### Option 2: Command Line (Gradle)
* **Build Debug APK**:
  ```bash
  gradle assembleDebug
  ```
* **Run Unit Tests**:
  ```bash
  gradle :app:testDebugUnitTest
  ```

---

## 📊 Importing Your Strava Data

1. Log in to [Strava.com](https://www.strava.com) on a browser.
2. Go to **Settings** -> **My Account** -> **Download or Delete Your Account**.
3. Click **Request Your Archive**.
4. Download and unzip the archive received via email.
5. Transfer or save `activities.csv` to your Android device storage.
6. In **Foma Velo**, tap the **Import / Upload** icon in the top app bar and select your `activities.csv` file directly from phone storage (or paste the CSV text manually).
7. Foma Velo will automatically parse all cycling rides, extract dates, heart rate, power, TSS, and calculate your PMC metrics.
8. To start fresh, tap the **Clear Dataset** sweep icon in the top app bar to wipe all app database activities.

---

## 🧪 Testing

The codebase includes unit tests for the **PmcEngine** and **StravaCsvParser**, as well as screenshot tests powered by Roborazzi:

* **Execute Local JVM Tests**:
  ```bash
  gradle :app:testDebugUnitTest
  ```
* **Verify Roborazzi Screenshot Tests**:
  ```bash
  gradle :app:verifyRoborazziDebug
  ```

---

## 🛡️ License

Distributed under the MIT License. See `LICENSE` for more information.
