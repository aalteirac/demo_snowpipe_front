
(function ($) {
    var refresh_timer;
    var saverVal=0;
    var saverRef=0;
    var saverPrevious=0;
    var saver;
    var chartSnow; 
    var chartLive; 
    var gaugeKM;
    var gaugeCD;
    var lastevent;
    var lastSpeed=0;
    var lastCadence=0;
    var inMotion=false;
    var timeSnow={};
    var timeLive={};
    var latency=[0];
    var avgLatency=0;
    var refreshRate=1;

    function drawGaugeDS(){
    
    }  

    function drawGaugeCD(){
        var opts = {
            angle: -0.33, 
            lineWidth: 0.24, 
            radiusScale: 1, 
            pointer: {
                length: 0.6, 
                strokeWidth: 0.035, 
                color: '#000000' 
            },
            limitMax: false,   
            limitMin: true,     
            colorStart: '#6FADCF',  
            colorStop: '#8FC0DA',   
            strokeColor: '#E0E0E0',  
            generateGradient: true,
            highDpiSupport: true,    
            staticZones: [
                {strokeStyle: "#F03E3E", min: 170, max: 200}, // Red from 100 to 130
                {strokeStyle: "#FFDD00", min: 100, max: 170}, // Yellow
                {strokeStyle: "#444bf8", min: 0, max: 100}, 
             ],
            
            };
        var target = document.getElementById('gCD'); 
        gaugeCD= new Gauge(target).setOptions(opts); 
        gaugeCD.maxValue = 200; 
        gaugeCD.setMinValue(0);  
        gaugeCD.animationSpeed = 90; 
        gaugeCD.setTextField(document.getElementById('gauge-valueCD'),1);
        gaugeCD.set(0); 
    }   

    function drawGaugeKM(){
        var opts = {
            angle: -0.33, 
            lineWidth: 0.24, 
            radiusScale: 1, 
            pointer: {
              length: 0.6, 
              strokeWidth: 0.035, 
              color: '#000000' 
            },
            limitMax: false,  
            limitMin: false,   
            colorStart: '#00ed96',   
            colorStop: '#00ed96',    
            strokeColor: 'white',  
            generateGradient: true,
            highDpiSupport: true,
            renderTicks: {
                divisions: 5,
                divWidth: 1.1,
                divLength: 0.7,
                divColor: "#333333",
                subDivisions: 3,
                subLength: 0.5,
                subWidth: 0.6,
                subColor: "#666666"
            }
            
          };
        var target = document.getElementById('gKM'); // your canvas element
        gaugeKM= new Gauge(target).setOptions(opts); // create sexy gauge!
        gaugeKM.maxValue = 50; // set max gauge value
        gaugeKM.setMinValue(0);  // Prefer setter over gauge.minValue = 0
        gaugeKM.animationSpeed = 90; // set animation speed (32 is default value)
        gaugeKM.setTextField(document.getElementById('gauge-valueKM'),1);
        gaugeKM.set(0); // set actual value
    }  

    function convertTimeStamp(dateString){
        const dateObj = new Date(dateString); 
        const formattedDate = `${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}:${dateObj.getSeconds().toString().padStart(2, '0')}`;
        return formattedDate;
    }

    function runCycle(){
        return new Promise((resolve,reject)=>{
          $.ajax({
            url: "/runcycle",
            type: 'GET',
            success: function(res) {
                resolve(res)
            }
          });
        }) 
    }

    function getRawCount(){
        return new Promise((resolve,reject)=>{
          $.ajax({
            url: "/rawcount",
            type: 'GET',
            success: function(res) {
                resolve(res)
            }
          });
        }) 
    }

    function getRawValues(){
        return new Promise((resolve,reject)=>{
          $.ajax({
            url: "/rawval",
            type: 'GET',
            success: function(st) {
                const TS = st.message_back.map(item =>{ 
                    cv=convertTimeStamp(item.VALUE.ts)
                return cv;
                }).reverse();
                const SPEED = st.message_back.map(item => item.VALUE.speed?parseFloat(item.VALUE.speed.toFixed(2)):0).reverse();
                const CAD = st.message_back.map(item => item.VALUE.cadence?parseFloat(item.VALUE.cadence.toFixed(2)):0).reverse();
                const TEMP= st.message_back.map(item => parseFloat(item.VALUE.host_info.cpu_temperature.replace(/[^0-9.]/g, ''))).reverse()
                resolve({ts:TS,speed:SPEED,cadence:CAD,cpu_temp:TEMP})
            }
          });
        }) 
    }
  
    async function updateRawCount(){
        ret=await getRawCount();
        var ct=ret.message_back[0].ROWCOUNT
        $("#rawcount").text(ct)
        return ct;
    }
    
    async function addToChart(ts,speed,cadence){
        if(chartLive){
            chartLive.data.labels.push(ts)
            timeLive[ts]=new Date().getTime();
            chartLive.data.datasets[0].data.push(speed)
            // chartLive.data.datasets[1].data.push(cadence)
            chartLive.update();
        }
    }

    async function updateChart(){
        if(chartSnow){
            delta=0;
            let res=await getRawValues();
            chartSnow.data.labels=res.ts;
            if(typeof(res.ts)!='undefined' && res.ts.length>0){
                var lastTickNb=Object.values(timeSnow).length;
                // console.log("before",lastTickNb,res.ts.length-1)
                for (let index = lastTickNb; index < res.ts.length; index++) {
                    const element = res.ts[index];
                    timeSnow[element]=new Date().getTime();
                    delta=(timeSnow[element]-timeLive[element])/1000
                    if(!isNaN(delta)){
                        latency.push(delta);
                        var tot=0;
                        latency.forEach(element => {
                            tot=tot+element;
                        });
                        avgLatency=tot/latency.length;
                        $("#latavg").text(parseFloat(avgLatency).toFixed(3)+'s');
                    }  
                }
                // console.log("after",lastTickNb,res.ts.length)
                // console.log(timeSnow,timeLive,latency,delta)
            }
            chartLive.data.datasets[1].data=latency;
            chartLive.update();
            chartSnow.data.datasets[0].data=res.speed     
            if(res.cpu_temp)
                chartSnow.data.datasets[2].data=res.cpu_temp
            chartSnow.update();
        }
    }

    function startRefreshTimer(val){
        refresh_state=true;
        if(refresh_timer)
            clearInterval(refresh_timer);
            refresh_timer=null;
        refresh_timer=setInterval(async ()=>{
            $("#loader").show()
            saverVal=await updateRawCount();
            if(saverVal!=saverPrevious){
                updateChart()
            }
            saverPrevious=saverVal;
            $("#loader").hide()
        },val*1000)
    }
    
    function startSaverTimer(val){
        if(saver){
          clearInterval(saver)
          saver=null
        }
        saver=setInterval( ()=>{
          if(saverVal==saverRef){
            timeSnow={};
            timeLive={};
            latency=[0]
            clearInterval(refresh_timer);
            clearInterval(saver);
            refresh_timer=null;
            saver=null;
            refresh_state=false;
            var tm=toHoursAndMinutes(refreshRate*10)
            var txt=`Run ended...<br>Auto-refresh stopped...`
            notifStopRefresh(txt)
          } else{
            saverRef=saverVal;
          }
        },val*6000)
    } 

    function toggleRefreshIco(on=false){
        if( on==false){
            $("#refresh_ico").removeClass("bg-success")
            $("#refresh_ico").addClass("bg-danger")
        }
        else{
            $("#refresh_ico").addClass("bg-success")
            $("#refresh_ico").removeClass("bg-danger")
        }
    }

    function notifStopRefresh(text){
        toggleRefreshIco();
        var close = '<button onclick="$(this).closest(\'div.popover\').popover(\'hide\');" type="button" class="close" style="float:right;"  aria-hidden="true">&times;</button>';
        $('.pop-refresh').popover({html:true,placement:'top',title: 'INFORMATION' + close, content: text, trigger:'manual'})
        $('.pop-refresh').attr("data-content", text)
        $('.pop-refresh').popover('show')
        setTimeout(() => {
            $('.pop-refresh').popover('hide')
        }, 5000);
    }
      
    function toHoursAndMinutes(sec) {
        const totalMinutes = Math.floor(sec / 60);
      
        const seconds = sec % 60;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${hours}h${minutes}mn${seconds}s`
    }

    async function drawChart(className,temp=false){
        chartClass = className,
        data = {
            labels: [],
            datasets: [{
                    yAxisID:'SP',
                    data: [],
                    borderColor: 'rgba(0, 237, 150, 1)',
                    backgroundColor: 'rgba(0, 237, 150, .1)',
                }, {
                    yAxisID:'CAD',
                    data: [],
                    borderColor: 'rgba(68, 75, 248, 1)',
                    backgroundColor: 'rgba(68, 75, 248, .1)',
                },{
                    yAxisID:'TP',
                    data: [],
                    borderColor: '#ff0303',
                    backgroundColor: 'transparent',
                },
            ]
        },
        options = {
            responsive: true,
            maintainAspectRatio: false,
            legend: {
                display: false
            },
            hover: {
                mode: 'nearest',
                intersect: false
            },
            tooltips: {
                enabled: true,
                mode: 'nearest',
                intersect: true,
                displayColors: false,
                callbacks: {
                    label: function (tooltipItems, data) {
                        let unit=" KM/H";
                        switch (tooltipItems.datasetIndex) {
                            case 1:
                                unit=" Sec";
                                break;
                            case 2:
                                unit=" ° Celsius"
                                break;
                        }
                        return data.datasets[tooltipItems.datasetIndex].data[tooltipItems.index] + unit;
                    }
                },
            },
            elements: {
                line: {
                    borderWidth: 3
                },
                point: {
                    pointStyle: 'circle',
                    radius: 0,
                    hoverRadius: 7,
                    borderWidth: 3,
                    backgroundColor: '#ffffff'
                }
            },
            scales: {
                xAxes: [{
                    gridLines: {
                    display: false,
                    drawBorder: false
                    },
                    ticks: {
                    fontWeight: 400,
                    fontSize: 14,
                    fontFamily: 'Roboto, sans-serif',
                    fontColor: '#999BA8'
                    }
                }],
                yAxes: [{
                    id: 'CAD',
                    type: 'linear',
                    position: 'right',
                    display:!temp,
                    gridLines: {
                        display: false,
                        borderDash: [8, 8],
                        color: '#eaf2f9',
                        drawBorder: false,
                        drawTicks: false,
                        zeroLineColor: 'transparent'
                    },
                    ticks: {
                        min: 0,
                        suggestedMax: 4,
                        display: true,
                        padding: 0
                    }
                },
                {
                    id: 'SP',
                    type: 'linear',
                    position: 'left',
                    gridLines: {
                        display: false,
                        borderDash: [8, 8],
                        color: '#eaf2f9',
                        drawBorder: false,
                        drawTicks: false,
                        zeroLineColor: 'transparent'
                    },
                    ticks: {
                        min: 0,
                        suggestedMax: 10,
                        display: true,
                        padding: 1
                    }
                },
                {
                    id: 'TP',
                    type: 'linear',
                    position: 'right',
                    display:temp,
                    gridLines: {
                        display: false,
                        borderDash: [8, 8],
                        color: '#ff0303',
                        drawBorder: false,
                        drawTicks: false,
                        zeroLineColor: 'transparent'
                    },
                    ticks: {
                        suggestedMin: 50,
                        suggestedMax: 75,
                        display: true,
                        padding: 1
                    }
                }
                ]
            }
      };
    var ch = new Chart($(chartClass), {
            type: 'line',
            data: data,
            options: options
        });
    return ch
    }

    function initSocket(){
        const socket = io("http://stream.alteirac.com:4321");
        socket.on('connect_error',e=>console.log('Ant feeder Docker container is either not reachable, faulty or simply not started :-)'))
        socket.on('data', data => {
            if(typeof(data.speed)!='undefined'){
                activateRefresh();
                let sp=parseFloat(data.speed.toFixed(2));
                gaugeKM.set(sp);
                lastSpeed=sp;
            }
            if(typeof(data.cadence)!='undefined'){
                let cad=parseFloat(data.cadence.toFixed(2))
                // gaugeCD.set(cad)
                lastCadence=cad
            }
            addToChart(convertTimeStamp(Date.now()),lastSpeed,lastCadence)
          })
        
    }

    function activateRefresh(){
        let val=refreshRate;
        if(refresh_state==false){
            chartLive.data.datasets[0].data=[]
            chartLive.data.datasets[1].data=[]
            chartLive.data.labels=[]
            startRefreshTimer(val);
            startSaverTimer(val);
            toggleRefreshIco(true)
        }
    }

    async function init(){
        console.log('started');
        $("#loader").hide()
        $('[data-toggle="tooltip"]').tooltip()
        toggleRefreshIco(refresh_state);
        chartLive=await drawChart('.js-area-chart');
        chartSnow=await drawChart('.js-area-chart-snow',true);
        updateChart();
        drawGaugeKM();
        drawGaugeDS();
        // drawGaugeCD();
        initSocket();
        document.getElementById("runtp").style.visibility = 'visible';
    }


    $("#refresh_ico").parent().on('click',async function(){
        if (refresh_state==true){
            console.log('already started')
            // toggleRefreshIco(false);
            // refresh_state=false;
            // if(refresh_timer)
            //     clearInterval(refresh_timer);
            //     refresh_timer=null
            //  if(saver)    
            //     clearInterval(saver);
            //     saver=null;
        }
        else{
            console.log('starting')
            chartLive.data.datasets[0].data=[]
            chartLive.data.datasets[1].data=[]
            chartLive.data.labels=[]
            refresh_state=true;
            // startRefreshTimer(refreshRate); 
            // startSaverTimer(refreshRate); 
            toggleRefreshIco(true);
            await runCycle();
        }
    })


    updateRawCount().then((v)=>(saverRef=v))
    init();
})(jQuery)
