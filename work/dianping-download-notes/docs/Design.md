# Dianping Notes Downloader - Design Document
# 大众点评笔记下载器 - 设计文档

> **🚨 CURSOR RULE**: Always use `click(element.bounds().centerX(), element.bounds().centerY())` instead of `element.click()` for reliable UI interaction in Dianping app. This position-based clicking approach was learned from `cancel_follows.js` and is critical for successful automation.

## 1. Overview (概述)

Download user-created restaurant notes from Dianping app, including images and text, with smart resume functionality for growing content.

## 2. Core Strategy (核心策略)

### 2.1 Content Tracking (内容跟踪)
- Track by **note title** and **content hash** to avoid duplicates
- Detect new notes added during download
- Resume from last successful position

### 2.2 Mobile-First Approach (移动优先方法)
- Images download to phone storage (`/Pictures`)
- Move images to organized structure (`dianping_notes/images/`)
- Generate markdown files on phone
- Use AutoX.js file operations for everything

## 3. UI Interaction Best Practices (UI交互最佳实践)

### 3.1 Position-Based Clicking (基于位置的点击)
**CRITICAL**: Always use position-based clicking instead of direct element clicking for reliable UI interaction.

```javascript
// ❌ WRONG - Direct element clicking often fails
element.click();

// ✅ CORRECT - Position-based clicking (learned from cancel_follows.js)
click(element.bounds().centerX(), element.bounds().centerY());
```

**Why this works**: Many UI elements in Dianping app are not directly clickable but respond to coordinate-based clicks. This approach ensures reliable interaction across different app states and UI configurations.

**Applied to**:
- Image clicking (`desc("reculike_main_image")`)
- Menu button clicking (`text("...")`)
- Save option clicking (`text("保存图片")`)
- Navigation elements (`text("笔记")`)

### 3.2 Element Selection Strategy (元素选择策略)
1. **Primary**: Use specific selectors (`desc()`, `text()`, `className()`)
2. **Depth-based**: Target specific UI hierarchy depths for accurate extraction
3. **Fallback**: Try alternative selectors if primary fails
4. **Position**: Always use `bounds().centerX()` and `bounds().centerY()`

**Depth-Based Targeting**:
- **Note titles**: Target depth 29 for accurate title extraction
- **Date/location**: Target depth 19 for posting date and location
- **Restaurant info**: Target depth 23 for restaurant name
- **Debug logging**: Show all elements at target depths for troubleshooting

### 3.3 Error Handling (错误处理)
- Always check if element exists before clicking
- Provide fallback methods for critical interactions
- Log which method was used for debugging

### 3.4 Dynamic Sleep Implementation (动态睡眠实现)
**CRITICAL**: Use randomized sleep times to avoid automation detection.

```javascript
/**
 * Generates a random sleep time to avoid automation detection
 * 生成随机睡眠时间以避免自动化检测
 */
function dynamicSleep(minTime = CONFIG.minSleepTime, maxTime = CONFIG.maxSleepTime) {
    const sleepTime = Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;
    toastLog(`Sleeping for ${sleepTime}ms (dynamic)`);
    sleep(sleepTime);
    return sleepTime;
}
```

**Benefits**:
- **Randomized timing**: No predictable patterns
- **Longer delays**: More human-like behavior (1500-4000ms range)
- **Configurable ranges**: Different timing for different operations
- **Anti-detection**: Reduces risk of being flagged as automation

**Applied to**:
- App launch and loading delays (3000-5000ms)
- Navigation operations (2000-3000ms)
- Image download operations (2000-3000ms)
- Menu interactions (1500-2500ms)
- Save operations (3000-5000ms)
- Swipe operations (2000-3000ms)

## 4. Configuration (配置)

```javascript
const CONFIG = {
    // User input
    maxNotesToDownload: 10,
    
    // File paths (mobile storage)
    baseDownloadDir: "/storage/emulated/0/Download/dianping_notes/",
    imagesSubDir: "images/",
    markdownSubDir: "markdown/",
    stateFile: "download_state.json",
    metadataFile: "downloaded_notes.json",
    
    // App default image location
    appImagesDir: "/storage/emulated/0/Pictures/",
    
    // Timing
    navigationDelay: 2000,
    imageDownloadDelay: 2000,
    scrollDelay: 1500,
    
    // Dynamic sleep configuration to avoid automation detection
    minSleepTime: 1500,  // Minimum sleep time in milliseconds
    maxSleepTime: 4000,  // Maximum sleep time in milliseconds
    saveOperationDelay: 3000, // Delay for save operations
    swipeDelay: 2000,    // Delay after swipe operations
    menuClickDelay: 1500  // Delay after menu clicks
    
    // Growth handling
    detectNewNotes: true,
    downloadNewNotes: true,
    maxNewNotesPerSession: 5,
    notifyOnGrowth: true,
    
    // Session management
    maxSessionDuration: 30, // minutes
    maxNotesPerSession: 20,
    autoResume: true
};
```

## 5. State Management (状态管理)

```javascript
const STATE = {
    // Basic tracking
    lastDownloadedNote: 0,
    totalNotesProcessed: 0,
    downloadStartTime: null,
    
    // Content tracking
    lastDownloadedTimestamp: null,
    knownNoteTitles: [], // Track by note titles instead of signatures
    totalNotesAtStart: 0,
    currentTotalNotes: 0,
    newNotesDetected: 0,
    
    // Session
    sessionStartTime: null,
    sessionId: null
};
```

## 6. Metadata Persistence (元数据持久化)

