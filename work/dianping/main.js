'use strict';

// This script is using autox.js to automate the desired actions in the app "大众点评"

/**
 *点击UI元素的边界中心，可选调整中心点坐标
 * @param {object} ui - 要查找的UI元素
 * @param {number} [offsetX=0] - 水平方向偏移量，默认不偏移
 * @param {number} [offsetY=0] - 垂直方向偏移量，默认不偏移
 * @returns {boolean} - 成功点击返回true，否则返回false
 */
function clickUiBounds(ui, offsetX = 0, offsetY = 0) {
    if (ui.exists()) {
        var a = ui.findOnce();
        if (a) {
            var b = a.bounds();
            if (b) {
                click(b.centerX() + offsetX, b.centerY() + offsetY);
                return true;
            }
        }
    }
    return false;
}


/**
 * 封装了上划屏幕指定次数的功能，每次上划后动态等待直到满足特定条件
 * @param {number} startX - 滑动开始的X坐标
 * @param {number} startY - 滑动开始的Y坐标
 * @param {number} endX - 滑动结束的X坐标
 * @param {number} endY - 滑动结束的Y坐标
 * @param {number} duration - 滑动操作的持续时间
 * @param {number} waitTime - 每次滑动后的最短等待时间
 * @param {number} swipeCount - 滑动的次数
 */
function swipeUpMultipleTimes(startX, startY, endX, endY, duration, waitTime, swipeCount) {
    const MAX_RETRIES = 3; // 最大重试次数
    const RETRY_INTERVAL = 1000; // 重试间隔

    for (let i = 0; i < swipeCount; i++) {
        let retryCount = 0;
        while (retryCount < MAX_RETRIES) {
            try {
                toastLog(`上划屏幕第${i + 1}次`);
                swipe(startX, startY, endX, endY, duration);
                // 使用动态等待代替固定sleep，检查特定条件是否满足
                // 这里需要替换成实际的条件检查逻辑
                // 例如: if (isElementLoaded()) break;
                setTimeout(() => {}, waitTime); // 模拟动态等待
                break;
            } catch (error) {
                console.error(`尝试 ${i + 1} 次上划屏幕失败，重试中...`);
                retryCount++;
                setTimeout(() => {}, RETRY_INTERVAL); // 重试前等待一段时间
            }
        }
    }
}

// Placeholder for the scrolling function.
function swipeUpToRevealContent() {
    swipe(device.width / 2, device.height * 0.9, device.width / 2, device.height * 0.5, 1000);
}

function swipeUpFraction(fraction = 1/3) {
    const screen_height = device.height;
    const swipe_distance = Math.floor(screen_height * fraction);
    swipe(device.width / 2, device.height * (1 - fraction), device.width / 2, device.height * (1 - fraction) + swipe_distance, 500);
}

/**
 * Checks whether the application is currently displaying the user ranking page.
 * 
 * This function looks for a specific UI element which serves as an indicator that the user is on the
 * user ranking page. In this context, it's assumed that there's a text view with the text "广州榜"
 * that is unique to the user ranking page.
 * 
 * @returns {boolean} - `true` if the "广州榜" indicator is found on the current screen, indicating that
 *                      the app is on the user ranking page. Returns `false` otherwise.
 */
function isStillOnUserRankingPage() {
    // Define the query to locate the unique text element that signifies the user ranking page.
    // Here, we're looking for a TextView with the exact text "广州榜".
    const rankingPageIndicator = className("android.widget.TextView").text("广州榜");
    
    // Execute the query to check if the indicator exists on the current screen.
    // exists() returns true if at least one matching element is found, false otherwise.
    const isFound = rankingPageIndicator.exists();
    
    // Return the result of the check. If true, it implies the user remains on the user ranking page.
    return isFound;
}


/**
 * Iterates through a range of user rankings, ensuring the page is still "广州榜",
 * interacts with the user profile, confirms page changes post-click, and provides
 * a completion status to the caller. If the initial click does not appear effective,
 * it scrolls up one-third of the screen and retries finding and clicking the element.
 *
 * @param {number} startIndex - The starting index of the user ranking to begin with.
 * @param {number} endIndex - The ending index of the user ranking to stop at.
 * @returns {boolean} - true if all iterations completed without issues, false otherwise.
 */
