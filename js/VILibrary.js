/**
 * Created by Fengma on 2016/11/10.
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
	//更新数据
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
//总的模板类
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
//机器人X3DOM模块的模板类
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
        //关节转角控制各个连杆模型转动
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
        //向页面中插入X3DOM模型
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
        //DH模型实验改变连杆长度
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
	
	AudioVI: class AudioVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			const _this = this;
			
			let audioCtx = new (window.AudioContext || webkitAudioContext)(),
				analyser = audioCtx.createAnalyser(), source, timeStamp = 0, point = {};
			
			this.name = 'AudioVI';
			this.ctx = this.container.getContext("2d");
			this.inputPointCount = 0;
			this.fillStyle = 'silver';
			
			this.toggleObserver = function (flag) {
				
				if (flag) {
					
					if (!this.timer) {
						
						// Older browsers might not implement mediaDevices at all, so we set an empty object first
						if (navigator.mediaDevices === undefined) {
							navigator.mediaDevices = {};
						}
						
						// Some browsers partially implement mediaDevices. We can't just assign an object
						// with getUserMedia as it would overwrite existing properties.
						// Here, we will just add the getUserMedia property if it's missing.
						if (navigator.mediaDevices.getUserMedia === undefined) {
							navigator.mediaDevices.getUserMedia = function (constraints) {
								
								// First get ahold of the legacy getUserMedia, if present
								let getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia);
								
								// Some browsers just don't implement it - return a rejected promise with an error
								// to keep a consistent interface
								if (!getUserMedia) {
									return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
								}
								
								// Otherwise, wrap the call to the old navigator.getUserMedia with a Promise
								return new Promise(function (resolve, reject) {
									getUserMedia.call(navigator, constraints, resolve, reject);
								});
							};
						}
						
						navigator.mediaDevices.getUserMedia({audio: true}).then(function (stream) {
								console.log('AudioVI: getUserMedia supported.');
								
								//音频输出
								source = audioCtx.createMediaStreamSource(stream);
								analyser.fftSize = _this.dataLength * 2;
								source.connect(analyser);
								analyser.connect(audioCtx.destination);
								
								let bufferLength = analyser.frequencyBinCount;
								console.log(bufferLength);
								let dataArray = new Uint8Array(bufferLength);
								
								function getAudioData() {
									
									if (_this.dataLine) {
										
										_this.timer = window.requestAnimationFrame(getAudioData);
										
										analyser.getByteTimeDomainData(dataArray);
										_this.output = Array.from(dataArray);
										
										//定时更新相同数据线VI的数据
										VILibrary.InnerObjects.dataUpdater(_this.dataLine);
									}
									else {
										
										_this.toggleObserver(false);
									}
								}
								
								getAudioData();
								
								_this.fillStyle = 'red';
								_this.draw();
							}
						).catch(function (err) {
							_this.timer = 0;
							console.log('AudioVI: ' + err.name + ": " + err.message);
						});
					}
				}
				else {
					if (this.timer) {
						//切断音频输出
						analyser.disconnect(audioCtx.destination);
						window.cancelAnimationFrame(_this.timer);
						_this.timer = 0;
					}
					_this.fillStyle = 'silver';
					_this.draw();
				}
			};
			
			this.draw = function () {
				
				let img = new Image();
				new Promise(function (resolve, reject) {
					
					img.src = 'img/mic.png';
					img.onload = resolve;
					img.onerror = reject;
				}).then(function () {
					
					_this.ctx.fillStyle = _this.fillStyle;
					_this.ctx.fillRect(0, 0, _this.container.width, _this.container.height);
					_this.ctx.drawImage(img, 0, 0, _this.container.width, _this.container.height);
				}).catch(function (e) {
					console.log('AudioVI:' + e);
				});
			};
			
			this.draw();
			
			this.container.addEventListener('mousedown', function (e) {
				
				timeStamp = e.timeStamp;
				point.x = e.clientX;
				point.y = e.clientY;
			}, false);
			
			this.container.addEventListener('mouseup', function (e) {
				
				//X、Y移动距离小于5，点击间隔小于200，默认点击事件
				if ((e.timeStamp - timeStamp) < 200 && (point.x - e.clientX) < 5 && (point.y - e.clientY) < 5) {
					
					if (_this.dataLine) {
						
						_this.toggleObserver(!_this.timer);
					}
				}
			}, false);
		}
		
		static get cnName() {
			
			return '麦克风';
		}
		
		static get defaultWidth() {
			
			return '80px';
		}
		
		static get defaultHeight() {
			
			return '80px';
		}
	},
	
	KnobVI: class KnobVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			const _this = this;
			
			let spinnerFlag = false, startX, startY, stopX, stopY, roundCount = 0;
			let knob_Base = new Image(), knob_Spinner = new Image();
			let _mouseOverFlag = false, _mouseOutFlag = false, _dragAndDropFlag = false,
				_mouseUpFlag = false, _onclickFlag = false, _mouseMoveFlag = false;
			let p1 = new Promise(function (resolve, reject) {
				
				knob_Base.src = "img/knob_Base.png";
				knob_Base.onload = resolve;
				knob_Base.onerror = reject;
			});
			let p2 = new Promise(function (resolve, reject) {
				
				knob_Spinner.src = "img/knob_Spinner.png";
				knob_Spinner.onload = resolve;
				knob_Spinner.onerror = reject;
			});
			let dataTip = $('');
			
			this.name = 'KnobVI';
			this.ctx = this.container.getContext("2d");
			this.inputPointCount = 0;
			this.output = [100];
			this.minValue = 0;
			this.maxValue = 100;
			this.defaultValue = 100;
			this.ratio = (this.maxValue - this.minValue) / (Math.PI * 1.5);
			this.radian = (this.defaultValue - this.minValue) / this.ratio;
			//VI双击弹出框
			this.boxTitle = '请输入初始值';
			this.boxContent = '<div class="input-div">' +
				'<span class="normal-span">最小值:</span><input type="number" id="KnobVI-input-1" value="' + this.minValue + '" class="normal-input">' +
				'<span class="normal-span">最大值:</span><input type="number" id="KnobVI-input-2" value="' + this.maxValue + '" class="normal-input">' +
				'<span class="normal-span">初值:</span><input type="number" id="KnobVI-input-3" value="' + this.defaultValue + '" class="normal-input"></div>';
			
			//设置旋钮初始参数
			this.setDataRange = function (minValue, maxValue, startValue) {
				
				let minVal = Number.isNaN(minValue) ? 0 : minValue;
				let maxVal = Number.isNaN(maxValue) ? 1 : maxValue;
				let startVal = Number.isNaN(startValue) ? 0 : startValue;
				if (minVal >= maxVal || startVal < minVal || startVal > maxVal) {
					
					console.log('KnobVI: DataRange set error!');
					return false;
				}
				
				this.minValue = minVal;
				this.maxValue = maxVal;
				this.defaultValue = startVal;
				
				this.ratio = (this.maxValue - this.minValue) / (Math.PI * 1.5);
				this.setData(this.defaultValue);
				this.radian = (this.defaultValue - this.minValue) / this.ratio;
				
				this.draw();
				
				this.boxContent = '<div class="input-div">' +
					'<span class="normal-span">最小值:</span><input type="number" id="KnobVI-input-1" value="' + this.minValue + '" class="normal-input">' +
					'<span class="normal-span">最大值:</span><input type="number" id="KnobVI-input-2" value="' + this.maxValue + '" class="normal-input">' +
					'<span class="normal-span">初值:</span><input type="number" id="KnobVI-input-3" value="' + this.defaultValue + '" class="normal-input"></div>';
			};
			
			this.setData = function (data) {
				
				if (Number.isNaN(data)) {
					
					console.log('KnobVI: Not a number!');
					return false;
				}
				if (data < this.minValue || data > this.maxValue) {
					
					console.log('KnobVI: Out of range!');
					return false;
				}
				
				if (this.index <= (this.dataLength - 1)) {
					
					this.output[this.index] = data;
					this.index += 1;
				}
				else {
					
					let i;
					for (i = 0; i < this.dataLength - 1; i += 1) {
						
						this.output[i] = this.output[i + 1];
					}
					this.output[this.dataLength - 1] = data;
				}
			};
			
			this.setInitialData = function () {
				
				let minValue = Number($('#KnobVI-input-1').val());
				let maxValue = Number($('#KnobVI-input-2').val());
				let defaultValue = Number($('#KnobVI-input-3').val());
				this.setDataRange(minValue, maxValue, defaultValue);
			};
			
			this.reset = function () {
				
				this.index = 0;
				this.output = [100];
				this.minValue = 0;
				this.maxValue = 100;
				this.defaultValue = 100;
			};
			
			this.draw = function () {
				
				let xPos = this.container.width / 2;
				let yPos = this.container.height / 2;
				this.ctx.clearRect(0, 0, this.container.width, this.container.height);
				this.ctx.drawImage(knob_Base, 0, 0, this.container.width, this.container.height);
				this.ctx.save();   //保存之前位置
				this.ctx.translate(xPos, yPos);
				this.ctx.rotate(this.radian - 135 / 180 * Math.PI);  //旋转, 初始位置为左下角
				this.ctx.translate(-xPos, -yPos);
				this.ctx.drawImage(knob_Spinner, 0, 0, this.container.width, this.container.height);
				this.ctx.restore();  //恢复之前位置
				this.ctx.beginPath();
				this.ctx.font = "normal 14px Calibri";
				this.ctx.fillText(this.minValue.toString(), 0, this.container.height);
				this.ctx.fillText(this.maxValue.toString(), this.container.width - 7 * this.maxValue.toString().length, this.container.height); //字体大小为14
				this.ctx.closePath();
			};
			
			Promise.all([p1, p2]).then(function () {
				_this.draw();
			})
				.catch(function (e) {
					console.log('KnobVI:' + e);
				});
			
			this.dragAndDrop = function () {
			};// this.container.style.cursor = 'move';
			this.mouseOver = function () {
			}; // this.container.style.cursor = 'pointer';
			this.mouseOut = function () {
			}; // this.container.style.cursor = 'auto';
			this.mouseUp = function () {
			}; // this.container.style.cursor = 'auto';
			this.mouseMove = function () {
			};
			this.onclick = function () {
			};
			
			this.attachEvent = function (event, handler) {
				
				switch (event) {
					case 'mouseOver':
						this.mouseOver = handler;
						_mouseOverFlag = true;
						break;
					case 'mouseOut':
						this.mouseOut = handler;
						_mouseOutFlag = true;
						break;
					case 'dragAndDrop':
						this.dragAndDrop = handler;
						_dragAndDropFlag = true;
						break;
					case 'mouseUp':
						this.mouseUp = handler;
						_mouseUpFlag = true;
						break;
					case 'onclick':
						this.onclick = handler;
						_onclickFlag = true;
						break;
					case 'mouseMove':
						this.mouseMove = handler;
						_mouseMoveFlag = true;
						break;
				}
			};
			
			this.detachEvent = function (event) {
				
				switch (event) {
					case 'mouseOver':
						_mouseOverFlag = false;
						break;
					case 'mouseOut':
						_mouseOutFlag = false;
						break;
					case 'dragAndDrop':
						_dragAndDropFlag = false;
						break;
					case 'mouseUp':
						_mouseUpFlag = false;
						break;
					case 'onclick':
						_onclickFlag = false;
						break;
					case 'mouseMove':
						_mouseMoveFlag = false;
						break;
				}
				
			};
			
			function onMouseDown(e) {
				
				let tempData = rotateAxis(e.offsetX - _this.container.width / 2, -(e.offsetY - _this.container.height / 2), 135);
				startX = tempData[0];
				startY = tempData[1];
				if ((startX * startX + startY * startY) <= _this.container.width / 2 * _this.container.width / 2 * 0.5) {
					
					spinnerFlag = true;
				}
			}
			
			function onMouseMove(e) {
				
				let tempData = rotateAxis(e.offsetX - _this.container.width / 2, -(e.offsetY - _this.container.height / 2), 135);
				stopX = tempData[0];
				stopY = tempData[1];
				if ((stopX * stopX + stopY * stopY) <= _this.container.width / 2 * _this.container.width / 2 * 0.5 && !spinnerFlag) {
					_this.container.style.cursor = 'pointer';
				}
				else if (!spinnerFlag) {
					_this.container.style.cursor = 'auto';
				}
				if (spinnerFlag) {
					
					if (startY > 0 && stopY > 0) {
						if (startX < 0 && stopX >= 0) {
							roundCount += 1;
						}
						else if (startX > 0 && stopX <= 0) {
							roundCount--;
						}
					}
					
					_this.radian = calculateRadian(0, 0, stopX, stopY) + Math.PI * 2 * roundCount;
					if (_this.radian < 0) {
						_this.radian = 0;
					}
					else if (_this.radian > 270 / 360 * 2 * Math.PI) {
						_this.radian = 270 / 180 * Math.PI;
					}
					_this.setData(_this.radian * _this.ratio + parseFloat(_this.minValue));
					//旋钮数据更新后全局更新一次
					if (_this.dataLine) {
						
						VILibrary.InnerObjects.dataUpdater(_this.dataLine);
					}
					_this.draw();
					startX = stopX;
					startY = stopY;
					
					if (_mouseMoveFlag) {
						
						_this.mouseMove();
					}
				}
				//************************************数据提示****************************************//
				dataTip.remove();
				dataTip = $('<div class="rowFlex-div dataTip">' +
					'<span class="normal-span">输出值:' + _this.output[_this.output.length - 1].toFixed(2) + '</span></div>');
				if (e.target.parentElement.id === 'VIContainer') {
					
					$(e.target.parentElement).append(dataTip);
				}
				else {
					dataTip.css('position', 'fixed');
					dataTip.css('top', '0');
					dataTip.css('left', '0');
					dataTip.css('z-index', '100');
					dataTip.css('width', '100%');
					$('body').prepend(dataTip);
				}
			}
			
			function onMouseUp() {
				
				spinnerFlag = false;
				roundCount = 0;
				
				if (_mouseUpFlag) {
					
					_this.mouseUp();
				}
			}
			
			function onMouseOut() {
				
				dataTip.remove();
			}
			
			function calculateRadian(x1, y1, x2, y2) {
				// 直角的边长
				let x = x2 - x1;
				let y = y2 - y1;
				// 斜边长
				let z = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
				// 余弦
				let cos = y / z;
				// 弧度
				let radian;
				if (x >= 0) {
					radian = Math.acos(cos);
				}
				else {
					radian = Math.PI * 2 - Math.acos(cos);
				}
				return radian;
			}
			
			/**
			 * 坐标系转换
			 * @param x
			 * @param y
			 * @param angle
			 * @returns {[x1, y1]}
			 */
			function rotateAxis(x, y, angle) {
				let radian = angle / 180 * Math.PI;
				return [Math.sin(radian) * y + Math.cos(radian) * x, Math.cos(radian) * y - Math.sin(radian) * x];
			}
			
			this.container.addEventListener('mousemove', onMouseMove, false);
			this.container.addEventListener('mousedown', onMouseDown, false);
			this.container.addEventListener('mouseup', onMouseUp, false);
			this.container.addEventListener('mouseout', onMouseOut, false);
		}
		
		static get cnName() {
			
			return '旋钮';
		}
		
		static get defaultWidth() {
			
			return '150px';
		}
		
		static get defaultHeight() {
			
			return '150px';
		}
	},
	
	DCOutputVI: class DCOutputVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			const _this = this;
			let timeStamp = 0, point = {}, checkClickTimer = null;
			let dataTip = $('');
			
			this.name = 'DCOutputVI';
			this.inputPointCount = 0;
			
			//VI双击弹出框
			this.boxTitle = '请设置输出值';
			this.boxContent = '<div class="input-div"><span class="normal-span">输出值:</span>' +
				'<input type="number" id="DCOutputVI-input" value="' + this.output[this.output.length - 1] + '" class="normal-input"></div>';
			
			this.updater = function () {
				
				this.setData(this.output);
			};
			
			this.setData = function (input) {
				
				let temp = Number(Array.isArray(input) ? input[input.length - 1] : input);
				if (Number.isNaN(temp)) {
					
					return false;
				}
				
				if (this.index <= (this.dataLength - 1)) {
					
					this.output[this.index] = temp;
					this.index += 1;
				}
				else {
					
					let i;
					for (i = 0; i < this.dataLength - 1; i += 1) {
						
						this.output[i] = this.output[i + 1];
					}
					this.output[this.dataLength - 1] = temp;
				}
				this.boxContent = '<div class="input-div"><span class="normal-span">输出值:</span>' +
					'<input type="number" id="DCOutputVI-input" value="' + temp + '" class="normal-input"></div>';
			};
			
			this.setInitialData = function () {
				
				this.setData($('#DCOutputVI-input').val());
			};
			
			this.draw();
			
			this.container.addEventListener('mousedown', function (e) {
				
				timeStamp = e.timeStamp;
				point.x = e.clientX;
				point.y = e.clientY;
			}, false);
			this.container.addEventListener('mouseup', function (e) {
				
				//X、Y移动距离小于5，点击间隔小于200，默认点击事件
				if ((e.timeStamp - timeStamp) < 200 && (point.x - e.clientX) < 5 && (point.y - e.clientY) < 5) {
					
					if (_this.dataLine) {
						
						clearTimeout(checkClickTimer);
						checkClickTimer = setTimeout(function () {
							
							_this.toggleObserver(!_this.timer);
						}, 250);
					}
				}
			}, false);
			
			this.container.addEventListener('mousemove', function (e) {
				//************************************数据提示****************************************//
				dataTip.remove();
				dataTip = $('<div class="rowFlex-div dataTip">' +
					'<span class="normal-span">输出值:' + _this.output[_this.output.length - 1].toFixed(2) + '</span></div>');
				
				if (e.target.parentElement.id === 'VIContainer') {
					
					$(e.target.parentElement).append(dataTip);
				}
				else {
					dataTip.css('position', 'fixed');
					dataTip.css('top', '0');
					dataTip.css('left', '0');
					dataTip.css('z-index', '100');
					dataTip.css('width', '100%');
					$('body').prepend(dataTip);
				}
			}, false);
			this.container.addEventListener('mouseout', function () {
				dataTip.remove();
			}, false);
			
			//重写双击事件，先去除模版VI旧的绑定再添加新的
			this.container.removeEventListener('dblclick', this.handleDblClick);
			
			this.handleDblClick = function (e) {
				
				clearTimeout(checkClickTimer);
				VILibrary.InnerObjects.showBox(_this);
			};
			
			this.container.addEventListener('dblclick', this.handleDblClick, false);
		}
		
		static get cnName() {
			
			return '直流输出';
		}
		
	},
	
	AddVI: class AddVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			const _this = this;
			let dataTip = $('');
			
			this.name = 'AddVI';
			this.inputPointCount = 2;
			this.originalInput = 0;
			this.latestInput = 0;
			
			//多输入选择弹出框
			this.inputBoxTitle = '请选择加法器输入参数';
			this.inputBoxContent = '<div class="input-div">' +
				'<div><input type="radio" id="type1" class="radio-input" name="input-type" value="1" alt="初值">' +
				'<label class="input-label" for="type1">初值</label></div>' +
				'<div><input type="radio" id="type2" class="radio-input" name="input-type" value="2" alt="反馈值">' +
				'<label class="input-label" for="type2">反馈值</label></div></div>';
			//VI双击弹出框
			this.boxTitle = '请输入初始值';
			this.boxContent = '<div class="input-div"><span class="normal-span">初值:</span>' +
				'<input type="number" id="AddVI-input" value="' + this.originalInput + '" class="normal-input"></div>';
			
			this.setData = function (input, inputType) {
				
				let inputValue = Number(Array.isArray(input) ? input[input.length - 1] : input);
				if (Number.isNaN(inputValue)) {
					
					console.log('AddVI: Input value error');
					return false;
				}
				
				if (inputType === 1) {
					
					this.originalInput = inputValue;
					this.boxContent = '<div class="input-div"><span class="normal-span">初值:</span>' +
						'<input type="number" id="AddVI-input" value="' + this.originalInput + '" class="normal-input"></div>';
				}
				else {
					
					this.latestInput = inputValue;
					let temp = parseFloat(this.originalInput - this.latestInput).toFixed(2);
					
					if (this.index <= (this.dataLength - 1)) {
						
						this.output[this.index] = temp;
						this.index += 1;
					}
					else {
						
						let i;
						for (i = 0; i < this.dataLength - 1; i += 1) {
							
							this.output[i] = this.output[i + 1];
						}
						this.output[this.dataLength - 1] = temp;
					}
				}
				
			};
			
			this.setInitialData = function () {
				
				this.setData(Number($('#AddVI-input').val()), 1);
			};
			
			this.reset = function () {
				
				this.originalInput = 0;
				this.latestInput = 0;
				this.index = 0;
				this.output = [0];
			};
			
			this.draw();
			
			this.container.addEventListener('mousemove', function (e) {
				//************************************数据提示****************************************//
				dataTip.remove();
				dataTip = $('<div class="rowFlex-div dataTip">' +
					'<span class="normal-span">输入值:' + _this.originalInput.toFixed(2) + '</span>' +
					'<span class="normal-span">反馈值:' + _this.latestInput.toFixed(2) + '</span>' +
					'<span class="normal-span">输出值:' + _this.output[_this.output.length - 1].toFixed(2) + '</span></div>');
				
				if (e.target.parentElement.id === 'VIContainer') {
					
					$(e.target.parentElement).append(dataTip);
				}
				else {
					dataTip.css('position', 'fixed');
					dataTip.css('top', '0');
					dataTip.css('left', '0');
					dataTip.css('z-index', '100');
					dataTip.css('width', '100%');
					$('body').prepend(dataTip);
				}
			}, false);
			this.container.addEventListener('mouseout', function () {
				dataTip.remove();
			}, false);
		}
		
		static get cnName() {
			
			return '加法器';
		}
	},
	
	FFTVI: class FFTVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			this.name = 'FFTVI';
			this.setData = function (input) {
				
				if (!Array.isArray(input)) {
					
					return;
				}
				this.output = VILibrary.InnerObjects.fft(1, 10, input);
				return this.output;
				
			};
			
			this.draw = function () {
				
				this.ctx = this.container.getContext("2d");
				this.ctx.font = 'normal 14px Microsoft YaHei';
				this.ctx.fillStyle = 'orange';
				this.ctx.fillRect(0, 0, this.container.width, this.container.height);
				this.ctx.fillStyle = 'black';
				this.ctx.fillText(this.constructor.cnName, this.container.width / 2 - 7 * 3 / 2, this.container.height / 2 + 6);
			};
			
			this.draw();
		}
		
		static get cnName() {
			
			return 'FFT';
		}
	},
	
	PIDVI: class PIDVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			const _this = this;
			let dataTip = $('');
			
			this.name = 'PIDVI';
			this.lastInput = 0;
			this.P = 1;
			this.I = 1;
			this.D = 1;
			this.Fs = 100;
			this.temp1 = 0;
			
			//VI双击弹出框
			this.boxTitle = '请输入PID参数';
			this.boxContent = '<div class="input-div">' +
				'<span class="normal-span">P:</span><input type="number" id="PIDVI-input-1" value="' + this.P + '" class="normal-input">' +
				'<span class="normal-span">I:</span><input type="number" id="PIDVI-input-2" value="' + this.I + '" class="normal-input">' +
				'<span class="normal-span">D:</span><input type="number" id="PIDVI-input-3" value="' + this.D + '" class="normal-input"></div>';
			
			this.setData = function (input) {
				
				let temp1 = Number(Array.isArray(input) ? input[input.length - 1] : input);
				if (Number.isNaN(temp1)) {
					
					console.log('PIDVI: Input value error');
					return false;
				}
				
				let v1, v2, v3, v21;
				
				v1 = this.P * temp1;
				
				v21 = this.temp1 + 0.5 * (Number(temp1) + Number(this.lastInput)) / this.Fs;
				this.temp1 = v21;
				v2 = this.I * v21;
				
				v3 = this.D * (temp1 - this.lastInput) * this.Fs;
				
				this.lastInput = Number(parseFloat(temp1).toFixed(2));
				let temp2 = Number(parseFloat(v1 + v2 + v3).toFixed(2));
				
				//将输出数保存在数组内
				if (this.index <= (this.dataLength - 1)) {
					
					this.output[this.index] = temp2;
					this.index += 1;
				}
				else {
					
					let i;
					for (i = 0; i < this.dataLength - 1; i += 1) {
						
						this.output[i] = this.output[i + 1];
					}
					this.output[this.dataLength - 1] = temp2;
				}
				
			};
			
			this.setPID = function (P, I, D) {
				
				if (isNaN(P) || isNaN(I) || isNaN(D)) {
					
					return
				}
				this.P = P;
				this.I = I;
				this.D = D;
				this.boxContent = '<div class="input-div">' +
					'<span class="normal-span">P:</span><input type="number" id="PIDVI-input-1" value="' + this.P + '" class="normal-input">' +
					'<span class="normal-span">I:</span><input type="number" id="PIDVI-input-2" value="' + this.I + '" class="normal-input">' +
					'<span class="normal-span">D:</span><input type="number" id="PIDVI-input-3" value="' + this.D + '" class="normal-input"></div>';
			};
			
			this.setInitialData = function () {
				
				let P = Number($('#PIDVI-input-1').val());
				let I = Number($('#PIDVI-input-2').val());
				let D = Number($('#PIDVI-input-3').val());
				this.setPID(P, I, D);
			};
			
			this.reset = function () {
				
				this.lastInput = 0;
				this.P = 1;
				this.I = 1;
				this.D = 1;
				this.Fs = 100;
				this.temp1 = 0;
				this.index = 0;
				this.output = [0];
			};
			
			this.draw = function () {
				
				this.ctx = this.container.getContext("2d");
				this.ctx.font = 'normal 14px Microsoft YaHei';
				this.ctx.fillStyle = 'orange';
				this.ctx.fillRect(0, 0, this.container.width, this.container.height);
				this.ctx.fillStyle = 'black';
				this.ctx.fillText(this.constructor.cnName.substring(0, 3), this.container.width / 2 - 7 * 3 / 2, this.container.height / 4 + 6);
				this.ctx.fillText(this.constructor.cnName.substring(3), this.container.width / 2 - 14 * 3 / 2, this.container.height * 3 / 4);
			};
			
			this.draw();
			
			this.container.addEventListener('mousemove', function (e) {
				//************************************数据提示****************************************//
				dataTip.remove();
				dataTip = $('<div class="rowFlex-div dataTip">' +
					'<span class="normal-span">P:' + _this.P + '</span>' +
					'<span class="normal-span">I:' + _this.I + '</span>' +
					'<span class="normal-span">D:' + _this.D + '</span></div>');
				
				if (e.target.parentElement.id === 'VIContainer') {
					
					$(e.target.parentElement).append(dataTip);
				}
				else {
					dataTip.css('position', 'fixed');
					dataTip.css('top', '0');
					dataTip.css('left', '0');
					dataTip.css('z-index', '100');
					dataTip.css('width', '100%');
					$('body').prepend(dataTip);
				}
			}, false);
			this.container.addEventListener('mouseout', function () {
				dataTip.remove();
			}, false);
		}
		
		static get cnName() {
			
			return 'PID控制器';
		}
	},
	
	VibrateSystemVI: class VibrateSystemVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			let Fs = 200, freedom = 1, dt, fremax;
			let g1 = [], h1 = [], y1 = [], y2 = [], u1 = [], u2 = [];
			
			this.name = 'VibrateSystemVI';
			
			function inverse(n, a) {
				
				let i, j, k, e, f, b = [];
				for (i = 0; i <= n; i++) {
					b.push([]);
					for (j = 0; j <= n; j++) {
						b[i].push(0);
					}
					b[i][i] = 1;
				}
				for (i = 1; i <= n; i++) {
					for (j = i; j <= n; j++) {
						if (a[i][j] != 0) {
							for (k = 1; k <= n; k++) {
								e = a[i][k];
								a[i][k] = a[j][k];
								a[j][k] = e;
								e = b[i][k];
								b[i][k] = b[j][k];
								b[j][k] = e;
							}
							f = 1.0 / a[i][i];
							for (k = 1; k <= n; k++) {
								a[i][k] = f * a[i][k];
								b[i][k] = f * b[i][k];
							}
							for (j = 1; j <= n; j++) {
								if (j != i) {
									f = -a[j][i];
									for (k = 1; k <= n; k++) {
										a[j][k] = a[j][k] + f * a[i][k];
										b[j][k] = b[j][k] + f * b[i][k];
									}
								}
							}
						}
					}
				}
				for (i = 1; i <= n; i++) {
					for (j = 1; j <= n; j++) {
						a[i][j] = b[i][j];
					}
				}
			}
			
			function setInitData() {
				let i, j, l, x, y, z, ss = 0;
				let m = [], c = [], k = [], a = [], b = [], e = [], f = [];
				let m1 = [], c1 = [], k1 = [];
				
				for (i = 0; i < 8; i++) {
					
					y1[i] = 0;
					y2[i] = 0;
					u1[i] = 0;
					u2[i] = 0;
					m1[i] = 0;
					c1[i] = 0;
					k1[i] = 0;
				}
				m1[1] = 1;
				c1[1] = 10;
				k1[1] = 20;
				// 传递矩阵求模型最大频率
				dt = 1.0 / Fs;
				for (i = 0; i <= 2 * freedom; i++) {
					
					g1.push([]);
					h1.push([]);
					m.push([]);
					c.push([]);
					k.push([]);
					a.push([]);
					b.push([]);
					e.push([]);
					f.push([]);
					for (j = 0; j < 2 * freedom; j++) {
						
						g1[i].push(0);
						h1[i].push(0);
						m[i].push(0);
						c[i].push(0);
						k[i].push(0);
						a[i].push(0);
						b[i].push(0);
						e[i].push(0);
						f[i].push(0);
					}
				}
				for (i = 1; i <= freedom; i++) {
					for (j = 1; j <= freedom; j++) {
						m[i][j] = 0;
						c[i][j] = 0;
						k[i][j] = 0;
					}
					m[i][i] = m1[i];
					c[i][i - 1] = -c1[i];
					c[i][i] = c1[i] + c1[i + 1];
					c[i][i + 1] = -c1[i + 1];
					k[i][i - 1] = -k1[i];
					k[i][i] = k1[i] + k1[i + 1];
					k[i][i + 1] = -k1[i + 1];
				}
				for (i = 1; i <= freedom; i++) {
					for (j = 1; j <= freedom; j++) {
						g1[i][j] = k[i][j];
					}
				}
				
				//******************************************************************
				inverse(freedom, g1);
				//******************************************************************
				for (i = 1; i <= freedom; i++) {
					for (j = 1; j <= freedom; j++) {
						h1[i][j] = g1[i][j] * m[j][j];
					}
				}
				
				for (i = 1; i <= freedom; i++) {
					m1[i] = 1;
				}
				for (i = 1; i <= freedom; i++) {
					c1[i] = 0;
					for (j = 1; j <= freedom; j++) {
						c1[i] += m1[j] * h1[i][j];
					}
				}
				for (j = 1; j <= freedom; j++) {
					m1[j] = c1[j];
					if (c1[freedom] != 0) {
						m1[j] = c1[j] / c1[freedom];
					}
				}
				for (i = 1; i <= freedom; i++) {
					ss = ss + m1[i] * m1[i] * m[i][i];
				}
				ss = Math.sqrt(ss);
				for (i = 1; i <= freedom; i++) {
					m1[i] = m1[i] / ss;
				}
				for (i = 1; i <= freedom; i++) {
					for (j = 1; j <= freedom; j++) {
						g1[i][j] = c1[freedom] * m1[i] * m1[j] * m[j][j];
						h1[i][j] -= g1[i][j];
					}
				}
				fremax = Math.sqrt(1.0 / Math.abs(c1[freedom])) / 2 * Math.PI;
				
				//==生成状态空间矩阵=====================================================
				for (i = 1; i <= freedom; i++) {
					for (j = 1; j <= freedom; j++) {
						a[i][j] = 0;
						a[i][j + freedom] = m[i][j];
						a[i + freedom][j] = m[i][j];
						a[i + freedom][j + freedom] = c[i][j];
						b[i][j] = -m[i][j];
						b[i][j + freedom] = 0;
						b[i + freedom][j] = 0;
						b[i + freedom][j + freedom] = k[i][j];
					}
				}
				i = 2 * freedom;
				//*********************************************************************
				inverse(i, a);//g.inverse(i,a);
				//*********************************************************************
				//   return;
				for (i = 1; i <= 2 * freedom; i++) {
					for (j = 1; j <= 2 * freedom; j++) {
						e[i][j] = 0;
						for (l = 1; l <= 2 * freedom; l++) {
							e[i][j] = e[i][j] - a[i][l] * b[l][j];
						}
					}
				}
				for (x = 1; x <= 2 * freedom; x++) {
					for (y = 1; y <= 2 * freedom; y++) {
						g1[x][y] = 0;
						f[x][y] = 0;
					}
					f[x][x] = 1;
				}
				//求E^At
				for (i = 1; i < 20; i++) {
					for (x = 1; x <= 2 * freedom; x++) {
						for (y = 1; y <= 2 * freedom; y++) {
							g1[x][y] = g1[x][y] + f[x][y];
						}
					}
					for (x = 1; x <= 2 * freedom; x++) {
						for (y = 1; y <= 2 * freedom; y++) {
							h1[x][y] = 0;
							for (z = 1; z <= 2 * freedom; z++) {
								h1[x][y] = h1[x][y] + e[x][z] * f[z][y];
							}
							h1[x][y] = h1[x][y] * dt / i;
						}
					}
					for (x = 1; x <= 2 * freedom; x++) {
						for (y = 1; y <= 2 * freedom; y++) {
							f[x][y] = h1[x][y];
						}
					}
				}
				for (x = 1; x <= 2 * freedom; x++) {
					for (y = 1; y <= 2 * freedom; y++) {
						h1[x][y] = 0;
						for (z = 1; z <= 2 * freedom; z++) {
							h1[x][y] = h1[x][y] + g1[x][z] * a[z][y];
						}
					}
				}
			}
			
			this.setData = function (input) {
				
				let inputTemp = Number(Array.isArray(input) ? input[input.length - 1] : input);
				if (Number.isNaN(inputTemp)) {
					
					return false;
				}
				
				if (this.index === 0) {
					setInitData();
				}
				let i, j;
				//计算过程
				u2[freedom + 1] = inputTemp;
				for (i = 1; i <= 2 * freedom; i++) {
					y2[i] = 0;
					for (j = 1; j <= 2 * freedom; j++) {
						y2[i] = y2[i] + g1[i][j] * y1[j] + h1[i][j] * (u1[j] + u2[j]) * 0.5 * dt;
					}
				}
				for (i = 1; i <= 2 * freedom; i++) {
					u1[i] = u2[i];
					y1[i] = y2[i];
				}
				//输出值
				let outputTemp = y2[1 + freedom];
				
				//将输出数保存在数组内
				if (this.index <= (this.dataLength - 1)) {
					
					this.output[this.index] = outputTemp;
					this.index += 1;
				}
				else {
					
					for (i = 0; i < this.dataLength - 1; i += 1) {
						
						this.output[i] = this.output[i + 1];
					}
					this.output[this.dataLength - 1] = outputTemp;
				}
			};
			
			this.reset = function () {
				
				this.index = 0;
				this.output = [0];
			};
			
			this.draw();
		}
		
		static get cnName() {
			
			return 'n自由度振动系统';
		}
	},
	
	RelayVI: class RelayVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			this.name = 'RelayVI';
			
			this.setData = function (input) {
				
				let tempInput = Number(Array.isArray(input) ? input[input.length - 1] : input);
				if (Number.isNaN(tempInput)) {
					
					return false;
				}
				
				if (this.index <= (this.dataLength - 1)) {
					
					this.output[this.index] = tempInput;
					this.index += 1;
				}
				else {
					
					let i;
					for (i = 0; i < this.dataLength - 1; i += 1) {
						
						this.output[i] = this.output[i + 1];
					}
					this.output[this.dataLength - 1] = tempInput;
				}
				return tempInput;
			};
			
			this.draw();
		}
		
		static get cnName() {
			
			return '存储器';
		}
	},
	
	SignalGeneratorVI: class SignalGeneratorVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			const _this = this;
			let timeStamp = 0, point = {}, checkClickTimer = null;
			let dataTip = $('');
			let signalName = ['正弦波', '方波', '三角波', '白噪声'];
			
			this.name = 'SignalGeneratorVI';
			this.inputPointCount = 2;
			this.phase = 0;
			this.amp = 1;
			this.frequency = 256;
			this.signalType = 1;
			
			//多输入选择弹出框
			this.inputBoxTitle = '请选择信号发生器输入参数';
			this.inputBoxContent = '<div class="input-div">' +
				'<div><input type="radio" id="type1" class="radio-input" name="input-type" value="1" alt="幅值">' +
				'<label class="input-label" for="type1">幅值</label></div>' +
				'<div><input type="radio" id="type2" class="radio-input" name="input-type" value="2" alt="频率">' +
				'<label class="input-label" for="type2">频率</label></div></div>';
			
			//VI双击弹出框
			this.boxTitle = '请选择信号类型';
			this.boxContent = '<div class="input-div">' +
				'<div><input type="radio" id="type1" class="radio-input" name="SignalGeneratorVI-type" value="1">' +
				'<label class="input-label" for="type1">正弦波</label></div>' +
				'<div><input type="radio" id="type2" class="radio-input" name="SignalGeneratorVI-type" value="2">' +
				'<label class="input-label" for="type2">方波</label></div>' +
				'<div><input type="radio" id="type3" class="radio-input" name="SignalGeneratorVI-type" value="3">' +
				'<label class="input-label" for="type3">三角波</label></div>' +
				'<div><input type="radio" id="type4" class="radio-input" name="SignalGeneratorVI-type" value="4">' +
				'<label class="input-label" for="type4">白噪声</label></div></div>';
			
			this.updater = function () {
				
				if (this.sourceInfoArray.length > 0) {
					
					for (let sourceInfo of this.sourceInfoArray) {
						
						let sourceVI = VILibrary.InnerObjects.getVIById(sourceInfo[0]);
						let sourceOutputType = sourceInfo[1];
						let inputType = sourceInfo[2];
						let sourceData = sourceVI.getData(sourceOutputType);
						this.setData(sourceData, inputType);
					}
					//更新完幅值频率后刷新一遍数据
					this.setData();
				}
			};
			
			// 采样频率为11025Hz
			this.setData = function (input, inputType) {
				
				if (inputType === 1) {
					
					let temp = Number(Array.isArray(input) ? input[input.length - 1] : input);
					if (Number.isNaN(temp)) {
						
						console.log('SignalGeneratorVI: Input value error');
						return false;
					}
					this.amp = temp;
				}
				else if (inputType === 2) {
					
					let temp = Number(Array.isArray(input) ? input[input.length - 1] : input);
					if (Number.isNaN(temp)) {
						
						console.log('SignalGeneratorVI: Input value error');
						return false;
					}
					this.frequency = temp;
				}
				else {
					
					if (Number.isNaN(this.amp) || Number.isNaN(this.frequency) || Number.isNaN(this.phase)) {
						
						return false;
					}
					let FS = 11025;
					let i, j;
					let T = 1 / this.frequency;//周期
					let dt = 1 / FS;//采样周期
					let t, t1, t2, t3;
					
					if (this.frequency <= 0) {
						
						for (i = 0; i < this.dataLength; i += 1) {
							
							this.output[i] = 0;
						}
						return this.output;
					}
					
					switch (parseInt(this.signalType)) {
						case 1://正弦波
							for (i = 0; i < this.dataLength; i += 1) {
								
								this.output[i] = this.amp * Math.sin(2 * Math.PI * this.frequency * i * dt + (2 * Math.PI * this.phase) / 360);
							}
							break;
						
						case 2://方波
							t1 = T / 2;//半周期时长
							t3 = T * this.phase / 360.0;
							for (i = 0; i < this.dataLength; i += 1) {
								
								t = i * dt + t3;
								t2 = t - Math.floor(t / T) * T;
								if (t2 >= t1) {
									
									this.output[i] = -this.amp;
								}
								else {
									
									this.output[i] = this.amp;
								}
							}
							break;
						
						case 3://三角波
							t3 = T * this.phase / 360.0;
							for (i = 0; i < this.dataLength; i += 1) {
								
								t = i * dt + t3;
								t2 = parseInt(t / T);
								t1 = t - t2 * T;
								if (t1 <= T / 2) {
									this.output[i] = 4 * this.amp * t1 / T - this.amp;
								}
								else {
									this.output[i] = 3 * this.amp - 4 * this.amp * t1 / T;
								}
							}
							break;
						
						case 4://白噪声
							t2 = 32767;// 0 -- 0x7fff
							for (i = 0; i < this.dataLength; i += 1) {
								t1 = 0;
								for (j = 0; j < 12; j += 1) {
									
									t1 += (t2 * Math.random());
								}
								this.output[i] = this.amp * (t1 - 6 * t2) / (3 * t2);
							}
							break;
						
						default://正弦波
							for (i = 0; i < this.dataLength; i += 1) {
								
								this.output[i] = this.amp * Math.sin(2 * Math.PI * this.frequency * i * dt + (2 * Math.PI * this.phase) / 360);
							}
					}
					this.phase += 10;
				}
			};
			
			this.setInitialData = function () {
				
				this.setSignalType(Number($('input[name=SignalGeneratorVI-type]:checked').val()));
			};
			
			this.setSignalType = function (type) {
				
				if (isNaN(type)) {
					return false;
				}
				this.signalType = type;
				this.setData();
				//全局更新一次
				if (this.dataLine) {
					
					VILibrary.InnerObjects.dataUpdater(this.dataLine);
				}
				
			};
			
			this.draw();
			
			this.container.addEventListener('mousedown', function (e) {
				
				timeStamp = e.timeStamp;
				point.x = e.clientX;
				point.y = e.clientY;
			}, false);
			this.container.addEventListener('mouseup', function (e) {
				
				//X、Y移动距离小于5，点击间隔小于200，默认点击事件
				if ((e.timeStamp - timeStamp) < 200 && (point.x - e.clientX) < 5 && (point.y - e.clientY) < 5) {
					
					if (_this.dataLine) {
						
						clearTimeout(checkClickTimer);
						checkClickTimer = setTimeout(function () {
							
							_this.toggleObserver(!_this.timer);
						}, 250);
					}
				}
			}, false);
			this.container.addEventListener('mousemove', function (e) {
				//************************************数据提示****************************************//
				dataTip.remove();
				dataTip = $('<div class="rowFlex-div dataTip">' +
					'<span class="normal-span">信号类型:' + signalName[_this.signalType - 1] + '</span>' +
					'<span class="normal-span">幅值:' + _this.amp.toFixed(2) + '</span>' +
					'<span class="normal-span">频率:' + _this.frequency.toFixed(2) + '</span></div>');
				
				if (e.target.parentElement.id === 'VIContainer') {
					
					$(e.target.parentElement).append(dataTip);
				}
				else {
					dataTip.css('position', 'fixed');
					dataTip.css('top', '0');
					dataTip.css('left', '0');
					dataTip.css('z-index', '100');
					dataTip.css('width', '100%');
					$('body').prepend(dataTip);
				}
			}, false);
			this.container.addEventListener('mouseout', function () {
				dataTip.remove();
			}, false);
			
			//重写双击事件，先去除模版VI旧的绑定再添加新的
			this.container.removeEventListener('dblclick', this.handleDblClick);
			this.handleDblClick = function (e) {
				
				clearTimeout(checkClickTimer);
				VILibrary.InnerObjects.showBox(_this);
			};
			this.container.addEventListener('dblclick', this.handleDblClick, false);
		}
		
		static get cnName() {
			
			return '信号发生器';
		}
	},
	
	BallBeamVI: class BallBeamVI extends TemplateVI {
		
		constructor(VICanvas, draw3DFlag) {
			
			super(VICanvas);
			
			const _this = this;
			
			let camera, scene, renderer, controls, markControl, switchControl, resetControl,
				base, beam, ball, mark, offButton, onButton, resetButton;
			let dataTip = $('');
			
			this.name = 'BallBeamVI';
			this.Fs = 50;
			this.markPosition = 0;  //记录标记移动位置
			this.PIDAngle = 0;
			this.PIDPosition = 0;
			this.limit = true;
			this.angle1 = 0;
			this.angle2 = 0;
			this.position1 = 0;
			this.position2 = 0;
			this.angelOutput = [0];
			this.positionOutput = [0];
			
			//多输出选择弹出框
			this.outputBoxTitle = '请选择球杆模型输出参数';
			this.outputBoxContent = '<div class="input-div">' +
				'<div><input type="radio" id="type1" class="radio-input" name="output-type" value="1">' +
				'<label class="input-label" for="type1">反馈角度</label></div>' +
				'<div><input type="radio" id="type2" class="radio-input" name="output-type" value="2">' +
				'<label class="input-label" for="type2">反馈位置</label></div>' +
				'<div><input type="radio" id="type3" class="radio-input" name="output-type" value="3">' +
				'<label class="input-label" for="type3">标记位置</label></div></div>';
			
			this.toggleObserver = function (flag) {
				
				if (flag) {
					
					if (!this.timer && this.dataLine) {
						
						markControl.detach(mark);
						scene.remove(offButton);
						switchControl.detach(offButton);
						scene.add(onButton);
						switchControl.attach(onButton);
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
					markControl.attach(mark);
					scene.remove(onButton);
					switchControl.detach(onButton);
					scene.add(offButton);
					switchControl.attach(offButton);
				}
			};
			/**
			 * 三维绘图
			 */
			function ballBeamDraw() {
				
				renderer = new THREE.WebGLRenderer({canvas: _this.container, antialias: true});
				renderer.setClearColor(0x6495ED);
				renderer.setSize(_this.container.clientWidth, _this.container.clientHeight);
				
				camera = new THREE.PerspectiveCamera(30, _this.container.clientWidth / _this.container.clientHeight, 1, 100000);
				camera.position.z = 400;
				camera.lookAt(new THREE.Vector3(0, 0, 0));
				
				controls = new THREE.OrbitControls(camera, renderer.domElement);
				controls.rotateSpeed = 0.8;
				controls.enableZoom = true;
				controls.zoomSpeed = 1.2;
				controls.enableDamping = true;
				
				scene = new THREE.Scene();
				
				let light = new THREE.AmbientLight(0x555555);
				scene.add(light);
				let light1 = new THREE.DirectionalLight(0xffffff, 1);
				light1.position.set(4000, 4000, 4000);
				scene.add(light1);
				let light2 = new THREE.DirectionalLight(0xffffff, 1);
				light2.position.set(-4000, 4000, -4000);
				scene.add(light2);
				
				//use as a reference plane for ObjectControl
				let plane = new THREE.Mesh(new THREE.PlaneBufferGeometry(1000, 400));
				
				//标记拖动控制
				markControl = new ObjectControls(camera, renderer.domElement);
				markControl.map = plane;
				markControl.offsetUse = true;
				
				markControl.attachEvent('mouseOver', function () {
					
					renderer.domElement.style.cursor = 'pointer';
				});
				
				markControl.attachEvent('mouseOut', function () {
					
					renderer.domElement.style.cursor = 'auto';
				});
				
				markControl.attachEvent('dragAndDrop', onBallBeamDrag);
				
				markControl.attachEvent('mouseUp', function () {
					
					controls.enabled = true;
					renderer.domElement.style.cursor = 'auto';
				});
				
				//开关控制
				switchControl = new ObjectControls(camera, renderer.domElement);
				switchControl.map = plane;
				switchControl.offsetUse = true;
				
				switchControl.attachEvent('mouseOver', function () {
					
					renderer.domElement.style.cursor = 'pointer';
				});
				
				switchControl.attachEvent('mouseOut', function () {
					
					renderer.domElement.style.cursor = 'auto';
				});
				
				switchControl.attachEvent('onclick', function () {
					
					_this.toggleObserver(!_this.timer);
				});
				
				//重置
				resetControl = new ObjectControls(camera, renderer.domElement);
				resetControl.map = plane;
				resetControl.offsetUse = true;
				
				resetControl.attachEvent('mouseOver', function () {
					
					renderer.domElement.style.cursor = 'pointer';
				});
				
				resetControl.attachEvent('mouseOut', function () {
					
					renderer.domElement.style.cursor = 'auto';
				});
				
				resetControl.attachEvent('onclick', function () {
					_this.reset();
				});
				
				scene.add(base);
				scene.add(beam);
				scene.add(ball);
				scene.add(mark);
				scene.add(offButton);
				scene.add(resetButton);
				markControl.attach(mark);
				switchControl.attach(offButton);
				resetControl.attach(resetButton);
				
				ballBeamAnimate();
				
				// window.addEventListener('resize', function () {
				//
				//     camera.aspect = domElement.clientWidth / domElement.clientHeight;
				//     camera.updateProjectionMatrix();
				//     renderer.setSize(domElement.clientWidth, domElement.clientHeight);
				// });
			}
			
			function onBallBeamDrag() {
				
				controls.enabled = false;
				renderer.domElement.style.cursor = 'pointer';
				this.focused.position.y = this.previous.y;  //lock y direction
				if (this.focused.position.x < -120) {
					
					this.focused.position.x = -120;
				}
				else if (this.focused.position.x > 120) {
					
					this.focused.position.x = 120;
				}
				_this.markPosition = parseInt(this.focused.position.x);
			}
			
			window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame
				|| window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
			
			function ballBeamAnimate() {
				
				window.requestAnimationFrame(ballBeamAnimate);
				markControl.update();
				controls.update();
				renderer.render(scene, camera);
				
			}
			
			function setPosition(ang, pos) {
				
				let angle = -ang;//角度为逆时针旋转
				beam.rotation.z = angle;
				ball.rotation.z = angle;
				mark.rotation.z = angle;
				ball.position.y = pos * Math.sin(angle);
				ball.position.x = pos * Math.cos(angle);
				mark.position.y = _this.markPosition * Math.sin(angle);
				mark.position.x = _this.markPosition * Math.cos(angle);
			}
			
			/**
			 *
			 * @param input 输入端口读取角度
			 */
			this.setData = function (input) {
				
				let inputAngle = Number(Array.isArray(input) ? input[input.length - 1] : input);
				
				if (Number.isNaN(inputAngle)) {
					
					console.log('BallBeamVI: Input value error');
					return;
				}
				let outputPosition, Ts = 1 / this.Fs, angleMax = 100 * Ts;
				if (this.limit) {
					if ((inputAngle - this.PIDAngle) > angleMax) {
						
						inputAngle = this.PIDAngle + angleMax;
					}
					if ((this.PIDAngle - inputAngle) > angleMax) {
						
						inputAngle = this.PIDAngle - angleMax;
					}
					if (inputAngle > 30) {
						
						inputAngle = 30;
					}
					if (inputAngle < -30) {
						
						inputAngle = -30;
					}
				}
				
				this.PIDAngle = inputAngle;//向输出端口上写数据
				
				outputPosition = this.position1 + 0.5 * Ts * (inputAngle + this.angle1);
				this.angle1 = inputAngle;
				this.position1 = outputPosition;
				inputAngle = outputPosition;
				outputPosition = this.position2 + 0.5 * Ts * (inputAngle + this.angle2);
				this.angle2 = inputAngle;
				this.position2 = outputPosition;
				
				outputPosition = outputPosition < -120 ? -120 : outputPosition;
				outputPosition = outputPosition > 120 ? 120 : outputPosition;
				this.PIDPosition = parseFloat(outputPosition).toFixed(2);//向输出端口上写数据
				
				//将输出数保存在数组内
				if (this.index <= (this.dataLength - 1)) {
					
					this.angelOutput[this.index] = this.PIDAngle;
					this.positionOutput[this.index] = this.PIDPosition;
					this.index += 1;
				}
				else {
					
					let i;
					for (i = 0; i < this.dataLength - 1; i += 1) {
						this.angelOutput[i] = this.angelOutput[i + 1];
						this.positionOutput[i] = this.positionOutput[i + 1];
					}
					this.angelOutput[this.dataLength - 1] = this.PIDAngle;
					this.positionOutput[this.dataLength - 1] = this.PIDPosition;
				}
				setPosition(this.PIDAngle * Math.PI / 180, this.PIDPosition);
			};
			
			this.getData = function (dataType) {
				
				if (dataType === 1) {
					
					return this.angelOutput;  //输出角度数组
				}
				if (dataType === 2) {
					
					return this.positionOutput;  //输出位置数组
					
				}
				if (dataType === 3) {
					
					return this.markPosition;  //输出标记位置
				}
			};
			
			this.reset = function () {
				
				this.toggleObserver(false);
				this.PIDAngle = 0;
				this.PIDPosition = 0;
				this.angelOutput = [0];
				this.positionOutput = [0];
				this.limit = true;
				this.angle1 = 0;
				this.angle2 = 0;
				this.position1 = 0;
				this.position2 = 0;
				this.index = 0;
				this.markPosition = 0;
				setPosition(0, 0);
			};
			
			this.draw = function () {
				
				if (draw3DFlag) {
					
					let loadingImg = document.createElement('img');
					loadingImg.src = 'img/loading.gif';
					loadingImg.style.width = '64px';
					loadingImg.style.height = '64px';
					loadingImg.style.position = 'absolute';
					loadingImg.style.top = this.container.offsetTop + this.container.offsetHeight / 2 - 32 + 'px';
					loadingImg.style.left = this.container.offsetLeft + this.container.offsetWidth / 2 - 32 + 'px';
					loadingImg.style.zIndex = '10001';
					this.container.parentNode.appendChild(loadingImg);
					
					let promiseArr = [
						VILibrary.InnerObjects.loadModule('assets/BallBeamControl/base.mtl', 'assets/BallBeamControl/base.obj'),
						VILibrary.InnerObjects.loadModule('assets/BallBeamControl/beam.mtl', 'assets/BallBeamControl/beam.obj'),
						VILibrary.InnerObjects.loadModule('assets/BallBeamControl/ball.mtl', 'assets/BallBeamControl/ball.obj'),
						VILibrary.InnerObjects.loadModule('assets/BallBeamControl/mark.mtl', 'assets/BallBeamControl/mark.obj'),
						VILibrary.InnerObjects.loadModule('assets/BallBeamControl/offButton.mtl', 'assets/BallBeamControl/offButton.obj'),
						VILibrary.InnerObjects.loadModule('assets/BallBeamControl/resetButton.mtl', 'assets/BallBeamControl/resetButton.obj'),
						VILibrary.InnerObjects.loadModule('assets/BallBeamControl/onButton.mtl', 'assets/BallBeamControl/onButton.obj')
					];
					Promise.all(promiseArr).then(function (objArr) {
						
						base = objArr[0];
						beam = objArr[1];
						ball = objArr[2];
						mark = objArr[3];
						offButton = objArr[4];
						resetButton = objArr[5];
						onButton = objArr[6];
						loadingImg.style.display = 'none';
						ballBeamDraw();
					}).catch(e => console.log('BallBeanVIError: ' + e));
				}
				else {
					
					this.ctx = this.container.getContext("2d");
					let img = new Image();
					img.src = 'img/BallBeam.png';
					img.onload = function () {
						
						_this.ctx.drawImage(img, 0, 0, _this.container.width, _this.container.height);
					};
				}
			};
			
			this.draw();
			
			this.container.addEventListener('mousemove', function (e) {
				//************************************数据提示****************************************//
				dataTip.remove();
				dataTip = $('<div class="rowFlex-div dataTip">' +
					'<span class="normal-span">标记位置:' + _this.markPosition + '</span></div>');
				
				if (e.target.parentElement.id === 'VIContainer') {
					
					$(e.target.parentElement).append(dataTip);
				}
				else {
					dataTip.css('position', 'fixed');
					dataTip.css('top', '0');
					dataTip.css('left', '0');
					dataTip.css('z-index', '100');
					dataTip.css('width', '100%');
					$('body').prepend(dataTip);
				}
			}, false);
			this.container.addEventListener('mouseout', function () {
				dataTip.remove();
			}, false);
		}
		
		static get cnName() {
			
			return '球杆模型';
		}
		
		static get defaultWidth() {
			
			return '550px';
		}
		
		static get defaultHeight() {
			
			return '300px';
		}
	},
	
	DoubleTankVI: class DoubleTankVI extends TemplateVI {
		
		constructor(VICanvas, draw3DFlag) {
			
			super(VICanvas);
			
			const _this = this;
			
			let camera, scene, renderer, controls, tank, sinkWater, tapWater1, tapWater2, tapWater3, tankWater1,
				tankWater2;
			let waterMaterial = new THREE.MeshBasicMaterial({color: 0x00a0e3, opacity: 0.9});
			let dataTip = $('');
			
			this.name = 'DoubleTankVI';
			this.Fs = 50;
			this.h1 = 0;
			this.h2 = 0;
			this.waterInput = 0;
			this.waterOutput1 = [0];    //水箱1流量输出
			this.waterOutput2 = [0];    //水箱2流量输出
			this.tankHeight1 = [0];    //水箱1水位高度
			this.tankHeight2 = [0];    //水箱2水位高度
			
			//多输出选择弹出框
			this.outputBoxTitle = '请选择双容水箱输出参数';
			this.outputBoxContent = '<div class="input-div">' +
				'<div><input type="radio" id="type1" class="radio-input" name="output-type" value="1">' +
				'<label class="input-label" for="type1">水箱1输出流量</label></div>' +
				'<div><input type="radio" id="type2" class="radio-input" name="output-type" value="2">' +
				'<label class="input-label" for="type2">水箱2输出流量</label></div>' +
				'<div><input type="radio" id="type3" class="radio-input" name="output-type" value="3">' +
				'<label class="input-label" for="type3">水箱1水位</label></div> ' +
				'<div><input type="radio" id="type4" class="radio-input" name="output-type" value="4">' +
				'<label class="input-label" for="type4">水箱2水位</label></div></div>';
			
			function setWater() {
				
				scene.remove(tapWater1);
				scene.remove(tankWater1);
				scene.remove(tapWater2);
				scene.remove(tankWater2);
				scene.remove(tapWater3);
				scene.remove(sinkWater);
				
				let h3 = 200 - (_this.h1 + _this.h2) / 10;
				sinkWater = new THREE.Mesh(new THREE.BoxGeometry(3180, h3, 1380), waterMaterial);
				sinkWater.position.x = 30;
				sinkWater.position.y = -900 + h3 / 2;
				scene.add(sinkWater);
				if (_this.waterInput > 0) {
					
					tapWater1 = new THREE.Mesh(new THREE.CylinderGeometry(18, 18, 800, 20), waterMaterial);
					tapWater1.position.x = -400;
					tapWater1.position.y = 600;
					
					scene.add(tapWater1);
				}
				
				if (_this.h1 > 0) {
					
					tankWater1 = new THREE.Mesh(new THREE.CylinderGeometry(290, 290, _this.h1, 50), waterMaterial);
					tankWater1.position.x = -200;
					tankWater1.position.y = _this.h1 / 2 + 200;
					
					tapWater2 = new THREE.Mesh(new THREE.CylinderGeometry(18, 18, 800, 20), waterMaterial);
					tapWater2.position.x = 400;
					tapWater2.position.y = -220;
					
					scene.add(tankWater1);
					scene.add(tapWater2);
				}
				
				if (_this.h2 > 0) {
					
					tankWater2 = new THREE.Mesh(new THREE.CylinderGeometry(290, 290, _this.h2, 50), waterMaterial);
					tankWater2.position.x = 600;
					tankWater2.position.y = _this.h2 / 2 - 620;
					
					tapWater3 = new THREE.Mesh(new THREE.CylinderGeometry(18, 18, 200, 20), waterMaterial);
					tapWater3.position.x = 1350;
					tapWater3.position.y = -900 + 200 / 2;
					
					scene.add(tankWater2);
					scene.add(tapWater3);
				}
			}
			
			function doubleTankDraw() {
				
				renderer = new THREE.WebGLRenderer({canvas: _this.container, antialias: true});
				renderer.setClearColor('wheat');
				renderer.setSize(_this.container.clientWidth, _this.container.clientHeight);
				
				camera = new THREE.PerspectiveCamera(30, _this.container.clientWidth / _this.container.clientHeight, 1, 100000);
				camera.position.z = 5000;
				camera.lookAt(new THREE.Vector3(0, 0, 0));
				
				controls = new THREE.OrbitControls(camera, renderer.domElement);
				controls.rotateSpeed = 0.8;
				controls.enableZoom = true;
				controls.zoomSpeed = 1.2;
				controls.enableDamping = true;
				
				scene = new THREE.Scene();
				
				let light = new THREE.AmbientLight(0x555555);
				scene.add(light);
				let light1 = new THREE.DirectionalLight(0xffffff, 1);
				light1.position.set(4000, 4000, 4000);
				scene.add(light1);
				let light2 = new THREE.DirectionalLight(0xffffff, 1);
				light2.position.set(-4000, 4000, -4000);
				scene.add(light2);
				
				tank.position.x = -500;
				tank.position.y = 1000;
				scene.add(tank);
				
				sinkWater = new THREE.Mesh(new THREE.BoxGeometry(3180, 200, 1380), waterMaterial);
				sinkWater.position.x = 30;
				sinkWater.position.y = -900 + 200 / 2;
				scene.add(sinkWater);
				
				animate();
				
				// window.addEventListener('resize', function () {
				//
				//     camera.aspect = domElement.clientWidth / domElement.clientHeight;
				//     camera.updateProjectionMatrix();
				//     renderer.setSize(domElement.clientWidth, domElement.clientHeight);
				// });
			}
			
			window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame
				|| window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
			
			function animate() {
				
				window.requestAnimationFrame(animate);
				controls.update();
				
				renderer.render(scene, camera);
				
			}
			
			this.setData = function (input) {
				
				let waterInput = Number(Array.isArray(input) ? input[input.length - 1] : input);
				if (Number.isNaN(waterInput)) {
					
					return false;
				}
				waterInput = waterInput < 0 ? 0 : waterInput;
				
				let u11, u12, dh1, u21, u22, dh2;
				u11 = waterInput;
				u12 = Math.sqrt(2 * 9.8 * this.h1); //伯努利方程
				dh1 = (u11 - u12) / this.Fs;
				this.h1 = this.h1 + dh1;
				this.h1 = this.h1 > 800 ? 800 : this.h1;    //800为水箱高度
				this.waterInput = u11;
				
				u21 = Math.sqrt(2 * 9.8 * this.h1);
				u22 = Math.sqrt(2 * 9.8 * this.h2);
				dh2 = (u21 - u22) / this.Fs;
				this.h2 = this.h2 + dh2;
				this.h2 = this.h2 > 800 ? 800 : this.h2;    //800为水箱高度
				
				//将输出数保存在数组内
				if (this.index <= (this.dataLength - 1)) {
					
					this.waterOutput1[this.index] = u12;
					this.waterOutput2[this.index] = u22;
					this.tankHeight1[this.index] = this.h1;
					this.tankHeight2[this.index] = this.h2;
					this.index += 1;
				}
				else {
					
					let i;
					for (i = 0; i < this.dataLength - 1; i += 1) {
						
						this.waterOutput1[i] = this.waterOutput1[i + 1];
						this.waterOutput2[i] = this.waterOutput2[i + 1];
						this.tankHeight1[i] = this.tankHeight1[i + 1];
						this.tankHeight2[i] = this.tankHeight2[i + 1];
					}
					this.waterOutput1[this.dataLength - 1] = u12;
					this.waterOutput2[this.dataLength - 1] = u22;
					this.tankHeight1[this.dataLength - 1] = this.h1;
					this.tankHeight2[this.dataLength - 1] = this.h2;
				}
				setWater();
			};
			
			this.getData = function (dataType) {
				
				if (dataType === 1) {
					
					return this.waterOutput1;  //输出
				}
				if (dataType === 2) {
					
					return this.waterOutput2;  //输出
					
				}
				if (dataType === 3) {
					
					return this.tankHeight1;  //输出水箱1水位高度
				}
				if (dataType === 4) {
					
					return this.tankHeight2;  //输出水箱2水位高度
				}
			};
			
			this.reset = function () {
				
				this.toggleObserver(false);
				this.Fs = 50;
				this.h1 = 0;
				this.h2 = 0;
				this.index = 0;
				this.waterInput = 0;
				this.waterOutput1 = [0];
				this.waterOutput2 = [0];
				this.tankHeight1 = [0];
				this.tankHeight2 = [0];
				setWater();
			};
			
			this.draw = function () {
				
				if (draw3DFlag) {
					
					let loadingImg = document.createElement('img');
					loadingImg.src = 'img/loading.gif';
					loadingImg.style.width = '64px';
					loadingImg.style.height = '64px';
					loadingImg.style.position = 'absolute';
					loadingImg.style.top = this.container.offsetTop + this.container.offsetHeight / 2 - 32 + 'px';
					loadingImg.style.left = this.container.offsetLeft + this.container.offsetWidth / 2 - 32 + 'px';
					loadingImg.style.zIndex = '10001';
					this.container.parentNode.appendChild(loadingImg);
					
					VILibrary.InnerObjects.loadModule('assets/DoubleTank/tank.mtl', 'assets/DoubleTank/tank.obj')
						.then(function (obj) {
							
							tank = obj;
							loadingImg.style.display = 'none';
							doubleTankDraw();
						}).catch(e => console.log('DoubleTankVIError: ' + e));
				}
				else {
					
					this.ctx = this.container.getContext("2d");
					let img = new Image();
					img.src = 'img/BallBeam.png';
					img.onload = function () {
						
						_this.ctx.drawImage(img, 0, 0, _this.container.width, _this.container.height);
					};
				}
			};
			
			this.draw();
			
			this.container.addEventListener('mousemove', function (e) {
				//************************************数据提示****************************************//
				dataTip.remove();
				dataTip = $('<div class="rowFlex-div dataTip">' +
					'<span class="normal-span">水箱1水位:' + _this.h1.toFixed(2) + '</span>' +
					'<span class="normal-span">水箱2水位:' + _this.h2.toFixed(2) + '</span></div>');
				
				if (e.target.parentElement.id === 'VIContainer') {
					
					$(e.target.parentElement).append(dataTip);
				}
				else {
					dataTip.css('position', 'fixed');
					dataTip.css('top', '0');
					dataTip.css('left', '0');
					dataTip.css('z-index', '100');
					dataTip.css('width', '100%');
					$('body').prepend(dataTip);
				}
			}, false);
			this.container.addEventListener('mouseout', function () {
				dataTip.remove();
			}, false);
		}
		
		static get cnName() {
			
			return '双容水箱';
		}
		
		static get defaultWidth() {
			
			return '550px';
		}
		
		static get defaultHeight() {
			
			return '300px';
		}
	},
	
	RotorExperimentalRigVI: class RotorExperimentalRigVI extends TemplateVI {
		
		constructor(VICanvas, draw3DFlag) {
			
			super(VICanvas);
			
			const _this = this;
			
			let camera, scene, renderer, controls, base, rotor, offSwitch, onSwitch, switchControl,
				phase = 0, sampleFrequency = 8192, dt = 1 / sampleFrequency;
			
			this.name = 'RotorExperimentalRigVI';
			this.signalType = 1;
			this.rotateSpeed = 2399;
			this.rotateFrequency = this.rotateSpeed / 60;  //旋转频率
			this.dataLength = 2048;
			this.signalOutput = [0];
			this.frequencyOutput = [0];
			this.orbitXOutput = [0];
			this.orbitYOutput = [0];
			
			//多输出选择弹出框
			this.outputBoxTitle = '请选择转子实验台输出参数';
			this.outputBoxContent = '<div class="input-div">' +
				'<div><input type="radio" id="type1" class="radio-input" name="output-type" value="1">' +
				'<label class="input-label" for="type1">时域信号</label></div>' +
				'<div><input type="radio" id="type2" class="radio-input" name="output-type" value="2">' +
				'<label class="input-label" for="type2">频域信号</label></div>' +
				'<div><input type="radio" id="type3" class="radio-input" name="output-type" value="3">' +
				'<label class="input-label" for="type3">轴心轨迹</label></div>' +
				'<div><input type="radio" id="type4" class="radio-input" name="output-type" value="4">' +
				'<label class="input-label" for="type4">旋转频率</label></div></div>';
			
			//VI双击弹出框
			this.boxTitle = '请设置输出信号类型';
			this.boxContent = '<div class="input-div">' +
				'<div><input type="radio" id="type1" class="radio-input" name="RotorExperimentalRigVI-type" value="1">' +
				'<label class="input-label" for="type1">转速信号</label></div>' +
				'<div><input type="radio" id="type2" class="radio-input" name="RotorExperimentalRigVI-type" value="2">' +
				'<label class="input-label" for="type2">加速度信号</label></div>' +
				'<div><input type="radio" id="type3" class="radio-input" name="RotorExperimentalRigVI-type" value="3">' +
				'<label class="input-label" for="type3">轴心位移X信号</label></div>' +
				'<div><input type="radio" id="type4" class="radio-input" name="RotorExperimentalRigVI-type" value="4">' +
				'<label class="input-label" for="type4">轴心位移Y信号</label></div></div>';
			
			this.toggleObserver = function (flag) {
				
				if (flag) {
					
					if (!this.timer) {
						
						scene.remove(offSwitch);
						switchControl.detach(offSwitch);
						scene.add(onSwitch);
						switchControl.attach(onSwitch);
						this.timer = window.setInterval(function () {
							
							phase += 36;
							generateData();
							
							rotor.rotation.x += 2 * Math.PI * _this.rotateSpeed / 10;
							//定时更新相同数据线VI的数据
							if (_this.dataLine) {
								
								VILibrary.InnerObjects.dataUpdater(_this.dataLine);
							}
						}, 100);
					}
				}
				else {
					
					if (this.timer) {
						
						window.clearInterval(this.timer);
						this.timer = 0;
					}
					scene.remove(onSwitch);
					switchControl.detach(onSwitch);
					scene.add(offSwitch);
					switchControl.attach(offSwitch);
				}
			};
			
			/**
			 *设置转速
			 * @param input 输入端口读取转速
			 */
			this.setData = function (input) {
				
				let temp = Number(Array.isArray(input) ? input[input.length - 1] : input);
				if (Number.isNaN(temp)) {
					
					return false;
				}
				this.rotateSpeed = temp;
				this.rotateFrequency = this.rotateSpeed / 60;
			};
			
			this.setInitialData = function () {
				
				_this.signalType = Number($('input[name=RotorExperimentalRigVI-type]:checked').val());
			};
			
			this.getData = function (dataType) {
				
				if (dataType === 1) {
					
					return this.signalOutput;  //输出时域信号
					
				}
				if (dataType === 2) {
					
					return this.frequencyOutput;  //输出频域信号
					
				}
				if (dataType === 3) {
					
					return [this.orbitXOutput, this.orbitYOutput];  //输出轴心位置
					
				}
				if (dataType === 4) {
					
					return this.rotateFrequency;  //输出旋转频率
					
				}
			};
			
			function generateData() {
				
				let i;
				for (i = 0; i < _this.dataLength; i += 1) {
					
					_this.orbitXOutput[i] = 7.5 * Math.sin(2 * Math.PI * _this.rotateFrequency * i * dt + 2 * Math.PI * phase / 360) +
						4 * Math.sin(4 * Math.PI * _this.rotateFrequency * i * dt + 4 * Math.PI * phase / 360) + 2 * Math.random();
				}
				for (i = 0; i < _this.dataLength; i += 1) {
					
					_this.orbitYOutput[i] = 7.5 * Math.sin(2 * Math.PI * _this.rotateFrequency * i * dt + 2 * Math.PI * (phase + 90) / 360) +
						4 * Math.sin(4 * Math.PI * _this.rotateFrequency * i * dt + 4 * Math.PI * (phase + 90) / 360) + 2 * Math.random();
				}
				if (_this.signalType == 1) {//转速信号    正弦波
					
					for (i = 0; i < _this.dataLength; i += 1) {
						
						_this.signalOutput[i] = 5 * Math.sin(2 * Math.PI * _this.rotateFrequency * i * dt + 2 * Math.PI * phase / 360);
					}
				}
				else if (_this.signalType == 2) {//加速度信号
					
					for (i = 0; i < _this.dataLength; i += 1) {
						
						_this.signalOutput[i] = 5 * Math.sin(2 * Math.PI * _this.rotateFrequency * i * dt + 2 * Math.PI * phase / 360) +
							6 * Math.sin(4 * Math.PI * _this.rotateFrequency * i * dt + 4 * Math.PI * phase / 360) + 2 * Math.random();
					}
				}
				else if (_this.signalType == 3) {//位移X信号
					
					for (i = 0; i < _this.dataLength; i += 1) {
						
						_this.signalOutput[i] = _this.orbitXOutput[i];
					}
				}
				else if (_this.signalType == 4) {//位移Y信号
					
					for (i = 0; i < _this.dataLength; i += 1) {
						
						_this.signalOutput[i] = _this.orbitYOutput[i];
					}
				}
				_this.frequencyOutput = VILibrary.InnerObjects.fft(1, 11, _this.signalOutput);
			}
			
			/**
			 * 三维绘图
			 * @constructor
			 */
			function rotorExperimentalRigDraw() {
				
				renderer = new THREE.WebGLRenderer({
					canvas: _this.container,
					antialias: true
				});
				renderer.setClearColor(0x6495ED);
				renderer.setSize(_this.container.clientWidth, _this.container.clientHeight);
				
				camera = new THREE.PerspectiveCamera(30, _this.container.clientWidth / _this.container.clientHeight, 1, 100000);
				camera.position.z = 400;
				camera.lookAt(new THREE.Vector3(0, 0, 0));
				
				controls = new THREE.OrbitControls(camera, renderer.domElement);
				controls.rotateSpeed = 0.8;
				controls.enableZoom = true;
				controls.zoomSpeed = 1.2;
				controls.enableDamping = true;
				
				scene = new THREE.Scene();
				
				let light = new THREE.AmbientLight(0x555555);
				scene.add(light);
				let light1 = new THREE.DirectionalLight(0xffffff, 1);
				light1.position.set(4000, 4000, 4000);
				scene.add(light1);
				let light2 = new THREE.DirectionalLight(0xffffff, 1);
				light2.position.set(-4000, 4000, -4000);
				scene.add(light2);
				
				//use as a reference plane for ObjectControl
				let plane = new THREE.Mesh(new THREE.PlaneBufferGeometry(1000, 400));
				
				//开关控制
				switchControl = new ObjectControls(camera, renderer.domElement);
				switchControl.map = plane;
				switchControl.offsetUse = true;
				
				switchControl.attachEvent('mouseOver', function () {
					
					renderer.domElement.style.cursor = 'pointer';
				});
				
				switchControl.attachEvent('mouseOut', function () {
					
					renderer.domElement.style.cursor = 'auto';
				});
				
				switchControl.attachEvent('onclick', function () {
					
					_this.toggleObserver(!_this.timer);
				});
				
				scene.add(base);
				scene.add(rotor);
				scene.add(offSwitch);
				switchControl.attach(offSwitch);
				
				rotorAnimate();
				
				// window.addEventListener('resize', function () {
				//
				//     camera.aspect = domElement.clientWidth / domElement.clientHeight;
				//     camera.updateProjectionMatrix();
				//     renderer.setSize(domElement.clientWidth, domElement.clientHeight);
				// });
			}
			
			window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame
				|| window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
			function rotorAnimate() {
				
				window.requestAnimationFrame(rotorAnimate);
				switchControl.update();
				controls.update();
				renderer.render(scene, camera);
				
			}
			
			this.reset = function () {
				
				_this.signalType = 1;
				_this.rotateSpeed = 0;
				_this.index = 0;
				_this.rotateFrequency = 0;  //旋转频率
				_this.signalOutput = [0];
				_this.frequencyOutput = [0];
				_this.orbitXOutput = [0];
				_this.orbitYOutput = [0];
			};
			
			this.draw = function () {
				
				if (draw3DFlag) {
					
					let loadingImg = document.createElement('img');
					loadingImg.src = 'img/loading.gif';
					loadingImg.style.width = '64px';
					loadingImg.style.height = '64px';
					loadingImg.style.position = 'absolute';
					loadingImg.style.top = this.container.offsetTop + this.container.offsetHeight / 2 - 32 + 'px';
					loadingImg.style.left = this.container.offsetLeft + this.container.offsetWidth / 2 - 32 + 'px';
					loadingImg.style.zIndex = '1001';
					this.container.parentNode.appendChild(loadingImg);
					
					let promiseArr = [
						VILibrary.InnerObjects.loadModule('assets/RotorExperimentalRig/base.mtl', 'assets/RotorExperimentalRig/base.obj'),
						VILibrary.InnerObjects.loadModule('assets/RotorExperimentalRig/rotor.mtl', 'assets/RotorExperimentalRig/rotor.obj'),
						VILibrary.InnerObjects.loadModule('assets/RotorExperimentalRig/offSwitch.mtl', 'assets/RotorExperimentalRig/offSwitch.obj'),
						VILibrary.InnerObjects.loadModule('assets/RotorExperimentalRig/onSwitch.mtl', 'assets/RotorExperimentalRig/onSwitch.obj')
					];
					Promise.all(promiseArr).then(function (objArr) {
						
						base = objArr[0];
						rotor = objArr[1];
						offSwitch = objArr[2];
						onSwitch = objArr[3];
						loadingImg.style.display = 'none';
						rotorExperimentalRigDraw();
					}).catch(e => console.log('BallBeanVIError: ' + e));
				}
				else {
					
					this.ctx = this.container.getContext("2d");
					let img = new Image();
					img.src = 'img/RotorExperimentalRig.png';
					img.onload = function () {
						
						_this.ctx.drawImage(img, 0, 0, _this.container.width, _this.container.height);
					};
				}
			};
			
			this.draw();
		}
		
		static get cnName() {
			
			return '转子实验台';
		}
		
		static get defaultWidth() {
			
			return '550px';
		}
		
		static get defaultHeight() {
			
			return '300px';
		}
	},
	
	TextVI: class TextVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			this.name = 'TextVI';
			this.ctx = this.container.getContext("2d");
			this.outputPointCount = 0;
			this.latestInput = 0;
			this.decimalPlace = 1;
			//VI双击弹出框
			this.boxTitle = '请输入保留小数位数';
			this.boxContent = '<div class="input-div">' +
				'<input type="number" id="TextVI-input" value="' + this.decimalPlace + '" class="normal-input"></div>';
			
			this.setData = function (input) {
				
				this.latestInput = Number(Array.isArray(input) ? input[input.length - 1] : input);
				if (Number.isNaN(this.latestInput)) {
					
					return false;
				}
				
				let str = parseFloat(this.latestInput).toFixed(this.decimalPlace);
				this.ctx.font = "normal 12px Microsoft YaHei";
				this.ctx.fillStyle = 'orange';
				this.ctx.fillRect(0, 0, this.container.width, this.container.height);
				this.ctx.fillStyle = 'black';
				this.ctx.fillText(str, this.container.width / 2 - 6 * str.length, this.container.height / 2 + 6);
			};
			
			this.setDecimalPlace = function (decimalPlace) {
				
				this.decimalPlace = parseInt(decimalPlace);
				this.setData(this.latestInput);
				this.boxContent = '<div class="input-div">' +
					'<input type="number" id="TextVI-input" value="' + this.decimalPlace + '" class="normal-input"></div>';
			};
			
			this.setInitialData = function () {
				
				this.setDecimalPlace($('#TextVI-input').val());
			};
			
			this.reset = function () {
				
				this.latestInput = 0;
				this.decimalPlace = 1;
			};
			
			this.draw();
		}
		
		static get cnName() {
			
			return '文本显示';
		}
		
		static get defaultWidth() {
			
			return '100px';
		}
		
		static get defaultHeight() {
			
			return '40px';
		}
	},
	
	RoundPanelVI: class RoundPanelVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			const _this = this;
			
			this.name = 'RoundPanelVI';
			this.ctx = this.container.getContext("2d");
			this.outputPointCount = 0;
			this.latestInput = 0;
			this.handAngle = Math.PI * 5 / 6;
			this.panelRangeAngle = Math.PI * 4 / 3;
			this.minValue = 0;
			this.maxValue = 100;
			this.bigSectionNum = 10;
			this.smallSectionNum = 10;
			this.unit = '';
			this.title = '';
			this.bgColor = "RGB(249, 250, 249)";
			this.screenColor = "RGB(61, 132, 185)";
			this.borderColor = "RGB(100,100,100)";
			this.fontColor = "RGB(0, 0, 0)";
			this.fontSize = parseInt(16 * this.radius / 150);
			this.R = this.container.width > this.container.height ? this.container.height / 2 : this.container.width / 2;
			this.radius = this.R * 0.9;
			//VI双击弹出框
			this.boxTitle = '请设置初始参数';
			this.boxContent = '<div class="input-div">' +
				'<span class="normal-span">标题:</span><input type="text" id="RoundPanelVI-input-1" value="' + this.title + '" class="normal-input">' +
				'<span class="normal-span">单位:</span><input type="text" id="RoundPanelVI-input-2" value="' + this.unit + '" class="normal-input">' +
				'<span class="normal-span">最小值:</span><input type="number" id="RoundPanelVI-input-3" value="' + this.minValue + '" class="normal-input">' +
				'<span class="normal-span">最大值:</span><input type="number" id="RoundPanelVI-input-4" value="' + this.maxValue + '" class="normal-input"></div>';
			
			function parsePosition(angle) {
				
				let position = [];
				position[0] = _this.radius * 0.82 * Math.cos(angle);
				position[1] = _this.radius * 0.82 * Math.sin(angle);
				return position;
			}
			
			function dataFormation(data) {
				
				data = parseFloat(data);
				if (data == 0) {
					
					return '0';
				}
				if (Math.abs(data) >= 1000) {
					
					data = data / 1000;
					data = data.toFixed(1).toString() + 'k';
				}
				else if (Math.abs(data) < 1000 && Math.abs(data) >= 100) {
					
					data = data.toFixed(0).toString();
				}
				else if (Math.abs(data) < 100 && Math.abs(data) >= 10) {
					
					data = data.toFixed(1).toString();
				}
				else if (Math.abs(data) < 10) {
					
					data = data.toFixed(2).toString();
				}
				return data;
			}
			
			this.setRange = function (minVal, maxVal, unitText, titleText) {
				
				minVal = Array.isArray(minVal) ? minVal[minVal.length - 1] : minVal;
				if (Number.isNaN(minVal)) {
					
					return false;
				}
				maxVal = Array.isArray(maxVal) ? maxVal[maxVal.length - 1] : maxVal;
				if (Number.isNaN(maxVal)) {
					
					return false;
				}
				if (maxVal < minVal) {
					
					return false;
				}
				this.minValue = minVal;
				this.maxValue = maxVal;
				
				if (typeof unitText === 'string') {
					
					this.unit = unitText;
				}
				
				if (typeof titleText === 'string') {
					
					this.title = titleText;
				}
				this.draw();
				
				this.boxContent = '<div class="input-div">' +
					'<span class="normal-span">标题:</span><input type="text" id="RoundPanelVI-input-1" value="' + this.title + '" class="normal-input">' +
					'<span class="normal-span">单位:</span><input type="text" id="RoundPanelVI-input-2" value="' + this.unit + '" class="normal-input">' +
					'<span class="normal-span">最小值:</span><input type="number" id="RoundPanelVI-input-3" value="' + this.minValue + '" class="normal-input">' +
					'<span class="normal-span">最大值:</span><input type="number" id="RoundPanelVI-input-4" value="' + this.maxValue + '" class="normal-input"></div>';
			};
			
			this.setData = function (input) {
				
				this.latestInput = Number(Array.isArray(input) ? input[input.length - 1] : input);
				if (Number.isNaN(this.latestInput)) {
					
					return false;
				}
				this.latestInput = this.latestInput < this.minValue ? this.minValue : this.latestInput;
				this.latestInput = this.latestInput > this.maxValue ? this.maxValue : this.latestInput;
				this.latestInput = parseFloat(this.latestInput).toFixed(2);
				this.handAngle = Math.PI * 5 / 6 + this.latestInput / this.maxValue * this.panelRangeAngle;
				this.draw();
			};
			
			this.setInitialData = function () {
				
				let title = Number($('#RoundPanelVI-input-1').val());
				let unit = Number($('#RoundPanelVI-input-2').val());
				let minValue = Number($('#RoundPanelVI-input-3').val());
				let maxValue = Number($('#RoundPanelVI-input-4').val());
				this.setRange(minValue, maxValue, unit, title);
			};
			
			this.reset = function () {
				
				this.latestInput = 0;
			};
			this.drawHand = function () {
				
				this.ctx.save();
				// 位移到目标点
				this.ctx.translate(this.R, this.R);
				this.ctx.rotate(this.handAngle);
				this.ctx.moveTo(-this.radius * 0.05, 0);
				this.ctx.lineTo(0, -this.radius * 0.02);
				this.ctx.lineTo(this.radius * 0.75, 0);
				this.ctx.lineTo(0, this.radius * 0.02);
				this.ctx.lineTo(-this.radius * 0.05, 0);
				this.ctx.fillStyle = this.screenColor;
				this.ctx.fill();
				this.ctx.restore();
				
			};
			
			this.draw = function () {
				
				// 画出背景边框
				this.ctx.beginPath();
				this.ctx.arc(this.R, this.R, this.R, 0, 360, false);
				this.ctx.lineTo(this.R * 2, this.R);
				this.ctx.fillStyle = this.borderColor;//填充颜色
				this.ctx.fill();//画实心圆
				this.ctx.closePath();
				// 画出背景圆
				this.ctx.beginPath();
				this.ctx.arc(this.R, this.R, this.R * 0.97, 0, 360, false);
				this.ctx.fillStyle = this.bgColor;//填充颜色
				this.ctx.fill();//画实心圆
				this.ctx.closePath();
				// 保存
				this.ctx.save();
				// 位移到目标点
				this.ctx.translate(this.R, this.R);
				// 画出圆弧
				this.ctx.beginPath();
				this.ctx.arc(0, 0, this.radius * 0.98, Math.PI * 5 / 6, Math.PI / 6, false);
				this.ctx.arc(0, 0, this.radius, Math.PI / 6, Math.PI * 5 / 6, true);
				this.ctx.lineTo(this.radius * 0.98 * Math.cos(Math.PI * 5 / 6), this.radius * 0.98 * Math.sin(Math.PI * 5 / 6));
				this.ctx.restore();
				this.ctx.fillStyle = this.screenColor;
				this.ctx.fill();
				this.ctx.beginPath();
				this.ctx.lineCap = "round";
				this.ctx.lineWidth = 2;
				if (this.radius < 150) {
					
					this.ctx.lineWidth = 1;
				}
				this.ctx.strokeStyle = this.screenColor;
				let i, j;
				// 保存
				this.ctx.save();
				// 位移到目标点
				this.ctx.translate(this.R, this.R);
				
				let rotateAngle = Math.PI * 5 / 6, position, markStr, fontSize;
				this.ctx.font = 'normal ' + this.fontSize / 2 + 'px Microsoft YaHei';
				fontSize = /\d+/.exec(this.ctx.font)[0];
				for (i = 0; i <= this.bigSectionNum; i += 1) {
					
					this.ctx.save();
					this.ctx.rotate(rotateAngle);
					this.ctx.moveTo(this.radius * 0.99, 0);
					this.ctx.lineTo(this.radius * 0.9, 0);
					this.ctx.restore();
					
					if (this.R > 100) {
						for (j = 1; j < this.smallSectionNum; j += 1) {
							
							if (i == this.bigSectionNum) {
								break;
							}
							this.ctx.save();
							this.ctx.rotate(rotateAngle);
							this.ctx.rotate(j * this.panelRangeAngle / this.smallSectionNum / this.bigSectionNum);
							this.ctx.moveTo(this.radius * 0.99, 0);
							this.ctx.lineTo(this.radius * 0.95, 0);
							this.ctx.restore();
						}
						
						if (i > 0 && i < this.bigSectionNum) {
							
							markStr = dataFormation((this.maxValue - _thisminValue) / this.bigSectionNum * i + this.minValue);
							position = parsePosition(rotateAngle);
							this.ctx.fillText(markStr, position[0] - fontSize / 4 * markStr.length, position[1]);
						}
					}
					rotateAngle += this.panelRangeAngle / this.bigSectionNum;
				}
				markStr = dataFormation(this.minValue);
				position = parsePosition(Math.PI * 5 / 6);
				this.ctx.fillText(markStr, position[0] - fontSize / 4 * markStr.length, position[1]);
				markStr = dataFormation(this.maxValue);
				position = parsePosition(Math.PI * 5 / 6 + this.panelRangeAngle);
				this.ctx.fillText(markStr, position[0] - fontSize / 3 * markStr.length, position[1]);
				this.ctx.restore();
				
				this.ctx.font = 'bold ' + this.fontSize + 'px Microsoft YaHei';
				fontSize = /\d+/.exec(this.ctx.font)[0];
				markStr = this.latestInput.toString() + this.unit;
				this.ctx.fillText(markStr, this.R - fontSize / 4 * markStr.length, this.R * 3 / 2);
				markStr = this.title;
				this.ctx.fillText(markStr, this.R - fontSize / 4 * markStr.length, this.R * 1 / 2);
				this.ctx.stroke();
				this.ctx.closePath();
				this.drawHand();
			};
			
			this.draw();
		}
		
		static get cnName() {
			
			return '圆表盘';
		}
		
		static get defaultWidth() {
			
			return '150px';
		}
		
		static get defaultHeight() {
			
			return '150px';
		}
	},
	
	BarVI: class BarVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			const _this = this;
			
			this.name = 'BarVI';
			this.ctx = this.container.getContext("2d");
			this.outputPointCount = 0;
			this.labelX = [];
			this.maxValY = 100;
			this.minValY = 0;
			this.autoZoom = true;
			this.pointNum = 100;
			this.drawRulerFlag = true;
			//网格矩形四周边距 TOP RIGHT BOTTOM LEFT//
			this.offsetT = 10;
			this.offsetR = 10;
			this.offsetB = 10;
			this.offsetL = 10;
			if ((this.container.height >= 200) && (this.container.width >= 200)) {
				
				this.offsetB = 35;
				this.offsetL = 42;
			}
			this.waveWidth = this.container.width - this.offsetL - this.offsetR;
			this.waveHeight = this.container.height - this.offsetT - this.offsetB;
			this.ratioX = this.waveWidth / this.pointNum;
			this.ratioY = this.waveHeight / (this.maxValY - this.minValY);
			
			//颜色选型//
			this.bgColor = "RGB(255, 255, 255)";
			this.screenColor = 'RGB(255,253,246)';
			this.gridColor = "RGB(204, 204, 204)";
			this.fontColor = "RGB(0, 0, 0)";
			this.signalColor = "RGB(255, 100, 100)";
			this.rulerColor = "RGB(255, 100, 100)";
			
			//缓冲数组
			this.bufferVal = [];
			this.curPointX = this.offsetL;
			this.curPointY = this.offsetT;
			
			this.setData = function (data) {
				
				if (!Array.isArray(data)) {
					
					console.log('BarVI: input type error');
					return false;
				}
				this.pointNum = data.length > this.pointNum ? data.length : this.pointNum;
				
				let YMax = 0, YMin = 0, i;
				for (i = 0; i < this.pointNum; i += 1) {
					
					this.bufferVal[i] = data[i] == undefined ? 0 : data[i];
					YMax = YMax < this.bufferVal[i] ? this.bufferVal[i] : YMax;
					YMin = YMin > this.bufferVal[i] ? this.bufferVal[i] : YMin;
				}
				if (this.autoZoom) {
					
					this.setAxisRangY(YMin, 1.2 * YMax);
				}
				this.ratioX = this.waveWidth / this.pointNum;
				this.ratioY = this.waveHeight / (this.maxValY - this.minValY);
				this.draw();
			};
			
			this.draw = function () {
				
				this.drawBackground();
				this.drawWave();
				if (this.drawRulerFlag) {
					
					this.drawRuler();
				}
			};
			
			this.drawWave = function () {
				
				let i, barHeight, x, y;
				//绘制柱状图
				for (i = 0; i < this.pointNum; i += 1) {
					
					x = this.offsetL + i * this.ratioX;
					barHeight = this.bufferVal[i] * this.ratioY;
					y = this.offsetT + this.waveHeight - barHeight;
					this.ctx.beginPath();
					this.ctx.fillStyle = this.signalColor;
					this.ctx.fillRect(x + 0.1 * this.ratioX, y, this.ratioX * 0.8, barHeight);
					this.ctx.closePath();
				}
			};
			
			this.drawBackground = function () {
				
				let ctx = this.ctx;
				//刷背景//
				ctx.beginPath();
				/* 将这个渐变设置为fillStyle */
				// ctx.fillStyle = grad;
				ctx.fillStyle = this.bgColor;
				ctx.lineWidth = 3;
				ctx.strokeStyle = "RGB(25, 25, 25)";
				ctx.fillRect(0, 0, this.container.width, this.container.height);
				ctx.strokeRect(3, 3, this.container.width - 6, this.container.height - 6);
				ctx.closePath();
				
				//画网格矩形边框和填充
				ctx.beginPath();
				ctx.fillStyle = this.screenColor;
				ctx.lineWidth = 1;
				ctx.strokeStyle = 'RGB(0, 0, 0)';
				ctx.fillRect(this.offsetL, this.offsetT, this.waveWidth, this.waveHeight);
				ctx.strokeRect(this.offsetL, this.offsetT, this.waveWidth, this.waveHeight);
				ctx.closePath();
				
				//网格行数
				let nRow = this.container.height / 50;
				let divY = this.waveHeight / nRow;
				
				ctx.beginPath();
				ctx.lineWidth = 1;
				ctx.lineCap = "round";
				ctx.strokeStyle = this.gridColor;
				
				let i;
				//绘制横向网格线
				for (i = 1; i < nRow; i += 1) {
					
					ctx.moveTo(this.offsetL, divY * i + this.offsetT);
					ctx.lineTo(this.container.width - this.offsetR, divY * i + this.offsetT);
				}
				ctx.stroke();
				ctx.closePath();
				
				if ((this.container.height >= 200) && (this.container.width >= 200)) {
					
					//绘制横纵刻度
					let scaleYNum = this.container.height / 50;
					let scaleXNum = this.container.width / 50;
					let scaleYStep = this.waveHeight / scaleYNum;
					let scaleXStep = this.waveWidth / scaleXNum;
					ctx.beginPath();
					ctx.lineWidth = 1;
					ctx.strokeStyle = this.fontColor;
					//画纵刻度
					let k;
					for (k = 2; k <= scaleYNum; k += 2) {
						
						ctx.moveTo(this.offsetL - 6, this.offsetT + k * scaleYStep);
						ctx.lineTo(this.offsetL, this.offsetT + k * scaleYStep);
						
					}
					// //画横刻度
					// for (k = 0; k < scaleXNum; k += 2) {
					//
					//
					//     ctx.moveTo(this.offsetL + k * scaleXStep, this.offsetT + this.waveHeight);
					//     ctx.lineTo(this.offsetL + k * scaleXStep, this.offsetT + this.waveHeight + 7);
					//
					// }
					ctx.stroke();
					ctx.closePath();
					////////////////画数字字体////////////////
					ctx.font = "normal 12px Calibri";
					
					let valStepX = this.pointNum / scaleXNum;
					let valStepY = (this.maxValY - this.minValY) / scaleYNum;
					
					ctx.fillStyle = this.fontColor;
					let temp = 0;
					if (this.labelX.length < this.pointNum) {
						
						for (i = 0; i < this.pointNum; i += 1) {
							
							this.labelX[i] = i;
						}
					}
					//横坐标刻度//
					for (i = 0; i < scaleXNum; i += 2) {
						
						temp = this.labelX[parseInt(valStepX * i)];
						ctx.fillText(VILibrary.InnerObjects.fixNumber(temp), this.offsetL + scaleXStep * i - 9 + this.ratioX / 2, this.container.height - 10);
					}
					//纵坐标刻度//
					for (i = 2; i <= scaleYNum; i += 2) {
						
						temp = this.maxValY - valStepY * i;
						
						ctx.fillText(VILibrary.InnerObjects.fixNumber(temp), this.offsetL - 35, this.offsetT + scaleYStep * i + 5);
					}
					ctx.closePath();
					ctx.save();
				}
			};
			
			this.drawBackground();
			
			this.drawRuler = function () {
				
				//是否缝隙间不绘制标尺
				// if ((this.curPointX + 0.1 * this.ratioX - this.offsetL ) % this.ratioX < 0.2 * this.ratioX) {
				//
				//     return;
				// }
				
				if (this.curPointX >= (this.container.width - this.offsetR)) {
					return;
				}
				//画标尺//
				this.ctx.beginPath();
				this.ctx.lineWidth = 1;
				this.ctx.lineCap = "round";
				this.ctx.strokeStyle = this.rulerColor;
				this.ctx.font = "normal 14px Calibri";
				this.ctx.fillStyle = this.rulerColor;
				
				//竖标尺//
				this.ctx.moveTo(this.curPointX + 0.5, this.offsetT);
				this.ctx.lineTo(this.curPointX + 0.5, this.container.height - this.offsetB);
				this.ctx.stroke();
				let curPointX = parseInt((this.curPointX - this.offsetL + this.ratioX / 2) * this.pointNum / this.waveWidth);
				curPointX = curPointX === this.pointNum ? curPointX - 1 : curPointX;
				let curPointY = VILibrary.InnerObjects.fixNumber(this.bufferVal[curPointX]);
				this.ctx.fillText('(' + this.labelX[curPointX] + ',' + curPointY + ')',
					this.container.width - this.curPointX < 80 ? this.curPointX - 80 : this.curPointX + 4, this.offsetT + 15);
				this.ctx.closePath();
			};
			
			this.reset = function () {
				
				this.bufferVal = [];
				this.drawBackground();
			};
			
			this.setAxisRangY = function (yMin, yMax) {
				
				this.minValY = yMin;
				this.maxValY = yMax;
				this.drawBackground();
			};
			
			this.setAxisX = function (labelX) {
				
				this.labelX = labelX;
				this.drawBackground();
			};
			
			this.setPointNum = function (num) {
				
				this.pointNum = num;
				this.drawBackground();
			};
			
			this.setLabel = function (xLabel, yLabel) {
				
				this.strLabelX = xLabel;
				this.strLabelY = yLabel;
				this.drawBackground();
			};
			
			this.setRowColNum = function (row, col) {
				
				this.nRow = row;
				this.nCol = col;
				this.drawBackground();
			};
			
			let _mouseOverFlag = false;
			let _mouseOutFlag = false;
			let _dragAndDropFlag = false;
			let _mouseUpFlag = false;
			let _onclickFlag = false;
			let _mouseMoveFlag = false;
			
			this.dragAndDrop = function () {
			};// this.container.style.cursor = 'move';
			this.mouseOver = function () {
			}; // this.container.style.cursor = 'pointer';
			this.mouseOut = function () {
			}; // this.container.style.cursor = 'auto';
			this.mouseUp = function () {
			}; // this.container.style.cursor = 'auto';
			this.mouseMove = function () {
			};
			this.onclick = function () {
			};
			
			this.attachEvent = function (event, handler) {
				
				switch (event) {
					case 'mouseOver':
						this.mouseOver = handler;
						_mouseOverFlag = true;
						break;
					case 'mouseOut':
						this.mouseOut = handler;
						_mouseOutFlag = true;
						break;
					case 'dragAndDrop':
						this.dragAndDrop = handler;
						_dragAndDropFlag = true;
						break;
					case 'mouseUp':
						this.mouseUp = handler;
						_mouseUpFlag = true;
						break;
					case 'onclick':
						this.onclick = handler;
						_onclickFlag = true;
						break;
					case 'mouseMove':
						this.mouseMove = handler;
						_mouseMoveFlag = true;
						break;
				}
			};
			
			this.detachEvent = function (event) {
				
				switch (event) {
					case 'mouseOver':
						_mouseOverFlag = false;
						break;
					case 'mouseOut':
						_mouseOutFlag = false;
						break;
					case 'dragAndDrop':
						_dragAndDropFlag = false;
						break;
					case 'mouseUp':
						_mouseUpFlag = false;
						break;
					case 'onclick':
						_onclickFlag = false;
						break;
					case 'mouseMove':
						_mouseMoveFlag = false;
						break;
				}
				
			};
			
			function onMouseMove(event) {
				
				if (!_this.drawRulerFlag || _this.bufferVal.length == 0) {
					
					return;
				}
				_this.curPointX = event.offsetX == undefined ? event.layerX : event.offsetX - 1;
				_this.curPointY = event.offsetY == undefined ? event.layerY : event.offsetY - 1;
				
				if (_this.curPointX <= _this.offsetL) {
					
					_this.curPointX = _this.offsetL;
				}
				if (_this.curPointX >= (_this.container.width - _this.offsetR)) {
					
					_this.curPointX = _this.container.width - _this.offsetR;
				}
				_this.draw();
				if (_mouseMoveFlag) {
					_this.mouseMove();
				}
			}
			
			this.container.addEventListener('mousemove', onMouseMove, false);   // mouseMoveListener
		}
		
		static get cnName() {
			
			return '柱状图';
		}
		
		static get defaultWidth() {
			
			return '500px';
		}
		
		static get defaultHeight() {
			
			return '250px';
		}
	},
	
	WaveVI: class WaveVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			const _this = this;
			
			this.name = 'WaveVI';
			this.ctx = this.container.getContext("2d");
			this.outputPointCount = 0;
			//坐标单位//
			this.strLabelX = 'X';
			this.strLabelY = 'Y';
			//坐标数值//
			this.maxValX = 1023;
			this.minValX = 0;
			this.maxValY = 10;
			this.minValY = -10;
			this.autoZoom = true;
			//网格行列数//
			this.nRow = 4;
			this.nCol = 8;
			this.pointNum = 1023;
			this.drawRulerFlag = true;
			
			//网格矩形四周边距 TOP RIGHT BOTTOM LEFT//
			this.offsetT = 10;
			this.offsetR = 10;
			this.offsetB = 10;
			this.offsetL = 10;
			if ((_this.container.height >= 200) && (_this.container.width >= 200)) {
				
				_this.offsetB = 30;
				_this.offsetL = 35;
			}
			this.waveWidth = this.container.width - this.offsetL - this.offsetR;
			this.waveHeight = this.container.height - this.offsetT - this.offsetB;
			
			//颜色选型//
			this.bgColor = "RGB(249, 250, 249)";
			this.screenColor = "RGB(61, 132, 185)";
			this.gridColor = "RGB(200, 200, 200)";
			this.fontColor = "RGB(0, 0, 0)";
			this.signalColor = "RGB(255, 255, 0)";
			this.rulerColor = "RGB(255, 255, 255)";
			
			//缓冲数组
			this.bufferVal = [];
			this.curPointX = this.offsetL;
			this.curPointY = this.offsetT;
			
			this.draw = function () {
				
				this.drawBackground();
				this.drawWave();
				if (this.drawRulerFlag) {
					
					this.drawRuler();
				}
			};
			
			this.drawWave = function () {
				
				let ratioX = this.waveWidth / (this.pointNum - 1);
				let ratioY = this.waveHeight / (this.maxValY - this.minValY);
				let pointX = [];
				let pointY = [];
				
				let i;
				for (i = 0; i < this.pointNum; i += 1) {
					
					pointX[i] = this.offsetL + i * ratioX;
					pointY[i] = this.offsetT + (this.maxValY - this.bufferVal[i]) * ratioY;
					if (pointY[i] < this.offsetT) {
						
						pointY[i] = this.offsetT;
					}
					if (pointY[i] > (this.offsetT + this.waveHeight)) {
						
						pointY[i] = this.offsetT + this.waveHeight;
					}
				}
				//绘制波形曲线
				this.ctx.beginPath();
				this.ctx.lineWidth = 2;
				this.ctx.lineCap = "round";
				this.ctx.strokeStyle = this.signalColor;
				this.ctx.moveTo(pointX[0], pointY[0]);
				for (i = 1; i < this.pointNum; i += 1) {
					
					this.ctx.lineTo(pointX[i], pointY[i]);
				}
				this.ctx.stroke();
				this.ctx.closePath();
				this.ctx.save();
			};
			
			this.drawBackground = function () {
				
				let ctx = this.ctx;
				//刷背景//
				ctx.beginPath();
				/* 将这个渐变设置为fillStyle */
				// ctx.fillStyle = grad;
				ctx.fillStyle = this.bgColor;
				ctx.lineWidth = 3;
				ctx.strokeStyle = "RGB(25, 25, 25)";
				ctx.fillRect(0, 0, this.container.width, this.container.height);
				ctx.strokeRect(3, 3, this.container.width - 6, this.container.height - 6);
				ctx.closePath();
				
				//画网格矩形边框和填充
				ctx.beginPath();
				ctx.fillStyle = this.screenColor;
				ctx.lineWidth = 1;
				ctx.strokeStyle = this.gridColor;
				ctx.fillRect(this.offsetL, this.offsetT, this.waveWidth, this.waveHeight);
				ctx.strokeRect(this.offsetL + 0.5, this.offsetT + 0.5, this.waveWidth, this.waveHeight);
				ctx.closePath();
				
				let nRow = this.nRow;
				let nCol = this.nCol;
				let divX = this.waveWidth / nCol;
				let divY = this.waveHeight / nRow;
				
				ctx.beginPath();
				ctx.lineWidth = 1;
				ctx.lineCap = "round";
				ctx.strokeStyle = this.gridColor;
				
				let i, j;
				//绘制横向网格线
				for (i = 1; i < nRow; i += 1) {
					
					ctx.moveTo(this.offsetL, divY * i + this.offsetT);
					ctx.lineTo(this.container.width - this.offsetR, divY * i + this.offsetT);
				}
				//绘制纵向网格线
				for (j = 1; j < nCol; j += 1) {
					
					ctx.moveTo(divX * j + this.offsetL, this.offsetT);
					ctx.lineTo(divX * j + this.offsetL, this.container.height - this.offsetB);
				}
				ctx.stroke();
				ctx.closePath();
				
				if ((this.container.height >= 200) && (this.container.width >= 200)) {
					
					let scaleYNum = 8;
					let scaleXNum = 16;
					let scaleYStep = this.waveHeight / scaleYNum;
					let scaleXStep = this.waveWidth / scaleXNum;
					
					////////////////画数字字体////////////////
					ctx.font = "normal 12px Calibri";
					
					let strLab;
					//横标签//
					strLab = this.strLabelX;
					ctx.fillText(strLab, this.container.width - this.offsetR - strLab.length * 6 - 10, this.container.height - this.offsetB + 20);
					
					//纵标签//
					strLab = this.strLabelY;
					ctx.fillText(strLab, strLab.length * 6, this.offsetT + 12);
					
					let valStepX = (this.maxValX - this.minValX) / scaleXNum;
					let valStepY = (this.maxValY - this.minValY) / scaleYNum;
					
					ctx.fillStyle = this.fontColor;
					let temp = 0;
					//横坐标刻度//
					for (i = 2; i < scaleXNum; i += 2) {
						
						temp = this.minValX + valStepX * i;
						ctx.fillText(VILibrary.InnerObjects.fixNumber(temp), this.offsetL + scaleXStep * i - 9, this.container.height - 12);
					}
					//纵坐标刻度//
					for (i = 2; i < scaleYNum; i += 2) {
						
						temp = this.maxValY - valStepY * i;
						ctx.fillText(VILibrary.InnerObjects.fixNumber(temp), this.offsetL - 28, this.offsetT + scaleYStep * i + 5);
					}
					ctx.closePath();
					ctx.save();
				}
			};
			
			this.drawBackground();
			
			this.drawRuler = function () {
				
				//画标尺//
				this.ctx.beginPath();
				this.ctx.lineWidth = 1;
				this.ctx.lineCap = "round";
				this.ctx.strokeStyle = this.rulerColor;
				this.ctx.font = "normal 14px Calibri";
				this.ctx.fillStyle = this.rulerColor;
				
				//竖标尺//
				this.ctx.moveTo(this.curPointX + 0.5, this.offsetT);
				this.ctx.lineTo(this.curPointX + 0.5, this.container.height - this.offsetB);
				this.ctx.stroke();
				let curPointX = parseFloat((this.curPointX - this.offsetL) * (this.maxValX - this.minValX) / this.waveWidth)
					.toFixed(2);
				let curPointY = parseFloat(this.bufferVal[parseInt((this.curPointX - this.offsetL) * this.pointNum / this.waveWidth)])
					.toFixed(2);
				this.ctx.fillText('(' + curPointX + ',' + curPointY + ')',
					this.container.width - this.curPointX < 80 ? this.curPointX - 80 : this.curPointX + 4, this.offsetT + 15);
				this.ctx.closePath();
			};
			
			this.reset = function () {
				
				this.bufferVal = [];
				this.drawBackground();
			};
			
			this.setData = function (data) {
				
				if (!Array.isArray(data)) {
					
					console.log('WaveVI: input type error');
					return false;
				}
				this.pointNum = data.length > this.pointNum ? data.length : this.pointNum;
				let YMax = 0, YMin = 0, i;
				for (i = 0; i < this.pointNum; i += 1) {
					
					this.bufferVal[i] = data[i] == undefined ? 0 : data[i];
					YMax = YMax < this.bufferVal[i] ? this.bufferVal[i] : YMax;
					YMin = YMin > this.bufferVal[i] ? this.bufferVal[i] : YMin;
				}
				if (this.autoZoom) {
					
					if ((this.maxValY <= YMax) || (this.maxValY - YMax > 5 * (YMax - YMin))) {
						
						this.maxValY = 2 * YMax - YMin;
						this.minValY = 2 * YMin - YMax;
					}
					if ((this.minValY >= YMin) || (YMin - this.maxValY > 5 * (YMax - YMin))) {
						
						this.maxValY = 2 * YMax - YMin;
						this.minValY = 2 * YMin - YMax;
					}
					if (YMax < 0.01 && YMin > -0.01) {
						
						this.maxValY = 1;
						this.minValY = -1;
					}
				}
				this.draw();
			};
			
			this.setAxisRangX = function (xMin, xNax) {
				
				this.minValX = xMin;
				this.maxValX = xNax;
				this.drawBackground();
			};
			
			this.setAxisRangY = function (yMin, yMax) {
				
				this.minValY = yMin;
				this.maxValY = yMax;
				this.drawBackground();
			};
			
			this.setPointNum = function (num) {
				
				this.pointNum = num;
				this.drawBackground();
			};
			
			this.setLabel = function (xLabel, yLabel) {
				
				this.strLabelX = xLabel;
				this.strLabelY = yLabel;
				this.drawBackground();
			};
			
			this.setRowColNum = function (row, col) {
				
				this.nRow = row;
				this.nCol = col;
				this.drawBackground();
			};
			
			let _mouseOverFlag = false;
			let _mouseOutFlag = false;
			let _dragAndDropFlag = false;
			let _mouseUpFlag = false;
			let _onclickFlag = false;
			let _mouseMoveFlag = false;
			
			this.dragAndDrop = function () {
			};// this.container.style.cursor = 'move';
			this.mouseOver = function () {
			}; // this.container.style.cursor = 'pointer';
			this.mouseOut = function () {
			}; // this.container.style.cursor = 'auto';
			this.mouseUp = function () {
			}; // this.container.style.cursor = 'auto';
			this.mouseMove = function () {
			};
			this.onclick = function () {
			};
			
			this.attachEvent = function (event, handler) {
				
				switch (event) {
					case 'mouseOver':
						this.mouseOver = handler;
						_mouseOverFlag = true;
						break;
					case 'mouseOut':
						this.mouseOut = handler;
						_mouseOutFlag = true;
						break;
					case 'dragAndDrop':
						this.dragAndDrop = handler;
						_dragAndDropFlag = true;
						break;
					case 'mouseUp':
						this.mouseUp = handler;
						_mouseUpFlag = true;
						break;
					case 'onclick':
						this.onclick = handler;
						_onclickFlag = true;
						break;
					case 'mouseMove':
						this.mouseMove = handler;
						_mouseMoveFlag = true;
						break;
				}
			};
			
			this.detachEvent = function (event) {
				
				switch (event) {
					case 'mouseOver':
						_mouseOverFlag = false;
						break;
					case 'mouseOut':
						_mouseOutFlag = false;
						break;
					case 'dragAndDrop':
						_dragAndDropFlag = false;
						break;
					case 'mouseUp':
						_mouseUpFlag = false;
						break;
					case 'onclick':
						_onclickFlag = false;
						break;
					case 'mouseMove':
						_mouseMoveFlag = false;
						break;
				}
				
			};
			
			function onMouseMove(event) {
				
				if (!_this.drawRulerFlag || _this.bufferVal.length == 0) {
					
					return;
				}
				_this.curPointX = event.offsetX == undefined ? event.layerX : event.offsetX - 1;
				_this.curPointY = event.offsetY == undefined ? event.layerY : event.offsetY - 1;
				
				if (_this.curPointX <= _this.offsetL) {
					_this.curPointX = _this.offsetL;
				}
				if (_this.curPointX >= (_this.container.width - _this.offsetR)) {
					_this.curPointX = _this.container.width - _this.offsetR;
				}
				_this.draw();
				if (_mouseMoveFlag) {
					_this.mouseMove();
				}
			}
			
			this.container.addEventListener('mousemove', onMouseMove, false);   // mouseMoveListener
			
		}
		
		static get cnName() {
			
			return '波形显示';
		}
		
		static get defaultWidth() {
			
			return '500px';
		}
		
		static get defaultHeight() {
			
			return '300px';
		}
	},
	
	OrbitWaveVI: class OrbitWaveVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			const _this = this;
			
			this.name = 'OrbitWaveVI';
			this.ctx = this.container.getContext("2d");
			this.outputPointCount = 0;
			
			//坐标单位//
			this.strLabelX = 'X';
			this.strLabelY = 'Y';
			
			//坐标数值//
			this.MaxVal = 20;
			this.MinVal = -20;
			this.autoZoom = true;
			
			//网格行列数//
			this.nRow = 10;
			this.nCol = 10;
			this.pointNum = 0;
			this.borderWidth = 5;
			this.drawRulerFlag = true;
			
			//网格矩形四周边距 TOP RIGHT BOTTOM LEFT//
			this.offsetT = 5 + this.borderWidth;
			this.offsetR = 5 + this.borderWidth;
			
			this.offsetB = 5 + this.borderWidth;
			this.offsetL = 5 + this.borderWidth;
			if ((this.container.height >= 200) && (this.container.width >= 200)) {
				
				this.offsetB = 25 + this.borderWidth;
				this.offsetL = 38 + this.borderWidth;
			}
			this.waveWidth = this.container.width - this.offsetL - this.offsetR;
			this.waveHeight = this.container.height - this.offsetT - this.offsetB;
			
			//颜色选型//
			this.bgColor = "RGB(249, 250, 249)";
			this.screenColor = "RGB(61, 132, 185)";
			this.gridColor = "RGB(200, 200, 200)";
			this.fontColor = "RGB(0, 0, 0)";
			this.signalColor = "RGB(255, 255, 0)";
			this.rulerColor = "RGB(255, 255, 255)";
			
			//缓冲数组
			this.bufferValX = [];
			this.bufferValY = [];
			this.curPointX = this.offsetL;
			this.curPointY = this.offsetT;
			
			this.draw = function () {
				
				_this.drawBackground();
				_this.drawWave();
				if (_this.drawRulerFlag) {
					
					_this.drawRuler();
				}
			};
			
			this.drawWave = function () {
				
				let ratioX = _this.waveWidth / (_this.MaxVal - _this.MinVal);
				let ratioY = _this.waveHeight / (_this.MaxVal - _this.MinVal);
				let pointX = [];
				let pointY = [];
				
				let i;
				for (i = 0; i < _this.pointNum; i += 1) {
					
					pointX[i] = _this.offsetL + (_this.bufferValX[i] - _this.MinVal) * ratioX;
					pointY[i] = _this.offsetT + (_this.MaxVal - _this.bufferValY[i]) * ratioY;
					if (pointY[i] < _this.offsetT) {
						
						pointY[i] = _this.offsetT;
					}
					if (pointY[i] > (_this.offsetT + _this.waveHeight)) {
						
						pointY[i] = _this.offsetT + _this.waveHeight;
					}
				}
				//绘制波形曲线
				_this.ctx.beginPath();
				_this.ctx.lineWidth = 2;
				_this.ctx.lineCap = "round";
				_this.ctx.strokeStyle = _this.signalColor;
				for (i = 1; i < _this.pointNum; i += 1) {
					
					_this.ctx.moveTo(pointX[i - 1], pointY[i - 1]);
					_this.ctx.lineTo(pointX[i], pointY[i]);
				}
				_this.ctx.stroke();
				_this.ctx.closePath();
				_this.ctx.save();
			};
			
			this.drawBackground = function () {
				
				let ctx = _this.ctx;
				//刷背景//
				ctx.beginPath();
				/* 将这个渐变设置为fillStyle */
				// ctx.fillStyle = grad;
				ctx.fillStyle = _this.bgColor;
				ctx.lineWidth = 3;
				ctx.strokeStyle = "RGB(25, 25, 25)";
				ctx.fillRect(0, 0, _this.container.width, _this.container.height);
				ctx.strokeRect(3, 3, _this.container.width - 6, _this.container.height - 6);
				ctx.closePath();
				
				//刷网格背景//
				//画网格矩形边框和填充
				ctx.beginPath();
				ctx.fillStyle = _this.screenColor;
				ctx.lineWidth = 1;
				ctx.strokeStyle = _this.gridColor;
				ctx.fillRect(_this.offsetL, _this.offsetT, _this.waveWidth, _this.waveHeight);
				ctx.strokeRect(_this.offsetL + 0.5, _this.offsetT + 0.5, _this.waveWidth, _this.waveHeight);
				ctx.closePath();
				
				let nRow = _this.nRow;
				let nCol = _this.nCol;
				let divX = _this.waveWidth / nCol;
				let divY = _this.waveHeight / nRow;
				ctx.beginPath();
				ctx.lineWidth = 1;
				ctx.lineCap = "round";
				ctx.strokeStyle = _this.gridColor;
				
				let i, j;
				//绘制横向网格线
				for (i = 1; i < nRow; i += 1) {
					if (i == 4) {
						
						ctx.lineWidth = 10;
					}
					else {
						
						ctx.lineWidth = 1;
					}
					ctx.moveTo(_this.offsetL, divY * i + _this.offsetT);
					ctx.lineTo(_this.container.width - _this.offsetR, divY * i + _this.offsetT);
				}
				//绘制纵向网格线
				for (j = 1; j < nCol; j += 1) {
					
					if (i == 4) {
						
						ctx.lineWidth = 10;
					}
					else {
						
						ctx.lineWidth = 1;
					}
					ctx.moveTo(divX * j + _this.offsetL, _this.offsetT);
					ctx.lineTo(divX * j + _this.offsetL, _this.container.height - _this.offsetB);
				}
				ctx.stroke();
				ctx.closePath();
				//////////////////////////////////////////////////////
				
				if ((_this.container.height >= 200) && (_this.container.width >= 200)) {
					//绘制横纵刻度
					let scaleYNum = 20;
					let scaleXNum = 20;
					let scaleYStep = _this.waveHeight / scaleYNum;
					let scaleXStep = _this.waveWidth / scaleXNum;
					////////////////画数字字体////////////////
					ctx.beginPath();
					ctx.lineWidth = 1;
					ctx.strokeStyle = _this.fontColor;
					ctx.font = "normal 14px Calibri";
					
					let xValStep = (_this.MaxVal - _this.MinVal) / scaleXNum;
					let yValStep = (_this.MaxVal - _this.MinVal) / scaleYNum;
					
					ctx.fillStyle = _this.fontColor;
					let temp = 0;
					//横坐标刻度//
					for (i = 2; i < scaleXNum; i += 4) {
						
						temp = _this.MinVal + xValStep * i;
						ctx.fillText(VILibrary.InnerObjects.fixNumber(temp), _this.offsetL + scaleXStep * i - 9, _this.container.height - 10);
					}
					//纵坐标刻度//
					for (i = 2; i < scaleYNum; i += 4) {
						
						temp = _this.MaxVal - yValStep * i;
						ctx.fillText(VILibrary.InnerObjects.fixNumber(temp), _this.offsetL - 30, _this.offsetT + scaleYStep * i + 5);
					}
					ctx.closePath();
					ctx.save();
				}
			};
			
			this.drawBackground();
			
			this.drawRuler = function () {
				
				//画标尺//
				_this.ctx.beginPath();
				_this.ctx.lineWidth = 1;
				_this.ctx.lineCap = "round";
				_this.ctx.strokeStyle = _this.rulerColor;
				_this.ctx.font = "normal 14px Calibri";
				_this.ctx.fillStyle = _this.rulerColor;
				
				//竖标尺//
				_this.ctx.moveTo(_this.curPointX + 0.5, _this.offsetT);
				_this.ctx.lineTo(_this.curPointX + 0.5, _this.container.height - _this.offsetB);
				_this.ctx.stroke();
				let i;
				let curPointX = parseFloat((_this.curPointX - _this.offsetL) * (_this.MaxVal - _this.MinVal) / _this.waveWidth + _this.MinVal)
					.toFixed(1);
				let curPointY = [];
				for (i = 0; i < _this.pointNum; i += 1) {
					
					if (parseFloat(_this.bufferValX[i]).toFixed(1) === curPointX) {
						
						curPointY.push(parseFloat(_this.bufferValY[i]).toFixed(1));
						if (curPointY.length >= 5) {
							
							break;
						}
					}
				}
				for (i = 0; i < curPointY.length; i += 1) {
					
					_this.ctx.fillText('(' + curPointX + ', ' + curPointY[i] + ')',
						_this.container.width - _this.curPointX < 80 ? _this.curPointX - 80 : _this.curPointX + 4, _this.offsetT + 15 + i * 15);
				}
				_this.ctx.closePath();
			};
			
			this.setAxisRange = function (min, max) {
				
				_this.MinVal = min;
				_this.MaxVal = max;
				_this.drawBackground();
			};
			
			this.setRowColNum = function (row, col) {
				
				_this.nRow = row;
				_this.nCol = col;
				_this.drawBackground();
			};
			
			this.setData = function (input) {
				
				let dataX = input[0];
				let dataY = input[1];
				if ((dataX == null || undefined) || (dataY == null || undefined)) {
					
					return false;
				}
				
				_this.pointNum = dataX.length > dataY.length ? dataY.length : dataX.length; //取较短的数据长度
				if (Number.isNaN(_this.pointNum)) {
					
					return false;
				}
				let XMax = 0, XMin = 0, YMax = 0, YMin = 0;
				let i;
				for (i = 0; i < _this.pointNum; i += 1) {
					
					_this.bufferValY[i] = dataY[i] == undefined ? 0 : dataY[i];
					YMax = YMax < _this.bufferValY[i] ? _this.bufferValY[i] : YMax;
					YMin = YMin > _this.bufferValY[i] ? _this.bufferValY[i] : YMin;
				}
				for (i = 0; i < _this.pointNum; i += 1) {
					
					_this.bufferValX[i] = dataX[i] == undefined ? 0 : dataX[i];
					XMax = XMax < _this.bufferValX[i] ? _this.bufferValX[i] : XMax;
					XMin = XMin > _this.bufferValX[i] ? _this.bufferValX[i] : XMin;
				}
				if (_this.autoZoom) {
					
					let XYMax = YMax > XMax ? YMax : XMax;
					let XYMin = YMin > XMin ? XMin : YMin;
					if ((_this.MaxVal <= XYMax) || (_this.MaxVal - XYMax > 5 * (XYMax - XYMin))) {
						
						_this.MaxVal = 2 * XYMax - XYMin;
						_this.MinVal = 2 * XYMin - XYMax;
					}
					if ((_this.MinVal >= XYMin) || (XYMin - _this.MaxVal > 5 * (XYMax - XYMin))) {
						
						_this.MaxVal = 2 * XYMax - XYMin;
						_this.MinVal = 2 * XYMin - XYMax;
					}
					if (XYMax < 0.01 && XYMin > -0.01) {
						
						_this.MaxVal = 1;
						_this.MinVal = -1;
					}
				}
				_this.draw();
			};
			
			this.reset = function () {
				let i;
				for (i = 0; i < _this.pointNum; i += 1) {
					
					_this.bufferValY[i] = 0.0;
					_this.bufferValX[i] = 0.0;
				}
				_this.drawBackground();
			};
			
			let _mouseOverFlag = false;
			let _mouseOutFlag = false;
			let _dragAndDropFlag = false;
			let _mouseUpFlag = false;
			let _onclickFlag = false;
			let _mouseMoveFlag = false;
			
			this.attachEvent = function (event, handler) {
				
				switch (event) {
					case 'mouseOver':
						this.mouseOver = handler;
						_mouseOverFlag = true;
						break;
					case 'mouseOut':
						this.mouseOut = handler;
						_mouseOutFlag = true;
						break;
					case 'dragAndDrop':
						this.dragAndDrop = handler;
						_dragAndDropFlag = true;
						break;
					case 'mouseUp':
						this.mouseUp = handler;
						_mouseUpFlag = true;
						break;
					case 'onclick':
						this.onclick = handler;
						_onclickFlag = true;
						break;
					case 'mouseMove':
						this.mouseMove = handler;
						_mouseMoveFlag = true;
						break;
				}
			};
			
			this.detachEvent = function (event) {
				
				switch (event) {
					case 'mouseOver':
						_mouseOverFlag = false;
						break;
					case 'mouseOut':
						_mouseOutFlag = false;
						break;
					case 'dragAndDrop':
						_dragAndDropFlag = false;
						break;
					case 'mouseUp':
						_mouseUpFlag = false;
						break;
					case 'onclick':
						_onclickFlag = false;
						break;
					case 'mouseMove':
						_mouseMoveFlag = false;
						break;
				}
				
			};
			
			function onMouseMove(event) {
				
				if (!_this.drawRulerFlag || _this.bufferValY.length == 0) {
					
					return;
				}
				_this.curPointX = event.offsetX == undefined ? event.layerX : event.offsetX - 5;
				_this.curPointY = event.offsetY == undefined ? event.layerY : event.offsetY - 5;
				
				if (_this.curPointX <= _this.offsetL) {
					_this.curPointX = _this.offsetL;
				}
				if (_this.curPointX >= (_this.container.width - _this.offsetR)) {
					_this.curPointX = _this.container.width - _this.offsetR;
				}
				_this.draw();
			}
			
			this.container.addEventListener('mousemove', onMouseMove, false);   // mouseMoveListener
			
		}
		
		static get cnName() {
			
			return '二维波形';
		}
		
		static get defaultWidth() {
			
			return '400px';
		}
		
		static get defaultHeight() {
			
			return '370px';
		}
	},
	
	ButtonVI: class ButtonVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			const _this = this;
			
			let timeStamp = 0, point = {};
			
			this.name = 'ButtonVI';
			this.ctx = this.container.getContext("2d");
			this.outputPointCount = 0;
			
			this.draw();
			
			this.container.addEventListener('mousedown', function (e) {
				
				timeStamp = e.timeStamp;
				point.x = e.clientX;
				point.y = e.clientY;
			}, false);
			
			this.container.addEventListener('mouseup', function (e) {
				
				//X、Y移动距离小于5，点击间隔小于200，默认点击事件
				if ((e.timeStamp - timeStamp) < 200 && (point.x - e.clientX) < 5 && (point.y - e.clientY) < 5) {
					
					if (_this.dataLine) {
						
						_this.toggleObserver(!_this.timer);
					}
				}
			}, false);
		}
		
		static get cnName() {
			
			return '开关';
		}
		
		static get defaultWidth() {
			
			return '100px';
		}
	},
	
	ProportionResponseVI: class ProportionResponseVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			const _this = this;
			let dataTip = $('');
			
			this.name = 'ProportionResponseVI';
			this.k1 = 1.5;
			//VI双击弹出框
			this.boxTitle = '比例响应';
			this.boxContent = '<div class="input-div"><span class="normal-span">K1:</span>' +
				'<input type="number" id="ProportionResponseVI-input" value="' + this.k1 + '" class="normal-input"></div>';
			
			this.setData = function (input) {
				
				let temp1 = Number(Array.isArray(input) ? input[input.length - 1] : input);
				if (Number.isNaN(temp1)) {
					
					return false;
				}
				
				let temp2 = this.k1 * temp1;
				
				//将输出数保存在数组内
				if (this.index <= (this.dataLength - 1)) {
					
					this.output[this.index] = temp2;
					this.index += 1;
				}
				else {
					
					let i;
					for (i = 0; i < this.dataLength - 1; i += 1) {
						
						this.output[i] = this.output[i + 1];
					}
					this.output[this.dataLength - 1] = temp2;
				}
			};
			
			this.setInitialData = function () {
				
				this.k1 = Number($('#ProportionResponseVI-input').val());
				this.boxContent = '<div class="input-div"><span class="normal-span">K1:</span>' +
					'<input type="number" id="ProportionResponseVI-input" value="' + this.k1 + '" class="normal-input"></div>';
			};
			
			this.draw();
			
			this.container.addEventListener('mousemove', function (e) {
				//************************************数据提示****************************************//
				dataTip.remove();
				dataTip = $('<div class="rowFlex-div dataTip">' +
					'<span class="normal-span">k1:' + _this.k1 + '</span></div>');
				
				if (e.target.parentElement.id === 'VIContainer') {
					
					$(e.target.parentElement).append(dataTip);
				}
				else {
					dataTip.css('position', 'fixed');
					dataTip.css('top', '0');
					dataTip.css('left', '0');
					dataTip.css('z-index', '100');
					dataTip.css('width', '100%');
					$('body').prepend(dataTip);
				}
			}, false);
			this.container.addEventListener('mouseout', function () {
				dataTip.remove();
			}, false);
		}
		
		static get cnName() {
			
			return '比例响应';
		}
	},
	
	IntegrationResponseVI: class IntegrationResponseVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			const _this = this;
			let dataTip = $('');
			
			this.name = 'IntegrationResponseVI';
			this.k2 = 5;
			this.Fs = 1000;
			this.lastInput = 0;
			this.temp1 = 0;
			//VI双击弹出框
			this.boxTitle = '积分响应';
			this.boxContent = '<div class="input-div"><span class="normal-span">K2:</span>' +
				'<input type="number" id="IntegrationResponseVI-input" value="' + this.k2 + '" class="normal-input"></div>';
			
			this.setData = function (input) {
				
				let inputTemp = Number(Array.isArray(input) ? input[input.length - 1] : input);
				if (Number.isNaN(inputTemp)) {
					
					return false;
				}
				
				let v2, v21;
				
				v21 = this.temp1 + 0.5 * (inputTemp + this.lastInput) / this.Fs;
				this.temp1 = v21;
				v2 = this.k2 * v21;
				
				let outputTemp = v2;
				this.lastInput = inputTemp;
				
				if (this.index <= (this.dataLength - 1)) {
					
					this.output[this.index] = outputTemp;
					this.index += 1;
				}
				else {
					
					let i;
					for (i = 0; i < this.dataLength - 1; i += 1) {
						this.output[i] = this.output[i + 1];
					}
					this.output[this.dataLength - 1] = outputTemp;
				}
			};
			
			this.setInitialData = function () {
				
				this.k2 = Number($('#IntegrationResponseVI-input').val());
				this.boxContent = '<div class="input-div"><span class="normal-span">K2:</span>' +
					'<input type="number" id="IntegrationResponseVI-input" value="' + this.k2 + '" class="normal-input"></div>';
			};
			
			this.reset = function () {
				this.lastInput = 0;
				this.temp1 = 0;
				this.index = 0;
				this.output = [0];
			};
			this.draw();
			
			this.container.addEventListener('mousemove', function (e) {
				//************************************数据提示****************************************//
				dataTip.remove();
				dataTip = $('<div class="rowFlex-div dataTip">' +
					'<span class="normal-span">k2:' + _this.k2 + '</span></div>');
				
				if (e.target.parentElement.id === 'VIContainer') {
					
					$(e.target.parentElement).append(dataTip);
				}
				else {
					dataTip.css('position', 'fixed');
					dataTip.css('top', '0');
					dataTip.css('left', '0');
					dataTip.css('z-index', '100');
					dataTip.css('width', '100%');
					$('body').prepend(dataTip);
				}
			}, false);
			this.container.addEventListener('mouseout', function () {
				dataTip.remove();
			}, false);
		}
		
		static get cnName() {
			
			return '积分响应';
		}
	},
	
	DifferentiationResponseVI: class DifferentiationResponseVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			const _this = this;
			let dataTip = $('');
			
			this.name = 'DifferentiationResponseVI';
			this.k3 = 0.0025;
			this.Fs = 1000;
			this.lastInput = 0;
			//VI双击弹出框
			this.boxTitle = '微分响应';
			this.boxContent = '<div class="input-div"><span class="normal-span">K3:</span>' +
				'<input type="number" id="DifferentiationResponseVI-input" value="' + this.k3 + '" class="normal-input"></div>';
			
			this.setData = function (input) {
				
				let inputTemp = Number(Array.isArray(input) ? input[input.length - 1] : input);
				if (Number.isNaN(inputTemp)) {
					
					return false;
				}
				
				let outputTemp = this.k3 * (inputTemp - this.lastInput) * this.Fs;
				this.lastInput = inputTemp;
				
				if (this.index <= (this.dataLength - 1)) {
					
					this.output[this.index] = outputTemp;
					this.index += 1;
				}
				else {
					
					let i;
					for (i = 0; i < this.dataLength - 1; i += 1) {
						this.output[i] = this.output[i + 1];
					}
					this.output[this.dataLength - 1] = outputTemp;
				}
			};
			
			this.setInitialData = function () {
				
				this.k3 = Number($('#DifferentiationResponseVI-input').val());
				this.boxContent = '<div class="input-div"><span class="normal-span">K3:</span>' +
					'<input type="number" id="DifferentiationResponseVI-input" value="' + this.k3 + '" class="normal-input"></div>';
			};
			
			this.reset = function () {
				
				this.lastInput = 0;
				this.index = 0;
				this.output = [0];
			};
			
			this.draw();
			
			this.container.addEventListener('mousemove', function (e) {
				//************************************数据提示****************************************//
				dataTip.remove();
				dataTip = $('<div class="rowFlex-div dataTip">' +
					'<span class="normal-span">k3:' + _this.k3 + '</span></div>');
				
				if (e.target.parentElement.id === 'VIContainer') {
					
					$(e.target.parentElement).append(dataTip);
				}
				else {
					dataTip.css('position', 'fixed');
					dataTip.css('top', '0');
					dataTip.css('left', '0');
					dataTip.css('z-index', '100');
					dataTip.css('width', '100%');
					$('body').prepend(dataTip);
				}
			}, false);
			this.container.addEventListener('mouseout', function () {
				dataTip.remove();
			}, false);
		}
		
		static get cnName() {
			
			return '微分响应';
		}
	},
	
	InertiaResponseVI: class InertiaResponseVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			const _this = this;
			let dataTip = $('');
			
			this.name = 'InertiaResponseVI';
			this.k1 = 0.025;
			this.Fs = 1000;
			this.temp1 = 0;
			//VI双击弹出框
			this.boxTitle = '惯性响应';
			this.boxContent = '<div class="input-div"><span class="normal-span">K1:</span>' +
				'<input type="number" id="InertiaResponseVI-input" value="' + this.k1 + '" class="normal-input"></div>';
			
			this.setData = function (input) {
				
				let inputTemp = Number(Array.isArray(input) ? input[input.length - 1] : input);
				if (Number.isNaN(inputTemp)) {
					
					return false;
				}
				
				let v, E;
				
				//一阶 1/(TS+1)
				E = Math.exp(-1 / (this.k1 * this.Fs));
				v = E * this.temp1 + (1.0 - E) * inputTemp;
				this.temp1 = v;
				let outputTemp = v;//输出
				
				if (this.index <= (this.dataLength - 1)) {
					this.output[this.index] = outputTemp;
					this.index += 1;
				}
				else {
					
					let i;
					for (i = 0; i < this.dataLength - 1; i += 1) {
						this.output[i] = this.output[i + 1];
					}
					this.output[this.dataLength - 1] = outputTemp;
				}
			};
			
			this.setInitialData = function () {
				
				this.k1 = Number($('#InertiaResponseVI-input').val());
				this.boxContent = '<div class="input-div"><span class="normal-span">K1:</span>' +
					'<input type="number" id="InertiaResponseVI-input" value="' + this.k1 + '" class="normal-input"></div>';
			};
			
			this.reset = function () {
				
				this.temp1 = 0;
				this.index = 0;
				this.output = [0];
			};
			
			this.draw();
			
			this.container.addEventListener('mousemove', function (e) {
				//************************************数据提示****************************************//
				dataTip.remove();
				dataTip = $('<div class="rowFlex-div dataTip">' +
					'<span class="normal-span">k1:' + _this.k1 + '</span></div>');
				
				if (e.target.parentElement.id === 'VIContainer') {
					
					$(e.target.parentElement).append(dataTip);
				}
				else {
					dataTip.css('position', 'fixed');
					dataTip.css('top', '0');
					dataTip.css('left', '0');
					dataTip.css('z-index', '100');
					dataTip.css('width', '100%');
					$('body').prepend(dataTip);
				}
			}, false);
			this.container.addEventListener('mouseout', function () {
				dataTip.remove();
			}, false);
		}
		
		static get cnName() {
			
			return '惯性响应';
		}
	},
	
	OscillationResponseVI: class OscillationResponseVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			const _this = this;
			let dataTip = $('');
			
			this.name = 'OscillationResponseVI';
			this.k1 = 50;
			this.k2 = 0.05;
			this.Fs = 1000;
			this.temp1 = 0;
			this.temp2 = 0;
			//VI双击弹出框
			this.boxTitle = '震荡响应';
			this.boxContent = '<div class="input-div">' +
				'<span class="normal-span">K1:</span><input type="number" id="OscillationResponseVI-input-1" value="' + this.k1 + '" class="normal-input">' +
				'<span class="normal-span">K2:</span><input type="number" id="OscillationResponseVI-input-2" value="' + this.k2 + '" class="normal-input"></div>';
			
			this.setData = function (input) {
				
				let inputTemp = Number(Array.isArray(input) ? input[input.length - 1] : input);
				if (Number.isNaN(inputTemp)) {
					
					return false;
				}
				
				let v, a1, b1;
				
				//二阶 W^2/(S^2+2gWS+W^2)
				if (this.k2 > 1) {
					
					this.k2 = 1;
				}
				b1 = Math.exp(-2 * 6.28 * this.k1 * this.k2 / this.Fs);
				a1 = 2 * Math.exp(-6.28 * this.k1 * this.k2 / this.Fs) * Math.cos(6.28 * this.k1 * Math.sqrt(1 - this.k2 * this.k2) / this.Fs);
				v = a1 * this.temp1 - b1 * this.temp2 + 1 * (1 - a1 + b1) * inputTemp;
				this.temp2 = this.temp1;
				this.temp1 = v;
				let outputTemp = v;//输出
				
				//将输出数保存在数组内
				if (this.index <= (this.dataLength - 1)) {
					this.output[this.index] = outputTemp;
					this.index += 1;
				}
				else {
					
					let i;
					for (i = 0; i < this.dataLength - 1; i += 1) {
						this.output[i] = this.output[i + 1];
					}
					this.output[this.dataLength - 1] = outputTemp;
				}
			};
			
			this.setInitialData = function () {
				
				this.k1 = Number($('#OscillationResponseVI-input-1').val());
				this.k2 = Number($('#OscillationResponseVI-input-2').val());
				this.boxContent = '<div class="input-div">' +
					'<span class="normal-span">K1:</span><input type="number" id="OscillationResponseVI-input-1" value="' + this.k1 + '" class="normal-input">' +
					'<span class="normal-span">K2:</span><input type="number" id="OscillationResponseVI-input-2" value="' + this.k2 + '" class="normal-input"></div>';
			};
			
			this.reset = function () {
				
				this.temp1 = 0;
				this.temp2 = 0;
				this.index = 0;
				this.output = [0];
			};
			
			this.draw();
			
			this.container.addEventListener('mousemove', function (e) {
				//************************************数据提示****************************************//
				dataTip.remove();
				dataTip = $('<div class="rowFlex-div dataTip">' +
					'<span class="normal-span">k1:' + _this.k1 + '</span>' +
					'<span class="normal-span">k2:' + _this.k2 + '</span></div>');
				
				if (e.target.parentElement.id === 'VIContainer') {
					
					$(e.target.parentElement).append(dataTip);
				}
				else {
					dataTip.css('position', 'fixed');
					dataTip.css('top', '0');
					dataTip.css('left', '0');
					dataTip.css('z-index', '100');
					dataTip.css('width', '100%');
					$('body').prepend(dataTip);
				}
			}, false);
			this.container.addEventListener('mouseout', function () {
				dataTip.remove();
			}, false);
		}
		
		static get cnName() {
			
			return '震荡响应';
		}
	},
	
	ProportionIntegrationResponseVI: class ProportionIntegrationResponseVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			const _this = this;
			let dataTip = $('');
			
			this.name = 'ProportionIntegrationResponseVI';
			this.k1 = 1.5;
			this.k2 = 1;
			this.Fs = 1000;
			this.lastInput = 0;
			this.temp1 = 0;
			//VI双击弹出框
			this.boxTitle = '比例积分响应';
			this.boxContent = '<div class="input-div">' +
				'<span class="normal-span">K1:</span><input type="number" id="ProportionIntegrationResponseVI-input-1" value="' + this.k1 + '" class="normal-input">' +
				'<span class="normal-span">K2:</span><input type="number" id="ProportionIntegrationResponseVI-input-2" value="' + this.k2 + '" class="normal-input"></div>';
			
			this.setData = function (input) {
				
				let inputTemp = Number(Array.isArray(input) ? input[input.length - 1] : input);
				if (Number.isNaN(inputTemp)) {
					
					return false;
				}
				
				let v1, v2, v21;
				
				v1 = this.k1 * inputTemp;
				
				v21 = this.temp1 + 0.5 * (inputTemp + this.lastInput) / this.Fs;
				this.temp1 = v21;
				v2 = this.k2 * v21;
				
				let outputTemp = v1 + v2;
				this.lastInput = inputTemp;
				
				//将输出数保存在数组内
				if (this.index <= (this.dataLength - 1)) {
					
					this.output[this.index] = outputTemp;
					this.index += 1;
				}
				else {
					
					let i;
					for (i = 0; i < this.dataLength - 1; i += 1) {
						
						this.output[i] = this.output[i + 1];
					}
					this.output[this.dataLength - 1] = outputTemp;
				}
			};
			
			this.setInitialData = function () {
				
				this.k1 = Number($('#ProportionIntegrationResponseVI-input-1').val());
				this.k2 = Number($('#ProportionIntegrationResponseVI-input-2').val());
				this.boxContent = '<div class="input-div">' +
					'<span class="normal-span">K1:</span><input type="number" id="ProportionIntegrationResponseVI-input-1" value="' + this.k1 + '" class="normal-input">' +
					'<span class="normal-span">K2:</span><input type="number" id="ProportionIntegrationResponseVI-input-2" value="' + this.k2 + '" class="normal-input"></div>';
			};
			
			this.reset = function () {
				
				this.lastInput = 0;
				this.temp1 = 0;
				this.index = 0;
				this.output = [0];
			};
			
			this.draw();
			
			this.container.addEventListener('mousemove', function (e) {
				//************************************数据提示****************************************//
				dataTip.remove();
				dataTip = $('<div class="rowFlex-div dataTip">' +
					'<span class="normal-span">k1:' + _this.k1 + '</span>' +
					'<span class="normal-span">k2:' + _this.k2 + '</span></div>');
				
				if (e.target.parentElement.id === 'VIContainer') {
					
					$(e.target.parentElement).append(dataTip);
				}
				else {
					dataTip.css('position', 'fixed');
					dataTip.css('top', '0');
					dataTip.css('left', '0');
					dataTip.css('z-index', '100');
					dataTip.css('width', '100%');
					$('body').prepend(dataTip);
				}
			}, false);
			this.container.addEventListener('mouseout', function () {
				dataTip.remove();
			}, false);
		}
		
		static get cnName() {
			
			return '比例积分响应';
		}
	},
	
	ProportionDifferentiationResponseVI: class ProportionDifferentiationResponseVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			const _this = this;
			let dataTip = $('');
			
			this.name = 'ProportionDifferentiationResponseVI';
			this.k1 = 1;
			this.k3 = 0.0025;
			this.Fs = 1000;
			this.lastInput = 0;
			//VI双击弹出框
			this.boxTitle = '比例微分响应';
			this.boxContent = '<div class="input-div">' +
				'<span class="normal-span">K1:</span><input type="number" id="ProportionDifferentiationResponseVI-input-1" value="' + this.k1 + '" class="normal-input">' +
				'<span class="normal-span">K3:</span><input type="number" id="ProportionDifferentiationResponseVI-input-2" value="' + this.k3 + '" class="normal-input"></div>';
			
			this.setData = function (input) {
				
				let inputTemp = Number(Array.isArray(input) ? input[input.length - 1] : input);
				if (Number.isNaN(inputTemp)) {
					
					return false;
				}
				
				let v1, v3;
				
				v1 = this.k1 * inputTemp;
				
				v3 = this.k3 * (inputTemp - this.lastInput) * this.Fs;
				
				let outputTemp = v1 + v3;
				this.lastInput = inputTemp;
				
				//将输出数保存在数组内
				let i = 0;
				if (this.index <= (this.dataLength - 1)) {
					
					this.output[this.index] = outputTemp;
					this.index += 1;
				}
				else {
					
					for (i = 0; i < this.dataLength - 1; i += 1) {
						
						this.output[i] = this.output[i + 1];
					}
					this.output[this.dataLength - 1] = outputTemp;
				}
			};
			
			this.setInitialData = function () {
				
				this.k1 = Number($('#ProportionDifferentiationResponseVI-input-1').val());
				this.k3 = Number($('#ProportionDifferentiationResponseVI-input-2').val());
				this.boxContent = '<div class="input-div">' +
					'<span class="normal-span">K1:</span><input type="number" id="ProportionDifferentiationResponseVI-input-1" value="' + this.k1 + '" class="normal-input">' +
					'<span class="normal-span">K3:</span><input type="number" id="ProportionDifferentiationResponseVI-input-2" value="' + this.k3 + '" class="normal-input"></div>';
			};
			
			this.reset = function () {
				
				this.lastInput = 0;
				this.index = 0;
				this.output = [0];
			};
			
			this.draw();
			
			this.container.addEventListener('mousemove', function (e) {
				//************************************数据提示****************************************//
				dataTip.remove();
				dataTip = $('<div class="rowFlex-div dataTip">' +
					'<span class="normal-span">k1:' + _this.k1 + '</span>' +
					'<span class="normal-span">k3:' + _this.k3 + '</span></div>');
				
				if (e.target.parentElement.id === 'VIContainer') {
					
					$(e.target.parentElement).append(dataTip);
				}
				else {
					dataTip.css('position', 'fixed');
					dataTip.css('top', '0');
					dataTip.css('left', '0');
					dataTip.css('z-index', '100');
					dataTip.css('width', '100%');
					$('body').prepend(dataTip);
				}
			}, false);
			this.container.addEventListener('mouseout', function () {
				dataTip.remove();
			}, false);
		}
		
		static get cnName() {
			
			return '比例微分响应';
		}
	},
	
	ProportionInertiaResponseVI: class ProportionInertiaResponseVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			const _this = this;
			let dataTip = $('');
			
			this.name = 'ProportionInertiaResponseVI';
			this.k1 = 0.025;
			this.k2 = 1;
			this.Fs = 1000;
			this.temp1 = 0;
			//VI双击弹出框
			this.boxTitle = '比例惯性响应';
			this.boxContent = '<div class="input-div">' +
				'<span class="normal-span">K1:</span><input type="number" id="ProportionInertiaResponseVI-input-1" value="' + this.k1 + '" class="normal-input">' +
				'<span class="normal-span">K2:</span><input type="number" id="ProportionInertiaResponseVI-input-2" value="' + this.k2 + '" class="normal-input"></div>';
			
			this.setData = function (input) {
				
				let inputTemp = Number(Array.isArray(input) ? input[input.length - 1] : input);
				if (Number.isNaN(inputTemp)) {
					
					return false;
				}
				
				let v, E;
				
				//一阶 X+1/(TS+1)
				E = Math.exp(-1 / (this.k1 * this.Fs));
				v = E * this.temp1 + (1.0 - E) * inputTemp;
				this.temp1 = v;
				let outputTemp = v + this.k2 * inputTemp;//输出
				
				//将输出数保存在数组内
				if (this.index <= (this.dataLength - 1)) {
					
					this.output[this.index] = outputTemp;
					this.index += 1;
				}
				else {
					
					let i;
					for (i = 0; i < this.dataLength - 1; i += 1) {
						
						this.output[i] = this.output[i + 1];
					}
					this.output[this.dataLength - 1] = outputTemp;
				}
			};
			
			this.setInitialData = function () {
				
				this.k1 = Number($('#ProportionInertiaResponseVI-input-1').val());
				this.k2 = Number($('#ProportionInertiaResponseVI-input-2').val());
				this.boxContent = '<div class="input-div">' +
					'<span class="normal-span">K1:</span><input type="number" id="ProportionInertiaResponseVI-input-1" value="' + this.k1 + '" class="normal-input">' +
					'<span class="normal-span">K2:</span><input type="number" id="ProportionInertiaResponseVI-input-2" value="' + this.k2 + '" class="normal-input"></div>';
			};
			
			this.reset = function () {
				
				this.temp1 = 0;
				this.index = 0;
				this.output = [0];
			};
			
			this.draw();
			
			this.container.addEventListener('mousemove', function (e) {
				//************************************数据提示****************************************//
				dataTip.remove();
				dataTip = $('<div class="rowFlex-div dataTip">' +
					'<span class="normal-span">k1:' + _this.k1 + '</span>' +
					'<span class="normal-span">k2:' + _this.k2 + '</span></div>');
				
				if (e.target.parentElement.id === 'VIContainer') {
					
					$(e.target.parentElement).append(dataTip);
				}
				else {
					dataTip.css('position', 'fixed');
					dataTip.css('top', '0');
					dataTip.css('left', '0');
					dataTip.css('z-index', '100');
					dataTip.css('width', '100%');
					$('body').prepend(dataTip);
				}
			}, false);
			this.container.addEventListener('mouseout', function () {
				dataTip.remove();
			}, false);
		}
		
		static get cnName() {
			
			return '比例惯性响应';
		}
	},
	
	StepResponseGeneratorVI: class StepResponseGeneratorVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			const _this = this;
			let dataTip = $('');
			
			this.name = 'StepResponseGeneratorVI';
			this.signalType = 0;
			this.k1 = 1;
			this.k2 = 1;
			this.k3 = 1;
			this.Fs = 1000;
			this.input = 0;
			this.lastInput = 0;
			this.temp1 = 0;
			this.temp2 = 0;
			
			this.setData = function (input) {
				
				let inputTemp = Number(Array.isArray(input) ? input[input.length - 1] : input);
				if (Number.isNaN(inputTemp)) {
					
					return false;
				}
				let v, v1, v2, v21, v3, E, a1, b1, outputTemp = 0;
				
				if (this.signalType < 6) {
					v1 = this.k1 * inputTemp;
					
					v21 = this.temp1 + 0.5 * (inputTemp + this.lastInput) / this.Fs;
					this.temp1 = v21;
					v2 = this.k2 * v21;
					
					v3 = this.k3 * (inputTemp - this.lastInput) * this.Fs;
					
					outputTemp = v1 + v2 + v3;
					this.lastInput = inputTemp;
				}
				else if (this.signalType < 9) {
					
					if (this.signalType == 6) { //一阶 1/(TS+1)
						
						E = Math.exp(-1 / (this.k1 * this.Fs));
						v = E * this.temp1 + (1.0 - E) * inputTemp;
						this.temp1 = v;
						outputTemp = v;//输出
					}
					if (this.signalType == 7) { //二阶 W^2/(S^2+2gWS+W^2)
						
						if (this.k2 > 1) {
							
							this.k2 = 1;
						}
						b1 = Math.exp(-2 * 6.28 * this.k1 * this.k2 / this.Fs);
						a1 = 2 * Math.exp(-6.28 * this.k1 * this.k2 / this.Fs) * Math.cos(6.28 * this.k1 * Math.sqrt(1 - this.k2 * this.k2) / this.Fs);
						v = a1 * this.temp1 - b1 * this.temp2 + 1 * (1 - a1 + b1) * inputTemp;
						this.temp2 = this.temp1;
						this.temp1 = v;
						outputTemp = v;//输出
					}
					if (this.signalType == 8) { //一阶 X+1/(TS+1)
						
						E = Math.exp(-1 / (this.k1 * this.Fs));
						v = E * this.temp1 + (1.0 - E) * inputTemp;
						this.temp1 = v;
						outputTemp = v + this.k2 * inputTemp;//输出
					}
				}
				
				//将输出数保存在数组内
				if (this.index <= (this.dataLength - 1)) {
					
					this.output[this.index] = outputTemp;
					this.index += 1;
				}
				else {
					
					let i;
					for (i = 0; i < this.dataLength - 1; i += 1) {
						this.output[i] = this.output[i + 1];
					}
					this.output[this.dataLength - 1] = outputTemp;
				}
			};
			
			this.setStepType = function (type) {
				
				this.signalType = type;
				
				//PID控制器
				if (this.signalType == 0) {
					this.k1 = 1;
					this.k2 = 1;
					this.k3 = 1;
				}
				
				//比例控制器
				if (this.signalType == 1) {
					this.k1 = 1;
					this.k2 = 0;
					this.k3 = 0;
				}
				
				//积分控制器
				if (this.signalType == 2) {
					this.k1 = 0;
					this.k2 = 1;
					this.k3 = 0;
				}
				
				//微分控制器
				if (this.signalType == 3) {
					this.k1 = 0;
					this.k2 = 0;
					this.k3 = 1;
				}
				
				//比例积分控制器
				if (this.signalType == 4) {
					this.k1 = 1;
					this.k2 = 1;
					this.k3 = 0;
				}
				
				//比例微分控制器
				if (this.signalType == 5) {
					this.k1 = 1;
					this.k2 = 0;
					this.k3 = 1;
				}
				
				//惯性环节
				if (this.signalType == 6) {
					this.k1 = 1;
					this.k2 = 0;
				}
				
				//振荡环节
				if (this.signalType == 7) {
					this.k1 = 1;
					this.k2 = 1;
				}
				
				//比例惯性环节
				if (this.signalType == 8) {
					this.k1 = 1;
					this.k2 = 1;
				}
				
			};
			
			this.reset = function () {
				
				this.lastInput = 0;
				this.temp1 = 0;
				this.temp2 = 0;
				this.index = 0;
				this.output = [0];
			};
			
			this.draw();
			
			this.container.addEventListener('mousemove', function (e) {
				//************************************数据提示****************************************//
				dataTip.remove();
				dataTip = $('<div class="rowFlex-div dataTip">' +
					'<span class="normal-span">k1:' + _this.k1 + '</span>' +
					'<span class="normal-span">k2:' + _this.k2 + '</span>' +
					'<span class="normal-span">k3:' + _this.k3 + '</span></div>');
				
				if (e.target.parentElement.id === 'VIContainer') {
					
					$(e.target.parentElement).append(dataTip);
				}
				else {
					dataTip.css('position', 'fixed');
					dataTip.css('top', '0');
					dataTip.css('left', '0');
					dataTip.css('z-index', '100');
					dataTip.css('width', '100%');
					$('body').prepend(dataTip);
				}
			}, false);
			this.container.addEventListener('mouseout', function () {
				dataTip.remove();
			}, false);
		}
		
		static get cnName() {
			
			return '阶跃响应';
		}
	},

    RRToothRingVI: class  RRToothRingVI extends TemplateVI {
        constructor(VICanvas, draw3DFlag) {
            super(VICanvas);
            const _this = this;
            let camera, scene, renderer, controls, sliderControl, testerControl, gearControl,holderControl,leftControl,rightControl,
                base, gear, slider, tester,testerMark,sliderMark,left,right;
            let testerDown=true;
            this.errorArray=[22,29,40,40,47,53,56,63,64,71,77,89,84,90,101,105,113,101,104,89,66,49,43,32,28,25,21,9,9,4,-11,-21,-25,-13,-9,7,8,17,21,26];
            let gearNo=0,error=0,sliderDown=false,gearPos=false;

            /**
             *
             * @param input 输入端口读取角度
             */
            this.reset=function(){
                gear.rotateX(-gearNo*Math.PI/20);
                slider.position.y=sliderMark.position.y=0;
                if(!testerDown)tester.rotateX(Math.PI/4);
                gearNo=0,error=0,testerDown=true,sliderDown=false;
            }

            this.getData = function (dataType) {
                if (dataType === 1) {
                    error=(testerDown&&sliderDown)?_this.errorArray[gearNo]:0;
                    return error;  //输出误差
                }
            };

            this.draw=function () {
                if (draw3DFlag) {

                    let loadingImg = document.createElement('img');
                    loadingImg.src = 'img/loading.gif';
                    loadingImg.style.width = '64px';
                    loadingImg.style.height = '64px';
                    loadingImg.style.position = 'absolute';
                    loadingImg.style.top = this.container.offsetTop + this.container.offsetHeight / 2 - 32 + 'px';
                    loadingImg.style.left = this.container.offsetLeft + this.container.offsetWidth / 2 - 32 + 'px';
                    loadingImg.style.zIndex = '10001';
                    this.container.parentNode.appendChild(loadingImg);

                    let promiseArr = [
                        VILibrary.InnerObjects.loadModule('assets/RadialRunout_of_ToothRing/base.mtl', 'assets/RadialRunout_of_ToothRing/base.obj'),
                        VILibrary.InnerObjects.loadModule('assets/RadialRunout_of_ToothRing/gear.mtl', 'assets/RadialRunout_of_ToothRing/gear.obj'),
                        VILibrary.InnerObjects.loadModule('assets/RadialRunout_of_ToothRing/slider.mtl', 'assets/RadialRunout_of_ToothRing/slider.obj'),
                        VILibrary.InnerObjects.loadModule('assets/RadialRunout_of_ToothRing/tester.mtl', 'assets/RadialRunout_of_ToothRing/tester.obj'),
                        VILibrary.InnerObjects.loadModule('assets/RadialRunout_of_ToothRing/testerMark.mtl', 'assets/RadialRunout_of_ToothRing/testerMark.obj'),
                        VILibrary.InnerObjects.loadModule('assets/RadialRunout_of_ToothRing/sliderMark.mtl', 'assets/RadialRunout_of_ToothRing/sliderMark.obj'),
                        VILibrary.InnerObjects.loadModule('assets/RadialRunout_of_ToothRing/left.mtl', 'assets/RadialRunout_of_ToothRing/left.obj'),
                        VILibrary.InnerObjects.loadModule('assets/RadialRunout_of_ToothRing/right.mtl', 'assets/RadialRunout_of_ToothRing/right.obj'),
                    ];
                    Promise.all(promiseArr).then(function (objArr) {


                        base = objArr[0];
                        gear = objArr[1];
                        slider = objArr[2];
                        tester = objArr[3];
                        testerMark = objArr[4];
                        sliderMark = objArr[5];
                        left=objArr[6];
                        right=objArr[7];
                        loadingImg.style.display = 'none';
                        RRDraw();
                    }).catch(e => console.log('RRToothRingVI: ' + e));
                }
                else {

                    this.ctx = this.container.getContext("2d");
                    let img = new Image();
                    img.src = 'img/RR_ToothRing.png';
                    img.onload = function () {

                        _this.ctx.drawImage(img, 0, 0, _this.container.width, _this.container.height);
                    };
                }

               /* mtlLoader.load('assets/RadialRunout_of_ToothRing/base.mtl', function (materials){
                    materials.preload();

                    objLoader.setMaterials(materials);
                    objLoader.load('assets/RadialRunout_of_ToothRing/base.obj', function (a){
                        a.traverse(function (child) {
                            if (child instanceof THREE.Mesh) {

                                child.material.side = THREE.DoubleSide;
                            }
                        });
                        base=a;
                        mtlLoader.load('assets/RadialRunout_of_ToothRing/gear.mtl', function (materials){
                            materials.preload();

                            objLoader.setMaterials(materials);
                            objLoader.load('assets/RadialRunout_of_ToothRing/gear.obj', function (b){
                                b.traverse(function (child) {
                                    if (child instanceof THREE.Mesh) {

                                        child.material.side = THREE.DoubleSide;
                                    }
                                });
                                gear=b;

                                mtlLoader.load('assets/RadialRunout_of_ToothRing/slider.mtl', function (materials){
                                    materials.preload();

                                    objLoader.setMaterials(materials);
                                    objLoader.load('assets/RadialRunout_of_ToothRing/slider.obj', function (c){
                                        c.traverse(function (child) {
                                            if (child instanceof THREE.Mesh) {

                                                child.material.side = THREE.DoubleSide;
                                            }
                                        });
                                        slider=c;

                                        mtlLoader.load('assets/RadialRunout_of_ToothRing/tester.mtl', function (materials){
                                            materials.preload();

                                            objLoader.setMaterials(materials);
                                            objLoader.load('assets/RadialRunout_of_ToothRing/tester.obj', function (d){
                                                d.traverse(function (child) {
                                                    if (child instanceof THREE.Mesh) {

                                                        child.material.side = THREE.DoubleSide;
                                                    }
                                                });
                                                tester=d;

                                                mtlLoader.load('assets/RadialRunout_of_ToothRing/testerMark.mtl', function (materials) {
                                                    materials.preload();

                                                    objLoader.setMaterials(materials);
                                                    objLoader.load('assets/RadialRunout_of_ToothRing/testerMark.obj', function (e) {
                                                        e.traverse(function (child) {
                                                            if (child instanceof THREE.Mesh) {

                                                                child.material.side = THREE.DoubleSide;
                                                            }
                                                        });
                                                        testerMark = e;
                                                        mtlLoader.load('assets/RadialRunout_of_ToothRing/sliderMark.mtl', function (materials) {
                                                            materials.preload();

                                                            objLoader.setMaterials(materials);
                                                            objLoader.load('assets/RadialRunout_of_ToothRing/sliderMark.obj', function (f) {
                                                                f.traverse(function (child) {
                                                                    if (child instanceof THREE.Mesh) {

                                                                        child.material.side = THREE.DoubleSide;
                                                                    }
                                                                });
                                                                sliderMark = f;
                                                                RRDraw();
                                                            })
                                                        })
                                                    })
                                                })
                                            })
                                        })
                                    })
                                })
                            })
                        })
                    });
                });*/
				/*let p1=new Promise(function (resolve,reject) {
				 /!*THREE.DefaultLoadingManager.onLoad=resolve;
				 THREE.DefaultLoadingManager.onLoad=reject;*!/
				 //base.onload=resolve;
				 base.onerror=reject;
				 });
				 p1.then(function () {
				 renderScene();
				 })
				 p1.catch(function () {
				 //console.log('RRToothRingVI:' + e);
				 })*/

            };
            this.draw();

            window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame
                || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
            //相机、渲染、灯光、控制等初始设置
            function RRDraw () {
                scene = new THREE.Scene();

                renderer = new THREE.WebGLRenderer({canvas: _this.container, antialias: true});
                renderer.setClearColor(0x6495ED);
                renderer.setSize(_this.container.clientWidth, _this.container.clientHeight);

                camera = new THREE.PerspectiveCamera(45, _this.container.clientWidth / _this.container.clientHeight, 1, 1000);
                camera.position.set(50,80,150);
                camera.lookAt(new THREE.Vector3(0, 0, 0));

                tester.translateZ(-14);//测量头初始位置（测量头以转轴中点为原点）
                tester.translateY(34);
                base.add(gear);
                base.add(slider,sliderMark,left,right);
                slider.add(tester);
                tester.add(testerMark);
                scene.add(base);
                // base.position.y=-10;
                gear.rotation.z=Math.PI/2;
                // gear.rotation.x=Math.PI*0.1;
                gear.position.set(-80,-40,20);

                let light = new THREE.AmbientLight(0x555555);
                scene.add(light);
                let light1 = new THREE.DirectionalLight(0xffffff, 1);
                light1.position.set(4000, 4000, 4000);
                scene.add(light1);
                let light2 = new THREE.DirectionalLight(0xffffff, 1);
                light2.position.set(-4000, 4000, -4000);
                scene.add(light2);

                controls = new THREE.OrbitControls(camera, renderer.domElement);//鼠标对整个三维模型（相机）的控制
                controls.rotateSpeed = 0.8;
                controls.enableZoom = true;
                controls.zoomSpeed = 1.2;
                controls.enableDamping = true;
                let plane = new THREE.Mesh(new THREE.PlaneBufferGeometry(1000, 400),new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} ));
                //plane.rotateY(30/180*Math.PI);

                //拖动控制
                sliderControl = new ObjectControls(camera, renderer.domElement);
                sliderControl.map = plane;
                sliderControl.offsetUse = true;

                sliderControl.attachEvent('mouseOver', function () {

                    renderer.domElement.style.cursor = 'pointer';
                });

                sliderControl.attachEvent('mouseOut', function () {

                    renderer.domElement.style.cursor = 'auto';
                });

                sliderControl.attachEvent('dragAndDrop', onSliderDrag);

                sliderControl.attachEvent('mouseUp', function () {

                    controls.enabled = true;
                    renderer.domElement.style.cursor = 'auto';
                });

                //左支架拖动控制
                leftControl = new ObjectControls(camera, renderer.domElement);
                leftControl.map = plane;
                leftControl.offsetUse = true;

                leftControl.attachEvent('mouseOver', function () {

                    renderer.domElement.style.cursor = 'pointer';
                });

                leftControl.attachEvent('mouseOut', function () {

                    renderer.domElement.style.cursor = 'auto';
                });

                leftControl.attachEvent('dragAndDrop', onHolderDrag);

                leftControl.attachEvent('mouseUp', function () {

                    controls.enabled = true;
                    renderer.domElement.style.cursor = 'auto';
                });
                //右支架拖动控制
                rightControl = new ObjectControls(camera, renderer.domElement);
                rightControl.map = plane;
                rightControl.offsetUse = true;

                rightControl.attachEvent('mouseOver', function () {

                    renderer.domElement.style.cursor = 'pointer';
                });

                rightControl.attachEvent('mouseOut', function () {

                    renderer.domElement.style.cursor = 'auto';
                });

                rightControl.attachEvent('dragAndDrop', onHolderDrag);

                rightControl.attachEvent('mouseUp', function () {

                    controls.enabled = true;
                    renderer.domElement.style.cursor = 'auto';
                });

                //测量头点击抬起、放下
                testerControl = new ObjectControls(camera, renderer.domElement);
                testerControl.offsetUse = true;

                testerControl.attachEvent('mouseOver', function () {

                    renderer.domElement.style.cursor = 'pointer';
                });

                testerControl.attachEvent('mouseOut', function () {

                    renderer.domElement.style.cursor = 'auto';
                });

                testerControl.attachEvent('onclick', function () {
                    sliderControl.enabled =false;
                    if(testerDown)tester.rotateX(-Math.PI/4);
                    else tester.rotateX(Math.PI/4);
                    testerDown=!testerDown;
                    sliderControl.enabled =true;
                    // error=(testerDown&&sliderDown)?_this.errorArray[gearNo]:0;
                });

                //齿轮点击旋转一个齿
                gearControl = new ObjectControls(camera, renderer.domElement);
                gearControl.offsetUse = true;

                gearControl.attachEvent('mouseOver', function () {

                    renderer.domElement.style.cursor = 'pointer';
                });

                gearControl.attachEvent('mouseOut', function () {

                    renderer.domElement.style.cursor = 'auto';
                });

                gearControl.attachEvent('onclick',onGearClick);


                //绑定控制对象
                sliderControl.attach(sliderMark);
                testerControl.attach(testerMark);
                gearControl.attach(gear);
                leftControl.attach(left);
                rightControl.attach(right);

                RRAnimate();
            }

            function onSliderDrag () {
                controls.enabled = false;
                renderer.domElement.style.cursor = 'pointer';
                this.focused.position.x = this.previous.x;  //lock x direction
                if (this.focused.position.y < -7.71) {

                    this.focused.position.y = -7.71;
                }
                else if (this.focused.position.y > 20) {

                    this.focused.position.y = 20;
                }
                slider.position.y = this.focused.position.y;
                sliderDown=slider.position.y< -7?true:false;
                // error=(testerDown&&sliderDown)?_this.errorArray[gearNo]:0;
            }

            function onHolderDrag() {
                controls.enabled = false;
                renderer.domElement.style.cursor = 'pointer';
                this.focused.position.y = this.previous.y;  //lock x direction
                if (this.focused.position.x < -10) {

                    this.focused.position.x = -10;
                }
                else if (this.focused.position.x > 10) {

                    this.focused.position.x = 10;
                }
                let focusedX=this.focused.position.x;
                // console.log(this.focused.materialLibraries[0])
				if(this.focused.materialLibraries[0]=="left.mtl"){
                    right.position.x=-focusedX;
				}
				else {
                    left.position.x=-focusedX;
				}
            }

            function onGearClick(){
            	if(!gearPos){
            		gearPos=true;
            		gear.position.set(0,0,0);
            		gear.rotation.set(0,0,0);
				}
				else {
                    if(!(testerDown&&sliderDown)){
                        gear.rotateX(Math.PI/20);
                        gearNo+=1;
                        if(gearNo>=40)gearNo=0;
                    }
				}


            }

            function RRAnimate() {
                window.requestAnimationFrame(RRAnimate);//回调
                controls.update();
                renderer.render(scene, camera);
            }

        }
        static get cnName() {

            return '齿轮径向跳动误差';
        }

        static get defaultWidth() {

            return '550px';
        }

        static get defaultHeight() {

            return '300px';
        }
    },

    DialVI:class DialVI extends TemplateVI{
        constructor (VICanvas) {
            super(VICanvas);

            const _this = this;
            this.name = 'DialVI';
            this.ctx = this.container.getContext("2d");
            // this.outputPointCount = 0;
            // this.latestInput = 0;
            this.angle=0;

            this.shorter=Math.min(this.container.height,this.container.width);

            this.CENTER_X=this.shorter/2;
            this.CENTER_Y=this.shorter/2;
            this.RADIUS=this.shorter*0.45;//表盘半径


            this.LONG_TICK=this.RADIUS*0.1;//40;//长刻度
            this.SHORT_TICK=this.RADIUS*0.07;//短刻度
            this.START_ANGLE = 0; // Starting point on circle
            this.END_ANGLE = Math.PI*2; // End point on circle
            this.STROKE_STYLE= "rgba(0,0,0,1)";
            this.FILL_STYLE= "rgba(80,80,80,0.6)";
            this.ctx.lineWidth=1;
            this.MAX_NUMBER=120;//最大刻度值
			let lineNUM;

            this.draw=function (angle) {

                if(150>this.MAX_NUMBER&&this.MAX_NUMBER>=50)lineNUM=5;
                else if(this.MAX_NUMBER<50)lineNUM=0.5;
                else lineNUM=10;
                // console.log("lineNUM",lineNUM);
                this.ctx.clearRect(0,0,this.container.width,this.container.height);//清空画布
                //画指针
                this.rotateAngle=angle;
                this.ctx.save();
                this.ctx.beginPath();
                this.ctx.translate(this.CENTER_X,this.CENTER_Y);
                this.ctx.rotate(this.rotateAngle);
                this.ctx.moveTo(-this.RADIUS*0.03,this.RADIUS*0.1);
                this.ctx.lineTo(+this.RADIUS*0.03,this.RADIUS*0.1);
                this.ctx.lineTo(0,-this.RADIUS*0.9);
                this.ctx.closePath();
                this.ctx.stroke();
                this.ctx.fillStyle="rgba(200,100,100,1)";
                this.ctx.fill();
                this.ctx.restore();
                //画表盘外圆环
                this.ctx.fillStyle=this.FILL_STYLE;
                this.ctx.strokeStyle=this.STROKE_STYLE;
                this.ctx.beginPath();
                this.ctx.arc(this.CENTER_X, this.CENTER_Y, this.RADIUS, this.START_ANGLE, this.END_ANGLE, false);
                this.ctx.arc(this.CENTER_X, this.CENTER_Y, this.RADIUS*1.1, this.START_ANGLE, this.END_ANGLE, true);
                this.ctx.fill();
                this.ctx.closePath();

                //表盘刻度线和数字
                this.ctx.fillStyle="rgba(0,0,0,1)";
                this.ctx.textAlign = "center";//文本对齐
                this.ctx.font=this.RADIUS/10+"px Times new roman";
                this.ctx.textBaseline="middle";//文字居中定位
                let delta=Math.PI/_this.MAX_NUMBER;
                let i=0;
                for(i;i<=(_this.MAX_NUMBER/lineNUM);i++){
                    let angle0=-Math.PI/2+delta*i*lineNUM;
                    let angle1=-Math.PI/2-delta*i*lineNUM;
                    // if(!(i%(lineNUM/2))){
                        this.line(i*lineNUM,angle0);//顺时针方向
                        if(i*lineNUM<_this.MAX_NUMBER){
                            this.line(i*lineNUM,angle1);//逆时针方向
                        }
					// }
                }

                this.ctx.font=this.RADIUS/6+"px Verdana";
                this.ctx.fillText("+",this.CENTER_X+this.RADIUS*0.4,this.RADIUS);
                this.ctx.fillText("-",this.CENTER_X-this.RADIUS*0.4,this.RADIUS);
                this.ctx.font=this.RADIUS/8+"px Verdana";
                this.ctx.fillText("μm",this.CENTER_X,this.CENTER_Y+this.RADIUS*0.4);




                //画小圆
                this.r0=this.RADIUS*0.04;//20;
                this.ctx.fillStyle="rgba(255,255,255,1)";
                this.ctx.strokeStyle=this.STROKE_STYLE;
                this.ctx.beginPath();
                this.ctx.arc(this.CENTER_X, this.CENTER_Y, this.r0, this.START_ANGLE, this.END_ANGLE, false);
                this.ctx.stroke();
                this.ctx.closePath();
                this.ctx.fill();
            };
            this.line=function (i, angle){
                this.ctx.save();
                this.ctx.translate(this.CENTER_X,this.CENTER_Y);//坐标系移至圆心
                this.ctx.rotate(angle);
                this.ctx.beginPath();
                this.ctx.moveTo(this.RADIUS,0);
                if(i%(lineNUM*2)) this.ctx.lineTo(this.RADIUS-this.SHORT_TICK,0);
                else {
                    this.ctx.lineTo(this.RADIUS-this.LONG_TICK,0);
                    if(!(i%(lineNUM*4))){
                        this.ctx.translate(this.RADIUS*0.8,0);//坐标系移至文字中心
                        this.ctx.rotate(-angle);//逆向旋转，恢复文字方向
                        this.ctx.fillText(i, 0, 0);
					}
                }
                this.ctx.stroke();
                this.ctx.closePath();
                this.ctx.restore();
            };
			//拖动控制指针
			/*this.drag=function () {
			 this.container.addEventListener("mousedown",function() {event.preventDefault();IS_DOWN=true;},false);
			 this.container.addEventListener("mousemove",function () {
			 event.preventDefault();
			 if (IS_DOWN == false) return;
			 let x=event.offsetX;
			 let y=event.offsetY;
			 let dx = x- _this.CENTER_X+Number.MIN_VALUE;
			 let dy = y - _this.CENTER_Y;
			 if(dx>=0){ this.angle = Math.atan( dy/ dx)+Math.PI/2;}
			 else { this.angle=Math.atan(dy/dx)+Math.PI*3/2;}
			 _this.draw(this.angle);
			 },false);
			 this.container.addEventListener("mouseup",function (){IS_DOWN=false;},false);
			 this.container.addEventListener("mouseout",function (){IS_DOWN=false;},false);

			 };*/




            this.setData = function (input){
                let inputError = Number(Array.isArray(input) ? input[input.length - 1] : input);

                if (Number.isNaN(inputError)) {

                    console.log('DialVI: Input value error');
                    return;
                }
                //this.PIDAngle = inputAngle;//向输出端口上写数据
                this.angle=inputError*Math.PI/_this.MAX_NUMBER;
                this.draw(this.angle);
            }

//调用函数

            this.draw(this.angle);



        }
        static get cnName() {

            return '千分表';
        }

        static get defaultWidth() {

            return '550px';
        }

        static get defaultHeight() {

            return '300px';
        }
    },
    GearCompositeErrorVI: class  GearCompositeErrorVI extends TemplateVI {
        constructor(VICanvas, draw3DFlag) {
            super(VICanvas);
            const _this = this;

            let camera, scene, renderer, controls,base,gear1,gear2,handleUp,handleDown,lead_screw,onSwitch,offSwitch,slider2,lead_screwControl,
				handleControl,switchControl,gear2Control;
            let handleDownMark=false,gearMesh=false,gearPos=false;
            let errorArray=[0,-2,-7,-3,-8,-7,-12,-10,-15,-12,-14,-10,-11,-9,-11,-8,-9,-5,-6,-2,-5,0,-1,3,-1,7,5,11,10,14,12,13,9,11,8,9,5,6,2,3,0];
            this.eA=errorArray;
            this.errOutput=[];
            _this.timer=0;
            let index=0;

            /**
             *
             * @param input 输入端口读取角度
             */

            this.toggleObserver = function (flag) {

                if (flag) {
                    if (!_this.timer ) {
                        if(!gearPos)  layer.open({
                            title: '系统提示'
                            ,content: '未正确安装被测齿轮，请点击被测齿轮进行安装'
                        });
                        else if(!gearMesh){
                            layer.open({
                                title: '系统提示'
                                ,content: '齿轮未正确啮合,请调整后再开始测量'
                            });
                        }
                        else if(!handleDownMark)layer.open({
                            title: '系统提示'
                            ,content: '固定拖板未锁紧，请锁紧后再开始测量'
                        });
                        else {
                            if(!index){_this.errOutput=[0];}
                            scene.remove(offSwitch);
                            switchControl.detach(offSwitch);
                            scene.add(onSwitch);
                            switchControl.attach(onSwitch);
                            let delta =360/20/180*Math.PI  ;//一齿的弧度
                            _this.timer = window.setInterval(function () {
                                openWave();
                                gear1.rotation.y -= delta * 0.5*2/3;
                                index+=1;
                                gear2.rotation.y += delta *0.5;//0.5个齿的弧度

                                _this.errOutput[index]=errorArray[index];
                                // console.log("errOutput",_this.errOutput[index]);
                                //定时更新相同数据线VI的数据
                                if (_this.dataLine) {
                                    VILibrary.InnerObjects.dataUpdater(_this.dataLine);
                                }
                                if(index>=40){
                                    window.clearInterval(_this.timer);
                                    index=0;
                                    scene.remove(onSwitch);
                                    switchControl.detach(onSwitch);
                                    scene.add(offSwitch);
                                    switchControl.attach(offSwitch);
                                    _this.timer = 0;
                                    this.errOutput=[];
                                }
                            }, 100);
                        }
                    }
                }
				else{
					scene.remove(onSwitch);
					switchControl.detach(onSwitch);
					scene.add(offSwitch);
					switchControl.attach(offSwitch);
					window.clearInterval(_this.timer);
					_this.timer = 0;
				}
            };
            this.getData=function () {
            	return _this.errOutput;

            }
            this.draw=function () {
                if (draw3DFlag) {

                    let loadingImg = document.createElement('img');
                    loadingImg.src = 'img/loading.gif';
                    loadingImg.style.width = '64px';
                    loadingImg.style.height = '64px';
                    loadingImg.style.position = 'absolute';
                    loadingImg.style.top = this.container.offsetTop + this.container.offsetHeight / 2 - 32 + 'px';
                    loadingImg.style.left = this.container.offsetLeft + this.container.offsetWidth / 2 - 32 + 'px';
                    loadingImg.style.zIndex = '10001';
                    this.container.parentNode.appendChild(loadingImg);

                    let promiseArr = [
                        VILibrary.InnerObjects.loadModule('assets/GearCompositeError/base_slider1.mtl', 'assets/GearCompositeError/base_slider1.obj'),
                        VILibrary.InnerObjects.loadModule('assets/GearCompositeError/gear1.mtl', 'assets/GearCompositeError/gear1.obj'),
                        VILibrary.InnerObjects.loadModule('assets/GearCompositeError/gear2.mtl', 'assets/GearCompositeError/gear2.obj'),
                        VILibrary.InnerObjects.loadModule('assets/GearCompositeError/lead_screw.mtl', 'assets/GearCompositeError/lead_screw.obj'),
                        VILibrary.InnerObjects.loadModule('assets/GearCompositeError/slider2.mtl', 'assets/GearCompositeError/slider2.obj'),
                        VILibrary.InnerObjects.loadModule('assets/GearCompositeError/handle_up.mtl', 'assets/GearCompositeError/handle_up.obj'),
                        VILibrary.InnerObjects.loadModule('assets/GearCompositeError/handle_down.mtl', 'assets/GearCompositeError/handle_down.obj'),
                        VILibrary.InnerObjects.loadModule('assets/GearCompositeError/button-off.mtl', 'assets/GearCompositeError/button-off.obj'),
                        VILibrary.InnerObjects.loadModule('assets/GearCompositeError/button-on.mtl', 'assets/GearCompositeError/button-on.obj'),
                    ];
                    Promise.all(promiseArr).then(function (objArr) {
                        base = objArr[0];
                        gear1 = objArr[1];
                        gear2 = objArr[2];
                        lead_screw = objArr[3];
                        slider2 = objArr[4];
                        handleUp = objArr[5];
                        handleDown=objArr[6];
                        offSwitch=objArr[7];
                        onSwitch=objArr[8];
                        loadingImg.style.display = 'none';
                        GCEDraw();
                    }).catch(e => console.log('GearCompositeErrorVI: ' + e));
                }
                else {

                    this.ctx = this.container.getContext("2d");
                    let img = new Image();
                    img.src = 'img/GearCompositeError.png';
                    img.onload = function () {
                        _this.ctx.drawImage(img, 0, 0, _this.container.width, _this.container.height);
                    };
                }
            };
            this.draw();

            window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame
                || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
            //相机、渲染、灯光、控制等初始设置
            function GCEDraw () {
                scene = new THREE.Scene();
                renderer = new THREE.WebGLRenderer({canvas: _this.container, antialias: true});
                renderer.setClearColor(0x6495ED);
                renderer.setSize(_this.container.clientWidth, _this.container.clientHeight);

                camera = new THREE.PerspectiveCamera(45, _this.container.clientWidth / _this.container.clientHeight, 1, 1000);
                camera.position.set(0,100,300);
                camera.lookAt(new THREE.Vector3(0, 0, 0));

               //测量头初始位置（测量头以转轴中点为原点）
                gear1.position.x=-83;
                gear1.position.y=66;

                gear2.position.set(100,-50,80);

                let light = new THREE.AmbientLight(0x555555);
                scene.add(light);
                let light1 = new THREE.DirectionalLight(0xffffff, 1);
                light1.position.set(4000, 4000, 4000);
                scene.add(light1);
                let light2 = new THREE.DirectionalLight(0xffffff, 1);
                light2.position.set(-4000, 4000, -4000);
                scene.add(light2);




                controls = new THREE.OrbitControls(camera, renderer.domElement);//鼠标对整个三维模型（相机）的控制
                controls.rotateSpeed = 0.8;
                controls.enableZoom = true;
                controls.zoomSpeed = 1.2;
                controls.enableDamping = true;
                let plane1 = new THREE.Mesh(new THREE.PlaneBufferGeometry(1000, 400),new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} ));

                //拖动旋转
                let plane2 = new THREE.Mesh(new THREE.PlaneBufferGeometry(1000, 400),new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} ));
                 plane2.rotateY(0.5*Math.PI);
                lead_screwControl =new ObjectControls(camera, renderer.domElement);
                lead_screwControl.map = plane2;
                lead_screwControl.offsetUse = true;
                lead_screwControl.attachEvent('mouseOver', function () {
                    renderer.domElement.style.cursor = 'pointer';
                });

                lead_screwControl.attachEvent('mouseOut', function () {

                    renderer.domElement.style.cursor = 'auto';
                });

                lead_screwControl.attachEvent('dragAndDrop', onRotateDrag);

                lead_screwControl.attachEvent('mouseUp', function () {

                    controls.enabled = true;
                    renderer.domElement.style.cursor = 'auto';
                });
                //测量头点击抬起、放下
                handleControl = new ObjectControls(camera, renderer.domElement);
                handleControl.offsetUse = true;

                handleControl.attachEvent('mouseOver', function () {

                    renderer.domElement.style.cursor = 'pointer';
                });

                handleControl.attachEvent('mouseOut', function () {

                    renderer.domElement.style.cursor = 'auto';
                });

                handleControl.attachEvent('onclick',onHandleClick);

                //开关
                switchControl = new ObjectControls(camera, renderer.domElement);
                switchControl.offsetUse = true;

                switchControl.attachEvent('mouseOver', function () {

                    renderer.domElement.style.cursor = 'pointer';
                });

                switchControl.attachEvent('mouseOut', function () {

                    renderer.domElement.style.cursor = 'auto';
                });

                switchControl.attachEvent('onclick',function () {

                    _this.toggleObserver(!_this.timer);
                });

                gear2Control = new ObjectControls(camera, renderer.domElement);
                gear2Control.offsetUse = true;

                gear2Control.attachEvent('mouseOver', function () {

                    renderer.domElement.style.cursor = 'pointer';
                });

                gear2Control.attachEvent('mouseOut', function () {

                    renderer.domElement.style.cursor = 'auto';
                });

                gear2Control.attachEvent('onclick',function () {
                    gear2.position.x=slider2.position.x;
                    gear2.position.y=66;
                    gear2.position.z=0;
                    gearPos=true;
                });
                //绑定控制对象
                scene.add(base,lead_screw,gear1,slider2,gear2,handleUp,offSwitch);
                handleControl.attach(handleUp);
                lead_screwControl.attach(lead_screw);
                switchControl.attach(offSwitch);
                gear2Control.attach(gear2);

                GCEAnimate();
            }

            function onRotateDrag () {
                controls.enabled = false;
                renderer.domElement.style.cursor = 'pointer';

                let offsetY=this.focused.position.y-this.previous.y;
                this.focused.position.y = this.previous.y;  //lock x direction
                this.focused.position.x = this.previous.x;
                let angle=-Math.atan(offsetY/1.5);
                slider2.position.x+=offsetY;
                if (slider2.position.x< -20.5) {

                    slider2.position.x = -20.5;
                }
                else if (slider2.position.x > 83) {

                    slider2.position.x = 83;
                }
                else {lead_screw.rotateX(angle);}
                gearMesh=slider2.position.x< -20?true:false;
                if(gearPos)gear2.position.x=slider2.position.x;

            }
            function onHandleClick() {
                handleDownMark=!handleDownMark;
                if(handleDownMark){
                    lead_screwControl.enabled =false;
                    scene.remove(handleUp);
                    handleControl.detach(handleUp);
                    scene.add(handleDown);
                    handleControl.attach(handleDown);
                }
                else {
                    lead_screwControl.enabled =true;
                    scene.remove(handleDown);
                    handleControl.detach(handleDown);
                    scene.add(handleUp);
                    handleControl.attach(handleUp);

                }

            }

            function GCEAnimate() {
                // gear2.position.x=slider2.position.x;
                handleDown.position.x=slider2.position.x;
                handleUp.position.x=slider2.position.x;
                offSwitch.position.x=slider2.position.x;
                onSwitch.position.x=slider2.position.x;
                window.requestAnimationFrame(GCEAnimate);//回调
                controls.update();
                renderer.render(scene, camera);
            }

        }
        static get cnName() {

            return '齿轮径向总偏差与一齿径向综合偏差';
        }

        static get defaultWidth() {

            return '550px';
        }

        static get defaultHeight() {

            return '300px';
        }
    },

    RoughnessVI:class RoughnessVI extends TemplateVI{
        constructor(VICanvas, draw3DFlag) {

            super(VICanvas);

            const _this = this;


            let camera, scene, renderer,
				base, slider,slider0,handwheel,cylinder,cylinder_off,button_off,button_on,machineRay,sliderST,
				controls, sliderControl,slider0Control,buttonControl,cylinderControl;
            let onPos=false;
            this.onFlag=false,

            this.toggleObserver = function (flag) {

                if(!onPos){
                	_this.onFlag=!_this.onFlag;
                    layer.open({
                        title: '系统提示'
                        ,content: '请先点击安装被测工件，再开始测量'
                    });
                }
                else {

                    if (flag) {
                        base.remove(button_off);
                        buttonControl.detach(button_off);
                        base.add(button_on);
                        buttonControl.attach(button_on);
                        // sliderControl.enabled=true;
                        slider.add(machineRay);
                        _this.timer = window.setInterval(function () {

                            VILibrary.InnerObjects.dataUpdater(_this.dataLine);
                        }, 100);
                    }
                    else{
                        base.remove(button_on);
                        buttonControl.detach(button_on);
                        base.add(button_off);
                        buttonControl.attach(button_off);
                        // sliderControl.enabled=false;
                        slider.remove(machineRay);
                        sliderST=3;
                        setTimeout(function (){window.clearInterval(_this.timer);
                            _this.timer = 0;},200);
                    }
				}

            };

            /**
             *
             * @param input 输入端口读取角度
             */
            this.reset=function(){
               /* gear.rotateX(-gearNo*Math.PI/20);
                slider.position.y=sliderMark.position.y=0;
                if(!testerDown)tester.rotateX(Math.PI/4);
                gearNo=0,error=0,testerDown=true,sliderDown=false;*/
            }

            this.getData = function (dataType) {
                if (_this.onFlag){

                    // console.log("move",)
					let posY=slider.position.y
                    if(-6<=posY&&posY<=(-4))sliderST=0;
                    else if(-8<=posY&&posY<=-2)sliderST=1;
                    else if(-10<=posY&&posY<=-0)sliderST=2;
                    else sliderST=3;
                }
                else sliderST=3;
                return sliderST;

            };


            this.draw=function () {
                if (draw3DFlag) {

                    let loadingImg = document.createElement('img');
                    loadingImg.src = 'img/loading.gif';
                    loadingImg.style.width = '64px';
                    loadingImg.style.height = '64px';
                    loadingImg.style.position = 'absolute';
                    loadingImg.style.top = this.container.offsetTop + this.container.offsetHeight / 2 - 32 + 'px';
                    loadingImg.style.left = this.container.offsetLeft + this.container.offsetWidth / 2 - 32 + 'px';
                    loadingImg.style.zIndex = '10001';
                    this.container.parentNode.appendChild(loadingImg);

                    let promiseArr = [
                        VILibrary.InnerObjects.loadModule('assets/Roughness/base.mtl', 'assets/Roughness/base.obj'),

                        VILibrary.InnerObjects.loadModule('assets/Roughness/slider.mtl', 'assets/Roughness/slider.obj'),
                        VILibrary.InnerObjects.loadModule('assets/Roughness/button_off.mtl', 'assets/Roughness/button_off.obj'),
                        VILibrary.InnerObjects.loadModule('assets/Roughness/button_on.mtl', 'assets/Roughness/button_on.obj'),
                        VILibrary.InnerObjects.loadModule('assets/Roughness/slider0.mtl', 'assets/Roughness/slider0.obj'),
                        VILibrary.InnerObjects.loadModule('assets/Roughness/cylinder.mtl', 'assets/Roughness/cylinder.obj'),
                        VILibrary.InnerObjects.loadModule('assets/Roughness/handwheel.mtl', 'assets/Roughness/handwheel.obj'),
                        VILibrary.InnerObjects.loadModule('assets/Roughness/cylinder_off.mtl', 'assets/Roughness/cylinder_off.obj'),
                    ];
                    Promise.all(promiseArr).then(function (objArr) {


                        base = objArr[0];
                        slider = objArr[1];
                        button_off = objArr[2];
                        button_on = objArr[3];
                        slider0=objArr[4];
                        cylinder=objArr[5];
                        handwheel=objArr[6];
                        cylinder_off=objArr[7];
                        loadingImg.style.display = 'none';
                        RoughnessDraw();
                    }).catch(e => console.log('RRToothRingVI: ' + e));
                }
                else {

                    this.ctx = this.container.getContext("2d");
                    let img = new Image();
                    img.src = 'img/RR_ToothRing.png';
                    img.onload = function () {

                        _this.ctx.drawImage(img, 0, 0, _this.container.width, _this.container.height);
                    };
                }


            };
            this.draw();


            window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame
                || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
            //相机、渲染、灯光、控制等初始设置
            function RoughnessDraw () {
                scene = new THREE.Scene();

                renderer = new THREE.WebGLRenderer({canvas: _this.container, antialias: true});
                renderer.setClearColor(0x6495ED);
                renderer.setSize(_this.container.clientWidth, _this.container.clientHeight);

                camera = new THREE.PerspectiveCamera(45, _this.container.clientWidth / _this.container.clientHeight, 1, 15000);
                camera.position.set(-100,200,700);
                camera.lookAt(new THREE.Vector3(0, 0, 0));

                scene.add(base);
                base.add(cylinder_off,button_off,slider0);
                slider0.add(slider,handwheel);
                base.position.y=-180;
                slider.position.y=5;
                slider0.position.y=-46;
                // cylinder.rotateOnAxis((Math.sqrt(0.5),Math.sqrt(0.5),0),Math.PI/2);

                //射线
                var material = new THREE.LineBasicMaterial( { vertexColors: THREE.VertexColors } );
                var color1 = new THREE.Color( 0x6495ED );//顶点1的颜色
                var color2 = new THREE.Color( 0xFF0000 );//顶点2的颜色
                // 线的材质可以由2点的颜色决定
                var x = new THREE.Vector3( 0,-10,0);//定义顶点的位置
                var y = new THREE.Vector3(0,50,0);//定义顶点的位置
                var geometry = new THREE.Geometry();//创建一个几何体
                geometry.vertices.push(x); //vertices是用来存放几何体中的点的集合
                geometry.vertices.push(y);
                geometry.colors.push( color1, color2);//color是用来存放颜色的,有两个点说明这两个颜色对应两个点
                //geometry中colors表示顶点的颜色，必须材质中vertexColors等于THREE.VertexColors 时，颜色才有效，如果vertexColors等于THREE.NoColors时，颜色就没有效果了。那么就会去取材质中color的值
				machineRay = new THREE.Line( geometry, material, THREE.LinePieces );
                machineRay.rotation.z = -Math.PI / 4;
                machineRay.rotation.y =-33.8 /180 * Math.PI;
                machineRay.position.set(-52,183,-7);

                let light = new THREE.AmbientLight(0x555555);
                scene.add(light);
                let light1 = new THREE.DirectionalLight(0xffffff, 1);
                light1.position.set(4000, 4000, -4000);
                scene.add(light1);
                let light2 = new THREE.DirectionalLight(0xffffff, 1);
                light2.position.set(-2000, 4000, 4000);
                scene.add(light2);

                controls = new THREE.OrbitControls(camera, renderer.domElement);//鼠标对整个三维模型（相机）的控制
                controls.rotateSpeed = 0.8;
                controls.enableZoom = true;
                controls.zoomSpeed = 1.2;
                controls.enableDamping = true;
                let plane = new THREE.Mesh(new THREE.PlaneBufferGeometry(1000, 400),new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} ));
                //plane.rotateY(30/180*Math.PI);


                /*//拖动控制
                slider0Control = new ObjectControls(camera, renderer.domElement);
                slider0Control.map = plane;
                slider0Control.offsetUse = true;
                slider0Control.attachEvent('mouseOver', function () {
                    renderer.domElement.style.cursor = 'pointer';
                });
                slider0Control.attachEvent('mouseOut', function () {
                    renderer.domElement.style.cursor = 'auto';
                });

                slider0Control.attachEvent('dragAndDrop', onSlider0Drag);

                slider0Control.attachEvent('mouseUp', function () {
                    controls.enabled = true;
                    renderer.domElement.style.cursor = 'auto';
                });
*/
				//拖动控制
                sliderControl = new ObjectControls(camera, renderer.domElement);
                sliderControl.map = plane;
                sliderControl.offsetUse = true;

                sliderControl.attachEvent('mouseOver', function () {

                    renderer.domElement.style.cursor = 'pointer';
                });

                sliderControl.attachEvent('mouseOut', function () {

                    renderer.domElement.style.cursor = 'auto';
                });

                sliderControl.attachEvent('dragAndDrop', onSliderDrag);

                sliderControl.attachEvent('mouseUp', function () {

                    controls.enabled = true;
                    renderer.domElement.style.cursor = 'auto';
                });

                cylinderControl= new ObjectControls(camera, renderer.domElement);
                cylinderControl.offsetUse = true;

                cylinderControl.attachEvent('mouseOver', function () {

                    renderer.domElement.style.cursor = 'pointer';
                });

                cylinderControl.attachEvent('mouseOut', function () {

                    renderer.domElement.style.cursor = 'auto';
                });

                cylinderControl.attachEvent('onclick',function () {
                    base.remove(cylinder_off);
                    base.add(cylinder);
                    cylinderControl.detach(cylinderControl);
                    onPos=true;
                });

                buttonControl = new ObjectControls(camera, renderer.domElement);
                buttonControl.offsetUse = true;

                buttonControl.attachEvent('mouseOver', function () {

                    renderer.domElement.style.cursor = 'pointer';
                });

                buttonControl.attachEvent('mouseOut', function () {

                    renderer.domElement.style.cursor = 'auto';
                });

                buttonControl.attachEvent('onclick',function () {
                    _this.onFlag=!_this.onFlag;
                    _this.toggleObserver(!_this.timer);
                });

                //绑定控制对象
                sliderControl.attach(slider);
                // slider0Control.attach(slider0);
                buttonControl.attach(button_off);
                cylinderControl.attach(cylinder_off);

                RoughnessAnimate();
            }

           /* function onSlider0Drag () {
                controls.enabled = false;
                renderer.domElement.style.cursor = 'pointer';
                this.focused.position.x = this.previous.x;  //lock x direction
                if (this.focused.position.y < -50) {

                    this.focused.position.y = -50;
                }
                else if (this.focused.position.y > 40) {

                    this.focused.position.y = 40;
                }
                // slider0.position.y = this.focused.position.y;
                console.log("slider0",slider0.position.y)
            }*/
            function onSliderDrag () {
                controls.enabled = false;
                renderer.domElement.style.cursor = 'pointer';
                this.focused.position.x = this.previous.x;  //lock x direction
                if (this.focused.position.y < -10) {

                    this.focused.position.y = -10;
                }
                else if (this.focused.position.y > 10) {

                    this.focused.position.y = 10;
                }
                // console.log("slider",slider.position.y)
                // if(slider.position.y<-)
            }

            function RoughnessAnimate() {
                window.requestAnimationFrame(RoughnessAnimate);//回调
                controls.update();
                renderer.render(scene, camera);
            }

        }
        static get cnName() {

            return '粗糙度';
        }

        static get defaultWidth() {

            return '550px';
        }

        static get defaultHeight() {

            return '300px';
        }
	},
	/*PanelVI:class PanelVI extends TemplateVI {
        constructor(VICanvas, draw3DFlag) {

            super(VICanvas);

            const _this = this;

            let camera, scene, renderer,
                scrollMesh,rulerMesh,panelMesh,markLine,
				panelControl, formerY=0;

            // let rulerPosition = -400;

            //crossMark in renderer
            let crossMarkTexture = new THREE.TextureLoader().load('img/crossMark.png');
            let crossMarkMaterial = new THREE.MeshBasicMaterial({map: crossMarkTexture});
            crossMarkMaterial.transparent = true;
            let crossMark = new THREE.Mesh(new THREE.PlaneGeometry(128, 128), crossMarkMaterial);
            crossMark.position.x = -160;
            crossMark.position.z = 1;

            let indexMark,indexMark1;
            // let raycaster = new THREE.Raycaster();
            let indexLines = [], indexNumbers = [];
            let objects = [], mouse = new THREE.Vector2(), SELECTED, mouseY = 0, rulerPosition = -400;

            let requestAnimationFrame = window.requestAnimationFrame
                || window.mozRequestAnimationFrame
                || window.webkitRequestAnimationFrame
                || window.msRequestAnimationFrame;
            window.requestAnimationFrame = requestAnimationFrame;



            panelDraw();
            panelAnimate();

            function panelDraw() {
                let panelCanvas = document.getElementById('panelCanvas')
                renderer = new THREE.WebGLRenderer({canvas: _this.container, antialias: true});
                renderer.setClearColor(0x6495ED);
                renderer.setClearAlpha(0);
                renderer.setSize(_this.container.clientWidth, _this.container.clientHeight);


                camera = new THREE.PerspectiveCamera(30, _this.container.clientWidth / _this.container.clientHeight, 1, 2000);
                camera.position.z = 1000;
                camera.lookAt(new THREE.Vector3(0, 0, 0));

                scene = new THREE.Scene();

                let light = new THREE.DirectionalLight(0xffffff, 1);
                light.position.set(0, 0, 1000);
                scene.add(light);

                let scrollTexture = new THREE.TextureLoader().load('img/1.png');
                let scrollGeometry = new THREE.BoxGeometry(32 * 2.5, 128 * 2.5, 10);
                 scrollMesh = new THREE.Mesh(scrollGeometry,
                    new THREE.MeshBasicMaterial({map: scrollTexture}));
                scrollMesh.position.x = 330;

                 rulerMesh = new THREE.Mesh(new THREE.PlaneGeometry(180, 400),
                    new THREE.MeshBasicMaterial({color: 0xffffff}));
                rulerMesh.position.x = 180;

                drawIndexLine();

                 panelMesh = new THREE.Mesh(new THREE.CircleGeometry(220, 40, 0, Math.PI * 2),
                    new THREE.MeshBasicMaterial({color: 0x66FF00}));

                panelMesh.position.x = -160;
                //add zoomIndex
                drawZoomIndexLine();

                let markGeometry = new THREE.Geometry();
                let markMaterial = new THREE.LineBasicMaterial({color: 0x000000, linewidth: 0.5});
                markGeometry.vertices.push(new THREE.Vector3(200, 0.5, 0));
                markGeometry.vertices.push(new THREE.Vector3(90, 0.5, 0));
                 markLine = new THREE.Line(markGeometry, markMaterial, THREE.LineSegments);

                /!*let indexMarkGeometry = new THREE.Geometry();
                indexMarkGeometry.vertices.push(new THREE.Vector3(-380, 0, 0));
                indexMarkGeometry.vertices.push(new THREE.Vector3(60, 0, 0));

                indexMark = new THREE.Line(indexMarkGeometry, new THREE.LineBasicMaterial({
                    color: 0x000000,
                    linewidth: 0.5
                }), THREE.LineSegments);
                indexMark1 = new THREE.Line(indexMarkGeometry, new THREE.LineBasicMaterial({
                    color: 0x000000,
                    linewidth: 0.5
                }), THREE.LineSegments);*!/
                 drawIndexMark();

                indexMark.position.z = 2;
                scene.add(indexMark);
                indexMark.add(indexMark1);
                scene.add(scrollMesh);
                scene.add(rulerMesh);
                scene.add(panelMesh);
                scene.add(markLine);
                objects.push(scrollMesh);

                let plane = new THREE.Mesh(new THREE.PlaneBufferGeometry(800, 800),new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} ));
                //plane.rotateY(30/180*Math.PI);
                plane.position.x = 330;

                //拖动控制
                panelControl = new ObjectControls(camera, renderer.domElement);
                panelControl.map = plane;
                panelControl.offsetUse = true;

                panelControl.attachEvent('mouseOver', function () {

                    renderer.domElement.style.cursor = 'pointer';
                });

                panelControl.attachEvent('mouseOut', function () {

                    renderer.domElement.style.cursor = 'auto';
                });

                panelControl.attachEvent('dragAndDrop', onScrollDrag);

                panelControl.attachEvent('mouseUp', function () {

                    // controls.enabled = true;
                    renderer.domElement.style.cursor = 'auto';
                });
               /!* panelControl.attachEvent('mousedown', function () {

                    renderer.domElement.style.cursor = 'pointer';
                    formerY=this.focused.position.y;
                });*!/
                panelControl.attach(scrollMesh);



                panelAnimate();
            }
            function panelAnimate() {
                window.requestAnimationFrame(panelAnimate);
                renderer.render(scene, camera);
            }

            function drawIndexMark() {

                scene.remove(indexMark);

                let indexMarkGeometry = new THREE.Geometry();
                indexMarkGeometry.vertices.push(new THREE.Vector3(-160 - Math.sqrt(220 * 220 - (rulerPosition + 400) * (rulerPosition + 400)), rulerPosition + 400, 0));
                indexMarkGeometry.vertices.push(new THREE.Vector3(-160 + Math.sqrt(220 * 220 - (rulerPosition + 400) * (rulerPosition + 400)), rulerPosition + 400, 0));

                indexMark = new THREE.Line(indexMarkGeometry, new THREE.LineBasicMaterial({
                    color: 0x000000,
                    linewidth: 0.5
                }), THREE.LineSegments);
                // indexMark.position.z = 2;

                let indexMarkGeometry1 = new THREE.Geometry();
                indexMarkGeometry1.vertices.push(new THREE.Vector3( -160-(rulerPosition + 400), - Math.sqrt(220 * 220 - (rulerPosition + 400) * (rulerPosition + 400)),0));
                indexMarkGeometry1.vertices.push(new THREE.Vector3( -160-(rulerPosition + 400),   Math.sqrt(220 * 220 - (rulerPosition + 400) * (rulerPosition + 400)),0));

                indexMark1 = new THREE.Line(indexMarkGeometry1, new THREE.LineBasicMaterial({
                    color: 0x000000,
                    linewidth: 0.5
                }), THREE.LineSegments);

                scene.add(indexMark);
                indexMark.add(indexMark1);

//        console.log('y: ' + rulerPosition);
            }
            function drawIndexLine() {

                for (let i = 0; i < 100; i++) {
                    let indexGeometry = new THREE.Geometry();
                    let xPosition = 170;
                    let yPosition = -199 + 15 * i + rulerPosition;
                    if (yPosition >= 199 || yPosition <= -199) continue;

                    if (i % 5 == 0) xPosition = 180;

                    if (i % 10 == 0) {

                        xPosition = 190;
                        let indexCanvas = document.createElement('canvas');
                        indexCanvas.style.width = "128px";
                        indexCanvas.style.height = "256px";
                        let context1 = indexCanvas.getContext('2d');
                        context1.font = "30px Arial";
                        context1.fillStyle = "rgba(0,0,0,1)";
                        context1.fillText(i.toString(), 0, 25);
                        // canvas contents will be used for a texture
                        let texture1 = new THREE.Texture(indexCanvas);
                        texture1.needsUpdate = true;
                        let material1 = new THREE.MeshBasicMaterial({map: texture1});
                        material1.transparent = true;
                        let indexNumber = new THREE.Mesh(new THREE.PlaneGeometry(indexCanvas.width, indexCanvas.height), material1);
                        indexNumber.position.set(350, yPosition - 60, 0);
                        scene.add(indexNumber);
                        indexNumbers.push(indexNumber);
                    }

                    indexGeometry.vertices.push(new THREE.Vector3(150, yPosition, 0));
                    indexGeometry.vertices.push(new THREE.Vector3(xPosition, yPosition, 0));
                    let indexLine = new THREE.Line(indexGeometry, new THREE.LineBasicMaterial({
                        color: 0x000000,
                        linewidth: 0.5
                    }), THREE.LineSegments);
                    scene.add(indexLine);
                    indexLines.push(indexLine);
                }
            }
            function drawZoomIndexLine() {
                for (let i = 0; i < 100; i++) {
                    let indexGeometry = new THREE.Geometry();
                    let xPosition = -250;
                    let yPosition = -200 + 20 * i;
                    if (yPosition >= 200 || yPosition <= -200) continue;

                    if (i % 5 == 0) {

                        xPosition = -270;
                        let zoomIndexCanvas = document.createElement('canvas');
                        let context1 = zoomIndexCanvas.getContext('2d');
                        context1.font = "40px Arial";
                        context1.fillStyle = "rgba(0,0,0,1)";
                        context1.fillText(i.toString(), 0, 90);
                        // canvas contents will be used for a texture
                        let texture1 = new THREE.Texture(zoomIndexCanvas)
                        texture1.needsUpdate = true;
                        let material1 = new THREE.MeshBasicMaterial({map: texture1});
                        material1.transparent = true;
                        let zoomIndexNumber = new THREE.Mesh(
                            new THREE.PlaneGeometry(zoomIndexCanvas.width, zoomIndexCanvas.height), material1);
                        zoomIndexNumber.position.set(-180, yPosition, 0);
                        scene.add(zoomIndexNumber);
                    }
                    indexGeometry.vertices.push(new THREE.Vector3(-210, yPosition, 0));
                    indexGeometry.vertices.push(new THREE.Vector3(xPosition, yPosition, 0));
                    let zoomIndexLine = new THREE.Line(indexGeometry, new THREE.LineBasicMaterial({
                        color: 0x000000,
                        linewidth: 0.5
                    }), THREE.LineSegments);
                    scene.add(zoomIndexLine);
                }
            }

            function onScrollDrag() {
                renderer.domElement.style.cursor = 'pointer';
                console.log( ( this.focused.position.y - formerY)/2 );

                // rulerPosition += ( this.focused.position.y - formerY)/2 ;
                // rulerPosition += ( this.focused.position.y - this.previous.y) ;
                rulerPosition=400+this.focused.position.y/100;
                formerY=this.focused.position.y;

                this.focused.position.x = this.previous.x;  //lock x direction
                scrollMesh.position.y = this.previous.y;  //lock x direction

                while (indexNumbers.length > 0) {
                    scene.remove(indexNumbers[0]);
                    indexNumbers.shift();
                }

                while (indexLines.length > 0) {
                    scene.remove(indexLines[0]);
                    indexLines.shift();
                }
                drawIndexLine();
                drawIndexMark();
            }



        }
    }*/

    PanelVI:class PanelVI extends TemplateVI{
        constructor (VICanvas) {
            super(VICanvas);
            const _this = this;
            this.name = 'PanelVI';
            let ctx = this.container.getContext("2d"),img;
            let canvasW=this.container.width,canvasH=this.container.height,
				panelX=canvasW*0.3,panelY=canvasH/2,R=canvasW*0.3,
				rulerW=canvasW*0.15,rulerH=canvasH*0.7,rulerX=panelX+R+canvasW*0.05,rulerY=(canvasH-rulerH)/2,
			    scrollW=canvasW*0.1,scrollH=canvasH*0.5,scrollX=rulerX+rulerW,scrollY=(canvasH-scrollH)/2,
                IS_DOWN=false,formerY=0,testNum=0,formerInput=0,
                imgSRC='img/Roughness/Transparent.png',img2,
				BLACK="#000000",
				RED="#ff0000";
            ctx.textBaseline="middle";//文字居中定位
            ctx.lineWidth=1;


            this.setData = function (input){

                let inputST = Number(Array.isArray(input) ? input[input.length - 1] : input);

                if (Number.isNaN(inputST)) {

                    console.log('panelVI: Input value error');
                    return;
                }
                if(input!=formerInput){
                    switch (input)
                    {
                        case 0:imgSRC='img/Roughness/Clear.png';break;
                        case 1:imgSRC='img/Roughness/Blurred1.png';break;
                        case 2:imgSRC='img/Roughness/Blurred2.png';break;
                        case 3:imgSRC='img/Roughness/Transparent.png';break;
                    }
                    drawImg2();
				}
                formerInput=input;
            };

            function scrollDraw() {
                //手轮
                img = new Image();
                img.onload = function(){
                    ctx.drawImage(img, scrollX,scrollY,scrollW,scrollH);

                }
                img.src = 'img/1.png';

            }
            function drawImg2() {
                img2 = new Image();
                img2.onload = function(){
                    draw(0);
                }
                img2.src=imgSRC;
            }



            function draw(i) {

                ctx.clearRect(0,0,scrollX,canvasH);//清空画布
				/*静态部分*/
                ctx.save();
				ctx.fillStyle=BLACK;
                ctx.beginPath();
                ctx.arc(panelX, panelY,R, 0, Math.PI*2, false);
                ctx.fill();
                ctx.closePath();
                ctx.drawImage(img2, panelX-R,panelY-R,2*R,2*R);
                ctx.fillStyle=RED;
                ctx.strokeStyle=RED;
                ctx.beginPath();
                ctx.translate(panelX,panelY);//坐标系移至圆心
                ctx.rotate(-Math.PI/4);
                for(let i=0;i<10;i++){
                    ctx.moveTo(0.3*R,-(0.7-0.16*i)*R);
                    ctx.lineTo(0.4*R,-(0.7-0.16*i)*R);
                    ctx.fillText(i, 0.5*R, -(0.7-0.16*i)*R);
                }
                ctx.stroke();
                ctx.closePath();
                ctx.restore();

                // 刻度尺
                let my_gradient=ctx.createLinearGradient(0,0,0,canvasH);
                my_gradient.addColorStop(0,"#555555");
                my_gradient.addColorStop(0.5,"#cccccc");
                my_gradient.addColorStop(1,"#555555");
                ctx.fillStyle=my_gradient;
                ctx.fillRect(rulerX,rulerY,rulerW,rulerH);
                ctx.strokeStyle=BLACK;
                ctx.beginPath();
                ctx.moveTo(rulerX,panelY);
                ctx.lineTo(rulerX+rulerW,panelY);
                ctx.stroke();
                ctx.closePath();




				/*可动部分*/
                ctx.save();//目镜视场内移动刻度线
                ctx.translate(panelX,panelY);//坐标系移至圆心
                ctx.strokeStyle=RED;
                ctx.beginPath();
                ctx.moveTo(-Math.sqrt(R*R-i*i),-i);//十字线
                ctx.lineTo(Math.sqrt(R*R-i*i),-i);
                ctx.moveTo(-i,Math.sqrt(R*R-i*i));
                ctx.lineTo(-i,-Math.sqrt(R*R-i*i));
                // ctx.moveTo(-i+R/2,-i-R/2);
                // ctx.lineTo(-i+R/2+R/4*Math.sin(Math.PI/4),-(i+R/2+R/4*Math.sin(Math.PI/4)));
                ctx.rotate(-Math.PI/4); // 画目镜刻度
                ctx.moveTo(0.6*R,0.16*i*R*0.01);
                ctx.lineTo(0.8*R,0.16*i*R*0.01);
                ctx.moveTo(0.6*R,0.16*i*R*0.01+3);
                ctx.lineTo(0.8*R,0.16*i*R*0.01+3);
                ctx.stroke();
                ctx.closePath();
                ctx.restore();

                //刻度尺刻度及数字
                ctx.save();
                ctx.beginPath();
                let rulerLineX=rulerX+rulerW*0.2,//刻度线左侧起点
                    rulerMin=rulerH*0.03,//刻度线间距
                    rulerLineYp,
                    rulerLineYn;
                ctx.translate(rulerLineX,panelY);
                ctx.fillStyle=BLACK;
                for(let j=0;j<=50;j++){
                    rulerLineYp=i+j*rulerMin;
                    rulerLineYn=i-j*rulerMin;
                    let lineLen = (j % 5) ? rulerW * 0.2 : rulerW * 0.3;
                    if((rulerLineYp>(-rulerH/2))&&(rulerLineYp<rulerH/2)) {
                        ctx.moveTo(0, rulerLineYp);
                        ctx.lineTo(lineLen, rulerLineYp);
                        if ((j % 10) == 0&&Math.abs(rulerLineYp)<(0.5*rulerH-10))ctx.fillText(50-j, lineLen + 1, rulerLineYp);
                        //    被十整除而且不在标尺的边缘（保证数字不会超出标尺范围）
                    }
                    if(((-rulerH/2)<rulerLineYn)&&(rulerLineYn<rulerH/2)){
                        ctx.moveTo(0,rulerLineYn);
                        ctx.lineTo(lineLen,rulerLineYn);
                        if((j%10)==0&&Math.abs(rulerLineYn)<(0.5*rulerH-10))ctx.fillText(50+j,lineLen+1,rulerLineYn);
                    }
                }

                ctx.stroke();
                ctx.closePath();
                ctx.restore();






            }

            //拖动控制
            _this.container.addEventListener("mousedown",function() {
                event.preventDefault();this.style.cursor = 'pointer';IS_DOWN=true;formerY=event.offsetY;/*formerX=event.offsetX;*/},false);
            _this.container.addEventListener("mousemove",function () {
                event.preventDefault();
                if (IS_DOWN == false) return;
                let x=event.offsetX;
                let y=event.offsetY;

                if((scrollX<x<(scrollX+scrollW))&&(scrollY<y<(scrollY+scrollH))){
                    this.style.cursor = 'pointer';
                    testNum+=(y-formerY)*0.2;

                    formerY=y;

                }
                draw(testNum);

            },false);
            _this.container.addEventListener("mouseup",function (){IS_DOWN=false;},false);
            _this.container.addEventListener("mouseout",function (){IS_DOWN=false;this.style.cursor = 'auto';},false);
            _this.container.addEventListener("mouseover",function (){this.style.cursor = 'pointer';},false);




//调用函数

            scrollDraw();
            drawImg2();






        }
        static get cnName() {

            return '双管显微镜目镜视场';
        }

        static get defaultWidth() {

            return '550px';
        }

        static get defaultHeight() {

            return '300px';
        }
    },

    CircleRunoutVI:class CircleRunoutVI extends TemplateVI{
        constructor (VICanvas,draw3DFlag) {
            super(VICanvas);
            const _this = this;
            this.name = 'CircleRunoutVI';

            let camera,scene,renderer,
				controls,base1Control,rotator1Control,rotator2Control,stickControl,buttonControl,
				base1,base,axis,rotator1,rotator2,stick,onButton,offButton,
				onFlag=false,exmStyle=0,index=0,offset,tolerance,result,
                errArray1=[0,1.5,3,4.5,6,7.5,9,10.5,10.5,9,7.5,6,4.5,3,1.5,0,-1.5,-3,-1,0],
                errArray2=[0,1,2,3,4,5,6,7,8,9,8,7,6,5,4,3,2,1,0.5,0],
                errOutput=[0];

            _this.timer=0;

            this.toggleObserver = function (flag) {

                if (flag) {

                    if (!_this.timer&&exmStyle) {
                         if(!index){errOutput=[0];}
                        scene.remove(offButton);
                        buttonControl.detach(offButton);
                        scene.add(onButton);
                        buttonControl.attach(onButton);
                        document.getElementById("exmSelect").disabled=true;
                        let delta =0.1*Math.PI  ;//一齿的弧度
                        _this.timer = window.setInterval(function () {
                        	if(exmStyle==1)errOutput[index]=errArray1[index]+Math.random();
                            if((exmStyle==2)||(exmStyle==3))errOutput[index]=errArray2[index]-Math.random();
                        	index++;

                            axis.rotation.x = index*delta;
                            if(axis.rotation.x>=Math.PI*2){
                                window.clearInterval(_this.timer);
                                document.getElementById("exmSelect").disabled=false;
                                document.getElementById('data'+(exmStyle*4-1)).innerText =offset;
                                document.getElementById('data'+exmStyle*4).innerText =result;
                                axis.rotation.x=0;
                                index=0;
                                _this.timer = 0;
                                scene.remove(onButton);
                                buttonControl.detach(onButton);
                                scene.add(offButton);
                                buttonControl.attach(offButton);
                                errOutput[20]=0;

                            }
                            if (_this.dataLine) {

                                VILibrary.InnerObjects.dataUpdater(_this.dataLine);
                            }
                        }, 100);
                    }
                }
                else{
                    scene.remove(onButton);
                    buttonControl.detach(onButton);
                    scene.add(offButton);
                    buttonControl.attach(offButton);
                    window.clearInterval(this.timer);
                    _this.timer = 0;
                    // index=0;
                    // errOutput=[0];
                    // axis.rotation.x =0;
                }
            };
            this.getData=function (dataType) {
				if(exmStyle==1||exmStyle==2||exmStyle==3){
					let max=Math.max.apply(Math,errOutput).toFixed(1);
                    let min=Math.min.apply(Math,errOutput).toFixed(1);
                    offset=(max-min).toFixed(1);
					tolerance=parseFloat(document.getElementById('tol'+exmStyle).innerText);
					result=offset<=tolerance?"合格":"不合格";
                    document.getElementById('data'+(exmStyle*4-3)).innerText =max;
                    document.getElementById('data'+(exmStyle*4-2)).innerText =min;
                    /*document.getElementById('data'+(exmStyle*4-1)).innerText =offset;
                    document.getElementById('data'+exmStyle*4).innerText =result;*/

				}
				else errOutput=[0];
                    // console.log(errOutput);
                return errOutput;

            }

            this.draw=function () {
                if (draw3DFlag) {

                    let loadingImg = document.createElement('img');
                    loadingImg.src = 'img/loading.gif';
                    loadingImg.style.width = '64px';
                    loadingImg.style.height = '64px';
                    loadingImg.style.position = 'absolute';
                    loadingImg.style.top = this.container.offsetTop + this.container.offsetHeight / 2 - 32 + 'px';
                    loadingImg.style.left = this.container.offsetLeft + this.container.offsetWidth / 2 - 32 + 'px';
                    loadingImg.style.zIndex = '10001';
                    this.container.parentNode.appendChild(loadingImg);

                    let promiseArr = [
                        VILibrary.InnerObjects.loadModule('assets/CircleRunout/base1.mtl', 'assets/CircleRunout/base1.obj'),
                        VILibrary.InnerObjects.loadModule('assets/CircleRunout/base2.mtl', 'assets/CircleRunout/base2.obj'),
                        VILibrary.InnerObjects.loadModule('assets/CircleRunout/axis.mtl', 'assets/CircleRunout/axis.obj'),
                        VILibrary.InnerObjects.loadModule('assets/CircleRunout/Rotator1.mtl', 'assets/CircleRunout/Rotator1.obj'),
                        VILibrary.InnerObjects.loadModule('assets/CircleRunout/stick.mtl', 'assets/CircleRunout/stick.obj'),
                        VILibrary.InnerObjects.loadModule('assets/CircleRunout/Rotator2.mtl', 'assets/CircleRunout/Rotator2.obj'),
                        VILibrary.InnerObjects.loadModule('assets/CircleRunout/onButton.mtl', 'assets/CircleRunout/onButton.obj'),
                        VILibrary.InnerObjects.loadModule('assets/CircleRunout/offButton.mtl', 'assets/CircleRunout/offButton.obj'),

                    ];
                    Promise.all(promiseArr).then(function (objArr) {


                        base = objArr[0];
                        base1 = objArr[1];
                        axis = objArr[2];
                        rotator1 = objArr[3];
                        stick = objArr[4];
                        rotator2 = objArr[5];
                        onButton=objArr[6];
                        offButton=objArr[7];


                        loadingImg.style.display = 'none';
                        CRDraw();
                    }).catch(e => console.log('CircleRunoutVI: ' + e));
                }
                else {

                    this.ctx = this.container.getContext("2d");
                    let img = new Image();
                    img.src = 'img/RR_ToothRing.png';
                    img.onload = function () {

                        _this.ctx.drawImage(img, 0, 0, _this.container.width, _this.container.height);
                    };
                }


            };
            this.draw();


            window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame
                || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
            //相机、渲染、灯光、控制等初始设置
            function CRDraw () {
                scene = new THREE.Scene();

                renderer = new THREE.WebGLRenderer({canvas: _this.container, antialias: true});
                renderer.setClearColor(0x6495ED);
                renderer.setSize(_this.container.clientWidth, _this.container.clientHeight);

                camera = new THREE.PerspectiveCamera(45, _this.container.clientWidth / _this.container.clientHeight, 1, 1000);
                camera.position.set(0,0,180);
                camera.lookAt(new THREE.Vector3(0, 0, 0));

                scene.add(base1,base,axis,offButton);
                base1.add(rotator1);
				rotator1.add(stick);
				stick.add(rotator2);

                stick.position.set(0,0,0);
				rotator1.position.set(50,-46.26,50);
                rotator2.position.set(-27,58.76,-8);

                let light = new THREE.AmbientLight(0x555555);
                scene.add(light);
                let light1 = new THREE.DirectionalLight(0xffffff, 1);
                light1.position.set(4000, 4000, 4000);
                scene.add(light1);
                let light2 = new THREE.DirectionalLight(0xffffff, 1);
                light2.position.set(-4000, 4000, -4000);
                scene.add(light2);

                controls = new THREE.OrbitControls(camera, renderer.domElement);//鼠标对整个三维模型（相机）的控制
                controls.rotateSpeed = 0.8;
                controls.enableZoom = true;
                controls.zoomSpeed = 1.2;
                controls.enableDamping = true;
                let plane = new THREE.Mesh(new THREE.PlaneBufferGeometry(1000, 400),new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} ));
                // plane.rotateX(0.5*Math.PI);

                //拖动控制
                base1Control = new ObjectControls(camera, renderer.domElement);
                base1Control.map = plane;
                base1Control.offsetUse = true;


                base1Control.attachEvent('mouseOver', function () {

                    renderer.domElement.style.cursor = 'pointer';
                });

                base1Control.attachEvent('mouseOut', function () {

                    renderer.domElement.style.cursor = 'auto';
                });

                base1Control.attachEvent('dragAndDrop', onBase1Drag);

                base1Control.attachEvent('mouseUp', function () {
                    controls.enabled = true;
                    renderer.domElement.style.cursor = 'auto';
                });


                //双向孔套1
                rotator1Control = new ObjectControls(camera, renderer.domElement);
                rotator1Control.map = plane;
                rotator1Control.offsetUse = true;
                rotator1Control.attachEvent('mouseOver', function () {

                    renderer.domElement.style.cursor = 'pointer';
                });

                rotator1Control.attachEvent('mouseOut', function () {
                    renderer.domElement.style.cursor = 'auto';
                });
                rotator1Control.attachEvent('dragAndDrop', onRotator1Drag);
                rotator1Control.attachEvent('mouseUp', function () {
                    controls.enabled = true;
                    stickControl.enabled=true;
                    renderer.domElement.style.cursor = 'auto';
                });

                stickControl = new ObjectControls(camera, renderer.domElement);
                stickControl.map = plane;
                stickControl.offsetUse = true;
                stickControl.attachEvent('dragAndDrop', onStick1Drag);
                stickControl.attachEvent('mouseUp', function () {
                    controls.enabled = true;
                    renderer.domElement.style.cursor = 'auto';
                });

                rotator2Control = new ObjectControls(camera, renderer.domElement);
                rotator2Control.map = plane;
                rotator2Control.offsetUse = true;
                rotator2Control.attachEvent('dragAndDrop', onRotator2Drag);
                rotator2Control.attachEvent('mouseUp', function () {
                    controls.enabled = true;
                    renderer.domElement.style.cursor = 'auto';
                });

                buttonControl = new ObjectControls(camera, renderer.domElement);
                buttonControl.map = plane;
                buttonControl.offsetUse = true;
                buttonControl.attachEvent('onclick', function () {
                    _this.toggleObserver(!_this.timer);
                });
                buttonControl.attachEvent('mouseOver', function () {

                    renderer.domElement.style.cursor = 'pointer';
                });

                buttonControl.attachEvent('mouseOut', function () {

                    renderer.domElement.style.cursor = 'auto';
                });

                //绑定控制对象
                base1Control.attach(base1);
                rotator1Control.attach(rotator1);
                stickControl.attach(stick);
                rotator2Control.attach(rotator2);
                buttonControl.attach(offButton);



                CRAnimate();
            }

            function onBase1Drag () {
                if(this.focused.materialLibraries=="base2.mtl"){
                    controls.enabled = false;
                    renderer.domElement.style.cursor = 'pointer';
                    /*if (this.focused.position.y < -20) {

                        this.focused.position.y = -20;
                    }
                    else if (this.focused.position.y > 5) {

                        this.focused.position.y = 5;
                    }*/
                    if (this.focused.position.x < -120) {

                        this.focused.position.x = -120;
                    }
                    else if (this.focused.position.x > 30) {

                        this.focused.position.x = 30;
                    }

                    // base1.position.z =- this.focused.position.y;
                    this.focused.position.y = this.previous.y;
				}
				else {
                    this.focused.position.x = this.previous.x;
                    this.focused.position.y = this.previous.y;
				}
            }
            function onRotator1Drag () {
                if(this.focused.materialLibraries=="Rotator1.mtl"){
                	stickControl.enabled=false;
                    controls.enabled = false;
                    renderer.domElement.style.cursor = 'pointer';
                    let formerX=this.previous.x;
                    let offsetX=this.focused.position.x-formerX,flg=0;
                    if(offsetX>0) flg=1;
                    else if (offsetX<0) flg=-1;
                    else  flg=0;
                    // formerX=this.focused.position.x;
                    rotator1.position.x = this.previous.x;
                    rotator1.rotateY(flg*0.005);
                    console.log("rotator1Control.enabled",rotator1Control.enabled);
				}
                else {
                    this.focused.position.x = this.previous.x;
                    this.focused.position.y = this.previous.y;
                }
            }
            function onStick1Drag () {
                if(this.focused.materialLibraries=="stick.mtl"){
                    controls.enabled = false;
                    renderer.domElement.style.cursor = 'pointer';
                    if (this.focused.position.x < -120) {

                        this.focused.position.x = -120;
                    }
                    else if (this.focused.position.x > 30) {

                        this.focused.position.x = 30;
                    }
                    this.focused.position.y = this.previous.y;
				}
                else {
                    this.focused.position.x = this.previous.x;
                    this.focused.position.y = this.previous.y;
                }
            }
            function onRotator2Drag () {
                    controls.enabled = false;
                    renderer.domElement.style.cursor = 'pointer';
                    let offsetY=this.focused.position.y-this.previous.y,flg=0;
                    if(offsetY>0) flg=1;
                    else if (offsetY<0) flg=-1;
                    else  flg=0;
                    this.focused.position.x= this.previous.x;
                    this.focused.position.y= this.previous.y;
                    rotator2.rotateX(-flg*0.003);
            }

            function CRAnimate() {
                window.requestAnimationFrame(CRAnimate);//回调
                controls.update();
                renderer.render(scene, camera);
            }

            this.changeStyle=function (i) {
                exmStyle=i;
                // console.log(exmStyle);
				switch (i){
					case 0:{
                        base1.position.set(0,0,-10);
                        rotator1.position.set(50,-46.26,50);
                        rotator2.position.set(-27,58.76,-8);
                        stick.position.set(20,0,0);
                        rotator1.rotation.y=0;
                        rotator2.rotation.x=0;

                        base1Control.enabled=true;
                        rotator1Control.enabled=true;
                        stickControl.enabled=true;
                        rotator2Control.enabled=true;

                        break;
					}
					case 1:{
						base1.position.set(-70,0,-6);
                        rotator1.position.set(50,-46.26,50);
                        rotator2.position.set(-27,58.76,-8);
                        stick.position.set(-10,0,0);
                        rotator2.rotation.x=0;
                        rotator1.rotation.y=-Math.PI/2;

                        base1Control.enabled=false;
                        rotator1Control.enabled=false;
                        stickControl.enabled=false;
                        rotator2Control.enabled=false;

                        break;
					}
					case 2:{
                        base1Control.enabled=false;
                        rotator1Control.enabled=false;
                        stickControl.enabled=false;
                        rotator2Control.enabled=false;

                        stick.position.set(-10,0,0);
                        base1.position.set(-63.88,0,-6);
                        rotator1.position.set(50,-46.5,50);
                        rotator2.position.set(-27,58.76,-8);
                        rotator1.rotation.y=-Math.PI/2;
                        rotator2.rotation.x=Math.PI/6;
                        break;
					}
					case 3:{
                        base1.position.set(-35.69,0,-6);
                        rotator1.position.set(50,-55.76,50);
                        rotator2.position.set(-27,58.76,-8);
                        stick.position.set(-10,0,0);
                        rotator1.rotation.y=-Math.PI/2;
                        rotator2.rotation.x=-Math.PI/3;

                        base1Control.enabled=false;
                        rotator1Control.enabled=false;
                        stickControl.enabled=false;
                        rotator2Control.enabled=false;
                        break;
					}
					default: console.log("examStyle error");break;
				}
            }

        }
        static get cnName() {

            return '圆跳动';
        }

        static get defaultWidth() {

            return '550px';
        }

        static get defaultHeight() {

            return '300px';
        }
    },

    RoundnessVI:class CircleRunoutVI extends TemplateVI {
        constructor(VICanvas, draw3DFlag) {
            super(VICanvas);
            const _this = this;
            this.name = 'RoundnessVI';

            let camera, scene, renderer,index = 0,
				base,slider,tester,rotator,onSwitch,offSwitch,
                controls,sliderControl,testerControl,switchControl,
				xOn=false,yOn=true;
               /*  base1Control, rotator1Control, rotator2Control, stickControl, buttonControl,
                base1, base, axis, rotator1, rotator2, stick, onButton, offButton,
                _this.onFlag = false, exmStyle = 0,;*/
			let dataOutput = [0];
			let errOutput=[0],R=70;//基准圆半径



            this.timer = 0;

            this.toggleObserver = function (flag) {
                if (flag) {
                    // console.log(xOn,yOn)
                    if (!this.timer&&xOn&&yOn) {

                        // if(!index){dataOutput=[0];}
                        scene.remove(offSwitch);
                        switchControl.detach(offSwitch);
                        scene.add(onSwitch);
                        switchControl.attach(onSwitch);

                        let delta =0.05*Math.PI;
                        let  table = document.getElementById("roundnessData");

                        if(index==0){
                        	let d= document.getElementsByClassName("exm_data");
                        	for (let i=0; i<d.length;i++){d[i].innerText="";}
                        }
                        this.timer = window.setInterval(function () {
                            //dataOutput[index]=50+10*Math.random();
							errOutput[index]=10*Math.random();
							dataOutput[index]=R+errOutput[index];
							
                            if(index>table.rows.length-2){

                                let  oneRow = table.insertRow();//插入一行
                                let  cell1= oneRow.insertCell();//单单插入一行是不管用的，需要插入单元格
                                let  cell2=oneRow.insertCell();
                                let  cell3=oneRow.insertCell();
                                cell1.innerText = index;
                                cell2.className="exm_data";
                                cell3.className="exm_data";
                                cell2.id="a"+index;
                                cell3.id="e"+index;


							}

                            document.getElementById("a"+index).innerText=index*9;//以角度表示
                            document.getElementById("e"+index).innerText=errOutput[index].toFixed(2);


                            index++;
                            rotator.rotation.y = index*delta;
                            if (_this.dataLine) {
                                VILibrary.InnerObjects.dataUpdater(_this.dataLine);
                            }
                            if(rotator.rotation.y>=Math.PI*2){
                                scene.remove(onSwitch);
                                switchControl.detach(onSwitch);
                                scene.add(offSwitch);
                                switchControl.attach(offSwitch);
                                window.clearInterval(_this.timer);
                                rotator.rotation.y =0;
                                    index=0;
                                _this.timer = 0;
                                dataOutput=[0];
								errOutput=[0];
                                // dataOutput[20]=0;
                            }
                            //定时更新相同数据线VI的数据

                        }, 50);
                    }
                }
                else{
                    scene.remove(onSwitch);
                    switchControl.detach(onSwitch);
                    scene.add(offSwitch);
                    switchControl.attach(offSwitch);
                    window.clearInterval(this.timer);
                    this.timer = 0;
                }
            }
            this.getData=function(dataType){
                return errOutput;

			}

            this.draw=function () {
                if (draw3DFlag) {

                    let loadingImg = document.createElement('img');
                    loadingImg.src = 'img/loading.gif';
                    loadingImg.style.width = '64px';
                    loadingImg.style.height = '64px';
                    loadingImg.style.position = 'absolute';
                    loadingImg.style.top = this.container.offsetTop + this.container.offsetHeight / 2 - 32 + 'px';
                    loadingImg.style.left = this.container.offsetLeft + this.container.offsetWidth / 2 - 32 + 'px';
                    loadingImg.style.zIndex = '10001';
                    this.container.parentNode.appendChild(loadingImg);

                    let promiseArr = [
                        VILibrary.InnerObjects.loadModule('assets/Roundness/base.mtl', 'assets/Roundness/base.obj'),
                        VILibrary.InnerObjects.loadModule('assets/Roundness/rotator.mtl', 'assets/Roundness/rotator.obj'),
                        VILibrary.InnerObjects.loadModule('assets/Roundness/slider.mtl', 'assets/Roundness/slider.obj'),
                        VILibrary.InnerObjects.loadModule('assets/Roundness/tester.mtl', 'assets/Roundness/tester.obj'),
                        VILibrary.InnerObjects.loadModule('assets/Roundness/offSwitch.mtl', 'assets/Roundness/offSwitch.obj'),
                        VILibrary.InnerObjects.loadModule('assets/Roundness/onSwitch.mtl', 'assets/Roundness/onSwitch.obj'),
                    ];
                    Promise.all(promiseArr).then(function (objArr) {
                        base = objArr[0];
                        rotator = objArr[1];
                        slider = objArr[2];
                        tester = objArr[3];
                        offSwitch=objArr[4];
                        onSwitch=objArr[5];
                        loadingImg.style.display = 'none';
                        RoundnessDraw();
                    }).catch(e => console.log('RoundnessVI: ' + e));
                }
                else {

                    this.ctx = this.container.getContext("2d");
                    let img = new Image();
                    img.src = 'img/Roundness.png';
                    img.onload = function () {
                        _this.ctx.drawImage(img, 0, 0, _this.container.width, _this.container.height);
                    };
                }
            };
            this.draw();

			//相机、渲染、灯光、控制等初始设置
            window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame
                || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
            function RoundnessDraw () {
                scene = new THREE.Scene();

                scene.add(base,rotator,offSwitch,slider);
                slider.add(tester);
                //初始位置

                renderer = new THREE.WebGLRenderer({canvas: _this.container, antialias: true});
                renderer.setClearColor(0x6495ED);
                renderer.setSize(_this.container.clientWidth, _this.container.clientHeight);

                camera = new THREE.PerspectiveCamera(45, _this.container.clientWidth / _this.container.clientHeight, 1, 1000);
                camera.position.set(0,100,250);
                camera.lookAt(new THREE.Vector3(0, 0, 0));

                let light = new THREE.AmbientLight(0x555555);
                scene.add(light);
                let light1 = new THREE.DirectionalLight(0xffffff, 1);
                light1.position.set(4000, 4000, 4000);
                scene.add(light1);
                let light2 = new THREE.DirectionalLight(0xffffff, 1);
                light2.position.set(-4000, 4000, -4000);
                scene.add(light2);

                controls = new THREE.OrbitControls(camera, renderer.domElement);//鼠标对整个三维模型（相机）的控制
                controls.rotateSpeed = 0.8;
                controls.enableZoom = true;
                controls.zoomSpeed = 1.2;
                controls.enableDamping = true;
                let plane1 = new THREE.Mesh(new THREE.PlaneBufferGeometry(1000, 400),new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} ));

                //拖动旋转
                let plane2 = new THREE.Mesh(new THREE.PlaneBufferGeometry(1000, 400),new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} ));
                plane2.rotateY(0.5*Math.PI);

                sliderControl =new ObjectControls(camera, renderer.domElement);
                sliderControl.map = plane2;
                sliderControl.offsetUse = true;
                sliderControl.attachEvent('mouseOver', function () {
                    renderer.domElement.style.cursor = 'pointer';
                });
                sliderControl.attachEvent('mouseOut', function () {

                    renderer.domElement.style.cursor = 'auto';
                });
                sliderControl.attachEvent('dragAndDrop', onSliderDrag);
                sliderControl.attachEvent('mouseUp', function () {

                    controls.enabled = true;
                    renderer.domElement.style.cursor = 'auto';
                });

                testerControl =new ObjectControls(camera, renderer.domElement);
                testerControl.map = plane2;
                testerControl.offsetUse = true;
                testerControl.attachEvent('mouseOver', function () {
                    renderer.domElement.style.cursor = 'pointer';
                });
                testerControl.attachEvent('mouseOut', function () {

                    renderer.domElement.style.cursor = 'auto';
                });
                testerControl.attachEvent('dragAndDrop', onTesterDrag);
                testerControl.attachEvent('mouseUp', function () {

                    controls.enabled = true;
                    renderer.domElement.style.cursor = 'auto';
                });

                //开关
                switchControl = new ObjectControls(camera, renderer.domElement);
                switchControl.offsetUse = true;

                switchControl.attachEvent('mouseOver', function () {

                    renderer.domElement.style.cursor = 'pointer';
                });

                switchControl.attachEvent('mouseOut', function () {

                    renderer.domElement.style.cursor = 'auto';
                });

                switchControl.attachEvent('onclick',function () {

                    _this.toggleObserver(!_this.timer);
                });


                sliderControl.attach(slider);
                switchControl.attach(offSwitch);
                testerControl.attach(tester);

                RoundnessAnimate();
            }
            //上下移动
            function onSliderDrag() {
                controls.enabled = false;
                renderer.domElement.style.cursor = 'pointer';

                this.focused.position.x = this.previous.x;  //lock x direction
				if(tester.position.x<-0.85){if (this.focused.position.y< -1.4) {this.focused.position.y = -1.4;}}
				else {if (this.focused.position.y< -5) {this.focused.position.y = -5;}}
                if (this.focused.position.y> 15) {this.focused.position.y =15;}

                if(this.focused.position.y>=-1.5&&this.focused.position.y<=7)yOn=true;
                else yOn=false;
            }
            //左右拖动
            function onTesterDrag() {
                controls.enabled = false;
                renderer.domElement.style.cursor = 'pointer';
                this.focused.position.y = this.previous.y;  //lock x direction
				if(slider.position.y<-1.4){if (this.focused.position.x< -0.85) {this.focused.position.x = -0.85;}}
                else{if (this.focused.position.x< -6) {this.focused.position.x = -6;}}
                if (this.focused.position.x> 18) {this.focused.position.x =18;}
                if(this.focused.position.x<-5)xOn=true;
				else xOn=false;
            }
            function RoundnessAnimate() {
                window.requestAnimationFrame(RoundnessAnimate);//回调
                controls.update();
                renderer.render(scene, camera);
            }

        }
        static get cnName() {

            return '圆度误差实验';
        }

        static get defaultWidth() {

            return '550px';
        }

        static get defaultHeight() {

            return '300px';
        }
    },

    NyquistVI:class NyquistVI extends TemplateVI{

        constructor (VICanvas) {
            super(VICanvas);

            const _this = this;
            this.name = 'NyquistVI';
            this.ctx = this.container.getContext("2d");

            this.angle=0;
            let HEIGHT=this.container.height,
                WIDTH=this.container.width;
            // shorter=Math.min(HEIGHT,WIDTH);

            let e=[0],R=70,len,u1,u2;
            let exy=[];
            let uxy=[],insideR=[],outsideR=[];

            let CENTER_X=WIDTH/2,
                CENTER_Y=HEIGHT/2,
                START_ANGLE = 0, // Starting point on circle
                END_ANGLE = Math.PI*2; // End point on circle

            let /*BGColor="rgba(220,220,230,0.6)",*/
                BGColor="rgba(250,250,250,0.6)",
                BLACK= "rgba(0,0,0,1)",
                GREEN ="rgba(10,200,10,1)",
                RED="rgba(200,10,10,1)";

            this.draw=function (inputR,inputR2) {
                this.ctx.textAlign = "center";//文本对齐
                this.ctx.font="10px Times new roman";
                this.ctx.textBaseline="middle";//文字居中定位

                this.ctx.clearRect(0,0,WIDTH,HEIGHT);//清空画布

                this.ctx.fillStyle=BGColor;
                this.ctx.strokeStyle=BLACK;
                this.ctx.fillRect(0,0,WIDTH,HEIGHT);
                this.ctx.strokeRect(0,0,WIDTH,HEIGHT);

                if(len>1){
                    this.ctx.beginPath();
                    this.ctx.moveTo(10,CENTER_Y);
                    this.ctx.lineTo(WIDTH-10,CENTER_Y);
                    this.ctx.moveTo(CENTER_X,10);
                    this.ctx.lineTo(CENTER_X,HEIGHT-10);
                    this.ctx.strokeStyle=GREEN;
                    this.ctx.stroke();
                    this.ctx.closePath();

                    this.ctx.save();
                    this.ctx.translate(CENTER_X,CENTER_Y);//坐标系移至圆心
                    this.ctx.beginPath();
                    let delta=Math.PI*2/40;
                    // if(e.length>=40)e[40]=e[0];
                    this.ctx.moveTo(e[0]+R,0);
                    for(let i=1;i<=len;i++)//画当前数组的Nyquist图
                    {
                        this.ctx.rotate(delta);
                        this.ctx.lineTo(e[i]+R,0);this.ctx.stroke();
                    }
                    //封闭Nyquist图
                    if(len>=40){
                        this.ctx.lineTo(e[0]+R,0);this.ctx.stroke();
					}
                    this.ctx.closePath();
                    this.ctx.restore();

                    this.ctx.beginPath();//图注
                    this.ctx.moveTo(0.6*WIDTH,HEIGHT-10);
                    this.ctx.lineTo(0.7*WIDTH,HEIGHT-10);
                    this.ctx.fillStyle=BLACK;
                    this.ctx.fillText("极坐标图",0.8*WIDTH,HEIGHT-10);
                    this.ctx.fillText("误差放大1000倍",0.8*WIDTH,20);
                    this.ctx.stroke();
                    this.ctx.closePath();
                }//有数据输入时

                if(inputR>0){
                    this.ctx.beginPath();
                    this.ctx.strokeStyle=RED;
                    this.ctx.arc(CENTER_X+u1, CENTER_Y+u2,inputR, START_ANGLE, END_ANGLE, false);
                    this.ctx.moveTo(0.6*WIDTH,HEIGHT-25);
                    this.ctx.lineTo(0.7*WIDTH,HEIGHT-25);
                    this.ctx.stroke();
					this.ctx.closePath();
                    if(inputR2==undefined){//一个圆
                        this.ctx.fillText("最小二乘图",0.83*WIDTH,HEIGHT-25);
					}
					else{//两个圆
                        this.ctx.beginPath();
                        this.ctx.strokeStyle="#8B4513";
                        this.ctx.moveTo(CENTER_X+u1+inputR2, CENTER_Y+u2);
                        this.ctx.arc(CENTER_X+u1, CENTER_Y+u2,inputR2, START_ANGLE, END_ANGLE, false);
                        this.ctx.moveTo(0.6*WIDTH,HEIGHT-40);
                        this.ctx.lineTo(0.7*WIDTH,HEIGHT-40);
                        this.ctx.stroke();
                        this.ctx.closePath();
                        /*if(inputR<inputR2){
                            this.ctx.fillText("同心外接圆",0.83*WIDTH,HEIGHT-40);
                            this.ctx.fillText("最大内接圆",0.83*WIDTH,HEIGHT-25);
						}
						else{
                            this.ctx.fillText("同心内接圆",0.83*WIDTH,HEIGHT-40);
                            this.ctx.fillText("最小外接圆",0.83*WIDTH,HEIGHT-25);
						}*/
					}
                }
            };
            this.draw();
            this.setData = function (input){
                if (Number.isNaN(input)) {
                    console.log('NyquistVI: Input value error');
                    return;
                }
                switch (input){

				}
                e=input;
                len=e.length;
                if(len>=40){
                    for(let i=0;i<=(len-1);i++){
                    	let ex=(e[i]+R)*Math.cos(Math.PI*2/len*i);
                        let ey=(e[i]+R)*Math.sin(Math.PI*2/len*i);
                        exy[i]=[ex,ey];
                    }
                    for(let xx=-5;xx<=5;xx++){
                        for(let yy=-5;yy<=5;yy++){//遍历区域内点（圆心）
                            uxy.push([xx,yy]);
                            let distance=[];
                            for(let i=0;i<len;i++){//计算到圆上各点距离
                                distance.push(calcuDistance([xx,yy],exy[i]));
                            }
                            //院上的点距离此圆心最大最小距离
                            let minDis=Math.min.apply(Math,distance);
                            let maxDis=Math.max.apply(Math,distance);
                            insideR.push(minDis);
                            outsideR.push(maxDis)
                        }
                    }
				}
				console.log(e)
               /* console.log(e)*/
                this.draw();
            };

            this.square=function(input){
                u1=0,u2=0;
                let r0=0;
                // console.log(len);
                for (let i=0; i<=len-1;i++){
                    r0+=e[i]/len;
                    u1+=-2/len*e[i]*Math.cos(Math.PI*2/len*i);
                    u2+=-2/len*e[i]*Math.sin(Math.PI*2/len*i);
                }


                // document.getElementById("r").innerHTML=(r0+R).toFixed(4);
                let deltaR=[0];
                for (let i=0; i<=len-1;i++){//计算圆度误差
                    let dr=e[i]-(r0+u1*Math.cos(Math.PI*2/len*i)+u2*Math.sin(Math.PI*2/len*i));
                    deltaR.push(dr);
                }
                let f= Math.max.apply(Math,deltaR)-Math.min.apply(Math,deltaR);

                this.draw(r0+R);
                // console.log(r0)
				if(!input){
                    document.getElementById("u1").innerHTML=u1.toFixed(2);
                    document.getElementById("u2").innerHTML=u2.toFixed(2);
                    document.getElementById("r").innerHTML=(r0/1000+R).toFixed(4);
                    document.getElementById("f").innerHTML=f.toFixed(2);
				}
            }

            this.outside=function () {//最小外接圆
                let minR=Math.min.apply(Math,outsideR);//最小外接圆半径
                let index=outsideR.indexOf(minR);
                u1=uxy[index][0];//对应圆心坐标
                u2=uxy[index][1];
                let inR=insideR[index];//同心内接圆
                this.draw(minR,inR);
                this.ctx.fillText("同心内接圆",0.83*WIDTH,HEIGHT-40);
                this.ctx.fillText("最小外接圆",0.83*WIDTH,HEIGHT-25);
            }
            this.inside=function () {
                let maxR=Math.max.apply(Math,insideR);//最大内接圆半径
				let index=insideR.indexOf(maxR);
				u1=uxy[index][0];//对应圆心坐标
                u2=uxy[index][1];
                let outR=outsideR[index];
                this.draw(maxR,outR);
                this.ctx.fillText("同心外接圆",0.83*WIDTH,HEIGHT-40);
                this.ctx.fillText("最大内接圆",0.83*WIDTH,HEIGHT-25);
            }
            this.area=function () {
            	let x1,x2,x3,x4,y1,y2,y3,y4,ka,kb,xa,ya,xb,yb,x0,y0,ra,rb,rmax,rmin;
            	for(let i=0;i<len;i++){
            		x1=exy[i][0];
            		y1=exy[i][1];
            		for(let j=i+1;j<len;j++){
                        x2=exy[j][0];
                        y2=exy[j][1];
                        for(let m=j+1;m<len;m++){
                            x3=exy[m][0];
                            y3=exy[m][1];
                            for(let n=m+1;n<len;n++){
                                x4=exy[n][0];
                                y4=exy[n][1];
                                //计算中垂线
								xa=(x1+x3)/2;
                                xb=(x2+x4)/2;
                                ya=(y1+y3)/2;
                                yb=(y2+y4)/2;
                                ka=(x1-x3)/(y3-y1);
                                kb=(x2-x4)/(y4-y2);
                                x0=(yb-ya+ka*xa-kb*xb)/(ka-kb);
                                y0=ya+ka*(x0-xa);
                                ra=calcuDistance([x0,y0],[x1,y1]);
                                rb=calcuDistance([x0,y0],[x2,y2]);
                                if(ra>=rb){
                                	rmax=ra;
                                	rmin=rb;
								}
								else {
                                    rmax=rb;
                                    rmin=ra;
								}
								let h;
                                for(h=0;h<len;h++){//计算到圆上各点距离
                                    let dis=calcuDistance([x0,y0],exy[h]);
                                    if((dis>rmax)||(dis<rmin)) break;
                                    if(h==(len-1)) {
                                    	u1=x0;
                                    	u2=y0;
                                        console.log(rmin,rmax);
                                    	this.draw(rmin,rmax);
                                        this.ctx.fillText("同心包容圆",0.83*WIDTH,HEIGHT-40);
                                        this.ctx.fillText("同心包容圆",0.83*WIDTH,HEIGHT-25);
									}
                                }
                            }
                        }

					}
				}
            }


            function calcuDistance(p1,p2) {
                let len=Math.sqrt(Math.pow((p1[0]-p2[0]),2)+Math.pow((p1[1]-p2[1]),2));
                return len;
            }



        }
        static get cnName() {

            return 'Nyquist图';
        }

        static get defaultWidth() {

            return '550px';
        }

        static get defaultHeight() {

            return '300px';
        }
    },

    ToleranceVI:class ToleranceVI extends TemplateVI{
        constructor (VICanvas) {
            super(VICanvas);
            const _this = this;
            this.name = 'ToleranceVI';
            this.ctx = this.container.getContext("2d");


            this.ctx.font="20px Times new roman";
            this.ctx.textBaseline="middle";//文字居中定位
			this.ctx.lineWidth=1;

            let HEIGHT=this.container.height,
                WIDTH=this.container.width;
            let CENTER_X=WIDTH/2,
                CENTER_Y=HEIGHT/2;
			let holeOffset=0,
			    shaftOffset=0,
                holeTol,
				shaftTol,
                DELTAW=WIDTH/20,
				TIMES=parseInt(WIDTH/100),
				IT6=13,
				IT7=21,
				holeMark="",
				shaftMark="";
			let holeX, holeY, rectWidth=60,holeH,
                shaftX, shaftY,shaftH;

            let BGColor="rgba(240,240,255,0.6)",
                BLACK= "rgba(0,0,0,1)",
                RED="#ff6666",
				BLUE="#6699ff"

            this.draw=function () {
            	 holeTol=holeOffset>=0?IT7:-IT7;
                if(holeOffset==6) holeTol=-IT7;
            	 shaftTol=shaftOffset>0?IT6:-IT6;
            	 holeX=3*DELTAW;
            	 holeY=-holeOffset*TIMES;
            	 holeH=-holeTol*TIMES;
            	 shaftX=rectWidth+holeX+DELTAW;
            	 shaftY=-shaftOffset*TIMES;
            	 shaftH=-shaftTol*TIMES;

                this.ctx.textAlign = "center";//文本对齐
                this.ctx.clearRect(0,0,WIDTH,HEIGHT);//清空画布
                this.ctx.fillStyle=BGColor;
                this.ctx.strokeStyle=BLACK;
                this.ctx.fillRect(0,0,WIDTH,HEIGHT);//背景
                this.ctx.strokeRect(0,0,WIDTH,HEIGHT);
                this.ctx.beginPath();
                this.ctx.moveTo(DELTAW,CENTER_Y);//中心线
                this.ctx.lineTo(WIDTH-DELTAW,CENTER_Y);
                this.ctx.stroke();
                this.ctx.fillStyle=BLACK;
                this.ctx.fillText("0",DELTAW/2,CENTER_Y);
                this.ctx.fillText("+",DELTAW/2,CENTER_Y-20);
                this.ctx.fillText("-",DELTAW/2,CENTER_Y+20);
                this.ctx.font="15px Times new roman";
                this.ctx.textAlign = "left";//文本对齐
                this.ctx.fillText("轴公差带",DELTAW*17,HEIGHT-DELTAW*2.5);
                this.ctx.fillText("孔公差带",DELTAW*17,HEIGHT-DELTAW*4.5);
                this.ctx.fillStyle=BLUE;
                this.ctx.fillRect(DELTAW*15,HEIGHT-DELTAW*5,DELTAW*1.5,DELTAW);
                this.ctx.fillStyle=RED;
                this.ctx.fillRect(DELTAW*15,HEIGHT-DELTAW*3,DELTAW*1.5,DELTAW);
                this.ctx.closePath();
                this.ctx.font="20px Times new roman";
                this.ctx.textAlign = "center";//文本对齐


                this.arrow(DELTAW*2,HEIGHT-20,DELTAW*2,CENTER_Y,false,"φ20");//基准尺寸标注

                if(holeOffset||shaftOffset){
                    this.ctx.save();
                    this.ctx.translate(0,CENTER_Y);//坐标系移至Y中心
                    //前面计算的公差带是以向上为正，而canvas中以向下为正，故以下纵坐标均取负
                    this.ctx.fillStyle=BLUE;

                    this.ctx.fillRect(holeX,holeY,rectWidth,holeH) ;  //孔公差带
                    this.ctx.fillStyle=RED;
                    this.ctx.fillRect(shaftX,shaftY,rectWidth,shaftH) ;  //轴公差带
                    this.ctx.fillStyle=BLACK;
                    this.ctx.fillText(holeMark,holeX+rectWidth/2,holeY+holeH/2);
                    this.ctx.fillText(shaftMark,shaftX+rectWidth/2,shaftY+shaftH/2);
                    this.ctx.restore();
				}


            };

            this.setData = function (typ,offset){

                if (!typ) {//基孔制
					holeOffset=0;holeMark="H7"
					switch(offset){//g=7,k=2,s=35;
						case "g":shaftOffset=-7;shaftMark="g6";break;
						case "k":shaftOffset=2;shaftMark="k6";break;
						case "s":shaftOffset=35;shaftMark="s6";break;
						default:alert("offsetERR")
					}
                }
                else {//基轴制
                    shaftOffset=0;shaftMark="h6";
                    switch(offset){//g=7,k=2,s=35;
                        case "g":holeOffset=7;holeMark="G7";break;
                        case "k":holeOffset=6;holeMark="K7";break;//基本偏差代号为K,IT<=IT8,ES=-ei+△
                        case "s":holeOffset=-35;holeMark="S7";break;
                        default:alert("offsetERR")
                    }
                }
                this.draw();
            }
            this.arrow=function(x1,y1,x2,y2,doubleS,s) {//第一点，第二点，是否双向箭头，箭头文字
                this.ctx.lineWidth=1;
                this.ctx.fontsize=15;
                this.ctx.textAlign="center"
                let a=x2-x1,b=y2-y1,len=Math.sqrt(a*a+b*b),ang;
                if(a==0){if(b<0)ang=-Math.PI/2;else ang=Math.PI/2}
                ang=Math.atan(b/a);
                if(a<0){ang+=Math.PI;}


                this.ctx.save();
                this.ctx.translate(x1,y1);
                this.ctx.rotate(ang);
                this.ctx.beginPath();
                this.ctx.moveTo(0,0);//中心线
                if(doubleS){
                    this.ctx.lineTo(10,3);
                    this.ctx.lineTo(10,-3);
                    this.ctx.lineTo(0,0);
                }
                this.ctx.lineTo(len,0);  this.ctx.stroke();

                this.ctx. lineTo(len-10,-3);  this.ctx.stroke();
                this.ctx. lineTo(len-10,+3);  this.ctx.stroke();
                this.ctx. lineTo(len,0);  this.ctx.stroke();
                // this.ctx.moveTo(len/2,10);
                this.ctx.fillStyle=BGColor;
                this.ctx.clearRect((len/2-s.length*this.ctx.fontsize/4),(-10-this.ctx.fontsize/2),(s.length*this.ctx.fontsize/2),(this.ctx.fontsize));
                this.ctx.fillRect((len/2-s.length*this.ctx.fontsize/4),(-10-this.ctx.fontsize/2),(s.length*this.ctx.fontsize/2),(this.ctx.fontsize));
                this.ctx.fillStyle=BLACK;
                if(ang>=-Math.PI/2&&ang<=Math.PI/2)this.ctx.fillText(s,len/2,-10);
                else {
                    this.ctx.translate(len/2,0);
                    this.ctx.rotate(Math.PI);
                    this.ctx.fillText(s,0,10);
                }
                // this.ctx.stroke();
                this.ctx.fill();
                this.ctx.closePath();
                this.ctx.restore();
            }
            this.esei=function () {
            	this.ctx.fillStyle=BLACK;
                this.ctx.save();
                this.ctx.translate(0,CENTER_Y);
                this.ctx.textAlign = "left";//文本对齐
                this.ctx.textBaseline="middle";//文字居中定位
                if(holeOffset)this.ctx.fillText(offsetS(holeOffset),holeX+rectWidth+DELTAW/5,holeY-holeH*0.1);//孔上下偏差
                this.ctx.fillText(offsetS(holeOffset+holeTol),holeX+rectWidth+DELTAW/5,holeY+holeH*1.1);
                if(shaftOffset)this.ctx.fillText(offsetS(shaftOffset),shaftX+rectWidth+DELTAW/5,shaftY-shaftH*0.15);//轴上下偏差
                this.ctx.fillText(offsetS(shaftOffset+shaftTol),shaftX+rectWidth+DELTAW/5,shaftY+shaftH*1.15);
                this.ctx.restore();
            }
            function offsetS(n) {
                if(n>0) return "+"+n;
                else if(n<0)return n;
                else return "";
            }
            this.maxXY=function () {
                this.ctx.save();
                this.ctx.beginPath();
                this.ctx.translate(0,CENTER_Y);
                // this.ctx.textAlign = "left";//文本对齐
				let ES=holeTol>0?(holeOffset+holeTol):holeOffset;
				let EI=holeTol<0?(holeOffset+holeTol):holeOffset;
				let es=shaftTol>0?(shaftOffset+shaftTol):shaftOffset;
                let ei=shaftTol<0?(shaftOffset+shaftTol):shaftOffset;
                let s1,s2,n1=EI-es,n2=ES-ei,
					arrow1Y1,arrow1Y2,arrow2Y1,arrow2Y2,
                    arrow1X=shaftX+rectWidth+DELTAW*2.5,
                    arrow2X=arrow1X+DELTAW*2.5;
                if(n1>0){
                	s1="Xmin= +"+n1;arrow1Y1=-es*TIMES;arrow1Y2 =-EI*TIMES;
                }
                else {
                	s1="Ymax= "+n1; arrow1Y2=-es*TIMES;arrow1Y1 =-EI*TIMES;
                }
                if(n2>0){
                	s2="Xmax= +"+n2;arrow2Y1=-ei*TIMES;arrow2Y2=-ES*TIMES;
                }
                else {
                	s2="Ymin= "+n2;arrow2Y2=-ei*TIMES;arrow2Y1=-ES*TIMES;
                }
                this.ctx.font="15px Times new roman";

                this.ctx.moveTo(holeX+rectWidth+DELTAW*0.3,-EI*TIMES);
                this.ctx.lineTo(arrow1X+DELTAW*0.5,-EI*TIMES);
                this.ctx.moveTo(shaftX+rectWidth+DELTAW*0.3,-es*TIMES);
                this.ctx.lineTo(arrow1X+DELTAW*0.5,-es*TIMES);
                this.ctx.moveTo(holeX+rectWidth+DELTAW*0.3,-ES*TIMES);
                this.ctx.lineTo(arrow2X+DELTAW*0.5,-ES*TIMES);
                this.ctx.moveTo(shaftX+rectWidth+DELTAW*0.3,-ei*TIMES);
                this.ctx.lineTo(arrow2X+DELTAW*0.5,-ei*TIMES);
                // this.ctx.fill();
                this.ctx.stroke();
                this.ctx.closePath();
                this.arrow(arrow1X,arrow1Y1,arrow1X,arrow1Y2,true,s1);
                this.arrow(arrow2X,arrow2Y1,arrow2X,arrow2Y2,true,s2);

                this.ctx.restore();
            }

//调用函数
            this.draw();
        }

    },
    StraightnessEvalVI:class StraightnessEvalVI extends TemplateVI{
        constructor (VICanvas) {
            super(VICanvas);
            const _this = this;
            this.name = 'StraightnessVI';
            this.ctx = this.container.getContext("2d");
            let eChartDiv = document.getElementById('eChart-div');

            let  methodSelected,error,
				myChart,option,markLineOpt;
            let data = [], sumData = [], dataSeries=[],sum = 0.0,dataArray = [];

            setEChartData();

            this.setData = function (typ){
                methodSelected=typ;
                dataArray = [];
                option.series.markLine = {
                    data: []
                };
                myChart.setOption(option);
				/*；最小二乘法*/
                if(methodSelected==3){
                    let a,b,sumXY=0,sumX=0,sumY=0,sumX2=0;
                    for(let i=0;i<=8;i++){
                        sumX+=i;
                        sumY+=sumData[i];
                        sumXY+=i*sumData[i];
                        sumX2+=i*i;
                    }
                    b=(sumXY-1/8*sumX*sumY)/(sumX2-1/8*sumX*sumX);
                    a=1/8*(sumY-b*sumX);
                    let coords1 = [{
                        coord: [0, a],
                        symbol: 'none'
                    }, {
                        coord: [8, a+8*b],
                        symbol: 'none'
                    }];
                    let y=[],errorArray=[];
                    for(let i=0;i<=7;i++){
                    	y[i]=a+b*i
                        errorArray[i]=y[i]-sumData[i];
                    }
                    let errorMax=Math.max.apply(Math, errorArray);
                    let errorMin=Math.min.apply(Math, errorArray);
                    error=errorMax-errorMin;
                    let maxIndex=errorArray.indexOf(errorMax);
                    let minIndex=errorArray.indexOf(errorMin);
                    document.getElementById('error').innerText =errorMax.toFixed(2)+"-("+errorMin.toFixed(2)+")= "+ error.toFixed(2);
                    let coords2 = [{
                        coord: [maxIndex, y[maxIndex]],
                        symbol: 'none'
                    }, {
                        coord: [maxIndex, sumData[maxIndex]],
                        symbol: 'none'
                    }];
                    let coords3 = [{
                        coord: [minIndex, y[minIndex]],
                        symbol: 'none'
                    }, {
                        coord: [minIndex, sumData[minIndex]],
                        symbol: 'none'
                    }];
                    markLineOpt.data = [coords1,coords2,coords3];
                    option.series.markLine = markLineOpt;
                    myChart.setOption(option);
				}
            }

            function setEChartData() {/*输入数据*/
                for (let i = 0; i < 9; i++) {
                    let temp = parseFloat(document.getElementById('data' + i).innerHTML);
                    if (isNaN(temp)) {
                        alert('读数未完成，请检查实验步骤是否正确');
                        return;
                    }
                    else {
                        data.push(temp);
						sum += parseFloat(data[i]);
						sumData.push(sum);
						document.getElementById('sumData' + i).innerText = sum.toFixed(1);
                        dataSeries.push([i,sum]);
                    }

                }
                /*Y轴范围*/
                let MAX = (sumData.slice(0).sort(function (a, b) {//按大小排序
                        return a - b;
                    })[8] / 10 ).toFixed(0) * 10+10;
                let MIN = (sumData.slice(0).sort(function (a, b) {
                        return a - b;
                    })[0] / 10 ).toFixed(0) * 10-10;


                option = {
                    title: {
                        text: '直线度误差相对累加折线',
                        x: 'center',
                        y: 0
                    },
                    tooltip: {
                        trigger: 'axis',
                        formatter: '{b}: {c}'
                    },
                    toolbox: {
                        feature: {
                            myTool1: {
                                show: true,
                                title: '重绘包容线',
                                icon: 'image://img/reset.png',
                                onclick: function () {
                                    dataArray = [];
                                    option.series.markLine = {
                                        data: []
                                    };
                                    myChart.setOption(option);
                                }
                            },
                            saveAsImage: {}
                        }
                    },
                    grid: {
                        show: true
                    },
                    xAxis: {
                        type: 'value',
						interval:1,
                        name: '序号',
                        // data: ['初始','第一次', '第二次', '第三次', '第四次', '第五次', '第六次', '第七次', '第八次', '']
                    },
                    yAxis: {
                        name: '读数',
                        min: MIN,
                        max: MAX
                    },
                    series: {
                        name: '误差折线图',
                        type: 'line'
                    }
                };


                //coords3为包容线距离
                let coords1, coords2, coords3, k;
                markLineOpt = {
                    label: {
                        normal: {
                            show: false
                        }
                    },
                    tooltip: {
                        show: false
                    },
                    silent: true
                };

                // option.series.data = sumData;
                option.series.data =dataSeries;

				myChart = echarts.init(eChartDiv);
                myChart.setOption(option);
                myChart.on('click', function (params) {

                    switch (methodSelected){
                        case 0:alert('请选择评估方法');return;
						/*最小区域法*/
                        case 1:{
                            if (dataArray.length > 6)   return;
                            dataArray.push(params.dataIndex);
                            dataArray.push(params.data[1]);
                            // console.log(params.data[1],dataArray);
                            if (dataArray.length == 4) {/*两个点*/
                                if (Math.abs(dataArray[0] - dataArray[2]) == 1) {
                                    dataArray.pop();
                                    dataArray.pop();
                                    dataArray.pop();
                                    dataArray.pop();
                                    alert('选点错误！请重新选择');
                                    return;
                                }
                                k = (dataArray[3] - dataArray[1]) / (dataArray[2] - dataArray[0]);
                                let x0 = 0, x1 = 8, y0 = dataArray[1] - k * dataArray[0], y1 = dataArray[3] - k * (dataArray[2] - 8);
                                if (y0<MIN){y0=MIN;x0=dataArray[0]-(dataArray[1]-MIN)/k;}
                                if (y0>MAX){y0=MAX;x0=dataArray[0]-(dataArray[1]-MAX)/k;}
                                if (y1<MIN){y1=MIN;x1=dataArray[0]-(dataArray[1]-MIN)/k;}
                                if (y1>MAX){y1=MAX;x1=dataArray[0]-(dataArray[1]-MAX)/k;}
                                console.log(k + ', x0:' + x0 + ', x1:' + x1 + ', y0:' + y0 + ', y1:' + y1 + '\n');
                                coords1 = [{
                                    coord: [x0, y0],
                                    symbol: 'none'
                                }, {
                                    coord: [x1, y1],
                                    symbol: 'none'
                                }];
                                markLineOpt.data = [coords1];
                                option.series.markLine = markLineOpt;
                                myChart.setOption(option);/*第一条包容线*/
                            }
                            if (dataArray.length == 6) {
                                if ((dataArray[4] <= dataArray[2] && dataArray[4] <= dataArray[0]) || (dataArray[4] >= dataArray[2] && dataArray[4] >= dataArray[0])) {
                                    dataArray.pop();
                                    dataArray.pop();
                                    alert('选点错误！请重新选择');/*X不在前两点之间*/
                                    return;
                                }
                                let x3 = 0, x4 = 8, x5 = dataArray[4],
                                    y3 = dataArray[5] - k * dataArray[4],
                                    y4 = dataArray[5] - k * (dataArray[4] - 8),//只能减不能加，加的时候加数会缩小为0.001
                                    y5 = dataArray[3] - k * (dataArray[2] - dataArray[4]);
                                error = y5 - dataArray[5];
                                if (y3<MIN){y3=MIN;x3=dataArray[4]-(dataArray[5]-MIN)/k;}
                                if (y3>MAX){y3=MAX;x3=dataArray[4]-(dataArray[5]-MAX)/k;}
                                if (y4<MIN){y4=MIN;x4=dataArray[4]-(dataArray[5]-MIN)/k;}
                                if (y4>MAX){y4=MAX;x4=dataArray[4]-(dataArray[5]-MAX)/k;}
                                document.getElementById('error').innerText = error.toFixed(2);
//                console.log('x3:' + x3 + ', x4:' + x4 + ', y3:' + y3 + ', y4:' + y4 + ', error:' + error + '\n');
                                coords2 = [{
                                    coord: [x3, y3],
                                    symbol: 'none'
                                }, {
                                    coord: [x4, y4],
                                    symbol: 'none'
                                }];

                                coords3 = [{
                                    coord: [dataArray[4], dataArray[5]],
                                    symbol: 'none'
                                },
                                    {
                                        coord: [x5, y5],
                                        symbol: 'none'
                                    }];
                                markLineOpt.data = [coords1, coords2, coords3];
                                option.series.markLine = markLineOpt;
                                myChart.setOption(option);
                                let y=[],yy=[],product;
                                for(let i=0;i<=8;i++){
                                    y[i]=dataArray[1]-k*(dataArray[0]-i);//第一条包容线
                                    yy[i]=dataArray[5]-k*(dataArray[4]-i);//第二条包容线
                                    product=(y[i]-sumData[i])*(yy[i]-sumData[i]);
                                    if(product>0){
                                        alert('未包容所有数据点！请重绘包容线');
                                        document.getElementById('error').innerText = "ERROR";
                                        return;
                                    }
                                }
                            }
                            break;
                        }
						/*；两端点法*/
                        case 2:{
                            if (dataArray.length >=4)   return;
                            dataArray.push(params.dataIndex);
                            dataArray.push(params.data[1]);
                            // console.log(dataArray);
                            if (dataArray.length ==2){
                                if(dataArray[0]!=0&&dataArray[0]!=8){
                                    dataArray.pop();
                                    dataArray.pop();
                                    alert('选点错误！请重新选择');
                                    return;
                                }
                            }
                            if (dataArray.length == 4) {//第二个点
                                if (Math.abs(dataArray[0]-dataArray[2])==8) {//首尾两点
                                    coords1 = [{
                                        coord: [dataArray[0], dataArray[1]],
                                        symbol: 'none'
                                    }, {
                                        coord: [dataArray[2],dataArray[3]],
                                        symbol: 'none'
                                    }];
									/*计算最大偏差并绘制偏差线*/
                                    k = (dataArray[3] - dataArray[1]) / (dataArray[2] - dataArray[0]);
                                    let y=[],errorArray=[];
                                    for(let i=0;i<=8;i++){
                                        y[i]=dataArray[1]-k*(dataArray[0]-i);//dataArray[]只能减不能加
                                        errorArray[i]=y[i]-sumData[i];
                                    }
                                    let errorMax=Math.max.apply(Math, errorArray);
                                    let errorMin=Math.min.apply(Math, errorArray);
                                    error=errorMax-errorMin;
                                    let maxIndex=errorArray.indexOf(errorMax);
                                    let minIndex=errorArray.indexOf(errorMin);
                                    document.getElementById('error').innerText =errorMax.toFixed(2)+"-("+errorMin.toFixed(2)+")= "+ error.toFixed(2);
                                    coords2 = [{
                                        coord: [maxIndex, y[maxIndex]],
                                        symbol: 'none'
                                    }, {
                                        coord: [maxIndex, sumData[maxIndex]],
                                        symbol: 'none'
                                    }];
                                    coords3 = [{
                                        coord: [minIndex, y[minIndex]],
                                        symbol: 'none'
                                    }, {
                                        coord: [minIndex, sumData[minIndex]],
                                        symbol: 'none'
                                    }];
                                    markLineOpt.data = [coords1, coords2, coords3];
                                    option.series.markLine = markLineOpt;
                                    myChart.setOption(option);


                                }
                                else {
                                    dataArray.pop();
                                    dataArray.pop();
                                    dataArray.pop();
                                    dataArray.pop();
                                    alert('选点错误！请重新选择');
                                    return;
                                }

                            }
                            break;
                        }
                        case 3:{

                        	break;
                        }
                        default:alert('评估方法错误');return;
                    }
                });
            }

        }
	},
    DimChainVI:class DimChainVI extends TemplateVI {
        constructor(VICanvas) {
            super(VICanvas);
            const _this = this;
            this.name = 'DimChainVI';


            this.ctx = this.container.getContext("2d");
            this.ctx.font = "20px Times new roman";
            this.ctx.textBaseline = "middle";//文字居中定位
            this.ctx.lineWidth = 1;

            let HEIGHT = this.container.height,
                WIDTH = this.container.width;
            let /*CENTER_X = WIDTH / 2,*/
                CENTER_Y = HEIGHT / 2;
            let deltaY=20,deltaX=20;
            let step=1;

            let BGColor="rgba(240,240,255,0.6)",
                BLACK= "rgba(0,0,0,1)",
                GREEN="green",
                RED="#ff6666";

            this.setData=function(i){
                step=i;
                _this.draw();
			}


            this.draw=function () {
                this.ctx.clearRect(0,0,WIDTH,HEIGHT);
                this.ctx.save();
                this.ctx.translate(0, CENTER_Y);

                this.ctx.beginPath();
                this.ctx.strokeStyle = BLACK;
                this.ctx.lineWidth = 2;
                this.ctx.moveTo(deltaX, -deltaY * 2);
                this.ctx.lineTo(deltaX, deltaY * 2);
                this.ctx.moveTo(deltaX * 3, -deltaY * 2);
                this.ctx.lineTo(deltaX * 3, 0);
                this.ctx.moveTo(deltaX * 4.5, -deltaY * 2);
                this.ctx.lineTo(deltaX * 4.5, 0);
                this.ctx.moveTo(deltaX * 12, -deltaY * 2);
                this.ctx.lineTo(deltaX * 12, 0);
                this.ctx.moveTo(deltaX * 16, -deltaY * 2);
                this.ctx.lineTo(deltaX * 16, deltaY * 2);
                this.ctx.stroke();
                this.ctx.lineWidth = 1;



            	switch (step){
					case 1:
						this.ctx.moveTo(deltaX,-deltaY);
                        this.ctx.lineTo(deltaX*16,-deltaY);
                        this.ctx.moveTo(deltaX,deltaY);
                        this.ctx.lineTo(deltaX*16,deltaY);
                        this.ctx.stroke();
                        break;
					case 2:
                        this.arrow(deltaX,-deltaY,deltaX*3,-deltaY,false,"");
                        this.arrow(deltaX*3,-deltaY,deltaX*4.5,-deltaY,false,"");
                        this.arrow(deltaX*4.5,-deltaY,deltaX*12,-deltaY,false,"");
                        this.arrow(deltaX*12,-deltaY,deltaX*16,-deltaY,false,"");
                        this.arrow(deltaX*16,deltaY,deltaX*1,deltaY,false,"");
                        /*this.arrow(0,0,deltaX*5,0,false,"0");
                        this.arrow(0,0,deltaX*5,deltaX*5,false,"1");
                        this.arrow(0,0,0,deltaX*5,false,"2");
                        this.arrow(0,0,-deltaX*5,deltaX*5,false,"3");
                        this.arrow(0,0,-deltaX*5,0,false,"4");
                        this.arrow(0,0,-deltaX*5,-deltaX*5,false,"5");
                        this.arrow(0,0,0,-deltaX*5,false,"6");
                        this.arrow(0,0,deltaX*5,-deltaX*5,false,"7");*/
                        break;
					case 3:
						this.ctx.lineWidth=3;
                        this.arrow(deltaX*3,-deltaY,deltaX*4.5,-deltaY,false,"A0");
                        this.ctx.lineWidth=1;
                        this.arrow(deltaX,-deltaY,deltaX*3,-deltaY,false,"A4");
                        this.ctx.clearRect(deltaX*4.5+1,-deltaY-2,10,4);
                        this.arrow(deltaX*4.5,-deltaY,deltaX*12,-deltaY,false,"A1");
                        this.arrow(deltaX*12,-deltaY,deltaX*16,-deltaY,false,"A2");
                        this.arrow(deltaX*16,deltaY,deltaX*1,deltaY,false,"A3");
                        break;
					case 4:
                        this.ctx.lineWidth=3;
                        this.arrow(deltaX*3,-deltaY,deltaX*4.5,-deltaY,false,"A0");
                        this.ctx.lineWidth=1;
                        this.ctx.strokeStyle=GREEN;
                        this.ctx.fillStyle=GREEN;
                        this.arrow(deltaX,-deltaY,deltaX*3,-deltaY,false,"A4");
                        this.ctx.clearRect(deltaX*4.5+1,-deltaY-2,10,4);
                        this.arrow(deltaX*4.5,-deltaY,deltaX*12,-deltaY,false,"A1");
                        this.arrow(deltaX*12,-deltaY,deltaX*16,-deltaY,false,"A2");
                        this.ctx.strokeStyle=RED;
                        this.ctx.fillStyle=RED;
                        this.arrow(deltaX*16,deltaY,deltaX*1,deltaY,false,"A3");
                        this.ctx.strokeStyle=BLACK;this.ctx.fillStyle=BLACK;

                        break;
					default:return;
				}

            	this.ctx.closePath();
                this.ctx.restore();
			}
            this.draw();
            this.arrow=function(x1,y1,x2,y2,doubleS,s) {//第一点，第二点，是否双向箭头，箭头文字

                this.ctx.fontsize=8;
                this.ctx.textAlign="center";
                let a=x2-x1,b=y2-y1,len=Math.sqrt(a*a+b*b),ang;
                if(a==0){if(b<0)ang=-Math.PI/2;else ang=Math.PI/2}
                ang=Math.atan(b/a);
                if(a<0){ang+=Math.PI;}

                this.ctx.save();
                this.ctx.translate(x1,y1);
                this.ctx.rotate(ang);
                this.ctx.beginPath();
                this.ctx.moveTo(0,0);//中心线
                if(doubleS){
                    this.ctx.lineTo(10,3);
                    this.ctx.lineTo(10,-3);
                    this.ctx.lineTo(0,0);
                }
                this.ctx.lineTo(len,0);  this.ctx.stroke();

                this.ctx. lineTo(len-10,-3);  this.ctx.stroke();
                this.ctx. lineTo(len-10,+3);  this.ctx.stroke();
                this.ctx. lineTo(len,0);  this.ctx.stroke();
                this.ctx.fill();
                this.ctx.fillStyle=BGColor;
                this.ctx.clearRect((len/2-s.length*this.ctx.fontsize/4),(-10-this.ctx.fontsize/2),(s.length*this.ctx.fontsize/2),(this.ctx.fontsize));
                this.ctx.fillRect((len/2-s.length*this.ctx.fontsize/4),(-10-this.ctx.fontsize/2),(s.length*this.ctx.fontsize/2),(this.ctx.fontsize));
                this.ctx.fillStyle=BLACK;
                this.ctx.lineWidth=1;
                if(ang>=-Math.PI/2&&ang<=Math.PI/2)this.ctx.fillText(s,len/2,-20);
                else {
                    this.ctx.translate(len/2,0);
                    this.ctx.rotate(Math.PI);
                    this.ctx.fillText(s,0,20);
				}
                this.ctx.closePath();
                this.ctx.restore();
            }
        }
    },
    RoundnessEvalVI:class RoundnessEvalVI extends TemplateVI {
        constructor (VICanvas) {
            super(VICanvas);

            const _this = this;
            this.name = 'NyquistVI';
            this.ctx = this.container.getContext("2d");

            this.angle=0;
            let HEIGHT=this.container.height,
                WIDTH=this.container.width;
            // shorter=Math.min(HEIGHT,WIDTH);

            let r=[0];

            let CENTER_X=WIDTH/2,
                CENTER_Y=HEIGHT/2,
                START_ANGLE = 0, // Starting point on circle
                END_ANGLE = Math.PI*2; // End point on circle

            let BGColor="rgba(200,200,200,0.6)",
                BLACK= "rgba(0,0,0,1)",
                GREEN ="rgba(10,200,10,1)",
                RED="rgba(200,10,10,1)";

            this.draw=function (inputR) {
                this.ctx.textAlign = "center";//文本对齐
                this.ctx.font="10px Times new roman";
                this.ctx.textBaseline="middle";//文字居中定位

                this.ctx.clearRect(0,0,WIDTH,HEIGHT);//清空画布

                this.ctx.fillStyle=BGColor;
                this.ctx.strokeStyle=BLACK;
                this.ctx.fillRect(0,0,WIDTH,HEIGHT);
                this.ctx.strokeRect(0,0,WIDTH,HEIGHT);

                if(r.length>1){
                    this.ctx.beginPath();
                    this.ctx.moveTo(10,CENTER_Y);
                    this.ctx.lineTo(WIDTH-10,CENTER_Y);
                    this.ctx.moveTo(CENTER_X,10);
                    this.ctx.lineTo(CENTER_X,HEIGHT-10);
                    this.ctx.strokeStyle=GREEN;
                    this.ctx.stroke();
                    this.ctx.closePath();


                    this.ctx.save();
                    this.ctx.translate(CENTER_X,CENTER_Y);//坐标系移至圆心
                    this.ctx.beginPath();
                    let len=r.length,
                        delta=Math.PI*2/40;
                    if(r.length>=40)r[40]=r[0];
                    this.ctx.moveTo(r[0],0);
                    for(let i=1;i<=len;i++)//画当前数组的Nyquist图
                    {
                        this.ctx.rotate(delta);
                        this.ctx.lineTo(r[i],0);this.ctx.stroke();
                    }
                    this.ctx.closePath();
                    this.ctx.restore();

                    this.ctx.beginPath();//图注
                    this.ctx.moveTo(0.6*WIDTH,HEIGHT-25);
                    this.ctx.lineTo(0.7*WIDTH,HEIGHT-25);
                    this.ctx.fillStyle=BLACK;
                    this.ctx.fillText("极坐标图",0.8*WIDTH,HEIGHT-25);
                    this.ctx.fillText("误差放大1000倍",0.8*WIDTH,20);

                    this.ctx.stroke();
                    this.ctx.closePath();
                }//有数据输入时

                if(inputR>0){
                    this.ctx.beginPath();
                    this.ctx.strokeStyle=RED;
                    this.ctx.arc(CENTER_X, CENTER_Y,inputR, START_ANGLE, END_ANGLE, false);
                    this.ctx.moveTo(0.6*WIDTH,HEIGHT-10);
                    this.ctx.lineTo(0.7*WIDTH,HEIGHT-10);
                    this.ctx.fillText("最小二乘图",0.83*WIDTH,HEIGHT-10);

                    this.ctx.stroke();
                    this.ctx.closePath();
                }
            };

            this.setData = function (input){
                if (Number.isNaN(input)) {
                    // console.log('NyquistVI: Input value error');
                    return;
                }
                r=input;
                // console.log(r)
                this.draw();
            };
            let u1=0,u2=0,r0=0,R=70,len,deltaR=[0];
            this.square=function(){
            	len=r.length;
            	len--;
            	// console.log(len);
                for (let i=0; i<=len-1;i++){
                    r0+=r[i]/len;
                    u1+=-2/len*r[i]*Math.cos(Math.PI*2/len*i);
                    u2+=-2/len*r[i]*Math.sin(Math.PI*2/len*i);
                }
                r0+=r0+R;
                document.getElementById("u1").innerHTML=u1.toFixed(2);
                document.getElementById("u2").innerHTML=u2.toFixed(2);
                document.getElementById("r").innerHTML=r0.toFixed(2);
                for (let i=0; i<=len-2;i++){
                    let dr=r[i]-(r0+u1*Math.cos(Math.PI*2/len*i)+u2*Math.sin(Math.PI*2/len*i));
                    deltaR.push(dr);
                }
                let f= Math.max.apply(Math,deltaR)-Math.min.apply(Math,deltaR);
                document.getElementById("f").innerHTML=f.toFixed(2);
                this.draw(r0);
                // console.log(r0)
			}
            this.draw();
        }
    },

    RobotVI:class RobotVI extends TemplateVI {
        constructor(VICanvas, draw3DFlag) {
            super(VICanvas);
            const _this = this;
            this.name = 'RobotVI';

            let camera, scene, renderer,controls,
                base,link1,link2,link3,link4,link5,link6,
                base_1,link1_1,link2_1,link3_1,link4_1,link5_1,link6_1,
                diff=[0],T,
                instructions=[],
                instrIndex;/*标识一个命令执行完成*/

            this.setData = function (input){
                instructions=input;
                instrIndex=0;
                _this.jointsControl(input[0]);

            }

            _this.jointsControl=function (inputAng) {
                let ang=inputAng;
                let onPos1=false,onPos2=false,onPos3=false,onPos4=false,onPos5=false,onPos6=false;
                let step=5/180*Math.PI;
                _this.timer = window.setInterval(function () {
                    diff[1]=ang[0]-link1.rotation.y;
                    diff[2]=ang[1]-link2.rotation.z;
                    diff[3]=ang[2]-link3.rotation.z;
                    diff[4]=ang[3]-link4.rotation.x;
                    diff[5]=ang[4]-link5.rotation.z;
                    diff[6]=ang[5]-link6.rotation.x;
                    if(Math.abs(diff[1])<step){link1.rotation.y=ang[0];onPos1=true;}
                    else {link1.rotation.y=(diff[1]>0?(link1.rotation.y+step):(link1.rotation.y-step));}
                    if(Math.abs(diff[2])<step){link2.rotation.z=ang[1];onPos2=true;}
                    else {link2.rotation.z=(diff[2]>0?(link2.rotation.z+step):(link2.rotation.z-step));}
                    if(Math.abs(diff[3])<step){link3.rotation.z=ang[2];onPos3=true;}
                    else {link3.rotation.z=(diff[3]>0?(link3.rotation.z+step):(link3.rotation.z-step));}
                    if(Math.abs(diff[4])<step){link4.rotation.x=ang[3];onPos4=true;}
                    else {link4.rotation.x=(diff[4]>0?(link4.rotation.x+step):(link4.rotation.x-step));}
                    if(Math.abs(diff[5])<step){link5.rotation.z=ang[4];onPos5=true;}
                    else {link5.rotation.z=(diff[5]>0?(link5.rotation.z+step):(link5.rotation.z-step));}
                    if(Math.abs(diff[6])<step){link6.rotation.x=ang[5];onPos6=true;}
                    else {link6.rotation.x=(diff[6]>0?(link6.rotation.x+step):(link6.rotation.x-step));}
					/*if(diff[1]>0){if(link1.rotation.y<ang[0])link1.rotation.y+=step;/!*else link1.rotation.y=ang[0];*!/}
					 if(diff[2]>0){if(link2.rotation.z<ang[1])link2.rotation.z+=step;/!*else link2.rotation.z=ang[1];*!/}
					 if(diff[3]>0){if(link3.rotation.z<ang[2])link3.rotation.z+=step;/!*else link3.rotation.z=ang[2];*!/}
					 if(diff[4]>0){if(link4.rotation.x<ang[3])link4.rotation.x+=step;/!*else link4.rotation.x=ang[3];*!/}
					 if(diff[5]>0){if(link5.rotation.z<ang[4])link5.rotation.z+=step;/!*else link5.rotation.z=ang[4];*!/}
					 if(diff[6]>0){if(link6.rotation.x<ang[5])link6.rotation.x+=step;/!*else link6.rotation.x=ang[5];*!/}

					 if(diff[1]<0){if(link1.rotation.y>ang[0])link1.rotation.y-=step;/!*else link1.rotation.y=ang[0];*!/}
					 if(diff[2]<0){if(link2.rotation.z>ang[1])link2.rotation.z-=step;/!*else link2.rotation.z=ang[1];*!/}
					 if(diff[3]<0){if(link3.rotation.z>ang[2])link3.rotation.z-=step;/!*else link3.rotation.z=ang[2];*!/}
					 if(diff[4]<0){if(link4.rotation.x>ang[3])link4.rotation.x-=step;/!*else link4.rotation.x=ang[3];*!/}
					 if(diff[5]<0){if(link5.rotation.z>ang[4])link5.rotation.z-=step;/!*else link5.rotation.z=ang[4];*!/}
					 if(diff[6]<0){if(link6.rotation.x>ang[5])link6.rotation.x-=step;/!*else link6.rotation.x=ang[5];*!/}
					 if(Math.abs(ang[0]-link1.rotation.y)<step){link1.rotation.y=ang[0];onPos1=true;}
					 if(Math.abs(ang[1]-link2.rotation.z)<step){link2.rotation.z=ang[1];onPos2=true;}
					 if(Math.abs(ang[2]-link3.rotation.z)<step){link3.rotation.z=ang[2];onPos3=true;}
					 if(Math.abs(ang[3]-link4.rotation.x)<step){link4.rotation.x=ang[3];onPos4=true;}
					 if(Math.abs(ang[4]-link5.rotation.z)<step){link5.rotation.z=ang[4];onPos5=true;}
					 if(Math.abs(ang[5]-link6.rotation.x)<step){link6.rotation.x=ang[5];onPos6=true;}*/

                    let linkAng=[link1.rotation.y,link2.rotation.z,link3.rotation.z,link4.rotation.x,link5.rotation.z,link6.rotation.x]

                    link1_1.rotation.y=link1.rotation.y;
                    link2_1.rotation.z=link2.rotation.z;
                    link3_1.rotation.z=link3.rotation.z;
                    link4_1.rotation.x=link4.rotation.x;
                    link5_1.rotation.z=link5.rotation.z;
                    link6_1.rotation.x=link6.rotation.x;

                    if(onPos1&&onPos2&&onPos3&&onPos4&&onPos5&&onPos6){
                        window.clearInterval(_this.timer);
                        _this.timer=0;
                        kinematicsEquation(linkAng);//每转动一角度计算当前末端位姿
                        for(let i=0;i<=5;i++){
                            if(i==1||i==2||i==4){
                                document.getElementById("angInput"+(i)).value=-ang[i]*180/Math.PI;
                                document.getElementById("angTxt"+(i)).value=-ang[i]*180/Math.PI;
                            }
                            else {
                                document.getElementById("angInput"+(i)).value=(ang[i]*180/Math.PI).toFixed(1);
                                document.getElementById("angTxt"+(i)).value=(ang[i]*180/Math.PI).toFixed(4);
                            }

                        }

                        if(instrIndex<(instructions.length-1)){
                            instrIndex++;
                            _this.jointsControl(instructions[instrIndex]);
                            // setTimeout("_this.jointsControl(instructions[instrIndex])",50);
                        }
                        else return;

                    }

                }, 50);
				/* while (!(onPos1&&onPos2&&onPos3&&onPos4&&onPos5&&onPos6)){
				 zzindex++;
				 }*/


            }

            this.draw=function () {
                if (draw3DFlag) {

                    let loadingImg = document.createElement('img');
                    loadingImg.src = 'img/loading.gif';
                    loadingImg.style.width = '64px';
                    loadingImg.style.height = '64px';
                    loadingImg.style.position = 'absolute';
                    loadingImg.style.top = this.container.offsetTop + this.container.offsetHeight / 2 - 32 + 'px';
                    loadingImg.style.left = this.container.offsetLeft + this.container.offsetWidth / 2 - 32 + 'px';
                    loadingImg.style.zIndex = '10001';
                    this.container.parentNode.appendChild(loadingImg);

                    let promiseArr = [
                        VILibrary.InnerObjects.loadModule('assets/ABB/base.mtl', 'assets/ABB/base.obj'),
                        VILibrary.InnerObjects.loadModule('assets/ABB/link1.mtl', 'assets/ABB/link1.obj'),
                        VILibrary.InnerObjects.loadModule('assets/ABB/link2.mtl', 'assets/ABB/link2.obj'),
                        VILibrary.InnerObjects.loadModule('assets/ABB/link3.mtl', 'assets/ABB/link3.obj'),
                        VILibrary.InnerObjects.loadModule('assets/ABB/link4.mtl', 'assets/ABB/link4.obj'),
                        VILibrary.InnerObjects.loadModule('assets/ABB/link5.mtl', 'assets/ABB/link5.obj'),
                        VILibrary.InnerObjects.loadModule('assets/ABB/link6.mtl', 'assets/ABB/link6.obj'),
                        VILibrary.InnerObjects.loadModule('assets/ABB/base.mtl', 'assets/ABB/base.obj'),
                        VILibrary.InnerObjects.loadModule('assets/ABB/link1.mtl', 'assets/ABB/link1.obj'),
                        VILibrary.InnerObjects.loadModule('assets/ABB/link2.mtl', 'assets/ABB/link2.obj'),
                        VILibrary.InnerObjects.loadModule('assets/ABB/link3.mtl', 'assets/ABB/link3.obj'),
                        VILibrary.InnerObjects.loadModule('assets/ABB/link4.mtl', 'assets/ABB/link4.obj'),
                        VILibrary.InnerObjects.loadModule('assets/ABB/link5.mtl', 'assets/ABB/link5.obj'),
                        VILibrary.InnerObjects.loadModule('assets/ABB/link6.mtl', 'assets/ABB/link6.obj'),

                    ];
                    Promise.all(promiseArr).then(function (objArr) {
                        base = objArr[0];
                        link1 = objArr[1];
                        link2 = objArr[2];
                        link3 = objArr[3];
                        link4=objArr[4];
                        link5=objArr[5];
                        link6=objArr[6];

                        base_1 = objArr[7];
                        link1_1 = objArr[8];
                        link2_1 = objArr[9];
                        link3_1 = objArr[10];
                        link4_1=objArr[11];
                        link5_1=objArr[12];
                        link6_1=objArr[13];
                        loadingImg.style.display = 'none';
                        RobotDraw();
                    }).catch(e => console.log('RobotVI: ' + e));
                }
                else {

                    this.ctx = this.container.getContext("2d");
                    let img = new Image();
                    img.src = 'img/Robot.png';
                    img.onload = function () {
                        _this.ctx.drawImage(img, 0, 0, _this.container.width, _this.container.height);
                    };
                }
            };
            this.draw();

            //相机、渲染、灯光、控制等初始设置
            window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame
                || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
            function RobotDraw () {
                scene = new THREE.Scene();

                scene.add(base,base_1);
                base.add(link1);
                link1.add(link2);
                link2.add(link3);
                link3.add(link4);
                link4.add(link5);
                link5.add(link6);

                base_1.add(link1_1);
                link1_1.add(link2_1);
                link2_1.add(link3_1);
                link3_1.add(link4_1);
                link4_1.add(link5_1);
                link5_1.add(link6_1);

                base.position.set(-500,-500,0);
                link2.position.set(0,290,0);
                link3.position.set(0,270,0);
                link4.position.set(302,70,0);
                link5.position.set(0,0,0);
                link6.position.set(59,0,0);

                base_1.position.set(500,-500,0);
                link2_1.position.set(0,290,0);
                link3_1.position.set(0,270,0);
                link4_1.position.set(302,70,0);
                link5_1.position.set(0,0,0);
                link6_1.position.set(59,0,0);
				/*link3.position.set(0,560,0);
				 link4.position.set(302,630,0);
				 link5.position.set(302,630,0);
				 link6.position.set(361,630,0);*/
                renderer = new THREE.WebGLRenderer({canvas: _this.container, antialias: true});
                renderer.setClearColor(0x6495ED);
                renderer.setSize(_this.container.clientWidth, _this.container.clientHeight);

                camera = new THREE.PerspectiveCamera(45, _this.container.clientWidth / _this.container.clientHeight, 1, 5000);
                camera.position.set(0,500,2000);
                camera.lookAt(new THREE.Vector3(0, 300, 0));

                let light = new THREE.AmbientLight(0x555555);
                scene.add(light);
                let light1 = new THREE.DirectionalLight(0xffffff, 1);
                light1.position.set(4000, 4000, 4000);
                scene.add(light1);
                let light2 = new THREE.DirectionalLight(0xffffff, 1);
                light2.position.set(-4000, 4000, -4000);
                scene.add(light2);

                controls = new THREE.OrbitControls(camera, renderer.domElement);//鼠标对整个三维模型（相机）的控制
                controls.rotateSpeed = 0.8;
                controls.enableZoom = true;
                controls.zoomSpeed = 1.2;
                controls.enableDamping = true;

                RobotAnimate();
            }
            function RobotAnimate() {
                window.requestAnimationFrame(RobotAnimate);//回调

                controls.update();
                renderer.render(scene, camera);
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
                let t=[];
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
                document.getElementById("posZ").value=(T[2][3]).toFixed(1);//？？强制Z轴向上？？？？
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

            return '机器人webGL';
        }

        static get defaultWidth() {

            return '550px';
        }

        static get defaultHeight() {

            return '300px';
        }
    },
    InstructionVI:class InstructionVI extends TemplateVI {
        constructor(VICanvas, draw3DFlag) {
            super(VICanvas);
            const _this = this;
            this.name = 'InstructionVI';
            let pANG=[],currentANG=[];
            let instrAll,//输入指令
                instrSpr;//指令划分后
            this.getData=function (dataType) {
                return pANG;
            }
            this.setData=function (input) {
                currentANG=input;
            }
            this.toggleObserver = function (flag) {
                if (flag) {
                    // instrParse();
                    pANG=[];
                    instrAll=document.getElementById("instrInput").value.toString();//获取字符串
                    let replacedStr=instrAll.replace(/[\n]/g,"");//去掉回车
                    instrSpr=replacedStr.split(";");//以分号分割字符串
                    let instrLen=instrSpr.length;
                    console.log(instrAll,replacedStr,instrSpr);
                    //逐条指令解析
                    for(let i=0;i<instrLen;i++){
                        let instrI=instrSpr[i];
                        if(instrI.replace(/[\s]/g,"")=="")continue;
                        let lengthI=instrI.length;
                        let moveIndex=instrI.indexOf("move");
                        if(moveIndex==-1){
                            errInfo();return;
                        }
                        else {
                            let pIndex=instrI.indexOf("p");
                            let pNum=instrI.slice(pIndex+1,lengthI);//从p到结束之间的部分
                            let n = Number(pNum);//p后面的数字
                            if(isNaN(n)||(n>=pPos.length)){layer.open({
                                title: '系统提示'
                                ,content: '未知示教点'
                            });;return;}
                            else {
                                switch(instrI[moveIndex+4]){
                                    case "J":pANG.push(pAngle[n]);break;
                                    case "L":;break;
                                    case "C": ; break;
                                    default: errInfo();return;
                                }
                            }
                        }

                    }
                    if (_this.dataLine){
                        VILibrary.InnerObjects.dataUpdater(_this.dataLine);
                    }
                }
                else{

                }
            };
            function errInfo() {
                layer.open({
                    title: '系统提示'
                    ,content: '输入指令不符合语法规则'
                });
            }
            function moveJ(){

			}
			/*//指令解析
			 function  instrParse() {

			 }*/
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
    //机器人算法脚本的集合
    Instruction_1VI:class Instruction_1VI extends TemplateVI {
        constructor(VICanvas, draw3DFlag,robNumber) {
            super(VICanvas);
            const _this = this;
            this.name = 'Instruction_1VI';
            let currentANG,targetANG;
            /*if(robNumber=="yumiL"||robNumber=="yumiR"){
                var currentPOS;
			}*/
            let currentPOS;
            let targetANG2;//专为IRB360提供
            let pPos=[],qJoint=[];
            let instrIndex,
                instrSplit,//指令划分后
				moveType,//当前执行的运动类型
				Range,OMEGA,
				T_BASE,//基座矩阵，除YUMI外，基座矩阵都包含在D_H参数里
				A,D,ALPHA,THETA;//D-H参数
			let Pre='';//前缀，区分双臂的左右臂
			let Suf='',Suf0='';//后缀，区分双臂的左右臂

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
                    currentPOS=[1317.22,0,1725,-Math.PI,Math.PI/3,-Math.PI];
					break;
				case "a910":
                    A=[0,0,200,250,0,0];
                    D=[0,220,0,0,0,0];//d[3]<=0;
                    ALPHA=[0,0,0,Math.PI,0,0];
                    THETA=[0,0,0,0,0,0];
                    currentANG=[0,0,0,0],targetANG=[0,0,0,0];
                    Range=[[-140,140],[-160,150],[-180*180/Math.PI,0],[-400,400]];
                    OMEGA=[415,659,1000*180/Math.PI,2400];
                    currentPOS=[450,0,220,Math.PI,0,0];
                    break;
				case "a360":
                    A=[0,0,0,0,0,0];
                    D=[0,0,0,0,0,0];//d[3]<=0;
                    ALPHA=[0,0,0,0,0,0];
                    THETA=[0,0,0,0,0,0];
                    currentANG=[0,0,0],targetANG=[0,0,0],targetANG2=[0,0,0,2.0800204983301263,2.0800204983301263,2.0800204983301263,0,1,0,0,1,0,0,1,0,0,0,-972.5];//theta,theta2,n0,n1,n2,x,y,z
                    Range=[[-55,110],[-55,110],[-55,110]];
                    OMEGA=[400,400,400];
                    currentPOS=[0,0,-972.5,0,0,Math.PI];
                    break;
                case "a360-1":
                    A=[0,0,0,0,0,0];
                    D=[0,0,0,0,0,0];//d[3]<=0;
                    ALPHA=[0,0,0,0,0,0];
                    THETA=[0,0,0,0,0,0];
                    currentANG=[0,0,0,0],targetANG=[0,0,0,0],targetANG2=[0,0,0,0,2.2539601816,2.2539601816,2.2539601816,0,1,0,0,1,0,0,1,0,0,0,-894.46];//theta,theta2,n0,n1,n2,x,y,z
                    Range=[[-55,110],[-55,110],[-55,110],[-110,110]];
                    OMEGA=[400,400,400,400];
                    currentPOS=[0,0,-937.46,0,0,Math.PI];
                    break;
                case "epson":
                    A=[0,0,0,0,0,0];
                    D=[0,0,0,0,0,0];//d[3]<=0;
                    ALPHA=[0,0,0,0,0,0];
                    THETA=[0,0,0,0,0,0];
                    // THETA=[92,80,227];
                    currentANG=[92,80,227],targetANG=[92,80,227];//theta,theta2,n0,n1,n2,x,y,z
                    Range=[[30,470],[55,500],[0,300]];
                    OMEGA=[1000*180/Math,1000*180/Math,1000*180/Math];
                    currentPOS=[190.5,4.5,372,Math.PI/2,0,0];
                    break;
				case 'yumiL':case 'yumiR':
					A=[0,0,30,30,40.5,40.5,27,27,0];
                    D=[0,103.2,0,251.5,0,265,0,36,0];
                    ALPHA=[0,0,-Math.PI/2,-Math.PI/2,Math.PI/2,Math.PI/2,Math.PI/2,Math.PI/2,0];
                    THETA=[0,Math.PI,Math.PI,0,Math.PI/2,Math.PI,Math.PI,Math.PI,0];
                    // THETA=[0,0,Math.PI,0,Math.PI/2,Math.PI,Math.PI,0,-Math.PI/2];
                    Range=[[-168.5,168.5],[-143.5,43.5],[-168.5,168.5],[-123.5,80],[-290,290],[-88,138],[-229,229]];
                    OMEGA=[180,180,180,180,400,400,400];
                    if(robNumber=='yumiL') {
                        T_BASE=[
                            [0.5714,0.1066,0.8138,51.11],
                            [-0.6190,0.7071,0.3420,71.48],
                            [-0.5389,-0.6991,0.4699,413.51],
                            [0,0,0,1]
                        ];
                        currentPOS=[-9.58, 182.61, 198.63,  -3.13005, -1.11061,-0.26968];
                        currentANG=[0,2.26893,2.35619,-0.5236,0,-0.69813,0];
                        targetANG=[0,2.26893,2.35619,-0.5236,0,-0.69813,0];
                        Pre='L_';
                        Suf='_L'
						Suf0="L"
					}
					else{
                        T_BASE=[
                            [0.5714,-0.1064,0.8138,51.1100],
							[0.6190,0.7070,-0.3421,-71.4800],
                            [-0.5389,0.6992,0.4698,413.5100],
							[0,0,0,1.0000]
						];
                        currentPOS=[-9.58, -182.61, 198.63, 3.13005 , -1.11061,0.26968];
                        currentANG=[0,2.26893,-2.35619,-0.5236,0,-0.69813,0];
                        targetANG=[0,2.26893,-2.35619,-0.5236,0,-0.69813,0];
                        Pre="R_";
                        Suf="_R"
                        Suf0="R"
					}
                    break;
				case "a120":default:
					A=[0,0,0,270,70,0,0,0];//不加tool最后一个为0
					D=[290,0,0,0,302,0,0,72];//不加tool最后一个为72
					ALPHA=[0,0,-Math.PI/2,0,-Math.PI/2,Math.PI/2,-Math.PI/2,0];
                	THETA=[0,0,-Math.PI/2,0,0,0,0,Math.PI];
                	currentANG=[0,0,0,0,Math.PI/6,0],targetANG=[0,0,0,0,Math.PI/6,0];
                	Range=[[-165,165],[-110,110],[-90,70],[-160,160],[-120,120],[-400,400]];
                	OMEGA=[250,250,250,420,590,600];
                	currentPOS=[364.35,0,594,-Math.PI,Math.PI/3,-Math.PI];
                	let lasdjsikdj=1111;
            }
            const baseA=A.concat(),baseD=D.concat(),baseTHETA=THETA.concat();
			if(robNumber!="epson")Range=math.multiply(Range,Math.PI/180);
            this.getData=function (dataType) {//根据dataType区分发送数据给谁
            	if(dataType==1)return (robNumber=="a360"||robNumber=="a360-1")?targetANG2:targetANG;//发送数据给robot的X3DOM模型，所发送的数据为关节变量
            	else if(dataType==2)return [ToolFlag,ToolDO];//发送数据给TOOL，所发送的数据为[加载工具标志，夹具状态]
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

            //划分指令条
            function Split(str) {
                // let str= document.getElementById(idName).value.toString();
                let arr=(str.replace(/\r|\n|\s|°/g,'')).split(";");//剔除所有换行回车和空格，并以分号分割
                let newArr=[];//用于存储不为''的元素
                for(let value of arr){
                    if(''!= value) {newArr.push(value);}
                }
                return newArr;
            }

            //输入示教点。指令
            this.toggleObserver = function (str_points,str_cmd,stFlag) {
                    // instrParse();
				if(stFlag)singleStepFlag=true;//单步执行指令。用于远程控制
				else singleStepFlag=false;
				let pPoints=Split(str_points);//划分指令条
				pPos=[],qJoint=[];
				for(let p of pPoints){
					let pNum=p.match(/p\d+/i);
					if(pNum==null){//匹配不到位置型P,匹配关节型q
                        let qNum=p.match(/q\d+/);
                        if(qNum==null){
                            errInfo(-1,p);
                            return;
						}
                        qNum=parseInt(qNum[0].replace(/q/g,''));
                        if(isNaN(qNum)){
                            errInfo(-1,p);
                            return;
                        }
                        if(qJoint[qNum]!=undefined){
                            errInfo(-2,p);
                            return;
                        }
                        p=p.match(/\[.*]/)[0].replace(/°|\[|]/g,'').split(',');//获取[]中间的内容并去掉[],以逗号分隔内容
                        for(let i=0;i<p.length;i++){
                            if(p[i]!=''){
                            	if(robNumber=='epson'||(robNumber=='a910'&&i==2)){
                                    p[i]=parseFloat(p[i])
								}
								else {
                                    p[i]=parseFloat(p[i])/180*Math.PI;//角度，需要转换为弧度
								}

                            }
                        }
                        qJoint[qNum]=p;//添加到关节型示教点数组
					}
					else {
                        pNum=parseInt(pNum[0].replace(/p/g,''));
                        if(isNaN(pNum)){
                            errInfo(-1,p);
                            return;
                        }
                        if(pPos[pNum]!=undefined){
                            errInfo(-2,p);
                            return;
                        }
                        p=p.match(/\[.*]/)[0].replace(/°|\[|]/g,'').split(',');//获取[]中间的内容并去掉[],以逗号分隔内容
                        for(let i=0;i<p.length;i++){
                            if(p[i]!=''){
                                p[i]=i<3?parseFloat(p[i]):(parseFloat(p[i])/180*Math.PI);//前三个数为坐标；后三个数为角度，需要转换为弧度
                            }
                        }
                        pPos[pNum]=p;//添加到位置型示教点数组
					}
				}
				executiveFlag=true;
				instrIndex=0;
				let instrAll=str_cmd;
				// let instrAll=document.getElementById("instrInput").value.toString();//输入指令,获取字符串
				let replacedStr=instrAll.replace(/[\n]/g,"");//去掉回车
				instrSplit=replacedStr.split(";");//以分号分割字符串
				let points="";
				if(robNumber=='a360'||robNumber=='a360-1')points+=currentPOS[1]+" "+currentPOS[2]+" "+currentPOS[0];
				else points+=currentPOS[0]+" "+currentPOS[2]+" "+(-currentPOS[1]);
				document.getElementById("Robot__LineSet_points"+Suf).setAttribute('point',points);
				document.getElementById("Robot__LineSet_index"+Suf).setAttribute('coordIndex','0');
				_this.instrCompiling(); //逐条指令解析
            };
            function errInfo(errorType,errInstr) {

            	switch (errorType){
					case -1:
                        errorType='示教点格式错误:';
                        break;
					case -2:
                        errorType='重复定义示教点:';
                        break;
					case 1:
						errorType='未知指令类型:';
						break;
					case 2:
                        errorType='示教点错误:';
                        break;
					case 3:
						errorType='速度设置错误:';
						break;
                    case 4:
                        errorType='未知IO对象:';
                        break;
					default:
                        errorType='指令语法错误:';
                        break;
				}
                layer.open({
                    title: '系统提示'
                    ,content: errorType+errInstr
                });
                executiveFlag=false;
            }

            //指令解析
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
                    let moveIndex=instrI.search(/move/i);

                    //IO指令
                    if(moveIndex==-1){
                        if(instrI.search(/Reset/i)>=0){
                            _this.setIO(false);
                        }
                        else if(instrI.search(/Set/i)>=0){
                            _this.setIO(true);
                        }
                        else {errInfo(1,instrI);return;}
                    }
                    //运动指令
                    else {
                        /*let pIndex=instrI.indexOf("p");
                        let pNum=instrI.slice(pIndex+1,lengthI);//从p到结束之间的部分*/

						let isAbsj=(instrI.search(/moveabsj/i)!=-1);//区分是否是moveAbsJ，moveAbsJ的示教点时pJoint类型，其他的为pPos
						let pNum=isAbsj?instrI.match(/q\d+/gi):instrI.match(/p\d+/gi);//匹配该命令中“p数字”或‘q数字’的部分
						if(pNum==null){errInfo(2,instrI);return;}//匹配不到示教点
						let n1 =isAbsj?Number(pNum[0].replace(/q/i,"")):Number(pNum[0].replace(/p/,""));//p后面的数字
						if(isNaN(n1)||isAbsj?(qJoint[n1]==undefined):(pPos[n1]==undefined)){errInfo(2,instrI);return;}
						let vNum=instrI.match(/v\d+/i);
						if(vNum==null){errInfo(3,instrI);return;}
						let m=Number(vNum[0].replace(/v/i,""))//v后面的数字
						if(isNaN(m)||m<=0){errInfo(3,instrI);return;}
						if(isAbsj){
                            moveType=instrI[moveIndex+4];
                            let instrAng;
                            instrAng=qJoint[n1];
                            if(instrAng.length==7){
                                instrAng[1]=-instrAng[1];
                                instrAng[3]=-instrAng[3];
                                instrAng[5]=-instrAng[5]
							}
                            
                            _this.moveJ(instrAng,m);
						}
						else {
                            moveType=instrI[moveIndex+4];
                            let instrPos,lastPos;
                            let instrAng;
                            switch(moveType){
                                case "J":case "j":
                                instrAng=inverseKinematics(pPos[n1]);
                                if(instrAng==0){
                                    alert("超出工作空间或靠近奇异点！");
                                    moveType='';executiveFlag=false;instrSplit=[];
                                    return;
                                }
                                _this.moveJ(instrAng,m);
                                break;
                                case "L":case "l":
                                let LPos=pPos[n1].concat();
                                _this.moveL(LPos,m);
                                break;
                                case "C":case "c":
                                if(pNum[1]==undefined){errInfo(2,instrI);return;}
                                let n2 = Number(pNum[1].replace(/p/,""));//第二个p后面的数字
                                if(isNaN(n2)||(n2>=pPos.length)||pPos[n2]==undefined){errInfo(2,instrI);return;}
                                let CPos1=pPos[n1].concat();
                                let CPos2=pPos[n2].concat();
                                _this.moveC(CPos1,CPos2,m);
                                break;
                                default: errInfo(1,instrI);return;
                            }
						}

                    }
                }
            }
            //四元数方向插补,计算输出每个插补点的方向欧拉角
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
            //关节运动插补，各个关节匀速转动，同时到达目标位姿。input为目标点的关节变量，v为运动速度（每隔50ms输出一次插补点的位置和姿态，下同）
            this.moveJ=function(input,v){
            	moveType="J";
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
                    let x=parseFloat(document.getElementById(Pre+"posX").value),
                        y=parseFloat(document.getElementById(Pre+"posY").value),
                        z=parseFloat(document.getElementById(Pre+"posZ").value);
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
            //直线插补，以线速度v匀速到达末端位姿input1
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
                // let current=math.multiply(-1,currentPOS);
                // let diff=math.add(instructPos, current);
                // let maxDiff=Math.max.apply(Math,math.abs(diff));
                let x,y,z,alpha,beta,gamma,tPos;
                this.timer = window.setInterval(function () {
                    if(k+1>=N){//最后一步
                        window.clearInterval(_this.timer);
                        _this.timer=null;
                        tPos=instructPos.concat();
                        x=tPos[0],y=tPos[1],z=tPos[2];
                    }
					else {
                            x=lastPos[0]+step[0],
                            y=lastPos[1]+step[1],
                            z=lastPos[2]+step[2];
                        tPos=[x,y,z,Ept[k][0],Ept[k][1],Ept[k][2]];
                        lastPos=tPos;
                    }
                    /*if(executiveFlag){//若当前执行控制指令，将当前点添加至轨迹线，并更新页面上的关节角度
                        currentPOS=tPos.concat();
                        let point=document.getElementById("Robot__LineSet_points"+Suf).getAttribute('point');
                        if(robNumber=='a360'||robNumber=='a360-1')point+=" "+y+" "+z+" "+x;
                        else point+=" "+x+" "+z+" "+(-y);
                        document.getElementById("Robot__LineSet_points"+Suf).setAttribute('point',point);
                        let point_Index=document.getElementById("Robot__LineSet_index"+Suf).getAttribute('coordIndex');
                        let last_Index=parseInt(point_Index.match(/\d+$/))+1;
                        point_Index=point_Index+' '+last_Index;
                        document.getElementById("Robot__LineSet_index"+Suf).setAttribute('coordIndex',point_Index);
                    }*/
                    let tAng=inverseKinematics(tPos);
					if(tAng==0){
						window.clearInterval(_this.timer);
                        _this.timer=null;
						alert("超出工作空间或靠近奇异点！ ");
                        moveType='';executiveFlag=false;instrSplit=[];
						return;
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


            //圆弧插补，以线速度v沿圆弧轨迹到达末端位姿input2（由当前点、轨迹上的一点input1,目标点input2，三点确定圆弧）
            this.moveC=function (input1,input2,input3) {
                moveType="C";
            	let F=input3;//速度
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
               let Pc=[xc,yc,zc],P0=[x0,y0,z0],P1=[x1,y1,z1],P2=[x2,y2,z2];
               //插补算法  局部坐标系 林威
				let Pc0=math.subtract(P0,Pc),P01=math.subtract(P1,P0),P12=math.subtract(P2,P1);
				let vx=math.multiply(Pc0,1/math.norm(Pc0));
				let vz=math.multiply(math.cross(P01,P12),1/math.norm(math.cross(P01,P12)));
				let vy=math.cross(vz,vx);
				let TR=[
					[vx[0],vy[0],vz[0],xc],
                    [vx[1],vy[1],vz[1],yc],
                    [vx[2],vy[2],vz[2],zc],
                    [0,0,0,1]
				];
                //插补算法 叶伯生
                let u,v,w,u1,v1,w1;
				u=(y1-y0)*(z2-z1)-(z1-z0)*(y2-y1);
                v=(z1-z0)*(x2-x1)-(x1-x0)*(z2-z1);
                w=(x1-x0)*(y2-y1)-(y1-y0)*(x2-x1);
                u1=(y0-yc)*(z2-z0)-(z0-zc)*(y2-y0);
                v1=(z0-zc)*(x2-x0)-(x0-xc)*(z2-z0);
                w1=(x0-xc)*(y2-y0)-(y0-yc)*(x2-x0);
                let G=R/Math.sqrt(R*R+F*T*T),
					// delta=Math.asin(F*T/R),
                    delta=F*T/R,
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
                    	//局部坐标系 林威
                    	let p=[R*Math.cos(delta*i), R*Math.sin(delta*i), 0, 1]//在局部坐标系中的坐标
						let tp=math.multiply(TR,p);
                        tPos=[tp[0],tp[1],tp[2],Ept[i][0],Ept[i][1],Ept[i][2]];
                       /* //叶伯生
                        m[i]=v*(Z[i]-zc)-w*(Y[i]-yc);
                        n[i]=w*(X[i]-xc)-u*(Z[i]-zc);
                        l[i]=u*(Y[i]-yc)-v*(X[i]-xc);
                        X[i+1]=xc+G*(X[i]+E*m[i]-xc);
                        Y[i+1]=yc+G*(Y[i]+E*n[i]-yc);
                        Z[i+1]=zc+G*(Z[i]+E*l[i\]-zc);
                        //
                        tPos=[X[i+1],Y[i+1],Z[i+1],Ept[i][0],Ept[i][1],Ept[i][2]];*/
                        tAng=inverseKinematics(tPos);
                        if(tAng==0){window.clearInterval(_this.timer);
                            _this.timer=null;
                            alert("超出工作空间或靠近奇异点！");
                            moveType='';executiveFlag=false;instrSplit=[];
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
            //切换工具时调用此函数，修改最末端的DH参数。input值对应的工具：0-无工具；1-普通夹具；2-跟实际机器人上一致的夹具；3-画笔（焊枪）；4-gripper；5：马克笔。
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
                            case "a360":
                                A_add[len-1]+=34;
                                D_add[len-1]+=115;
                                THETA_add[len - 1] = Math.PI/2;
                                THETA_add[len - 2] = -Math.PI/2;
                                break;
                            case "a360-1":
                                A_add[len-1]+=34;
                                D_add[len-1]+=115;
                                THETA_add[len - 1] = Math.PI/2;
                                THETA_add[len - 2] = -Math.PI/2;
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
                                THETA_add[len - 1] += Math.PI/4;
                                //ALPHA_add[len - 1] = -Math.PI/4;
                                break;
                            default:
                                break;
                        }
                        $('#setDO').enabled=false;
                        break;
                    case 4:
                        switch (robNumber) {
                            case "yumiL":case "yumiR":
                                // A_add[len - 1] += 50;
                                D_add[len - 1] += 115;
                              /*  THETA_add[len - 2] -= Math.PI/4;
                                //D_add[2] += 35.355339;
                                THETA_add[len - 1] += Math.PI/4;*/
                                //ALPHA_add[len - 1] = -Math.PI/4;
                                break;
                            default:
                                break;
                        }
                        $('#setDO').enabled=true;
                        break;
					case 5:
                        D_add[len - 1] += 147.5;
                        $('#setDO').enabled=false;
                        break;
					default:console.log('tool error');return;
                }
                A=math.add(baseA,A_add);
                D=math.add(baseD,D_add);
                THETA=math.add(baseTHETA,THETA_add);
                kinematicsEquation(currentANG);
			}
            //数字输出信号，用于抓紧、松开夹具。0松开，1夹紧。
            this.setIO=function (input) {
            	ToolDO=input;
            	if(_this.dataLine){VILibrary.InnerObjects.dataUpdater(this.dataLine);}
            	if(input){
                    switch (ToolFlag) {
                        case 1:case 4:
                            var trans = document.getElementById('Robot__box'+Suf0).getFieldValue('translation');
                            let boxPos=(robNumber=='a360'||robNumber=='a360-1')?[trans.z,trans.x,trans.y]:[trans.x,-trans.z,trans.y];
                            for(var i=0;i<3;i++){
                                if(Math.abs(parseFloat(boxPos[i])-currentPOS[i])>10)break;
                                if(i==2)LoadFlag=true;
                            }
                            break;
                        case 2:
                            var i=0,j=0;
                            for(i=1;i<7;i++) {
                                var trans = document.getElementById('Robot__gongjian'+i).getFieldValue('translation');
                                let gongjianPos=(robNumber=='a360'||robNumber=='a360-1')?[trans.z,trans.x,trans.y]:[trans.x,-trans.z,trans.y];
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
					document.getElementById(Pre+"setDO").innerText='1';
				}
				else {
            		LoadFlag=false;
                    document.getElementById(Pre+"setDO").innerText='0';
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


            //运动学正解
            function kinematicsEquation(input,flag)  {//第二个参数指定是否仅用于计算
                let theta = input.concat();
                theta.unshift(0);
                theta.push(0);
                let x,y,z,EulerZ,EulerY,EulerX;
                //并联型
                let theta2=[],n=[];
				if(robNumber=='a360'||robNumber=='a360-1'){
                    // let R=200,r=45,L1=350,L2=800;
                    // let psi=[0,0,Math.PI/3*2,Math.PI/3*4];
                    let R,r,L1,L2;
					switch (robNumber){
						case 'a360':
                            R=200,r=45,L1=235,L2=800;
							break;
                        case 'a360-1':
                            R=200,r=45,L2=800;
                        	L1=350;
                            break;
					}
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
                    let len=THETA.length;
					EulerX=3.1415926,EulerY=0,EulerZ=-math.add(theta[4],THETA[len-2]);//EulerZ?????
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
                    /*if(ToolFlag){
                        z-=115;
                        y+=34;
                    }*/
                    if(ToolFlag){
                        let alpha=ALPHA.concat();
                        let a=A.concat();
                        let d=D.concat();
                        let theta3=THETA[len-1];
                        /*if(theta[4])theta3=math.add(theta[4],THETA[len-1]);//实际角度→计算角度
                        elsetheta3=THETA[len-1];*/
                        // theta3=theta[4];
                    	let T1=pos2T([x,y,z,EulerX,EulerY,EulerZ]);
                    	let Ttool=[
                            [math.cos(theta3),
                                -math.sin(theta3),
                                0,
                                a[5]
                            ],
                            [math.sin(theta3)*math.cos(alpha[5]),
                                math.cos(theta3)*math.cos(alpha[5]),
                                -math.sin(alpha[5]),
                                -d[5]*math.sin(alpha[5])
                            ],
                            [
                                math.sin(theta3)*math.sin(alpha[5]),
                                math.cos(theta3)*math.sin(alpha[5]),
                                math.cos(alpha[5]),
                                d[5]*math.cos(alpha[5])
                            ],
                            [0,0,0,1]
                        ]
						let T=math.multiply(T1,Ttool);
                    	let pos=T2pos(T);
                        x=pos[0];y=pos[1];z=pos[2],EulerX=pos[3],EulerY=pos[4],EulerZ=pos[5];
					}
                    if(robNumber== 'a360-1')z-=43;
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

                    let t=[],T;
                    if(robNumber=="a910"){
                        d[3]=-theta[3];
                        theta[3]=0;
                    }
                    // else {
                    let len=a.length;
                    theta=math.add(theta,THETA);//实际角度→计算角度
                    for(let i=0;i<len;i++)
                    {
                    	if(i==0&&(robNumber=='yumiL'||robNumber=='yumiR')){
                    		t[0]=T_BASE.concat();
						}
						else{
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
                    }
                   /* T=t[len-1];
                    for(let i=len-2;i>=0;i--){
                        T=math.multiply(t[i],T)
                    }*/
                   T=t[0];
                    for(let i=1;i<=len-1;i++){
                        T=math.multiply(T,t[i])
                    }
                    // }
                    for(let i=0;i<=3;i++){
                        for(let j=0;j<=3;j++){
                            T[i][j]= parseFloat((T[i][j]).toFixed(4));
                        }
                    }
                    let pos=T2pos(T);
                    x=pos[0];y=pos[1];z=pos[2],EulerX=pos[3],EulerY=pos[4],EulerZ=pos[5];
				}
                
                if(flag){
                    let pos=[x,y,z,EulerX,EulerY,EulerZ];
                    return pos;//若仅用于计算目标点，不再执行后面代码
                }
                document.getElementById(Pre+"posX").value=x.toFixed(2);
                document.getElementById(Pre+"posY").value=y.toFixed(2);
                document.getElementById(Pre+"posZ").value=z.toFixed(2);
                document.getElementById(Pre+"eulerX").value=(EulerX*180/Math.PI).toFixed(2);
                document.getElementById(Pre+"eulerY").value=(EulerY*180/Math.PI).toFixed(2);
                document.getElementById(Pre+"eulerZ").value=(EulerZ*180/Math.PI).toFixed(2);
                currentPOS=[x,y,z,EulerX,EulerY,EulerZ];
                currentANG=targetANG.concat();
                if(executiveFlag||(moveType!='J')){
                    for(let i=0;i<targetANG.length;i++){
                        let a;
                        if(robNumber=="a910"&&i==2||robNumber=="epson")a=(targetANG[i]).toFixed(2);
                        else if((robNumber=='yumiL'||robNumber=='yumiR')&&(i==1||i==3||i==5))a=-(targetANG[i]*180/Math.PI).toFixed(2);
                        else a=(targetANG[i]*180/Math.PI).toFixed(2);
                        document.getElementById(Pre+"angInput"+(i)).value=a;
                        document.getElementById(Pre+"angTxt"+(i)).value=a;
                    }
				}
                if(executiveFlag){//若当前执行控制指令，将当前点添加至轨迹线，并更新页面上的关节角度
                    let point=document.getElementById("Robot__LineSet_points"+Suf).getAttribute('point');
                    if(robNumber=='a360'||robNumber=='a360-1')point+=" "+y+" "+z+" "+x;
                    else point+=" "+x+" "+z+" "+(-y);
                    document.getElementById("Robot__LineSet_points"+Suf).setAttribute('point',point);
					let point_Index=document.getElementById("Robot__LineSet_index"+Suf).getAttribute('coordIndex');
					let last_Index=parseInt(point_Index.match(/\d+$/))+1;
                    point_Index=point_Index+' '+last_Index;
                    document.getElementById("Robot__LineSet_index"+Suf).setAttribute('coordIndex',point_Index);
				}
				//若夹持工件，工件坐标与末端坐标保持一致
				if(LoadFlag&&(!flag)){
                    switch (ToolFlag) {
                        case 1:case 4:
                            var trans = document.getElementById('Robot__box'+Suf0).getFieldValue('translation');
                            if(robNumber=='a360'||robNumber=='a360-1'){
                                trans.x=currentPOS[1];
                                trans.y=currentPOS[2];
                                trans.z=currentPOS[0];
                            }
                            else {
                                trans.x=currentPOS[0];
                                trans.y=currentPOS[2];
                                trans.z=-currentPOS[1];
                            }
                            document.getElementById('Robot__box'+Suf0).setFieldValue('translation',trans);
                            break;
                        case 2:
                            var trans = document.getElementById('Robot__gongjian'+gongjianIndex).getFieldValue('translation');
                            if(robNumber=='a360'||robNumber=='a360-1'){
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
           /* this.fk=function (i1) {
                // targetANG=
                let a=inverseKinematics(i1);
                console.log(currentPOS)
            }*/
            //运动学反解
            function inverseKinematics(input) {
                let a=A.concat();a.shift();//a[i-1]
                let d=D.concat();//d[i]
                let theta,resultAng=[];
                let x=input[0],
                    y=input[1],
                    z=input[2],
                    EulerX=input[3],
                    EulerY=input[4],
                    EulerZ=input[5];
                let R=pos2T(input);
                if(robNumber=="a910"){
                	let Tt=[[1,0,0,-a[a.length-1]],[0,1,0,0],[0,0,1,-d[d.length-1]],[0,0,0,1]];
                	let T=math.multiply(R,Tt);
                    let nx=T[0][0],ny=T[1][0],nz=T[2][0],
						px=T[0][3],py=T[1][3],pz=T[2][3];
                    // let nx=ca*cb,ny=sa*cb,nz=-sb;
                    theta=[[],[]];
                    let r=Math.sqrt(px*px+py*py);
                    if(r==0)return 0;
					let	AA=(px*px+py*py+a[1]*a[1]-a[2]*a[2])/(2*a[1]*r),
						phi=Math.atan(px/py);
                    /*if(AA>1)AA=1;
                    else if(AA<-1)AA=-1;*/
                    if(AA>1||AA<-1)return 0;
                    theta[0][0]=Math.atan(AA/Math.sqrt(1-AA*AA))-phi;
                    theta[1][0]=Math.atan(AA/(-Math.sqrt(1-AA*AA)))-phi;
                    for(let i=0;i<2;i++){
                    	let tmp=(r*r-a[1]*a[1]-a[2]*a[2])/(2*a[1]*a[2]);
                    	/*if(tmp>1)tmp=1;
                    	else if(tmp<-1)tmp=-1;*/
                        // let tmp=(r*Math.sin(theta[i][0]+phi)-a[1])/a[2];
                        if(tmp>1||tmp<-1)theta[i][1]=NaN;
                        else theta[i][1]=Math.acos(tmp);//薛宁
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
                else if(robNumber=='a360'||robNumber=='a360-1'){
                    z=z+274;
                    if(robNumber== 'a360-1')z+=43;
                    let alpha=ALPHA.concat();
                    if(ToolFlag){
                       /* z+=115;
                        y-=34;*/
                        a.unshift(0);
                        let len=THETA.length;
                        let theta3=THETA[len-1];
                        let T=pos2T([x,y,z,EulerX,EulerY,EulerZ]);
                        let Ttool=[
                            [math.cos(theta3),
                                -math.sin(theta3),
                                0,
                                a[5]
                            ],
                            [math.sin(theta3)*math.cos(alpha[5]),
                                math.cos(theta3)*math.cos(alpha[5]),
                                -math.sin(alpha[5]),
                                -d[5]*math.sin(alpha[5])
                            ],
                            [
                                math.sin(theta3)*math.sin(alpha[5]),
                                math.cos(theta3)*math.sin(alpha[5]),
                                math.cos(alpha[5]),
                                d[5]*math.cos(alpha[5])
                            ],
                            [0,0,0,1]
                        ]
						let T1=math.multiply(T,math.inv(Ttool));
                        let pos=T2pos(T1);
                        x=pos[0], y=pos[1], z=pos[2],
						EulerX=pos[3],
						EulerY=pos[4],
						EulerZ=pos[5];
                    }
                	let R=200,r=45,l=[0,235,800];
                    switch (robNumber){
                        case 'a360':
                            l=[0,235,800];
                            break;
                        case 'a360-1':
                            l=[0,350,800];
                            break;
                    }
                    theta=[[],[],[],[]];
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
                                if(theta[3][i]>=Range[2][0]&&theta[3][i]<=Range[2][1]){
                                    if(robNumber=='a360-1'){
                                        resultAng.push([theta[1][i],theta[2][j],theta[3][k],-EulerZ-THETA[THETA.length-2]]);
                                    }
                                    else resultAng.push([theta[1][i],theta[2][j],theta[3][k]]);
                                }
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
                else if(robNumber=='yumiL'||robNumber=='yumiR'){
                    /*let T0_s=math.inv(T_BASE,);//math.inv()矩阵求逆
                    let Tt_6=[[1,0,0,-a[7]],[0,1,0,0],[0,0,1,-d[8]],[0,0,0,1]];
                    let T=math.multiply(math.multiply(T0_s,R),Tt_6);//目标位姿的T,去掉基座和工具
                    let x=currentPOS[0],
                        y=currentPOS[1],
                        z=currentPOS[2],
                        gamma=currentPOS[3],
                        beta=currentPOS[4],
                        alpha=currentPOS[5];
                    let ca=Math.cos(alpha),sa=Math.sin(alpha),
                        cb=Math.cos(beta),sb=Math.sin(beta),
                        cy=Math.cos(gamma),sy=Math.sin(gamma);
                    let R0=[[ca*cb,ca*sb*sy-sa*cy,ca*sb*cy+sa*sy,x],[sa*cb,sa*sb*sy+ca*cy,sa*sb*cy-ca*sy,y],[-sb,cb*sy,cb*cy,z],[0,0,0,1]];
                    let T0=math.multiply(math.multiply(T0_s,R0),Tt_6);//当前位姿的T0,去掉基座和工具
                    resultAng[0]=yumiIK(T,T0);*/
                    resultAng[0]=yumiIK(input);
                }
				else {
                    let t6=[
                        [math.cos(THETA[7]),
                            -math.sin(THETA[7]),
                            0,
                            a[6]
                        ],
                        [math.sin(THETA[7])*math.cos(ALPHA[7]),
                            math.cos(THETA[7])*math.cos(ALPHA[7]),
                            -math.sin(ALPHA[7]),
                            -d[7]*math.sin(ALPHA[7])
                        ],
                        [
                            math.sin(THETA[7])*math.sin(ALPHA[7]),
                            math.cos(THETA[7])*math.sin(ALPHA[7]),
                            math.cos(ALPHA[7]),
                            d[7]*math.cos(ALPHA[7])
                        ],
                        [0,0,0,1],
                    ]
                    let T0_s=[[1,0,0,0],[0,1,0,0],[0,0,1,-d[0]],[0,0,0,1]];
                    let Tt_6=math.inv(t6);
                    // let Tt_6=[[-1,0,0,a[6]],[0,-1,0,0],[0,0,1,-d[7]],[0,0,0,1]];
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

                if(resultAng.length==0&&resultAng[0]==undefined){return 0}
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
            function pos2T(input) {
                let x=input[0],
                    y=input[1],
                    z=input[2],
                    gamma=input[3],
                    beta=input[4],
                    alpha=input[5];
                let ca=Math.cos(alpha),sa=Math.sin(alpha),
                    cb=Math.cos(beta),sb=Math.sin(beta),
                    cy=Math.cos(gamma),sy=Math.sin(gamma);
                let T=[[ca*cb,ca*sb*sy-sa*cy,ca*sb*cy+sa*sy,x],[sa*cb,sa*sb*sy+ca*cy,sa*sb*cy-ca*sy,y],[-sb,cb*sy,cb*cy,z],[0,0,0,1]];
                return T;
            }
            function T2pos(T) {
                let cosBeta=Math.sqrt(Math.pow((T[0][0]),2)+Math.pow(T[1][0],2));
                //计算三个欧拉角
				let EulerX,EulerY,EulerZ;
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
                return [T[0][3],T[1][3],T[2][3],EulerX,EulerY,EulerZ];
            }
            function pos2T_without_basetool(T){
                let a=A.concat();a.shift();//a[i-1]
                let d=D.concat();//d[i]
                let T0_s=math.inv(T_BASE);//math.inv()矩阵求逆
                let Tt_6=[[1,0,0,-a[7]],[0,1,0,0],[0,0,1,-d[8]],[0,0,0,1]];
                let x=T[0],
                    y=T[1],
                    z=T[2],
                    gamma=T[3],
                    beta=T[4],
                    alpha=T[5];
                let ca=Math.cos(alpha),sa=Math.sin(alpha),
                    cb=Math.cos(beta),sb=Math.sin(beta),
                    cy=Math.cos(gamma),sy=Math.sin(gamma);
                let R0=[[ca*cb,ca*sb*sy-sa*cy,ca*sb*cy+sa*sy,x],[sa*cb,sa*sb*sy+ca*cy,sa*sb*cy-ca*sy,y],[-sb,cb*sy,cb*cy,z],[0,0,0,1]];
                let T0=math.multiply(math.multiply(T0_s,R0),Tt_6);//当前位姿的T0,去掉基座和工具
				return T0;
			}
            /*function yumiIK(targetT,currentT) {
                let target_pos=T2pos(targetT);
                let current_pos=T2pos(currentT);*/
            function yumiIK(targetP) {
                let target_pos=T2pos(pos2T_without_basetool(targetP));
                let current_pos;
            	let theta=currentANG.concat();
                /*DH参数*/
                let alpha=ALPHA.concat();
                let a=A.concat();
                let d=D.concat();
                /*let err=math.add(target_pos,math.multiply(-1,current_pos));
                let norm=math.norm(err);
                let err_max=Math.max.apply(null,err);
                let err_min=Math.max.apply(null,err);
                if(norm<=1)return theta;*/
                let max_times=10000;
                let times;
                for(times=0;times<=max_times;times++){
                	/*实际角度->计算角度*/
					theta.push(0);theta.unshift(0);
                    theta=math.add(theta,THETA);
                    let t=[];let currentT=[];
                    for(let i=1;i<alpha.length-1;i++){
                        t[i-1]=[
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
                            [0,0,0,1],]
                    };
                    let Tn=[];//Tn[i]表示T：n~7
                    let JT=[];//机器人TJ的转置(TJ为微分变换法得到的基于末端的雅各比矩阵,见P59~61)
                    for(let i=6;i>=0;i--) {
                        if (i == 6) Tn[6] = t[6];
                        else {
                            Tn[i] = math.multiply(t[i], Tn[i + 1]);
                        }
                        if (i) {
                        let n = [Tn[i][0][0], Tn[i][1][0], Tn[i][2][0]];
                        let o = [Tn[i][0][1], Tn[i][1][1], Tn[i][2][1]];
                        let a = [Tn[i][0][2], Tn[i][1][2], Tn[i][2][2]];
                        let p = [Tn[i][0][3], Tn[i][1][3], Tn[i][2][3]];
                        JT[i] = [crossProduct(p, n)[2], crossProduct(p, o)[2], crossProduct(p, a)[2], n[2], o[2], a[2]];
                        }
						else currentT=Tn[i]
                    }
					/*还原至实际角度*/
                    theta=math.add(theta,math.multiply(-1,THETA));
                    theta.pop();theta.shift();
                    /*--------------*/
                    current_pos=T2pos(currentT);
                    /*计算误差是否在允许范围内*/
                    let err=math.add(target_pos,math.multiply(-1,current_pos));
                    norm=math.norm(err);
                    if(norm<1){
                        let outOfRange=false;
                        for(let i=0;i<theta.length;i++){
                            let n=theta[i]/(Math.PI*2);
                            if(Math.abs(n)>1)theta[i]-=Math.round(n)*Math.PI*2;
                            if(theta[i]>Range[i][1])theta[i]-=Math.PI*2;
                            if(theta[i]<Range[i][0])theta[i]+=Math.PI*2;
                            if(theta[i]>Range[i][1]){outOfRange=true;break;}
                        }
                        if(!outOfRange)break;
                    }
                    let R=[
                        [currentT[0][0],currentT[0][1],currentT[0][2],0,0,0],
                        [currentT[1][0],currentT[1][1],currentT[1][2],0,0,0],
                        [currentT[2][0],currentT[2][1],currentT[2][2],0,0,0],
                        [0,0,0,currentT[0][0],currentT[0][1],currentT[0][2]],
                        [0,0,0,currentT[1][0],currentT[1][1],currentT[1][2]],
                        [0,0,0,currentT[2][0],currentT[2][1],currentT[2][2]],
                    ];
                    JT[7]=[0,0,0,0,0,1];
                    JT.shift();
                    let J=math.transpose(JT);//math.transpose矩阵转置
					J=math.multiply(R,J);//将基于末端的雅各比矩阵转换为基于基坐标系的雅各比
                    let J_plus=math.multiply(JT,math.inv(math.multiply(J,JT)));//J的广义逆矩阵
                    let dt=1;
                    let v=math.transpose(math.add(target_pos,math.multiply(-1,current_pos)));
                    v=math.multiply(v,1/dt);
                    let k=-0.14;let dH=[];
                    for(let i=0;i<=6;i++){
                    	let qm=Range[i][1],
							qn=Range[i][0],
							q=theta[i];
                    	dH[i]=-0.25*(qm-qn)*(qm-qn)*(-2*q+qm+qn)/Math.pow((qm-q)*(q-qn),2);
					}
					let phi=math.multiply(k,dH);
                    let I=[
                        [1,0,0,0,0,0,0],
                        [0,1,0,0,0,0,0],
                        [0,0,1,0,0,0,0],
                        [0,0,0,1,0,0,0],
                        [0,0,0,0,1,0,0],
                        [0,0,0,0,0,1,0],
                        [0,0,0,0,0,0,1]
                    ];
                    let N=math.add(I,math.multiply(-1,math.multiply(J_plus,J)));
                    let qs=math.multiply(J_plus,v),qn=math.multiply(N,phi);
                    let dr=math.add(qs,qn);
                    // dr.push(0);dr.unshift(0);
                    theta=math.add(theta,math.multiply(dr,dt));
                   /* current_pos=kinematicsEquation(theta,true);
                    currentT=pos2T_without_basetool(current_pos);
                    current_pos=T2pos(currentT);*/

                }
                if(times>max_times){
                    let msg=robNumber=="yumiL"?"ROB_left":"ROB_right"
                    alert(msg+'error');
                    return 0;
                }
                else{
                    return theta;
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
                document.getElementById(Pre+"posX").value=(T[0][3]).toFixed(1);
                document.getElementById(Pre+"posY").value=(T[1][3]).toFixed(1);
                document.getElementById(Pre+"posZ").value=(T[2][3]).toFixed(1);
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
                document.getElementById(Pre+"eulerX").value=EulerX.toFixed(1);
                document.getElementById(Pre+"eulerY").value=EulerY.toFixed(1);
                document.getElementById(Pre+"eulerZ").value=EulerZ.toFixed(1);

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
                        if(i==2) {//移动轴
                            let translation="250,"+TargetANG[i]+",0"
                            document.getElementById("Robot__link"+i).setAttribute('translation',translation);
                        }
                        else {
                            if(i==3)rotat="0,1,0,"+(-TargetANG[i]);//！！！！最后一轴正方向相反！！！！！
                            else rotat="0,1,0,"+TargetANG[i];
                            document.getElementById("Robot__link"+i).setAttribute('rotation',rotat);
                        }
                    }
            }
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
            }
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
    Robot360_1130VI:class RobotIrb360_1130VI extends RobotTemplateVI {
        constructor(VICanvas, draw3DFlag) {
            super(VICanvas,draw3DFlag);
            const _this = this;
            this.robotURL='assets/irb360_1130_x3d/irb360_1130.x3d';
            this.draw(draw3DFlag);
            this.name = 'ABB_IRB360';
            this.jiontsControl=function(TargetANG){
                let rotat="0,0,0,0";
                for(let i=0;i<3;i++){
                    //主动轴转角
                    rotat="1,0,0,"+TargetANG[i];
                    document.getElementById("Robot__link"+i+"_1").setAttribute('rotation',rotat);
                    //从动轴转角和旋转轴
                    rotat=""+(TargetANG[(2+i)*3+2])+","+(TargetANG[(2+i)*3+3])+","+(TargetANG[(2+i)*3+1])+","+TargetANG[i+4];
                    document.getElementById("Robot__link"+(i)+"_2r").setAttribute('rotation',rotat);
                    document.getElementById("Robot__link"+(i)+"_2l").setAttribute('rotation',rotat);
                }
                //动平台移动
                let trans=(TargetANG[17]).toFixed(2)+","+TargetANG[18].toFixed(2)+","+(TargetANG[16]).toFixed(2);//X3D场景中xyz对应计算场景中yzx
                document.getElementById("Robot__plate").setAttribute('translation',trans);
                //第四轴转动
                TargetANG[3]=-TargetANG[3];
                rotat="0,1,0,"+TargetANG[3];
                document.getElementById("Robot__facePlate").setAttribute('rotation',rotat);
                //顶部万向节
                document.getElementById("Robot__MUU").setAttribute('rotation',rotat);
                //第四轴连杆倾斜
                let x=-TargetANG[16],y=-TargetANG[17],z=-200-TargetANG[18]-29.5;
                let A=[0,1,0],B=[y,z,x];//A为ML竖直状态向量，B为倾斜状态向量，X3D场景中xyz对应计算场景中yzx
                let K=math.cross(A,B),k=math.multiply(K,1/math.norm(K)),kx=k[0],ky=k[1],kz=k[2];//动平台移动导致的旋转轴
                let theta=Math.acos(math.dot(A,B)/(math.norm(A)*math.norm(B)));//动平台移动导致的旋转角
                //若第四轴不为0，ML需要绕向量B旋转
				if(TargetANG[3]){
					/*将连杆倾斜的轴角转换为R*/
                    let s0=Math.sin(theta),c0=Math.cos(theta),vers0=1-c0;
                    let R1=[
                        [kx*kx*vers0+c0,ky*kx*vers0-kz*s0,kz*kx*vers0+ky*s0],
                        [ky*kx*vers0+kz*s0,ky*ky*vers0+c0,kz*ky*vers0-kx*s0],
                        [kx*kz*vers0-ky*s0,ky*kz*vers0+kx*s0,kz*kz*vers0+c0],
                    ];
					/*将连杆绕自身轴B转动的轴角转换为R*/
                    k=math.multiply(B,1/math.norm(B));
                    kx=k[0],ky=k[1],kz=k[2];
                    s0=Math.sin(TargetANG[3]),c0=Math.cos(TargetANG[3]),vers0=1-c0;
                    let R2=[
                        [kx*kx*vers0+c0,ky*kx*vers0-kz*s0,kz*kx*vers0+ky*s0],
                        [ky*kx*vers0+kz*s0,ky*ky*vers0+c0,kz*ky*vers0-kx*s0],
                        [kx*kz*vers0-ky*s0,ky*kz*vers0+kx*s0,kz*kz*vers0+c0],
                    ];
                    let R=math.multiply(R2,R1);
                    // let R=R1;
                    /*将复合转动的R转换为轴角*/
                    let nx=R[0][0],ox=R[0][1],ax=R[0][2],
                        ny=R[1][0],oy=R[1][1],ay=R[1][2],
                        nz=R[2][0],oz=R[2][1],az=R[2][2];
                    theta=Math.acos(0.5*(nx+oy+az-1));
                    kx=(oz-ay)/(2*Math.sin(theta));
                    ky=(ax-nz)/(2*Math.sin(theta));
                    kz=(ny-ox)/(2*Math.sin(theta));
				}
                rotat=''+kx+","+ky+","+kz+","+theta;
/*				let x=-TargetANG[16],y=-TargetANG[17],z=-200-TargetANG[18]-29.5,l=Math.sqrt(x*x+y*y);
				let theta=-Math.atan(l/z);
				// let a=document.getElementById("Robot__ML").requestFieldRef('rotation');
                let rot=document.getElementById("Robot__ML").getAttribute('rotation').replace(/(\-|\+)?\d+(\.\d+)?$/,'')+theta;*/
                document.getElementById("Robot__ML").setAttribute('rotation',rotat);
                document.getElementById("Robot__MU").setAttribute('rotation',rotat);
            }
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
    Robot14000VI:class Robot14000VI extends RobotTemplateVI {
        constructor(VICanvas, draw3DFlag) {
            super(VICanvas,draw3DFlag);
            const _this = this;
            // RobotTemplateVI.prototype.robotURL='assets/kuka_KR60HA_x3d/kuka_kr60.x3d';
            // RobotTemplateVI.prototype.draw(draw3DFlag);
            this.robotURL='assets/irb14000/irb14000.x3d';
            this.draw(draw3DFlag);
            this.name = 'YUMI';
            //关节转角控制各个连杆模型转动
            this.setData = function (input,inputType){
                if(Array.isArray(input)) {let targetANG=input.concat(); _this.jiontsControl(targetANG,inputType)}
                else {
                    console.log('RobotVI: Input value error');
                    return;
                }
            }
            this.jiontsControl=function(TargetANG,inputType) {
                let rotat="0,0,0,0";
                let len=TargetANG.length;
                let rot;
                let suffix=inputType==1?"_L":"_R";//根据inputType确定左右臂后缀
                for(let i=0;i<len;i++){
                    rot=document.getElementById("Robot__link"+i+suffix).getAttribute('rotation').replace(/(\-|\+)?\d+(\.\d+)?$/,'')+TargetANG[i];
                    document.getElementById("Robot__link"+i+suffix).setAttribute('rotation',rot);
                }
            }
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
	//机器人工具
    ToolVI:class ToolVI extends TemplateVI{
        constructor(VICanvas, draw3DFlag,robNum) {
            super(VICanvas, draw3DFlag,robNum);
            const _this = this;
            let haveTool=false;
            let jiajuTrans="0,0,0",jiajuScal="1,1,1",jiajuRotate="1,0,0,0",boxTrans='300,20,-300',jiajuRotate2='0,0,1,0',boxSize='40,40,40',qijiaTrans="13,0,0",qijiaRotate="1,0,0,-0.785398163";
            let gongjianTrans1='461.395,0,285.5',gongjianTrans2='461.395,0,225.5',gongjianTrans3='460,0,165.5';
            let gongjianTrans4='401.395,0,285.609',gongjianTrans5='401.395,0,225.609',gongjianTrans6='401.395,0,165.609';
            let penTrans="0,0,0",penScal="1,1,1",penRotate="1,0,0,0";
            let gripperTrans="0,0,0",gripperScal="1,1,1",gripperRotate="1,0,0,0";
            let Suf='';//后缀，区分双臂的左右臂
            //X3DOM场景中插入工具
            function draw() {
            	switch(robNum){//根据不同的机器人调整夹具及立方体的显示比例和位置
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
                    case "a360-1":
                    jiajuRotate='0,0,1,-1.5707963';
                    jiajuTrans="0,-30,0";
                    boxTrans='250,-1180,-250';
                    penTrans='0,-43,0';
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
					case "yumiL":
						Suf='L';
                        jiajuTrans="36,0,0";
                        boxTrans='300,10,-300'
						boxSize='20,20,20'
						break;
                    case "yumiR":
                        Suf='R';
                        boxTrans='300,10,300'
                        jiajuTrans="36,0,0";
                        boxSize='20,20,20'
                        break;
					case "a120":default:break;
				}
                var toolSwitch="<switch whichChoice='-1' DEF='TOOL' nameSpaceName id='Robot__TOOL"+Suf+"'>" +
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

                    "<Transform translation="+jiajuTrans+" scale="+jiajuScal+" rotation="+jiajuRotate+">" +
                    "<Transform rotation="+jiajuRotate2+">"+
                    "<Transform DEF='gripperL' translation='0 0 10' nameSpaceName id='Robot__gripperL"+Suf+"'>" +
                    "<inline url='../TOOLS/gripper/gripper_L.x3d' > </inline>" +
                    "</Transform>" +
                    "<Transform DEF='gripperR' translation='0 0 -10' nameSpaceName id='Robot__gripperR"+Suf+"'>" +
                    "<inline url='../TOOLS/gripper/gripper_R.x3d'> </inline>" +
                    "</Transform>" +
                    "<inline url='../TOOLS/gripper/gripper.x3d'> </inline>" +
                    "</Transform>" +
                    "</Transform>" +

                    "<Transform translation="+penTrans+" scale="+penScal+" rotation="+penRotate+">" +
                    "<Transform>"+
                    "<inline url='../TOOLS/pen.x3d'> </inline>" +
                    "</Transform>" +
                    "</Transform>"+
                "</switch>";
                 $("#Robot__lastLink"+Suf).after(toolSwitch);
                /*let tempNode = new DOMParser().parseFromString(toolSwitch, 'text/html');
                let node = tempNode.getElementsByTagName('switch')[0];
                document.getElementById("Robot__link5"+Suf).appendChild(node);*/
                var box="<transform DEF='box' translation="+boxTrans+" nameSpaceName id='Robot__box"+Suf+"' render='false'><shape>" +
                    "<appearance><material diffuseColor='1 0 0'></material></appearance>" +
                    "<box size="+boxSize+"></box>" +
                    "</shape></transform>";
             /*   var box1="<transform DEF='box1' translation="+boxTrans+" nameSpaceName id='Robot__box1' render='false'><shape>" +
                    "<appearance><material diffuseColor='1 0 0'></material></appearance>" +
                    "<box size="+boxSize+"></box>" +
                    "</shape></transform>";*/
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
                var huaban="<transform DEF='huaban' translation='320,150,-500' rotation='0,1,0,-0.785' nameSpaceName id='Robot__huaban' render='false'>" +
                    "<inline url='../TOOLS/huaban.x3d'></inline>" +
                    "</transform>";
                // if(robNum=="yumiR")$("#Robot__platform").after(box1);
                // else $("#Robot__platform").after(box);
                $("#Robot__platform").after(box);
                $("#Robot__platform").after(gongjian1);
                $("#Robot__platform").after(gongjian2);
                $("#Robot__platform").after(gongjian3);
                $("#Robot__platform").after(gongjian4);
                $("#Robot__platform").after(gongjian5);
                $("#Robot__platform").after(gongjian6);
                $("#Robot__platform").after(huaban);
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
            //切换工具.input值对应的工具：0-无工具；1-普通夹具；2-跟实际机器人上一致的夹具；3-画笔（焊枪）；4-gripper；5：马克笔。
            function toolSwitch(input){
                if(!haveTool)draw();
                document.getElementById("Robot__TOOL"+Suf).setAttribute("whichChoice", ""+(input-1)+"");
				/*if(input){
					document.getElementById("Robot__box").setAttribute("render", 'true');
				}
				else document.getElementById("Robot__box").setAttribute("render", 'false');*/
                switch (input) {
                    case 1:
                        document.getElementById("Robot__box"+Suf).setAttribute("render", 'true');
                        for (var i=1;i<7;i++) {
                            document.getElementById("Robot__gongjian"+i).setAttribute("render", 'false');
                        }
                        document.getElementById("Robot__huaban").setAttribute("render", 'false');
                        break;
                    case 2:
                        document.getElementById("Robot__box"+Suf).setAttribute("render", 'false');
                        document.getElementById("Robot__huaban").setAttribute("render", 'false');
                        for (var i=1;i<7;i++) {
                            document.getElementById("Robot__gongjian"+i).setAttribute("render", 'true');
                        }
                        break;
                    case 3:
                        document.getElementById("Robot__box"+Suf).setAttribute("render", 'false');
                        for (var i=1;i<7;i++) {
                            document.getElementById("Robot__gongjian"+i).setAttribute("render", 'false');
                        }
                        document.getElementById("Robot__huaban").setAttribute("render", 'true');
                        break;
                    case 4:
                        // if(robNum=="yumiR")
						document.getElementById("Robot__box"+Suf).setAttribute("render", 'true');
                        // else document.getElementById("Robot__box"+Suf).setAttribute("render", 'true');
                        for (var i=1;i<7;i++) {
                            document.getElementById("Robot__gongjian"+i).setAttribute("render", 'false');
                        }
                        document.getElementById("Robot__huaban").setAttribute("render", 'false');
                        break;
					case 5:
                        document.getElementById("Robot__box"+Suf).setAttribute("render", 'false');
                        for (var i=1;i<7;i++) {
                            document.getElementById("Robot__gongjian"+i).setAttribute("render", 'false');
                        }
                        document.getElementById("Robot__huaban").setAttribute("render", 'false');
                        break;
                    default:
                        document.getElementById("Robot__box"+Suf).setAttribute("render", 'false');
                        document.getElementById("Robot__huaban").setAttribute("render", 'false');
                        for (var i=1;i<7;i++) {
                            document.getElementById("Robot__gongjian"+i).setAttribute("render", 'false');
                        }
                        break;
                }

            }
            //控制工具的数字信号
            function toolDo(input) {
                if(input){
                    document.getElementById("Robot__jiajuL").setAttribute('translation','0,0,0');
                    document.getElementById("Robot__jiajuR").setAttribute('translation','0,0,0');

                    document.getElementById("Robot__qijiaL").setAttribute('translation','0,0,-10');
                    document.getElementById("Robot__qijiaR").setAttribute('translation','0,0,10');

                    document.getElementById("Robot__gripperL"+Suf).setAttribute('translation','0,0,0');/*'0,-12.5,0'*/
                    document.getElementById("Robot__gripperR"+Suf).setAttribute('translation','0,0,0');/*'0,12.5,0'*/
                }
                else{
                    document.getElementById("Robot__jiajuL").setAttribute('translation','0,0,10');
                    document.getElementById("Robot__jiajuR").setAttribute('translation','0,0,-10');

                    document.getElementById("Robot__qijiaL").setAttribute('translation','0,0,0');
                    document.getElementById("Robot__qijiaR").setAttribute('translation','0,0,0');

                    document.getElementById("Robot__gripperL"+Suf).setAttribute('translation','0,8,0');
                    document.getElementById("Robot__gripperR"+Suf).setAttribute('translation','0,-8,0');
                }
            }
        }
	},
    //机器人拆装实验
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
            //切换显示的机器人
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
	//方位描述实验
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
                    this.container.innerHTML='<x3d  class="x3d"><scene>'+
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
                /*let R=[
                	[ca*cb*cy-sa*sy,-ca*cb*sy-sa*cy,ca*sb],
					[sa*cb*cy+ca*sy,-sa*cb*sy+ca*cy,sa*sb],
					[-sb*cy,sb*sy,cb]
				];*/
                let R=[
                	[ca*cb,ca*sb*sy-sa*cy,ca*sb*cy+sa*sy],
					[sa*cb,sa*sb*sy+ca*cy,sa*sb*cy-ca*sy],
					[-sb,cb*sy,cb*cy]
				];//ZYX
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
	//坐标系转换实验
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
                    this.container.innerHTML = '<x3d  class="x3d"><scene>' +
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
                    this.container.innerHTML = '<x3d class="x3d"><scene>' +
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
                let url="120/link2.x3d",linkNum=2,imgLink='assets/RobotLinks/120/img.jpg',trans='0,0,0';
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
                        imgLink='assets/RobotLinks/60/img.jpg';
                        trans='-1000,-800,-1000';
                        break;
                    case '4':
                        url="60/link3.x3d";
                        linkNum=3;
                        imgLink='assets/RobotLinks/60/img.jpg';
                        trans='-1000,-300,-1000';
                        break;
                    case '5':
                        // url="60/link5.x3d";
                        url="910/link2.x3d";
                        linkNum=2;
                        imgLink='assets/RobotLinks/910/img.jpg';
                        trans='0,0,0';
                        break;
                    default:
                        url="120/link2.x3d";
                        linkNum=2;
                }
                document.getElementById('robotImg').src=imgLink;
                document.getElementById("Link__linkTrans").setAttribute("translation",trans);
                document.getElementById("Link__showLink").setAttribute("url",url);
                document.getElementById("linkNumber").innerText=linkNum;
                /*if(index==3||index==4) {
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
                document.getElementById("linkNumber").innerText=linkNum;*/
            }
        }
    }
};
