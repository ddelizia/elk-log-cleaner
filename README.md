* [`0.1`, `latest` (Dockerfile)](https://bitbucket.org/ddelizia/elk-log-cleaner/raw/master/Dockerfile)

# elk-log-cleaner

Log cleaner for elk stack. This small image solves the problem of deleting old indexes from elastic serach.

Logstash by default produces an index for each day. This small configurable images allow you to delete old indexes in order to save space.

## How to run this image

Currently, the most simple way to run this container is:
```
docker run -ti --name elk-log-cleaner --link elasticsearch:elasticsearch ddelizia/elk-log-cleaner
```

However, if you want to customize the container execution, here are many available options:

 * **HOST**: Elasticsearch host (*default value:* `localhost`)
 * **PORT**: Elasticsearch port (*default value:* `9002`)
 * **SCHEMA**: Elasticsearch schema (*default value:* `http`)
 * **PREFIX**: Logstash index prefix (*default value:* `logstash-`)
 * **DAYS**: Number of days of indexes to keep (*default value:* `7`)
 * **CRON**: Cron expression which is used to run cleaning cronjob (default value: `0 1 * * * *`)
