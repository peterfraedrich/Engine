# ENGINE
*The nginx REST API you deserve.*

### So what does it do?
I'm glad you asked. It does...stuff. No, actually it's a REST API for nginx load balancer configurations. I made it because a) I'm an operations guy that needs to dynamically update nginx load balancer configurations, and b) because no one else had made one.

### How does it work?
Well, it runs on NodeJS, that's how.

### How do I install it?
You can run
```
#> npm install
```
and let the magic begin. Once it's done installing, copy the `engined.service` unit file to your neighborhood friendly systemd unit file collection. Oh, don't forget to configure your stuff. In `engine.conf` you can set custom log paths and the location of the main `nginx.conf` file (sorry, this doesn't work with files in `/etc/nginx/conf.d` yet).

### Now what?
I'm tired, I'm going home. I'll finish the docs some other day, preferably when I'm done writing it.
