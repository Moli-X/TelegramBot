# TelegramBot


## 特点

- 基于cloudflare worker搭建，能够实现以下效果
  - 搭建成本低，一个js文件即可完成搭建
  - 不需要额外的域名，利用worker自带域名即可
  - 基于worker kv实现永久数据储存
  - 稳定，全球cdn转发
- 接入反欺诈系统，当聊天对象有诈骗历史时，自动发出提醒
- 支持屏蔽用户，避免被骚扰

## 搭建方法

1. 从[@BotFather](https://t.me/BotFather)获取token，并且可以发送`/setjoingroups`来禁止此Bot被添加到群组
2. 从[uuidgenerator](https://www.uuidgenerator.net/)获取一个随机uuid作为secret
3. 从[@username_to_id_bot](https://t.me/username_to_id_bot)获取你的用户id
4. 登录[cloudflare](https://workers.cloudflare.com/)，创建一个worker
5. 配置worker的变量
    - 增加一个`ENV_BOT_TOKEN`变量，数值为从步骤1中获得的token
    - 增加一个`ENV_BOT_SECRET`变量，数值为从步骤2中获得的secret
    - 增加一个`ENV_ADMIN_UID`变量，数值为从步骤3中获得的用户id
6. 绑定KV数据库，在设置 -> 变量，下滑找到KV 命名空间绑定：telegrambot -> telegrambot
7. 点击`Quick Edit`，复制[这个文件](https://github.com/Moli-X/TelegramBot/raw/main/Bot.js)到编辑器中
8. 通过打开`https://xxx.workers.dev/registerWebhook`来注册websoket

## 使用方法

- 当其他用户给bot发消息，会被转发到bot创建者
- 可以添加自动回复
- 用户回复普通文字给转发的消息时，会回复到原消息发送者



## Thanks

- [telegram-bot-cloudflare](https://github.com/cvzi/telegram-bot-cloudflare)
- [zhpengfei](https://zhpengfei.com/how-to-create-your-own-telegram-bot/#aioseo-cloudflare-workertelegram)
