import 'dotenv/config';

export default {
  expo: {
    name: "SeaVault",
    slug: "seavault",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "seavault",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/images/splash.png",
      resizeMode: "contain",
      backgroundColor: "#121212"
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "co.uk.seavault.app",
      buildNumber: "1",
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
      },
      infoPlist: {
        NSCameraUsageDescription:
          "SeaVault needs access to your camera to take photos of marine life sightings.",
        NSPhotoLibraryUsageDescription:
          "SeaVault needs access to your photo library to save and upload photos of marine life sightings.",
        NSPhotoLibraryAddUsageDescription:
          "SeaVault needs access to save photos to your library.",
        NSLocationWhenInUseUsageDescription:
          "SeaVault uses your location to record where you spotted marine life.",
        UIRequiresFullScreen: true,
        CFBundleDisplayName: "SeaVault"
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#121212"
      },
      package: "co.uk.seavault.app",
      versionCode: 1,
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
        }
      }
    },
    web: {
      bundler: "metro",
      output: "single",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      "expo-secure-store",
      "expo-image-picker",
      "expo-media-library",
      [
        "react-native-maps",
        {
          config: {
            googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
          }
        }
      ]
    ],
    experiments: {
      typedRoutes: true,
      tsconfigPaths: true
    },
    extra: {
      REVENUECAT_IOS_API_KEY: process.env.REVENUECAT_IOS_API_KEY,
      REVENUECAT_ANDROID_API_KEY: process.env.REVENUECAT_ANDROID_API_KEY,
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      eas: {
        projectId: "284159c2-a976-4bce-9233-a92fe28d4278"
      }
    }
  }
};