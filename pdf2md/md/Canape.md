# Canape

*Converted from: Canape.pdf*

---

# Canape
## **15 [th] September 2018 / Document No D18.100.17**

**Prepared By: Alexander Reid (Arrexel)**

**Machine Author: overcast**

**Difficulty: Medium**

**Classification: Official**


Page 1 / 8


## **SYNOPSIS**

Canape is a moderate difficulty machine, however the use of a file (.git) that is not included in the

dirbuster wordlists can greatly increase the difficulty for some users. This machine also requires a

basic understanding of Python to be able to find the exploitable point in the application.


## **Skills Required**


  - Intermediate knowledge of Linux

  - Basic/Intermediate knowledge of

Python


## **Skills Learned**


  - Exploiting insecure Python Pickling

  - Exploiting Apache CouchDB

  - Exploiting Sudo NOPASSWD


Page 2 / 8


## **Enumeration** **Nmap**

Nmap finds only Apache and OpenSSH running on the target.



Page 3 / 8


​

​ ​

​


## **Web Fuzzing**

Attempting to fuzz Apache to find files and directories is a bit more challenging, as all requests

return 200. By using Wfuzz, it is possible to filter out false positives.


​

​ ​

​



​

​ ​

​



Using Wfuzz with the SecLists’ Discovery/Web-Content/common.txt file immediately reveals a **.git** ​

​ ​

​



​

directory. Accessing the **config** ​ directory finds a hostname **git.canape.htb** ​ (which should be

​



​

​ ​

added to /etc/hosts) as well a project named **simpsons.git** ​ .



​

​ ​

​


Page 4 / 8


​ ​


​ ​


## **Exploitation** **Python Pickle**

With access to the source of the Python flask application which runs the website, it is possible to

develop an exploit to abuse the function for storing submitted quotes.


The **submit** ​ route of the flask app checks to make sure the **character** ​ variable contains a valid

Simpsons character, however passing the name directly will cause the app to create an invalid

pickle file. By including the character name as part of the os command and splitting the pickle

data between **character** ​ and **quote** ​, the check will pass and the data will be recombined

server-side.


Page 5 / 8



​ ​


​ ​



​ ​


​ ​


​

​

​ ​


## **Privilege Escalation** **Homer - Apache CouchDB**

Exploit: [https://www.exploit-db.com/exploits/44913/​](https://www.exploit-db.com/exploits/44913/)


[Explanation: https://justi.cz/security/2017/11/14/couchdb-rce-npm.html​](https://justi.cz/security/2017/11/14/couchdb-rce-npm.html)


Running **ps aux** ​ reveals that Apache CouchDB is running as the **homer** ​ user.


A quick search finds CVE-2017-12636, which is a code execution vulnerability in CouchDB < 2.1.0.

The Exploit-DB proof of concept has some issues in this instance, so directly using the cURL

example from the explanation link is a good alternative.


Page 6 / 8



​

​

​ ​



​

​

​ ​


​

​

​


​



Once an admin account is created, full read access is gained to the databases. The **passwords** ​

​

​


​



​

database can be listed with **curl 127.0.0.1:5984/passwords/_all_docs --user ‘arrexel:password’** ​

​


​



​

​

and read by changing **_all_docs** ​ to the doc ID.


​



​

​

​


​



​

​

​


The first ID listed contains the SSH password for **homer** ​ in plaintext.



​

​

​


​



​

​

​


​


Page 7 / 8


​ ​


​ ​


## **Root - Sudo NOPASSWD**

Running **sudo -l** ​ as **homer** ​ reveals that there is a NOPASSWD entry for python pip.


Simply creating a **setup.py** ​ file and running **sudo pip install .** ​ will execute the file as root.


Page 8 / 8



​ ​


​ ​



​ ​


​ ​



​ ​


​ ​


