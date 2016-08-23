# TOPICS

- [Requirements](#requirements)
- [Installation](#installation)
- [Setup](#setup)
- [Running](#running)
- [Installing behing NGINX](#installing-behind-nginx)
- [Template modification](#template-modification)

# REQUIREMENTS

[node.js](https://nodejs.org)

# INSTALLATION

```sh
$ git clone https://github.com/devtin/PLS.git
$ cd PLS && npm install
```

# SETUP

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
kill $(<pid) > /dev/null 2>&1
sleep 1
nohup node index.js &>/dev/null & echo $! > pid
```

Save: `ctrl+o [enter] ctrl+x`

- **PLS_PORT**: port where the app is going to run
- **ADMIN_USER**: user that can access the system
- **ADMIN_PASSWORD**: password to validate *ADMIN_USER*
- **SENDINBLUE_KEY** [Sendinblue](https://www.sendinblue.com/) key to send the emails.

# RUNNING

Give running permissions to our run.sh script

```sh
$ chmod +x run.sh
```

Then run:

```sh
./run.sh
```

# INSTALLING BEHIND NGINX

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
	server_name survey.wikot.com; # replace for which ever domain you want to use

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
$ ln -s ../sites-available/pls .
```

Restart NGINX:

```sh
# Ubuntu
sudo service nginx restart

# OpenBSD
/usr/local/etc/rc.d/nginx restart

# CentOS
/etc/init.d/nginx restart
```

# TEMPLATE MODIFICATION

Go to `$ ./PLS/assets/public/pls` you will see `email-pls.html` and `email-petroleum.html` inside. Images for template `email-pls.html` are stored in folder `email-1` and images for template `email-petroleum.html` in folder `email-2`.

CSS is created using [Sass](http://sass-lang.com/), CSS files for templates `email-pls.html` and `email-petroleum.html` are `css/style.css` and `css/style-2.css` respectively.
 
If you modify anithing on the templates file, you are gonna have to run: `./PLS/assets/public/pls/./compile` in order to create a final version with the styles inline.