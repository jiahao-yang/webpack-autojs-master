# Android Automation Development Reference Guide
# Android 自动化开发参考指南

## Project Overview (项目概述)

This document provides a comprehensive reference for Android automation development using the webpack-autojs project, which is an engineering toolkit for AutoX.js (AutoX) - an open-source alternative to Auto.js.

### Key Features (主要特性)
- ✅ **Automated compilation, obfuscation, packaging, and deployment** of JS source code
- ✅ **VSCode integration** with auto-completion and method hints
- ✅ **Multi-project management** 
- ✅ **UI module auto-detection** (ui.layout, ui.inflate, floaty.rawWindow, floaty.window)
- ✅ **Multi-module compilation** - one project can contain multiple scripts that can call each other

## Development Environment Setup (开发环境设置)

### Prerequisites (前置要求)
1. **Node.js** - Install with PATH and npm options selected
2. **VSCode** with Auto.js-VSCodeExt-Fixed plugin (version 0.3.11+)
3. **Global webpack installation**: `npm i -g webpack webpack-cli --registry=https://registry.npmmirror.com`
4. **AutoX.js** installed on Android device

### Project Structure (项目结构)
```
work/                    # Project directory (项目目录)
├── dianping-cancel-follows/  # Successful automation project
├── qidian/             # Another automation project
├── helloworld/         # Basic examples
└── ...                 # Other projects

scriptConfig.js         # Main configuration file
package.json           # Build scripts (npm run start/build)
webpack.config.js      # Webpack configuration
header.txt             # Header content for compiled files
```

### Configuration Files (配置文件)

#### scriptConfig.js
```javascript
var projects = [
  {
    id: 9, 
    compile: true, 
    name: "dianping-cancel-follows", 
    main: "./cancel_follows.js"
  }
];

var config = {
  watch: "rerun", // "deploy", "rerun", or "none"
  baseDir: "./work",
  base64: false,
  projectPrefix: "",
  advancedEngines: true,
  header: "header.txt",
  base64RandomStrLength: 100,
  target: "node",
  projects: projects,
};
```

#### project.json (per project)
```json
{
    "name": "project-name",
    "main": "main.js",
    "ignore": ["build"],
    "launchConfig": {
        "hideLogs": false
    },
    "packageName": "com.example.project-name",
    "versionName": "1.0.0",
    "versionCode": 0
}
```

## Development Workflow (开发工作流)

### 1. Project Setup (项目设置)
```bash
# Install dependencies
npm install --registry=https://registry.npmmirror.com

# Development mode with auto-reload
npm run start

# Production build
npm run build
```

### 2. Project Configuration (项目配置)
1. Create project folder in `work/` directory
2. Add project to `scriptConfig.js` with `compile: true`
3. Create `project.json` for project metadata
4. Write main automation script

### 3. Deployment (部署)
- Compiled files go to `dist/` directory
- Auto-deployment to connected Android device
- Auto-rerun on code changes when `watch: "rerun"`

## Successful Implementation Patterns (成功实现模式)

Based on the `dianping-cancel-follows` project analysis:

### 1. App Launch & Package Detection (应用启动和包检测)
```javascript
const TARGET_PACKAGE = "com.dianping.v1";
const APP_NAME = "大众点评";

// Display current package name
toastLog(`current package: ${currentPackage()}`);

// Launch or ensure the app is in focus
if (currentPackage() !== TARGET_PACKAGE) {
    toastLog("launch the app");
    app.launchApp(APP_NAME);
    sleep(3000);
    toastLog(`current package: ${currentPackage()}`);
}
```

### 2. Page Verification (页面验证)
```javascript
/**
 * Checks whether the application is currently displaying a specific page
 * @param {string} indicatorText - The text identifier for the target page
 * @returns {boolean} - true if on desired page
 */
function isOnDesiredPage(indicatorText) {
    const pageIndicator = className("android.widget.TextView").text(indicatorText);
    const isFound = pageIndicator.exists();
    return isFound;
}

// Usage
const indicatorText = "尘世中的小吃货";
if (!isOnDesiredPage(indicatorText)) {
    toastLog(`Not on the desired page (${indicatorText})`);
    return;
}
```

