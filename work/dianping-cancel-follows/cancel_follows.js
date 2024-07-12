'use strict';

// This script is using autox.js to automate the desired actions in the app "大众点评"
// The actions are as follows:
// Check if the user followed is also following me, i.e. "互相关注"
// If not, then cancel the follow


// Placeholder for the scrolling function.
function swipeUpToRevealContent() {
    swipe(device.width / 2, device.height * 0.9, device.width / 2, device.height * 0.5, 1000);
}

function swipeDownToRevealContent() {
    swipe(device.width / 2, device.height * 0.3, device.width / 2, device.height * 0.7, 1000);
}

/**
 * Checks whether the application is currently displaying a specific page indicated by the provided text.
 * 
 * This generic function looks for a UI element with the given `indicatorText` to determine if the
 * application is on the expected page. It's useful when you need to verify different pages within an app.
 * 
 * @param {string} indicatorText - The text identifier that signifies the target page. For example, "广州榜", "我的订单", etc.
 * @returns {boolean} - `true` if the element with `indicatorText` is found on the current screen, indicating that
 *                      the app is on the desired page. Returns `false` otherwise.
 */
function isOnDesiredPage(indicatorText) {
    // Define the query to locate the text element based on the provided indicator text.
    const pageIndicator = className("android.widget.TextView").text(indicatorText);
    
    // Check if the element with the specified text exists on the current screen.
    const isFound = pageIndicator.exists();
    
    // Return whether the indicator was found, signifying the presence of the desired page.
    return isFound;
}


/**
 */
function main() {
    const TARGET_PACKAGE = "com.dianping.v1";
    const APP_NAME = "大众点评";
    // Define a constant array of user names to exclude from the unfollow process
    const EXCLUDED_USER_NAMES = ['点小胖', '艾小评', '麥克牛']; 

    // Attempt to call the toastLog function to display the message, catching any errors that may occur.
    toastLog("start the app");

    // Prompt the user for the number of times to scroll down using a dialog box
    const scrollCountInput = dialogs.rawInput("请输入下滑次数:");

    if (!scrollCountInput) {
        toastLog("输入被取消");
        return;
    } else {
        toastLog(`计划滚动次数: ${scrollCountInput}`);
    }

    // Parse the scrollCount string to an integer
    const scrollCountInt = parseInt(scrollCountInput);
    if (isNaN(scrollCountInt)) {
        toastLog("输入无效");
        return;
    }

    // Display current package name
    toastLog(`current package: ${currentPackage()}`);

    // Launch or ensure the app is in focus
    if (currentPackage() !== TARGET_PACKAGE) {
        toastLog("launch the app");
        app.launchApp(APP_NAME);
        sleep(3000);
        toastLog(`current package: ${currentPackage()}`);
    }

    
    try {
        // Check if the current page is the desired page, if not, quit
        const indicatorText = "尘世中的小吃货";
        if (!isOnDesiredPage(indicatorText)) {
            toastLog(`Not on the desired page (${indicatorText})`);
            return;
        }

        /**
         * This script iterates through the page, unfollowing all "已关注" buttons, 
         * scrolls down, and repeats until no more "已关注" are found after a certain 
         * number of scrolls (scrollCountInt).
         **/

        let consecutiveEmptyScrolls = 0; // Counter for consecutive scrolls without finding "已关注"


        function searchAndUnfollow() {
            let followButton;
            do {
                followButton = className("android.widget.TextView").text("已关注")
                    .boundsInside(0, device.height * 0.33, device.width, device.height * 0.9)
                    .findOne(5000);

                if (followButton) {
                    usernameTextView = followButton.parent().parent().findOne(className("android.widget.TextView"));
                    if (usernameTextView) {
                        const username = usernameTextView.text();
                        console.log(`Detected user: ${username}`);

                        // Check if the username should be excluded
                        if (EXCLUDED_USER_NAMES.includes(username)) {
                            console.log(`"${username}" is on the exclusion list. Skipping.`);
                            return; // Quit the entire program
                        }

                        click(followButton.bounds().centerX(), followButton.bounds().centerY());
                        sleep(1000);
                        click("确认");
                        console.log("User unfollowed.");

                        sleep(Math.floor(Math.random() * 2000) + 2000); // Human-like delay.
                    } else {
                        console.log("Username not found for the detected button.");
                        return;
                    }
                } else {
                    break; // Exit loop if no more "已关注" found
                }
            } while (followButton);
        }

        // Main processing loop
        while (consecutiveEmptyScrolls < scrollCountInt) {
            searchAndUnfollow(); // Attempt to find and unfollow "已关注"

            if (!className("android.widget.TextView").text("已关注").exists()) {
                // If no "已关注" after searching, consider this a "no-find" scroll
                consecutiveEmptyScrolls++;
            } else {
                consecutiveEmptyScrolls = 0; // Reset counter if "已关注" was found
            }

            if (consecutiveEmptyScrolls < scrollCountInt) {
                // Only scroll if we haven't exceeded the empty scroll threshold
                swipeUpToRevealContent();
                console.log(`Scrolled up. ${scrollCountInt - consecutiveEmptyScrolls} scrolls remaining before stopping.`);
            }
        }

        console.log("Finished processing '已关注' buttons across the scrolled screens.");

        // Quit the main() 
        return;

    } catch (error) {
        // 在执行过程中捕获任何异常，并通过toastLog显示错误信息
        toastLog(`Error: ${error.message}`);
    }
}

auto.waitFor();
main()
