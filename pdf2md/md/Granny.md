# Granny
## **12 [th] October 2017 / Document No D17.100.17**

**Prepared By: Alexander Reid (Arrexel)**

**Machine Author: ch4p**

**Difficulty: Easy**

**Classification: Official**


Page 1 / 5


## **SYNOPSIS**

Granny, while similar to Grandpa, can be exploited using several different methods. The intended

method of solving this machine is the widely-known Webdav upload vulnerability.


## **Skills Required**


  - Basic knowledge of Windows

  - Enumerating ports and services


## **Skills Learned**


  - Identifying known vulnerabilities

  - Identifying stable processes

  - Basic Windows privilege escalation

techniques


Page 2 / 5


​ ​


​


## **Enumeration** **Nmap**

Nmap reveals just one open service, Microsoft IIS version 6.0. Some searching reveals a remote

code execution vulnerability (CVE-2017-7269​ ). There is a proof of concept that requires some ​

modification, as well as a Metasploit module.


[Proof of concept: https://www.exploit-db.com/exploits/16471/​](https://www.exploit-db.com/exploits/16471/)


Page 3 / 5



​ ​


​


​


## **Exploitation**

Executing the Metasploit module **iis_webdav_upload_asp** ​ immediately grants a shell. The target

appears to be Windows Server 2003 with x86 architecture.


Page 4 / 5



​


​


​

​

​

​


## **Privilege Escalation**

Running **local_exploit_suggester** ​ in Metasploit returns several recommendations:


  - exploit/windows/local/ms14_058_track_popup_menu

  - exploit/windows/local/ms14_070_tcpip_ioctl

  - exploit/windows/local/ms15_051_client_copy_image

  - … and 3 more …


At this point it is a good idea to migrate to a process running under **NT AUTHORITY\NETWORK** ​

**SERVICE** . In this case **davcdata.exe** ​ seemed to be the only stable process available.


​

​



​


​

​


The intended exploit in this case is **ms15_051_client_copy_image** ​, which immediately grants a

​



​


​

​

​

root shell. The root flag can be obtained from **C:\Documents and** ​



​


​

​

​

​

**Settings\Administrator\Desktop\root.txt**



​


​

​

​

​



​


​

​

​

​


Page 5 / 5


