# 智能CSS选择器生成器

一款智能的CSS选择器生成工具，帮助开发者快速获取元素的CSS选择器的浏览器扩展程序。

## 🚀 功能特性

- **智能选择器生成**: 自动分析页面元素，生成最稳定和精确的CSS选择器
- **多种选择器类型**: 支持ID、Class、XPath、Data属性等多种选择器类型
- **可视化选择**: 鼠标悬停高亮显示元素，点击选择目标元素
- **一键复制**: 自动复制生成的选择器到剪贴板
- **动态元素处理**: 智能处理日期控件等动态元素
- **稳定性优化**: 避免使用不稳定的动态ID和类名

## 📁 项目结构

```
ElementLocators/
├── icons/                    # 扩展程序图标文件
│   ├── icon16.png           # 16x16 图标
│   ├── icon32.png           # 32x32 图标
│   ├── icon48.png           # 48x48 图标
│   ├── icon128.png          # 128x128 图标
│   └── icon_template.html   # 图标模板文件
├── background.js            # 后台脚本
├── content.js               # 内容脚本 (主要逻辑)
├── popup.html               # 弹出窗口界面
├── popup.js                 # 弹出窗口脚本
├── manifest.json            # 扩展程序清单文件
└── README.md               # 项目说明文档
```

## 🔧 核心文件说明

### manifest.json
扩展程序的配置文件，定义了：
- 扩展程序基本信息（名称、版本、描述）
- 权限配置（activeTab、storage、scripting）
- 内容脚本和后台脚本配置
- 图标和弹出窗口配置

### content.js (24.6KB)
核心功能实现文件，包含：
- `SelectorGenerator` 类：主要的选择器生成逻辑
- 多种选择器生成策略：
  - 稳定ID选择器
  - 数据属性选择器
  - 混合选择器
  - 类选择器
  - 位置选择器
  - 路径选择器
- 动态元素处理逻辑
- 页面元素交互功能（点击、悬停等）

### popup.html & popup.js
用户界面文件：
- **popup.html (7.5KB)**: 扩展程序弹出窗口的界面设计
- **popup.js (11.3KB)**: 弹出窗口的交互逻辑和设置管理

### background.js (4.2KB)
后台服务脚本，处理扩展程序的后台任务和消息传递

## 🎯 使用方法

1. **安装扩展程序**
   - 在Chrome浏览器中打开扩展程序管理页面
   - 启用"开发者模式"
   - 点击"加载已解压的扩展程序"，选择项目文件夹

2. **使用选择器生成器**
   - 点击浏览器工具栏中的扩展程序图标
   - 在弹出窗口中点击"选择元素"按钮
   - 在页面上移动鼠标查看元素高亮
   - 点击目标元素生成选择器
   - 生成的选择器会自动复制到剪贴板

3. **选择器类型**
   - **智能选择**: 自动选择最稳定的选择器类型
   - **ID**: 基于元素ID生成选择器
   - **Class**: 基于元素类名生成选择器
   - **XPath**: 生成XPath选择器
   - **Data属性**: 基于data-*属性生成选择器

4. **设置选项**
   - **自动复制到剪贴板**: 生成选择器后自动复制
   - **显示元素高亮**: 鼠标悬停时高亮显示元素
   - **显示通知**: 显示操作状态通知

## ⚙️ 技术特性

### 智能选择器生成策略
1. **特殊元素处理**: 优先处理日期控件等动态元素
2. **稳定ID识别**: 过滤动态生成的ID，选择稳定的标识符
3. **数据属性优先**: 优先使用data-*属性作为选择器
4. **混合策略**: 结合多种属性生成复合选择器
5. **回退机制**: 当前面策略失败时，自动使用备用策略

### 动态元素处理
- 识别并过滤以数字开头的ID或class
- 过滤包含日期格式的动态标识符
- 避免使用临时状态类（active、hover等）
- 智能处理GUID格式的动态ID

## 🛠️ 开发环境

- **Manifest Version**: 3
- **支持浏览器**: Chrome, Edge (Chromium-based)
- **JavaScript ES6+**: 使用现代JavaScript语法
- **CSS3**: 现代CSS样式和布局

## 📝 版本信息

- **当前版本**: 1.0
- **开发语言**: JavaScript, HTML, CSS
- **框架依赖**: 无外部依赖，纯原生实现

## 🤝 贡献指南

1. Fork 本项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🔗 相关链接

- [Chrome扩展程序开发文档](https://developer.chrome.com/docs/extensions/)
- [CSS选择器参考](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_Selectors)
- [XPath语法参考](https://developer.mozilla.org/zh-CN/docs/Web/XPath)

---

**注意**: 本扩展程序需要访问所有网站的权限以便在任何页面上生成CSS选择器。所有数据处理均在本地进行，不会上传到任何服务器。