var oderList;

function syncStorageInitialize() {
    var default_storage_sync_data = {
        "brand_tag_container": {
            "預設標籤": ""
        },
        "series_tag_container": {
            "預設標籤": ""
        }
    };
    chrome.storage.sync.get(null, function (items) {
        if (Object.keys(items).length === 0) {
            chrome.storage.sync.set(default_storage_sync_data);
        }
    });
}

function enableIcon(tabId) {
    chrome.browserAction.setIcon({tabId: tabId, path: {'38': 'img/icon38-on.png'}}, function () {
        chrome.browserAction.setBadgeText({tabId: tabId, text: " "});
        chrome.browserAction.setBadgeBackgroundColor({tabId: tabId, color: "#00FF00"});
        chrome.browserAction.setPopup({tabId: tabId, popup: "popup.html"});
        chrome.browserAction.enable(tabId);
    });
}

function disableIcon(tabId) {
    chrome.browserAction.setIcon({tabId: tabId, path: {'38': 'img/icon38-off.png'}}, function () {
        chrome.browserAction.setBadgeText({tabId: tabId, text: " "});
        chrome.browserAction.setBadgeBackgroundColor({tabId: tabId, color: "#FF0000"});
        chrome.browserAction.setPopup({tabId: tabId, popup: ""});
        chrome.browserAction.disable(tabId);
    });
}

syncStorageInitialize();

chrome.browserAction.onClicked.addListener(function (tab) {

    if (tab.url.match(/http:\/\/mybid\.ruten\.com\.tw\/master\/my\.php\?l_type=sel_wait_confirm/)) {
        enableIcon(tab.id);
    } else {
        disableIcon(tab.id);
        window.alert('這不是露天拍賣待確認訂單頁面!!');
    }
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if(tab.status === "complete"){
        chrome.tabs.sendMessage(tabId, {flag: "tab_status_Complete"});
    }
    if (tab.url.match(/http:\/\/mybid\.ruten\.com\.tw\/master\/my\.php\?l_type=sel_wait_confirm/)) {
        enableIcon(tabId);
    } else {
        disableIcon(tabId);
    }
});

chrome.tabs.onActivated.addListener(function (activeInfo) {
    chrome.tabs.query({windowId: activeInfo.windowId, active: true}, function (tabs) {

        if (tabs[0].url.match(/http:\/\/mybid\.ruten\.com\.tw\/master\/my\.php\?l_type=sel_wait_confirm/)) {
            enableIcon(tabs[0].id);
        } else {
            disableIcon(tabs[0].id);
        }
    });
});

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    console.log(message.flag);
    if (message.flag === "capture_Finish") {
        oderList = message.data;
        chrome.tabs.create({url: "result.html"});
    } else if (message.flag === "result_page_Complete") {
        chrome.tabs.sendMessage(message.data, {flag: "result_Display", data: oderList});
    }
});






