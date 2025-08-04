'use strict';

/**
 * Dianping Notes Downloader
 * 大众点评笔记下载器
 * 
 * This script downloads self-created restaurant notes/reviews from Dianping app
 * 此脚本用于从大众点评应用下载自创的餐厅笔记/评价
 * 
 * Features:
 * - Page verification and navigation
 * - Image capture and saving
 * - Note data extraction
 * - File system operations
 * - HTTP requests for data backup
 */

// Constants
const TARGET_PACKAGE = "com.dianping.v1";
const APP_NAME = "大众点评";
const USER_NICKNAME = "尘世中的小吃货"; // User nickname from the image
const NOTES_TAB_TEXT = "笔记"; // Notes tab text

// Configuration
const CONFIG = {
    maxNotesToDownload: 1, // Test with just one note
    baseDownloadDir: "/storage/emulated/0/Download/dianping_notes/",
    imagesSubDir: "images/",
    markdownSubDir: "markdown/",
    stateFile: "download_state.json",
    metadataFile: "downloaded_notes.json",
    appImagesDir: "/storage/emulated/0/Pictures/", // Default app image location
    navigationDelay: 2000,
    imageDownloadDelay: 2000,
    scrollDelay: 1500,
    detectNewNotes: true,
    downloadNewNotes: true,
    maxNewNotesPerSession: 5,
    notifyOnGrowth: true,
    maxSessionDuration: 30, // minutes
    maxNotesPerSession: 20,
    autoResume: true,
    // Dynamic sleep configuration to avoid automation detection
    minSleepTime: 1500,  // Minimum sleep time in milliseconds
    maxSleepTime: 4000,  // Maximum sleep time in milliseconds
    saveOperationDelay: 3000, // Delay for save operations
    swipeDelay: 2000,    // Delay after swipe operations
    menuClickDelay: 1500  // Delay after menu clicks
};

// State management
const STATE = {
    lastDownloadedNote: 0,
    totalNotesProcessed: 0,
    downloadStartTime: null,
    lastDownloadedTimestamp: null,
    knownNoteTitles: [],
    totalNotesAtStart: 0,
    currentTotalNotes: 0,
    newNotesDetected: 0,
    sessionStartTime: null,
    sessionId: null
};

/**
 * Generates a random sleep time to avoid automation detection
 * 生成随机睡眠时间以避免自动化检测
 * 
 * @param {number} minTime - Minimum sleep time in milliseconds
 * @param {number} maxTime - Maximum sleep time in milliseconds
 * @returns {number} - Random sleep time in milliseconds
 */
function dynamicSleep(minTime = CONFIG.minSleepTime, maxTime = CONFIG.maxSleepTime) {
    const sleepTime = Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;
    toastLog(`Sleeping for ${sleepTime}ms (dynamic)`);
    sleep(sleepTime);
    return sleepTime;
}

/**
 * Checks whether the application is currently displaying the user's profile page
 * 检查应用是否当前显示用户个人资料页面
 * 
 * @param {string} indicatorText - The text identifier for the target page
 * @returns {boolean} - true if on desired page
 */
function isOnDesiredPage(indicatorText) {
    const pageIndicator = className("android.widget.TextView").text(indicatorText);
    const isFound = pageIndicator.exists();
    return isFound;
}

/**
 * Verifies we're on the user's profile page with correct nickname
 * 验证我们在用户个人资料页面，昵称正确
 * 
 * @returns {boolean} - true if on correct profile page
 */
function isOnUserProfilePage() {
    // Look for the user nickname in the header
    const nicknameElement = className("android.widget.TextView").text(USER_NICKNAME);
    if (!nicknameElement.exists()) {
        toastLog(`User nickname "${USER_NICKNAME}" not found on current page`);
        return false;
    }
    
    // Look for the "笔记" tab to confirm we're on the profile page
    const notesTab = className("android.widget.TextView").text(NOTES_TAB_TEXT);
    if (!notesTab.exists()) {
        toastLog(`Notes tab "${NOTES_TAB_TEXT}" not found on current page`);
        return false;
    }
    
    toastLog(`Successfully verified we're on user profile page for "${USER_NICKNAME}"`);
    return true;
}

/**
 * Creates necessary directories for downloads
 * 创建下载所需的目录
 */
function createDownloadDirectories() {
    try {
        // Create main download directory
        files.ensureDir(CONFIG.baseDownloadDir);
        toastLog(`Created download directory: ${CONFIG.baseDownloadDir}`);
        
        // Create markdown subdirectory
        const markdownDir = files.join(CONFIG.baseDownloadDir, CONFIG.markdownSubDir);
        files.ensureDir(markdownDir);
        toastLog(`Created markdown directory: ${markdownDir}`);
        
        // Create images subdirectory
        const imagesDir = files.join(CONFIG.baseDownloadDir, CONFIG.imagesSubDir);
        files.ensureDir(imagesDir);
        toastLog(`Created images directory: ${imagesDir}`);
        
        return true;
    } catch (error) {
        toastLog(`Error creating directories: ${error.message}`);
        return false;
    }
}

/**
 * Loads downloaded notes metadata from file
 * 从文件加载已下载笔记的元数据
 * 
 * @returns {Object} - Metadata object
 */
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

/**
 * Saves downloaded notes metadata to file
 * 保存已下载笔记的元数据到文件
 * 
 * @param {Object} metadata - Metadata object to save
 */
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

/**
 * Checks if a note is already downloaded by title
 * 通过标题检查笔记是否已下载
 * 
 * @param {string} noteTitle - Note title to check
 * @returns {boolean} - true if already downloaded
 */
