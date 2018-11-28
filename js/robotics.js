/**
 * Created by bear on 2018/11/12.
 */

'use strict';

let VILibrary = {REVISION: '1.0'};

VILibrary.InnerObjects = {

    fixNumber: function (num) {

        let strLab;
        if (Math.abs(num) >= 1000) {

            num = num / 1000;
            strLab = num.toFixed(1).toString() + 'k';
        }
        else if (Math.abs(num) < 1000 && Math.abs(num) >= 100) {

            strLab = num.toFixed(0).toString();
        }
        else if (Math.abs(num) < 100 && Math.abs(num) >= 10) {

            if (Math.abs(num) - Math.abs(num).toFixed(0) < 0.01) {

                strLab = num.toFixed(0).toString();
            }
            else {

                strLab = num.toFixed(1).toString();
            }
        }
        else if (Math.abs(num) < 10) {

            if (Math.abs(num) - Math.abs(num).toFixed(0) < 0.01) {

                strLab = num.toFixed(0).toString();
            }
            else {

                strLab = num.toFixed(2).toString();
            }
        }
        return strLab;
    },

    getDomObject: function (obj) {

        obj = typeof obj === "string" ? document.getElementById(obj) : obj;
        return (obj instanceof HTMLElement) ? obj : (obj instanceof jQuery) ? obj[0] : false;
    },

    getVIById: function (id) {

        for (let VI of this.existingVIArray) {

            if (VI.id === id) {
                return VI;
            }
        }
        return false;
    },

    getVIcnName: function (VIName) {

        if (VILibrary.VI.hasOwnProperty(VIName)) {

            return VILibrary.VI[VIName].cnName;
        }
        return false;
    },

    /**
     * 查询某个VI已绑定的其他VI(默认包含自己)，调用后查询结果会存在boundVIArray中，
     * @param VI 需查询的VI
     */
    findBoundVI: function (VI) {

        let boundVIArray = [];
        boundVIArray.push(VI);
        if (VI.sourceInfoArray) {

            if (VI.sourceInfoArray.length > 0) {

                for (let sourceInfo of VI.sourceInfoArray) {

                    let tempSourceVI = this.getVIById(sourceInfo[0]);
                    if (boundVIArray.indexOf(tempSourceVI) === -1) {

                        this.findBoundVI(tempSourceVI, boundVIArray);
                    }
                }
            }
        }
        if (VI.targetInfoArray) {

            if (VI.targetInfoArray.length > 0) {

                for (let targetInfo of VI.targetInfoArray) {

                    let tempTargetVI = this.getVIById(targetInfo[0]);

                    if (boundVIArray.indexOf(tempTargetVI) === -1) {

                        this.findBoundVI(tempTargetVI, boundVIArray);
                    }
                }
            }
        }
        return boundVIArray;
    },

    bindDataLine: function (sourceId, targetId, sourceOutputType, targetInputType) {

        let sourceVI = this.getVIById(sourceId);
        let targetVI = this.getVIById(targetId);
        let sourceInfo = [sourceId, sourceOutputType, targetInputType];
        let targetInfo = [targetId, sourceOutputType, targetInputType];
        if (sourceVI.targetInfoArray.indexOf(targetInfo) !== -1 || targetVI.sourceInfoArray.indexOf(sourceInfo) !== -1) {

            console.log('Already bound!');
            return
        }
        sourceVI.targetInfoArray.push(targetInfo);
        targetVI.sourceInfoArray.push(sourceInfo);

        //******************************分配dataLine*******************************************//
        if (!sourceVI.dataLine && !targetVI.dataLine) {//均未赋过值说明未与其他VI连接，赋一个未被占用的dataLine

            let newDataLine = this.dataLineArray.length > 0 ?
                (Math.max.apply(null, this.dataLineArray) + 1 ) : 1;
            this.dataLineArray.push(newDataLine);
            sourceVI.dataLine = newDataLine;
            targetVI.dataLine = newDataLine;
        }
        else if (!sourceVI.dataLine && targetVI.dataLine) {//将已有dataLine赋给无dataLine的

            sourceVI.dataLine = targetVI.dataLine;
        }
        else if (sourceVI.dataLine && !targetVI.dataLine) {

            targetVI.dataLine = sourceVI.dataLine;
        }
        else if (sourceVI.dataLine > targetVI.dataLine) {//均有dataLine，合并较大的那个到较小的

            for (let VI of this.existingVIArray) {

                VI.dataLine = VI.dataLine === sourceVI.dataLine ? targetVI.dataLine : VI.dataLine;
            }
        }
        else if (sourceVI.dataLine < targetVI.dataLine) {

            for (let VI of this.existingVIArray) {

                VI.dataLine = VI.dataLine === targetVI.dataLine ? sourceVI.dataLine : VI.dataLine;
            }
        }
    },

    //解绑默认将与targetVI相关的VI赋新dataLine值
    unbindDataLine: function (sourceId, targetId) {

        let sourceVI = this.getVIById(sourceId);
        let targetVI = this.getVIById(targetId);

        //**********************************删除绑定信息**************************************//
        for (let targetInfo of sourceVI.targetInfoArray) {

            if (targetInfo[0] === targetId) {

                sourceVI.targetInfoArray.splice(sourceVI.targetInfoArray.indexOf(targetInfo), 1);
                break;
            }
        }
        for (let sourceInfo of targetVI.sourceInfoArray) {

            if (sourceInfo[0] === sourceId) {

                targetVI.sourceInfoArray.splice(targetVI.sourceInfoArray.indexOf(sourceInfo), 1);
                break;
            }
        }

        //*****************************重分配dataLine*************************************//
        let sourceVIBoundVIArray, targetVIBoundVIArray;

        sourceVIBoundVIArray = this.findBoundVI(sourceVI);
        targetVIBoundVIArray = this.findBoundVI(targetVI);

        if (sourceVIBoundVIArray.length === 1) {//无其他VI相连

            sourceVI.dataLine = 0;
        }
        //检测sourceVI与targetVI断开后有没有间接与targetVI相连，仍然相连则无需赋新dataLine值
        if (targetVIBoundVIArray.indexOf(sourceVI) === -1) {

            if (targetVIBoundVIArray.length === 1) {//无其他VI相连

                targetVI.dataLine = 0;
            }
            else {

                let newDataLine = Math.max.apply(null, this.dataLineArray) + 1;
                for (let VI of targetVIBoundVIArray) {

                    VI.dataLine = newDataLine;
                }
            }
        }
    },

    dataUpdater: function (dataLine) {

        if (!dataLine) {

            return;
        }
        for (let VI of this.existingVIArray) {

            if (VI.dataLine === dataLine && VI.hasOwnProperty('updater')) {

                VI.updater();
            }
        }
    },

    //双击VI弹出框
    showBox: function (VI) {

        if (VI.boxTitle) {

            layer.open({
                type: 1,
                title: VI.boxTitle,
                area: ['auto', 'auto'],
                shade: 0.3,
                shadeClose: true,
                closeBtn: false,
                zIndex: layer.zIndex,
                content: VI.boxContent,
                btnAlign: 'c',
                btn: ['确定', '取消'],
                yes: function (index) {
                    VI.setInitialData();
                    layer.close(index);
                },
                btn2: function (index) {
                    layer.close(index);
                },
                success: function (layero) {
                    layer.setTop(layero);
                }
            });
        }
    },

    /**
     * FFT算法
     * @param dir
     * @param m 采样点数，多余输入数据时剩余部分置0
     * @param realPart
     * @param imgPart   对于实数据时留空
     * @returns {Array}
     */
    fft: function (dir, m, realPart, imgPart) {

        let n, i, i1, j, k, i2, l, l1, l2, c1, c2, tx, ty, t1, t2, u1, u2, z;
        n = 1;
        for (i = 0; i < m; i += 1) {

            n *= 2;
        }
        let real = realPart.slice(0);
        let img;
        if (imgPart === undefined) {

            img = [];
            for (i = 0; i < n; i += 1) {
                img.push(0);
            }
        }
        else {

            img = imgPart.slice(0);
        }

        /* Do the bit reversal */
        i2 = n >> 1;
        j = 0;
        for (i = 0; i < n - 1; i += 1) {
            if (i < j) {
                tx = real[i];
                ty = img[i];
                real[i] = real[j];
                img[i] = img[j];
                real[j] = tx;
                img[j] = ty;
            }
            k = i2;
            while (k <= j) {
                j -= k;
                k >>= 1;
            }
            j += k;
        }
        /* Compute the FFT */
        c1 = -1.0;
        c2 = 0.0;
        l2 = 1;
        for (l = 0; l < m; l += 1) {
            l1 = l2;
            l2 <<= 1;
            u1 = 1.0;
            u2 = 0.0;
            for (j = 0; j < l1; j += 1) {
                for (i = j; i < n; i += l2) {
                    i1 = i + l1;
                    t1 = u1 * real[i1] - u2 * img[i1];
                    t2 = u1 * img[i1] + u2 * real[i1];
                    real[i1] = real[i] - t1;
                    img[i1] = img[i] - t2;
                    real[i] += t1;
                    img[i] += t2;
                }
                z = u1 * c1 - u2 * c2;
                u2 = u1 * c2 + u2 * c1;
                u1 = z;
            }
            c2 = Math.sqrt((1.0 - c1) * 0.5);
            if (dir === 1) {

                c2 = -c2;
            }
            c1 = Math.sqrt((1.0 + c1) * 0.5);
        }
        /* Scaling for forward transform */
        if (dir === 1) {
            for (i = 0; i < n; i += 1) {
                real[i] /= n;
                img[i] /= n;
            }
        }

        let output = [];
        for (i = 0; i < n / 2; i += 1) {

            output[i] = 2 * Math.sqrt(real[i] * real[i] + img[i] * img[i]);
        }
        return output;
    },

    loadModule: function (MTLUrl, OBJUrl) {

        let objLoader = new THREE.OBJLoader();
        let mtlLoader = new THREE.MTLLoader();
        return new Promise(function (resolve, reject) {
            mtlLoader.load(MTLUrl, function (material) {
                objLoader.setMaterials(material);
                objLoader.load(OBJUrl, function (a) {

                    a.traverse(function (child) {
                        if (child instanceof THREE.Mesh) {

                            child.material.side = THREE.DoubleSide;
                        }
                    });
                    resolve(a);
                });
            })
        })
    },
    existingVIArray: [],
    dataLineArray: []
};

class TemplateVI {

    constructor(VICanvas) {

        if (new.target === TemplateVI) {
            throw new Error('本VI为模版，不能实例化');
        }
        let domElement = VILibrary.InnerObjects.getDomObject(VICanvas);
        const _this = this;
        this.container = domElement;
        this.id = domElement.id;
        this.fillStyle = 'orange';
        this.timer = 0;
        this.index = 0;
        this.dataLength = 1024;
        this.output = [0];
        this.outputPointCount = -1;//-1为无限制输出
        this.inputPointCount = 1;
        //与其他VI的连接信息
        this.sourceInfoArray = [];//[sourceVIId, sourceOutputType,thisInputType]二维数组，第二维分别存储sourceVI的ID、sourceVI输出类型、自己的输入类型
        this.targetInfoArray = [];//[targetVIId, thisOutputType,targetInputType]二维数组，第二维分别存储targetVI的ID、自己的输出类型、targetVI的输入类型
        this.dataLine = 0;

        VILibrary.InnerObjects.existingVIArray.push(this);
        this.constructor.logCount++;

        this.toggleObserver = function (flag) {

            if (flag) {

                if (!this.timer && this.dataLine) {

                    this.fillStyle = 'red';
                    this.draw();
                    this.timer = window.setInterval(function () {

                        VILibrary.InnerObjects.dataUpdater(_this.dataLine);
                    }, 50);
                }
            }
            else {

                if (this.timer) {

                    window.clearInterval(this.timer);
                    this.timer = 0;
                }
                this.fillStyle = 'orange';
                this.draw();
            }
        };

        this.updater = function () {

            if (this.sourceInfoArray.length > 0) {

                for (let sourceInfo of this.sourceInfoArray) {

                    let sourceVI = VILibrary.InnerObjects.getVIById(sourceInfo[0]);
                    let sourceOutputType = sourceInfo[1];
                    let inputType = sourceInfo[2];
                    let sourceData = sourceVI.getData(sourceOutputType);
                    this.setData(sourceData, inputType);
                }
            }
        };

        this.destroy = function () {

            let index = VILibrary.InnerObjects.existingVIArray.indexOf(this);
            if (index !== -1) {

                VILibrary.InnerObjects.existingVIArray.splice(index, 1);
            }
            if (this.timer) {

                window.clearInterval(this.timer);
                this.timer = 0;
            }
            this.dataLine = 0;
        };

        this.setData = function () {
        };

        this.getData = function () {

            return this.output;
        };

        this.reset = function () {

            this.toggleObserver(false);
            this.index = 0;
            this.output = [0];
        };

        this.draw = function () {

            this.ctx = this.container.getContext("2d");
            this.ctx.font = 'normal 14px Microsoft YaHei';
            this.ctx.fillStyle = this.fillStyle;
            this.ctx.fillRect(0, 0, this.container.width, this.container.height);
            this.ctx.fillStyle = 'black';
            let length = this.constructor.cnName.length;
            if (length > 4) {

                this.ctx.fillText(this.constructor.cnName.substring(0, 4), this.container.width / 2 - 14 * 4 / 2, this.container.height / 4 + 6);
                this.ctx.fillText(this.constructor.cnName.substring(4), this.container.width / 2 - 14 * (length - 4) / 2, this.container.height * 3 / 4);

            }
            else {

                this.ctx.fillText(this.constructor.cnName, this.container.width / 2 - 14 * length / 2, this.container.height / 2 + 6);
            }
        };

        this.handleDblClick = function (e) {

            VILibrary.InnerObjects.showBox(_this);
        };

        this.container.addEventListener('dblclick', this.handleDblClick, false);
    }

    static get cnName() {

        return 'VI模版';
    }

    static get defaultWidth() {

        return '65px';
    }

    static get defaultHeight() {

        return '50px';
    }
}
//因ES6定义Class内只有静态方法没有静态属性，只能在Class外定义
TemplateVI.logCount = 0;

