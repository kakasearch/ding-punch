// 1.解锁手机
// 2.打开钉钉
// 3.等待打卡完成
// 4.微信通知结果
///////////////////////////////自定义参数///////////////////////////////

var keepScreenOnMinutes = 5; //脚本执行时保持屏幕常亮,默认5分钟
var pushplus_token = ""//pushplus平台（http://www.pushplus.plus）的token，用于微信推送，""则不推送
var dingtalk_corpId = "" //corpId类似"dingxxxxxxxxx"，用于直接打开打卡页面，""则只打开钉钉app，cropId可以通过邀请新成员的链接获得
var wait_timeout = 30 //检测打卡成功通知的最大等待时间,单位为秒
var is_save_capture = false //是否保存截屏，true保存，false不保存
var try_num = 3 //脚本发生错误后的尝试次数
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
    sleep(2000); // 防止充电动画阻挡解锁
    swipe(500, 1700, 500, 300, 300); //上滑进入输密码页面
    sleep(1000);
    gesture(1000,[550,1800],[809,1487],[821,1750],[573,2014]);//输入手势密码，1000是滑动时间，后面的[x,y]为手势点坐标
   }
   return isDeviceLocked()
}
//锁定屏幕
function lockScreen(){
  //一键锁屏app需要在首页
  click("一键锁屏");
}
 

////////////////////////////程序部分//////////////////////
auto.waitFor(); // 自动打开无障碍服务
var ding_notification = ""; //全局变量，存储通知内容
var ding_status = "" ; //全局变量，存储是否打卡成功

//格式化日期
function format_date(fmt) {
  let now = new Date()
  var o = {
  "M+": now.getMonth() + 1, //月份
  "d+": now.getDate(), //日
  "H+": now.getHours(), //小时
  "m+": now.getMinutes(), //分
  "s+": now.getSeconds(), //秒
  "q+": Math.floor((now.getMonth() + 3) / 3), //季度
  "S": now.getMilliseconds() //毫秒
  };
  if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (now.getFullYear() + "").substr(4 - RegExp.$1.length));
  for (var k in o)
  if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
  return fmt;
  }

//判断是否有屏幕锁
function isDeviceLocked() {
  importClass(android.app.KeyguardManager);
  importClass(android.content.Context);
  var km = context.getSystemService(Context.KEYGUARD_SERVICE);
  return km.isKeyguardLocked();
}

//向微信发送信息
function sendWeiChat(token,title,content) {
    var HEADERS = { "Content-Type": "application/json ;charset=utf-8" };
    var r = http.get(
      "http://www.pushplus.plus/send?token="+token+"&title="+encodeURI(title)+"&content="+encodeURI(content),
      {
        headers: HEADERS,
      }
    );
    result = r.body.json();
    if(result["code"]==200){
        console.log("微信消息发送成功");
    }else{
        console.log("微信消息发送失败",result);
    }
  }
//打开钉钉，可以launchApp("钉钉")，也可以用intent
function open_dingtalk(corpId){
    console.log("打开钉钉");
    if(dingtalk_corpId == ""){
        launchApp("钉钉");
        //点击忽略更新（如果有）
        if (click("暂不更新")) {
          console.log("点击暂不更新");
        }
        sleep(5 * 1000);
    }else{
      app.startActivity({
        action:"VIEW",
        data:"dingtalk://dingtalkclient/page/link?corpId="+corpId+"&url=https://attend.dingtalk.com/attend/index.html",
      });
      sleep(1000);
    }
}

function getScreenCapture(){
    let Thread = threads.start(function(){
        if(auto.service != null){  //如果已经获得无障碍权限
                //由于系统间同意授权的文本不同，采用正则表达式
                let Allow = textMatches(/(允许|立即开始|同意)/).findOne(10*1000);
                if(Allow){
                    Allow.click();
                }
        }
    });
    if(!requestScreenCapture()){
        log("请求截图权限失败");
        return false;
    }else{
        Thread.interrupt()
        log("已获得截图权限");
        return true;
    }
}