function addAndLoop(startIndex, endIndex) {
    const USER_AVATAR_DISTANCE = 105 / 2 + 5;
    const SCROLL_ATTEMPTS = 1;
    const EXCLUDED_HEIGHT_FROM_BOTTOM = 180;

    function swipeUpFraction(fraction = 1/3) {
        const screen_height = device.height;
        const swipe_distance = Math.floor(screen_height * fraction);
        swipe(device.width / 2, device.height * (1 - fraction), device.width / 2, device.height * (1 - fraction) + swipe_distance, 500);
    }

    for (let i = startIndex; i <= endIndex; i++) {
        // Ensure we're still on the "广州榜" page before attempting to find the user ranking.
        if (!isStillOnUserRankingPage()) {
            toastLog("不在广州榜页面，无法继续操作。");
            return false;
        }

        let scrollCount = 0;
        let userInteractionSuccessful = false;

        while (!userInteractionSuccessful && scrollCount <= SCROLL_ATTEMPTS) {
            // Note that there might be chances that the view count would be found instead of user ranking, 
            // so we have to add constrants to the width.
            user_ranking = className("android.widget.TextView")
                .text(`${i}`)
                .boundsInside(0, 0, device.width / 3, device.height - EXCLUDED_HEIGHT_FROM_BOTTOM)
                .visibleToUser(true)
                .findOnce();

            if (user_ranking) {
                toastLog(`user_ranking ${i} is found.`);
                // toastLog(`user_ranking.depth: ${user_ranking.depth()}`);
                // toastLog(`user_ranking.bounds: ${user_ranking.bounds()}`);
                // toastLog(`user_ranking.bounds.centerX: ${user_ranking.bounds().centerX()}`);
                // toastLog(`user_ranking.bounds.centerY: ${user_ranking.bounds().centerY()}`);

                click(user_ranking.bounds().centerX() + USER_AVATAR_DISTANCE, user_ranking.bounds().centerY());
                sleep(random(1000, 2000));

                // Verify page change after click
                if (!isStillOnUserRankingPage()) {
                    toastLog(`成功点击user_ranking ${i}，页面已变化。`);
                    userInteractionSuccessful = true;

                    // Check if the page contains text "动态", indicating the correct page is loaded.
                    // Otherwise, quit the function with error message.
                    if (text("动态").exists()) {
                        toastLog("找到动态，表示已进入用户主页。");
                    } else {
                        toastLog("未找到动态，表示页面未加载完全。");
                        return false;
                    }

                    // Wait and then check for further interactions
                    sleep(random(5000, 8000));
                    if (text("发消息").exists()) {
                        toastLog("找到发消息, 表示已关注");
                    } else {
                        var follows = text("关注").find();
                        if (follows.length > 1) {
                            click(follows[1].bounds().centerX(), follows[1].bounds().centerY());
                            toastLog("成功点击第二个关注");
                            sleep(random(3000, 5000));
                        } else {
                            toastLog("未找到第二个关注按钮");
                        }
                    }

                    back();
                    sleep(2000);
                } else {
                    toastLog("点击后页面未发生变化，可能点击未生效。");
                    // Attempt to scroll up and then re-find and click the element
                    // swipeUpFraction(1/3);
                    scrollCount++;
                    toastLog(`Attempting to scroll (${scrollCount}/${SCROLL_ATTEMPTS}).`);
                    swipeUpToRevealContent();
                    sleep(2000);
                    // Continue the while loop
                    continue;
                }
            } else {
                // Scroll if the user ranking is not found
                scrollCount++;
                toastLog(`user_ranking ${i} not found, attempting to scroll (${scrollCount}/${SCROLL_ATTEMPTS}).`);
                swipeUpToRevealContent();
                sleep(2000);
            }
        }

        if (scrollCount >= SCROLL_ATTEMPTS && !userInteractionSuccessful) {
            toastLog(`Failed to interact with user_ranking ${i} after ${scrollCount} scrolling attempts.`);
            return false;
        }

        // Sleep before next iteration
        sleep(random(1000, 3000));
    }

    return true; // All iterations completed without issues
}

/**
 */
