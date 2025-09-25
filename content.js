// content.js
class SelectorGenerator {
    constructor() {
        // 忽略模式
        this.ignorePatterns = [
            /^\d/,                                   // 以数字开头的ID或class
            /-\d+$/,                                // 以数字结尾的
            /[0-9]{4}-[0-9]{2}-[0-9]{2}/,           // 日期格式
            /^(active|hover|focus|selected|disabled)$/ // 状态类
        ];

        // 动态ID模式
        this.dynamicIdPatterns = [
            /^\d/, // 以数字开头
            /[0-9]{4}-[0-9]{2}-[0-9]{2}/, // 包含日期
            /_[0-9]+$/, // 以下划线加数字结尾
            /-[0-9a-f]{8,}$/i // 类似GUID的格式
        ];
    }

    // 核心选择器生成方法
    generateSelector(element) {
        return this.generateRobustSelector(element);
    }

    // 设置消息监听器
    // 只保留核心选择器生成功能，移除所有状态管理
    generateSelector(element) {
        return this.generateRobustSelector(element);
    }

    // 开始选择器模式
    startPickingMode(settings) {
        if (settings) {
            this.updateSettings(settings);
        }

        this.isPickingMode = true;
        this.setupEventListeners();

        // 添加提示信息
        this.showNotification('选择器模式已启动，点击页面元素生成选择器');
    }

    stopPickingMode() {
        this.isPickingMode = false;
        this.removeEventListeners();

        // 移除所有高亮
        this.removeAllHighlights();
    }

    updateSettings(settings) {
        this.settings = { ...this.settings, ...settings };
    }

    setupEventListeners() {
        // 使用捕获阶段以确保在其他事件处理程序之前捕获事件
        document.addEventListener('click', this.handleClick.bind(this), true);

        // 添加右击事件监听，用于退出选择状态
        document.addEventListener('contextmenu', this.handleRightClick.bind(this), true);

        if (this.settings.showHighlight) {
            document.addEventListener('mouseover', this.handleHover.bind(this));
            document.addEventListener('mouseout', this.handleHoverOut.bind(this));
        }
    }

    removeEventListeners() {
        document.removeEventListener('click', this.handleClick.bind(this), true);
        document.removeEventListener('contextmenu', this.handleRightClick.bind(this), true);
        document.removeEventListener('mouseover', this.handleHover.bind(this));
        document.removeEventListener('mouseout', this.handleHoverOut.bind(this));
    }

    removeAllHighlights() {
        // 移除所有可能的高亮效果
        document.querySelectorAll('[data-original-outline]').forEach(el => {
            el.style.outline = el.dataset.originalOutline;
            delete el.dataset.originalOutline;
        });
    }

    handleRightClick(e) {
        if (!this.isPickingMode) return;

        // 阻止默认的右键菜单
        e.preventDefault();
        e.stopPropagation();

        // 退出选择模式
        this.stopPickingMode();

        // 通知popup选择已取消
        chrome.runtime.sendMessage({
            action: 'selectorCancelled'
        });

        // 显示取消通知
        if (this.settings.showNotification) {
            this.showNotification('选择模式已取消');
        }
    }

    handleClick(e) {
        if (!this.isPickingMode) return;

        // 阻止默认行为和事件冒泡
        e.preventDefault();
        e.stopPropagation();

        // 保存选中的元素
        this.lastSelectedElement = e.target;

        // 生成选择器
        const selector = this.generateRobustSelector(e.target);

        // 发送选择器到popup
        chrome.runtime.sendMessage({
            action: 'selectorGenerated',
            selector: selector
        });

        // 如果设置了自动复制，则复制到剪贴板
        if (this.settings.autoCopy) {
            this.copyToClipboard(selector);
        }

        // 如果设置了显示通知，则显示通知
        if (this.settings.showNotification) {
            this.showNotification(`${this.lastStrategyUsed}选择器已生成: ${selector}`);
        }
    }

    handleHover(e) {
        if (!this.isPickingMode) return;

        // 保存原始outline并添加高亮
        e.target.dataset.originalOutline = e.target.style.outline;
        e.target.style.outline = '2px solid #4285f4';
    }

