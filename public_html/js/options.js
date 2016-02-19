chrome.storage.onChanged.addListener(showSyncStorageInUse);

var readyStateCheckInterval = setInterval(function () {
    if (document.readyState === "complete") {
        clearInterval(readyStateCheckInterval);
        init();
    }
}, 10);

function init() {
    $("nav>a").click(navigationProcess);
    document.getElementById("clear_sync_storage").onclick = clearSyncStorage;
    document.getElementById("sync_export_data").onclick = exportSyncStorageData;
    document.getElementById("sync_import_data").onclick = importDataToSyncStorage;
    $(".add-keyword").click(addKeyword);
    showSyncStorageInUse();
    displayAllKeywords();
}

function navigationProcess(e){
    var selected = e.currentTarget;
    var other = Array.from(document.querySelectorAll("nav>a:not([data-name$='"+selected.dataset.name+"'])"));
    selected.className = "w3-indigo";
    $(other).attr("class","");
    $("#"+selected.dataset.name).show(125).css("display","block");
    other.forEach(function(curr){$("#"+curr.dataset.name).hide(125).css("display","none");});
    return false;
}

function showSyncStorageInUse() {
    chrome.storage.sync.getBytesInUse(null, function (bytesInUse) {
        var percentage = Math.round(bytesInUse / chrome.storage.sync.QUOTA_BYTES * 1000) / 100;
        document.getElementById("sync_storage_inuse").textContent = "sync storage in use: " + bytesInUse + " bytes(" + percentage + "%)";
    });

}

function displayAllKeywords() {
    chrome.storage.sync.get(null, function (items) {
        if (Object.keys(items).length !== 0) {
            displayKeywords("brand_tag_container");
            displayKeywords("series_tag_container");
        }

        function displayKeywords(containerId) {
            keywords = Object.keys(items[containerId]);
            if (keywords.length !== 0) {
                for (var i in keywords) {
                    createKeywordTag(containerId, keywords[i]);
                }
            }
        }
    });
}

function addKeyword(e) {
    var inputValue = $(e.currentTarget).prev().val();
    if (inputValue) {
        var containerId = $(e.currentTarget).parent().next()[0].id;
        chrome.storage.sync.get(containerId, function (items) {
            if (Object.keys(items).length !== 0) {
                if (!items[containerId].hasOwnProperty(inputValue)) {
                    items[containerId][inputValue] = "";
                    chrome.storage.sync.set(items, function () {
                        createKeywordTag(containerId, inputValue);
                    });
                } else {
                    window.alert("已有該關鍵字。");
                }
            } else {
                var obj = {};
                obj[containerId] = {};
                obj[containerId][inputValue] = "";
                chrome.storage.sync.set(obj, function () {
                    createKeywordTag(containerId, inputValue);
                });
            }
        });
    }

}

function createKeywordTag(containerId, textcontent) {
    var container = document.getElementById(containerId);
    var li = $("<li class='keyword-tag' style='display:none;'>" + textcontent + "</li>").hover(createDeleteSign, removeDeleteSign);

    if (container.firstChild) {
        $(li).insertBefore(container.firstChild).show(125);
    } else {
        $(li).appendTo(container).show(125);
    }

    function createDeleteSign(e) {
        var span = $("<span class='w3-closebtn w3-small keyword-tag-delete'>X</span>");
        span.click(removeKeywordTag);
        $(e.currentTarget).append(span);
    }

    function removeDeleteSign(e) {
        $(e.currentTarget).find("span:last").remove();
    }

    function removeKeywordTag(e) {
        var containerId = $(e.currentTarget).parent().parent()[0].id;
        var keyWord = $(e.currentTarget).parent()[0].textContent.slice(0, -1);
        chrome.storage.sync.get(containerId, function (items) {
            delete items[containerId][keyWord];

            if (Object.keys(items[containerId]).length === 0) {
                chrome.storage.sync.remove(containerId, function () {
                    $(e.currentTarget).parent().hide(125, function () {
                        $(this).remove();
                    });
                });
            } else {
                chrome.storage.sync.set(items, function () {
                    $(e.currentTarget).parent().hide(125, function () {
                        $(this).remove();
                    });
                });
            }

        });
    }

}

function clearSyncStorage() {
    chrome.storage.sync.clear(function () {

        removeKeywordTags("brand_tag_container");
        removeKeywordTags("series_tag_container");

        function removeKeywordTags(containerId) {
            var container = document.getElementById(containerId);
            while (container.lastChild) {
                container.removeChild(container.lastChild);
            }
        }

    });

}

function exportSyncStorageData() {
    chrome.storage.sync.get(null, function (items) {
        document.getElementById("sync_export_data").disabled = true;

        chrome.downloads.download({
            url: "data:attachment/json," + encodeURI(JSON.stringify(items, null, 2)),
            filename: "露天拍賣訂單擷取同步資料匯出.json"
        }, function (id) {

            var stateCheckInterval = setInterval(function () {

                chrome.downloads.search({id: id}, function (downloadItems) {
                    if (downloadItems[0].state === "complete") {
                        clearInterval(stateCheckInterval);
                        setTimeout(function () {
                            document.getElementById("sync_export_data").disabled = false;
                        }, 500);
                    }
                });

            }, 5);

        });

    });
}

function importDataToSyncStorage(e) {
    var importBtn = e.currentTarget;
    importBtn.disabled = true;
    var span = $("<span class='w3-closebtn w3-small w3-text-shadow'>X</span>");
    var inputFile = $("<input type='file' accept='.json'/>");
    span.click(removeInputFile);
    inputFile.on("change", importFileHandler);
    $(importBtn).after(inputFile).after(span);

    function removeInputFile() {
        $(inputFile).hide(125, function () {
            $(this).remove();
        });
        $(span).remove();
        importBtn.disabled = false;
    }

    function importFileHandler(e) {
        var files = e.currentTarget.files;
        var reader = new FileReader();
        reader.onload = loadFileHandler;
        reader.readAsText(files[0]);

        function loadFileHandler(e) {
            try {
                var data = JSON.parse(e.currentTarget.result);
                console.log(data);
                if (data.hasOwnProperty("brand_tag_container") && data.hasOwnProperty("series_tag_container") && Object.keys(data).length === 2) {
                    $(".keyword-tag").remove();
                    chrome.storage.sync.set(data,function(){
                       displayAllKeywords(); 
                       removeInputFile();
                    });
                    
                } else {
                    window.alert("匯入檔案JSON沒有brand_tag_container或series_tag_container屬性，或有多餘屬性");
                }
            } catch (err) {
                if (err.toString().match(/SyntaxError/))
                    window.alert("匯入檔案JSON句法錯誤");
            }

        }

    }
}


