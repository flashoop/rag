# Control

*Converted from: Control.pdf*

---

# Control

21 [st] April 2020 / Document No D20.100.71


Prepared By: egre55


Machine Author(s): TRX


Difficulty: Hard


Classification: Official


## **Synopsis**

Control is a hard difficulty Windows machine featuring a site that is found vulnerable to SQL

injection. This is leveraged to extract MySQL user password hashes, and also to write a webshell

and gain a foothold. The password hash for the SQL user hector is cracked, which is used to

move laterally to their Windows account. Examination of the PowerShell history file reveals that

the Registry permissions may have been modified. After enumerating Registry service

permissions and other service properties, a service is abused to gain a shell as NT

AUTHORITY\SYSTEM .
### **Skills Required**


Basic knowledge of Windows
### **Skills Learned**


Basic SQL Injection

Hash Cracking

File System Enumeration

Service Enumeration

Windows Defender Evasion


## **Enumeration**



Nmap reveals MySQL and IIS running on their default ports. The IIS version is 10.0, which

indicates that this is Windows Server 2016 or Windows Server 2019.


WhatWeb reveals that PHP version 7.3.7 is installed. PHP versions 7.3.11 and 7.2.24, suffer from a

RCE vulnerability (tracked as CVE-2019-11043), but this only affects Nginx servers with PHP-FPM

enabled. Let's continue enumerating the website.


Navigating to the site in a browser reveals the store below, which has a link to an admin page.


Pressing CTRL + U brings up the source. We see a comment about work still needing to be done.

It seems the website for will be HTTPS-enabled, and the certificates have been stored on

192.168.4.28 .


Clicking on the admin page results in the error below. It seems that we need to access this page

through the proxy server, maybe the developer has implemented whitelisting based on the X
Forwarded-For header?

Hosts in enterprise networks typically use a proxy server, and the X-Forwarded-For header is

useful in attributing traffic to a source computer. Let's see if we can add this header to our

request. Open Burp and configure the browser to use it. We can use an addon such as FoxyProxy

to easily switch between multiple proxy servers.


Refresh on the admin page and intercept the request in Burp. Adding the X-Forwarded-For

header with our 10.10.14.X IP address as the value still results in the access denied message.

Let's use the IP address we discovered earlier.


This is successful and we gain access to the admin page, containing a list of products we can

modify and a search functionality.


Let's examine the search functionality in Burp.


Inputting a single-quote ' results in a SQL error. Let's enumerate the number of columns using

an ORDER clause or SELECT statement.



ORDER BY 7 results in an error, so we know there are 6 columns in the table, all of which output

data.


Let's identify the user in whose context we're in.




We can also attempt to read the MySQL user password hashes.





This is successful, and we can attempt to crack them offline later.


## **Foothold**

Let's see if our user has the ability to write files.



We've been granted the MySQL file privilege. Let's attempt to write a webshell to the webroot.

Using Burp's Encoder module we can encode the mini webshell as ASCII hex.





Next, we can attempt to use the LINES TERMINATED BY method to upload our webshell.




This is successful, and have gained command execution on the server.


Let's create a new share in order to host Netcat and other files as needed.



Stand up a Netcat listener, turn off the proxy and execute the command below in the browser,

replacing the IP address and port number with your values.




Now we have a proper shell on the system. Examination of system users using net users

reveals a user hector . Let's see if we can crack the SQL hashes, as it's possible that the SQL

password has been reused with their Windows user account.




## **Lateral Movement**

The hash for hector cracks, and the password is revealed to be l33th4x0rhector . Inspection of

hector's user account reveals that they is a member of the Remote Management Users group,

which allows them to use PowerShell Remoting and the Invoke-Command PowerShell cmdlet.


Let's create a PowerShell credential and test whether the password has been reused using

Invoke-Command.



This was successful, and after standing up another listener we gain a shell as hector and can gain

the user flag on the desktop.


## **Privilege Escalation**

Let's check the PowerShell history file, to see if there is anything interesting there.





It seems that hector has been looking at Registry ACLs and items under CurrentControlSet .

Maybe they have changed the permissions somewhere. Service properties exist as subkeys and

values under the HKLM:\SYSTEM\CurrentControlSet\Services subkey. If we have permissions

to this we can potentially change the binary path for all services. Let's check the permissions of

this subkey.

Using the ConvertFrom-SddlString cmdlet to convert the SDDL, we see that hector has full

control.


However, although we can change the binary path values, this isn't useful unless we are able to

start a particular services running as a privileged user. As the OS is Windows Server 2019, we

can't abuse the SeImpersonate or SeAssignPrimaryToken privileges assigned to the

localservice or networkservice service accounts. We should also consider service that are

already running due being configured with an automatic startup type. In those cases, although

we might be able to stop a service, we might not have permissions to start it again.

So we are interested in services running as NT AUTHORITY\SYSTEM, which are configured with a

manual start type, that we also have permissions to start. We can replicate this offline using a

Windows Server 2016 or 2019 server. Evaluation versions can be downloaded from the Microsoft

website. We can use the script below to find such services.


Get-CimInstance win32_service | % {


This completes, and small number of services are returned. The 0 result [indicates](https://docs.microsoft.com/en-us/windows/win32/cimwin32prov/startservice-method-in-class-win32-service) that the start

service request was accepted.

Let's use the seclogon service.


However, our shell is not in an interactive session, and we currently have limited ability to start or

otherwise interact with services. The qwinsta command reveals that the user hector is also

logged in interactively. We can migrate to an interactive process using Meterpreter. Windows

Defender is enabled, and so we can use the signed Windows binary MSBuild.exe to execute a

malicious project file such as [this](https://gist.githubusercontent.com/dxflatline/99de0da360a13c565a00a1b07b34f5d1/raw/63586f21b84d28c121418ab78620932ec9c546e6/msbuild_sc_alloc.csproj) one.


Download the file and edit it to include the payload generated with msfvenom.


Copy the .csproj to our share and execute MSBuild with the UNC path of the file.


This is successful, and we hand a Meterpreter shell. Let's make it more stable by migrating to

explorer.exe.


In the existing PowerShell shell, configure the binary path of the seclogon service to execute a

Netcat shell.







Stand up two more listeners and start the seclogon service







In the newly caught NT AUTHORITY\SYSTEM shell, execute the command below to get a more

stable shell.


We can now gain the root flag on the Administrator desktop.


