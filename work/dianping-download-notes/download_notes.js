'use strict';

/**
 * Dianping Notes Downloader
 * 大众点评笔记下载器
 * 
 * This script downloads self-created restaurant notes/reviews from Dianping app
 * 此脚本用于从大众点评应用下载自创的餐厅笔记/评价
 */

// Constants
const TARGET_PACKAGE = "com.dianping.v1";
const APP_NAME = "大众点评";
const USER_NICKNAME = "尘世中的小吃货"; // User nickname from the image
const NOTES_TAB_TEXT = "笔记"; // Notes tab text

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
 * Main function
 * 主函数
 */
function main() {
    toastLog("Starting Dianping Notes Downloader");
    
    // Display current package name
    toastLog(`Current package: ${currentPackage()}`);
    
    // Launch or ensure the app is in focus
    if (currentPackage() !== TARGET_PACKAGE) {
        toastLog("Launching Dianping app");
        app.launchApp(APP_NAME);
        sleep(3000);
        toastLog(`Current package: ${currentPackage()}`);
    }
    
    try {
        // Wait for app to load
        sleep(2000);
        
        // Verify we're on the user's profile page
        if (!isOnUserProfilePage()) {
            toastLog("Not on the correct user profile page. Please navigate to your profile page manually.");
            toastLog("请手动导航到您的个人资料页面。");
            return;
        }
        
        toastLog("✅ Successfully verified we're on the desired page!");
        toastLog("✅ 成功验证我们在目标页面上！");
        
        // TODO: Next steps will include:
        // 1. Click on "笔记" tab to navigate to notes section
        // 2. Scroll through notes to find all user-created content
        // 3. Extract note data (title, content, images, location, etc.)
        // 4. Save/download the notes data
        
        toastLog("Page verification completed. Ready for next development phase.");
        toastLog("页面验证完成。准备进入下一开发阶段。");
        
    } catch (error) {
        toastLog(`Error: ${error.message}`);
        console.error("Error in main function:", error);
    }
}

// Entry point
auto.waitFor();
main(); 