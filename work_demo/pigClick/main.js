const checkInGamePage = () => {
  const fullImage = images.captureScreen();
  const pont = images.findMultiColors(
    fullImage,
    "#36c24f",
    [
      [15, 9, "#ffffff"],
      [31, -1, "#36c24f"],
      [30, 24, "#36c24f"],
      [6, 34, "#36c24f"],
      [303, -18, "#fee01d"],
      [293, -26, "#fffffb"],
      [328, 5, "#9e3207"],
      [349, 3, "#9e3207"],
      [333, 30, "#9e3207"],
      [355, 31, "#9e3207"],
      [344, 83, "#07c262"],
    ],
    { threshold: [50] }
  );
  if (!pont) return false;
  return true;
};
const {
  pink_x,
  pink_y,
  white_x,
  white_y,
  yellow_x,
  yellow_y,
} = require("./assets/index");
const listArray = [pink_x, pink_y, white_x, white_y, yellow_x, yellow_y];
const clickPig = () => {
  let index = 0;
  while (index < 6) {
    const item = listArray[index];
    const fullImage = images.captureScreen();
    const point = images.findMultiColors(fullImage, ...item);
    console.log(point, "ponit");
    if (!point) {
      index++;
      click(48, 1051);
    } else {
      click(point.x, point.y);
    }
  }
};
const main = () => {
  /**
   * 权限管理
   */
  setScreenMetrics(720, 1280);

  const requestRes = images.requestScreenCapture();
  if (!requestRes) {
    toastLog("截屏权限获取失败");
    return;
  }
  app.launchApp("小猪消消乐");
  console.log("启动小猪消消乐");

  sleep(1000);
  const path = files.path("./assets/close.png");
  console.log(path, "path");
  const closeImge = images.read(path);
  console.log(closeImge, "closeImge");
  while (true) {
    const isInGamePage = checkInGamePage();
    if (isInGamePage) {
      console.log("在游戏页面");

      clickPig();
    } else {
      console.log("未在游戏页面");
      const fullImage = images.captureScreen();
      const ponit = images.findImage(fullImage, closeImge);
      if (!ponit) continue;
      click(ponit.x, ponit.y);
      sleep(1000);
    }
  }
};
main();