### 6.1 Downloaded Notes Metadata (已下载笔记元数据)
```javascript
const DOWNLOADED_NOTES = {
    notes: [
        {
            title: "1987年炭火鸡! 派潭第一鸡名不虚传🔥",
            timestamp: "2024-01-15T10:30:00Z",
            viewCount: "182",
            restaurantName: "始于1987年客家食府农庄・派潭烧鸡·竹筒饭",
            imageCount: 3,
            markdownFile: "note_20240115_001_1753871876436.md",
            imagePrefix: "note_001", // For filename mapping
            contentHash: "abc123...", // For duplicate detection
            downloadDate: "2024-01-15T10:30:00Z",
            images: [
                {
                    originalName: "IMG_20240115_103001.jpg",
                    newName: "note_001_image_001.png",
                    path: "/storage/emulated/0/Download/dianping_notes/images/note_001_image_001.png",
                    relativePath: "images/note_001_image_001.png"
                },
                {
                    originalName: "IMG_20240115_103002.jpg", 
                    newName: "note_001_image_002.png",
                    path: "/storage/emulated/0/Download/dianping_notes/images/note_001_image_002.png",
                    relativePath: "images/note_001_image_002.png"
                },
                {
                    originalName: "IMG_20240115_103003.jpg",
                    newName: "note_001_image_003.png", 
                    path: "/storage/emulated/0/Download/dianping_notes/images/note_001_image_003.png",
                    relativePath: "images/note_001_image_003.png"
                }
            ]
        }
    ],
    lastUpdated: "2024-01-15T10:30:00Z",
    totalDownloaded: 1
};
```

### 6.2 Metadata Operations (元数据操作)
```javascript
function loadDownloadedNotes() {
    try {
        const metadataPath = files.join(CONFIG.baseDownloadDir, CONFIG.metadataFile);
        if (files.exists(metadataPath)) {
            const content = files.read(metadataPath, "utf-8");
            return JSON.parse(content);
        }
    } catch (error) {
        toastLog(`Error loading metadata: ${error.message}`);
    }
    return { notes: [], lastUpdated: null, totalDownloaded: 0 };
}

function saveDownloadedNotes(metadata) {
    try {
        const metadataPath = files.join(CONFIG.baseDownloadDir, CONFIG.metadataFile);
        metadata.lastUpdated = new Date().toISOString();
        files.write(metadataPath, JSON.stringify(metadata, null, 2), "utf-8");
        toastLog("Metadata saved successfully");
    } catch (error) {
        toastLog(`Error saving metadata: ${error.message}`);
    }
}

function isNoteDownloaded(noteTitle) {
    const metadata = loadDownloadedNotes();
    return metadata.notes.some(note => note.title === noteTitle);
}

function addDownloadedNote(noteData) {
    const metadata = loadDownloadedNotes();
    metadata.notes.push(noteData);
    metadata.totalDownloaded = metadata.notes.length;
    saveDownloadedNotes(metadata);
}
```

## 7. Image File Management (图像文件管理)

### 7.1 Image Download Process (图像下载流程)
```javascript
function downloadNoteImages(noteIndex) {
    let imageCount = 0;
    const imagePaths = [];
    
    // Gallery is already open from previous clickNoteImage() call
    // No need to call clickNoteImage() again
    
    // Process each image in gallery
    while (true) {
        // Check if we're still in gallery
        const imageCounter = textMatches(/^\d+\s*\/\s*\d+$/).findOne(2000);
        if (!imageCounter) {
            toastLog("No image counter found, exiting gallery");
            break;
        }
        
        const counterText = imageCounter.text();
        const [currentImage, totalImages] = counterText.split('/').map(Number);
        
        toastLog(`Processing image ${currentImage}/${totalImages}`);
        
        // Download current image
        const imagePath = downloadCurrentImage(noteIndex, currentImage);
        if (imagePath) {
            imagePaths.push(imagePath);
            imageCount++;
        }
        
        // Move to next image or exit
        if (currentImage < totalImages) {
            if (!swipeToNextImage()) {
                toastLog("Failed to swipe to next image");
                break;
            }
            dynamicSleep(CONFIG.imageDownloadDelay, CONFIG.imageDownloadDelay + 1000);
        } else {
            toastLog("Reached last image");
            break;
        }
    }
    
    // Exit gallery
    back();
    dynamicSleep(CONFIG.navigationDelay, CONFIG.navigationDelay + 1000);
    
    toastLog(`Downloaded ${imageCount} images for note ${noteIndex}`);
    return { imageCount, imagePaths };
}
```

