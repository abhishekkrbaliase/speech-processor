# Git Management Guide

This document explains which files should be committed to git and which should be ignored for the Speech Processor project.

## 📁 Files to COMMIT (Essential Source Code)

### Core Application Code
```
src/                          # All TypeScript source files
├── config/                   # Configuration management
├── main/                     # Main process code
├── preload/                  # Preload scripts
├── renderer/                 # Renderer process code
└── shared/                   # Shared utilities and types
```

### Build Configuration
```
package.json                  # Dependencies and scripts
package-lock.json            # Locked dependency versions
tsconfig.json                # TypeScript configuration
tsconfig.build.json          # Build-specific TypeScript config
webpack.config.js            # Webpack build configuration
jest.config.js               # Jest testing configuration
```

### Build Resources (Templates)
```
build-resources/
├── create-icons.md          # Icon creation instructions
├── create-placeholder-icons.js  # Icon generation script
├── entitlements.mac.plist   # macOS entitlements
├── installer.nsh            # Windows installer script
└── icon.svg                 # Source SVG icon
```

### Configuration Templates
```
config.template.json         # Application config template
google-credentials.template.json  # Google credentials template
```

### Scripts
```
scripts/
├── build-standalone.js      # Standalone build script
├── generate-icons.js        # Icon generation
├── package-app.js          # Complete packaging
├── package-summary.js      # Packaging results
├── prepare-build.js        # Build preparation
├── setup-development.js    # Development setup
└── setup-production.js     # Production validation
```

### Documentation
```
*.md                         # All markdown documentation files
.gitignore                   # Git ignore rules
```

## 🚫 Files to IGNORE (Build Artifacts & Sensitive Data)

### Build Outputs
```
dist/                        # Compiled TypeScript
build/                       # Build artifacts
release/                     # Packaged applications
examples/                    # Example files
```

### Sensitive Configuration
```
config.json                  # Contains actual configuration
google-credentials.json      # Contains actual Google credentials
.env*                        # Environment variables
```

### Generated Icons
```
build-resources/icon.png     # Generated from SVG
build-resources/icon.ico     # Generated for Windows
build-resources/icon.icns    # Generated for macOS
```

### Dependencies & Temporary Files
```
node_modules/               # NPM dependencies
coverage/                   # Test coverage reports
logs/                       # Application logs
*.log                       # Log files
```

### IDE & OS Files
```
.vscode/                    # VS Code settings
.idea/                      # IntelliJ settings
.DS_Store                   # macOS folder settings
Thumbs.db                   # Windows thumbnails
```

### Test Files
```
test-*.js                   # Test scripts
tests/                      # Test directory
*.test.js                   # Test files
```

## 🔧 Setup Commands

### For New Developers
```bash
# Clone the repository
git clone <repository-url>
cd speech-processor

# Install dependencies
npm install

# Set up development environment
npm run setup:development

# Update google-credentials.json with actual credentials
# Update config.json if needed

# Test the application
npm start
```

### For Production Packaging
```bash
# Validate production setup
npm run setup:production

# Package for all platforms
npm run package:all

# View results
npm run package:summary
```

## 🔒 Security Best Practices

### Never Commit These Files
- `google-credentials.json` - Contains sensitive Google Cloud credentials
- `config.json` - May contain sensitive configuration data
- `.env` files - Environment variables with secrets

### Safe Alternatives
- Use `google-credentials.template.json` as a template
- Use `config.template.json` as a template
- Document required environment variables in README

### For Team Development
1. Share templates, not actual credentials
2. Use separate Google Cloud projects for development/production
3. Rotate credentials regularly
4. Use environment variables for CI/CD

## 📋 Git Workflow

### Initial Setup
```bash
# Add all source files
git add src/ scripts/ build-resources/ *.md package*.json tsconfig*.json webpack.config.js

# Add templates (not actual config)
git add *.template.json

# Commit initial setup
git commit -m "Initial Speech Processor setup with packaging system"
```

### Regular Development
```bash
# Add only source code changes
git add src/ scripts/ *.md

# Never add these
git status | grep -E "(config\.json|google-credentials\.json|dist/|release/)"
# If any of these show up, make sure they're in .gitignore

# Commit changes
git commit -m "Your commit message"
```

### Before Pushing
```bash
# Verify no sensitive files are staged
git status
git diff --cached

# Check .gitignore is working
git check-ignore config.json google-credentials.json
# Should return the filenames (meaning they're ignored)
```

## 🆘 Recovery Commands

### If You Accidentally Committed Sensitive Files
```bash
# Remove from git but keep local file
git rm --cached config.json google-credentials.json

# Add to .gitignore if not already there
echo "config.json" >> .gitignore
echo "google-credentials.json" >> .gitignore

# Commit the removal
git commit -m "Remove sensitive configuration files"

# For files already in history, consider:
git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch google-credentials.json' --prune-empty --tag-name-filter cat -- --all
```

### If .gitignore Isn't Working
```bash
# Clear git cache and re-add files
git rm -r --cached .
git add .
git commit -m "Fix .gitignore"
```

## ✅ Verification Checklist

Before pushing to git:

- [ ] No `google-credentials.json` in git status
- [ ] No `config.json` in git status  
- [ ] No `dist/` or `release/` directories in git status
- [ ] All source files in `src/` are tracked
- [ ] All scripts in `scripts/` are tracked
- [ ] Documentation files (*.md) are tracked
- [ ] Template files (*.template.json) are tracked
- [ ] Build configuration files are tracked

Your repository should contain everything needed to build and package the application, but no sensitive data or build artifacts!