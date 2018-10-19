/**
 * Created by admin on 2018/10/12.
 */

//用来获取表单中内容(除了文件）
function check(form) {
    var data = [];
    for (let i = 0 ; i < form.length - 1 ; i++){
        if(form[i].type !== "file"){
            data.push(form[i].value);
        }
    }
    return data;
}

//进行数据的提交
function submitData(data) {
    let request = new XMLHttpRequest();
    request.open("POST" , "http://localhost:9002/upload" , true);
    let formDatas = formData(data);
    request.send(formDatas);
    request.onreadystatechange = function() {
        if(request.readyState === 4) {
            if(request.status === 200) {
                let str = request.responseText;
                console.log(str);
            }
        }
    }
}

function formData(data) {
    let formData = new FormData();

    for(let prop in data) {
        formData.append(prop , data[prop]);
    }

    return formData;
}

//进行数据的查找
function getData(callback){
    let request = new XMLHttpRequest();
    request.open("GET" , "http://114.215.189.49:9002/getContent" , true);
    request.send();

    request.onreadystatechange = function() {
        if(request.readyState === 4) {
            if(request.status === 200) {
                let strJSON = JSON.parse(request.responseText);
                callback(strJSON);
            }
        }
    }
}

//获取详细信息
function getDetailData(params , callback) {
    let request = new XMLHttpRequest();
    request.open("GET" , "http://114.215.189.49:9002/getDetailContent" + params , true);
    request.send();

    request.onreadystatechange = function() {
        if(request.readyState === 4) {
            if(request.status === 200) {
                let strJSON = JSON.parse(request.responseText);
                callback(strJSON);
            }
        }
    }
}

//获取网址中对应名称的参数
function getParamValue(name) {
    //利用了正则的方式//此处
    let reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)");
    //substr() 方法可在字符串中抽取从 start 下标开始的指定数目的字符。
    let r = document.location.search.substr(1).match(reg);
    if(r !== null) {
        return r[2];
    }else {
        return null;
    }
}