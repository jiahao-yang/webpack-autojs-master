const res = images.requestScreenCapture();
if (!res) {
  toastLog("申请截图失败");
  exit();
}

app.launchApp("小猪消消乐");

const inGamePageFlag = [
  "#fbe182",
  [
    [70, 2, "#ffcd59"],
    [127, -55, "#36c24f"],
    [148, -32, "#ffffff"],
    [456, -44, "#9e3207"],
    [614, -53, "#9e3207"],
  ],
  { threshold: [26] },
];
const yellow_x = [
  "#5b1302",
  [
    [3, 1, "#642608"],
    [0, 4, "#672706"],
    [34, 1, "#8c4c16"],
    [67, -1, "#ffffee"],
    [67, 3, "#722800"],
    [70, 0, "#682308"],
    [98, 4, "#87360d"],
    [103, 1, "#8b4b15"],
    [108, 3, "#874310"],
  ],
  { threshold: [26] },
];
const yellow_y = [
  "#db9a79",
  [
    [5, 0, "#5b1701"],
    [5, 6, "#793200"],
    [2, 6, "#672504"],
    [-3, 30, "#fd8106"],
    [2, 36, "#d74200"],
    [7, 37, "#d74400"],
    [-4, 55, "#f4a503"],
    [0, 72, "#b46d58"],
    [6, 70, "#882200"],
    [3, 75, "#662301"],
    [-3, 96, "#febd43"],
  ],
  { threshold: [26] },
];
const wihte_x = [
  "#e9ecef",
  [
    [14, 5, "#e57c74"],
    [25, 6, "#e17b7b"],
    [39, 7, "#d7e3e7"],
    [69, 7, "#e9f1f1"],
    [82, 5, "#dc7676"],
    [96, 5, "#feb6b7"],
    [108, 4, "#dce5e9"],
  ],
  { threshold: [26] },
];
const wihte_y = [
  "#e9f1f1",
  [
    [20, -4, "#fdb4b4"],
    [25, -3, "#eca19e"],
    [37, -1, "#d9e2e4"],
    [27, 7, "#a9acb2"],
    [27, 7, "#a9acb2"],
    [74, 2, "#e0e6e9"],
    [90, -2, "#fdb2b4"],
    [94, -2, "#df8076"],
    [105, 1, "#d2dce0"],
  ],
  { threshold: [26] },
];
const pink_y = [
  "#ffc7b6",
  [
    [-8, -2, "#682413"],
    [-7, 20, "#ffc9b9"],
    [4, 17, "#ff9988"],
    [-14, 66, "#fffef5"],
    [-10, 64, "#8f380a"],
    [2, 76, "#fc6958"],
    [5, 102, "#ff6345"],
  ],
  { threshold: [26] },
];
const pink_x = [
  "#e3d9d9",
  [
    [15, -10, "#ffb7a5"],
    [32, -12, "#ffcebd"],
    [17, 11, "#fc5e4d"],
    [22, 28, "#de4523"],
    [67, 14, "#ffcab7"],
    [75, -2, "#94370f"],
    [91, 22, "#f8a493"],
    [105, 3, "#4a1f16"],
    [116, 14, "#ffb6a3"],
    [89, 26, "#ba3217"],
  ],
  { threshold: [26] },
];

const startClick = () => {
  const findList = [yellow_x, yellow_y, pink_x, pink_y, wihte_x, wihte_y];
  var index = 0;
  var item;
  var firstColor, otherColor;

  while (index < findList.length) {
    const res = isGamePage();

    if (!res) return;
    let screenImage = images.captureScreen();
    item = findList[index];
    firstColor = item[0];
    otherColor = item[1];

    const point = images.findMultiColors(screenImage, firstColor, otherColor);
    if (!point) {
      console.log(index);
      index++;
    } else {
      console.log("找到point", point.x, point.y);
      click(point.x, point.y);
    }
  }
  exit();
};
const test = (params) => {
  console.log("test", params);
};
const params = 2;
// test(params);
startClick();

// startScript();
function startScript() {
  while (true) {
    const res = isGamePage();

    sleep(2000);
    if (res) {
      startGame();
    } else {
      // findImageClick("close.png");
      // findImageClick("continue.png");
    }
  }
}

function isGamePage() {
  let inGamePage = false;
  let reCount = 0;
  do {
    //从工程目录下res文件夹下读取sms.png文件
    let screenImage = images.captureScreen();

    if (!screenImage) {
      toastLog("未截取到屏幕");
      return;
    }
    console.log(inGamePageFlag);
    let findColor = images.findMultiColors(
      screenImage,
      inGamePageFlag[0],
      inGamePageFlag[1],
      inGamePageFlag[2]
    );
    //抓取屏幕

    if (!findColor) {
      toastLog("不在游戏页面");
      return false;
    }
    reCount++;
  } while (!inGamePage && reCount < 10);
  return inGamePage;
}
function startGame() {
  const list = [yellow_x, yellow_y, wihte_x, wihte_y];
  let index = 0;
  let point;
  const screenImage = images.captureScreen();
  while (index < 5) {
    const item = list[index];
    console.log(item[0], item[1]);

    console.log("找到的point", point);
    index++;
  }
}
const findImageClick = (name) => {
  console.log(name);
  const smallImage = images.read(getPath(name));
  const fullImage = images.captureScreen();
  if (!smallImage || !fullImage) return null;
  const point = images.findImage(fullImage, smallImage);
  if (!point) {
    console.log(name, "未找到");
    return null;
  } else {
    console.log(name, "找到位置", point);
  }
  click(point.x, point.y);
  return point;
};
