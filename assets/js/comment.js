(function () {
  var API = '/comment-api';
  var container = document.getElementById('zk-comments');
  if (!container) return;
  var page = container.dataset.page || location.pathname;

  var html = '<div class="zk-c">' +
    '<div class="zk-header"><span class="zk-title">评论</span><span class="zk-count" id="zk-count"></span></div>' +
    '<div class="zk-editor" id="zk-editor">' +
      '<div class="zk-row">' +
        '<input class="zk-input" id="zk-nick" placeholder="昵称 *" maxlength="20">' +
        '<input class="zk-input" id="zk-email" placeholder="邮箱 (QQ邮箱自动获取头像)">' +
      '</div>' +
      '<textarea class="zk-textarea" id="zk-content" placeholder="说点什么..." maxlength="2000" rows="4"></textarea>' +
      '<div class="zk-reply-hint" id="zk-reply-hint" style="display:none"><span id="zk-reply-text"></span><button class="zk-cancel-reply" id="zk-cancel-reply">&times;</button></div>' +
      '<div class="zk-actions"><span class="zk-tip">支持 QQ 邮箱头像</span><button class="zk-submit" id="zk-submit">发送</button></div>' +
    '</div>' +
    '<div class="zk-list" id="zk-list"></div>' +
  '</div>';
  container.innerHTML = html;

  var replyTo = 0, replyNick = '';
  var nickEl = document.getElementById('zk-nick');
  var emailEl = document.getElementById('zk-email');
  var contentEl = document.getElementById('zk-content');
  var listEl = document.getElementById('zk-list');
  var countEl = document.getElementById('zk-count');
  var replyHint = document.getElementById('zk-reply-hint');
  var replyText = document.getElementById('zk-reply-text');

  // restore saved info
  nickEl.value = localStorage.getItem('zk_nick') || '';
  emailEl.value = localStorage.getItem('zk_email') || '';

  function timeAgo(dateStr) {
    var diff = (Date.now() - new Date(dateStr + (dateStr.includes('Z') ? '' : 'Z')).getTime()) / 1000;
    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
    if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前';
    if (diff < 2592000) return Math.floor(diff / 86400) + ' 天前';
    return new Date(dateStr).toLocaleDateString('zh-CN');
  }

  function renderComment(c) {
    var avatarSrc = c.avatar || 'https://cravatar.cn/avatar/?s=100&d=mp';
    var replyBadge = c.reply_nick ? '<span class="zk-reply-badge">回复 ' + c.reply_nick + '</span>' : '';
    return '<div class="zk-item" data-id="' + c.id + '">' +
      '<img class="zk-avatar" src="' + avatarSrc + '" alt="" loading="lazy">' +
      '<div class="zk-body">' +
        '<div class="zk-meta"><strong class="zk-name">' + c.nick + '</strong>' + replyBadge + '<time class="zk-time">' + timeAgo(c.created_at) + '</time></div>' +
        '<div class="zk-text">' + c.content.replace(/\n/g, '<br>') + '</div>' +
        '<button class="zk-reply-btn" data-id="' + c.id + '" data-nick="' + c.nick + '">回复</button>' +
      '</div></div>';
  }

  function load() {
    fetch(API + '/api/comments?page=' + encodeURIComponent(page))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d.ok) return;
        countEl.textContent = d.count > 0 ? d.count + ' 条评论' : '';
        if (d.comments.length === 0) {
          listEl.innerHTML = '<div class="zk-empty">还没有评论，来抢沙发吧 ✨</div>';
        } else {
          listEl.innerHTML = d.comments.map(renderComment).join('');
        }
        bindReply();
      })
      .catch(function () {
        listEl.innerHTML = '<div class="zk-empty">评论加载失败</div>';
      });
  }

  function bindReply() {
    listEl.querySelectorAll('.zk-reply-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        replyTo = parseInt(btn.dataset.id);
        replyNick = btn.dataset.nick;
        replyText.textContent = '回复 ' + replyNick;
        replyHint.style.display = 'flex';
        contentEl.focus();
        contentEl.placeholder = '回复 ' + replyNick + '...';
      });
    });
  }

  document.getElementById('zk-cancel-reply').addEventListener('click', function () {
    replyTo = 0; replyNick = '';
    replyHint.style.display = 'none';
    contentEl.placeholder = '说点什么...';
  });

  document.getElementById('zk-submit').addEventListener('click', function () {
    var nick = nickEl.value.trim();
    var email = emailEl.value.trim();
    var content = contentEl.value.trim();
    if (!nick || !content) return alert('昵称和内容不能为空');

    localStorage.setItem('zk_nick', nick);
    localStorage.setItem('zk_email', email);

    var btn = document.getElementById('zk-submit');
    btn.disabled = true; btn.textContent = '发送中...';

    fetch(API + '/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: page, nick: nick, email: email, content: content, reply_to: replyTo, reply_nick: replyNick })
    })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      btn.disabled = false; btn.textContent = '发送';
      if (!d.ok) return alert(d.msg);
      contentEl.value = '';
      replyTo = 0; replyNick = '';
      replyHint.style.display = 'none';
      contentEl.placeholder = '说点什么...';
      load();
    })
    .catch(function () {
      btn.disabled = false; btn.textContent = '发送';
      alert('发送失败，请重试');
    });
  });

  load();
})();