function main() {
    const TARGET_PACKAGE = "com.dianping.v1";
    const APP_NAME = "大众点评";

    // Attempt to call the toastLog function to display the message, catching any errors that may occur.
    toastLog("start the app");

    // 弹出对话框让用户输入起始索引
    const userInputStartIndex = dialogs.input("请输入起始索引:");
    if (!userInputStartIndex) {
        toastLog("操作取消");
        return;
    }

    // 弹出对话框让用户输入结束索引
    const userInputEndIndex = dialogs.input("请输入结束索引:");
    if (!userInputEndIndex) {
        toastLog("操作取消");
        return;
    } else if (userInputStartIndex > userInputEndIndex) {
        toastLog("起始索引不能大于结束索引");
        return;
    }

    // 将输入的字符串转换为整数
    const startIndex = parseInt(userInputStartIndex, 10);
    const endIndex = parseInt(userInputEndIndex, 10);

    // 检查转换是否成功
    if (isNaN(startIndex) || isNaN(endIndex)) {
        toastLog("输入的不是有效的数字，请重新运行脚本。");
        return;
    }

    try {
        // 显示当前包名
        toastLog(`current package: ${currentPackage()}`);

        // 检查当前包名并启动“大众点评”app，如果当前包名不是“com.dianping.v1”
        if (currentPackage() !== TARGET_PACKAGE) {
            // 显示“launch the app”
            toastLog("launch the app");

            // 使用应用的中文名称作为用户友好的提示，但实际操作时应使用包名作为唯一标识
            // 在这里，假设launchApp方法既可以接受包名也可以接受应用名称作为参数
            app.launchApp(APP_NAME);

            sleep(3000);

            // Display current package name
            toastLog(`current package: ${currentPackage()}`);
        } // otherwise, do nothing

        // Check if the current page is the user ranking page, if not, quit
        if (!isStillOnUserRankingPage()) {
            toastLog("Not on the user ranking page, quit.");
            return;
        }

        // Add friends 
        // Call the addAndLoop function with the predefined constants
        if (addAndLoop(startIndex, endIndex)) {
            toastLog("All iterations completed without issues.");
        } else {
            toastLog("One or more iterations failed.");
        }


        // Quit the main() 
        return;


        /* The following doesn't work, keep for reference only.
        // var widget = desc("我的").findOne();
        // click(widget.bounds().centerX(), widget.bounds().centerY());
        // click(858,1785,1047,1919);
        */
        toastLog("进入首页, 点击我的");
        while (!click("我的"));
        toastLog("成功点击我的");

        sleep(5000);

        // 点击关注
        // toastLog("点击关注");
        // var ui = text("关注");
        // if (clickUiBounds(ui)) {
        //     toastLog("成功点击关注");
        // } else {
        //     toastLog("未找到关注按钮");
        // }
        // sleep(5000);

        // 点击笔记达人中心
        toastLog("点击笔记达人中心");
        if (clickUiBounds(text("笔记达人中心")))
            toastLog("成功点击笔记达人中心");
        else
            toastLog("未找到笔记达人中心按钮");
        sleep(5000);

        // 点击抽百元套餐
        toastLog("点击抽百元套餐");
        if (clickUiBounds(text("抽百元套餐")))
            toastLog("成功点击抽百元套餐");
        else
            toastLog("未找到抽百元套餐按钮");
        sleep(5000);

        // 点击去获得
        toastLog("点击去获得");
        if (clickUiBounds(text("去获得")))
            toastLog("成功点击去获得");
        else
            toastLog("未找到去获得按钮");
        sleep(5000);

        // 点击查看排名
        toastLog("点击查看排名");
        if (clickUiBounds(text("查看排名")))
            toastLog("成功点击查看排名");
        else
            toastLog("未找到查看排名按钮");
        sleep(5000);

        // 滑动屏幕
        toastLog("滑动屏幕");
        swipeUpMultipleTimes(500, 1000, 500, 0, 1000, 5000, 1);
        sleep(5000);


        // 点击推荐
        // toastLog("点击推荐");
        // if (clickUiBounds(text("推荐")))
        //     toastLog("成功点击推荐");
        // else
        //     toastLog("未找到推荐按钮");
        // sleep(5000);


    } catch (error) {
        // 在执行过程中捕获任何异常，并通过toastLog显示错误信息
        toastLog(`Error: ${error.message}`);
    }
}

auto.waitFor();
main()
