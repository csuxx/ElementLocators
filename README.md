# 智能CSS选择器生成器

## 项目简介

智能CSS选择器生成器是一个Chrome浏览器扩展程序，帮助开发者快速生成稳定、准确的CSS选择器。该工具通过智能算法分析DOM元素的特征，自动选择最优的选择器生成策略，为自动化测试、爬虫开发、页面操作等场景提供可靠的元素定位方案。

## 核心功能

- 🎯 **智能元素选择**：点击页面元素自动生成最优CSS选择器
- 🔍 **多策略生成**：支持ID、Class、XPath、Data属性等多种选择器类型
- 📋 **一键复制**：生成的选择器可一键复制到剪贴板
- ✨ **高亮显示**：悬停元素时提供视觉反馈
- ⚙️ **自定义配置**：支持自动复制、高亮显示、通知提醒等个性化设置
- 🛡️ **稳定性保障**：优先使用稳定的属性，避免动态ID和临时类名

## 技术架构

### 文件结构
```
ElementLocators/
├── manifest.json          # 扩展程序清单文件
├── background.js          # 后台脚本，处理消息转发和状态管理
├── content.js             # 内容脚本，核心选择器生成逻辑
├── popup.html             # 弹窗界面
├── popup.js               # 弹窗脚本，处理用户交互
└── icons/                 # 图标文件夹
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

### 核心组件

1. **SelectorGenerator类**：核心选择器生成引擎
2. **消息系统**：Background、Content、Popup三层消息通信
3. **设置管理**：本地存储用户偏好配置
4. **事件处理**：页面交互和元素选择事件管理

## 选择器优先级逻辑详解

### 优先级策略概述

根据项目记忆知识，选择器生成遵循以下核心原则：
- **测试专用属性优先**：qimadatatestid等测试专用属性具有最高优先级
- **稳定性优先**：避免使用动态ID、临时类名等不稳定标识符
- **唯一性验证**：每个生成的选择器都必须通过唯一性检测
- **回退机制**：提供多层级回退策略确保总能生成可用选择器

### 详细优先级排序

#### 1. 特殊元素处理策略（最高优先级）
```javascript
// 处理动态元素和特殊控件
handleDynamicElements(element)
```
- **日期控件**：优先使用name属性、placeholder、关联label
- **动态ID元素**：使用name属性、父元素上下文、其他稳定属性

#### 2. 稳定ID选择器
```javascript
tryStableIdSelector(element)
```
- **条件**：元素具有ID属性且ID稳定（不包含日期、随机数字）
- **生成格式**：`#elementId`
- **稳定性检查**：
  - 不以数字开头
  - 不包含日期格式（如2024-01-01）
  - 数字占比不超过30%
  - 不匹配动态ID模式

#### 3. 数据属性选择器（测试专用属性优先）
```javascript
tryDataAttributesSelector(element)
```
- **优先级排序**：
  1. `qimadatatestid`（最高优先级）
  2. `qimadisabledclass`
  3. `data-testid`
  4. `data-cy`（Cypress测试）
  5. `data-qa`（QA测试）
  6. `data-id`
  7. `data-name`
  8. `data-role`
  9. `data-type`
  10. `data-target`

- **生成策略**：
  - 基础选择器：`tagname[attribute="value"]`
  - 增强选择器：`grandparent tagname[attribute="value"]`（包含祖父元素类名）

#### 4. 混合选择器策略
```javascript
tryHybridSelector(element)
```
- **组合方式**：类名 + 属性
- **属性优先级**：`type` > `name` > `placeholder` > `role` > `aria-label`
- **生成格式**：`tagname.class1.class2[attribute="value"]`

#### 5. 类选择器策略
```javascript
tryRobustClassSelector(element)
```
- **类名筛选标准**：
  - 长度≥3个字符
  - 数字占比<20%
  - 不包含状态类（active、hover、focus等）
  - 不是BEM修饰符（不包含--）
  
- **有意义类名优先级**：
  - 业务相关类：`submenu`、`menu-item`、`item-content`等
  - 结构相关类：`container`、`wrapper`、`content`等
  - Angular特殊类：`ng-star-inserted`、`ng-tns-`等

#### 6. 位置选择器策略
```javascript
tryNthChildSelector(element)
```
- **生成方式**：结合父元素标识符 + `:nth-child(n)`
- **格式**：`parent-selector tagname:nth-child(index)`
- **使用场景**：当其他策略无法产生唯一选择器时

#### 7. 回退选择器策略（保底策略）
```javascript
tryFallbackSelector(element)
```
实现三层回退机制：

