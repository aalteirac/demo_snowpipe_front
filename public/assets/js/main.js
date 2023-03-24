(function ($) {
  $(document).on('ready', async function () {
    var refresh;
    var saverVal=0;
    var saverRef=0;
    var saver;

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

    async function updateRawCount(){
      ret=await getRawCount();
      var ct=ret.message_back[0].ROWCOUNT
      $("#rawcount").text(ct)
      return ct;
    }

    $("#refresh_rate").on('input', function () {
        if(refresh)
          clearInterval(refresh);
        refresh=setInterval(async ()=>{
          $("#loader").show()
          saverVal=await updateRawCount()
          $("#loader").hide()
        },parseInt($(this).val())*1000)

        if(saver)
          clearInterval(saver)
        saver=setInterval( ()=>{
          if(saverVal==saverRef){
            clearInterval(refresh);
            clearInterval(saver);
            console.log(`Saving money, the data didn't changed for ${parseInt($(this).val())*10000} seconds, stopping auto refresh...`)
          } else{
            saverRef=saverVal;
          }
        },parseInt($(this).val())*10000)
    })
    

    //init UI
    $("#loader").hide()
    saverRef=await updateRawCount()


  });


})(jQuery);