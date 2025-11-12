# 🎨 My Pet Care - Branding Integration Guide

## ✅ Configuration Complete

This guide documents the complete branding integration setup for **My Pet Care**, including app icons, splash screens, and web assets.

---

## 📦 Installed Packages

### 1. flutter_launcher_icons (v0.14.4)
- **Purpose**: Automatic generation of Android and iOS app icons
- **Installation**: `flutter pub add flutter_launcher_icons`

### 2. flutter_native_splash (v2.4.7)
- **Purpose**: Native splash screen generation for all platforms
- **Installation**: `flutter pub add flutter_native_splash`

---

## 🎨 Brand Colors

```
Primary Color:   #1C8275 (Teal Green)
Primary Dark:    #145B52 (Dark Teal)
Background:      #1C8275
Theme:           #1C8275
```

---

## 📁 Required Asset Structure

```
assets/
├── icons/
│   ├── pet_care_icon_512_bordered.png    # Android launcher icon (512x512)
│   └── pet_care_icon_1024_bordered.png   # iOS launcher icon (1024x1024)
└── logo/
    └── my_pet_care_logo.webp              # Splash screen logo (any size, centered)
```

---

## 🔧 Configuration in pubspec.yaml

### Assets Declaration
```yaml
flutter:
  uses-material-design: true
  assets:
    - assets/icons/
    - assets/logo/
```

### Flutter Launcher Icons
```yaml
flutter_launcher_icons:
  android: true
  ios: true
  image_path_android: "assets/icons/pet_care_icon_512_bordered.png"
  image_path_ios: "assets/icons/pet_care_icon_1024_bordered.png"
  remove_alpha_ios: true
  min_sdk_android: 21
```

### Flutter Native Splash
```yaml
flutter_native_splash:
  color: "#1C8275"
  image: assets/logo/my_pet_care_logo.webp
  branding: assets/icons/pet_care_icon_512_bordered.png
  color_dark: "#145B52"
  android_12:
    image: assets/logo/my_pet_care_logo.webp
    icon_background_color: "#1C8275"
```

---

## 🚀 Generation Commands

### Generate App Icons
```bash
# After adding icon assets to assets/icons/
flutter pub run flutter_launcher_icons
```

**Output:**
- Android: `android/app/src/main/res/mipmap-*/ic_launcher.png`
- iOS: `ios/Runner/Assets.xcassets/AppIcon.appiconset/`

### Generate Splash Screens
```bash
# After adding logo to assets/logo/
flutter pub run flutter_native_splash:create
```

**Output:**
- Android: Native splash drawables + `android/app/src/main/res/drawable*/`
- iOS: LaunchScreen.storyboard updates
- Web: Splash HTML/CSS in `web/`

---

## 🌐 Web Configuration

### 1. Favicon & PWA Icons

**Files to replace:**
```
web/
├── favicon.png                    # 512x512 favicon
└── icons/
    ├── Icon-192.png              # PWA icon (192x192)
    ├── Icon-512.png              # PWA icon (512x512)
    ├── Icon-maskable-192.png     # Maskable PWA icon (192x192)
    └── Icon-maskable-512.png     # Maskable PWA icon (512x512)
```

### 2. Web Manifest (manifest.json)

**Current Configuration:**
```json
{
  "name": "My Pet Care",
  "short_name": "PetCare",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1C8275",
  "theme_color": "#1C8275",
  "description": "My Pet Care - Piattaforma di prenotazione servizi per animali domestici",
  "orientation": "portrait-primary",
  "prefer_related_applications": false,
  "icons": [
    { "src": "icons/Icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/Icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "icons/Icon-maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "icons/Icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

---

## 📱 Platform-Specific Notes

### Android
- **Min SDK**: 21 (Android 5.0 Lollipop)
- **Android 12+**: Uses adaptive icons with background color `#1C8275`
- **Icon format**: PNG with transparency preserved
- **Generated sizes**: mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi

### iOS
- **Icon format**: PNG (alpha channel removed automatically)
- **Required size**: 1024x1024 for App Store
- **Generated sizes**: All sizes from 20x20 to 1024x1024
- **Asset catalog**: `ios/Runner/Assets.xcassets/AppIcon.appiconset/`

### Web
- **Favicon**: 512x512 PNG (auto-scaled by browser)
- **PWA Icons**: 192x192 and 512x512 for "Add to Home Screen"
- **Maskable Icons**: Safe zone for adaptive icon display
- **Manifest**: Complete PWA metadata for installability

---

## 🎯 Usage in Flutter Code

### Display Logo in App
```dart
Image.asset(
  'assets/logo/my_pet_care_logo.webp',
  width: 200,
  height: 200,
)
```

### Display Icon in App
```dart
Image.asset(
  'assets/icons/pet_care_icon_512_bordered.png',
  width: 64,
  height: 64,
)
```

