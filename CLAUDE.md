# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a webpack-based build system for AutoX.js (formerly Auto.js) projects. It provides automated compilation, obfuscation, packaging, and deployment capabilities for JavaScript automation scripts targeting Android devices. The system supports multiple projects in a single workspace with TypeScript support.

## Common Development Commands

### Build Commands
- `npm run start` - Development mode with watch functionality (auto-recompiles on changes)
- `npm run build` - Production build with full obfuscation

### Development Workflow
1. Create project folders in the `work/` directory
2. Configure projects in `scriptConfig.js` by setting `compile: true`
3. Run `npm run start` for development with hot reload
4. Use `npm run build` for production builds

## Key Configuration Files

### `scriptConfig.js` - Main Project Configuration
- **projects**: Array of project configurations with `compile`, `name`, `main`, and optional `others` files
- **watch**: Controls watch mode behavior (`rerun`, `deploy`, or `none`)
- **baseDir**: Root directory for projects (default: `./work`)
- **base64**: Whether to base64 encode output
- **projectPrefix**: Prefix for compiled project names
- **advancedEngines**: Enable advanced compilation features
- **target**: Build target (`node` or `web`)

### `webpack.config.js` - Build Configuration
- Handles multiple project compilation
- Applies JavaScript obfuscation in production mode
- Includes AutoX.js specific loaders and plugins
- Supports both JavaScript and TypeScript files

## Project Structure

```
├── work/           # Source projects directory
│   ├── project1/   # Individual project folders
│   └── project2/
├── dist/          # Compiled output directory
├── common/        # Shared utilities and libraries
├── types/         # TypeScript type definitions
└── scriptConfig.js # Main configuration file
```

## Important Notes

### AutoX.js Specific Features
- UI mode detection: Files starting with `"ui";` are automatically handled
- Multi-module compilation: Projects can have multiple entry points
- Automatic deployment support: Can deploy directly to connected devices
- Custom webpack loader for AutoX.js syntax

### Development Guidelines
- Use relative paths for `require()` statements (webpack compatibility)
- For absolute paths, use `global.require()` instead
- UI layouts support: `ui.layout`, `ui.inflate`, `floaty.rawWindow`, `floaty.window`
- All variables must be defined before use (avoid hoisting issues)
- Use `global.` prefix for undefined variables to prevent runtime errors

### Known Limitations
- XML layouts cannot contain parentheses (use Chinese parentheses instead)
- List items in XML must include `this` keyword
- Java objects should use fully qualified names (e.g., `java.net.URL`)

## Cursor Rules Integration

The project follows KISS principles:
- Prefer simple, clear solutions over complex ones
- Design discussions should precede implementation
- Update documentation after major changes
- Use conventional commit messages with emojis

## Build Output

Compiled projects are placed in `dist/` directory with optional project prefix. Each project maintains its file structure with JavaScript/TypeScript files compiled and obfuscated (in production mode).

## AutoX.js API
For available functions provided by AutoX.js, please refer to the following link:
https://github.com/autox-community/AutoX_Docs/tree/master/docs
- Build the script after changes in this project