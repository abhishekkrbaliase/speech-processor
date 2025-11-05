# Speech Processor - Packaging Guide

This guide explains how to package the Speech Processor application for distribution on macOS and Windows.

## 🎯 Packaging Goals

The packaged application will:
- ✅ **Self-contained**: No external software installation required
- ✅ **Professional branding**: Shows as "Speech Processor" (not Electron)
- ✅ **Production ready**: No debug windows or developer tools
- ✅ **Credentials bundled**: Google Speech-to-Text keys included
- ✅ **Cross-platform**: Works on both macOS and Windows

## 🚀 Quick Start

### 1. Setup for Production
```bash
npm run setup:production
```
This script will:
- Validate all required files
- Create missing configuration files
- Check Google Speech credentials
- Verify build resources
- Update package.json for production

### 2. Generate Icons (if needed)
```bash
npm run generate:icons
```
Creates placeholder icons for building. For production, replace with high-quality icons.

### 3. Package the Application
```bash
# Package for both platforms
npm run package:all

# Package for macOS only
npm run package:mac

# Package for Windows only
npm run package:win
```

## 📁 Required Files

Before packaging, ensure these files exist:

### Essential Files
- `google-credentials.json` - Google Speech-to-Text service account credentials
- `config.json` - Application configuration pointing to credentials
- `build-resources/icon.png` - Application icon (512x512 PNG)
- `build-resources/icon.ico` - Windows icon file
- `build-resources/icon.icns` - macOS icon file

### Generated During Build
- `dist/` - Compiled application code
- `release/` - Final packaged applications

## 🔧 Configuration Details

### Google Speech Credentials
The `google-credentials.json` file should contain your Google Cloud service account credentials:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "your-service@project.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "...",
  "universe_domain": "googleapis.com"
}
```

### Application Configuration
The `config.json` file configures the application:
```json
{
  "googleSpeech": {
    "keyFilename": "./google-credentials.json"
  },
  "audio": {
    "sampleRate": 16000,
    "channels": 1
  }
}
```

## 🎨 Icons

### Creating Professional Icons

1. **Design Requirements**:
   - 512x512 pixels minimum
   - PNG format with transparency
   - Simple, recognizable design
   - Good contrast for small sizes

2. **Conversion Tools**:
   - PNG to ICO: https://cloudconvert.com/png-to-ico
   - PNG to ICNS: https://cloudconvert.com/png-to-icns
   - SVG to PNG: https://cloudconvert.com/svg-to-png

3. **Icon Placement**:
   ```
   build-resources/
   ├── icon.png    # Source PNG (512x512)
   ├── icon.ico    # Windows icon
   └── icon.icns   # macOS icon
   ```

## 📦 Package Outputs

After successful packaging, you'll find these files in the `release/` directory:

### macOS
- `Speech Processor-1.0.0.dmg` - Disk image installer
- `Speech Processor-1.0.0-mac.zip` - Zip archive
- `Speech Processor-1.0.0-arm64.dmg` - Apple Silicon version (if available)
- `Speech Processor-1.0.0-universal.dmg` - Universal binary (if available)

### Windows
- `Speech Processor Setup 1.0.0.exe` - NSIS installer
- `Speech Processor 1.0.0.exe` - Portable executable

## 🔍 Troubleshooting

### Common Issues

1. **Missing google-credentials.json**
   ```
   Error: Configuration validation failed
   ```
   **Solution**: Ensure the Google service account credentials file exists and is valid.

2. **Icon generation fails**
   ```
   Error: Icon files not found
   ```
   **Solution**: Run `npm run generate:icons` to create placeholder icons.

3. **Build fails with "Cannot resolve module"**
   ```
   Error: Module not found
   ```
   **Solution**: Run `npm install` to ensure all dependencies are installed.

4. **Packaging fails on macOS**
   ```
   Error: Code signing failed
   ```
   **Solution**: For development, disable code signing in package.json:
   ```json
   "mac": {
     "identity": null
   }
   ```

### Validation Commands

```bash
# Check if all files are ready
npm run setup:production

# Validate the build without packaging
npm run build

# Test the application before packaging
npm start
```

## 🚀 Distribution

### macOS Distribution
1. **DMG File**: Users mount the .dmg and drag the app to Applications
2. **Zip File**: Users extract and move to Applications
3. **Notarization**: For public distribution, consider Apple notarization

### Windows Distribution
1. **Installer**: Users run the .exe installer
2. **Portable**: Users run the portable .exe directly
3. **Code Signing**: For public distribution, consider code signing

## 🔒 Security Notes

- The Google credentials are bundled with the application
- Credentials are stored in the app's resources directory
- Consider the security implications for your use case
- For enterprise deployment, consider credential management alternatives

## 📋 Checklist

Before distributing your packaged application:

- [ ] Tested on target operating systems
- [ ] Google Speech credentials are valid and have appropriate permissions
- [ ] Icons are high-quality and professional
- [ ] Application name appears as "Speech Processor"
- [ ] No debug windows appear in production
- [ ] All required features work without external dependencies
- [ ] File sizes are reasonable for distribution
- [ ] Installation process is smooth for end users

## 🆘 Support

If you encounter issues during packaging:

1. Run `npm run setup:production` to validate your setup
2. Check the console output for specific error messages
3. Ensure all dependencies are installed with `npm install`
4. Verify your Google Cloud credentials and permissions
5. Test the application with `npm start` before packaging

---

**Ready to package?** Run `npm run package:all` to create installers for both macOS and Windows!