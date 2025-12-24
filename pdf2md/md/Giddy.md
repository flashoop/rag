# Giddy

*Converted from: Giddy.pdf*

---

# Giddy
## **12 [th] February 2019 / Document No D19.100.07**

**Prepared By: egre55**

**Machine Author: lkys37en**

**Difficulty: Medium**

**Classification: Official**


Page 1 / 13


## **SYNOPSIS**

Giddy is a medium difficulty machine, which highlights how low privileged SQL Server logins can

be used to compromise the underlying SQL Server service account. This is an issue in many

environments, and depending on the configuration, the service account may have elevated

privileges across the domain. It also features Windows registry enumeration and custom payload

creation.


## **Skills Required**


  - Basic knowledge of SQL injection

techniques

  - Basic knowledge of Windows


## **Skills Learned**


  - Using xp_dirtree to leak the SQL Server

service account NetNTLM hash

  - Identification of installed programs via

Windows Registry enumeration

  - Reverse shell payload creation


Page 2 / 13


## **Enumeration** **Nmap**





IIS 10.0 is serving content on ports 80 and 443. This version of IIS shipped with Windows Server

2016 and Windows 10. Two remote management services are also available (RDP and WinRM).


Page 3 / 13


## **Filebuster**

Filebuster, created by Tiago Sintra (@henshin) is used to enumerate available directories. It is a

very fast Perl-based web fuzzer. Filebuster and dependencies are installed.





Filebuster is run, and it finds the directories "/remote" and "/mvc".





Page 4 / 13


"/remote" points to a PowerShell Web Access page, while a custom web application containing a

list of products is accessible at "/mvc".


Page 5 / 13


## **/mvc** **SQL Injection**

Appending the search term with a single quote results in a SQL error. After appending -- after the

single quote, the SQL query completes successfully and data is returned. This confirms that the

"ctl00$MainContent$SearchTerm" parameter is vulnerable to SQL injection.


The statements below are executed in turn, and the 5 second delay for the != condition reveals

that the SQL account in whose context the queries are executed, is not sa.





Page 6 / 13


## **Capture and crack NetNTLM hash**

xp_dirtree is an undocumented MSSQL stored procedure that allows for interaction with local

and remote filesystems. The MSSQL Server service account can be made to initiate a remote

SMB connection using the command below.





By standing up Responder, Inveigh or Impacket's smbserver.py, is it possible to capture the

NetNTLM hash. This hash can be subjected to an offline attack in order to recover the password.

If the account has administrative permissions, the request can also be reflected or relayed to

directly access other network resources, which is useful in cases where is is not possible to

recover the cleartext password.


The user associated with the captured hash is "Stacy". John The Ripper is used to crash the hash,

and the password is quickly found.





stacy:xNnWo6272k7x



Page 7 / 13


## **PowerShell Web Access**

The gained credentials are used to log in to PowerShell Web Access. The username is

prepended with .\, so Windows interprets this as a local, rather than a domain login.


The PowerShell 2.0 engine has not been installed. AppLocker has been enabled, which places

PowerShell into ConstrainedLanguage mode.





Is doesn’t seem possible to interact with WMI using Powershell or wmic.exe, or enumerate

services.


Page 8 / 13


## **Identification of Ubiquiti UniFi Video**

In order to identify installed programs, the following registry query is executed. An entry exists for

"Ubiquiti UniFi Video".





In his Giddy video, IppSec also shows how service information can be extracted from the registry,

and is worth checking out.


Page 9 / 13


## **Privilege Escalation** **Identification of vulnerability**

searchsploit reveals that Ubiquiti UniFi Video suffers from a privilege escalation vulnerability. The

exploit is copied to the current working directory for further inspection.





The issue is that Ubiquiti UniFi Video runs in the context of the "NT AUTHORITY/SYSTEM", and

upon starting or stopping the service, it will attempt to execute the taskkill.exe binary from the

location "C:\ProgramData\unifi-video\", which is writable by all users. It is confirmed that the

location is writable, and the service is stoppable/startable.





Page 10 / 13


​


## **Exploitation**

@paranoidninja has made "prometheus", a simple C++ TCP reverse shell, which will be used to

create the malicious taskkill.exe. The function names have been changed and comments

removed in order to reduce the likelihood of signature-based antivirus detection (see **Appendix** ​

**A** ).


[https://github.com/paranoidninja/ScriptDotSh-MalwareDevelopment/blob/master/prometheus.cpp](https://github.com/paranoidninja/ScriptDotSh-MalwareDevelopment/blob/master/prometheus.cpp)


Mingw-w64 is installed and the binary is compiled.



​



​



​


A nc listener and web server are stood up and the binary is copied over.



​



​



​


After stopping the "Ubiquiti UniFi Video" service (it may be necessary to start/stop a couple of
times to trigger the taskkill.exe process), a shell is received as "NT AUTHORITY\SYSTEM".


Page 11 / 13



​


## **Appendix A**





Page 12 / 13


Page 13 / 13


