# Oz

*Converted from: Oz.pdf*

---

# Oz

12 [th] December 2023 / Document No D23.100.260


Prepared By: egre55 & C4rm3l0


Machine Author: incidrthreat & Mumbai


Difficulty: Hard


Classification: Official

## **Synopsis**


Oz is a hard to insane difficulty machine which teaches about web application enumeration, SQL Injection,

Server-Side Template Injection, SSH tunnelling, and how Portainer functionality can be abused to

compromise the host operating system. The techniques learned here are directly applicable to real-world

situations.
### **Skills Required**


Intermediate knowledge of Web application enumeration techniques


Intermediate knowledge of SQL injection techniques


Basic knowledge of Linux
### **Skills Learned**


Gain familiarity with WFuzz advanced options

Accessing file system via SQL injection

Extraction and cracking of PBKDF2-SHA256 hashes

Server-Side Template Injection

Port forwarding using sshuttle


Privilege escalation via Portainer authentication bypass

## **Enumeration**
### **Nmap**



Nmap reveals Werkzeug instances on port 80 and 8080. Werkzeug is a WSGI (Web Server Gateway Interface)

utility library for Python. WSGI functionality includes URL Routing (mapping HTTP requests to code to be

invoked), Request and Response Objects, and a Template Engine.

### **Web Application Enumeration**


The web page on port 80 requests that a username is registered, while port 8080 displays a login page for

the "GBR Support" portal. Attempts to log in with common credentials such as admin:admin are not

successful.


If Werkzeug debug mode has been left enabled, this can result in easy command execution. However, in this

instance, it is not enabled.


https://raw.githubusercontent.com/Fare9/PyWerkzeug-Debug-Command-Execution/master/exploit_werkze

ug.py



WFuzz is run against the installation on port 80, but returns HTTP 200 response codes for all queries, so we

filter out those with a length of 0 by using the --hl flag.


wfuzz -u http://10.10.10.96/FUZZ -w /usr/share/wordlists/dirbuster/directory-list-2.3

medium.txt --hl 0


********************************************************


 - Wfuzz 3.1.0 - The Web Fuzzer       *


********************************************************


Target: http://10.10.10.96/FUZZ


Total requests: 220560


=====================================================================


ID      Response  Lines  Word    Chars    Payload


=====================================================================


000000202:  200 3 L   6 W    79 Ch    "users"


After navigating to "/users", the registration message is still shown, although the formatting has changed.

However, appending a word to /users, e.g. /users/admin results in an API window displaying JSON

output, which confirms that "admin" is a valid username.


It seems that the HTTP request for "/users/admin" invoked a SQL query such as SELECT * FROM users

WHERE username='admin' .

## **Foothold**
### **SQL Injection**


Various SQL injection payloads are attempted and the famous ' OR '1'='1 returns "dorthi", which

confirms that there is a SQL injection vulnerability.


The database version and name are queried.






It is also worth checking if it is possible to read from the file system. load_file('/etc/passwd') doesn’t

return any output, but providing hex-encoded file paths is successful.


A programming/scripting language of choice can be used to generate the hex-encoded values.





We check if an SSH key exists for the user "dorthi":







An encrypted SSH key exists. After copying the data within the quotes, the following command is issued to

fix the formatting:







Focus can be turned to enumerating the database, and checking for user-created tables.


The tables "tickets_gbw" and "users_gbw" exist. Now to enumerate the columns:







The table "users_gbw" contains columns "username" and "password". Multiple logins exist, and usernames

and associated password hashes are extracted.




### **PBKDF2-SHA256 Hash Cracking**

The hash format is identified and is supported by John.


PBKDF2-SHA256 is quite a computationally expensive algorithm, but after a while (potentially a few hours in

a VM) the password wizardofoz22 is found for the username wizard.oz .






### **Server-Side Template Injection**

The gained credentials are used to log into the "GBR Support" portal on port 8080. Once logged in, it seems

that functionality to create tickets is available. A new ticket is created and the request is examined in Burp

Suite.


Given the underlying technologies, it is worth testing for SSTI vulnerabilities. A simple injection is attempted,

and if there is a vulnerability the answer 49 should be returned.




It is, and in the next test a string of seven sevens is likewise returned.





Template engines respond differently to these tests, and depending on the output, the engine can be

identified. The Flask/Jinja2 template engine will respond with 7777777 to {{7*'7'}}, and so further testing

is undertaken based on this assumption.


https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/Server%20Side%20Template%20injectio

ns#basic-injection


Within Jinja2 templates, several global variables exist, such as self and config.






The output of the config variable reveals the credentials dorthi:N0Pl4c3L1keH0me . Given the possession of

a private key and credentials,it would be good to test for SSH access, but the Nmap scan showed that SSH

is not available.


The available subclasses are then enumerated.





This returns a lot of information, and the data (minus the headers) is re-formatted to allow for easier

enumeration.


Subclasses such as "file" and "subprocess.Popen" are of interest and are both available.



file is at 40 in the list and subprocess.Popen is at 230, and these numbers are used to invoke their

functionality. Files can be read using the following command:




### **Command Execution**

Command execution is possible using subprocess.Popen . Command output can be redirected to a file and

subsequently read, or a reverse shell can be obtained.







Command Execution is also possible by loading objects into the configuration environment via

"from_pyfile":


https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/Server%20Side%20Template%20injectio

ns


