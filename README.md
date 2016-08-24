# Topics

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Setup](#setup)
- [Running](#running)
- [Installing behind NGINX](#installing-behind-nginx)
- [Sender information](#sender-information)
- [Template modification](#template-modification)
- [Usage](#usage)

# Prerequisites

- [node.js](https://nodejs.org) >= 6.3
- [nohup](https://en.wikipedia.org/wiki/Nohup) (for linux and the sake of this doc)

PS: this documentation is Linux oriented even though node.js can be run on windows too.

# Installation

```sh
$ git clone https://github.com/devtin/PLS.git
$ cd PLS && npm install
```

# Setup

Create a run file inside folder `PLS`:

```sh
$ nano run.sh
```

Enter

```sh
#!/usr/bin/env bash

BASEDIR=$(dirname $0)
cd $BASEDIR

export PLS_PORT=XX
export ADMIN_USER=admin
export ADMIN_PASSWORD=xxxxxx
export SENDINBLUE_KEY=xxxxxx

if [ -f pid ]; then
    kill $(<pid) &>/dev/null
    sleep 1
fi

nohup node index.js &>output.log & echo $! > pid
```

Save: `ctrl+o [enter] ctrl+x`

- **PLS_PORT**: port where the app is going to run
- **ADMIN_USER**: user that can access the system
- **ADMIN_PASSWORD**: password to validate *ADMIN_USER*
- **SENDINBLUE_KEY** [Sendinblue](https://www.sendinblue.com/) key to send the emails.

# Running

Give running permissions to our run.sh script

```sh
$ chmod +x run.sh
```

Then run:

```sh
./run.sh
```

You can monitor the status of the app on `output.log`. PID is written in file `./PLS/pid`.

# Installing behind NGINX

Create an NGINX config file:

```sh
$ cd /etc/nginx/sites-available
$ nano pls-survey
```

Paste this content:

```nginx
upstream pls {
    server 127.0.0.1:[PORT]; # replace [PORT] for the value assigned on PLS_PORT
    keepalive 8;
}

# the nginx server instance
server {
	listen 80;
	server_name survey.wikot.com; # replace for whatever domain you want to use

	location / {
		proxy_set_header X-Real-IP $remote_addr;
		proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
		proxy_set_header Host $http_host;
		proxy_set_header X-NginX-Proxy true;

		proxy_pass http://pls/;
		proxy_redirect off;
	}
}
```

Save: `ctrl+o [enter] ctrl+x`

Enable the new conf:

```sh
$ cd /etc/nginx/sites-enabled
$ ln -s ../sites-available/pls-survey .
```

Restart NGINX:

```sh
# Ubuntu
sudo service nginx restart

# BSD
/usr/local/etc/rc.d/nginx restart

# CentOS
/etc/init.d/nginx restart
```

# Sender Information

To modify sender information, access files `./PLS/emails-from.json` (customer will receive surveys from this person) and  `./PLS/emails-to.json` (person who will receive the survey's answers). If you modify any of those files you're gonna have re-run the app by doing `./PLS/./run.sh` (this script will kill the previous process and start a new one).

# Template Modification

Go to `$ ./PLS/assets/public/pls` you will see `email-pls.html` and `email-petroleum.html` inside. Images for template `email-pls.html` are stored in folder `email-1` and images for template `email-petroleum.html` in folder `email-2`.

CSS is created using [Sass](http://sass-lang.com/), CSS files for templates `email-pls.html` and `email-petroleum.html` are `css/style.css` and `css/style-2.css` respectively.
 
If you modify anything on the templates or CSS files, you are gonna have to run: `./PLS/assets/public/pls/./compile` in order for this changes to take effect.

# Usage

Access from your browser http://yourdomain.com/create with the credentials defined on `$ADMIN_USER` and `$ADMIN_PASSWORD` in order to send a survey.