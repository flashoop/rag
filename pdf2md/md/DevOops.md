# DevOops

*Converted from: DevOops.pdf*

---

# DevOops
## **13 [th] October 2018 / Document No D18.100.21**

**Prepared By: Alexander Reid (Arrexel)**

**Machine Author: lokori**

**Difficulty: Medium**

**Classification: Official**


Page 1 / 7


## **SYNOPSIS**

DevOops is a relatively quick machine to complete which focuses on XML external entities and

Python pickle vulnerabilities to gain a foothold.


## **Skills Required**


  - Basic/intermediate knowledge of Linux

  - Basic/intermediate knowledge of

Python


## **Skills Learned**


  - Exploiting XML external entities

  - Exploiting Python pickle

  - Enumerating git revision history


Page 2 / 7


## **Enumeration** **Services**

Masscan finds ports 22 and 5000 open. Nmap identifies these services as OpenSSH and

Gunicorn.


Page 3 / 7


​ ​


## **Dirbuster**

Dirbuster finds **/feed** ​ and **/upload** ​ . The upload page allows uploading of XML files.



​ ​



​ ​


Page 4 / 7


​ ​


## **Exploitation** **XML External Entities**

By uploading an XML file which references external entities, it is possible to read arbitrary files on

the target system.


Using the XXE vulnerability to read **feed.py** ​ reveals a **/newpost** ​ route in the Python web

application which accepts POST data.


Page 5 / 7



​ ​



​ ​


​ ​


## **Python Pickle**

With access to **feed.py** ​, it is fairly straightforward to exploit the **newpost** ​ route. Simply passing a

base64-encoded pickle exploit will achieve a shell.


Page 6 / 7



​ ​



​ ​


​

​


​


## **Privilege Escalation** **Git History**

There is a git repository located at **/home/roosa/work/blogfeed** ​ . Examining the commit history

with **git log** ​ shows a commit referencing an incorrect key file.


Checking the commit with **git diff d387abf63e05c9628a59195cec9311751bdb283f** ​ reveals the

root SSH key.


Page 7 / 7



​

​


​



​

​


​



​

​


​


