document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById('map')) {

        var mymap = L.map('map', {preferCanvas: true}).setView([15, 55], 2);

        var googleSat = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',{
            subdomains:['mt0','mt1','mt2','mt3']
        })

        var gis = L.tileLayer('https://tile4.maps.2gis.com/tiles?x={x}&y={y}&z={z}', { attribution: '<a href="https://2gis.ru/">2GIS Map</a>' }).addTo(mymap)

        var baseMaps = {
            "2gis": gis,
            "Спутник": googleSat,
        };

        var control = L.control.layers(baseMaps, null, { collapsed:true }).addTo(mymap);


    }

    var statusMap_Extended = {
        "0": {color: "#ebebeb", title: "Нет данных"},
        "1": {color: "#008000", title: "Здоров"},
        "2": {color: "#ff0000", title: "Болен"},
        "3": {color: "#95a700", title: "Старые эфемериды"},
        "4": {color: "#ff00de", title: "Большая ошибка потребителя"},
        "5": {color: "#1c2aff", title: "Непригоден по альманаху и эфемеридам"},
        "6": {color: "#00cd00", title: "Отсутствует сигнал"},
        "7": {color: "#9900d8", title: "Отсутствуют эфемериды"},
        "8": {color: "#5b0081", title: "Некорректные эфемериды"},
        "9": {color: "#1c7fc8", title: "Непригоден по альманаху"},
        "10": {color: "#ecf3e2", title: "Недостаточно данных"},
        "11": {color: "#b6ff45", title: "Смешанное состояние"},
        "66": {color: "#000000", title: "Ошибка сервиса мониторинга"},
        "15": {color: "#008000", title: "Здоров"}
    };

    var statusMap = {
        "0": {color: "#e9e9e9", title: "Нет данных"},
        "1": {color: "#008000", title: "Здоров"},
        "2": {color: "#ff0000", title: "Болен"},
        "3": {color: "#b6ff45", title: "Недостаточно данных"},
        "4": {color: "#ff00de", title: "Большая ошибка потребителя"},
        "5": {color: "#ff0000", title: "Болен"},
        "6": {color: "#b6ff45", title: "Недостаточно данных"},
        "7": {color: "#b6ff45", title: "Недостаточно данных"},
        "8": {color: "#5b0081", title: "Некорректные данные"},
        "9": {color: "#ff0000", title: "Болен"},
        "10": {color: "#ecf3e2", title: "Нет данных"},
        "11": {color: "#b6ff45", title: "Недостаточно данных"},
        "66": {color: "#ecf3e2", title: "Нет данных"},
        "15": {color: "#008000", title: "Здоров"}
    };

    var satIcon = L.icon({
        iconUrl: '/assets/leaflet/images/satellite.svg',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -18],
        tooltipAnchor: [0, -36]
    });




    window.onload = function () {
        var socket = new WebSocket("ws://localhost:3000/data");

        // $('#get_ka').on('click', function(e){
        //     socket.send(`{"get_data": ${$('#number_ka').val()}}`)
        // })

        socket.onmessage = function (event) {
            let data = JSON.parse(event.data);


            if (data.trace_data_arr) {
                console.log(data.trace_data_arr);
                

                for (let ns of data.trace_data_arr) {
                    
                    trace_arr = []
                    trace_line = 0;
                    trace_arr[trace_line] = []
                    for(let point_i in ns){
                        if (point_i != 0) {
                            if ((Math.sign(ns[point_i-1][1] > 0))&&(Math.sign(ns[point_i][1] < 0))) {
                                trace_line++
                                trace_arr[trace_line] = []
                            }

                            if ((Math.sign(ns[point_i-1][1] < 0))&&(Math.sign(ns[point_i][1] > 0))) {
                                trace_line++
                                trace_arr[trace_line] = []
                            }
                        }
                        trace_arr[trace_line].push(ns[point_i])
                    }
                    console.log(trace_arr);
                    // L.polyline(trace_arr, {color: 'blue'}).addTo(mymap);    
                        var hotlineLayer = L.hotline(trace_arr, {
                            min: 0,
                            max: 15,
                            palette: {
                                0: '#008000',
                                1: '#ff0000'
                            },
                            weight: 2,
                            outlineColor: '#9b9b9bff',
                            outlineWidth: 1
                        }).addTo(mymap);        
                }

                for (let ns in data.trace_data_arr) {
                    if(data.trace_data_arr[ns] == null) continue

                    let last_position = data.trace_data_arr[ns][0]

                    L.marker(last_position, {'title': ns, icon: satIcon})
                    .bindTooltip('<b>' +  ns  + '</b>', {permanent: true, className: 'plane' +  ns, offset: [0, 0], opacity: 0.7, sticky:true})
                    .addTo(mymap)
                }
                
            }
            
        }
    }
})