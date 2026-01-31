# LMK Mobile App

A React Native/Expo mobile app for LMK personalized recommendations.

## Setup

1. Copy `.env.example` to `.env` and fill in your Supabase credentials:
   ```
   cp .env.example .env
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

4. Scan the QR code with Expo Go app on your phone

## Publishing to iOS App Store

This app uses Expo's cloud build service - no Mac required!

1. Create an Expo account at https://expo.dev
2. Install EAS CLI: `npm install -g eas-cli`
3. Login: `eas login`
4. Configure: `eas build:configure`
5. Build for iOS: `eas build --platform ios`
6. Submit: `eas submit --platform ios`

## Project Structure

```
mobile-app/
├── app/              # Expo Router screens
│   ├── auth/         # Authentication screens
│   ├── (tabs)/       # Main tab screens
│   └── _layout.tsx   # Root layout
├── components/       # Reusable components
├── constants/        # Colors, config
└── lib/              # Supabase client, utilities
```
