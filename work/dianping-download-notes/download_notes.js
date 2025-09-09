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

// ImgBB API configuration
const IMGBB_CONFIG = {
    apiKey: "b4c48cb837bf0fb4217ccac1cd27f59f",
    uploadUrl: "https://api.imgbb.com/1/upload",
    maxRetries: 3,
    retryDelay: 2000
};

// Configuration
const CONFIG = {
    maxNotesToDownload: 1, // Test with just one note
    stateFile: "download_state.json",
    metadataFile: "downloaded_notes.json",
    uploadErrorsFile: "upload_errors.log",
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
    menuClickDelay: 1500,  // Delay after menu clicks
    
    // Note position verification and adjustment configuration
    positionCheck: {
        safeMargin: 100,          // Minimum margin from screen edges in pixels
        visibilityThreshold: 0.7,  // Minimum visibility ratio (70%)
        centerThreshold: 0.15,    // Distance from center threshold (15%)
        scrollDuration: 800       // Duration for position adjustment scrolls in milliseconds
    }
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
 * Directory management configuration
 * 目录管理配置
 */
const DIRECTORY_CONFIG = {
    // Base directory structure
    baseDir: "/storage/emulated/0/Download/dianping_notes/",
    subDirs: {
        internalVault: "internal_vault/",
        externalPublic: "external_public/",
        images: "images/",
        metadata: "metadata/"
    },
    
    // Directory creation settings
    creation: {
        maxRetries: 3,
        retryDelay: 1000,
        verificationDelay: 500,
        tempFileSuffix: ".temp"
    },
    
    // Directory verification settings
    verification: {
        timeout: 5000,
        checkInterval: 200
    }
};

/**
 * Creates a directory using ensureDir with temp file method
 * 使用ensureDir和临时文件方法创建目录
 * 
 * @param {string} dirPath - Directory path to create
 * @param {string} dirName - Human-readable directory name for logging
 * @returns {boolean} - true if directory was created successfully
 */
function createDirectoryWithFallbacks(dirPath, dirName) {
    toastLog(`🔍 Creating ${dirName}: ${dirPath}`);
    
    // Check if directory already exists
    if (files.exists(dirPath)) {
        toastLog(`✅ ${dirName} already exists: ${dirPath}`);
        return true;
    }
    
    // Use temp file method with ensureDir (confirmed working)
    try {
        toastLog(`🔄 Creating ${dirName} using temp file method with ensureDir`);
        const tempFile = files.join(dirPath, DIRECTORY_CONFIG.creation.tempFileSuffix);
        files.ensureDir(tempFile);
        sleep(DIRECTORY_CONFIG.creation.verificationDelay);
        
        // Remove the temp file if it was created
        if (files.exists(tempFile)) {
            files.remove(tempFile);
            sleep(200);
        }
        
        if (files.exists(dirPath)) {
            toastLog(`✅ ${dirName} created successfully with temp file method`);
            return true;
        } else {
            toastLog(`❌ Directory not found after temp file creation`);
        }
    } catch (error) {
        toastLog(`❌ Temp file method failed: ${error.message}`);
    }
    
    toastLog(`❌ Failed to create ${dirName}`);
    return false;
}

/**
 * Verifies that a directory exists and is accessible
 * 验证目录是否存在且可访问
 * 
 * @param {string} dirPath - Directory path to verify
 * @param {string} dirName - Human-readable directory name for logging
 * @returns {boolean} - true if directory is accessible
 */
function verifyDirectoryAccess(dirPath, dirName) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < DIRECTORY_CONFIG.verification.timeout) {
        if (files.exists(dirPath)) {
            // Try to create a test file to verify write access
            try {
                const testFile = files.join(dirPath, ".test");
                files.write(testFile, "test", "utf-8");
                files.remove(testFile);
                toastLog(`✅ ${dirName} verified and writable: ${dirPath}`);
                return true;
            } catch (error) {
                toastLog(`❌ ${dirName} exists but not writable: ${error.message}`);
                return false;
            }
        }
        sleep(DIRECTORY_CONFIG.verification.checkInterval);
    }
    
    toastLog(`❌ ${dirName} verification timeout: ${dirPath}`);
    return false;
}

/**
 * Creates all necessary directories for downloads
 * 创建下载所需的所有目录
 * 
 * @returns {boolean} - true if all directories were created successfully
 */
function createDownloadDirectories() {
    toastLog("📁 Starting directory creation process...");
    
    try {
        // Create base directory first
        if (!createDirectoryWithFallbacks(DIRECTORY_CONFIG.baseDir, "Base directory")) {
            toastLog("❌ Failed to create base directory");
            return false;
        }
        
        // Create all subdirectories
        const subDirResults = [];
        
        // Internal vault directory
        const internalVaultDir = files.join(DIRECTORY_CONFIG.baseDir, DIRECTORY_CONFIG.subDirs.internalVault);
        subDirResults.push({
            path: internalVaultDir,
            name: "Internal vault directory",
            success: createDirectoryWithFallbacks(internalVaultDir, "Internal vault directory")
        });
        
        // External public directory
        const externalPublicDir = files.join(DIRECTORY_CONFIG.baseDir, DIRECTORY_CONFIG.subDirs.externalPublic);
        subDirResults.push({
            path: externalPublicDir,
            name: "External public directory",
            success: createDirectoryWithFallbacks(externalPublicDir, "External public directory")
        });
        
        // Metadata directory
        const metadataDir = files.join(DIRECTORY_CONFIG.baseDir, DIRECTORY_CONFIG.subDirs.metadata);
        subDirResults.push({
            path: metadataDir,
            name: "Metadata directory",
            success: createDirectoryWithFallbacks(metadataDir, "Metadata directory")
        });
        
        // Images directory (inside internal vault)
        const imagesDir = files.join(internalVaultDir, DIRECTORY_CONFIG.subDirs.images);
        subDirResults.push({
            path: imagesDir,
            name: "Images directory",
            success: createDirectoryWithFallbacks(imagesDir, "Images directory")
        });
        

        
        // Verify all directories were created successfully
        const failedDirs = subDirResults.filter(result => !result.success);
        if (failedDirs.length > 0) {
            toastLog("❌ Failed to create the following directories:");
            failedDirs.forEach(dir => {
                toastLog(`   - ${dir.name}: ${dir.path}`);
            });
            return false;
        }
        
        // Final verification of all directories
        toastLog("🔍 Final verification of all directories:");
        const allDirs = [
            { path: DIRECTORY_CONFIG.baseDir, name: "Base" },
            ...subDirResults
        ];
        
        let allVerified = true;
        allDirs.forEach(dir => {
            const verified = verifyDirectoryAccess(dir.path, dir.name);
            toastLog(`📁 ${dir.name}: ${verified ? '✅' : '❌'} ${dir.path}`);
            if (!verified) {
                allVerified = false;
            }
        });
        
        if (allVerified) {
            toastLog("✅ All directories created and verified successfully");
            return true;
        } else {
            toastLog("❌ Some directories failed verification");
            return false;
        }
        
    } catch (error) {
        toastLog(`❌ Error creating directories: ${error.message}`);
        return false;
    }
}

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
 * Loads downloaded notes metadata from file
 * 从文件加载已下载笔记的元数据
 * 
 * @returns {Object} - Metadata object
 */
