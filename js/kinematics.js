/**
 * Created by bear on 2018/11/12.
 */
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
function moveJ(input,v){
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
function moveL(input1,v) {
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
function moveC(input1,input2,input3) {
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