function isNoteDownloaded(noteTitle) {
    const metadata = loadDownloadedNotes();
    return metadata.notes.some(note => note.title === noteTitle);
}

/**
 * Adds a downloaded note to metadata
 * 将已下载的笔记添加到元数据
 * 
 * @param {Object} noteData - Note data to add
 */
function addDownloadedNote(noteData) {
    const metadata = loadDownloadedNotes();
    metadata.notes.push(noteData);
    metadata.totalDownloaded = metadata.notes.length;
    saveDownloadedNotes(metadata);
}

/**
 * Displays metadata statistics
 * 显示元数据统计信息
 */
function displayMetadataStats() {
    const metadata = loadDownloadedNotes();
    const totalNotes = metadata.notes.length;
    const totalImages = metadata.notes.reduce((sum, note) => sum + (note.imageCount || 0), 0);
    
    toastLog("📊 Metadata Statistics:");
    toastLog(`📊 元数据统计:`);
    toastLog(`   Total notes: ${totalNotes}`);
    toastLog(`   笔记总数: ${totalNotes}`);
    toastLog(`   Total images: ${totalImages}`);
    toastLog(`   图片总数: ${totalImages}`);
    toastLog(`   Last updated: ${metadata.lastUpdated || 'Never'}`);
    toastLog(`   最后更新: ${metadata.lastUpdated || '从未'}`);
    
    if (totalNotes > 0) {
        const latestNote = metadata.notes[metadata.notes.length - 1];
        toastLog(`   Latest note: ${latestNote.title}`);
        toastLog(`   最新笔记: ${latestNote.title}`);
    }
}

/**
 * Navigates to the notes tab
 * 导航到笔记标签页
 * 
 * @returns {boolean} - true if successful
 */
function navigateToNotesTab() {
    try {
        const notesTab = text(NOTES_TAB_TEXT).findOne(3000);
        if (!notesTab) {
            toastLog("Notes tab not found");
            return false;
        }
        
        // Use position-based clicking
        click(notesTab.bounds().centerX(), notesTab.bounds().centerY());
        dynamicSleep(CONFIG.navigationDelay, CONFIG.navigationDelay + 1000);
        
        toastLog("Successfully navigated to notes tab");
        return true;
    } catch (error) {
        toastLog(`Error navigating to notes tab: ${error.message}`);
        return false;
    }
}

/**
 * Extracts note title from current page
 * 从当前页面提取笔记标题
 * 
 * @returns {string|null} - Note title or null if not found
 */
function extractNoteTitle() {
    try {
        // Look for title at depth 29 specifically
        // The title should be the first prominent text element at depth 29
        const textElements = className("android.widget.TextView").find();
        const depth29TextViews = [];
        
        // Filter textviews at depth 29
        for (let element of textElements) {
            if (element.depth() === 29) {
                depth29TextViews.push(element);
            }
        }
        
        toastLog(`Found ${depth29TextViews.length} textviews at depth 29`);
        
        // Debug: Show all depth 29 textviews
        for (let i = 0; i < depth29TextViews.length; i++) {
            const tv = depth29TextViews[i];
            toastLog(`Depth 29 TextView ${i + 1}: "${tv.text()}"`);
        }
        
        // Look for the first valid title at depth 29
        for (let element of depth29TextViews) {
            const text = element.text();
            
            // Check if text is valid for a title
            if (text && text.length > 5 && text.length < 100) {
                // Skip user nickname and other UI elements
                if (!text.includes('尘世中的小吃货') && !text.includes('◎') && !text.includes('#')) {
                    const noteTitle = text.trim();
                    toastLog(`Extracted note title at depth 29: ${noteTitle}`);
                    return noteTitle;
                }
            }
        }
        
        toastLog("No note title found at depth 29");
        return null;
    } catch (error) {
        toastLog(`Error extracting note title: ${error.message}`);
        return null;
    }
}

/**
 * Clicks on the first image to open gallery
 * 点击第一张图片打开图库
 * 
 * @returns {boolean} - true if successful
 */
function clickFirstImage() {
    try {
        // Look for elements with desc = 'reculike_main_image'
        const imageElements = desc("reculike_main_image").find();
        if (imageElements.length > 0) {
            const firstImage = imageElements[0];
            // Use position-based clicking like in cancel_follows.js
            click(firstImage.bounds().centerX(), firstImage.bounds().centerY());
            dynamicSleep(CONFIG.imageDownloadDelay, CONFIG.imageDownloadDelay + 1000);
            toastLog("Clicked on first image using position-based click");
            return true;
        }
        
        // Fallback: try to find image elements with different selectors
        const fallbackElements = className("android.widget.ImageView").find();
        if (fallbackElements.length > 0) {
            const firstElement = fallbackElements[0];
            click(firstElement.bounds().centerX(), firstElement.bounds().centerY());
            dynamicSleep(CONFIG.imageDownloadDelay, CONFIG.imageDownloadDelay + 1000);
            toastLog("Clicked on first image using fallback method");
            return true;
        }
        
        toastLog("No image elements found to click");
        return false;
    } catch (error) {
        toastLog(`Error clicking first image: ${error.message}`);
        return false;
    }
}

/**
 * Clicks on the image in note page to open gallery
 * 在笔记页面点击图片打开图库
 * 
 * @returns {boolean} - true if successful
 */
