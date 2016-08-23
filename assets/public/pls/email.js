#!/usr/bin/env node
'use strict';


var fs          = require('fs'),
    path        = require('path'),
    hogan       = require('hogan.js');

function compile(file,cb) {

    if (!file && !Args.is('file')) {
        console.error('An input --file must be provided.\nAdditionally, you can set the output file with the option --out');
        process.exit();
    }

    file = file||Args.is('file');

    var Styliner = require('styliner');

    var out = Args.is('out')||file.replace(/\.html$/i,'-ready.html');

    var styliner = new Styliner(__dirname,{noCSS:false});

    styliner.parseFile(path.resolve(__dirname,file))
        .then(html => {
            html = html.replace(/[\s]((src|background)=("|')?|url\(('|")?)/mgi,function(match) {
                return match+"http://survey.wikot.com/pls/";
            }).replace(/[\s]((href=('|"))(?!http))/mgi,function(match) {
                return match+"http://survey.wikot.com";
            });

            if (cb && !Args.is('out')) {
                cb(html);
                return;
            }

            fs.writeFileSync(path.resolve(__dirname,out),html);
            console.log('File written in '+out);
        });

    return true;
}

function send() {

    if (!Args.is('to')) {
        console.log('You have to provide a destination using option --to');
        return false;
    }

    if (!/^[a-z0-9._+]+@[a-z\-0-9.]+\.[a-z]{2,6}$/.test(Args.is('to'))) {
        console.log('Please enter a valid email address.');
        return false;
    }

    if (!Args.is('html')) {
        console.log('Provide an html file with option --html.');
        return false;
    }

    require("./mailin.js");
    var client = new Mailin("https://api.sendinblue.com/v2.0","JVwxfYONFsvXR405");

    try {
        var html = fs.readFileSync(Args.is('html')).toString();
        var template = hogan.compile(html);
        html = template.render( { email : Args.is('to') } );
    } catch(e) {
        console.log('Make sure file '+Args.is('html')+' exists.');
        console.log('');
        console.log(e);
        return false;
    }

    var to = {};
    to[Args.is('to')] = Args.is('to-name');

    var data = {
        to              : to,
        subject         : Args.is('subject')||'This is a test',
        from            : [Args.is('from-email')||"martin.gonzalez@wikot.com",Args.is('from-name')||"PLS Group"],
        html            : html
    };

    //console.log(data);
    //return;

    client.send_email(data).on('complete', function(data) {
        console.log(data);
    });

    return true;
}

var Args = new (function() {
    var args = {},
        getNextV = false;

    for (var i = 0; i < process.argv.length; i++) {
        var val = process.argv[i];

        if (getNextV && !/^\-\-/.test(val)) {
            args[getNextV] = val;
            getNextV = null;
            continue;
        }
        else if (/^\-\-/.test(val)) {
            val = val.replace(/^[\-]+/,'');
            getNextV = val;
        }

        args[val] = true;
    }

    this.is = function(arg) {
        return arg in args ? args[arg] : false;
    }
})();

var exec;

if (Args.is('compile')) {
    exec = compile;
} else if (Args.is('send')) {
    exec = send;
}

if (!exec || !exec()) {
    console.log('Usage:');
    console.log('./email.js compile --file [.html] --out [.html]');
    console.log('[ OR ]');
    console.log('./email.js send --html [.html] --to [@email.com] --from-name [sender name] --from-email [@email.com] --subject [subject]');
}