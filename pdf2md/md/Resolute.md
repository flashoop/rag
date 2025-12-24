# Resolute

*Converted from: Resolute.pdf*

---

# Resolute

28 [th] May 2020 / Document No D20.100.74


Prepared By: bertolis


Machine Author: egre55


Difficulty: Medium


Classification: Official


## **Synopsis**

Resolute is an easy difficulty Windows machine that features Active Directory. The Active

Directory anonymous bind is used to obtain a password that the sysadmins set for new user

accounts, although it seems that the password for that account has since changed. A password

spray reveals that this password is still in use for another domain user account, which gives us

access to the system over WinRM. A PowerShell transcript log is discovered, which has captured

credentials passed on the command-line. This is used to move laterally to a user that is a

member of the DnsAdmins group. This group has the ability to specify that the DNS Server

service loads a plugin DLL. After restarting the DNS service, we achieve command execution on

the domain controller in the context of NT_AUTHORITY\SYSTEM .
### **Skills Required**


Basic knowledge of Windows

Basic knowledge of Active Directory
### **Skills Learned**


DnsAdmins Abuse


## **Enumeration**

### **Nmap**





Nmap output reveals that this is a domain controller for the domain megabank.local .
### **LDAP**


Let's check if LDAP anonymous binds are allowed and attempt to retrieve a list of users. To do

this, we can use [Windapsearch.](https://github.com/ropnop/windapsearch)





Windapsearch can also be used to dump all attributes from LDAP. This way we can check for

passwords stored in descriptions or other fields.


According to the description, password Welcome123! was set for the new user, and it is possible

that this is the standard password for newly created user accounts. It is quite common for a

sysadmin to set the same password for new accounts and ask users to update it later.


## **Foothold**

It's quite possible that a new joiner also hasn't changed their initial password. Let's attempt a

password spray with it. First, save the Windapsearch output to a file.





Before we begin with the password spray, it would be wise to take a look at the account lockout

policy of the domain controller, as a careless password spray along with a restrictive password

lockout policy may lock out accounts.



The lockoutThreshold: 0 indicates that there is no account lockout policy. Thus, we can go on

and use the following bash script to loop through the user list and verify their credentials using







This finds that the user melanie has the password Welcome123! . As port 5985 is open, we can

attempt to connect to the server via WinRM using [Evil-WinRM.](https://github.com/Hackplayers/evil-winrm)




The user flag is located in C:\Users\melanie\Desktop\ .


## **Lateral Movement**

The current user doesn't seem privileged, and there doesn't seem to be anything interesting in

the profile folders. Let's enumerating the file system, starting with the C:\ root. This doesn't

reveal anything interesting, and we can use the -force option. This reveals the hidden directory





This directory in turn, contains the hidden subdirectory C:\PSTranscripts\20191203\ . After

running the command dir -force again, we see the hidden file:


C:\PSTranscripts\20191203\PowerShell_transcript.RESOLUTE.OJuoBGhU.20191203063201.t

xt .


It seems that PowerShell Transcription logging is enabled on this system. This can be interesting

in cases that passwords are passed over the command-line. Examination of this file reveals that

the net use command syntax was incorrect. This generated an error that including the original

command, which was captured by the PowerShell transcript log. The original command passed

credentials for the user ryan in order to map a remote file share.


Issuing net user ryan reveals that they are in the Remote Management Users group. Using Evil
WinRM again, we can login as ryan .




## **Privilege Escalation**

The user ryan is found to be a member of DnsAdmins . Being a member of the DnsAdmins

group allows us to use the dnscmd.exe to specify a plugin DLL that should be loaded by the DNS

service. Let's create a DLL using msfvenom, that changes the administrator password.



Transferring this to the box would likely trigger Windows Defender, so we can use [Impacket's](https://github.com/SecureAuthCorp/impacket)

smbserver.py to start an SMB server and host the dll remotely.





The dnscmd utility can be used to set the remote DLL path into the Windows Registry.





Next, we need to restart the DNS service in order to load our malicious DLL. DnsAdmins aren't

able to restart the DNS service by default, but in seems likely that they would be given

permissions to do this, and in this domain this is indeed the case.





The service restarted successfully, and we saw a connection attempt on our SMB server. We can

now attempt to login as administrator using psexec.py with our password.





The root flag is located in C:\Users\Administrator\Desktop\ .