function loadDownloadedNotes() {
    try {
        const metadataDir = files.join(DIRECTORY_CONFIG.baseDir, DIRECTORY_CONFIG.subDirs.metadata);
        const metadataPath = files.join(metadataDir, CONFIG.metadataFile);
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
        const metadataDir = files.join(DIRECTORY_CONFIG.baseDir, DIRECTORY_CONFIG.subDirs.metadata);
        const metadataPath = files.join(metadataDir, CONFIG.metadataFile);
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
/**
 * Checks if a note element is properly positioned within the visible screen
 * 检查笔记元素是否在可见屏幕内正确定位
 * 
 * @param {UiObject} element - The note element to check
 * @returns {Object} - Position status with recommended action
 */
function checkNotePosition(element) {
    const bounds = element.bounds();
    const screenHeight = device.height;
    const screenWidth = device.width;
    const safeMargin = CONFIG.positionCheck.safeMargin;
    
    // Validate bounds to prevent negative height issues
    const elementHeight = bounds.height();
    if (elementHeight <= 0) {
        toastLog(`⚠️ WARNING: Invalid element bounds (height: ${elementHeight}), assuming element needs positioning`);
        // Treat invalid bounds as needing positioning
        return {
            isPositioned: false,
            issue: "invalid_bounds",
            action: "scroll_up",
            distance: 300, // Default scroll distance
            visibilityRatio: 0
        };
    }
    
    // CRITICAL: Check Y-axis positioning first (X-axis doesn't matter)
    
    // Check if element is completely below visible screen
    if (bounds.top > screenHeight) {
        const scrollDistance = bounds.top - screenHeight + safeMargin;
        toastLog(`📍 Note is below screen (top=${bounds.top} > screenHeight=${screenHeight}), scrolling up ${Math.round(scrollDistance)}px`);
        return {
            isPositioned: false,
            issue: "below_screen",
            action: "scroll_up",
            distance: scrollDistance,
            visibilityRatio: 0
        };
    }
    
    // Check if element is completely above visible screen
    if (bounds.bottom < 0) {
        const scrollDistance = bounds.bottom - safeMargin;
        toastLog(`📍 Note is above screen (bottom=${bounds.bottom} < 0), scrolling down ${Math.round(Math.abs(scrollDistance))}px`);
        return {
            isPositioned: false,
            issue: "above_screen",
            action: "scroll_down",
            distance: scrollDistance,
            visibilityRatio: 0
        };
    }
    
    // Check if element is partially visible (Y-axis visibility calculation)
    const visibleTop = Math.max(bounds.top, 0);
    const visibleBottom = Math.min(bounds.bottom, screenHeight);
    const visibleHeight = visibleBottom - visibleTop;
    const totalHeight = elementHeight;
    const visibilityRatio = visibleHeight / totalHeight;
    
    if (visibilityRatio < CONFIG.positionCheck.visibilityThreshold) {
        if (bounds.top < safeMargin) {
            // Element is partially visible at top - scroll down
            return {
                isPositioned: false,
                issue: "partially_visible_top",
                action: "scroll_down",
                visibilityRatio: visibilityRatio,
                distance: bounds.top - safeMargin
            };
        } else if (bounds.bottom > screenHeight - safeMargin) {
            // Element is partially visible at bottom - scroll up
            return {
                isPositioned: false,
                issue: "partially_visible_bottom",
                action: "scroll_up",
                visibilityRatio: visibilityRatio,
                distance: bounds.bottom - screenHeight + safeMargin
            };
        }
    }
    
    // Check if element is too close to screen edges (Y-axis only)
    if (bounds.top < safeMargin) {
        return {
            isPositioned: false,
            issue: "near_top_edge",
            action: "scroll_down",
            distance: bounds.top - safeMargin
        };
    }
    
    if (bounds.bottom > screenHeight - safeMargin) {
        return {
            isPositioned: false,
            issue: "near_bottom_edge",
            action: "scroll_up",
            distance: bounds.bottom - screenHeight + safeMargin
        };
    }
    
    // Check if element is centered well for clicking (Y-axis only)
    const centerThreshold = screenHeight * CONFIG.positionCheck.centerThreshold;
    const screenCenter = screenHeight / 2;
    const elementCenter = bounds.centerY();
    const distanceFromCenter = Math.abs(elementCenter - screenCenter);
    
    if (distanceFromCenter > centerThreshold) {
        return {
            isPositioned: true,
            issue: "not_centered",
            action: "optional_center",
            distance: elementCenter - screenCenter,
            visibilityRatio: visibilityRatio
        };
    }
    
    return {
        isPositioned: true,
        issue: "well_positioned",
        action: "proceed",
        visibilityRatio: visibilityRatio
    };
}

/**
 * Adjusts screen position to properly display a note element
 * 调整屏幕位置以正确显示笔记元素
 * 
 * @param {UiObject} element - The note element to position
 * @param {Object} positionStatus - Result from checkNotePosition()
 * @param {string} noteTitle - The title of the note for tracking
 * @param {number} noteIndex - The original index of the note
 * @returns {boolean} - true if positioning was successful
 */
function adjustNotePosition(originalElement, originalPositionStatus, noteTitle = "", noteIndex = -1) {
    try {
        if (originalPositionStatus.action === "proceed") {
            return true; // No adjustment needed
        }
        
        const screenHeight = device.height;
        const screenWidth = device.width;
        const maxAttempts = 5; // Maximum positioning attempts
        let attempt = 0;
        
        toastLog(`🎯 Starting iterative positioning for: ${originalPositionStatus.issue}`);
        
        // Always perform initial scroll for invalid bounds or below screen cases
        if (originalPositionStatus.issue === "invalid_bounds" || originalPositionStatus.issue === "below_screen") {
            attempt = 1; // Start with attempt 1 since we're doing the first scroll
            
            // Calculate initial scroll distance
            let scrollDistance = screenHeight * 0.8; // Scroll up 80% of screen height
            let scrollDirection = "up";
            
            // Calculate swipe parameters using the same pattern as working swipe
            const startX = screenWidth / 2; // Center horizontally
            const startY = screenHeight * 0.8; // Start from 80% down (same as working swipe)
            const endX = screenWidth / 2; // Center horizontally
            const endY = startY - scrollDistance; // Scroll up
            
            toastLog(`🔄 Attempt ${attempt}: Initial scroll up ${Math.round(scrollDistance)}px for ${originalPositionStatus.issue}`);
            toastLog(`🔧 Swipe params: startX=${Math.round(startX)}, startY=${Math.round(startY)}, endX=${Math.round(endX)}, endY=${Math.round(endY)}, duration=500`);
            
            // Perform the scroll
            toastLog(`⚡ Executing initial scroll...`);
            swipe(startX, startY, endX, endY, 500);
            toastLog(`✅ Initial scroll completed, waiting for UI to settle...`);
            dynamicSleep(CONFIG.navigationDelay, CONFIG.navigationDelay + 500);
            
            // Small delay to let UI settle
            sleep(500);
            toastLog(`⏰ UI settlement delay completed`);
        }
        
        while (attempt < maxAttempts) {
            attempt++;
            
            // Find the note element again (previous reference may be invalid after scrolling)
            const noteElements = desc("reculike_main_image").find();
            const depth28NoteElements = [];
            
            for (let element of noteElements) {
                if (element.depth() === 28) {
                    depth28NoteElements.push(element);
                }
            }
            
            if (depth28NoteElements.length === 0) {
                toastLog(`❌ Cannot find note elements on attempt ${attempt}`);
                return false;
            }
            
            // Find the target note using title and index for better tracking
            let targetNote = findTargetNoteByTitleOrIndex(depth28NoteElements, noteTitle, noteIndex);
            
            // Check current position with validation
            const bounds = targetNote.bounds();
            const elementHeight = bounds.height();
            
            // Skip if bounds are still invalid
            if (elementHeight <= 0) {
                toastLog(`⚠️ Note still has invalid bounds (height: ${elementHeight}), continuing positioning...`);
                
                // Perform another scroll
                const startX = screenWidth / 2;
                const startY = screenHeight * 0.8;
                const endX = screenWidth / 2;
                const endY = startY - screenHeight * 0.5; // Scroll up 50%
                
                toastLog(`🔄 Attempt ${attempt}: Additional scroll for invalid bounds`);
                toastLog(`🔧 Swipe params: startX=${Math.round(startX)}, startY=${Math.round(startY)}, endX=${Math.round(endX)}, endY=${Math.round(endY)}, duration=500`);
                
                swipe(startX, startY, endX, endY, 500);
                dynamicSleep(CONFIG.navigationDelay, CONFIG.navigationDelay + 500);
                continue;
            }
            
            // Check current position
            const currentPositionStatus = checkNotePosition(targetNote);
            
            toastLog(`📍 Attempt ${attempt}: ${currentPositionStatus.issue} (visibility: ${Math.round((currentPositionStatus.visibilityRatio || 0) * 100)}%)`);
            
            // If well positioned or in acceptable position, we're done
            if (currentPositionStatus.issue === "well_positioned") {
                toastLog(`✅ Note is well positioned after ${attempt} attempts`);
                return true;
            }
            
            // If note is in upper part of screen and visible, that's good enough
            if (currentPositionStatus.visibilityRatio >= 0.8 && targetNote.bounds().centerY() < screenHeight * 0.4) {
                toastLog(`✅ Note is in good upper position (visibility: ${Math.round(currentPositionStatus.visibilityRatio * 100)}%)`);
                return true;
            }
            
            // Calculate scroll distance based on current position
            let scrollDistance;
            let scrollDirection;
            
            if (attempt === 1) {
                // First attempt: Use larger scroll distance for significant adjustments
                switch (currentPositionStatus.issue) {
                    case "below_screen":
                    case "partially_visible_bottom":
                    case "near_bottom_edge":
                        scrollDistance = -screenHeight * 0.8; // Scroll up 80% of screen height
                        scrollDirection = "up";
                        break;
                    case "above_screen":
                    case "partially_visible_top":
                    case "near_top_edge":
                        scrollDistance = screenHeight * 0.5; // Scroll down 50% of screen height
                        scrollDirection = "down";
                        break;
                    case "not_centered":
                    case "invalid_bounds":
                    default:
                        // Center the element in upper part of screen (30% from top)
                        const targetY = screenHeight * 0.3;
                        const currentY = targetNote.bounds().centerY();
                        scrollDistance = targetY - currentY;
                        scrollDirection = scrollDistance > 0 ? "down" : "up";
                        break;
                }
            } else {
                // Subsequent attempts: Use smaller, more precise adjustments
                const targetY = screenHeight * 0.3; // Target upper part of screen
                const currentY = targetNote.bounds().centerY();
                scrollDistance = targetY - currentY;
                scrollDirection = scrollDistance > 0 ? "down" : "up";
                
                // Limit scroll distance for fine-tuning
                const maxFineTuneDistance = screenHeight * 0.3;
                scrollDistance = Math.max(-maxFineTuneDistance, Math.min(maxFineTuneDistance, scrollDistance));
            }
            
            // Calculate swipe parameters using the same pattern as working swipe
            const startX = screenWidth / 2; // Center horizontally
            const startY = screenHeight * 0.8; // Start from 80% down (same as working swipe)
            const endX = screenWidth / 2; // Center horizontally
            let endY;
            
            if (scrollDirection === "up") {
                // Scroll up: endY should be smaller than startY
                endY = startY - Math.abs(scrollDistance);
            } else {
                // Scroll down: endY should be larger than startY
                endY = startY + Math.abs(scrollDistance);
            }
            
            // Ensure we don't scroll too far (keep within 5% to 95% of screen)
            endY = Math.max(screenHeight * 0.05, Math.min(screenHeight * 0.95, endY));
            
            toastLog(`🔄 Attempt ${attempt}: ${scrollDirection} ${Math.round(Math.abs(scrollDistance))}px to position in upper screen`);
            toastLog(`🔧 Swipe params: startX=${Math.round(startX)}, startY=${Math.round(startY)}, endX=${Math.round(endX)}, endY=${Math.round(endY)}, duration=500`);
            
            // Perform smooth scroll using same duration as working swipe
            toastLog(`⚡ Executing swipe...`);
            swipe(startX, startY, endX, endY, 500); // Use 500ms duration like working swipe
            toastLog(`✅ Swipe completed, waiting for UI to settle...`);
            dynamicSleep(CONFIG.navigationDelay, CONFIG.navigationDelay + 500);
            
            // Small delay to let UI settle
            sleep(500);
            toastLog(`⏰ UI settlement delay completed`);
        }
        
        toastLog(`⚠️ Maximum positioning attempts (${maxAttempts}) reached, proceeding with current position`);
        return true; // Proceed even if not perfectly positioned
        
    } catch (error) {
        toastLog(`Error in iterative positioning: ${error.message}`);
        return false;
    }
}

/**
 * Finds the target note by title or index after positioning
 * 通过标题或索引定位目标笔记
 * 
 * @param {Array} noteElements - Array of note elements to search through
 * @param {string} noteTitle - The title of the note to find
 * @param {number} noteIndex - The original index of the note
 * @returns {UiObject|null} - The found note element or null
 */
function findTargetNoteByTitleOrIndex(noteElements, noteTitle, noteIndex) {
    try {
        // If we have a title, try to find by title first
        if (noteTitle && noteTitle.length > 0) {
            // Get all text elements at depth 29
            const textElements = className("android.widget.TextView").find();
            const depth29TextViews = [];
            
            for (let element of textElements) {
                if (element.depth() === 29) {
                    depth29TextViews.push(element);
                }
            }
            
            // Find the text element with matching title
            for (let i = 0; i < depth29TextViews.length; i++) {
                if (depth29TextViews[i].text() === noteTitle) {
                    // Found the title, now get the corresponding note element
                    if (i < noteElements.length) {
                        toastLog(`🎯 Found target note by title: "${noteTitle}" at index ${i}`);
                        return noteElements[i];
                    }
                }
            }
            
            toastLog(`⚠️ Could not find note by title "${noteTitle}", trying index fallback`);
        }
        
        // Fallback to index-based selection
        if (noteIndex >= 0 && noteIndex < noteElements.length) {
            toastLog(`🎯 Using index fallback: note ${noteIndex}`);
            return noteElements[noteIndex];
        }
        
        // Last resort: use first element
        if (noteElements.length > 0) {
            toastLog(`⚠️ Using first available note as fallback`);
            return noteElements[0];
        }
        
        return null;
    } catch (error) {
        toastLog(`Error finding target note: ${error.message}`);
        return null;
    }
}

/**
 * Finds the note after positioning is complete
 * 定位完成后查找笔记
 * 
 * @param {string} noteTitle - The title of the note to find
 * @param {number} noteIndex - The original index of the note
 * @returns {UiObject|null} - The found note element or null
 */
function findNoteAfterPositioning(noteTitle, noteIndex) {
    try {
        // Find all note elements again
        const noteElements = desc("reculike_main_image").find();
        const depth28NoteElements = [];
        
        for (let element of noteElements) {
            if (element.depth() === 28) {
                depth28NoteElements.push(element);
            }
        }
        
        if (depth28NoteElements.length === 0) {
            toastLog(`❌ No note elements found after positioning`);
            return null;
        }
        
        return findTargetNoteByTitleOrIndex(depth28NoteElements, noteTitle, noteIndex);
    } catch (error) {
        toastLog(`Error finding note after positioning: ${error.message}`);
        return null;
    }
}

/**
 * Finds the next undownloaded note from all visible notes at depth 29
 * 从深度29的所有可见笔记中找到下一个未下载的笔记
 * 
 * @returns {Object|null} - Object with title and index, or null if none found
 */
function findNextUndownloadedNote() {
    try {
        // Extract all note titles at depth 29
        const textElements = className("android.widget.TextView").find();
        const depth29TextViews = [];
        
        // Filter textviews at depth 29
        for (let element of textElements) {
            if (element.depth() === 29) {
                depth29TextViews.push(element);
            }
        }
        
        toastLog(`Found ${depth29TextViews.length} textviews at depth 29`);
        
        // Also get clickable elements at depth 28 for safety verification
        const noteElements = desc("reculike_main_image").find();
        const depth28NoteElements = [];
        
        // Filter elements at depth 28 only for safety
        for (let element of noteElements) {
            if (element.depth() === 28) {
                depth28NoteElements.push(element);
            }
        }
        
        toastLog(`Found ${depth28NoteElements.length} note elements at depth 28`);
        
        // Verify we have matching counts for safety - CRITICAL ERROR
        if (depth29TextViews.length !== depth28NoteElements.length) {
            toastLog(`❌ CRITICAL ERROR: Mismatch between depth 29 titles (${depth29TextViews.length}) and depth 28 elements (${depth28NoteElements.length})`);
            toastLog(`❌ This indicates a serious UI structure problem that could cause wrong element clicking`);
            toastLog(`❌ Stopping program for safety`);
            throw new Error(`UI structure mismatch: depth 29 titles (${depth29TextViews.length}) vs depth 28 elements (${depth28NoteElements.length})`);
        }
        
        // Check each visible note title against metadata
        for (let i = 0; i < depth29TextViews.length; i++) {
            const element = depth29TextViews[i];
            const text = element.text();
            
            // Check if text is valid for a title
            if (text && text.length > 5 && text.length < 100) {
                // Skip user nickname and other UI elements
                if (!text.includes('尘世中的小吃货') && !text.includes('◎') && !text.includes('#')) {
                    const noteTitle = text.trim();
                    
                    // Check if this note is already downloaded
                    if (!isNoteDownloaded(noteTitle)) {
                        toastLog(`✅ Found undownloaded note at index ${i}: ${noteTitle}`);
                        return { title: noteTitle, index: i };
                    } else {
                        toastLog(`Found downloaded note at index ${i}: ${noteTitle}`);
                    }
                }
            }
        }
        
        toastLog("No undownloaded notes found on current screen");
        return null;
        
    } catch (error) {
        toastLog(`Error finding next undownloaded note: ${error.message}`);
        return null;
    }
}

/**
 * Scrolls to reveal more notes when all visible notes are downloaded
 * 当所有可见笔记都已下载时，滚动以显示更多笔记
 * 
 * @returns {boolean} - true if more notes revealed, false if end reached
 */
function scrollToRevealMoreNotes() {
    try {
        const maxScrollAttempts = 10; // Prevent infinite scrolling
        let scrollAttempts = 0;
        
        while (scrollAttempts < maxScrollAttempts) {
            scrollAttempts++;
            toastLog(`Scroll attempt ${scrollAttempts}/${maxScrollAttempts} to reveal more notes`);
            
            // Scroll down to reveal more notes
            const screenHeight = device.height;
            swipe(device.width / 2, screenHeight * 0.8, device.width / 2, screenHeight * 0.2, 500);
            dynamicSleep(CONFIG.scrollDelay, CONFIG.scrollDelay + 1000);
            
            // Wait for new content to load
            dynamicSleep(1000, 2000);
            
            // Check if we can find any note titles after scrolling
            const noteTitle = extractNoteTitle();
            if (noteTitle) {
                toastLog(`✅ Found new notes after scroll: ${noteTitle}`);
                return true;
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
        toastLog(`Error scrolling to reveal more notes: ${error.message}`);
        return false;
    }
}

/**
 * Clicks on the first note to navigate to note page
 * 点击第一个笔记导航到笔记页面
 * 
 * @returns {boolean} - true if successful
 */
/**
 * Clicks on a specific note by index with depth 28 safety check
 * 点击指定索引的笔记，带深度28安全检查
 * 
 * @param {number} noteIndex - Index of the note to click
 * @returns {boolean} - true if successful
 */
function clickNoteByIndex(noteIndex) {
    try {
        // Look for clickable note elements on home page with depth 28 safety check
        const noteElements = desc("reculike_main_image").find();
        const depth28NoteElements = [];
        
        // Filter elements at depth 28 only for safety
        for (let element of noteElements) {
            if (element.depth() === 28) {
                depth28NoteElements.push(element);
            }
        }
        
        toastLog(`Found ${depth28NoteElements.length} note elements at depth 28`);
        
        if (depth28NoteElements.length > 0) {
            // Check if the requested index is valid
            if (noteIndex >= 0 && noteIndex < depth28NoteElements.length) {
                const targetNote = depth28NoteElements[noteIndex];
                
                // Additional safety check: verify this is actually a note element
                const elementDesc = targetNote.desc();
                if (elementDesc !== "reculike_main_image") {
                    toastLog(`❌ CRITICAL ERROR: Element at index ${noteIndex} is not a note image (desc: ${elementDesc})`);
                    toastLog(`❌ Stopping program for safety`);
                    throw new Error(`Invalid element type at index ${noteIndex}: expected "reculike_main_image", got "${elementDesc}"`);
                }
                
                click(targetNote.bounds().centerX(), targetNote.bounds().centerY());
                dynamicSleep(CONFIG.navigationDelay, CONFIG.navigationDelay + 1000);
                toastLog(`Clicked on note at index ${noteIndex} (depth 28) to navigate to note page`);
                return true;
            } else {
                toastLog(`❌ CRITICAL ERROR: Invalid note index: ${noteIndex}. Available notes at depth 28: ${depth28NoteElements.length}`);
                toastLog(`❌ Stopping program for safety`);
                throw new Error(`Invalid note index: ${noteIndex}, available: ${depth28NoteElements.length}`);
            }
        }
        
        toastLog("No note elements found at depth 28 to click");
        return false;
    } catch (error) {
        toastLog(`Error clicking note at index ${noteIndex}: ${error.message}`);
        return false;
    }
}

/**
 * Test function to verify swipe functionality
 * 测试滑动功能
 */
function testSwipeFunction() {
    try {
        const screenHeight = device.height;
        const screenWidth = device.width;
        
        toastLog(`🧪 Testing swipe functionality...`);
        toastLog(`📱 Screen dimensions: ${screenWidth}x${screenHeight}`);
        
        // Test a simple upward swipe
        const startX = screenWidth / 2;
        const startY = screenHeight * 0.8;
        const endX = screenWidth / 2;
        const endY = screenHeight * 0.2;
        
        toastLog(`🔧 Test swipe params: startX=${Math.round(startX)}, startY=${Math.round(startY)}, endX=${Math.round(endX)}, endY=${Math.round(endY)}, duration=500`);
        
        // Perform test swipe
        toastLog(`⚡ Executing test swipe...`);
        swipe(startX, startY, endX, endY, 500);
        toastLog(`✅ Test swipe completed!`);
        
        sleep(2000);
        toastLog(`🧪 Test completed - check if screen moved`);
        
        return true;
    } catch (error) {
        toastLog(`❌ Test swipe failed: ${error.message}`);
        return false;
    }
}

/**
 * Enhanced version of clickNoteByIndex with position verification
 * 增强版点击笔记函数，包含位置验证
 * 
 * @param {number} noteIndex - Index of the note to click
 * @returns {boolean} - true if successful
 */
function clickNoteByIndexWithPositioning(noteIndex) {
    try {
        // Look for clickable note elements on home page with depth 28 safety check
        const noteElements = desc("reculike_main_image").find();
        const depth28NoteElements = [];
        
        // Filter elements at depth 28 only for safety
        for (let element of noteElements) {
            if (element.depth() === 28) {
                depth28NoteElements.push(element);
            }
        }
        
        toastLog(`Found ${depth28NoteElements.length} note elements at depth 28`);
        
        if (depth28NoteElements.length === 0) {
            toastLog("No note elements found at depth 28");
            return false;
        }
        
        // Check if the requested index is valid
        if (noteIndex < 0 || noteIndex >= depth28NoteElements.length) {
            toastLog(`❌ CRITICAL ERROR: Invalid note index: ${noteIndex}. Available notes at depth 28: ${depth28NoteElements.length}`);
            toastLog(`❌ Stopping program for safety`);
            throw new Error(`Invalid note index: ${noteIndex}, available: ${depth28NoteElements.length}`);
        }
        
        const targetNote = depth28NoteElements[noteIndex];
        
        // Safety check: verify this is actually a note element
        const elementDesc = targetNote.desc();
        if (elementDesc !== "reculike_main_image") {
            toastLog(`❌ CRITICAL ERROR: Element at index ${noteIndex} is not a note image (desc: ${elementDesc})`);
            toastLog(`❌ Stopping program for safety`);
            throw new Error(`Invalid element type at index ${noteIndex}: expected "reculike_main_image", got "${elementDesc}"`);
        }
        
        // NEW: Check and adjust position before clicking
        const positionStatus = checkNotePosition(targetNote);
        toastLog(`Note position check: ${positionStatus.issue} (action: ${positionStatus.action})`);
        
        let finalNoteToClick = targetNote;
        
        if (!positionStatus.isPositioned || positionStatus.issue !== "well_positioned") {
            // Get the note title for tracking after scrolling
            let noteTitle = "";
            try {
                // Find the corresponding text element (depth 29) for this note
                const textElements = className("android.widget.TextView").find();
                const depth29TextViews = [];
                
                for (let element of textElements) {
                    if (element.depth() === 29) {
                        depth29TextViews.push(element);
                    }
                }
                
                // Get the title for the target note index
                if (noteIndex < depth29TextViews.length) {
                    noteTitle = depth29TextViews[noteIndex].text();
                    toastLog(`📝 Targeting note: "${noteTitle}"`);
                }
            } catch (error) {
                toastLog(`⚠️ Could not get note title for tracking: ${error.message}`);
            }
            
            const adjustmentSuccess = adjustNotePosition(targetNote, positionStatus, noteTitle, noteIndex);
            if (!adjustmentSuccess) {
                toastLog(`Failed to adjust note position, attempting to click anyway`);
            } else {
                toastLog(`✅ Note positioning completed successfully`);
                
                // Find the note again after positioning
                finalNoteToClick = findNoteAfterPositioning(noteTitle, noteIndex);
                if (!finalNoteToClick) {
                    toastLog(`⚠️ Could not find original note after positioning, using index-based fallback`);
                    finalNoteToClick = targetNote; // Fallback to original
                } else {
                    toastLog(`✅ Successfully rediscovered target note after positioning`);
                }
            }
        } else {
            toastLog(`✅ Note is already well positioned`);
        }
        
        // Proceed with the click
        click(finalNoteToClick.bounds().centerX(), finalNoteToClick.bounds().centerY());
        dynamicSleep(CONFIG.navigationDelay, CONFIG.navigationDelay + 1000);
        toastLog(`Clicked on note at index ${noteIndex}`);
        return true;
        
    } catch (error) {
        toastLog(`Error clicking note at index ${noteIndex} with positioning: ${error.message}`);
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
function downloadCurrentImageTemp(timestamp, imageNumber) {
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
        
        // Wait for save operation to complete
        dynamicSleep(CONFIG.saveOperationDelay, CONFIG.saveOperationDelay + 1000);
        
        // Use temp naming with timestamp: temp_note_TIMESTAMP_image_YYY.png
        const tempImageName = `temp_note_${timestamp}_image_${String(imageNumber).padStart(3, '0')}.png`;
        toastLog(`Image ${imageNumber} downloaded as temp: ${tempImageName}`);
        return tempImageName;
        
    } catch (error) {
        toastLog(`Error downloading temp image ${imageNumber}: ${error.message}`);
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
 * Downloads all images from current note with temp naming
 * 下载当前笔记的所有图片，使用临时命名
 * 
 * @param {string} timestamp - Timestamp for temp naming
 * @returns {Object} - Object with imageCount and tempImagePaths
 */
function downloadNoteImagesTemp(timestamp) {
    let imageCount = 0;
    const tempImagePaths = [];
    
    toastLog(`Starting temp image download with timestamp ${timestamp}`);
    
    // Get initial list of files before downloading
    const initialFiles = files.listDir(CONFIG.appImagesDir).filter(file => 
        (file.endsWith('.jpg') || file.endsWith('.png'))
    );
    toastLog(`📁 Initial files in Pictures directory: ${initialFiles.length}`);
    
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
        
        // Download current image with temp naming
        const tempImagePath = downloadCurrentImageTemp(timestamp, currentImage);
        if (tempImagePath) {
            tempImagePaths.push(tempImagePath);
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
    
    // Get final list of files after downloading
    const finalFiles = files.listDir(CONFIG.appImagesDir).filter(file => 
        (file.endsWith('.jpg') || file.endsWith('.png'))
    );
    toastLog(`📁 Final files in Pictures directory: ${finalFiles.length}`);
    
    // Find newly downloaded files by comparing file lists
    const newFiles = finalFiles.filter(file => !initialFiles.includes(file));
    toastLog(`📁 Newly downloaded files: ${newFiles.length}`);
    
    toastLog(`Downloaded ${imageCount} temp images with timestamp ${timestamp}`);
    return { imageCount, tempImagePaths, newFiles };
}

/**
 * Organizes downloaded images with final naming using posting date and timestamp
 * 使用发布日期和时间戳组织下载的图片，最终命名
 * 
 * @param {Array} downloadedFiles - Array of actual downloaded file names
 * @param {string} postingDate - Posting date in YYYYMMDD format
 * @param {string} timestamp - Unique timestamp
 * @returns {Array} - Array of organized image objects
 */
function organizeImagesWithTimestamp(downloadedFiles, postingDate, timestamp) {
    const internalVaultDir = files.join(DIRECTORY_CONFIG.baseDir, DIRECTORY_CONFIG.subDirs.internalVault);
    const imagesDir = files.join(internalVaultDir, DIRECTORY_CONFIG.subDirs.images);
    
    const movedImages = [];
    
    toastLog(`📁 Internal vault directory: ${internalVaultDir}`);
    toastLog(`📁 内部保险库目录: ${internalVaultDir}`);
    toastLog(`📁 Images directory: ${imagesDir}`);
    toastLog(`📁 图片目录: ${imagesDir}`);
    
    try {
        toastLog(`📁 Found ${downloadedFiles.length} downloaded files to organize`);
        toastLog(`📁 找到 ${downloadedFiles.length} 个下载的文件需要组织`);
        

        
        // Ensure destination directory exists
        if (!files.exists(imagesDir)) {
            const dirCreated = createDirectoryWithFallbacks(imagesDir, "Images directory");
            if (!dirCreated) {
                toastLog(`❌ Failed to create images directory`);
                return [];
            }
        }
        
        // Verify directory access
        if (!verifyDirectoryAccess(imagesDir, "Images directory")) {
            toastLog(`❌ Images directory not accessible`);
            return [];
        }
        
        // Move and rename downloaded images to final structure
        for (let i = 0; i < downloadedFiles.length; i++) {
            const sourcePath = files.join(CONFIG.appImagesDir, downloadedFiles[i]);
            const imageNumber = i + 1;
            
            // Generate final name with timestamp: note_YYYYMMDD_TIMESTAMP_image_YYY.png
            const finalImageName = `note_${postingDate}_${timestamp}_image_${String(imageNumber).padStart(3, '0')}.png`;
            const destPath = files.join(imagesDir, finalImageName);
            
            toastLog(`📁 Organizing: ${sourcePath} → ${destPath}`);
            toastLog(`📁 组织: ${sourcePath} → ${destPath}`);
            
            try {
                // Check if source file exists
                if (!files.exists(sourcePath)) {
                    toastLog(`❌ Source file does not exist: ${sourcePath}`);
                    continue;
                }
                
                // Ensure destination directory exists using the new directory management system
                if (!files.exists(imagesDir)) {
                    const dirCreated = createDirectoryWithFallbacks(imagesDir, "Images directory");
                    if (!dirCreated) {
                        toastLog(`❌ Failed to create images directory`);
                        continue;
                    }
                }
                
                // Verify directory access
                if (!verifyDirectoryAccess(imagesDir, "Images directory")) {
                    toastLog(`❌ Images directory not accessible`);
                    continue;
                }
                
                // Try to move the file with retry logic
                let moveSuccess = false;
                for (let retry = 1; retry <= 3; retry++) {
                    try {
                        toastLog(`🔄 Moving file (attempt ${retry}/3): ${sourcePath} → ${destPath}`);
                        files.move(sourcePath, destPath);
                        
                        // Verify the file was moved successfully
                        if (files.exists(destPath)) {
                            movedImages.push({
                                originalName: downloadedFiles[i],
                                newName: finalImageName,
                                path: destPath,
                                relativePath: `images/${finalImageName}`
                            });
                            toastLog(`✅ Successfully organized image: ${downloadedFiles[i]} → ${finalImageName}`);
                            moveSuccess = true;
                            break;
                        } else {
                            toastLog(`❌ File was not moved successfully (attempt ${retry}/3): ${destPath}`);
                            if (retry < 3) {
                                dynamicSleep(1000, 2000); // Wait before retry
                            }
                        }
                    } catch (moveError) {
                        toastLog(`❌ Error organizing image ${downloadedFiles[i]} (attempt ${retry}/3): ${moveError.message}`);
                        if (retry < 3) {
                            dynamicSleep(1000, 2000); // Wait before retry
                        }
                    }
                }
                
                if (!moveSuccess) {
                    toastLog(`❌ Failed to organize image after 3 attempts: ${downloadedFiles[i]}`);
                    toastLog(`🔄 Trying copy and delete as fallback...`);
                    
                    try {
                        // Try copy and delete as fallback
                        files.copy(sourcePath, destPath);
                        if (files.exists(destPath)) {
                            files.remove(sourcePath);
                            movedImages.push({
                                originalName: downloadedFiles[i],
                                newName: finalImageName,
                                path: destPath,
                                relativePath: `images/${finalImageName}`
                            });
                            toastLog(`✅ Copied and deleted image: ${sortedTempImages[i]} → ${finalImageName}`);
                        } else {
                            toastLog(`❌ Copy operation failed: ${destPath}`);
                        }
                    } catch (copyError) {
                        toastLog(`❌ Copy and delete fallback failed: ${copyError.message}`);
                    }
                }
            } catch (error) {
                toastLog(`❌ Error organizing image ${sortedTempImages[i]}: ${error.message}`);
            }
        }
        
        toastLog(`📁 Successfully organized ${movedImages.length} images`);
        toastLog(`📁 成功组织 ${movedImages.length} 个图片`);
        return movedImages;
        
    } catch (error) {
        toastLog(`❌ Error organizing images: ${error.message}`);
        return [];
    }
}

/**
 * Converts PNG image to JPG with quality preservation
 * 将PNG图片转换为JPG，保持图片质量
 * 
 * @param {string} pngPath - Source PNG file path
 * @param {string} jpgPath - Destination JPG file path
 * @param {number} quality - JPG quality (0-100, default 90)
 * @returns {Object} - Conversion result with success status and file info
 */
function convertPngToJpg(pngPath, jpgPath, quality = 90) {
    const result = {
        success: false,
        sourceSize: 0,
        destSize: 0,
        compressionRatio: 0,
        error: null
    };
    
    try {
        toastLog(`🔄 Converting PNG to JPG: ${pngPath} → ${jpgPath} (quality: ${quality}%)`);
        
        // Check if source file exists
        if (!files.exists(pngPath)) {
            result.error = `Source PNG file does not exist: ${pngPath}`;
            toastLog(`❌ ${result.error}`);
            return result;
        }
        
        // Get source file size using Java File API for compatibility
        result.sourceSize = new java.io.File(pngPath).length();
        toastLog(`📊 PNG file size: ${(result.sourceSize / 1024).toFixed(2)} KB`);
        
        // Use Android's BitmapFactory for conversion
        const bitmap = android.graphics.BitmapFactory.decodeFile(pngPath);
        if (!bitmap) {
            result.error = `Failed to decode PNG: ${pngPath}`;
            toastLog(`❌ ${result.error}`);
            return result;
        }
        
        toastLog(`✅ Successfully decoded PNG (${bitmap.getWidth()}x${bitmap.getHeight()})`);
        
        // Ensure destination directory exists
        const destDir = new java.io.File(jpgPath).getParent();
        if (!files.exists(destDir)) {
            files.ensureDir(destDir);
            toastLog(`📁 Created destination directory: ${destDir}`);
        }
        
        // Create output stream for JPG
        const outputStream = new java.io.FileOutputStream(jpgPath);
        const success = bitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, quality, outputStream);
        outputStream.close();
        bitmap.recycle();
        
        if (success) {
            // Get destination file size
            if (files.exists(jpgPath)) {
                result.destSize = new java.io.File(jpgPath).length();
                result.compressionRatio = ((result.sourceSize - result.destSize) / result.sourceSize * 100).toFixed(2);
                result.success = true;
                
                toastLog(`✅ PNG to JPG conversion successful!`);
                toastLog(`📊 JPG file size: ${(result.destSize / 1024).toFixed(2)} KB`);
                toastLog(`📊 Compression ratio: ${result.compressionRatio}%`);
                toastLog(`📊 File size reduction: ${((result.sourceSize - result.destSize) / 1024).toFixed(2)} KB`);
            } else {
                result.error = "JPG file was not created";
                toastLog(`❌ ${result.error}`);
            }
        } else {
            result.error = "Failed to compress to JPG";
            toastLog(`❌ ${result.error}`);
        }
        
    } catch (error) {
        result.error = `Error during PNG to JPG conversion: ${error.message}`;
        toastLog(`❌ ${result.error}`);
    }
    
    return result;
}

/**
 * Processes PNG to JPG conversion for all images in organized structure
 * 处理组织结构中所有图片的PNG到JPG转换
 * 
 * @param {Array} pngImages - Array of PNG image objects from organizeImagesWithTimestamp
 * @returns {Array} - Array of JPG image objects with conversion results
 */
function processPngToJpgConversion(pngImages) {
    const jpgImages = [];
    let conversionSuccessCount = 0;
    let totalSizeReduction = 0;
    
    toastLog(`🔄 Starting PNG to JPG conversion for ${pngImages.length} images...`);
    
    for (let i = 0; i < pngImages.length; i++) {
        const pngImage = pngImages[i];
        
        // Generate JPG filename (change extension from .png to .jpg)
        const jpgName = pngImage.newName.replace(/\.png$/, '.jpg');
        const jpgPath = files.join(new java.io.File(pngImage.path).getParent(), jpgName);
        
        toastLog(`🔄 Converting image ${i + 1}/${pngImages.length}: ${pngImage.newName}`);
        
        // Convert PNG to JPG
        const conversionResult = convertPngToJpg(pngImage.path, jpgPath, 90);
        
        if (conversionResult.success) {
            // Create JPG image object
            const jpgImage = {
                ...pngImage,
                newName: jpgName,
                path: jpgPath,
                relativePath: pngImage.relativePath.replace(/\.png$/, '.jpg'),
                conversionResult: conversionResult,
                isJpg: true
            };
            
            jpgImages.push(jpgImage);
            conversionSuccessCount++;
            totalSizeReduction += parseFloat(conversionResult.compressionRatio);
            
            toastLog(`✅ Successfully converted: ${pngImage.newName} → ${jpgName}`);
        } else {
            // If conversion fails, keep the original PNG
            jpgImages.push({
                ...pngImage,
                conversionResult: conversionResult,
                isJpg: false
            });
            
            toastLog(`❌ Conversion failed for ${pngImage.newName}, keeping PNG version`);
        }
    }
    
    // Calculate average compression ratio
    const avgCompression = conversionSuccessCount > 0 ? (totalSizeReduction / conversionSuccessCount).toFixed(2) : 0;
    
    toastLog(`📊 PNG to JPG conversion summary:`);
    toastLog(`✅ Successfully converted: ${conversionSuccessCount}/${pngImages.length} images`);
    toastLog(`📊 Average compression ratio: ${avgCompression}%`);
    toastLog(`📊 Total size reduction: ${avgCompression}% average`);
    
    return jpgImages;
}

/**
 * Uploads an image to ImgBB for external hosting
 * 将图片上传到ImgBB进行外部托管
 * 
 * @param {string} imagePath - Path to the image file
 * @param {string} imageName - Optional name for the image
 * @returns {string|null} - ImgBB URL if successful, null if failed
 */
function uploadImageToImgBB(imagePath, imageName = null) {
    if (!files.exists(imagePath)) {
        toastLog(`❌ Image file not found: ${imagePath}`);
        return null;
    }
    
    for (let attempt = 1; attempt <= IMGBB_CONFIG.maxRetries; attempt++) {
        try {
            toastLog(`📤 Uploading image to ImgBB: ${imagePath} (attempt ${attempt}/${IMGBB_CONFIG.maxRetries})`);
            const imageBytes = files.readBytes(imagePath);
            const base64Data = android.util.Base64.encodeToString(imageBytes, android.util.Base64.DEFAULT);
            
            const response = http.post(IMGBB_CONFIG.uploadUrl, {
                key: IMGBB_CONFIG.apiKey,
                image: base64Data
            });
            
            if (response.statusCode === 200) {
                try {
                    const result = JSON.parse(response.body.string());
                    if (result.success && result.data && result.data.url) {
                        toastLog(`✅ ImgBB upload successful: ${result.data.url}`);
                        return result.data.url;
                    } else {
                        toastLog(`❌ ImgBB upload failed: ${result.error ? result.error.message : "Unknown error"}`);
                    }
                } catch (e) {
                    toastLog(`❌ Failed to parse ImgBB response: ${e.message}`);
                }
            } else {
                toastLog(`❌ ImgBB upload failed: HTTP ${response.statusCode}`);
            }
            
            if (attempt < IMGBB_CONFIG.maxRetries) {
                toastLog(`🔄 Retrying ImgBB upload (attempt ${attempt + 1}/${IMGBB_CONFIG.maxRetries})`);
                sleep(IMGBB_CONFIG.retryDelay);
            }
        } catch (error) {
            toastLog(`❌ ImgBB upload error: ${error.message}`);
            if (attempt < IMGBB_CONFIG.maxRetries) {
                toastLog(`🔄 Retrying ImgBB upload (attempt ${attempt + 1}/${IMGBB_CONFIG.maxRetries})`);
                sleep(IMGBB_CONFIG.retryDelay);
            }
        }
    }
    
    toastLog(`❌ ImgBB upload failed after ${IMGBB_CONFIG.maxRetries} attempts`);
    return null;
}

/**
 * Generates external markdown file with ImgBB URLs
 * 生成带有ImgBB URL的外部markdown文件
 * 
 * @param {Object} noteData - Note data object
 * @returns {string|null} - Path to generated markdown file
 */
function generateExternalMarkdown(noteData) {
    try {
        const externalPublicDir = files.join(DIRECTORY_CONFIG.baseDir, DIRECTORY_CONFIG.subDirs.externalPublic);
        
        // Ensure directory exists using the new directory management system
        if (!files.exists(externalPublicDir)) {
            const dirCreated = createDirectoryWithFallbacks(externalPublicDir, "External public directory");
            if (!dirCreated) {
                toastLog(`❌ Failed to create external public directory`);
                return null;
            }
        }
        
        // Verify directory access
        if (!verifyDirectoryAccess(externalPublicDir, "External public directory")) {
            toastLog(`❌ External public directory not accessible`);
            return null;
        }
        
        toastLog(`✅ External public directory ready: ${externalPublicDir}`);
        
        const externalFilename = `note_${noteData.postingDate}_${noteData.timestamp}_external.md`;
        const externalMarkdownPath = files.join(externalPublicDir, externalFilename);
        
        let markdownContent = `# ${noteData.title}\n\n`;
        
        // Add metadata - match internal layout exactly
        markdownContent += `**Restaurant:** ${noteData.restaurantName}\n`;
        markdownContent += `**Posted:** ${noteData.postingDate || 'Unknown'}\n`;
        markdownContent += `**Location:** ${noteData.location || 'Unknown'}\n`;
        markdownContent += `**Views:** ${noteData.viewCount || 'Unknown'}\n`;
        markdownContent += `**Downloaded:** ${noteData.downloadDate}\n\n`;
        
        // Add content
        markdownContent += `${noteData.content}\n\n`;
        
        // Add images with ImgBB URLs
        if (noteData.images && noteData.images.length > 0) {
            markdownContent += `## Images\n\n`;
            noteData.images.forEach((image, index) => {
                if (image.imgbbUrl) {
                    markdownContent += `![Image ${index + 1}](${image.imgbbUrl})\n\n`;
                } else {
                    toastLog(`⚠️ Warning: Image ${index + 1} missing imgbbUrl`);
                }
            });
        }
        
        files.write(externalMarkdownPath, markdownContent, "utf-8");
        toastLog(`Generated external markdown file: ${externalMarkdownPath}`);
        
        // Update noteData with external markdown path
        noteData.externalMarkdownPath = externalMarkdownPath;
        
        return externalMarkdownPath;
    } catch (error) {
        toastLog(`Error generating external markdown: ${error.message}`);
        return null;
    }
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
        // Create internal vault markdown file
        const internalVaultDir = files.join(DIRECTORY_CONFIG.baseDir, DIRECTORY_CONFIG.subDirs.internalVault);
        
        // Ensure directory exists using the new directory management system
        if (!files.exists(internalVaultDir)) {
            const dirCreated = createDirectoryWithFallbacks(internalVaultDir, "Internal vault directory");
            if (!dirCreated) {
                toastLog(`❌ Failed to create internal vault directory`);
                return null;
            }
        }
        
        // Verify directory access
        if (!verifyDirectoryAccess(internalVaultDir, "Internal vault directory")) {
            toastLog(`❌ Internal vault directory not accessible`);
            return null;
        }
        
        toastLog(`✅ Internal vault directory ready: ${internalVaultDir}`);
        
        // Create internal markdown filename with timestamp only
        const internalFilename = `note_${noteData.postingDate}_${noteData.timestamp}_internal.md`;
        const internalMarkdownPath = files.join(internalVaultDir, internalFilename);
        
        let markdownContent = `# ${noteData.title}\n\n`;
        
        // Add metadata
        markdownContent += `**Restaurant:** ${noteData.restaurantName}\n`;
        markdownContent += `**Posted:** ${noteData.postingDate || 'Unknown'}\n`;
        markdownContent += `**Location:** ${noteData.location || 'Unknown'}\n`;
        markdownContent += `**Views:** ${noteData.viewCount || 'Unknown'}\n`;
        markdownContent += `**Downloaded:** ${noteData.downloadDate}\n\n`;
        
        // Add content
        markdownContent += `${noteData.content}\n\n`;
        
        // Add images with relative paths for internal vault
        if (noteData.images && noteData.images.length > 0) {
            markdownContent += `## Images\n\n`;
            noteData.images.forEach((image, index) => {
                markdownContent += `![Image ${index + 1}](${image.relativePath})\n\n`;
            });
        }
        
        files.write(internalMarkdownPath, markdownContent, "utf-8");
        toastLog(`Generated internal markdown file: ${internalMarkdownPath}`);
        
        // Update noteData with internal markdown path
        noteData.internalMarkdownPath = internalMarkdownPath;
        
        return internalMarkdownPath;
        
    } catch (error) {
        toastLog(`Error generating internal markdown: ${error.message}`);
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
    
    try {
        // Create all necessary directories at the beginning
        if (!createDownloadDirectories()) {
            toastLog("❌ Failed to create download directories");
            return;
        }
        
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
            
            // Step 1: Find next undownloaded note from all visible notes
            const nextNote = findNextUndownloadedNote();
            if (!nextNote) {
                toastLog("No undownloaded notes found on current screen");
                
                // Step 1.5: Scroll to reveal more notes
                const scrollSuccess = scrollToRevealMoreNotes();
                if (!scrollSuccess) {
                    toastLog("❌ No more undownloaded notes available");
                    break;
                }
                continue;
            }
            
            const { title: noteTitle, index: noteIndex } = nextNote;
            toastLog(`✅ Found undownloaded note at index ${noteIndex}: ${noteTitle}`);
            
            // Step 3: Navigate to note page for processing with position verification
            const noteClickSuccess = clickNoteByIndexWithPositioning(noteIndex);
            if (!noteClickSuccess) {
                toastLog(`❌ Failed to navigate to note page for note at index ${noteIndex}`);
                break;
            }
            
            // Wait for page transition
            dynamicSleep(CONFIG.navigationDelay, CONFIG.navigationDelay + 1000);
            
            // Step 4: Click on image in note page to open gallery
            const imageClickSuccess = clickNoteImage();
            
            if (imageClickSuccess) {
                toastLog("✅ Successfully clicked on note image!");
                toastLog("✅ 成功点击笔记图片！");
                
                // Step 5: Download images with temp naming
                toastLog("Starting temp image download process...");
                const timestamp = Date.now().toString();
                const imageResult = downloadNoteImagesTemp(timestamp);
                
                if (imageResult && imageResult.imageCount > 0) {
                    toastLog(`✅ Successfully downloaded ${imageResult.imageCount} temp images!`);
                    toastLog(`✅ 成功下载 ${imageResult.imageCount} 张临时图片！`);
                    
                    // Step 6: Extract additional note data for final naming
                    const noteContent = extractNoteContent();
                    const viewCount = extractViewCount();
                    const { postingDate, location } = extractNoteDateAndLocation();
                    
                    // Step 7: Extract restaurant information (after scrolling from date/location extraction)
                    const restaurantName = extractRestaurantInformation();
                    
                    // Step 8: Organize images with final naming using posting date and timestamp
                    toastLog("Organizing images with final naming...");
                    const movedImages = organizeImagesWithTimestamp(imageResult.newFiles, postingDate, timestamp);
                    
                    if (movedImages && movedImages.length > 0) {
                        toastLog(`✅ Successfully moved ${movedImages.length} images to organized structure!`);
                        toastLog(`✅ 成功移动 ${movedImages.length} 张图片到有组织的结构中！`);
                        
                        // Step 8.5: Convert PNG images to JPG format
                        toastLog("Converting PNG images to JPG format...");
                        const convertedImages = processPngToJpgConversion(movedImages);
                        
                        if (convertedImages && convertedImages.length > 0) {
                            toastLog(`✅ Successfully processed ${convertedImages.length} images for PNG to JPG conversion!`);
                            toastLog(`✅ 成功处理 ${convertedImages.length} 张图片的PNG到JPG转换！`);
                            
                            // Step 9: Extract additional note data
                            const noteContent = extractNoteContent();
                            const viewCount = extractViewCount();
                            const { postingDate, location } = extractNoteDateAndLocation();
                            
                            // Step 10: Extract restaurant information (after scrolling from date/location extraction)
                            const restaurantName = extractRestaurantInformation();
                            
                            // Step 11: Create note data object for metadata
                            const noteData = {
                                title: noteTitle,
                                timestamp: timestamp, // Use the same timestamp from image download
                                viewCount: viewCount,
                                restaurantName: restaurantName || "Unknown",
                                imageCount: imageResult.imageCount,
                                postingDate: postingDate,
                                location: location,
                                markdownFile: `note_${postingDate || 'unknown'}_${timestamp}.md`,
                                contentHash: generateContentHash(noteContent),
                                downloadDate: new Date().toISOString(),
                                images: convertedImages, // Use converted images (JPG or fallback PNG)
                                content: noteContent
                            };
                        
                        // Step 12: Generate internal markdown file
                        const markdownPath = generateMarkdownOnMobile(noteData);
                        if (markdownPath) {
                            noteData.markdownPath = markdownPath;
                            toastLog(`✅ Generated internal markdown file: ${markdownPath}`);
                        }
                        
                        // Step 13: Upload images to ImgBB for external hosting
                        toastLog("📤 Starting ImgBB upload for external hosting...");
                        const uploadedImages = [];
                        let uploadSuccess = true;
                        
                        for (let i = 0; i < convertedImages.length; i++) {
                            const image = convertedImages[i];
                            const imgbbUrl = uploadImageToImgBB(image.path, image.newName);
                            if (imgbbUrl) {
                                uploadedImages.push({ ...image, imgbbUrl: imgbbUrl });
                                toastLog(`✅ Uploaded ${image.newName} to ImgBB: ${imgbbUrl}`);
                            } else {
                                toastLog(`❌ Failed to upload ${image.newName} to ImgBB`);
                                uploadSuccess = false;
                                break; // Stop processing if upload fails
                            }
                        }
                        
                        if (!uploadSuccess) {
                            toastLog("❌ ImgBB upload failed, stopping note processing");
                            toastLog("❌ ImgBB上传失败，停止笔记处理");
                            // Increment processedCount to avoid endless loop when maxNotesToDownload is 1
                            processedCount++;
                            back();
                            dynamicSleep(CONFIG.navigationDelay, CONFIG.navigationDelay + 1000);
                            continue; // Move to next iteration
                        }
                        
                        // Step 14: Update noteData with uploaded images for external markdown generation
                        noteData.images = uploadedImages;
                        
                        // Step 15: Generate external markdown with ImgBB URLs
                        const externalMarkdownPath = generateExternalMarkdown(noteData);
                        if (externalMarkdownPath) {
                            noteData.externalMarkdownPath = externalMarkdownPath;
                            toastLog(`✅ Generated external markdown file: ${externalMarkdownPath}`);
                        }
                        
                        // Step 16: Update metadata with uploaded images
                        addDownloadedNote(noteData);
                        processedCount++;
                        
                        toastLog(`✅ Successfully processed note: ${noteTitle}`);
                        toastLog(`✅ 成功处理笔记: ${noteTitle}`);
                        toastLog(`📊 Total notes processed: ${processedCount}/${maxNotesToProcess}`);
                        toastLog(`📊 已处理笔记总数: ${processedCount}/${maxNotesToProcess}`);
                        
                        // Log the uploaded images for verification
                        uploadedImages.forEach((image, index) => {
                            toastLog(`Image ${index + 1}: ${image.originalName} → ${image.newName} → ${image.imgbbUrl}`);
                        });
                        
                        // Step 14: Go back to home page for next note
                        back();
                        dynamicSleep(CONFIG.navigationDelay, CONFIG.navigationDelay + 1000);
                        
                    } else {
                        toastLog("❌ Failed to convert images to JPG format");
                        toastLog("❌ 转换图片为JPG格式失败");
                        // Increment processedCount to avoid endless loop when maxNotesToDownload is 1
                        processedCount++;
                        // Go back to home page even if processing failed
                        back();
                        dynamicSleep(CONFIG.navigationDelay, CONFIG.navigationDelay + 1000);
                    }
                    
                    } else {
                        toastLog("❌ Failed to move images to organized structure");
                        toastLog("❌ 移动图片到有组织的结构失败");
                        // Increment processedCount to avoid endless loop when maxNotesToDownload is 1
                        processedCount++;
                        // Go back to home page even if processing failed
                        back();
                        dynamicSleep(CONFIG.navigationDelay, CONFIG.navigationDelay + 1000);
                    }
                } else {
                    toastLog("❌ Failed to download images");
                    toastLog("❌ 下载图片失败");
                    // Increment processedCount to avoid endless loop when maxNotesToDownload is 1
                    processedCount++;
                    // Go back to home page even if processing failed
                    back();
                    dynamicSleep(CONFIG.navigationDelay, CONFIG.navigationDelay + 1000);
                }
                
            } else {
                toastLog("❌ Failed to click on note image");
                toastLog("❌ 点击笔记图片失败");
                // Increment processedCount to avoid endless loop when maxNotesToDownload is 1
                processedCount++;
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
main();