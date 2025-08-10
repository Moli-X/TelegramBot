const TOKEN = ENV_BOT_TOKEN;
const WEBHOOK = '/endpoint';
const SECRET = ENV_BOT_SECRET;
const ADMIN_UID = ENV_ADMIN_UID;
const KV_NAMESPACE = telegrambot;
const LAST_USER_KEY = 'last_user';
const USER_MESSAGES_KEY_PREFIX = 'user_message_';
const ADMIN_RESPONSES_KEY_PREFIX = 'admin_response_';

addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.pathname === WEBHOOK) {
    event.respondWith(handleWebhook(event));
  } else if (url.pathname === '/registerWebhook') {
    event.respondWith(registerWebhook(event, url, WEBHOOK, SECRET));
  } else if (url.pathname === '/unRegisterWebhook') {
    event.respondWith(unRegisterWebhook(event));
  } else {
    event.respondWith(new Response('No handler for this request'));
  }
});

async function handleWebhook(event) {
  if (event.request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== SECRET) {
    return new Response('Unauthorized', { status: 403 });
  }

  const update = await event.request.json();
  event.waitUntil(onUpdate(update));

  return new Response('Ok');
}

async function onUpdate(update) {
  if ('message' in update) {
    await onMessage(update.message);
  }
}

async function onMessage(message) {
  const chatId = message.chat.id;
  const userName = message.from.username ? `@${message.from.username}` : message.from.first_name;

  if (chatId == ADMIN_UID) {
    // 管理员消息处理
    let userChatId;

    if (message.reply_to_message) {
      const repliedMessageId = message.reply_to_message.message_id;
      userChatId = await KV_NAMESPACE.get(`admin_message_${repliedMessageId}`);
      if (!userChatId) {
        await sendPlainText(ADMIN_UID, '无法找到要回复的用户消息。');
        return;
      }
    } else {
      // 获取最后一个活跃的用户
      userChatId = await KV_NAMESPACE.get(LAST_USER_KEY);
      if (!userChatId) {
        await sendPlainText(ADMIN_UID, '没有最近活跃的用户会话。');
        return;
      }
    }

    // 根据管理员发送的消息类型，转发给对应的用户
    let responseText = '';
    if (message.photo) {
      const photo = message.photo[message.photo.length - 1];
      await sendPhoto(userChatId, photo.file_id);
      responseText = `管理员发送了一张图片: ${photo.file_id}`;
    } else if (message.sticker) {
      await sendSticker(userChatId, message.sticker.file_id);
      responseText = `管理员发送了一张贴纸: ${message.sticker.file_id}`;
    } else if (message.voice) {
      await sendVoice(userChatId, message.voice.file_id);
      responseText = `管理员发送了一条语音消息: ${message.voice.file_id}`;
    } else if (message.document) {
      await sendDocument(userChatId, message.document.file_id);
      responseText = `管理员发送了一份文件: ${message.document.file_id}`;
    } else if (message.video) {
      await sendVideo(userChatId, message.video.file_id);
      responseText = `管理员发送了一段视频: ${message.video.file_id}`;
    } else if (message.location) {
      await sendLocation(userChatId, message.location.latitude, message.location.longitude);
      responseText = `管理员发送了一个位置: 纬度 ${message.location.latitude}, 经度 ${message.location.longitude}`;
    } else {
      const text = message.text || '收到一个非文本消息';
      await sendPlainText(userChatId, text);
      responseText = text;
    }
    await KV_NAMESPACE.put(`${ADMIN_RESPONSES_KEY_PREFIX}${userChatId}`, responseText);
  } else {
    // 普通用户消息，先尝试自动回复关键词
    let userText = message.text ? message.text.trim() : '';
    // 关键词自动回复配置
    const autoReplies = {
      '你好': '您好，有什么可以帮您的吗？',
      '帮助': '请告诉我您需要帮助的内容。',
      '仓库地址': 'https://github.com/Moli-X',
      '证书购买': 'https://t.me/QuantX/398',
      '青龙代挂': 'https://t.me/QuantX/467',
      '懒人配置': 'https://t.me/QuantX/83',
    };

    if (userText) {
      // 忽略大小写精确匹配关键词
      const replyKey = Object.keys(autoReplies).find(key => userText.toLowerCase() === key.toLowerCase());
      if (replyKey) {
        // 发送自动回复给用户
        await sendPlainText(chatId, autoReplies[replyKey]);
        // 自动回复后，不转发给管理员，直接返回
        return;
      }
    }

    // 处理用户消息，转发给管理员
    let userMessageText = '';
    let response;
    if (message.photo) {
      const photo = message.photo[message.photo.length - 1];
      userMessageText = `用户发送了一张图片: ${photo.file_id}`;
      response = await sendPhoto(ADMIN_UID, photo.file_id, `来自用户 ${userName} 的图片`);
    } else if (message.sticker) {
      userMessageText = `用户发送了一张贴纸: ${message.sticker.file_id}`;
      response = await sendSticker(ADMIN_UID, message.sticker.file_id);
    } else if (message.voice) {
      userMessageText = `用户发送了一条语音消息: ${message.voice.file_id}`;
      response = await sendVoice(ADMIN_UID, message.voice.file_id);
    } else if (message.document) {
      userMessageText = `用户发送了一份文件: ${message.document.file_id}`;
      response = await sendDocument(ADMIN_UID, message.document.file_id);
    } else if (message.video) {
      userMessageText = `用户发送了一段视频: ${message.video.file_id}`;
      response = await sendVideo(ADMIN_UID, message.video.file_id);
    } else if (message.location) {
      userMessageText = `用户发送了一个位置: 纬度 ${message.location.latitude}, 经度 ${message.location.longitude}`;
      response = await sendLocation(ADMIN_UID, message.location.latitude, message.location.longitude);
    } else {
      const text = message.text || '用户发送了非文本消息';
      userMessageText = text;
      response = await sendPlainText(ADMIN_UID, `来自用户 ${userName} 的消息:\n${text}`);
    }
    // 保存管理员消息ID与用户聊天ID的映射，用于管理员回复时知道发给谁
    if (response && response.result && response.result.message_id) {
      const adminMessageId = response.result.message_id;
      await KV_NAMESPACE.put(`admin_message_${adminMessageId}`, chatId.toString());
    }
    await KV_NAMESPACE.put(`${USER_MESSAGES_KEY_PREFIX}${chatId}`, userMessageText);
    await KV_NAMESPACE.put(LAST_USER_KEY, chatId.toString());
  }
}

