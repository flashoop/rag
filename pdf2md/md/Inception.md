# Inception

*Converted from: Inception.pdf*

---

# Inception
## **13 [th] April 2018 / Document No D18.100.02**

**Prepared By: Alexander Reid (Arrexel)**

**Machine Author: rsp3ar**

**Difficulty: Hard**

**Classification: Official**


Page 1 / 10


## **SYNOPSIS**

Inception is a fairly challenging box and is one of the few machines that requires pivoting to

advance. There are many different steps and techniques needed to successfully achieve root

access on the main host operating system. Good enumeration skills are an asset when

attempting this machine.


## **Skills Required**


  - Advanced knowledge of Linux

  - Understanding of various pivot

techniques


## **Skills Learned**


  - Identifying vulnerable services

  - Bypassing restrictive network filtering

  - Advanced local enumeration

techniques

  - Enumerating services using a pivot

machine


Page 2 / 10


## **Enumeration** **Nmap**

Nmap reveals an Apache server and a Squid proxy server.



Page 3 / 10


## **Squid**

The Squid proxy running on port 3128 requires no authentication. By adding it to

proxychains.conf (http 10.10.10.67 3128), it is possible to force the server to run a port scan locally.


The port scan reveals SSH running on port 22.


Page 4 / 10


​


​

​


## **Exploitation** **dompdf**

Inspecting the source of the default website on port 80 reveals a reference to **dompdf** ​ .


Browsing to **/dompdf** ​ reveals a copy of dompdf that is vulnerable to local file inclusion (v0.6.0).

The version can be easily identified by viewing the **VERSION** ​ file.


Page 5 / 10



​


​

​



​


​

​


​


​



Exploit: [https://www.exploit-db.com/exploits/33004/​](https://www.exploit-db.com/exploits/33004/)


Using the exploit is fairly trivial. Using php://filter, it is possible to base64-encode a file on the

target and add its contents to the generated PDF file. With this technique, it is possible to obtain

the Apache default site configuration file from **/etc/apache2/sites-enabled/000-default.conf** ​


The default site configuration reveals the path to a webdav installation, as well as the local path

to the webdav credentials. The credentials can be obtained using the same technique from

**/var/www/html/webdav_test_inception/webdav.passwd**


After obtaining the credentials, the hash can be easily cracked using Hashcat or John The Ripper

with the rockyou.txt wordlist.


Page 6 / 10



​


​



​


​


​


## **Webdav**

Using the previously obtained credentials, it is possible to log into the webdav instance at

**/webdav_test_inception**, however it returns 403 forbidden. Using the same credentials, it is

possible to upload a PHP script to the webdav directory to obtain remote code execution. This

can be achieved multiple different ways, however using cURL is likely the easiest.


While an advanced web-based shell is not required, it greatly simplifies things moving forward as

it is not possible to open a traditional reverse connection. It is also possible to obtain an

interactive shell using named pipes, but that technique is a bit overkill for what is required on this

machine.


The user flag can be obtained from **/home/cobb/user.txt** ​


Page 7 / 10



​


​


​

​

​


## **Privilege Escalation** **Cobb**

A bit of searching reveals some database credentials at **wordpress_4.8.3/wp-config.php** ​ in the

public web directory, however MySQL is not running on the target.


​

​

​



​


​

​

​



​


Using the password with the username **cobb** ​ (which can be obtained from /etc/passwd) on SSH

​

​



​


​

over proxychains immediately grants a shell. Running **sudo -l** ​ reveals that cobb has full sudo

​



​


​

​

access, and root can be obtained with the command **sudo su -** ​



​


​

​

​



​


​

​

​


Page 8 / 10


​


​


​


## **Root**

[Nmap binary: https://github.com/andrew-d/static-binaries/blob/master/binaries/linux/x86_64/​](https://github.com/andrew-d/static-binaries/blob/master/binaries/linux/x86_64/)


Running LinEnum or other enumeration scripts do not reveal much in this instance. The most

important information is that the machine appears to be running on **192.168.0.10** ​ . This, combined

with the absence of a flag in root.txt, indicates that the machine is likely running in some type of

container.


A bit of searching finds that the gateway ( **192.168.0.1** ​ ) can be accessed from the container. At this

point, it is easier to transfer an nmap binary to the target and run the scan directly from the

container/guest operating system. To make uploading easier, the webdav exploit can be used

again.


Running nmap reveals several services running on the gateway, including FTP, SSH and a

nameserver.


Page 9 / 10



​


​


​


​


​



Attempting to connect via FTP quickly reveals that anonymous login is enabled, and limited ability

to read files is gained. A bit of searching finds **/etc/default/tftpd-hpa** ​


Accessing the host machine via TFTP allows access to additional files which are not accessible

over FTP. Most notably **/etc/crontab** ​, which has been modified from the default. The crontab is

set to run apt update every 5 minutes. Uploading a malicious apt config will force the specified

script to run, which can be used to obtain the root flag or a reverse connection.


Page 10 / 10



​


​



​


​