### 7.2 Move Images from App Directory (从应用目录移动图像)
```javascript
function moveImagesFromAppDirectory(noteIndex, imageCount) {
    const imagesDir = files.join(CONFIG.baseDownloadDir, CONFIG.imagesSubDir);
    files.ensureDir(imagesDir);
    const movedImages = [];
    
    // Get list of files in Pictures directory
    const pictureFiles = files.listDir(CONFIG.appImagesDir);
    const recentImages = pictureFiles
        .filter(file => file.endsWith('.jpg') || file.endsWith('.png'))
        .sort((a, b) => {
            const aTime = files.lastModified(files.join(CONFIG.appImagesDir, a));
            const bTime = files.lastModified(files.join(CONFIG.appImagesDir, b));
            return bTime - aTime; // Most recent first
        })
        .slice(0, imageCount); // Get the most recent images
    
    // Move images to organized structure with filename mapping
    for (let i = 0; i < recentImages.length; i++) {
        const sourcePath = files.join(CONFIG.appImagesDir, recentImages[i]);
        const newImageName = `note_${String(noteIndex).padStart(3, '0')}_image_${String(i + 1).padStart(3, '0')}.png`;
        const destPath = files.join(imagesDir, newImageName);
        
        try {
            files.move(sourcePath, destPath);
            movedImages.push({
                originalName: recentImages[i],
                newName: newImageName,
                path: destPath,
                relativePath: `images/${newImageName}`
            });
            toastLog(`Moved image: ${recentImages[i]} → ${newImageName}`);
        } catch (error) {
            toastLog(`Error moving image ${recentImages[i]}: ${error.message}`);
        }
    }
    
    return movedImages;
}

### 7.3 Download Current Image (下载当前图像)
```javascript
function downloadCurrentImage(noteIndex, imageNumber) {
    try {
        // Find and click the menu button using multiple strategies
        if (!findAndClickMenuButton()) {
            toastLog("Failed to find and click menu button");
            return null;
        }
        
        // Click "保存图片" using position-based clicking
        const saveOption = text("保存图片").findOne(3000);
        if (!saveOption) {
            toastLog("Save option not found");
            return null;
        }
        click(saveOption.bounds().centerX(), saveOption.bounds().centerY());
        dynamicSleep(CONFIG.saveOperationDelay, CONFIG.saveOperationDelay + 2000);
        
        // Wait for save operation to complete (message appears too quickly to detect reliably)
        dynamicSleep(CONFIG.saveOperationDelay, CONFIG.saveOperationDelay + 1000);
        
        const imageName = `note_${String(noteIndex).padStart(3, '0')}_image_${String(imageNumber).padStart(3, '0')}.png`;
        toastLog(`Image ${imageNumber} downloaded successfully: ${imageName}`);
        return imageName;
        
    } catch (error) {
        toastLog(`Error downloading image ${imageNumber}: ${error.message}`);
        return null;
    }
}
```

### 7.4 Enhanced Swipe to Next Image (增强的滑动到下一张图片)
```javascript
function swipeToNextImage() {
    try {
        // Strategy 1: Longer swipe distance (more aggressive)
        const startX = device.width * 0.9;  // Start from 90% of screen width
        const endX = device.width * 0.1;    // End at 10% of screen width
        const centerY = device.height * 0.5; // Center of screen height
        
        toastLog(`Swiping from ${startX} to ${endX} at Y=${centerY}`);
        swipe(startX, centerY, endX, centerY, 800); // Longer duration
        dynamicSleep(CONFIG.swipeDelay, CONFIG.swipeDelay + 1000);
        
        // Check if swipe was successful by looking for image counter change
        const newImageCounter = textMatches(/^\d+\s*\/\s*\d+$/).findOne(3000);
        if (newImageCounter) {
            toastLog("Swipe successful - image counter found");
            return true;
        }
        
        // Strategy 2: Try with different Y positions (in case image is not centered)
        toastLog("Trying swipe with different Y positions...");
        const yPositions = [0.3, 0.5, 0.7]; // Try different vertical positions
        
        for (let yRatio of yPositions) {
            const y = device.height * yRatio;
            swipe(startX, y, endX, y, 600);
            dynamicSleep(CONFIG.swipeDelay, CONFIG.swipeDelay + 500);
            
            const counterCheck = textMatches(/^\d+\s*\/\s*\d+$/).findOne(2000);
            if (counterCheck) {
                toastLog(`Swipe successful at Y=${y}`);
                return true;
            }
        }
        
        // Strategy 3: Try shorter but faster swipe
        toastLog("Trying shorter but faster swipe...");
        const shortStartX = device.width * 0.8;
        const shortEndX = device.width * 0.2;
        swipe(shortStartX, centerY, shortEndX, centerY, 300); // Faster swipe
        dynamicSleep(CONFIG.swipeDelay, CONFIG.swipeDelay + 500);
        
        const finalCheck = textMatches(/^\d+\s*\/\s*\d+$/).findOne(2000);
        if (finalCheck) {
            toastLog("Short swipe successful");
            return true;
        }
        
        toastLog("All swipe strategies failed");
        return false;
        
    } catch (error) {
        toastLog(`Error swiping to next image: ${error.message}`);
        return false;
    }
}
```

**Key Improvements**:
- **Longer swipe distance**: 90% to 10% of screen width (more aggressive)
- **Multiple Y positions**: Try different vertical positions (30%, 50%, 70%)
- **Success verification**: Check if image counter actually changed
- **Fallback strategies**: Multiple approaches if first attempt fails
- **Dynamic timing**: Uses `dynamicSleep()` for anti-detection

### 7.5 Menu Button Detection Strategies (菜单按钮检测策略)
```javascript
function findAndClickMenuButton() {
    try {
        // Strategy 1: Try multiple text patterns for menu button
        const menuTextPatterns = ["...", "⋮", "⋯", "更多", "菜单"];
        for (let pattern of menuTextPatterns) {
            const menuButton = text(pattern).findOne(1000);
            if (menuButton) {
                toastLog(`Found menu button with text: ${pattern}`);
                click(menuButton.bounds().centerX(), menuButton.bounds().centerY());
                dynamicSleep(CONFIG.menuClickDelay, CONFIG.menuClickDelay + 1000);
                return true;
            }
        }
        
        // Strategy 2: Try specific bounds for "..." element only (not "<" to avoid back action)
        const threeDotsBounds = [924, 146, 1044, 266];
        const threeDotsCenterX = (threeDotsBounds[0] + threeDotsBounds[2]) / 2;
        const threeDotsCenterY = (threeDotsBounds[1] + threeDotsBounds[3]) / 2;
        
        toastLog("Trying to click '...' at specific bounds");
        click(threeDotsCenterX, threeDotsCenterY);
        dynamicSleep(CONFIG.menuClickDelay, CONFIG.menuClickDelay + 1000);
        
        // Check if menu options appeared
        const saveOption = text("保存图片").findOne(2000);
        if (saveOption) {
            toastLog("Menu appeared after clicking '...' at specific bounds");
            return true;
        }
        
        // Strategy 3: Look for ImageView elements in top-right area
        const imageViewElements = className("android.widget.ImageView").find();
        if (imageViewElements.length > 0) {
            const screenWidth = device.width;
            const screenHeight = device.height;
            
            for (let element of imageViewElements) {
                const bounds = element.bounds();
                const centerX = bounds.centerX();
                const centerY = bounds.centerY();
                
                if (centerX > screenWidth * 0.7 && centerY < screenHeight * 0.2) {
                    toastLog("Found menu button as ImageView in top-right area");
                    click(centerX, centerY);
                    dynamicSleep(CONFIG.menuClickDelay, CONFIG.menuClickDelay + 1000);
                    return true;
                }
            }
        }
        
        // Strategy 4: Try clicking in top-right corner as last resort
        const screenWidth = device.width;
        const screenHeight = device.height;
        const topRightX = screenWidth * 0.9;
        const topRightY = screenHeight * 0.1;
        
        toastLog("Trying to click in top-right corner as last resort");
        click(topRightX, topRightY);
        dynamicSleep(CONFIG.menuClickDelay, CONFIG.menuClickDelay + 1000);
        
        const saveOption2 = text("保存图片").findOne(2000);
        if (saveOption2) {
            toastLog("Menu appeared after clicking top-right corner");
            return true;
        }
        
        toastLog("Menu button not found with any strategy");
        return false;
        
    } catch (error) {
        toastLog(`Error finding menu button: ${error.message}`);
        return false;
    }
}
```

**Detection Strategies**:
- **Text patterns**: Try multiple text patterns `["...", "⋮", "⋯", "更多", "菜单"]`
- **Specific bounds**: Use exact coordinates for "..." button `(924,146,1044,266)`
- **ImageView detection**: Look for ImageView elements in top-right area
- **Position fallback**: Click in top-right corner as last resort
- **Avoid back button**: Only use "..." button, not "<" button to prevent back action

## 8. UI Elements (UI元素)

Based on screenshots and UI hierarchy analysis:

```javascript
const UI_ELEMENTS = {
    // Navigation
    userNickname: "尘世中的小吃货",
    notesTab: "笔记",
    backButton: "<",
    
    // Image gallery
    imageCounter: /^\d+\s*\/\s*\d+$/,  // "1/7", "1 / 7", "2/7"
    menuButton: "...",
    saveImageOption: "保存图片",
    saveSuccessMessage: "保存成功",
    
    // Menu button detection strategies
    menuButtonPatterns: ["...", "⋮", "⋯", "更多", "菜单"], // Multiple text patterns
    menuButtonImageView: "android.widget.ImageView", // ImageView elements
    menuButtonPosition: { x: ">70%", y: "<20%" }, // Top-right area
    menuButtonSpecificBounds: {
        threeDots: [924, 146, 1044, 266], // "..." bounds (menu button)
        backButton: [30, 146, 150, 266]   // "<" bounds (back button - NOT for menu)
    },
    
    // Note content - DEPTH-BASED extraction
    noteTitleDepth: 29, // Target depth for note title extraction
    noteTitle: /^[^#\n]+🔥?$/,
    hashtags: /#[^\s]+/g,
    viewCount: /◎浏览\d+/,
    dateLocation: /\d{2}-\d{2}\s+[^\n]+/,
    
    // Restaurant (POSITION-BASED extraction)
    merchantDetailsHeader: "商户详情",
    restaurantRating: /\d+\.\d+分/,
    restaurantAddress: /[^\n]+区[^\n]+号/,
    
    // Date and location extraction
    dateLocationDepth: 19, // Target depth for date/location elements
    datePatterns: [
        /^(\d{2})-(\d{2})$/,           // MM-DD format
        /^(\d{4})-(\d{2})-(\d{2})$/,   // YYYY-MM-DD format
        /^(\d+)(小时前|天前|分钟前|星期前)$/, // Chinese relative formats
        /^昨天\s+(\d{2}):(\d{2})$/,     // Yesterday format
        /^前天\s+(\d{2}):(\d{2})$/      // Day before yesterday format
    ]
};
```

## 9. Process Flow (流程)

### 9.1 Main Process (主流程)
1. **Initialize** - Load metadata, get user input
2. **Navigate** - Go to notes tab
3. **For each note** (up to limit):
   - Check if already downloaded (by title)
   - Extract note title and basic info
   - Download images (with pagination)
   - Move images to organized structure
   - Extract text content
   - Extract restaurant info
   - Generate markdown on phone
   - Update metadata
4. **Handle growth** - Detect and handle new notes
5. **Save metadata** - Persist progress

### 9.2 Note Processing (笔记处理)
**Note**: The note processing logic is implemented inline within the main function for better flow control and error handling. 

```javascript
// Note processing is handled inline in main() function:
// 1. Extract note title from home page using depth 29 targeting
// 2. Check for duplicates by title
// 3. If downloaded: Scroll to find next undownloaded note
// 4. If not downloaded: Navigate to note page
// 5. Download images with pagination
// 6. Move images to organized structure
// 7. Extract text content and metadata
// 8. Generate markdown files
// 9. Update metadata
// 10. Return to home page for next iteration
```

## 10. File Generation on Mobile (移动端文件生成)

### 10.1 Markdown Generation (Markdown生成)
```javascript
function generateMarkdownOnMobile(noteData) {
    const markdownContent = `# ${noteData.title}

**Date:** ${noteData.timestamp}  
**Location:** ${noteData.location || 'Unknown'}  
**Views:** ${noteData.viewCount}  
**Restaurant:** ${noteData.restaurantName || 'Unknown'}  

## Images

${noteData.images.map((img, i) => `![Image ${i+1}](${img.relativePath})`).join('\n')}

## Content

${noteData.content}

---

*Downloaded by Dianping Notes Downloader v1.0*
`;

    // Save to mobile storage
    const filepath = files.join(CONFIG.baseDownloadDir, CONFIG.markdownSubDir, noteData.markdownFile);
    files.createWithDirs(filepath);
    files.write(filepath, markdownContent, "utf-8");
    
    return filepath;
}
```

## 11. Restaurant Information Extraction (餐厅信息提取)

### 11.1 Position-Based Restaurant Name Extraction (基于位置的餐厅名称提取)
```javascript
function extractRestaurantName() {
    // Navigate to restaurant detail page
    clickRestaurantLink();
    sleep(2000);
    
    // Look for "商户详情" header
    const merchantDetailsElement = text("商户详情").findOne(5000);
    if (!merchantDetailsElement) {
        toastLog("未找到商户详情页面");
        return null;
    }
    
    // Find restaurant name by position: between "商户详情" and rating
    const allTextElements = className("android.widget.TextView").find();
    let restaurantName = null;
    let foundMerchantDetails = false;
    
    for (let element of allTextElements) {
        const text = element.text();
        
        if (text === "商户详情") {
            foundMerchantDetails = true;
            continue;
        }
        
        if (foundMerchantDetails) {
            // Look for rating pattern to know where restaurant name ends
            if (/\d+\.\d+分/.test(text)) {
                break; // We've reached the rating, restaurant name is complete
            }
            
            // This is likely part of the restaurant name
            if (text && text.length > 2 && !restaurantName) {
                restaurantName = text;
            } else if (restaurantName && text && text.length > 2) {
                // Append additional parts of restaurant name
                restaurantName += " " + text;
            }
        }
    }
    
    return restaurantName;
}
```

## 12. Growth Handling (增长处理)

### 12.1 Detect New Notes (检测新笔记)
```javascript
function detectContentGrowth() {
    const currentTotal = getCurrentNotesCount();
    
    if (STATE.totalNotesAtStart === 0) {
        STATE.totalNotesAtStart = currentTotal;
        STATE.currentTotalNotes = currentTotal;
        return false;
    }
    
    if (currentTotal > STATE.currentTotalNotes) {
        const newNotes = currentTotal - STATE.currentTotalNotes;
        STATE.newNotesDetected += newNotes;
        STATE.currentTotalNotes = currentTotal;
        
        toastLog(`检测到 ${newNotes} 个新笔记`);
        return true;
    }
    
    return false;
}
```

## 13. Resume Functionality (恢复功能)

### 13.1 Title-Based Resume (基于标题的恢复)
```javascript
function resumeFromMetadata() {
    const metadata = loadDownloadedNotes();
    
    if (metadata.notes.length > 0) {
        toastLog(`Resuming from ${metadata.notes.length} previously downloaded notes`);
        
        // Load known titles into state
        STATE.knownNoteTitles = metadata.notes.map(note => note.title);
        STATE.totalNotesProcessed = metadata.notes.length;
        
        return true;
    }
    
    return false;
}
```

## 14. Implementation Plan (实施计划)

### Phase 1: Basic Download (基础下载)
- Navigate to notes tab
- Download single note with images
- Move images from `/Pictures` to organized structure
- Generate markdown file on phone
- Save metadata with note title

### Phase 2: Multiple Notes (多笔记)
- Loop through multiple notes
- Check metadata for duplicates
- Handle pagination
- Progress tracking

### Phase 3: Growth Handling (增长处理)
- Detect new notes
- Handle content growth
- User notifications

### Phase 4: Polish (优化)
- Error handling
- Performance optimization
- User experience improvements

## 15. Success Criteria (成功标准)

- ✅ Download specified number of notes
- ✅ Extract all images from each note
- ✅ Move images from `/Pictures` to organized structure
- ✅ Generate markdown files on phone
- ✅ Track downloads by note title in metadata
- ✅ Handle content growth gracefully
- ✅ Resume from any interruption point
- ✅ No duplicate downloads

## 16. File Structure (文件结构)

```
/storage/emulated/0/Download/dianping_notes/
├── internal_vault/                    ← Obsidian vault (local access)
│   ├── note_20240115_001_1753871876436_internal.md
│   ├── note_20240115_002_1753871876437_internal.md
│   └── images/
│       ├── note_001_image_001.png
│       ├── note_001_image_002.png
│       ├── note_002_image_001.png
│       └── note_002_image_002.png
├── external_public/                   ← Public sharing (Cloudflare)
│   ├── note_20240115_001_1753871876436_external.md
│   └── note_20240115_002_1753871876437_external.md
├── metadata/
│   ├── downloaded_notes.json         ← Metadata persistence
│   └── upload_errors.log             ← Upload error logging
├── temp_images/                      ← Temporary storage
│   └── [original downloaded images]
└── download_state.json               ← Session state
```

## 17. Filename Mapping (文件名映射)

### 17.1 Image Naming Convention (图像命名约定)
- **Format**: `note_XXX_image_YYY.png`
- **Example**: `note_001_image_001.png`, `note_001_image_002.png`
- **Benefits**: 
  - Easy to browse all images in one directory
  - Clear mapping to source notes
  - Sortable by note and image order
  - No nested directories

### 17.2 Markdown Naming Convention (Markdown命名约定)
- **Internal Format**: `note_<posting date>_XXX_TIMESTAMP_internal.md`
- **External Format**: `note_<posting date>_XXX_TIMESTAMP_external.md`
- **Examples**: 
  - `note_20240115_001_1753871876436_internal.md`
  - `note_20240115_001_1753871876436_external.md`
- **Components**:
  - `<posting date>`: Date when note was posted (YYYYMMDD format)
  - `XXX`: Sequential number for notes posted on same date
  - `TIMESTAMP`: Unique timestamp to prevent conflicts
  - `_internal` or `_external`: Clear identification of purpose
- **Benefits**:
  - Chronological sorting by posting date
  - Unique timestamps prevent conflicts
  - Clear note sequence identification
  - Easy to match with images
  - Clear separation between internal and external versions

### 17.3 Code Structure Improvements (代码结构改进)
- **Inline processing in main()**: Better flow control and error handling
- **Depth-based targeting**: More accurate UI element selection
- **Enhanced debugging**: Better logging for troubleshooting
- **Correct navigation flow**: Extract titles from home page, navigate only when needed
- **Smart scrolling**: Added `scrollToNextUndownloadedNote()` for efficient note discovery
- **Proper error handling**: Always return to home page after processing (success or failure)

---

## 18. Workflow Implementation (工作流程实现)

### 18.1 Requirements Workflow Integration (需求工作流程集成)

Based on Requirements.md, here's how we implement each step:

#### Step 1: Navigate to Notes Tab
**Requirement**: Make sure we're on the "笔记" tab. Let's call this the home page thereafter.
**Implementation**: 
- Use `navigateToNotesTab()` function
- Click on "笔记" text element using position-based clicking
- Verify navigation with sleep delay

#### Step 2: Click on Note to Navigate
**Requirement**: Click on a note; it will go to the next page (as shown in screenshots/home-page.jpg).
**Implementation**:
- Use `clickFirstNote()` function
- Find elements with `desc("reculike_main_image")` on home page
- Use position-based clicking to navigate to note page
- Wait for page transition with navigation delay

#### Step 1: Extract Note Title from Home Page
**Requirement**: Capture the note title from home page (e.g., "1987年炭火鸡! 派潭第一鸡名不虚传🔥")
**Implementation**:
- Use `extractNoteTitle()` function
- **Target depth 29 specifically** for accurate title extraction
- Filter TextView elements at depth 29 in UI hierarchy
- Filter out user nickname ("尘世中的小吃货"), view counts ("◎"), hashtags ("#")
- Return first valid title found
- **Debug logging**: Show all TextView elements at depth 29 for troubleshooting

#### Step 2: Check if Note Already Downloaded
**Requirement**: Avoid duplicate downloads by checking metadata
**Implementation**:
- Use `isNoteDownloaded(noteTitle)` function
- Check against existing metadata by title
- If downloaded: Scroll to find next undownloaded note
- If not downloaded: Proceed to note page for processing

#### Step 2.5: Scroll to Next Undownloaded Note
**Requirement**: Scroll through notes list to find undownloaded notes
**Implementation**:
- Use `scrollToNextUndownloadedNote()` function
- Scroll down to reveal more notes (max 10 attempts)
- Check each revealed note title against metadata
- Continue scrolling until undownloaded note found
- Handle end-of-list detection ("没有更多内容", "已显示全部", "到底了")

#### Step 3: Navigate to Note Page
**Requirement**: Click on note to navigate to individual note page
**Implementation**:
- Use `clickFirstNote()` function
- Find clickable note elements with `desc("reculike_main_image")`
- Use position-based clicking for reliable navigation
- Wait for page transition with navigation delay

#### Step 4: Click Image to Open Gallery
**Requirement**: Click the picture to show the full image (as shown in screenshots/note-page.jpg).
**Implementation**:
- Use `clickNoteImage()` function
- Use fixed bounds `[0, 254, 1080, 1694]` for reliable clicking
- Calculate center point and use position-based clicking
- Wait for gallery to open with image download delay

#### Step 5: Download Images with Pagination
**Requirement**: Download all images using "..." → "保存图片" → "保存成功" flow, handling "1/7", "2/7" pagination.
**Implementation**:
```
PSEUDO CODE:
downloadNoteImages(noteIndex):
  - Use clickNoteImage() with fixed bounds instead of clickFirstImage()
  - Use findAndClickMenuButton() with multiple strategies:
    * Try text patterns: "...", "⋮", "⋯", "更多", "菜单"
    * Try specific bounds: "..." at (924,146,1044,266) (menu button only)
    * Look for ImageView elements in top-right area
    * Fallback to clicking top-right corner
  - Click "保存图片" option
  - Use dynamic sleep instead of "保存成功" message detection
  - Check image counter with improved regex: /^\d+\s*\/\s*\d+$/
  - If more images exist, use enhanced swipeToNextImage() with multiple strategies
  - Repeat until all images downloaded
  - Exit gallery with back() function
```
**Status**: ✅ Implemented and tested with dynamic sleep and enhanced swipe functionality

#### Step 12: Return to Home Page
**Requirement**: Go back to home page after processing note (success or failure)
**Implementation**:
- Use `back()` function to return to home page
- Add navigation delay for page transition
- Ensure we're back on home page for next iteration
- Handle both success and failure cases with proper cleanup

#### Step 6: Move Images from App Directory
**Requirement**: Images are saved to `/Pictures` directory, need to move to organized structure.
**Implementation**:
```
PSEUDO CODE:
moveImagesFromAppDirectory(noteIndex, imageCount):
  - List files in /storage/emulated/0/Pictures/
  - Sort by modification time (most recent first)
  - Take top N files (where N = imageCount)
  - Move to /storage/emulated/0/Download/dianping_notes/images/
  - Rename using pattern: note_XXX_image_YYY.png
  - Update metadata with file paths
```
**Status**: ✅ Implemented and tested with successful image organization

#### Step 7: Extract Note Content
**Requirement**: Capture all the text of the note. The note content has a fixed pattern: includes a hashtag "#尘世中的小吃货".
**Implementation**:
```
PSEUDO CODE:
extractNoteContent():
  - Find all TextView elements
  - Look for TextView containing "#尘世中的小吃货" hashtag
  - Extract the complete text from that TextView
  - No scrolling needed - all content is in one TextView
  - No boundary checking needed - hashtag marks the content
```
**Status**: ✅ Implemented with hashtag marker approach

#### Step 7.5: Extract Note Posting Date and Location
**Requirement**: Extract posting date and location from note. Date and location are positioned below visible area and require scrolling to access.
**Implementation**:
```
PSEUDO CODE:
extractNoteDateAndLocation():
  - Scroll down up to 3 times to reveal date/location elements (y-coord 1645)
  - After each scroll, check depth 19 for date patterns
  - Stop scrolling when date elements are found
  - Use depth 19 directly for date and location extraction
  - Look for date element with patterns:
    * MM-DD or YYYY-MM-DD (standard formats)
    * Chinese relative formats: "4小时前", "6天前", "7天前", "1星期前"
    * Yesterday format: "昨天 08:44"
    * Day before yesterday format: "前天 06:45"
  - Get next element as location
  - Convert all date formats to YYYYMMDD format for filename
  - Return postingDate and location
```
**Status**: ✅ Implemented and tested with multi-scroll strategy and enhanced Chinese date format support

**Key Findings from Layout Analysis:**
- Date element "07-07" is at depth 19
- Element bounds: (48,1645,138,1687) - below visible area
- Element type: android.widget.TextView
- Requires scrolling before element detection

**Multi-Scroll Strategy:**
- **Up to 3 scroll attempts** to handle very long note content
- **Check after each scroll** if date elements are visible at depth 19
- **Stop early** when date pattern is found to avoid unnecessary scrolling
- **Log progress** for debugging and monitoring

**Enhanced Date Format Support:**
- **Standard formats**: MM-DD, YYYY-MM-DD
- **Chinese relative formats**: "4小时前", "6天前", "7天前", "1星期前"
- **Yesterday format**: "昨天 08:44" (yesterday with time)
- **Day before yesterday format**: "前天 06:45" (day before yesterday with time)
- **Automatic conversion**: All formats converted to YYYYMMDD for consistent filename generation
- **Time calculation**: Relative dates calculated based on current time/date

#### Step 8: Extract Restaurant Information
**Requirement**: Capture the name of the restaurant. Extract the restaurant's full name from the 2nd textview at depth 23 on the note page without navigating to the restaurant detail page.
**Implementation**:
```
PSEUDO CODE:
extractRestaurantInformation():
  - Called right after extractNoteDateAndLocation() (which scrolls down)
  - Restaurant name is positioned right above date/location elements
  - Find all textview elements at depth 23
  - Extract text from the 2nd textview (index 1)
  - Return restaurant name or null if not found
```

**Optimization**: No separate scrolling needed - leverages existing scroll from Step 7.5
**Test Function**: `testStep8RestaurantExtraction()` - Bypasses image download to test restaurant extraction only

#### Step 9: Generate Markdown File
**Requirement**: Put the text and pictures into a markdown file.
**Implementation**:
```
PSEUDO CODE:
generateMarkdownOnMobile(noteData):
  - Create markdown content with title, date, views, restaurant
  - Add image references using relative paths
  - Add note content text
  - Save to /storage/emulated/0/Download/dianping_notes/markdown/
  - Use filename pattern: note_<posting date>_XXX_TIMESTAMP.md
```

#### Step 10: Update Metadata and Resume
**Requirement**: We may want to accept an argument when running the script for how many notes we are going to download this time. How can we remember where we were, since we don't want to duplicate what we have downloaded?
**Implementation**:
```
PSEUDO CODE:
metadataManagement():
  - Get user input for number of notes to download via dialog
  - Load existing metadata from downloaded_notes.json
  - Display metadata statistics (total notes, images, last updated)
  - Check for duplicates by note title before processing
  - Save note data with title, timestamp, viewCount, restaurantName
  - Track image files with original and new names
  - Generate markdown files and track paths
  - Update metadata after each successful note download
  - Resume from last successful position
  - Process multiple notes in a loop based on user input
  - Skip already downloaded notes and continue to next
```
**Status**: ✅ Implemented with comprehensive metadata tracking and user input

### 18.2 Error Handling Strategy (错误处理策略)

#### Navigation Failures
- **Home page verification**: Check for user nickname and notes tab
- **Note page verification**: Verify we're on note page before extracting title
- **Gallery verification**: Check for image counter before downloading

#### Content Extraction Failures
- **Title extraction**: Fallback to different text patterns if primary method fails
- **Image downloading**: Retry with different selectors if menu button not found
- **File operations**: Handle permission errors and directory creation failures

#### Resume and Recovery
- **Session interruption**: Save progress after each note completion
- **Duplicate detection**: Check note titles in metadata before processing
- **Error recovery**: Log errors and continue with next note

### 18.3 Performance Optimizations (性能优化)

#### Dynamic Sleep Implementation
- **Randomized timing**: 1500-4000ms range to avoid detection
- **Operation-specific delays**: Different ranges for different operations
- **Human-like behavior**: Longer delays prioritize safety over speed
- **Configurable ranges**: Easy adjustment of timing parameters

#### Timing Delays
- **App launch**: 3000-5000ms for app loading
- **Navigation delays**: 2000-3000ms for page transitions
- **Image download delays**: 2000-3000ms between image operations
- **Menu interactions**: 1500-2500ms for menu clicks
- **Save operations**: 3000-5000ms for image saving
- **Swipe operations**: 2000-3000ms for image navigation
- **Scroll delays**: 1500ms for content scrolling

#### Memory Management
- **Batch processing**: Process one note at a time
- **File cleanup**: Move images immediately after download
- **Metadata updates**: Save after each note completion

#### User Experience
- **Progress feedback**: Toast messages for each step
- **Error reporting**: Clear error messages with context
- **Completion status**: Final summary of downloaded content

---

## 19. ImgBB API Integration (图片托管API集成)

**Service**: ImgBB - Free image hosting service  
**Endpoint**: `https://api.imgbb.com/1/upload`  
**Method**: POST with `key` and `image` parameters  
**Response**: `{"success": true, "data": {"url": "https://i.ibb.co/..."}}`  
**API Key**: `b4c48cb837bf0fb4217ccac1cd27f59f`  

### 19.1 Dual Markdown Strategy (双重Markdown策略)

#### Internal Vault (Obsidian兼容)
- **Purpose**: Local access and Obsidian vault compatibility
- **Image links**: Relative paths for local images
- **Structure**: Self-contained vault with images in same directory
- **Use case**: Transfer to PC, offline access, personal notes

#### External Public (公共分享)
- **Purpose**: Public sharing via Cloudflare hosting
- **Image links**: External ImgBB URLs
- **Structure**: Markdown only, no local images needed
- **Use case**: Web publishing, social sharing, public access

### 19.2 Enhanced File Structure (增强文件结构)

```
/storage/emulated/0/Download/dianping_notes/
├── internal_vault/                    ← Obsidian vault
│   ├── note_20240115_001_1753871876436_internal.md
│   ├── note_20240115_002_1753871876437_internal.md
│   └── images/
│       ├── note_001_image_001.png
│       ├── note_001_image_002.png
│       ├── note_002_image_001.png
│       └── note_002_image_002.png
├── external_public/                   ← Public sharing
│   ├── note_20240115_001_1753871876436_external.md
│   └── note_20240115_002_1753871876437_external.md
├── metadata/
│   ├── downloaded_notes.json
│   └── upload_errors.log             ← Error logging
```

### 19.3 Implementation Strategy (实施策略)

#### Upload Strategy
- **Immediate upload**: Upload each image right after download
- **Individual processing**: Avoid bulk upload limitations
- **Error handling**: Log failures, continue with internal MD
- **Retry mechanism**: 3 attempts with exponential backoff

#### Error Handling
- **Upload failures**: Log to `upload_errors.log` for manual review
- **External MD**: Only generate if all uploads successful
- **Internal MD**: Always generate as fallback
- **Graceful degradation**: Continue processing even with upload failures

#### File Naming Convention
- **Internal MD**: `note_<date>_XXX_TIMESTAMP_internal.md`
- **External MD**: `note_<date>_XXX_TIMESTAMP_external.md`
- **Images**: `note_XXX_image_YYY.png` (same for both)
- **Clear identification**: `_internal` and `_external` suffixes

### 19.4 Enhanced Metadata Structure (增强元数据结构)

```javascript
{
    title: "1987年炭火鸡! 派潭第一鸡名不虚传🔥",
    timestamp: "2024-01-15T10:30:00Z",
    viewCount: "182",
    restaurantName: "始于1987年客家食府农庄・派潭烧鸡·竹筒饭",
    imageCount: 3,
    markdownFiles: {
        internal: "internal_vault/note_20240115_001_1753871876436_internal.md",
        external: "external_public/note_20240115_001_1753871876436_external.md"
    },
    images: [
        {
            originalName: "IMG_20240115_103001.jpg",
            newName: "note_001_image_001.png",
            localPath: "internal_vault/images/note_001_image_001.png",
            externalUrl: "https://img.remit.ee/api/file/...",
            uploadSuccess: true,
            uploadTimestamp: "2024-01-15T10:30:05Z"
        }
    ],
    uploadStatus: {
        totalImages: 3,
        successfulUploads: 3,
        failedUploads: 0,
        externalMdGenerated: true
    }
}
```

### 19.5 Configuration (配置)

```javascript
const IMGBB_CONFIG = {
    apiKey: "b4c48cb837bf0fb4217ccac1cd27f59f",
    uploadUrl: "https://api.imgbb.com/1/upload",
    enabled: true, // Set to false to disable image hosting
    maxRetries: 3,
    retryDelay: 2000
};
```

### 19.6 Workflow Implementation (工作流程实施)

#### Step-by-Step Process
1. **Download images** → Save to temp directory
2. **Move to internal vault** → Organize with relative paths
3. **Upload to img.remit.ee** → Get external URLs
4. **Generate internal MD** → Use relative image paths
5. **Generate external MD** → Use external URLs (if uploads successful)
6. **Update metadata** → Track both versions and upload status
7. **Clean up temp files** → Remove temporary images

#### Upload Implementation
```javascript
function uploadImageToImgBB(imagePath, imageName = null) {
    // Convert image to base64
    const imageBytes = files.readBytes(imagePath);
    const base64Data = android.util.Base64.encodeToString(imageBytes, android.util.Base64.DEFAULT);
    
    // Upload to ImgBB
    const response = http.post(IMGBB_CONFIG.uploadUrl, {
        key: IMGBB_CONFIG.apiKey,
        image: base64Data
    });
    
    // Only generate external MD if all uploads successful
    if (noteData.uploadStatus.successfulUploads === noteData.uploadStatus.totalImages) {
        generateExternalMarkdown(noteData);
    }
}
```

### 19.7 Benefits of This Approach (此方法的优势)

#### For Internal Vault
- ✅ **Obsidian compatibility**: Self-contained structure
- ✅ **Relative paths**: `![Image](images/note_001_image_001.png)` works perfectly
- ✅ **Offline access**: No internet dependency
- ✅ **Portability**: Easy transfer to PC
- ✅ **Always available**: Generated regardless of upload status

#### For External Public
- ✅ **Public sharing**: External URLs accessible anywhere
- ✅ **No bandwidth costs**: ImgBB handles hosting
- ✅ **CDN delivery**: Global content distribution
- ✅ **Clean structure**: Markdown only, no local files needed
- ✅ **Quality assurance**: Only generated when uploads successful

#### Overall Benefits
- ✅ **Dual purpose**: Local access + public sharing
- ✅ **Error resilience**: Internal MD always available
- ✅ **Clear separation**: Internal vs external content
- ✅ **Scalable**: Easy to add more external platforms
- ✅ **Maintainable**: Clear file organization and error logging

## 20. img.remit.ee Limitations (img.remit.ee 限制)

### 20.1 Compatibility Issues (兼容性问题)

**Problem**: img.remit.ee API has compatibility issues with AutoX.js mobile environment.

#### Technical Limitations
- ❌ **500 Server Errors**: "文件上传失败" (File upload failed) on mobile
- ❌ **Response Parsing Issues**: `java.lang.IllegalStateException: closed`
- ❌ **Multipart Form Data**: AutoX.js constructs requests differently than curl
- ❌ **Base64 Encoding**: Server rejects base64-encoded data from mobile clients
- ❌ **HTTPS/TLS Handling**: Different behavior between PC curl and mobile AutoX.js

#### Testing Results
- ✅ **PC curl works**: `{"success":true,"url":"/api/file/..."}`
- ❌ **Mobile AutoX.js fails**: 500 errors with all upload methods
- ❌ **All variations failed**: Manual FormData, raw bytes, file upload
- ❌ **No workaround found**: Multiple test scripts all failed

#### Root Cause Analysis
1. **Server-side restrictions**: img.remit.ee may have mobile client limitations
2. **Request format differences**: AutoX.js HTTP library vs curl behavior
3. **Data encoding issues**: Server expects different format than what AutoX.js sends
4. **API changes**: Possible recent changes to img.remit.ee API

### 20.2 Alternative Solution (替代解决方案)

**Solution**: Switched to ImgBB API which is more compatible with AutoX.js.

#### Why ImgBB Works
- ✅ **Simpler API**: Designed for easy integration
- ✅ **Base64 support**: Native support for base64-encoded images
- ✅ **Mobile friendly**: Better compatibility with mobile HTTP clients
- ✅ **Reliable response**: Consistent JSON responses
- ✅ **Free service**: No cost for image hosting

#### ImgBB Advantages
- ✅ **API Key**: Simple authentication
- ✅ **Multiple formats**: Supports file upload, base64, and URLs
- ✅ **Large files**: Up to 32 MB per image
- ✅ **CDN delivery**: Fast global access
- ✅ **Permanent URLs**: No expiration unless specified

### 20.3 Lessons Learned (经验教训)

#### API Selection Criteria
1. **Mobile compatibility**: Test with AutoX.js before implementation
2. **Simple authentication**: API keys preferred over complex auth
3. **Base64 support**: Essential for mobile environments
4. **Error handling**: Clear error responses for debugging
5. **Documentation quality**: Well-documented APIs reduce integration time

#### Testing Strategy
1. **PC verification**: Always test APIs on PC first with curl
2. **Mobile testing**: Test on actual mobile device with AutoX.js
3. **Multiple methods**: Try different upload approaches
4. **Error analysis**: Understand why failures occur
5. **Alternative planning**: Have backup APIs ready

#### Future Considerations
- **API reliability**: Choose services with proven mobile compatibility
- **Fallback options**: Always have local-only mode as backup
- **Error logging**: Comprehensive logging for troubleshooting
- **User feedback**: Clear status messages for upload progress 