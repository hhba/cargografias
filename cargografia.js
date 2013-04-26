var App;

;(function(global, document, tabletop){

    "use strict";

    App = global.cargografia = global.cargografia || {};

    // Inicia: Usa tabletop para traer data. 
    //Cuando termina de cargar los datos, llama a la funcion renderD3();
    App.init = function () {
        var dataCargos = [];
        if(localStorage && localStorage.cargoData){
            dataCargos = JSON.parse(localStorage.cargoData);
        }else{
          tabletop.init(
            {
                key: "https://docs.google.com/spreadsheet/pub?key=0Av8QEY2w-qTYdFViaG5ULTlUQ1Q4M3AxS1NvcWI0UlE&single=true&gid=0&output=html",
                callback: function(data){
                    if(localStorage){
                        dataCargos = JSON.stringify(data);
                    }
                },
                simpleSheet: true 
            });
        }
        App.renderD3(dataCargos);
    };

    //PreFilterData: ACA AJUSTA LOS DATOS QUE VIENEN DE LA SPREADSHET Y LOS TOQUETEA UN POCO, 
    //y le pone los nombres correctos
    App.preFilterData = function(data) { 
        var resp = {}, cargoID = 0, lastName = "",
            primerStartingYear = 2000, 
            ultimoEndingYear = 2000,
            anioMasUsados = App.getAniosMasUsados(data,20),
            totalPoliticos = 0;

        data.forEach(function(e,i){
            var endTime = Number(e['fechafinyear']); 
            if(lastName != e['nombre']){
                cargoID ++;
            }
            lastName = e['nombre'];
            if(isNaN(e['fechafinyear'])){
                endTime = 2013;
            }

            //Verifico limites
            primerStartingYear = (primerStartingYear>Number(e['fechainicioyear']))?Number(e['fechainicioyear']):primerStartingYear;
            ultimoEndingYear = (ultimoEndingYear<endTime)?endTime:ultimoEndingYear;

            var unit = {
                nombre: e['nombre'], 
                desde: Number(e['fechainicioyear']),
                hasta: endTime,
                cargoID: cargoID,
                cargo: e['cargonominal'],
                territorio: e['territorio'],
                cargoTipo: e['cargotipo'],
                dura: Number(e['duracioncargo'])
            };
            if(!resp[cargoID]) {
                totalPoliticos++;
                resp[cargoID] = {"nombre":e['nombre'], "cargoID":cargoID, "cargos":[]};
            }
            resp[cargoID].cargos.push(unit);
        });
        return {data:resp,
                limiteInferior:primerStartingYear,
                limiteSuperior:ultimoEndingYear,
                anios:anioMasUsados,
                totalRenglones:totalPoliticos
                };
      }

    // ESTA ES LA FUNC. QUE REALMENTE DIBUJA
    App.renderD3 = function (data) { 
        var newData = App.preFilterData(data), //pre-procesa la data, retorna un objeto con varios datos
            marginSVG = 10,
            itemHeight = 25,
            spacingY = 10,
            svgWidth = 2000,
            svgHeight = newData.totalRenglones * (itemHeight + spacingY + 1 ),
            primerStartingYear = newData.limiteInferior,
            ultimoEndingYear = newData.limiteSuperior;
        
        var xScale = d3.scale.linear()  // DEFINE ESCALA/RANGO DE EJE X
                    .domain([primerStartingYear-5,ultimoEndingYear+5]) // RANGO DE AÑOS DE ENTRADA
                    .rangeRound([1,svgWidth]); // ANCHO MAXIMO DEL CUADRO EN PIXELES
            
            
        //*** ARMADO DEL SVG            
        var svg = d3.select("#timeline").append("svg")  
                    .attr("width", svgWidth)
                    .attr("height", svgHeight);

        //*** CIRCULITO QUE MARCA EL AÑO CUANDO EL MOUSE SE MUEVE 
        var yearMarker = svg.append("g")
                            .attr("class", "yearMarker")
                            .style("display","none");

        yearMarker.append("circle")
                    .attr("r", 5);

        //Crea el tooltip            
        var tooltip = d3.select("body").append("div")   
                        .attr("class", "tooltip")               
                        .style("opacity", 0);

        // COSAS QUE PASAN CUANDO EL MOUSE SE MUEVE 
        // Marker de los años y tooltip
        svg.on("mouseover", function() { yearMarker.style("display", null); })
            .on("mouseout", function() { yearMarker.style("display", "none"); })
            .on("mousemove", mousemove);

        function mousemove() {
            yearMarker.attr("transform", "translate(" + d3.mouse(this)[0] + ","+(marginSVG+0.5)+")");
            tooltip.style("left", (d3.event.pageX) + "px").style("top", (d3.event.pageY - 28) + "px");
        }

        // COMIENZA LA CONSTRUCCION DEL CHART 
        var itemsPolitico = svg.selectAll("g")
                            .data(d3.entries(newData.data))             
                            .enter()
                            .append("g")
                            .attr("class", "politico")
                            .attr("id",  function(d, i) { return "politico-"+d.value.cargoID;})
                            .each(function(d,i){ //procesa cada politico
                               //Cálculo de la variación
                                var posY = d.value.cargoID*(itemHeight + spacingY), 
                                    posX = 0,
                                    politico = svg.select('#politico-'+d.value.cargoID);//Grupo de cada político

                                //Agrego la línea
                                politico
                                .append("line")
                                .attr("x1",0)
                                .attr("y1",itemHeight + (spacingY/2) )
                                .attr("x2",svgWidth)
                                .attr("y2",itemHeight + (spacingY/2) )
                                .attr("stroke","#CCC");

                                //Agrego el nombre del político
                                politico
                                .append("text")
                                .text(d.value.nombre)
                                .attr("x", 5)
                                .attr("y", 18)
                                .attr("class","nombreLabel");
                                
                                //Agrego el contenedor de cargos
                                var cargosContainer = politico
                                                    .append("g")
                                                    .attr("class", "cargos-container");

                                //Lleno el contenedor con cargos
                                var cargos = cargosContainer
                                    .selectAll("g")
                                    .data(d.value.cargos)
                                    .enter()
                                    .append("g")
									.attr("transform", function(d){return ("translate(" + xScale(d.desde) + ",0)");})
								
								var rectangleCargo = cargos.append("rect")
                                    .attr("class", function(d, i) {
                                            if(d.cargo.indexOf("presidente")){
                                                return d.cargoTipo;
                                            }else{
                                                return "presidente " + d.cargoTipo;
                                            }
                                        })
                                    
                                    .attr("height", itemHeight)
                                    .attr("width", function(d, i) {
                                            var finalWidth = xScale(d.hasta) - xScale(d.desde);
                                            if (finalWidth > 0){
                                                return finalWidth-1;                                    
                                            } else {
                                                return 3;
                                            }
                                    	})

                                //Agrego titulo al rect - no anda
								var inLabels = cargos.append("text")
                                    .text(function(d){return d.cargo;})
                                    .attr("x", 3)
                                    .attr("y", 10)
                                    .attr("class","miniLabels")
                                
                                //Agrego subtitulo al rect - no anda
                               	var inLabelitos = cargos.append("text")
                                    .text(function(d){return d.territorio;})
                                    .attr("x", 3)
                                    .attr("y", 19)
                                    .attr("class","miniLabels microLabels")

                                //Agrego funcionalidad del tooltip
                                cargos.on("mouseover", function(d) {      
                                        tooltip.transition()        
                                            .duration(200)      
                                            .style("opacity", .9);      
                                        tooltip.html("<b>"+d.nombre+"</b><br/>"+d.cargo.toUpperCase()+"<br/>"+d.desde+" - "+d.hasta)  
                                            .style("left", (d3.event.pageX) + "px")     
                                            .style("top", (d3.event.pageY - 28) + "px");    
                                        })
                                    .on("mouseout", function(d) {       
                                        tooltip.transition()        
                                            .duration(200)      
                                            .style("opacity", 0);   
                                    });
                            })
                            .attr("transform", function(d, i) {
                                //Cálculo de la variación
                                var posY = d.value.cargoID*(itemHeight + spacingY),
                                posX = 0;
                                return ("translate(" + posX + "," + posY + ")");
                            });

        //Dibuja los años y los ticks                    
        var ticksAxis = newData.anios.map(function(item){return item.anio})
            ticksAxis.push(primerStartingYear - 3 , ultimoEndingYear + 3);
        var xAxis = d3.svg.axis()
                        .scale(xScale)
                        .orient("bottom")
                        .tickFormat(d3.format("0"))
                        .tickValues(ticksAxis);

            svg.append("g").attr("class", "axis")
                .attr("transform", "translate(0," + marginSVG + ")")
                .call(xAxis);
        };
    

    App.getAniosMasUsados = function(data,corte){
            var anios = data.map(function(cargo){return parseInt(cargo['fechainicioyear'])});
                anios.concat(data.map(function(cargo){return parseInt(cargo['fechafinyear'])}));
            var i, count = {};
            for(i=0;i<anios.length;i++){
                if(count[anios[i]]){
                    count[anios[i]]++;
                } else {
                    count[anios[i]] = 1;
                }
            }
            var toOrder = [];
            for(anios in count){
                toOrder.push({ anio : anios, veces : count[anios] });
            }
            return toOrder.sort(function(item1, item2){ return item2.veces - item1.veces }).slice(0,corte);
        }

})(window, document, Tabletop);