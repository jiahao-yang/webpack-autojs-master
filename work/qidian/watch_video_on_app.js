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
    return true;
}

/**
 * 点击“知道了”或“猹”
 * @returns {boolean} - 成功点击返回true，否则返回false
 */
function clickConfirmation() {
    const iKnow = text('知道了').findOnce();
    if (iKnow) {
        // 点击“知道了”的中心位置
        toastLog('点击“知道了”的中心位置');
        clickUiBounds(iKnow);
        return true;
    }

    const luckdraw = text('抽奖').findOnce();
    if (luckdraw) {
        // 点击bounds(510，1926，570，1989)的中心位置关闭弹窗
        toastLog('点击bounds(510，1926，570，1989)的中心位置关闭弹窗');
        click(540, 1957);
        return true;
    }

    toastLog('未找到“知道了”或“抽奖”，退出程序');
    return false;
}

/**
 * 处理“跳过广告”逻辑
 * @returns {boolean} - 成功处理返回true，否则返回false
 */
function handleSkipAd() {
    const skipAd = text('跳过广告').findOnce();
    if (!skipAd) {
        toastLog('未找到“跳过广告”，退出此模式');
        return false;
    }
    toastLog('找到“跳过广告”， 开始执行“跳过广告”逻辑');

    // 动态获取观看视频的时长。方法：查找text“观看视频xx秒”，然后提取xx秒作为时长
    let counter = 15;
    const watchVideo = textContains("观看视频").findOnce();
    if (watchVideo) {
        counter = parseInt(watchVideo.text().match(/\d+/)[0], 10) + 1; // add 1 seconds for buffer
    } else {
        toastLog('未找到“观看视频xx秒”，使用默认值15秒');
    }
    toastLog(`倒计时：${counter}秒`);

    // 等待观看视频的时长. Show countdown in the console
    while (counter > 0) {
        toastLog(counter);
        sleep(1000); // 注意: sleep() 函数在 Node.js 或浏览器环境中不可用，需使用 setTimeout 或其他异步延迟方法。
        counter--;
    }

    // 点击“跳过广告”
    toastLog('点击“跳过广告”');
    clickUiBounds(skipAd);
    sleep(2000);

    return true;
}

/**
 * 处理“观看xx秒后即可获得奖励”逻辑
 * @returns {boolean} - 成功处理返回true，否则返回false
 */
function handleWatchVideoReward() {
    toastLog('开始执行“观看xx秒后即可获得奖励”逻辑');
    // 等待5秒让页面加载
    sleep(5000);

    // 直接等待18到20秒（随机，防侦察）
    const randomWaitTime = Math.floor(Math.random() * 3) + 18; // 18到20秒
    toastLog(`随机等待时间：${randomWaitTime}秒`);
    // countdown
    for (let i = randomWaitTime; i > 0; i--) {
        toastLog(i);
        sleep(1000);
    }

    // 点击bounds(948,305,1044,401)的中心位置关闭弹窗
    toastLog('点击bounds(948,305,1044,401)的中心位置关闭弹窗');
    click(996, 353);
    sleep(1000);

    return true;
}

/**
 * 执行一次看视频流程
 */
function watchVideoOnce() {
    toastLog('开始执行看视频流程');

    // Sleep to wait for video to load
    sleep(3000);

    // 处理“跳过广告”逻辑
    if (!handleSkipAd()) {
        // 如果未找到“跳过广告”，则尝试处理“观看xx秒后即可获得奖励”逻辑
        if (!handleWatchVideoReward()) {
            toastLog('未找到“跳过广告”或“观看xx秒后即可获得奖励”，退出程序');
        }
    }

    // 点击“知道了”
    return clickConfirmation();
}

/**
 * 执行精确查找“看视频”模式下的看视频流程，直到所有可点击的“看视频”都被遍历
 */
function watchAllVideosInExactMode() {
    // 精确查找“看视频”（必须是这三个字，多少都不行）
    while (text('看视频').exists()) {
        const watchVideoExact = text('看视频').findOnce();
        if (watchVideoExact) {
            // 点击“看视频”的中心位置
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

    // 查找TextView“看视频得奖励”，判断是否在“看视频得奖励”的页面
    const isTargetPage = text('看视频得奖励').findOnce();
    if (!isTargetPage) {
        toastLog('未找到“看视频得奖励”页面，退出程序');
        return;
    }


    // 下面继续进行另一种看视频模式，直到所有“看视频”选项都被遍历
    watchAllVideosInExactMode();

    // 成功完成所有操作
    toastLog('成功完成所有操作');
}

auto.waitFor();
main();