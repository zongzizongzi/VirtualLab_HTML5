/**
 * Created by admin on 2018/10/12.
 */
//用来获取表单中内容
function check(form) {
    var data = [];
    for (let i = 0 ; i < form.length - 1 ; i++){
        if(form[i].type == "file"){
            data.push(form[i].files[0])
        }else{
            data.push(form[i].value);
        }
    }
    return data;
}

//进行数据的提交
function submitData(data) {
    let request = new XMLHttpRequest();
}
document.getElementById("submit").addEventListener("click" , function() {
    if(!document.querySelector("#name").value){
        alert("姓名不能为空，请添加姓名……");
        return;
    }
    if(!document.querySelector("#studentId").value){
        alert("学号不能为空，请添加学号……");
        return;
    }
    let data = check(document.getElementById("form"));
    data.push(document.getElementById("homework").innerText);
    console.log(data);
});