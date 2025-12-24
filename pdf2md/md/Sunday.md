# Sunday

*Converted from: Sunday.pdf*

---

# Sunday
## **29 [th] September 2018 / Document No D18.100.20**

**Prepared By: Alexander Reid (Arrexel)**

**Machine Author: Agent22**

**Difficulty: Medium**

**Classification: Official**


Page 1 / 7


## **SYNOPSIS**

Sunday is a fairly simple machine, however it uses fairly old software and can be a bit

unpredictable at times. It mainly focuses on exploiting the Finger service as well as the use of

weak credentials.


## **Skills Required**


  - Intermediate knowledge of Linux


## **Skills Learned**


  - Enumerating users through Finger

  - Brute forcing SSH

  - Exploiting Sudo NOPASSWD


Page 2 / 7


## **Enumeration** **Nmap**

Nmap finds several open services, most notable Finger running on port 79.



Page 3 / 7


​ ​

​ ​


## **Finger**

[http://pentestmonkey.net/tools/user-enumeration/finger-user-enum](http://pentestmonkey.net/tools/user-enumeration/finger-user-enum)


Using the above script, it is possible to find the **sammy** ​ and **sunny** ​ users by enumerating the

Finger service with the **seclists** ​ username file **names.txt** ​ .


Page 4 / 7



​ ​

​ ​



​ ​

​ ​


​ ​


## **Exploitation** **SSH Brute Force**

While Hydra does not work in this instance, there are several other tools out there that can get

the job done. Brute forcing will find the password for **sunny** ​ is **sunday** ​, and a shell can be

obtained by connecting over SSH on port 22022.


Page 5 / 7



​ ​


​

​


​ ​ ​


## **Privilege Escalation** **Sammy**

​

​


​ ​ ​



In **/backups** ​ there are two backup files. They can be copy/pasted as they are small, or by using

​


​ ​ ​



​

**base64 -w 0 shadow.backup** on the target followed by **echo “<BASE64 HERE>” > shadow.b64** ​


​ ​ ​



​

​

**&& base64 -d shadow.b64 > shadow.backup** on the attacking machine.


​ ​ ​



​

​


Running **john** ​ with **rockyou.txt** ​ finds the password for **sammy** ​ fairly quickly.



​

​


​ ​ ​



​

​


​ ​ ​


Page 6 / 7


​ ​ ​


## **Root**

​ ​ ​



Running **sudo -l** ​ as **sammy** ​ reveals that it is possible to run **sudo wget** ​ . By overwriting the



​ ​ ​

**/root/troll** binary which sunny has access to, it is possible to achieve a root shell. Note that there



​ ​ ​


is a script running which reverts the file to the original seemingly every second, so it helps to



​ ​ ​


have two shells open and execute the commands quickly.



​ ​ ​



​ ​ ​



​ ​ ​



​ ​ ​


Page 7 / 7



​ ​ ​


