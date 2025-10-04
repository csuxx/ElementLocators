// background.js
// 存储插件的全局状态
let state = {
    isPickingMode: false,
    activeTabId: null,
    settings: {
        autoCopy: true,
        showHighlight: true,
        showNotification: true,
        selectorType: 'smart'
    },
    selectorGenerator: null,
    currentSelector: '' // 添加当前选择器存储
};

// 初始化选择器生成器
function initSelectorGenerator() {
    state.selectorGenerator = new SelectorGenerator();
}

// 监听来自content script和popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 如果消息来自content script，记录发送消息的标签页ID
    if (sender.tab) {
        state.activeTabId = sender.tab.id;
    }

    switch (message.action) {
        case 'contentScriptLoaded':
            initSelectorGenerator();
            sendResponse({ status: 'ready' });
            break;

        case 'startPicking':
            state.isPickingMode = true;
            state.settings = { ...state.settings, ...message.settings };
            chrome.tabs.sendMessage(state.activeTabId, {
                action: 'startPicking',
                settings: state.settings
            }).then(() => {
                sendResponse({ success: true, status: 'started' });
            }).catch((error) => {
                console.error('Failed to send message to content script:', error);
                sendResponse({ success: false, error: 'Failed to start picking mode' });
            });
            break;

        case 'stopPicking':
            state.isPickingMode = false;
            chrome.tabs.sendMessage(state.activeTabId, {
                action: 'stopPicking'
            }).then(() => {
                sendResponse({ success: true, status: 'stopped' });
            }).catch((error) => {
                console.error('Failed to send message to content script:', error);
                sendResponse({ success: false, error: 'Failed to stop picking mode' });
            });
            break;

        case 'generateSelector':
            if (state.selectorGenerator && message.element) {
                const selector = state.selectorGenerator.generateSelector(message.element);
                sendResponse({ selector: selector });
            } else {
                sendResponse({ error: 'Generator not ready' });
            }
            break;

        case 'selectorGenerated':
            // 保存当前选择器并转发给popup
            state.currentSelector = message.selector;
            chrome.runtime.sendMessage({
                action: 'selectorGenerated',
                selector: message.selector
            });
            break;

        case 'saveCurrentSelector':
            // 保存当前选择器
            state.currentSelector = message.selector;
            break;

        case 'getCurrentSelector':
            // 返回当前选择器
            sendResponse({ selector: state.currentSelector });
            break;

        case 'selectorCancelled':
            // 转发给popup
            chrome.runtime.sendMessage({
                action: 'selectorCancelled'
            });
            break;

        case 'getState':
            sendResponse(state);
            break;
    }

    return true; // 保持消息通道开放
});

// 监听标签页更新事件，当标签页刷新时重新注入content script
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url.startsWith('http')) {
        // 如果标签页完成加载，并且是http或https页面，则发送初始化消息
        chrome.tabs.sendMessage(tabId, {
            action: 'init',
            settings: state.settings,
            isPickingMode: state.isPickingMode
        }).catch(() => {
            // 如果发送消息失败，可能是content script尚未加载，这是正常的
            console.log('Content script not ready yet');
        });
    }
});

// 监听标签页激活事件，更新当前活动标签页
chrome.tabs.onActivated.addListener((activeInfo) => {
    state.activeTabId = activeInfo.tabId;
});

// 监听插件安装或更新事件
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // 首次安装插件
        // 可以在这里设置默认配置或显示欢迎页面
        chrome.storage.local.set({
            settings: state.settings
        });
    } else if (details.reason === 'update') {
        // 插件更新
        // 可以在这里处理配置迁移或显示更新日志
    }
});