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

async function getData(){
    let ephemerisData = await getEphemeris()
    let statusData = await getStatus()
    console.log(ephemerisData[0]);

    let test_ka = ephemerisData[0]

    const MU = 3.986004418e14; // Гравитационный параметр Земли (м^3/с^2)
    const EARTH_ROTATION_RATE = 7.292115e-5; // Угловая скорость вращения Земли (рад/с)
    const EARTH_A = 6378136; // Большая полуось эллипсоида ПЗ-90 (м)
    const EARTH_F = 1/298.25784; // Сжатие эллипсоида ПЗ-90
    const EARTH_E2 = 2*EARTH_F - EARTH_F*EARTH_F; // Квадрат эксцентриситета

    function calculateGLONASSPosition(params, currentTime) {
        // 1. Извлечение параметров орбиты
        const {
            T_Omega,    // Время прохождения восходящего узла (с)
            T_ob,       // Период обращения (с)
            e,          // Эксцентриситет
            i,          // Наклонение (град)
            L_Omega,    // Долгота восходящего узла (град)
            omega,      // Аргумент перигея (град)
            DeltaT      // Скорость изменения периода (с/с)
        } = params;

        // 2. Преобразование единиц
        const inclination = i * Math.PI / 180;       // в радианы
        const longitudeAscendingNode = L_Omega * Math.PI / 180;
        const argumentOfPeriapsis = omega * Math.PI / 180;

        // 3. Вычисление среднего движения (n)
        const n0 = 2 * Math.PI / T_ob;              // Среднее движение (рад/с)
        
        
        const deltaTime = currentTime - T_Omega;     // Время с момента прохождения узла

        
        
        const n = n0 + DeltaT * deltaTime;           // Скорректированное среднее движение

        
        // console.log(DeltaT * deltaTime);
        
        // console.log("n= " + n);
        
        // 4. Вычисление средней аномалии (M)
        const M = n * deltaTime;


        // 5. Решение уравнения Кеплера для эксцентрической аномалии (E)
        let E = M;
        for (let iter = 0; iter < 10; iter++) {
            E = M + e * Math.sin(E);
        }
        

        // 6. Вычисление истинной аномалии (ν)
        const trueAnomaly = 2 * Math.atan2(
            Math.sqrt(1 + e) * Math.sin(E / 2),
            Math.sqrt(1 - e) * Math.cos(E / 2)
        );

        

        // 7. Вычисление радиуса-вектора (r)
        const a = Math.cbrt(MU / (n * n));           // Большая полуось
        const r = a * (1 - e * e) / (1 + e * Math.cos(trueAnomaly));

        // console.log(r);
        

        // 8. Координаты в орбитальной плоскости
        const X_orb = r * Math.cos(trueAnomaly);
        const Y_orb = r * Math.sin(trueAnomaly);

        // 9. Вычисление аргумента широты (θ = ω + ν)
        const argumentOfLatitude = argumentOfPeriapsis + trueAnomaly;

        // 10. Преобразование в инерциальную систему (ECI)
        const cosOmega = Math.cos(longitudeAscendingNode);
        const sinOmega = Math.sin(longitudeAscendingNode);
        const cosTheta = Math.cos(argumentOfLatitude);
        const sinTheta = Math.sin(argumentOfLatitude);
        const cosI = Math.cos(inclination);
        const sinI = Math.sin(inclination);

        const X = X_orb * (cosOmega * cosTheta - sinOmega * sinTheta * cosI) - 
                Y_orb * (cosOmega * sinTheta + sinOmega * cosTheta * cosI);
        
        const Y = X_orb * (sinOmega * cosTheta + cosOmega * sinTheta * cosI) - 
                Y_orb * (sinOmega * sinTheta - cosOmega * cosTheta * cosI);
        
        const Z = (X_orb * sinTheta + Y_orb * cosTheta) * sinI;

        // 11. Учёт вращения Земли (переход в ECEF)
        const earthRotationAngle = EARTH_ROTATION_RATE * deltaTime;

        // console.log("earthRotationAngle= " + earthRotationAngle);

        const X_ECEF = X * Math.cos(earthRotationAngle) + Y * Math.sin(earthRotationAngle);
        const Y_ECEF = -X * Math.sin(earthRotationAngle) + Y * Math.cos(earthRotationAngle);
        const Z_ECEF = Z;

        console.log(X_ECEF);
        

        return {
            X: X_ECEF,
            Y: Y_ECEF,
            Z: Z_ECEF,
            timestamp: currentTime
        };
    }

    function ecefToGeodetic(X, Y, Z) {
    // Алгоритм преобразования ECEF в геодезические координаты (метод Bowring)
        const p = Math.sqrt(X*X + Y*Y);
        const theta = Math.atan2(Z * EARTH_A, p * EARTH_A * (1 - EARTH_F));
        
        // Первое приближение
        let phi = Math.atan2(Z + EARTH_E2 * EARTH_A * Math.pow(Math.sin(theta), 3) / (1 - EARTH_F),
                            p - EARTH_E2 * EARTH_A * Math.pow(Math.cos(theta), 3));
        
        // Уточняем значение
        let N = EARTH_A / Math.sqrt(1 - EARTH_E2 * Math.pow(Math.sin(phi), 2));
        let h = p / Math.cos(phi) - N;
        
        // Итеративное уточнение (обычно 2-3 итерации достаточно)
        for (let i = 0; i < 3; i++) {
            N = EARTH_A / Math.sqrt(1 - EARTH_E2 * Math.pow(Math.sin(phi), 2));
            h = p / Math.cos(phi) - N;
            phi = Math.atan2(Z, p * (1 - EARTH_E2 * N / (N + h)));
        }
        
        // Вычисляем долготу
        const lambda = Math.atan2(Y, X);
        
        // Преобразуем в градусы
        const latitude = phi * 180 / Math.PI;
        const longitude = lambda * 180 / Math.PI;
        
        return {
            latitude,
            longitude,
            height: h,
            lat: latitude,       // Алиасы для удобства
            lon: longitude,
            // alt: heightib
        };
    }

    // Пример использования
    const glonassParams = {
            T_Omega : test_ka.Tomega,    // Время прохождения восходящего узла (с)
            T_ob : test_ka.Tapp,       // Период обращения (с)
            e : test_ka.e,          // Эксцентриситет
            i : test_ka.i,          // Наклонение (град)
            L_Omega : test_ka.Lomega,    // Долгота восходящего узла (град)
            omega : test_ka.W,      // Аргумент перигея (град)
            DeltaT : 0//Number(test_ka.deltaT)      // Скорость изменения периода (с/с)
        };

    console.log(glonassParams);
    

    const currentTime = 0; // Текущее время (1.5 часа после 00:00)

    let trace = []
    for (let currentTime = 0; currentTime < 40000; currentTime+=60) {
        const position = calculateGLONASSPosition(glonassParams, currentTime);
        const geodetic = ecefToGeodetic(position.X, position.Y, position.Z);
        trace.push([geodetic.latitude.toFixed(6), geodetic.longitude.toFixed(6)])
    }
    

    // console.log("Координаты спутника ГЛОНАСС (ECEF):");
    // console.log(`X: ${position.X.toFixed(2)} м`);
    // console.log(`Y: ${position.Y.toFixed(2)} м`);
    // console.log(`Z: ${position.Z.toFixed(2)} м`);

    

    // console.log("Геодезические координаты спутника ГЛОНАСС:");
    // console.log(`Широта: ${geodetic.latitude.toFixed(6)}°`);
    // console.log(`Долгота: ${geodetic.longitude.toFixed(6)}°`);
    // console.log(`Высота: ${geodetic.height.toFixed(2)} м`);
    return trace
}

server.listen(3000, function () {
    console.log("SERVER START");
    // getData()
})


const wss1 = new ws.Server({ noServer: true });
var clients = {};

wss1.on('connection', function connection(ws) {
    let id = Math.random();
    clients[id] = ws;
    console.log("новое соединение " + id);
    clients[id].send('{"status": "OK"}');

    ws.on('message', async function(message) {
        let json_res = JSON.parse(message)
        if (json_res.get_data) {
            let out_data = await getData()
            clients[id].send(`{"trace_data": ${JSON.stringify(out_data)}}`);
        }
    })

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