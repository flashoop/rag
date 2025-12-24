# Active

*Converted from: Active.pdf*

---

# Active

27 [th] November 2023 / Document No D18.100.30


Prepared By: C4rm3l0 & egre55


Machine Author: eks & mrb3n


Difficulty: Easy


Classification: Official

## **Synopsis**


Active is an easy to medium-difficulty Windows machine, which features two very prevalent techniques to

gain privileges within an Active Directory environment.
### **Skills Required**


Basic knowledge of Active Directory authentication and shared folders
### **Skills Learned**


SMB enumeration techniques


Group Policy Preferences enumeration and exploitation


Identification and exploitation of Kerberoastable accounts

## **Enumeration**
### **Nmap**


We start by running an Nmap scan on the target.




Nmap reveals an Active Directory installation with a domain of active.htb . Microsoft DNS 6.1 is running,

which allows Nmap to fingerprint the domain controller as Windows Server 2008 R2 SP1.


We add the discovered domain to our hosts file.




### **SMB**

Port 445 is open, so we can use smbclient with anonymous login to enumerate any accessible file shares.



Since anonymous login is allowed, we can view a list of available shares. Let's now use smbmap to identify

which of these shares are accessible with anonymous credentials.


$ smbmap -H 10.10.10.100


________ ___   ___ _______  ___   ___    __     _______


/"    )|" \  /" ||  _ "\ |" \  /" |   /""\    |  __ "\


