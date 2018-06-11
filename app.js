var https = require("https");
const dotenv = require('dotenv')
require('dotenv').config();
const NewsAPI = require('newsapi');
const newsapi = new NewsAPI('92eebfb88d814cf99943ec3da40a721f');
var currentdate = new Date();
////// Event registry
var erBase = require("eventregistry");
var er = new erBase.EventRegistry({apiKey: "49a568f0-fccd-42b5-8b64-ffb3c0820c10"});
var newsSource;
var newsList = "";


var express = require('express');
var request = require('request');
const RC = require('ringcentral');
var bodyParser = require('body-parser');
var nodeoutlook = require('nodejs-nodemailer-outlook');

var news_fields = {
    "title" : "",
    "value": "",
    "style" : ""
}

var latest_news = new Array();
latest_news = [news_fields];


const PORT= process.env.PORT;
const REDIRECT_HOST= process.env.REDIRECT_HOST;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const RINGCENTRAL_ENV= process.env.RINGCENTRAL_ENV;




var app = express();
app.use(bodyParser.json());
var platform, subscription, rcsdk, subscriptionId, bot_token;


// Lets start our server
app.listen(PORT, function () {
    //Callback triggered when server is successfully listening. Hurray!
    console.log("Example app listening on port " + PORT);
});


// This route handles GET requests to our root ngrok address and responds with the same "Ngrok is working message" we used before
app.get('/', function(req, res) {
    res.send('Ngrok is working! Path Hit: ' + req.url);
});


rcsdk = new RC({
    server: RINGCENTRAL_ENV,
    appKey: CLIENT_ID,
    appSecret: CLIENT_SECRET
});

platform = rcsdk.platform();

//Authorization callback method.
app.get('/oauth', function (req, res) {
    if(!req.query.code){
        res.status(500);
        res.send({"Error": "Looks like we're not getting code."});
        console.log("Looks like we're not getting code.");
    }else {
        platform.login({
            code : req.query.code,
            redirectUri : REDIRECT_HOST + '/oauth'
        }).then(function(authResponse){
            var obj = authResponse.json();
            bot_token = obj.access_token;
            console.log(bot_token);
            res.send(obj)
            subscribeToGlipEvents();
        }).catch(function(e){
            console.error(e)
            res.send("Error: " + e);
        })
    }
});

// Callback method received after subscribing to webhook
app.post('/callback', function (req, res) {
    var validationToken = req.get('Validation-Token');
    console.log('The Validation token is : ' +validationToken );

    if(validationToken) {
        console.log('Responding to RingCentral as last leg to create new Webhook');
        res.setHeader('Validation-Token', validationToken);
        res.status(200).json({
            message: 'Set Header Validation'
        });
    } else {
        var data = JSON.parse(JSON.stringify(req.body));
        console.log(data);
        console.log(typeof(data));
        console.log(data.body.text);
        //console.log(req.body);
        res.status(200).send(req.body);
        
        //// Post to Glip

        if (data.body.text==='Help') {
            platform.post('/glip/posts', {
                groupId: data.body.groupId,
                text: "Help Command",
                attachments:[{
                    "type": "Card",
                    "fallback": "Attachment fallback text",
                    "color": "#00ff2a",
                    "intro": "",
                      "author": {
                        "name": "Help",
                        "uri": "",
                        "iconUri": ""
                      },
                    "title": "",
                    "text": "",
                    "imageUri": "",
                    "thumbnailUri": "",
                    "fields": [
                      {
                        "title": "News bot commands",
                        "value": " For news from various sources type the source-type \n examples:\n abc-news\,\n financial-times,\n fortune,\n hacker-news,\n info-money,\n msnbc,\n techcrunch",
                        "style": "Long"
                      }],
                    "footnote": {
                      "text": "News brought to you by News API",
                      "iconUri": "",
                      "time": ""
                    }
                  }]
              })
        }
        newsSource=data.body.text;
        showNews(newsSource,data.body.groupId);
        



        //////

        if (data.body.text===1) {
           // var search=data.body.text.substr(7);
            var search="RingCentral";
            var erBase = require("eventregistry");

            

        //     er.getConceptUri(search).then((conceptUri) => {
        //     var q = new erBase.QueryArticlesIter(er, {conceptUri: conceptUri, sortBy: "date"});
        //     q.execQuery((items) => {
        //         for(var item of items) {
        //             console.info(item);
        //             platform.post('/glip/posts', {
        //                 groupId: data.body.groupId,
        //                 text: JSON.stringify(item),
        //                 attachments:undefined
        //               })
        //         }
        //     })
        // });

        er.getConceptUri(search).then((conceptUri) => {
            var q = new erBase.QueryEvents({conceptUri: conceptUri});
            var requestEventsInfo = new erBase.RequestEventsInfo({sortBy: "date", count: 2});
            q.setRequestedResult(requestEventsInfo);
            return er.execQuery(q);
        }).then((response) => {
            console.info(response);
            platform.post('/glip/posts', {
                                groupId: data.body.groupId,
                                text: JSON.stringify(response),
                                attachments:undefined
                              })
        });
              
    }
          

        //////

//console.log(req.body.groupId);
   }
});

