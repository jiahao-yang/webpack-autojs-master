//悬浮窗显示当前时间，精确到秒
// 淡灰色：#C0C0C0
// 中灰色（通常被称为“灰色”）：#808080
// 较深的灰色：#666666
// 更深的灰色：#333333

var w = floaty.window(  
    <vertical bg="#808080">
        <text gravity="center" textStyle="bold" textSize="19sp" id="cap" textColor="#ff0000">
        </text>
        
        <text gravity="center" textSize="19sp" id="text" textColor="white">———————☞当前时间☜———————</text>
        
    </vertical>

);

//w.setAdjustEnabled(true);

w.setPosition(30, 1050);

// w.setSize(-1, -2)
w.setSize(device.width * 5 / 6, -2); // 设置宽度为屏幕宽度的5/6，高度自动适应内容

//w.setPosition(device.width/6, device.height/4*3);

//w.setTouchable(false);

//点击一下后可移动、调整大小和关闭

w.exitOnClose();

w.text.click(() => {

      
    w.setAdjustEnabled(!w.isAdjustEnabled());

});

setInterval(function() {  
    var date = new Date();

      
    ui.run(function() {    
        w.cap.setText("🇨🇳🇨🇳🇨🇳🇨🇳🇨🇳中国🇨🇳🇨🇳🇨🇳🇨🇳🇨🇳");    
        w.text.setText(date + "\n当前电量剩余：" + device.getBattery());

          
    })
}, 1000); 
