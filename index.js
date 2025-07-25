const fs = require('fs')
const path = require('path')
const http = require('http')
const url = require('url')
const ws = require('ws')

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

fs.readFile('site/index.html',
    function(err, data){
        if(err){
            throw err
        }
        htmlFile = data
    }
)

let server = http.createServer(function(req, res){    
    switch (req.url){
        case "/":
            res.writeHead(200, {"Content-Type": "text/html"})
            res.write(htmlFile)
            res.end()
            break;
        default:
            fs.readFile('site/' + req.url, (err, fileContent)=>{                
                let contentType = 'text/html'
                if (req.url.endsWith('.css')) contentType = 'text/css'
                if (req.url.endsWith('.js')) contentType = 'text/javascript'
                if (req.url.endsWith('.svg')) contentType = 'image/svg+xml'
                if (!err) { // страница существует
                    res.writeHead(200, {"Content-Type": contentType});
                    res.write(fileContent);
                    res.end();
                }else{
                    console.log(req.url + ' не найден');
                }
            })
    }
})

async function getEphemeris(){
    return await fetch("https://glonass-iac.ru/glonass/ephemeris/ephemeris_json.php", {
        method: 'GET'
    })
    .catch(error => {
        return error;
    })
    .then(response => {
        return response.json();
    })
}

async function getStatus(){
    return await fetch("https://glonass-iac.ru/glonass/hour_monitoring/hour_json.php?n_sys=2&first=1", {
        method: 'GET'
    })
    .catch(error => {
        return error;
    })
    .then(response => {
        return response.json();
    })
}

