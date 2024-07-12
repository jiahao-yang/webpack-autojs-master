var w = floaty.window(
  <frame gravity="center">
    <text id="text">悬浮文字</text>
  </frame>
);

setInterval(() => {}, 1000);
app.launchApp("百度极速版");
if (!floaty.checkPermission()) {
  // 没有悬浮窗权限，提示用户并跳转请求
  toast(
    "本脚本需要悬浮窗权限来显示悬浮窗，请在随后的界面中允许并重新运行本脚本。"
  );
  floaty.requestPermission();
  exit();
} else {
  toastLog("已有悬浮窗权限");
}
