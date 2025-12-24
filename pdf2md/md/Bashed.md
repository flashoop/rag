# Bashed

*Converted from: Bashed.pdf*

---

# Bashed
## **20 [th] December 2017 / Document No D17.100.40**

**Prepared By: Alexander Reid (Arrexel)**

**Machine Author: Arrexel**

**Difficulty: Easy**

**Classification: Official**


Page 1 / 6


## **SYNOPSIS**

Bashed is a fairly easy machine which focuses mainly on fuzzing and locating important files. As

basic access to the crontab is restricted,


## **Skills Required**


  - Basic knowledge of Linux

  - Enumerating ports and services


## **Skills Learned**


  - Basic web fuzzing techniques

  - Locating recently modified files


Page 2 / 6


## **Enumeration** **Nmap**

Nmap reveals only an Apache server running on port 80.



Page 3 / 6


​


## **Dirbuster**

Dirbuster reveals, among other things, a **dev** ​ directory which contains a functional copy of

**phpbash** . This directory is hinted to in the blog post on the main site.


Page 4 / 6



​


​


## **Exploitation** **phpbash**

Using phpbash to gain a full shell is trivial. Simply using one of many connect-back commands or

using phpbash to grab a Meterpreter stager will grant access as the **www-data** ​ user.


Page 5 / 6



​


​ ​

​ ​

​

​


​

​ ​


​ ​


## **Root**

​ ​

​ ​

​

​


​

​ ​


​ ​



Exploring directories on the target quickly reveals **/scripts** ​, which is owned by the **scriptmanager** ​

​ ​

​

​


​

​ ​


​ ​



​ ​

user. The command **sudo -l** ​ reveals that the **www-data** ​ user can run any command as

​

​


​

​ ​


​ ​



​ ​

​ ​

**scriptmanager** . Running the command **sudo -u scriptmanager bash -i** ​ will spawn a bash shell

​


​

​ ​


​ ​



​ ​

​ ​

​

and give full read/write access to **/scripts** ​


​

​ ​


​ ​



​ ​

​ ​

​

​


​

​ ​


​ ​



​ ​

​ ​

​

​


Looking at the information of the files in the directory shows that **test.py** ​ appears to be executed

​ ​


​ ​



​ ​

​ ​

​

​


​

every minute. This can be inferred by reading **test.py** ​ and looking at the timestamp of **test.txt** ​ .

The text file is owned by root, so it can also be assumed that it is run as a root cron job. A root

shell can be obtained simply by modifying **test.py** ​ or creating a new Python file in the **/scripts** ​

directory, as all scripts in the directory are executed.



​ ​

​ ​

​

​


​

​ ​


shell can be obtained simply by modifying **test.py** ​ or creating a new Python file in the **/scripts** ​



​ ​

​ ​

​

​


​

​ ​


​ ​



​ ​

​ ​

​

​


​

​ ​


​ ​



​ ​

​ ​

​

​


​

​ ​


​ ​


Page 6 / 6


