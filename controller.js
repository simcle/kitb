require('dotenv').config();
const axios = require('axios');
const sign = require('jwt-encode');
const isOnlie = require('is-online');
const db = require('./config');

const klhk_url = process.env.KLHK_URL
const klhkUID = process.env.KLHK_UID
const baseAPI = process.env.BASE_API
const token = process.env.TOKEN
const sparing =  parseInt(process.env.SPARING)
exports.postData = async (sensor) => {
    let secret;
    if(sparing) {
        axios.get(klhk_url+'/klhk/secret-sensor')
        .then(res => {
            secret = res.data
            db.serialize(function() {
                let sql = `SELECT * FROM sensor`
                db.all(sql, (err, data) => {
                    if(err) throw err
                    if(data.length > 0) {
                        (async () => {
                            for(const sensor of data) {
                                await onlineData(sensor, secret)
                            }
                            let sql = `DELETE FROM sensor`;
                            db.run(sql)
                            await onlineData(sensor, secret);
                        })();
                    } else {
                        (async () => {
                            await onlineData(sensor, secret);
                        })();
                    }
                })
            })
        })
        .catch (() => {
            offlineData(sensor);
        })
    } else {
        isOnlie ()
        .then(res => {
            if(res) {
                db.serialize(function() {
                    let sql = `SELECT * FROM sensor`
                    db.all(sql, (err, data) => {
                        if(err) throw err
                        if(data.length > 0) {
                            (async () => {
                                for(const sensor of data) {
                                    await onlineData(sensor, secret)
                                }
                                let sql = `DELETE FROM sensor`;
                                db.run(sql)
                                await onlineData(sensor, secret);
                            })();
                        } else {
                            (async () => {
                                await onlineData(sensor, secret);
                            })();
                        }
                    })
                })
            } else {
                offlineData(sensor);
            }
        })
       
    }

}

async function onlineData (sensor, secret) {
    if(sparing) {
        let klhk = {
            uid: klhkUID,
            datetime: sensor.timestamp,
            pH: sensor.ph,
            cod: sensor.cod,
            tss: sensor.tss,
            nh3n: sensor.nh3n,
            debit: sensor.debit / 60
        }
        const jwt =  sign(klhk, secret)
        await axios.post(klhk_url+'/server-uji', {
            token: jwt
        })
        .then(res => {
            console.log(res.data);
        })
        .catch(err => {
            console.log(err)
        })
        await axios.post(baseAPI +'/modbus', sensor, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
        .then(() => {

        })
        .catch(err => {
            console.log(err)
        })
    } else {
        await axios.post(baseAPI +'/modbus', sensor, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
        .then(res => {
            console.log('OK')
        })
        .catch(() => {
            offlineData(sensor)
        })
    }
}

async function offlineData (sensor) {
    db.serialize(function() {
        let sql = `INSERT INTO sensor(device_id, ph, temp, cod, tss, nh3n, debit, timestamp) VALUES('${sensor.device_id}','${sensor.ph}','${sensor.temp}','${sensor.cod}','${sensor.tss}','${sensor.nh3n}','${sensor.debit}','${sensor.timestamp}')`
        db.run(sql, (err) => {
            if(err) throw err;
        })
    })
}