(:  \___/ \  \ //  |(. |_) :) \  \ //  |  /  \   (. |__) :)


\___ \  /\ \/.  ||:   \/  /\  \/.  |  /' /\ \   |: ____/


__/ \  |: \.    |(| _ \ |: \.    | // __' \  (| /


/" \  :) |. \  /: ||: |_) :)|. \  /: | /  / \  \ /|__/ \


(_______/ |___|\__/|___|(_______/ |___|\__/|___|(___/  \___)(_______)


----------------------------------------------------------------------------

SMBMap - Samba Share Enumerator v1.10.5 | Shawn Evans - ShawnDEvans@gmail.com


https://github.com/ShawnDEvans/smbmap


[*] Detected 1 hosts serving SMB


[*] Established 1 SMB connections(s) and 1 authenticated session(s)


[+] IP: 10.129.26.60:445    Name: active.htb        Status: Authenticated


Disk                          Permissions   Comment


---- ----------- ------

ADMIN$                         NO ACCESS    Remote Admin


C$                           NO ACCESS    Default share


IPC$                          NO ACCESS    Remote IPC


NETLOGON                        NO ACCESS    Logon server


share


Replication                       READ ONLY


SYSVOL                         NO ACCESS    Logon server


share


Users                          NO ACCESS


[*] Closed 1 connections


The only share accessible with anonymous credentials is the Replication share. Upon connecting and

examining its contents, it appears to be a replica of the SYSVOL share. This is particularly interesting from a

privilege escalation standpoint, as Group Policies—and potentially Group Policy Preferences—are stored

within SYSVOL, which is readable by all authenticated users. For more details on exploiting this, refer to this

resource.


Let's connect to the Replication share and recursively download its contents, paying special attention to

the Groups.xml file. This file often contains username and password combinations, which can be valuable

for exploitation.





The Groups.xml file reads as follows.






We can obtain the username SVC_TGS, as well as an encrypted password from the Groups.xml file.




## **Foothold**
### **Group Policy Preferences**

Group Policy Preferences (GPP) was introduced in Windows Server 2008, and among many other features,

allowed administrators to modify users and groups across their network.


An example use case is where a company’s gold image had a weak local administrator password, and

administrators wanted to retrospectively set it to something stronger. The defined password was AES-256

encrypted and stored in [Groups.xml . However, at some point in 2012, Microsoft published the AES key on](https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-gppref/2c15cbf0-f086-4c74-8b70-1f2fa45dd4be)

MSDN, meaning that passwords set using GPP are now trivial to crack and considered low-hanging fruit.


We extract the encrypted password form the Groups.xml file and decrypt it using gpp-decrypt .







The domain account SVC_TGS has the password GPPstillStandingStrong2k18 .
### **Authenticated Enumeration**


With valid credentials for the active.htb domain, we can proceed with further enumeration. The SYSVOL

and Users shares are now accessible.


The user flag can be retrieved by connecting to the Users share, and navigating to SVC_TGS 's Desktop.






## **Privilege Escalation**

We can now use ldapsearch to query the Domain Controller for the UserAccountControl attributes of

Active Directory accounts, along with other specific configurations applied to them. Many

[UserAccountControl flags have security implications. This Microsoft page provides a comprehensive list of](https://support.microsoft.com/en-gb/help/305144/how-to-use-the-useraccountcontrol-flags-to-manipulate-user-account-pro)

possible UserAccountControl values.


The value of 2 corresponds to a disabled account status, and so the query below will return active users (by

SAMAccountName / username) in the active.htb domain.


**-s sub** : The -s option specifies the search scope. sub means a subtree search, including the

base DN and all its child entries. This is the most comprehensive search scope, as it traverses the

entire directory tree below the base DN.


(&(objectCategory=person)(objectClass=user)(!

(useraccountcontrol:1.2.840.113556.1.4.803:=2))) is an LDAP search filter to find all user

objects that are not disabled. Here's the breakdown:

objectCategory=person : Searches for objects in the category "person".


objectClass=user : Narrows down to objects with a class of "user".


!(useraccountcontrol:1.2.840.113556.1.4.803:=2) : Excludes disabled accounts. The

userAccountControl attribute is a bit flag; this part of the filter excludes accounts with the

second bit set (which indicates a disabled account).


Aside from the compromised account, we observe that the Administrator account is also active.

Impacket’s GetADUsers.py tool streamlines the enumeration of domain user accounts.




### **Kerberoasting**

Kerberos Authentication and Service Principal Names Another common technique of gaining privileges

within an Active Directory Domain is “Kerberoasting”, which is an offensive technique created by Tim Medin

and revealed at DerbyCon 2014.


Kerberoasting involves extracting a hash of the encrypted material from a Kerberos “Ticket Granting

Service” ticket reply (TGS_REP), which can be subjected to offline cracking in order to retrieve the plaintext

password. This is possible because the TGS_REP is encrypted using the NTLM password hash of the account

in whose context the service instance is running. The below image shows the Kerberos authentication

process when interacting with a service instance.


Managed service accounts reduce this risk by using complex, automatically managed passwords, but they

are not commonly implemented in many environments. It's important to note that shutting down the server

hosting the service does not mitigate the risk, as the attack doesn't rely on communication with the target

service. Hence, it's crucial to regularly audit the purpose and privileges of all active accounts.


Kerberos authentication uses Service Principal Names (SPNs) to identify the account associated with a

particular service instance. ldapsearch can be used to identify accounts that are configured with SPNs. We

will reuse the previous query and add a filter to obtain the SPNs, (serviceprincipalname=*/*) .





It seems that the active\Administrator account has been configured with an SPN.






Impacket’s GetUserSPNs.py lets us request the TGS and extract the hash for offline cracking.


#### **Cracking of Kerberos TGS Hash**

We can use hashcat with the rockyou.txt wordlist to crack the hash and obtain the password

Ticketmaster1968 for the user active\administrator .


$ hashcat -m 13100 hash /usr/share/wordlists/rockyou.txt --force --potfile-disable


hashcat (v6.1.1) starting...


<...SNIP...>


Dictionary cache built:


 - Filename..: /usr/share/wordlists/rockyou.txt


 - Passwords.: 14344392


 - Bytes.....: 139921507


 - Keyspace..: 14344385


 - Runtime...: 2 secs


$krb5tgs$23$*Administrator$ACTIVE.HTB$<...SNIP...>:Ticketmaster1968


<...SNIP...>


Started: Mon Nov 27 12:18:48 2023


Stopped: Mon Nov 27 12:19:44 2023

#### **Shell as Primary Domain Admin**


Impacket’s wmiexec.py can be used to get a shell as active\administrator, and read root.txt .



The final flag can be found at C:\Users\Administrator\Desktop\root.txt .


