var theDate = new Date();

var readyStateCheckInterval = setInterval(function () {
    if (document.readyState === "complete") {
        clearInterval(readyStateCheckInterval);
        chrome.tabs.getCurrent(function (tab) {
            chrome.runtime.sendMessage(chrome.runtime.id, {flag: "result_page_Complete", data: tab.id});
        });
    }
}, 10);

chrome.runtime.onMessage.addListener(onMessageListener);

function onMessageListener(message, sender, sendResponse) {
    console.log(message.flag);
    if (message.flag === "result_Display") {
        oderListToTableRow(message.data);
    }

}

function oderListToTableRow(oderList) {
    Obi_CSVRow = {
        "訂購類型": "",
        "訂購人": "",
        "訂單編號": "",
        "訂購時間": "",
        "型號": "-----",
        "品牌": "-----",
        "系列": "-----",
        "規格": "",
        "數量": 0,
        "運送方式": ""
    };

    oderList = oderList.reverse();
    console.log(oderList);

    catchData([], [], oderList[Symbol.iterator]());

    function catchData(tableRowListA, tableRowListB, oderListIterator) {
        var curruntOder = oderListIterator.next();

        if (curruntOder.done) {
            var tableRowList = tableRowListA.concat(tableRowListB);
            drawHTMLTable(tableRowList);
            createDownloadButton(tableRowList);
            createSaveButton(oderList);
        } else {
            var theTableRow = JSON.parse(JSON.stringify(Obi_CSVRow));
            var flag = true;
            if (curruntOder.value.ShippingMethod.match(/宅配/) || curruntOder.value.ShippingMethod.match(/貨到付款/)) {
                flag = false;
                theTableRow["訂購類型"] = "L2拍賣一般";
                if (curruntOder.value.ShippingMethod.match(/宅配/)) {
                    theTableRow["運送方式"] = "宅配";
                } else {
                    theTableRow["運送方式"] = "到付";
                }
            } else {
                theTableRow["訂購類型"] = "L2拍賣超商";
                if (curruntOder.value.ShippingMethod.match(/7-11/)) {
                    theTableRow["運送方式"] = "7-11";
                } else {
                    var addressStr = curruntOder.value.Addressee.Address;
                    theTableRow["運送方式"] = addressStr.match(/全家/) ? "全家" : addressStr.match(/OK/) ? "OK" : addressStr.match(/萊爾富/) ? "萊爾富" : "??";
                }
            }

            theTableRow["訂購人"] = curruntOder.value.Addressee.Name + curruntOder.value.Buyer;
            theTableRow["訂單編號"] = curruntOder.value.OrderNumber;
            theTableRow["訂購時間"] = curruntOder.value.OrderDate;

            var commoditys = curruntOder.value.Commoditys;
            var commoditysIterator = objectIterator(commoditys);
            catchCommodity(commoditys, commoditysIterator);

            function catchCommodity(commoditys, commoditysIterator) {
                var currentCommodity = commoditysIterator.next();

                if (currentCommodity.done) {
                    catchData(tableRowListA, tableRowListB, oderListIterator);
                } else {
                    var specifications = currentCommodity.value.Specification;
                    catchSpecification(specifications[Symbol.iterator]());

                    function catchSpecification(specificationIterator) {
                        var curruntSpecification = specificationIterator.next();
                        console.log(curruntSpecification.value);
                        if (curruntSpecification.done) {
                            catchCommodity(commoditys, commoditysIterator);
                        } else {
                            var theTableRowCopy = JSON.parse(JSON.stringify(theTableRow));
                            theTableRowCopy["型號"] = currentCommodity.value.Title;
                            theTableRowCopy["規格"] = curruntSpecification.value.split("*")[0];
                            theTableRowCopy["數量"] = Number(curruntSpecification.value.split("*")[1]);
                            matchKeywordInSyncStorage("brand_tag_container", currentCommodity.value.Title, function (keyword) {
                                theTableRowCopy["品牌"] = keyword;
                                matchKeywordInSyncStorage("series_tag_container", currentCommodity.value.Title, function (keyword) {
                                    theTableRowCopy["系列"] = keyword;
                                    flag ? tableRowListB.push(theTableRowCopy) : tableRowListA.push(theTableRowCopy);
                                    catchSpecification(specificationIterator);
                                });
                            });
                        }
                    }

                }
            }

        }
    }

    function matchKeywordInSyncStorage(key, str, callback) {
        chrome.storage.sync.get(key, function (items) {
            if (Object.keys(items).length === 0) {
                callback("------");
            } else {
                keywords = Object.keys(items[key]);
                var result = null;
                for (var i in keywords) {
                    result = str.match(new RegExp(stringFixForRegExp(keywords[i])));
                    if (result) {
                        break;
                    }
                }
                callback(result ? result : "-----");
            }
        });

        function stringFixForRegExp(str) {
            var theStr = str.replace(/\+/g, "\\+").replace(/\./g, "\\.");
            return theStr;
        }
    }

    function drawHTMLTable(csvRowList) {
        $("#oder_table_wrapper").append("<table class='w3-table w3-bordered w3-border' id='output-table'><thead><tr></tr></thead><tbody></tbody></table>");
        var keys = Object.keys(Obi_CSVRow);
        for (var i in keys) {
            $("#output-table thead tr").append("<th>" + keys[i] + "</th>");
        }
        var isOdd = true;
        for (var i in csvRowList) {

            if (i > 0 && (csvRowList[i]["訂單編號"] !== csvRowList[i - 1]["訂單編號"])) {
                isOdd = !isOdd;
            }
            var flag = isOdd ? "odd-part" : "even-part";
            var tr = $("<tr class='" + flag + "'></tr>");
            for (var j in csvRowList[i]) {
                tr.append("<td>" + csvRowList[i][j] + "</td>");
            }
            $("#output-table tbody").append(tr);

        }


    }

    function createDownloadButton(tableRowList) {
        var filename = theDate.toLocaleDateString().replace(/\//g, "-") + "露天訂單擷取.csv";
        var csv = Papa.unparse(tableRowList);
        $("#button_wrapper").append("<a style='display:none;'></a>");
        $("#button_wrapper").append("<button class='w3-btn'>" + "下載" + filename + "</button>");
        console.log($("#button_wrapper").children());
        $($("#button_wrapper").children()[0]).attr("href", 'data:attachment/csv,' + encodeURI(csv)).attr("download", filename);
        $($("#button_wrapper").children()[1]).click(function () {
            $("#button_wrapper").children()[0].dispatchEvent(new MouseEvent("click", {"view": window, "bubbles": true, "cancelable": false}));
        });
    }

    function  createSaveButton(oderList) {
        var map = {};
        for (var i in oderList) {
            map[oderList[i].OrderNumber] = oderList[i];
            if (Number(i) === oderList.length - 1) {
                $("#button_wrapper").append("<button class='w3-btn'>將此次擷取資料儲存到本地空間</button>");
                $($("#button_wrapper").children()[2]).click(function () {
                    console.log(map);
                });
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