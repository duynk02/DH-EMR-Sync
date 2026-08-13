const fs = require('fs');
const express = require('express');
const app = express();
app.use(express.json()); 
const pdf = require('pdf-page-counter');
var axios = require('axios');
var  https = require("https");
axios.defaults.httpsAgent = new https.Agent({
  rejectUnauthorized: false,
})


async function CallAPI(url, data, method,token){  
    var config = {
        method: method,
        url: url,
        headers: { 
            'Authorization': 'Bearer '+token, 
            'Content-Type': 'application/json'
        },
            data : data
    };  
    return axios(config).then(res=>res.data);
}

  module.exports = {
    CallAPI
} 