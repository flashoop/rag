# Mischief

*Converted from: Mischief.pdf*

---

# Mischief
## **3 [rd] January 2019 / Document No D19.100.01**

**Prepared By: egre55**

**Machine Author: trickster0**

**Difficulty: Insane**

**Classification: Official**


Page 1 / 14


## **SYNOPSIS**

Mischief is hard to insane difficulty machine that highlights the risks involved with exposing

SNMP, and the dangers of passing credentials over the command line. It also features a "ping"

admin page - functionality often found on appliances, which is worth testing for RCE

vulnerabilities.


## **Skills Required**


  - Intermediate knowledge of Web and

SNMP enumeration techniques

  - Basic knowledge of IPv6

  - Basic knowledge of Linux


## **Skills Learned**


  - Familiarity with SNMP OIDs

  - IPv6 decimal to hexadecimal encoding

techniques

  - Establishment of IPv6 reverse shell


Page 2 / 14


## **Enumeration** **Nmap**





TCP


## **WhatWeb**

This is confirmed by visiting the site. Attempts to login using common credentials such as

admin:admin or admin:password are not successful.


The Nmap output showed a potential Radicale contacts and calendar server installation (which

stands on a Python web server), but this is likely a false positive. WhatWeb - developed by

Andrew Horton (@urbanadventurer) and Brendan Coles (@_bcoles) - also detects the Python

HTTPServer, but there is no mention of Radicale.


[https://github.com/urbanadventurer/WhatWeb](https://github.com/urbanadventurer/WhatWeb)


Page 4 / 14


​


## **SNMP**

SNMP can be used to disclose a treasure trove of useful information, and if the community is

writable it is also possible to make changes to the destination system. Many devices make use of

SNMP and it is often possible to guess or bruteforce the community names. SNMP Object

Identifiers (OIDs) correspond to different aspects of the system, as in the example list below.


IP Addresses 1.3.6.1.2.1.4.34.1.3

Running Processes 1.3.6.1.2.1.25.4.2.1.2

System Information 1.3.6.1.2.1.1.1

Hostname 1.3.6.1.2.1.1.5

Uptime 1.3.6.1.2.1.1.3

Mountpoints 1.3.6.1.2.1.25.2.3.1.3

Running Software Paths 1.3.6.1.2.1.25.4.2.1.4

Running Software Parameters 1.3.6.1.2.1.25.4.2.1.5

Listening UDP Ports 1.3.6.1.2.1.7.5.1.2.0.0.0.0

Listening TCP Ports 1.3.6.1.2.1.6.13.1.3.0.0.0.0

Network Information 1.3.6.1.2.1.4.20.1


snmpwalk is able to query these values, and on Mischief, the default "public" read-only

community string is accessible using SNMP v1.


Inspection of the running software parameters reveals credentials used to instantiate the Python

HTTPServer - loki:godofmischiefisloki​


Page 5 / 14



​


​



Inspection of the IP Addresses reveals a decimal encoded IPv6 address, which is decoded using

a bash script (see **Appendix A** ​ ).


This can be further automated using an SNMP IPv6 Enumeration Tool called Enyx (created by

trickster0), which is able to query the remote system directly and extract multiple ipv6 entries.


[https://github.com/trickster0/Enyx](https://github.com/trickster0/Enyx)


Page 6 / 14



​



​


## **Nmap (IPv6)**

Nmap reveals an Apache web server bound to the IPv6 address.



Page 7 / 14


​ ​


​


## **Exploitation** **Gain Access to Command Execution Panel**

In order to navigate to the IPv6 website, the address needs to be encapsulated in square

brackets.


http://[dead:beef::250:56ff:fe8f:6451]


A Command Execution Panel is now accessible but requires authentication.


The credentials gained from SNMP enumeration (loki:godofmischief​ ) are used to access ​

the website running on 3366.


This results in additional credentials - loki:trickeryanddeceit​


Attempting to login to the IPv6 website using these credentials is unsuccessful. However, after

trying common usernames (admin, administrator) with the password, access is gained using

administrator:trickeryanddeceit


Page 8 / 14



​ ​


​



​ ​


​


​ ​


​ ​ ​ ​


## **Command Execution**

This reveals that the admin has implemented a ping functionality (this functionality can also be

found on many appliances).


Unfortunately, this hasn’t just been restricted to running the ping command. After inputting the

command "id;​ ", output is returned confirming that RCE is occuring in the context of the ​

www-data user.


A credentials file in the user’s home directory is referred to, but the commands dir​ and ​ ls​ have ​

been restricted. Instead, attention can be turned to gaining a reverse shell.


Page 9 / 14



​ ​


​ ​ ​ ​



​ ​


​ ​ ​ ​


​ ​ ​ ​


​ ​


## **Reverse Shell**

The command execution request is sent to Burp Suite in order to quickly experiment with

different payloads using the Repeater module (CTRL + R). The Python reverse shell on

pentestmonkey.net can be modified to work with IPv6 addressing by changing

"socket.AF_INET​ " to "​ socket.AF_INET6​ ". The IPv6 callback address is specified. ​


[http://pentestmonkey.net/cheat-sheet/shells/reverse-shell-cheat-sheet](http://pentestmonkey.net/cheat-sheet/shells/reverse-shell-cheat-sheet)


​ ​



​ ​ ​ ​


​ ​



​ ​ ​ ​


​ ​



​ ​ ​ ​


After adding this to the request (ensuring a trailing ;​ ), it is URL encoded (CTRL + U). ​



​ ​ ​ ​


​ ​



​ ​ ​ ​


​ ​



​ ​ ​ ​


​ ​


A firewall rule is added to allow access from the destination IPv6 address to port 443, and a ncat
IPv6 listener is stood up.


Page 10 / 14



​ ​ ​ ​


​ ​


The reverse shell is then upgraded, and TERM variable set. The user.txt can now be captured.





Page 11 / 14


​


​ ​


## **Privilege Escalation**

The credentials file in loki’s home directory is examined, which contains the password
lokiisthebestnorsegod. Using su or ssh a shell as loki can be gained. ​


It is worth checking the .bash_history file in case credentials has been passed over the
command-line. This reveals the password lokipasswordmischieftrickery​ . ​



​


​ ​



​


​ ​


The root.txt is not in the usual place, but it can be easily found.



Page 13 / 14


## **Appendix A**







Page 14 / 14


