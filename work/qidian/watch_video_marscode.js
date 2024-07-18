function videoWatchingMode() {
    // 获取用户输入的 "看视频次数", 如果用户输入的不是数字或数字不正确，会自动提示
    const videoCount = prompt("请输入看视频次数：");
    if(isNaN(videoCount) || videoCount <= 0 || videoCount % 1!== 0) {
        alert("输入的看视频次数无效，请重新输入");
        return;
    }
    
    // 启动应用
    launchApp("xx");

    // 检查是否在 "福利中心" 页面
    let welfareCenterPage = true;
    while(welfareCenterPage) {
        const welfareCenterText = className("android.widget.TextView").text("福利中心");
        if(welfareCenterText.exists()) {
            break;
        } else {
            console.error("当前页面不是福利中心页面，脚本执行结束");
        }
    }

    // 查找并点击 "看视频领福利" 按钮
    const watchVideoButton = className("android.widget.TextView").text("看视频领福利");
    if(watchVideoButton.exists()) {
        watchVideoButton.click();
    } else {
        console.error("没有找到 '看视频领福利' 按钮，脚本执行结束");
    }

    // 检查是否有 "跳过广告" 按钮
    const skipAdButton = className("android.widget.Button").text("跳过广告");
    if(!skipAdButton.exists()) {
        console.error("没有找到 '跳过广告' 按钮，脚本执行结束");
    }

    // 等待 15 秒观看视频
    sleep(15000);

    // 检查是否有 "已观看视频" 
    let videoWatched = false;
    for(let i = 0; i < 3; i++) {
        const videoWatchedText = className("android.widget.TextView").text("已观看视频");
        if(videoWatchedText.exists()) {
            videoWatched = true;
            break;
        }
        sleep(1000);
    }
    
    if(!videoWatched) {
        console.error("没有找到 '已观看视频' 提示，脚本执行结束");
    }

    // 点击 "跳过广告" 按钮
    skipAdButton.click();

    // 等待 2 秒，让页面跳回上一页
    sleep(2000);

    // 查找并点击 "我知道了"
    const iKnow = className("android.widget.TextView").text("我知道了");
    if(!iKnow.exists()) {
        console.error("没有找到 '我知道了' 按钮，脚本执行结束");
    }
    iKnow.click();
    
    // 进入下一次视频观看循环
    for(let i = 0; i < videoCount - 1; i++) {
        const watchVideoText = className("android.widget.TextView").text("看视频领福利");
        if(watchVideoText.exists()) {
            watchVideoText.click();
            skipAdButton.click();
            sleep(15000);
            iKnow.click();
        } else {
            console.error("没有找到 '看视频领福利' 按钮，脚本执行结束");  
        }
    }
    
    // 定义精确查找 "看视频" 按钮
    const accurateWatchVideoButton = className("android.widget.TextView").textExact("看视频");
    if(accurateWatchVideoButton.exists()) {
        accurateWatchVideoButton.click();
    } else {
        console.error("没有找到 '看视频' 按钮，脚本执行结束");   
    }
    
    // 完成观看视频任务，脚本执行结束
    console.log('成功完成所有操作');   
}

videoWatchingMode();

