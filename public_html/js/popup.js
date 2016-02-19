var oderList;

$("#run").on("click", clickHandler);

function clickHandler(e) {

    if ($("#lastOderId").val() === "") {
        $("#progress-msg").text("請輸入最後擷取訂單編號");
    } else {
        if ($("#lastOderId").val().length < 14) {
            $("#progress-msg").text("訂單編號為14字元長");
        } else {
            if ($("#lastOderId").val().match(/\D+/)) {
                $("#progress-msg").text("訂單編號為數字");
            } else {
                $("#run").attr("disabled", true);
                $("#lastOderId").attr("disabled", true);
                chrome.tabs.query({active: true}, sendData);
            }
        }
    }

    function sendData(tabs) {

        chrome.tabs.sendMessage(tabs[0].id, {flag: "initialCatch", data: $("#lastOderId").val()}, responseHandler);

        function responseHandler(response) {
            console.log(response.flag);
            if (response.flag === "need_Login") {
                $("#progress-msg").text("無法取得收件人資料，請先登入露天後台");
            } else if (response.flag === "initialCatch_End") {
                oderList = response.result;
                chrome.tabs.sendMessage(tabs[0].id, {flag: "catchOderDetail"}, responseHandler);
            } else if (response.flag === "catchOderDetail_Process") {
                var index = response.result.length;
                if (index < oderList.length) {
                    $("#progressBar").attr("value", index / oderList.length);
                    response.result.push(oderList[index]);
                    $("#progress-msg").text("取得訂單明細..." + Math.floor(index / oderList.length * 100) + "%");
                    chrome.tabs.sendMessage(tabs[0].id, {flag: "catchOderDetail_Process", data: response.result}, responseHandler);
                } else {
                    $("#progressBar").attr("value", index / oderList.length);
                    oderList = response.result;
                    chrome.tabs.sendMessage(tabs[0].id, {flag: "catchCommoditySpec"}, responseHandler);
                }
            } else if (response.flag === "catchCommoditySpec_Process") {
                var index = response.result.length;
                if (index < oderList.length) {
                    $("#progressBar").attr("value", index / oderList.length);
                    response.result.push(oderList[index]);
                    $("#progress-msg").text("取得商品規格..." + Math.floor(index / oderList.length * 100) + "%");
                    chrome.tabs.sendMessage(tabs[0].id, {flag: "catchCommoditySpec_Process", data: response.result}, responseHandler);
                } else {
                    $("#progressBar").attr("value", index / oderList.length);
                    oderList = response.result;
                    $("#progress-msg").text("擷取完成，檢視結果");
                    $("#progress-msg").attr("disabled", false);
                    $("#progress-msg").click(function () {
                        chrome.runtime.sendMessage(chrome.runtime.id, {flag: "capture_Finish", data: oderList});
                    });
                }
            }
        }
    }

}

