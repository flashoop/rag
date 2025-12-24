# Teacher

*Converted from: Teacher.pdf*

---

# Teacher
## **13 [th] April 2019 / Document No D19.100.14**

**Prepared By: mrh4sh**

**Machine Author: Gioo**

**Difficulty: Medium**

**Classification: Official**


Page 1 / 16


​ ​ ​ ​


## **SYNOPSIS**

Teacher is a "​ medium​ "​ difficulty machine, which teaches techniques for identifying and exploiting ​

logical flaws and vulnerabilities of outdated modules within popular CMS (in this instance

Moodle), enumeration of sensitive information within the backend database and leverage

misconfigurations on the operating system, which lead to a complete compromise of a system.



​ ​ ​ ​

## **Skills Required**


  - Basic Linux Knowledge

  - Basic MySQL Knowledge



​ ​ ​ ​

## **Skills Learned**


  - Website Enumeration

  - Password Brute-Forcing

  - Moodle Quiz Module Exploitation

  - Database Enumeration

  - Password Cracking

  - Linux Symlink Misconfiguration


Page 2 / 16


​


## **Enumeration** **Nmap**

​



​



​



Nmap output shows that only port available is the HTTP service. The version of the web server

running is _Apache httpd 2.4.25 ((Debian))_ ​ ​. As the banner suggests, the web server is running on a

Linux Debian distribution.


Page 3 / 16


## **Web Enumeration**

The web server is examined and a static web page is shown, describing the service as a web

portal of a school used by teachers and students. One of the announcements of the web page

that the school has implemented a new portal where students can submit their homework and

teachers could review it.


Further analysis to the source code shows that the link to the image is valid, but the content is not

an image; it’s actually a message from one of the users to the ServiceDesk team.


Page 4 / 16


​

​



​

​



Part of the password of the user _Giovanni_ ​ ​is found.

A directory search to the main URL shows that the CMS _Moodle_ ​ ​is running on the web server,

reachable from the following URL:


http://10.10.10.153/moodle/


Page 5 / 16



​

​


​



Based on the message previously discovered, the user is able to authenticate on Moodle CMS as

user _Giovanni_ ​ ​ performing a brute-force attack in order to complete the password previously

discovered.


Therefore, the valid credentials discovered are the following:


**giovanni:Th4C00lTheacha#**


Page 6 / 16



​


​

​ ​

​


​


​ ​


## **Foothold** **CVE-2018-1133 Exploitation**

An analysis of the Moodle CMS running on the web server shows that an outdated vulnerable

module is installed. This allows an attacker to leverage the vulnerability which affects the _quiz_ ​

​ ​

​


​


​ ​



​

module, also known as _Evil Teacher_ ​ ​or _CVE-2018-1133._ ​ ​ The module allows a user with role

​


​


​ ​



​

​ ​

_teacher_ ​to create a quiz with many types of questions for users with _student_ ​ ​role. In order to

prevent users with student role to cheat and share their results there will be question which


​


​ ​



​

​ ​

​


allows a user with teacher role to enter a mathematical formula along with all the other questions,

which will be then evaluated by Moodle dynamically on randomized input variables. The file

_questiontype.php_ ​ from Moodle uses the function _eval()_ ​ ​ in order to evaluate the answer provided

for the aforementioned question, and the lack of input sanitization allows the input to be

executed by the function, resulting in a Remote Code Execution through arbitrary PHP input

code.


​ ​



​

​ ​

​


​


​ ​



​

​ ​

​


​


​ ​



​

​ ​

​


​


To be noted that the user _Giovanni_ ​ ​is found to be having the role _teacher_ ​ ​, which allows him to

create a quiz and to leverage the vulnerability in order to get a shell on the system.


Page 7 / 16


​



A dummy quiz is created filling all the mandatory fields.


A new _calculated_ ​ ​ type question is added in order to inject arbitrary PHP code in the answer of

the question, in order to perform a Remote Code Execution.


Page 8 / 16



​



​


​



In the following example, the payload _/*{a*/`$_GET[0]`;//{x}}_ ​ ​ is added.


Once the question has been added, the following parameter has to be appended in querystring
at the end of the URL of the quiz in order to perform a Remote Code Execution. The payload has
to be URL encoded, like in the following example:



​



​



​



​



​


​


## **Database Inspection**

An analysis of the _config.php_ ​ ​ file within the Moodle CMS directory on the file system shows the

credentials of the backend database.



​



​



​


The credentials retrieved are the following:


root:Welkom1!



​


Page 10 / 16


​ ​

​



This allows an analysis of the backend database of the Moodle CMS, which is then found to

contain what it seems to be a backup account for the user _Giovanni_ ​ ​ within the _mdl_user_ ​ ​table of

the database _moodle_ ​ ​:



​ ​

​



​ ​

​



​ ​

​


Page 11 / 16


​



​



​



The details above show that the MD5 password hash of the backup user _Giovannibak_ ​ ​ are

different from the other password hashes.


A dictionary based attack is performed in order to crack the MD5 password hash of the

aforementioned user, resulting in the following credentials to be discovered:


Giovannibak:7a860966115182402ed06375cf0a22af:expelled



​



​



​


Page 12 / 16


Page 13 / 16


​



​



​



These credentials are then found to be valid for the user _giovanni_ ​ ​within the system, therefore

the content of the user flag can be gained.



​



​



​


Page 14 / 16


​ ​

​ ​


​

​ ​


​


​

​


## **Post-Exploitation** **Upgrade from telnet shell**

The session as user _giovanni_ ​ ​shows that two folders are available in the home directory. The ​

directory _courses_ ​ ​contains answers of algebra tests, and the directory _tmp_ ​ ​contains an archived backup

of courses and an extracted directory of the archived file. The backup process is handled by a cronjob

with user _root_ ​ ​.

Further enumeration of the system shows that the _/usr/bin/_ ​ ​directory contains a file called _backup.sh._ ​


​


​

​



​ ​

​ ​


​

​ ​


​


​

​



​ ​

​ ​


​

​ ​


​


​

​



​ ​

​ ​


​

​ ​


Above is the content the script, which instructs the system to:


1) browse to the directory /home/giovanni/work


2) create an archive with the content of the courses directory


3) browse to /home/giovanni/work/tmp


4) extract the content of the archive

5) Provide read and write permissions to _everybody_ ​ ​ on the /home/giovanni/work/tmp directory

and subdirectories.


The aforementioned steps show that the script can be leveraged in order to retrieve the content of the

_/root_ ​folder and gain the root flag. The _courses_ ​ ​directory can be renamed or deleted due to weak

permission, and be replaced with a symlink pointing to the _/root_ ​ ​directory, where the script would then

create an archive of the content and extract it into /home/giovanni/work/tmp.


Page 15 / 16


Once the cronjob runs the script, it is then possible to gain the root flag.





Page 16 / 16


