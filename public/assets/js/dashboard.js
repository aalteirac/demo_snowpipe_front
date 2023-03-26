(function ($) {
    var refresh_timer;
    var saverVal=0;
    var saverRef=0;
    var saverPrevious=0;
    var saver;
    var chart; 
    var gaugeKM;
    var gaugeCD;
    var reset_check_KM;
    var reset_check_CD;
    var lastSpeed=0;
    var lastCadence=0;

    function drawGaugeDS(){
    
    }  

    function drawGaugeCD(){
        var opts = {
            angle: -0.33, // The span of the gauge arc
            lineWidth: 0.24, // The line thickness
            radiusScale: 1, // Relative radius
            pointer: {
                length: 0.6, // // Relative to gauge radius
                strokeWidth: 0.035, // The thickness
                color: '#000000' // Fill color
            },
            limitMax: false,     // If false, max value increases automatically if value > maxValue
            limitMin: true,     // If true, the min value of the gauge will be fixed
            colorStart: '#6FADCF',   // Colors
            colorStop: '#8FC0DA',    // just experiment with them
            strokeColor: '#E0E0E0',  // to see which ones work best for you
            generateGradient: true,
            highDpiSupport: true,     // High resolution support
            
            };
        var target = document.getElementById('gCD'); // your canvas element
        gaugeCD= new Gauge(target).setOptions(opts); // create sexy gauge!
        gaugeCD.maxValue = 200; // set max gauge value
        gaugeCD.setMinValue(0);  // Prefer setter over gauge.minValue = 0
        gaugeCD.animationSpeed = 140; // set animation speed (32 is default value)
        gaugeCD.setTextField(document.getElementById('gauge-valueCD'),1);
        gaugeCD.set(0); // set actual value
    }   

    function drawGaugeKM(){
        var opts = {
            angle: -0.33, // The span of the gauge arc
            lineWidth: 0.24, // The line thickness
            radiusScale: 1, // Relative radius
            pointer: {
              length: 0.6, // // Relative to gauge radius
              strokeWidth: 0.035, // The thickness
              color: '#000000' // Fill color
            },
            limitMax: false,     // If false, max value increases automatically if value > maxValue
            limitMin: false,     // If true, the min value of the gauge will be fixed
            colorStart: '#6FADCF',   // Colors
            colorStop: '#8FC0DA',    // just experiment with them
            strokeColor: '#E0E0E0',  // to see which ones work best for you
            generateGradient: true,
            highDpiSupport: true,     // High resolution support
            
          };
        var target = document.getElementById('gKM'); // your canvas element
        gaugeKM= new Gauge(target).setOptions(opts); // create sexy gauge!
        gaugeKM.maxValue = 50; // set max gauge value
        gaugeKM.setMinValue(0);  // Prefer setter over gauge.minValue = 0
        gaugeKM.animationSpeed = 140; // set animation speed (32 is default value)
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
                    cv=convertTimeStamp(item.TS)
                return cv;
                }).reverse();
                const SPEED = st.message_back.map(item => item.VALUE.speed).reverse();
                const WATT = st.message_back.map(item => item.VALUE.watt).reverse();
                resolve({ts:TS,speed:SPEED,watt:WATT})
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
        if(chart){
            chart.data.labels.push(ts)
            chart.data.datasets[0].data.push(speed)
            chart.data.datasets[1].data.push(cadence)
            chart.update();
        }
    }

    async function updateChart(){
        if(chart){
            let res=await getRawValues()
            chart.data.labels=res.ts
            chart.data.datasets[0].data=res.speed
            chart.data.datasets[1].data=res.watt
            chart.update();
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
        if(saver)
          clearInterval(saver)
          saver=null
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

    async function drawChart(){
        let res=await getRawValues()
        chartClass = '.js-area-chart',
        data = {
            labels: res.ts,
            datasets: [{
                data: res.speed,
                borderColor: 'rgba(0, 237, 150, 1)',
                backgroundColor: 'rgba(0, 237, 150, .1)',
                }, {
                data: res.watt,
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
                    display: false,
                    padding: 0
                    }
                }]
            }
      };
    $(chartClass).each(function (i, el) {
      chart = new Chart(el, {
        type: 'line',
        data: data,
        options: options
      });
    });
    }

    function initSocket(){
        const socket = io("http://10.0.0.11:4321");
        socket.on('data', data => {
            if(typeof(data.speed)!='undefined'){
                let sp=parseFloat(data.speed.toFixed(2));
                gaugeKM.set(sp);
                lastSpeed=sp;
                clearTimeout(reset_check_KM)
                reset_check_KM=setTimeout(() => {
                    gaugeKM.set(0);
                }, 800);
            }
            if(typeof(data.cadence)!='undefined'){
                let cad=parseFloat(data.cadence.toFixed(2))
                gaugeCD.set(cad)
                lastCadence=cad
                clearTimeout(reset_check_CD)
                reset_check_CD=setTimeout(() => {
                    gaugeCD.set(0);
                }, 1200);
            }
            addToChart(convertTimeStamp(data.ts),lastSpeed,lastCadence)
          })
    }
    async function init(){
        console.log('started');
        $("#loader").hide()
        $('[data-toggle="tooltip"]').tooltip()
        if(refresh_state==false){
            startRefreshTimer(parseInt($("#refresh_rate").val()));
            startSaverTimer(parseInt($("#refresh_rate").val()));
        }
        toggleRefreshIco(refresh_state);
        drawChart();
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
