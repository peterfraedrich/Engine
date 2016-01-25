//// SCOUT API ///////////////////////////////////////////

////////////////////////////////////////////////////////// DEPS
var application_root = __dirname,
    express = require('express'),
    methodOverride = require('method-override'),
    errorhandler = require('errorhandler'),
    bodyParser = require('body-parser')
    path = require('path'),
    sys = require('sys'),
    ini = require('ini'),
    fs = require('fs'),
    NginxConfFile = require('nginx-conf').NginxConfFile,
    uuid = require('node-uuid')

////////////////////////////////////////////////////////// CLASS INSTANTIATION & VARS
var app = express();
var gc = ini.parse(fs.readFileSync('engine.conf', 'utf-8'))


////////////////////////////////////////////////////////// ALLOW XSS / CORS
var allowCrossDomain = function(req, res, next) {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
      res.header('Access-Control-Allow-Methods', '*');
      res.header('Access-Control-Allow-Headers', '*');
      res.header('Access-Control-Allow-Headers', 'X-Requested-With, Accept, Origin, Referer, User-Agent, Content-Type, Authorization');

      // intercept OPTIONS method
      if (req.method === 'OPTIONS') {
        res.send(200);
      }
      else {
        next();
      }
    };

    app.use(allowCrossDomain);   // make sure this is is called before the router
    app.use(bodyParser());
    app.use(methodOverride());
    app.use(errorhandler());
    app.use(express.static(path.join(application_root, "public")));

////////////////////////////////////////////////////////// PRIVATE LOGIC

var firstrun = function(callback) {
    if (gc.engined.firstrun == 1 || gc.engined.firstrun == '1') {
        generate_auth_key(function (err, key) {
            gc.global.auth_key = key
            gc.engined.firstrun = 0
            fs.writeFileSync('engine.conf', ini.stringify(gc))
            log('Completed first-run tasks. Auth key is ' + key, '000', ' ', function (err) {if (err) { console.log(err) }})
            callback(null)
        })
    } else {
        callback(null)
    }
}

var generate_auth_key = function (callback) {
    authkey = uuid.v4().toString().split('-')
    key = authkey[0] + authkey[1] + authkey[2] + authkey[3] + authkey[4]
    callback(null, key.substring(10,19))
}

var log = function (message, code, errtext, callback) {
    var msg = {}
    msg.timestamp = new Date().toString()
    msg.code = code
    msg.message = message
    msg.err = errtext
    fs.appendFile(gc.engined.logpath, JSON.stringify(msg) + '\n', encoding='utf-8', function (err) {
        if (err) {
            console.log(err)
            callback(err)
        } else {
            callback(null)
        }
    })
}

var _err = function (req, err, callback) {
    if (req.query.robot != undefined) {
        console.log(err)
        log(err.message, '999', ' ', function (err) { if (err) { console.log(err)}})
        callback(null, 503)
    } else {
        console.log(err)
        log(err.message, '999', ' ', function (err) { if (err) { console.log(err)}})
        callback(null, err.message)
    }
}

var check_auth_key = function (key, callback) {
    if (key != gc.global.auth_key) {
        log('Attempted authentication with auth key ' + key, '666', key, function (err) { if (err) { console.log(err)}})
        callback(new Error("Hey, you can't do that, man! You don't have the right authorization key."))
    } else {
        callback(null)
    }
}

var get_nginx_config = function (callback) {
    NginxConfFile.create(gc.global.nginx_conf, function (err, config) {
        if (err) {
            console.log(err)
            callback(err)
        } else {
            callback(null, config.nginx)
        }
    })
}