function clickNoteImage() {
    try {
        // Use fixed bounds for note page image clicking
        // This should work for every note page
        const imageBounds = [0, 254, 1080, 1694];
        const centerX = (imageBounds[0] + imageBounds[2]) / 2;
        const centerY = (imageBounds[1] + imageBounds[3]) / 2;
        
        click(centerX, centerY);
        dynamicSleep(CONFIG.imageDownloadDelay, CONFIG.imageDownloadDelay + 1000);
        toastLog("Clicked on note image using fixed bounds");
        return true;
        
    } catch (error) {
        toastLog(`Error clicking note image: ${error.message}`);
        return false;
    }
}

/**
 * Scrolls to find the next undownloaded note on home page
 * 滚动查找下一个未下载的笔记
 * 
 * @returns {boolean} - true if found undownloaded note, false if no more notes
 */
function scrollToNextUndownloadedNote() {
    try {
        const maxScrollAttempts = 10; // Prevent infinite scrolling
        let scrollAttempts = 0;
        
        while (scrollAttempts < maxScrollAttempts) {
            scrollAttempts++;
            toastLog(`Scroll attempt ${scrollAttempts}/${maxScrollAttempts} to find undownloaded note`);
            
            // Scroll down to reveal more notes
            const screenHeight = device.height;
            swipe(device.width / 2, screenHeight * 0.8, device.width / 2, screenHeight * 0.2, 500);
            dynamicSleep(CONFIG.scrollDelay, CONFIG.scrollDelay + 1000);
            
            // Wait for new content to load
            dynamicSleep(1000, 2000);
            
            // Check if we can find any note titles after scrolling
            const noteTitle = extractNoteTitle();
            if (noteTitle) {
                // Check if this note is already downloaded
                if (!isNoteDownloaded(noteTitle)) {
                    toastLog(`✅ Found undownloaded note: ${noteTitle}`);
                    return true;
                } else {
                    toastLog(`Found downloaded note: ${noteTitle}, continuing to scroll...`);
                    // Continue scrolling to find next note
                }
            } else {
                toastLog("No note titles found after scroll, may have reached end");
                // Check if we're at the bottom by looking for end-of-list indicators
                const endOfList = text("没有更多内容").findOne(2000) || 
                                 text("已显示全部").findOne(2000) ||
                                 text("到底了").findOne(2000);
                if (endOfList) {
                    toastLog("Reached end of notes list");
                    return false;
                }
            }
        }
        
        toastLog(`Reached maximum scroll attempts (${maxScrollAttempts})`);
        return false;
        
    } catch (error) {
        toastLog(`Error scrolling to next undownloaded note: ${error.message}`);
        return false;
    }
}

/**
 * Clicks on the first note to navigate to note page
 * 点击第一个笔记导航到笔记页面
 * 
 * @returns {boolean} - true if successful
 */
function clickFirstNote() {
    try {
        // Look for clickable note elements on home page
        const noteElements = desc("reculike_main_image").find();
        if (noteElements.length > 0) {
            const firstNote = noteElements[0];
            click(firstNote.bounds().centerX(), firstNote.bounds().centerY());
            dynamicSleep(CONFIG.navigationDelay, CONFIG.navigationDelay + 1000);
            toastLog("Clicked on first note to navigate to note page");
            return true;
        }
        
        // Fallback: try to find any clickable area
        const clickableElements = className("android.widget.ImageView").find();
        if (clickableElements.length > 0) {
            const firstElement = clickableElements[0];
            click(firstElement.bounds().centerX(), firstElement.bounds().centerY());
            dynamicSleep(CONFIG.navigationDelay, CONFIG.navigationDelay + 1000);
            toastLog("Clicked on first note using fallback method");
            return true;
        }
        
        toastLog("No note elements found to click");
        return false;
    } catch (error) {
        toastLog(`Error clicking first note: ${error.message}`);
        return false;
    }
}

/**
 * Finds and clicks the menu button in gallery
 * 在图库中查找并点击菜单按钮
 * 
 * @returns {boolean} - true if successful
 */
