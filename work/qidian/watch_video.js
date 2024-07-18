'use strict';

/**
 * 点击UI元素的边界中心
 * @param {object} ui - 要查找的UI元素
 * @param {number} [offsetX=0] - 水平方向偏移量，默认不偏移
 * @param {number} [offsetY=0] - 垂直方向偏移量，默认不偏移
 * @returns {boolean} - 成功点击返回true，否则返回false
 */
function clickUiBounds(ui, offsetX = 0, offsetY = 0) {
    click(ui.bounds().centerX() + offsetX, ui.bounds().centerY() + offsetY);
    return;
}

/**
 * 执行一次看视频流程
 */
function watchVideoOnce() {

    toastLog('开始执行看视频流程');

    // Sleep to wait for video to load
    sleep(3000);

    // 5. 判断是否有“跳过广告”
    const skipAd = text('跳过广告').findOnce();
    if (!skipAd) {
        toastLog('未找到“跳过广告”，退出程序');
        return;
    }

    // 6. 动态获取观看视频的时长。方法：查找text“观看视频xx秒”，然后提取xx秒作为时长
    let counter = 15;
    const watchVideo = textContains("观看视频").findOnce();
    if (watchVideo) {
        counter = parseInt(watchVideo.text().match(/\d+/)[0], 10) + 1; // add 1 seconds for buffer
    }
    else {
        toastLog('未找到“观看视频xx秒”，使用默认值15秒');
    }
    toastLog(`倒计时：${counter}秒`);

    // 6. 等待观看视频的时长. Show countdown in the console
    while (counter > 0) {
        toastLog(counter);
        sleep(1000); // 注意: sleep() 函数在 Node.js 或浏览器环境中不可用，需使用 setTimeout 或其他异步延迟方法。
        counter--;
    }

    // 8. 点击“跳过广告”
    toastLog('点击“跳过广告”');
    clickUiBounds(skipAd);
    sleep(2000);

    // 9. 查找“我知道了”
    const iKnow = text('我知道了').findOnce();
    if (!iKnow) {
        toastLog('未找到“我知道了”，退出程序');
        return;
    }

    // 10. 点击“我知道了”的中心位置
    toastLog('点击“我知道了”的中心位置');
    clickUiBounds(iKnow);
}

/**
 * 执行精确查找“看视频”模式下的看视频流程，直到所有可点击的“看视频”都被遍历
 */
function watchAllVideosInExactMode() {
    // 15. 精确查找“看视频”（必须是这三个字，多少都不行）
    while (text('看视频').exists()) {
        const watchVideoExact = text('看视频').findOnce();
        if (watchVideoExact) {
            // 16. 点击“看视频”的中心位置
            clickUiBounds(watchVideoExact);

            // 重复Step 5-11，完成一次看视频
            watchVideoOnce();
        } else {
            toastLog('未找到“看视频”按钮，退出程序');
            return;
        }
    }
}

/**
 * 主函数
 */
function main() {
    // 1. 脚本开始提示用户输入“看视频次数”
    const videoCount = dialogs.input('请输入看视频次数:');

    const count = parseInt(videoCount, 10);
    if (isNaN(count)) {
        toastLog('输入的不是有效的数字，请重新运行脚本。');
        return;
    }

    // 2. 检查并启动app“起点”
    const TARGET_PACKAGE = "com.qidian.QDReader";
    const APP_NAME = "起点读书";
    // Display current package name
    toastLog(`current package: ${currentPackage()}`);

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

    // 3. 查找TextView“福利中心”，判断是否在“福利中心”的页面
    const welfareCenter = text('福利中心').findOnce();
    if (!welfareCenter) {
        toastLog('未找到“福利中心”页面，退出程序');
        return;
    }

    // 重复执行看视频流程，从点击“看视频领福利”开始
    for (let i = 0; i < count; i++) {
        // 4. 查找“看视频领福利”，找到就点击按钮
        // Print log to console, showing this is the x time to watch video
        toastLog(`第${i + 1}次看视频`);
        const watchVideoReward = text("看视频领福利").findOnce();
        if (watchVideoReward) {
            watchVideoReward.click();
        } else {
            toastLog('未找到“看视频领福利”按钮，退出程序');
            return;
        }

        // 现在等待“跳过广告”出现，开始看视频流程
        watchVideoOnce();
    }

    // 14. 下面继续进行另一种看视频模式，直到所有“看视频”选项都被遍历
    watchAllVideosInExactMode();

    // 19. 成功完成所有操作
    toastLog('成功完成所有操作');
}

auto.waitFor();
main();