### 3. UI Element Interaction (UI元素交互)
```javascript
// Find and click UI elements with bounds
function clickUiBounds(ui, offsetX = 0, offsetY = 0) {
    click(ui.bounds().centerX() + offsetX, ui.bounds().centerY() + offsetY);
    return true;
}

// Find specific text elements
const followButton = className("android.widget.TextView").text("已关注")
    .boundsInside(0, device.height * 0.33, device.width, device.height * 0.9)
    .findOne(5000);

if (followButton) {
    click(followButton.bounds().centerX(), followButton.bounds().centerY());
    sleep(1000);
    click("确认");
}
```

### 4. User Input & Configuration (用户输入和配置)
```javascript
// Prompt user for input
const scrollCountInput = dialogs.rawInput("请输入下滑次数:");
if (!scrollCountInput) {
    toastLog("输入被取消");
    return;
}

// Parse and validate input
const scrollCountInt = parseInt(scrollCountInput);
if (isNaN(scrollCountInt)) {
    toastLog("输入无效");
    return;
}

// Exclusion lists
const EXCLUDED_USER_NAMES = ['点小胖', '艾小评', '麥克牛'];
if (EXCLUDED_USER_NAMES.includes(username)) {
    console.log(`"${username}" is on the exclusion list. Skipping.`);
    return;
}
```

### 5. Scroll Management (滚动管理)
```javascript
function swipeUpToRevealContent() {
    swipe(device.width / 2, device.height * 0.9, device.width / 2, device.height * 0.5, 1000);
}

function swipeDownToRevealContent() {
    swipe(device.width / 2, device.height * 0.3, device.width / 2, device.height * 0.7, 1000);
}
```

### 6. Human-like Delays (人性化延迟)
```javascript
// Random delays to simulate human behavior
sleep(Math.floor(Math.random() * 2000) + 2000); // 2-4 second random delay

// Countdown with logging
for (let i = randomWaitTime; i > 0; i--) {
    toastLog(i);
    sleep(1000);
}
```

### 7. Error Handling (错误处理)
```javascript
try {
    // Main automation logic
    const indicatorText = "尘世中的小吃货";
    if (!isOnDesiredPage(indicatorText)) {
        toastLog(`Not on the desired page (${indicatorText})`);
        return;
    }
    
    // Process automation tasks
    searchAndUnfollow();
    
} catch (error) {
    toastLog(`Error: ${error.message}`);
}
```

### 8. Loop Management (循环管理)
```javascript
let consecutiveEmptyScrolls = 0;
const MAX_EMPTY_SCROLLS = scrollCountInt;

while (consecutiveEmptyScrolls < MAX_EMPTY_SCROLLS) {
    searchAndUnfollow();
    
    if (!className("android.widget.TextView").text("已关注").exists()) {
        consecutiveEmptyScrolls++;
    } else {
        consecutiveEmptyScrolls = 0; // Reset counter if found
    }
    
    if (consecutiveEmptyScrolls < MAX_EMPTY_SCROLLS) {
        swipeUpToRevealContent();
        console.log(`Scrolled up. ${MAX_EMPTY_SCROLLS - consecutiveEmptyScrolls} scrolls remaining.`);
    }
}
```

## Best Practices (最佳实践)

### 1. Project Structure (项目结构)
- Use descriptive project names
- Separate main logic from utilities
- Include proper error handling
- Create reusable utility functions

### 2. UI Interaction Patterns (UI交互模式)
- Always verify page state before interactions
- Use bounds for precise clicking
- Implement human-like delays
- Handle confirmation dialogs
- Use timeouts for element searches

### 3. Configuration Management (配置管理)
- Use constants for app packages and names
- Implement user input for dynamic parameters
- Create exclusion lists for special cases
- Store configuration in project.json

