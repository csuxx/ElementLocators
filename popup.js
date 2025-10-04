// popup.js
document.addEventListener('DOMContentLoaded', function () {
    // 获取DOM元素
    const selectorText = document.getElementById('selectorText');
    const copyBtn = document.getElementById('copyBtn');
    const pickElementBtn = document.getElementById('pickElement');
    const statusEl = document.getElementById('status');
    const selectorTypes = document.querySelectorAll('.selector-type');

    // 获取设置选项
    const autoCopyCheckbox = document.getElementById('autoCopy');
    const showHighlightCheckbox = document.getElementById('showHighlight');
    const showNotificationCheckbox = document.getElementById('showNotification');
    
    // 从background获取当前选择器
    chrome.runtime.sendMessage({ action: 'getCurrentSelector' }, function(response) {
        if (response && response.selector) {
            updateSelector(response.selector);
        }
    });

    // 当前状态
    let currentSelector = '';
    let currentElement = null;
    let isPickingElement = false;
    let currentSelectorType = 'smart'; // 默认使用智能选择

    // 从background获取初始状态
    chrome.runtime.sendMessage({ action: 'getState' }, function (response) {
        isPickingElement = response.isPickingMode;
        updateUI();
    });

    // 监听状态变化
    chrome.runtime.onMessage.addListener(function (message) {
        if (message.action === 'selectorGenerated') {
            selectorText.value = message.selector;
            currentSelector = message.selector;

            if (autoCopyCheckbox.checked) {
                copySelector();
            }
        }
    });

    // 事件监听器
    copyBtn.addEventListener('click', copySelector);
    pickElementBtn.addEventListener('click', toggleElementPicker);

    // 选择器类型切换
    selectorTypes.forEach(type => {
        type.addEventListener('click', function () {
            // 移除所有active类
            selectorTypes.forEach(t => t.classList.remove('active'));
            // 添加active类到当前选中的类型
            this.classList.add('active');
            // 更新当前选择器类型
            currentSelectorType = this.dataset.type;
            // 如果有当前元素，重新生成选择器
            if (currentElement) {
                updateSelector(currentElement);
            }
        });
    });

    // 设置变更监听
    autoCopyCheckbox.addEventListener('change', saveSettings);
    showHighlightCheckbox.addEventListener('change', saveSettings);
    showNotificationCheckbox.addEventListener('change', saveSettings);

    // 与当前活动标签页通信
    function sendMessageToActiveTab(message) {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, message);
            }
        });
    }

    // 切换元素选择器
    function toggleElementPicker() {
        const newState = !isPickingElement;

        chrome.runtime.sendMessage({
            action: newState ? 'startPicking' : 'stopPicking',
            settings: {
                showHighlight: showHighlightCheckbox.checked,
                showNotification: showNotificationCheckbox.checked,
                autoCopy: autoCopyCheckbox.checked
            }
        }, function (response) {
            if (response && response.success) {
                isPickingElement = newState;
                updateUI();

                if (newState) {
                    // 成功进入选择状态，关闭popup
                    window.close();
                }
            } else {
                // 显示错误状态
                statusEl.textContent = '操作失败，请重试';
                statusEl.classList.add('error');
                setTimeout(() => {
                    statusEl.textContent = '';
                    statusEl.className = 'status';
                }, 2000);
            }
        });
    }

    function updateUI() {
        if (isPickingElement) {
            pickElementBtn.textContent = '取消选择';
            pickElementBtn.style.backgroundColor = '#ea4335';
            statusEl.textContent = '请在页面上点击要选择的元素';
            statusEl.classList.add('active');
        } else {
            pickElementBtn.textContent = '选择元素';
            pickElementBtn.style.backgroundColor = '#4285f4';
            statusEl.textContent = '点击"选择元素"按钮开始';
            statusEl.classList.remove('active');
        }
    }

    // 更新选择器
    function updateSelector(selector) {
        // 如果传入的是字符串，直接使用
        if (typeof selector === 'string') {
            selectorText.value = selector;
            currentSelector = selector;
            return;
        }
        
        // 如果传入的是元素，则根据选择器类型生成不同的选择器
        let selectorStr = '';
        const element = selector;

        switch (currentSelectorType) {
            case 'id':
                selectorStr = element.id ? `#${CSS.escape(element.id)}` : '无法生成ID选择器（元素没有ID）';
                break;
            case 'class':
                if (element.classList && element.classList.length > 0) {
                    selectorStr = element.tagName.toLowerCase() + '.' + Array.from(element.classList).join('.');
                } else {
                    selectorStr = '无法生成Class选择器（元素没有类名）';
                }
                break;
            case 'xpath':
                selectorStr = getXPath(element);
                break;
            case 'data':
                selectorStr = getDataAttributeSelector(element);
                break;
            case 'smart':
            default:
                // 使用智能选择器（由content.js中的SmartSelectorGenerator生成）
                sendMessageToActiveTab({
                    action: 'generateSmartSelector',
                    element: element
                });
                return; // 异步获取，不直接设置
        }

        // 更新UI
        selectorText.value = selectorStr;
        currentSelector = selectorStr;

        // 如果启用了自动复制，则复制到剪贴板
        if (autoCopyCheckbox.checked) {
            copySelector();
        }
    }

    // 获取XPath
    function getXPath(element) {
        if (!element) return '';

        // 如果元素有ID，直接使用ID
        if (element.id) {
            return `//*[@id="${element.id}"]`;
        }

        // 递归构建XPath
        let parts = [];
        while (element && element.nodeType === Node.ELEMENT_NODE) {
            let idx = 0;
            let siblings = element.parentNode ? element.parentNode.childNodes : [];

            for (let i = 0; i < siblings.length; i++) {
                let sibling = siblings[i];
                if (sibling === element) {
                    let position = idx + 1;
                    let tagName = element.tagName.toLowerCase();
                    parts.unshift(`${tagName}[${position}]`);
                    break;
                }

                if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === element.tagName) {
                    idx++;
                }
            }

            element = element.parentNode;
        }

        return '//' + parts.join('/');
    }

    // 获取数据属性选择器
    function getDataAttributeSelector(element) {
        if (!element) return '';

        const dataAttrs = ['data-testid', 'data-cy', 'data-qa', 'data-id'];
        for (const attr of dataAttrs) {
            if (element.hasAttribute(attr)) {
                return `[${attr}="${CSS.escape(element.getAttribute(attr))}"]`;
            }
        }

        // 如果没有数据属性，尝试其他自定义属性
        const allAttrs = element.attributes;
        for (let i = 0; i < allAttrs.length; i++) {
            const attr = allAttrs[i];
            if (attr.name.startsWith('data-')) {
                return `[${attr.name}="${CSS.escape(attr.value)}"]`;
            }
        }

        return '无法生成Data属性选择器（元素没有data-*属性）';
    }

    // 复制选择器到剪贴板
    function copySelector() {
        if (!currentSelector) return;

        navigator.clipboard.writeText(currentSelector).then(() => {
            // 显示复制成功提示
            copyBtn.textContent = '已复制';
            setTimeout(() => {
                copyBtn.textContent = '复制';
            }, 1500);
        }).catch(err => {
            console.error('无法复制到剪贴板:', err);
        });
    }

    // 保存设置到本地存储
    function saveSettings() {
        const settings = {
            autoCopy: autoCopyCheckbox.checked,
            showHighlight: showHighlightCheckbox.checked,
            showNotification: showNotificationCheckbox.checked,
            selectorType: currentSelectorType
        };

        chrome.storage.local.set({ settings: settings }, function () {
            // 发送设置更新到content script
            sendMessageToActiveTab({
                action: 'updateSettings',
                settings: settings
            });
        });
    }

    // 从本地存储加载设置
    function loadSettings() {
        chrome.storage.local.get('settings', function (data) {
            if (data.settings) {
                autoCopyCheckbox.checked = data.settings.autoCopy !== false;
                showHighlightCheckbox.checked = data.settings.showHighlight !== false;
                showNotificationCheckbox.checked = data.settings.showNotification !== false;

                // 设置当前选择器类型
                if (data.settings.selectorType) {
                    currentSelectorType = data.settings.selectorType;
                    selectorTypes.forEach(type => {
                        if (type.dataset.type === currentSelectorType) {
                            type.classList.add('active');
                        } else {
                            type.classList.remove('active');
                        }
                    });
                }
            }
        });
    }

    // 监听消息
    chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
        if (message.action === 'selectorGenerated') {
            // 更新选择器显示
            selectorText.value = message.selector;
            currentSelector = message.selector;

            // 退出选择状态
            isPickingElement = false;
            updateUI();

            // 如果启用了自动复制，则复制到剪贴板
            if (autoCopyCheckbox.checked) {
                copySelector();
            }

            // 显示成功状态
            statusEl.textContent = '选择器已生成';
            statusEl.classList.add('success');
            setTimeout(() => {
                statusEl.textContent = '';
                statusEl.className = 'status';
            }, 2000);
        }

        // 处理选择取消
        if (message.action === 'selectorCancelled') {
            // 退出选择状态
            isPickingElement = false;
            updateUI();

            // 显示取消状态
            statusEl.textContent = '选择已取消';
            statusEl.classList.add('error');
            setTimeout(() => {
                statusEl.textContent = '';
                statusEl.className = 'status';
            }, 2000);
        }

        // 处理选择状态变化
        if (message.action === 'pickingStateChanged') {
            isPickingElement = message.isPicking;
            updateUI();
        }
    });

    // 初始化加载设置
    loadSettings();
});