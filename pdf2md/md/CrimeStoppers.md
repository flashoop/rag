# CrimeStoppers

*Converted from: CrimeStoppers.pdf*

---

# CrimeStoppers
## **2 [nd] June 2018 / Document No D18.100.05**

**Prepared By: Alexander Reid (Arrexel)**

**Machine Author: ippsec**

**Difficulty: Hard**

**Classification: Official**



Page 1 / 11


## **SYNOPSIS**

CrimeStoppers is a fairly challenging machine, requiring several unique techniques in order to be

successfully exploited. There are many hints and easter eggs present on the machine, with a

heavy focus on avoiding the use of automated tools.


## **Skills Required**


  - Intermediate/advanced knowledge of

Linux

  - Intermediate/advanced knowledge of

PHP


## **Skills Learned**


  - Exploiting PHP file creation mechanics

  - Exploiting PHP filters/wrappers

  - Extracting data from Thunderbird

  - Reverse engineering Apache modules


Page 2 / 11


## **Enumeration** **Nmap**

Nmap reveals only an Apache server running on the default port.



Page 3 / 11


## **Dirbuster**

Fuzzing the webserver reveals quite a few php scripts, however attempting to access most will

result in a blank page. This hints towards the files being included by another script.


Page 4 / 11


## **Exploitation** **Admin Cookie**

While not necessary to complete the machine, modifying the plaintext cookie to obtain admin

rights to the website will provide some additional hints.


Page 5 / 11


​


​ ​


​


## **PHP Filter Inclusion**

After a bit of testing, it is fairly clear that the **op** ​ parameter is used to include a PHP file in the

current working directory. By converting the target file to base64 using PHP filters, it is possible

to obtain the source code of the PHP files.


The request [http://10.10.10.80/?op=php://filter/convert.base64-encode/resource=index​](http://10.10.10.80/?op=php://filter/convert.base64-encode/resource=index) ​ will output

the contents of index.php encoded in base64.


This provides very useful information about other ways to potentially exploit the target. Most

notably, the **upload.php** ​ file exposes the full path to the uploads directory.


Page 6 / 11



​


​ ​


​


​

​

​


## **PHP ZIP Wrapper/Binary Data Upload**

​

​

​



Using the **op** ​ parameter yet again, it is possible to include a file inside of a ZIP using PHP

​

​



​

[wrappers. The url http://10.10.10.80/?op=zip://uploads/<LAB IP>/FILENAME#writeup.php?cmd=id​](http://10.10.10.80/?op=zip://uploads/10.10.14.4/FILENAME#writeup.php?cmd=id)

​



​

​

can be used to achieve this, where **FILENAME** ​ is the hash (secretname) of the tip/zip.



​

​

​


By intercepting a tip submission request and entering the raw data of a ZIP file, the above

technique can be leveraged to achieve remote code execution. The created file (tip) will have no

extension, however it can still be processed using the ZIP wrapper.


Page 7 / 11



​

​

​


In the above example, the secretname was 9dfc0e1200ee90d2a380c2fcd2ff036754be27b4.

Combined with the ZIP wrapper, it is possible to execute commands through the writeup.php file

included in the ZIP.


URL:

[http://10.10.10.80/?op=zip://uploads/10.10.14.4/9dfc0e1200ee90d2a380c2fcd2ff036754be27b4%](http://10.10.10.80/?op=zip://uploads/10.10.14.4/9dfc0e1200ee90d2a380c2fcd2ff036754be27b4%23writeup&cmd=id)

[23writeup&cmd=id](http://10.10.10.80/?op=zip://uploads/10.10.14.4/9dfc0e1200ee90d2a380c2fcd2ff036754be27b4%23writeup&cmd=id)


Page 8 / 11


​

​

​ ​

​

​


​

​ ​

​


## **Privilege Escalation** **Dom**

[Firefox Decrypt: https://github.com/unode/firefox_decrypt​](https://github.com/unode/firefox_decrypt)


​

​ ​

​

​


​

​ ​

​



​


Exploring the **dom** ​ user’s directory reveals a Thunderbird installation. Simply copying the files and

​ ​

​

​


​

​ ​

​



​

​

loading the profile in Thunderbird locally, or running **strings** ​ on **global-messages-db.sqlite** ​, will

​

​


​

​ ​

​



​

​

​ ​

provide a tip suggesting **rkhunter** ​ identified a backdoor Apache module.


​


​

​ ​

​



​

​

​ ​

​


Using the above tool, it is possible to recover **dom** ​ ’s password. By default there is no master

password set for Thunderbird, and recovering the password is trivial.


​

​ ​

​



​

​

​ ​

​

​


​

​ ​

​



​

​

​ ​

​

​


Running the command **netstat -lp** ​ shows that SSH is listening on IPv6. The IPv6 address of the

​ ​

​



​

​

​ ​

​

​


​

target can be easily obtained with **ifconfig** ​ or **ip addr** ​ . Combined with the credentials obtained

​



​

​

​ ​

​

​


​

​ ​

from Thunderbird, it is possible to SSH directly into the target as **dom** ​ .



​

​

​ ​

​

​


​

​ ​

​


Page 9 / 11


​ ​


## **Root**

Examining the **mod_rootme.so** ​ file in IDA or another decompiler reveals a **DarkArmy** ​ function.

Further inspection finds that this function XORs the text “HackTheBox” with a hex string.


Page 10 / 11



​ ​



​ ​


​ ​


​



By XORing **HackTheBox** ​ with **e140d383b0b0c271b01** ​, the backdoor passphrase is discovered.


Exploiting the backdoor is trivial once the passphrase is obtained. Simply running the command

**nc 10.10.10.80 80** and then passing **GET FunSociety** ​ will result in a root shell.


Page 11 / 11



​ ​


​



​ ​


​


