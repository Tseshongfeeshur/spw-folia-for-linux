# GitHub Pages：只发布 `site/`

本仓库没有使用 branch 目录发布，也没有使用 Jekyll。页面由 GitHub Actions 直接上传为一个
Pages artifact；artifact 的根目录就是仓库里的 `site/`。

## 当前 workflow 做了什么

文件是 [`.github/workflows/pages.yml`](../.github/workflows/pages.yml)：

1. `actions/checkout@v4` 检出当前 `main` 提交。
2. `actions/configure-pages@v5` 准备 GitHub Pages 的部署上下文。
3. `actions/upload-pages-artifact@v3` 使用 `path: site` 打包目录。这个路径是关键：只有
   `site/` 下的 `index.html`、`style.css`、`main.js` 和资源进入 Pages artifact。
4. `actions/deploy-pages@v4` 把刚才的 artifact 发布到 Pages。仓库项目站点的地址是
   `https://tseshongfeeshur.github.io/spw-folia/`。

workflow 还设置了：

- `push` 只监听 `main` 分支，并且只有 `site/**` 或 workflow 自身变化时自动运行；
- `workflow_dispatch` 允许在 Actions 页面手动部署；
- `pages: write` 和 `id-token: write` 是部署所需权限；
- `concurrency` 保证新提交会取消尚未完成的旧部署。

## 仓库设置

第一次启用时，在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub
Actions**。不要选择 “Deploy from a branch”，否则会切换到另一套发布机制。workflow 的
`github-pages` environment 会显示部署 URL 和部署状态。

## 本地预览

网站是静态文件，不需要构建：

```sh
cd site
python3 -m http.server 8000
```

然后打开 `http://127.0.0.1:8000/`。直接双击 `index.html` 通常也能看到页面，但本地 HTTP 服务
更适合测试视频的 range 请求。

## 常见误解

- GitHub Pages 不会自动扫描并发布整个仓库；本 workflow 明确只上传 `site/`。
- 修改 `README.md`、`docs/` 或插件代码不会触发站点部署；需要修改 `site/`，或在 Actions 中
  手动运行 workflow。
- `site/` 的页面不应链接不存在的 Windows 版本下载。当前主页链接到 Releases 列表，具体发布
  文件和校验和以实际 Release 为准。
- `site/assets/` 中的旧视频和截图仍在仓库中，是历史素材，不代表 Linux 当前窗口、托盘或
  播放控制行为。

GitHub 官方的自定义 Pages workflow 说明见 GitHub Docs 的 [Using custom workflows with GitHub
Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。
