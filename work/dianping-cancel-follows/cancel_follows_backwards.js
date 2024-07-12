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
        * The below portion performs the following actions:
        * 1. Searches for all "已关注" buttons.
        * 2. If no buttons are found, scrolls down and repeats the search.
        * 3. For each found button:
        *     a. Retrieves the username from the button's hierarchy.
        *     b. Clicks the button to unfollow.
        * 4. Waits a random duration between 2-4 seconds after each click.
        * 5. Scrolls down to load more content.
        * 6. Repeats steps 1-5 until the specified scroll limit (scrollCountInt) is reached.

        let scrollCount = 0;

        while (scrollCount < scrollCountInt) {
            // 1. Locate all "已关注" buttons. Search area is the 2/3 bottom of the screen.
            console.log(`Searching for '已关注' buttons. Current scroll count: ${scrollCount}`);
            const followButtons = className("android.widget.TextView").text("已关注")
                                    .boundsInside(0, device.height * 0.33, device.width, device.height)
                                    .find();

            // 2. If none found, scroll and retry.
            if (followButtons.length === 0) {
                swipeDownToRevealContent();
                scrollCount++; // Increment scroll count for the attempted scroll.
                console.log(`Scrolled down to discover more '已关注' buttons. Current scroll count: ${scrollCount}`);
                continue; // Skip to the next iteration to attempt finding buttons again.
            }

            // 3. Iterate through located buttons.
            for (var i = 0; i < followButtons.length; i++) {
                // 3.1 Identify the associated username.
                var button = followButtons[i];
                const usernameTextView = button.parent().parent().findOne(className("android.widget.TextView"));
                if (usernameTextView) {
                    const username = usernameTextView.text();
                    console.log(`Detected user: ${username}`);

                    // 3.2 Unfollow the user by clicking the button.
                    // click(button.bounds().centerX(), button.bounds().centerY());
                    // sleep(1000);
                    // click("确认");
                    console.log("User unfollowed.");

                    // Optional: Simulate a delay to imitate human interaction.
                    sleep(Math.floor(Math.random() * 2000) + 2000); // Pauses for 2-4 seconds.
                }
            }

            // 4. Increment scroll count after processing the current set of buttons.
            scrollCount++;
            console.log(`Completed an iteration. Preparing to scroll for more '已关注'. Current scroll count: ${scrollCount}`);

            // 5. Scroll down to expose additional content before the next iteration.
            swipeDownToRevealContent();

            // The loop concludes when the scroll limit is attained.
        }
        **/


        /**
         * This script ensures:
         * - A single search on the current page when scrollCountInt is 0.
         * - An initial search plus additional searches post-scroll equal to scrollCountInt value when scrollCountInt > 0.
         **/

        let totalSearches = scrollCountInt + 1; // Total number of search operations including the initial one.

        function searchAndProcessButtons() {
            let followButton;
            let usernameTextView;

            do {
                followButton = className("android.widget.TextView").text("已关注")
                    .boundsInside(0, device.height * 0.33, device.width, device.height * 0.9)
                    .findOne(5000); // Timeout to prevent infinite wait.

                if (followButton) {
                    usernameTextView = followButton.parent().parent().findOne(className("android.widget.TextView"));
                    if (usernameTextView) {
                        const username = usernameTextView.text();
                        console.log(`Detected user: ${username}`);

                        click(followButton.bounds().centerX(), followButton.bounds().centerY());
                        sleep(1000);
                        click("确认");
                        console.log("User unfollowed.");

                        sleep(Math.floor(Math.random() * 2000) + 2000); // Simulate human delay.
                    } else {
                        console.log("!!! Username not found for the detected button. Exit abnormally.");
                        return;
                    }
                }
            } while (followButton && totalSearches > 0);

            totalSearches--; // Decrement the search count after completing a search cycle.
        }

        // Always perform the initial search on the current screen.
        searchAndProcessButtons();

        // If scrollCountInt is more than 0, proceed with additional searches after scrolling.
        if (scrollCountInt > 0) {
            while (totalSearches > 0) {
                toastLog(`Scrolling down to discover more '已关注'. ${totalSearches} search(es) left.}`);
                swipeDownToRevealContent();
                searchAndProcessButtons();
            }
        }

        console.log("Finished processing '已关注' buttons according to the specified scroll limit.");

        // Quit the main() 
        return;

    } catch (error) {
        // 在执行过程中捕获任何异常，并通过toastLog显示错误信息
        toastLog(`Error: ${error.message}`);
    }
}

auto.waitFor();
main()
