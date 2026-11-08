/* 微信聊天记录抓取面板（信息渡口内）
 * 流程：列会话 → 选中 → 选天数 → 读取（本机服务调用抓取组件）→ 预览 → 导入为「资料来源」
 * 只在用户点击时读微信；不自动、不后台。
 */
(function () {
  'use strict';
  if (window.XWChatCapture) return;

  var KEY = 'xiaowang-m11-pair';
  var state = { account: '', kind: 'group', items: [], loaded: false, loading: false, busy: false, selected: null, days: 30, result: null, filter: '', error: '' };
  var root = null;

  function token() { try { return sessionStorage.getItem(KEY) || ''; } catch (e) { return ''; } }

  async function req(path, opts) {
    opts = opts || {};
    var t = token();
    if (!t) throw new Error('未配对：请从桌面悬浮球打开小王');
    var r = await fetch(path, {
      method: opts.method || 'GET',
      headers: Object.assign({ Authorization: 'Bearer ' + t }, opts.body ? { 'Content-Type': 'application/json' } : {}),
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      credentials: 'omit'
    });
    var data = null;
    try { data = await r.json(); } catch (e) { data = null; }
    if (!r.ok) {
      var code = (data && data.error) || String(r.status);
      if (code === 'capture_timeout_retry') throw new Error('读取超时，请缩小范围（天数）后重试');
      if (code === 'capture_unavailable') throw new Error('抓取组件不可用，请检查安装目录下的「抓取」文件夹');
      throw new Error(code === 'invalid_input' ? '请求参数不合法' : code);
    }
    return data;
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }

  function panelHTML() {
    var items = state.items.filter(function (x) { return !state.filter || x.name.indexOf(state.filter) >= 0; });
    var rows = items.slice(0, 200).map(function (x, i) {
      var sel = state.selected && state.selected.name === x.name;
      return '<tr data-xwcc-pick="' + esc(x.name) + '" style="cursor:pointer;' + (sel ? 'background:rgba(99,188,255,.16);' : '') + '">' +
        '<td style="padding:4px 6px">' + esc(x.name) + '</td>' +
        '<td style="padding:4px 6px;text-align:right;opacity:.75">' + x.count + '</td>' +
        '<td style="padding:4px 6px;opacity:.6;font-size:12px">' + esc(x.last_at || '') + '</td></tr>';
    }).join('');

    var res = state.result;
    var resultHTML = '';
    if (res) {
      var preview = (res.messages || []).slice(0, 6).map(function (m) {
        return '<div style="opacity:.85">[' + esc(m.at) + '] ' + esc(m.speaker) + '：' + esc((m.text || '').slice(0, 120)) + '</div>';
      }).join('');
      resultHTML = '<div style="margin-top:10px;border-top:1px solid rgba(255,255,255,.12);padding-top:8px">' +
        '<div class="bw-hint">已读取：<b>' + esc(state.selected ? state.selected.name : '') + '</b>，' + res.count + ' 条消息 / ' + (res.speakers || []).length + ' 个发言人' +
        (res.file ? ' · ' + esc(res.file) : '') + '</div>' + preview +
        '<div class="bw-actions" style="margin-top:8px"><button class="aud-mini" data-xwcc-import="1">导入到信息渡口</button>' +
        '<button class="aud-mini" data-xwcc-clear="1">放弃</button></div></div>';
    }

    return '<section class="bw-card" id="xw-chat-panel"><div class="bw-card-head"><div><strong>微信聊天记录</strong>' +
      '<p class="bw-hint">先列出会话，选中一个再读取；只读取你点选的那个聊天，不会自动抓。</p>' + (state.account ? '<p class="bw-hint">当前在线微信：<b>' + esc(state.account) + '</b>（共 ' + state.items.length + ' 个会话）</p>' : '') +
      (state.error ? '<p class="bw-hint" style="color:#ff9a9a">' + esc(state.error) + '</p>' : '') +
      '</div><div class="bw-actions">' +
      '<button class="aud-mini" data-xwcc-kind="group" ' + (state.kind === 'group' ? 'style="outline:2px solid #63bcff"' : '') + '>群聊</button>' +
      '<button class="aud-mini" data-xwcc-kind="person" ' + (state.kind === 'person' ? 'style="outline:2px solid #63bcff"' : '') + '>私聊</button>' +
      '<button class="aud-mini" data-xwcc-reload="1">' + (state.loading ? '读取中…' : '刷新列表') + '</button>' +
      '</div></div>' +
      '<div class="bw-actions" style="margin:6px 0"><input data-xwcc-filter="1" placeholder="搜索名字" value="' + esc(state.filter) + '" style="flex:1;min-width:140px;padding:4px 8px;background:transparent;border:1px solid rgba(255,255,255,.2);color:inherit;border-radius:4px">' +
      '<span class="bw-hint">时间范围</span><select data-xwcc-days="1" style="padding:4px 6px;background:transparent;color:inherit;border:1px solid rgba(255,255,255,.2);border-radius:4px">' +
      [1, 3, 7, 30].map(function (d) { return '<option value="' + d + '"' + (state.days === d ? ' selected' : '') + '>最近' + d + '天</option>'; }).join('') +
      '</select><button class="aud-mini" data-xwcc-fetch="1" ' + (state.selected && !state.busy ? '' : 'disabled') + '>' + (state.busy ? '读取中…' : '读取选中会话') + '</button></div>' +
      (state.loaded ? (rows ? '<div style="max-height:320px;overflow:auto;border:1px solid rgba(255,255,255,.12);border-radius:6px"><table style="width:100%;font-size:13px"><thead><tr style="opacity:.6"><th style="text-align:left;padding:2px 6px">名称</th><th style="text-align:right;padding:2px 6px">消息</th><th style="text-align:left;padding:2px 6px">最近</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '<p class="bw-hint">没有匹配的会话。</p>') : '<p class="bw-hint">点「刷新列表」读取微信会话清单（需要微信已登录）。</p>') +
      resultHTML + '</section>';
  }

  function paint() {
    if (!root) return;
    var host = document.getElementById('xw-chat-panel');
    if (host) { host.outerHTML = panelHTML(); } else { var anchor = document.getElementById('delivery-panel'); if (anchor) { anchor.insertAdjacentHTML('afterend', panelHTML()); } else { root.insertAdjacentHTML('beforeend', panelHTML()); } }
  }

  async function loadList(kind) {
    state.kind = kind; state.loading = true; state.error = ''; state.selected = null; state.result = null; paint();
    try {
      var data = await req('/api/chat/list?kind=' + encodeURIComponent(kind));
      state.items = data.items || [];
      state.account = data.account || '';
      if (!data.ok) state.error = '读取清单失败：' + ((data.hint || '').split('\n').pop() || '未知原因');
    } catch (e) { state.error = e.message; state.items = []; }
    state.loading = false; state.loaded = true; paint();
  }

  async function readSelected() {
    if (!state.selected) return;
    state.busy = true; state.error = ''; state.result = null; paint();
    try {
      var data = await req('/api/chat/fetch', { method: 'POST', body: { kind: state.kind, name: state.selected.name, days: state.days, confirm: true } });
      if (!data.ok) { state.error = '读取失败：' + ((data.hint || '').split('\n').filter(Boolean).pop() || ('代码 ' + data.code)); }
      else { state.result = data; }
    } catch (e) { state.error = e.message; }
    state.busy = false; paint();
  }

  async function doImport() {
    var res = state.result;
    if (!res) return;
    var name = (state.kind === 'person' ? '微信私聊 · ' : '微信群聊 · ') + (state.selected ? state.selected.name : '');
    var text = res.text || '';
    if (!text) text = (res.messages || []).map(function (m) { return '[' + m.at + '] ' + m.speaker + '：' + m.text; }).join('\n');
    try {
      await window.__xw.m1.ingest({ name: name, text: text, kind: 'text', origin: 'wechat-chat', originRef: (res.file || name) });
      state.result = null; state.error = '';
      state.selected = null;
      paint();
    } catch (e) { state.error = '导入失败：' + e.message; paint(); }
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-xwcc-pick],[data-xwcc-kind],[data-xwcc-reload],[data-xwcc-fetch],[data-xwcc-import],[data-xwcc-clear]');
    if (!t) return;
    e.preventDefault();
    if (t.hasAttribute('data-xwcc-pick')) { state.selected = state.items.filter(function (x) { return x.name === t.getAttribute('data-xwcc-pick'); })[0] || null; state.result = null; paint(); }
    else if (t.hasAttribute('data-xwcc-kind')) { loadList(t.getAttribute('data-xwcc-kind')); }
    else if (t.hasAttribute('data-xwcc-reload')) { loadList(state.kind); }
    else if (t.hasAttribute('data-xwcc-fetch')) { readSelected(); }
    else if (t.hasAttribute('data-xwcc-import')) { doImport(); }
    else if (t.hasAttribute('data-xwcc-clear')) { state.result = null; paint(); }
  }, true);

  document.addEventListener('input', function (e) {
    if (e.target && e.target.hasAttribute && e.target.hasAttribute('data-xwcc-filter')) {
      state.filter = e.target.value; paint();
      var box = document.querySelector('[data-xwcc-filter]');
      if (box) { box.focus(); box.setSelectionRange(box.value.length, box.value.length); }
    }
  }, true);

  document.addEventListener('change', function (e) {
    if (e.target && e.target.hasAttribute && e.target.hasAttribute('data-xwcc-days')) {
      state.days = parseInt(e.target.value, 10) || 7; paint();
    }
  }, true);

  function mount() {
    var app = document.getElementById('app');
    if (!app) { setTimeout(mount, 500); return; }
    var obs = new MutationObserver(function () {
      try {
        if (window.__xw && window.__xw.view && window.__xw.view() === 'intake') {
          if (!document.getElementById('xw-chat-panel')) { root = document.getElementById('app'); paint(); }
        }
      } catch (e) { }
    });
    obs.observe(app, { childList: true, subtree: false });
  }

  window.XWChatCapture = { state: state, loadList: loadList, readSelected: readSelected, mount: mount };
  mount();
})();
