'use strict';

const request = require('request');
const CronJob = require('cron').CronJob;
require('dotenv').config();
const  { wantedList }  = require('./data/wantedList.js')

const storeDataToJson = (data) => {
    const jsonfile = require('jsonfile');
    jsonfile.writeFile('./log/data.log', data, {flag: 'a'});
}

const errorReporter = (data) => {
    const mailer = require('nodemailer');

    const transporter = mailer.createTransport({
        host: "smtp.yandex.ru",
        port: 465,
        secure: true, // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_LOGIN,
            pass: process.env.EMAIL_PASS,
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_SENDER,
        to: process.env.ADMINEMAIL,
        subject: 'Server-down repport',
        text: `Error detected with server ${data.name}. Error: ${data.error}, server respose code ${data.responsecode}.`
    }

    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
        }
      });
}

const requester = (url, name, storeData, errorReporter) => {
    request(url, (error, response, body) => {
        const out = {
            name: name,
            data: Date.now(),
            error: error,
            responsecode: response && response.statusCode,
        }
        storeData(out);
        if (error || (response.statusCode != 200)) errorReporter(out);
    });
}


const getProcessor = (storeData, errRep) => {
    return function(data) {
        requester(data.url, data.name, storeData, errRep);
    }
}

const processor = getProcessor(storeDataToJson, errorReporter);

const mainLoop = (dataArray, prc) => {
    if (!dataArray) throw new Error('Can\'t process null. Check ./data/wantedList.js');
    if (dataArray.length === 0) throw new Error('Can\'t process an empty array. Check ./data/wantedList.js');
    dataArray.forEach(element => {
        prc(element);
    });
}

new CronJob('* */10 * * * *', function(){
    mainLoop(wantedList, processor);
}, null, true, 'Europe/Moscow');
