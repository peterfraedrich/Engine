# ENGINE
*The nginx REST API you deserve.*

#### So what does it do?
I'm glad you asked. It does...stuff. No, actually it's a REST API for nginx load balancer configurations. I made it because a) I'm an operations guy that needs to dynamically update nginx load balancer configurations, and b) because no one else had made one.

#### How does it work?
Well, it runs on NodeJS, that's how.

#### How do I install it?
You can run
```
#> npm install
```
and let the magic begin. Once it's done installing, copy the `engined.service` unit file to your neighborhood friendly systemd unit file collection. Oh, don't forget to configure your stuff. In `engine.conf` you can set custom log paths and the location of the main `nginx.conf` file (sorry, this doesn't work with files in `/etc/nginx/conf.d` yet).

## API
All HTTP hooks are `GET`. I know, I know, this is a bit unorthodox, but it was designed that way to make things simpler and allow you to update your config with a simple `curl` or `wget` or even from a browser. `POST` makes things complicated.

All hooks are in the format of `http://someurl/<api>?param=value&param=value`.

Valid params (query) values are as follows:
```ini
key=<key>                   // your API key, an 8-character string
upstream=<upstream_name>    // the name of the upstream pool from nginx.conf
server=<server_IP_or_FQDN>  // the server IP or FQDN to instert into the pool
robot                       // tells the API to return HTTP/200 responses instead of text, useful for scripts
```

Valid API hooks are as follows (as of right now, more later):
```c++
/api                        // gets the server status, returns 'SERVER IS UP' or 200
/config/engine              // returns the current server configuration in JSON
/config/nginx               // returns the NGINX configuration
/config/log                 // returns the log file
/pool/add                   // adds a server to an upstream pool
/pool/delete                // removes a server from an upstream pool
/pool/list                  // returns all servers in an upstream pool as JSON
```

#### API key
Each server, on first-run, generates an 8-character key based on an UUID. This is to keep unauthorized scripts/people from updating the configuration files. This is what I'm calling 'lazy authentication'. If someone *really* wants to get past it, they could, but this way keeps the casual interloper from f---ing everything up. The key **must** be supplied with all queries (except `/api`) else you will get an error message.

The API key can be found in the `engine.conf` or `engined.log` files.

### Examples
For the purpose of these examples, assume that the nginx server is as `nginx01.foo.com` and your `nginx.conf` looks something like this:
```Nginx
user www
http {
    upstream loginservice {
        least conn;
        server 10.10.10.1;
        server 10.10.10.2;
        server 10.10.10.3;
    }
    upstream database {
        server 172.16.10.1;
        server 172.16.10.2;
    }
    location /db {
        proxy_pass http://database;
    }
    location /login {
        proxy_pass http://loginservice;
    }
}
```

##### Adding a server to an upstream pool
```
Server to add:          10.10.10.4
Pool to add to:         loginservice
API key:                abcd1234

Command:
$> curl http://nginx01.foo.com/pool/add?key=abcd1234&upstream=loginservice&server=10.10.10.4
[OK] Engine added 10.10.10.4 to the pool loginservice
```

##### Deleting a server from an upstream pool
```
Server to delete:       172.16.10.2
Pool to delete from:    database
API key:                abcd1234

Command:
$> curl http://nginx01.foo.com/pool/delete?key=abcd1234&upstream=database&server=172.16.10.2
[OK] Engine deleted 172.16.10.2 from the pool database
```

##### Fetching upstream pool members
```
Pool to fetch:          loginservice
API key:                abcd1234

Command:
$> curl http://nginx01.foo.com/pool/list?upstream=loginservice&key=abcd1234
```
Returns:
```JSON
{
    "members" : [
        "10.10.10.1",
        "10.10.10.2",
        "10.10.10.3"
    ],
    "upstream" : "loginservice"
}
```

##### Misc. Notes
* The `robot` URL query parameter tells the API to return confirmations in the form of HTTP status codes (ie, `200` for sucess) instead of text. This is designed to be used with scripts to avoid having to parse a text response.
* You can send extra query params, but they won't do anything.

#### FAQ
* Do you intend on implementing HTTPS any time soon?
`No, not really. I personally don't see the need, but if there's great outcry then I could change my stance.`
* Why send API keys in plaintext?
`Because. Really, though, all it's there to do is ensure something like a URL scanner or the intern don't mess things up.`
* Is this it?
`No, jerk, this isn't all I'm doing. I'm working on the rest of the crap too. But, you know, I have a day job.`