function apiUrl(methodName) {
  return `https://api.telegram.org/bot${TOKEN}/${methodName}`;
}

async function sendPlainText(chatId, text) {
  const response = await fetch(apiUrl('sendMessage'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text })
  });
  return response.json();
}

async function sendSticker(chatId, fileId) {
  const response = await fetch(apiUrl('sendSticker'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, sticker: fileId })
  });
  return response.json();
}

async function sendPhoto(chatId, fileId, caption = '') {
  const response = await fetch(apiUrl('sendPhoto'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, photo: fileId, caption })
  });
  return response.json();
}

async function sendVoice(chatId, fileId) {
  const response = await fetch(apiUrl('sendVoice'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, voice: fileId })
  });
  return response.json();
}

async function sendDocument(chatId, fileId) {
  const response = await fetch(apiUrl('sendDocument'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, document: fileId })
  });
  return response.json();
}

async function sendVideo(chatId, fileId) {
  const response = await fetch(apiUrl('sendVideo'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, video: fileId })
  });
  return response.json();
}

async function sendLocation(chatId, latitude, longitude) {
  const response = await fetch(apiUrl('sendLocation'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, latitude, longitude })
  });
  return response.json();
}

async function registerWebhook(event, requestUrl, suffix, secret) {
  const webhookUrl = `${requestUrl.protocol}//${requestUrl.hostname}${suffix}`;
  const response = await fetch(apiUrl('setWebhook'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl, secret_token: secret })
  });
  const r = await response.json();
  return new Response('ok' in r && r.ok ? 'Ok' : JSON.stringify(r, null, 2));
}

async function unRegisterWebhook(event) {
  const response = await fetch(apiUrl('setWebhook'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: '' })
  });
  const r = await response.json();
  return new Response('ok' in r && r.ok ? 'Ok' : JSON.stringify(r, null, 2));
}
