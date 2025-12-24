# Tally

*Converted from: Tally.pdf*

---

# Tally
## **4 [th] May 2018 / Document No D18.100.03**

**Prepared By: Alexander Reid (Arrexel)**

**Machine Author: egre55**

**Difficulty: Hard**

**Classification: Official**



Page 1 / 10


## **SYNOPSIS**

Tally can be a very challenging machine for some. It focuses on many different aspects of real

Windows environments and requires users to modify and compile an exploit for escalation. Not

covered in this document is the use of Rotten Potato, which is an unintended alternate method

for privilege escalation.


## **Skills Required**


  - Intermediate/advanced knowledge of

Windows

  - Basic understanding of C and compiler

flags


## **Skills Learned**


  - Enumerating Sharepoint

  - Exploiting MSSQL

  - Windows Defender/AV evasion

techniques

  - Exploit modification


Page 2 / 10


## **Enumeration** **Nmap**

Nmap reveals a large amount of services running on the target. Most notably, there is an IIS

server hosting Sharepoint.


Page 3 / 10


​ ​


## **Sharepoint**

By simply browsing to [http://10.10.10.59/_layouts/viewlsts.aspx​](http://10.10.10.59/_layouts/viewlsts.aspx), a document is exposed which ​

contains login credentials for FTP. Although a site page is visible, there is an issue with

Sharepoint which causes the wrong link to be displayed. This can be fixed by adjusting the link

manually, or viewing the site via mobile (which can be achieved in Firefox from Inspect Element >

then click the phone icon to the right of the inspector/console/etc tabs).


Page 4 / 10



​ ​



​ ​


​

​ ​


​


## **Exploitation** **FTP**

​

​ ​


​



Using the credentials gained during Sharepoint enumeration ( **ftp_user:UTDRSCH53c"$6hys** ​ ), it

​ ​


​



​

is possible to connect via FTP. A bit of searching finds a **do to.txt** ​ file in **/User/Tim/Project/Log** ​

which references a KeePass file and a migration folder. The KeePass database can be found at

**/User/Tim/Files/tim.kdbx** . Note that binary mode must be enabled once connected to FTP (via

the **binary** ​ command) to transfer the file properly.



​

​ ​


**/User/Tim/Files/tim.kdbx** . Note that binary mode must be enabled once connected to FTP (via

​



​

​ ​


​


Cracking the KeePass password with John is trivial, and is fairly quick using rockyou.txt.


Page 5 / 10



​

​ ​


​


​


​


## **Method 1 - ACCT Share/MSSQL**

Using the credentials recovered from the KeePass database, it is possible to connect to the

**ACCT** share. Focus can be shifted to the **zz_Migration** ​ folder, as this was most likely hinted to by

the message in Sharepoint.


There is a lot of content available, and finding the correct file can take some time. By using

**strings** on **/zz_Migration/Binaries/New folder/tester.exe** ​, credentials to the MSSQL database

are revealed.


Page 6 / 10



​


​



​


​


​ ​


​


​


​ ​ ​ ​



Using the above credentials, it is possible to connect as the **sa** ​ user with **sqsh** ​ . The command


​


​


​ ​ ​ ​



​ ​

**sqsh -S 10.10.10.59 -U sa -P GWE3V65#6KFH93@4GWTG2G** opens the connection, and


​


​


​ ​ ​ ​



​ ​


xp_cmdshell can be enabled with the following commands:


​


​


​ ​ ​ ​



​ ​


1. exec sp_configure ‘show advanced options’, 1

2. reconfigure

3. exec sp_configure ‘xp_cmdshell’, 1

4. reconfigure


Note that after each command, the **go** ​ command should be executed as well.


After xp_cmdshell is enabled, it is fairly straightforward to create a reverse connection using

Powershell (or any other low-detection method). Note that Windows Defender is enabled on the

target, and most msfvenom payloads will be detected. At this stage, it will be useful to get a

Meterpreter session running as migrating to a new process is required for the escalation exploit

to function. This can be achieved using this method with **SEToolKit** ​ ’s Powershell alphanumeric

shellcode injector to generate a Meterpreter payload that will bypass Windows Defender.


Command: **setoolkit** ​ - **1** ​ - **9** ​ - **1** ​ . Multi/handler payload is windows/meterpreter/reverse_https


Page 7 / 10



​ ​


​


​


​ ​ ​ ​


​


​ ​


## **Method 2 - Firefox**

Exploit: [https://www.exploit-db.com/exploits/42484/​](https://www.exploit-db.com/exploits/42484/)


Subtly hinted at by the Finance page on Sharepoint, it is possible to exploit an instance of Firefox

which is running on the target. There is a script running on the machine to simulate a user

browsing to the **C:\FTP\Intranet** ​ folder. By creating an **index.html** ​ file, it is possible to redirect the

simulated user to a local webserver and serve up the exploit. Slight modification to the shellcode

must be made.


Example shellcode, courtesy of egre55, the machine’s author:


Page 8 / 10



​


​ ​


​ ​

​

​


​


​

​ ​

​


​


## **Privilege Escalation** **Administrator**

​ ​

​

​


​


​

​ ​

​


​



After obtaining the user flag from **C:\Users\Sarah\Desktop\user.txt** ​, the **todo.txt** ​ file in the same

directory hints that the machine does not have the latest Windows updates applied. The file **note** ​

​


​


​

​ ​

​


​



​ ​

​

**to tim (draft).txt** also suggests that the use of **cmd.exe** ​ as a filename should be avoided while


​


​

​ ​

​


​



​ ​

​

​

attempting exploits. Blacklisting the use of the filename prevents the publicly available


​


​

​ ​

​


​



​ ​

​

​


precompiled copies of the exploit from working, which forces the attacker to compile it manually.


Exploit: [https://www.exploit-db.com/exploits/42020/​](https://www.exploit-db.com/exploits/42020/)


​

​ ​

​


​



​ ​

​

​


​


​

​ ​

​


​



​ ​

​

​


​


​

​ ​

​


​



​ ​

​

​


​


Slight modification of the exploit is required. **#pragma comment(lib, “Advapi32.lib”)** ​ must be

​ ​

​


​



​ ​

​

​


​


​

added below the entry for **shlwapi.lib** ​ . Also on line 733/734 the reference to **cmd.exe** ​ must be

modified. In this case **writeup.exe** ​ was used, however any target filename will work aside from


​



​ ​

​

​


​


​

​ ​

​

cmd.exe.


​



​ ​

​

​


​


​

​ ​

​


Compiling can be achieved with Visual Studio/CL/etc. The command for compiling with CL is **cl** ​

**42020.cpp /EHsc /DUNICODE /D_UNICODE** .


_Thanks to egre55 for providing the required build flags!_


Page 9 / 10


​ ​


​ ​



Another (32-bit) executable must be created that the exploit will trigger. In this case, a copy of

calc.exe was used. Using Shell7er to inject a reverse TCP stager into the calc executable is

​ ​


​ ​



enough to bypass Windows Defender. Both **42020.exe** ​ and **calc.exe** ​ (now renamed to


​ ​



​ ​

**writeup.exe** past this point) can be uploaded through the existing Meterpreter session. After

​ ​



​ ​


starting the reverse TCP listener, running **42020.exe** ​ will trigger **writeup.exe** ​ and open a reverse



​ ​


​ ​

connection as admin.



​ ​


​ ​



​ ​


​ ​



​ ​


​ ​


Page 10 / 10


