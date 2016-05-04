var CronJob = require('cron').CronJob;
var request = require('request');
var moment = require('moment');
var conf = require('nconf');

conf
  .env()
  .argv()
  .file({ file: 'config.json' });

var elasticSearchSchema = conf.get('elasticsearch:schema');
var elasticSearchHost = conf.get('elasticsearch:host');
var elasticSearchPort = conf.get('elasticsearch:port');
var logstashPrefix = conf.get('logstash:indexPrefix');
var logstashDaystokeep = conf.get('logstash:keepLatestDays');
var cronExpr = conf.get('cronExpr');

console.log("Running for: " + elasticSearchSchema + '://' + elasticSearchHost + ':' + elasticSearchPort);
console.log("Cleaning logs for prefix: \"" + logstashPrefix + '\" older than ' + logstashDaystokeep + " day(s)");
console.log("Cron expr: "+ cronExpr);

new CronJob(cronExpr, function() {
  console.log("Running cronjob at: " + new Date());
  request.get(baseUrl() + "/_stats/index?pretty", function (error, response, body){
      var indices = (JSON.parse(body)).indices;
      var keys = Object.keys(indices);

      var now = moment();
      var timeLimit = now.subtract(logstashDaystokeep, 'days');

      keys.forEach(function (key) {

        if (key.startsWith(logstashPrefix)){

          var date = key.replace(logstashPrefix, "")

          console.log(key + "," + date);

          var realDate = moment(date, "YYYY.MM.DDDD");

          if (realDate.isBefore(timeLimit)){
            console.log("Deleting index " + key);

            request.delete(baseUrl() + "/" + key);
          }


        }
      });
  });
}, null, true);


var baseUrl = function (){
  return "" + elasticSearchSchema + "://" + elasticSearchHost + ":" + elasticSearchPort;
}