async function calcTrace(test_ka) {
    const GM = 3.986004418e14;   // Геоцентрическая гравитационная постоянная (м³/с²)
    const OMEGA_E = 7.292115e-5; // Угловая скорость вращения Земли (рад/с)
    const OMEGA_DOT = -2.5467e-9; // Скорость прецессии орбиты ГЛОНАСС (рад/с)
    const A_PZ90 = 6378136.0;    // Большая полуось эллипсоида ПЗ-90 (м)
    const F_PZ90 = 1 / 298.25784; // Сжатие эллипсоида ПЗ-90

    // Решение уравнения Кеплера методом Ньютона
    function solveKepler(M, e, maxIter = 50, tol = 1e-12) {
        let E = M;
        for (let i = 0; i < maxIter; i++) {
            const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
            E -= dE;
            if (Math.abs(dE) < tol) break;
        }
        return E;
    }

    // Преобразование декартовых координат в геодезические (ПЗ-90)
    function cartesianToGeodetic(x, y, z) {
        const a = A_PZ90;
        const f = F_PZ90;
        const b = a * (1 - f);           // Малая полуось
        const e2 = (a*a - b*b) / (a*a);  // Квадрат эксцентриситета
        const ep2 = (a*a - b*b) / (b*b); // Квадрат второго эксцентриситета
        
        const p = Math.sqrt(x*x + y*y);
        let lon = Math.atan2(y, x);
        
        // Начальное приближение широты
        let lat = Math.atan2(z, p * (1 - e2));
        let h = 0;
        let N = a;
        
        // Итерационный метод Хирвонена
        for (let i = 0; i < 10; i++) {
            const sinLat = Math.sin(lat);
            N = a / Math.sqrt(1 - e2 * sinLat*sinLat);
            h = p / Math.cos(lat) - N;
            const latNew = Math.atan2(z, p * (1 - e2 * N/(N + h)));
            
            if (Math.abs(latNew - lat) < 1e-12) {
                lat = latNew;
                break;
            }
            lat = latNew;
        }
        
        return {
            latitude: lat * 180 / Math.PI, // в градусах
            longitude: lon * 180 / Math.PI, // в градусах
            height: h                      // в метрах
        };
    }

    // Главная функция расчета координат спутника



    function calculateGLONASSPosition(almanac, currentDate = new Date()) {
        const MU = 3.986004418e14;     // Гравитационный параметр Земли (м³/с²)
        const EARTH_RATE = 7.292115e-5; // Угловая скорость вращения Земли (рад/с)
        const RAD_TO_DEG = 180 / Math.PI;
        const DEG_TO_RAD = Math.PI / 180;

        // console.log(almanac);

        


        // 1. Парсинг базовой даты и расчет T0 (момент восходящего узла в UTC+3)
        const [day, month, year] = almanac.date.split('.').map(Number);
        const fullYear = 2000 + year;
        
        // Создание даты в UTC+3 (Московское время)
        const baseDate = new Date(Date.UTC(fullYear, month - 1, day, 0, 0, 0));
        const t0 = baseDate.getTime() + almanac.TΩ * 1000;

        // console.log(t0);
        
        
        // 2. Расчет времени, прошедшего с T0 (в секундах)
        const Δt = (currentDate.getTime() - t0) / 1000 + almanac.offset;

        // console.log(Δt);
        
        
        // 3. Расчет драконического периода
        const T_drak = almanac.Tоб + almanac.ΔT * Δt;
        // console.log(almanac.Tоб + almanac.ΔT * Δt);
        
        
        // 4. Расчет средней аномалии на момент TΩ
        const ω_rad = almanac.ω * DEG_TO_RAD;
        const ν0 = -ω_rad; // Истинная аномалия в момент TΩ
        
        // Расчет эксцентрической аномалии E0 через истинную аномалию ν0
        const E0 = 2 * Math.atan(Math.sqrt((1 - almanac.e) / (1 + almanac.e)) * Math.tan(ν0 / 2));
        const M0 = E0 - almanac.e * Math.sin(E0);

        // console.log(M0);
        
        
        // 5. Средняя аномалия на текущий момент
        const M = M0 + (2 * Math.PI * Δt) / T_drak;

        // console.log(M);
        
        
        // 6. Решение уравнения Кеплера (метод Ньютона)
        let E = M;
        for (let i = 0; i < 10; i++) {
            const f = E - almanac.e * Math.sin(E) - M;
            const f_prime = 1 - almanac.e * Math.cos(E);
            E -= f / f_prime;
            if (Math.abs(f) < 1e-8) break;
        }
        
        // 7. Расчет истинной аномалии и аргумента широты
        const ν = 2 * Math.atan(Math.sqrt((1 + almanac.e) / (1 - almanac.e)) * Math.tan(E / 2));
        const u = ν + ω_rad;
        
        // 8. Расчет большой полуоси и радиус-вектора
        const a = Math.pow((T_drak * Math.sqrt(MU)) / (2 * Math.PI), 2 / 3);
        const r = a * (1 - almanac.e * Math.cos(E));
        
        // 9. Координаты в орбитальной плоскости
        const x_orb = r * Math.cos(u);
        const y_orb = r * Math.sin(u);

        // console.log(x_orb, y_orb);
        
        
        // 10. Преобразование в земную систему координат (на момент TΩ)
        const i_rad = almanac.i * DEG_TO_RAD;
        const LΩ_rad = almanac.LΩ * DEG_TO_RAD;
        
        const X0 = x_orb * Math.cos(LΩ_rad) - y_orb * Math.cos(i_rad) * Math.sin(LΩ_rad);
        const Y0 = x_orb * Math.sin(LΩ_rad) + y_orb * Math.cos(i_rad) * Math.cos(LΩ_rad);
        const Z0 = y_orb * Math.sin(i_rad);
        
        // 11. Учет вращения Земли
        const rotationAngle = - EARTH_RATE * Δt;
        const cosθ = Math.cos(rotationAngle);
        const sinθ = Math.sin(rotationAngle);
        
        const X = X0 * cosθ - Y0 * sinθ;
        const Y = X0 * sinθ + Y0 * cosθ;
        const Z = Z0;

        // console.log(X, Y, Z);
        
        
        return cartesianToGeodetic( X, Y, Z ); // Координаты в системе ПЗ-90 (метры)
    }

    

    
    let [day, month, year] = test_ka.datetime.split('.')
    const baseDate = new Date(+('20'+year), +month - 1, +day); // UTC+3
    const t_receiver = new Date(+('20'+year), +month - 1, +day); // UTC+3

    let trace = []
    for (let currentTime = 0; currentTime > -45000; currentTime-=60) {
        t_receiver.setSeconds(baseDate.getSeconds() + currentTime);
        // const result = calculateGlonassPosition(
        //     baseDate,   // Базовая дата
        //     test_ka.Tomega,          // Tomega (сек)
        //     test_ka.Tapp,      // T_period (сек) ≈ 11.25 часа
        //     test_ka.e,      // e
        //     test_ka.i,       // i_deg
        //     test_ka.Lomega,       // Lomega_deg
        //     test_ka.W,       // omega_deg
        //     test_ka.deltaT2,     // delta_t2
        //     test_ka.deltaT,          // delta_T
        //     t_receiver,  // Время наблюдения
        //     currentTime
        // );
        // trace.push([result.latitude.toFixed(6), result.longitude.toFixed(6)])


        const almanac = {
            ns: test_ka.ns,             // Номер спутника
            date: test_ka.datetime,   // Базовая дата (ДД.ММ.ГГ)
            TΩ: +test_ka.Tomega,          // Время восходящего узла (секунды)
            Tоб: +test_ka.Tapp,         // Период обращения (секунды)
            e: +test_ka.e,           // Эксцентриситет
            i: +test_ka.i,            // Наклонение (градусы)
            LΩ: +test_ka.Lomega,          // Долгота восходящего узла (градусы)
            ω: +test_ka.W,            // Аргумент перигея (градусы)
            δt2: +test_ka.deltaT2,        // Поправка времени (секунды)
            nl: 2,              // Номер литерной частоты
            ΔT: Number(test_ka.deltaT),        // Скорость изменения периода
            offset: currentTime
        };

        const currentDate = new Date();
        const coordinates = calculateGLONASSPosition(almanac, currentDate);
        let stat = 1
        if (currentTime < -30000 && currentTime > -35000 && test_ka.ns == "06") {
            stat = 15
        }
        trace.push([coordinates.latitude.toFixed(6), coordinates.longitude.toFixed(6), stat])
    }
    return trace
}