function findAndClickMenuButton() {
    try {
        // Strategy 1: Try multiple text patterns for menu button with specific bounds
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
        // "..." bounds: (924,146,1044,266)
        const threeDotsBounds = [924, 146, 1044, 266];
        const threeDotsCenterX = (threeDotsBounds[0] + threeDotsBounds[2]) / 2;
        const threeDotsCenterY = (threeDotsBounds[1] + threeDotsBounds[3]) / 2;
        
        // Note: "<" bounds (30,146,150,266) are for future back() functionality, not menu detection
        // const backButtonBounds = [30, 146, 150, 266];
        
        // Try clicking "..." (menu button, not back button)
        toastLog("Trying to click '...' at specific bounds");
        click(threeDotsCenterX, threeDotsCenterY);
        dynamicSleep(CONFIG.menuClickDelay, CONFIG.menuClickDelay + 1000);
        
        // Check if menu options appeared
        const saveOption = text("保存图片").findOne(2000);
        if (saveOption) {
            toastLog("Menu appeared after clicking '...' at specific bounds");
            return true;
        }
        
        // Strategy 3: Look for ImageView elements in top-right area (fallback)
        const imageViewElements = className("android.widget.ImageView").find();
        if (imageViewElements.length > 0) {
            const screenWidth = device.width;
            const screenHeight = device.height;
            
            for (let element of imageViewElements) {
                const bounds = element.bounds();
                const centerX = bounds.centerX();
                const centerY = bounds.centerY();
                
                // Check if it's in the top-right area (likely a menu button, not back button)
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
        
        // Check if menu options appeared
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

/**
 * Downloads the current image in gallery
 * 下载图库中的当前图片
 * 
 * @param {number} noteIndex - Note index for naming
 * @param {number} imageNumber - Image number in sequence
 * @returns {string|null} - Image filename or null if failed
 */
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
        dynamicSleep(CONFIG.saveOperationDelay, CONFIG.saveOperationDelay + 1000); // Additional wait for save operation
        
        const imageName = `note_${String(noteIndex).padStart(3, '0')}_image_${String(imageNumber).padStart(3, '0')}.png`;
        toastLog(`Image ${imageNumber} downloaded successfully: ${imageName}`);
        return imageName;
        
    } catch (error) {
        toastLog(`Error downloading image ${imageNumber}: ${error.message}`);
        return null;
    }
}

/**
 * Swipes to next image in gallery with multiple strategies
 * 在图库中滑动到下一张图片，使用多种策略
 * 
 * @returns {boolean} - true if successful
 */
function swipeToNextImage() {
    try {
        // Strategy 1: Longer swipe distance (more aggressive)
        const startX = device.width * 0.9;  // Start from 90% of screen width
        const endX = device.width * 0.1;    // End at 10% of screen width
        const centerY = device.height * 0.5; // Center of screen height
        
        toastLog(`Swiping from ${startX} to ${endX} at Y=${centerY}`);
        swipe(startX, centerY, endX, centerY, 800); // Longer duration
        dynamicSleep(CONFIG.swipeDelay, CONFIG.swipeDelay + 1000); // Dynamic wait time
        
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

/**
 * Downloads all images from current note
 * 下载当前笔记的所有图片
 * 
 * @param {number} noteIndex - Note index for naming
 * @returns {Object} - Object with imageCount and imagePaths
 */
function downloadNoteImages(noteIndex) {
    let imageCount = 0;
    const imagePaths = [];
    
    toastLog(`Starting image download for note ${noteIndex}`);
    
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

/**
 * Moves images from app directory to organized structure
 * 将图片从应用目录移动到有组织的结构中
 * 
 * @param {number} noteIndex - Note index for naming
 * @param {number} imageCount - Number of images to move
 * @returns {Array} - Array of moved image objects
 */
function moveImagesFromAppDirectory(noteIndex, imageCount) {
    const imagesDir = files.join(CONFIG.baseDownloadDir, CONFIG.imagesSubDir);
    files.ensureDir(imagesDir);
    const movedImages = [];
    
    try {
        // Get list of files in Pictures directory
        const pictureFiles = files.listDir(CONFIG.appImagesDir);
        const imageFiles = pictureFiles.filter(file => file.endsWith('.jpg') || file.endsWith('.png'));
        
        // Sort by filename (newer files typically have later timestamps in filename)
        // Files have format like promphoto_1754016938841.png (timestamp in milliseconds)
        const recentImages = imageFiles
            .sort((a, b) => {
                // Extract timestamp from filename if possible
                // Look for pattern: promphoto_XXXXXXXXXXXX.png where X is digits
                const aMatch = a.match(/promphoto_(\d+)\.png/);
                const bMatch = b.match(/promphoto_(\d+)\.png/);
                
                if (aMatch && bMatch) {
                    // Both have timestamps, compare them numerically (larger number = newer)
                    const aTime = parseInt(aMatch[1]);
                    const bTime = parseInt(bMatch[1]);
                    return bTime - aTime; // Descending order (newest first)
                } else if (aMatch) {
                    // Only a has timestamp, put it first
                    return -1;
                } else if (bMatch) {
                    // Only b has timestamp, put it first
                    return 1;
                } else {
                    // Neither has timestamp, sort alphabetically (newer files often come later)
                    return b.localeCompare(a);
                }
            })
            .slice(0, imageCount); // Get the most recent images
        
        toastLog(`Found ${recentImages.length} recent images to move`);
        
        // Move images to organized structure with filename mapping
        // Reverse the numbering so newest file (last in gallery) becomes image_001
        for (let i = 0; i < recentImages.length; i++) {
            const sourcePath = files.join(CONFIG.appImagesDir, recentImages[i]);
            // Reverse the numbering: newest file (i=0) should be image_001, oldest file should be image_N
            const imageNumber = recentImages.length - i;
            const newImageName = `note_${String(noteIndex).padStart(3, '0')}_image_${String(imageNumber).padStart(3, '0')}.png`;
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
        
    } catch (error) {
        toastLog(`Error accessing Pictures directory: ${error.message}`);
    }
    
    return movedImages;
}

/**
 * Extracts note content text using hashtag marker
 * 使用话题标签标记提取笔记内容文本
 * 
 * @returns {string} - Note content
 */
function extractNoteContent() {
    try {
        // Find TextView that contains the hashtag "#尘世中的小吃货"
        const textElements = className("android.widget.TextView").find();
        let noteContent = null;
        
        for (let element of textElements) {
            const text = element.text();
            if (text && text.includes('#尘世中的小吃货')) {
                noteContent = text;
                toastLog(`Found note content TextView with hashtag marker`);
                break;
            }
        }
        
        if (noteContent) {
            toastLog(`Successfully extracted note content (${noteContent.length} characters)`);
            return noteContent.trim();
        } else {
            toastLog("No note content found with hashtag marker");
            return "No content extracted";
        }
        
    } catch (error) {
        toastLog(`Error extracting note content: ${error.message}`);
        return "Error extracting content";
    }
}

/**
 * Extracts note posting date and location
 * 提取笔记发布日期和位置
 * 
 * @returns {Object} - Object with date and location
 */
function extractNoteDateAndLocation() {
    try {
        // First, scroll down multiple times to ensure date/location elements are visible
        toastLog("Scrolling to reveal date and location elements...");
        const screenHeight = device.height;
        const maxScrollAttempts = 3; // Try up to 3 scrolls
        let dateFound = false;
        
        for (let scrollAttempt = 1; scrollAttempt <= maxScrollAttempts; scrollAttempt++) {
            toastLog(`Scroll attempt ${scrollAttempt}/${maxScrollAttempts}...`);
            swipe(device.width / 2, screenHeight * 0.8, device.width / 2, screenHeight * 0.2, 500);
            dynamicSleep(1000, 2000);
            
            // Check if we can find date elements after this scroll
            const testElements = className("android.widget.TextView").depth(19).find();
            if (testElements.length > 0) {
                let hasDatePattern = false;
                for (let element of testElements) {
                    const text = element.text();
                    const mmddMatch = text.match(/^(\d{2})-(\d{2})$/);
                    const yyyymmddMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
                    if (mmddMatch || yyyymmddMatch) {
                        hasDatePattern = true;
                        break;
                    }
                }
                if (hasDatePattern) {
                    toastLog(`✅ Date elements found after scroll attempt ${scrollAttempt}`);
                    dateFound = true;
                    break;
                }
            }
            
            if (scrollAttempt < maxScrollAttempts) {
                toastLog(`No date found yet, continuing to scroll...`);
            }
        }
        
        if (!dateFound) {
            toastLog(`⚠️ No date elements found after ${maxScrollAttempts} scroll attempts`);
        }
        
        // Use depth 19 directly since we confirmed it works
        let textElements = [];
        const elementsAtDepth19 = className("android.widget.TextView").depth(19).find();
        
        if (elementsAtDepth19.length > 0) {
            textElements = elementsAtDepth19;
            toastLog(`Found ${elementsAtDepth19.length} TextView elements at depth 19:`);
            for (let i = 0; i < elementsAtDepth19.length; i++) {
                const text = elementsAtDepth19[i].text();
                toastLog(`  [${i}] "${text}"`);
            }
        } else {
            toastLog("No TextView elements found at depth 19");
        }
        
        if (textElements.length === 0) {
            // Fallback: try without depth restriction
            textElements = className("android.widget.TextView").find();
            toastLog(`Fallback: Found ${textElements.length} TextView elements without depth restriction`);
        } else {
            toastLog(`Using depth 19 for date and location extraction`);
        }
        
        // Log all TextView contents for debugging
        toastLog("=== All TextView contents ===");
        for (let i = 0; i < textElements.length; i++) {
            const text = textElements[i].text();
            toastLog(`[${i}] "${text}"`);
        }
        toastLog("=== End TextView contents ===");
        
        let dateElement = null;
        let locationElement = null;
        
        // Since we're at depth 19, just look for date and location directly
        for (let i = 0; i < textElements.length; i++) {
            const element = textElements[i];
            const text = element.text();
            
                    // Look for date patterns (MM-DD, YYYY-MM-DD, or Chinese relative dates)
        if (!dateElement) {
            const mmddMatch = text.match(/^(\d{2})-(\d{2})$/);
            const yyyymmddMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            const chineseRelativeMatch = text.match(/^(\d+)(小时前|天前|分钟前|星期前)$/);
            const yesterdayMatch = text.match(/^昨天\s+(\d{2}):(\d{2})$/);
            const dayBeforeYesterdayMatch = text.match(/^前天\s+(\d{2}):(\d{2})$/);
            
            if (mmddMatch || yyyymmddMatch || chineseRelativeMatch || yesterdayMatch || dayBeforeYesterdayMatch) {
                dateElement = element;
                toastLog(`[${i}] Found posting date: "${text}"`);
                continue;
            }
        }
            
            // After finding date, the next element is location
            if (dateElement && !locationElement) {
                locationElement = element;
                toastLog(`[${i}] Found posting location: "${text}"`);
                break;
            }
        }
        
        let postingDate = null;
        let location = null;
        
        if (dateElement) {
            const dateText = dateElement.text();
            const mmddMatch = dateText.match(/^(\d{2})-(\d{2})$/);
            const yyyymmddMatch = dateText.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            const chineseRelativeMatch = dateText.match(/^(\d+)(小时前|天前|分钟前|星期前)$/);
            const yesterdayMatch = dateText.match(/^昨天\s+(\d{2}):(\d{2})$/);
            const dayBeforeYesterdayMatch = dateText.match(/^前天\s+(\d{2}):(\d{2})$/);
            
            if (mmddMatch) {
                // MM-DD format, assume current year
                const currentYear = new Date().getFullYear();
                const month = mmddMatch[1];
                const day = mmddMatch[2];
                postingDate = `${currentYear}${month}${day}`;
                toastLog(`Extracted date (MM-DD): ${dateText} → ${postingDate}`);
            } else if (yyyymmddMatch) {
                // YYYY-MM-DD format
                const year = yyyymmddMatch[1];
                const month = yyyymmddMatch[2];
                const day = yyyymmddMatch[3];
                postingDate = `${year}${month}${day}`;
                toastLog(`Extracted date (YYYY-MM-DD): ${dateText} → ${postingDate}`);
            } else if (chineseRelativeMatch) {
                // Chinese relative time format (e.g., "4小时前", "6天前", "7天前")
                const amount = parseInt(chineseRelativeMatch[1]);
                const unit = chineseRelativeMatch[2];
                const now = new Date();
                
                let targetDate = new Date(now);
                switch (unit) {
                    case '分钟前':
                        targetDate.setMinutes(now.getMinutes() - amount);
                        break;
                    case '小时前':
                        targetDate.setHours(now.getHours() - amount);
                        break;
                    case '天前':
                        targetDate.setDate(now.getDate() - amount);
                        break;
                    case '星期前':
                        targetDate.setDate(now.getDate() - (amount * 7));
                        break;
                }
                
                const year = targetDate.getFullYear();
                const month = String(targetDate.getMonth() + 1).padStart(2, '0');
                const day = String(targetDate.getDate()).padStart(2, '0');
                postingDate = `${year}${month}${day}`;
                toastLog(`Extracted date (Chinese relative): ${dateText} → ${postingDate}`);
            } else if (yesterdayMatch) {
                // "昨天 08:44" format
                const hour = yesterdayMatch[1];
                const minute = yesterdayMatch[2];
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                yesterday.setHours(parseInt(hour), parseInt(minute), 0, 0);
                
                const year = yesterday.getFullYear();
                const month = String(yesterday.getMonth() + 1).padStart(2, '0');
                const day = String(yesterday.getDate()).padStart(2, '0');
                postingDate = `${year}${month}${day}`;
                toastLog(`Extracted date (Yesterday): ${dateText} → ${postingDate}`);
            } else if (dayBeforeYesterdayMatch) {
                // "前天 06:45" format
                const hour = dayBeforeYesterdayMatch[1];
                const minute = dayBeforeYesterdayMatch[2];
                const dayBeforeYesterday = new Date();
                dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
                dayBeforeYesterday.setHours(parseInt(hour), parseInt(minute), 0, 0);
                
                const year = dayBeforeYesterday.getFullYear();
                const month = String(dayBeforeYesterday.getMonth() + 1).padStart(2, '0');
                const day = String(dayBeforeYesterday.getDate()).padStart(2, '0');
                postingDate = `${year}${month}${day}`;
                toastLog(`Extracted date (Day before yesterday): ${dateText} → ${postingDate}`);
            }
        }
        
        if (locationElement) {
            location = locationElement.text().trim();
            toastLog(`Extracted location: ${location}`);
        }
        
        return { postingDate, location };
        
    } catch (error) {
        toastLog(`Error extracting date and location: ${error.message}`);
        return { postingDate: null, location: null };
    }
}

/**
 * Extracts view count from note
 * 从笔记中提取浏览量
 * 
 * @returns {string} - View count
 */
function extractViewCount() {
    try {
        const viewElement = textMatches(/◎浏览\d+/).findOne(2000);
        if (viewElement) {
            const match = viewElement.text().match(/◎浏览(\d+)/);
            return match ? match[1] : "0";
        }
        return "0";
    } catch (error) {
        toastLog(`Error extracting view count: ${error.message}`);
        return "0";
    }
}

/**
 * Generates a content hash for duplicate detection
 * 生成内容哈希用于重复检测
 * 
 * @param {string} content - Content to hash
 * @returns {string} - Content hash
 */
function generateContentHash(content) {
    // Simple hash function for content
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
}

/**
 * Generates a markdown file for a note on mobile device
 * 在移动设备上为笔记生成markdown文件
 * 
 * @param {Object} noteData - Note data
 * @returns {string} - Path to generated markdown file
 */
function generateMarkdownOnMobile(noteData) {
    try {
        const markdownContent = `# ${noteData.title}

**Posting Date:** ${noteData.postingDate || 'Unknown'}  
**Location:** ${noteData.location || 'Unknown'}  
**Views:** ${noteData.viewCount}  
**Restaurant:** ${noteData.restaurantName || 'Unknown'}  
**Download Date:** ${noteData.downloadDate}  

## Images

${noteData.images.map((img, i) => `![Image ${i+1}](${img.relativePath})`).join('\n')}

## Content

${noteData.content}

---

*Downloaded by Dianping Notes Downloader v1.0*
`;

        // Ensure markdown directory exists
        const markdownDir = files.join(CONFIG.baseDownloadDir, CONFIG.markdownSubDir);
        files.ensureDir(markdownDir);
        
        // Use the markdown filename from noteData (which includes posting date)
        const filename = noteData.markdownFile;
        const filepath = files.join(markdownDir, filename);
        
        // Create file with directories
        files.createWithDirs(filepath);
        
        // Write content to the file
        files.write(filepath, markdownContent, "utf-8");
        
        toastLog(`Markdown file generated: ${filepath}`);
        return filepath;
        
    } catch (error) {
        toastLog(`Error generating markdown file: ${error.message}`);
        return null;
    }
}



/**
 * Test function for Step 8: Extract Restaurant Information
 * 测试函数：提取餐厅信息
 * 
 * Extracts restaurant name from the 2nd textview at depth 23 on the note page
 * 从笔记页面的深度23的第2个文本视图中提取餐厅名称
 * 
 * @returns {string|null} - Restaurant name or null if not found
 */
function testExtractRestaurantInformation() {
    toastLog("🔍 Testing restaurant information extraction...");
    
    try {
        // Wait for page to load
        dynamicSleep(2000, 3000);
        
        // Look for textview elements at depth 23
        const textViews = className("android.widget.TextView").find();
        const depth23TextViews = [];
        
        // Filter textviews at depth 23
        for (let tv of textViews) {
            if (tv.depth() === 23) {
                depth23TextViews.push(tv);
            }
        }
        
        toastLog(`Found ${depth23TextViews.length} textviews at depth 23`);
        
        // Get the 2nd textview at depth 23 (index 1)
        if (depth23TextViews.length >= 2) {
            const restaurantTextView = depth23TextViews[1]; // 2nd element (index 1)
            const restaurantName = restaurantTextView.text().trim();
            
            toastLog(`✅ Restaurant name extracted: "${restaurantName}"`);
            return restaurantName;
        } else {
            toastLog(`❌ Not enough textviews at depth 23. Found: ${depth23TextViews.length}`);
            
            // Debug: Show all textviews at depth 23
            for (let i = 0; i < depth23TextViews.length; i++) {
                const tv = depth23TextViews[i];
                toastLog(`Depth 23 TextView ${i + 1}: "${tv.text()}"`);
            }
            
            return null;
        }
        
    } catch (error) {
        toastLog(`❌ Error extracting restaurant information: ${error.message}`);
        return null;
    }
}

/**
 * Extract restaurant information from note page
 * 从笔记页面提取餐厅信息
 * 
 * This function should be called right after extractNoteDateAndLocation()
 * since the restaurant name is positioned right above the date/location elements
 * 此函数应在extractNoteDateAndLocation()之后立即调用，
 * 因为餐厅名称位于日期/位置元素的正上方
 * 
 * @returns {string|null} - Restaurant name or null if not found
 */
function extractRestaurantInformation() {
    toastLog("🔍 Extracting restaurant information...");
    
    try {
        // Since we're already scrolled down from extractNoteDateAndLocation(),
        // we can directly look for the restaurant name at depth 23
        // 由于我们已经从extractNoteDateAndLocation()向下滚动，
        // 可以直接查找深度23的餐厅名称
        
        // Look for textview elements at depth 23
        const textViews = className("android.widget.TextView").find();
        const depth23TextViews = [];
        
        // Filter textviews at depth 23
        for (let tv of textViews) {
            if (tv.depth() === 23) {
                depth23TextViews.push(tv);
            }
        }
        
        toastLog(`Found ${depth23TextViews.length} textviews at depth 23`);
        
        // Debug: Show all depth 23 textviews
        for (let i = 0; i < depth23TextViews.length; i++) {
            const tv = depth23TextViews[i];
            toastLog(`Depth 23 TextView ${i + 1}: "${tv.text()}"`);
        }
        
        // Get the 2nd textview at depth 23 (index 1)
        if (depth23TextViews.length >= 2) {
            const restaurantTextView = depth23TextViews[1]; // 2nd element (index 1)
            const restaurantName = restaurantTextView.text().trim();
            
            if (restaurantName && restaurantName.length > 0) {
                toastLog(`✅ Restaurant name extracted: "${restaurantName}"`);
                return restaurantName;
            } else {
                toastLog("❌ Restaurant name is empty");
                return null;
            }
        } else {
            toastLog(`❌ Not enough textviews at depth 23. Found: ${depth23TextViews.length}`);
            return null;
        }
        
    } catch (error) {
        toastLog(`❌ Error extracting restaurant information: ${error.message}`);
        return null;
    }
}

/**
 * Get user input for number of notes to download
 * 获取用户输入的下载笔记数量
 * 
 * @returns {number} - Number of notes to download
 */
function getUserInputForNoteCount() {
    toastLog("📝 Please enter the number of new notes to download:");
    toastLog("📝 请输入要下载的新笔记数量:");
    
    // Show input dialog
    const input = dialogs.rawInput("Number of notes to download", "1");
    
    // Parse the input
    let noteCount = 1; // Default value
    if (input && input.trim() !== "") {
        const parsed = parseInt(input.trim());
        if (!isNaN(parsed) && parsed > 0) {
            noteCount = parsed;
        } else {
            toastLog("⚠️ Invalid input, using default value of 1");
            toastLog("⚠️ 输入无效，使用默认值 1");
        }
    }
    
    toastLog(`🎯 Will download ${noteCount} new note(s)`);
    toastLog(`🎯 将下载 ${noteCount} 个新笔记`);
    
    return noteCount;
}

/**
 * Main function
 * 主函数
 */
function main() {
    toastLog("Starting Dianping Notes Downloader");
    toastLog("开始大众点评笔记下载器");
    
    // Get user input for number of notes to download
    const maxNotesToProcess = getUserInputForNoteCount();
    
    // Display current package name
    toastLog(`Current package: ${currentPackage()}`);
    
    // Launch or ensure the app is in focus
    if (currentPackage() !== TARGET_PACKAGE) {
        toastLog("Launching Dianping app");
        app.launchApp(APP_NAME);
        dynamicSleep(3000, 5000);
        toastLog(`Current package: ${currentPackage()}`);
    }
    
    try {
        // Wait for app to load
        dynamicSleep(2000, 3500);
        
        // Verify we're on the user's profile page
        if (!isOnUserProfilePage()) {
            toastLog("Not on the correct user profile page. Please navigate to your profile page manually.");
            toastLog("请手动导航到您的个人资料页面。");
            return;
        }
        
        toastLog("✅ Successfully verified we're on the desired page!");
        toastLog("✅ 成功验证我们在目标页面上！");
        
        // Create download directories
        if (!createDownloadDirectories()) {
            toastLog("❌ Failed to create download directories");
            return;
        }
        
        // Navigate to notes tab
        if (!navigateToNotesTab()) {
            toastLog("❌ Failed to navigate to notes tab");
            return;
        }
        
        // Load existing metadata
        const metadata = loadDownloadedNotes();
        displayMetadataStats();
        
        let processedCount = 0;
        
        // Process notes based on user input
        while (processedCount < maxNotesToProcess) {
            toastLog(`\n🔄 Processing note ${processedCount + 1}/${maxNotesToProcess}`);
            toastLog(`🔄 处理笔记 ${processedCount + 1}/${maxNotesToProcess}`);
            
            // Step 1: Extract note title from home page
            const noteTitle = extractNoteTitle();
            if (!noteTitle) {
                toastLog("Could not extract note title, skipping");
                return;
            }
            
            toastLog(`✅ Successfully extracted note title: ${noteTitle}`);
            
            // Step 2: Check if note is already downloaded
            if (isNoteDownloaded(noteTitle)) {
                toastLog(`⚠️ Note already downloaded: ${noteTitle}`);
                toastLog(`⚠️ 笔记已下载: ${noteTitle}`);
                
                // Step 2.5: Scroll to find next undownloaded note
                const scrollSuccess = scrollToNextUndownloadedNote();
                if (!scrollSuccess) {
                    toastLog("❌ No more undownloaded notes available");
                    break;
                }
                continue;
            }
            
            // Step 3: Navigate to note page for processing
            const noteClickSuccess = clickFirstNote();
            if (!noteClickSuccess) {
                toastLog("❌ Failed to navigate to note page");
                break;
            }
            
            // Wait for page transition
            dynamicSleep(CONFIG.navigationDelay, CONFIG.navigationDelay + 1000);
            
            // Step 4: Click on image in note page to open gallery
            const imageClickSuccess = clickNoteImage();
            
            if (imageClickSuccess) {
                toastLog("✅ Successfully clicked on note image!");
                toastLog("✅ 成功点击笔记图片！");
                
                // Step 5: Download images with pagination
                toastLog("Starting image download process...");
                const imageResult = downloadNoteImages(processedCount + 1); // Use processed count + 1 for note index
                
                if (imageResult && imageResult.imageCount > 0) {
                    toastLog(`✅ Successfully downloaded ${imageResult.imageCount} images!`);
                    toastLog(`✅ 成功下载 ${imageResult.imageCount} 张图片！`);
                    
                    // Step 6: Move images from app directory to organized structure
                    toastLog("Moving images to organized structure...");
                    const movedImages = moveImagesFromAppDirectory(processedCount + 1, imageResult.imageCount);
                    
                    if (movedImages && movedImages.length > 0) {
                        toastLog(`✅ Successfully moved ${movedImages.length} images to organized structure!`);
                        toastLog(`✅ 成功移动 ${movedImages.length} 张图片到有组织的结构中！`);
                        
                        // Step 7: Extract additional note data
                        const noteContent = extractNoteContent();
                        const viewCount = extractViewCount();
                        const { postingDate, location } = extractNoteDateAndLocation();
                        
                        // Step 8: Extract restaurant information (after scrolling from date/location extraction)
                        const restaurantName = extractRestaurantInformation();
                        
                        // Step 9: Create note data object for metadata
                        const noteData = {
                            title: noteTitle,
                            timestamp: new Date().toISOString(),
                            viewCount: viewCount,
                            restaurantName: restaurantName || "Unknown",
                            imageCount: imageResult.imageCount,
                            postingDate: postingDate,
                            location: location,
                            markdownFile: `note_${postingDate || 'unknown'}_${String(processedCount + 1).padStart(3, '0')}_${Date.now()}.md`,
                            imagePrefix: `note_${String(processedCount + 1).padStart(3, '0')}`,
                            contentHash: generateContentHash(noteContent),
                            downloadDate: new Date().toISOString(),
                            images: movedImages,
                            content: noteContent,
                            noteIndex: processedCount + 1
                        };
                        
                        // Step 10: Generate markdown file
                        const markdownPath = generateMarkdownOnMobile(noteData);
                        if (markdownPath) {
                            noteData.markdownPath = markdownPath;
                            toastLog(`✅ Generated markdown file: ${markdownPath}`);
                        }
                        
                        // Step 11: Update metadata
                        addDownloadedNote(noteData);
                        processedCount++;
                        
                        toastLog(`✅ Successfully processed note: ${noteTitle}`);
                        toastLog(`✅ 成功处理笔记: ${noteTitle}`);
                        toastLog(`📊 Total notes processed: ${processedCount}/${maxNotesToProcess}`);
                        toastLog(`📊 已处理笔记总数: ${processedCount}/${maxNotesToProcess}`);
                        
                        // Log the moved images for verification
                        movedImages.forEach((image, index) => {
                            toastLog(`Image ${index + 1}: ${image.originalName} → ${image.newName}`);
                        });
                        
                        // Step 12: Go back to home page for next note
                        back();
                        dynamicSleep(CONFIG.navigationDelay, CONFIG.navigationDelay + 1000);
                        
                    } else {
                        toastLog("❌ Failed to move images to organized structure");
                        toastLog("❌ 移动图片到有组织的结构失败");
                        // Go back to home page even if processing failed
                        back();
                        dynamicSleep(CONFIG.navigationDelay, CONFIG.navigationDelay + 1000);
                    }
                } else {
                    toastLog("❌ Failed to download images");
                    toastLog("❌ 下载图片失败");
                    // Go back to home page even if processing failed
                    back();
                    dynamicSleep(CONFIG.navigationDelay, CONFIG.navigationDelay + 1000);
                }
                
            } else {
                toastLog("❌ Failed to click on note image");
                toastLog("❌ 点击笔记图片失败");
                // Go back to home page even if processing failed
                back();
                dynamicSleep(CONFIG.navigationDelay, CONFIG.navigationDelay + 1000);
            }
        }
        
        toastLog(`🎉 Download session completed! Processed ${processedCount} notes.`);
        toastLog(`🎉 下载会话完成！处理了 ${processedCount} 个笔记。`);
        
    } catch (error) {
        toastLog(`Error: ${error.message}`);
        console.error("Error in main function:", error);
    }
}

// Entry point
auto.waitFor();
main(); // Switch back to main implementation
// main(); // Comment out main function for now