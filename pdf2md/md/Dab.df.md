# Dab.df

*Converted from: Dab.df.pdf*

---

# Dab
## **29 [th] January 2019 / Document No D19.100.05**

**Prepared By: egre55**

**Machine Author: snowscan**

**Difficulty: Hard**

**Classification: Official**


Page 1 / 20


## **SYNOPSIS**

Dab is a challenging machine, that features an interesting enumeration and exploitation path. It

teaches techniques and concepts that are useful to know when assessing Web and Linux

environments.


## **Skills Required**


  - Basic knowledge of Web application

enumeration techniques

  - Basic Linux enumeration skills

  - Basic knowledge of binary debugging


## **Skills Learned**


  - Wfuzz advanced enumeration

  - Memcached enumeration

  - OpenSSH username enumeration

  - System search path order abuse

  - Creation of a malicious shared library


Page 2 / 20


## **Enumeration** **Nmap**





Nmap reveals that FTP and SSH are available. An nginx web server is also present and serving

content on ports 80 and 8080.


Page 3 / 20


​ ​


​


## **Port 80** Wfuzz brute force admin password

[The request to http://10.10.10.86/login​](http://10.10.10.86/login) ​ is captured in Burp Suite and parameters examined.


Wfuzz is used to brute force the admin password. Incorrect responses are 18 lines in length and

these are hidden from output.


​



​ ​


​



​ ​


​



​ ​


​



​ ​


​



​ ​


This reveals the credentials admin:Password1 ​



​ ​


​


Page 4 / 20


## Inspection of Stock web page

Once logged in, a list of stock items and their quantities is available.


Examination of the source reveals debug code, which indicates that the tables were loaded from

a MySQL database.


After refreshing the page, it seems that this request was instead loaded from a cache.


Caches are used to reduce the number of database queries by holding data in memory, from

which it is faster to retrieve, and allows a website to serve a greater number of visitors.


Page 5 / 20


## **Port 8080**

Requests result in the error message "Access denied: password authentication cookie is not set".


Page 6 / 20


## Wfuzz brute force cookie value

Incorrect responses result in output with 29 words, and are excluded. The cookie value of

"secret" is quickly found.





Page 7 / 20


## Inspection of cache engine

After setting the cookie value using Burp Suite or Cookie Manager etc., the page is accessed

again. Functionality to perform a TCP socket test is available.


Attempts to use symbols result in the error "Suspected hacking attempt detected".


In his Dab video, IppSec demonstrates that effectively all useful symbols are blocked, with the

exception of space.






## Internal port scan

The TCP socket test functionality is automated using Wfuzz to perform an internal port scan.





This reveals that port 11211 is open, which is associated with Memcached.



Page 9 / 20


​

​ ​


## Memcached Enumeration

The Memcached GitHub repo, and cheat sheet from lzone.de are good command references.


[https://github.com/memcached/memcached/wiki/Commands](https://github.com/memcached/memcached/wiki/Commands)

[https://lzone.de/cheat-sheet/memcached](https://lzone.de/cheat-sheet/memcached)


In Memcached, values are associated with a particular slab. These storage structures consist of

1MB pages, which are further divided into chunks.


[Source: https://www.mikeperham.com/2009/06/22/slabs-pages-chunks-and-memcached/​](https://www.mikeperham.com/2009/06/22/slabs-pages-chunks-and-memcached/)


Information on slab size and performance is returned using the command stats slabs​ .​

​

​ ​



Page 10 / 20



​

​ ​


​ ​



​ ​



Slab class "16" has a chunk size of 2904 while slab class "26" has a chunksize of 27120.


According to the lzone.de cheat sheet, the command to dump slab class items takes the form:


​ ​



​ ​



​ ​



The slabs are examined, revealing that "16" corresponds to "stock", and "26" to "users".


​ ​



​ ​



​ ​



​ ​



The items associated with "users" are retrieved using get users​ . ​



​ ​


Page 11 / 20


​

​ ​



HTML encoded JSON output is returned.


[A good reference for mapping HTML codes is https://www.ascii.cl/htmlcodes.htm​](https://www.ascii.cl/htmlcodes.htm)


Using vi​ all instances of &#34; are replaced with " ​



​

​ ​



​

​ ​



​

​ ​



​

​ ​



​

​ ​


In his Dab video, IppSec shows a nice method of beautifying the JSON data from the command

line, which allows for data to be more easily manipulated.



​

​ ​



​

​ ​



​

​ ​



​

​ ​


Page 12 / 20


​ ​


## **OpenSSH Username Enumeration**

OpenSSH 7.2p2 is installed, which is vulnerable to username enumeration via a timing attack

(CVE-2018-15473).


Justin Gardner (@Rhynorater) has created an exploit for this, which is available in the Exploit-DB.


[https://www.exploit-db.com/exploits/45233](https://www.exploit-db.com/exploits/45233)


The exploit works well, and the user genevieve​ ​ is identified as a valid user.



​ ​



​ ​



​ ​



​ ​


The password hash associated with genevieve is extracted, identified as MD5, and cracked using

John the Ripper.



​ ​



​ ​



​ ​


Page 13 / 20


​ ​



​ ​



The credentials genevieve:Princess1​ have been found. ​



​ ​


Page 14 / 20


## **Foothold** **Examination of setuid binaries**

After logging in over SSH, the user flag is captured, and setuid binaries are then examined. This

reveals that "ldconfig" and a "myexec" custom binary have been configured as setuid.





ldconfig is used to create the links for cache to shared libraries found in the specified paths.


ldd is used to check the dynamic libraries "myexec" will attempt to load.





This reveals the custom library "libseclogin.so".


The directories which will be searched for dynamic libraries are enumerated





Page 15 / 20


The non-standard directory "/tmp" has been added to the search path.


Administrators can extend the library search path by specifying additional directories in conf files

under "/etc/ld.so.conf.d/".





The following articles are useful reference.


[https://stackoverflow.com/questions/9151491/extending-default-lib-search-path-in-ubuntu](https://stackoverflow.com/questions/9151491/extending-default-lib-search-path-in-ubuntu)

[https://unix.stackexchange.com/questions/22926/where-do-executables-look-for-shared-objects-](https://unix.stackexchange.com/questions/22926/where-do-executables-look-for-shared-objects-at-runtime)

[at-runtime](https://unix.stackexchange.com/questions/22926/where-do-executables-look-for-shared-objects-at-runtime)


The myexec binary is executed, but it requires a password.


Page 16 / 20


## **Examination of binary in debugger**

"myexec" and associated library are downloaded using scp and examined using PEDA/GDB.





The interesting function "seclogin" is examined. It loads the shared library libseclogin.so.


The "main" function is examined, which reveals the password "s3cur3l0g1n".





Page 17 / 20


Page 18 / 20


## **Privilege Escalation** **Shared library load order hijack**

The setuid binary myexec is run again, which accepts the password "s3cur3l0g1n". The function

"seclogin" is called, but doesn’t seem to have any functionality yet.


The system search path order means that the "/tmp" directory will be checked before the "/lib"

and "/usr/lib" directories. If a malicious libseclogin.so is created in "/tmp", and the library cache is

updated using ldconfig, then myexec will attempt to load the malicious library.


IppSec uses the process below to create a malicious library, which will return a root shell.


libseclogin.c is created in "/tmp", with the code below, and then compiled.









ldd confirms that myexec now references the malicious library "/tmp/libseclogin.so".



Page 19 / 20


The binary is executed, which returns a root shell, and the flag can be captured.



Page 20 / 20


