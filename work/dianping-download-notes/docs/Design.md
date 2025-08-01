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
2. **Fallback**: Try alternative selectors if primary fails
3. **Position**: Always use `bounds().centerX()` and `bounds().centerY()`

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
            markdownFile: "note_001_1753871876436.md",
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

## 8. UI Elements (UI元素)

Based on screenshots:

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
    
    // Note content
    noteTitle: /^[^#\n]+🔥?$/,
    hashtags: /#[^\s]+/g,
    viewCount: /◎浏览\d+/,
    dateLocation: /\d{2}-\d{2}\s+[^\n]+/,
    
    // Restaurant (POSITION-BASED extraction)
    merchantDetailsHeader: "商户详情",
    restaurantRating: /\d+\.\d+分/,
    restaurantAddress: /[^\n]+区[^\n]+号/
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
```javascript
function processNote(noteIndex) {
    // Extract note title first
    const noteTitle = extractNoteTitle();
    
    // Check if already downloaded
    if (isNoteDownloaded(noteTitle)) {
        toastLog(`Note already downloaded: ${noteTitle}`);
        return false;
    }
    
    // Download images
    const { imageCount, imagePaths } = downloadNoteImages(noteIndex);
    
    // Move images to organized structure
    const movedImages = moveImagesFromAppDirectory(noteIndex, imageCount);
    
    // Extract text content
    const noteContent = extractNoteContent();
    
    // Extract restaurant info
    const restaurantInfo = extractRestaurantDetails();
    
    // Generate markdown
    const noteData = {
        title: noteTitle,
        timestamp: new Date().toISOString(),
        viewCount: extractViewCount(),
        restaurantName: restaurantInfo.name,
        imageCount: imageCount,
        markdownFile: `note_${String(noteIndex).padStart(3, '0')}_${Date.now()}.md`,
        imagePrefix: `note_${String(noteIndex).padStart(3, '0')}`,
        contentHash: generateContentHash(noteContent),
        downloadDate: new Date().toISOString(),
        images: movedImages
    };
    
    const markdownPath = generateMarkdownOnMobile(noteData);
    
    // Update metadata
    addDownloadedNote(noteData);
    
    toastLog(`Successfully processed note: ${noteTitle}`);
    return true;
}
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
├── markdown/
│   ├── note_001_1753871876436.md
│   ├── note_002_1753871876437.md
│   └── note_003_1753871876438.md
├── images/
│   ├── note_001_image_001.png  ← All images in one directory
│   ├── note_001_image_002.png
│   ├── note_001_image_003.png
│   ├── note_002_image_001.png
│   ├── note_002_image_002.png
│   ├── note_003_image_001.png
│   └── note_003_image_002.png
├── downloaded_notes.json  ← Metadata persistence
└── download_state.json    ← Session state
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
- **Format**: `note_XXX_TIMESTAMP.md`
- **Example**: `note_001_1753871876436.md`
- **Benefits**:
  - Unique timestamps prevent conflicts
  - Clear note sequence
  - Easy to match with images

---

## 19. Recent Implementation Improvements (最近实施改进)

### 19.1 Dynamic Sleep Anti-Detection (动态睡眠反检测)
- **Implemented `dynamicSleep()` function** with randomized timing (1500-4000ms)
- **Replaced all static `sleep()` calls** with dynamic timing
- **Added operation-specific delays** for different UI interactions
- **Prioritized safety over speed** to avoid automation detection

### 19.2 Enhanced Image Download Process (增强的图像下载流程)
- **Removed dependency on `clickFirstImage()`** - now uses `clickNoteImage()` with fixed bounds
- **Implemented `findAndClickMenuButton()`** with multiple detection strategies
- **Added specific bounds for "..." button** `(924,146,1044,266)` for reliable clicking
- **Avoided "<" button** to prevent accidental back() actions
- **Removed unreliable "保存成功" message detection** - replaced with dynamic sleep

### 19.3 Improved Swipe Functionality (改进的滑动功能)
- **Enhanced `swipeToNextImage()`** with multiple strategies
- **Longer swipe distance** (90% to 10% of screen width)
- **Multiple Y positions** (30%, 50%, 70% of screen height)
- **Success verification** by checking image counter changes
- **Fallback strategies** if primary swipe fails

### 19.4 Menu Button Detection (菜单按钮检测)
- **Multiple text patterns**: `["...", "⋮", "⋯", "更多", "菜单"]`
- **Specific bounds clicking** for reliable menu access
- **ImageView detection** in top-right area
- **Position-based fallback** as last resort
- **Comprehensive error handling** with detailed logging

### 19.5 Image Counter Pattern Fix (图像计数器模式修复)
- **Updated regex pattern** from `/^\d+\/\d+$/` to `/^\d+\s*\/\s*\d+$/`
- **Handles spaces around slash** in "1 / 7" format
- **More robust pattern matching** for different app versions

### 19.6 Success Criteria Achievements (成功标准达成)
- ✅ **Image download works reliably** with pagination support
- ✅ **Dynamic sleep prevents detection** with human-like timing
- ✅ **Menu button detection robust** with multiple strategies
- ✅ **Swipe functionality enhanced** with fallback approaches
- ✅ **File organization successful** with proper naming conventions
- ✅ **Error handling comprehensive** with detailed logging

---

*Revised design with flat image directory structure using filename-based mapping for easier browsing, enhanced with dynamic sleep anti-detection and robust image download functionality.* 

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

#### Step 3: Extract Note Title
**Requirement**: Capture the note title (e.g., "1987年炭火鸡! 派潭第一鸡名不虚传🔥")
**Implementation**:
- Use `extractNoteTitle()` function
- Search for text elements in lower part of screen (below 30% height)
- Filter out user nickname ("尘世中的小吃货"), view counts ("◎"), hashtags ("#")
- Return first valid title found

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
**Requirement**: Capture all the text of the note. We usually need to scroll down the screen to see all the text, depending on how long the note is. The note ends above the restaurant name.
**Implementation**:
```
PSEUDO CODE:
extractNoteContent():
  - Find all TextView elements
  - Filter out UI elements (view counts, hashtags, etc.)
  - Combine text content
  - Handle scrolling if content is long
  - Stop at restaurant name boundary
```

#### Step 8: Extract Restaurant Information
**Requirement**: Capture the name of the restaurant. To do this, click the component with the restaurant name; it will show another page with the full name of the restaurant under "商户详情".
**Implementation**:
```
PSEUDO CODE:
extractRestaurantDetails():
  - Click on restaurant name component
  - Navigate to restaurant detail page
  - Look for "商户详情" header
  - Extract restaurant name between header and rating
  - Navigate back to note page
```

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
  - Use filename pattern: note_XXX_TIMESTAMP.md
```

#### Step 10: Update Metadata and Resume
**Requirement**: We may want to accept an argument when running the script for how many notes we are going to download this time. How can we remember where we were, since we don't want to duplicate what we have downloaded?
**Implementation**:
```
PSEUDO CODE:
metadataManagement():
  - Save note title to downloaded_notes.json
  - Track download progress and timestamps
  - Check for duplicates before processing
  - Resume from last successful position
  - Handle user input for max notes to download
```

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