**第一层：文本选择器**
- 适用于span等文本元素
- 使用文本内容作为定位特征
- 结合父元素上下文确保唯一性

**第二层：精确类路径**
```javascript
generatePreciseClassPath(element)
```
- 构建多层级的类选择器路径
- 每层最多使用3个有意义的类名
- 自底向上构建，确保路径最短且唯一

**第三层：稳定路径**
```javascript
generateStablePath(element)
```
- 最多遍历5层父元素
- 优先使用稳定的标识符
- 必要时添加位置信息

### 选择器验证机制

#### 唯一性检测
```javascript
isUnique(selector) {
    try {
        const elements = document.querySelectorAll(selector);
        return elements.length === 1;
    } catch (e) {
        return false;
    }
}
```

#### 稳定性检测
```javascript
isStableIdentifier(identifier) {
    // 检查项：
    // 1. 最小长度要求（≥2字符）
    // 2. 忽略模式匹配（数字开头、日期格式等）
    // 3. 数字占比限制（≤30%）
    return !ignorePatterns.some(pattern => pattern.test(identifier)) &&
           digitRatio(identifier) <= 0.3;
}
```

### 选择器匹配数量反馈

当生成的选择器匹配多个元素时，系统会：
- 在通知中明确提示匹配的元素数量
- 格式：`"策略名选择器已生成(匹配N个元素): 具体选择器"`
- 帮助用户判断选择器的精确性

## 使用方法

### 基本操作

1. **启动选择模式**：
   - 点击扩展图标打开弹窗
   - 点击"选择元素"按钮
   - 弹窗自动关闭，进入选择模式

2. **选择元素**：
   - 在页面上点击目标元素
   - 系统自动生成最优选择器
   - 显示生成策略和匹配数量

3. **复制选择器**：
   - 选择器自动复制到剪贴板（如开启自动复制）
   - 或手动点击"复制"按钮

4. **退出选择模式**：
   - 右键点击页面任意位置
   - 或重新打开弹窗点击"取消选择"

### 高级配置

#### 设置选项
- **自动复制**：生成选择器后自动复制到剪贴板
- **显示高亮**：悬停元素时显示蓝色边框高亮
- **显示通知**：显示操作状态和结果通知

#### 选择器类型
- **智能模式**（推荐）：使用多策略算法自动选择最优方案
- **ID选择器**：强制使用元素ID
- **Class选择器**：使用元素的所有类名
- **XPath**：生成XPath表达式
- **Data属性**：优先使用data-*属性

## 最佳实践建议

### 开发者建议
1. **为测试元素添加专用属性**：
   ```html
   <button qimadatatestid="submit-btn">提交</button>
   <input data-testid="username-input" />
   ```

2. **使用有意义的类名**：
   ```html
   <div class="user-profile-container">
   <div class="navigation-menu-item">
   ```

3. **避免使用动态ID**：
   ```html
   <!-- 不推荐 -->
   <div id="element-1234567890">
   
   <!-- 推荐 -->
   <div id="user-profile" data-testid="user-profile">
   ```

### 测试自动化集成
- 生成的选择器可直接用于Selenium、Playwright、Cypress等测试框架
- 优先使用智能模式生成的选择器，稳定性更好
- 对于动态内容，建议添加稳定的data属性

## 常见问题解决

### 选择器不唯一
- **现象**：通知显示"匹配N个元素"
- **解决**：
  1. 为元素添加唯一的data-testid属性
  2. 使用更具体的父元素上下文
  3. 结合元素位置信息

### 选择器不稳定
- **现象**：页面刷新后选择器失效
- **原因**：依赖了动态生成的ID或类名
- **解决**：
  1. 使用data属性选择器
  2. 避免包含数字的动态类名
  3. 使用结构化的类名体系

### 选择器过长
- **现象**：生成的选择器路径很长
- **原因**：页面缺乏稳定的标识符
- **优化**：
  1. 在关键元素上添加有意义的类名
  2. 使用语义化的HTML结构
  3. 添加测试专用属性

## 更新日志

### v1.0 (当前版本)
- ✅ 实现多策略选择器生成算法
- ✅ 支持测试专用属性优先策略
- ✅ 完善的回退机制
- ✅ 选择器匹配数量反馈
- ✅ 自定义配置支持
- ✅ 直观的用户界面

## 技术支持

- **问题反馈**：请通过GitHub Issues提交
- **功能建议**：欢迎提交Feature Request
- **文档改进**：欢迎提交文档优化建议

---

**注意**：本工具生成的选择器质量很大程度上取决于页面HTML结构的质量。建议开发者遵循语义化HTML和良好的CSS类名实践，以获得最佳的选择器生成效果。