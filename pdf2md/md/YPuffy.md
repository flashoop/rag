# YPuffy

*Converted from: YPuffy.pdf*

---

# Ypuffy
## **4 [th] February 2019 / Document No D19.100.06**

**Prepared By: egre55**

**Machine Author: AuxSarge**

**Difficulty: Medium**

**Classification: Official**


Page 1 / 15


## **SYNOPSIS**

Ypuffy is medium difficulty machine which highlights the danger of allowing LDAP null sessions. It

also features an interesting SSH CA authentication privilege escalation, via the OpenBSD doas

command. An additional privilege escalation involving Xorg is also possible.


## **Skills Required**


  - Basic knowledge of LDAP and SMB

enumeration tools

  - Basic knowledge of Linux/BSD


## **Skills Learned**


  - Crafting custom LDAP queries /

manually finding the RootDSE

  - Enumeration and exploitation of SSH

CA authentication configurations


Page 2 / 15


## **Enumeration** **Nmap**







Page 3 / 15


## **Inspection of Web Page**

An attempt is made to navigate to port 80, but the server sends a FIN packet to immediately

close the connection.


Page 4 / 15


## **Searching for known vulnerabilities**

The following software/versions are identified:


Samba 4.7.6

OpenSSH 7.7

LDAP (version unknown)

OpenBSD httpd (version unknown)


However, searchsploit doesn’t reveal anything of interest. Attempting a null session SMB

connection is also unsuccessful.


Page 5 / 15


## **Inspection of LDAP**

In order to query the LDAP server for entries, it is necessary to know the RootDSE. This is the

instance by which a directory data tree is identified.


This can be found using the Nmap script "ldap-rootdse.nse"





This accomplishes the task, but it would be good to understand how it did this. In IppSec’s Ypuffy

video, he shows how examination of network traffic can reveal what is going on underneath the

hood. This is worth checking out.


This knowledge allows for custom ldapsearch queries can be crafted, which can return the

RootDSE and other values.


The Nmap script is run and Wireshark captures the traffic. Examination of the LDAP packets

reveals an "attributes" section of the packet.


Page 6 / 15


Right-click on "attributes", select "Copy", then "...as Printable Text". After formatting into a single

space-delimited line of LDAP attributes, the following ldapsearch query can be crafted.





Output from this reveals that the RootDSE is "dc=hackthebox,dc=htb".


The following ldapsearch query can now be crafted, which will return the subitems of any object

class, under the RootDSE.


Page 7 / 15


Of particular interest is the user "alice1978", who has an NT password hash stored in the

"sambaNTPassword" attribute.


An empty LM hash of the same length is generated, and combined to form the NTLM hash.





Page 8 / 15


## **Inspection of SMB**

SMBMap accepts a password hash in place of a password, and a connection as "alice1978" is

successful. The share "alice" is accessible and contains a PuTTY SSH private key.

This is downloaded, confirmed as PuTTY format and converted to OpenSSH format.







Page 9 / 15


​ ​

​


## **Foothold** **Enumeration** doas

After connecting over SSH, LinEnum identifies the system as OpenBSD 6.3, and reveals the user

"userca". A CA certificate pair is in the user’s home directory.


sudo is not available, but OpenBSD’s "doas" utility allows for much the same functionality.

Examination of the file /etc/doas.conf​ reveals that alice is permitted to run ​

/usr/bin/ssh-keygen as userca, without having to enter a password. ​


Page 10 / 15



​ ​

​



​ ​

​


## Web server

A request to the webpage is sent from inside the machine, but again this yields no output.

Examination of webroot reveals several potentially interesting folders.


The access log is checked, and requests to /sshauth are visible.


Requests are sent to this URL, and the RSA key for alice1978 is returned, although nothing is

returned for root.





The httpd configuration file is checked, which reveals that requests to the /sshauth path are

handled by a Python/WSGI application.


Page 11 / 15


Page 12 / 15


## SSH

The SSH config file is examined, which reveals that the previous URL can also contain a

"principals" parameter.





This URL is requested with various system users specified. SSH CA authentication maps the

principal "3m3rgencyB4ckd00r" to root.


Page 13 / 15


## **Privilege Escalation** **Signing root SSH key**

In the Ypuffy video, IppSec exploits this scenario by first generating an SSH key pair for root.

now possible to login as root using the signed SSH key and gain the root flag.





Page 14 / 15


## **Additional Privilege Escalation** **Xorg**

The xorg-x11-server package on the system suffers from a root privilege escalation vulnerability

(CVE-2018-14665). This vulnerability was discovered by Narendra Shinde (@nushinde), while the

exploit code below was authored by Marco Ivaldi (@0xdea).


https://lists.x.org/archives/xorg-announce/2018-October/002927.html

https://www.exploit-db.com/exploits/45742









Page 15 / 15