// Method to Subscribe to Glip Events.
function subscribeToGlipEvents(token){

    var requestData = {
        "eventFilters": [
            "/restapi/v1.0/glip/posts",
            "/restapi/v1.0/glip/groups"
        ],
        "deliveryMode": {
            "transportType": "WebHook",
            "address": REDIRECT_HOST + "/callback"
        },
        "expiresIn": 500000000
    };
    platform.post('/subscription', requestData)
        .then(function (subscriptionResponse) {
            console.log('Subscription Response: ', subscriptionResponse.json());
            subscription = subscriptionResponse;
            subscriptionId = subscriptionResponse.id;
        }).catch(function (e) {
            console.error(e);
            throw e;
    });
}

function renewSubscription(id){
    console.log("Renewing Subscription");
    platform.post('/subscription/' + id + "/renew")
        .then(function(response){
            var data = JSON.parse(response.text());
            subscriptionId = data.id
            console.log("Subscription Renewal Successfull. Next Renewal scheduled for:" + data.expirationTime);
        }).catch(function(e) {
            console.error(e);
            throw e;
        });
}

function showNews (source,id){
    if (1===1) {

        ///// Top Headlines //////

        var news =  newsapi.v2.topHeadlines({
            sources: source,
            language: 'en'
          }).then(response => {
            console.log(response.author);
            
            /// Build up the attachment Card ///
             for (var i in response) {
                 console.log("The Value of i is :" + i);
                 console.log(response.articles.length);
                
             }

             
             
             for (i=0;i<response.articles.length;i++) {
                newsList = newsList+"• " + response.articles[i].title + " : "+ " "+ response.articles[i].url+ +"  "+"\n";
                console.log(response.articles[i].url);
             }
                         //latest_news.news_fields.title=response.articles[i].title;
                // latest_news.news_fields.value=response.articles[i].url;
                // latest_news.news_fields.style="Short";
               
                             ///////////End Building Card////
            platform.post('/glip/posts', {
                groupId: id,
                text: "News Headlines",
                attachments:[{
                    "type": "Card",
                    "fallback": "Attachment fallback text",
                    "color": "#00ff2a",
                    "intro": "",
                      "author": {
                        "name": " ",
                        "uri": "",
                        "iconUri": ""
                      },
                    "title": "",
                    "text": "",
                    "imageUri": "",
                    "thumbnailUri": "",
                    "fields": [
                      {
                        "title": "Top Headlines",
                        "value": newsList,
                        "style": "Short"
                      }],
                    "footnote": {
                      "text": "News brought to you by News API",
                      "iconUri": "",
                      "time": ""
                    }
                  }]
              })

             console.log(latest_news);
             newsList = " ";

          });
        console.log(typeof(news));



        ////// End Top Headlines ////

     

        



      // sendMail();
  
      }
      
}

setInterval(function() {
    https.get("https://glip-news-bot.herokuapp.com/");
    console.log("Heartbeat check for News Bot");
}, 300000); // every 5 minutes (300000)

/// Sending Email
function sendMail() {

    
    nodeoutlook.sendEmail({
        auth: {
            user: "dibyendu.roy@ringcentral.com",
            pass: "D@92orcl"
        }, from: 'dibyendu.roy@ringcentral.com',
        to: 'dibyendu.roy@ringcentral.com',
        subject: 'Hey you, awesome!',
        html: '<b>This is bold text</b>',
        text: 'This is text version!',
        attachments: []
    });

}


//////// Sending Email



