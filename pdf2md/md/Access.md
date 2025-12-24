# Access

*Converted from: Access.pdf*

---

# Access
## **25 [th] February 2019 / Document No D19.100.09**

**Prepared By: egre55**

**Machine Author: egre55**

**Difficulty: Easy**

**Classification: Official**


Page 1 / 14


​ ​ ​ ​


## **SYNOPSIS**

Access is an "​ easy​ "​ difficulty machine, that highlights how machines associated with the physical ​

security of an environment may not themselves be secure. Also highlighted is how accessible

FTP/file shares often lead to getting a foothold or lateral movement. It teaches techniques for

identifying and exploiting saved credentials.



​ ​ ​ ​

## **Skills Required**


  - Basic Windows knowledge



​ ​ ​ ​

## **Skills Learned**


  - Enumeration of Access Databases and

Outlook Personal Archives

  - Identification of saved credentials

  - DPAPI credential extraction


Page 2 / 14


## **Enumeration** **Nmap**





Nmap output shows that anonymous FTP, Telnet and a web server running IIS 7.5 are available.

This version of IIS shipped with Windows Server 2008 R2. Visual inspection of the website

reveals a still of a data centre video feed.


Page 3 / 14


## **FTP**

The FTP server is examined and two files are visible, "\Backups\backup.mdb" and

"\Engineer\Access Control.zip". These are both binary files and so the FTP binary transfer mode is

enabled.





Page 4 / 14


## **Inspection of interesting files** mdb-tools

The command "file backup.mdb" confirms that this is a Microsoft Access database, which can be

examined using "mdb-tools" (created by Brian Bruns). The tables are displayed with "mdb-tables"

and grep colour output is used to highlight tables of interest. There is an "auth_user" table, in

what seems to be a database backup from a "ZKAccess" installation. ZKAccess is an Access

Control software application, used to manage card readers and physical security of an

environment. Data from this table is exported using "mdb-export", which reveals usernames and

plaintext passwords.





ZKAccess admin/engineer accounts:


admin:admin


engineer:access4u@security


backup_admin:admin



Page 5 / 14


​ ​


## 7z

The attempt to extract the zip file with the "unzip" command fails due to it being compressed

using an unsupported format. 7z is used to examine the Zip file, which shows that it was

encrypted using the AES-256 algorithm. AES-256 is supported by 7z and WinZip.


​ ​



​ ​



​ ​



​ ​



Using the previously gained password access4u@security​ ​, the Zip file is extracted.



​ ​



​ ​



​ ​



​ ​


Page 6 / 14


​


## **Foothold**

This reveals the file "Access Control.pst", which is a Microsoft Outlook Personal Folder file, used

to store emails and other items. This can be examined further using "readpst".


​



​



​



An email explains that the password for the "security" account (conceivably used by the

engineers who maintain the physical security system) has been changed to 4Cc3ssC0ntr0ller ​


security:4Cc3ssC0ntr0ller


This credential is used to open a telnet session (the user seems unprivileged), and the user flag

can be gained.


Page 7 / 14



​


​ ​

​ ​


## **Post-Exploitation** **Upgrade from telnet shell**

The telnet shell is not very convenient, and it is quickly upgraded. A web server is started and

hosts shell.ps1.


​ ​

​ ​



​ ​

​ ​



​ ​

​ ​



Nishang – created by Nikhil SamratAshok Mittal (@nikhil_mitt) – contains many handy scripts,

such as the following PowerShell reverse shell one-liner.


[https://github.com/samratashok/nishang/blob/master/Shells/Invoke-PowerShellTcpOneLine.ps1](https://github.com/samratashok/nishang/blob/master/Shells/Invoke-PowerShellTcpOneLine.ps1)


shell.ps1


​ ​

​ ​



​ ​

​ ​



​ ​

​ ​



A standard Powershell download cradle is used to execute the reverse shell. "START​ " is used so ​

​ ​



​ ​

that the existing telnet session is not locked up. The /B​ parameter is specified so that a new ​



​ ​

​ ​

window is not created for the shell, which has the effect that the incoming shell is able to use the



​ ​

​ ​


full width of the screen, instead of being constrained to the telnet session display width.



​ ​

​ ​



​ ​

​ ​



​ ​

​ ​


Page 8 / 14


## **Identification of saved credential**

A useful command to run when beginning enumeration is "cmdkey /list", which displays stored

user names and passwords or credentials. This reveals a stored credential for

"ACCESS\Administrator".


Windows may store credentials for a number of reasons. One of them is that an sysadmin may

have configured an application to run as an administrative user, with the "/savecred" switch

specified. There is no way in Windows to restrict use of the "runas /savecred" privilege to a single

application - once this has been configured, runas can be used to run any command with

elevated privileges. Some reasons why an sysadmin may choose to use "runas /savecred" are to

keep them from having to repeatedly enter (or provide) the admin password, or it may be to run

an application with elevated privileges in order to bypass application whitelisting or to allow write

access to protected application directories.


Typically "runas /savecred" is used to create a shortcut, which the user clicks to run the desired

application. The commands below are used to enumerate all the accessible shortcut (.lnk) files on

the system, and examine them for the presence of the "runas" command.





It seems that the ZKAccess shortcut on the Public Desktop has been configured in this way.


Page 9 / 14


When inspecting the Public user profile, the Desktop folder is not immediately visible as it is a

hidden folder. It is possible to traverse the folder and list the files within. The folder is accessible

to the builtin "NT AUTHORITY\INTERACTIVE" group. Users who log in "interactively" locally, or

over a Remote Desktop or telnet session will have the Interactive SID in their access token.







Page 10 / 14


## **Privilege Escalation** **Exploiting "runas /savecred"**

The following command is used to start a PowerShell reverse shell as ACCESS\Administrator.





Page 11 / 14


## **DPAPI abuse** Identification of credentials and masterkeys

This runas credential (and many other types of stored credentials) can be extracted from the
Windows Data Protection API. In order to achieve this, it is necessary to identify the credential
files and masterkeys. Credential filenames are a string of 32 characters, e.g.
"85E671988F9A2D1981A4B6791F9A4EE8" while masterkeys are a GUID, e.g.
"cc6eb538-28f1-4ab4-adf2-f5594e88f0b2". They have the "System files" attribute, and so "DIR
/AS" must be used. The following "one-liner" will identify the available credential files and
masterkeys.





Page 12 / 14


## Powershell Base64 file transfer

The credential and masterkey are base64 encoded.







They are converted back to the original files on an attacker controlled computer, where they can
be inspected with mimikatz.







Page 13 / 14


## Credential extraction

The mimikatz Wiki provides detailed guidance on working with Windows Credential Manager
saved credentials.

[https://github.com/gentilkiwi/mimikatz/wiki/howto-~-credential-manager-saved-credentials](https://github.com/gentilkiwi/mimikatz/wiki/howto-~-credential-manager-saved-credentials)

The credential file is examined, which reveals the corresponding masterkey (guidMasterKey). This
matches the masterkey that was extracted.





The masterkey file is examined next, and the key is extracted.





With the masterkey in mimikatz’s cache, the credential blob can now be decrypted. It is now
possible to open a telnet session as ACCESS\Administrator and gain the root flag.





Page 14 / 14


