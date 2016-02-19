/**
 * @author Shen-Teng Tu
 */

/**
 * @description 讓待確認訂單頁面顯示取消交易及修改訂單的提示標籤
 */
function showWarningTag() {
    var url = window.location.href;
    if (url.match(/http:\/\/mybid\.ruten\.com\.tw\/master\/my\.php\?l_type=sel_wait_confirm/)) {
        var warningList = document.querySelectorAll(".is-status-warning");
        for (var i in warningList) {
            var tagText = warningList[i].textContent;
            if (warningList[i].parentNode) {
                var target = warningList[i].parentNode.parentNode.firstElementChild.firstElementChild;
                $("<div class='tag-warning'>" + tagText + "</div>").insertBefore(target);
            }
        }
    }

}
/**
 * @description 定義訂單物件架構
 * @type {{OrderNumber: string, OrderDate: string, Buyer: string, Commoditys: Array, ShippingMethod: string, Addressee: Object}} Obj_Oder
 */
Obj_Oder = {
    OrderNumber: "",
    OrderDate: "",
    Buyer: "",
    Commoditys: {},
    ShippingMethod: "",
    Addressee: {}
};
/**
 * @description 定義商品物件架構
 * @type {{Id: string, Title: string, Specification: Array,Total: number}} Obj_Commodity
 */
Obj_Commodity = {
    Id: "",
    Title: "",
    Specification: [],
    Total: 0
};
/**
 * @description 定義收件人物件架構
 * @type {{Name: string, Phone: string, Mobile: string, EMail: string, Address: string}} Obj_Addressee
 */
Obj_Addressee = {
    Name: "",
    Phone: "",
    Mobile: "",
    EMail: "",
    Address: ""
};
/**
 * @description Fired when a message is sent from either an extension process or a content script.
 * @param {function} callback 
 * @see {@link https://developer.chrome.com/extensions/runtime#event-onMessage|chrome.runtime}
 */
chrome.runtime.onMessage.addListener(onMessageListener);
/**
 * @description chrome.runtime API 中 onMessage 的 Listener。
 * @param {any} message 經由調用中腳本發送的消息。
 * @param {chrome.runtime.MessageSender} sender
 * @param {function} sendResponse 當你有一個回應時要調用的函數（最多一次）。
 * @returns {Boolean}
 * @see {@link https://developer.chrome.com/extensions/runtime#event-onMessage|chrome.runtime}
 */