var pool_add = function (stream, server, callback) {
    NginxConfFile.create(gc.global.nginx_conf, function (err, config) {
        if (err) {
            log('Error in pool_add', '200', err, function (err) { if (err) { console.log(err)}})
            console.log(err)
            callback(err)
        }
        for (i=0; i < config.nginx.http.upstream.length; i++) {
            if (config.nginx.http.upstream[i]._value == stream) {
                // check to see if its already in the stream
                try {
                    for (v = 0; v < config.nginx.http.upstream[i].server.length; v++) {
                        if (config.nginx.http.upstream[i].server[v]._value == server) {
                            callback(new Error(server + ' already exists in upstream pool ' + stream))
                            return
                        }
                    }
                }
                catch (e) {
                    // catch exception because server object has no .length if its empty
                }
                // if it doesn't exist, then push it to the config
                config.nginx.http.upstream[i]._add('server', server)
                log('Added server ' + server + ' to upsream pool ' + stream, '100', ' ', function (err) { if (err) { console.log(err)}})
                config.flush()
                callback(null)
                return
            }
        }
        callback(new Error(stream + ' does not exist!'))
    })
}

var pool_delete = function (stream, server, callback) {
    NginxConfFile.create(gc.global.nginx_conf, function (err, config) {
        if (err) {
            log('Error in pool_delete', '201', err, function (err) { if (err) { console.log(err)}})
            console.log(err)
            callback(err)
        }
        for (i=0; i < config.nginx.http.upstream.length; i++) {
            if (config.nginx.http.upstream[i]._value == stream) {
                // check to see if its already in the stream
                for (v = 0; v < config.nginx.http.upstream[i].server.length; v++) {
                    if (config.nginx.http.upstream[i].server[v]._value == server) {
                        config.nginx.http.upstream[i]._remove('server', v)
                        config.flush()
                        callback(null)
                        return
                    }
                }
                // if it doesn't exist, then push it to the config
                callback(new Error(server + " doesn't exist in upstream pool " + stream))
            }
        }
    })
}

var pool_list = function (stream, callback) {
    NginxConfFile.create(gc.global.nginx_conf, function (err, config) {
        if (err) {
            log('Error in pool_list', '203', err, function (err) { if (err) { console.log(err)}})
            console.log(err)
            callback(err)
        }
        for (i=0; i < config.nginx.http.upstream.length; i++) {
            if (config.nginx.http.upstream[i]._value == stream) {
                pool = {}
                pool.members = []
                pool.upstream = config.nginx.http.upstream[i]._value
                try {
                    if (config.nginx.http.upstream[i].server.length != undefined) {
                        for (v = 0; v < config.nginx.http.upstream[i].server.length; v++) {
                                pool.members.push(config.nginx.http.upstream[i].server[v]._value)
                        }
                    } else {
                        pool.members.push(config.nginx.http.upstream[i].server._value)
                    }
                } catch (e) {
                    // return empty array because otherwise it fails. this is SO HACKISH but IDK of any other way to get around the .length being 'undefined' when its <= 1
                }
                callback(null, pool)
                return
            }
        }
        callback(new Error(stream + ' does not exist!'))
        return
    })
}

var upstream_create = function (stream, callback) {
    NginxConfFile.create(gc.global.nginx_conf, function (err, config) {
        if (err) {
            _err(req, err, function (err, msg) {
                return callback(err)
            })
        } else {
            config.nginx.http._add('upstream', stream)
            config.flush()
            return callback(null)
        }
    })
}

var upstream_destroy = function (stream, callback) {
    NginxConfFile.create(gc.global.nginx_conf, function (err, config) {
        if (err) {
            _err(req, err, function (err, msg) {
                return callback(err)
            })
        } else {
            for (i = 0; i < config.nginx.http.upstream.length; i++) {
                if (config.nginx.http.upstream[i]._value == stream) {
                    config.nginx.http._remove('upstream', i)
                    config.flush()
                    return callback(null)
                }
            }
            return callback(new Err('Stream ' + stream + ' does not exist on this server.'))
        }
    })
}




////////////////////////////////////////////////////////// PUBLIC API

app.get('/api', function (req, res) {
    if (req.query.robot == undefined) {
        res.send('SERVER IS UP')
    } else {
        res.sendStatus(200)
    }
})

app.get('/config/engine', function (req, res) {
    check_auth_key(req.query.key, function (err) {
        if (err) {
            _err(req, err, function (err, msg) {
                res.send(msg)
            })
        } else {
            res.send(gc)
        }
    })
})

