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
                resolve({ts:TS,speed:SPEED,cadence:CAD})
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
            chartLive.data.datasets[0].data.push(speed)
            chartLive.data.datasets[1].data.push(cadence)
            chartLive.update();
        }
    }

    async function updateChart(){
        if(chartSnow){
            let res=await getRawValues()
            chartSnow.data.labels=res.ts
            chartSnow.data.datasets[0].data=res.speed
            chartSnow.data.datasets[1].data=res.cadence
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
            clearInterval(refresh_timer);
            clearInterval(saver);
            refresh_timer=null;
            saver=null;
            refresh_state=false;
            var tm=toHoursAndMinutes( parseInt($("#refresh_rate").val())*10)
            var txt=`Saving money, the data hasn't changed for ${tm}<br>Stopping Auto-refresh...<br>Auto-refresh stopped`
            notifStopRefresh(txt)
          } else{
            saverRef=saverVal;
          }
        },parseInt(val)*10000)
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
    }
      
    function toHoursAndMinutes(sec) {
        const totalMinutes = Math.floor(sec / 60);
      
        const seconds = sec % 60;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${hours}h${minutes}mn${seconds}s`
    }

    async function drawChart(className){
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
            }]
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
                        let unit=tooltipItems.datasetIndex==0?" KM/H":" WATTS"
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
                    gridLines: {
                        borderDash: [8, 8],
                        color: '#eaf2f9',
                        drawBorder: false,
                        drawTicks: false,
                        zeroLineColor: 'transparent'
                    },
                    ticks: {
                        min: 0,
                        max: 200,
                        display: true,
                        padding: 0
                    }
                },
                {
                    id: 'SP',
                    type: 'linear',
                    position: 'left',
                    gridLines: {
                        borderDash: [8, 8],
                        color: '#eaf2f9',
                        drawBorder: false,
                        drawTicks: false,
                        zeroLineColor: 'transparent'
                    },
                    ticks: {
                        min: 0,
                        max: 80,
                        display: true,
                        padding: 1
                    }
                }]
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
        const socket = io("http://10.0.0.11:4321");
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
                gaugeCD.set(cad)
                lastCadence=cad
            }
            addToChart(convertTimeStamp(data.ts),lastSpeed,lastCadence)
          })
    }

    function activateRefresh(){
        let val=$('#refresh_rate').val()
        if(refresh_state==false){
            startRefreshTimer(parseInt(val));
            startSaverTimer(parseInt(val));
            toggleRefreshIco(true)
        }
    }

    async function init(){
        console.log('started');
        $("#loader").hide()
        $('[data-toggle="tooltip"]').tooltip()
        toggleRefreshIco(refresh_state);
        chartLive=await drawChart('.js-area-chart');
        chartSnow=await drawChart('.js-area-chart-snow');
        updateChart();
        drawGaugeKM();
        drawGaugeDS();
        drawGaugeCD();
        initSocket();
    }

    $("#refresh_rate").on('input', function () {
        window.refresh_timer_delay=parseInt($(this).val());
        $('#rangeval').html(window.refresh_timer_delay)
        startRefreshTimer(parseInt($(this).val()));
        startSaverTimer(parseInt($(this).val()));
        toggleRefreshIco(refresh_state);
    })

    $("#refresh_ico").parent().on('click',function(){
        if (refresh_state==true){
            refresh_state=false;
            if(refresh_timer)
                clearInterval(refresh_timer);
                refresh_timer=null
             if(saver)    
                clearInterval(saver);
                saver=null;
        }
        else{
            startRefreshTimer(parseInt($("#refresh_rate").val())); 
            startSaverTimer(parseInt($("#refresh_rate").val())); 
        }
        toggleRefreshIco(refresh_state);
    })

    if(window.refresh_timer_delay){
        $("#refresh_rate").val(window.refresh_timer_delay);
        $('#rangeval').html(window.refresh_timer_delay)
    }

    updateRawCount().then((v)=>(saverRef=v))
    init();
})(jQuery)
