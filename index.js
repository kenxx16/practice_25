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

    let test_ka = ephemerisData[1]

    // const MU = 3.986004418e14; // Гравитационный параметр Земли (м^3/с^2)
    // const EARTH_ROTATION_RATE = 7.292115e-5; // Угловая скорость вращения Земли (рад/с)
    // const EARTH_A = 6378136; // Большая полуось эллипсоида ПЗ-90 (м)
    // const EARTH_F = 1/298.25784; // Сжатие эллипсоида ПЗ-90
    // const EARTH_E2 = 2*EARTH_F - EARTH_F*EARTH_F; // Квадрат эксцентриситета

    // function calculateGLONASSPosition(params, currentTime) {
    //     // 1. Извлечение параметров орбиты
    //     const {
    //         T_Omega,    // Время прохождения восходящего узла (с)
    //         T_ob,       // Период обращения (с)
    //         e,          // Эксцентриситет
    //         i,          // Наклонение (град)
    //         L_Omega,    // Долгота восходящего узла (град)
    //         omega,      // Аргумент перигея (град)
    //         DeltaT      // Скорость изменения периода (с/с)
    //     } = params;

    //     // 2. Преобразование единиц
    //     const inclination = i * Math.PI / 180;       // в радианы
    //     const longitudeAscendingNode = L_Omega * Math.PI / 180;
    //     const argumentOfPeriapsis = omega * Math.PI / 180;

    //     // 3. Вычисление среднего движения (n)
    //     const n0 = 2 * Math.PI / T_ob;              // Среднее движение (рад/с)
        
        
    //     const deltaTime = currentTime - T_Omega;     // Время с момента прохождения узла

        
        
    //     const n = n0 + DeltaT * deltaTime;           // Скорректированное среднее движение

        
    //     // console.log(DeltaT * deltaTime);
        
    //     // console.log("n= " + n);
        
    //     // 4. Вычисление средней аномалии (M)
    //     const M = n * deltaTime;


    //     // 5. Решение уравнения Кеплера для эксцентрической аномалии (E)
    //     let E = M;
    //     for (let iter = 0; iter < 10; iter++) {
    //         E = M + e * Math.sin(E);
    //     }
        

    //     // 6. Вычисление истинной аномалии (ν)
    //     const trueAnomaly = 2 * Math.atan2(
    //         Math.sqrt(1 + e) * Math.sin(E / 2),
    //         Math.sqrt(1 - e) * Math.cos(E / 2)
    //     );

    //     console.log(trueAnomaly);
        

        

    //     // 7. Вычисление радиуса-вектора (r)
    //     const a = Math.cbrt(MU / (n * n));           // Большая полуось
    //     const r = a * (1 - e * e) / (1 + e * Math.cos(trueAnomaly));
        

    //     // console.log(r);
        

    //     // 8. Координаты в орбитальной плоскости
    //     const X_orb = r * Math.cos(trueAnomaly);
    //     const Y_orb = r * Math.sin(trueAnomaly);

    //     // 9. Вычисление аргумента широты (θ = ω + ν)
    //     const argumentOfLatitude = argumentOfPeriapsis + trueAnomaly;

    //     // 10. Преобразование в инерциальную систему (ECI)
    //     const cosOmega = Math.cos(longitudeAscendingNode);
    //     const sinOmega = Math.sin(longitudeAscendingNode);
    //     const cosTheta = Math.cos(argumentOfLatitude);
    //     const sinTheta = Math.sin(argumentOfLatitude);
    //     const cosI = Math.cos(inclination);
    //     const sinI = Math.sin(inclination);

    //     const X = X_orb * (cosOmega * cosTheta - sinOmega * sinTheta * cosI) - 
    //              Y_orb * (cosOmega * sinTheta + sinOmega * cosTheta * cosI);
    
    //     const Y = X_orb * (sinOmega * cosTheta + cosOmega * sinTheta * cosI) - 
    //                 Y_orb * (sinOmega * sinTheta - cosOmega * cosTheta * cosI);
        
    //     const Z = (X_orb * sinTheta + Y_orb * cosTheta) * sinI;

    //     const deltaTimeSinceEpoch = currentTime - params.T_Omega;
    
    //     // Угол поворота Земли за это время
    //     const earthRotationAngle = EARTH_ROTATION_RATE * deltaTimeSinceEpoch;
        
    //     // Матрица поворота
    //     const cosRot = Math.cos(earthRotationAngle);
    //     const sinRot = Math.sin(earthRotationAngle);
        
    //     // Преобразование в ECEF
    //     const X_ECEF = X * cosRot + Y * sinRot;
    //     const Y_ECEF = -X * sinRot + Y * cosRot;
    //     const Z_ECEF = Z;

    //     return {
    //         X: X_ECEF,
    //         Y: Y_ECEF,
    //         Z: Z_ECEF,
    //         timestamp: currentTime
    //     };

    //     // 11. Учёт вращения Земли (переход в ECEF)
    //     // const earthRotationAngle = EARTH_ROTATION_RATE * deltaTime;

    //     // console.log(earthRotationAngle);


    //     // //  ???
    //     // const X_ECEF = X * Math.cos(earthRotationAngle) + Y * Math.sin(earthRotationAngle);
    //     // const Y_ECEF = -X * Math.sin(earthRotationAngle) + Y * Math.cos(earthRotationAngle);
    //     // const Z_ECEF = Z;

        
        

    //     // return {
    //     //     X: X_ECEF,
    //     //     Y: Y_ECEF,
    //     //     Z: Z_ECEF,
    //     //     timestamp: currentTime
    //     // };

    //     // return {
    //     //     X: X,
    //     //     Y: Y,
    //     //     Z: Z,
    //     //     timestamp: currentTime
    //     // };

        
    // }

    // function ecefToGeodetic(X, Y, Z) {
    // // Алгоритм преобразования ECEF в геодезические координаты (метод Bowring)
    //     const p = Math.sqrt(X*X + Y*Y);
    //     const theta = Math.atan2(Z * EARTH_A, p * EARTH_A * (1 - EARTH_F));
        
    //     // Первое приближение
    //     let phi = Math.atan2(Z + EARTH_E2 * EARTH_A * Math.pow(Math.sin(theta), 3) / (1 - EARTH_F),
    //                         p - EARTH_E2 * EARTH_A * Math.pow(Math.cos(theta), 3));
        
    //     // Уточняем значение
    //     let N = EARTH_A / Math.sqrt(1 - EARTH_E2 * Math.pow(Math.sin(phi), 2));
    //     let h = p / Math.cos(phi) - N;
        
    //     // Итеративное уточнение (обычно 2-3 итерации достаточно)
    //     for (let i = 0; i < 5; i++) {
    //         N = EARTH_A / Math.sqrt(1 - EARTH_E2 * Math.pow(Math.sin(phi), 2));
    //         h = p / Math.cos(phi) - N;
    //         phi = Math.atan2(Z, p * (1 - EARTH_E2 * N / (N + h)));
    //     }
        
    //     // Вычисляем долготу
    //     const lambda = Math.atan2(Y, X);
        
    //     // Преобразуем в градусы
    //     const latitude = phi * 180 / Math.PI;
    //     const longitude = lambda * 180 / Math.PI;
        
    //     return {
    //         latitude,
    //         longitude,
    //         height: h,
    //         lat: latitude,       // Алиасы для удобства
    //         lon: longitude,
    //         // alt: heightib
    //     };
    // }

    // function ecefToGeodetic2(X, Y, Z) {
    //     // Алгоритм Olson (1996) с улучшениями для полюсов
    //     const p = Math.sqrt(X*X + Y*Y);
    //     const lon = Math.atan2(Y, X);
        
    //     // Начальное приближение
    //     let lat = Math.atan2(Z, p * (1 - EARTH_E2));
    //     let N = EARTH_A / Math.sqrt(1 - EARTH_E2 * Math.sin(lat)*Math.sin(lat));
    //     let h = 0;
        
    //     // Итеративный процесс
    //     for (let i = 0; i < 5; i++) {
    //         const sinLat = Math.sin(lat);
    //         N = EARTH_A / Math.sqrt(1 - EARTH_E2 * sinLat*sinLat);
    //         h = p / Math.cos(lat) - N;
    //         lat = Math.atan2(Z, p * (1 - EARTH_E2 * N/(N + h)));
    //     }
        
    //     // Корректная обработка полюсов
    //     if (Math.abs(p) < 1e-6) {
    //         lat = Z > 0 ? Math.PI/2 : -Math.PI/2;
    //         h = Math.abs(Z) - EARTH_A * Math.sqrt(1 - EARTH_E2);
    //     }
        
    //     return {
    //         latitude: lat * 180/Math.PI,
    //         longitude: lon * 180/Math.PI,
    //         height: h,
    //         lat: lat * 180/Math.PI,
    //         lon: lon * 180/Math.PI,
    //         alt: h
    //     };
    // }

    // Пример использования
    // const glonassParams = {
    //         T_Omega : test_ka.Tomega,    // Время прохождения восходящего узла (с)
    //         T_ob : test_ka.Tapp,       // Период обращения (с)
    //         e : test_ka.e,          // Эксцентриситет
    //         i : test_ka.i,          // Наклонение (град)
    //         L_Omega : test_ka.Lomega,    // Долгота восходящего узла (град)
    //         omega : test_ka.W,      // Аргумент перигея (град)
    //         DeltaT : 0//Number(test_ka.deltaT)      // Скорость изменения периода (с/с)
    //     };

    // console.log(glonassParams);
    





    // Константы
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
    function calculateGlonassPosition(
        baseDate,   // Базовая дата (объект Date в UTC+3)
        Tomega,     // Время прохождения узла (секунды от базовой даты)
        T_period,   // Период обращения (секунды)
        e,          // Эксцентриситет
        i_deg,      // Наклонение орбиты (градусы)
        Lomega_deg, // Долгота восходящего узла (градусы)
        omega_deg,  // Аргумент перигея (градусы)
        delta_t2,   // Поправка времени (секунды)
        delta_T,    // Скорость изменения периода (с/с)
        t_receiver, // Время наблюдения (объект Date в UTC+3)
        offset
    ) {
        // 1. Расчет временных параметров
        // const t_b = baseDate.getTime();   // Временная метка базовой даты (мс)
        // const t_rec = t_receiver.getTime(); // Временная метка наблюдения (мс)
        const t_s = offset;               //(t_rec - t_b) / 1000; // Разница во времени (секунды)
        const t_k = t_s - delta_t2;       // Скорректированное время
        
        // 2. Расчет параметров орбиты
        const a = Math.cbrt(GM * T_period*T_period / (4 * Math.PI*Math.PI)); // Большая полуось
        const n0 = 2 * Math.PI / T_period;   // Среднее движение
        const delta_n = (2 * Math.PI * delta_T) / (T_period * T_period); // Коррекция
        const n = n0 + delta_n;              // Скорректированное движение
        
        // Угловые параметры в радианах
        const i_rad = i_deg * Math.PI / 180;
        const Lomega_rad = Lomega_deg * Math.PI / 180;
        const omega_rad = omega_deg * Math.PI / 180;
        
        // 3. Расчет аномалий
        const M0 = -omega_rad;              // Средняя аномалия на эпоху
        const M_k = M0 + n * t_k;           // Средняя аномалия
        const E_k = solveKepler(M_k, e);    // Эксцентрическая аномалия
        
        // Истинная аномалия
        const sinE = Math.sin(E_k);
        const cosE = Math.cos(E_k);
        const sin_nu = Math.sqrt(1 - e*e) * sinE / (1 - e * cosE);
        const cos_nu = (cosE - e) / (1 - e * cosE);
        const nu_k = Math.atan2(sin_nu, cos_nu);
        
        // Аргумент широты
        const u_k = nu_k + omega_rad;
        
        // 4. Координаты в орбитальной плоскости
        const r_k = a * (1 - e * cosE);
        const X_orb = r_k * Math.cos(u_k);
        const Y_orb = r_k * Math.sin(u_k);
        
        // 5. Преобразование в инерциальную систему
        const Omega_k = Lomega_rad + (OMEGA_DOT - OMEGA_E) * t_k - OMEGA_E * Tomega;
        
        const cos_Omega = Math.cos(Omega_k);
        const sin_Omega = Math.sin(Omega_k);
        const cos_i = Math.cos(i_rad);
        const sin_i = Math.sin(i_rad);
        
        const X_iner = X_orb * cos_Omega - Y_orb * cos_i * sin_Omega;
        const Y_iner = X_orb * sin_Omega + Y_orb * cos_i * cos_Omega;
        const Z_iner = Y_orb * sin_i;
        
        // 6. Учет вращения Земли
        const theta_k = OMEGA_E * t_s;
        const cos_theta = Math.cos(theta_k);
        const sin_theta = Math.sin(theta_k);
        
        const X_earth = X_iner * cos_theta + Y_iner * sin_theta;
        const Y_earth = -X_iner * sin_theta + Y_iner * cos_theta;
        const Z_earth = Z_iner;
        
        // 7. Преобразование в геодезические координаты
        // return cartesianToGeodetic(X_earth, Y_earth, Z_earth);
        return cartesianToGeodetic(X_iner, Y_iner, Z_iner);
    }

    // Пример использования
    let [day, month, year] = test_ka.datetime.split('.')
    const baseDate = new Date(+('20'+year), +month - 1, +day); // UTC+3
    const t_receiver = new Date(+('20'+year), +month - 1, +day); // UTC+3


    


    //         T_Omega : test_ka.Tomega,    // Время прохождения восходящего узла (с)
    //         T_ob : test_ka.Tapp,       // Период обращения (с)
    //         e : test_ka.e,          // Эксцентриситет
    //         i : test_ka.i,          // Наклонение (град)
    //         L_Omega : test_ka.Lomega,    // Долгота восходящего узла (град)
    //         omega : test_ka.W,      // Аргумент перигея (град)
    //         DeltaT : 0//Number(test_ka.deltaT)      // Скорость изменения периода (с/с)



    const currentTime = 0; // Текущее время (1.5 часа после 00:00)

    let trace = []
    for (let currentTime = 0; currentTime < 120000; currentTime+=60) {
        t_receiver.setSeconds(baseDate.getSeconds() + currentTime);
        const result = calculateGlonassPosition(
            baseDate,   // Базовая дата
            test_ka.Tomega,          // Tomega (сек)
            test_ka.Tapp,      // T_period (сек) ≈ 11.25 часа
            test_ka.e,      // e
            test_ka.i,       // i_deg
            test_ka.Lomega,       // Lomega_deg
            test_ka.W,       // omega_deg
            test_ka.deltaT2,     // delta_t2
            test_ka.deltaT,          // delta_T
            t_receiver,  // Время наблюдения
            currentTime
        );

        // const position = calculateGLONASSPosition(glonassParams, currentTime);
        // const geodetic = ecefToGeodetic2(position.X, position.Y, position.Z);
        trace.push([result.latitude.toFixed(6), result.longitude.toFixed(6)])
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