//截图保存
function capture_screen(){
     console.log("截图");
     if (!getScreenCapture()) {
       return ""
     }
     sleep(1000);//权限请求窗口退出后截图
     var img = captureScreen();
     var path = "/sdcard/DCIM/Screenshots/钉钉打卡"+format_date('yyyy_MM_dd_HH_mm_ss')+".png"
     img.saveTo(path);
     media.scanFile(path);//可以在相册中查看图片
     img.recycle();
     return path
}
    
//根据控件文字点击，如果点击失败，则说明打卡流程无法正常进行，结束脚本运行
function clickMessage(message) {
      var n = 3;
      var logo = false;
      while (n--) {
        if (click(message)) {
          logo = true;
          break;
        }
        sleep(1 * 1000);
      }
      if (logo == false) {
        console.error("点击" + message + "出错");
        exit();
      }
}
//启用通知监听，监听是否有打卡成功通知
function observe_ding(){
  threads.start(function(){//在子进程中运行监听事件
    events.observeNotification();
    events.on("notification", function(n){
        // console.log("收到新通知:\n 标题: %s, 内容: %s, \n包名: %s", n.getTitle(), n.getText(), n.getPackageName());
        //获取打卡结果通知，将结果放到ding_status变量里
        if(/com.alibaba.android.rimet/.test(n.getPackageName()) && /考勤打卡/.test(n.getText())){
            ding_notification = n.getText();
            threads.shutDownAll();//停止所有通过threads.start()启动的子线程
        }
  
  });
  })
}
//判断打卡是否成功
function is_success_punch(){
  //创建悬浮窗口
  var window = floaty.window(
    <frame gravity="center">
        <text id="text" textSize="16sp" textColor="#f44336"/>
    </frame>
  );
  for(let i = wait_timeout;i>0;i--){
    sleep(1000);
    console.log('check:',ding_notification);
    ui.run(function() {
      window.text.setText("\n正在检测是否有打卡成功通知\n倒计时"+String(i)+"s\n"+ding_notification);
    });
    if(ding_notification != ""){
        //已收到通知
        break;
    }
  }
  window.close()
  if(/无效/.test(ding_notification)){
    ding_status = "打卡失败";
  }
  if(/成功/.test(ding_notification)){
      ding_status = "打卡成功";
  }
  let x = className("android.view.View").textContains("已打卡").find();
  if(x.length >1 && new Date().getHours() >=12){
    //现在是下午，找到2个已打卡
    ding_status = "下班打卡成功";
    ding_notification = "下班打卡成功";
  }else if(x.length >0 && new Date().getHours() <12){
    //现在是上午，找到1个已打卡
    ding_status = "上班打卡成功";
    ding_notification = "上班打卡成功";
  }
  if (className("android.view.View").text("今日休息").exists()) {
    console.log("今日休息");
    ding_status = "今日休息";
    ding_notification = "今日休息";
  }
  if(ding_status){
    toast(ding_status);
    console.log(ding_status,ding_notification);
  }else{
    ding_status = "无法判断"
    ding_notification = "未能判断出是否完成打卡，请自行检查"
    console.error("无法判断打卡是否成功")
  }
}

//主程序
function punchTheClock() {
    
  //1.解锁手机
  unlock();
  //脚本执行时保持屏幕常亮  5分钟
  device.keepScreenOn(keepScreenOnMinutes * 60 * 1000);
  //监听是否有打卡成功通知
  observe_ding();
  //2.打开钉钉打卡
  open_dingtalk(dingtalk_corpId);
  //点击打卡，因为设置了快速打卡，所以不需要点击打卡，只要等待获取结果
  //3.判断打卡是否成功
  is_success_punch();
  //截图
  if(is_save_capture){
    capture_screen();
  }else{
    console.log("不需要截图");
  }
  
  //发送结果
  if(pushplus_token){    
    sendWeiChat(pushplus_token,ding_status,ding_notification);
  }else{
    console.log("不需要将结果推送到微信");
  }
  
  //返回主页
  home();
  sleep(1000);
  home();
  sleep(1000);

  //关闭屏幕常亮
  console.log("关闭屏幕常亮");
  device.cancelKeepingAwake();
  console.log("打卡完成");
  lockScreen();
}

//进入打卡流程
for(let i =try_num;i>0;i--){
  try{
    punchTheClock();
    break
  }catch(err){
    console.log(err)
    sleep(10*1000)
    console.log("发生错误，即将重新执行")
    continue
  }
}