[https://nvisium.com/blog/2016/03/11/exploring-ssti-in-flask-jinja2-part-ii.html](https://nvisium.com/blog/2016/03/11/exploring-ssti-in-flask-jinja2-part-ii.html)


## **Privilege Escalation**

The current user is root, although the shell is currently inside a docker container.







Enumeration continues, and the file "knockd.conf" within the ".secret" directory is examined. This reveals

the port knocking sequence required to open SSH.


[The knock python script created by](https://github.com/grongor/knock) @grongor is used. SSH passphrase: N0Pl4c3L1keH0me .





sudo -l reveals that Dorthi is allowed to run specific docker commands as root.







The docker networks are listed and inspected.


dorthi@oz:~$ sudo /usr/bin/docker network inspect bridge


[


{


"Name": "bridge",


"Id": "d6d8af4529b6b7d3ede4299c77dd567a67cbbf3da2cf256231ddc3a88aba2b38",


"Created": "2023-12-12T11:46:46.974654056-06:00",


"Scope": "local",


"Driver": "bridge",


"EnableIPv6": false,


"IPAM": {


"Driver": "default",


"Options": null,


"Config": [


{


"Subnet": "172.17.0.0/16",


"Gateway": "172.17.0.1"


}


]


},


"Internal": false,


"Attachable": false,


"Ingress": false,


"ConfigFrom": {


"Network": ""


},


"ConfigOnly": false,


"Containers": {


"83fbc25820209521a0627d805436fbfa0e1697c6f5f24fb168aba1dd4850b69d": {


"Name": "portainer-1.11.1",


"EndpointID":


"73b36c603181a5b0325deb82b11ae84806ad263aefa9d670f95f57bd1a847d40",


"MacAddress": "02:42:ac:11:00:02",


"IPv4Address": "172.17.0.2/16",


"IPv6Address": ""


}


},


"Options": {


"com.docker.network.bridge.default_bridge": "true",


"com.docker.network.bridge.enable_icc": "true",


"com.docker.network.bridge.enable_ip_masquerade": "true",


"com.docker.network.bridge.host_binding_ipv4": "0.0.0.0",


"com.docker.network.bridge.name": "docker0",


"com.docker.network.driver.mtu": "1500"


},


"Labels": {}


}


]


The IP address 172.17.0.2 is specified as a Portainer instance, which is a UI for managing Docker

containers. Sending a CLI request to this IP address on port 9000 is successful, which confirms that the

Portainer web interface is available, although it is not accessible remotely.


dorthi@oz:~$ nc 172.17.0.2 9000


GET / HTTP/1.1


Host: 172.17.0.2


HTTP/1.1 200 OK


Accept-Ranges: bytes


Cache-Control: max-age=31536000


Content-Length: 1299


Content-Type: text/html; charset=utf-8


Last-Modified: Thu, 05 Jan 2017 18:56:00 GMT


Date: Tue, 12 Dec 2023 17:58:54 GMT


<!DOCTYPE html>


<html lang="en" ng-app="portainer">


<head>


<meta charset="utf-8">


<title>Portainer</title>


<meta name="viewport" content="width=device-width, initial-scale=1.0">


<meta name="description" content="">


<meta name="author" content="Portainer.io">


<link rel="stylesheet" href="css/app.4eebaa14.css">


<!-- HTML5 shim, for IE6-8 support of HTML5 elements -->


<!--[if lt IE 9]>


<script src="//html5shim.googlecode.com/svn/trunk/html5.js"></script>


<![endif]-->


<script src="js/app.48ab848b.js"></script>


<!-- Fav and touch icons -->


<link rel="shortcut icon" href="ico/favicon.ico">


<link rel="apple-touch-icon-precomposed" href="ico/apple-touch-icon-precomposed.png">


</head>


<body ng-controller="MainController">


<div id="page-wrapper" ng-class="{open: toggle && $state.current.name !== 'auth' &&


$state.current.name !== 'endpointInit', nopadding: $state.current.name === 'auth' ||


$state.current.name === 'endpointInit'}" ng-cloak>


<div id="sideview" ui-view="sidebar"></div>


<div id="content-wrapper">


<div class="page-content">


<!-- Main Content -->


<div id="view" ui-view="content"></div>


</div><!-- End Page Content -->


</div><!-- End Content Wrapper -->


</div><!-- End Page Wrapper -->


</body>


</html>


The port knock sequence is sent again, and sshuttle is used to make the web interface accessible

remotely.



[After navigating to http://172.17.0.2:9000/, common credentials are attempted but are unsuccessful. It](http://172.17.0.2:9000/)

seems that Portainer prompts to set an admin password upon installation, rather than using default

credentials.


However, a little googling for setting the password via CLI reveals an issue page on the Portainer GitHub

repo, with an answer by @dilshanraja confirming that the admin password can be reset by sending a

POST request to the API with the new credentials provided as JSON data.


[https://github.com/portainer/portainer/issues/428](https://github.com/portainer/portainer/issues/428)


The password is reset:




After gaining access to the Portainer web interface, the available images are inspected.


Note: If at this stage you get Failure errors and cannot seem to list existing containers, images, and

volumes via the Portainer web interface, it is due to an issue caused by newer browsers adding the

Connection: close header to requests. You will have to either manually set it to Connection:

upgrade via BurpSuite or use an HTTP Header editing extension like Requestly .


Python:2.7-alpine seems to be a good choice to create a container due to its small size. The Image ID is

copied, and a new container is created in privileged mode.





After starting the container, the console link ">_ Console" is clicked, and "/bin/sh" is connected.


The host’s file system is now accessible as root, and the final flag can be captured.