function onMessageListener(message, sender, sendResponse) {
    console.log(message.flag);
    if (message.flag === "tab_status_Complete") {//分頁載入完成
        showWarningTag();
    } else if (message.flag === "initialCatch") {//執行初始擷取
        initialCatch(message.data);
        return true;
    } else if (message.flag === "catchOderDetail") {//開始擷取訂單明細
        sendResponse({flag: message.flag + "_Process", result: []});
        return true;
    } else if (message.flag === "catchOderDetail_Process") {//執行擷取訂單明細
        catchOderDetail(message.data);
        return true;
    } else if (message.flag === "catchCommoditySpec") {//開始擷取商品規格
        sendResponse({flag: message.flag + "_Process", result: []});
        return true;
    } else if (message.flag === "catchCommoditySpec_Process") {//執行擷取商品規格
        catchCommoditySpec(message.data);
        return true;
    } else {
        return false;
    }
    /**
     * @description 初始擷取訂單資料
     * @param {string} lastOderId 最後要擷取的訂單標號
     */
    function initialCatch(lastOderId) {

        var tableBodyRows = Array.from(document.getElementsByClassName("mybid-table")[0].getElementsByTagName("tbody")[0].getElementsByTagName("tr"));
        catchOder([], tableBodyRows[Symbol.iterator]());

        /**
         * @description 從訂單頁面擷取訂單資料
         * @param {Array} oderList 欲放訂單物件的空陣列
         * @param {Symbol.iterator} oderIterator 訂單頁面tr元素陣列迭代
         */
        function catchOder(oderList, oderIterator) {
            var curruntTableRow = oderIterator.next();

            if (curruntTableRow.done) {
                sendResponse({flag: message.flag + "_End", result: oderList});
            } else {
                var theOder = JSON.parse(JSON.stringify(Obj_Oder));
                if (curruntTableRow.value.classList[1] !== curruntTableRow.value.classList[2]) {
                    theOder.OrderNumber = curruntTableRow.value.classList[1];
                    theOder.OrderDate = curruntTableRow.value.getElementsByTagName("td")[2].textContent.replace("\n", "").replace(/\s/g, "");
                    theOder.Buyer = curruntTableRow.value.getElementsByTagName("td")[1].getElementsByTagName("a")[0].textContent;
                    if (curruntTableRow.value.getElementsByClassName("is-status-warning").length !== 0) {
                        theOder.OrderDate = curruntTableRow.value.getElementsByClassName("is-status-warning")[0].textContent;
                    }
                    theOder.ShippingMethod = curruntTableRow.value.getElementsByTagName("td")[5].textContent.replace("\n", "").replace(/\s/g, "");
                    oderList.push(theOder);
                    if (theOder.OrderNumber === lastOderId) {
                        sendResponse({flag: message.flag + "_End", result: oderList});
                    } else {
                        catchOder(oderList, oderIterator);
                    }

                } else {
                    catchOder(oderList, oderIterator);
                }
            }
        }

    }
    /**
     * @description 擷取訂單明細資料
     * @param {Array} oderList 訂單物件陣列
     */
    function catchOderDetail(oderList) {
        var theOder = oderList.pop();
        $.ajax("http://mybid.ruten.com.tw/master/view_transaction.php?tno=" + theOder.OrderNumber).done(getTransactionDone).fail(getTransactionFail);

        function getTransactionDone(data) {
            var theAddressee = JSON.parse(JSON.stringify(Obj_Addressee));
            var doc = (new DOMParser()).parseFromString(data, "text/html");
            if (doc.getElementById("login_form") === null) {

                //商品
                var commodityIdList = Array.from(doc.querySelectorAll(".gy12"));
                commodityIdList.forEach(function (curr, index, array) {
                    var id = /\d+/.exec(curr.textContent)[0];
                    if (theOder.Commoditys.hasOwnProperty(id)) {
                        theOder.Commoditys[id].Total += Number(curr.parentNode.nextElementSibling.childNodes[0].textContent);
                    } else {
                        var theCommodity = JSON.parse(JSON.stringify(Obj_Commodity));
                        theCommodity.Title = curr.parentNode.childNodes[0].textContent;
                        theCommodity.Id = id;
                        theCommodity.Total = Number(curr.parentNode.nextElementSibling.childNodes[0].textContent);
                        theOder.Commoditys[id] = theCommodity;
                    }
                });

                //收件人
                if ($(getTd(doc.body, 0, 1, 0)).children("table").length === 4) {
                    theAddressee.Name = getTd(getTd(getTd(doc.body, 0, 1, 0), 2, 1, 0), 0, 1, 3).textContent.replace("\n", "").replace(/\s/g, "");
                    theAddressee.Phone = getTd(getTd(getTd(doc.body, 0, 1, 0), 2, 1, 0), 0, 2, 3).textContent.replace("\n", "").replace(/\s/g, "");
                    theAddressee.Mobile = getTd(getTd(getTd(doc.body, 0, 1, 0), 2, 1, 0), 0, 3, 3).textContent.replace("\n", "").replace(/\s/g, "");
                    theAddressee.EMail = getTd(getTd(getTd(doc.body, 0, 1, 0), 2, 1, 0), 0, 4, 3).textContent.replace("\n", "").replace(/\s/g, "");
                    theAddressee.Address = getTd(getTd(getTd(doc.body, 0, 1, 0), 2, 1, 0), 0, 5, 3).textContent.replace("\n", "").replace(/\s/g, "");
                } else {
                    theAddressee.Name = "買家修改訂單";
                    theAddressee.Phone = "買家修改訂單";
                    theAddressee.Mobile = "買家修改訂單";
                    theAddressee.EMail = "買家修改訂單";
                    theAddressee.Address = "買家修改訂單";
                }
                theOder.Addressee = theAddressee;

                oderList.push(theOder);
                sendResponse({flag: message.flag, result: oderList});
            } else {
                sendResponse({flag: "need_Login", result: null});
            }
        }

        function getTransactionFail() {
            console.log("getTransactionFail");
            sendResponse({flag: "need_Login", result: null});
        }

        function getTd(parentNode, tableIndex, trIndex, tdlIndex) {
            return $($($($(parentNode).children("table")[tableIndex]).children("tbody")[0]).children("tr")[trIndex]).children("td")[tdlIndex];
        }
    }
    /**
     * @description 自動點選訂單頁面商品規格按鈕取得規格明細
     * @param {Array} oderList 訂單物件陣列
     */
    function catchCommoditySpec(oderList) {
        var theOder = oderList.pop();

        var specLink = document.getElementById("custom_spec_show_detail_link_" + theOder.OrderNumber);//商品規格按鈕
        if (specLink !== null) {
            specLink.dispatchEvent(new MouseEvent("click", {"view": window, "bubbles": true, "cancelable": false}));//觸發點選
            setTimeout(function () {
                var commoditySpecDetail = Array.from(document.getElementById("custom_spec_detail").getElementsByClassName("custom-spec"));
                catchSpecDetail({}, commoditySpecDetail[Symbol.iterator]());
            }, 800);//必須延時

        } else {
            var commoditysIterator = objectIterator(theOder.Commoditys);
            importSpecDetail(commoditysIterator);
        }

        /**
         * @description 取得規格明細
         * @param {obj} specDetaillMap 欲放規格明細的空物件
         * @param {Symbol.iterator} specDetaillIterator 商品規格明細div元素陣列迭代
         */
        function catchSpecDetail(specDetaillMap, specDetaillIterator) {
            var currentSpecDtail = specDetaillIterator.next();

            if (currentSpecDtail.done) {
                var commoditysIterator = objectIterator(theOder.Commoditys);
                importSpecDetail(commoditysIterator, specDetaillMap);
            } else {
                var id = /\d+/.exec(currentSpecDtail.value.childNodes[1].textContent)[0];
                var specs = Array.from(currentSpecDtail.value.childNodes[2].childNodes);
                specs = specs.map(function (li) {
                    return li.textContent;
                });
                if (specDetaillMap.hasOwnProperty(id)) {
                    specDetaillMap[id] = specDetaillMap[id].concat(specs);
                } else {
                    specDetaillMap[id] = specs;
                }
                catchSpecDetail(specDetaillMap, specDetaillIterator);
            }
        }
        /**
         * @description 匯入規格明細
         * @param {Object} commoditysIterator 商品明細物件迭代
         * @param {Object} specDetaillMap 規格明細物件
         */
        function importSpecDetail(commoditysIterator, specDetaillMap) {
            var currentCommodity = commoditysIterator.next();

            if (currentCommodity.done) {
                oderList.push(theOder);
                sendResponse({flag: message.flag, result: oderList});
            } else {
                if (specDetaillMap) {
                    if (specDetaillMap.hasOwnProperty(currentCommodity.key)) {
                        currentCommodity.value.Specification = specDetaillMap[currentCommodity.key];
                    } else {
                        currentCommodity.value.Specification = ["未設規格*" + currentCommodity.value.Total];
                    }
                    importSpecDetail(commoditysIterator, specDetaillMap);
                } else {
                    currentCommodity.value.Specification = ["未設規格*" + currentCommodity.value.Total];
                    importSpecDetail(commoditysIterator, specDetaillMap);
                }
            }
        }

    }

}
/**
 * @description 參考Iteration protocols的物件迭代器。next()方法會回傳擁有key、value、done三個屬性的物件。
 * @param {Object} obj 需要迭代的物件
 * @return {Object} return iterator object that implements a next() method.
 */
function objectIterator(obj) {
    var keys = Object.keys(obj);
    var index = 0;

    return {
        next: function () {
            var theKey;
            var theValue;
            var isDone;
            if (!(index < keys.length)) {
                theKey = keys[keys.length - 1];
                isDone = true;
            } else {
                theKey = keys[index];
                isDone = false;
                index++;
            }

            theValue = obj[theKey];

            return{
                key: theKey,
                value: theValue,
                done: isDone
            };

        }
    };
}


