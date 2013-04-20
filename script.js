   window.onload = function() {
      
      var width = screen.width * 0.9;

      var iconTestData = [];

      function init(){
        iconTestData = [];
        $.ajax({
          url: "https://www.googleapis.com/fusiontables/v1/query?sql=SELECT%20nombre,cargoNominal,fechaInicioYear,fechaFinYear,territorio%20FROM%201u3Q0PPtatQbnLBgV9liDNgCcHJk7Uy6kD7ULEYw ORDER BY nombre&key=AIzaSyADM7-k_4jHBrqjQGlsny1YDqxX1BGPEXk",
          dataType : "jsonp",
          crossDomain : true,
          context: document.body
        }).done(function(data) {
          iconTestData = preFilterData(data);
          renderD3();
        });

      }
 
      function preFilterData(data){
        var resp = [];
        var lastName = "";
        $.each(data.rows,function(i,e){
          if(lastName == e[0]){
            label = "";
          } else {
            label = e[0];
          }
          lastName = e[0];
          var endTime = e[3]; 
          if(isNaN(e[3])){
            endTime = "2013";
          }
          var unit = {
            label: label, 
            times: [{"starting_time": e[2], "ending_time": endTime }],
            cargo: e[1],
            territorio: e[4]
          };
          resp.push(unit);
        });
        return resp;
      }

      init(); //run


      function renderD3() {
        var chart = d3.timeline()
          .beginning(1970) // we can optionally add beginning and ending times to speed up rendering a little
          .ending(2015)
          .stack() // toggles graph stacking
          .margin({left:70, right:30, top:0, bottom:0})
          .hover(function (d, i, datum) {
            var div = $('#hoverInfo');
            var colors = chart.colors();
            div.find('.coloredDiv').css('background-color', colors(i))
            div.text(d.starting_time + ',' + d.ending_time + ',' +  datum.cargo + ',' + datum.territorio);
          })
          ;
        var svg = d3.select("#timeline5").append("svg").attr("width", width)
          .datum(iconTestData).call(chart);
      }
      

     }