class RobotTemplateVI extends TemplateVI {
    constructor (VICanvas,draw3DFlag){
        super(VICanvas);
        const _this = this;
        this.name = 'RobotTemplateVI';
        // let CurrentANG=[],TargetANG=[];
        // this.robotURL;
        this.currentLen=[0,0,0,0,0,0,0,0];
        this.currentScal=[1,1,1,1,1,1,1,1];
        this.initLen=[0,0,0,0,0,0,0,0];
        this.a_d=[0,0,0,0,0];
        this.getData=function (dataType) {
            return this.a_d.concat();
        }
        this.setData = function (input){
            if(Array.isArray(input)) {let targetANG=input.concat(); _this.jiontsControl(targetANG)}
            else {
                console.log('RobotVI: Input value error');
                return;
            }
        }
        this.jiontsControl=function(TargetANG) {
            let rotat="0,0,0,0";
            for(let i=0;i<=5;i++){
                switch (i){
                    case 1:case 2:case 4:
                    rotat="0,0,-1,"+TargetANG[i];
                    break;
                    case 0:
                        rotat="0,1,0,"+TargetANG[i];
                        break;
                    case 3:case 5:
                    rotat="1,0,0,"+TargetANG[i];
                    break;
                    default:alert("输入转角错误");return;
                }
                document.getElementById("Robot__link"+i).setAttribute('rotation',rotat);
            }
        }
        this.draw=function () {
            if (draw3DFlag) {
                //此处向网页插入HTML代码
                /*var my_html = (function () {/!*<x3d style="width: 100%;height: 100%;">
                 <scene>
                 <transform>
                 <inline nameSpaceName="Robot" mapDEFToID="true" url="assets/irb120_x3d/robot120.x3d"></inline>
                 </transform>
                 </scene>
                 </x3d>*!/}).toString().match(/[^]*\/\*([^]*)\*\/\}$/)[1];
                 document.getElementById("x3d120").innerHTML=my_html;*/
                this.container.innerHTML='<x3d style="width: 100%;height: 100%;border:none"><scene>'+
                    '<inline id="Robot" nameSpaceName="Robot"  mapDEFToID="true" url='+this.robotURL+'></inline>'+
                    '</scene></x3d>';
            }
            else {

                this.ctx = this.container.getContext("2d");
                let img = new Image();
                img.src = '';
                img.onload = function () {
                    _this.ctx.drawImage(img, 0, 0, _this.container.width, _this.container.height);
                };
            }
        }
        this.changeLength=function(lenNum){
            this.currentLen[lenNum]=parseInt(document.getElementById("L"+lenNum).value);
            if(isNaN(this.currentLen[lenNum])||this.currentLen[lenNum]<=0){
                alert("请输入正确的数字");
            }
            else {
                this.currentScal[lenNum]=this.currentLen[lenNum]/this.initLen[lenNum];
                let linkScale="1,1,1",linkTransform;
                switch (lenNum){
                    case 0:case 1:case 2:
                    linkScale="1,"+this.currentScal[lenNum]+",1";
                    linkTransform="0,"+this.currentLen[lenNum]+",0";
                    document.getElementById("Robot__link"+(lenNum-1)+"Scale").setAttribute('scale',linkScale);
                    document.getElementById("Robot__link"+lenNum).setAttribute('translation',linkTransform);
                    if(lenNum<2){
                        this.a_d[0]=this.currentLen[0]+this.currentLen[1];
                        document.getElementById("d0").innerHTML=this.a_d[0];
                    }
                    else {
                        this.a_d[1]=this.currentLen[2];
                        document.getElementById("a2").innerHTML=this.a_d[1];
                    }
                    break;
                    case 3:case 4:
                    linkScale=this.currentScal[4]+","+this.currentScal[3]+",1";
                    linkTransform=this.currentLen[4]+","+this.currentLen[3]+",0";
                    document.getElementById("Robot__link3").setAttribute('translation',linkTransform);
                    document.getElementById("Robot__link2Scale").setAttribute('scale',linkScale);
                    if(lenNum==3){
                        this.a_d[2]=this.currentLen[3];
                        document.getElementById("a3").innerHTML=this.a_d[2];
                    }
                    else {
                        this.a_d[3]=this.currentLen[4]+this.currentLen[5];
                        document.getElementById("d4").innerHTML=this.a_d[3];
                    }
                    break;
                    case 5:
                        this.a_d[3]=this.currentLen[4]+this.currentLen[5];
                        document.getElementById("d4").innerHTML=this.a_d[3];
                    case 6:case 7:
                    linkScale=this.currentScal[lenNum]+",1,1";
                    if(lenNum!=7){
                        linkTransform=(this.currentLen[lenNum])+",0,0";
                        document.getElementById("Robot__link"+(lenNum-1)).setAttribute('translation',linkTransform);
                    }
                    document.getElementById("Robot__link"+(lenNum-2)+"Scale").setAttribute('scale',linkScale);
                    this.a_d[4]=this.currentLen[6]+this.currentLen[7];
                    document.getElementById("d7").innerHTML=this.a_d[4];
                    break;
                    default:alert("lenNUM error");
                        return;
                }
                if (_this.dataLine){
                    VILibrary.InnerObjects.dataUpdater(_this.dataLine);
                }
            }
        }
    }
    static get cnName() {

        return '机器人模型';
    }

    static get defaultWidth() {

        return '550px';
    }

    static get defaultHeight() {

        return '300px';
    }


}