    handleHoverOut(e) {
        if (!this.isPickingMode) return;

        if (e.target.dataset.originalOutline !== undefined) {
            e.target.style.outline = e.target.dataset.originalOutline;
            delete e.target.dataset.originalOutline;
        }
    }

    // 高级选择器生成方法
    generateRobustSelector(element) {
        if (!element || !element.tagName) return null;

        console.log('开始生成选择器，元素:', element.tagName, element);

        // 首先尝试处理特殊元素（如日期控件）
        const specialSelector = this.handleDynamicElements(element);
        if (specialSelector) {
            console.log('使用特殊元素处理策略:', specialSelector);
            this.lastStrategyUsed = '特殊元素处理';
            return specialSelector;
        }

        const strategies = [
            {
                name: '稳定ID选择器',
                func: () => this.tryStableIdSelector(element)
            },
            {
                name: '数据属性选择器',
                func: () => this.tryDataAttributesSelector(element)
            },
            {
                name: '混合选择器',
                func: () => this.tryHybridSelector(element)
            },
            {
                name: '类选择器',
                func: () => this.tryRobustClassSelector(element)
            },
            {
                name: '位置选择器',
                func: () => this.tryNthChildSelector(element)
            },
            {
                name: '路径选择器',
                func: () => this.tryFallbackSelector(element)
            }
        ];

        for (const strategy of strategies) {
            console.log(`尝试策略: ${strategy.name}`);
            const selector = strategy.func();
            console.log(`策略 ${strategy.name} 结果:`, selector);

            if (selector) {
                console.log(`策略 ${strategy.name} 生成选择器成功，使用该选择器`);
                this.lastStrategyUsed = strategy.name;

                // 显示当前使用的策略
                if (this.settings.showNotification) {
                    this.showNotification(`使用策略: ${strategy.name}`);
                }

                return selector;
            }
        }

        console.log('所有策略都失败，使用绝对路径选择器');
        this.lastStrategyUsed = '绝对路径选择器';
        return this.generateUniquePath(element);
    }

    // 处理日期控件和动态ID元素
    handleDynamicElements(element) {
        // 检测日期控件特征
        if (element.type === 'date' || element.getAttribute('type') === 'date') {
            return this.generateDatePickerSelector(element);
        }

        // 检测动态ID模式
        if (element.id && this.isDynamicId(element.id)) {
            return this.generateAlternativeSelector(element);
        }

        return null;
    }

    isDynamicId(id) {
        return this.dynamicIdPatterns.some(pattern => pattern.test(id));
    }

    generateDatePickerSelector(element) {
        // 日期控件的特定选择策略
        const strategies = [
            () => {
                // 通过name属性
                const name = element.getAttribute('name');
                if (name) {
                    const selector = `input[name="${CSS.escape(name)}"]`;
                    return this.isUnique(selector) ? selector : null;
                }
                return null;
            },
            () => {
                // 通过placeholder
                const placeholder = element.getAttribute('placeholder');
                if (placeholder && placeholder.includes('日期')) {
                    const selector = `input[placeholder*="日期"]`;
                    return this.isUnique(selector) ? selector : null;
                }
                return null;
            },
            () => {
                // 通过附近的label文本
                const label = this.findAssociatedLabel(element);
                if (label) {
                    const forAttr = label.getAttribute('for');
                    if (forAttr) {
                        const selector = `#${CSS.escape(forAttr)}`;
                        return this.isUnique(selector) ? selector : null;
                    }
                }
                return null;
            },
            () => {
                // 通过父元素和类型
                const parent = element.parentElement;
                if (parent) {
                    const parentClasses = Array.from(parent.classList || [])
                        .filter(cls => this.isStableClass(cls))
                        .slice(0, 1);

                    if (parentClasses.length > 0) {
                        const selector = `${parent.tagName.toLowerCase()}.${parentClasses[0]} input[type="date"]`;
                        return this.isUnique(selector) ? selector : null;
                    }
                }
                return null;
            }
        ];

        for (const strategy of strategies) {
            const selector = strategy();
            if (selector) return selector;
        }

        return null;
    }