### SplashScreen Widget (Optional Custom Splash)
```dart
class SplashScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Color(0xFF1C8275),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Image.asset(
              'assets/logo/my_pet_care_logo.webp',
              width: 200,
            ),
            SizedBox(height: 24),
            Text(
              'My Pet Care',
              style: TextStyle(
                color: Colors.white,
                fontSize: 32,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
```

---

## 🔄 Regeneration Workflow

### When to Regenerate Icons
- Icon design changes
- Brand color updates
- New platform support

### Steps:
1. Replace asset files in `assets/icons/` and `assets/logo/`
2. Run generation commands:
   ```bash
   flutter pub run flutter_launcher_icons
   flutter pub run flutter_native_splash:create
   ```
3. Copy web icons manually to `web/icons/` and `web/favicon.png`
4. Test on all platforms

---

## 🛠️ Troubleshooting

### Icons not updating on device
```bash
# Clean build and reinstall
flutter clean
flutter pub get
flutter pub run flutter_launcher_icons
flutter pub run flutter_native_splash:create
flutter run
```

### Splash screen not showing
- Verify `pubspec.yaml` configuration
- Check asset paths are correct
- Ensure images exist in specified locations
- Run `flutter clean` and regenerate

### Web icons not loading
- Verify files exist in `web/icons/`
- Check `manifest.json` paths
- Clear browser cache
- Test in incognito/private mode

### Android icon background color
- Verify `android_12.icon_background_color` in `pubspec.yaml`
- Check `android/app/src/main/res/values/colors.xml`
- Test on Android 12+ device

---

## 📊 Asset Checklist

### Before Generation
- [ ] Icon assets created (512x512 and 1024x1024)
- [ ] Logo created (any size, will be centered)
- [ ] Assets placed in correct directories
- [ ] pubspec.yaml configured
- [ ] Brand colors defined

### After Generation
- [ ] Android icons generated (verify in `android/app/src/main/res/mipmap-*/`)
- [ ] iOS icons generated (verify in `ios/Runner/Assets.xcassets/`)
- [ ] Splash screens generated for all platforms
- [ ] Web icons manually copied to `web/icons/`
- [ ] Web manifest updated with brand info
- [ ] Test on physical devices (Android, iOS)
- [ ] Test web PWA installation

### Deployment
- [ ] Icons display correctly on device home screen
- [ ] Splash screen shows before app loads
- [ ] PWA can be installed on web browsers
- [ ] Favicon displays in browser tabs
- [ ] Brand colors consistent across platforms

---

## 🎨 Design Guidelines

### App Icon Requirements
- **Size**: 512x512 (Android), 1024x1024 (iOS)
- **Format**: PNG with transparency
- **Safe area**: Keep important elements within 80% center
- **Border**: Optional border for visual distinction
- **Colors**: Use brand colors (#1C8275)

### Logo Requirements
- **Format**: WebP, PNG, or SVG
- **Size**: Minimum 512x512 (will be centered)
- **Background**: Transparent (splash uses solid color)
- **Aspect ratio**: Square or landscape works best

### Brand Consistency
- Use primary color `#1C8275` for main elements
- Use dark variant `#145B52` for dark mode
- Maintain minimum contrast ratios (WCAG AA)
- Test on light and dark backgrounds

---

## 📚 Additional Resources

### Official Documentation
- [flutter_launcher_icons](https://pub.dev/packages/flutter_launcher_icons)
- [flutter_native_splash](https://pub.dev/packages/flutter_native_splash)
- [Flutter Assets Documentation](https://docs.flutter.dev/development/ui/assets-and-images)
- [PWA Manifest Specification](https://developer.mozilla.org/en-US/docs/Web/Manifest)

### Tools
- **Icon Generator**: [App Icon Generator](https://appicon.co/)
- **Image Optimization**: [TinyPNG](https://tinypng.com/)
- **WebP Converter**: [Squoosh](https://squoosh.app/)
- **Color Picker**: [Coolors](https://coolors.co/)

---

## ✅ Integration Status

**Current Status**: ✅ **Configuration Complete**

**Completed:**
- ✅ flutter_launcher_icons installed and configured
- ✅ flutter_native_splash installed and configured
- ✅ pubspec.yaml assets configuration
- ✅ Web manifest updated with brand info
- ✅ Brand colors defined (#1C8275, #145B52)

**Ready for:**
- 📦 Asset files placement (icons + logo)
- 🚀 Generation commands execution
- 🧪 Testing on all platforms

**Next Steps:**
1. Add icon files to `assets/icons/`
2. Add logo file to `assets/logo/`
3. Run generation commands
4. Test on physical devices
5. Deploy to staging/production

---

*Last Updated: January 15, 2025*  
*My Pet Care - Professional Pet Services Platform*
