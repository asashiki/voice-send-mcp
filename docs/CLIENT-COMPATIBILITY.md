# 客户端兼容性（2026-09-19）

重复通知保留同一音频和播放位置；切换数据/关闭组件停止旧音频；捕获播放失败。媒体按文件扩展名返回真实 MIME，支持跨域和 Range。无组件的客户端使用文字及音频链接。

原有视觉样式保留。组件使用标准 MCP Apps 初始化、结果通知、高度报告和 teardown，同时接收 ChatGPT legacy globals。标准结果优先，主题更新不重建内容。移除旧部署域名被硬编码为 widgetDomain 的要求；CSP 仍按媒体来源配置。

## 验证边界

本轮 8 项回归通过，类型检查和生产构建通过。测试运行实际 widget bundle 的通知和生命周期，并通过无 UI 能力的 MCP SDK 客户端检查资源/工具；这不等于浏览器解码、实际账号或生产域名验证。

- ChatGPT / Claude：部署后刷新工具和 UI 资源，新对话检查点击、加载、连续调用与浅深主题。
- 普通 MCP chat：保留文本、标准图片或链接结果；交互组件取决于客户端是否支持 MCP Apps。
- Grok：xAI Remote MCP API 文档不能证明 grok.com 对话界面支持相同 HTML 组件，本轮没有此宿主的实测证据。

媒体还必须从浏览器直接可达：内网 MCP 连接成功不能证明公网图片/音频成功。检查实际媒体 URL 的 HTTP 状态、Content-Type、CORS/CSP；不能把 JSON/HTML 错误页当成功。

协议依据：[MCP Apps](https://modelcontextprotocol.io/extensions/apps/overview)、[xAI Remote MCP](https://docs.x.ai/developers/tools/remote-mcp)。

运行 `npm ci && npm run typecheck && npm test`。部署分支：`fix/cross-host-rendering`；本轮不涉及 VPS 操作或密钥变更。
