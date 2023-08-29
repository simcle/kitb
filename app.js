require('dotenv').config()
const modbusRTU = require('modbus-serial');
const mqtt = require('mqtt');

const db = require('./config');
const constroller = require('./controller');
const device_id = parseInt(process.env.DEVICE_ID)

const client  = mqtt.connect('mqtts://mqtt.ndpteknologi.com:8883', {
    username:'kitb',
    password: 'pwlan123',
    keepalive: 30,
    will: {
        topic: `kitb/status/${device_id}`,
        payload: "offline",
        qos: 0
    }
})

db.serialize( function () {
    let sql = `CREATE TABLE IF NOT EXISTS sensor(
        device_id NUMERIC,
        ph REAL,
        temp REAL,
        cod REAL,
        tss REAL,
        nh3n REAL,
        debit REAL,
        timestamp NUMERIC
    );`;
    db.run(sql)
})

let sensor = {
    device_id: device_id,
    ph: 0.000,
    temp: 0.000,
    cod: 0.000,
    tss: 0.000,
    nh3n: 0.000,
    debit: 0.000,
    timestamp: ''
};

const chemin = new modbusRTU();
chemin.connectRTUBuffered('/dev/ttyAMA3', {baudRate: 9600});

const flow = new modbusRTU();
flow.connectRTUBuffered('/dev/ttyAMA0', {baudRate: 9600});


// GET DATA FROM DEVICE
setInterval(() => {
    let date = new Date()
    let now = Math.round(date.getTime() / 1000);

    chemin.readHoldingRegisters(8, 48, (err, data) => {
        sensor.ph = data.buffer.readFloatBE(0).toFixed(3)
        sensor.temp = data.buffer.readFloatBE(4).toFixed(3)
        sensor.nh3n = data.buffer.readFloatBE(24).toFixed(3)
        sensor.cod = data.buffer.readFloatBE(48).toFixed(3)
        sensor.tss = data.buffer.readFloatBE(88).toFixed(3)
    })

    flow.readHoldingRegisters(0, 10, (err, data) => {
        console.log(err, data)
    })

    sensor.timestamp = now

    let data = JSON.stringify(sensor)

    client.publish(`kitb/status/${device_id}`, 'online')

    client.publish(`kitb/sensor/${device_id}`, data)

}, 500)

setInterval(() => {
    constroller.postData(sensor)
}, 120000)
