document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById('map')) {
        //var mymap = L.map('mapid').setView([55, 38], 8);
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

        L.polyline([[0, -180], [0, 180]], {color: 'red'}).addTo(mymap);
        L.polyline([[-90, 0], [90, 0]], {color: 'red'}).addTo(mymap);
    }


    window.onload = function () {
        var socket = new WebSocket("ws://192.168.153.128:3000/data");

        $('#get_ka').on('click', function(e){
            socket.send(`{"get_data": ${$('#number_ka').val()}}`)
        })

        socket.onmessage = function (event) {
            let data = JSON.parse(event.data);

            console.log(data);
            if (data.trace_data) {
                trace_arr = []
                trace_line = 0;
                trace_arr[trace_line] = []
                for(let point_i in data.trace_data){
                    if (point_i != 0) {
                        if ((Math.sign(data.trace_data[point_i-1][1] > 0))&&(Math.sign(data.trace_data[point_i][1] < 0))) {
                            trace_line++
                            trace_arr[trace_line] = []
                        }
                    }
                    trace_arr[trace_line].push(data.trace_data[point_i])
                }
                console.log(trace_arr);
                L.polyline(trace_arr, {color: 'blue'}).addTo(mymap);
            }
            
            
            

        }
    }
})