    generateAlternativeSelector(element) {
        // 为动态ID元素生成替代选择器
        const tagName = element.tagName.toLowerCase();

        // 尝试使用name属性
        const name = element.getAttribute('name');
        if (name && this.isStableIdentifier(name)) {
            const selector = `${tagName}[name="${CSS.escape(name)}"]`;
            if (this.isUnique(selector)) return selector;
        }

        // 尝试使用周围的上下文
        const parent = element.parentElement;
        if (parent) {
            const parentIdentifier = this.getParentIdentifier(parent);
            if (parentIdentifier) {
                // 尝试使用父元素和元素在父元素中的位置，使用空格而不是 >
                const siblings = Array.from(parent.children);
                const index = siblings.indexOf(element) + 1;
                const selector = `${parentIdentifier} ${tagName}:nth-child(${index})`;
                if (this.isUnique(selector)) return selector;

                // 尝试使用父元素和元素类型，使用空格而不是 >
                const typeSelector = `${parentIdentifier} ${tagName}`;
                if (this.isUnique(typeSelector)) return typeSelector;
            }
        }

        // 尝试使用元素的其他属性
        const attributes = ['role', 'aria-label', 'title', 'alt'];
        for (const attr of attributes) {
            const value = element.getAttribute(attr);
            if (value && this.isStableIdentifier(value)) {
                const selector = `${tagName}[${attr}="${CSS.escape(value)}"]`;
                if (this.isUnique(selector)) return selector;
            }
        }

        return null;
    }

    findAssociatedLabel(element) {
        // 查找与元素关联的label
        if (!element.id) return null;

        // 通过for属性查找
        const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
        if (label) return label;

        // 查找包含元素的label
        let parent = element.parentElement;
        while (parent) {
            if (parent.tagName.toLowerCase() === 'label') {
                return parent;
            }
            parent = parent.parentElement;
        }

        // 查找附近的label（兄弟元素）
        const siblings = Array.from(element.parentElement?.children || []);
        for (const sibling of siblings) {
            if (sibling.tagName.toLowerCase() === 'label') {
                return sibling;
            }
        }

        return null;
    }

    tryStableIdSelector(element) {
        if (!element.id) return null;

        const id = element.id;
        // 检查ID是否稳定（不包含日期、随机数字等）
        if (this.isStableIdentifier(id)) {
            const selector = `#${CSS.escape(id)}`;
            return this.isUnique(selector) ? selector : null;
        }
        return null;
    }

    tryDataAttributesSelector(element) {
        // 优先使用稳定的data属性
        const dataAttrs = ['qimadatatestid', 'qimadisabledclass',
            'data-testid', 'data-cy', 'data-qa', 'data-id',
            'data-name', 'data-role', 'data-type', 'data-target'
        ];

        for (const attr of dataAttrs) {
            const value = element.getAttribute(attr);
            console.log(`检查属性 ${attr}: ${value}`);

            if (value) {
                const isStable = this.isStableIdentifier(value);
                console.log(`标识符稳定性: ${isStable}`);

                if (isStable) {
                    const tagName = element.tagName.toLowerCase();

                    // 尝试获取爷爷元素的有意义的class
                    const grandparentSelector = this.getGrandparentClassSelector(element);

                    let selector;
                    if (grandparentSelector) {
                        selector = `${grandparentSelector} ${tagName}[${attr}="${CSS.escape(value)}"]`;
                        console.log(`生成带爷爷class的选择器: ${selector}`);
                    } else {
                        selector = `${tagName}[${attr}="${CSS.escape(value)}"]`;
                        console.log(`生成基础选择器: ${selector}`);
                    }

                    return selector;
                }
            }
        }
        return null;
    }

    tryRobustClassSelector(element) {
        if (!element.classList.length) return null;

        // 获取有意义的class组合
        const meaningfulClasses = Array.from(element.classList)
            .filter(cls => this.isMeaningfulClass(cls))
            .slice(0, 3);

        if (meaningfulClasses.length === 0) return null;

        const tagName = element.tagName.toLowerCase();

        // 尝试不同数量的class组合
        for (let i = meaningfulClasses.length; i > 0; i--) {
            const classCombination = meaningfulClasses.slice(0, i);
            const selector = `${tagName}.${classCombination.join('.')}`;

            if (this.isUnique(selector)) {
                return selector;
            }
        }

        return null;
    }

