# Netmon

*Converted from: Netmon.pdf*

---

# Netmon
## **18 [th] May 2019 / Document No D19.100.28**

**Prepared By: MinatoTW**

**Machine Author: mrb3n**

**Difficulty: Easy**

**Classification: Official**



Page 1 / 11


## **SYNOPSIS**

Netmon is an easy difficulty Windows box with simple enumeration and exploitation. PRTG is

running, and an FTP server with anonymous access allows reading of PRTG Network Monitor

configuration files. The version of PRTG is vulnerable to RCE which can be exploited to gain a

SYSTEM shell.


## **Skills Required**


  - Enumeration


## **Skills Learned**


  - CVE-2018-9276



Page 2 / 11


## **ENUMERATION** **NMAP**





FTP is open with anonymous access allowed. The whole C: drive looks mounted on it. PRTG
Network Monitor is running on the web server at port 80 among other common ports.


Page 3 / 11


​ ​


## **FTP**

Logging into FTP as anonymous we find the user flag in Public folder.


On checking the installed software we find PRTG Network Monitor, which we came across earlier.


A quick google search yields [this​](https://kb.paessler.com/en/topic/463-how-and-where-does-prtg-store-its-data) ​ information. According to it PRTG stores configuration files in

C:\ProgramData\Paessler.


Page 4 / 11



​ ​



​ ​


Going into the folder we find the configuration files. According to the documentation "PRTG

Configuration.dat" and "PRTG Configuration.old" are standard files. However there’s no mention

of "PRTG Configuration.dat.bak".


Let’s download and inspect it.





Page 5 / 11


Scrolling down a bit we find the password for user prtgadmin.

## **PRTG NETWORK MONITOR**


Using the credentials prtgadmin / PrTg@dmin2018 we can now login to the page.


However the credentials refuse to work. Maybe the password was changed from the old

configuration. Let’s follow the pattern and try "PrTg@dmin2019" as the password.


Page 6 / 11


And we’re in as the Administrator.



Page 7 / 11


​ ​


## **FOOTHOLD**

From the page we find the version to be 18.1.37.


A Google search about the vulnerabilities yields a CVE for versions < 18.1.39 (CVE-2018-9276).


According to this [article​](https://www.codewatch.org/blog/?p=453), RCE can be achieved while triggering notifications. Let’s try exploiting it. ​

The software by default runs as SYSTEM.


Click on Setup > Account Settings > Notifications.


Now click on “Add new notification” on the extreme right.


Page 8 / 11



​ ​



​ ​



​ ​


Leave the default fields as they are and scroll down to the "Execute Program" section. We can

add a user to Administrators group using this command:





Make the following changes and click “Save”.


Now on the extreme right of your notification name, click on the edit icon and then the bell icon

to trigger it.


Page 9 / 11


​ ​



Once done, use psexec to login as the created admin user.


​ ​



​ ​



​ ​



​ ​



And we have a shell as SYSTEM.

## **ALTERNATE WAY**


In case we don’t want to add a user, for better OPSEC we can get a reverse shell. However due

to HTML encoding many characters get encoded. We can bypass this using powershell base64

execution.


We need to create a base64 encoded command. However, it should be in the encoding which

WIndows uses i.e UTF-16LE.


​ ​



​ ​



​ ​



[We use iconv to convert it to target encoding and will execute this reverse shell​](https://github.com/samratashok/nishang/blob/master/Shells/Invoke-PowerShellTcp.ps1) ​ from Nishang.


Download the script and echo in the command to the last line.



​ ​



​ ​



​ ​


Page 10 / 11


Now start a simple HTTP server and create a new notification. This time the parameter would be,







And we have a SYSTEM shell.



Page 11 / 11


