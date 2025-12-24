# Heist

*Converted from: Heist.pdf*

---

# Heist
## **20 [th] November 2019 / Document No D19.100.51**

**Prepared By: MinatoTW**

**Machine Author: MinatoTW**

**Difficulty: Easy**

**Classification: Official**


Page 1 / 11


## **SYNOPSIS**

Heist is an easy difficulty Windows box with an “Issues” portal accessible on the web server, from

which it is possible to gain Cisco password hashes. These hashes are cracked, and subsequently

RID bruteforce and password spraying are used to gain a foothold on the box. The user is found

to be running Firefox. The firefox.exe process can be dumped and searched for the

administrator’s password.


## **Skills Required**


  - Enumeration


## **Skills Learned**


  - RID bruteforce

  - Cracking Cisco hashes

  - ProcDump



Page 2 / 11


## **Enumeration** **Nmap**

We find IIS running on port 80, MSRPC on port 135 and SMB on 445. Additionally, port 5985

(associated with WinRM) is exposed, which may allow remote sessions.

## **IIS**


Browsing to the website, we come across a login page.


The page allows us to login as a guest, which brings us to an “Issues” page.


Page 3 / 11


​ ​

​ ​



​ ​

​ ​



The post talks about a Cisco router configuration. Clicking on the attachment shows the


[On searching about Cisco configurations, we find​](https://community.cisco.com/t5/networking-documents/understanding-the-differences-between-the-cisco-password-secret/ta-p/3163238) ​ that the hashes are Cisco type 5 and type 7

password hashes. The type 5 hashes can be cracked using an online tool such as [this​](http://www.ifm.net.nz/cookbooks/cisco-ios-enable-secret-password-cracker.html) .​


Page 4 / 11



​ ​

​ ​



​ ​

​ ​


​ ​ ​ ​


​


​



​ ​ ​ ​


​


​



The two type 7 hashes were cracked revealed to be `$uperP@ssword` ​ and ​ `Q4)sJu\Y8qz*A3?d` ​ . ​

Let’s save these and crack the type 5 hash next. This can be cracked using John the Ripper and

rockyou.


The password is revealed to be “stealth1agent”. Enumeration of the “Issues” page revealed the

usernames “Hazard” and “Administrator”. Let’s bruteforce SMB with these passwords using

[CrackMapExec (CME). ​](https://github.com/axcheron/cisco_pwdecrypt)


CME found valid credentials: **hazard / stealth1agent.** ​


Page 5 / 11



​ ​ ​ ​


​


​



​ ​ ​ ​


​


​


## **Foothold**

Let’s try logging into WinRM with these using the CME winrm module.


The login failed, which means that the user “hazard” isn’t in the “Remote Management Users”

group. However, possession of valid credentials will still let us enumerate the box. Let’s try

enumerating the users on the box using RID bruteforce. RID stands for Relative Identifier, which is

a part of SID (Security Identifier) used to uniquely identify a user or service on a Windows host.


can query the box for it’s “Local Computer Identifier”, and bruteforce RID values, which will return

usernames for valid SIDs. The --rid-brute option in CME can do this for us.


Page 6 / 11


​ ​

​



CME was able to identify three additional usernames - support, Chase and Jason. Let’s use the

passwords from earlier and check if one of them is valid for the usernames we found.


Authentication was successful with the username Chase and password `Q4)sJu\Y8qz*A3?d` ​ . The ​

[evil-winrm script can be used to login via WinRM. ​](https://github.com/Hackplayers/evil-winrm)


Page 7 / 11



​ ​

​



​ ​

​


## **Privilege Escalation**

A ToDo list is found on the user’s desktop.


According to this Chase will be checking the issues list frequently. Looking at the running

processes, we see that Firefox is active.


Maybe he’s using firefox to login to the Issues portal? As we have control over the process, we

can dump the process and find passwords in it.


Page 8 / 11


​ ​


​



The [procdump​](https://docs.microsoft.com/en-us/sysinternals/downloads/procdump) utility can be used to dump process memory. Download and transfer it to the ​

server.


We need to use the -ma flag to dump the entire memory of the process.


We can start an SMB server locally to transfer this file.


​



​ ​


​



​ ​


​



​ ​


​



​ ​


​



​ ​


The server will use the credentials **guest / guest** ​ for authentication.



​ ​


​


Page 9 / 11


Now mount the share on the box and copy the file to it.


Here’s the request sent on trying to login on the web page.


The page used login_password as the parameter to submit passwords. We can search the dump

for strings like “login_password” to find any requests.


We can see the entire URL string with the username and password parameters.


Page 10 / 11


The password “4dD!5}x/re8]FBuZ” can be used to login as Administrator.



Page 11 / 11