async function getData(){
    return await new Promise(async (resolve, reject) => {
        let ephemerisData = await getEphemeris()
        let statusData = await getStatus()

        console.log(statusData);

        for (const stat of statusData) {
            if (stat.name != "flags") {
                console.log(stat.data);
                
            }
        }
        
        var trace_arr = []
        for(let ka of ephemerisData){            
            let trace = await calcTrace(ka);
            if (Number(ka.ns)<9) {
                trace_arr[Number(ka.ns)] = trace
            }
        }
        return resolve(trace_arr)
    })
}

server.listen(3000, function () {
    console.log("SERVER START");
})


const wss1 = new ws.Server({ noServer: true });
var clients = {};

wss1.on('connection', async function connection(ws) {
    let id = Math.random();
    clients[id] = ws;
    console.log("новое соединение " + id);



    clients[id].send('{"status": "OK"}');

    let out_data = await getData()
    clients[id].send(`{"trace_data_arr": ${JSON.stringify(out_data)}}`);


    ws.on('close', function() {
        console.log('соединение закрыто ' + id);
        delete clients[id];
    });
})

server.on('upgrade', function upgrade(request, socket, head) {
    const pathname = url.parse(request.url).pathname;
    if (pathname === '/data') {
        wss1.handleUpgrade(request, socket, head, function done(ws) {
            wss1.emit('connection', ws, request);
        });
    } else {
        socket.destroy();
    }
});