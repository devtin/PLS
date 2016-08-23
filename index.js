/*
Developed by: Martín Rafael González
GitHub: https://github.com/devtin

www.devtin.io
 */

var mustachy        = require('mustachy'),
    express         = require('express'),
    app             = express(),
    _               = require('lodash'),
    utf8            = require('utf8'),
    hogan           = require('hogan.js'),
    bodyParser      = require('body-parser'),
    Promise         = require('bluebird'),
    basicAuth       = require('basic-auth-connect');

if (!process.env.ADMIN_USER || !process.env.ADMIN_PASSWORD) {
    console.error('Environment variables ADMIN_USER and ADMIN_PASSWORD are required.');
    process.exit();
}

if (!process.env.SENDINBLUE_KEY) {
    console.error('Environment variable SENDINBLUE_KEY must be provided. Enter http://www.sendinblue.com for more info.');
    process.exit();
}

const FROM          = require(__dirname+'/emails-from.json'),
    TO              = require(__dirname+'/emails-to.json');

require('./mailin.js');

app.use('/create',basicAuth(process.env.ADMIN_USER,process.env.ADMIN_PASSWORD));

var LAST_SENT_DATA = {
    last_subject        : '',
    last_from_name      : '',
    last_from_email     : ''
};

app.use(mustachy.middleware({
    options         : {
        templatesPath   : __dirname+'/assets/views'
    },
    init            : function() {
        this.components.mobileFriendly();
        this.getCache = this.setCache = false;

        this.Assets.add([
            'https://code.jquery.com/jquery-3.1.0.min.js',
            'https://fonts.googleapis.com/css?family=Open+Sans:400,300,700',
            'https://maxcdn.bootstrapcdn.com/font-awesome/4.6.3/css/font-awesome.min.css'
        ],'head');

        this.set('no-container',true);
    }
}));

app.use(express.static(__dirname+'/assets/public'));

app.get('/',function(req,res) {
    res.mustachy.Assets.clear();
    res.mustachy
        .append('<h1>Nothing here... ):</h1>','body')
        .call('render');
});

app.get(/^\/(pls|pet)\/?$/,function(req,res) {
    res.mustachy
        .Assets
        .add(req.path.replace(/\//g,'')+'.css','head')
        .add('survey.js','footer');

    var platformName = req.path.replace(/\//g,'') == 'pet' ? 'Petroleum' : 'PLS';

    res.mustachy
        .set('title',`${platformName} Survey`)
        .call('set',req.query)
        .call('set',{
            'platform' : req.path.replace(/\//g,''),
            'platform-name' : platformName,
            'pls' : req.path.replace(/\//g,'') == 'pls',
            'pet' : req.path.replace(/\//g,'') == 'pet'
        })
        .call('appendTemplate','home.html','body')
        .call('render');
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var Queue = {};

function send(data) {
    for (var i in data.to) {
        if (i in Queue) delete Queue[i];
    }

    var client = new Mailin("https://api.sendinblue.com/v2.0",process.env.SENDINBLUE_KEY);

    return new Promise(function(resolve) {
        client.send_email(data).on('complete',data => resolve(data));
    });
}

app.post('/send',function(req,res) {
    new Promise(function(resolve,reject) {
        var p = req.body;

        if (!p.email || !/^[a-z0-9._+]+@[a-z\-0-9.]+\.[a-z]{2,6}$/.test(p.email)) {
            return reject('Wrong email address');
        }

        if (!/^(pls|pet)/.test(p.platform)) {
            return resolve({ok:true});
        }

        clearTimeout(Queue[p.email]);

        var answers = `${p.email} just answered the ${p.platform == 'pls' ? 'PLS' : 'Petroleum'} Survey and is ${p.happy == 'no' ? 'NOT' : ''} happy.`,
            wait    = true;

        if (p.happy == 'yes' && p['what-was-right']) {
            wait = false;
            answers += `\n\nComments:\n${p['what-was-right']}`;
        }

        if (p.happy == 'no' && (p.comments || p['what-was-bad'])) {
            wait = false;
            answers += p.comments ? `\n\nComments:\n${p.comments}` : '';
            answers += p['what-was-bad'] ? `\n\nWhat they didn't like:\n${p['what-was-bad']}` : '';
        } else if(p.happy == 'no') {
            answers += `\n\nNo additional informartion has been provided.`;
        }

        var to = {};
        to[TO[p.platform].email] = TO[p.platform].name;

        var data = {
            to              : to,
            subject         : `${p.email} is ${p.happy == 'no' ? 'NOT ' : ''}happy!`,
            from            : [FROM[p.platform].email,FROM[p.platform].name],
            text            : answers
        };

        if (wait && !p.doit) {
            Queue[p.email] = setTimeout(function() {
                send(data);
            },5*60*1000);

            return resolve({ok:true,message:'queued'});
        }

        resolve(send(data));
    })
    .then(function(r) {
        res.set('Content-type','application/json').send(JSON.stringify(r||{ok:true}));
    })
    .catch(function(err) {
        res.set('Content-type','application/json').send(JSON.stringify({ok:false,error:err||'Unknown error'}));
    });
});

app.get(/^\/create\/?$/,function(req,res) {
    res.mustachy
        .Assets
        .add([
            'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css',
            'admin.css'
        ],'head');

    res.mustachy
        .set('title','Create!')
        .call('set',LAST_SENT_DATA)
        .call('appendTemplate','create.html','body',{from:JSON.stringify(FROM)})
        .call('render');
});

app.post(/^\/create\/send\/?$/,function(req,res) {
    var p = req.body;

    LAST_SENT_DATA.last_from_email  = p.from_email;
    LAST_SENT_DATA.last_from_name   = p.from_name;
    LAST_SENT_DATA.last_subject     = p.subject;

    res.mustachy
        .getTemplateData('email-'+p.template+'.html',false)
        .then(html => {
            var t = hogan.compile(html);
            return t.render({email: p.to_email});
        })
        .then(html => {
            if (p.action == 'download') {
                return Promise.resolve(html);
            }

            var to = {};
            to[p.to_email] = p.to_name;

            var data = {
                to              : to,
                subject         : p.subject,
                from            : [p.from_email, p.from_name],
                html            : html
            };

            send(data)
                .then(function(d) {
                    res.set('Content-Type','application/json').send(JSON.stringify({ok:1,res:d}));
                });
        })
        .then(html => {
            if (p.action !== 'download') {
                return;
            }

            var header = `From: ${p.from_name} \<${p.from_email}\>
Subject: ${p.subject}
To: ${p.to_name} \<${p.to_email}\>
Content-Type: text/html; charset=utf-8
MIME-Version: 1.0`;

            res.set('Content-Type','application/octet-stream').set("Content-Disposition", "attachment;filename="+ p.to_email+'.eml').send(header+'\n\n'+html);
        })
        .catch(err => {
            res.set('Content-Type','application/json').send(JSON.stringify({err:err}));
        });

});

const PORT = process.env.PLS_PORT||80;

app.listen(PORT,function() {
    console.log('Listening on port',PORT);
});