    tryNthChildSelector(element) {
        // 使用:nth-child()来精确定位
        const parent = element.parentElement;
        if (!parent) return null;

        const siblings = Array.from(parent.children);
        const index = siblings.indexOf(element) + 1;

        if (index > 0) {
            const tagName = element.tagName.toLowerCase();
            const selector = `${tagName}:nth-child(${index})`;

            // 结合父元素选择器增加特异性，使用空格而不是 >
            const parentSelector = this.getParentIdentifier(parent);
            if (parentSelector) {
                const fullSelector = `${parentSelector} ${selector}`;
                if (this.isUnique(fullSelector)) return fullSelector;
            }

            if (this.isUnique(selector)) return selector;
        }

        return null;
    }

    tryHybridSelector(element) {
        // 混合策略：class + 属性
        const attributes = ['type', 'name', 'placeholder', 'role', 'aria-label'];
        const tagName = element.tagName.toLowerCase();

        // 获取有意义的class
        const meaningfulClasses = Array.from(element.classList)
            .filter(cls => this.isMeaningfulClass(cls))
            .slice(0, 2);

        for (const attr of attributes) {
            const value = element.getAttribute(attr);
            if (value && value.length > 2) {
                let baseSelector = tagName;

                if (meaningfulClasses.length > 0) {
                    baseSelector += '.' + meaningfulClasses.join('.');
                }

                const selector = `${baseSelector}[${attr}="${CSS.escape(value)}"]`;
                if (this.isUnique(selector)) return selector;
            }
        }

        return null;
    }

    tryFallbackSelector(element) {
        // 最终回退：使用相对稳定的路径
        const selector = this.generateStablePath(element);

        // 添加提示信息，表明这是保底选择器
        if (this.settings.showNotification) {
            this.showNotification('使用了保底路径选择器，可能不够稳定');
        }

        return selector;
    }

    generateStablePath(element, maxDepth = 5) {
        const path = [];
        let current = element;
        let depth = 0;

        while (current && depth < maxDepth) {
            const part = this.getElementIdentifier(current);
            path.unshift(part);

            // 使用空格而不是 > 作为选择器连接符
            const currentSelector = path.join(' ');
            if (this.isUnique(currentSelector) && path.length > 1) {
                return currentSelector;
            }

            current = current.parentElement;
            depth++;
        }

        // 使用空格而不是 > 作为选择器连接符
        return path.join(' ');
    }

    generateUniquePath(element) {
        // 生成一个绝对唯一的路径作为最后的回退
        const path = [];
        let current = element;

        for (let i = 0; i < 5 && current && current.tagName; i++) {
            const tagName = current.tagName.toLowerCase();
            const siblings = Array.from(current.parentElement?.children || [])
                .filter(node => node.tagName === current.tagName);

            if (siblings.length > 1) {
                const index = siblings.indexOf(current) + 1;
                path.unshift(`${tagName}:nth-child(${index})`);
            } else {
                path.unshift(tagName);
            }

            current = current.parentElement;
        }

        // 使用空格而不是 > 作为选择器连接符
        return path.join(' ');
    }

    getElementIdentifier(element) {
        const tagName = element.tagName.toLowerCase();

        // 优先使用稳定的class
        const stableClasses = Array.from(element.classList || [])
            .filter(cls => this.isStableClass(cls))
            .slice(0, 1);

        if (stableClasses.length > 0) {
            return `${tagName}.${stableClasses[0]}`;
        }

        // 其次使用稳定的属性
        const stableAttrs = ['name', 'type', 'role', 'aria-label'];
        for (const attr of stableAttrs) {
            const value = element.getAttribute(attr);
            if (value && this.isStableIdentifier(value)) {
                return `${tagName}[${attr}="${CSS.escape(value)}"]`;
            }
        }

        // 最后使用:nth-child()
        const parent = element.parentElement;
        if (parent) {
            const siblings = Array.from(parent.children)
                .filter(child => child.tagName === element.tagName);
            if (siblings.length > 1) {
                const index = siblings.indexOf(element) + 1;
                return `${tagName}:nth-child(${index})`;
            }
        }

        return tagName;
    }

    getParentIdentifier(parent) {
        // 为父元素生成简洁的标识符
        if (!parent) return null;

        const tagName = parent.tagName.toLowerCase();
        const stableClasses = Array.from(parent.classList || [])
            .filter(cls => this.isStableClass(cls))
            .slice(0, 1);

        if (stableClasses.length > 0) {
            return `${tagName}.${stableClasses[0]}`;
        }

        return tagName;
    }

