# ding-punch
 基于autojs的钉钉自动打卡脚本

## 使用说明

- 下载安装 [Auto.js Pro](https://pro.autojs.org/)或者AutoJs 4.1.1 alpha2 或者 [AutoX.js](http://doc.autoxjs.com/) 
- 把整个脚本项目放进 **"/sdcard/脚本/"** 文件夹下面，然后点击main.js旁边的三点，选择设置任务，按照需求设置好脚本执行时间即可。
- 需要根据自己的情况修改main.js第7行至第34行的代码。
- 授予Autojs软件必须的权限：`悬浮窗`、`自启动`、`无障碍服务`，并放入电池优化白名单。
- 无障碍权限在手机重启后会失效，可以[通过adb获取永久授权](https://github.com/TonyJiangWJ/AutoScriptBase/blob/master/resources/doc/ADB%E6%8E%88%E6%9D%83%E8%84%9A%E6%9C%AC%E8%87%AA%E5%8A%A8%E5%BC%80%E5%90%AF%E6%97%A0%E9%9A%9C%E7%A2%8D%E6%9D%83%E9%99%90.md)，OPPO、realme、一加手机需要先在开发者选项开启`禁止权限监控`

## 配置

- 需要按自己的情况修改main.js第7行至第34行的代码。

```javascript
var keepScreenOnMinutes = 5; //脚本执行时保持屏幕常亮,默认5分钟，一般不需要改
var pushplus_token = ""//pushplus平台（http://www.pushplus.plus）的token，用于微信推送，""则不推送
var dingtalk_corpId = "" //corpId类似"dingxxxxxxxxx"，用于直接打开打卡页面，""则只打开钉钉app，cropId可以通过邀请新成员的链接获得，建议输入cropId
var wait_timeout = 30 //检测打卡成功通知的最大等待时间,单位为秒，一般不需要改
var is_save_capture = false //是否保存截屏，true保存，false不保存
var try_num = 3 //脚本发生错误后的尝试次数，一般不需要改
// 解锁屏幕，自己修改23-27行处密码逻辑
function unlock() {
    device.wakeUp();
    sleep(2 * 1000);
    //判断屏幕是否唤醒成功
    if (!device.isScreenOn()) {
        console.error("屏幕未唤醒，解锁手机");
        exit();
    }
    //输入密码解锁
  if(isDeviceLocked()){
    //此处为解锁手机的代码，请按自己的情况修改，示例如下：
    sleep(2000); // 防止充电动画阻挡解锁
    swipe(500, 1700, 500, 300, 300); //上滑进入输密码页面
    sleep(1000);//等待1s后输入密码
    gesture(1000,[550,1800],[809,1487],[821,1750],[573,2014]);//输入手势密码，1000是滑动时间，后面的[x,y]为手势点坐标
   }
   return isDeviceLocked()
}
//锁定屏幕
function lockScreen(){
  //打卡完成后的锁屏代码，我采用的方式是将一键锁屏app放到桌面首页，通过点击一键锁屏来锁定屏幕，可以自行修改
  click("一键锁屏");
}
```