app.get('/config/nginx', function (req, res) {
    check_auth_key(req.query.key, function (err) {
        if (err) {
            _err(req, err, function (err, msg) {
                res.send(msg)
            })
        } else {
            get_nginx_config( function (err, config) {
                if (err) {
                    _err(req, err, function (err, msg) {
                        res.send(msg)
                    })
                } else {
                    res.send(config)
                }
            })
        }
    })
})

app.get('/config/log', function (req, res) {
    check_auth_key(req.query.key, function (err) {
        if (err) {
            _err(req, err, function (err, msg) {
                res.send(msg)
            })
        } else {
            logg = fs.readFileSync(gc.engined.logpath, 'utf-8')
            res.send(logg)
        }
    })
})

app.get('/pool/add', function (req, res) {
    check_auth_key(req.query.key, function (err) {
        if (err) {
            _err(req, err, function (err, msg) {
                res.send(msg)
            })
        } else {
            pool_add(req.query.upstream, req.query.server, function (err) {
                if (err) {
                    _err(req, err, function (err, msg) {
                        res.send(msg)
                    })
                } else {
                    if (req.query.robot == undefined) {
                        res.send('[OK] Engine added ' + req.query.server + ' to the pool ' + req.query.upstream)
                    } else {
                        res.send(200)
                    }
                }
            })
        }
    })
})

app.get('/pool/delete', function (req, res) {
    check_auth_key(req.query.key, function (err) {
        if (err) {
            _err(req, err, function (err, msg) {
                res.send(msg)
            })
        } else {
            pool_delete (req.query.upstream, req.query.server, function (err) {
                if (err) {
                    _err(req, err, function (err, msg) {
                        res.send(msg)
                    })
                } else {
                    if (req.query.robot == undefined) {
                        res.send('[OK] Engine deleted ' + req.query.server + ' from the pool ' + req.query.upstream)
                    } else {
                        res.send(200)
                    }
                }
            })
        }
    })
})

app.get('/pool/list', function (req, res) {
    check_auth_key(req.query.key, function (err) {
        if (err) {
            _err(req, err, function (err, msg) {
                res.send(msg)
            })
        } else {
            pool_list (req.query.upstream, function (err, data) {
                if (err) {
                    _err(req, err, function (err, msg) {
                        res.send(msg)
                    })
                } else {
                    if (req.query.robot == undefined) {
                        res.send(data)
                    } else {
                        res.send(data)
                    }
                }
            })
        }
    })
})

app.get('/upstream/create', function (req, res) {
    check_auth_key(req.query.key, function (err) {
        if (err) {
            _err(req, err, function (err, msg) {
                res.send(msg)
            })
        } else {
            upstream_create(req.query.upstream, function (err) {
                if (err) {
                    _err(req, err, function (err, msg) {
                        res.send(msg)
                    })
                } else {
                    if (req.query.robot == undefined) {
                        res.send('[OK] Engine created new upstream pool ' + req.query.upstream )
                    } else {
                        res.send(200)
                    }
                }
            })
        }
    })
})

app.get('/upstream/destroy', function (req, res) {
    check_auth_key(req.query.key, function (err) {
        if (err) {
            _err(req, err, function (err, msg) {
                res.send(msg)
            })
        } else {
            upstream_destroy(req.query.upstream, function (err) {
                if (err) {
                    _err(req, err, function (err, msg) {
                        res.send(msg)
                    })
                } else {
                    if (req.query.robot == undefined) {
                        res.send('[OK] Engine destroyed the upstream pool' + req.query.upstream )
                    } else {
                        res.send(200)
                    }
                }
            })
        }
    })
})

firstrun (function (err) {
    if (err) {
        log('Error in app startup', '500', err, function (err) { if (err) { console.log(err)}})
        console.log(err)
    } else {
        app.listen(gc.global.api_port);
        console.log('API listening on port ' + gc.global.api_port);
    }
})