    isStableIdentifier(identifier) {
        // 检查标识符是否稳定（不包含日期、随机数字等）
        if (!identifier || identifier.length < 2) return false;

        for (const pattern of this.ignorePatterns) {
            if (pattern.test(identifier)) return false;
        }

        // 检查是否包含大量数字
        const digitRatio = this.digitRatio(identifier);
        if (digitRatio > 0.3) return false;

        return true;
    }

    // 调试方法：检查标识符是否稳定
    debugStableIdentifier(identifier) {
        console.log('检查标识符:', identifier);
        console.log('长度检查:', identifier.length >= 2);

        for (const pattern of this.ignorePatterns) {
            const matches = pattern.test(identifier);
            console.log(`模式 ${pattern}: ${matches}`);
            if (matches) return false;
        }

        const digitRatio = this.digitRatio(identifier);
        console.log('数字比例:', digitRatio);
        console.log('数字比例检查:', digitRatio <= 0.3);

        return true;
    }

    isStableClass(className) {
        return className.length >= 3 &&
            !this.ignorePatterns.some(pattern => pattern.test(className)) &&
            !className.includes('--') && // 避免BEM修饰符
            this.digitRatio(className) < 0.2;
    }

    isMeaningfulClass(className) {
        return this.isStableClass(className) &&
            !className.startsWith('js-') && // 避免JavaScript钩子
            !className.match(/^[a-z]-/); // 避免单字母前缀
    }

    digitRatio(str) {
        const digits = (str.match(/\d/g) || []).length;
        return digits / Math.max(str.length, 1);
    }

    isUnique(selector) {
        try {
            const elements = document.querySelectorAll(selector);
            return elements.length === 1;
        } catch (e) {
            return false;
        }
    }

    getGrandparentClassSelector(element) {
        if (!element || !element.parentElement || !element.parentElement.parentElement) {
            return null;
        }

        const grandparent = element.parentElement.parentElement;
        console.log('爷爷元素:', grandparent.tagName, grandparent);

        // 获取爷爷元素的有意义的class
        const meaningfulClasses = Array.from(grandparent.classList || [])
            .filter(cls => this.isMeaningfulClass(cls))
            .slice(0, 1); // 只取第一个有意义的class

        if (meaningfulClasses.length > 0) {
            const grandparentTag = grandparent.tagName.toLowerCase();
            const selector = `${grandparentTag}.${meaningfulClasses[0]}`;
            console.log(`爷爷元素选择器: ${selector}`);
            return selector;
        }

        return null;
    }

    copyToClipboard(text) {
        // 使用Clipboard API
        navigator.clipboard.writeText(text).then(() => {
            // if (this.settings.showNotification) {
            //     this.showNotification('选择器已复制到剪贴板');
            // }
        }).catch(err => {
            console.error('无法复制到剪贴板:', err);
        });
    }

    showNotification(message) {
        if (!this.settings.showNotification) return;

        // 简单的右上角提示
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; 
            background-color: #4285f4; color: white;
            padding: 10px 20px; border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 9999; font-family: sans-serif;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        // 3秒后自动消失
        setTimeout(() => notification.remove(), 3000);
    }
}

// 初始化选择器生成器
const selectorGenerator = new SelectorGenerator();

// 监听来自background.js的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
        case 'startPicking':
            selectorGenerator.startPickingMode(message.settings);
            sendResponse({ success: true });
            break;

        case 'stopPicking':
            selectorGenerator.stopPickingMode();
            sendResponse({ success: true });
            break;

        case 'generateSmartSelector':
            if (message.element) {
                const selector = selectorGenerator.generateSelector(message.element);
                sendResponse({ selector: selector });
            } else {
                sendResponse({ error: 'No element provided' });
            }
            break;

        case 'updateSettings':
            selectorGenerator.updateSettings(message.settings);
            sendResponse({ success: true });
            break;
    }

    return true; // 保持消息通道开放
});

// 通知后台脚本内容脚本已加载
chrome.runtime.sendMessage({ action: 'contentScriptLoaded' });