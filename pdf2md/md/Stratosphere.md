# Stratosphere

*Converted from: Stratosphere.pdf*

---

# Stratosphere
## **24 [th] September 2018 / Document No D18.100.19**

**Prepared By: Alexander Reid (Arrexel)**

**Machine Author: linted**

**Difficulty: Medium**

**Classification: Official**


Page 1 / 6


## **SYNOPSIS**

Stratosphere focuses on the use of an Apache Struts code execution vulnerability which was

leveraged in a large-scale breach, resulting in the disclosure of millions of peoples’ credit

information.


## **Skills Required**


  - Basic/intermediate knowledge of Linux

  - Basic understanding of Python


## **Skills Learned**


  - Identifying and Exploiting Apache

Struts

  - Exploiting Sudo NOPASSWD

  - Hijacking Python libraries


Page 2 / 6


## **Enumeration** **Nmap**

Nmap finds OpenSSH and Apache Tomcat running on the target.



Page 3 / 6


​ ​


## **Dirbuster**

Fuzzing finds a **Monitoring** ​ directory, which redirects to a **Welcome.action** ​ page. The .action

extension indicates that this is Apache Struts.


Page 4 / 6



​ ​


​


​

​


## **Exploitation** **Apache Struts**

Exploit: [https://github.com/mazen160/struts-pwn​](https://github.com/mazen160/struts-pwn)


Using the above exploit is very straightforward, however there is a fairly restrictive firewall that

​

​



​


​

​



​


prevents a basic reverse shell. Viewing the contents of **db_connect** ​ in the current directory

​



​


​

exposes some MySQL credentials (admin:admin). Using this, it is possible to obtain the **richard** ​



​


​

​

user’s SSH password.



​


​

​



​


​

​


Page 5 / 6


​ ​


​ ​


## **Privilege Escalation** **Python Library Hijacking**

Running **sudo -l** ​ reveals that richard is able to run **/usr/bin/python* /home/richard/test.py** ​,

however richard does not have write permissions for the script.


Examining the script shows that **hashlib** ​ is imported. By creating **hashlib.py** ​ in the same directory,

python will import this module instead of the real hashlib and execute the contents.


Page 6 / 6



​ ​


​ ​


