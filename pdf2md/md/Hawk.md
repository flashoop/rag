# Hawk

*Converted from: Hawk.pdf*

---

# Hawk
## **25 [th] November 2018 / Document No D18.100.29**

**Prepared By: egre55**

**Machine Author: mr_h4sh**

**Difficulty: Hard**

**Classification: Official**


Page 1 / 21


## **SYNOPSIS**

Hawk is a medium to hard difficulty machine, which provides excellent practice in pentesting

Drupal. The exploitable H2 DBMS installation is also realistic as web-based SQL consoles

(RavenDB etc.) are found in many environments. The OpenSSL decryption challenge increases

the difficulty of this machine.


## **Skills Required**


  - Basic Linux post-exploitation

knowledge

  - Knowledge of tunneling techniques


## **Skills Learned**


  - OpenSSL cipher experimentation,

brute force and decryption (courtesy of

IppSec Hawk video)

  - Drupal enumeration and exploitation

  - H2 DBMS enumeration and

exploitation


Page 2 / 21


## **Enumeration** **Nmap**





Nmap reveals a vsftpd installation, which allows anonymous authentication, and SSH on the

default port. A Drupal 7 installation running on Apache 2.4.29 is available on port 80, and the H2

database console is available on port 8082, although remote connections are disabled.


Page 3 / 21


​


## **FTP / Examination of Interesting File**

The file .drupal.txt.enc is identified and downloaded for further inspection.


OpenSSL encrypted files comprise of the 8-byte signature “Salted__”, followed by an 8-byte salt,

[followed by encrypted data. http://justsolve.archiveteam.org/wiki/OpenSSL_salted_format​](http://justsolve.archiveteam.org/wiki/OpenSSL_salted_format)


Page 4 / 21



​



​


​

​


## **Identification of OpenSSL Cipher**

In the Hawk video, IppSec demonstrates a really good methodology for identifying the cipher that

was used, and this process is replicated below.


“wc -c” reveals that the file is 176 bytes, and as this is divisible by 16 is a strong indication that it

was created using a block cipher such as AES.


The idea is to create plaintext files ranging in size between 8 bytes (a possible minimum block

size), and 176 bytes (the ciphertext), in steps of 8. After some likely initial ciphers have been

selected, these ciphers are used to create ciphertexts. Those cipher/size combinations that are

not 176 bytes can be discarded, leaving a smaller number of candidate ciphers. The

script/commands below are available in **Appendix A** ​ .


The plaintext files and initial ciphers are chosen. The script **encrypt.sh** ​ encrypts each plaintext file

from 8 to 176 using the selected ciphers. The regex ensures that the produced ciphertexts

(ending with .enc) aren’t used as input.


Page 5 / 21



​

​


The script completes, and the ciphertexts have been created. Selecting only those cipher/size

combinations that equal 176 bytes has resulted in a smaller list of possible ciphers.


They are:


  - aes-128-cbc

  - aes-256-cbc

  - aes-256-ecb

  - aria-128-cbc

  - des


Page 6 / 21


## **OpenSSL Bruteforce and Recovery of Plaintext**

aes-256-cbc is quite common and is chosen. With a cipher selected, the package archive is

queried for openssl brute force tools. The tool, bruteforce-salted-openssl is the first result and is

already installed.


After providing the password file, cipher and ciphertext, the tool is run and almost immediately it

identifies as password candidate of “friends”.


The password is provided and the openssl command below is invoked to recover the plaintext.


Given that the H2 console is not directly accessible, attention can now be turned to the Drupal 7

installation.


Page 7 / 21


## **Drupal Enumeration** Drupal Core Version Enumeration

The default Drupal landing page is accessible and displays a login form. More customised

installations (websites etc.) may not have a user login or registration section on the main page,

but this is typically accessible at /user.


There are a number of critical unauthenticated RCE vulnerabilities affecting Drupal 6 and 7. The

“Drupalgeddon” 2 and 3 vulnerabilities were announced in March and April 2018 respectively,

and so it is worth checking the Drupal CHANGELOG.txt, to see if it is vulnerable. This installation

is 7.58, which is patched against these vulnerabilities.


Page 8 / 21


Page 9 / 21


## Drupal User Enumeration

Often, users are made Drupal administrators to facilitate easy content management, and it is

worth identifying these users as they may have weak passwords. In the Hawk video, IppSec

shows a method of user enumeration which may not be detected. When attempting to log in, if

either username or password is incorrect, the typical error message “Sorry, unrecognized

username or password” is displayed. However, by inputting an invalid email address in the user

registration form (e.g. by including a ; character), valid usernames can be enumerated without

creating a mass of dummy accounts.


Page 10 / 21


## **Exploitation** **Enabling of PHP filter Module and RCE**

Once logged in as admin, the available modules are examined and the “PHP filter” module is

enabled.


A webshell is selected and edited with the callback details, before being copied to the clipboard,

and a netcat listener is stood up.


Page 11 / 21


After clicking “Preview”, a connection is received and the commands below are issued to

upgrade the shell.





Page 12 / 21


## **Post-Exploitation** **Identification of Drupal Database Credentials**

The Drupal installation can now be examined in further detail. The drush command line utility is

useful for interacting with Drupal, and allows for additional Drupal modules to be installed, among

other powerful features, but it is not present on this installation. The settings.php associated with

the default site is inspected, as this likely contains database credentials.


/var/www/html/sites/default/settings.php


Page 13 / 21


## **Cracking Drupal Hashes**

Typical drupal installations may have multiple user accounts configured. If in scope as part of a

pentest, or as a pre-emptive check by defenders, the Drupal usernames and password hashes

can be dumped, and subjected to an offline brute force attack in order to recover the plaintext

passwords (although in this case the password is not in rockyou.txt).





hashcat supports the Drupal 7 hash format.





Page 14 / 21


​


## **Password Reuse**

Password reuse is extremely common and the password **drupal4hawk** ​ should be tried with other

identified accounts. The same password has been configured for the unprivileged user daniel,

and the user flag can now be obtained.


Page 15 / 21



​


## **H2 (DBMS) Enumeration**

H2 is an open source database management system written in Java. Curl is used to verify that the

login page is accessible internally.


Page 16 / 21


## **Privilege Escalation** **H2 (DBMS) Manual Exploitation**

A Google search for “h2 database shell” returns a blog post by Matheus Bernandes in which he

outlines his discovery that the H2 Database CREATE ALIAS function can be used to call Java

code.


[https://mthbernardes.github.io/rce/2018/03/14/abusing-h2-database-alias.html](https://mthbernardes.github.io/rce/2018/03/14/abusing-h2-database-alias.html)


Using the credentials daniel:drupal4hawk, an SSH tunnel is created to allow access to the H2

database console.


Page 17 / 21


netstat confirms that 127.0.0.1:9002 is open and this H2 database console is now accessible.


After inputting a new database name (i.e. aewfadtgf as below), the connection succeeds with a

default username of “sa” and no password, and it is now possible to access the console .


Page 18 / 21


Using Matheus Bernandes’s example, it is confirmed that the database is operating in the context

of root.





The file exec.py is created with the python reverse shell one-liner below, and made executable.





The script is run and a reverse shell running as root is received.




## **H2 (DBMS) Exploit Scripts**

Matheus Bernandes has also created a script to automate the exploitation of H2, which works

well.


Querying searchsploit for “h2 1.4.196”, reveals another H2 exploit script created by h4ckNinja,


Page 20 / 21


## **Appendix A**















Page 21 / 21