VILibrary.VI = {
    Instruction_1VI:class Instruction_1VI extends TemplateVI {
        constructor(VICanvas, draw3DFlag,robNumber) {
            super(VICanvas);
            const _this = this;
            this.name = 'Instruction_1VI';
            let currentANG,targetANG;
            let targetANG2;//专为IRB360提供
            let pPos=[];
            let instrIndex,
                instrSplit,//指令划分后
                moveType,//当前执行的运动类型
                Range,OMEGA,
                A,D,ALPHA,THETA;//D-H参数

            let ToolFlag=0,//加载工具标志
                ToolDO=false,
                LoadFlag=false;//是否夹持工件
            let gongjianIndex=0;//当前工件序号
            let objFlag=0;
            let singleStepFlag=false;//单步（指令）执行标志，用于远程控制；
            this.stepsNum=0;//积累的单步执行量

            let executiveFlag=false;//是否正在执行程序
            //判断机器人类型，
            switch (robNumber){
                case "k60":
                    A=[0,0,350,850,145,0,0,0];
                    D=[815,0,0,0,820,0,0,170];
                    ALPHA=[0,0,-Math.PI/2,0,-Math.PI/2,Math.PI/2,-Math.PI/2,0];
                    THETA=[0,0,-Math.PI/2,0,0,0,0,Math.PI];
                    currentANG=[0,0,0,0,Math.PI/6,0],targetANG=[0,0,0,0,Math.PI/6,0];
                    Range=[[-185,185],[-135,135],[-120,158],[-350,350],[-119,119],[-350,350]];
                    OMEGA=[128,102,128,260,245,322];
                    break;
                case "a910":
                    A=[0,0,200,250,0,0];
                    D=[0,220,0,0,0,0];//d[3]<=0;
                    ALPHA=[0,0,0,Math.PI,0,0];
                    THETA=[0,0,0,0,0,0];
                    currentANG=[0,0,0,0],targetANG=[0,0,0,0];
                    Range=[[-140,140],[-160,150],[-180*180/Math.PI,0],[-400,400]];
                    OMEGA=[415,659,1000*180/Math.PI,2400];
                    break;
                case "a360":
                    A=[0,0,0,0,0,0];
                    D=[0,0,0,0,0,0];//d[3]<=0;
                    ALPHA=[0,0,0,0,0,0];
                    THETA=[0,0,0,0,0,0];
                    currentANG=[0,0,0],targetANG=[0,0,0],targetANG2=[0,0,0,2.0800204983301263,2.0800204983301263,2.0800204983301263,0,1,0,0,1,0,0,1,0,0,0,-972.5];//theta,theta2,n0,n1,n2,x,y,z
                    Range=[[-55,110],[-55,110],[-55,110]];
                    OMEGA=[400,400,400];break;
                case "epson":
                    A=[0,0,0,0,0,0];
                    D=[0,0,0,0,0,0];//d[3]<=0;
                    ALPHA=[0,0,0,0,0,0];
                    THETA=[0,0,0,0,0,0];
                    // THETA=[92,80,227];
                    currentANG=[92,80,227],targetANG=[92,80,227];//theta,theta2,n0,n1,n2,x,y,z
                    Range=[[30,470],[55,500],[0,300]];
                    OMEGA=[1000*180/Math,1000*180/Math,1000*180/Math];break;
                    break;
                case 'yumi':
                    A=[0,0,30,30,40.5,40.5,27,0,27];
                    D=[0,166,0,251.5,0,265,0,0,120];
                    ALPHA=[0,0,-Math.PI/2,-Math.PI/2,Math.PI/2,Math.PI/2,Math.PI/2,Math.PI/2,0];
                    THETA=[0,0,Math.PI,0,Math.PI/2,Math.PI,Math.PI,0,-Math.PI/2];
                    currentANG=[0,0,0,0,0,0,0,0,0];
                    Range=[[-168.5,168.5],[-143.5,43.5],[-123.5,80],[-290,290],[-88,138],[-229,229],[-168.5,168.5]];
                    OMEGA=[180,180,180,400,400,400,180];
                    targetANG=[0,0,0,0,0,0,0]
                    break;
                case "a120":default:
                A=[0,0,0,270,70,0,0,0];//不加tool最后一个为0
                D=[290,0,0,0,302,0,0,72];//不加tool最后一个为72
                ALPHA=[0,0,-Math.PI/2,0,-Math.PI/2,Math.PI/2,-Math.PI/2,0];
                THETA=[0,0,-Math.PI/2,0,0,0,0,Math.PI];
                currentANG=[0,0,0,0,Math.PI/6,0],targetANG=[0,0,0,0,Math.PI/6,0];
                Range=[[-165,165],[-110,110],[-110,70],[-160,160],[-120,120],[-400,400]];
                OMEGA=[250,250,250,420,590,600];
                let lasdjsikdj=1111;
            }
            const baseA=A,baseD=D,baseTHETA=THETA;
            if(robNumber!="epson")Range=math.multiply(Range,Math.PI/180);
            this.getData=function (dataType) {
                if(dataType==1)return robNumber=="a360"?targetANG2:targetANG;
                else if(dataType==2)return [ToolFlag,ToolDO];
            }
            this.setData=function (input) {
                let a_D=input.concat();
                D[0]=a_D[0];
                A[3]=a_D[1];
                A[4]=a_D[2];
                D[4]=a_D[3];
                D[7]=a_D[4];
                if(a_D.length==6)
                    A[2]=a_D[5];
                kinematicsEquation(currentANG);
            }
            function Split(str) {
                // let str= document.getElementById(idName).value.toString();
                let arr=(str.replace(/\r|\n|\s|°/g,'')).split(";");//剔除所有换行回车和空格，并以分号分割
                let newArr=[];//用于存储不为''的元素
                for(let value of arr){
                    if(''!= value) {newArr.push(value);}
                }
                return newArr;
            }
            this.toggleObserver = function (str_points,str_cmd,stFlag) {
                // instrParse();
                if(stFlag)singleStepFlag=true;
                else singleStepFlag=false;
                let pPoints=Split(str_points);
                pPos=[];
                for(let p of pPoints){
                    let pNum=p.match(/p\d+/);
                    if(pNum==null){
                        alert("示教点格式错误！",p);
                        return;
                    }
                    pNum=parseInt(pNum[0].replace(/p/g,''));
                    if(isNaN(pNum)){
                        alert("示教点格式错误！",p);
                        return;
                    }
                    if(pPos[pNum]!=undefined){
                        alert("示教点重复定义错误！");
                        return;
                    }
                    p=p.match(/\[.*]/)[0].replace(/°|\[|]/g,'').split(',');//获取[]中间的内容并去掉[],以逗号分隔内容
                    for(let i=0;i<p.length;i++){
                        if(p[i]!=''){
                            p[i]=i<3?parseFloat(p[i]):(parseFloat(p[i])/180*Math.PI);//前三个数为坐标；后三个数为角度，需要转换为弧度
                        }
                    }
                    pPos[pNum]=p;
                    // console.log(pPos)
                }
                executiveFlag=true;
                instrIndex=0;
                let instrAll=str_cmd;
                // let instrAll=document.getElementById("instrInput").value.toString();//输入指令,获取字符串
                let replacedStr=instrAll.replace(/[\n]/g,"");//去掉回车
                instrSplit=replacedStr.split(";");//以分号分割字符串
                let points="";
                if(robNumber=="a360")points+=currentPOS[1]+" "+currentPOS[2]+" "+currentPOS[0];
                else points+=currentPOS[0]+" "+currentPOS[2]+" "+(-currentPOS[1]);
                document.getElementById("Robot__LineSet_points").setAttribute('point',points);
                document.getElementById("Robot__LineSet_index").setAttribute('coordIndex','0');
                _this.instrCompiling(); //逐条指令解析
            };
            function errInfo() {
                layer.open({
                    title: '系统提示'
                    ,content: '输入指令不符合语法规则'
                });
            }
            this.instrCompiling=function() {
                let instrLen=instrSplit.length;
                if(instrIndex<instrLen){
                    let instrI=instrSplit[instrIndex];
                    if(instrI.replace(/[\s]/g,"")==""){
                        instrIndex++;
                        if(instrIndex<(instrSplit.length-1)){
                            _this.instrCompiling();
                            // _this.instrCompiling();
                        }
                        else {
                            executiveFlag=false;
                            return
                        }
                    };
                    let lengthI=instrI.length;
                    let moveIndex=instrI.indexOf('move');
                    if(moveIndex==-1){
                        if(instrI.indexOf('Reset')>=0||instrI.indexOf('reset')>=0){
                            _this.setIO(false);
                        }
                        else if(instrI.indexOf('Set')>=0||instrI.indexOf('set')>=0){
                            _this.setIO(true);
                        }
                        else {errInfo();return;}
                    }
                    else {
                        /*let pIndex=instrI.indexOf("p");
                         let pNum=instrI.slice(pIndex+1,lengthI);//从p到结束之间的部分*/
                        let pNum=instrI.match(/p\d+/g);//匹配该命令中“p数字”的部分
                        // let strN=;
                        let n1 = Number(pNum[0].replace(/p/,""));//p后面的数字
                        let vNum=instrI.match(/v\d+/);
                        let m=Number(vNum[0].replace(/v/,""))//v后面的数字
                        if(isNaN(n1)||(pPos[n1]==undefined)){layer.open({
                            title: '系统提示'
                            ,content: '未知示教点'
                        });return;}
                        else  {
                            moveType=instrI[moveIndex+4];
                            let instrPos,lastPos;
                            let instrAng;
                            switch(moveType){
                                case "J":
                                    instrAng=inverseKinematics(pPos[n1]);
                                    if(instrAng==0){
                                        alert("超出工作空间或靠近奇异点！");return;
                                    }
                                    _this.moveJ(instrAng,m);
                                    break;
                                case "L":
                                    let LPos=pPos[n1].concat();
                                    _this.moveL(LPos,m);
                                    break;
                                case "C":

                                    let n2 = Number(pNum[1].replace(/p/,""));//第二个p后面的数字
                                    if(isNaN(n2)||(n2>=pPos.length)){layer.open({
                                        title: '系统提示'
                                        ,content: '未知示教点'
                                    });return;}
                                    if(n2==undefined){
                                        layer.open({
                                            title: '系统提示'
                                            ,content: 'moveC指令缺少关键参数'
                                        });return;
                                    }
                                    let CPos1=pPos[n1].concat();
                                    let CPos2=pPos[n2].concat();
                                    _this.moveC(CPos1,CPos2,m);
                                    break;
                                default: errInfo();return;
                            }
                        }
                    }
                }
            }
            //四元数方向插补
            function SLERP(p0,p2,N) {
                //计算始末点四元数和旋转角度thetaQ
                let Ept=[];
                let Ex0=p0[3],Ey0=p0[4],Ez0=p0[5],
                    Ex2=p2[3],Ey2=p2[4],Ez2=p2[5];
                let q0=eulerToQuaternion(Ex0,Ey0,Ez0),
                    q2=eulerToQuaternion(Ex2,Ey2,Ez2),
                    q0DotQ2=q0[0]*q2[0]+q0[1]*q2[1]+q0[2]*q2[2]+q0[3]*q2[3];
                if(q0DotQ2<0){q0DotQ2*=-1;q2=math.multiply(-1,q2);}
                let cosTheta=q0DotQ2/(Math.sqrt(q0[0]*q0[0]+q0[1]*q0[1]+q0[2]*q0[2]+q0[3]*q0[3])*Math.sqrt(q2[0]*q2[0]+q2[1]*q2[1]+q2[2]*q2[2]+q2[3]*q2[3])),
                    thetaQ=Math.acos(cosTheta);//初末方向绕转轴旋转的角度
                for(let i=0;i<N-1;i++){
                    let t=(i+1)/N,qt;
                    if(Math.sin(thetaQ)==0){qt=math.add(math.multiply((1-t),q0),math.multiply(t,q2))}
                    else qt=math.add(math.multiply(Math.sin((1-t)*thetaQ)/Math.sin(thetaQ),q0),math.multiply(Math.sin(t*thetaQ)/Math.sin(thetaQ),q2));//插补点四元数
                    let Ex = Math.atan2(2* (qt[2]*qt[3] + qt[0]*qt[1]), qt[0]*qt[0] - qt[1]*qt[1] - qt[2]*qt[2] + qt[3]*qt[3]),
                        Ey = Math.asin(2 * (qt[0]*qt[2] - qt[1]*qt[3])),
                        Ez = Math.atan2(2* (qt[1]*qt[2] + qt[0]*qt[3]), qt[0]*qt[0] + qt[1]*qt[1] - qt[2]*qt[2] - qt[3]*qt[3]);
                    Ept[i]=[Ex,Ey,Ez];
                }
                return Ept;
            }
            function eulerToQuaternion(Ex,Ey,Ez) {
                let cosEx = Math.cos(Ex/2),
                    sinEx = Math.sin(Ex/2),

                    cosEy = Math.cos(Ey/2),
                    sinEy = Math.sin(Ey/2),

                    cosEz = Math.cos(Ez/2),
                    sinEz = Math.sin(Ez/2);

                let q0 = cosEx * cosEy * cosEz + sinEx * sinEy * sinEz,
                    q1 = sinEx * cosEy * cosEz - cosEx * sinEy * sinEz,
                    q2 = cosEx * sinEy * cosEz + sinEx * cosEy * sinEz,
                    q3 = cosEx * cosEy * sinEz - sinEx * sinEy * cosEz;
                return [q0,q1,q2,q3];
            }
            this.moveJ=function(input,v){
                moveType="J";
                if(v<=0){
                    alert("参数设置错误！");
                    return;
                }
                // let distanceL=Math.sqrt(Math.pow(targetPOS[0]-LastPOS[0],2)+Math.pow(targetPOS[1]-LastPOS[1],2)+Math.pow(targetPOS[2]-LastPOS[2],2));
                // let t=distanceL/v;
                let instructAng=input.concat();
                let Diff=math.add(instructAng,math.multiply(-1,currentANG));
                let maxDiff=Math.max.apply(Math,math.abs(Diff));
                if(maxDiff==0||maxDiff==undefined){//
                    if(executiveFlag){
                        instrIndex++;
                        if(instrIndex<instrSplit.length){
                            if(!singleStepFlag){
                                setTimeout(function () {
                                    _this.instrCompiling();
                                },100);
                                // _this.instrCompiling();
                            }
                            else{
                                _this.stepsNum--;
                                if(_this.stepsNum) _this.instrCompiling();
                                else return;
                            }
                        }
                        else {
                            executiveFlag=false;
                            return;
                        }
                    }
                    else{
                        kinematicsEquation(instructAng);
                        return;
                    }
                }
                else {
                    let dAng=math.multiply(Diff,1/maxDiff);//单位变化量
                    let x=parseFloat(document.getElementById("posX").value),
                        y=parseFloat(document.getElementById("posY").value),
                        z=parseFloat(document.getElementById("posZ").value);
                    let ANG1=math.add(currentANG,dAng),
                        T=kinematicsEquation(ANG1,true),
                        x1=T[0],y1=T[1],z1=T[2],
                        dL=Math.sqrt(Math.pow(x-x1,2)+Math.pow(y-y1,2)+Math.pow(z-z1,2));//计算各轴转动单位变化量后产生的末端位移；
                    //dt=dL/v=dAng/ω
                    let Omega;//角速度
                    if(dL<0.02){
                        let t=maxDiff/(0.1*v/180*Math.PI);
                        Omega=math.multiply(Diff,1/t);
                    }
                    else Omega=math.multiply(math.multiply(dAng,v),1/dL);//角速度
                    let STEP=math.multiply(Omega,0.05);//5毫秒周期内的步进角度
                    let maxStep=Math.max.apply(Math,math.abs(STEP)),
                        N=parseInt(maxDiff/maxStep)+1;//计算步进次数
                    let i=0;
                    this.timer = window.setInterval(function () {
                        let current=math.multiply(-1,currentANG);
                        let diff=math.add(instructAng, current);
                        // let maxDiff=Math.max.apply(Math,math.abs(diff));
                        if(i+1>=N){
                            window.clearInterval(_this.timer);
                            _this.timer=null;
                            targetANG=instructAng.concat();
                        }
                        else{
                            targetANG=math.add(currentANG,STEP);
                        }
                        kinematicsEquation(targetANG);
                        i++;
                        if (_this.dataLine){
                            VILibrary.InnerObjects.dataUpdater(_this.dataLine);
                        }
                        if(i+1>N){
                            if(executiveFlag){
                                instrIndex++;
                                if(instrIndex<instrSplit.length){
                                    if(!singleStepFlag) {
                                        setTimeout(function () {
                                            _this.instrCompiling();
                                        }, 100);
                                    }
                                    else{
                                        _this.stepsNum--;
                                        if(_this.stepsNum) _this.instrCompiling();
                                        else return;
                                    }
                                }
                                else {
                                    executiveFlag=false;
                                    return
                                }
                            }
                            else return;
                        }

                    },50);
                }


            }
            this.moveL=function (input1,v) {
                moveType="L";
                const INTERVAL=0.05;
                let instructPos=input1.concat();
                let lastPos=currentPOS.concat();
                let diffPos=math.add(instructPos,math.multiply(-1,lastPos));
                let t=Math.sqrt(Math.pow(diffPos[0],2)+Math.pow(diffPos[1],2)+Math.pow(diffPos[2],2))/v;//总时间
                if(t==0){
                    t=Math.max.apply(Math,math.abs(diffPos))/(240*Math.PI/180);//距离为0 ，按最大转速计算时间
                }
                let N=parseInt(t/INTERVAL)+1;//步数
                let Ept=SLERP(lastPos,instructPos,N);//四元数插补
                let step=math.multiply(diffPos,1/N);
                let maxStep=Math.max.apply(Math,math.abs(step));
                let k=0;
                this.timer = window.setInterval(function () {
                    let current=math.multiply(-1,currentPOS);
                    let diff=math.add(instructPos, current);
                    let maxDiff=Math.max.apply(Math,math.abs(diff));
                    let x,y,z,alpha,beta,gamma,tPos;
                    if(k+1>=N){//最后一步
                        window.clearInterval(_this.timer);
                        _this.timer=null;
                        tPos=instructPos.concat();
                    }
                    else {
                        x=currentPOS[0]+step[0],
                            y=currentPOS[1]+step[1],
                            z=currentPOS[2]+step[2];
                        tPos=[x,y,z,Ept[k][0],Ept[k][1],Ept[k][2]];
                    }
                    let tAng=inverseKinematics(tPos);
                    if(tAng==0){
                        window.clearInterval(_this.timer);
                        _this.timer=null;
                        alert("超出工作空间或靠近奇异点！");return;
                    }
                    else targetANG=tAng.concat();
                    kinematicsEquation(targetANG);
                    if (_this.dataLine){
                        VILibrary.InnerObjects.dataUpdater(_this.dataLine);
                    }
                    if(k+1>=N){
                        if(executiveFlag){
                            instrIndex++;//指向下一行指令
                            if(instrIndex<instrSplit.length){
                                if(!singleStepFlag){
                                    setTimeout(function () {
                                        _this.instrCompiling();//延时0.1秒解析下一行指令
                                    },100);
                                }
                                else{
                                    _this.stepsNum--;
                                    if(_this.stepsNum) _this.instrCompiling();
                                    else return;
                                }

                                // _this.instrCompiling();
                            }
                            else {
                                executiveFlag=false;//指令解析完毕
                                return
                            }
                        }
                        /*else{
                         for(let i=0;i<targetANG.length;i++){
                         let a;
                         if(robNumber=="a910"&&i==2)a=(targetANG[i]).toFixed(2);
                         else a=(targetANG[i]*180/Math.PI).toFixed(2);
                         document.getElementById("angInput"+(i)).value=a;
                         document.getElementById("angTxt"+(i)).value=a;
                         }
                         return;
                         }*/
                    }
                    k++;
                },INTERVAL*1000)

            }
            this.moveC=function (input1,input2,input3) {
                moveType="C";
                let F=input3;
                const T=0.05;
                let p1=input1.concat();
                let p2=input2.concat();
                let p0=currentPOS.concat();
                let diffPos=math.add(p2,math.multiply(-1,p0));
                //计算半径和圆心坐标
                let xc,yc,zc;
                let x0,y0,z0,x1,y1,z1,x2,y2,z2;
                let a1, b1, c1, d1,
                    a2, b2, c2, d2,
                    a3, b3, c3, d3;

                x0 = p0[0], y0 = p0[1], z0 = p0[2];
                x1 = p1[0], y1 = p1[1], z1 = p1[2];
                x2 = p2[0], y2 = p2[1], z2 = p2[2];
                a1 = (y0*z1 - y1*z0 - y0*z2 + y2*z0 + y1*z2 - y2*z1);
                b1 = -(x0*z1 - x1*z0 - x0*z2 + x2*z0 + x1*z2 - x2*z1);
                c1 = (x0*y1 - x1*y0 - x0*y2 + x2*y0 + x1*y2 - x2*y1);
                d1 = -(x0*y1*z2 - x0*y2*z1 - x1*y0*z2 + x1*y2*z0 + x2*y0*z1 - x2*y1*z0);
                a2 = 2 * (x1 - x0);
                b2 = 2 * (y1 - y0);
                c2 = 2 * (z1 - z0);
                d2 = x0 * x0 + y0 * y0 + z0 * z0 - x1 * x1 - y1 * y1 - z1 * z1;
                a3 = 2 * (x2 - x0);
                b3 = 2 * (y2 - y0);
                c3 = 2 * (z2 - z0);
                d3 = x0 * x0 + y0 * y0 + z0 * z0 - x2 * x2 - y2 * y2 - z2 * z2;
                xc = -(b1*c2*d3 - b1*c3*d2 - b2*c1*d3 + b2*c3*d1 + b3*c1*d2 - b3*c2*d1)/(a1*b2*c3 - a1*b3*c2 - a2*b1*c3 + a2*b3*c1 + a3*b1*c2 - a3*b2*c1);
                yc =  (a1*c2*d3 - a1*c3*d2 - a2*c1*d3 + a2*c3*d1 + a3*c1*d2 - a3*c2*d1)/(a1*b2*c3 - a1*b3*c2 - a2*b1*c3 + a2*b3*c1 + a3*b1*c2 - a3*b2*c1);
                zc = -(a1*b2*d3 - a1*b3*d2 - a2*b1*d3 + a2*b3*d1 + a3*b1*d2 - a3*b2*d1)/(a1*b2*c3 - a1*b3*c2 - a2*b1*c3 + a2*b3*c1 + a3*b1*c2 - a3*b2*c1);
                /*let A=[[a1,b1,c1],[a2,b2,c2],[a3,b3,c3]],
                 D=[[d1],[d2],[d3]];
                 // let a00=math.det(A.subset(math.index([1, 2], [1, 2])));
                 let yzsA=[[],[],[]];//A的余子式矩阵
                 for(let i=0;i<3;i++){
                 for(let j=0;j<3;j++){
                 let a=[];
                 for(let m=0;m<3;m++){
                 if(m!=i){
                 let am=[];
                 for(let n=0;n<3;n++){
                 if(n!=j)am.push(A[m][n])
                 }
                 a.push(am);
                 }
                 }
                 yzsA[i][j]=math.det(a);
                 }
                 }
                 let niA=math.multiply(yzsA,1/math.det(A));
                 let C=math.multiply(-1,math.multiply(niA,D));
                 xc=C[0];yc=C[1];zc=C[2];*/
                let R=Math.sqrt(Math.pow(x1-xc,2)+Math.pow(y1-yc,2)+Math.pow(z1-zc,2));

                //插补算法
                let u,v,w,u1,v1,w1;
                u=(y1-y0)*(z2-z1)-(z1-z0)*(y2-y1);
                v=(z1-z0)*(x2-x1)-(x1-x0)*(z2-z1);
                w=(x1-x0)*(y2-y1)-(y1-y0)*(x2-x1);
                u1=(y0-yc)*(z2-z0)-(z0-zc)*(y2-y0);
                v1=(z0-zc)*(x2-x0)-(x0-xc)*(z2-z0);
                w1=(x0-xc)*(y2-y0)-(y0-yc)*(x2-x0);
                let G=R/Math.sqrt(R*R+F*T*T),
                    delta=Math.asin(F*T/R),
                    H=u*u1+v*v1+w*w1,
                    E=F*T/(R*Math.sqrt(u*u+v*v+w*w));
                let theta;
                if(H>=0){
                    let tmp=Math.sqrt(Math.pow(x2-x0,2)+Math.pow(y2-y0,2)+Math.pow(z2-z0,2))/(2*R);
                    if(tmp>1)tmp=1;
                    else if(tmp<-1)tmp=-1;
                    theta=2*Math.asin(tmp);
                }
                else theta=2*Math.PI-2*Math.asin((Math.sqrt(Math.pow(x2-x0,2)+Math.pow(y2-y0,2)+Math.pow(z2-z0,2))/(2*R)).toFixed(4));
                let N=parseInt(theta/delta)+1;//插补次数
                let step=math.multiply(1/N,diffPos);
                let m=[],n=[],l=[],X=[x0],Y=[y0],Z=[z0];
                let i=0;
                let Ept=SLERP(p0,p2,N);//四元数插补
                this.timer = window.setInterval(function () {
                    let tPos,tAng,gamma,alpha,beta;
                    if(i+1>=N){
                        window.clearInterval(_this.timer);
                        _this.timer=null;
                        targetANG=inverseKinematics(p2);
                    }
                    else {
                        m[i]=v*(Z[i]-zc)-w*(Y[i]-yc);
                        n[i]=w*(X[i]-xc)-u*(Z[i]-zc);
                        l[i]=u*(Y[i]-yc)-v*(X[i]-xc);
                        X[i+1]=xc+G*(X[i]+E*m[i]-xc);
                        Y[i+1]=yc+G*(Y[i]+E*n[i]-yc);
                        Z[i+1]=zc+G*(Z[i]+E*l[i]-zc);
                        //
                        tPos=[X[i+1],Y[i+1],Z[i+1],Ept[i][0],Ept[i][1],Ept[i][2]];
                        tAng=inverseKinematics(tPos);
                        if(tAng==0){window.clearInterval(_this.timer);
                            _this.timer=null;
                            alert("超出工作空间或靠近奇异点！");
                            return;}
                        else {targetANG=tAng.concat();}
                        /*outerLoop://搜索N*step范围内有没有合适的姿态使得运动学反解有解
                         for(let k=0;k<5*N;k++){
                         for(let j=0;j<=1;j++){
                         let sign=j==1?1:-1;
                         gamma=p0[3]+step[3]*(i+1)+step[3]/5*k*sign;
                         beta=p0[4]+step[4]*(i+1)+step[4]/5*k*sign;
                         alpha=p0[5]+step[5]*(i+1)+step[5]/5*k*sign;
                         tPos=[X[i+1],Y[i+1],Z[i+1],gamma,beta,alpha];
                         tAng=inverseKinematics(tPos);
                         if(tAng==0){}
                         else {targetANG=tAng.concat();break outerLoop}
                         }
                         }

                         if(tAng==0){
                         window.clearInterval(_this.timer);
                         _this.timer=null;
                         alert("超出工作空间或靠近奇异点！");
                         return;
                         }*/
                    }
                    kinematicsEquation(targetANG);
                    if (_this.dataLine){
                        VILibrary.InnerObjects.dataUpdater(_this.dataLine);
                    }
                    if(i+1>=N){
                        if(executiveFlag){
                            instrIndex++;
                            if(instrIndex<instrSplit.length){
                                if(!singleStepFlag){
                                    setTimeout(function () {
                                        _this.instrCompiling();
                                    },100);
                                }
                                else {
                                    _this.stepsNum--;
                                    if(_this.stepsNum) _this.instrCompiling();
                                    else return
                                }
                                // _this.instrCompiling();
                            }
                            else {
                                executiveFlag=false;
                                return
                            }
                        }
                        else return;
                    }
                    i++;
                },T*1000);
            }
            this.changeTool=function(input){
                ToolFlag=input;
                if(_this.dataLine){VILibrary.InnerObjects.dataUpdater(this.dataLine);}
                let len=baseA.length;
                let A_add=Array(len).fill(0),D_add=Array(len).fill(0),THETA_add=Array(len).fill(0);
                switch(input){
                    case 1:
                        switch (robNumber){
                            case "a910":
                                A_add[len-1]+=34;
                                D_add[len-1]+=115-27.5;
                                break;
                            case "a120":
                                A_add[len-1]+=34;
                                D_add[len-1]+=115;
                                break;
                            case "k60":
                                A_add[len-1]+=68;
                                D_add[len-1]+=230;
                                break;
                            default:
                                break;
                        }
                        $('#setDO').enabled=true;
                        break;
                    case 0:
                        $('#setDO').enabled=false;
                        break;
                    case 2:
                        switch (robNumber) {
                            case "a120":
                                A_add[len - 1] += 50;
                                D_add[len - 1] += 104.5;
                                //THETA[len - 1] = Math.PI/4;
                                THETA_add[len - 2] -= Math.PI/4;
                                break;
                            default:
                                break;
                        }
                        $('#setDO').enabled=true;
                        break;
                    case 3:
                        switch (robNumber) {
                            case "a120":
                                A_add[len - 1] += 50;
                                D_add[len - 1] += 160;
                                THETA_add[len - 2] -= Math.PI/4;
                                //D_add[2] += 35.355339;
                                //THETA[len - 1] += Math.PI/4;
                                //ALPHA_add[len - 1] = -Math.PI/4;
                                break;
                            default:
                                break;
                        }
                        $('#setDO').enabled=false;
                        break;
                }
                A=math.add(baseA,A_add);
                D=math.add(baseD,D_add);
                THETA=math.add(baseTHETA,THETA_add);
                kinematicsEquation(currentANG);
            }
            this.setIO=function (input) {
                ToolDO=input;
                if(_this.dataLine){VILibrary.InnerObjects.dataUpdater(this.dataLine);}
                if(input){
                    switch (ToolFlag) {
                        case 1:
                            var trans = document.getElementById('Robot__box').getFieldValue('translation');
                            let boxPos=robNumber=="a360"?[trans.z,trans.x,trans.y]:[trans.x,-trans.z,trans.y];
                            for(var i=0;i<3;i++){
                                if(Math.abs(parseFloat(boxPos[i])-currentPOS[i])>10)break;
                                if(i==2)LoadFlag=true;
                            }
                            break;
                        case 2:
                            var i=0,j=0;
                            for(i=1;i<7;i++) {
                                var trans = document.getElementById('Robot__gongjian'+i).getFieldValue('translation');
                                let gongjianPos=robNumber=="a360"?[trans.z,trans.x,trans.y]:[trans.x,-trans.z,trans.y];
                                for(j=0;j<3;j++){
                                    if(Math.abs(parseFloat(gongjianPos[j])-currentPOS[j])>15)break;
                                    if(j==2) {
                                        LoadFlag=true;
                                        gongjianIndex=i;
                                    }
                                }
                            }
                            break;
                        default:
                            break;
                    }
                    document.getElementById("setDO").innerText='1';
                }
                else {
                    LoadFlag=false;
                    document.getElementById("setDO").innerText='0';
                }
                if(executiveFlag){
                    instrIndex++;
                    if(instrIndex<instrSplit.length){
                        if(!singleStepFlag){
                            _this.instrCompiling();
                        }
                        else{
                            _this.stepsNum--;
                            if(_this.stepsNum) _this.instrCompiling();
                            else return;
                        }

                    }
                    else {
                        executiveFlag=false;
                        return
                    }
                }
                else return;
            }
            //向量模（范数）
            function norm(input) {
                let a=input.concat();
                return Math.sqrt(a[0]*a[0]+a[1]*a[1]+a[2]*a[2]);
            }
            //向量叉积
            function crossProduct(a,b) {
                let c=[
                    a[1]*b[2]-a[2]*b[1],
                    a[2]*b[0]-a[0]*b[2],
                    a[0]*b[1]-a[1]*b[0]
                ]
                return c;
            }
            this.fk=function (i1) {
                let a=kinematicsEquation(i1,false);
                console.log(currentPOS)
            }
            function kinematicsEquation(input,flag) {//第二个参数指定是否仅用于计算
                let theta = input.concat();
                theta.unshift(0);
                theta.push(0);
                let x,y,z,EulerZ,EulerY,EulerX;
                //并联型
                let theta2=[],n=[];
                if(robNumber=='a360'){
                    // let R=200,r=45,L1=350,L2=800;
                    // let psi=[0,0,Math.PI/3*2,Math.PI/3*4];
                    let R=200,r=45,L1=235,L2=800;
                    let psi=[0,0,Math.PI/3*4,Math.PI/3*2];
                    let E=[];
                    for(let i=1;i<=3;i++){
                        E[i]=[
                            (R-r+L1*Math.cos(theta[i]))*Math.cos(psi[i]),
                            (R-r+L1*Math.cos(theta[i]))*Math.sin(psi[i]),
                            -L1*Math.sin(theta[i])
                        ]
                    }
                    let E12=[E[2][0]-E[1][0],E[2][1]-E[1][1],E[2][2]-E[1][2]],
                        E23=[E[3][0]-E[2][0],E[3][1]-E[2][1],E[3][2]-E[2][2]],
                        E31=[E[1][0]-E[3][0],E[1][1]-E[3][1],E[1][2]-E[3][2]];
                    let D1=norm(E12),
                        D2=norm(E23),
                        D3=norm(E31);
                    let H=(D1+D2+D3)/2;
                    let S=Math.sqrt(H*(H-D1)*(H-D2)*(H-D3)),
                        D_FE=D1*D2*D3/(4*S),
                        D_GF=Math.sqrt(D_FE*D_FE-D3*D3/4),//D开头代表向量长度
                        GF_=crossProduct(crossProduct(E12,E23),E31),//叉乘结果与GF同向
                        normGF_=norm(GF_),
                        N_GF=math.multiply(GF_,1/normGF_),//N开头代表单位向量
                        FP_=crossProduct(E12,E23),
                        N_FP=math.multiply(FP_,1/norm(FP_)),
                        D_FP=Math.sqrt(L2*L2-D_FE*D_FE);
                    let OG=math.multiply(math.add(E[1],E[3]),0.5),
                        GF=math.multiply(N_GF,D_GF),
                        FP=math.multiply(N_FP,D_FP),
                        OP=math.add(OG,math.add(GF,FP));
                    x=OP[0],y=OP[1],z=OP[2];
                    z-=274;
                    EulerX=3.1415926,EulerY=0,EulerZ=0;
                    let EP=[],AC=[];
                    for(let i=1;i<=3;i++){
                        EP[i]=math.add(OP,math.multiply(-1,E[i]));
                        AC[i]=[
                            L1*Math.cos(theta[i])*Math.cos(psi[i]),
                            L1*Math.cos(theta[i])*Math.sin(psi[i]),
                            -L1*Math.sin(theta[i])
                        ];
                        let N=crossProduct(AC[i],EP[i]);//计算转轴
                        n[i-1]=math.multiply(N,1/norm(N));
                        theta2[i-1]=Math.acos(math.multiply(AC[i],EP[i])/L2/L1);//计算转角
                        let RR=[
                            [Math.cos(psi[i]),Math.sin(psi[i]),0],
                            [-Math.sin(psi[i]),Math.cos(psi[i]),0],
                            [0,0,1]
                        ];
                        let RR2=[
                            [Math.cos(theta[i]),0,-Math.sin(theta[i])],
                            [0,1,0],
                            [Math.sin(theta[i]),0,Math.cos(theta[i])],
                        ]
                        n[i-1]=math.multiply(RR2,math.multiply(RR,n[i-1]));//将世界坐标系下的向量转换为某一轴坐标系下的向量
                        // let aa=n[i-1][1]*n[i-1][1]+n[i-1][0]*n[i-1][0]+n[i-1][2]*n[i-1][2];
                        // console.log(norm(math.add(OP,math.multiply(-1,OP1)))<0.05);
                    }
                    targetANG2=targetANG.concat(theta2,n[0],n[1],n[2],[x,y,z]);
                    if(ToolFlag){
                        z-=115;
                        y+=34;
                    }
                }
                //串联型
                else if (robNumber=="epson"){
                    x=theta[1]+98.5;
                    y=theta[2]-75.5;
                    z=theta[3]+145;
                    EulerZ=0;
                    EulerY=0;
                    EulerX=Math.PI/2;
                    if(ToolFlag){
                        y-=115;
                        z-=54;
                    }
                }
                else{
                    let alpha=ALPHA.concat();
                    let a=A.concat();
                    let d=D.concat();
                    /*let a=[0,0,0,270,70,0,0,0],
                     d=[290,0,0,0,302,0,0,72];*/

                    let t=[],T;
                    if(robNumber=="a910"){
                        d[3]=-theta[3];
                        theta[3]=0;
                    }
                    // else {
                    let len=a.length;
                    theta=math.add(theta,THETA);
                    for(let i=0;i<len;i++)
                    {
                        t[i]=[
                            [math.cos(theta[i]),
                                -math.sin(theta[i]),
                                0,
                                a[i]
                            ],
                            [math.sin(theta[i])*math.cos(alpha[i]),
                                math.cos(theta[i])*math.cos(alpha[i]),
                                -math.sin(alpha[i]),
                                -d[i]*math.sin(alpha[i])
                            ],
                            [
                                math.sin(theta[i])*math.sin(alpha[i]),
                                math.cos(theta[i])*math.sin(alpha[i]),
                                math.cos(alpha[i]),
                                d[i]*math.cos(alpha[i])
                            ],
                            [0,0,0,1],
                        ]
                    }
                    T=t[len-1];
                    for(let i=len-2;i>=0;i--){
                        T=math.multiply(t[i],T)
                    }
                    // }
                    x=T[0][3];y=T[1][3];z=T[2][3];
                    console.log(T)
                    for(let i=0;i<=3;i++){
                        for(let j=0;j<=3;j++){
                            T[i][j]= parseFloat((T[i][j]).toFixed(4));
                        }
                    }
                    //X-Y-Z顺序==ZYX顺序
                    let cosBeta=Math.sqrt(Math.pow((T[0][0]),2)+Math.pow(T[1][0],2));
                    //计算三个欧拉角
                    if(cosBeta!=0){
                        EulerY=Math.atan2(-T[2][0],cosBeta);
                        if(EulerY>Math.PI/2||EulerY<-Math.PI/2){cosBeta=-cosBeta;EulerY=Math.atan2(-T[2][0],cosBeta);}
                        EulerZ=Math.atan2(T[1][0],T[0][0]);
                        EulerX=Math.atan2(T[2][1],T[2][2]);
                    }
                    else{
                        EulerY=Math.PI/2;
                        EulerZ=0;
                        EulerX=Math.atan2(T[0][1],T[1][1]);
                    }
                }

                if(flag){
                    let pos=[x,y,z];
                    return pos;//若仅用于计算目标点，不再执行后面代码
                }
                document.getElementById("posX").value=x.toFixed(2);
                document.getElementById("posY").value=y.toFixed(2);
                document.getElementById("posZ").value=z.toFixed(2);
                document.getElementById("eulerX").value=(EulerX*180/Math.PI).toFixed(2);
                document.getElementById("eulerY").value=(EulerY*180/Math.PI).toFixed(2);
                document.getElementById("eulerZ").value=(EulerZ*180/Math.PI).toFixed(2);
                currentPOS=[x,y,z,EulerX,EulerY,EulerZ];
                currentANG=targetANG.concat();
                if(executiveFlag||(moveType!='J')){
                    for(let i=0;i<targetANG.length;i++){
                        let a;
                        if(robNumber=="a910"&&i==2||robNumber=="epson")a=(targetANG[i]).toFixed(2);
                        else a=(targetANG[i]*180/Math.PI).toFixed(2);
                        document.getElementById("angInput"+(i)).value=a;
                        document.getElementById("angTxt"+(i)).value=a;
                    }
                }
                if(executiveFlag){//若当前执行控制指令，将当前点添加至轨迹线，并更新页面上的关节角度
                    let point=document.getElementById("Robot__LineSet_points").getAttribute('point');
                    if(robNumber=="a360")point+=" "+y+" "+z+" "+x;
                    else point+=" "+x+" "+z+" "+(-y);
                    document.getElementById("Robot__LineSet_points").setAttribute('point',point);
                    let point_Index=document.getElementById("Robot__LineSet_index").getAttribute('coordIndex');
                    let last_Index=parseInt(point_Index.match(/\d+$/))+1;
                    point_Index=point_Index+' '+last_Index;
                    document.getElementById("Robot__LineSet_index").setAttribute('coordIndex',point_Index);
                }
                //若夹持工件，工件坐标与末端坐标保持一致
                if(LoadFlag&&(!flag)){
                    switch (ToolFlag) {
                        case 1:
                            var trans = document.getElementById('Robot__box').getFieldValue('translation');
                            if(robNumber=="a360"){
                                trans.x=currentPOS[1];
                                trans.y=currentPOS[2];
                                trans.z=currentPOS[0];
                            }
                            else {
                                trans.x=currentPOS[0];
                                trans.y=currentPOS[2];
                                trans.z=-currentPOS[1];
                            }
                            document.getElementById('Robot__box').setFieldValue('translation',trans);
                            break;
                        case 2:
                            var trans = document.getElementById('Robot__gongjian'+gongjianIndex).getFieldValue('translation');
                            if(robNumber=="a360"){
                                trans.x=currentPOS[1];
                                trans.y=currentPOS[2];
                                trans.z=currentPOS[0];
                            }
                            else {
                                trans.x=currentPOS[0];
                                trans.y=currentPOS[2]-12.308;
                                trans.z=-currentPOS[1];
                            }
                            document.getElementById('Robot__gongjian'+gongjianIndex).setFieldValue('translation',trans);
                            break;
                        default:
                            break;
                    }
                }

            }
            function inverseKinematics(input) {
                let a=A.concat();a.shift();//a[i-1]
                let d=D.concat();//d[i]
                let x=input[0],
                    y=input[1],
                    z=input[2],
                    gamma=input[3],
                    beta=input[4],
                    alpha=input[5];
                let ca=Math.cos(alpha),sa=Math.sin(alpha),
                    cb=Math.cos(beta),sb=Math.sin(beta),
                    cy=Math.cos(gamma),sy=Math.sin(gamma);
                let theta,resultAng=[];
                let R=[[ca*cb,ca*sb*sy-sa*cy,ca*sb*cy+sa*sy,x],[sa*cb,sa*sb*sy+ca*cy,sa*sb*cy-ca*sy,y],[-sb,cb*sy,cb*cy,z],[0,0,0,1]];
                if(robNumber=="a910"){
                    let Tt=[[1,0,0,-a[a.length-1]],[0,1,0,0],[0,0,1,-d[d.length-1]],[0,0,0,1]];
                    let T=math.multiply(R,Tt);
                    let nx=T[0][0],ny=T[1][0],nz=T[2][0],
                        px=T[0][3],py=T[1][3],pz=T[2][3];
                    // let nx=ca*cb,ny=sa*cb,nz=-sb;
                    theta=[[],[]];
                    let r=Math.sqrt(px*px+py*py),
                        AA=(px*px+py*py+a[1]*a[1]-a[2]*a[2])/(2*a[1]*r),
                        phi=Math.atan(px/py);
                    if(AA>1)AA=1;
                    else if(AA<-1)AA=-1;
                    theta[0][0]=Math.atan(AA/Math.sqrt(1-AA*AA))-phi;
                    theta[1][0]=Math.atan(AA/(-Math.sqrt(1-AA*AA)))-phi;
                    for(let i=0;i<2;i++){
                        let tmp=(px*px+py*py-a[1]*a[1]-a[2]*a[2])/(2*a[1]*a[2]);
                        if(tmp>1)tmp=1;
                        else if(tmp<-1)tmp=-1;
                        theta[i][1]=Math.acos(tmp);//胡杰
                        // theta[i][1]=Math.atan((r*Math.cos(theta[i][0]+phi))/(r*Math.sin(theta[i][0]+phi)-a[1]));
                        // let aaa0=Math.acos((r*Math.cos(theta[i][0]+phi)-a[1])/a[2]);
                        // let aaa1=Math.acos((px*px+py*py-a[1]*a[1]-a[2]*a[2])/(2*a[1]*a[2]));
                        // let aaa2=Math.atan(-(r*Math.sin(theta[i][0]+phi))/(r*Math.cos(theta[i][0]+phi)-a[1]))
                        theta[i][2]=pz-d[1];
                        theta[i][3]=theta[i][1]-Math.asin(-nx*Math.sin(theta[i][0])+ny*Math.cos(theta[i][0]));
                        let inRange=true;
                        for(let j=0;j<theta[i].length;j++){
                            if((theta[i][j]>=Range[j][0])&&(theta[i][j]<=Range[j][1]))continue;
                            else {inRange=false;break;}
                        }
                        if(inRange){
                            resultAng.push(theta[i].concat());
                        }
                        else {
                            continue;
                        }
                    }
                }
                else if(robNumber=='a360'){
                    if(ToolFlag){
                        z+=115;
                        y-=34;
                    }
                    z=z+274;
                    let R=200,r=45,l=[0,235,800];
                    theta=[[],[],[],[]]
                    let psi=[0,0,Math.PI/3*4,Math.PI/3*2];
                    /*let psi=[0,Math.PI,-Math.PI/3,Math.PI/3];
                     let a=[[],[],[],[]],k=[[],[],[],[]],phi=[];
                     theta=[[],[],[],[]];
                     let T1=0,T2=1;
                     // let T1=Math.cos(alpha)*Math.sin(beta)*Math.sin(gamma)-Math.sin(alpha)*Math.cos(gamma),//0
                     // T2=Math.sin(alpha)*Math.sin(beta)*Math.sin(gamma)+Math.cos(alpha)*Math.cos(gamma),//-1
                     // T3=Math.cos(alpha)*Math.sin(beta)*Math.cos(gamma)+Math.sin(alpha)*Math.sin(gamma),//0
                     // T4=Math.sin(alpha)*Math.sin(beta)*Math.cos(gamma)-Math.cos(alpha)*Math.sin(gamma);//0
                     for(let i=1;i<=3;i++){
                     a[i][1]=r/2*(Math.sin(psi[i])*Math.sin(psi[i])-T1*Math.sin(2*psi[i])+2*T2*Math.cos(psi[i])*Math.cos(psi[i])-2)+y*Math.cos(psi[i])-x*Math.sin(psi[i]);
                     a[i][2]=z;
                     phi[i]=Math.acos((a[i][1]*a[i][1]+a[i][2]*a[i][2]-l[1]*l[1]-l[2]*l[2])/(2*l[1]*l[2]));
                     k[i][1]=-2*l[1]*(l[1]+l[2]*Math.cos(phi[i]));
                     k[i][2]=-2*l[1]*l[2]*Math.sin(phi[i]);
                     k[i][3]=a[i][1]*a[i][1]+a[i][2]*a[i][2]+l[1]*l[1]-l[2]*l[2];
                     theta[i][1]=Math.PI/2-2*Math.atan((-k[i][2]+Math.sqrt(k[i][1]*k[i][1]+k[i][2]*k[i][2]-k[i][3]*k[i][3]))/(k[i][3]-k[i][1]));
                     theta[i][2]=Math.PI/2-2*Math.atan((-k[i][2]-Math.sqrt(k[i][1]*k[i][1]+k[i][2]*k[i][2]-k[i][3]*k[i][3]))/(k[i][3]-k[i][1]));
                     //[ 4.078856157810996, 1.570796326794896]
                     }*/
                    // let psi=[0,-Math.PI/2,-Math.PI/6*7,Math.PI/6];
                    let I,J,K;
                    for(let i=1;i<=3;i++) {
                        I=2*l[1]*((x+r*Math.cos(psi[i])-R*Math.cos(psi[i]))*Math.cos(psi[i])+(y+r*Math.sin(psi[i])-R*Math.sin(psi[i]))*Math.sin(psi[i]));
                        J=2*l[1]*z;
                        K=Math.pow(x+(r-R)*Math.cos(psi[i]),2)+Math.pow(y+(r-R)*Math.sin(psi[i]),2)+z*z+l[1]*l[1]-l[2]*l[2];
                        theta[i][1]=2*Math.atan((-J-Math.sqrt(J*J+I*I-K*K))/(K+I));
                        theta[i][2]=2*Math.atan((-J+Math.sqrt(J*J+I*I-K*K))/(K+I));
                    }
                    for(let i=1;i<theta[1].length;i++){
                        if(theta[1][i]>=Range[0][0]&&theta[1][i]<=Range[0][1])for(let j=1;j<theta[2].length;j++){
                            if(theta[2][i]>=Range[1][0]&&theta[2][i]<=Range[1][1])for(let k=1;k<theta[3].length;k++){
                                if(theta[3][i]>=Range[2][0]&&theta[3][i]<=Range[2][1])resultAng.push([theta[1][i],theta[2][j],theta[3][k]]);
                                //100,0,-972.5->-0.2103,0.14666,0.14666
                            }
                        }
                    }
                }
                else if(robNumber=="epson"){
                    if(ToolFlag){
                        y+=115;
                        z+=54;
                    }
                    theta=[[x-98.5,y+75.5,z-145]];
                    let inRange=true;
                    for(let i=0;i<theta[0].length;i++){
                        if(theta[0][i]>=Range[i][0]&&theta[0][i]<=Range[i][1])continue;
                        else inRange=false;break;
                    }
                    if(inRange)resultAng=theta.concat();
                }
                else {
                    let T0_s=[[1,0,0,0],[0,1,0,0],[0,0,1,-d[0]],[0,0,0,1]];
                    let Tt_6=[[-1,0,0,a[6]],[0,-1,0,0],[0,0,1,-d[7]],[0,0,0,1]];
                    let T=math.multiply(math.multiply(T0_s,R),Tt_6);
                    let nx=T[0][0],ox=T[0][1],ax=T[0][2],px=T[0][3],
                        ny=T[1][0],oy=T[1][1],ay=T[1][2],py=T[1][3],
                        nz=T[2][0],oz=T[2][1],az=T[2][2],pz=T[2][3];
                    theta=[[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0]];
                    let diff=math.multiply(THETA.concat(),-1);diff.shift();diff.pop();//D-H模型中的theta与实际的转动量的差值（8->6）
                    for(let i=0;i<=7;i++){
                        if(i<4) theta[i][0]=Math.atan2(py,px)-Math.atan2(0,Math.sqrt(px*px+py*py));
                        else    theta[i][0]=Math.atan2(py,px)-Math.atan2(0,-Math.sqrt(px*px+py*py));
                        let h=px*px+py*py+pz*pz+a[1]*a[1];
                        let g=2*a[1]*Math.cos(theta[i][0])*px+2*a[1]*Math.sin(theta[i][0])*py+a[3]*a[3]+d[4]*d[4]+a[2]*a[2];
                        let k=(h-g)/(2*a[2]);
                        if(i<2||i>5) theta[i][2]=Math.atan2(a[3],d[4])-Math.atan2(k,Math.sqrt(Math.pow(a[3],2)+Math.pow(d[4],2)-Math.pow(k,2)));
                        else theta[i][2]=Math.atan2(a[3],d[4])-Math.atan2(k,-Math.sqrt(Math.pow(a[3],2)+Math.pow(d[4],2)-Math.pow(k,2)));
                        let s23=((-a[3]-a[2]*Math.cos(theta[i][2]))*pz+(Math.cos(theta[i][0])*px+Math.sin(theta[i][0])*py-a[1])*(a[2]*Math.sin(theta[i][2])-d[4]))/(pz*pz+Math.pow(Math.cos(theta[i][0])*px+Math.sin(theta[i][0])*py-a[1],2));
                        let c23=((-d[4]+a[2]*Math.sin(theta[i][2]))*pz+(Math.cos(theta[i][0])*px+Math.sin(theta[i][0])*py-a[1])*(a[2]*Math.cos(theta[i][2])+a[3]))/(pz*pz+Math.pow(Math.cos(theta[i][0])*px+Math.sin(theta[i][0])*py-a[1],2));
                        theta[i][1]=Math.atan2(s23,c23)-theta[i][2];
                        theta[i][3]=Math.atan2(-ax*Math.sin(theta[i][0])+ay*Math.cos(theta[i][0]),-ax*Math.cos(theta[i][0])*Math.cos(theta[i][1]+theta[i][2])-ay*Math.sin(theta[i][0])*Math.cos(theta[i][1]+theta[i][2])+az*Math.sin(theta[i][1]+theta[i][2]));
                        if(i%2){theta[i][3]+=Math.PI;}
                        let s5=-ax*(Math.cos(theta[i][0])*Math.cos(theta[i][1]+theta[i][2])*Math.cos(theta[i][3])+Math.sin(theta[i][0])*Math.sin(theta[i][3]))-ay*(Math.sin(theta[i][0])*Math.cos(theta[i][1]+theta[i][2])*Math.cos(theta[i][3])-Math.cos(theta[i][0])*Math.sin(theta[i][3]))+az*Math.sin(theta[i][1]+theta[i][2])*Math.cos(theta[i][3]);
                        let c5=-(ax*Math.cos(theta[i][0])*Math.sin(theta[i][1]+theta[i][2])+ay*Math.sin(theta[i][0])*Math.sin(theta[i][1]+theta[i][2])+az*Math.cos(theta[i][1]+theta[i][2]));
                        theta[i][4]=Math.atan2(s5,c5);
                        let s6=-nx*(Math.cos(theta[i][0])*Math.cos(theta[i][1]+theta[i][2])*Math.sin(theta[i][3])-Math.sin(theta[i][0])*Math.cos(theta[i][3]))-ny*(Math.sin(theta[i][0])*Math.cos(theta[i][1]+theta[i][2])*Math.sin(theta[i][3])+Math.cos(theta[i][0])*Math.cos(theta[i][3]))+nz*Math.sin(theta[i][1]+theta[i][2])*Math.sin(theta[i][3]);
                        let c6=-ox*(Math.cos(theta[i][0])*Math.cos(theta[i][1]+theta[i][2])*Math.sin(theta[i][3])-Math.sin(theta[i][0])*Math.cos(theta[i][3]))-oy*(Math.sin(theta[i][0])*Math.cos(theta[i][1]+theta[i][2])*Math.sin(theta[i][3])+Math.cos(theta[i][0])*Math.cos(theta[i][3]))+oz*Math.sin(theta[i][1]+theta[i][2])*Math.sin(theta[i][3]);
                        theta[i][5]=Math.atan2(s6,c6);

                        //以上计算出的是D-H模型中的theta,与实际的转动量差一个theta（diff)的值
                        theta[i]=math.add(theta[i],diff);
                        let inRange=true;
                        for(let j=0;j<theta[i].length;j++){
                            if((theta[i][j]>=Range[j][0])&&(theta[i][j]<=Range[j][1]))continue;
                            else {inRange=false;break;}
                        }
                        if(inRange){
                            resultAng.push(theta[i].concat());
                        }
                        else {
                            continue;
                        }
                        /*
                         if(Math.abs(theta[i][0])< Math.PI*185/180&&theta[i][1]>-135/180*Math.PI&&theta[i][1]<35/180*Math.PI&&theta[i][2]>-120/180*Math.PI&&theta[i][2]<158/180*Math.PI&&Math.abs(theta[i][3])<350/180*Math.PI&&Math.abs(theta[i][4])<119/180*Math.PI&&Math.abs(theta[i][5])<350/180*Math.PI){
                         resultAng[j]=theta[i].concat();
                         j++;
                         }
                         else {
                         continue;
                         }*/
                    }
                }
                /*for(let i=0;i<theta.length;i++){
                 let inRange=true;
                 for(let j=0;j<theta[i].length;j++){
                 if((theta[i][j]>=Range[j][0])&&(theta[i][j]<=Range[j][1]))continue;
                 else {inRange=false;break;}
                 }
                 if(inRange){
                 resultAng.push(theta[i].concat());
                 }
                 else {
                 continue;
                 }
                 }*/

                if(resultAng==0&&resultAng[0]==undefined){return 0}
                else if (resultAng.length==1){return resultAng[0]}
                else {
                    let runTime=[];
                    for(let m=0;m<resultAng.length;m++){
                        // resultAng[m][1]+=Math.PI/2;
                        let resultDiff=math.add(resultAng[m],math.multiply(-1,currentANG));
                        runTime[m]=0;
                        for(let n=0;n<resultAng[m].length;n++){
                            runTime[m]+=Math.abs(math.multiply(resultDiff[n],1/OMEGA[n]));
                        }
                    }
                    let minTime=Math.min.apply(Math,runTime);
                    let minAng=resultAng[runTime.indexOf(minTime)];
                    return minAng;
                }
            }
        }
        static get cnName() {

            return '指令解析';
        }

        static get defaultWidth() {

            return '550px';
        }

        static get defaultHeight() {

            return '300px';
        }
    },
    KinematicsEquationVI:class KinematicsEquationVI extends TemplateVI {
        constructor(VICanvas, draw3DFlag) {
            super(VICanvas);
            const _this = this;
            this.name = 'Instruction_1VI';
            let nextAng=[0,0,0,0,0,0];
            this.getData=function (dataType) {

            }
            this.setData=function (input,inputType) {
                if(Array.isArray(input)) {
                    let nextAng = input.concat();
                    kinematicsEquation(nextAng)
                    console.log(inputType)
                    /*  //inputType=1,正运动学
                     if(inputType==1){

                     kinematicsEquation(nextAng)
                     }
                     // inputType=-1,逆运动学
                     else if(inputType==-1){

                     }
                     else {
                     console.log('KinematicsEquationVI: Input type error');
                     return;
                     }*/
                }
                else {
                    console.log('KinematicsEquationVI: Input value error');
                    return;
                }

            }
            function kinematicsEquation(theta) {
                /*let alpha=[0,-Math.PI/2,0,-Math.PI/2,Math.PI/2,-Math.PI/2];
                 let a=[0,0,270,70,0,0],
                 d=[0,0,0,302,0,0];
                 let t=[];*/
                let alpha=[0,0,-Math.PI/2,0,-Math.PI/2,Math.PI/2,-Math.PI/2,0];
                let a=[0,0,0,270,70,0,0,0],
                    d=[290,0,0,0,302,0,0,72];
                theta.push(Math.PI);
                theta.unshift(0);
                theta[2]-=Math.PI/2;
                let t=[],T;
                for(let i=0;i<=7;i++)
                {
                    t[i]=[
                        [math.cos(theta[i]),
                            -math.sin(theta[i]),
                            0,
                            a[i]
                        ],
                        [math.sin(theta[i])*math.cos(alpha[i]),
                            math.cos(theta[i])*math.cos(alpha[i]),
                            -math.sin(alpha[i]),
                            -d[i]*math.sin(alpha[i])
                        ],
                        [
                            math.sin(theta[i])*math.sin(alpha[i]),
                            math.cos(theta[i])*math.sin(alpha[i]),
                            math.cos(alpha[i]),
                            d[i]*math.cos(alpha[i])
                        ],
                        [0,0,0,1],
                    ]
                }
                T=t[7];
                for(let i=6;i>=0;i--){
                    T=math.multiply(t[i],T)
                }
                // console.log("T",T,"theta",theta);
                document.getElementById("posX").value=(T[0][3]).toFixed(1);
                document.getElementById("posY").value=(T[1][3]).toFixed(1);
                document.getElementById("posZ").value=(T[2][3]).toFixed(1);
                for(let i=0;i<=3;i++){
                    for(let j=0;j<=3;j++){
                        T[i][j]= (T[i][j]).toFixed(4);
                    }
                }
                let EulerZ,EulerY,EulerX;
                /*
                 //Y-Z-X顺序
                 EulerZ=Math.atan2(T[1][0],T[0][0]);
                 EulerY=Math.atan2(-T[2][0],(T[0][0]*Math.cos(EulerZ)+T[1][0]*Math.sin(EulerZ)));
                 EulerX=Math.atan2((T[0][2]*Math.sin(EulerZ)-T[1][2]*Math.cos(EulerZ)),(T[1][1]*Math.cos(EulerZ)-T[0][1]*Math.sin(EulerZ)));
                 EulerX*=180/Math.PI;
                 EulerY*=180/Math.PI;
                 EulerZ*=180/Math.PI;*/
                //X-Y-Z顺序
                let cosBeta=Math.sqrt(Math.pow((T[0][0]),2)+Math.pow(T[1][0],2));
                if(cosBeta!=0){//计算三个欧拉角
                    EulerY=Math.atan2(-T[2][0],cosBeta)*180/Math.PI;
                    if(EulerY>90||EulerY<-90){cosBeta=-cosBeta;EulerY=Math.atan2(-T[2][0],cosBeta)*180/Math.PI;}
                    EulerZ=Math.atan2(T[1][0],T[0][0])*180/Math.PI;
                    EulerX=Math.atan2(T[2][1],T[2][2])*180/Math.PI;
                }
                else{
                    EulerY=90;
                    EulerZ=0;
                    EulerX=Math.atan2(T[0][1],T[1][1])*180/Math.PI;
                }
                // let EulerZ=alpha;
                // let EulerY=beta;
                // let EulerX=gamma;
                document.getElementById("eulerX").value=EulerX.toFixed(1);
                document.getElementById("eulerY").value=EulerY.toFixed(1);
                document.getElementById("eulerZ").value=EulerZ.toFixed(1);

            }

        }
        static get cnName() {

            return '运动学方程';
        }

        static get defaultWidth() {

            return '550px';
        }

        static get defaultHeight() {

            return '300px';
        }
    },
    Robot120VI:class Robot120VI extends RobotTemplateVI {
        constructor(VICanvas, draw3DFlag) {
            super(VICanvas,draw3DFlag);
            const _this = this;
            this.robotURL='assets/irb120_x3d/robot120.x3d';
            this.draw(draw3DFlag);
            this.name = 'ABB_irb20';
            this.currentLen=[166,124,270,70,150,152,59,13];
            this.currentScal=[1,1,1,1,1,1,1,1];
            this.initLen=[166,124,270,70,150,152,59,13];
            this.a_d=[290,270,70,302,72];

        }
        static get cnName() {

            return 'ABB_irb20';
        }

        static get defaultWidth() {

            return '550px';
        }

        static get defaultHeight() {

            return '300px';
        }
    },
    Robotkr60VI:class Robotkr60VI extends RobotTemplateVI {
        constructor(VICanvas, draw3DFlag) {
            super(VICanvas,draw3DFlag);
            const _this = this;
            // RobotTemplateVI.prototype.robotURL='assets/kuka_KR60HA_x3d/kuka_kr60.x3d';
            // RobotTemplateVI.prototype.draw(draw3DFlag);
            this.robotURL='assets/kuka_KR60HA_x3d/kuka_kr60.x3d';
            this.draw(draw3DFlag);
            this.name = 'KUKA_kr60';

            /*this.currentLen=[166,124,270,70,150,152,59,13];
             this.currentScal=[1,1,1,1,1,1,1,1];
             this.initLen=[166,124,270,70,150,152,59,13];*/
            this.a_d=[815,850,145,820,170,350];
        }
        static get cnName() {

            return 'KUKA_kr60';
        }

        static get defaultWidth() {

            return '550px';
        }

        static get defaultHeight() {

            return '300px';
        }
    },
    Robot910scVI:class RobotIrb910scVI extends RobotTemplateVI {
        constructor(VICanvas, draw3DFlag) {
            super(VICanvas,draw3DFlag);
            const _this = this;
            this.robotURL='assets/irb910sc_x3d/irb910sc.x3d';
            this.draw(draw3DFlag);
            this.name = 'ABB_IRB910sc';
            this.jiontsControl=function(TargetANG){
                let rotat="0,0,0,0";
                for(let i=0;i<=3;i++){
                    if(i==2) {
                        let translation="250,"+TargetANG[i]+",0"
                        document.getElementById("Robot__link"+i).setAttribute('translation',translation);
                    }
                    else {
                        if(i==3)rotat="0,1,0,"+(-TargetANG[i]);//！！！！最后一轴正方向相反！！！！！
                        else rotat="0,1,0,"+TargetANG[i];
                        document.getElementById("Robot__link"+i).setAttribute('rotation',rotat);
                    }
                }
                // CurrentANG=TargetANG;
            }
            /*this.currentLen=[166,124,270,70,150,152,59,13];
             this.currentScal=[1,1,1,1,1,1,1,1];
             this.initLen=[166,124,270,70,150,152,59,13];*/
            this.a_d=[815,850,145,820,170,350];
        }
        static get cnName() {

            return 'KUKA_kr60';
        }

        static get defaultWidth() {

            return '550px';
        }

        static get defaultHeight() {

            return '300px';
        }
    },
    Robot360VI:class RobotIrb360VI extends RobotTemplateVI {
        constructor(VICanvas, draw3DFlag) {
            super(VICanvas,draw3DFlag);
            const _this = this;
            this.robotURL='assets/irb360_x3d/irb360.x3d';
            this.draw(draw3DFlag);
            this.name = 'ABB_IRB360';
            this.jiontsControl=function(TargetANG){
                let rotat="0,0,0,0";
                for(let i=0;i<3;i++){
                    //主动轴转角
                    rotat="1,0,0,"+TargetANG[i];
                    document.getElementById("Robot__link"+i+"_1").setAttribute('rotation',rotat);
                    //从动轴转角和旋转轴
                    rotat=""+(TargetANG[(2+i)*3+1])+","+(TargetANG[(2+i)*3+2])+","+(TargetANG[(2+i)*3+0])+","+TargetANG[i+3];
                    document.getElementById("Robot__link"+(i)+"_2r").setAttribute('rotation',rotat);
                    document.getElementById("Robot__link"+(i)+"_2l").setAttribute('rotation',rotat);
                }
                let trans=(TargetANG[16]).toFixed(2)+","+TargetANG[17].toFixed(2)+","+(TargetANG[15]).toFixed(2);
                document.getElementById("Robot__plate").setAttribute('translation',trans);
                // CurrentANG=TargetANG;
            }
            /*this.currentLen=[166,124,270,70,150,152,59,13];
             this.currentScal=[1,1,1,1,1,1,1,1];
             this.initLen=[166,124,270,70,150,152,59,13];*/
            // this.a_d=[815,850,145,820,170,350];
        }
        static get cnName() {

            return 'KUKA_kr60';
        }

        static get defaultWidth() {

            return '550px';
        }

        static get defaultHeight() {

            return '300px';
        }
    },
    RobotEpsonVI:class RobotEpsonVI extends RobotTemplateVI {
        constructor(VICanvas, draw3DFlag) {
            super(VICanvas,draw3DFlag);
            const _this = this;
            this.robotURL='assets/epson_hms3_x3d/epson.x3d';
            this.draw(draw3DFlag);
            this.name = 'EPSON_HMS-3Axis';
            this.jiontsControl=function(TargetANG){
                let trans="0,0,0";
                trans="0,0,"+(-TargetANG[1]);
                document.getElementById("Robot__link0").setAttribute('translation',trans);
                trans=""+(TargetANG[0])+",0,0";
                document.getElementById("Robot__link1").setAttribute('translation',trans);
                trans="0,"+(TargetANG[2])+",0";
                document.getElementById("Robot__link2").setAttribute('translation',trans);
            }
            /*this.currentLen=[166,124,270,70,150,152,59,13];
             this.currentScal=[1,1,1,1,1,1,1,1];
             this.initLen=[166,124,270,70,150,152,59,13];*/
            // this.a_d=[815,850,145,820,170,350];
        }
        static get cnName() {

            return 'KUKA_kr60';
        }

        static get defaultWidth() {

            return '550px';
        }

        static get defaultHeight() {

            return '300px';
        }
    },
    ToolVI:class ToolVI extends TemplateVI{
        constructor(VICanvas, draw3DFlag,robNum) {
            super(VICanvas, draw3DFlag,robNum);
            const _this = this;
            let haveTool=false;
            let jiajuTrans="0,0,0",jiajuScal="1,1,1",jiajuRotate="1,0,0,0",boxTrans='300,20,-300',jiajuRotate2='0,0,1,0',boxSize='40,40,40',qijiaTrans="13,0,0",qijiaRotate="1,0,0,-0.785398163";
            let gongjianTrans1='461.395,0,285.5',gongjianTrans2='461.395,0,225.5',gongjianTrans3='460,0,165.5';
            let gongjianTrans4='401.395,0,285.609',gongjianTrans5='401.395,0,225.609',gongjianTrans6='401.395,0,165.609';
            /*function draw() {
             switch(robNum){
             case "k60":
             jiajuScal="2,2,2";
             jiajuTrans="15,0,0"
             break;
             case "a910":
             jiajuRotate='0,0,1,-1.5707963';
             jiajuTrans="0,65,0";
             boxTrans='300,40,-300';
             break;
             case "a360":
             jiajuRotate='0,0,1,-1.5707963';
             jiajuTrans="0,5,0";
             boxTrans='250,-1180,-250';
             break;
             case "epson":
             jiajuRotate='0,1,0,-1.5707963';
             jiajuRotate2='1,0,0,3.1415926';
             // jiajuRotate="0.45749571099781405,-0.7624928516630234,-0.45749571099781405,2.2834529548131237"
             // jiajuRotate="0.5144957554275265,-0.6859943405700353,-0.5144957554275265,1.9390642202315367"
             jiajuTrans="98.5,125,58.5";
             boxTrans='400,20,-400'
             break;
             case "a120":default:break;
             }
             var toolSwitch="<switch whichChoice='-1' DEF='TOOL' nameSpaceName id='Robot__TOOL'>" +
             "<Transform translation="+jiajuTrans+" scale="+jiajuScal+" rotation="+jiajuRotate+">" +
             "<Transform rotation="+jiajuRotate2+">"+
             "<Transform DEF='jiajuL' translation='0 0 10' nameSpaceName id='Robot__jiajuL'>" +
             "<inline url='../tool/jiajuL.x3d' > </inline>" +
             "</Transform>" +
             "<Transform DEF='jiajuR' translation='0 0 -10' nameSpaceName id='Robot__jiajuR'>" +
             "<inline url='../tool/jiajuR.x3d'> </inline>" +
             "</Transform>" +
             "<inline url='../tool/jiaju.x3d'> </inline>" +
             "</Transform>" +
             "</Transform>" +
             "<Transform translation="+qijiaTrans+" scale="+jiajuScal+" rotation="+qijiaRotate+">" +
             "<Transform rotation="+jiajuRotate2+">"+
             "<Transform DEF='qijiaL' translation='0 0 -20' nameSpaceName id='Robot__qijiaL'>" +
             "<inline url='../qijia/jiajuL.x3d' > </inline>" +
             "</Transform>" +
             "<Transform DEF='qijiaR' translation='0 0 -20' nameSpaceName id='Robot__qijiaR'>" +
             "<inline url='../qijia/jiajuR.x3d' nameSpaceName='QijiaR' mapDEFToID='true'> </inline>" +
             "</Transform>" +
             "<inline url='../qijia/jiajuBase.x3d'> </inline>" +
             "</Transform>" +
             "</Transform>" +
             "<Transform translation="+qijiaTrans+" scale="+jiajuScal+" rotation="+qijiaRotate+">" +
             "<Transform rotation="+jiajuRotate2+">"+
             "<inline url='../huabi/huabi.x3d'> </inline>" +
             "</Transform>" +
             "</Transform>" +
             "</switch>";
             $("#Robot__lastLink").after(toolSwitch);
             var box="<transform DEF='box' translation="+boxTrans+" nameSpaceName id='Robot__box' render='false'><shape>" +
             "<appearance><material diffuseColor='1 0 0'></material></appearance>" +
             "<box size='40,40,40'></box>" +
             "</shape></transform>";
             var gongjian1="<transform DEF='gongjian1' translation="+gongjianTrans1+" nameSpaceName id='Robot__gongjian1' render='true'>" +
             "<inline url='../gongjian/gongjian.x3d'></inline>" +
             "</transform>";
             var gongjian2="<transform DEF='gongjian2' translation="+gongjianTrans2+" nameSpaceName id='Robot__gongjian2' render='true'>" +
             "<inline url='../gongjian/gongjian.x3d'></inline>" +
             "</transform>";
             var gongjian3="<transform DEF='gongjian3' translation="+gongjianTrans3+" nameSpaceName id='Robot__gongjian3' render='true'>" +
             "<inline url='../gongjian/gongjian.x3d'></inline>" +
             "</transform>";
             var gongjian4="<transform DEF='gongjian4' translation="+gongjianTrans4+" nameSpaceName id='Robot__gongjian4' render='true'>" +
             "<inline url='../gongjian/gongjian.x3d'></inline>" +
             "</transform>";
             var gongjian5="<transform DEF='gongjian5' translation="+gongjianTrans5+" nameSpaceName id='Robot__gongjian5' render='true'>" +
             "<inline url='../gongjian/gongjian.x3d'></inline>" +
             "</transform>";
             var gongjian6="<transform DEF='gongjian6' translation="+gongjianTrans6+" nameSpaceName id='Robot__gongjian6' render='true'>" +
             "<inline url='../gongjian/gongjian.x3d'></inline>" +
             "</transform>";
             $("#Robot__platform").after(box);
             $("#Robot__platform").after(gongjian1);
             $("#Robot__platform").after(gongjian2);
             $("#Robot__platform").after(gongjian3);
             $("#Robot__platform").after(gongjian4);
             $("#Robot__platform").after(gongjian5);
             $("#Robot__platform").after(gongjian6);
             haveTool=true;


             }*/

            function draw() {
                switch(robNum){
                    case "k60":
                        jiajuScal="2,2,2";
                        jiajuTrans="15,0,0"
                        boxTrans='1000,40,1000'
                        boxSize='80,80,80'
                        break;
                    case "a910":
                        jiajuRotate='0,0,1,-1.5707963';
                        jiajuTrans="0,65,0";
                        boxTrans='300,20,-300';
                        break;
                    case "a360":
                        jiajuRotate='0,0,1,-1.5707963';
                        jiajuTrans="0,5,0";
                        boxTrans='250,-1180,-250';
                        break;
                    case "epson":
                        jiajuRotate='0,1,0,-1.5707963';
                        jiajuRotate2='1,0,0,3.1415926';
                        // jiajuRotate="0.45749571099781405,-0.7624928516630234,-0.45749571099781405,2.2834529548131237"
                        // jiajuRotate="0.5144957554275265,-0.6859943405700353,-0.5144957554275265,1.9390642202315367"
                        jiajuTrans="98.5,125,58.5";
                        boxTrans='195,100,0';
                        boxSize='40,200,40';
                        break;
                    case "a120":default:break;
                }
                var toolSwitch="<switch whichChoice='-1' DEF='TOOL' nameSpaceName id='Robot__TOOL'>" +
                    "<Transform translation="+jiajuTrans+" scale="+jiajuScal+" rotation="+jiajuRotate+">" +
                    "<Transform rotation="+jiajuRotate2+">"+
                    "<Transform DEF='jiajuL' translation='0 0 10' nameSpaceName id='Robot__jiajuL'>" +
                    "<inline url='../TOOLS/tool1/jiajuL.x3d' > </inline>" +
                    "</Transform>" +
                    "<Transform DEF='jiajuR' translation='0 0 -10' nameSpaceName id='Robot__jiajuR'>" +
                    "<inline url='../TOOLS/tool1/jiajuR.x3d'> </inline>" +
                    "</Transform>" +
                    "<inline url='../TOOLS/tool1/jiaju.x3d'> </inline>" +
                    "</Transform>" +
                    "</Transform>" +
                    "<Transform translation="+qijiaTrans+" scale="+jiajuScal+" rotation="+qijiaRotate+">" +
                    "<Transform rotation="+jiajuRotate2+">"+
                    "<Transform DEF='qijiaL' translation='0 0 -20' nameSpaceName id='Robot__qijiaL'>" +
                    "<inline url='../TOOLS/qijia/jiajuL.x3d' > </inline>" +
                    "</Transform>" +
                    "<Transform DEF='qijiaR' translation='0 0 -20' nameSpaceName id='Robot__qijiaR'>" +
                    "<inline url='../TOOLS/qijia/jiajuR.x3d' nameSpaceName='QijiaR' mapDEFToID='true'> </inline>" +
                    "</Transform>" +
                    "<inline url='../TOOLS/qijia/jiajuBase.x3d'> </inline>" +
                    "</Transform>" +
                    "</Transform>" +
                    "<Transform translation="+qijiaTrans+" scale="+jiajuScal+" rotation="+qijiaRotate+">" +
                    "<Transform rotation="+jiajuRotate2+">"+
                    "<inline url='../TOOLS/huabi/huabi.x3d'> </inline>" +
                    "</Transform>" +
                    "</Transform>" +
                    "</switch>";
                $("#Robot__lastLink").after(toolSwitch);
                var box="<transform DEF='box' translation="+boxTrans+" nameSpaceName id='Robot__box' render='false'><shape>" +
                    "<appearance><material diffuseColor='1 0 0'></material></appearance>" +
                    "<box size="+boxSize+"></box>" +
                    "</shape></transform>";
                var gongjian1="<transform DEF='gongjian1' translation="+gongjianTrans1+" nameSpaceName id='Robot__gongjian1' render='true'>" +
                    "<inline url='../TOOLS/gongjian/gongjian.x3d'></inline>" +
                    "</transform>";
                var gongjian2="<transform DEF='gongjian2' translation="+gongjianTrans2+" nameSpaceName id='Robot__gongjian2' render='true'>" +
                    "<inline url='../TOOLS/gongjian/gongjian.x3d'></inline>" +
                    "</transform>";
                var gongjian3="<transform DEF='gongjian3' translation="+gongjianTrans3+" nameSpaceName id='Robot__gongjian3' render='true'>" +
                    "<inline url='../TOOLS/gongjian/gongjian.x3d'></inline>" +
                    "</transform>";
                var gongjian4="<transform DEF='gongjian4' translation="+gongjianTrans4+" nameSpaceName id='Robot__gongjian4' render='true'>" +
                    "<inline url='../TOOLS/gongjian/gongjian.x3d'></inline>" +
                    "</transform>";
                var gongjian5="<transform DEF='gongjian5' translation="+gongjianTrans5+" nameSpaceName id='Robot__gongjian5' render='true'>" +
                    "<inline url='../TOOLS/gongjian/gongjian.x3d'></inline>" +
                    "</transform>";
                var gongjian6="<transform DEF='gongjian6' translation="+gongjianTrans6+" nameSpaceName id='Robot__gongjian6' render='true'>" +
                    "<inline url='../TOOLS/gongjian/gongjian.x3d'></inline>" +
                    "</transform>";
                $("#Robot__platform").after(box);
                $("#Robot__platform").after(gongjian1);
                $("#Robot__platform").after(gongjian2);
                $("#Robot__platform").after(gongjian3);
                $("#Robot__platform").after(gongjian4);
                $("#Robot__platform").after(gongjian5);
                $("#Robot__platform").after(gongjian6);
                haveTool=true;
                /* var toolSwitch= "<switch whichChoice='-1' DEF='TOOL' nameSpaceName id='Robot__TOOL'>" +
                 "<Transform translation="+jiajuTrans+" scale="+jiajuScal+" rotation="+jiajuRotate+">" +
                 "<Transform rotation="+jiajuRotate2+">"+
                 "<Transform DEF='jiajuL' translation='0 0 10' nameSpaceName id='Robot__jiajuL'>" +
                 "<inline url='../tool/jiajuL.x3d' > </inline>" +
                 "</Transform>" +
                 "<Transform DEF='jiajuR' translation='0 0 -10' nameSpaceName id='Robot__jiajuR'>" +
                 "<inline url='../tool/jiajuR.x3d'> </inline>" +
                 "</Transform>" +
                 "<inline url='../tool/jiaju.x3d'> </inline>" +
                 "</Transform>" +
                 "</Transform>"+
                 "</switch>";
                 $("#Robot__lastLink").after(toolSwitch);
                 var box="<transform DEF='box' translation="+boxTrans+" nameSpaceName id='Robot__box' render='false'><shape>" +
                 "<appearance><material diffuseColor='1 0 0'></material></appearance>" +
                 "<box size="+boxSize+"></box>" +
                 "</shape></transform>";
                 $("#Robot__platform").after(box);
                 haveTool=true;*/
            }
            this.setData=function (input) {
                toolSwitch(input[0]);
                toolDo(input[1]);
            }
            function toolSwitch(input){
                if(!haveTool)draw();
                document.getElementById("Robot__TOOL").setAttribute("whichChoice", ""+(input-1)+"");
                /*if(input){
                 document.getElementById("Robot__box").setAttribute("render", 'true');
                 }
                 else document.getElementById("Robot__box").setAttribute("render", 'false');*/
                switch (input) {
                    case 1:
                        document.getElementById("Robot__box").setAttribute("render", 'true');
                        for (var i=1;i<7;i++) {
                            document.getElementById("Robot__gongjian"+i).setAttribute("render", 'false');
                        }
                        break;
                    case 2:
                        document.getElementById("Robot__box").setAttribute("render", 'false');
                        for (var i=1;i<7;i++) {
                            document.getElementById("Robot__gongjian"+i).setAttribute("render", 'true');
                        }
                        break;
                    default:
                        document.getElementById("Robot__box").setAttribute("render", 'false');
                        for (var i=1;i<7;i++) {
                            document.getElementById("Robot__gongjian"+i).setAttribute("render", 'false');
                        }
                        break;
                }

            }
            function toolDo(input) {
                if(input){
                    document.getElementById("Robot__jiajuL").setAttribute('translation','0,0,0');
                    document.getElementById("Robot__jiajuR").setAttribute('translation','0,0,0');

                    document.getElementById("Robot__qijiaL").setAttribute('translation','0,0,-10');
                    document.getElementById("Robot__qijiaR").setAttribute('translation','0,0,10');
                }
                else{
                    document.getElementById("Robot__jiajuL").setAttribute('translation','0,0,10');
                    document.getElementById("Robot__jiajuR").setAttribute('translation','0,0,-10');

                    document.getElementById("Robot__qijiaL").setAttribute('translation','0,0,0');
                    document.getElementById("Robot__qijiaR").setAttribute('translation','0,0,0');
                }
            }
        }
    },
    DisassemblyVI:class DisassemblyVI extends RobotTemplateVI {
        constructor(VICanvas, draw3DFlag) {
            super(VICanvas,draw3DFlag);
            const _this = this;
            // RobotTemplateVI.prototype.robotURL='assets/kuka_KR60HA_x3d/kuka_kr60.x3d';
            // RobotTemplateVI.prototype.draw(draw3DFlag);
            this.robotURL='assets/Disassembly/robot120.x3d';
            this.draw(draw3DFlag);
            this.name = 'Disassembly';
            /*this.currentLen=[166,124,270,70,150,152,59,13];
             this.currentScal=[1,1,1,1,1,1,1,1];
             this.initLen=[166,124,270,70,150,152,59,13];*/
            this.a_d=[815,850,145,820,170,350];
            this.changeRobot=function(method){
                switch (method){
                    case '1':this.robotURL='assets/Disassembly/robot120.x3d';
                        break;
                    case '2':this.robotURL='assets/Disassembly/robot360.x3d';
                        break;
                    case '3':this.robotURL='assets/Disassembly/robot910.x3d';
                        break;
                    case '4':this.robotURL='assets/Disassembly/epson.x3d';
                        break;
                    default:this.robotURL='assets/Disassembly/robot120.x3d';
                }
                $('#Robot').attr('url', this.robotURL);
            }
            /*let dragFlag=false;
             let downPos=[0,0,0];
             window.setTimeout(function () {
             let L0=document.getElementById('Robot__link0');
             let marker="<Transform id='marker' scale='15 15 15' translation='300 0 0'><Shape><Appearance>"+
             "<Material diffuseColor='#FFD966'></Material>"+
             "</Appearance><Sphere></Sphere> </Shape> </Transform>";
             $('#Robot__base').after(marker);
             L0.addEventListener("click",function (event) {
             $('#marker').attr('translation', event.hitPnt);
             })
             L0.addEventListener('mousedown',function (event) {
             dragFlag=true;
             downPos=event.hitPnt;
             })
             L0.addEventListener('mouseup',function () {
             dragFlag=false;
             });
             /!*  L0.addEventListener('mouseout',function () {
             dragFlag=false;
             })*!/
             L0.addEventListener('mousemove',function (event) {
             if(dragFlag){
             let movePos=event.hitPnt;
             let moveDis=math.add(movePos,math.multiply(-1,downPos));
             $('#Robot__link0').attr('translation')
             $('#Robot__link0').attr('translation', event.hitPnt)
             }
             },false)

             },2000)*/
        }
        static get cnName() {

            return 'KUKA_kr60';
        }

        static get defaultWidth() {

            return '550px';
        }

        static get defaultHeight() {

            return '300px';
        }
    },
    DirectionSystemVI:class DirectionSystemVI extends TemplateVI{
        constructor(VICanvas, draw3DFlag) {
            super(VICanvas, draw3DFlag);
            const _this = this;
            this.name = 'DirectionSystem';
            let floatAxis,rotAxis;
            this.R=[[1,0,0],
                [0,1,0],
                [0,0,1]];
            this.draw=function() {
                if (draw3DFlag) {
                    //此处向网页插入HTML代码
                    this.container.innerHTML='<x3d style="width: 100%;height: 100%;"><scene>'+
                        '<inline nameSpaceName="axis" mapDEFToID="true" url="assets/CoordTrans/coordTrans.x3d"></inline>'+
                        '</scene></x3d>';
                }
                else {

                    this.ctx = this.container.getContext("2d");
                    let img = new Image();
                    img.src = '';
                    img.onload = function () {
                        _this.ctx.drawImage(img, 0, 0, _this.container.width, _this.container.height);
                    };
                }
            }
            this.draw();
            this.setData=function (input,method) {
                let R=[],rot=[];
                let len=input.length;

                /*let pos=[input[0],input[1],input[2]];
                 let trans=''+input[0]+","+input[2]+","+(-input[1]);
                 if(!floatAxis) floatAxis=document.getElementById('axis__floating');
                 floatAxis.setAttribute("translation",trans);*/
                switch (method){
                    case "Euler":
                        rot=[input[0]/180*Math.PI,input[1]/180*Math.PI,input[2]/180*Math.PI];
                        R=Euler(rot);
                        break;
                    case "RPY":
                        rot=[input[0]/180*Math.PI,input[1]/180*Math.PI,input[2]/180*Math.PI];
                        R=RPY(rot);
                        break;
                    case "Axis_Ang":
                        if(Math.abs(input[0]*input[0]+input[1]*input[1]+input[2]*input[2]-1)>0.1&&input[3]!=0){
                            alert("请先归一化旋转轴！")
                            return;
                        }
                        rot=[input[0],input[1],input[2],input[3]/180*Math.PI];
                        R=Axis_Ang(rot);
                        let rott=''+rot[0]+","+rot[2]+","+(-rot[1])+","+rot[3];
                        if(!floatAxis) floatAxis=document.getElementById('axis__floating');
                        floatAxis.setAttribute("rotation",rott);
                        break;
                    case 'Quaternion':
                        if(Math.abs(input[0]*input[0]+input[1]*input[1]+input[2]*input[2]+input[3]*input[3]-1)>0.1){
                            alert("请先归一化旋转轴！")
                            return;
                        }
                        else{
                            rot=[input[0],input[1],input[2],input[3]];
                            R=Quernion(rot);
                        }
                }
                if(method!='Axis_Ang') R_to_AA(R);
                this.R=R;
                console.log(R);
                /* R=[
                 [R[0][0],R[0][1],R[0][2],input[0]],
                 [R[1][0],R[1][1],R[1][2],input[1]],
                 [R[2][0],R[2][1],R[2][2],input[2]],
                 [0,0,0,1]
                 ]*/
                // R_to_Martrix(R);
                // R_to_Quternion(R);
            }
            this.setAxis=function(rot){
                if(!rotAxis) rotAxis=document.getElementById('axis__LineSet_points');
                rotAxis.setAttribute('point','0 0 0 '+rot[0]*20+' '+rot[2]*20+' '+(-rot[1]*20))
            }
            this.reset=function() {
                this.R=[[1,0,0],
                    [0,1,0],
                    [0,0,1]];
                if(rotAxis)rotAxis.setAttribute('point','0 0 0 0 0 0');
                if(floatAxis) {
                    floatAxis.setAttribute("rotation",'1,0,0,0');
                }
                // R_to_Martrix(R_0);
                // R_to_Quternion(R_0)
            }
            function Euler(rot,pos) {
                let alpha=rot[0],belta=rot[1],gamma=rot[2];
                let ca=Math.cos(alpha), sa=Math.sin(alpha),
                    cb=Math.cos(belta), sb=Math.sin(belta),
                    cy=Math.cos(gamma), sy=Math.sin(gamma);
                let R=[
                    [ca*cb*cy-sa*sy,-ca*cb*sy-sa*cy,ca*sb],
                    [sa*cb*cy+ca*sy,-sa*cb*sy+ca*cy,sa*sb],
                    [-sb*cy,sb*sy,cb]
                ];
                return R
            }
            function RPY(rot,pos) {
                //计算alpha，belta,gamma的正余弦
                let alpha=rot[2],belta=rot[1],gamma=rot[0];
                let ca=Math.cos(alpha), sa=Math.sin(alpha),
                    cb=Math.cos(belta), sb=Math.sin(belta),
                    cy=Math.cos(gamma), sy=Math.sin(gamma);
                let R=[
                    [ca*cb,ca*sb*sy-sa*cy,ca*sb*cy+sa*sy],
                    [sa*cb,sa*sb*sy+ca*cy,sa*sb*cy-ca*sy],
                    [-sb,cb*sy,cb*cy]
                ];
                return R
            }
            function Axis_Ang(rot,pos) {
                let kx=rot[0],ky=rot[1],kz=rot[2],theta=rot[3];
                let s0=Math.sin(theta),c0=Math.cos(theta),vers0=1-c0;
                let R=[
                    [kx*kx*vers0+c0,ky*kx*vers0-kz*s0,kz*kx*vers0+ky*s0],
                    [ky*kx*vers0+kz*s0,ky*ky*vers0+c0,kz*ky*vers0-kx*s0],
                    [kx*kz*vers0-ky*s0,ky*kz*vers0+kx*s0,kz*kz*vers0+c0],
                ]
                return R
            }
            function Quernion(rot,pos) {
                let q0=rot[0],q1=rot[1],q2=rot[2],q3=rot[3];
                let R=[
                    [1-2*q2*q2-2*q3*q3,2*q1*q2-2*q3*q0,2*q1*q3+2*q2*q0],
                    [2*q1*q2+2*q3*q0,1-2*q1*q1-2*q3*q3,2*q2*q3-2*q1*q0],
                    [2*q1*q3-2*q2*q0,2*q2*q3+2*q1*q0,1-2*q1*q1-2*q2*q2],
                ]
                //参考：https://blog.csdn.net/shenxiaolu1984/article/details/50639298
                return R;
            }
            //转换成轴角模式并旋转模型
            function R_to_AA(R) {
                let nx=R[0][0],ox=R[0][1],ax=R[0][2],
                    ny=R[1][0],oy=R[1][1],ay=R[1][2],
                    nz=R[2][0],oz=R[2][1],az=R[2][2];
                let theta=Math.acos(0.5*(nx+oy+az-1));
                let kx=(oz-ay)/(2*Math.sin(theta)),
                    ky=(ax-nz)/(2*Math.sin(theta)),
                    kz=(ny-ox)/(2*Math.sin(theta));
                let rot=''+kx+","+kz+","+(-ky)+","+theta;
                if(!floatAxis) floatAxis=document.getElementById('axis__floating');
                floatAxis.setAttribute("rotation",rot);
            }
            function R_to_Quternion(R) {
                let q0,q1,q2,q3;
                let r11=R[0][0],r12=R[0][1],r13=R[0][2],
                    r21=R[1][0],r22=R[1][1],r23=R[1][2],
                    r31=R[2][0],r32=R[2][1],r33=R[2][2];
                q0=Math.sqrt(1+r11+r22+r33)/2;
                if(Math.abs(q0)>=0.01){
                    q1=(r32-r23)/4/q0;
                    q2=(r13-r31)/(4*q0);
                    q3=(r21-r12)/(4*q0);
                }
                else if(r11>r22&&r11>r33){
                    let t=Math.sqrt(1+r11-r22-r33);
                    q0=(r32-r23)/t;
                    q1=t/4;
                    q2=(r13+r31)/t;
                    q3=(r21+r12)/t;
                }
                else if(r22>r11&&r22>r33){
                    let t=Math.sqrt(1-r11+r22-r33);
                    q0=(r13+r31)/t;
                    q1=(r21+r12)/t;
                    q2=t/4;
                    q3=(r32+r23)/t;
                }
                else{
                    let t=Math.sqrt(1-r11-r22+r33);
                    q0=(r21-r12)/t;
                    q1=(r13+r31)/t;
                    q2=(r23-r32)/t;
                    q3=t/4;
                }
                let q=[q0,q1,q2,q3];
                if(!quterSpans)global.quterSpans=$('.quaternion');
                for(let i=0;i<quterSpans.length;i++){
                    quterSpans[i].innerText=(q[i]).toFixed(3);
                }

            }
            this.check=function () {
                let r_trs=document.getElementById("result_table").getElementsByTagName("tr");
                let result=true;
                for(let i=0;i<r_trs.length;i++){
                    let tds=(r_trs[i]).getElementsByTagName('input');
                    for(let j=0;j<tds.length;j++){
                        if(Math.abs(parseFloat(tds[j].value)-this.R[i][j])<0.2){
                            tds[j].style.backgroundColor='white'
                            continue;
                        }
                        else {
                            tds[j].style.backgroundColor='red';
                            result=false;
                        }
                    }
                }
                if(!result)layer.msg("计算结果错误!",{icon: 2});
                else layer.msg("计算结果正确，进入下一环节！",{icon: 1});
            }

        }
    },
    CoordSystemVI:class CoordSystemVI extends TemplateVI {
        constructor(VICanvas, draw3DFlag) {
            super(VICanvas, draw3DFlag);
            const _this = this;
            this.name = 'CoordSystem';
            let floatAxis, rotAxis;
            this.T=[
                [1,0,0,0],
                [0,1,0,0],
                [0,0,1,0],
                [0,0,0,1]
            ];
            this.draw = function (){
                if (draw3DFlag) {
                    //此处向网页插入HTML代码
                    this.container.innerHTML = '<x3d style="width: 100%;height: 100%;"><scene>' +
                        '<inline nameSpaceName="axis" mapDEFToID="true" url="assets/CoordTrans/coordTrans.x3d"></inline>' +
                        '</scene></x3d>';
                }
                else {

                    this.ctx = this.container.getContext("2d");
                    let img = new Image();
                    img.src = '';
                    img.onload = function () {
                        _this.ctx.drawImage(img, 0, 0, _this.container.width, _this.container.height);
                    };
                }
            }
            this.draw();
            this.setData=function (input) {

                /*let pos=[input[0],input[1],input[2]];
                 let trans=''+input[0]+","+input[2]+","+(-input[1]);
                 if(!floatAxis) floatAxis=document.getElementById('axis__floating');
                 floatAxis.setAttribute("translation",trans);*/
                let trans=input.map(function (item,index) {
                    if(index<3) return item/180*Math.PI;
                    else return item;
                })
                let T=RPY(trans);//计算齐次矩阵
                R_to_AA(T);//旋转模型
                R_to_Martrix(T);//填写矩阵
                this.T=T;
                //平移模型
                let pos=''+input[3]+","+input[5]+","+(-input[4]);
                if(!floatAxis) floatAxis=document.getElementById('axis__floating');
                floatAxis.setAttribute("translation",pos);
                // let T=R.concat();
                // T[0].push(input[3]);T[1].push(input[4]);T[2].push(input[5]);
                // T.push([0,0,0,1]);
                // this.T=T.concat();
            }
            function RPY(trans) {
                //计算alpha，belta,gamma的正余弦
                let alpha=trans[2],belta=trans[1],gamma=trans[0];
                let ca=Math.cos(alpha), sa=Math.sin(alpha),
                    cb=Math.cos(belta), sb=Math.sin(belta),
                    cy=Math.cos(gamma), sy=Math.sin(gamma);
                let R=[
                    [ca*cb,ca*sb*sy-sa*cy,ca*sb*cy+sa*sy,trans[3]],
                    [sa*cb,sa*sb*sy+ca*cy,sa*sb*cy-ca*sy,trans[4]],
                    [-sb,cb*sy,cb*cy,trans[5]],
                    [0,0,0,1]
                ];
                return R
            }
            //转换成轴角模式并旋转模型
            function R_to_AA(R) {
                let nx=R[0][0],ox=R[0][1],ax=R[0][2],
                    ny=R[1][0],oy=R[1][1],ay=R[1][2],
                    nz=R[2][0],oz=R[2][1],az=R[2][2];
                let theta=Math.acos(0.5*(nx+oy+az-1));
                let kx=(oz-ay)/(2*Math.sin(theta)),
                    ky=(ax-nz)/(2*Math.sin(theta)),
                    kz=(ny-ox)/(2*Math.sin(theta));
                let rot=''+kx+","+kz+","+(-ky)+","+theta;
                if(!floatAxis) floatAxis=document.getElementById('axis__floating');
                floatAxis.setAttribute("rotation",rot);
            }
            //计算旋转矩阵R并将结果填到表格中
            function R_to_Martrix(R) {
                let r_trs=document.getElementById("T_table").getElementsByTagName("tr");
                for(let i=0;i<r_trs.length;i++){
                    let tds=(r_trs[i]).getElementsByTagName('td');
                    for(let j=0;j<tds.length-2;j++){//减2消去首末空白单元格
                        tds[j+1].innerText=R[i][j].toFixed(3);
                    }
                }
            }
            this.check=function (pos) {
                let posRseult=math.multiply(this.T,pos.concat(1));
                posRseult.pop();//去掉末尾的1
                let resultIsCorrect=true;
                let tds=document.getElementById("result_table").getElementsByTagName("input");
                //结果只有一维
                for(let j=0;j<tds.length;j++){
                    if(Math.abs(parseFloat(tds[j].value)-posRseult[j])<0.2){
                        tds[j].style.backgroundColor='white';
                        continue;
                    }
                    else {
                        tds[j].style.backgroundColor='red';
                        resultIsCorrect=false;
                    }
                }
                if(!resultIsCorrect)layer.msg("计算结果错误!",{icon: 2});
                else layer.msg("计算结果正确，进入下一环节！",{icon: 1});
            }
        }
    },
    RobotLinksVI:class RobotLinksVI extends TemplateVI {
        constructor(VICanvas, draw3DFlag) {
            super(VICanvas, draw3DFlag);
            const _this = this;
            this.name = 'RobotLinks';
            let floatAxis, rotAxis;
            this.T=[
                [1,0,0,0],
                [0,1,0,0],
                [0,0,1,0],
                [0,0,0,1]
            ];
            this.draw = function (index){
                if (draw3DFlag) {
                    this.container.innerHTML = '<x3d style="width: 100%;height: 100%;"><scene>' +
                        '<inline nameSpaceName="Link" mapDEFToID="true" url="assets/RobotLinks/robotLinks.x3d"></inline>' +
                        '</scene></x3d>';
                    //此处向网页插入HTML代码
                }
                else {

                    this.ctx = this.container.getContext("2d");
                    let img = new Image();
                    img.src = '';
                    img.onload = function () {
                        _this.ctx.drawImage(img, 0, 0, _this.container.width, _this.container.height);
                    };
                };
            };
            this.draw();
            this.changeLink=function (index) {
                let url="120/link2.x3d",linkNum=2;
                switch (index){
                    case '1':
                        url="120/link2.x3d";
                        linkNum=2;
                        break;
                    case '2':
                        url="120/link4.x3d";
                        linkNum=4;
                        break;
                    case '3':
                        url="60/link1.x3d";
                        linkNum=1;
                        break;
                    case '4':
                        url="60/link3.x3d";
                        linkNum=3;
                        break;
                    case '5':
                        // url="60/link5.x3d";
                        url="910/link2.x3d";
                        linkNum=2;
                        break;
                    default:
                        url="120/link2.x3d";
                        linkNum=2;
                }
                if(index==3||index==4) {
                    document.getElementById('robotImg').src='assets/RobotLinks/60/img.jpg';
                    document.getElementById("Link__linkTrans").setAttribute("translation",'-3000,-800,-1000');
                }
                else if(index==5){
                    document.getElementById('robotImg').src='assets/RobotLinks/910/img.jpg';
                    document.getElementById("Link__linkTrans").setAttribute("translation",'0,0,0');
                }
                else  {
                    document.getElementById('robotImg').src='assets/RobotLinks/120/img.jpg';
                    document.getElementById("Link__linkTrans").setAttribute("translation",'0,0,0');
                }
                document.getElementById("Link__showLink").setAttribute("url",url);
                document.getElementById("linkNumber").innerText=linkNum;
            }
        }
    }
};