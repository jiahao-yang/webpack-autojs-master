let timer;
let duration;
const main = (lanchAppName, durationTime = -1) => {
  duration = durationTime == -1 ? 0 : true;
  if (lanchAppName) {
    app.launchApp(lanchAppName);
    sleep(1000);
  }
  const width = device.width;
  const height = device.height;
  const startPonit = [width / 2, height - 200];
  const endPonit = [width / 2, 200];
  timer = setInterval(() => {
    swipe(...startPonit, ...endPonit, 2000);
  }, 1000);
};
main();

duration &&
  setTimeout(() => {
    clearInterval(timer);
    console.log("停止滚动");
  }, duration);
