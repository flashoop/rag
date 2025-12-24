# Forest

*Converted from: Forest.pdf*

---

# Forest

Prepared By: k1ph4ru


Machine Author(s): egre55 & mrb3n


Difficulty: Easy


Classification: Official

## **Synopsis**


Forest is an easy Windows machine that showcases a Domain Controller (DC) for a domain in which

Exchange Server has been installed. The DC allows anonymous LDAP binds, which are used to enumerate

domain objects. The password for a service account with Kerberos pre-authentication disabled can be

cracked to gain a foothold. The service account is found to be a member of the Account Operators group,

which can be used to add users to privileged Exchange groups. The Exchange group membership is

leveraged to gain DCSync privileges on the domain and dump the NTLM hashes, compromising the

system.
### **Skills Required**


Enumeration
### **Skills Learned**


ASREPRoasting


Enumeration with Bloodhound


DCSync Attack

## **Enumeration**
### **Nmap**






The machine appears to be a Domain Controller for the `htb.local` domain. We proceed to add this to our

`/etc/hosts` file.




#### **LDAP**

It's worth checking if the LDAP service allows anonymous binds using the `ldapsearch` tool.






The **-x** flag is used to specify anonymous authentication, while the **-b** flag denotes the `basedn` to start

from. We were able to query the domain without credentials, which means null bind is enabled., **-H**

specifies the `LDAP` URI (host and port), while the **-b** flag denotes the `basedn` to start from.


The [windapsearchtool](https://github.com/ropnop/windapsearch) can be used to query the domain further.






The `-U` flag is used to enumerate all users, i.e., objects with `objectCategory` set to user. We find some

usernames and mailbox accounts, meaning `Exchange` is installed in the domain. Let's enumerate all other

objects in the domain using the `objectClass=*` filter.







The query found 313 unique objects, including a service account named `svc-alfresco` . Searching for

`alfresco` online brings us to this [setup](https://docs.alfresco.com/process-services/latest/config/authenticate/) documentation. According to this, the service needs Kerberos pre
authentication to be disabled. This means that we can request the encrypted TGT for this user. As the TGT

contains material encrypted with the user's NTLM hash, we can subject this to an offline brute force attack

and attempt to get the password for `svc-alfresco` .
## **Foothold**

The `GetNPUsers.py` script from `Impacket` can request a TGT ticket and dump the hash.


Let's copy the hash to a file and attempt to crack it using `JohnTheRipper` .







The password for this account is revealed to be `s3rvice` . As port 5985 is also open, we can check if this

user can log in remotely over `WinRM` using [Evil-WinRM.](https://github.com/Hackplayers/evil-winrm)









Authentication is successful, allowing us to execute commands on the server. We can grab the user flag

from `C:\Users\svc-alfresco\Desktop\user.txt` .
## **Privilege Escalation**


Let's use [Bloodhound](https://github.com/SpecterOps/BloodHound-Legacy) to visualise the domain and look for privilege escalation paths. We also use

[SharpHound](https://github.com/SpecterOps/BloodHound-Legacy/blob/master/Collectors/SharpHound.exe) to collect data about the domain by uploading the executable to the target and running the

executable.


We then upload the data to Bloodhound, search for the svc-alfresco user, and mark it as owned. Clicking

on the node displays its properties on the right. It's found that `svc-alfresco` is a member of nine groups

through nested membership. Click on 9 to reveal the membership graph.

One of the nested groups is found to be `Account Operators`, which is a privileged AD group. According to

[the documentation, the Account Operators group members are allowed to create and modify users and](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-groups#bkmk-accountoperators)

add them to non-protected groups. Let's note this and look at the paths to Domain Admins. Click on

Queries and select `Shortest Path to High Value targets` .

One of the paths shows that the Exchange Windows Permissions group has `WriteDacl` privileges on the

Domain. The `WriteDACL` privilege allows a user to add ACLs to an object. We can add users to this group

and give them `DCSync` privileges.

Return to the `WinRM` shell and add a new user to Exchange Windows Permissions and the Remote

Management Users group.


The commands above create a new user named `john` and add him to the required groups. Next,

download the [PowerView](https://github.com/PowerShellMafia/PowerSploit/blob/dev/Recon/PowerView.ps1) script and import it into the current session.







Next, we can use the `Add-ObjectACL` with john's credentials, and give him `DCSync` rights.







Now we can run a dcsync attack. The secretsdump script from Impacket can now be run as John and used

to reveal the NTLM hashes for all domain users.






The obtained `Domain Admin` hash can be used to access the target as the `administrator` user using







The root flag can be obtained from `C:\Users\Administrator\Desktop\root.txt` .


