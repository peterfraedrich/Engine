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


### API
All HTTP hooks are `GET`. I know, I know, this is a bit unorthodox, but it was designed that way to make things simpler and allow you to update your config with a simple `curl` or `wget` or even from a browser. `POST` makes things complicated.

All hooks are in the format of `http://someurl/<api>?params=values`.

Valid params (query) values are as follows:
```javascript
key=[api_key]
upstream=[the upstream pool]
server=[the server youre referencing]
robot // tells the API to return HTTP/200 responses instead of text, useful for scripts
```

Valid API hooks are as follows (as of right now, more later):
```javascript
/api                    // gets the server status, returns 'SERVER IS UP' or 200
/config/engine          // returns the current server configuration in JSON
/config/nginx           // returns the NGINX configuration
/config/log             // returns the log file
/pool/add               // adds a server to an upstream pool
/pool/delete            // removes a server from an upstream pool
/pool/list              // returns all servers in an upstream pool as JSON
```
