/**
 * Spirit Ink — 多模型提供商配置组件
 * 独立模块，可单独维护。主文件通过 <script src="providers.js"> 引入。
 *
 * 导出全局对象 window.SIProviders，包含：
 *   - PROVIDERS: 提供商列表
 *   - init(): 初始化UI
 *   - save(): 保存配置
 *   - test(): 测试连接
 *   - getApiKey(): 当前key
 *   - getModel(): 当前model
 *   - call(systemPrompt, messages): 发送请求（返回 {content, usage}）
 */

window.SIProviders = (() => {

  const PROVIDERS = [
    {
      id: 'zhipu',
      name: '智谱 GLM',
      apiBase: 'https://open.bigmodel.cn/api/coding/paas/v4',
      models: [
        { id: 'glm-4.5-air',  name: 'GLM-4.5-Air · 性价比' },
        { id: 'glm-4.6',      name: 'GLM-4.6 · 超强' },
        { id: 'glm-4.7',      name: 'GLM-4.7 · 高智能' },
        { id: 'glm-5-turbo',  name: 'GLM-5-Turbo · 长程' },
        { id: 'glm-5',        name: 'GLM-5 · 旗舰' },
        { id: 'glm-5.1',      name: 'GLM-5.1 · 最新' },
      ]
    },
    {
      id: 'custom',
      name: '自定义',
      apiBase: '',
      models: [],
      customApiBase: true
    }
  ];

  let _providerId = localStorage.getItem('si_provider') || 'zhipu';
  let _apiKey     = localStorage.getItem('si_k') || '';
  let _model      = localStorage.getItem('si_m') || 'glm-4.5-air';
  let _customUrl  = localStorage.getItem('si_apiBase') || '';

  function _get(id) { return PROVIDERS.find(p => p.id === (id || _providerId)) || PROVIDERS[0]; }

  function _onProviderChange() {
    const p = _get(document.getElementById('cProvider').value);
    const sel = document.getElementById('cModel');
    sel.innerHTML = '';
    if (p.models.length) {
      p.models.forEach(m => {
        const o = document.createElement('option');
        o.value = m.id; o.textContent = m.name; sel.appendChild(o);
      });
    } else {
      const o = document.createElement('option');
      o.value = _model; o.textContent = _model; sel.appendChild(o);
    }
    const show = p.customApiBase;
    document.getElementById('cApiBaseRow').style.display = show ? 'block' : 'none';
    if (show) document.getElementById('cApiBase').value = _customUrl;
  }

  function _cfgMsg(t, ok) {
    const e = document.getElementById('cMsg');
    e.textContent = t;
    e.className = 'cmsg show ' + (ok ? 'ok' : 'err');
    setTimeout(() => e.classList.remove('show'), 4000);
  }

  function _buildHeaders(key) {
    return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key };
  }

  function init() {
    const sel = document.getElementById('cProvider');
    PROVIDERS.forEach(p => {
      const o = document.createElement('option');
      o.value = p.id; o.textContent = p.name; sel.appendChild(o);
    });
    sel.value = _providerId;
    sel.onchange = _onProviderChange;
    _onProviderChange();
    document.getElementById('cKey').value = _apiKey;
    if (_apiKey) document.getElementById('bRight').classList.add('on');
  }

  function save(getParticleCount) {
    _providerId = document.getElementById('cProvider').value;
    _apiKey     = document.getElementById('cKey').value.trim();
    _model      = document.getElementById('cModel').value;
    _customUrl  = document.getElementById('cApiBase').value.trim();
    const N     = getParticleCount ? getParticleCount() : 100;

    localStorage.setItem('si_provider', _providerId);
    localStorage.setItem('si_k', _apiKey);
    localStorage.setItem('si_m', _model);
    localStorage.setItem('si_apiBase', _customUrl);

    _cfgMsg('✓ 已保存 (' + _get().name + ' / ' + _model + ' / 粒子:' + N + ')', true);
    if (_apiKey) document.getElementById('bRight').classList.add('on');
    return { providerId: _providerId, apiKey: _apiKey, model: _model, N };
  }

  async function test() {
    const k = document.getElementById('cKey').value.trim();
    if (!k) { _cfgMsg('✗ 请输入Key', false); return; }
    _cfgMsg('测试中...', true);
    const p = _get();
    const mid = document.getElementById('cModel').value;
    const baseUrl = p.customApiBase ? document.getElementById('cApiBase').value.trim() : p.apiBase;
    const url = baseUrl.replace(/\/+$/, '') + '/chat/completions';
    if (!url) { _cfgMsg('✗ 请填写API地址', false); return; }
    try {
      const body = JSON.stringify({ model: mid, messages: [{ role: 'user', content: 'hi' }], max_tokens: 20 });
      const r = await fetch(url, { method: 'POST', headers: _buildHeaders(k), body });
      _cfgMsg(r.ok ? '✓ 连接成功' : '✗ ' + JSON.stringify(await r.json()).slice(0, 100), r.ok);
    } catch (e) { _cfgMsg('✗ ' + e.message, false); }
  }

  function getApiKey() { return _apiKey; }
  function getModel() { return _model; }
  function getProvider() { return _get(); }

  async function call(systemPrompt, messages, opts = {}) {
    const { maxTokens = 4096, temperature = 0.85 } = opts;
    const p = _get();
    const baseUrl = p.customApiBase ? _customUrl : p.apiBase;
    const url = baseUrl.replace(/\/+$/, '') + '/chat/completions';

    const body = JSON.stringify({
      model: _model,
      max_tokens: maxTokens,
      temperature,
      messages: [{ role: 'system', content: systemPrompt }, ...messages]
    });

    let r = await fetch(url, { method: 'POST', headers: _buildHeaders(_apiKey), body });
    if (r.status === 429) {
      await new Promise(res => setTimeout(res, 5000));
      r = await fetch(url, { method: 'POST', headers: _buildHeaders(_apiKey), body });
    }
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error('HTTP ' + r.status + ' · ' + JSON.stringify(err).slice(0, 150));
    }

    const data = await r.json();
    const content = data.choices?.[0]?.message?.content || '';
    const u = data.usage || {};
    return {
      content,
      raw: data,
      usage: {
        input: u.prompt_tokens || u.input_tokens || 0,
        output: u.completion_tokens || u.output_tokens || 0,
        total: u.total_tokens || 0
      }
    };
  }

  return { PROVIDERS, init, save, test, getApiKey, getModel, getProvider, call };
})();