### 4. Error Handling (错误处理)
- Wrap main logic in try-catch blocks
- Use toastLog for user feedback
- Implement graceful exits
- Validate user inputs

### 5. Performance Optimization (性能优化)
- Use timeouts for element searches
- Implement scroll counters to prevent infinite loops
- Add random delays to avoid detection
- Use bounds to limit search areas

### 6. Code Organization (代码组织)
```javascript
'use strict';

// Constants
const TARGET_PACKAGE = "com.example.app";
const APP_NAME = "App Name";

// Utility functions
function isOnDesiredPage(indicatorText) { /* ... */ }
function clickUiBounds(ui, offsetX = 0, offsetY = 0) { /* ... */ }

// Main processing functions
function searchAndProcess() { /* ... */ }

// Main function
function main() {
    try {
        // App launch logic
        // Page verification
        // Main automation logic
    } catch (error) {
        toastLog(`Error: ${error.message}`);
    }
}

// Entry point
auto.waitFor();
main();
```

## Common Issues & Solutions (常见问题和解决方案)

### 1. XML Parsing Issues (XML解析问题)
- Use Chinese brackets `（）` instead of English parentheses `()`
- Don't omit `this` in XML lists
- Use proper XML syntax for UI layouts

### 2. Path Issues (路径问题)
- Use relative paths for require statements
- Use `global.require()` for absolute paths
- Avoid `/sdcard` paths in webpack context

### 3. Variable Scope Issues (变量作用域问题)
- Define all variables before use
- Use `global.` prefix to avoid hoisting issues
- Be careful with variable declarations

### 4. Java Object Usage (Java对象使用)
```javascript
// Use full class names
var url = new java.net.URL(myUrl);
// Instead of
var url = new URL(myUrl);
```

## Advanced Features (高级功能)

### 1. Multi-module Projects (多模块项目)
```javascript
// In scriptConfig.js
{
    id: 10, 
    compile: true, 
    name: "qidian", 
    main: "./watch_video_on_app.js",
    others: ['./watch_video.js', './watch_video_official.js']
}
```

### 2. UI Mode Support (UI模式支持)
- `ui.layout`
- `ui.inflate` 
- `floaty.rawWindow`
- `floaty.window`

### 3. Base64 Encoding (Base64编码)
```javascript
// In scriptConfig.js
base64: true,
base64RandomStrLength: 100,
```

### 4. DEX Compilation (DEX编译)
```bash
# Install auto-cli
npm i "@auto.pro/cli" -g

# Compile to DEX
auto-cli dex ./dist/demo/main.js
```

## Development Tips (开发技巧)

### 1. Debugging (调试)
- Use `console.log()` for debugging
- Use `toastLog()` for user feedback
- Check `currentPackage()` for app verification
- Use `sleep()` for timing control

### 2. Testing (测试)
- Test on different screen sizes
- Test with different app versions
- Implement fallback mechanisms
- Add validation checks

### 3. Maintenance (维护)
- Keep exclusion lists updated
- Monitor for UI changes
- Update selectors when apps update
- Document changes and improvements

## Resources (资源)

### Official Documentation (官方文档)
- [AutoX.js GitHub](https://github.com/kkevsekk1/AutoX)
- [Auto.js VSCode Extension](https://marketplace.visualstudio.com/items?itemName=aaroncheng.auto-js-vsce-fixed)

### Related Projects (相关项目)
- [auto.pro](https://github.com/molysama/auto.pro) - WebView and TypeScript support
- [batchJs2Dex](https://github.com/snailuncle/batchJs2Dex) - JS to DEX conversion
- [autojsNativeJs](https://github.com/snailuncle/autojsNativeJs) - Native JS execution

### Video Tutorial (视频教程)
- [优酷视频讲解](https://v.youku.com/v_show/id_XNDg2NjA3NTYyMA==.html)

---

*This reference guide is based on the successful implementation patterns from the dianping-cancel-follows project and the overall webpack-autojs development framework.* 